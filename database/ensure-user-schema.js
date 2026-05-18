const pool = require('./db');

let ensured = false;

/** Idempotent — safe on every login (incl. Vercel cold starts). */
async function ensureUserSchema() {
  if (ensured) return;
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE'
  );
  ensured = true;
}

module.exports = { ensureUserSchema };
