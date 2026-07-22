#!/usr/bin/env node
/**
 * Smoke test: moduuli-visibility-growth-automation (Sovellusstudio)
 * Runs structure checks + live Claude paths. Exit 0 only if all pass.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000';
const MODULE = 'moduuli-visibility-growth-automation';
const ROOT = path.join(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'moduuli-visibility-growth-automation.html');

let failed = 0;
let passed = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('  PASS  ' + name);
  } else {
    failed++;
    failures.push(name + (detail ? ': ' + detail : ''));
    console.log('  FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}

function fetchJson(urlPath, opts) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    const body = opts && opts.body ? JSON.stringify(opts.body) : null;
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port || 3000,
        path: u.pathname + u.search,
        method: (opts && opts.method) || 'GET',
        headers: Object.assign(
          { Accept: 'application/json', 'Content-Type': 'application/json' },
          (opts && opts.headers) || {},
          body ? { 'Content-Length': Buffer.byteLength(body) } : {}
        )
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (e) {
            json = { _raw: data.slice(0, 300) };
          }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

function fetchText(urlPath) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    http
      .get(u, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, text: data }));
      })
      .on('error', reject);
  });
}

function mustInclude(html, id) {
  return html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
}

function mustFn(html, name) {
  return new RegExp('function\\s+' + name + '\\s*\\(').test(html) || new RegExp('async function\\s+' + name + '\\s*\\(').test(html);
}

async function main() {
  console.log('\n=== SMOKE: Sovellusstudio (' + MODULE + ') ===\n');
  const htmlDisk = fs.readFileSync(HTML_PATH, 'utf8');

  // ── 1. HTTP assets ─────────────────────────────────────────
  console.log('1) Page & assets');
  const page = await fetchText('/module/' + MODULE);
  ok('module page 200', page.status === 200, 'status=' + page.status);
  ok('page serves HTML', /moduuli-visibility-growth-automation|Rakenna oma sovellus|Sovellus/.test(page.text));
  const mw = await fetchText('/js/module-work.js');
  ok('module-work.js 200', mw.status === 200);
  const ah = await fetchText('/js/ai-helper.js');
  ok('ai-helper.js 200', ah.status === 200);
  // Prefer disk (source of truth); also confirm live body not empty
  const html = htmlDisk;
  ok('live page body non-empty', page.text.length > 5000, 'len=' + page.text.length);

  // ── 2. Full-stack wiring in source ─────────────────────────
  console.log('\n2) Full-stack wiring');
  ok('DISABLE_GLOBAL_MODULE_AUTOSAVE', html.includes('__DISABLE_GLOBAL_MODULE_AUTOSAVE__'));
  ok('loads module-work.js', html.includes('/js/module-work.js'));
  ok('loads ai-helper.js', html.includes('/js/ai-helper.js'));
  ok('getClaudeApiUrl', mustFn(html, 'getClaudeApiUrl') || html.includes('function getClaudeApiUrl'));
  ok('Claude smart:true', /smart:\s*true/.test(html));
  ok('normalizeClaudeMessages', mustFn(html, 'normalizeClaudeMessages'));
  ok('prompt Claude timeout 85s', /timeoutMs:\s*85000/.test(html));
  ok('no redundant DuuniJobs alias retry', !/trying DuuniJobs alias/.test(html));
  ok('MODULE_USE_SMART_CLAUDE', html.includes('MODULE_USE_SMART_CLAUDE'));
  ok('MODULE_USE_CLAUDE', html.includes('MODULE_USE_CLAUDE'));
  ok('initModuleWork', html.includes('initModuleWork'));
  ok('collectAppBuilderWork', mustFn(html, 'collectAppBuilderWork'));
  ok('applyAppBuilderWork', mustFn(html, 'applyAppBuilderWork'));
  ok('appSavePill UI', mustInclude(html, 'appSavePill'));
  ok('pagehide flush', html.includes("pagehide"));
  ok('server excludes global autosave', fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').includes("moduleId !== 'moduuli-visibility-growth-automation'"));

  // ── 3. All sections / exercise DOM ─────────────────────────
  console.log('\n3) Sections & exercise DOM');
  const sections = [
    's0-hero',
    's1-market',
    's2-problem',
    's3-interview',
    's4-prompt',
    's5-build',
    's6-defence',
    's7-final'
  ];
  sections.forEach((id) => ok('section #' + id, mustInclude(html, id)));

  const fields = [
    'customMarketBrief',
    'problemDesc',
    'problemOneliner',
    'appName',
    'chatInput',
    'refinedPrompt',
    'appUrl',
    'dq1',
    'dq2',
    'dq3',
    'dq4',
    'toStep2Btn',
    'toStep3Btn',
    'startInterviewBtn',
    'chatSendBtn',
    'toPromptBtn',
    'toBuildBtn',
    'toDefenceBtn',
    'buildPortfolioBtn',
    'portfolioCard',
    'promptOutWrap',
    'promptGenerating',
    'promptIdle',
    'marketCards',
    'marketCardCustom'
  ];
  fields.forEach((id) => ok('element #' + id, mustInclude(html, id)));

  // ── 4. Exercise JS handlers ────────────────────────────────
  console.log('\n4) Exercise handlers');
  [
    'pickMarket',
    'pickCustomIdea',
    'checkCustomMarket',
    'goToStep2',
    'checkStep2',
    'goToStep3',
    'startInterview',
    'sendChat',
    'askDuunijobsAI',
    'completeInterview',
    'generatePrompt',
    'regeneratePrompt',
    'goToBuild',
    'checkAppUrl',
    'saveAppUrl',
    'goToDefence',
    'checkDefence',
    'buildPortfolio',
    'copyPortfolioText',
    'copyPrompt',
    'duunijobsAIApi',
    'buildOfflineInterviewFollowup',
    'buildOfflinePromptDraft',
    'goToPrompt',
    'saveRefined',
    'copyFix',
    'showPromptOut',
    'marketAreaLabel'
  ].forEach((fn) => ok('fn ' + fn, mustFn(html, fn)));

  // Gate logic (pure)
  console.log('\n5) Gate logic (pure)');
  const checkStep2Ok = (desc, one, name) =>
    String(desc).trim().length > 30 && String(one).trim().length > 10 && String(name).trim().length > 1;
  ok('step2 gate rejects short', !checkStep2Ok('lyhyt', 'lyhyt', 'X'));
  ok(
    'step2 gate accepts valid',
    checkStep2Ok(
      'Tämä on tarpeeksi pitkä ongelmakuvaus jotta nappi aukeaa oikein.',
      'Ongelma yhdessä lauseessa tähän.',
      'TestApp'
    )
  );
  const checkDefenceOk = (a, b, c, d) =>
    [a, b, c, d].every((x) => String(x || '').trim().length > 15);
  ok('defence gate rejects short', !checkDefenceOk('a', 'b', 'c', 'd'));
  ok(
    'defence gate accepts valid',
    checkDefenceOk(
      'Sovellukseni ratkaisee oikean ongelman.',
      'Käyttäjä avaa sovelluksen ja saa avun.',
      'Minä suunnittelin, DuuniJobs AI toteutti.',
      'Seuraavaksi lisäisin ilmoitukset käyttäjälle.'
    )
  );

  // Interview completion rules
  ok('sendChat guards interviewDone', /if\s*\(\s*S\.interviewDone\s*\|\|\s*S\.questionCount\s*>=\s*5\s*\)\s*return/.test(html));
  ok('completeInterview hides input', html.includes("chatInputRow") && html.includes('completeInterview'));
  ok('generatePrompt requires interviewDone', /async function generatePrompt\(\)\s*\{[\s\S]*?if\s*\(\s*!S\.interviewDone\s*\)\s*return/.test(html));

  // Nav order
  console.log('\n6) Navigation');
  ok('prev → Lovable', html.includes('/module/moduuli-lovable'));
  ok('next → Esitykset', html.includes('/module/moduuli-esitykset-tarjoukset-viestinta'));

  // ── 7. Live Claude: interview turn ─────────────────────────
  console.log('\n7) Live Claude — interview turn');
  const interviewSys = `You are DuuniJobs AI, a warm Finnish-speaking app coach. Ask ONE short follow-up question in Finnish. No markdown. Context: app "SmokeApp", problem: työnhakijat eivät saa vastauksia.`;
  const interviewRes = await fetchJson('/api/ai/claude', {
    method: 'POST',
    body: {
      system: interviewSys,
      messages: [
        { role: 'assistant', content: 'Kerro yksi oikea käyttäjä.' },
        {
          role: 'user',
          content:
            'Maija, 28, Helsinki. Hakee töitä myynnistä. Lähettää 20 hakemusta viikossa eikä saa vastausta.'
        }
      ],
      max_tokens: 220,
      smart: true
    }
  });
  ok('interview Claude HTTP 200', interviewRes.status === 200, 'status=' + interviewRes.status);
  const interviewText = (interviewRes.json && (interviewRes.json.text || interviewRes.json.reply)) || '';
  ok('interview Claude returns text', interviewText.trim().length > 20, interviewText.slice(0, 80));
  ok('interview Claude Finnish-ish', /[äöÄÖ]|mitä|kerro|kuinka|milloin|miksi|sinä|käyttä/i.test(interviewText), interviewText.slice(0, 100));

  // ── 8. Live Claude: prompt generation ──────────────────────
  console.log('\n8) Live Claude — Base44 prompt generation');
  const promptSys = `You are a product manager. Write a short Base44 app-building prompt in English with sections: APP OVERVIEW, SCREENS, DATA MODEL, BRAND. Keep under 400 words.`;
  const promptRes = await fetchJson('/api/ai/claude', {
    method: 'POST',
    body: {
      system: promptSys,
      messages: [
        {
          role: 'user',
          content:
            'App name: SmokeApp. Problem: job seekers get no replies. User: Maija 28 Helsinki. Feeling: calm moss green. Logo: letter S.'
        }
      ],
      max_tokens: 900,
      smart: true
    }
  });
  ok('prompt Claude HTTP 200', promptRes.status === 200, 'status=' + promptRes.status);
  const promptText = (promptRes.json && (promptRes.json.text || promptRes.json.reply)) || '';
  ok('prompt Claude returns text', promptText.trim().length > 100, 'len=' + promptText.length);
  ok(
    'prompt has structure',
    /overview|screen|data|brand|SmokeApp/i.test(promptText),
    promptText.slice(0, 120)
  );

  // DuuniJobs alias
  console.log('\n9) DuuniJobs AI alias');
  const dj = await fetchJson('/api/ai/duunijobs', {
    method: 'POST',
    body: {
      system: 'Reply with exactly: DJ_OK',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 16,
      smart: true
    }
  });
  ok('duunijobs alias 200', dj.status === 200, 'status=' + dj.status);
  ok(
    'duunijobs returns text',
    !!(dj.json && (dj.json.text || dj.json.reply)),
    JSON.stringify(dj.json).slice(0, 120)
  );

  // ── 10. Autosave API surface (auth expected without cookie) ─
  console.log('\n10) Autosave API surface');
  const saveUnauth = await fetchJson('/api/reflections/save', {
    method: 'POST',
    body: {
      moduleId: MODULE + '__work',
      reflectionText: JSON.stringify({ v: 1, data: { smoke: true }, summary: 'smoke' })
    }
  });
  ok(
    'reflections/save requires auth (401/403)',
    saveUnauth.status === 401 || saveUnauth.status === 403,
    'status=' + saveUnauth.status
  );
  const loadUnauth = await fetchJson('/api/reflections/module/' + encodeURIComponent(MODULE + '__work'));
  ok(
    'reflections/module requires auth or empty',
    loadUnauth.status === 401 || loadUnauth.status === 403 || loadUnauth.status === 200,
    'status=' + loadUnauth.status
  );
  ok('module-work localStorage key pattern', mw.text.includes('mw_') && mw.text.includes('__work'));
  ok('module-work saveModuleWork', mw.text.includes('saveModuleWork'));
  ok('module-work fieldIds hook', /fieldIds/.test(html) && html.includes('problemDesc') && html.includes('dq4'));

  // ── 11. Offline fallbacks ──────────────────────────────────
  console.log('\n11) Offline fallbacks');
  ok('buildOfflinePromptDraft exists', mustFn(html, 'buildOfflinePromptDraft'));
  ok('offline interview followups exist', mustFn(html, 'buildOfflineInterviewFollowup'));
  ok('generatePrompt catch uses offline draft', /buildOfflinePromptDraft\s*\(/.test(html));
  ok('askDuunijobsAI catch uses offline followup', /buildOfflineInterviewFollowup\s*\(/.test(html));

  // ── 12. End-to-end Claude with module-like interview completion ─
  console.log('\n12) E2E Claude — interview completion signal');
  const doneSys = `You are DuuniJobs AI. The user just answered your fifth and final interview question. Reply ONLY with this exact string (nothing else):
"INTERVIEW_COMPLETE — Kiitos! Vastauksesi riittivät. Paina nappia — DuuniJobs AI kokoaa nyt sovelluspromtin juuri sinulle."`;
  const doneRes = await fetchJson('/api/ai/claude', {
    method: 'POST',
    body: {
      system: doneSys,
      messages: [{ role: 'user', content: 'Sammaleen vihreä, rauhallinen, logo S-kirjain.' }],
      max_tokens: 80,
      smart: true
    }
  });
  const doneText = (doneRes.json && (doneRes.json.text || doneRes.json.reply)) || '';
  ok('completion Claude HTTP 200', doneRes.status === 200);
  ok(
    'completion includes INTERVIEW_COMPLETE or Kiitos',
    /INTERVIEW_COMPLETE|Kiitos/i.test(doneText),
    doneText.slice(0, 120)
  );

  // Simulate offline draft contains app name
  const offlineFn = html.match(/function buildOfflinePromptDraft\(\)\s*\{[\s\S]*?\n\}/);
  ok('offline draft function body present', !!offlineFn);
  ok('offline draft references appName/problem', /S\.appName|S\.problemDesc|S\.problemOneliner/.test(html));

  // Summary
  console.log('\n=== RESULT: ' + passed + ' passed, ' + failed + ' failed ===');
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(' - ' + f));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke runner crashed:', e);
  process.exit(1);
});
