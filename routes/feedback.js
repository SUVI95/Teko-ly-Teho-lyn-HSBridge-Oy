const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Save feedback
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { moduleId, questionType, feedbackText, rating } = req.body;
    const userId = req.user.id;
    
    if (!questionType) {
      return res.status(400).json({ error: 'Question type is required' });
    }
    
    // Validate question types
    const validTypes = ['what_learned', 'learned_new', 'course_feedback'];
    if (!validTypes.includes(questionType)) {
      return res.status(400).json({ error: 'Invalid question type' });
    }
    
    await pool.query(
      'INSERT INTO feedback (user_id, module_id, question_type, feedback_text, rating) VALUES ($1, $2, $3, $4, $5)',
      [userId, moduleId || null, questionType, feedbackText || null, rating || null]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Save feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Get user's feedback for a module
router.get('/module/:moduleId', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT question_type, feedback_text, rating, created_at FROM feedback WHERE user_id = $1 AND module_id = $2 ORDER BY created_at DESC',
      [userId, moduleId]
    );
    
    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

module.exports = router;
