const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.VERCEL_URL 
    ? [`https://${process.env.VERCEL_URL}`, `https://${process.env.VERCEL_URL.replace('https://', '')}`]
    : ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API Routes (before static files)
app.use('/api/auth', authRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static files
app.use(express.static('public'));

// Homework PDFs - serve PDFs with authentication, but check file extension first
app.get('/homework/*.pdf', authenticateToken, (req, res, next) => {
  const fileName = req.params[0];
  const filePath = path.join(__dirname, 'public', 'homework', fileName);
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error serving PDF:', err);
      res.status(404).send('PDF not found');
    }
  });
});

// Homework page (always accessible, no prerequisites)
app.get('/homework', authenticateToken, (req, res) => {
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

app.get('/module/:moduleId', authenticateToken, async (req, res) => {
  const moduleId = req.params.moduleId;
  const userId = req.user.id;
  
  // Module prerequisites
  const moduleOrder = {
    'moduuli1-tietosuoja': 1,
    'moduuli2-tekoaly-uhka-vai-mahdollisuus': 2,
    'moduuli3-master-prompt': 3,
    'moduuli4-prompt-tyonhakijalle': 4
  };
  
  const currentOrder = moduleOrder[moduleId];
  if (currentOrder && currentOrder > 1) {
    // Check if previous module is completed
    const previousModuleId = Object.keys(moduleOrder).find(key => moduleOrder[key] === currentOrder - 1);
    if (previousModuleId) {
      try {
        const pool = require('./database/db');
        
        // Check if previous module has any progress (sections viewed or checklist completed)
        const progressResult = await pool.query(
          `SELECT COUNT(DISTINCT section_id) as sections_viewed
           FROM student_progress
           WHERE user_id = $1 AND module_id = $2`,
          [userId, previousModuleId]
        );
        
        const checklistResult = await pool.query(
          `SELECT COUNT(*) as total, SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed
           FROM checklist_items
           WHERE user_id = $1 AND module_id = $2`,
          [userId, previousModuleId]
        );
        
        const sectionsViewed = parseInt(progressResult.rows[0].sections_viewed) || 0;
        const { total, completed } = checklistResult.rows[0];
        const checklistCompleted = parseInt(completed) || 0;
        const checklistTotal = parseInt(total) || 0;
        
        // Allow access if:
        // 1. User has viewed at least 3 sections (indicating they've gone through the module), OR
        // 2. All checklist items are completed (if checklist exists)
        // This is more flexible - if no checklist exists, progress through sections is enough
        const hasProgress = sectionsViewed >= 3;
        const hasCompletedChecklist = checklistTotal > 0 && checklistCompleted >= checklistTotal;
        
        if (!hasProgress && !hasCompletedChecklist) {
          return res.status(403).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px; background: #050810; color: #e2e8f0;">
                <h1>🔒 Moduuli on lukittu</h1>
                <p>Sinun täytyy suorittaa edellinen moduuli ensin. Vieritä moduulia läpi ja merkitse tarkistuslistan kohdat valmiiksi.</p>
                <a href="/module/${previousModuleId}" style="color: #63b3ed; text-decoration: none; padding: 10px 20px; border: 1px solid #63b3ed; border-radius: 8px; display: inline-block; margin-top: 20px; margin-right: 10px;">← Takaisin edelliseen moduuliin</a>
                <a href="/" style="color: #63b3ed; text-decoration: none; padding: 10px 20px; border: 1px solid #63b3ed; border-radius: 8px; display: inline-block; margin-top: 20px;">← Etusivulle</a>
              </body>
            </html>
          `);
        }
      } catch (error) {
        console.error('Error checking prerequisites:', error);
        // On error, allow access (fail open) to prevent blocking users
      }
    }
  }
  
  const modulePath = path.join(__dirname, `${moduleId}.html`);
  
  // Check if file exists
  if (!fs.existsSync(modulePath)) {
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
