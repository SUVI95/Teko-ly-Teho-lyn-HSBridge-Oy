#!/usr/bin/env node
/**
 * Smoke: autosave round-trip for ★2–★5 exercise state on AI Polku backend.
 * Usage: node scripts/smoke-star2-5-autosave.js [baseUrl]
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.SMOKE_EMAIL || 'testi.opiskelija@example.com';
const password = process.env.SMOKE_PASSWORD || 'testi123';

let failed = 0;
function pass(m) { console.log('  ✓', m); }
function fail(m, x) { console.error('  ✗', m, x || ''); failed++; }

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
  try { json = JSON.parse(text); } catch (_) {}
  return { status: r.status, json, text, headers: r.headers };
}

async function saveBonus(cookie, slug, sectionId, userText) {
  return req('POST', '/api/bonus-module/responses', {
    slug,
    section_id: sectionId,
    user_text: typeof userText === 'string' ? userText : JSON.stringify(userText)
  }, cookie);
}

async function loadBonus(cookie, slug) {
  return req('GET', '/api/bonus-module/responses?slug=' + encodeURIComponent(slug), null, cookie);
}

(async () => {
  console.log('Autosave smoke ★2–★5:', base, '\n');

  const login = await req('POST', '/api/auth/login', { email, password });
  const setCookie = login.headers.get('set-cookie') || '';
  const token = setCookie.match(/session_token=([^;]+)/);
  if (login.status !== 200 || !token) {
    fail('login', login.status);
    process.exit(1);
  }
  pass('login');
  const cookie = 'session_token=' + token[1];
  const stamp = 'as-' + Date.now();

  // ★2 EU AI Act — multi-exercise fields
  const euState = {
    v: 1,
    ts: Date.now(),
    tab: 'ex1',
    fields: {
      ex1FinalReflection: 'EU reflection ' + stamp,
      'ex4say-1': 'Bot says: siirrän asian ihmiselle ' + stamp
    },
    checks: {},
    radios: {},
    feedback: {},
    runtime: { completed: { ex1: true }, ex4: { inspectOk: true, chats: { 1: true }, currentStep: 'ex4step-chats' } }
  };
  let r = await saveBonus(cookie, 'eu-ai-act-moduuli5', '_state', euState);
  if (r.status === 200 && r.json?.success) pass('★2 save _state');
  else fail('★2 save', r.status);
  r = await loadBonus(cookie, 'eu-ai-act-moduuli5');
  const euRaw = r.json?.entries?._state?.user_text || '';
  if (euRaw.includes(stamp) && euRaw.includes('ex1FinalReflection') && euRaw.includes('ex4say-1')) {
    pass('★2 restore includes ex1 + ex4 fields');
  } else fail('★2 restore fields');

  // ★3 Prompt-hiomo — all exercise prompts
  const phState = {
    v: 1,
    stage: 'stageReflect',
    fields: {
      ex1Prompt: 'tone ' + stamp,
      ex3Prompt: 'fix ' + stamp,
      ex4Prompt: 'attack ' + stamp,
      ex5Prompt: 'strike ' + stamp,
      exCapPrompt: 'cap ' + stamp,
      reflectLearn: 'learn ' + stamp,
      reflectHard: 'hard ' + stamp
    },
    runtime: { ex3HasRun: true, ex4Tested: true, ex5Tested: true, exCapTested: true }
  };
  r = await saveBonus(cookie, 'prompt-hiomo', '_state', phState);
  if (r.status === 200 && r.json?.success) pass('★3 save _state');
  else fail('★3 save', r.status);
  r = await loadBonus(cookie, 'prompt-hiomo');
  const phRaw = r.json?.entries?._state?.user_text || '';
  const phOk = ['ex1Prompt', 'ex3Prompt', 'ex4Prompt', 'ex5Prompt', 'exCapPrompt', 'reflectLearn'].every((k) => phRaw.includes(k));
  if (phOk && phRaw.includes(stamp)) pass('★3 restore all exercise prompts');
  else fail('★3 restore fields');

  // ★4 HITL — gate + exercises
  const hitlState = {
    v: 1,
    fields: {
      gateDraftText: 'gate draft ' + stamp,
      ex1Rewrite: 'rewrite ' + stamp,
      ex2Reply: 'reply ' + stamp,
      ex3QueueEst: '12'
    },
    radios: {},
    checks: {},
    picked: { ex1gate: 'escalate' },
    phases: { ex1PhaseRewrite: true, ex2PhaseReply: true },
    unlocked: { ex1: true, ex2: true, ex3: true },
    gate: { statusText: 'Hyväksytty', draftLocked: true }
  };
  r = await saveBonus(cookie, 'hitl-architect', '_state', hitlState);
  if (r.status === 200 && r.json?.success) pass('★4 save _state');
  else fail('★4 save', r.status);
  r = await loadBonus(cookie, 'hitl-architect');
  const hitlRaw = r.json?.entries?._state?.user_text || '';
  if (hitlRaw.includes(stamp) && hitlRaw.includes('gateDraftText') && hitlRaw.includes('ex3QueueEst')) {
    pass('★4 restore gate + exercises + number field');
  } else fail('★4 restore fields');

  // ★5 live call — reflections autosave
  const csPayload = {
    v: 1,
    savedAt: new Date().toISOString(),
    data: {
      scenarioId: 'wrong_bill',
      customText: '',
      sessions: [
        { index: 0, question: 'Lasku on väärä', transcript: 'ymmärän, tarkistan ' + stamp, label: 'Avaus', tag: 'empathy' }
      ],
      callFeedbackText: 'TOIMI: empatia ' + stamp,
      completedScenarios: ['wrong_bill']
    }
  };
  r = await req('POST', '/api/reflections/save', {
    moduleId: 'moduuli-asiakaspalvelu-live-puhelu__autosave',
    reflectionText: JSON.stringify(csPayload)
  }, cookie);
  if (r.status === 200 && r.json?.success) pass('★5 reflections autosave');
  else fail('★5 reflections save', r.status + ' ' + JSON.stringify(r.json));

  r = await req('GET', '/api/reflections/module/moduuli-asiakaspalvelu-live-puhelu__autosave', null, cookie);
  const csText = r.json?.reflection?.reflection_text || '';
  if (r.status === 200 && csText.includes(stamp) && csText.includes('wrong_bill')) {
    pass('★5 reflections restore round-trip');
  } else fail('★5 reflections restore');

  // API connectivity checks
  const me = await req('GET', '/api/auth/me', null, cookie);
  if (me.status === 200 && me.json?.user) pass('/api/auth/me');
  else fail('/api/auth/me', me.status);

  const cfg = await req('GET', '/api/cs-call/realtime/config?scenario=wrong_bill');
  if (cfg.status === 200 && cfg.json?.phases?.length === 4) pass('/api/cs-call/realtime/config');
  else fail('cs-call config', cfg.status);

  const modAi = await req('POST', '/api/module-ai', {
    bonus_slug: 'eu-ai-act-moduuli5',
    section_id: 'smoke',
    max_tokens: 24,
    system: 'Vastaa yhdellä sanalla: ok',
    messages: [{ role: 'user', content: 'Sano ok' }]
  }, cookie);
  if (modAi.status === 200 && (modAi.json?.text || modAi.json?.reply)) pass('/api/module-ai');
  else fail('/api/module-ai', modAi.status);

  // Pages load persistence scripts
  for (const [id, needle] of [
    ['moduuli-eu-ai-act-moduuli5', 'eu-ai-act-moduuli5-persistence.js'],
    ['moduuli-prompt-hiomo', 'prompt-hiomo-persistence.js'],
    ['moduuli-hitl-architect', 'hitl-architect-persistence.js'],
    ['moduuli-asiakaspalvelu-live-puhelu', 'cs-live-autosave.js']
  ]) {
    const page = await fetch(base + '/module/' + id + '?preview=1');
    const html = await page.text();
    if (page.status === 200 && html.includes(needle)) pass(id + ' loads ' + needle);
    else fail(id + ' missing ' + needle);
  }

  console.log(failed ? '\nFAILED (' + failed + ')' : '\nAll autosave checks passed.');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
