#!/usr/bin/env node
/**
 * Create or reset Kuopio video-shoot demo login (approved student, no teacher step).
 * Usage: node scripts/ensure-kuopio-demo-user.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../database/db');
const {
  KUOPIO_DEMO_EMAIL,
  KUOPIO_DEMO_DEFAULT_NAME
} = require('../config/demo-access');
const { resetKuopioDemoUserData } = require('../lib/reset-kuopio-demo-user-data');

const DEMO_PASSWORD = 'Kuopio2026!';

async function main() {
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE'
  );
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await pool.query(
    'SELECT id FROM users WHERE LOWER(TRIM(email)) = $1',
    [KUOPIO_DEMO_EMAIL]
  );

  if (existing.rows.length) {
    await pool.query(
      `UPDATE users SET password_hash = $1, name = COALESCE(NULLIF(TRIM(name), ''), $2),
       is_approved = TRUE, is_active = TRUE, is_admin = FALSE WHERE id = $3`,
      [hash, KUOPIO_DEMO_DEFAULT_NAME, existing.rows[0].id]
    );
    await resetKuopioDemoUserData(existing.rows[0].id);
    console.log('Updated Kuopio demo user:', KUOPIO_DEMO_EMAIL);
    console.log('Cleared saved progress, inputs, and test data.');
  } else {
    await pool.query(
      `INSERT INTO users (email, password_hash, name, is_approved, is_active, is_admin)
       VALUES ($1, $2, $3, TRUE, TRUE, FALSE)`,
      [KUOPIO_DEMO_EMAIL, hash, KUOPIO_DEMO_DEFAULT_NAME]
    );
    console.log('Created Kuopio demo user:', KUOPIO_DEMO_EMAIL);
  }

  console.log('Login: https://aipolku.duunijobs.fi/login');
  console.log('Email:', KUOPIO_DEMO_EMAIL);
  console.log('Password:', DEMO_PASSWORD);
  console.log('Name:', KUOPIO_DEMO_DEFAULT_NAME);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
