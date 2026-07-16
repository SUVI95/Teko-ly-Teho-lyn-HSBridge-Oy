#!/usr/bin/env node
/**
 * Smoke: moduuli9-haastattelu autosave covers every exercise + round-trips via API.
 *
 * Usage: node scripts/smoke-haastattelu-autosave.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD, BASE_URL
 */
const base = (process.argv[2] || process.env.BASE_URL || 'https://aipolku.duunijobs.fi').replace(/\/$/, '');

function pass(msg) {
  console.log('  ✓', msg);
}
function fail(msg) {
  console.error('  ✗', msg);
  process.exitCode = 1;
}

async function req(method, path, body, cookie) {
  const headers = { Accept: 'application/json, text/html, */*' };
  if (cookie) headers.Cookie = cookie;
  if (body != null) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + path, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }
  return { status: r.status, json, text, headers: r.headers };
}

function parseCookie(setCookie) {
  const m = String(setCookie || '').match(/session_token=([^;]+)/);
  return m ? 'session_token=' + m[1] : '';
}

const EXERCISE_FIELD_IDS = [
  'w_s', 'w_t', 'w_a', 'w_r',
  'w2_s', 'w2_t', 'w2_a', 'w2_r',
  'w3_s', 'w3_t', 'w3_a', 'w3_r',
  'w_vastav',
  'hp1', 'hp2', 'hp3', 'hpFinal',
  'companyFact', 'w_company',
  'w_weak', 'w_why', 'w_palkka'
];

const WIRING_NEEDLES = [
  'haSnapshot',
  'saveProgress',
  'applyHaData',
  'initHaPersistence',
  'module-work.js',
  '__DISABLE_GLOBAL_MODULE_AUTOSAVE__',
  'flushHaProgress',
  'pickBestHaData',
  'HA_TEXT_KEYS',
  'starVoiceDone',
  'starVoiceRecordings',
  'mockSession',
  'stfAnswers',
  'scenPicks',
  'browseGo',
  'haMenuBtn'
];

function buildFullSnapshot() {
  const marker = 'smoke-ha-' + Date.now();
  return {
    v: 1,
    ts: Date.now(),
    curScreen: '8b',
    S: {
      startKey: 'a',
      w_s: marker + '-star1-s',
      w_t: marker + '-star1-t',
      w_a: marker + '-star1-a',
      w_r: marker + '-star1-r',
      w2_s: marker + '-star2-s',
      w2_t: marker + '-star2-t',
      w2_a: marker + '-star2-a',
      w2_r: marker + '-star2-r',
      w3_s: marker + '-star3-s',
      w3_t: marker + '-star3-t',
      w3_a: marker + '-star3-a',
      w3_r: marker + '-star3-r',
      w_vastav: marker + '-vastav',
      hp1: marker + '-hp1',
      hp2: marker + '-hp2',
      hp3: marker + '-hp3',
      hpBuilt: marker + '-hp-built',
      hpFinal: marker + '-hp-final',
      companyName: 'Elisa',
      companyUrl: 'https://www.elisa.fi/',
      companyFact: marker + '-company-fact-long-enough',
      w_company: marker + '-company-answer-long-enough-for-check',
      w_weak: marker + '-weak',
      w_why: marker + '-why',
      w_palkka: marker + '-palkka',
      stfAnswers: [marker + '-stf-0', marker + '-stf-1', marker + '-stf-2', marker + '-stf-3', marker + '-stf-4'],
      scenPicks: { 0: { oi: 1, rating: 'best', fb: marker + '-scen' } },
      starVoiceQ: 2,
      starVoiceDone: { 1: true, 2: true, 3: false },
      starVoiceRecordings: {
        1: { transcript: marker + '-voice1', fb: '<p>' + marker + '-fb1</p>' },
        2: { transcript: marker + '-voice2', fb: '<p>' + marker + '-fb2</p>' }
      },
      mockSession: [
        { phase: 'intro', label: 'Tutustuminen', question: 'Kerro nimesi', transcript: marker + '-mock0' },
        { phase: 'q1', label: 'Kysymys 1', question: 'STAR?', transcript: marker + '-mock1', reaction: 'Kiitos.' }
      ],
      mockCandidateName: 'Smoke'
    },
    inputs: {
      w_s: marker + '-star1-s',
      w_vastav: marker + '-vastav',
      hp1: marker + '-hp1',
      companyFact: marker + '-company-fact-long-enough',
      w_weak: marker + '-weak',
      'stf-ta': marker + '-stf-draft'
    },
    tfDone: 5,
    tfCorrect: 4,
    tfItems: [
      { revealed: true, choice: 'true' },
      { revealed: true, choice: 'false' },
      { revealed: true, choice: 'true' },
      { revealed: true, choice: 'true' },
      { revealed: true, choice: 'false' }
    ],
    decoderDone: 4,
    decoderAssignments: [
      { assigned: true, letter: 'S' },
      { assigned: true, letter: 'T' },
      { assigned: true, letter: 'A' },
      { assigned: true, letter: 'R' }
    ],
    stfCurrent: 5,
    abBuilt: true,
    stfRoundSubmitted: false,
    stfCurrentAnswer: marker + '-stf-draft',
    companyChosen: true,
    scenBuilt: true,
    scenDone: 1,
    starExpanded: ['sc-s'],
    checkDone: [0, 1],
    mockQ: 2,
    mockDoneCount: 2,
    shown: {
      startReveal: true,
      tfDoneMsg: true,
      decoderReveal: true,
      writeReveal: true,
      writeFb: true,
      writeFb2: true,
      writeFb3: true,
      vastavReveal: true,
      abDone: true,
      hpReveal: true,
      companyReveal: true,
      company2: true,
      scenDone: true,
      weakFb: true,
      whyFb: true,
      mockDone: false,
      finished: false
    },
    texts: {
      writeFbT: marker + '-write-fb',
      hpFbT: marker + '-hp-fb',
      starTranscript: marker + '-voice1',
      mockFbGood: marker + '-mock-good'
    },
    voiceShown: { starVoiceFb: true, hpVoiceFb: false, mockFbArea: false }
  };
}

