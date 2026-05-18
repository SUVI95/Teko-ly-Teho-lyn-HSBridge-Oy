const express = require('express');
const multer = require('multer');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Vain JPG, PNG tai WebP'), ok);
  }
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_portfolios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(120) NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      full_name VARCHAR(255) NOT NULL,
      tagline VARCHAR(300), bio TEXT, city VARCHAR(120), target_role VARCHAR(300),
      email_public VARCHAR(255), phone_public VARCHAR(60), linkedin_url VARCHAR(500),
      experience JSONB DEFAULT '[]', education JSONB DEFAULT '[]',
      skills JSONB DEFAULT '[]', achievements JSONB DEFAULT '[]',
      languages JSONB DEFAULT '[]', certificates JSONB DEFAULT '[]',
      brand_color VARCHAR(10) DEFAULT '#2563a8',
      brand_accent VARCHAR(10) DEFAULT '#c75b3a',
      brand_bg VARCHAR(10) DEFAULT '#f5f3ef',
      template VARCHAR(40) DEFAULT 'modern',
      photo_bytes BYTEA, photo_mime VARCHAR(50),
      career_summary TEXT, hidden_strengths TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT student_portfolios_user_unique UNIQUE(user_id),
      CONSTRAINT student_portfolios_slug_unique UNIQUE(slug)
    );
    CREATE INDEX IF NOT EXISTS idx_sp_slug ON student_portfolios(slug);
    CREATE INDEX IF NOT EXISTS idx_sp_pub ON student_portfolios(published);
  `);
}

let _ready = false;
async function ready() { if (!_ready) { await ensureTable(); _ready = true; } }

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

// Save / update portfolio
router.post('/save', authenticateToken, async (req, res) => {
  try {
    await ready();
    const uid = req.user.id;
    const d = req.body;
    if (!d.full_name) return res.status(400).json({ error: 'Nimi puuttuu' });

    const existing = await pool.query('SELECT slug FROM student_portfolios WHERE user_id=$1', [uid]);
    let slug;

    const vals = [uid, d.full_name, d.tagline||null, d.bio||null, d.city||null, d.target_role||null,
      d.email_public||null, d.phone_public||null, d.linkedin_url||null,
      JSON.stringify(d.experience||[]), JSON.stringify(d.education||[]),
      JSON.stringify(d.skills||[]), JSON.stringify(d.achievements||[]),
      JSON.stringify(d.languages||[]), JSON.stringify(d.certificates||[]),
      d.brand_color||'#2563a8', d.brand_accent||'#c75b3a', d.brand_bg||'#f5f3ef',
      d.template||'modern', d.career_summary||null, d.hidden_strengths||null];

    if (existing.rows.length > 0) {
      slug = existing.rows[0].slug;
      await pool.query(`UPDATE student_portfolios SET
        full_name=$2, tagline=$3, bio=$4, city=$5, target_role=$6,
        email_public=$7, phone_public=$8, linkedin_url=$9,
        experience=$10, education=$11, skills=$12, achievements=$13,
        languages=$14, certificates=$15,
        brand_color=$16, brand_accent=$17, brand_bg=$18, template=$19,
        career_summary=$20, hidden_strengths=$21, updated_at=CURRENT_TIMESTAMP
        WHERE user_id=$1`, vals);
    } else {
      slug = makeSlug(d.full_name);
      const dup = await pool.query('SELECT id FROM student_portfolios WHERE slug=$1', [slug]);
      if (dup.rows.length > 0) slug = slug + '-' + Date.now().toString(36).slice(-4);
      await pool.query(`INSERT INTO student_portfolios (
        user_id, slug, full_name, tagline, bio, city, target_role,
        email_public, phone_public, linkedin_url,
        experience, education, skills, achievements, languages, certificates,
        brand_color, brand_accent, brand_bg, template,
        career_summary, hidden_strengths
      ) VALUES ($1,$22,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
        [...vals, slug]);
    }
    res.json({ success: true, slug });
  } catch (e) { console.error('Portfolio save:', e); res.status(500).json({ error: 'Tallennus epäonnistui' }); }
});

// Publish / unpublish
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      'UPDATE student_portfolios SET published=$2, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING slug',
      [req.user.id, !!req.body.published]);
    if (!r.rows.length) return res.status(404).json({ error: 'Ei portfoliota' });
    res.json({ success: true, slug: r.rows[0].slug, published: !!req.body.published });
  } catch (e) { console.error('Portfolio publish:', e); res.status(500).json({ error: 'Virhe' }); }
});

// Upload photo
router.post('/photo', authenticateToken, (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Ei kuvaa' });
    try {
      await ready();
      await pool.query(
        'UPDATE student_portfolios SET photo_bytes=$2, photo_mime=$3, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1',
        [req.user.id, req.file.buffer, req.file.mimetype]);
      res.json({ success: true });
    } catch (e) { console.error('Photo:', e); res.status(500).json({ error: 'Virhe' }); }
  });
});

// Get own portfolio (auth)
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT id, slug, published, full_name, tagline, bio, city, target_role,
       email_public, phone_public, linkedin_url, experience, education, skills,
       achievements, languages, certificates, brand_color, brand_accent, brand_bg,
       template, career_summary, hidden_strengths, photo_mime IS NOT NULL AS has_photo,
       created_at, updated_at FROM student_portfolios WHERE user_id=$1`, [req.user.id]);
    res.json({ portfolio: r.rows[0] || null });
  } catch (e) { res.status(500).json({ error: 'Virhe' }); }
});

// Get portfolio by slug (PUBLIC)
router.get('/view/:slug', async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT slug, full_name, tagline, bio, city, target_role,
       email_public, phone_public, linkedin_url, experience, education, skills,
       achievements, languages, certificates, brand_color, brand_accent, brand_bg,
       template, photo_mime IS NOT NULL AS has_photo
       FROM student_portfolios WHERE slug=$1 AND published=TRUE`, [req.params.slug]);
    if (!r.rows.length) return res.status(404).json({ error: 'Ei löydy' });
    res.json({ portfolio: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Virhe' }); }
});

// Serve photo by slug (PUBLIC)
router.get('/photo/:slug', async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      'SELECT photo_bytes, photo_mime FROM student_portfolios WHERE slug=$1 AND photo_bytes IS NOT NULL',
      [req.params.slug]);
    if (!r.rows.length) return res.status(404).send('Ei kuvaa');
    const row = r.rows[0];
    res.set('Content-Type', row.photo_mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(row.photo_bytes);
  } catch (e) { res.status(500).send('Virhe'); }
});

// Admin: list all portfolios
router.get('/admin/list', authenticateToken, async (req, res) => {
  try {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Ei oikeuksia' });
    await ready();
    const r = await pool.query(
      `SELECT p.slug, p.full_name, p.published, p.updated_at, u.email
       FROM student_portfolios p JOIN users u ON p.user_id=u.id ORDER BY p.updated_at DESC`);
    res.json({ portfolios: r.rows });
  } catch (e) { res.status(500).json({ error: 'Virhe' }); }
});

module.exports = { router, ensureTable };
