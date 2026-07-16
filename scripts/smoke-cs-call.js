#!/usr/bin/env node
/**
 * Smoke test: customer-service live call API.
 * Usage: node scripts/smoke-cs-call.js [baseUrl]
 */
const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function req(method, path, body, cookie, contentType) {
  const headers = { Accept: 'application/json, text/plain, */*' };
  if (cookie) headers.Cookie = cookie;
  if (body != null) headers['Content-Type'] = contentType || 'application/json';
  const r = await fetch(base + path, {
    method,
    headers,
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  });
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null;
  try { json = JSON.parse(buf.toString('utf8')); } catch (e) {}
  return { status: r.status, json, text: buf.toString('utf8') };
}

function pass(m) { console.log('  ✓', m); }
function fail(m) { console.error('  ✗', m); process.exitCode = 1; }

(async () => {
  console.log('CS live call smoke:', base);

  const cfg = await req('GET', '/api/cs-call/realtime/config?scenario=wrong_bill');
  if (cfg.status !== 200 || !Array.isArray(cfg.json?.phases) || cfg.json.expectedTurns !== 4) {
    fail('GET /api/cs-call/realtime/config');
  } else {
    pass('config → ' + cfg.json.phases.length + ' phases, model ' + cfg.json.model);
  }

  const sdp = ['v=0', 'o=- 0 0 IN IP4 127.0.0.1', 's=-', 't=0 0', 'm=audio 9 UDP/TLS/RTP/SAVPF 111', 'a=rtpmap:111 opus/48000/2'].join('\r\n');
  const live = await req('POST', '/api/cs-call/realtime/session?scenario=wrong_bill', sdp, null, 'application/sdp');
  if (live.status === 200 && live.text.includes('v=0')) pass('realtime/session → SDP answer');
  else if (live.status === 503) pass('realtime/session → route OK (no OPENAI_API_KEY locally)');
  else if (live.status >= 400 && live.status < 500) pass('realtime/session proxy OK (smoke SDP rejected as expected)');
  else fail('realtime/session HTTP ' + live.status);

  const page = await fetch(base + '/module/moduuli-asiakaspalvelu-live-puhelu');
  const html = await page.text();
  if (page.status === 200 && html.includes('CsMockRealtimeCall')) pass('module HTML serves');
  else fail('module page');

  console.log(process.exitCode ? 'FAILED' : 'All checks passed.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
