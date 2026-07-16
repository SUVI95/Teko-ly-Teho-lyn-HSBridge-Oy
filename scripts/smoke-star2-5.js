#!/usr/bin/env node
/**
 * Smoke: ★2–★5 clone (pages, ★2 bonus save/restore, ★5 cs-call config).
 * Usage: node scripts/smoke-star2-5.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
const password = process.env.SMOKE_PASSWORD || 'testi123';

let failed = 0;
function pass(msg) { console.log('  ✓', msg); }
function fail(msg, extra) {
  console.error('  ✗', msg, extra || '');
  failed++;
}

async function req(method, path, body, cookie) {
  const headers = { Accept: 'application/json, text/html, */*' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { json = null; }
  return { status: r.status, json, text, headers: r.headers };
}

(async () => {
  console.log('Smoke ★2–★5:', base, '\n');

  const modules = [
    {
      id: 'moduuli-eu-ai-act-moduuli5',
      need: ['BONUS_MODULE_SLUG = \'eu-ai-act-moduuli5\'', 'bonus-module-runtime.js', 'eu-ai-act-moduuli5-persistence.js', 'mod-rail', 'href="/"']
    },
    {
      id: 'moduuli-prompt-hiomo',
      need: ['BONUS_MODULE_SLUG = \'prompt-hiomo\'', 'prompt-hiomo-persistence.js', 'AI Polku · Prompt-hiomo']
    },
    {
      id: 'moduuli-hitl-architect',
      need: ['BONUS_MODULE_SLUG = \'hitl-architect\'', 'hitl-architect-persistence.js', 'hero-compact', 'Kun botti ei riitä']
    },
    {
      id: 'moduuli-asiakaspalvelu-live-puhelu',
      need: ['CsMockRealtimeCall', 'mod-rail', '/api/cs-call']
    }
  ];

  for (const mod of modules) {
    const page = await fetch(base + '/module/' + mod.id + '?preview=1');
    const html = await page.text();
    if (page.status !== 200) {
      fail('/module/' + mod.id, page.status);
      continue;
    }
    pass('/module/' + mod.id + ' HTTP 200');
    for (const n of mod.need) {
      if (!html.includes(n)) fail(mod.id + ' missing ' + n);
      else pass(mod.id + ' has ' + n.slice(0, 48));
    }
  }

  const cfg = await req('GET', '/api/cs-call/realtime/config?scenario=wrong_bill');
  if (cfg.status === 200 && Array.isArray(cfg.json?.phases) && cfg.json.expectedTurns === 4) {
    pass('GET /api/cs-call/realtime/config → ' + cfg.json.phases.length + ' phases, model ' + cfg.json.model);
  } else {
    fail('GET /api/cs-call/realtime/config', cfg.status);
  }

  const login = await req('POST', '/api/auth/login', { email, password });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = setCookie.match(/session_token=([^;]+)/);
  if (login.status !== 200 || !token) {
    fail('login ' + email, login.json?.detail || login.status);
  } else {
    pass('login as ' + email);
  }
  const cookie = token ? 'session_token=' + token[1] : '';

  if (cookie) {
    const marker = 'eu-ai-act smoke ' + Date.now();
    const save = await req('POST', '/api/bonus-module/responses', {
      slug: 'eu-ai-act-moduuli5',
      section_id: '_state',
      user_text: JSON.stringify({ smoke: marker, tab: 'teoria' })
    }, cookie);
    if (save.status === 200 && save.json?.success) pass('POST /api/bonus-module/responses (★2 _state)');
    else fail('POST /api/bonus-module/responses', save.status);

    const load = await req('GET', '/api/bonus-module/responses?slug=eu-ai-act-moduuli5', null, cookie);
    const entry = load.json?.entries?._state?.user_text || '';
    if (load.status === 200 && entry.includes(marker)) pass('GET /api/bonus-module/responses ★2 round-trip');
    else fail('GET /api/bonus-module/responses ★2 round-trip');

    const next = await req('GET', '/api/bonus-module/next?slug=eu-ai-act-moduuli5', null, cookie);
    if (next.status === 200 && next.json?.href === '/module/moduuli-prompt-hiomo') {
      pass('GET /api/bonus-module/next ★2 → prompt-hiomo');
    } else {
      fail('GET /api/bonus-module/next', JSON.stringify(next.json));
    }
  }

  console.log(failed ? '\nFAILED (' + failed + ')' : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
