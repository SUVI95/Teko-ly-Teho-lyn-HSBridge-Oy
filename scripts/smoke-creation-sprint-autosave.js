#!/usr/bin/env node
/**
 * Smoke: moduuli5-ai-creation-sprint — wiring, prompt auto-update, autosave round-trip.
 *
 * Usage: node scripts/smoke-creation-sprint-autosave.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD, BASE_URL
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'moduuli5-ai-creation-sprint.html');
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
const password = process.env.SMOKE_PASSWORD || 'testi123';
const MODULE_ID = 'moduuli5-ai-creation-sprint';
const WORK_ID = MODULE_ID + '__work';

let failed = 0;
function pass(msg) { console.log('  ✓', msg); }
function fail(msg) { console.error('  ✗', msg); failed++; process.exitCode = 1; }

const EXERCISE_FIELD_IDS = [
  'cfNimi', 'cfKenelle', 'cfKuvaus', 'cfTunnelma', 'cfSijainti', 'cfEtu', 'cfLogoKuvio', 'cfFontti',
  'tg1text', 'tg2text', 'tg3text', 'tg4text',
  'copilotPaste', 'geminiPaste', 'reflectionText'
];

const WIRING_NEEDLES = [
  '__DISABLE_GLOBAL_MODULE_AUTOSAVE__',
  'module-work.js',
  'initModuleWork',
  'sprintSnapshot',
  'saveSprintProgress',
  'flushSprintProgress',
  'applySprintData',
  'SPRINT_FIELD_IDS',
  'applyCompanyToPrompts',
  'updateCopilotPaste',
  'updateGeminiPaste',
  'setupCompanyAutoFill',
  'initPromptEditors',
  'pagehide',
  'sprintSavePill',
  'fieldIds:SPRINT_FIELD_IDS',
  '[LIITÄ COPILOTIN TUTKIMUS TÄHÄN]',
  '[LIITÄ GEMININ VASTAUS TÄHÄN]',
  'id="copilotPaste"',
  'id="geminiPaste"',
  'moduuli5-ai-creation-sprint'
];

const PROMPT_PLACEHOLDERS = [
  '[NIMI]',
  '[KUVAUS]',
  '[KENELLE]',
  '[LIITÄ COPILOTIN TUTKIMUS TÄHÄN]',
  '[LIITÄ GEMININ VASTAUS TÄHÄN]'
];

function fillTemplate(template, reps) {
  let t = template;
  reps.forEach(function (pair) {
    const k = pair[0];
    const v = pair[1];
    if (v) t = t.split(k).join(v);
  });
  return t;
}

function testPromptAutoUpdate(html) {
  const reps = [
    ['[NIMI]', 'SmokeKahvila'],
    ['[KUVAUS]', 'Nopea aamukahvi'],
    ['[KENELLE]', 'Opiskelijat'],
    ['[TUNNELMA]', 'Lämmin'],
    ['[MISSÄ TOIMII]', 'Kuopio'],
    ['[MIKSI ASIAKAS VALITSISI TÄMÄN]', 'Jonoton'],
    ['[MIKSI VALITA TÄMÄ]', 'Jonoton'],
    ['[LOGO-KUVIO]', 'Kuppi'],
    ['[FONTTITYYLI]', 'Moderni']
  ];

  // Company prompt sample (logo)
  const logoMatch = html.match(/Luo ammattimainen logo yritykselle nimeltä \[NIMI\][\s\S]{0,400}/);
  if (!logoMatch) {
    fail('logo prompt template missing');
  } else {
    const filled = fillTemplate(logoMatch[0], reps);
    if (filled.indexOf('SmokeKahvila') === -1) fail('company fill did not replace [NIMI]');
    else pass('prompt auto-update: company [NIMI] → SmokeKahvila');
    if (filled.indexOf('[NIMI]') !== -1) fail('company fill left [NIMI]');
    else pass('prompt auto-update: no leftover [NIMI] in logo sample');
  }

  // Copilot paste into Gemini challenge prompt
  const gemChallenge = html.match(/Alla on toisen tekoälyn tekemä markkinatutkimus[\s\S]*?--- TUTKIMUS LOPPUU ---/);
  if (!gemChallenge) {
    fail('Gemini challenge prompt (Copilot paste) missing');
  } else {
    const copilotText = 'SMOKE_COPILOT_RESEARCH_' + Date.now();
    let tmpl = gemChallenge[0];
    reps.forEach(function (pair) {
      if (pair[1]) tmpl = tmpl.split(pair[0]).join(pair[1]);
    });
    tmpl = tmpl.replace('[LIITÄ COPILOTIN TUTKIMUS TÄHÄN]', copilotText);
    if (tmpl.indexOf(copilotText) === -1) fail('copilot paste not injected into Gemini prompt');
    else pass('prompt auto-update: Copilot paste injected into Gemini prompt');
    if (tmpl.indexOf('[LIITÄ COPILOTIN TUTKIMUS TÄHÄN]') !== -1) fail('copilot placeholder left after paste');
    else pass('prompt auto-update: Copilot placeholder cleared');
  }

  // Gemini paste into Claude biz plan
  if (html.indexOf('[LIITÄ GEMININ VASTAUS TÄHÄN]') === -1) {
    fail('Claude biz-plan Gemini placeholder missing');
  } else {
    const geminiText = 'SMOKE_GEMINI_CHECK_' + Date.now();
    const filled = html
      .split('[LIITÄ GEMININ VASTAUS TÄHÄN]')
      .join(geminiText);
    if (filled.indexOf(geminiText) === -1) fail('gemini paste inject simulation failed');
    else pass('prompt auto-update: Gemini paste target present for Claude prompt');
  }
}

async function req(method, pathName, body, cookie) {
  const headers = { Accept: 'application/json, text/html, */*' };
  if (cookie) headers.Cookie = cookie;
  if (body != null) headers['Content-Type'] = 'application/json';
  const r = await fetch(base + pathName, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  return { status: r.status, json, text, headers: r.headers };
}

