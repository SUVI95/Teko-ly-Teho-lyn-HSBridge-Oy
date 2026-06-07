/** Public portfolio URL helpers — subdomain when live, otherwise aipolku /portfolio/slug. */
function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

function portfolioPublicHost() {
  return String(process.env.PORTFOLIO_PUBLIC_HOST || 'portfolio.duunijobs.fi')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function portfolioAppOrigin() {
  const explicit = envTrim('PORTFOLIO_APP_ORIGIN') || envTrim('AIPOLKU_PUBLIC_ORIGIN');
  if (explicit) return explicit.replace(/\/+$/, '');
  return 'https://aipolku.duunijobs.fi';
}

function portfolioUseSubdomain() {
  return envTrim('PORTFOLIO_USE_SUBDOMAIN') === 'true';
}

function portfolioPublicBase() {
  const proto = process.env.PORTFOLIO_PUBLIC_PROTOCOL || 'https';
  return `${proto}://${portfolioPublicHost()}`;
}

function normalizePortfolioSlug(slug) {
  let s = String(slug || '').trim();
  if (!s) return '';
  try {
    s = decodeURIComponent(s);
  } catch (_) {
    /* keep raw */
  }
  return s.replace(/^\/+|\/+$/g, '').toLowerCase();
}

/** Canonical public URL for a published portfolio (used in emails, redirects, share links). */
function portfolioPublicUrl(slug) {
  const s = normalizePortfolioSlug(slug);
  if (!s) return portfolioUseSubdomain() ? portfolioPublicBase() : `${portfolioAppOrigin()}/portfolio`;

  if (portfolioUseSubdomain()) {
    return `${portfolioPublicBase()}/${encodeURIComponent(s)}`;
  }
  return `${portfolioAppOrigin()}/portfolio/${encodeURIComponent(s)}`;
}

function isPortfolioSubdomain(req) {
  const host = String(req.hostname || req.get?.('host') || '')
    .split(':')[0]
    .toLowerCase();
  return host === portfolioPublicHost();
}

module.exports = {
  portfolioPublicHost,
  portfolioAppOrigin,
  portfolioUseSubdomain,
  portfolioPublicBase,
  normalizePortfolioSlug,
  portfolioPublicUrl,
  isPortfolioSubdomain
};
