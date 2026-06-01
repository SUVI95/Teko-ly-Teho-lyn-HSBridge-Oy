#!/usr/bin/env node
/**
 * Smoke test: AI Polku työnhaku + Haastattelu modules (production or local).
 * Usage: node scripts/smoke-tyonhaku-modules.js [baseUrl]
 * Example: node scripts/smoke-tyonhaku-modules.js https://aipolku.duunijobs.fi
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function req(method, path, body, cookieJar) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookieJar) headers.Cookie = cookieJar;
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text.slice(0, 200) };
  }
  return { status: r.status, json, headers: r.headers };
}

function pass(msg) {
  console.log('  ✓', msg);
}
function fail(msg) {
  console.error('  ✗', msg);
  process.exitCode = 1;
}

(async () => {
  console.log('Smoke test:', base);
  console.log('');

  const health = await req('GET', '/api/health');
  if (health.status !== 200 || health.json.status !== 'ok') fail('health');
  else pass('GET /api/health');

  for (const mod of ['moduuli8-ai-polku', 'moduuli9-haastattelu']) {
    const page = await fetch(base + '/module/' + mod);
    const html = await page.text();
    if (page.status !== 200) fail('/module/' + mod + ' HTTP ' + page.status);
    else if (!html.includes('module-work.js')) fail(mod + ' missing module-work.js');
    else if (!html.includes('/api/ai/')) fail(mod + ' missing AI API calls');
    else pass('/module/' + mod + ' serves HTML + persistence + AI');
  }

  const chat = await req('POST', '/api/ai/chat', {
    model: 'gpt-4o-mini',
    max_tokens: 20,
    system: 'Vastaa yhdellä sanalla.',
    messages: [{ role: 'user', content: 'Sano ok' }]
  });
  if (chat.status !== 200 || !(chat.json.text || chat.json.reply)) fail('POST /api/ai/chat');
  else pass('POST /api/ai/chat → ' + String(chat.json.text || chat.json.reply).slice(0, 40));

  const claude = await req('POST', '/api/ai/claude', {
    max_tokens: 20,
    system: 'Vastaa yhdellä sanalla.',
    messages: [{ role: 'user', content: 'Sano ok' }]
  });
  if (claude.status !== 200 || !(claude.json.text || claude.json.reply)) fail('POST /api/ai/claude');
  else pass('POST /api/ai/claude → ' + String(claude.json.text || claude.json.reply).slice(0, 40));

  const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
  const password = process.env.SMOKE_PASSWORD || 'testi123';
  const login = await req('POST', '/api/auth/login', { email, password });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = setCookie.match(/session_token=([^;]+)/);
  if (login.status !== 200 || !token) fail('login (' + email + ')');
  else pass('login as ' + email);

  const cookie = 'session_token=' + token[1];
  const workPayload = JSON.stringify({
    v: 1,
    data: { v: 1, curScreen: 2, story: 'smoke test', skills: ['Test'] },
    summary: 'smoke',
    savedAt: new Date().toISOString()
  });

  const save8 = await req(
    'POST',
    '/api/reflections/save',
    { moduleId: 'moduuli8-ai-polku__work', reflectionText: workPayload },
    cookie
  );
  if (save8.status !== 200 || !save8.json.success) fail('save moduuli8-ai-polku__work');
  else pass('save moduuli8-ai-polku__work');

  const load8 = await req('GET', '/api/reflections/module/moduuli8-ai-polku__work', null, cookie);
  const t8 = load8.json?.reflection?.reflection_text || '';
  if (load8.status !== 200 || !t8.includes('smoke test')) fail('load moduuli8-ai-polku__work');
  else pass('load moduuli8-ai-polku__work');

  const save9 = await req(
    'POST',
    '/api/reflections/save',
    {
      moduleId: 'moduuli9-haastattelu__work',
      reflectionText: JSON.stringify({
        v: 1,
        data: { v: 1, curScreen: 3, w_s: 'smoke' },
        summary: 'smoke',
        savedAt: new Date().toISOString()
      })
    },
    cookie
  );
  if (save9.status !== 200 || !save9.json.success) fail('save moduuli9-haastattelu__work');
  else pass('save moduuli9-haastattelu__work');

  const load9 = await req('GET', '/api/reflections/module/moduuli9-haastattelu__work', null, cookie);
  const t9 = load9.json?.reflection?.reflection_text || '';
  if (load9.status !== 200 || !t9.includes('smoke')) fail('load moduuli9-haastattelu__work');
  else pass('load moduuli9-haastattelu__work');

  console.log('');
  if (process.exitCode) console.log('FAILED');
  else console.log('All checks passed.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
