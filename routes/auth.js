const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database/db');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name || null]
    );
    
    const user = result.rows[0];
    
    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    
    await pool.query(
      'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, sessionToken, expiresAt]
    );
    
    // Set cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    
    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    
    await pool.query(
      'INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
      [user.id, sessionToken, expiresAt]
    );
    
    // Set cookie
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await pool.query('DELETE FROM sessions WHERE session_token = $1', [token]);
    }
    
    res.clearCookie('session_token');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.session_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const result = await pool.query(
      'SELECT u.id, u.email, u.name, u.created_at, u.last_login, u.is_admin FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Forgot password - request reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const result = await pool.query('SELECT id, email, name FROM users WHERE email = $1 AND is_active = TRUE', [email]);
    
    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If email exists, reset link has been sent' });
    }
    
    const user = result.rows[0];
    
    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
    
    // Delete old tokens for this user
    try {
      await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    } catch (e) {
      // Table might not exist yet, will be created by schema
    }
    
    // Insert new token
    try {
      await pool.query(
        'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );
    } catch (e) {
      // If table doesn't exist, create it
      if (e.code === '42P01') {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            reset_token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await pool.query(
          'INSERT INTO password_resets (user_id, reset_token, expires_at) VALUES ($1, $2, $3)',
          [user.id, resetToken, expiresAt]
        );
      } else {
        throw e;
      }
    }
    
    // In production, send email here
    // For now, we'll return the reset link (remove in production!)
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
    
    console.log(`Password reset link for ${email}: ${resetLink}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset link has been sent to your email',
      // Remove this in production:
      resetLink: resetLink
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Find valid reset token
    const resetResult = await pool.query(
      `SELECT pr.user_id, u.email 
       FROM password_resets pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.reset_token = $1 AND pr.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    
    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    const { user_id } = resetResult.rows[0];
    
    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Update password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user_id]);
    
    // Delete reset token
    await pool.query('DELETE FROM password_resets WHERE reset_token = $1', [token]);
    
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
