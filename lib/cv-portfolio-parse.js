const { extractPdfTextFromBuffer } = require('./pdf-extract');
const mammoth = require('mammoth');

const PARSE_SYSTEM = [
  'Extract structured portfolio data from a Finnish CV/resume.',
  'Reply with ONLY valid JSON (no markdown):',
  '{"name":"","city":"","target_role":"","bio":"3-4 sentences for About section: background, expertise, concrete wins. No questions or job-search pitch.","skills":["5-12 skills"],"experience":[{"role":"","company":"","years":"","desc":""}],"education":[{"degree":"","school":"","year":""}],"languages":[{"name":"","level":""}]}',
  'Extract ALL work experience entries from the CV (up to 8), newest first. Each experience needs role, company, years/period, and desc when available.',
  'Extract ALL languages mentioned. Use only facts from the CV. Empty arrays/strings if missing. Finnish text for bio and desc.'
].join(' ');

async function extractDocxTextFromBuffer(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return String(result.value || '').trim();
}

async function extractTextFromCvFile(file) {
  if (!file || !file.buffer) return '';
  const name = (file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (mime === 'text/plain' || name.endsWith('.txt')) {
    return file.buffer.toString('utf8').trim();
  }
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      return await extractPdfTextFromBuffer(file.buffer);
    } catch (err) {
      console.warn('CV PDF text extract:', err.message);
      return '';
    }
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    try {
      return await extractDocxTextFromBuffer(file.buffer);
    } catch (err) {
      console.warn('CV DOCX text extract:', err.message);
      return '';
    }
  }
  if (mime === 'application/msword' || name.endsWith('.doc')) {
    console.warn('CV DOC text extract: legacy .doc not supported');
    return '';
  }
  return '';
}

async function extractPortfolioFieldsFromCvTextClaude(text, completeJson) {
  const trimmed = String(text || '').trim();
  if (trimmed.replace(/\s/g, '').length < 20) {
    const err = new Error('CV-teksti on liian lyhyt analysoitavaksi.');
    err.code = 'TEXT_TOO_SHORT';
    throw err;
  }
  const fields = await completeJson({
    system: PARSE_SYSTEM,
    user: trimmed.slice(0, 12000),
    max_tokens: 2400
  });
  return { fields, chars: trimmed.length };
}

async function extractPortfolioFieldsFromCvText(text, openaiApiKey, fetchFn, timeoutSignal) {
  const trimmed = String(text || '').trim();
  if (trimmed.replace(/\s/g, '').length < 20) {
    const err = new Error('CV-teksti on liian lyhyt analysoitavaksi.');
    err.code = 'TEXT_TOO_SHORT';
    throw err;
  }

  const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSE_SYSTEM },
        { role: 'user', content: trimmed.slice(0, 12000) }
      ],
      max_tokens: 2200,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }),
    signal: timeoutSignal(45000)
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('cv-portfolio-parse OpenAI error:', details);
    throw new Error('CV:n analysointi epäonnistui.');
  }

  const data = await response.json();
  const raw = String(data.choices?.[0]?.message?.content || '').trim();
  try {
    const fields = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '').trim());
    return { fields, chars: trimmed.length };
  } catch (parseErr) {
    console.error('cv-portfolio-parse JSON parse failed:', raw.slice(0, 200));
    throw new Error('CV:n tietojen jäsentäminen epäonnistui.');
  }
}

module.exports = {
  PARSE_SYSTEM,
  extractTextFromCvFile,
  extractPortfolioFieldsFromCvText,
  extractPortfolioFieldsFromCvTextClaude
};
