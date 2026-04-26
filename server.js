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
app.use(express.json());
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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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

app.get('/module/:moduleId', async (req, res) => {
  const moduleId = req.params.moduleId;
  const token = req.cookies && req.cookies.session_token;
  if (token) {
    try {
      const sessionResult = await pool.query(
        `SELECT u.id, u.is_admin, COALESCE(u.is_approved, FALSE) AS is_approved
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
        [token]
      );
      if (sessionResult.rows.length > 0) {
        const u = sessionResult.rows[0];
        const isAdmin = u.is_admin === true;
        const approved = u.is_approved === true;
        if (!isAdmin && approved) {
          await onboardingRoutes.ensureUserOnboardingTable();
          const ob = await pool.query('SELECT id FROM user_onboarding WHERE user_id = $1', [u.id]);
          if (ob.rows.length === 0) {
            return res.redirect(302, '/onboarding');
          }
        }
      }
    } catch (e) {
      console.error('Module onboarding gate:', e);
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
  res.sendFile(modulePath);
});

// Only start server if not in Vercel environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Learning platform ready!`);
  });
}

module.exports = app;
