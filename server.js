const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Help verify AI env locally (never log secret values)
(function logAiEnvPresence() {
  var o = (process.env.OPENAI_API_KEY || '').trim();
  var a = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (process.env.NODE_ENV !== 'test') {
    console.log('[env] OPENAI_API_KEY:', o ? 'configured' : 'MISSING');
    console.log('[env] ANTHROPIC_API_KEY:', a ? 'configured' : 'optional, not set');
  }
})();

const pool = require('./database/db');
const { shouldAutoApproveStudent } = require('./config/demo-access');
const {
  GIFTS,
  getGiftKeyForModuleId,
  isGiftRecipient
} = require('./config/personal-gift-access');
const { resetKuopioDemoUserData } = require('./lib/reset-kuopio-demo-user-data');
const { portfolioPublicUrl, isPortfolioSubdomain, portfolioUseSubdomain } = require('./lib/portfolio-public-url');

const KUOPIO_DEMO_LS_CLEAR = '<script>(function(){try{if(/(?:^|;\\s*)kuopio_demo=1(?:;|$)/.test(document.cookie))localStorage.clear();}catch(e){}})();</script>';

function injectKuopioDemoLocalClear(html) {
  if (html.includes('<head>')) return html.replace('<head>', '<head>' + KUOPIO_DEMO_LS_CLEAR);
  return KUOPIO_DEMO_LS_CLEAR + html;
}

function injectModulePersistenceScripts(html, moduleId) {
  if (!html || typeof html !== 'string') return html;
  const bootScript = `<script>window.__MODULE_ID__=${JSON.stringify(String(moduleId || ''))};</script>`;
  const needsModuleWork = !html.includes('/js/module-work.js');
  const needsAutoSave = !html.includes('/js/module-autosave.js');
  const tags = [bootScript];
  if (needsModuleWork) tags.push('<script src="/js/module-work.js"></script>');
  if (needsAutoSave) tags.push('<script src="/js/module-autosave.js"></script>');
  const inject = tags.join('');
  if (html.includes('</body>')) return html.replace('</body>', inject + '</body>');
  return html + inject;
}

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const aiRoutes = require('./routes/ai');
const onboardingRoutes = require('./routes/onboarding');
const reflectionsRoutes = require('./routes/reflections');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const setupRoutes = require('./routes/setup');
const gdprRoutes = require('./routes/gdpr');
const { router: finalModuleRoutes } = require('./routes/final');
const { router: courtRoutes } = require('./routes/tuomioistuin');
const { router: toolBuilderRoutes } = require('./routes/tyokalurakentaja');
const { router: portfolioRoutes } = require('./routes/portfolio');
const artifactsRoutes = require('./routes/artifacts');
const { authenticateToken, authenticatePage } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '30mb' }));
app.use(cookieParser());
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'), {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
  })
);

// API Routes (before static files)
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes); // No authentication required
app.use('/api/ai', aiRoutes); // No authentication required
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/reflections', reflectionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/final', finalModuleRoutes);
app.use('/api/tuomioistuin', courtRoutes);
app.use('/api/tyokalurakentaja', toolBuilderRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/artifacts', artifactsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Explicitly serve shared frontend JS helpers.
// (Avoids 404 + MIME mismatch if a deployment ever misses static assets.)
app.get('/js/reflections.js', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'js', 'reflections.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('/* reflections.js not found */');
    }
  });
});

app.get('/js/feedback.js', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'js', 'feedback.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('/* feedback.js not found */');
    }
  });
});

app.get('/js/ai-helper.js', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'js', 'ai-helper.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('/* ai-helper.js not found */');
    }
  });
});

// Elävä CV module — always fresh (avoid stale portfolio builder after edits)
app.get('/js/portfolio-module.js', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'js', 'portfolio-module.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('/* portfolio-module.js not found */');
    }
  });
});

// Static files
app.use(express.static('public'));

// Homework PDFs - serve PDFs without authentication
// This route must come BEFORE the /homework HTML route
app.get('/homework/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  // Only serve PDF files
  if (!filename.endsWith('.pdf')) {
    return res.status(404).send('File not found');
  }
  const filePath = path.join(__dirname, 'public', 'homework', filename);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving PDF:', err);
      res.status(404).send('PDF not found');
    }
  });
});

// Homework page (always accessible, no prerequisites)
// This route must come AFTER the PDF route
app.get('/homework', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'homework.html'));
});

