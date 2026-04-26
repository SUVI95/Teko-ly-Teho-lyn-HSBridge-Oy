const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { fetch } = require('undici');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

async function ensureToolBuilderTables() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  } catch (e) {
    /* ignore */
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tool_builder_submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_description TEXT,
      field_role TEXT,
      field_input TEXT,
      field_structure TEXT,
      field_constraints TEXT,
      field_edge_cases TEXT,
      system_prompt_raw TEXT,
      system_prompt_v1 TEXT,
      system_prompt_v2 TEXT,
      test_inputs JSONB DEFAULT '[]'::jsonb,
      test_outputs JSONB DEFAULT '[]'::jsonb,
      reflection_text TEXT,
      tool_name VARCHAR(100),
      one_sentence_description VARCHAR(300),
      gamma_url VARCHAR(500),
      canva_card_path VARCHAR(500),
      canva_card_bytes BYTEA,
      canva_card_mime VARCHAR(50),
      final_insight TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const alters = [
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS system_prompt_raw TEXT`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS prompt_versions JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT '[]'::jsonb`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS ai_verdict TEXT`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS pitch_text VARCHAR(300)`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS weaknesses_text TEXT`,
    `ALTER TABLE tool_builder_submissions ADD COLUMN IF NOT EXISTS verdict_generated_at TIMESTAMP`
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (e) {
      /* ignore */
    }
  }
  await pool.query('CREATE INDEX IF NOT EXISTS idx_tool_builder_user ON tool_builder_submissions(user_id)');
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_tool_builder_completed ON tool_builder_submissions(completed_at DESC)'
  );
}

const canvaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Vain PNG tai JPG'));
  }
});

async function openaiChat(system, userMessage, model = 'gpt-4o', maxTokens = 1800, temperature = 0.7) {
  const key = envTrim('OPENAI_API_KEY');
  if (!key) {
    const err = new Error('AI ei ole konfiguroitu');
    err.status = 503;
    throw err;
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage }
      ],
      max_tokens: maxTokens,
      temperature
    })
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('OpenAI tyokalurakentaja error:', t);
    const err = new Error('openai_error');
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function loadOwned(submissionId, userId) {
  if (!isUuid(submissionId)) return null;
  const r = await pool.query(
    `SELECT * FROM tool_builder_submissions WHERE id = $1::uuid AND user_id = $2`,
    [submissionId, userId]
  );
  return r.rows[0] || null;
}

function validateFiveFields(body) {
  const fields = {
    problem: (body.problem_description || '').toString().trim(),
    role: (body.field_role || '').toString().trim(),
    input: (body.field_input || '').toString().trim(),
    structure: (body.field_structure || '').toString().trim(),
    constraints: (body.field_constraints || '').toString().trim(),
    edges: (body.field_edge_cases || '').toString().trim()
  };
  if (fields.problem.length < 60) {
    return { error: 'Tarkenna ongelma — vähintään 60 merkkiä.' };
  }
  if (fields.role.length < 80) return { error: 'Rooli vaatii vähintään 80 merkkiä.' };
  if (fields.input.length < 80) return { error: 'Syöte vaatii vähintään 80 merkkiä.' };
  if (fields.structure.length < 100) return { error: 'Rakenne vaatii vähintään 100 merkkiä.' };
  if (fields.constraints.length < 80) return { error: 'Rajoitteet vaativat vähintään 80 merkkiä.' };
  if (fields.edges.length < 60) return { error: 'Reunatapaukset vaativat vähintään 60 merkkiä.' };
  return { fields };
}

function fieldsUserBlock(f) {
  return `1. ROOLI:
${f.role}

2. SYÖTE:
${f.input}

3. RAKENNE:
${f.structure}

4. RAJOITTEET:
${f.constraints}

5. REUNATAPAUKSET:
${f.edges}`;
}

const ASSEMBLE_SYSTEM = `Olet promptisuunnittelun asiantuntija. Saat käyttäjän korjatun luonnoksen system promptista sekä viisi suunnittelukenttää jotka kuvaavat AI-työkalun. Rakenna niistä täydellinen, heti käytettävä system prompt suomeksi.

Rakenne jota noudatat:
1. Roolimäärittely (1–2 lausetta)
2. Syötteen kuvaus (1 lause)
3. Output-rakenne (tarkka, kopioitu käyttäjän kenttä 3:sta mutta siistittynä)
4. Rajoitteet (lista, täsmälleen mitä käyttäjä kirjoitti kenttään 4)
5. Reunatapausten käsittely

Huomioi käyttäjän korjattu luonnos lähtökohtana sävylle ja painotuksille, mutta lopputulos on oltava yhtenäinen system prompt.

Palauta VAIN valmis system prompt. Ei otsikkoa "System Prompt:". Ei selityksiä ennen tai jälkeen. Aloita suoraan roolimäärittelyllä.`;

/** Vaihe 2 — vaihe 1: heikkoudet raakapromptista */
router.post('/evaluate-raw-prompt', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const v = validateFiveFields(req.body || {});
    if (v.error) return res.status(400).json({ error: v.error });
    const { fields } = v;
    const rawDraft = (req.body.raw_system_prompt || '').toString().trim();
    if (rawDraft.length < 80) {
      return res.status(400).json({ error: 'Raakaprompt vaatii vähintään 80 merkkiä.' });
    }
    if (rawDraft.length > 12000) {
      return res.status(400).json({ error: 'Liian pitkä luonnos.' });
    }

    const sys = `Olet kokenut prompt-insinööri. Saat aloittelevan käyttäjän kirjoittaman raakaversion system promptista sekä heidän viisi suunnittelukenttäänsä. Listaa TASAN KOLME konkreettista heikkoutta tässä promptissa. Jokainen heikkous: yksi lause joka kuvaa ongelman + yksi lause joka kertoo mitä tapahtuu jos sitä ei korjata. Ei johdantoa. Ei kehuja. Aloita suoraan: "1."`;

    const userMsg = `Viisi kenttää:
${fieldsUserBlock(fields)}

Käyttäjän raakaprompt:
${rawDraft}`;

    let weaknesses = '';
    try {
      weaknesses = await openaiChat(sys, userMsg, 'gpt-4o', 900, 0.5);
    } catch (aiErr) {
      console.error('evaluate-raw AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
    weaknesses = String(weaknesses || '').trim();
    if (!weaknesses) {
      return res.status(502).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    let id = isUuid(req.body.submission_id) ? req.body.submission_id : null;
    if (id) {
      const owned = await loadOwned(id, req.user.id);
      if (!owned) id = null;
    }
    if (!id) {
      id = uuidv4();
      await pool.query(
        `INSERT INTO tool_builder_submissions
          (id, user_id, problem_description, field_role, field_input, field_structure,
           field_constraints, field_edge_cases, system_prompt_raw, system_prompt_v1, weaknesses_text)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          req.user.id,
          fields.problem,
          fields.role,
          fields.input,
          fields.structure,
          fields.constraints,
          fields.edges,
          rawDraft,
          rawDraft,
          weaknesses
        ]
      );
    } else {
      await pool.query(
        `UPDATE tool_builder_submissions
         SET problem_description = $1, field_role = $2, field_input = $3,
             field_structure = $4, field_constraints = $5, field_edge_cases = $6,
             system_prompt_raw = $7, system_prompt_v1 = $8, weaknesses_text = $9,
             system_prompt_v2 = NULL, prompt_versions = '[]'::jsonb, chat_history = '[]'::jsonb,
             ai_verdict = NULL, verdict_generated_at = NULL
         WHERE id = $10::uuid AND user_id = $11`,
        [
          fields.problem,
          fields.role,
          fields.input,
          fields.structure,
          fields.constraints,
          fields.edges,
          rawDraft,
          rawDraft,
          weaknesses,
          id,
          req.user.id
        ]
      );
    }

    res.json({ success: true, submission_id: id, weaknesses });
  } catch (e) {
    console.error('evaluate-raw-prompt:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

/** Vaihe 2 — vaihe 2: kokoa lopullinen system prompt */
router.post('/assemble-final-prompt', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, improved_system_prompt } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });

    const improved = (improved_system_prompt || '').toString().trim();
    if (improved.length < 30) {
      return res.status(400).json({ error: 'Kirjoita korjattu versio — vähintään 30 merkkiä.' });
    }

    const fields = {
      problem: (sub.problem_description || '').trim(),
      role: (sub.field_role || '').trim(),
      input: (sub.field_input || '').trim(),
      structure: (sub.field_structure || '').trim(),
      constraints: (sub.field_constraints || '').trim(),
      edges: (sub.field_edge_cases || '').trim()
    };
    const v = validateFiveFields({
      problem_description: fields.problem,
      field_role: fields.role,
      field_input: fields.input,
      field_structure: fields.structure,
      field_constraints: fields.constraints,
      field_edge_cases: fields.edges
    });
    if (v.error) return res.status(400).json({ error: v.error });

    const userMessage = `Käyttäjän korjattu luonnos (lähtökohta):
${improved}

Viisi suunnittelukenttää:
${fieldsUserBlock(v.fields)}`;

    let prompt = '';
    try {
      prompt = await openaiChat(ASSEMBLE_SYSTEM, userMessage, 'gpt-4o', 1500, 0.4);
    } catch (aiErr) {
      console.error('assemble-final AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
    prompt = String(prompt || '').trim();
    if (!prompt) {
      return res.status(502).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    const nowIso = new Date().toISOString();
    const initialVersions = [{ n: 1, text: prompt, saved_at: nowIso, source: 'assemble' }];

    await pool.query(
      `UPDATE tool_builder_submissions
       SET system_prompt_v2 = $1,
           prompt_versions = $2::jsonb,
           chat_history = '[]'::jsonb,
           ai_verdict = NULL,
           verdict_generated_at = NULL,
           test_inputs = '[]'::jsonb,
           test_outputs = '[]'::jsonb
       WHERE id = $3::uuid AND user_id = $4`,
      [prompt, JSON.stringify(initialVersions), submission_id, req.user.id]
    );

    res.json({ success: true, submission_id, system_prompt: prompt, prompt_version_n: 1 });
  } catch (e) {
    console.error('assemble-final-prompt:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

/** Tallenna uusi prompt-versio (vaihe 3) */
router.post('/save-prompt-version', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, system_prompt } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    const text = (system_prompt || '').toString().trim();
    if (text.length < 30) {
      return res.status(400).json({ error: 'System prompt liian lyhyt.' });
    }

    let versions = Array.isArray(sub.prompt_versions) ? [...sub.prompt_versions] : [];
    const maxN = versions.reduce((m, p) => Math.max(m, parseInt(p.n, 10) || 0), 0);
    const n = maxN + 1;
    const nowIso = new Date().toISOString();
    versions.push({ n, text, saved_at: nowIso, source: 'user_edit' });

    await pool.query(
      `UPDATE tool_builder_submissions
       SET system_prompt_v2 = $1, prompt_versions = $2::jsonb
       WHERE id = $3::uuid AND user_id = $4`,
      [text, JSON.stringify(versions), submission_id, req.user.id]
    );

    res.json({
      success: true,
      prompt_version_n: n,
      prompt_versions: versions,
      saved_at: versions[versions.length - 1].saved_at
    });
  } catch (e) {
    console.error('save-prompt-version:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/test', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, system_prompt, test_input } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });

    const sys = (system_prompt || sub.system_prompt_v2 || '').toString().trim();
    if (!sys || sys.length < 30) {
      return res.status(400).json({ error: 'System prompt puuttuu' });
    }
    const input = (test_input || '').toString().trim();
    if (!input) {
      return res.status(400).json({ error: 'Testisyöte puuttuu' });
    }
    if (input.length > 4000) {
      return res.status(400).json({ error: 'Liian pitkä testisyöte (max 4000 merkkiä)' });
    }

    let output = '';
    try {
      output = await openaiChat(sys, input, 'gpt-4o', 800, 0.7);
    } catch (aiErr) {
      console.error('toolbuilder test AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    const nowIso = new Date().toISOString();
    let chat = Array.isArray(sub.chat_history) ? [...sub.chat_history] : [];
    chat.push({ role: 'user', content: input, at: nowIso });
    chat.push({ role: 'assistant', content: output, at: new Date().toISOString() });

    const legacyIn = Array.isArray(sub.test_inputs) ? [...sub.test_inputs] : [];
    const legacyOut = Array.isArray(sub.test_outputs) ? [...sub.test_outputs] : [];
    const pairIdx = legacyIn.filter(Boolean).length;
    legacyIn.push({ turn: pairIdx, input, at: nowIso });
    legacyOut.push({ turn: pairIdx, output, model: 'gpt-4o', at: new Date().toISOString() });

    await pool.query(
      `UPDATE tool_builder_submissions
       SET chat_history = $1::jsonb, test_inputs = $2::jsonb, test_outputs = $3::jsonb,
           system_prompt_v2 = $4
       WHERE id = $5::uuid AND user_id = $6`,
      [JSON.stringify(chat), JSON.stringify(legacyIn), JSON.stringify(legacyOut), sys, submission_id, req.user.id]
    );

    const userMessageCount = chat.filter(m => m.role === 'user').length;
    res.json({ success: true, output, user_message_count: userMessageCount, chat_history: chat });
  } catch (e) {
    console.error('toolbuilder test:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/chat-verdict', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, system_prompt } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });

    const chat = Array.isArray(sub.chat_history) ? sub.chat_history : [];
    const userMsgs = chat.filter(m => m.role === 'user');
    if (userMsgs.length < 5) {
      return res.status(400).json({ error: 'Lähetä vähintään 5 testiviestiä ennen arviota.' });
    }

    const activePrompt = (system_prompt || sub.system_prompt_v2 || '').toString().trim();
    if (!activePrompt) {
      return res.status(400).json({ error: 'System prompt puuttuu' });
    }

    let qa = '';
    for (let i = 0; i < chat.length; i++) {
      const m = chat[i];
      if (m.role === 'user') {
        qa += `K: ${m.content}\n`;
      } else if (m.role === 'assistant') {
        qa += `V: ${m.content}\n\n`;
      }
    }

    const sys = `Olet kriittinen laadunarvioija. Saat AI-työkalun system promptin ja testikeskustelun. Kirjoita lyhyt arvio — 4-6 lausetta. Rakenne tasan näin: Ensin yksi lause siitä mikä toimii. Sitten kaksi lausetta siitä mikä on rikki tai epäjohdonmukainen. Sitten yksi lause siitä mitä käyttäjän pitää korjata ennen kuin tämä työkalu on käyttökelpoinen. Aloita suoraan arviolla, ei johdannolla.`;

    const userMessage = `System prompt:
${activePrompt.slice(0, 12000)}

Testikeskustelu:
${qa.slice(0, 14000)}`;

    let verdict = '';
    try {
      verdict = await openaiChat(sys, userMessage, 'gpt-4o', 500, 0.45);
    } catch (aiErr) {
      console.error('chat-verdict AI:', aiErr);
      return res.status(503).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
    verdict = String(verdict || '').trim();
    if (!verdict) {
      return res.status(502).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }

    await pool.query(
      `UPDATE tool_builder_submissions SET ai_verdict = $1, verdict_generated_at = CURRENT_TIMESTAMP WHERE id = $2::uuid AND user_id = $3`,
      [verdict, submission_id, req.user.id]
    );
    const tsR = await pool.query(
      `SELECT verdict_generated_at FROM tool_builder_submissions WHERE id = $1::uuid AND user_id = $2`,
      [submission_id, req.user.id]
    );
    const verdict_generated_at = tsR.rows[0]?.verdict_generated_at || null;

    res.json({ success: true, verdict, verdict_generated_at });
  } catch (e) {
    console.error('chat-verdict:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.post('/submit-step4', authenticateToken, (req, res) => {
  canvaUpload.single('canva_card')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Tiedosto on liian suuri (max 5MB)' });
      }
      return res.status(400).json({ error: err.message || 'Virheellinen tiedosto' });
    }
    try {
      await ensureToolBuilderTables();
      const { submission_id, gamma_url, reflection_text, system_prompt_v2 } = req.body || {};
      if (!isUuid(submission_id)) {
        return res.status(400).json({ error: 'Virheellinen tunniste' });
      }
      const sub = await loadOwned(submission_id, req.user.id);
      if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });

      const url = (gamma_url || '').toString().trim();
      if (!/^https?:\/\/[^\s]+$/i.test(url)) {
        return res.status(400).json({ error: 'Anna kelvollinen URL (https://gamma.app/...)' });
      }
      if (url.length > 500) {
        return res.status(400).json({ error: 'URL on liian pitkä' });
      }
      const reflection = (reflection_text || '').toString().trim();
      if (reflection.length < 100) {
        return res.status(400).json({ error: 'Reflektio vaatii vähintään 100 merkkiä.' });
      }
      if (reflection.length > 8000) {
        return res.status(400).json({ error: 'Reflektio liian pitkä.' });
      }

      if (!sub.ai_verdict || !String(sub.ai_verdict).trim()) {
        return res.status(400).json({ error: 'Pyydä ensin tekoälyarvio vaiheessa 3.' });
      }

      const verdictAt = sub.verdict_generated_at ? new Date(sub.verdict_generated_at) : null;
      const versions = Array.isArray(sub.prompt_versions) ? sub.prompt_versions : [];
      const editAfterVerdict = versions.some(p => {
        if (!verdictAt || !p.saved_at) return false;
        return new Date(p.saved_at) > verdictAt && p.source === 'user_edit';
      });
      if (!editAfterVerdict) {
        return res.status(400).json({ error: 'Päivitä promptti arvion jälkeen ennen jatkamista.' });
      }

      let lastUserEditAt = null;
      for (const p of versions) {
        if (p.source === 'user_edit' && p.saved_at && verdictAt && new Date(p.saved_at) > verdictAt) {
          const t = new Date(p.saved_at);
          if (!lastUserEditAt || t > lastUserEditAt) lastUserEditAt = t;
        }
      }
      if (!lastUserEditAt) {
        return res.status(400).json({ error: 'Tallenna promptin muutos arvion jälkeen.' });
      }

      const chat = Array.isArray(sub.chat_history) ? sub.chat_history : [];
      let userAfter = 0;
      for (const m of chat) {
        if (m.role === 'user' && m.at && new Date(m.at) > lastUserEditAt) {
          userAfter++;
        }
      }
      if (userAfter < 2) {
        return res.status(400).json({
          error: 'Lähetä vähintään 2 uutta testiviestiä promptin päivityksen jälkeen.'
        });
      }

      const v2 = (system_prompt_v2 || '').toString().trim() || sub.system_prompt_v2 || null;

      let canvaPath = sub.canva_card_path;
      let canvaBytes = sub.canva_card_bytes;
      let canvaMime = sub.canva_card_mime;
      if (req.file && req.file.buffer) {
        canvaPath = `/api/tyokalurakentaja/canva-card/${submission_id}`;
        canvaBytes = req.file.buffer;
        canvaMime = req.file.mimetype || 'image/png';
      } else if (!canvaBytes) {
        return res.status(400).json({ error: 'Lataa Canva-kortti (PNG tai JPG)' });
      }

      await pool.query(
        `UPDATE tool_builder_submissions
         SET gamma_url = $1, reflection_text = $2, system_prompt_v2 = $3,
             canva_card_path = $4, canva_card_bytes = $5, canva_card_mime = $6
         WHERE id = $7::uuid AND user_id = $8`,
        [url, reflection, v2, canvaPath, canvaBytes, canvaMime, submission_id, req.user.id]
      );

      res.json({ success: true, canva_card_path: canvaPath });
    } catch (e) {
      console.error('toolbuilder submit-step4:', e);
      res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
    }
  });
});

