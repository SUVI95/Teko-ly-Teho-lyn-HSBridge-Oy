const express = require('express');
const multer = require('multer');
const router = express.Router();
const { fetch } = require('undici');
const { extractPdfTextFromBuffer } = require('../lib/pdf-extract');
const {
  extractTextFromCvFile,
  extractPortfolioFieldsFromCvText
} = require('../lib/cv-portfolio-parse');
const { sanitizePortfolioNarratives } = require('../lib/portfolio-text-dedupe');
const { buildMultipartForm } = require('../lib/multipart-form');
const {
  CV_MAX_BYTES,
  isAllowedCvUpload,
  multerErrorMessage
} = require('../lib/portfolio-upload-limits');
const { MOCK_INTERVIEW_PHASES, MOCK_INTERVIEW_TURN_COUNT, MOCK_CLASSIC_QUESTIONS, buildMockRealtimeInstructions } = require('../lib/mock-interview-questions');

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: CV_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const check = isAllowedCvUpload({
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    cb(check.ok ? null : new Error(check.error), check.ok);
  }
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
router.post('/cv-extract-text', (req, res) => {
  cvUpload.single('file')(req, res, async (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? multerErrorMessage(err, 'cv')
        : (err.message || 'CV:n lataus epäonnistui');
      return res.status(err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: msg });
    }
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
        try {
          text = await extractPdfTextFromBuffer(req.file.buffer);
        } catch (extractErr) {
          console.warn('cv-extract-text PDF parse:', extractErr.message);
          text = '';
        }
      } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
        return res.status(200).json({
          text: '',
          chars: 0,
          partial: true,
          stored: true,
          message: 'Emme voineet lukea Word-tiedostoa automaattisesti. Täytä alla oleva lomake, jotta portfolioosi tulee kaikki tarvittavat tiedot.'
        });
      } else {
        return res.status(400).json({ error: 'Tuetut tiedostot: PDF, TXT, DOC, DOCX' });
      }

      const minChars = 40;
      const plainLen = (text || '').replace(/\s/g, '').length;
      if (!text || plainLen < minChars) {
        return res.status(200).json({
          text: text || '',
          chars: (text || '').length,
          partial: true,
          stored: true,
          message: 'Emme voineet lukea CV:tä automaattisesti. Täytä alla oleva lomake, jotta portfolioosi tulee kaikki tarvittavat tiedot.'
        });
      }

      const maxLen = 20000;
      res.json({
        text: text.length > maxLen ? text.slice(0, maxLen) + '\n…' : text,
        chars: text.length,
        partial: false
      });
    } catch (err) {
      console.error('cv-extract-text error:', err);
      res.status(500).json({ error: 'CV:n lukeminen epäonnistui. Täytä kentät käsin.' });
    }
  });
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
      '{"name":"","city":"","experience":"2-4 sentences in Finnish summarizing work, education, and relevant background","targetRole":"best guess of desired role or field in Finnish, or empty string","pride":"one concrete achievement from the CV in Finnish, or empty string","skills":["3-5 concrete skills or strengths from the CV in Finnish, each 2-5 words"]}',
      'Use only information explicitly in the CV. Do not invent employers, dates, or skills.',
      'skills must be transferable strengths (e.g. tiimityö, asiakaspalvelu, logistiikka) — not job titles alone.'
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

    const skillsRaw = fields.skills || fields.skill_list || [];
    const skills = (Array.isArray(skillsRaw) ? skillsRaw : [])
      .map((s) => String(s || '').trim())
      .filter(Boolean)
      .slice(0, 7);

    res.json({
      fields: {
        name: String(fields.name || '').trim(),
        city: String(fields.city || '').trim(),
        experience: String(fields.experience || '').trim(),
        targetRole: String(fields.targetRole || fields.target_role || '').trim(),
        pride: String(fields.pride || '').trim(),
        skills
      },
      chars: text.length
    });
  } catch (err) {
    console.error('cv-parse error:', err);
    res.status(500).json({ error: 'CV:n analysointi epäonnistui.' });
  }
});

/** Rich CV parse for Elävä CV portfolio module (experience/education arrays). */
router.post('/cv-portfolio-parse', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Tekoälypalvelu ei ole käytössä.' });
    }
    const { fields, chars } = await extractPortfolioFieldsFromCvText(
      text, openaiApiKey, fetch, timeoutSignal
    );
    res.json({ fields, chars });
  } catch (err) {
    if (err.code === 'TEXT_TOO_SHORT') {
      return res.status(400).json({ error: err.message });
    }
    console.error('cv-portfolio-parse error:', err);
    res.status(err.message.includes('jäsentäminen') ? 502 : 500).json({ error: err.message || 'CV:n analysointi epäonnistui.' });
  }
});

