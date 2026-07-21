const express = require('express');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { fetch } = require('undici');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

const CACHE_DIR = envTrim('AUDIO_CACHE_DIR') || path.join(__dirname, '..', 'data', 'audio-cache');

const tokenHits = new Map();
function rateLimitToken(req, res, next) {
  const id = String(req.user && req.user.id ? req.user.id : req.ip || 'anon');
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const max = 30;
  let entry = tokenHits.get(id);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    tokenHits.set(id, entry);
  }
  entry.count += 1;
  if (entry.count > max) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  next();
}

/** Ephemeral OpenAI Realtime token for Module 2 listen buttons. */
router.get('/realtime-token', authenticateToken, rateLimitToken, async (req, res) => {
  try {
    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'audio_unavailable' });
    }

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + openaiApiKey,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        modalities: ['audio', 'text']
      })
    });

    if (!r.ok) {
      const body = await r.text();
      console.error('realtime session failed', r.status, body);
      return res.status(502).json({ error: 'session_failed' });
    }

    const data = await r.json();
    const secret = data.client_secret && data.client_secret.value
      ? data.client_secret.value
      : data.client_secret || data.value || null;
    if (!secret) {
      return res.status(502).json({ error: 'session_failed' });
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ client_secret: secret });
  } catch (e) {
    console.error('realtime-token error', e);
    return res.status(500).json({ error: 'token_error' });
  }
});

async function generateAndStore(text, voice, file) {
  const openaiApiKey = envTrim('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('no_openai_key');
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + openaiApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: voice,
      input: text,
      instructions: 'Lue selkeällä, rauhallisella suomen kielellä. Puhu kuin kouluttaja aikuiselle oppijalle: lämpimästi mutta asiallisesti.',
      response_format: 'mp3'
    })
  });
  if (!r.ok) throw new Error('tts_failed ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buf);
}

/** Lookup / kick off TTS cache for teach-card audio. */
router.post('/cache', authenticateToken, async (req, res) => {
  try {
    const text = String((req.body && req.body.text) || '').trim();
    const voice = String((req.body && req.body.voice) || 'alloy');
    if (!text || text.length > 4000) return res.status(400).json({ error: 'bad_text' });

    const hash = crypto.createHash('sha256').update(voice + '|' + text).digest('hex');
    const file = path.join(CACHE_DIR, hash + '.mp3');

    try {
      await fs.access(file);
      return res.json({ url: '/audio-cache/' + hash + '.mp3', cached: true });
    } catch (e) {
      /* miss */
    }

    generateAndStore(text, voice, file).catch((err) => console.error('tts cache', err.message || err));
    return res.status(204).end();
  } catch (e) {
    console.error('audio cache error', e);
    return res.status(500).json({ error: 'cache_error' });
  }
});

module.exports = router;
module.exports.CACHE_DIR = CACHE_DIR;
