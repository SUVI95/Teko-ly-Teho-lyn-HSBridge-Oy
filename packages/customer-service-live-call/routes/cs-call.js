const express = require('express');
const { fetch } = require('undici');
const { buildMultipartForm } = require('../lib/multipart-form');
const {
  CS_CALL_PHASES,
  CS_CALL_TURN_COUNT,
  CS_SCENARIOS,
  CS_CLASSIC_LINES,
  buildCsRealtimeInstructions
} = require('../lib/cs-call-scenarios');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function realtimeModel() {
  return envTrim('OPENAI_REALTIME_MODEL') || envTrim('OPENAI_VOICE_MODEL') || 'gpt-realtime-2';
}

function realtimeVoice() {
  return envTrim('OPENAI_CS_REALTIME_VOICE') || envTrim('OPENAI_REALTIME_VOICE') || 'marin';
}

function voiceFeedbackModel() {
  return envTrim('OPENAI_VOICE_MODEL') || 'gpt-realtime-2';
}

async function voiceCoachFeedback(openaiApiKey, { system, prompt, max_tokens = 450 }) {
  const models = [voiceFeedbackModel(), 'gpt-4o-mini'];
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
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          max_tokens,
          temperature: 0.6
        }),
        signal: timeoutSignal(45000)
      });
      if (!response.ok) {
        lastError = await response.text().catch(() => '');
        continue;
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (text.trim()) return text.trim();
    } catch (err) {
      lastError = err.message;
    }
  }
  const err = new Error('Feedback failed');
  err.details = lastError;
  throw err;
}

function buildRealtimeSessionConfig(scenarioId, customText) {
  return {
    type: 'realtime',
    model: realtimeModel(),
    instructions: buildCsRealtimeInstructions(scenarioId, customText),
    output_modalities: ['audio'],
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: 24000 },
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

router.get('/realtime/config', (req, res) => {
  const scenarioId = String(req.query.scenario || 'wrong_bill').trim();
  const customText = String(req.query.custom || '').trim();
  res.json({
    model: realtimeModel(),
    voice: realtimeVoice(),
    phases: CS_CALL_PHASES,
    expectedTurns: CS_CALL_TURN_COUNT,
    scenarios: Object.values(CS_SCENARIOS).map(function (s) {
      return { id: s.id, emoji: s.emoji, title: s.title, pitch: s.pitch };
    }),
    classicLines: CS_CLASSIC_LINES,
    scenarioId,
    deliveryHint: 'Puhu kuin oikea asiakas puhelimessa — yksi asia kerrallaan, odota palvelijan vastausta.'
  });
});

router.post('/realtime/session', express.text({ type: ['application/sdp', 'text/plain'], limit: '512kb' }), async (req, res) => {
  try {
    const sdp = String(req.body || '').trim();
    if (!sdp) return res.status(400).json({ error: 'SDP offer required' });

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'Live-puhelu ei ole käytössä. Ota yhteyttä opettajaan.' });
    }

    const scenarioId = String(req.query.scenario || 'wrong_bill').trim();
    const customText = String(req.query.custom || '').trim();
    const sessionConfig = buildRealtimeSessionConfig(scenarioId, customText);

    const { body, contentType } = buildMultipartForm([
      { name: 'sdp', value: sdp, contentType: 'application/sdp' },
      { name: 'session', value: JSON.stringify(sessionConfig), contentType: 'application/json' }
    ]);

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': contentType
      },
      body,
      signal: timeoutSignal(30000)
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error('CS realtime session error:', response.status, details);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: 'Live-yhteys epäonnistui',
        details
      });
    }

    const answerSdp = await response.text();
    res.set('Content-Type', 'application/sdp');
    res.send(answerSdp);
  } catch (error) {
    console.error('CS realtime session error:', error.message);
    res.status(500).json({ error: 'Live-yhteys epäonnistui', message: error.message });
  }
});

router.post('/feedback', async (req, res) => {
  try {
    const sessions = req.body.sessions;
    const scenarioId = String(req.body.scenarioId || 'wrong_bill').trim();
    if (!Array.isArray(sessions) || !sessions.length) {
      return res.status(400).json({ error: 'Sessions array required' });
    }

    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({ error: 'AI-palvelu ei ole käytössä.' });
    }

    const block = sessions.map(function (s, i) {
      const q = String(s.question || s.clientText || '').trim();
      const a = String(s.transcript || s.agentAnswer || '').trim();
      const tag = String(s.tag || s.phase || '').trim();
      const label = String(s.label || '').trim();
      const header = label || (tag ? tag : 'Vaihe ' + (i + 1));
      return `--- ${header}${tag && label ? ' (' + tag + ')' : ''} ---\nAsiakas: ${q || '(ei tallennettu)'}\n\nPalvelijan vastaus:\n${a}`;
    }).join('\n\n');

    const system = [
      'Olet asiakaspalvelun valmentaja Suomessa. Simuloitu puhelu on päättynyt — opiskelija pelasi palvelijaa, AI pelasi asiakasta.',
      'Tilanne: ' + scenarioId + '.',
      'Anna kokonaispalaute palvelijan suorituksesta. Merkitse täsmälleen:',
      '✓ TOIMI:',
      '⚠ PARANNA:',
      '→ MUUTOS:',
      'Suomi. Konkreettinen. Max 10 lausetta. Arvioi: tervehdys, empatia, kuuntelu, selkeys, seuraava askel, rauhallisuus paineen alla.'
    ].join(' ');

    const feedback = await voiceCoachFeedback(openaiApiKey, {
      system,
      prompt: block,
      max_tokens: 450
    });

    res.json({ feedback: feedback || '' });
  } catch (error) {
    console.error('CS call feedback error:', error);
    res.status(500).json({ error: 'Palaute epäonnistui', message: error.message });
  }
});

module.exports = router;