router.get('/canva-card/:id', authenticateToken, async (req, res) => {
  const id = (req.params.id || '').trim();
  if (!isUuid(id)) return res.status(400).send('Virheellinen tunniste');
  try {
    await ensureToolBuilderTables();
    const r = await pool.query(
      `SELECT user_id, canva_card_bytes, canva_card_mime
       FROM tool_builder_submissions WHERE id = $1::uuid`,
      [id]
    );
    if (!r.rows.length) return res.status(404).send('Ei löydy');
    const row = r.rows[0];
    if (row.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).send('Pääsy kielletty');
    }
    if (!row.canva_card_bytes) return res.status(404).send('Kuva puuttuu');
    res.setHeader('Content-Type', row.canva_card_mime || 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="tyokalukortti.png"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(Buffer.from(row.canva_card_bytes));
  } catch (e) {
    console.error('toolbuilder canva-card:', e);
    return res.status(500).send('Virhe');
  }
});

function countWords(s) {
  return (String(s || '').trim().match(/\S+/g) || []).length;
}

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const { submission_id, tool_name, one_sentence_description, final_insight, pitch_text } = req.body || {};
    if (!isUuid(submission_id)) {
      return res.status(400).json({ error: 'Virheellinen tunniste' });
    }
    const sub = await loadOwned(submission_id, req.user.id);
    if (!sub) return res.status(404).json({ error: 'Tallennusta ei löytynyt' });
    if (!sub.gamma_url || !sub.canva_card_bytes || !sub.reflection_text) {
      return res.status(400).json({ error: 'Suorita ensin vaihe 4' });
    }

    const name = (tool_name || '').toString().trim();
    const desc = (one_sentence_description || '').toString().trim();
    const insight = (final_insight || '').toString().trim();
    const pitch = (pitch_text || '').toString().trim();

    if (!name || name.length > 40) {
      return res.status(400).json({ error: 'Anna työkalulle nimi (1–40 merkkiä).' });
    }
    if (!desc || desc.length > 200) {
      return res.status(400).json({ error: 'Yhden lauseen kuvaus (1–200 merkkiä).' });
    }
    if (countWords(insight) < 50) {
      return res.status(400).json({ error: 'Kirjoita oivalluksesi vähintään 50 sanalla.' });
    }
    if (insight.length > 6000) {
      return res.status(400).json({ error: 'Liian pitkä — leikkaa enintään 6000 merkkiin.' });
    }
    if (!pitch || pitch.length > 300) {
      return res.status(400).json({ error: 'Kirjoita kollegaviesti (1–300 merkkiä).' });
    }

    await pool.query(
      `UPDATE tool_builder_submissions
       SET tool_name = $1, one_sentence_description = $2, final_insight = $3, pitch_text = $4,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $5::uuid AND user_id = $6`,
      [name.slice(0, 40), desc.slice(0, 300), insight, pitch.slice(0, 300), submission_id, req.user.id]
    );

    res.json({
      success: true,
      tool_name: name,
      one_sentence_description: desc,
      gamma_url: sub.gamma_url,
      canva_card_path: sub.canva_card_path
    });
  } catch (e) {
    console.error('toolbuilder complete:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

router.get('/my-submission', authenticateToken, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const r = await pool.query(
      `SELECT id, problem_description, field_role, field_input, field_structure,
              field_constraints, field_edge_cases,
              system_prompt_raw, system_prompt_v1, system_prompt_v2, weaknesses_text,
              prompt_versions, chat_history, ai_verdict, verdict_generated_at,
              test_inputs, test_outputs, reflection_text,
              tool_name, one_sentence_description, pitch_text, gamma_url, canva_card_path,
              final_insight, completed_at, created_at
       FROM tool_builder_submissions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json({ submission: r.rows[0] || null });
  } catch (e) {
    console.error('toolbuilder my-submission:', e);
    res.status(500).json({ error: 'Jokin meni pieleen — yritä uudelleen' });
  }
});

module.exports = { router, ensureToolBuilderTables };
