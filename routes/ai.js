const express = require('express');
const multer = require('multer');
const router = express.Router();
const { fetch } = require('undici');
const { extractPdfTextFromBuffer } = require('../lib/pdf-extract');
const { buildMultipartForm } = require('../lib/multipart-form');
const { MOCK_INTERVIEW_PHASES, MOCK_INTERVIEW_TURN_COUNT, MOCK_CLASSIC_QUESTIONS, buildMockRealtimeInstructions } = require('../lib/mock-interview-questions');

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

/** Read env var and trim whitespace/newlines (common copy-paste issue). */
function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

// OpenAI API endpoint for chat (no authentication required)
router.post('/chat', async (req, res) => {
  try {
    const { messages, system, model = 'gpt-4o-mini', max_tokens = 1000 } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'AI-palvelu ei ole käytettävissä. Ota yhteyttä opettajaan.' });
    }

    // Prepare messages for OpenAI API
    const openaiMessages = [];
    if (system) {
      openaiMessages.push({ role: 'system', content: system });
    }
    openaiMessages.push(...messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: openaiMessages,
        max_tokens: max_tokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: 'AI service error',
        details: errorData 
      });
    }

    const data = await response.json();
    
    // Extract the text content from OpenAI response
    const text = data.choices?.[0]?.message?.content || '';
    
    res.json({ 
      text: text,
      usage: data.usage 
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      message: error.message 
    });
  }
});

/** Hard per-attempt timeout so requests can never hang on a slow provider.
 *  Old client code (already loaded in students' tabs) sits in await ask(...);
 *  if the request hangs, the mission-unlock flow never runs. Bounded latency
 *  guarantees the promise always settles. */
const OPENAI_TIMEOUT_MS = 8000;
const ANTHROPIC_TIMEOUT_MS = 10000;

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

const WHISPER_TIMEOUT_MS = 30000;
const VOICE_INTERVIEW_TIMEOUT_MS = 45000;

function voiceFeedbackModel() {
  return envTrim('OPENAI_VOICE_MODEL') || 'gpt-realtime-2';
}

function realtimeModel() {
  return envTrim('OPENAI_REALTIME_MODEL') || voiceFeedbackModel();
}

function realtimeVoice() {
  return envTrim('OPENAI_REALTIME_VOICE') || 'marin';
}

function ttsVoice() {
  return envTrim('OPENAI_TTS_VOICE') || 'marin';
}

function buildRealtimeSessionConfig() {
  return {
    type: 'realtime',
    model: realtimeModel(),
    instructions: buildMockRealtimeInstructions(),
    output_modalities: ['audio', 'text'],
    audio: {
      input: {
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'low',
          create_response: false,
          interrupt_response: false
        },
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'fi' }
      },
      output: {
        format: { type: 'audio/pcm', rate: 24000 },
        voice: realtimeVoice()
      }
    }
  };
}

/** Transcribe audio buffer via OpenAI Whisper (multipart body built manually for Node fetch). */
async function whisperTranscribeBuffer(openaiApiKey, buffer, opts = {}) {
  const language = opts.language || 'fi';
  const model = opts.model || 'whisper-1';
  const filename = opts.filename || 'recording.webm';
  const mime = opts.mime || 'audio/webm';

  const { body, contentType } = buildMultipartForm([
    { name: 'file', value: buffer, filename, contentType: mime },
    { name: 'model', value: model },
    { name: 'language', value: language }
  ]);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      'Content-Type': contentType,
      'Content-Length': String(body.length)
    },
    body,
    signal: timeoutSignal(WHISPER_TIMEOUT_MS)
  });

  if (!response.ok) {
    const errorData = await response.text().catch(() => '');
    const err = new Error('Transcription failed');
    err.status = response.status;
    err.details = errorData;
    throw err;
  }

  const data = await response.json();
  return String(data.text || '').trim();
}

/** Analyze interview speech with gpt-realtime-2 (falls back to gpt-4o-mini). */
async function voiceInterviewFeedback(openaiApiKey, { system, prompt, max_tokens = 350 }) {
  const models = [voiceFeedbackModel(), 'gpt-4o-mini'];
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  let lastError = '';
  for (const model of models) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens,
          temperature: 0.6
        }),
        signal: timeoutSignal(VOICE_INTERVIEW_TIMEOUT_MS)
      });

      if (!response.ok) {
        lastError = await response.text().catch(() => '');
        console.warn('Voice feedback model failed:', model, lastError);
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (text.trim()) return text.trim();
    } catch (err) {
      lastError = err.message;
      console.warn('Voice feedback error:', model, err.message);
    }
  }

  const err = new Error('Voice feedback failed');
  err.details = lastError;
  throw err;
}

