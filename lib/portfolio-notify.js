const pool = require('../database/db');
const { sendEmail } = require('./send-email');
const { portfolioPublicUrl } = require('./portfolio-public-url');
const { escapeHtml, duuniJobsEmail, quoteBlock, infoRow } = require('./email-template');

async function getPortfolioOwnerBySlug(slug) {
  const r = await pool.query(
    `SELECT p.user_id, p.slug, p.full_name, p.published, u.email AS account_email, p.email_public
     FROM student_portfolios p
     JOIN users u ON p.user_id = u.id
     WHERE p.slug = $1 AND p.published = TRUE`,
    [slug]
  );
  return r.rows[0] || null;
}

function notifyEmailFor(row) {
  return String(row.account_email || row.email_public || '').trim();
}

async function logPortfolioEvent(userId, slug, type, extra = {}) {
  await pool.query(
    `INSERT INTO portfolio_events (user_id, slug, event_type, visitor_name, visitor_email, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      slug,
      type,
      extra.visitor_name || null,
      extra.visitor_email || null,
      extra.message || null
    ]
  );
}

async function shouldNotifyVisit(userId) {
  const r = await pool.query(
    `SELECT id FROM portfolio_events
     WHERE user_id = $1 AND event_type = 'visit_notified'
       AND created_at > NOW() - INTERVAL '24 hours'
     LIMIT 1`,
    [userId]
  );
  return r.rows.length === 0;
}

async function notifyVisit(slug) {
  const row = await getPortfolioOwnerBySlug(slug);
  if (!row) return;
  await logPortfolioEvent(row.user_id, row.slug, 'visit');
  if (!(await shouldNotifyVisit(row.user_id))) return;

  const to = notifyEmailFor(row);
  if (!to) return;

  const url = portfolioPublicUrl(row.slug);
  const firstName = String(row.full_name || '').trim().split(/\s+/)[0] || row.full_name;

  await sendEmail({
    to,
    subject: `Joku katsoi portfolioasi — ${row.full_name}`,
    text: `Hei ${row.full_name}!\n\nPortfolioasi katsottiin juuri: ${url}\n\nSaat enintään yhden ilmoituksen päivässä vierailuista.\n\n— duunijobs / AI Polku`,
    html: duuniJobsEmail({
      preheader: 'Joku katsoi portfolioasi juuri.',
      headline: '👀 Portfolioasi katsottiin',
      greeting: firstName,
      bodyHtml:
        '<p style="margin:0 0 12px;">Rekrytoija tai vierailija avasi juuri julkaistun portfolio-sivusi.</p>' +
        '<p style="margin:0;">Hyvä merkki — joku on kiinnostunut osaamisestasi.</p>',
      ctaUrl: url,
      ctaLabel: 'Avaa portfolio',
      footnote: 'Saat enintään yhden ilmoituksen päivässä vierailuista.'
    })
  });
  await logPortfolioEvent(row.user_id, row.slug, 'visit_notified');
}

async function notifyContact(slug, { name, email, message }) {
  const row = await getPortfolioOwnerBySlug(slug);
  if (!row) return { ok: false, error: 'Portfolio ei löydy' };

  await logPortfolioEvent(row.user_id, row.slug, 'contact', {
    visitor_name: name,
    visitor_email: email,
    message
  });

  const to = notifyEmailFor(row);
  if (!to) return { ok: false, error: 'Hakijalla ei ole sähköpostia ilmoituksia varten' };

  const url = portfolioPublicUrl(row.slug);
  const safeMsg = String(message || '').slice(0, 5000);
  const safeName = name || 'Rekrytoija';
  const safeEmail = email || '';
  const firstName = String(row.full_name || '').trim().split(/\s+/)[0] || row.full_name;
  const msgHtml = escapeHtml(safeMsg).replace(/\n/g, '<br>');

  await sendEmail({
    to,
    subject: `Uusi yhteydenotto portfolioosi — ${safeName}`,
    text: [
      `Hei ${row.full_name}!`,
      '',
      'Rekrytoija lähetti viestin portfolio-sivusi kautta:',
      '',
      `Nimi: ${safeName}`,
      `Sähköposti: ${safeEmail || '—'}`,
      '',
      safeMsg,
      '',
      `Portfolio: ${url}`,
      '',
      'Voit vastata suoraan rekrytoijan sähköpostiin.'
    ].join('\n'),
    html: duuniJobsEmail({
      preheader: `${safeName} haluaa ottaa sinuun yhteyttä portfolio-sivusi kautta.`,
      headline: '📩 Uusi yhteydenotto',
      greeting: firstName,
      bodyHtml:
        '<p style="margin:0 0 16px;"><strong>Rekrytoija lähetti viestin</strong> portfolio-sivusi kautta:</p>' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;width:100%;">' +
        infoRow('Nimi', escapeHtml(safeName)) +
        infoRow(
          'Sähköposti',
          safeEmail
            ? '<a href="mailto:' +
              escapeHtml(safeEmail) +
              '" style="color:#3b82f6;text-decoration:none;font-weight:600;">' +
              escapeHtml(safeEmail) +
              '</a>'
            : '—'
        ) +
        '</table>' +
        quoteBlock(msgHtml),
      ctaUrl: url,
      ctaLabel: 'Avaa portfolio',
      footnote: 'Vastaa suoraan rekrytoijan sähköpostiin.'
    })
  });

  return { ok: true };
}

async function notifyCvDownload(slug) {
  const row = await getPortfolioOwnerBySlug(slug);
  if (!row) return;
  await logPortfolioEvent(row.user_id, slug, 'cv_download');
}

module.exports = {
  logPortfolioEvent,
  notifyVisit,
  notifyContact,
  notifyCvDownload
};