(async () => {
  console.log('Haastattelu autosave smoke:', base);
  console.log('');

  const health = await req('GET', '/api/health');
  if (health.status !== 200 || health.json?.status !== 'ok') fail('GET /api/health');
  else pass('GET /api/health');

  const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
  const password = process.env.SMOKE_PASSWORD || 'testi123';
  const login = await req('POST', '/api/auth/login', { email, password });
  const cookie = parseCookie(login.headers.get('set-cookie'));
  if (login.status !== 200 || !cookie) fail('login (' + email + ')');
  else pass('login as ' + email);

  const page = await req('GET', '/module/moduuli9-haastattelu', null, cookie);
  if (page.status !== 200) fail('/module/moduuli9-haastattelu HTTP ' + page.status);
  else pass('/module/moduuli9-haastattelu serves HTML');

  for (const needle of WIRING_NEEDLES) {
    if (!page.text.includes(needle)) fail('module missing wiring: ' + needle);
  }
  if (!process.exitCode) pass('autosave + free-nav wiring present');

  for (const id of EXERCISE_FIELD_IDS) {
    if (!page.text.includes('id="' + id + '"') && !page.text.includes("id='" + id + "'")) {
      fail('exercise field missing from HTML: #' + id);
    }
  }
  if (!process.exitCode) pass('all ' + EXERCISE_FIELD_IDS.length + ' exercise textareas present');

  const screens = ['s1', 's2', 's3', 's4', 's5', 's5b', 's6', 's7', 's8', 's8b', 's9', 's10', 's11', 's12'];
  for (const id of screens) {
    if (!page.text.includes('id="' + id + '"')) fail('screen missing: #' + id);
  }
  if (!process.exitCode) pass('all 14 exercise screens present');

  const snap = buildFullSnapshot();
  const marker = snap.S.w_s.split('-star1-s')[0];
  const payload = {
    v: 1,
    data: snap,
    summary: 'smoke full-module autosave ' + marker,
    savedAt: new Date().toISOString()
  };

  const save = await req(
    'POST',
    '/api/reflections/save',
    { moduleId: 'moduuli9-haastattelu__work', reflectionText: JSON.stringify(payload) },
    cookie
  );
  if (save.status !== 200 || !save.json?.success) fail('save moduuli9-haastattelu__work');
  else pass('save full exercise snapshot');

  const load = await req('GET', '/api/reflections/module/moduuli9-haastattelu__work', null, cookie);
  const raw = load.json?.reflection?.reflection_text || '';
  if (load.status !== 200 || !raw) {
    fail('load moduuli9-haastattelu__work');
  } else {
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      fail('loaded work is not JSON');
    }
    const data = parsed && parsed.data;
    if (!data || data.v !== 1) fail('loaded data missing v:1');
    const checks = [
      ['curScreen', data.curScreen === '8b'],
      ['STAR q1', data.S && data.S.w_s === snap.S.w_s],
      ['STAR q2', data.S && data.S.w2_s === snap.S.w2_s],
      ['STAR q3', data.S && data.S.w3_s === snap.S.w3_s],
      ['vastaväite', data.S && data.S.w_vastav === snap.S.w_vastav],
      ['hissipuhe', data.S && data.S.hp1 === snap.S.hp1],
      ['yritys', data.S && data.S.companyFact === snap.S.companyFact],
      ['vaikeat weak', data.S && data.S.w_weak === snap.S.w_weak],
      ['vaikeat why', data.S && data.S.w_why === snap.S.w_why],
      ['vaikeat palkka', data.S && data.S.w_palkka === snap.S.w_palkka],
      ['spot flaw answers', data.S && Array.isArray(data.S.stfAnswers) && data.S.stfAnswers.length === 5],
      ['tilanteet picks', data.S && data.S.scenPicks && data.S.scenPicks[0]],
      ['voice done', data.S && data.S.starVoiceDone && data.S.starVoiceDone[1] === true],
      ['voice recordings', data.S && data.S.starVoiceRecordings && data.S.starVoiceRecordings[1]],
      ['mock session', data.S && Array.isArray(data.S.mockSession) && data.S.mockSession[0]?.transcript],
      ['tf quiz', data.tfDone === 5],
      ['decoder', data.decoderDone === 4],
      ['marker intact', raw.includes(marker)]
    ];
    checks.forEach(([label, ok]) => {
      if (!ok) fail('round-trip missing: ' + label);
    });
    if (!process.exitCode) pass('round-trip restores all exercise sections (' + checks.length + ' checks)');
  }

  console.log('');
  if (process.exitCode) console.log('FAILED');
  else console.log('All haastattelu autosave checks passed.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
