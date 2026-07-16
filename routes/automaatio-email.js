const express = require('express');
const { sendEmail } = require('../lib/send-email');
const { validateAutomaatioFlow } = require('../lib/automaatio-flow');
const { escapeHtml, duuniJobsEmail } = require('../lib/email-template');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

function isValidEmail(addr) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(addr || '').trim());
}

function buildAutomaatioEmailHtml({ body, challengeId, to }) {
  const paragraphs = String(body || '')
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => '<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#1a1a1a;">' + escapeHtml(p) + '</p>')
    .join('');

  return duuniJobsEmail({
    preheader: 'Automaatiosi lähetti tämän viestin — AI Polku',
    headline: 'Viesti automaatiostasi',
    greeting: 'Hei!',
    bodyHtml:
      paragraphs +
      '<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#6b6b6b;">' +
      'Tämän viestin lähetti <strong>sinun rakentamasi automaatio</strong> AI Polku -kurssilla (haaste: ' +
      escapeHtml(challengeId || 'testiviesti') +
      '). Jos sait tämän, ketjusi toimii oikeasti — alusta loppuun.</p>',
    footnote: 'Lähetetty osoitteeseen ' + escapeHtml(to)
  });
}

/** POST /api/send-test-email — real Resend email for automaatio module (keys server-side). */
router.post('/send-test-email', async (req, res) => {
  try {
    const to = String(req.body && req.body.to || '').trim().toLowerCase();
    const subject = String(req.body && req.body.subject || 'Viesti automaatiostasi').trim().slice(0, 200);
    const body = String(req.body && req.body.body || '').trim().slice(0, 8000);
    const challengeId = String(req.body && req.body.challengeId || 'email').trim();
    const flow = req.body && req.body.flow;

    if (!isValidEmail(to)) {
      return res.status(400).json({ ok: false, reason: 'invalid-email' });
    }
    if (!body || body.length < 8) {
      return res.status(400).json({ ok: false, reason: 'empty-body' });
    }

    const flowCheck = validateAutomaatioFlow(challengeId, flow);
    if (!flowCheck.ok) {
      return res.status(400).json({ ok: false, reason: flowCheck.reason || 'invalid-flow', detail: flowCheck.detail });
    }

    if (!envTrim('RESEND_API_KEY')) {
      console.error('[automaatio-email] RESEND_API_KEY missing');
      return res.status(503).json({ ok: false, reason: 'email-not-configured' });
    }

    const from =
      envTrim('AUTOMAATIO_EMAIL_FROM') ||
      envTrim('EMAIL_FROM') ||
      'AI Polku <portfolio@duunijobs.fi>';

    const html = buildAutomaatioEmailHtml({ body, challengeId, to });
    const sent = await sendEmail({
      to,
      subject,
      html,
      text: body,
      from
    });

    if (!sent.ok) {
      console.error('[automaatio-email] send failed:', sent.error);
      return res.status(502).json({ ok: false, reason: 'send-failed', detail: sent.error });
    }
    if (sent.stub) {
      return res.status(503).json({ ok: false, reason: 'email-not-configured' });
    }

    return res.json({ ok: true, delivered: true });
  } catch (err) {
    console.error('[automaatio-email]', err);
    return res.status(500).json({ ok: false, reason: 'server-error' });
  }
});

module.exports = router;
