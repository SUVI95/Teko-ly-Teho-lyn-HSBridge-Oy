const express = require('express');
const pool = require('../database/db');

const router = express.Router();

// Get progress for a module
router.get('/module/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM student_progress WHERE user_id = $1 AND module_id = $2 ORDER BY last_accessed DESC',
      [userId, moduleId]
    );
    
    // Get checklist items
    const checklistResult = await pool.query(
      'SELECT * FROM checklist_items WHERE user_id = $1 AND module_id = $2',
      [userId, moduleId]
    );
    
    res.json({
      progress: result.rows,
      checklist: checklistResult.rows
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

// Update progress for a section
router.post('/module/:moduleId/section/:sectionId', async (req, res) => {
  try {
    const { moduleId, sectionId } = req.params;
    const { completed, progressData, timeSpent } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO student_progress (user_id, module_id, section_id, completed, progress_data, time_spent, last_accessed)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, module_id, section_id)
       DO UPDATE SET
         completed = EXCLUDED.completed,
         progress_data = EXCLUDED.progress_data,
         time_spent = student_progress.time_spent + EXCLUDED.time_spent,
         last_accessed = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, moduleId, sectionId, completed || false, JSON.stringify(progressData || {}), timeSpent || 0]
    );
    
    res.json({ success: true, progress: result.rows[0] });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Mark checklist item as complete
router.post('/module/:moduleId/checklist/:itemId', async (req, res) => {
  try {
    const { moduleId, itemId } = req.params;
    const { completed } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      `INSERT INTO checklist_items (user_id, module_id, item_id, completed, completed_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE NULL END)
       ON CONFLICT (user_id, module_id, item_id)
       DO UPDATE SET
         completed = EXCLUDED.completed,
         completed_at = CASE WHEN EXCLUDED.completed THEN CURRENT_TIMESTAMP ELSE NULL END
       RETURNING *`,
      [userId, moduleId, itemId, completed || false]
    );
    
    res.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// Get all user progress summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const progressResult = await pool.query(
      `SELECT module_id, 
              COUNT(*) as total_sections,
              SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_sections,
              SUM(time_spent) as total_time_spent
       FROM student_progress
       WHERE user_id = $1
       GROUP BY module_id`,
      [userId]
    );
    
    const checklistResult = await pool.query(
      `SELECT module_id,
              COUNT(*) as total_items,
              SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_items
       FROM checklist_items
       WHERE user_id = $1
       GROUP BY module_id`,
      [userId]
    );
    
    res.json({
      modules: progressResult.rows,
      checklists: checklistResult.rows
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;
