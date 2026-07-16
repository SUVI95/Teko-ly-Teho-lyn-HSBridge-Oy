#!/usr/bin/env node
/**
 * Smoke: bottityypit + automaatio modules (pages, autosave DB, AI, email, image flow).
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
const password = process.env.SMOKE_PASSWORD || 'testi123';

let failed = 0;
function pass(msg) { console.log('  ✓', msg); }
function fail(msg, extra) {
  console.error('  ✗', msg, extra || '');
  failed++;
}

async function req(method, path, body, cookie) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) { json = { raw: text.slice(0, 300) }; }
  return { status: r.status, json, headers: r.headers };
}

(async () => {
  console.log('Smoke (botti + automaatio):', base, '\n');

  const health = await req('GET', '/api/health');
  if (health.status === 200 && health.json.status === 'ok') pass('GET /api/health');
  else fail('GET /api/health', health.status);

  for (const mod of ['moduuli-bottityypit', 'moduuli1-ai-automaatio', 'moduuli1b-ai-automaatio']) {
    const page = await fetch(base + '/module/' + mod + '?preview=1');
    const html = await page.text();
    if (page.status !== 200) { fail('/module/' + mod, page.status); continue; }
    pass('/module/' + mod + ' HTTP 200');
    if (mod === 'moduuli-bottityypit') {
      if (!html.includes('bottityypit-persistence.js')) fail(mod + ' missing bottityypit-persistence.js');
      else pass(mod + ' has bottityypit persistence');
      if (!html.includes('bonus-module-runtime.js')) fail(mod + ' missing bonus-module-runtime.js');
      else pass(mod + ' has bonus-module runtime');
      if (!html.includes('/api/module-ai')) fail(mod + ' missing /api/module-ai calls');
      else pass(mod + ' wires /api/module-ai');
    }
    if (mod === 'moduuli1-ai-automaatio') {
      if (!html.includes('module-work.js')) fail(mod + ' missing module-work.js (injected)');
      else pass(mod + ' has module-work injection');
      if (!html.includes('__DISABLE_GLOBAL_MODULE_AUTOSAVE__')) fail(mod + ' missing dedicated autosave flag');
      else pass(mod + ' disables generic autosave race');
      if (!html.includes('initM1Work')) fail(mod + ' missing initM1Work');
      else pass(mod + ' initializes module-work autosave');
      if (!html.includes('challengeSnapshots')) fail(mod + ' missing per-challenge canvas snapshots');
      else pass(mod + ' persists challenge canvases');
      if (!html.includes("id:'improve'")) fail(mod + ' missing Haaste improve');
      else pass(mod + ' has Haaste 10 improve challenge');
      if (!html.includes('imagegen')) fail(mod + ' missing imagegen node');
      else pass(mod + ' has imagegen + reminder nodes');
    }
    if (mod === 'moduuli1b-ai-automaatio') {
      if (!html.includes('module-work.js')) fail(mod + ' missing module-work.js (injected)');
      else pass(mod + ' has module-work injection');
      if (!html.includes('__DISABLE_GLOBAL_MODULE_AUTOSAVE__')) fail(mod + ' missing dedicated autosave flag');
      else pass(mod + ' disables generic autosave race');
      if (!html.includes('initM1bWork')) fail(mod + ' missing initM1bWork call');
      else pass(mod + ' initializes module-work autosave');
      if (!html.includes('/api/ai/claude')) fail(mod + ' missing Claude API');
      else pass(mod + ' wires /api/ai/claude');
    }
  }

  const chat = await req('POST', '/api/ai/chat', {
    max_tokens: 24,
    system: 'Vastaa yhdellä sanalla.',
    messages: [{ role: 'user', content: 'Sano ok' }]
  });
  if (chat.status === 200 && (chat.json.text || chat.json.reply)) pass('POST /api/ai/chat');
  else fail('POST /api/ai/chat', chat.status);

  const claude = await req('POST', '/api/ai/claude', {
    max_tokens: 24,
    system: 'Vastaa yhdellä sanalla.',
    messages: [{ role: 'user', content: 'Sano ok' }]
  });
  if (claude.status === 200 && (claude.json.text || claude.json.reply)) pass('POST /api/ai/claude');
  else fail('POST /api/ai/claude', claude.status);

  const login = await req('POST', '/api/auth/login', { email, password });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = setCookie.match(/session_token=([^;]+)/);
  if (login.status !== 200 || !token) fail('login ' + email, login.json?.detail || login.status);
  else pass('login as ' + email);
  const cookie = token ? 'session_token=' + token[1] : '';

  if (cookie) {
    const modAi = await req('POST', '/api/module-ai', {
      system: 'Vastaa yhdellä sanalla suomeksi.',
      messages: [{ role: 'user', content: 'Sano ok' }],
      max_tokens: 16
    }, cookie);
    if (modAi.status === 200 && (modAi.json.text || modAi.json.reply)) pass('POST /api/module-ai (bottityypit AI)');
    else fail('POST /api/module-ai', modAi.status + ' ' + JSON.stringify(modAi.json).slice(0, 120));

    const botState = JSON.stringify({
      v: 1,
      ts: Date.now(),
      fields: { smoke_field: 'botti autosave smoke' },
      runtime: { curScreen: 2 }
    });
    const saveBot = await req('POST', '/api/bonus-module/responses', {
      slug: 'bottityypit',
      section_id: '_state',
      user_text: botState
    }, cookie);
    if (saveBot.status === 200 && saveBot.json.success) pass('POST /api/bonus-module/responses (_state)');
    else fail('POST /api/bonus-module/responses', saveBot.status);

    const loadBot = await req('GET', '/api/bonus-module/responses?slug=bottityypit', null, cookie);
    const botEntry = loadBot.json?.entries?._state?.user_text || '';
    if (loadBot.status === 200 && botEntry.includes('botti autosave smoke')) pass('GET /api/bonus-module/responses round-trip');
    else fail('GET /api/bonus-module/responses round-trip');

    const saveM1Work = await req('POST', '/api/reflections/save', {
      moduleId: 'moduuli1-ai-automaatio__work',
      reflectionText: JSON.stringify({
        v: 1,
        data: { v: 1, ts: Date.now(), q1: 'smoke m1a work', currentChallenge: 0 },
        summary: 'smoke',
        savedAt: new Date().toISOString()
      })
    }, cookie);
    if (saveM1Work.status === 200 && saveM1Work.json.success) pass('save moduuli1-ai-automaatio__work');
    else fail('save moduuli1-ai-automaatio__work', saveM1Work.status);

    const loadM1Work = await req('GET', '/api/reflections/module/moduuli1-ai-automaatio__work', null, cookie);
    const m1Text = loadM1Work.json?.reflection?.reflection_text || '';
    if (loadM1Work.status === 200 && m1Text.includes('smoke m1a work')) pass('load moduuli1-ai-automaatio__work');
    else fail('load moduuli1-ai-automaatio__work');

    const saveM1b = await req('POST', '/api/reflections/save', {
      moduleId: 'moduuli1b-ai-automaatio__work',
      reflectionText: JSON.stringify({
        v: 1,
        data: { v: 1, iceberg: 2, gallery: { find: 'smoke m1b work' } },
        summary: 'smoke',
        savedAt: new Date().toISOString()
      })
    }, cookie);
    if (saveM1b.status === 200 && saveM1b.json.success) pass('save moduuli1b-ai-automaatio__work');
    else fail('save moduuli1b-ai-automaatio__work');

    const loadM1b = await req('GET', '/api/reflections/module/moduuli1b-ai-automaatio__work', null, cookie);
    const m1bText = loadM1b.json?.reflection?.reflection_text || '';
    if (loadM1b.status === 200 && m1bText.includes('smoke m1b work')) pass('load moduuli1b-ai-automaatio__work');
    else fail('load moduuli1b-ai-automaatio__work');
  }

  const improveFlow = [
    { type: 'trigger', connected: true },
    { type: 'action', connected: true },
    { type: 'filter', connected: true },
    { type: 'ai', connected: true },
    { type: 'approval', connected: true },
    { type: 'email', connected: true },
    { type: 'imagegen', connected: true },
    { type: 'reminder', connected: true }
  ];
  const mailDry = await req('POST', '/api/send-test-email', {
    to: 'invalid@',
    subject: 'smoke',
    body: 'test',
    challengeId: 'improve',
    flow: improveFlow
  });
  if (mailDry.status === 400 && mailDry.json?.reason) pass('POST /api/send-test-email validates improve flow + email');
  else fail('POST /api/send-test-email improve validation', mailDry.status);

  const img = await req('POST', '/api/ai/image', {
    prompt: 'Simple flat icon of automation gear, minimal colors'
  });
  if (img.status === 200 && (img.json.url || img.json.imageUrl || img.json.mock)) pass('POST /api/ai/image');
  else fail('POST /api/ai/image', img.status + ' ' + JSON.stringify(img.json).slice(0, 120));

  console.log('');
  if (failed) {
    console.log('FAILED (' + failed + ' checks)');
    process.exit(1);
  }
  console.log('All checks passed.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
