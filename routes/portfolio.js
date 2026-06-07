const express = require('express');
const multer = require('multer');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { makePreviewToken, verifyPreviewToken } = require('../lib/preview-token');
const { notifyVisit, notifyContact, notifyCvDownload } = require('../lib/portfolio-notify');
const { portfolioPublicUrl } = require('../lib/portfolio-public-url');

const router = express.Router();

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Vain JPG, PNG tai WebP'), ok);
  }
});

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    const ok = mime === 'application/pdf' || mime === 'text/plain'
      || name.endsWith('.pdf') || name.endsWith('.txt');
    cb(ok ? null : new Error('Vain PDF tai TXT'), ok);
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
  await pool.query(`ALTER TABLE student_portfolios ADD COLUMN IF NOT EXISTS cv_bytes BYTEA`);
  await pool.query(`ALTER TABLE student_portfolios ADD COLUMN IF NOT EXISTS cv_mime VARCHAR(100)`);
  await pool.query(`ALTER TABLE student_portfolios ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255)`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portfolio_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(120) NOT NULL,
      event_type VARCHAR(40) NOT NULL,
      visitor_name VARCHAR(255),
      visitor_email VARCHAR(255),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_portfolio_events_user ON portfolio_events(user_id, created_at DESC);
  `);
}

let _ready = false;
async function ready() { if (!_ready) { await ensureTable(); _ready = true; } }

const PORTFOLIO_FIELDS = `slug, full_name, tagline, bio, city, target_role,
       email_public, phone_public, linkedin_url, experience, education, skills,
       achievements, languages, certificates, brand_color, brand_accent, brand_bg,
       template, career_summary, hidden_strengths, cv_filename,
       photo_mime IS NOT NULL AS has_photo,
       (cv_bytes IS NOT NULL) AS has_cv`;

async function resolveSessionUser(req) {
  const token = req.cookies?.session_token || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  const r = await pool.query(
    `SELECT u.id FROM sessions s JOIN users u ON s.user_id = u.id
     WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
    [token]
  );
  return r.rows[0]?.id ?? null;
}

