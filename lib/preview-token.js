const crypto = require('crypto');

function previewSecret() {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || 'aipolku-preview-dev';
}

function makePreviewToken(slug, userId) {
  return crypto
    .createHmac('sha256', previewSecret())
    .update(`${String(slug)}:${String(userId)}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyPreviewToken(slug, userId, token) {
  if (!token || !slug || userId == null) return false;
  const expected = makePreviewToken(slug, userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)));
  } catch {
    return false;
  }
}

module.exports = { makePreviewToken, verifyPreviewToken };
