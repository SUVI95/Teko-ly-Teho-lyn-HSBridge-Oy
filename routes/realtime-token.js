const express = require('express');
const { fetch } = require('undici');
const {
  buildBottityypitRealtimeSession,
  bottityypitRealtimeVoice,
  voiceForScenario
} = require('../lib/bottityypit-voice');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

/** Mint ephemeral OpenAI Realtime client secret for bottityypit voice exercise. */
router.get('/', async (req, res) => {
  try {
    const openaiApiKey = envTrim('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return res.status(503).json({
        error: 'Äänibotti ei ole käytössä. Ota yhteyttä opettajaan.'
      });
    }

    const scenarioId = String(req.query.scenario || '').trim();
    const voice = voiceForScenario(scenarioId);
    const sessionConfig = buildBottityypitRealtimeSession(scenarioId);
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session: sessionConfig })
    });

    const body = await response.text();
    if (!response.ok) {
      console.error('Realtime client_secrets error:', response.status, body);
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: 'Ääniyhteys epäonnistui',
        details: body
      });
    }

    let openaiPayload = {};
    try {
      openaiPayload = JSON.parse(body);
    } catch (e) {
      openaiPayload = { value: body };
    }

    res.set('Cache-Control', 'no-store');
    res.json({
      ...openaiPayload,
      instructions: voice.instructions,
      openingInstructions: voice.opening,
      voice: bottityypitRealtimeVoice()
    });
  } catch (error) {
    console.error('realtime-token error:', error.message);
    res.status(500).json({ error: 'Ääniyhteys epäonnistui' });
  }
});

module.exports = router;