async function callOpenAIFallback(messages, system, max_tokens, res) {
  const openaiApiKey = envTrim('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return res.status(503).json({
      error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.'
    });
  }

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  openaiMessages.push(...messages);

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: max_tokens,
        temperature: 0.7
      }),
      signal: timeoutSignal(OPENAI_TIMEOUT_MS)
    });
  } catch (err) {
    console.error('OpenAI fallback fetch failed (timeout or network):', err.message);
    return res.status(503).json({
      error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.'
    });
  }

  if (!response.ok) {
    const errorData = await response.text().catch(() => '');
    console.error('OpenAI fallback error:', errorData);
    return res.status(503).json({
      error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.'
    });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return res.json({ text, usage: data.usage });
}

// DuuniJobs AI (Anthropic) — deep analysis; /claude kept for older clients
async function handleDuunijobsAi(req, res) {
  try {
    const { messages, system, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const anthropicKey = envTrim('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.warn('Anthropic API key not configured, using OpenAI fallback');
      return callOpenAIFallback(messages, system, max_tokens, res);
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens,
      messages: messages
    };
    if (system) body.system = system;

    // Bounded retries: 2 attempts max, short backoff, hard per-attempt
    // timeout — so /api/ai/claude never hangs the calling browser tab.
    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 600));
      }

      let response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(body),
          signal: timeoutSignal(ANTHROPIC_TIMEOUT_MS)
        });
      } catch (err) {
        console.warn(`Anthropic fetch failed (attempt ${attempt + 1}/${maxRetries}):`, err.message);
        if (attempt < maxRetries - 1) continue;
        break;
      }

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        return res.json({
          text: text,
          usage: data.usage
        });
      }

      const errorData = await response.text().catch(() => '');

      if (response.status === 529 || response.status === 503 || response.status === 429) {
        console.warn(`Anthropic API retryable status ${response.status} (attempt ${attempt + 1}/${maxRetries}):`, errorData);
        continue;
      }

      console.warn(`Anthropic API non-retryable status ${response.status}, using OpenAI fallback:`, errorData);
      return callOpenAIFallback(messages, system, max_tokens, res);
    }

    console.warn('DuuniJobs AI exhausted retries, falling back to OpenAI');
    return callOpenAIFallback(messages, system, max_tokens, res);
  } catch (error) {
    console.error('Error calling Anthropic API, falling back to OpenAI:', error.message);
    try {
      const { messages, system, max_tokens = 2000 } = req.body;
      return callOpenAIFallback(messages, system, max_tokens, res);
    } catch (fallbackErr) {
      console.error('OpenAI fallback also failed:', fallbackErr.message);
      res.status(500).json({
        error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.'
      });
    }
  }
}
router.post('/duunijobs', handleDuunijobsAi);
router.post('/claude', handleDuunijobsAi);

/** Whisper transcription proxy for interview voice exercises (moduuli9). */
router.post('/transcribe', audioUpload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Audio file required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Transkriptiopalvelu ei ole käytössä. Ota yhteyttä opettajaan.' });
    }

    const language = String(req.body.language || 'fi').trim() || 'fi';
    const model = String(req.body.model || 'whisper-1').trim() || 'whisper-1';
    const filename = req.file.originalname || 'recording.webm';
    const mime = req.file.mimetype || 'audio/webm';

    const text = await whisperTranscribeBuffer(openaiApiKey, req.file.buffer, {
      language,
      model,
      filename,
      mime
    });

    res.json({ text, transcript: text });
  } catch (error) {
    console.error('Transcribe error:', error.details || error.message);
    res.status(error.status || 500).json({
      error: 'Transkriptio epäonnistui',
      message: error.message
    });
  }
});

