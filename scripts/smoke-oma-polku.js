#!/usr/bin/env node
/**
 * Smoke test: all Oma polku modules (Anne + Jani/Karpo paths).
 * Checks static wiring (autosave, module-work), served HTML, DB reflections, key APIs.
 *
 * Usage: node scripts/smoke-oma-polku.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD for authenticated DB/API checks
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const base = (process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

const OMA_POLKU = [
  {
    id: 'moduuli-ai-tietosuoja',
    paths: ['jani'],
    apis: ['/api/ai/chat'],
    initPattern: /initModuleWork\s*\(\s*MODULE_ID/
  },
  {
    id: 'moduuli-tutkimusnaytto',
    paths: ['jani'],
    apis: ['/api/ai/chat'],
    initPattern: /initModuleWork\s*\(\s*MODULE_ID/
  },
  {
    id: 'moduuli-tekoaly-kirjoituskumppanina',
    paths: ['jani'],
    apis: ['/api/ai/chat'],
    initPattern: /initModuleWork\s*\(\s*MODULE_ID/
  },
  {
    id: 'moduuli8-ai-polku',
    paths: ['anne', 'jani'],
    apis: ['/api/ai/chat', '/api/ai/cv-parse'],
    initPattern: /initModuleWork\s*\(\s*MODULE8_ID/
  },
  {
    id: 'moduuli9-haastattelu',
    paths: ['anne', 'jani'],
    apis: ['/api/ai/chat', '/api/ai/voice-interview', '/api/ai/speech'],
    initPattern: /initModuleWork\s*\(\s*MODULE9_ID/,
    mustDeclare: ['haSaveTimer']
  },
  {
    id: 'moduuli-elava-cv',
    paths: ['anne', 'jani'],
    apis: ['/api/portfolio/save', '/api/portfolio/mine'],
    portfolio: true,
    initPattern: /savePortfolioData|savePortfolioDraft/
  },
  {
    id: 'moduuli-perplexity-notebooklm',
    paths: ['anne'],
    apis: ['/api/ai/chat'],
    initPattern: /initModuleWork\s*\(\s*PERPLEXITY_MODULE_ID/
  }
];

function pass(msg) {
  console.log('  ✓', msg);
}
function fail(msg) {
  console.error('  ✗', msg);
  process.exitCode = 1;
}
function warn(msg) {
  console.log('  ⚠', msg);
}

function readModuleHtml(moduleId) {
  const file = path.join(root, moduleId + '.html');
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function simulateInjectedHtml(raw, moduleId) {
  if (!raw) return '';
  if (raw.includes('module-autosave.js')) return raw;
  const boot = '<script>window.__MODULE_ID__="' + moduleId + '";</script>';
  const tags =
    boot +
    (raw.includes('module-work.js') ? '' : '<script src="/js/module-work.js"></script>') +
    '<script src="/js/module-autosave.js"></script>';
  const idx = raw.lastIndexOf('</body>');
  if (idx === -1) return raw + tags;
  return raw.slice(0, idx) + tags + raw.slice(idx);
}

function staticChecks() {
  console.log('Static checks (source files)');
  for (const mod of OMA_POLKU) {
    const raw = readModuleHtml(mod.id);
    if (!raw) {
      fail(mod.id + ' — HTML file missing');
      continue;
    }
    const hasWork = raw.includes('module-work.js') || raw.includes('initModuleWork');
    if (!hasWork && !mod.portfolio) fail(mod.id + ' — missing module-work / initModuleWork');
    else if (hasWork || mod.portfolio) pass(mod.id + ' — persistence wired');

    if (mod.initPattern && !mod.initPattern.test(raw)) {
      fail(mod.id + ' — missing expected save/init hook');
    } else if (mod.initPattern) {
      pass(mod.id + ' — save/init hook present');
    }

    for (const api of mod.apis) {
      if (!raw.includes(api.split('/').pop()) && !raw.includes(api)) {
        warn(mod.id + ' — may not reference ' + api + ' directly in HTML (OK if dynamic)');
      }
    }

    if (mod.mustDeclare) {
      for (const v of mod.mustDeclare) {
        const uses = new RegExp('clearTimeout\\(' + v + '\\)').test(raw);
        const declares = new RegExp('(?:let|var)\\s+' + v).test(raw);
        if (uses && !declares) fail(mod.id + ' — uses ' + v + ' but never declares it');
        else if (uses) pass(mod.id + ' — ' + v + ' declared');
      }
    }

    const injected = simulateInjectedHtml(raw, mod.id);
    if (!injected.includes('module-autosave.js')) fail(mod.id + ' — autosave would not inject');
    else pass(mod.id + ' — global autosave will load (server inject)');
  }
  console.log('');
}

async function req(method, urlPath, body, cookie) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(base + urlPath, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text.slice(0, 300) };
  }
  return { status: r.status, json, headers: r.headers };
}

async function httpChecks() {
  console.log('HTTP checks:', base);

  let health;
  try {
    health = await req('GET', '/api/health');
  } catch (e) {
    fail('Cannot reach server: ' + e.message);
    console.log('');
    return;
  }
  if (health.status !== 200 || health.json.status !== 'ok') fail('GET /api/health');
  else pass('GET /api/health');

  const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
  const password = process.env.SMOKE_PASSWORD || 'testi123';
  let cookie = '';
  const login = await req('POST', '/api/auth/login', { email, password });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = setCookie.match(/session_token=([^;]+)/);
  if (login.status === 200 && token) {
    cookie = 'session_token=' + token[1];
    pass('login as ' + email);
  } else {
    warn('login failed — module pages may redirect without session (HTTP ' + login.status + ')');
  }

  for (const mod of OMA_POLKU) {
    let page;
    try {
      // preview=1 WITHOUT a session cookie serves the real module HTML. A
      // logged-in but ungated cookie is gated even under preview, so fetch
      // anonymously here (DB/API checks below still use the cookie).
      page = await fetch(base + '/module/' + mod.id + '?preview=1', {
        redirect: 'manual'
      });
    } catch (e) {
      fail('/module/' + mod.id + ' — ' + e.message);
      continue;
    }
    if (page.status >= 300 && page.status < 400) {
      fail('/module/' + mod.id + ' — redirect ' + page.status + ' (gift gate / not logged in)');
      continue;
    }
    const html = await page.text();
    // A module persists either via the injected global autosave (module-autosave.js)
    // or its own self-managed module-work.js (initModuleWork). Some modules are
    // deliberately excluded from global autosave injection in server.js because
    // they manage their own — accept either as valid persistence wiring.
    const hasGlobalAutosave = html.includes('module-autosave.js');
    const hasModuleWork = html.includes('module-work.js') || html.includes('initModuleWork');
    if (page.status !== 200) fail('/module/' + mod.id + ' HTTP ' + page.status);
    else if (!html.includes('__MODULE_ID__')) fail(mod.id + ' served without __MODULE_ID__ boot');
    else if (!hasGlobalAutosave && !hasModuleWork && !mod.portfolio) fail(mod.id + ' served without autosave wiring (module-autosave.js / module-work.js)');
    else pass('/module/' + mod.id + ' — autosave + persistence OK');
  }

  const rt = await req('GET', '/api/ai/realtime/config');
  if (rt.status === 200 && rt.json.phases) pass('GET /api/ai/realtime/config');
  else warn('GET /api/ai/realtime/config — ' + rt.status + ' (live interview optional)');

  const chat = await req('POST', '/api/ai/chat', {
    max_tokens: 12,
    system: 'Vastaa yhdellä sanalla.',
    messages: [{ role: 'user', content: 'Sano ok' }]
  });
  if (chat.status === 200 && (chat.json.text || chat.json.reply)) {
    pass('POST /api/ai/chat');
  } else if (chat.status === 503) {
    warn('POST /api/ai/chat — 503 (OPENAI_API_KEY missing on server)');
  } else {
    fail('POST /api/ai/chat — HTTP ' + chat.status);
  }

  if (!cookie) {
    warn('Skip DB reflection tests — no session cookie');
    console.log('');
    return;
  }

  for (const mod of OMA_POLKU) {
    if (mod.portfolio) continue;
    const workId = mod.id + '__work';
    const payload = JSON.stringify({
      v: 1,
      data: { v: 1, ts: Date.now(), smoke: mod.id, curScreen: 1 },
      summary: 'oma-polku smoke',
      savedAt: new Date().toISOString()
    });
    const save = await req(
      'POST',
      '/api/reflections/save',
      { moduleId: workId, reflectionText: payload },
      cookie
    );
    if (save.status !== 200 || !save.json.success) {
      fail('DB save ' + workId + ' — HTTP ' + save.status);
      continue;
    }
    const load = await req('GET', '/api/reflections/module/' + encodeURIComponent(workId), null, cookie);
    const txt = load.json?.reflection?.reflection_text || '';
    if (load.status !== 200 || !txt.includes(mod.id)) {
      fail('DB load ' + workId);
    } else {
      pass('DB round-trip ' + workId);
    }
  }

  const autosaveId = 'moduuli8-ai-polku__autosave';
  const autoPayload = JSON.stringify({
    v: 1,
    moduleId: 'moduuli8-ai-polku',
    savedAt: new Date().toISOString(),
    fields: { 'textarea#applied': { kind: 'value', value: 'smoke autosave ' + Date.now() } }
  });
  const saveAuto = await req(
    'POST',
    '/api/reflections/save',
    { moduleId: autosaveId, reflectionText: autoPayload },
    cookie
  );
  if (saveAuto.status === 200 && saveAuto.json.success) pass('DB autosave channel ' + autosaveId);
  else fail('DB autosave channel ' + autosaveId);

  const port = await req('GET', '/api/portfolio/mine', null, cookie);
  if (port.status === 200) pass('GET /api/portfolio/mine (Elävä CV DB)');
  else fail('GET /api/portfolio/mine — HTTP ' + port.status);

  console.log('');
}

(async () => {
  console.log('Oma polku smoke test\n');
  staticChecks();
  await httpChecks();
  if (process.exitCode) console.log('FAILED — see ✗ above');
  else console.log('All checks passed.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
