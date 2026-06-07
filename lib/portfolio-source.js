/** Live student portfolio system — only moduuli-elava-cv writes to student_portfolios. */
const PORTFOLIO_SOURCE_MODULE = 'moduuli-elava-cv';

function portfolioAppOrigin() {
  const explicit = process.env.PORTFOLIO_APP_ORIGIN || process.env.AIPOLKU_PUBLIC_ORIGIN;
  if (explicit) return String(explicit).replace(/\/+$/, '');
  return 'https://aipolku.duunijobs.fi';
}

function portfolioModuleUrl() {
  return `${portfolioAppOrigin()}/module/${PORTFOLIO_SOURCE_MODULE}`;
}

function portfolioSourceMeta() {
  return {
    source_module: PORTFOLIO_SOURCE_MODULE,
    edit_module_url: portfolioModuleUrl()
  };
}

module.exports = {
  PORTFOLIO_SOURCE_MODULE,
  portfolioModuleUrl,
  portfolioSourceMeta
};
