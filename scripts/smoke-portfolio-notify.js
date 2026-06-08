#!/usr/bin/env node
/**
 * Smoke test portfolio visit + contact email notifications.
 * Usage:
 *   node scripts/smoke-portfolio-notify.js
 *   node scripts/smoke-portfolio-notify.js --slug suvi-soppinen --send
 */
require('dotenv').config();

const pool = require('../database/db');
const { sendEmail } = require('../lib/send-email');
const { notifyContact, notifyVisit, isDeliverableEmail, notifyEmailFor } = require('../lib/portfolio-notify');

const args = process.argv.slice(2);
const slugArg = args.find((a, i) => args[i - 1] === '--slug') || process.env.SMOKE_PORTFOLIO_SLUG || 'suvi-soppinen';
const doSend = args.includes('--send');
const dryRun = args.includes('--dry-run');

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log('  ✓', label);
}

function fail(label, detail) {
  failed += 1;
  console.error('  ✗', label, detail ? '— ' + detail : '');
}

function maskEmail(email) {
  const e = String(email || '');
  const i = e.indexOf('@');
  if (i < 1) return e || '(none)';
  return e[0] + '***' + e.slice(i);
}

async function checkEnv() {
  console.log('\nEnvironment');
  const key = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.EMAIL_FROM || '').trim() || 'DuuniJobs Portfolio <portfolio@duunijobs.fi>';
  if (key) ok('RESEND_API_KEY is set (' + key.slice(0, 6) + '…)');
  else fail('RESEND_API_KEY is set', 'missing — emails are stubbed and NOT sent');
  console.log('  EMAIL_FROM:', from);
  if (process.env.DATABASE_URL) ok('DATABASE_URL is set');
  else fail('DATABASE_URL is set', 'skipped DB checks');

  console.log('\nEmail routing rules');
  if (isDeliverableEmail('suvi@duunijobs.com')) ok('real email accepted');
  if (!isDeliverableEmail('testi.opiskelija@example.com')) ok('@example.com login skipped');
  const routed = notifyEmailFor({
    account_email: 'testi.opiskelija@example.com',
    email_public: 'suvi@duunijobs.com'
  });
  if (routed === 'suvi@duunijobs.com') ok('falls back to email_public when login is @example.com');
  else fail('email fallback', 'got ' + routed);
}

async function checkPortfolio(slug) {
  console.log('\nPortfolio lookup (slug: ' + slug + ')');
  if (!process.env.DATABASE_URL) {
    console.log('  (skipped — no DATABASE_URL)');
    return null;
  }
  try {
    const r = await pool.query(
      `SELECT p.slug, p.full_name, p.published, u.email AS account_email, p.email_public
       FROM student_portfolios p
       JOIN users u ON p.user_id = u.id
       WHERE p.slug = $1`,
      [slug]
    );
    if (!r.rows.length) {
      fail('portfolio exists', 'no row for slug ' + slug);
      return null;
    }
    const row = r.rows[0];
    ok('portfolio exists: ' + (row.full_name || slug));
    if (row.published) ok('portfolio is published');
    else fail('portfolio is published', 'must be published for public contact form');
    const notifyTo = notifyEmailFor(row);
    if (notifyTo) ok('notification recipient: ' + maskEmail(notifyTo));
    else fail('notification recipient', 'no deliverable account_email or email_public');
    if (String(row.account_email || '').includes('@example.com') && notifyTo === String(row.email_public || '').trim()) {
      console.log('  ℹ login is @example.com — using portfolio public email for notifications');
    }
    const ev = await pool.query(
      `SELECT event_type, visitor_name, created_at FROM portfolio_events
       WHERE slug = $1 ORDER BY created_at DESC LIMIT 5`,
      [slug]
    );
    if (ev.rows.length) {
      console.log('  Recent events:');
      ev.rows.forEach((e) => {
        console.log('    ·', e.event_type, e.visitor_name || '', e.created_at);
      });
    } else {
      console.log('  (no portfolio_events yet for this slug)');
    }
    return row;
  } catch (e) {
    fail('DB query', e.message);
    return null;
  }
}

async function testSendEmailDirect(to) {
  console.log('\nDirect Resend send test →', maskEmail(to));
  if (dryRun) {
    console.log('  (dry-run — skipped)');
    return;
  }
  const r = await sendEmail({
    to,
    subject: '[SMOKE] DuuniJobs portfolio notification test',
    text: 'If you received this, Resend is working for portfolio notifications.',
    html: '<p>Portfolio notification smoke test — Resend OK.</p>'
  });
  if (r.stub) fail('direct send', 'RESEND_API_KEY missing (stub only)');
  else if (r.ok) ok('direct send accepted by Resend');
  else fail('direct send', r.error || 'failed');
}

async function testNotifyContact(slug) {
  console.log('\nContact notification flow (notifyContact)');
  if (dryRun) {
    console.log('  (dry-run — skipped live notifyContact)');
    return;
  }
  if (!doSend) {
    console.log('  (add --send to run live notifyContact — logs event + sends email)');
    return;
  }
  const r = await notifyContact(slug, {
    name: 'Smoke Test Rekrytoija',
    email: 'smoke-test@duunijobs.fi',
    message: 'Smoke test viesti — portfolio contact notification (' + new Date().toISOString() + ').'
  });
  if (r.ok) ok('notifyContact returned ok');
  else fail('notifyContact', r.error || 'failed');
}

async function testNotifyVisit(slug) {
  console.log('\nVisit notification flow (notifyVisit)');
  if (dryRun || !doSend) {
    console.log('  (skipped — use --send; visit emails debounced 24h per student)');
    return;
  }
  await notifyVisit(slug);
  ok('notifyVisit invoked (check logs / inbox if not debounced)');
}

async function main() {
  console.log('Portfolio notification smoke tests');
  await checkEnv();
  const row = await checkPortfolio(slugArg);
  const to = row ? String(row.account_email || row.email_public || '').trim() : '';
  if (doSend && to && !dryRun && (process.env.RESEND_API_KEY || '').trim()) {
    await testSendEmailDirect(to);
  }
  await testNotifyContact(slugArg);
  await testNotifyVisit(slugArg);
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (!doSend && failed === 0) {
    console.log('\nTip: run with --send to deliver a real contact notification email.');
  }
  await pool.end().catch(() => {});
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await pool.end().catch(() => {});
  process.exit(1);
});