function makeSlug(name) {
  return name.toLowerCase()
    .replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

function validateSlug(slug) {
  return typeof slug === 'string'
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    && slug.length >= 2
    && slug.length <= 80;
}

async function uniqueSlug(candidate, excludeUserId) {
  let slug = candidate;
  const dup = await pool.query(
    'SELECT user_id FROM student_portfolios WHERE slug=$1 AND user_id != $2',
    [slug, excludeUserId]
  );
  if (dup.rows.length) slug = slug + '-' + Date.now().toString(36).slice(-4);
  return slug;
}

async function resolveSlugForSave(uid, d, existingSlug, isPublished) {
  const requested = d.slug ? String(d.slug).toLowerCase().trim() : '';
  if (requested) {
    if (!validateSlug(requested)) {
      const err = new Error('Osoite saa sisältää vain pieniä kirjaimia, numeroita ja väliviivoja.');
      err.status = 400;
      throw err;
    }
    if (requested !== existingSlug) {
      const dup = await pool.query(
        'SELECT user_id FROM student_portfolios WHERE slug=$1 AND user_id != $2',
        [requested, uid]
      );
      if (dup.rows.length) {
        const err = new Error('Tämä portfolio-osoite on jo käytössä. Valitse toinen.');
        err.status = 409;
        throw err;
      }
    }
    return requested;
  }
  if (!existingSlug) {
    const fromName = makeSlug(d.full_name) || 'portfolio';
    return uniqueSlug(fromName, uid);
  }
  if (!isPublished) {
    const fromName = makeSlug(d.full_name);
    if (fromName && fromName !== existingSlug) return uniqueSlug(fromName, uid);
  }
  return existingSlug;
}

// Save / update portfolio
router.post('/save', authenticateToken, async (req, res) => {
  try {
    await ready();
    const uid = req.user.id;
    const d = req.body;
    if (!d.full_name) return res.status(400).json({ error: 'Nimi puuttuu' });

    const existing = await pool.query(
      'SELECT slug, published FROM student_portfolios WHERE user_id=$1', [uid]
    );
    let slug;

    const vals = [uid, d.full_name, d.tagline||null, d.bio||null, d.city||null, d.target_role||null,
      d.email_public||null, d.phone_public||null, d.linkedin_url||null,
      JSON.stringify(d.experience||[]), JSON.stringify(d.education||[]),
      JSON.stringify(d.skills||[]), JSON.stringify(d.achievements||[]),
      JSON.stringify(d.languages||[]), JSON.stringify(d.certificates||[]),
      d.brand_color||'#2563a8', d.brand_accent||'#c75b3a', d.brand_bg||'#f5f3ef',
      d.template||'modern', d.career_summary||null, d.hidden_strengths||null];

    if (existing.rows.length > 0) {
      const isPublished = existing.rows[0].published === true;
      slug = await resolveSlugForSave(uid, d, existing.rows[0].slug, isPublished);
      await pool.query(`UPDATE student_portfolios SET
        slug=$2, full_name=$3, tagline=$4, bio=$5, city=$6, target_role=$7,
        email_public=$8, phone_public=$9, linkedin_url=$10,
        experience=$11, education=$12, skills=$13, achievements=$14,
        languages=$15, certificates=$16,
        brand_color=$17, brand_accent=$18, brand_bg=$19, template=$20,
        career_summary=$21, hidden_strengths=$22, updated_at=CURRENT_TIMESTAMP
        WHERE user_id=$1`, [uid, slug, ...vals.slice(1)]);
    } else {
      slug = await resolveSlugForSave(uid, d, null, false);
      await pool.query(`INSERT INTO student_portfolios (
        user_id, slug, full_name, tagline, bio, city, target_role,
        email_public, phone_public, linkedin_url,
        experience, education, skills, achievements, languages, certificates,
        brand_color, brand_accent, brand_bg, template,
        career_summary, hidden_strengths
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
        [uid, slug, ...vals.slice(1)]);
    }
    const userId = uid;
    res.json({
      success: true,
      slug,
      preview_token: makePreviewToken(slug, userId),
      public_url: portfolioPublicUrl(slug)
    });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('Portfolio save:', e);
    res.status(500).json({ error: 'Tallennus epäonnistui' });
  }
});

// Publish / unpublish
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      'UPDATE student_portfolios SET published=$2, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING slug',
      [req.user.id, !!req.body.published]);
    if (!r.rows.length) return res.status(404).json({ error: 'Ei portfoliota' });
    const slug = r.rows[0].slug;
    res.json({
      success: true,
      slug,
      published: !!req.body.published,
      public_url: portfolioPublicUrl(slug)
    });
  } catch (e) { console.error('Portfolio publish:', e); res.status(500).json({ error: 'Virhe' }); }
});

// Upload photo
router.post('/photo', authenticateToken, (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Ei kuvaa' });
    try {
      await ready();
      console.log('Photo upload: user=' + req.user.id + ', size=' + req.file.buffer.length + ', mime=' + req.file.mimetype);
      const result = await pool.query(
        'UPDATE student_portfolios SET photo_bytes=$2, photo_mime=$3, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1 RETURNING slug',
        [req.user.id, req.file.buffer, req.file.mimetype]);
      if (!result.rows.length) {
        console.error('Photo upload: no portfolio found for user_id=' + req.user.id);
        return res.status(404).json({ error: 'Portfoliota ei löydy — tallenna portfolio ensin' });
      }
      console.log('Photo saved for slug=' + result.rows[0].slug);
      res.json({ success: true });
    } catch (e) { console.error('Photo:', e); res.status(500).json({ error: 'Virhe: ' + e.message }); }
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
       cv_filename, (cv_bytes IS NOT NULL) AS has_cv,
       created_at, updated_at FROM student_portfolios WHERE user_id=$1`, [req.user.id]);
    const portfolio = r.rows[0] || null;
    if (portfolio) {
      portfolio.preview_token = makePreviewToken(portfolio.slug, req.user.id);
      portfolio.public_url = portfolioPublicUrl(portfolio.slug);
    }
    res.json({ portfolio });
  } catch (e) { res.status(500).json({ error: 'Virhe' }); }
});

// Get portfolio by slug (PUBLIC — published only)
router.get('/view/:slug', async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT slug, full_name, tagline, bio, city, target_role,
       email_public, phone_public, linkedin_url, experience, education, skills,
       achievements, languages, certificates, brand_color, brand_accent, brand_bg,
       template, career_summary, hidden_strengths, photo_mime IS NOT NULL AS has_photo
       FROM student_portfolios WHERE slug=$1 AND published=TRUE`, [req.params.slug]);
    if (!r.rows.length) return res.status(404).json({ error: 'Ei löydy' });
    res.json({ portfolio: r.rows[0] });
  } catch (e) { res.status(500).json({ error: 'Virhe' }); }
});

// Preview own portfolio before publish (session cookie OR signed preview token)
router.get('/preview/:slug', async (req, res) => {
  try {
    await ready();
    const slug = req.params.slug;
    const pt = String(req.query.pt || '').trim();
    const sessionUserId = await resolveSessionUser(req);

    let r;
    if (sessionUserId) {
      r = await pool.query(
        `SELECT ${PORTFOLIO_FIELDS} FROM student_portfolios WHERE slug=$1 AND user_id=$2`,
        [slug, sessionUserId]
      );
    } else if (pt) {
      r = await pool.query(
        `SELECT user_id, ${PORTFOLIO_FIELDS} FROM student_portfolios WHERE slug=$1`,
        [slug]
      );
      if (r.rows.length && !verifyPreviewToken(slug, r.rows[0].user_id, pt)) {
        return res.status(403).json({ error: 'Esikatselulinkki vanhentunut' });
      }
      if (r.rows.length) {
        const row = { ...r.rows[0] };
        delete row.user_id;
        return res.json({ portfolio: row });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!r.rows.length) return res.status(404).json({ error: 'Ei löydy' });
    res.json({ portfolio: r.rows[0] });
  } catch (e) {
    console.error('Portfolio preview:', e);
    res.status(500).json({ error: 'Virhe' });
  }
});

// Serve photo by slug (PUBLIC — published portfolios only)
router.get('/photo/:slug', async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT photo_bytes, photo_mime FROM student_portfolios
       WHERE slug=$1 AND published=TRUE AND photo_bytes IS NOT NULL`,
      [req.params.slug]);
    if (!r.rows.length) return res.status(404).send('Ei kuvaa');
    const row = r.rows[0];
    res.set('Content-Type', row.photo_mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(row.photo_bytes);
  } catch (e) { res.status(500).send('Virhe'); }
});