/** Upload CV file → extract text → parse portfolio fields (moduuli-elava-cv). */
router.post('/cv-portfolio-parse-file', (req, res) => {
  cvUpload.single('file')(req, res, async (err) => {
    if (err) {
      const msg = err instanceof multer.MulterError
        ? multerErrorMessage(err, 'cv')
        : (err.message || 'CV:n lataus epäonnistui');
      return res.status(err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: msg });
    }
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'Tiedosto puuttuu' });
      }
      const openaiApiKey = envTrim('OPENAI_API_KEY');
      if (!openaiApiKey) {
        return res.status(503).json({ error: 'Tekoälypalvelu ei ole käytössä.' });
      }
      const text = await extractTextFromCvFile(req.file);
      const plainLen = text.replace(/\s/g, '').length;
      if (plainLen < 20) {
        return res.status(200).json({
          partial: true,
          fields: {},
          chars: text.length,
          message: 'CV:stä ei saatu riittävästi tekstiä automaattista täyttöä varten.'
        });
      }
      const { fields, chars } = await extractPortfolioFieldsFromCvText(
        text, openaiApiKey, fetch, timeoutSignal
      );
      res.json({ fields, chars, partial: plainLen < 40 });
    } catch (err) {
      console.error('cv-portfolio-parse-file error:', err);
      res.status(502).json({ error: err.message || 'CV:n analysointi epäonnistui.' });
    }
  });
});

/** Merge AI interview answers into portfolio fields (moduuli-elava-cv). */
router.post('/interview-portfolio-parse', async (req, res) => {
  try {
    const answers = Array.isArray(req.body.answers) ? req.body.answers.filter(Boolean) : [];
    const cvText = String(req.body.cvText || '').trim();
    const existing = req.body.existing || {};

    if (answers.length < 1 && cvText.replace(/\s/g, '').length < 40) {
      return res.status(400).json({ error: 'Haastatteluvastauksia ei ole riittävästi.' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Tekoälypalvelu ei ole käytössä.' });
    }

    const qLabels = [
      'Onnistumistilanne (työ/opiskelu/arki)',
      'Mitä kollegat/esimies arvostavat',
      'Milloin olet parhaimmillasi',
      'Ura ja tavoitteet'
    ];
    const transcript = answers.map((a, i) => `${qLabels[i] || 'Vastaus ' + (i + 1)}:\n${String(a).trim()}`).join('\n\n');

    const system = [
      'You build a Finnish job-seeker portfolio from an AI interview transcript and optional CV text.',
      'Reply with ONLY valid JSON (no markdown):',
      '{"tagline":"max 8 words in Finnish — punchy headline under the name","bio":"3-5 sentences for the About/Tietoa section ONLY: career background, expertise, concrete wins from CV/interview. Past-focused. NO questions. NO job-search pitch. NO sentence that could appear in career_summary.","career_summary":"1-2 sentences for the portfolio HERO hook ONLY: forward-looking, why a recruiter should contact you now, optional rhetorical question, what role you seek next. Must use completely different wording than bio — zero shared sentences.","hidden_strengths":"3-5 bullet points as plain text lines separated by newline — strengths others see","skills":["5-10 concrete skills in Finnish"],"languages":[{"name":"","level":""}],"experience":[{"role":"","company":"","years":"","desc":"1-2 sentences from CV and interview","show":true}],"achievements":["3-6 short highlight chips for hero — concrete wins, max 12 words each, Finnish"]}',
      'Layout rules: career_summary → hero intro; bio → Tietoa section; achievements → hero chips. Never duplicate the same paragraph across fields. Use facts from transcript and CV only. Extract ALL work roles mentioned (up to 8). Finnish text.'
    ].join(' ');

    const userContent = [
      cvText ? 'CV TEXT:\n' + cvText.slice(0, 8000) : '',
      existing.bio ? 'EXISTING BIO:\n' + String(existing.bio).slice(0, 1500) : '',
      Array.isArray(existing.experience) && existing.experience.length
        ? 'EXISTING EXPERIENCE JSON:\n' + JSON.stringify(existing.experience).slice(0, 3000)
        : '',
      'INTERVIEW TRANSCRIPT:\n' + transcript.slice(0, 12000)
    ].filter(Boolean).join('\n\n');

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
          { role: 'user', content: userContent }
        ],
        max_tokens: 2800,
        temperature: 0.25,
        response_format: { type: 'json_object' }
      }),
      signal: timeoutSignal(60000)
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('interview-portfolio-parse OpenAI error:', details);
      return res.status(502).json({ error: 'Haastattelun analysointi epäonnistui.' });
    }

    const data = await response.json();
    const raw = String(data.choices?.[0]?.message?.content || '').trim();
    let fields;
    try {
      fields = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch (parseErr) {
      console.error('interview-portfolio-parse JSON parse failed:', raw.slice(0, 200));
      return res.status(502).json({ error: 'Haastattelun tietojen jäsentäminen epäonnistui.' });
    }

    res.json({ fields: sanitizePortfolioNarratives(fields) });
  } catch (err) {
    console.error('interview-portfolio-parse error:', err);
    res.status(500).json({ error: 'Haastattelun analysointi epäonnistui.' });
  }
});

