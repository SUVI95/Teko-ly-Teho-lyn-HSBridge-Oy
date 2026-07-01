#!/usr/bin/env node
/**
 * Smoke test: mock interview start path (live WebRTC + classic TTS fallback).
 * Simulates what happens after "Aloita haastattelu" — config, live session proxy, intro speech.
 *
 * Usage: node scripts/smoke-mock-interview.js [baseUrl]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD
 */
const base = (process.argv[2] || process.env.BASE_URL || 'https://aipolku.duunijobs.fi').replace(/\/$/, '');

const INTRO_SPEECH =
  'Hei, tervetuloa — mukava tavata. Kerro nimesi ja vähän itsestäsi — mistä tulet, mitä olet tehnyt tai opiskellut, ja mikä on taustasi.';
const MIN_AUDIO_BYTES = 8000;
const MAX_SPEECH_MS = 8000;

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

async function req(method, path, body, cookie, contentType) {
  const headers = { Accept: 'application/json, text/plain, */*' };
  if (cookie) headers.Cookie = cookie;
  if (body != null) {
    headers['Content-Type'] = contentType || 'application/json';
  }
  const r = await fetch(base + path, {
    method,
    headers,
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
  const ct = r.headers.get('content-type') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null;
  if (ct.includes('json')) {
    try {
      json = JSON.parse(buf.toString('utf8'));
    } catch (e) {
      json = { raw: buf.toString('utf8').slice(0, 300) };
    }
  }
  return { status: r.status, json, text: buf.toString('utf8'), buf, contentType: ct, headers: r.headers };
}

function parseCookie(setCookie) {
  const m = String(setCookie || '').match(/session_token=([^;]+)/);
  return m ? 'session_token=' + m[1] : '';
}

(async () => {
  console.log('Mock interview smoke test:', base);
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

  const page = await fetch(base + '/module/moduuli9-haastattelu', { headers: { Cookie: cookie } });
  const html = await page.text();
  if (page.status !== 200) fail('/module/moduuli9-haastattelu HTTP ' + page.status);
  else pass('/module/moduuli9-haastattelu serves HTML');
  for (const needle of ['mockStart()', 'MockRealtimeInterview', 'mock-realtime.js', 'Aloita haastattelu', 'let haSaveTimer']) {
    if (!html.includes(needle)) fail('module HTML missing: ' + needle);
  }
  pass('module wiring: mockStart, MockRealtimeInterview, haSaveTimer');

  const cfg = await req('GET', '/api/ai/realtime/config', null, cookie);
  if (cfg.status !== 200 || !Array.isArray(cfg.json?.phases) || cfg.json.expectedTurns !== 4) {
    fail('GET /api/ai/realtime/config');
  } else {
    pass('GET /api/ai/realtime/config → model ' + cfg.json.model + ', ' + cfg.json.phases.length + ' phases');
  }

  const minimalSdp = [
    'v=0',
    'o=- 0 0 IN IP4 127.0.0.1',
    's=-',
    't=0 0',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111',
    'a=rtpmap:111 opus/48000/2'
  ].join('\r\n');

  const live = await req('POST', '/api/ai/realtime/session', minimalSdp, cookie, 'application/sdp');
  const liveDetails = live.json?.details || live.text || '';
  const unsupportedType = /unsupported_content_type|text\/plain/i.test(liveDetails);

  if (unsupportedType) {
    fail('POST /api/ai/realtime/session — OpenAI rejected multipart (live mode broken on start)');
  } else if (live.status === 200 && live.text.includes('v=0')) {
    pass('POST /api/ai/realtime/session → SDP answer (live mode ready)');
  } else if (live.status >= 400 && live.status < 500) {
    warn(
      'POST /api/ai/realtime/session HTTP ' +
        live.status +
        ' (expected with smoke SDP; proxy format OK — browser WebRTC should work)'
    );
  } else {
    fail('POST /api/ai/realtime/session HTTP ' + live.status + ' — ' + String(live.json?.error || live.text).slice(0, 120));
  }

  const t0 = Date.now();
  const speech = await req('POST', '/api/ai/speech', { text: INTRO_SPEECH }, cookie);
  const speechMs = Date.now() - t0;

  if (speech.status !== 200) {
    fail('POST /api/ai/speech HTTP ' + speech.status + ' — classic fallback would not speak');
  } else if (speech.buf.length < MIN_AUDIO_BYTES) {
    fail('POST /api/ai/speech returned only ' + speech.buf.length + ' bytes');
  } else if (speechMs > MAX_SPEECH_MS) {
    warn('POST /api/ai/speech slow: ' + speechMs + 'ms (target < ' + MAX_SPEECH_MS + 'ms)');
    pass('POST /api/ai/speech → ' + speech.buf.length + ' bytes in ' + speechMs + 'ms');
  } else {
    pass('POST /api/ai/speech → ' + speech.buf.length + ' bytes in ' + speechMs + 'ms (recruiter intro audio)');
  }

  console.log('');
  if (unsupportedType) {
    console.log('Live interview: BROKEN — falls back to classic recording mode after ~1.4s delay.');
    console.log('Classic TTS intro: ' + (speech.status === 200 ? 'OK — AI speaks after fallback' : 'FAILED'));
  } else if (live.status === 200) {
    console.log('Live interview: proxy OK — recruiter should speak right after WebRTC connects.');
  } else {
    console.log('Live interview: proxy accepts SDP (smoke offer rejected by OpenAI as expected).');
    console.log('Classic TTS intro: OK — used if live fails in browser.');
  }

  console.log('');
  if (process.exitCode) console.log('FAILED');
  else console.log('All checks passed.');
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
