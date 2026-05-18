/**
 * Kuopio video-shoot demo account — auto-approved student access without teacher approval.
 * Extend window via env KUOPIO_DEMO_APPROVE_UNTIL (ISO date, e.g. 2026-05-26T23:59:59Z).
 */
const KUOPIO_DEMO_EMAIL = 'kuopio.demo+aipolku@gmail.com';
const KUOPIO_DEMO_DEFAULT_NAME = 'Sofia Karjalainen';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isKuopioDemoEmail(email) {
  return normalizeEmail(email) === KUOPIO_DEMO_EMAIL;
}

function isKuopioDemoAutoApproveActive() {
  const until = process.env.KUOPIO_DEMO_APPROVE_UNTIL || '2026-05-26T23:59:59.999Z';
  const end = new Date(until);
  if (Number.isNaN(end.getTime())) return true;
  return Date.now() <= end.getTime();
}

function shouldAutoApproveStudent(email) {
  return isKuopioDemoEmail(email) && isKuopioDemoAutoApproveActive();
}

module.exports = {
  KUOPIO_DEMO_EMAIL,
  KUOPIO_DEMO_DEFAULT_NAME,
  normalizeEmail,
  isKuopioDemoEmail,
  isKuopioDemoAutoApproveActive,
  shouldAutoApproveStudent
};
