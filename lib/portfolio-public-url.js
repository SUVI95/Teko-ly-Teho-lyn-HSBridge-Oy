/** Public portfolio subdomain — student pages live here, not on aipolku. */
function portfolioPublicHost() {
  return String(process.env.PORTFOLIO_PUBLIC_HOST || 'portfolio.duunijobs.fi')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function portfolioPublicBase() {
  const proto = process.env.PORTFOLIO_PUBLIC_PROTOCOL || 'https';
  return `${proto}://${portfolioPublicHost()}`;
}

function portfolioPublicUrl(slug) {
  const s = String(slug || '').replace(/^\/+|\/+$/g, '');
  return s ? `${portfolioPublicBase()}/${encodeURIComponent(s)}` : portfolioPublicBase();
}

function isPortfolioSubdomain(req) {
  const host = String(req.hostname || req.get?.('host') || '')
    .split(':')[0]
    .toLowerCase();
  return host === portfolioPublicHost();
}

module.exports = {
  portfolioPublicHost,
  portfolioPublicBase,
  portfolioPublicUrl,
  isPortfolioSubdomain
};
