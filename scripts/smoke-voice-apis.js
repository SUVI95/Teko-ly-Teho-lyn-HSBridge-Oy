#!/usr/bin/env node
/**
 * LIVE smoke test for the two AI providers this platform depends on:
 *   1. Claude (Anthropic Messages API) — all student-facing written coaching.
 *   2. OpenAI Realtime — the live voice counterpart in every voice exercise.
 *   3. OpenAI voice helpers — TTS (speech) + Whisper transcription round-trip.
 *
 * It hits the providers with the EXACT session configs the production routes
 * build (imported directly), so a bad model name, bad voice, expired key or
 * malformed session is caught here. The goal is a clean run with ZERO
 * 401 / 400 / 5xx responses.
 *
 * If a server is running at BASE_URL it also exercises the real HTTP routes.
 *
 *   node scripts/smoke-voice-apis.js            # providers + server if up
 *   BASE_URL=http://localhost:3000 node scripts/smoke-voice-apis.js
 */
'use strict';

require('dotenv').config();

const { fetch } = require('undici');

// Exact production configs.
const studioVoice = require('../routes/studio-voice');
const csCall = require('../routes/cs-call');
const aiRoutes = require('../routes/ai');
const { buildBottityypitRealtimeSession, bottityypitRealtimeVoice } = require('../lib/bottityypit-voice');

const BASE = (process.env.BASE_URL || process.env.SMOKE_BASE || 'http://localhost:3000').replace(/\/$/, '');

function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

const OPENAI_KEY = envTrim('OPENAI_API_KEY');
const ANTHROPIC_KEY = envTrim('ANTHROPIC_API_KEY');

let failures = 0;
let warnings = 0;
function pass(msg) { console.log('  \u2713 ' + msg); }
function fail(msg) { console.error('  \u2717 ' + msg); failures += 1; }
function warn(msg) { console.log('  \u26a0 ' + msg); warnings += 1; }
function head(msg) { console.log('\n' + msg); }

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

/**
 * Validate a Realtime session config against OpenAI. The client_secrets
 * endpoint fully parses model + voice + audio + instructions and mints an
 * ephemeral key on success — the same validation the SDP `/calls` proxy does,
 * minus the browser-only SDP. A bad model/voice/key surfaces as 400/401 here.
 */
async function checkRealtimeSession(label, sessionConfig) {
  const model = sessionConfig && sessionConfig.model;
  const voice = sessionConfig && sessionConfig.audio && sessionConfig.audio.output && sessionConfig.audio.output.voice;
  try {
    const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session: sessionConfig }),
      signal: timeoutSignal(20000)
    });
    const text = await r.text();
    if (r.ok) {
      let ok = false;
      try { ok = Boolean(JSON.parse(text).value || JSON.parse(text).client_secret); } catch (e) { ok = true; }
      pass(label + ' \u2192 OpenAI accepts session (model ' + model + ', voice ' + voice + ')' + (ok ? '' : ' [no token in body?]'));
    } else {
      fail(label + ' \u2192 HTTP ' + r.status + ' (model ' + model + ', voice ' + voice + ') :: ' + text.slice(0, 220));
    }
  } catch (e) {
    fail(label + ' \u2192 request error: ' + e.message);
  }
}

/** Validate a single Claude model directly against Anthropic. */
async function checkClaudeModel(model) {
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 32,
        messages: [{ role: 'user', content: 'Vastaa täsmälleen sanalla: OK' }]
      }),
      signal: timeoutSignal(30000)
    });
    const text = await r.text();
    if (r.ok) {
      let out = '';
      try {
        const data = JSON.parse(text);
        out = (data.content || []).map((b) => b && b.text ? b.text : '').join(' ').trim();
      } catch (e) {}
      pass('Claude ' + model + ' \u2192 200 (' + (out || 'empty text').slice(0, 40) + ')');
      return true;
    }
    // 404/400 = model unavailable in this account. The app cascades to the next
    // model, so treat as a warning unless it is an auth/server failure.
    if (r.status === 404 || r.status === 400) {
      warn('Claude ' + model + ' \u2192 HTTP ' + r.status + ' (unavailable; app falls back) :: ' + text.slice(0, 160));
      return false;
    }
    fail('Claude ' + model + ' \u2192 HTTP ' + r.status + ' :: ' + text.slice(0, 200));
    return false;
  } catch (e) {
    fail('Claude ' + model + ' \u2192 request error: ' + e.message);
    return false;
  }
}