// Upload CV file for recruiters (auth)
router.post('/cv', authenticateToken, (req, res) => {
  cvUpload.single('cv')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Ei tiedostoa' });
    try {
      await ready();
      const safeName = (req.file.originalname || 'cv.pdf')
        .replace(/[^\w.\-åäöÅÄÖ ]+/g, '_')
        .slice(0, 200);
      const result = await pool.query(
        `UPDATE student_portfolios SET cv_bytes=$2, cv_mime=$3, cv_filename=$4, updated_at=CURRENT_TIMESTAMP
         WHERE user_id=$1 RETURNING slug, cv_filename`,
        [req.user.id, req.file.buffer, req.file.mimetype, safeName]
      );
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Tallenna portfolio ensin' });
      }
      res.json({ success: true, filename: result.rows[0].cv_filename });
    } catch (e) {
      console.error('CV upload:', e);
      res.status(500).json({ error: 'CV:n tallennus epäonnistui' });
    }
  });
});

// Download CV by slug (PUBLIC — published portfolios only)
router.get('/cv/:slug', async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT cv_bytes, cv_mime, cv_filename FROM student_portfolios
       WHERE slug=$1 AND published=TRUE AND cv_bytes IS NOT NULL`,
      [req.params.slug]
    );
    if (!r.rows.length) return res.status(404).send('CV:tä ei löydy');
    notifyCvDownload(req.params.slug).catch((e) => console.error('CV download event:', e));
    const row = r.rows[0];
    const filename = row.cv_filename || 'cv.pdf';
    res.set('Content-Type', row.cv_mime || 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(row.cv_bytes);
  } catch (e) {
    console.error('CV download:', e);
    res.status(500).send('Virhe');
  }
});

// Track portfolio page visit (public — debounced email to student)
router.post('/event/visit', async (req, res) => {
  try {
    const slug = String(req.body.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug puuttuu' });
    await ready();
    notifyVisit(slug).catch((e) => console.error('Visit notify:', e));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Virhe' });
  }
});

// Recruiter contact form (public — emails portfolio owner)
router.post('/contact', async (req, res) => {
  try {
    const slug = String(req.body.slug || '').trim();
    const name = String(req.body.name || '').trim().slice(0, 200);
    const email = String(req.body.email || '').trim().slice(0, 255);
    const message = String(req.body.message || '').trim().slice(0, 5000);

    if (!slug || !name || !email || !message) {
      return res.status(400).json({ error: 'Täytä nimi, sähköposti ja viesti.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Virheellinen sähköpostiosoite.' });
    }

    await ready();
    const result = await notifyContact(slug, { name, email, message });
    if (!result.ok) return res.status(404).json({ error: result.error || 'Virhe' });
    res.json({ ok: true, message: 'Viesti lähetetty!' });
  } catch (e) {
    console.error('Portfolio contact:', e);
    res.status(500).json({ error: 'Viestin lähetys epäonnistui.' });
  }
});

// Student: recent portfolio activity (auth)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    await ready();
    const r = await pool.query(
      `SELECT event_type, slug, visitor_name, visitor_email, message, created_at
       FROM portfolio_events
       WHERE user_id = $1 AND event_type IN ('visit', 'contact', 'cv_download')
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json({ events: r.rows });
  } catch (e) {
    res.status(500).json({ error: 'Virhe' });
  }
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
