const express = require('express');
const pool = require('../database/db');

const router = express.Router();

const MODULE_WORK_IDS = [
  'moduuli5-ai-creation-sprint__work',
  'moduuli8-ai-polku__work',
  'moduuli9-haastattelu__work',
  'moduuli-ai-musiikkituottaja__work'
];

async function resolveUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  const token = req.cookies && req.cookies.session_token;
  if (!token) return null;
  try {
    const session = await pool.query(
      `SELECT u.id FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE`,
      [token]
    );
    return session.rows.length ? session.rows[0].id : null;
  } catch (e) {
    return null;
  }
}

function parseModuleWorkRow(row) {
  if (!row || !row.reflection_text) return null;
  let parsed;
  try {
    parsed = JSON.parse(row.reflection_text);
  } catch (e) {
    return null;
  }
  const data = parsed && parsed.data !== undefined ? parsed.data : parsed;
  if (!data || typeof data !== 'object') return null;
  const moduleId = String(row.module_id || '').replace(/__work$/, '');
  const curScreen = Math.max(1, Number(data.curScreen) || 1);
  return {
    module_id: row.module_id,
    base_module_id: moduleId,
    cur_screen: curScreen,
    summary: parsed.summary || '',
    updated_at: row.updated_at,
    finished: !!(data.shown && data.shown.finished)
  };
}

// Get progress for a module (optional - works without auth)
router.get('/module/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user?.id;
    
    // If no user, return empty progress
    if (!userId) {
      return res.json({ progress: [], checklist: [] });
    }
    
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
    // Return empty progress instead of error to prevent blocking
    res.json({
      progress: [],
      checklist: []
    });
  }
});

// Update progress for a section (optional - works without auth)
router.post('/module/:moduleId/section/:sectionId', async (req, res) => {
  try {
    const { moduleId, sectionId } = req.params;
    const { completed, progressData, timeSpent } = req.body;
    const userId = await resolveUserId(req);
    
    // If no user, just return success (progress won't be saved)
    if (!userId) {
      return res.json({ success: true, progress: null });
    }
    
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
    // Return success even on error to prevent blocking user experience
    res.json({ success: true, progress: null });
  }
});

// Mark checklist item as complete (optional - works without auth)
router.post('/module/:moduleId/checklist/:itemId', async (req, res) => {
  try {
    const { moduleId, itemId } = req.params;
    const { completed } = req.body;
    const userId = await resolveUserId(req);
    
    // If no user, just return success (checklist won't be saved)
    if (!userId) {
      return res.json({ success: true, item: null });
    }
    
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
    // Return success even on error to prevent blocking user experience
    res.json({ success: true, item: null });
  }
});

// Get all user progress summary (optional — resolves user from session cookie)
router.get('/summary', async (req, res) => {
  try {
    const userId = await resolveUserId(req);

    if (!userId) {
      return res.json({ modules: [], checklists: [], module_work: [] });
    }

    let modules = [];
    let checklists = [];
    let module_work = [];

    try {
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
      modules = progressResult.rows;
    } catch (e) {
      console.warn('Get summary: student_progress unavailable:', e.message);
    }

    try {
      const checklistResult = await pool.query(
        `SELECT module_id,
                COUNT(*) as total_items,
                SUM(CASE WHEN completed THEN 1 ELSE 0 END) as completed_items
         FROM checklist_items
         WHERE user_id = $1
         GROUP BY module_id`,
        [userId]
      );
      checklists = checklistResult.rows;
    } catch (e) {
      console.warn('Get summary: checklist_items unavailable:', e.message);
    }

    try {
      const workResult = await pool.query(
        `SELECT module_id, reflection_text, updated_at
         FROM reflections
         WHERE user_id = $1 AND module_id = ANY($2::text[])`,
        [userId, MODULE_WORK_IDS]
      );
      module_work = workResult.rows.map(parseModuleWorkRow).filter(Boolean);
    } catch (e) {
      console.warn('Get summary: module_work unavailable:', e.message);
    }

    res.json({ modules, checklists, module_work });
  } catch (error) {
    console.error('Get summary error:', error);
    res.json({
      modules: [],
      checklists: [],
      module_work: []
    });
  }
});

// Save module work data (CV builder, etc.) — resolves user from cookie
router.post('/workdata/:moduleId', async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (!token) return res.json({ success: false, reason: 'no_auth' });

    const session = await pool.query(
      'SELECT u.id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE',
      [token]
    );
    if (!session.rows.length) return res.json({ success: false, reason: 'no_auth' });

    const userId = session.rows[0].id;
    const { moduleId } = req.params;
    const { data } = req.body;
    if (!data) return res.status(400).json({ success: false, reason: 'no_data' });

    await pool.query(
      `INSERT INTO student_progress (user_id, module_id, section_id, completed, progress_data, time_spent, last_accessed)
       VALUES ($1, $2, '_workdata', FALSE, $3, 0, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, module_id, section_id)
       DO UPDATE SET progress_data = $3, last_accessed = CURRENT_TIMESTAMP`,
      [userId, moduleId, JSON.stringify(data)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Save workdata error:', error);
    res.json({ success: false });
  }
});

// Load module work data — resolves user from cookie
router.get('/workdata/:moduleId', async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (!token) return res.json({ data: null });

    const session = await pool.query(
      'SELECT u.id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.is_active = TRUE',
      [token]
    );
    if (!session.rows.length) return res.json({ data: null });

    const userId = session.rows[0].id;
    const { moduleId } = req.params;

    const result = await pool.query(
      `SELECT progress_data FROM student_progress WHERE user_id = $1 AND module_id = $2 AND section_id = '_workdata'`,
      [userId, moduleId]
    );

    res.json({ data: result.rows[0]?.progress_data || null });
  } catch (error) {
    console.error('Load workdata error:', error);
    res.json({ data: null });
  }
});

module.exports = router;