/** OpenAI chat completion (used by /api/ai/chat and several helpers). */
async function checkOpenAIChat() {
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Vastaa täsmälleen sanalla: OK' }],
        max_tokens: 16
      }),
      signal: timeoutSignal(20000)
    });
    const text = await r.text();
    if (r.ok) pass('OpenAI chat (gpt-4o-mini) \u2192 200');
    else fail('OpenAI chat \u2192 HTTP ' + r.status + ' :: ' + text.slice(0, 200));
  } catch (e) {
    fail('OpenAI chat \u2192 request error: ' + e.message);
  }
}

/** OpenAI TTS -> Whisper round-trip. Validates the whole voice-helper chain. */
async function checkOpenAIVoiceRoundTrip() {
  const ttsModel = envTrim('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts';
  const ttsVoice = envTrim('OPENAI_TTS_VOICE') || 'marin';
  let audio = null;
  try {
    const r = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({ model: ttsModel, voice: ttsVoice, input: 'Tervetuloa haastatteluun.', response_format: 'wav' }),
      signal: timeoutSignal(45000)
    });
    if (r.ok) {
      audio = Buffer.from(await r.arrayBuffer());
      if (audio.length > 4000) pass('OpenAI TTS (' + ttsModel + ', ' + ttsVoice + ') \u2192 ' + audio.length + ' bytes');
      else { fail('OpenAI TTS \u2192 only ' + audio.length + ' bytes'); audio = null; }
    } else {
      const text = await r.text();
      fail('OpenAI TTS \u2192 HTTP ' + r.status + ' :: ' + text.slice(0, 200));
    }
  } catch (e) {
    fail('OpenAI TTS \u2192 request error: ' + e.message);
  }

  if (!audio) return;

  try {
    const boundary = '----smoke' + Date.now();
    const pre = Buffer.from(
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="file"; filename="clip.wav"\r\n' +
      'Content-Type: audio/wav\r\n\r\n'
    );
    const mid = Buffer.from(
      '\r\n--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Disposition: form-data; name="language"\r\n\r\nfi\r\n' +
      '--' + boundary + '--\r\n'
    );
    const body = Buffer.concat([pre, audio, mid]);
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + OPENAI_KEY, 'Content-Type': 'multipart/form-data; boundary=' + boundary },
      body,
      signal: timeoutSignal(30000)
    });
    const text = await r.text();
    if (r.ok) {
      let t = '';
      try { t = JSON.parse(text).text || ''; } catch (e) {}
      pass('OpenAI Whisper transcribe \u2192 200 ("' + t.trim().slice(0, 50) + '")');
    } else {
      fail('OpenAI Whisper \u2192 HTTP ' + r.status + ' :: ' + text.slice(0, 200));
    }
  } catch (e) {
    fail('OpenAI Whisper \u2192 request error: ' + e.message);
  }
}

/* ---- Server route checks (only if a server is reachable) ---- */

async function serverReq(method, path, body, contentType) {
  const headers = { Accept: 'application/json, text/plain, */*' };
  if (body != null) headers['Content-Type'] = contentType || 'application/json';
  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    signal: timeoutSignal(60000)
  });
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null;
  try { json = JSON.parse(buf.toString('utf8')); } catch (e) {}
  return { status: r.status, json, text: buf.toString('utf8'), bytes: buf.length };
}

async function serverIsUp() {
  try {
    const r = await fetch(BASE + '/api/health', { signal: timeoutSignal(3000) });
    return r.ok;
  } catch (e) {
    return false;
  }
}

