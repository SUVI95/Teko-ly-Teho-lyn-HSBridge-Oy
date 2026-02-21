const express = require('express');
const pool = require('../database/db');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// One-time database initialization endpoint
// Protected by SETUP_TOKEN environment variable
router.post('/init-db', async (req, res) => {
  try {
    // Check for setup token (set in Vercel environment variables)
    const providedToken = req.headers['x-setup-token'] || req.body.token;
    const expectedToken = process.env.SETUP_TOKEN || 'change-this-in-production';
    
    if (providedToken !== expectedToken) {
      return res.status(403).json({ error: 'Invalid setup token' });
    }
    
    console.log('Initializing database on production...');
    
    // Read schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    try {
      await pool.query(schema);
      console.log('✅ Database schema created successfully!');
    } catch (error) {
      // If error is about existing objects, that's okay
      if (error.code === '42P07' || error.code === '42710' || 
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')) {
        console.log('⚠️  Some objects already exist, continuing...');
      } else {
        throw error;
      }
    }
    
    // Add is_admin column if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE');
      console.log('✅ Added is_admin column');
    } catch (e) {
      // Column might already exist
    }
    
    // Create reflections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reflections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        module_id VARCHAR(100) NOT NULL,
        reflection_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created reflections table');
    
    // Create closing_actions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS closing_actions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created closing_actions table');
    
    // Create feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        module_id VARCHAR(100),
        question_type VARCHAR(50) NOT NULL,
        feedback_text TEXT,
        rating INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created feedback table');
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_reflections_module ON reflections(module_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_closing_actions_user_id ON closing_actions(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feedback_module ON feedback(module_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(question_type)');
    console.log('✅ Created indexes');
    
    res.json({ 
      success: true, 
      message: 'Database initialized successfully',
      tables: ['users', 'sessions', 'student_progress', 'checklist_items', 'reflections', 'closing_actions', 'feedback']
    });
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    res.status(500).json({ 
      error: 'Database initialization failed', 
      message: error.message 
    });
  }
});

// Create admin account endpoint
router.post('/create-admin', async (req, res) => {
  try {
    // Check for setup token
    const providedToken = req.headers['x-setup-token'] || req.body.token;
    const expectedToken = process.env.SETUP_TOKEN || 'change-this-in-production';
    
    if (providedToken !== expectedToken) {
      return res.status(403).json({ error: 'Invalid setup token' });
    }
    
    const bcrypt = require('bcrypt');
    const adminEmail = 'suvi@duunijobs.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin exists
    const existing = await pool.query('SELECT id, is_admin FROM users WHERE email = $1', [adminEmail]);
    
    if (existing.rows.length > 0) {
      // Update existing user to admin
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1, is_admin = TRUE WHERE email = $2',
        [hashPassword, adminEmail]
      );
      res.json({ 
        success: true, 
        message: 'Admin account updated',
        email: adminEmail,
        password: adminPassword
      });
    } else {
      // Create new admin user
      const hashPassword = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name, is_admin) VALUES ($1, $2, $3, TRUE)',
        [adminEmail, hashPassword, 'Admin']
      );
      res.json({ 
        success: true, 
        message: 'Admin account created',
        email: adminEmail,
        password: adminPassword
      });
    }
  } catch (error) {
    console.error('❌ Create admin error:', error);
    res.status(500).json({ 
      error: 'Failed to create admin account', 
      message: error.message 
    });
  }
});

module.exports = router;
