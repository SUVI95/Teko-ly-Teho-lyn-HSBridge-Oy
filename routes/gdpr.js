const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Save GDPR consent
router.post('/consent', authenticateToken, async (req, res) => {
  try {
    const { consent_given, consent_type = 'data_processing', consent_text } = req.body;
    const userId = req.user.id;
    
    if (typeof consent_given !== 'boolean') {
      return res.status(400).json({ error: 'consent_given must be a boolean' });
    }
    
    // Get IP address and user agent
    const ip_address = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || null;
    const user_agent = req.headers['user-agent'] || null;
    
    // Upsert consent record
    const result = await pool.query(`
      INSERT INTO gdpr_consent (user_id, consent_given, consent_type, ip_address, user_agent, consent_text)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, consent_type)
      DO UPDATE SET
        consent_given = EXCLUDED.consent_given,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        consent_text = EXCLUDED.consent_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, consent_given, consent_type, ip_address, user_agent, consent_text || null]);
    
    res.json({ 
      success: true, 
      consent: result.rows[0],
      message: consent_given 
        ? 'Consent recorded successfully' 
        : 'Consent withdrawal recorded'
    });
  } catch (error) {
    if (error.code === '42P01') {
      try {
        await pool.query(`CREATE TABLE IF NOT EXISTS gdpr_consent (
          id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          consent_given BOOLEAN NOT NULL, consent_type VARCHAR(50) NOT NULL DEFAULT 'data_processing',
          ip_address VARCHAR(45), user_agent TEXT, consent_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, consent_type))`);
        return res.json({ success: true, consent: null, message: 'Table created, please try again' });
      } catch(e) { /* ignore */ }
    }
    console.error('Save consent error:', error);
    res.status(500).json({ error: 'Failed to save consent' });
  }
});

// Get user's consent status
router.get('/consent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { consent_type = 'data_processing' } = req.query;
    
    const result = await pool.query(`
      SELECT * FROM gdpr_consent
      WHERE user_id = $1 AND consent_type = $2
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, consent_type]);
    
    if (result.rows.length === 0) {
      return res.json({ 
        has_consent: false,
        consent: null 
      });
    }
    
    res.json({ 
      has_consent: true,
      consent: result.rows[0]
    });
  } catch (error) {
    if (error.code === '42P01') {
      return res.json({ has_consent: false, consent: null });
    }
    console.error('Get consent error:', error);
    res.status(500).json({ error: 'Failed to get consent status' });
  }
});

// Get all consent records for a user (for admin/debugging)
router.get('/consent/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(`
      SELECT * FROM gdpr_consent
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json({ consents: result.rows });
  } catch (error) {
    console.error('Get all consents error:', error);
    res.status(500).json({ error: 'Failed to get consent records' });
  }
});

module.exports = router;