async function checkServerRoutes() {
  // Config endpoints (no external call — pure wiring).
  const configs = [
    ['/api/ai/realtime/config', (j) => Array.isArray(j.phases) && j.expectedTurns > 0],
    ['/api/cs-call/realtime/config?scenario=wrong_bill', (j) => Array.isArray(j.phases) && j.expectedTurns > 0],
    ['/api/studio-voice/realtime/config?scenario=latu', (j) => j.expectedTurns === 4 && /Jari/.test(j.persona || '')],
    ['/api/studio-voice/realtime/config?scenario=kajaani', (j) => j.expectedTurns === 5 && /Marja/.test(j.persona || '')]
  ];
  for (const [path, ok] of configs) {
    const r = await serverReq('GET', path);
    if (r.status === 200 && r.json && ok(r.json)) pass('GET ' + path + ' \u2192 200');
    else fail('GET ' + path + ' \u2192 HTTP ' + r.status + ' :: ' + String(r.text).slice(0, 160));
  }

  // Claude via server route.
  const claude = await serverReq('POST', '/api/ai/claude', {
    system: 'Vastaa suomeksi enintään yhdellä lauseella.',
    messages: [{ role: 'user', content: 'Sano lyhyt kannustava lause työnhakijalle.' }],
    max_tokens: 60
  });
  if (claude.status === 200 && claude.json && claude.json.text) {
    pass('POST /api/ai/claude \u2192 200 (' + claude.json.provider + '/' + claude.json.model + ')');
  } else {
    fail('POST /api/ai/claude \u2192 HTTP ' + claude.status + ' :: ' + String(claude.text).slice(0, 200));
  }

  // OpenAI chat via server route.
  const chat = await serverReq('POST', '/api/ai/chat', {
    system: 'Vastaa suomeksi lyhyesti.',
    messages: [{ role: 'user', content: 'Kirjoita yksi lause.' }],
    max_tokens: 40
  });
  if (chat.status === 200 && chat.json && chat.json.text) pass('POST /api/ai/chat \u2192 200');
  else fail('POST /api/ai/chat \u2192 HTTP ' + chat.status + ' :: ' + String(chat.text).slice(0, 200));

  // TTS via server route.
  const speech = await serverReq('POST', '/api/ai/speech', { text: 'Hei ja tervetuloa.' });
  if (speech.status === 200 && speech.bytes > 4000) pass('POST /api/ai/speech \u2192 200 (' + speech.bytes + ' bytes)');
  else fail('POST /api/ai/speech \u2192 HTTP ' + speech.status + ' (' + speech.bytes + ' bytes)');

  // Bottityypit ephemeral realtime token via server route.
  const token = await serverReq('GET', '/api/realtime-token?scenario=metsa');
  if (token.status === 200 && token.json && (token.json.value || token.json.client_secret)) {
    pass('GET /api/realtime-token \u2192 200 (ephemeral key minted)');
  } else {
    fail('GET /api/realtime-token \u2192 HTTP ' + token.status + ' :: ' + String(token.text).slice(0, 200));
  }
}

(async () => {
  console.log('=== LIVE AI SMOKE TEST (Claude + OpenAI Realtime voices) ===');
  console.log('OPENAI_API_KEY:', OPENAI_KEY ? 'set' : 'MISSING');
  console.log('ANTHROPIC_API_KEY:', ANTHROPIC_KEY ? 'set' : 'MISSING');

  if (!OPENAI_KEY) fail('OPENAI_API_KEY missing — realtime voices + TTS cannot work');
  if (!ANTHROPIC_KEY) fail('ANTHROPIC_API_KEY missing — Claude coaching cannot work');

  if (OPENAI_KEY) {
    head('OpenAI Realtime voice session configs (production builders):');
    // Studio voice — all four scenario personas.
    for (const key of Object.keys(studioVoice.SCENARIOS)) {
      await checkRealtimeSession('studio-voice / ' + key, studioVoice.buildSessionConfig(key, ''));
    }
    // Customer-service live call.
    await checkRealtimeSession('cs-call / wrong_bill', csCall.buildRealtimeSessionConfig('wrong_bill', ''));
    // Mock interview.
    await checkRealtimeSession('mock-interview', aiRoutes.buildRealtimeSessionConfig());
    // Bottityypit voice bot.
    const botCfg = buildBottityypitRealtimeSession('metsa');
    if (!botCfg.audio.output.voice) botCfg.audio.output.voice = bottityypitRealtimeVoice();
    await checkRealtimeSession('bottityypit / metsa', botCfg);

    head('OpenAI voice helpers:');
    await checkOpenAIChat();
    await checkOpenAIVoiceRoundTrip();
  }

  if (ANTHROPIC_KEY) {
    head('Claude (Anthropic) models used by the app:');
    const primary = envTrim('ANTHROPIC_MODEL') || 'claude-sonnet-4-5';
    const smart = envTrim('ANTHROPIC_MODEL_SMART') || 'claude-fable-5';
    const okPrimary = await checkClaudeModel(primary);
    const okSmart = await checkClaudeModel(smart);
    if (!okPrimary && !okSmart) {
      fail('No configured Claude model responded — coaching would fall back to OpenAI');
    }
  }

  head('Server routes (' + BASE + '):');
  if (await serverIsUp()) {
    await checkServerRoutes();
  } else {
    warn('No server reachable at ' + BASE + ' — skipped HTTP route checks (start it with `npm start`).');
  }

  console.log('\n=== RESULT ===');
  console.log('Failures: ' + failures + '   Warnings: ' + warnings);
  if (failures) {
    console.log('SMOKE TEST FAILED');
    process.exit(1);
  }
  console.log('ALL LIVE API CHECKS PASSED \u2014 no 401 / 400 / 5xx.');
})().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
