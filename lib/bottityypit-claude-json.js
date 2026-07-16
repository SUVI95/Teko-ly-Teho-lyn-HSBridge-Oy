/** Parse JSON object from Claude text response (strips optional markdown fences). */
function parseClaudeJsonText(raw) {
  const text = String(raw || '').trim();
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

async function claudeJsonComplete(callClaudeText, { system, user, max_tokens = 2200 }) {
  const result = await callClaudeText({
    system,
    messages: [{ role: 'user', content: String(user || '') }],
    max_tokens
  });
  try {
    return parseClaudeJsonText(result.text);
  } catch (err) {
    console.error('claudeJsonComplete parse failed:', String(result.text || '').slice(0, 240));
    throw new Error('Tekoälyn vastauksen jäsentäminen epäonnistui.');
  }
}

module.exports = {
  parseClaudeJsonText,
  claudeJsonComplete
};
