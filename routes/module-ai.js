const express = require('express');
const { fetch } = require('undici');
const pool = require('../database/db');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  if (v == null) return '';
  return String(v).trim();
}

async function resolveUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  const token = req.cookies && req.cookies.session_token;
  if (!token) return null;
  try {
    const session = await pool.query(
      `SELECT u.id FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    return session.rows.length ? session.rows[0].id : null;
  } catch (e) {
    return null;
  }
}

function lastUserText(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user' && typeof m.content === 'string') {
      return m.content.trim();
    }
  }
  return '';
}

async function callAnthropic({ system, messages, max_tokens }) {
  const anthropicKey = envTrim('ANTHROPIC_API_KEY');
  if (!anthropicKey) return null;

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: max_tokens || 1000,
    messages: messages || []
  };
  if (system) body.system = system;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(err || `Anthropic ${response.status}`);
  }

  const data = await response.json();
  return String(data.content?.[0]?.text || '').trim();
}

async function callOpenAI({ system, messages, max_tokens }) {
  const openaiKey = envTrim('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('AI-palvelu ei ole käytettävissä');

  const openaiMessages = [];
  if (system) openaiMessages.push({ role: 'system', content: system });
  openaiMessages.push(...(messages || []));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: max_tokens || 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(err || `OpenAI ${response.status}`);
  }

  const data = await response.json();
  return String(data.choices?.[0]?.message?.content || '').trim();
}

/** Anthropic-shaped AI endpoint for Monikava bonus modules. */
router.post('/', async (req, res) => {
  try {
    const {
      system,
      messages,
      max_tokens,
      user_text,
      provider,
      anthropic_only,
      bonus_slug,
      section_id
    } = req.body || {};

    const msgs = Array.isArray(messages) ? messages : [];
    if (!msgs.length && user_text) {
      msgs.push({ role: 'user', content: String(user_text) });
    }
    if (!msgs.length) {
      return res.status(400).json({ error: 'messages or user_text required' });
    }

    let text = '';
    const wantAnthropic = provider === 'anthropic' || anthropic_only === true;

    if (wantAnthropic) {
      try {
        text = await callAnthropic({ system, messages: msgs, max_tokens });
      } catch (e) {
        if (anthropic_only) throw e;
      }
    }
    if (!text) {
      text = await callOpenAI({ system, messages: msgs, max_tokens });
    }

    const userId = await resolveUserId(req);
    const userText = String(user_text || lastUserText(msgs) || '').trim();
    if (userId && userText && bonus_slug && section_id) {
      const moduleId = `bonus-ai/${bonus_slug}/${section_id}`;
      try {
        const existing = await pool.query(
          'SELECT id FROM reflections WHERE user_id = $1 AND module_id = $2',
          [userId, moduleId]
        );
        const payload = JSON.stringify({
          user_text: userText,
          ai_response: text,
          prompt_text: system || null,
          saved_at: new Date().toISOString()
        });
        if (existing.rows.length) {
          await pool.query(
            'UPDATE reflections SET reflection_text = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND module_id = $3',
            [payload, userId, moduleId]
          );
        } else {
          await pool.query(
            'INSERT INTO reflections (user_id, module_id, reflection_text) VALUES ($1, $2, $3)',
            [userId, moduleId, payload]
          );
        }
      } catch (e) {
        console.warn('module-ai persist skipped:', e.message);
      }
    }

    res.json({
      content: [{ type: 'text', text }],
      text
    });
  } catch (error) {
    console.error('module-ai error:', error.message);
    res.status(500).json({
      error: 'Tekoälypalvelu ei ole juuri nyt saatavilla. Yritä hetken kuluttua uudelleen.',
      content: [{ type: 'text', text: '' }]
    });
  }
});

module.exports = router;