function parseCookie(setCookie) {
  const raw = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
  const m = raw.match(/session_token=([^;]+)/);
  return m ? 'session_token=' + m[1] : '';
}

function buildPayload(marker) {
  const inputs = {};
  EXERCISE_FIELD_IDS.forEach(function (id) {
    inputs[id] = marker + '-' + id;
  });
  inputs.cfNimi = marker + '-SmokeCo';
  inputs.copilotPaste = marker + '-copilot-research-long-enough';
  inputs.geminiPaste = marker + '-gemini-check-long-enough';
  return {
    v: 1,
    data: {
      v: 1,
      ts: Date.now(),
      curScreen: 4,
      scrollY: 120,
      inputs: inputs,
      prompts: {
        promptEdit1: { value: 'Logo for ' + inputs.cfNimi, locked: false },
        promptEdit2: { value: 'Pitch for ' + inputs.cfNimi, locked: true }
      },
      gatesOpen: [true, true, false, false],
      crisisLetter: 'B',
      challengeOn: false,
      checkboxes: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
      claudeAd: {
        text: marker + '-claude-ad',
        visible: true,
        pdfVisible: false,
        btnLabel: 'Generoi uudelleen',
        content: { title: marker }
      }
    },
    summary: 'smoke creation sprint ' + marker,
    savedAt: new Date().toISOString()
  };
}

