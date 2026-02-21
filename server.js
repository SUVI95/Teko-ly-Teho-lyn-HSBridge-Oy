const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const aiRoutes = require('./routes/ai');
const reflectionsRoutes = require('./routes/reflections');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
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
app.use('/api/progress', progressRoutes); // No authentication required
app.use('/api/ai', aiRoutes); // No authentication required
app.use('/api/reflections', reflectionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.get('/module/:moduleId', (req, res) => {
  const moduleId = req.params.moduleId;
  
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
