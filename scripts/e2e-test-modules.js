#!/usr/bin/env node
// End-to-end smoke test of the 3 modules:
//  - Loppumoduuli (reflection + capstone 3xPDF+3 answers + gallery)
//  - Myytinmurtaja (PDF upload + 3 answers + AI insight)
//  - Rikkinäinen Prompti (rikki save rounds 1 & 2)
// Verifies:
//  - Data saves to DB
//  - Per-user isolation (student A cannot see student B's data)
//  - Admin can see all data
// Reads live server on PORT env (default 3000, same as server.js).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pool = require('../database/db');
const bcrypt = require('bcrypt');

const BASE = 'http://localhost:' + (process.env.PORT || 3000);
const PASS = 'TestPass1234!';

function C(label, ok, extra) {
  const tag = ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(' ' + tag + ' ' + label + (extra ? ('  — ' + extra) : ''));
  if (!ok) process.exitCode = 1;
}
function S(title) { console.log('\n\x1b[1m— ' + title + '\x1b[0m'); }

async function createUser(name, isAdmin) {
  const email = 'e2e_' + crypto.randomBytes(3).toString('hex') + '@test.local';
  const hash = await bcrypt.hash(PASS, 10);
  const r = await pool.query(
    `INSERT INTO users (name, email, password_hash, is_admin, is_approved, is_active)
     VALUES ($1, $2, $3, $4, TRUE, TRUE)
     RETURNING id, email, name, is_admin`,
    [name, email, hash, !!isAdmin]
  );
  return r.rows[0];
}
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO sessions (session_token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 day')`,
    [token, userId]
  );
  return token;
}
async function cleanupUser(id) {
  try { await pool.query('DELETE FROM sessions WHERE user_id=$1', [id]); } catch (e) {}
  try { await pool.query('DELETE FROM users WHERE id=$1', [id]); } catch (e) {}
}

function cookie(token) { return { cookie: 'session_token=' + token }; }

async function api(method, pathUrl, token, body, isForm) {
  const h = { ...cookie(token) };
  let data = body;
  if (!isForm && body !== undefined) {
    h['content-type'] = 'application/json';
    data = JSON.stringify(body);
  }
  const res = await fetch(BASE + pathUrl, { method, headers: h, body: data });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json, text, contentType: res.headers.get('content-type') || '' };
}

function tinyPdfBuffer(label) {
  // Use pdfkit to generate a real PDF with enough text for pdf-parse to extract (>50 chars)
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).text(label, { underline: false });
      doc.moveDown();
      doc.fontSize(11).text('This is a test PDF generated for end-to-end testing of the learning platform. It contains enough extractable text so that the pdf-parse extractor can read more than fifty characters of content and continue the AI insight flow.');
      doc.moveDown();
      doc.text('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.');
      doc.moveDown();
      doc.text('Suomeksi: tämä PDF on luotu testausta varten. Se sisältää tarpeeksi tekstiä siihen, että pdf-parse pystyy lukemaan yli 50 merkkiä ja AI-insight-prosessi jatkaa toimintaansa.');
      doc.end();
    } catch (e) { reject(e); }
  });
}

function pngBuffer() {
  // Minimal 1x1 red PNG
  return Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108020000009077' +
    '53de00000010494441540857636000006000006000000005000100a00a42a4' +
    '4d0000000049454e44ae426082', 'hex');
}

function formData(fields) {
  // Build multipart form data manually
  const boundary = '----E2E' + crypto.randomBytes(8).toString('hex');
  const chunks = [];
  for (const f of fields) {
    const head = '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="' + f.name + '"' +
      (f.filename ? ('; filename="' + f.filename + '"') : '') + '\r\n' +
      (f.contentType ? ('Content-Type: ' + f.contentType + '\r\n') : '') + '\r\n';
    chunks.push(Buffer.from(head, 'utf-8'));
    chunks.push(Buffer.isBuffer(f.value) ? f.value : Buffer.from(String(f.value), 'utf-8'));
    chunks.push(Buffer.from('\r\n', 'utf-8'));
  }
  chunks.push(Buffer.from('--' + boundary + '--\r\n', 'utf-8'));
  return {
    body: Buffer.concat(chunks),
    headers: { 'content-type': 'multipart/form-data; boundary=' + boundary }
  };
}

