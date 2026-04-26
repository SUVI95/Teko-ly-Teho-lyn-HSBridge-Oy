const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const onboardingModule = require('./onboarding');
const { ensureCourtTables } = require('./tuomioistuin');
const { ensureToolBuilderTables } = require('./tyokalurakentaja');

const router = express.Router();

// Middleware to check if user is admin
async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

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

async function ensureCourseStartProfilesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_start_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_name VARCHAR(120) NOT NULL,
      ai_experience_level VARCHAR(120),
      tools_known JSONB DEFAULT '[]'::jsonb,
      wants_to_learn JSONB DEFAULT '[]'::jsonb,
      biggest_worry TEXT,
      personal_goal TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
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
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE'); } catch(e) {}
    const result = await pool.query(`
      SELECT id, email, name, created_at, last_login, is_active, is_admin, COALESCE(is_approved, FALSE) as is_approved
      FROM users
      WHERE is_admin = FALSE
      ORDER BY created_at DESC
    `);
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Approve a student
router.post('/users/:userId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_approved = TRUE WHERE id = $1 AND is_admin = FALSE', [userId]);
    res.json({ success: true, message: 'Student approved' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// Revoke access for a student
router.post('/users/:userId/revoke', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('UPDATE users SET is_approved = FALSE WHERE id = $1 AND is_admin = FALSE', [userId]);
    res.json({ success: true, message: 'Student access revoked' });
  } catch (error) {
    console.error('Revoke user error:', error);
    res.status(500).json({ error: 'Failed to revoke user' });
  }
});

// Approve all existing students (one-time bulk approve)
router.post('/users/approve-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('UPDATE users SET is_approved = TRUE WHERE is_admin = FALSE RETURNING id');
    res.json({ success: true, message: `Approved ${result.rowCount} students` });
  } catch (error) {
    console.error('Approve all error:', error);
    res.status(500).json({ error: 'Failed to approve all' });
  }
});

