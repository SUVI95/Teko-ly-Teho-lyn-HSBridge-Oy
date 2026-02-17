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
  origin: ['http://localhost:8000', 'http://localhost:3000'],
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
        // Check if previous module has completed checklist items
        const checklistResult = await pool.query(
          `SELECT COUNT(*) as total, SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed
           FROM checklist_items
           WHERE user_id = $1 AND module_id = $2`,
          [userId, previousModuleId]
        );
        
        const { total, completed } = checklistResult.rows[0];
        // If there are checklist items, require all to be completed
        // Otherwise, allow access if there's any progress
        if (total > 0 && parseInt(completed) < parseInt(total)) {
          return res.status(403).send(`
            <html>
              <body style="font-family: Arial; text-align: center; padding: 50px; background: #050810; color: #e2e8f0;">
                <h1>🔒 Moduuli on lukittu</h1>
                <p>Sinun täytyy suorittaa edellinen moduuli ensin.</p>
                <a href="/" style="color: #63b3ed; text-decoration: none; padding: 10px 20px; border: 1px solid #63b3ed; border-radius: 8px; display: inline-block; margin-top: 20px;">← Takaisin etusivulle</a>
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Learning platform ready!`);
});