// Serve HTML files
app.get('/', (req, res) => {
  if (isPortfolioSubdomain(req)) {
    return res.status(404).type('html').send(
      '<!DOCTYPE html><html lang="fi"><head><meta charset="UTF-8"><title>Portfolio</title></head>'
      + '<body style="font-family:system-ui,sans-serif;text-align:center;padding:3rem;color:#333;">'
      + '<h1>portfolio.duunijobs.fi</h1>'
      + '<p>Henkilökohtainen portfolio löytyy osoitteesta <strong>/etunimi-sukunimi</strong>.</p>'
      + '<p style="color:#666;margin-top:1.5rem;"><a href="https://aipolku.duunijobs.fi">Takaisin AI Polkuun</a></p>'
      + '</body></html>'
    );
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/** App builder for Sovellusstudio module — hides external product URL from on-screen copy */
app.get('/go/sovellusstudio', (req, res) => {
  res.redirect(302, 'https://base44.com');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

app.get('/course-feedback', authenticateToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'course-feedback.html'));
});

app.get('/onboarding', authenticatePage, async (req, res) => {
  try {
    if (req.user.is_admin) {
      if (req.query.preview === '1') {
        return res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
      }
      return res.redirect(302, '/');
    }
    const approved = req.user.is_approved === true || req.user.is_approved === 'true' || req.user.is_approved === 1;
    if (!approved) {
      return res.redirect(302, '/');
    }
    await onboardingRoutes.ensureUserOnboardingTable();
    res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
  } catch (e) {
    console.error('/onboarding error:', e);
    res.redirect(302, '/');
  }
});

app.get('/setup-production', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'setup-production.html'));
});

