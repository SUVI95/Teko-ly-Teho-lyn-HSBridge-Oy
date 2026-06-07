/** HTML escape for email body fragments. */
const { portfolioModuleUrl } = require('./portfolio-source');
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function duuniJobsWordmark(sizePx) {
  const size = sizePx || 32;
  return (
    '<span style="font-family:Arial,Helvetica,sans-serif;font-size:' +
    size +
    'px;font-weight:900;letter-spacing:-0.03em;line-height:1;text-transform:lowercase;">' +
    '<span style="color:#3b82f6;">duuni</span><span style="color:#22c55e;">jobs</span>' +
    '</span>'
  );
}

/**
 * Branded DuuniJobs notification email shell (table layout for client compatibility).
 */
function duuniJobsEmail({ preheader, headline, greeting, bodyHtml, ctaUrl, ctaLabel, footnote }) {
  const pre = escapeHtml(preheader || headline || '');
  const head = escapeHtml(headline || '');
  const greet = greeting ? escapeHtml(greeting) : '';
  const foot = footnote ? escapeHtml(footnote) : '';
  const cta = ctaUrl && ctaLabel
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;width:100%;">' +
      '<tr><td align="center" style="border-radius:10px;background:linear-gradient(135deg,#3b82f6 0%,#22c55e 100%);">' +
      '<a href="' +
      escapeHtml(ctaUrl) +
      '" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">' +
      escapeHtml(ctaLabel) +
      '</a></td></tr></table>' +
      '<p style="margin:8px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;">' +
      '<a href="' +
      escapeHtml(ctaUrl) +
      '" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;text-decoration:none;word-break:break-all;">' +
      escapeHtml(ctaUrl) +
      '</a></p>'
    : '';

  return (
    '<!DOCTYPE html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' +
    head +
    '</title></head>' +
    '<body style="margin:0;padding:0;background-color:#f0ede8;-webkit-font-smoothing:antialiased;">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' +
    pre +
    '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0ede8;padding:32px 16px;">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">' +
    '<tr><td style="padding:0 0 20px;" align="center">' +
    duuniJobsWordmark(34) +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:15px;color:#c75b3a;margin-top:8px;letter-spacing:-0.02em;">AI Polku</div>' +
    '</td></tr>' +
    '<tr><td style="height:4px;border-radius:4px;background:linear-gradient(90deg,#3b82f6 0%,#22c55e 100%);font-size:0;line-height:0;">&nbsp;</td></tr>' +
    '<tr><td style="background:#ffffff;border:1px solid #e8e4dc;border-top:none;border-radius:0 0 16px 16px;padding:36px 32px 32px;box-shadow:0 4px 24px rgba(26,26,46,0.06);">' +
    (head
      ? '<h1 style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;color:#1a1a2e;line-height:1.35;">' +
        head +
        '</h1>'
      : '') +
    (greet
      ? '<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a2e;">Hei <strong>' +
        greet +
        '</strong>,</p>'
      : '') +
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3d3a52;">' +
    bodyHtml +
    '</div>' +
    cta +
    (foot
      ? '<p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#6b6880;">' +
        foot +
        '</p>'
      : '') +
    '</td></tr>' +
    '<tr><td align="center" style="padding:24px 12px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8a8799;">' +
    duuniJobsWordmark(18) +
    '<div style="margin-top:10px;">Elävä CV -moduuli · <a href="' +
    escapeHtml(portfolioModuleUrl()) +
    '" style="color:#3b82f6;text-decoration:none;">Muokkaa portfolioa</a></div>' +
    '<div style="margin-top:6px;">Portfolio-ilmoitus · <a href="https://aipolku.duunijobs.fi" style="color:#3b82f6;text-decoration:none;">aipolku.duunijobs.fi</a></div>' +
    '</td></tr>' +
    '</table></td></tr></table></body></html>'
  );
}

function quoteBlock(html) {
  return (
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">' +
    '<tr><td style="border-left:4px solid #3b82f6;padding:12px 16px;background:#f8f7fc;border-radius:0 8px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2d2d44;">' +
    html +
    '</td></tr></table>'
  );
}

function infoRow(label, valueHtml) {
  return (
    '<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b6880;width:110px;vertical-align:top;">' +
    escapeHtml(label) +
    '</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1a1a2e;vertical-align:top;">' +
    valueHtml +
    '</td></tr>'
  );
}

module.exports = {
  escapeHtml,
  duuniJobsEmail,
  duuniJobsWordmark,
  quoteBlock,
  infoRow
};
