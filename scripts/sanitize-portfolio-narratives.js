#!/usr/bin/env node
/**
 * One-off: clean bio/career_summary overlap for all student portfolios.
 * Usage: node scripts/sanitize-portfolio-narratives.js
 */
require('dotenv').config();
const pool = require('../database/db');
const { sanitizePortfolioNarratives } = require('../lib/portfolio-text-dedupe');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }
  const r = await pool.query(
    `SELECT user_id, slug, bio, career_summary FROM student_portfolios ORDER BY updated_at DESC`
  );
  let updated = 0;
  for (const row of r.rows) {
    const clean = sanitizePortfolioNarratives({
      bio: row.bio,
      career_summary: row.career_summary
    });
    const bioChanged = String(clean.bio || '') !== String(row.bio || '');
    const csChanged = String(clean.career_summary || '') !== String(row.career_summary || '');
    if (!bioChanged && !csChanged) continue;
    await pool.query(
      `UPDATE student_portfolios SET bio=$2, career_summary=$3, updated_at=CURRENT_TIMESTAMP WHERE user_id=$1`,
      [row.user_id, clean.bio || null, clean.career_summary || null]
    );
    updated += 1;
    console.log('✓', row.slug, bioChanged ? 'bio cleaned' : '', csChanged ? 'cs cleaned' : '');
  }
  console.log('\nDone —', updated, 'of', r.rows.length, 'portfolios updated');
  await pool.end().catch(() => {});
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
