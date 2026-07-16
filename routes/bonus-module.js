const express = require('express');
const pool = require('../database/db');

const router = express.Router();

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

function sectionModuleId(slug, sectionId) {
  return `bonus-ai/${slug}/${sectionId}`;
}

function parseEntry(reflectionText) {
  if (!reflectionText) return null;
  try {
    const o = JSON.parse(reflectionText);
    return {
      user_text: o.user_text != null ? String(o.user_text) : reflectionText,
      prompt_text: o.prompt_text != null ? String(o.prompt_text) : null,
      ai_response: o.ai_response != null ? String(o.ai_response) : null,
      created_at: o.saved_at || null
    };
  } catch (e) {
    return { user_text: String(reflectionText), prompt_text: null, ai_response: null, created_at: null };
  }
}

router.get('/responses', async (req, res) => {
  try {
    const slug = String(req.query.slug || 'bottityypit').trim();
    const userId = await resolveUserId(req);
    if (!userId) {
      return res.json({ slug, raw: true, entries: {} });
    }

    const prefix = `bonus-ai/${slug}/`;
    const result = await pool.query(
      `SELECT module_id, reflection_text, updated_at
       FROM reflections
       WHERE user_id = $1 AND module_id LIKE $2
       ORDER BY updated_at DESC`,
      [userId, prefix + '%']
    );

    const entries = {};
    for (const row of result.rows) {
      if (!row.module_id || !row.module_id.startsWith(prefix)) continue;
      const shortId = row.module_id.slice(prefix.length);
      if (!shortId || entries[shortId]) continue;
      const parsed = parseEntry(row.reflection_text);
      if (!parsed) continue;
      entries[shortId] = {
        ...parsed,
        created_at: parsed.created_at || (row.updated_at ? new Date(row.updated_at).toISOString() : null)
      };
    }

    res.json({ slug, raw: !!req.query.raw, entries });
  } catch (error) {
    console.error('bonus-module GET error:', error.message);
    res.json({ slug: req.query.slug || 'bottityypit', raw: true, entries: {} });
  }
});

router.post('/responses', async (req, res) => {
  try {
    const { slug, section_id, user_text, prompt_text, ai_response } = req.body || {};
    const userId = await resolveUserId(req);
    if (!userId || !slug || !section_id) {
      return res.json({ success: false });
    }

    const moduleId = sectionModuleId(String(slug).trim(), String(section_id).trim());
    const payload = JSON.stringify({
      user_text: user_text != null ? String(user_text) : '',
      prompt_text: prompt_text != null ? String(prompt_text) : null,
      ai_response: ai_response != null ? String(ai_response) : null,
      saved_at: new Date().toISOString()
    });

    const existing = await pool.query(
      'SELECT id FROM reflections WHERE user_id = $1 AND module_id = $2',
      [userId, moduleId]
    );

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

    res.json({ success: true });
  } catch (error) {
    console.error('bonus-module POST error:', error.message);
    res.json({ success: false });
  }
});

/** Pedagogical path for AI Polku bonus modules ★2–★5 (+ bottityypit). */
const AI_POLKU_BONUS_PATH = [
  { slug: 'bottityypit', href: '/module/moduuli-bottityypit', name: 'Tunne bottityypit', nextLabel: 'Tunne bottityypit' },
  { slug: 'eu-ai-act-moduuli5', href: '/module/moduuli-eu-ai-act-moduuli5', name: 'Tekoälylaki', nextLabel: 'Tekoälylaki' },
  { slug: 'prompt-hiomo', href: '/module/moduuli-prompt-hiomo', name: 'Kirjoita botin ohje', nextLabel: 'Prompt-hiomo' },
  { slug: 'hitl-architect', href: '/module/moduuli-hitl-architect', name: 'Kun botti ei riitä', nextLabel: 'HITL' },
  { slug: 'asiakaspalvelu-live-puhelu', href: '/module/moduuli-asiakaspalvelu-live-puhelu', name: 'Live-puhelu', nextLabel: 'Live-puhelu' }
];

function pathIndex(slug) {
  return AI_POLKU_BONUS_PATH.findIndex((m) => m.slug === slug);
}

router.get('/next', (req, res) => {
  const slug = String(req.query.slug || '').trim();
  const i = pathIndex(slug);
  if (i < 0 || i >= AI_POLKU_BONUS_PATH.length - 1) {
    return res.json({ href: null });
  }
  const next = AI_POLKU_BONUS_PATH[i + 1];
  res.json({ href: next.href, name: next.name, nextLabel: next.nextLabel });
});

router.get('/prev', (req, res) => {
  const slug = String(req.query.slug || '').trim();
  const i = pathIndex(slug);
  if (i <= 0) {
    return res.json({ href: null });
  }
  const prev = AI_POLKU_BONUS_PATH[i - 1];
  res.json({ href: prev.href, name: prev.name, nextLabel: prev.nextLabel });
});

module.exports = router;
