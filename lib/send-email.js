const { fetch } = require('undici');

function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

/** Send transactional email via Resend API (no extra npm deps). */
async function sendEmail({ to, subject, html, text, from: fromOverride }) {
  const toAddr = String(to || '').trim();
  if (!toAddr) return { ok: false, error: 'No recipient' };

  const key = envTrim('RESEND_API_KEY');
  const from = String(fromOverride || '').trim() || envTrim('EMAIL_FROM') || 'DuuniJobs Portfolio <portfolio@duunijobs.fi>';

  if (!key) {
    console.log('[email stub — set RESEND_API_KEY to send]', { to: toAddr, subject });
    return { ok: true, stub: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [toAddr],
      subject,
      html: html || undefined,
      text: text || undefined
    })
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('Resend error:', err);
    return { ok: false, error: err || 'Email send failed' };
  }
  return { ok: true };
}

module.exports = { sendEmail };