// Get student progress summary
router.get('/students/progress', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.created_at,
        u.last_login,
        COALESCE(u.is_approved, FALSE) as is_approved,
        COUNT(DISTINCT sp.module_id) as modules_accessed,
        COUNT(DISTINCT CASE WHEN sp.completed THEN sp.module_id END) as modules_completed,
        COUNT(DISTINCT sp.section_id) as sections_accessed,
        COUNT(DISTINCT CASE WHEN sp.completed THEN sp.section_id END) as sections_completed,
        COUNT(DISTINCT ci.item_id) as checklist_items_completed,
        SUM(sp.time_spent) as total_time_spent
      FROM users u
      LEFT JOIN student_progress sp ON u.id = sp.user_id
      LEFT JOIN checklist_items ci ON u.id = ci.user_id AND ci.completed = TRUE
      WHERE u.is_admin = FALSE
      GROUP BY u.id, u.email, u.name, u.created_at, u.last_login, u.is_approved
      ORDER BY u.created_at DESC
    `);
    
    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get student progress error:', error);
    res.status(500).json({ error: 'Failed to get student progress' });
  }
});

// Get all data for a specific student
router.get('/students/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user info
    const userResult = await pool.query('SELECT id, email, name, created_at, last_login FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get reflections
    const reflectionsResult = await pool.query(`
      SELECT module_id, reflection_text, created_at, updated_at
      FROM reflections
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get feedback
    const feedbackResult = await pool.query(`
      SELECT module_id, question_type, feedback_text, rating, created_at
      FROM feedback
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get closing actions
    const closingActionsResult = await pool.query(`
      SELECT action_text, created_at
      FROM closing_actions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    
    // Get progress
    const progressResult = await pool.query(`
      SELECT module_id, section_id, completed, time_spent, last_accessed
      FROM student_progress
      WHERE user_id = $1
      ORDER BY last_accessed DESC
    `, [userId]);
    
    // Get checklist items
    const checklistResult = await pool.query(`
      SELECT module_id, item_id, completed, completed_at
      FROM checklist_items
      WHERE user_id = $1
      ORDER BY completed_at DESC
    `, [userId]);
    
    // Get GDPR consent
    let consent = null;
    try {
      const consentResult = await pool.query(`
        SELECT consent_given, consent_type, consent_text, ip_address, created_at
        FROM gdpr_consent
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);
      if (consentResult.rows.length > 0) {
        consent = consentResult.rows[0];
      }
    } catch (e) {
      // gdpr_consent table might not exist
    }

    let courtSubmission = null;
    let toolBuilderSubmission = null;
    try {
      await ensureCourtTables();
      const courtR = await pool.query(
        `SELECT id, scenario_selected, perplexity_findings, manus_url, canva_image_path,
                followup_q1, followup_q2, followup_q3, followup_a1, followup_a2, followup_a3,
                ai_observation, completed_at, created_at
         FROM court_submissions WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      courtSubmission = courtR.rows[0] || null;
    } catch (e) {
      console.error('court_submissions in student detail:', e.message);
    }

    try {
      await ensureToolBuilderTables();
      const tbR = await pool.query(
        `SELECT id, problem_description, field_role, field_input, field_structure, field_constraints,
                field_edge_cases, system_prompt_raw, system_prompt_v1, system_prompt_v2,
                weaknesses_text, prompt_versions, chat_history, ai_verdict, verdict_generated_at,
                test_inputs, test_outputs, reflection_text, tool_name, one_sentence_description,
                pitch_text, gamma_url, canva_card_path, final_insight, completed_at, created_at
         FROM tool_builder_submissions WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      toolBuilderSubmission = tbR.rows[0] || null;
    } catch (e) {
      console.error('tool_builder_submissions in student detail:', e.message);
    }

    res.json({
      user,
      reflections: reflectionsResult.rows,
      feedback: feedbackResult.rows,
      closingActions: closingActionsResult.rows,
      progress: progressResult.rows,
      checklist: checklistResult.rows,
      consent,
      courtSubmission,
      toolBuilderSubmission
    });
  } catch (error) {
    console.error('Get student data error:', error);
    res.status(500).json({ error: 'Failed to get student data' });
  }
});

// Admin — Tekoäly tuomioistuimessa: kaikki lähetykset (viimeisimmät ensin)
router.get('/court-module-submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureCourtTables();
    const r = await pool.query(
      `SELECT c.id, c.user_id, c.scenario_selected, c.perplexity_findings, c.manus_url, c.canva_image_path,
              c.followup_q1, c.followup_q2, c.followup_q3, c.followup_a1, c.followup_a2, c.followup_a3,
              c.ai_observation, c.completed_at, c.created_at,
              COALESCE(u.name, u.email) AS user_label, u.email AS user_email
       FROM court_submissions c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.created_at DESC
       LIMIT 500`
    );
    res.json({ submissions: r.rows });
  } catch (e) {
    console.error('admin court-module-submissions:', e);
    res.status(500).json({ error: 'Failed to list court submissions' });
  }
});

// Admin — Rakenna oma AI-työkalu: kaikki lähetykset
router.get('/tool-builder-submissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureToolBuilderTables();
    const r = await pool.query(
      `SELECT t.id, t.user_id, t.problem_description, t.field_role, t.field_input, t.field_structure,
              t.field_constraints, t.field_edge_cases, t.system_prompt_raw, t.system_prompt_v1, t.system_prompt_v2,
              t.weaknesses_text, t.prompt_versions, t.chat_history, t.ai_verdict, t.verdict_generated_at,
              t.test_inputs, t.test_outputs, t.reflection_text, t.tool_name, t.one_sentence_description,
              t.pitch_text, t.gamma_url, t.canva_card_path, t.final_insight, t.completed_at, t.created_at,
              COALESCE(u.name, u.email) AS user_label, u.email AS user_email
       FROM tool_builder_submissions t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT 500`
    );
    res.json({ submissions: r.rows });
  } catch (e) {
    console.error('admin tool-builder-submissions:', e);
    res.status(500).json({ error: 'Failed to list tool builder submissions' });
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

// Get structured module reflections with filters
router.get('/module-reflections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureModuleReflectionsTable();
    const { module, from, to } = req.query;
    const params = [];
    const where = [];

    if (module) {
      params.push(module);
      where.push(`mr.module_name = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`mr.created_at::date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      where.push(`mr.created_at::date <= $${params.length}::date`);
    }

    const sql = `
      SELECT mr.id, mr.module_name, mr.mood_emoji, mr.use_cases, mr.apply_where, mr.tool_choice,
             mr.misconception_had, mr.open_reflection, mr.helpfulness_rating, mr.quiz_score, mr.created_at,
             u.id AS user_id, u.name, u.email
      FROM module_reflections mr
      JOIN users u ON u.id = mr.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY mr.created_at DESC
      LIMIT 500
    `;

    const result = await pool.query(sql, params);
    res.json({ moduleReflections: result.rows });
  } catch (error) {
    console.error('Get module reflections error:', error);
    res.status(500).json({ error: 'Failed to get module reflections' });
  }
});

function topKeyFromCounts(map) {
  let best = null;
  let n = 0;
  Object.keys(map).forEach((k) => {
    if (map[k] > n) {
      n = map[k];
      best = k;
    }
  });
  return best;
}

// Needs-mapping onboarding profiles (pre-module questionnaire)
router.get('/onboarding-profiles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await onboardingModule.ensureUserOnboardingTable();
    const result = await pool.query(`
      SELECT o.id, o.user_id, o.employment_status, o.profession, o.biggest_challenge, o.current_task,
             o.ai_experience, o.known_ai_tools, o.ai_goals, o.ai_confidence, o.desired_outcome,
             o.recommended_tool, o.ai_feeling, o.ai_summary, o.created_at,
             u.name, u.email
      FROM user_onboarding o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);
    const rows = result.rows;
    const empMap = {};
    const goalCounts = {};
    const feelMap = {};
    rows.forEach((r) => {
      empMap[r.employment_status] = (empMap[r.employment_status] || 0) + 1;
      feelMap[r.ai_feeling] = (feelMap[r.ai_feeling] || 0) + 1;
      String(r.ai_goals || '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
        .forEach((t) => {
          goalCounts[t] = (goalCounts[t] || 0) + 1;
        });
    });
    res.json({
      profiles: rows,
      stats: {
        total: rows.length,
        mostCommonEmployment: topKeyFromCounts(empMap) || '—',
        mostCommonGoal: topKeyFromCounts(goalCounts) || '—',
        mostCommonFeeling: topKeyFromCounts(feelMap) || '—',
      },
    });
  } catch (error) {
    console.error('Onboarding profiles error:', error);
    res.status(500).json({ error: 'Failed to load onboarding profiles' });
  }
});

// Get course start profiles (module 2 "Kerro meille sinusta")
router.get('/course-start-profiles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureCourseStartProfilesTable();
    const result = await pool.query(`
      SELECT csp.id, csp.module_name, csp.ai_experience_level, csp.tools_known, csp.wants_to_learn,
             csp.biggest_worry, csp.personal_goal, csp.created_at,
             u.id AS user_id, u.name, u.email
      FROM course_start_profiles csp
      JOIN users u ON u.id = csp.user_id
      ORDER BY csp.created_at DESC
      LIMIT 500
    `);
    res.json({ courseStartProfiles: result.rows });
  } catch (error) {
    console.error('Get course start profiles error:', error);
    res.status(500).json({ error: 'Failed to get course start profiles' });
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
      const moduleLabel = row.module_id === 'home' ? 'Koko kurssi' : (row.module_id || '');
    const questionType = row.question_type === 'what_learned' ? 'What Learned' :
                          row.question_type === 'learned_new' ? 'Learned New' :
                          row.question_type === 'course_feedback' ? 'Course Feedback' :
                          row.question_type === 'module_feedback' ? 'Module Feedback' :
                          row.question_type === 'voice_deep_search_reflection' ? 'Voice & Deep Search Reflection' : row.question_type;
      return `"${moduleLabel}","${questionType}","${row.email}","${row.name || ''}","${text}","${row.rating || ''}","${row.created_at}"`;
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

// Download onboarding profiles as CSV
router.get('/download/onboarding', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await onboardingModule.ensureUserOnboardingTable();
    const result = await pool.query(`
      SELECT o.employment_status, o.profession, o.biggest_challenge, o.current_task, o.ai_experience,
             o.known_ai_tools, o.ai_goals, o.ai_confidence, o.desired_outcome, o.recommended_tool,
             o.ai_feeling, o.ai_summary, o.created_at, u.email, u.name
      FROM user_onboarding o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);
    const csvHeader =
      'Email,Name,Employment Status,Profession,Biggest Challenge,Current Task,AI Experience,Known AI Tools,AI Goals,AI Confidence,Desired Outcome,Recommended Tool,AI Feeling,AI Summary,Created At\n';
    const esc = (s) => String(s ?? '').replace(/"/g, '""').replace(/\n/g, ' ');
    const csvRows = result.rows
      .map(
        (row) =>
          `"${esc(row.email)}","${esc(row.name)}","${esc(row.employment_status)}","${esc(
            row.profession
          )}","${esc(row.biggest_challenge)}","${esc(row.current_task)}","${esc(row.ai_experience)}","${esc(
            row.known_ai_tools
          )}","${esc(row.ai_goals)}","${esc(row.ai_confidence)}","${esc(row.desired_outcome)}","${esc(
            row.recommended_tool
          )}","${esc(row.ai_feeling)}","${esc(row.ai_summary)}","${row.created_at}"`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="onboarding-profiles-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send('\ufeff' + csvHeader + csvRows);
  } catch (error) {
    console.error('Download onboarding error:', error);
    res.status(500).json({ error: 'Failed to download onboarding data' });
  }
});

// Download consent as CSV
router.get('/download/consent', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gc.consent_given, gc.consent_type, gc.consent_text, gc.ip_address, gc.created_at,
             u.email, u.name
      FROM gdpr_consent gc
      JOIN users u ON gc.user_id = u.id
      ORDER BY gc.created_at DESC
    `);
    
    const csvHeader = 'Email,Name,Consent Given,Consent Type,Consent Text,IP Address,Created At\n';
    const csvRows = result.rows.map(row => {
      const text = (row.consent_text || '').replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${row.email}","${row.name || ''}","${row.consent_given}","${row.consent_type || ''}","${text}","${row.ip_address || ''}","${row.created_at}"`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="consent-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    console.error('Download consent error:', error);
    res.status(500).json({ error: 'Failed to download consent' });
  }
});

module.exports = router;
