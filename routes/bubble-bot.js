const express = require('express');
const crypto = require('crypto');
const { fetch } = require('undici');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const MODULE_PREFIX = 'bubble-bot/';

function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

function slugify(name) {
  return String(name || 'botti')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'botti';
}

async function callOpenAIChat({ system, messages, max_tokens }) {
  const openaiKey = envTrim('OPENAI_API_KEY');
  if (!openaiKey) throw new Error('AI ei käytettävissä');

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
      max_tokens: max_tokens || 500,
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

function parseBotPayload(text) {
  if (!text) return null;
  try {
    const o = JSON.parse(text);
    if (!o || !o.systemPrompt) return null;
    return o;
  } catch (e) {
    return null;
  }
}

async function loadBotBySlug(slug) {
  const result = await pool.query(
    `SELECT reflection_text, user_id FROM reflections WHERE module_id = $1 LIMIT 1`,
    [MODULE_PREFIX + slug]
  );
  if (!result.rows.length) return null;
  const bot = parseBotPayload(result.rows[0].reflection_text);
  if (!bot) return null;
  return { bot, userId: result.rows[0].user_id };
}

/** POST /api/bubble-bot/publish — save student's public bubble bot */
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      botName,
      welcome,
      systemPrompt,
      botType,
      contextKind,
      contextNote,
      imageUrl,
      suggestedQuestions
    } = req.body || {};

    const name = String(botName || '').trim().slice(0, 80);
    const prompt = String(systemPrompt || '').trim().slice(0, 12000);
    const wel = String(welcome || '').trim().slice(0, 500);

    if (!name || prompt.length < 40) {
      return res.status(400).json({ ok: false, reason: 'incomplete' });
    }

    let slug = slugify(name);
    const suffix = crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 6);
    slug = `${slug}-${suffix}`;

    const existing = await pool.query(
      'SELECT module_id FROM reflections WHERE user_id = $1 AND module_id LIKE $2',
      [userId, MODULE_PREFIX + '%']
    );
    if (existing.rows.length) {
      const oldSlug = existing.rows[0].module_id.slice(MODULE_PREFIX.length);
      if (oldSlug) slug = oldSlug;
      await pool.query('DELETE FROM reflections WHERE user_id = $1 AND module_id LIKE $2', [
        userId,
        MODULE_PREFIX + '%'
      ]);
    }

    const payload = JSON.stringify({
      botName: name,
      welcome: wel || `Hei! Olen ${name}. Kysy mitä tahansa — vastaan parhaani mukaan.`,
      systemPrompt: prompt,
      botType: String(botType || 'gen').slice(0, 20),
      contextKind: String(contextKind || 'work').slice(0, 20),
      contextNote: String(contextNote || '').slice(0, 2000),
      imageUrl: imageUrl ? String(imageUrl).slice(0, 2000) : null,
      suggestedQuestions: Array.isArray(suggestedQuestions)
        ? suggestedQuestions.map((q) => String(q).slice(0, 120)).slice(0, 8)
        : [],
      publishedAt: new Date().toISOString(),
      slug
    });

    await pool.query(
      'INSERT INTO reflections (user_id, module_id, reflection_text) VALUES ($1, $2, $3)',
      [userId, MODULE_PREFIX + slug, payload]
    );

    const origin = `${req.protocol}://${req.get('host')}`;
    const url = `${origin}/bot/${slug}`;
    const embed = `<iframe src="${url}" title="${name}" style="width:100%;max-width:420px;height:520px;border:1px solid #1e293b;border-radius:16px;" loading="lazy"></iframe>`;

    res.json({ ok: true, slug, url, embed });
  } catch (error) {
    console.error('[bubble-bot] publish:', error.message);
    res.status(500).json({ ok: false, reason: 'server-error' });
  }
});

/** GET /api/bubble-bot/mine — current user's published bot */
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT module_id, reflection_text, updated_at FROM reflections
       WHERE user_id = $1 AND module_id LIKE $2 ORDER BY updated_at DESC LIMIT 1`,
      [req.user.id, MODULE_PREFIX + '%']
    );
    if (!result.rows.length) return res.json({ bot: null });
    const slug = result.rows[0].module_id.slice(MODULE_PREFIX.length);
    const bot = parseBotPayload(result.rows[0].reflection_text);
    if (!bot) return res.json({ bot: null });
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({
      bot: {
        ...bot,
        slug,
        url: `${origin}/bot/${slug}`,
        updatedAt: result.rows[0].updated_at
      }
    });
  } catch (error) {
    console.error('[bubble-bot] mine:', error.message);
    res.json({ bot: null });
  }
});

/** GET /api/bubble-bot/:slug — public bot config (no system prompt) */
router.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug)) {
      return res.status(400).json({ error: 'invalid-slug' });
    }
    const loaded = await loadBotBySlug(slug);
    if (!loaded) return res.status(404).json({ error: 'not-found' });
    const { bot } = loaded;
    res.json({
      slug,
      botName: bot.botName,
      welcome: bot.welcome,
      botType: bot.botType,
      imageUrl: bot.imageUrl || null,
      suggestedQuestions: bot.suggestedQuestions || []
    });
  } catch (error) {
    console.error('[bubble-bot] get:', error.message);
    res.status(500).json({ error: 'server-error' });
  }
});

/** POST /api/bubble-bot/:slug/chat — public chat with published bot */
router.post('/:slug/chat', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug)) {
      return res.status(400).json({ error: 'invalid-slug' });
    }
    const loaded = await loadBotBySlug(slug);
    if (!loaded) return res.status(404).json({ error: 'not-found' });

    const messages = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
    const lastUser = messages.filter((m) => m && m.role === 'user').pop();
    if (!lastUser || !String(lastUser.content || '').trim()) {
      return res.status(400).json({ error: 'message-required' });
    }

    const trimmed = messages
      .slice(-12)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 2000)
      }))
      .filter((m) => m.content.trim());

    const text = await callOpenAIChat({
      system: loaded.bot.systemPrompt,
      messages: trimmed,
      max_tokens: 450
    });

    res.json({ text });
  } catch (error) {
    console.error('[bubble-bot] chat:', error.message);
    res.status(500).json({ error: 'chat-failed' });
  }
});

module.exports = router;
