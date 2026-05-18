/**
 * Wipe all saved progress, form inputs, and submissions for the Kuopio video-shoot demo account.
 */
const pool = require('../database/db');

const USER_DATA_TABLES = [
  'student_progress',
  'checklist_items',
  'reflections',
  'closing_actions',
  'feedback',
  'gdpr_consent',
  'user_onboarding',
  'final_module_reflections',
  'final_module_automations',
  'final_module_gallery',
  'mythology_submissions',
  'broken_prompt_submissions',
  'final_module_capstone',
  'student_portfolios',
  'court_submissions',
  'tool_builder_submissions',
  'module_reflections',
  'course_start_profiles',
  'course_feedback'
];

async function deleteUserRows(table, userId, client) {
  const q = client || pool;
  try {
    await q.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    return true;
  } catch (err) {
    if (err.code === '42P01') return false;
    throw err;
  }
}

async function resetKuopioDemoUserData(userId) {
  if (!userId) return { ok: false, reason: 'no_user' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of USER_DATA_TABLES) {
      await deleteUserRows(table, userId, client);
    }
    await client.query('COMMIT');
    return { ok: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { resetKuopioDemoUserData, USER_DATA_TABLES };