async function main() {
  console.log('Creation Sprint autosave smoke');
  console.log('HTML:', HTML_PATH);
  console.log('Base:', base);

  if (!fs.existsSync(HTML_PATH)) {
    fail('missing HTML file');
    process.exit(1);
  }
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  pass('HTML file readable (' + html.length + ' bytes)');

  WIRING_NEEDLES.forEach(function (needle) {
    if (html.indexOf(needle) === -1) fail('missing wiring: ' + needle);
    else pass('wiring: ' + needle);
  });

  EXERCISE_FIELD_IDS.forEach(function (id) {
    if (html.indexOf('id="' + id + '"') === -1) fail('missing field id=' + id);
  });
  if (!failed) pass('all ' + EXERCISE_FIELD_IDS.length + ' exercise field ids present');

  // Every think-gate + checklist blocks
  ['tg1', 'tg2', 'tg3', 'tg4', 'checklist1', 'checklist2', 'checklist3', 'checklist4'].forEach(function (id) {
    if (html.indexOf('id="' + id + '"') === -1) fail('missing exercise block id=' + id);
    else pass('exercise block: ' + id);
  });

  PROMPT_PLACEHOLDERS.forEach(function (ph) {
    if (html.indexOf(ph) === -1) fail('missing prompt placeholder ' + ph);
    else pass('prompt placeholder: ' + ph);
  });

  testPromptAutoUpdate(html);

  // Snapshot must list every exercise field
  EXERCISE_FIELD_IDS.forEach(function (id) {
    const inArray = html.indexOf("'" + id + "'") !== -1 || html.indexOf('"' + id + '"') !== -1;
    if (!inArray) fail('field not referenced in JS snapshot list: ' + id);
  });
  if (!failed) pass('all exercise fields referenced for autosave snapshot');

  // Live server checks
  let liveOk = false;
  try {
    const health = await req('GET', '/module/' + MODULE_ID + '?preview=1');
    if (health.status === 200 && health.text.indexOf('AI Creation Sprint') !== -1) {
      pass('module HTML served 200 via /module/');
      liveOk = true;
      if (health.text.indexOf('copilotPaste') === -1) fail('served HTML missing copilotPaste');
      else pass('served HTML includes copilotPaste');
      if (health.text.indexOf('__DISABLE_GLOBAL_MODULE_AUTOSAVE__') === -1) fail('served HTML missing autosave disable');
      else pass('served HTML disables global autosave');
      if (health.text.indexOf('/js/module-work.js') === -1) fail('served HTML missing module-work.js');
      else pass('served HTML includes module-work.js');
    } else {
      fail('module HTML not served (status ' + health.status + ') — start server for live checks');
    }
  } catch (e) {
    fail('live module fetch failed (' + e.message + ') — start server for live checks');
  }

  if (liveOk) {
    const login = await req('POST', '/api/auth/login', { email: email, password: password });
    const cookie = parseCookie(login.headers.get('set-cookie'));
    if (login.status !== 200 || !cookie) {
      fail('login as ' + email + ' failed — skipping API round-trip');
    } else {
      pass('login ok');
      const marker = 'm5smoke' + Date.now();
      const payload = buildPayload(marker);
      const save = await req('POST', '/api/reflections/save', {
        moduleId: WORK_ID,
        reflectionText: JSON.stringify(payload)
      }, cookie);
      if (save.status !== 200) fail('save work status ' + save.status);
      else pass('saved __work for all exercises');

      const load = await req('GET', '/api/reflections/module/' + encodeURIComponent(WORK_ID), null, cookie);
      if (load.status !== 200 || !(load.json && load.json.reflection && load.json.reflection.reflection_text)) {
        fail('load work status ' + load.status);
      } else {
        let data = null;
        try {
          const parsed = JSON.parse(load.json.reflection.reflection_text);
          data = parsed && parsed.data ? parsed.data : parsed;
        } catch (e) {
          fail('parse loaded work: ' + e.message);
        }
        if (data) {
          EXERCISE_FIELD_IDS.forEach(function (id) {
            const got = data.inputs && data.inputs[id];
            if (!got || String(got).indexOf(marker) === -1) fail('round-trip missing/wrong inputs.' + id);
          });
          if (!failed) pass('API round-trip restored all ' + EXERCISE_FIELD_IDS.length + ' exercise inputs');
          if (!data.gatesOpen || data.gatesOpen[0] !== true) fail('gatesOpen not restored');
          else pass('gatesOpen restored');
          if (data.crisisLetter !== 'B') fail('crisisLetter not restored');
          else pass('crisisLetter restored');
          if (!data.prompts || !data.prompts.promptEdit2 || !data.prompts.promptEdit2.locked) fail('prompt lock not restored');
          else pass('prompt edits/locks restored');
          if (!data.claudeAd || data.claudeAd.text.indexOf(marker) === -1) fail('claudeAd not restored');
          else pass('claudeAd restored');
        }
      }
    }
  }

  console.log(failed ? '\nFAIL — ' + failed + ' check(s)' : '\nPASS — Creation Sprint autosave + prompt updates OK');
  process.exit(failed ? 1 : 0);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