/** Transcribe + gpt-realtime-2 feedback for moduuli9 voice exercises. */
router.post('/voice-interview', audioUpload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Audio file required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Äänipalvelu ei ole käytössä. Ota yhteyttä opettajaan.' });
    }

    const system = String(req.body.system || '').trim();
    const prompt = String(req.body.prompt || '').trim();
    const max_tokens = Math.min(800, Math.max(80, parseInt(req.body.max_tokens, 10) || 350));
    const language = String(req.body.language || 'fi').trim() || 'fi';
    const filename = req.file.originalname || 'recording.webm';
    const mime = req.file.mimetype || 'audio/webm';

    const transcript = await whisperTranscribeBuffer(openaiApiKey, req.file.buffer, {
      language,
      filename,
      mime
    });

    if (!transcript) {
      return res.json({
        transcript: '',
        feedback: '',
        text: '',
        warning: 'Puhetta ei tunnistettu. Yritä uudelleen selkeämmällä äänellä.'
      });
    }

    let feedback = '';
    if (system) {
      const userPrompt = prompt
        ? `${prompt}\n\nHakijan vastaus (transkriptio):\n${transcript}`
        : `Hakijan vastaus (transkriptio):\n${transcript}`;
      feedback = await voiceInterviewFeedback(openaiApiKey, { system, prompt: userPrompt, max_tokens });
    }

    res.json({
      transcript,
      text: transcript,
      feedback,
      model: voiceFeedbackModel()
    });
  } catch (error) {
    console.error('Voice interview error:', error.details || error.message);
    res.status(error.status || 500).json({
      error: 'Äänianalyysi epäonnistui',
      message: error.message
    });
  }
});

/** TTS for mock interview — human recruiter delivery (gpt-4o-mini-tts instructions). */
const DEFAULT_TTS_INSTRUCTIONS = [
  'Role: adult Finnish recruiter sitting across the table in a quiet room — same room as the candidate, not on a phone.',
  'Tone: warm, clear, genuinely friendly. Speak at a natural conversational pace — slightly slower than news, never rushed.',
  'Human speech: conversational Finnish with natural rhythm, micro-pauses, and soft breaths between phrases.',
  'Voice texture: close and present — like a real person nearby. Smile in your voice. Subtle warmth, never flat or robotic.',
  'Intonation: vary pitch naturally. Sound curious and open when asking questions.',
  'Avoid: phone-line muffiness, tunnel echo, GPS voice, monotone reading, robotic cadence, shouting, cartoonish acting.',
  'Language: Finnish.'
].join(' ');

router.post('/speech', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Puhepalvelu ei ole käytössä. Ota yhteyttä opettajaan.' });
    }

    const voice = ttsVoice();
    const instructions = String(req.body.instructions || '').trim()
      || envTrim('OPENAI_TTS_INSTRUCTIONS')
      || DEFAULT_TTS_INSTRUCTIONS;
    const speedRaw = parseFloat(envTrim('OPENAI_TTS_SPEED') || '0.97');
    const speed = Number.isFinite(speedRaw) ? Math.min(1.15, Math.max(0.85, speedRaw)) : 0.97;

    const primaryModel = envTrim('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts-2025-03-20';
    const fallbackModel = 'gpt-4o-mini-tts';
    const legacyModel = 'tts-1-hd';
    const responseFormat = envTrim('OPENAI_TTS_FORMAT') || 'wav';

    const models = [primaryModel, fallbackModel, legacyModel].filter(
      (m, i, arr) => m && arr.indexOf(m) === i
    );

    let lastError = '';
    for (const model of models) {
      const payload = {
        model,
        voice,
        input: text.slice(0, 4096),
        response_format: model === legacyModel ? 'mp3' : responseFormat
      };
      if (model.startsWith('gpt-4o-mini-tts')) {
        payload.instructions = instructions;
      }
      if (model !== legacyModel) {
        payload.speed = speed;
      }

      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify(payload),
          signal: timeoutSignal(45000)
        });

        if (!response.ok) {
          lastError = await response.text().catch(() => '');
          console.warn('OpenAI TTS model failed:', model, lastError);
          continue;
        }

        const audio = Buffer.from(await response.arrayBuffer());
        const mime = responseFormat === 'wav' ? 'audio/wav' : responseFormat === 'opus' ? 'audio/opus' : 'audio/mpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-TTS-Model', model);
        return res.send(audio);
      } catch (err) {
        lastError = err.message;
        console.warn('OpenAI TTS error:', model, err.message);
      }
    }

    console.error('OpenAI TTS all models failed:', lastError);
    return res.status(502).json({ error: 'Speech generation failed', details: lastError });
  } catch (error) {
    console.error('Speech error:', error);
    res.status(500).json({ error: 'Failed to generate speech', message: error.message });
  }
});

