const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// OpenAI API endpoint for chat
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, system, model = 'gpt-4o-mini', max_tokens = 1000 } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'AI service not configured' });
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

module.exports = router;