app.get('/admin', authenticateToken, (req, res, next) => {
  // Check if user is admin
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #f5f3ef; color: #1a1a2e;">
          <h1>403 - Pääsy kielletty</h1>
          <p>Sinulla ei ole oikeuksia tähän sivulle.</p>
          <a href="/" style="color: #c75b3a; text-decoration: none; padding: 10px 20px; border: 1px solid #c75b3a; border-radius: 8px; display: inline-block; margin-top: 20px;">← Takaisin etusivulle</a>
        </body>
      </html>
    `);
  }
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/admin/mythology', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-mythology.html'),
    path.join(process.cwd(), 'admin-mythology.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/loppumoduuli', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-loppumoduuli.html'),
    path.join(process.cwd(), 'admin-loppumoduuli.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/rikkinainen-prompti', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-rikkinainen-prompti.html'),
    path.join(process.cwd(), 'admin-rikkinainen-prompti.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/palaute', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-palaute.html'),
    path.join(process.cwd(), 'admin-palaute.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/tuomioistuin', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-tuomioistuin.html'),
    path.join(process.cwd(), 'admin-tuomioistuin.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/tyokalurakentaja', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-tyokalurakentaja.html'),
    path.join(process.cwd(), 'admin-tyokalurakentaja.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/banners', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-banners.html'),
    path.join(process.cwd(), 'admin-banners.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/santeri-m1', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-santeri-m1.html'),
    path.join(process.cwd(), 'admin-santeri-m1.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/admin/santeri-m2', authenticateToken, (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).send('<h1>403 - Pääsy kielletty</h1>');
  }
  const candidates = [
    path.join(__dirname, 'admin-santeri-m2.html'),
    path.join(process.cwd(), 'admin-santeri-m2.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.status(404).send('Ei löytynyt');
});

app.get('/final/mythology', (req, res) => {
  res.redirect(302, '/module/myytinmurtaja');
});

app.get('/final/rikkinainen-prompti', (req, res) => {
  res.redirect(302, '/module/rikkinainen-prompti');
});

// Direct shortcut for AI Simulation Lab (works without login) - serve file directly
app.get('/ai-simulation-lab', (req, res) => {
  const candidates = [
    path.join(__dirname, 'public', 'ai-simulation-lab.html'),
    path.join(process.cwd(), 'public', 'ai-simulation-lab.html'),
    path.join(__dirname, 'ai-simulation-lab.html')
  ];
  const p = candidates.find(c => fs.existsSync(c));
  if (p) return res.sendFile(p);
  res.redirect(302, '/ai-simulation-lab.html');
});

const PORTFOLIO_RESERVED = new Set([
  'api', 'login', 'register', 'module', 'portfolio', 'admin', 'uploads', 'js',
  'homework', 'onboarding', 'setup-production', 'final', 'go', 'course-feedback',
  'reset-password', 'ai-simulation-lab', 'favicon.ico', 'robots.txt'
]);

function sendPortfolioTemplate(req, res) {
  const templatePath = path.join(__dirname, 'public', 'portfolio-tpl-premium.html');
  if (!fs.existsSync(templatePath)) return res.status(404).send('Portfolio-sivua ei löydy.');
  res.set('Cache-Control', 'public, max-age=60');
  return res.sendFile(templatePath);
}

// Legacy aipolku path — serve portfolio or redirect to subdomain when enabled
app.get('/portfolio/:slug', (req, res) => {
  const slug = req.params.slug;
  if (req.query.preview === '1') return sendPortfolioTemplate(req, res);
  if (portfolioUseSubdomain()) {
    return res.redirect(301, portfolioPublicUrl(slug));
  }
  return sendPortfolioTemplate(req, res);
});

// portfolio.duunijobs.fi/etunimi-sukunimi
app.get('/:slug', (req, res, next) => {
  if (!isPortfolioSubdomain(req)) return next();
  const slug = String(req.params.slug || '').toLowerCase();
  if (!slug || PORTFOLIO_RESERVED.has(slug) || slug.includes('.')) return next();
  if (req.path !== `/${req.params.slug}`) return next();
  return sendPortfolioTemplate(req, res);
});

/** Modules hidden from students; only admins may open (see adminOnlyModuleIds in public/index.html). */
const ADMIN_ONLY_MODULE_IDS = new Set([
  'moduuli-ai-verkkosivustotyokalut',
  'moduuli7-ai-tyonhaussa',
  'moduuli-tyonhaku',
  'moduuli5-ai-creation-sprint-legacy',
]);

/** Soft-locked modules: visible on dashboard with lock badge but only admin can open. */
const STUDENT_LOCKED_MODULE_IDS = new Set([
]);

// Personal gift HTML only via /module/:id (recipient + admin gate)
Object.values(GIFTS).forEach((gift) => {
  app.get(`/${gift.moduleId}.html`, (req, res) => {
    res.redirect(302, `/module/${gift.moduleId}`);
  });
});

app.get('/module/:moduleId', async (req, res) => {
  const moduleId = req.params.moduleId;
  const token = req.cookies && req.cookies.session_token;
  let viewerIsAdmin = false;
  let viewerIsKuopioDemo = false;
  if (token) {
    try {
      const sessionResult = await pool.query(
        `SELECT u.id, u.email, u.is_admin, COALESCE(u.is_approved, FALSE) AS is_approved
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
        [token]
      );
      if (sessionResult.rows.length > 0) {
        const u = sessionResult.rows[0];
        const isAdmin = u.is_admin === true;
        viewerIsAdmin = isAdmin;
        viewerIsKuopioDemo = shouldAutoApproveStudent(u.email);
        const approved = u.is_approved === true;
        if (viewerIsKuopioDemo) {
          try {
            await resetKuopioDemoUserData(u.id);
          } catch (resetErr) {
            console.error('Kuopio demo module reset:', resetErr);
          }
        }
        // Onboarding is optional — students can open any visible module without completing it first.
      }
    } catch (e) {
      console.error('Module onboarding gate:', e);
    }
  }
  if (ADMIN_ONLY_MODULE_IDS.has(moduleId) && !viewerIsAdmin) {
    if (moduleId === 'moduuli-ai-verkkosivustotyokalut') {
      return res.redirect(302, '/module/moduuli-elava-cv');
    }
    return res.redirect(302, '/');
  }

  if (STUDENT_LOCKED_MODULE_IDS.has(moduleId) && !viewerIsAdmin) {
    return res.redirect(302, '/');
  }

  const personalGiftKey = getGiftKeyForModuleId(moduleId);
  if (personalGiftKey && !viewerIsAdmin) {
    let giftUser = { email: '', name: '' };
    if (token) {
      try {
        const r = await pool.query(
          `SELECT u.email, u.name FROM sessions s JOIN users u ON s.user_id = u.id
           WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
          [token]
        );
        if (r.rows.length) {
          giftUser = { email: r.rows[0].email, name: r.rows[0].name };
        }
      } catch (e) {
        console.error('Personal gift module gate:', e);
      }
    }
    if (!isGiftRecipient(personalGiftKey, giftUser)) {
      return res.redirect(302, '/');
    }
  }

  // Try multiple paths (Vercel may use different cwd).
  // Prefer repo-root *.html first so edits match what developers save; public/module is fallback.
  let paths = [
    path.join(__dirname, 'public', 'ai-simulation-lab.html'),
    path.join(process.cwd(), 'public', 'ai-simulation-lab.html'),
    path.join(__dirname, `${moduleId}.html`),
    path.join(process.cwd(), `${moduleId}.html`),
    path.join(__dirname, 'public', 'module', `${moduleId}.html`),
    path.join(process.cwd(), 'public', 'module', `${moduleId}.html`)
  ];
  if (moduleId !== 'moduuli-ai-simulation-lab') {
    paths = paths.filter(x => !x.includes('ai-simulation-lab'));
  }
  const modulePath = paths.find(p => fs.existsSync(p));

  if (!modulePath) {
    return res.status(404).send(`
      <html>
        <body style="font-family: Arial; text-align: center; padding: 50px; background: #050810; color: #e2e8f0;">
          <h1>404 - Moduulia ei löydy</h1>
          <p>Moduulia "${moduleId}" ei ole olemassa.</p>
          <a href="/" style="color: #63b3ed; text-decoration: none; padding: 10px 20px; border: 1px solid #63b3ed; border-radius: 8px; display: inline-block; margin-top: 20px;">← Takaisin etusivulle</a>
        </body>
      </html>
    `);
  }

  // Avoid stale module HTML behind CDN/browser cache after deploys
  res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  let html = fs.readFileSync(modulePath, 'utf8');
  html = injectModulePersistenceScripts(html, moduleId);
  if (viewerIsKuopioDemo) {
    html = injectKuopioDemoLocalClear(html);
  }
  return res.type('html').send(html);
});

// Only start server if not in Vercel environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Learning platform ready!`);
  });
}

module.exports = app;
