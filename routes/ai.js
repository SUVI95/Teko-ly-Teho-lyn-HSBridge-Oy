const express = require('express');
const router = express.Router();
const { fetch } = require('undici');

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI fallback error:', errorData);
    return res.status(503).json({
      error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.'
    });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return res.json({ text, usage: data.usage });
}

// Claude (Anthropic) API endpoint for deep analysis
router.post('/claude', async (req, res) => {
  try {
    const { messages, system, max_tokens = 2000 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const anthropicKey = envTrim('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('Anthropic API key not configured');
      return res.status(500).json({ error: 'Claude-palvelu ei ole käytettävissä.' });
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: max_tokens,
      messages: messages
    };
    if (system) body.system = system;

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(r => setTimeout(r, delay));
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        return res.json({
          text: text,
          usage: data.usage
        });
      }

      const errorData = await response.text();

      if (response.status === 529 || response.status === 503) {
        console.warn(`Anthropic API overloaded (attempt ${attempt + 1}/${maxRetries}):`, errorData);
        lastError = { status: response.status, data: errorData };
        continue;
      }

      if (response.status === 429) {
        console.warn(`Anthropic API rate limited (attempt ${attempt + 1}/${maxRetries}):`, errorData);
        lastError = { status: response.status, data: errorData };
        continue;
      }

      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({
        error: 'Claude service error',
        details: errorData
      });
    }

    console.warn('Claude failed after retries, falling back to OpenAI');
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

module.exports = router;
