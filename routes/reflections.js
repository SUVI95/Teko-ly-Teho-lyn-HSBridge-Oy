const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Save reflection (authenticated)
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { moduleId, reflectionText } = req.body;
    const userId = req.user.id;
    
    if (!moduleId || !reflectionText) {
      return res.status(400).json({ error: 'Module ID and reflection text are required' });
    }
    
    // Check if reflection exists for this user and module
    const existing = await pool.query(
      'SELECT id FROM reflections WHERE user_id = $1 AND module_id = $2',
      [userId, moduleId]
    );
    
    if (existing.rows.length > 0) {
      // Update existing reflection
      await pool.query(
        'UPDATE reflections SET reflection_text = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND module_id = $3',
        [reflectionText, userId, moduleId]
      );
    } else {
      // Create new reflection
      await pool.query(
        'INSERT INTO reflections (user_id, module_id, reflection_text) VALUES ($1, $2, $3)',
        [userId, moduleId, reflectionText]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save reflection error:', error);
    res.status(500).json({ error: 'Failed to save reflection' });
  }
});

// Get user's reflection for a module
router.get('/module/:moduleId', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT reflection_text, created_at, updated_at FROM reflections WHERE user_id = $1 AND module_id = $2',
      [userId, moduleId]
    );
    
    if (result.rows.length > 0) {
      res.json({ reflection: result.rows[0] });
    } else {
      res.json({ reflection: null });
    }
  } catch (error) {
    console.error('Get reflection error:', error);
    res.status(500).json({ error: 'Failed to get reflection' });
  }
});

// Save closing action (Module 10)
router.post('/closing-action', authenticateToken, async (req, res) => {
  try {
    const { actionText } = req.body;
    const userId = req.user.id;
    
    if (!actionText) {
      return res.status(400).json({ error: 'Action text is required' });
    }
    
    await pool.query(
      'INSERT INTO closing_actions (user_id, action_text) VALUES ($1, $2)',
      [userId, actionText]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save closing action error:', error);
    res.status(500).json({ error: 'Failed to save closing action' });
  }
});

module.exports = router;
