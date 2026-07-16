const crypto = require('crypto');

/** Build multipart/form-data body for OpenAI Whisper and similar APIs (Node fetch). */
function buildMultipartForm(fields) {
  const boundary = '----FormData' + crypto.randomBytes(12).toString('hex');
  const chunks = [];
  for (const f of fields) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${f.name}"`;
    if (f.filename) head += `; filename="${f.filename}"`;
    head += '\r\n';
    if (f.contentType) head += `Content-Type: ${f.contentType}\r\n`;
    head += '\r\n';
    chunks.push(Buffer.from(head, 'utf-8'));
    chunks.push(Buffer.isBuffer(f.value) ? f.value : Buffer.from(String(f.value), 'utf-8'));
    chunks.push(Buffer.from('\r\n', 'utf-8'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

module.exports = { buildMultipartForm };
