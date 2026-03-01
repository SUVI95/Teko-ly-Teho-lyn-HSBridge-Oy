const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function ensureModuleReflectionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS module_reflections (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_name VARCHAR(120) NOT NULL,
      mood_emoji VARCHAR(32),
      use_cases JSONB DEFAULT '[]'::jsonb,
      apply_where JSONB DEFAULT '[]'::jsonb,
      tool_choice VARCHAR(64),
      misconception_had TEXT,
      open_reflection TEXT,
      helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
      quiz_score INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`ALTER TABLE module_reflections ADD COLUMN IF NOT EXISTS apply_where JSONB DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE module_reflections ADD COLUMN IF NOT EXISTS misconception_had TEXT`);
  await pool.query(`ALTER TABLE module_reflections ADD COLUMN IF NOT EXISTS quiz_score INTEGER`);
}

// Save feedback
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { moduleId, questionType, feedbackText, rating } = req.body;
    const userId = req.user.id;
    
    if (!questionType) {
      return res.status(400).json({ error: 'Question type is required' });
    }
    
    // Validate question types
    const validTypes = ['what_learned', 'learned_new', 'course_feedback', 'module_feedback'];
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

// Save structured module reflection flow answers
router.post('/module-reflection', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      module_name,
      mood_emoji,
      use_cases,
      apply_where,
      tool_choice,
      misconception_had,
      open_reflection,
      helpfulness_rating,
      quiz_score
    } = req.body || {};

    if (!module_name) {
      return res.status(400).json({ error: 'module_name is required' });
    }

    await ensureModuleReflectionsTable();

    const safeUseCases = Array.isArray(use_cases) ? use_cases : [];
    const safeApplyWhere = Array.isArray(apply_where) ? apply_where : [];
    const safeRating = helpfulness_rating ? parseInt(helpfulness_rating, 10) : null;
    const safeQuizScore = Number.isFinite(Number(quiz_score)) ? Number(quiz_score) : null;

    await pool.query(
      `INSERT INTO module_reflections
      (user_id, module_name, mood_emoji, use_cases, apply_where, tool_choice, misconception_had, open_reflection, helpfulness_rating, quiz_score)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10)`,
      [
        userId,
        module_name,
        mood_emoji || null,
        JSON.stringify(safeUseCases),
        JSON.stringify(safeApplyWhere),
        tool_choice || null,
        misconception_had || null,
        open_reflection || null,
        safeRating,
        safeQuizScore
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save module reflection error:', error);
    res.status(500).json({ error: 'Failed to save module reflection' });
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
