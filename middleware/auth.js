const pool = require('../database/db');

async function authenticatePage(req, res, next) {
  const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.redirect(302, '/login?redirect=' + encodeURIComponent(req.originalUrl || '/'));
  }
  try {
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE'); } catch (e) {}
    const result = await pool.query(
      'SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE',
      [token]
    );
    if (result.rows.length === 0) {
      return res.redirect(302, '/login?redirect=' + encodeURIComponent(req.originalUrl || '/'));
    }
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('authenticatePage error:', error);
    return res.redirect(302, '/login?redirect=' + encodeURIComponent(req.originalUrl || '/'));
  }
}

async function authenticateToken(req, res, next) {
  const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const result = await pool.query(
      'SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = { authenticateToken, authenticatePage };