/** Suggest portfolio intro bio from CV and form context (moduuli-elava-cv). */
router.post('/portfolio-bio-suggest', async (req, res) => {
  try {
    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Tekoälypalvelu ei ole käytössä.' });
    }

    const name = String(req.body.name || '').trim();
    const city = String(req.body.city || '').trim();
    const targetRole = String(req.body.target_role || '').trim();
    const cvText = String(req.body.cvText || '').trim();
    const skills = Array.isArray(req.body.skills) ? req.body.skills : [];
    const experience = Array.isArray(req.body.experience) ? req.body.experience : [];
    const languages = Array.isArray(req.body.languages) ? req.body.languages : [];
    const interviewAnswers = Array.isArray(req.body.interviewAnswers) ? req.body.interviewAnswers : [];
    const careerSummary = String(req.body.career_summary || '').trim();
    const hiddenStrengths = String(req.body.hidden_strengths || '').trim();

    const contextParts = [];
    if (name) contextParts.push('Nimi: ' + name);
    if (city) contextParts.push('Paikkakunta: ' + city);
    if (targetRole) contextParts.push('Tavoiterooli: ' + targetRole);
    if (skills.length) {
      contextParts.push('Taidot: ' + skills.map((s) => (typeof s === 'string' ? s : s.name || '')).filter(Boolean).join(', '));
    }
    if (experience.length) {
      contextParts.push('Kokemus: ' + experience.map((e) => {
        return [e.role || e.title, e.company, e.years, e.desc || e.description].filter(Boolean).join(' · ');
      }).filter(Boolean).join('\n'));
    }
    if (languages.length) {
      contextParts.push('Kielet: ' + languages.map((l) => {
        if (typeof l === 'string') return l;
        return [l.name, l.level].filter(Boolean).join(' ');
      }).filter(Boolean).join(', '));
    }
    if (careerSummary) contextParts.push('Uratiivistelmä: ' + careerSummary);
    if (hiddenStrengths) contextParts.push('Vahvuudet: ' + hiddenStrengths);
    if (cvText) contextParts.push('CV-TEKSTI:\n' + cvText.slice(0, 8000));
    if (interviewAnswers.length) {
      contextParts.push('Haastatteluvastaukset:\n' + interviewAnswers.map((a, i) => (i + 1) + '. ' + String(a).trim()).join('\n\n').slice(0, 4000));
    }

    if (!contextParts.length) {
      return res.status(400).json({ error: 'Anna CV tai perustiedot — AI tarvitsee pohjan esittelylle.' });
    }

    const system = [
      'Kirjoitat suomenkielisen esittelyn työnhakijan portfolioon Tietoa-osioon (EI hero-osion koukkuun).',
      '3–5 lausetta: tausta, osaaminen, konkreettiset saavutukset CV:stä/haastattelusta.',
      'Menneisyys ja faktoja — EI kysymyksiä ("Etsitkö..."), EI uratoivepitchiä, EI samaa tekstiä kuin career_summary.',
      'Lämpimä, ammattimainen ja konkreettinen — ei geneeristä corporate-jargonia.',
      'Käytä vain annettuja faktoja. Älä keksi työnantajia, tutkintoja tai saavutuksia.',
      'Vastaa JSON-muodossa: {"bio":"esittelyteksti"}'
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
          { role: 'user', content: contextParts.join('\n\n') }
        ],
        max_tokens: 500,
        temperature: 0.55,
        response_format: { type: 'json_object' }
      }),
      signal: timeoutSignal(30000)
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('portfolio-bio-suggest OpenAI error:', details);
      return res.status(502).json({ error: 'Esittelyn luonti epäonnistui.' });
    }

    const data = await response.json();
    const raw = String(data.choices?.[0]?.message?.content || '').trim();
    let parsed;
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim());
    } catch (parseErr) {
      return res.status(502).json({ error: 'Esittelyn jäsentäminen epäonnistui.' });
    }

    const bio = String(parsed.bio || '').trim();
    if (bio.replace(/\s/g, '').length < 40) {
      return res.status(502).json({ error: 'Esittely jäi liian lyhyeksi. Yritä uudelleen.' });
    }

    res.json({ bio });
  } catch (err) {
    console.error('portfolio-bio-suggest error:', err);
    res.status(500).json({ error: 'Esittelyn luonti epäonnistui.' });
  }
});

module.exports = router;