/** WebRTC Realtime session for live mock interview (gpt-realtime-2). */
router.post('/realtime/session', express.text({ type: ['application/sdp', 'text/plain'], limit: '512kb' }), async (req, res) => {
  try {
    const sdp = String(req.body || '').trim();
    if (!sdp) {
      return res.status(400).json({ error: 'SDP offer required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Live-haastattelu ei ole käytössä. Ota yhteyttä opettajaan.' });
    }

    const sessionConfig = buildRealtimeSessionConfig();

    const fd = new FormData();
    fd.set('sdp', sdp);
    fd.set('session', JSON.stringify(sessionConfig));

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: fd,
      signal: timeoutSignal(30000)
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('Realtime session error:', response.status, details);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: 'Live-yhteys epäonnistui',
        details
      });
    }

    const answerSdp = await response.text();
    res.set('Content-Type', 'application/sdp');
    res.send(answerSdp);
  } catch (error) {
    console.error('Realtime session error:', error.message);
    res.status(500).json({ error: 'Live-yhteys epäonnistui', message: error.message });
  }
});

/** Mock interview question list (for client sync). */
router.get('/realtime/config', (req, res) => {
  res.json({
    model: realtimeModel(),
    voice: realtimeVoice(),
    phases: MOCK_INTERVIEW_PHASES,
    expectedTurns: MOCK_INTERVIEW_TURN_COUNT,
    classicQuestions: MOCK_CLASSIC_QUESTIONS,
    deliveryHint: 'Puhu kuin aikuinen suomalainen nainen samassa huoneessa — rauhallinen, lämmin, luonnollinen. Yksi kysymys kerrallaan, odota vastausta.'
  });
});

const MOCK_REACTION_TTS_INSTRUCTIONS = [
  'Spontaneous brief Finnish recruiter reaction — like a real person listening in an interview.',
  'Warm, light energy. Smile in voice. A soft chuckle or breathy "heh" is fine if natural.',
  'Sound like you genuinely heard them — not reading a script. One or two short sentences max.',
  'Language: Finnish.'
].join(' ');

/** Short human recruiter reaction between mock interview questions. */
router.post('/mock-reaction', async (req, res) => {
  try {
    const question = String(req.body.question || '').trim();
    const answer = String(req.body.answer || '').trim();
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'AI-palvelu ei ole käytössä.' });
    }

    const system = [
      'Olet suomalainen rekrytoija live-haastattelussa. Hakija vastasi juuri kysymykseesi.',
      'Anna YKSI lyhyt puhekielinen reaktio (enintään 2 lausetta, max 30 sanaa) — kuin oikea ihminen:',
      'tunnusta ("joo", "ymmärrän", "aivan", "hyvä"), myötäile kevyesti ("totta", "tuttu tilanne", "olet ihan oikeassa").',
      'Pieni luonnollinen heh tai hymy äänessä OK. ÄLÄ anna palautetta, äLÄ arvioi, äLÄ esitä seuraavaa kysymystä.',
      'Suomi, rento mutta ammattimainen.'
    ].join(' ');

    const reaction = await voiceInterviewFeedback(openaiApiKey, {
      system,
      prompt: `Kysymys: ${question}\n\nHakijan vastaus: ${answer}`,
      max_tokens: 100
    });

    res.json({
      reaction: reaction || 'Joo, kiitos — hyvä.',
      speechInstructions: MOCK_REACTION_TTS_INSTRUCTIONS
    });
  } catch (error) {
    console.error('Mock reaction error:', error);
    res.status(500).json({ error: 'Reaktio epäonnistui', message: error.message });
  }
});

