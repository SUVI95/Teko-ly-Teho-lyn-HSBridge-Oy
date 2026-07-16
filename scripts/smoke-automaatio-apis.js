#!/usr/bin/env node
/**
 * Smoke-test automaatio APIs: OpenAI chat + Resend email endpoint.
 * Usage: node scripts/smoke-automaatio-apis.js [your@email.com]
 */
require('dotenv').config();

const base = process.env.SMOKE_BASE || 'http://localhost:3000';
const to = process.argv[2] || process.env.DEV_PORTFOLIO_NOTIFY_EMAIL || process.env.SMOKE_EMAIL_TO;

async function main() {
  console.log('Base:', base);
  console.log('OPENAI_API_KEY:', (process.env.OPENAI_API_KEY || '').trim() ? 'set' : 'MISSING');
  console.log('ANTHROPIC_API_KEY:', (process.env.ANTHROPIC_API_KEY || '').trim() ? 'set' : 'optional');
  console.log('RESEND_API_KEY:', (process.env.RESEND_API_KEY || '').trim() ? 'set' : 'MISSING');

  const chat = await fetch(base + '/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: 'Vastaa suomeksi lyhyesti.',
      messages: [{ role: 'user', content: 'Kirjoita yksi lause onnittelusta automaation rakentamisesta.' }],
      max_tokens: 80
    })
  });
  const chatData = await chat.json().catch(() => ({}));
  if (!chat.ok || !chatData.text) {
    console.error('FAIL /api/ai/chat', chat.status, chatData);
    process.exit(1);
  }
  console.log('OK /api/ai/chat →', String(chatData.text).slice(0, 120));

  if (!to) {
    console.log('SKIP email (pass recipient: node scripts/smoke-automaatio-apis.js you@email.com)');
    return;
  }

  const flow = [
    { type: 'trigger', connected: true },
    { type: 'ai', connected: true },
    { type: 'email', connected: true }
  ];
  const mail = await fetch(base + '/api/send-test-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject: 'Automaatio smoke test',
      body: chatData.text,
      challengeId: 'email',
      flow
    })
  });
  const mailData = await mail.json().catch(() => ({}));
  if (!mail.ok || !mailData.ok) {
    console.error('FAIL /api/send-test-email', mail.status, mailData);
    process.exit(1);
  }
  console.log('OK /api/send-test-email → delivered to', to);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