async function postForm(pathUrl, token, fields) {
  const { body, headers } = formData(fields);
  const res = await fetch(BASE + pathUrl, {
    method: 'POST',
    headers: { ...cookie(token), ...headers },
    body
  });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, json, text };
}

(async () => {
  console.log('E2E TEST · modules (base=' + BASE + ')');
  let studentA, studentB, admin, tokenA, tokenB, tokenAdmin;
  try {
    S('Setup: create users + sessions');
    studentA = await createUser('E2E Student Alpha', false);
    studentB = await createUser('E2E Student Beta', false);
    admin = await createUser('E2E Admin', true);
    tokenA = await createSession(studentA.id);
    tokenB = await createSession(studentB.id);
    tokenAdmin = await createSession(admin.id);
    C('created users A(' + studentA.id + '), B(' + studentB.id + '), admin(' + admin.id + ')', true);

    /* ===== MODULE 1 — Loppumoduuli ===== */
    S('Loppumoduuli · Osio 1 — reflection-save (student A)');
    const refA = await api('POST', '/api/final/reflection-save', tokenA, {
      reflection_text: 'Tämä on A:n reflektio.',
      answers_json: [
        { question: 'Mikä sinua innostaa?', answer: 'Testaus.' },
        { question: 'Mikä pelottaa?', answer: 'Deploy torstaina.' }
      ]
    });
    C('POST /reflection-save → 200', refA.status === 200);
    C('row stored in DB', (await pool.query('SELECT reflection_text FROM final_module_reflections WHERE user_id=$1', [studentA.id])).rows[0]?.reflection_text === 'Tämä on A:n reflektio.');

    S('Loppumoduuli · Osio 3 — gallery-upload (BYTEA, private)');
    const upG = await postForm('/api/final/gallery-upload', tokenA, [
      { name: 'image', filename: 'test.png', contentType: 'image/png', value: pngBuffer() },
      { name: 'caption', value: 'A:n ensimmäinen kuva' },
      { name: 'image_prompt_used', value: 'red dot on white' }
    ]);
    C('POST /gallery-upload → 200', upG.status === 200, 'status=' + upG.status);
    const galAPath = upG.json && upG.json.image_path;
    C('response includes /api/final/gallery-image/<uuid>', /^\/api\/final\/gallery-image\//.test(galAPath || ''), galAPath);

    // Student A reads own gallery
    const galA = await api('GET', '/api/final/gallery', tokenA);
    C('GET /gallery as A → 200 & one item', galA.status === 200 && galA.json.items.length === 1);
    C('image_path in response points to /api/final/gallery-image/', /^\/api\/final\/gallery-image\//.test(galA.json.items[0]?.image_path || ''));

    // Download image as owner
    const imgId = galA.json.items[0].id;
    const imgA = await api('GET', '/api/final/gallery-image/' + imgId, tokenA);
    C('GET /gallery-image/<id> as owner → 200', imgA.status === 200);
    C('served with image mime', /^image\//.test(imgA.contentType));

    // Student B must NOT see A's gallery item (list) and must NOT be able to download
    const galB = await api('GET', '/api/final/gallery', tokenB);
    C('GET /gallery as B → 0 items (private)', galB.status === 200 && galB.json.items.length === 0);
    const imgB = await api('GET', '/api/final/gallery-image/' + imgId, tokenB);
    C('GET /gallery-image/<A\'s id> as B → 403', imgB.status === 403);

    // Admin can download
    const imgAdm = await api('GET', '/api/final/gallery-image/' + imgId, tokenAdmin);
    C('GET /gallery-image/<A\'s id> as admin → 200', imgAdm.status === 200);

    S('Loppumoduuli · Osio 2 — capstone-submit (3 PDFs + 3 texts)');
    const pdf1 = await tinyPdfBuffer('AI tanaan');
    const pdf2 = await tinyPdfBuffer('AI huomenna');
    const pdf3 = await tinyPdfBuffer('Mina ja AI');
    const capResp = await postForm('/api/final/capstone-submit', tokenA, [
      { name: 'map1', filename: 'ai-tanaan.pdf', contentType: 'application/pdf', value: pdf1 },
      { name: 'map2', filename: 'ai-huomenna.pdf', contentType: 'application/pdf', value: pdf2 },
      { name: 'map3', filename: 'mina-ja-ai.pdf', contentType: 'application/pdf', value: pdf3 },
      { name: 'podcast_right', value: 'AI sai hyvin pääkohdat.' },
      { name: 'podcast_missed', value: 'Mutta jäi huomaamatta konteksti.' },
      { name: 'podcast_insight', value: 'Tekoäly tiivistää pintatasolla.' }
    ]);
    C('POST /capstone-submit → 200', capResp.status === 200, 'status=' + capResp.status + ' ' + (capResp.json?.error || ''));
    const capRow = (await pool.query('SELECT id, map1_bytes, map2_bytes, map3_bytes, podcast_right, podcast_missed, podcast_insight FROM final_module_capstone WHERE user_id=$1', [studentA.id])).rows[0];
    C('3 map PDFs stored as BYTEA', !!(capRow?.map1_bytes?.length && capRow?.map2_bytes?.length && capRow?.map3_bytes?.length));
    C('3 podcast answers stored', !!(capRow?.podcast_right && capRow?.podcast_missed && capRow?.podcast_insight));

    // Download PDF as owner & as B (should be 403)
    const capDl = await api('GET', '/api/final/capstone-pdf/' + capRow.id + '/1', tokenA);
    C('GET /capstone-pdf/<id>/1 as owner → 200 PDF', capDl.status === 200 && capDl.contentType.includes('application/pdf'));
    const capDlB = await api('GET', '/api/final/capstone-pdf/' + capRow.id + '/1', tokenB);
    C('GET /capstone-pdf/<id>/1 as other student → 403', capDlB.status === 403);
    const capDlAdm = await api('GET', '/api/final/capstone-pdf/' + capRow.id + '/2', tokenAdmin);
    C('GET /capstone-pdf/<id>/2 as admin → 200 PDF', capDlAdm.status === 200 && capDlAdm.contentType.includes('application/pdf'));

    // Student A can fetch their own capstone status
    const myCap = await api('GET', '/api/final/my-capstone', tokenA);
    C('GET /my-capstone as A → 200', myCap.status === 200);

    /* ===== MODULE 2 — Myytinmurtaja ===== */
    S('Myytinmurtaja · PDF upload + 3 answers (student A)');
    const mythPdf = await tinyPdfBuffer('Myytinmurtajan argumentti');
    const mythResp = await postForm('/api/final/mythology-pdf-submit', tokenA, [
      { name: 'pdf', filename: 'argumentti.pdf', contentType: 'application/pdf', value: mythPdf },
      { name: 'myth_selected', value: 'Tekoäly on puolueeton — se ei syrji koska se ei ole ihminen' },
      { name: 'perplexity_finding', value: 'Perplexity-tutkimuksesta opin, että algoritminen vinouma juurtuu dataan.' },
      { name: 'strongest_point', value: 'Vahvin kohta: data ei ole puolueeton koska sen keränneet ihmiset eivät ole.' },
      { name: 'own_addition', value: 'Omasta työstäni tiedän, että rekrytointi-AI oppi vanhat ennakkoluulot datasta.' }
    ]);
    C('POST /mythology-pdf-submit → 200', mythResp.status === 200, 'status=' + mythResp.status + ' ' + (mythResp.json?.error || ''));
    const mythRow = (await pool.query('SELECT id, pdf_bytes, questions_json, ai_insight FROM mythology_submissions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1', [studentA.id])).rows[0];
    C('mythology PDF stored as BYTEA', !!mythRow?.pdf_bytes?.length);
    C('mythology questions_json stored', mythRow?.questions_json && Object.keys(mythRow.questions_json).length > 0);
    C('ai_insight present (OpenAI)', typeof mythRow?.ai_insight === 'string' && mythRow.ai_insight.length > 10, 'len=' + (mythRow?.ai_insight?.length || 0));

    // Owner can download; other student cannot
    const mythDl = await api('GET', '/api/final/mythology-pdf/' + mythRow.id, tokenA);
    C('GET /mythology-pdf/<id> as owner → 200 PDF', mythDl.status === 200 && mythDl.contentType.includes('application/pdf'));
    const mythDlB = await api('GET', '/api/final/mythology-pdf/' + mythRow.id, tokenB);
    C('GET /mythology-pdf/<id> as other student → 403', mythDlB.status === 403);

    /* ===== MODULE 3 — Rikkinäinen Prompti ===== */
    S('Rikkinäinen Prompti · save rounds 1 & 2');
    const rk1 = await api('POST', '/api/final/rikki-save', tokenA, {
      round: 1,
      payload: { score: 4, justifications: ['ok','hyvä'] }
    });
    C('POST /rikki-save round 1 → 200', rk1.status === 200);
    const rk2 = await api('POST', '/api/final/rikki-save', tokenA, {
      round: 2,
      payload: { predictions: ['a','b','c'] }
    });
    C('POST /rikki-save round 2 → 200', rk2.status === 200);
    const rkCount = (await pool.query('SELECT COUNT(*)::int AS n FROM broken_prompt_submissions WHERE user_id=$1', [studentA.id])).rows[0].n;
    C('2 rikki rows in DB', rkCount === 2);

    /* ===== Tekoäly tuomioistuimessa — DB + upload + OpenAI ===== */
    S('Tuomioistuin · submit-step2, step3 (PNG), generate-questions, answers, complete');
    const perplexityText =
      'E2E testilöydöt rivi 1: tutkimus X vuonna 2020. Riv 2: tilasto Y 45%. Riv 3: tapaus Z tuomioistuimessa. ' +
      'Lisää kontekstia jotta ylitämme kaksisataa merkkiä ja voimme tallentaa vaiheen kaksi. ' +
      'Tämä on keinotekoinen mutta kelvollinen Perplexity-tyyppinen raakateksti testiä varten.';
    const st2 = await api('POST', '/api/tuomioistuin/submit-step2', tokenA, {
      scenario: '01',
      perplexity_findings: perplexityText
    });
    C('POST tuomioistuin/submit-step2 → 200', st2.status === 200, 'status=' + st2.status);
    const courtSid = st2.json && st2.json.submission_id;
    C('court submission_id UUID', typeof courtSid === 'string' && courtSid.length > 30);
    const courtPng = pngBuffer();
    const st3 = await postForm('/api/tuomioistuin/submit-step3', tokenA, [
      { name: 'submission_id', value: courtSid },
      { name: 'gamma_url', value: 'https://gamma.app/docs/e2e-test-doc' },
      { name: 'canva_image', value: courtPng, filename: 'tuomio-kortti.png', contentType: 'image/png' }
    ]);
    C('POST tuomioistuin/submit-step3 (multipart PNG) → 200', st3.status === 200, 'status=' + st3.status);
    const canvaPath = st3.json && st3.json.canva_image_path;
    C('response canva_image_path', typeof canvaPath === 'string' && canvaPath.includes(courtSid));
    const imgOwn = await api('GET', '/api/tuomioistuin/canva-image/' + courtSid, tokenA);
    C('GET canva-image as owner → 200 image', imgOwn.status === 200 && /image/i.test(imgOwn.contentType));
    const imgOther = await api('GET', '/api/tuomioistuin/canva-image/' + courtSid, tokenB);
    C('GET canva-image as other student → 403', imgOther.status === 403);

    const gq = await api('POST', '/api/tuomioistuin/generate-questions', tokenA, { submission_id: courtSid });
    C('POST generate-questions → 200 (OpenAI)', gq.status === 200, 'status=' + gq.status);
    const qs = (gq.json && gq.json.questions) || [];
    C('three Socratic questions returned', qs.length === 3, 'n=' + qs.length);
    C('questions look substantive', qs.every(q => String(q).length >= 15));

    const longAns = 'Tämä on e2e-vastaus joka on tarkoituksella pitkä, jotta se ylittää 150 merkin rajan. ' +
      'Argumentoin että tekoälyn käyttö päätöksenteossa vaatii läpinäkyvyyttä, vastuullisuutta ja ihmisen valvontaa. ' +
      'En väitä että tämä olisi täydellinen vastaus, mutta se riittää testaamaan tallennuspolkua.';
    for (let i = 0; i < 3; i++) {
      const sa = await api('POST', '/api/tuomioistuin/submit-answer', tokenA, {
        submission_id: courtSid,
        index: i,
        answer: longAns + ' Kysymysindeksi ' + i + '.'
      });
      C('POST submit-answer idx ' + i + ' → 200', sa.status === 200);
    }
    const compCourt = await api('POST', '/api/tuomioistuin/complete', tokenA, { submission_id: courtSid });
    C('POST tuomioistuin/complete → 200 (OpenAI havainto)', compCourt.status === 200);
    const obs = (compCourt.json && compCourt.json.ai_observation) || '';
    C('ai_observation substantive', obs.length >= 80 && /Vastaustesi perusteella/i.test(obs));
    const courtRow = (await pool.query(
      'SELECT completed_at, followup_q1 IS NOT NULL AS has_q FROM court_submissions WHERE id = $1::uuid',
      [courtSid]
    )).rows[0];
    C('court row completed in DB', !!(courtRow && courtRow.completed_at && courtRow.has_q));

    /* ===== Rakenna oma AI-työkalu — generate-prompt, test, upload, complete ===== */
    S('Työkalurakentaja · generate-prompt (OpenAI), test, submit-step4, complete');
    const tbBody = {
      problem_description:
        'Toistuva ongelma: tiivistän kokousmuistiinpanoja toimenpiteiksi vähintään kerran viikossa tiimissäni. ' +
        'Tarvitsen rakenteen joka toistuu.',
      field_role:
        'Olet kokousanalyytikko joka on erikoistunut B2B-projekteihin ja muunnat raakamuistiinpanot toimenpiteiksi ilman keksittyjä nimiä.',
      field_input:
        'Käyttäjä liittää kokouksen muistiinpanot: päätökset, avoimet kysymykset ja henkilöiden nimet jos mainittu.',
      field_structure:
        '**Päätökset:** numeroitu lista. **Toimenpiteet:** Tehtävä — Vastuu — Deadline. **Riskit:** lista. **Seuraavat askeleet:** lyhyt lista.',
      field_constraints:
        'Älä keksi osallistujia. Älä lisää bullet-listoja rajoitteiden ulkopuolella. Älä tiivistä yli 40% ilman merkintää.',
      field_edge_cases:
        'Jos syöte alle 40 sanaa, pyydä lisää kontekstia. Jos kieli on englanti, vastaa suomeksi ja mainitse kieli.'
    };
    const gp = await api('POST', '/api/tyokalurakentaja/generate-prompt', tokenA, tbBody);
    C('POST generate-prompt → 200 (OpenAI)', gp.status === 200);
    const tbId = gp.json && gp.json.submission_id;
    const sysPrompt = (gp.json && gp.json.system_prompt) || '';
    C('system_prompt from AI non-trivial', sysPrompt.length >= 120);
    C('system prompt mentions role or kokous', /kokous|analyyt|tehtävä|rooli/i.test(sysPrompt));

    const te0 = await api('POST', '/api/tyokalurakentaja/test', tokenA, {
      submission_id: tbId,
      slot: 0,
      system_prompt: sysPrompt,
      test_input:
        'Päätettiin: API dokumentoidaan perjantaihin. Matti vie kirjautumisen. Avoin: virhekoodit. ' +
        'Seuraava palaveri tiistaina.'
    });
    C('POST tyokalurakentaja/test slot 0 → 200', te0.status === 200);
    const out0 = (te0.json && te0.json.output) || '';
    C('test output structured / substantive', out0.length >= 40);

    const tbStep4 = await postForm('/api/tyokalurakentaja/submit-step4', tokenA, [
      { name: 'submission_id', value: tbId },
      { name: 'gamma_url', value: 'https://gamma.app/docs/e2e-tool-doc' },
      { name: 'reflection_text', value: 'R'.repeat(100) + ' Reflektio: testi paljasti että rajoitteet piti täsmentää reunatapauksissa.' },
      { name: 'canva_card', value: pngBuffer(), filename: 'tool-card.png', contentType: 'image/png' }
    ]);
    C('POST submit-step4 (multipart) → 200', tbStep4.status === 200);
    const insight50 = Array.from({ length: 52 }, () => 'sana').join(' ');
    const tbDone = await api('POST', '/api/tyokalurakentaja/complete', tokenA, {
      submission_id: tbId,
      tool_name: 'E2EKokousTyökalu',
      one_sentence_description: 'Tiimin kokousmuistiinpanot toimenpiteiksi ilman manuaalista säätöä.',
      final_insight: insight50
    });
    C('POST tyokalurakentaja/complete → 200', tbDone.status === 200);
    const tbCardGet = await api('GET', '/api/tyokalurakentaja/canva-card/' + tbId, tokenA);
    C('GET canva-card as owner → 200 image', tbCardGet.status === 200 && /image/i.test(tbCardGet.contentType));
    const tbRow = (await pool.query(
      'SELECT completed_at, LENGTH(system_prompt_v1::text) AS sp_len FROM tool_builder_submissions WHERE id = $1::uuid',
      [tbId]
    )).rows[0];
    C('tool_builder row completed in DB', !!(tbRow && tbRow.completed_at && tbRow.sp_len > 50));

    const admCourtRows = await api('GET', '/api/admin/court-module-submissions', tokenAdmin);
    C('admin court list includes A submission', (admCourtRows.json.submissions || []).some(s => s.id === courtSid));
    const admTbRows = await api('GET', '/api/admin/tool-builder-submissions', tokenAdmin);
    C('admin tool-builder list includes A submission', (admTbRows.json.submissions || []).some(s => s.id === tbId));

    /* ===== ADMIN VIEWS ===== */
    S('Admin endpoints — visibility + isolation');
    const asA = await api('GET', '/api/final/admin-loppumoduuli', tokenA);
    C('admin-loppumoduuli as student A → 403', asA.status === 403);
    const admLop = await api('GET', '/api/final/admin-loppumoduuli', tokenAdmin);
    C('admin-loppumoduuli as admin → 200', admLop.status === 200);
    const admItem = (admLop.json?.items || []).find(it => it.user_id === studentA.id);
    C('admin sees student A in unified loppumoduuli view', !!admItem);
    C('  · reflection present', !!admItem?.reflection);
    C('  · capstone present with 3 map flags', admItem?.capstone?.has_map1 && admItem?.capstone?.has_map2 && admItem?.capstone?.has_map3);
    C('  · gallery present', Array.isArray(admItem?.gallery) && admItem.gallery.length === 1);

    const admMyth = await api('GET', '/api/final/admin-mythology', tokenAdmin);
    C('admin-mythology as admin → 200', admMyth.status === 200);
    C('admin sees A\'s mythology submission', (admMyth.json?.items || []).some(it => it.user_id === studentA.id));

    const admRki = await api('GET', '/api/final/admin-rikki', tokenAdmin);
    C('admin-rikki as admin → 200', admRki.status === 200);
    C('admin sees A\'s rikki submissions (round 1 & 2)', ((admRki.json?.items || []).find(it => it.user_id === studentA.id)?.submissions || []).length === 2);

    const admCourtList = await api('GET', '/api/admin/court-module-submissions', tokenAdmin);
    C('court-module-submissions as admin → 200', admCourtList.status === 200 && Array.isArray(admCourtList.json?.submissions));
    const admTbList = await api('GET', '/api/admin/tool-builder-submissions', tokenAdmin);
    C('tool-builder-submissions as admin → 200', admTbList.status === 200 && Array.isArray(admTbList.json?.submissions));
    const stCourtList = await api('GET', '/api/admin/court-module-submissions', tokenA);
    C('court-module-submissions as student → 403', stCourtList.status === 403);

    /* ===== PER-USER ISOLATION: student B endpoints ===== */
    S('Isolation: student B sees empty / own data');
    const refB = await api('GET', '/api/final/gallery', tokenB);
    C('B gallery is empty', refB.status === 200 && refB.json.items.length === 0);
    const myCapB = await api('GET', '/api/final/my-capstone', tokenB);
    C('B my-capstone returns empty', myCapB.status === 200 && (myCapB.json?.item == null || myCapB.json?.capstone == null));

    /* ===== ADMIN HTML PAGES ===== */
    /* ===== MODULE 4 — Kurssipalaute (stars) ===== */
    S('Kurssipalaute · save + validation + upsert');
    // 1. Try incomplete ratings — should 400
    const bad = await api('POST', '/api/final/feedback-save', tokenA, {
      q1_rating: 5, q2_rating: 4, q3_rating: null, q4_rating: 5, q5_rating: 5, comment: 'puuttuu'
    });
    C('POST /feedback-save with missing rating → 400', bad.status === 400);
    // 2. Save complete feedback
    const good = await api('POST', '/api/final/feedback-save', tokenA, {
      q1_rating: 5, q2_rating: 4, q3_rating: 5, q4_rating: 5, q5_rating: 4, comment: 'Kurssi oli mahtava! 🌟'
    });
    C('POST /feedback-save (all 5 ratings) → 200', good.status === 200, 'status=' + good.status);
    // 3. Verify in DB
    const fbRow = (await pool.query('SELECT q1_rating,q2_rating,q3_rating,q4_rating,q5_rating,comment FROM course_feedback WHERE user_id=$1', [studentA.id])).rows[0];
    C('feedback stored in DB with all 5 ratings', fbRow && fbRow.q1_rating === 5 && fbRow.q2_rating === 4 && fbRow.q3_rating === 5 && fbRow.q4_rating === 5 && fbRow.q5_rating === 4);
    C('comment stored', fbRow?.comment === 'Kurssi oli mahtava! 🌟');
    // 4. Upsert: change ratings, confirm single row
    const upsert = await api('POST', '/api/final/feedback-save', tokenA, {
      q1_rating: 4, q2_rating: 4, q3_rating: 4, q4_rating: 4, q5_rating: 5, comment: 'Päivitys'
    });
    C('POST /feedback-save again (upsert) → 200', upsert.status === 200);
    const fbCount = (await pool.query('SELECT COUNT(*)::int AS n FROM course_feedback WHERE user_id=$1', [studentA.id])).rows[0].n;
    C('only 1 row per user after upsert', fbCount === 1);
    const fbNew = (await pool.query('SELECT q1_rating, comment FROM course_feedback WHERE user_id=$1', [studentA.id])).rows[0];
    C('upsert updated values', fbNew.q1_rating === 4 && fbNew.comment === 'Päivitys');
    // 5. GET /my-feedback
    const myFb = await api('GET', '/api/final/my-feedback', tokenA);
    C('GET /my-feedback returns saved feedback', myFb.status === 200 && myFb.json?.feedback?.q5_rating === 5);
    // 6. Isolation: student B has no feedback
    const bFb = await api('GET', '/api/final/my-feedback', tokenB);
    C('GET /my-feedback as B → null (isolated)', bFb.status === 200 && bFb.json?.feedback == null);
    // 7. Admin view
    const asStudentFb = await api('GET', '/api/final/admin-feedback', tokenA);
    C('admin-feedback as student → 403', asStudentFb.status === 403);
    const admFb = await api('GET', '/api/final/admin-feedback', tokenAdmin);
    C('admin-feedback as admin → 200', admFb.status === 200);
    C('admin sees student A feedback', (admFb.json?.items || []).some(it => it.user_id === studentA.id));
    C('admin gets aggregate stats (n, avg_q1…q5)', admFb.json?.stats?.n >= 1 && admFb.json?.stats?.avg_q1 != null);

    S('Admin HTML pages mounted');
    for (const p of ['/admin/loppumoduuli', '/admin/mythology', '/admin/rikkinainen-prompti', '/admin/tuomioistuin', '/admin/tyokalurakentaja', '/admin/palaute']) {
      const r = await api('GET', p, tokenAdmin);
      C('GET ' + p + ' as admin → 200 HTML', r.status === 200 && /html/i.test(r.contentType));
      const r2 = await api('GET', p, tokenA);
      C('GET ' + p + ' as student → 403', r2.status === 403);
    }

    S('All tests completed');
  } catch (e) {
    console.error('\n\x1b[31mTEST EXCEPTION:\x1b[0m', e);
    process.exitCode = 1;
  } finally {
    S('Cleanup');
    for (const u of [studentA, studentB, admin]) {
      if (u?.id) {
        try { await pool.query('DELETE FROM final_module_reflections WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM final_module_capstone WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM final_module_gallery WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM mythology_submissions WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM broken_prompt_submissions WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM course_feedback WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM court_submissions WHERE user_id=$1', [u.id]); } catch (e) {}
        try { await pool.query('DELETE FROM tool_builder_submissions WHERE user_id=$1', [u.id]); } catch (e) {}
        await cleanupUser(u.id);
      }
    }
    await pool.end();
    console.log('\nExit code: ' + (process.exitCode || 0));
  }
})();