/** Final feedback after all mock interview answers. */
router.post('/mock-feedback', async (req, res) => {
  try {
    const sessions = req.body.sessions;
    if (!Array.isArray(sessions) || !sessions.length) {
      return res.status(400).json({ error: 'Sessions array required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'AI-palvelu ei ole käytössä.' });
    }

    const block = sessions.map((s, i) => {
      const q = String(s.question || s.recruiterText || '').trim();
      const a = String(s.transcript || s.answer || '').trim();
      const tag = String(s.tag || s.phase || '').trim();
      const label = String(s.label || '').trim();
      const header = label || (tag ? tag : 'Vaihe ' + (i + 1));
      return `--- ${header}${tag && label ? ' (' + tag + ')' : ''} ---\nRekrytoija: ${q || '(ei tallennettu)'}\n\nHakijan vastaus:\n${a}`;
    }).join('\n\n');

    const system = [
      'Olet kokenut suomalainen rekrytoija. Live mock-haastattelu on päättynyt.',
      'Haastattelu sisälsi tutustumisen (nimi, tausta) ja kolme taustaan sidottua käytöskysymystä.',
      'Anna kokonaispalaute kaikista vastauksista. Merkitse täsmälleen:',
      '✓ TOIMI:',
      '⚠ PARANNA:',
      '→ MUUTOS:',
      'Suomi. Konkreettinen. Max 10 lausetta. Mainitse jos STAR-rakenne puuttui käytöskysymyksistä.'
    ].join(' ');

    const feedback = await voiceInterviewFeedback(openaiApiKey, {
      system,
      prompt: block,
      max_tokens: 450
    });

    res.json({ feedback: feedback || '' });
  } catch (error) {
    console.error('Mock feedback error:', error);
    res.status(500).json({ error: 'Palaute epäonnistui', message: error.message });
  }
});

// OpenAI API endpoint for image generation (DALL-E 3)
router.post('/image', async (req, res) => {
  try {
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.trim(),
        n: 1,
        size,
        quality
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI image API error:', errorData);
      return res.status(response.status).json({
        error: 'AI image service error',
        details: errorData
      });
    }

    const data = await response.json();
    const imageUrl = data?.data?.[0]?.url;
    if (!imageUrl) {
      return res.status(502).json({ error: 'No image URL returned from OpenAI' });
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error calling OpenAI image API:', error);
    res.status(500).json({
      error: 'Failed to generate image',
      message: error.message
    });
  }
});

/** Extract plain text from CV upload (PDF or .txt) for Minna / portfolio modules. */
router.post('/cv-extract-text', cvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Tiedosto puuttuu' });
    }
    const name = (req.file.originalname || '').toLowerCase();
    const mime = (req.file.mimetype || '').toLowerCase();
    let text = '';

    if (mime === 'text/plain' || name.endsWith('.txt')) {
      text = req.file.buffer.toString('utf8').trim();
    } else if (mime === 'application/pdf' || name.endsWith('.pdf')) {
      text = await extractPdfTextFromBuffer(req.file.buffer);
    } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return res.status(400).json({
        error: 'Word-tiedostoa ei voi lukea automaattisesti. Tallenna CV PDF-muodossa tai täytä kentät käsin.'
      });
    } else {
      return res.status(400).json({ error: 'Tuetut tiedostot: PDF ja TXT' });
    }

    if (!text || text.replace(/\s/g, '').length < 40) {
      return res.status(422).json({
        error: 'CV:stä ei löytynyt riittävästi tekstiä. Käytä tekstipohjaista PDF:ää (ei skannattua kuvaa), tai täytä kentät käsin.',
        text: text || ''
      });
    }

    const maxLen = 20000;
    res.json({
      text: text.length > maxLen ? text.slice(0, maxLen) + '\n…' : text,
      chars: text.length
    });
  } catch (err) {
    console.error('cv-extract-text error:', err);
    res.status(500).json({ error: 'CV:n lukeminen epäonnistui. Täytä kentät käsin.' });
  }
});

/** Parse CV plain text into structured fields (name, city, experience, etc.). */
router.post('/cv-parse', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (text.replace(/\s/g, '').length < 40) {
      return res.status(400).json({ error: 'CV-teksti on liian lyhyt analysoitavaksi.' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Tekoälypalvelu ei ole käytössä.' });
    }

    const system = [
      'You extract structured facts from a Finnish CV or resume.',
      'Reply with ONLY valid JSON (no markdown, no commentary) using this shape:',
      '{"name":"","city":"","experience":"2-4 sentences in Finnish summarizing work, education, and relevant background","targetRole":"best guess of desired role or field in Finnish, or empty string","pride":"one concrete achievement from the CV in Finnish, or empty string"}',
      'Use only information explicitly in the CV. Do not invent employers, dates, or skills.'
    ].join(' ');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text.slice(0, 12000) }
        ],
        max_tokens: 700,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
      signal: timeoutSignal(45000)
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('cv-parse OpenAI error:', details);
      return res.status(502).json({ error: 'CV:n analysointi epäonnistui. Täytä kentät käsin.' });
    }

    const data = await response.json();
    const raw = String(data.choices?.[0]?.message?.content || '').trim();
    let fields;
    try {
      fields = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch (parseErr) {
      console.error('cv-parse JSON parse failed:', raw.slice(0, 200));
      return res.status(502).json({ error: 'CV:n tietojen jäsentäminen epäonnistui.' });
    }

    res.json({
      fields: {
        name: String(fields.name || '').trim(),
        city: String(fields.city || '').trim(),
        experience: String(fields.experience || '').trim(),
        targetRole: String(fields.targetRole || fields.target_role || '').trim(),
        pride: String(fields.pride || '').trim()
      },
      chars: text.length
    });
  } catch (err) {
    console.error('cv-parse error:', err);
    res.status(500).json({ error: 'CV:n analysointi epäonnistui.' });
  }
});

module.exports = router;
