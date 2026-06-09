/** Ensure external links work in href (students often paste linkedin.com/in/... without https). */
function normalizeExternalUrl(raw) {
  const u = String(raw || '').trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://${u.replace(/^\/+/, '')}`;
}

module.exports = { normalizeExternalUrl };
