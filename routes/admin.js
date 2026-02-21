const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is admin
async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Get all reflections
router.get('/reflections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.module_id, r.reflection_text, r.created_at, r.updated_at,
             u.id as user_id, u.email, u.name
      FROM reflections r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    
    res.json({ reflections: result.rows });
  } catch (error) {
    console.error('Get reflections error:', error);
    res.status(500).json({ error: 'Failed to get reflections' });
  }
});

// Get all closing actions
router.get('/closing-actions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ca.id, ca.action_text, ca.created_at,
             u.id as user_id, u.email, u.name
      FROM closing_actions ca
      JOIN users u ON ca.user_id = u.id
      ORDER BY ca.created_at DESC
    `);
    
    res.json({ closingActions: result.rows });
  } catch (error) {
    console.error('Get closing actions error:', error);
    res.status(500).json({ error: 'Failed to get closing actions' });
  }
});

// Get all users
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, name, created_at, last_login, is_active, is_admin
      FROM users
      ORDER BY created_at DESC
    `);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get all feedback
router.get('/feedback', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.module_id, f.question_type, f.feedback_text, f.rating, f.created_at,
             u.id as user_id, u.email, u.name
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    
    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [usersCount, reflectionsCount, closingActionsCount, feedbackCount, recentReflections] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM reflections'),
      pool.query('SELECT COUNT(*) as count FROM closing_actions'),
      pool.query('SELECT COUNT(*) as count FROM feedback'),
      pool.query(`
        SELECT r.module_id, COUNT(*) as count
        FROM reflections r
        GROUP BY r.module_id
        ORDER BY count DESC
      `)
    ]);
    
    res.json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalReflections: parseInt(reflectionsCount.rows[0].count),
      totalClosingActions: parseInt(closingActionsCount.rows[0].count),
      totalFeedback: parseInt(feedbackCount.rows[0].count),
      reflectionsByModule: recentReflections.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Download feedback as CSV
router.get('/download/feedback', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.module_id, f.question_type, f.feedback_text, f.rating, f.created_at,
             u.email, u.name
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `);
    
    // Convert to CSV
    const csvHeader = 'Module ID,Question Type,Email,Name,Feedback Text,Rating,Created At\n';
    const csvRows = result.rows.map(row => {
      const text = (row.feedback_text || '').replace(/"/g, '""').replace(/\n/g, ' ');
      const questionType = row.question_type === 'what_learned' ? 'What Learned' :
                          row.question_type === 'learned_new' ? 'Learned New' :
                          row.question_type === 'course_feedback' ? 'Course Feedback' : row.question_type;
      return `"${row.module_id || ''}","${questionType}","${row.email}","${row.name || ''}","${text}","${row.rating || ''}","${row.created_at}"`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="feedback-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Download feedback error:', error);
    res.status(500).json({ error: 'Failed to download feedback' });
  }
});

// Download reflections as CSV
router.get('/download/reflections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.module_id, r.reflection_text, r.created_at, r.updated_at,
             u.email, u.name
      FROM reflections r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `);
    
    // Convert to CSV
    const csvHeader = 'Module ID,Email,Name,Reflection Text,Created At,Updated At\n';
    const csvRows = result.rows.map(row => {
      const text = (row.reflection_text || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${row.module_id}","${row.email}","${row.name || ''}","${text}","${row.created_at}","${row.updated_at}"`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reflections-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Download reflections error:', error);
    res.status(500).json({ error: 'Failed to download reflections' });
  }
});

// Download closing actions as CSV
router.get('/download/closing-actions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ca.action_text, ca.created_at,
             u.email, u.name
      FROM closing_actions ca
      JOIN users u ON ca.user_id = u.id
      ORDER BY ca.created_at DESC
    `);
    
    // Convert to CSV
    const csvHeader = 'Email,Name,Action Text,Created At\n';
    const csvRows = result.rows.map(row => {
      const text = (row.action_text || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${row.email}","${row.name || ''}","${text}","${row.created_at}"`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="closing-actions-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    console.error('Download closing actions error:', error);
    res.status(500).json({ error: 'Failed to download closing actions' });
  }
});

module.exports = router;
