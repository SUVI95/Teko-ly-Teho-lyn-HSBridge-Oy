const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB after base64 decode
const ALLOWED_ARTIFACT_KEY = /^[a-z0-9_-]{1,80}$/i;
const ALLOWED_MODULE_ID = /^[a-z0-9_-]{1,120}$/i;

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_artifacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id VARCHAR(120) NOT NULL,
      artifact_key VARCHAR(80) NOT NULL,
      filename VARCHAR(300),
      mime VARCHAR(60) NOT NULL,
      size_bytes INTEGER NOT NULL,
      image_bytes BYTEA NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT student_artifacts_unique UNIQUE(user_id, module_id, artifact_key)
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_student_artifacts_user ON student_artifacts(user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_student_artifacts_module ON student_artifacts(module_id, artifact_key);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_student_artifacts_updated ON student_artifacts(updated_at DESC);');
  schemaReady = true;
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) return null;
  let buf;
  try {
    buf = Buffer.from(m[2], 'base64');
  } catch (e) {
    return null;
  }
  if (!buf || buf.length === 0) return null;
  return { mime, buffer: buf };
}

router.post('/upload', authenticateToken, async (req, res) => {
  try {
    await ensureSchema();
    const { moduleId, artifactKey, filename, dataUrl } = req.body || {};
    if (!moduleId || !ALLOWED_MODULE_ID.test(moduleId)) {
      return res.status(400).json({ error: 'Invalid moduleId' });
    }
    if (!artifactKey || !ALLOWED_ARTIFACT_KEY.test(artifactKey)) {
      return res.status(400).json({ error: 'Invalid artifactKey' });
    }
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: 'Unsupported or invalid image data' });
    }
    if (parsed.buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Image too large (max 6 MB)' });
    }
    const safeName = (typeof filename === 'string' ? filename.replace(/[^\w.\-]/g, '_').slice(0, 200) : '') || 'banner.png';
    await pool.query(
      `INSERT INTO student_artifacts (user_id, module_id, artifact_key, filename, mime, size_bytes, image_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, module_id, artifact_key)
       DO UPDATE SET filename = EXCLUDED.filename, mime = EXCLUDED.mime,
                     size_bytes = EXCLUDED.size_bytes, image_bytes = EXCLUDED.image_bytes,
                     updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, moduleId, artifactKey, safeName, parsed.mime, parsed.buffer.length, parsed.buffer]
    );
    res.json({ success: true, size: parsed.buffer.length, mime: parsed.mime, filename: safeName });
  } catch (error) {
    console.error('Artifact upload error:', error);
    res.status(500).json({ error: 'Failed to save artifact' });
  }
});

// Student's own artifact (inline image)
router.get('/me/:moduleId/:artifactKey', authenticateToken, async (req, res) => {
  try {
    await ensureSchema();
    const { moduleId, artifactKey } = req.params;
    if (!ALLOWED_MODULE_ID.test(moduleId) || !ALLOWED_ARTIFACT_KEY.test(artifactKey)) {
      return res.status(400).send('Bad request');
    }
    const result = await pool.query(
      `SELECT mime, image_bytes FROM student_artifacts
       WHERE user_id = $1 AND module_id = $2 AND artifact_key = $3 LIMIT 1`,
      [req.user.id, moduleId, artifactKey]
    );
    if (result.rows.length === 0) return res.status(404).send('Not found');
    res.setHeader('Content-Type', result.rows[0].mime);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.send(result.rows[0].image_bytes);
  } catch (error) {
    console.error('Artifact fetch error:', error);
    res.status(500).send('Server error');
  }
});

// Has-uploaded check (lightweight)
router.get('/me/:moduleId/:artifactKey/meta', authenticateToken, async (req, res) => {
  try {
    await ensureSchema();
    const { moduleId, artifactKey } = req.params;
    if (!ALLOWED_MODULE_ID.test(moduleId) || !ALLOWED_ARTIFACT_KEY.test(artifactKey)) {
      return res.status(400).json({ error: 'Bad request' });
    }
    const result = await pool.query(
      `SELECT filename, mime, size_bytes, updated_at FROM student_artifacts
       WHERE user_id = $1 AND module_id = $2 AND artifact_key = $3 LIMIT 1`,
      [req.user.id, moduleId, artifactKey]
    );
    if (result.rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, ...result.rows[0] });
  } catch (error) {
    console.error('Artifact meta error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: list artifacts (metadata only, with student name)
router.get('/admin/list', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) return res.status(403).json({ error: 'Admin only' });
    await ensureSchema();
    const moduleId = String(req.query.moduleId || '').trim();
    const artifactKey = String(req.query.artifactKey || '').trim();
    const params = [];
    let where = '';
    if (moduleId) {
      if (!ALLOWED_MODULE_ID.test(moduleId)) return res.status(400).json({ error: 'Invalid moduleId' });
      params.push(moduleId);
      where += (where ? ' AND ' : ' WHERE ') + `a.module_id = $${params.length}`;
    }
    if (artifactKey) {
      if (!ALLOWED_ARTIFACT_KEY.test(artifactKey)) return res.status(400).json({ error: 'Invalid artifactKey' });
      params.push(artifactKey);
      where += (where ? ' AND ' : ' WHERE ') + `a.artifact_key = $${params.length}`;
    }
    const result = await pool.query(
      `SELECT a.id, a.module_id, a.artifact_key, a.filename, a.mime, a.size_bytes,
              a.created_at, a.updated_at,
              u.id AS user_id, u.email, u.name
       FROM student_artifacts a JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT 500`,
      params
    );
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Artifact admin list error:', error);
    res.status(500).json({ error: 'Failed to list artifacts' });
  }
});

// ADMIN: fetch a specific artifact image
router.get('/admin/image/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) return res.status(403).send('Admin only');
    await ensureSchema();
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).send('Bad id');
    const result = await pool.query(
      `SELECT mime, image_bytes FROM student_artifacts WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).send('Not found');
    res.setHeader('Content-Type', result.rows[0].mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(result.rows[0].image_bytes);
  } catch (error) {
    console.error('Artifact admin image error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
