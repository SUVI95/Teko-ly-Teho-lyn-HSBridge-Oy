/**
 * Sonja-only gift module (Viestijän AI-opas).
 * Set SONJA_GIFT_EMAIL in production (Vercel env), e.g. sonja.makinen@example.com
 * Multiple emails: comma-separated.
 */
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

const SONJA_GIFT_EMAIL_RAW = process.env.SONJA_GIFT_EMAIL || '';

const SONJA_GIFT_EMAILS = SONJA_GIFT_EMAIL_RAW.split(',')
  .map(normalizeEmail)
  .filter(Boolean);

const SONJA_GIFT_MODULE_ID = 'sonja-viestinta-opas';

function isSonjaGiftEmail(email) {
  if (!SONJA_GIFT_EMAILS.length) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return SONJA_GIFT_EMAILS.includes(normalized);
}

module.exports = {
  SONJA_GIFT_MODULE_ID,
  SONJA_GIFT_EMAILS,
  isSonjaGiftEmail,
  normalizeEmail
};
