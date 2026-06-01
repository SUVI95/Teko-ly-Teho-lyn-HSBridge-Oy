const express = require('express');
const multer = require('multer');
const router = express.Router();
const { fetch } = require('undici');
const { extractPdfTextFromBuffer } = require('../lib/pdf-extract');

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }
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

module.exports = router;
