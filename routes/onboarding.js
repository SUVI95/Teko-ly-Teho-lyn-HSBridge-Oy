const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

async function ensureUserOnboardingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_onboarding (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employment_status VARCHAR(120) NOT NULL,
      profession VARCHAR(500) NOT NULL,
      biggest_challenge TEXT NOT NULL,
      current_task TEXT,
      ai_experience VARCHAR(120) NOT NULL,
      known_ai_tools TEXT,
      ai_goals TEXT NOT NULL,
      ai_confidence VARCHAR(120),
      desired_outcome TEXT,
      recommended_tool VARCHAR(120),
      ai_feeling VARCHAR(200) NOT NULL,
      ai_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    )
  `);
  await pool.query(`ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS current_task TEXT`);
  await pool.query(`ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS known_ai_tools TEXT`);
  await pool.query(`ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS ai_confidence VARCHAR(120)`);
  await pool.query(`ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS desired_outcome TEXT`);
  await pool.query(`ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS recommended_tool VARCHAR(120)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_onboarding_created ON user_onboarding(created_at)`);
}

router.get('/status', authenticateToken, async (req, res) => {
  try {
    await ensureUserOnboardingTable();
    const result = await pool.query(
      `SELECT id, employment_status, profession, biggest_challenge, current_task, ai_experience, known_ai_tools,
              ai_goals, ai_confidence, desired_outcome, recommended_tool, ai_feeling, ai_summary, created_at
       FROM user_onboarding WHERE user_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ completed: false });
    }
    res.json({ completed: true, onboarding: result.rows[0] });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({ error: 'Failed to load onboarding status' });
  }
});

router.post('/complete', authenticateToken, async (req, res) => {
  try {
    await ensureUserOnboardingTable();
    const existing = await pool.query('SELECT id FROM user_onboarding WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Onboarding already completed' });
    }

    const {
      employment_status,
      profession,
      biggest_challenge,
      current_task,
      ai_experience,
      known_ai_tools,
      ai_goals,
      ai_confidence,
      desired_outcome,
      recommended_tool,
      ai_feeling,
      ai_summary
    } = req.body;

    const goalsArr = Array.isArray(ai_goals) ? ai_goals : (ai_goals ? String(ai_goals).split(',').map(s => s.trim()).filter(Boolean) : []);
    const toolsArr = Array.isArray(known_ai_tools) ? known_ai_tools : (known_ai_tools ? String(known_ai_tools).split(',').map(s => s.trim()).filter(Boolean) : []);
    if (!employment_status || !profession || !biggest_challenge || !current_task || !ai_experience || goalsArr.length === 0 || !ai_confidence || !desired_outcome || !ai_feeling) {
      return res.status(400).json({ error: 'All onboarding fields are required' });
    }

    const goalsStr = goalsArr.join(', ');
    const toolsStr = toolsArr.join(', ');

    const result = await pool.query(
      `INSERT INTO user_onboarding (
        user_id, employment_status, profession, biggest_challenge, current_task, ai_experience, known_ai_tools,
        ai_goals, ai_confidence, desired_outcome, recommended_tool, ai_feeling, ai_summary
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at`,
      [
        req.user.id,
        String(employment_status).slice(0, 120),
        String(profession).slice(0, 500),
        String(biggest_challenge),
        String(current_task),
        String(ai_experience).slice(0, 120),
        String(toolsStr).slice(0, 2000),
        String(goalsStr).slice(0, 2000),
        String(ai_confidence).slice(0, 120),
        String(desired_outcome),
        recommended_tool != null ? String(recommended_tool).slice(0, 120) : null,
        String(ai_feeling).slice(0, 200),
        ai_summary != null ? String(ai_summary) : null
      ]
    );

    res.json({ success: true, id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    res.status(500).json({ error: 'Failed to save onboarding' });
  }
});

module.exports = router;
module.exports.ensureUserOnboardingTable = ensureUserOnboardingTable;
