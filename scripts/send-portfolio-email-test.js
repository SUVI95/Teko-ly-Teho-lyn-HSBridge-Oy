#!/usr/bin/env node
/**
 * Send sample portfolio notification emails (visit + contact) for preview.
 * Usage: node scripts/send-portfolio-email-test.js [to@email.com]
 */
require('dotenv').config();
const { sendEmail } = require('../lib/send-email');
const { portfolioPublicUrl } = require('../lib/portfolio-public-url');
const { escapeHtml, duuniJobsEmail, quoteBlock, infoRow } = require('../lib/email-template');

const to = (process.argv[2] || 'suvi@duunijobs.com').trim();
const slug = (process.argv[3] || 'suvi').trim();
const recruiterName = 'Matti Rekrytoija';
const recruiterEmail = 'matti.rekry@yritys.fi';
const url = portfolioPublicUrl(slug);
const studentName = 'Etunimi Sukunimi';
const firstName = 'Etunimi';

async function main() {
  console.log('Sending branded portfolio email previews to:', to);

  const visit = await sendEmail({
    to,
    subject: `[TEST] Joku katsoi portfolioasi — ${studentName}`,
    text: `Hei ${studentName}!\n\nPortfolioasi katsottiin juuri: ${url}\n\n— duunijobs / AI Polku`,
    html: duuniJobsEmail({
      preheader: '[TEST] Joku katsoi portfolioasi juuri.',
      headline: '👀 Portfolioasi katsottiin',
      greeting: firstName,
      bodyHtml:
        '<p style="margin:0 0 12px;">Rekrytoija tai vierailija avasi juuri julkaistun portfolio-sivusi.</p>' +
        '<p style="margin:0;">Hyvä merkki — joku on kiinnostunut osaamisestasi.</p>' +
        '<p style="margin:16px 0 0;font-size:13px;color:#8a8799;">— Testiviesti</p>',
      ctaUrl: url,
      ctaLabel: 'Avaa portfolio',
      footnote: 'Saat enintään yhden ilmoituksen päivässä vierailuista.'
    })
  });

  if (!visit.ok) {
    console.error('Visit email failed:', visit.error || visit);
    process.exit(1);
  }
  if (visit.stub) {
    console.error('RESEND_API_KEY not set — email was not sent (stub only).');
    process.exit(1);
  }
  console.log('✓ Visit notification sent');

  const message =
    'Hei! Näin portfoliosi DuuniJobsissa ja haluaisin keskustella avoimesta roolista tiimissämme. Sopisiko lyhyt puhelu ensi viikolla?';
  const msgHtml = escapeHtml(message);

  const contact = await sendEmail({
    to,
    subject: `[TEST] Uusi yhteydenotto portfolioosi — ${recruiterName}`,
    text: [
      `Hei ${studentName}!`,
      '',
      'Rekrytoija lähetti viestin portfolio-sivusi kautta:',
      '',
      `Nimi: ${recruiterName}`,
      `Sähköposti: ${recruiterEmail}`,
      '',
      message,
      '',
      `Portfolio: ${url}`,
      '',
      '— Testiviesti'
    ].join('\n'),
    html: duuniJobsEmail({
      preheader: '[TEST] Rekrytoija haluaa ottaa sinuun yhteyttä.',
      headline: '📩 Uusi yhteydenotto',
      greeting: firstName,
      bodyHtml:
        '<p style="margin:0 0 16px;"><strong>Rekrytoija lähetti viestin</strong> portfolio-sivusi kautta:</p>' +
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;width:100%;">' +
        infoRow('Nimi', escapeHtml(recruiterName)) +
        infoRow(
          'Sähköposti',
          '<a href="mailto:' +
            escapeHtml(recruiterEmail) +
            '" style="color:#3b82f6;text-decoration:none;font-weight:600;">' +
            escapeHtml(recruiterEmail) +
            '</a>'
        ) +
        '</table>' +
        quoteBlock(msgHtml) +
        '<p style="margin:16px 0 0;font-size:13px;color:#8a8799;">— Testiviesti</p>',
      ctaUrl: url,
      ctaLabel: 'Avaa portfolio',
      footnote: 'Vastaa suoraan rekrytoijan sähköpostiin.'
    })
  });

  if (!contact.ok) {
    console.error('Contact email failed:', contact.error || contact);
    process.exit(1);
  }
  console.log('✓ Contact notification sent');
  console.log('Done — check inbox (and spam) at', to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
