/** Portfolio CV & photo upload limits and validation (moduuli-elava-cv). */
const CV_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — stored in PostgreSQL BYTEA
const PHOTO_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const CV_EXTENSIONS = new Set(['.pdf', '.txt', '.doc', '.docx']);
const PHOTO_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff',
  '.heic', '.heif', '.avif', '.svg'
]);

const PHOTO_MIME_PREFIXES = ['image/'];
const PHOTO_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'application/octet-stream' // some phones send HEIC this way — ext checked below
]);

const CV_MIMES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);

function extOf(name) {
  const n = String(name || '').toLowerCase();
  const i = n.lastIndexOf('.');
  return i >= 0 ? n.slice(i) : '';
}

function isAllowedCvUpload({ originalname, mimetype, size }) {
  if (size != null && size > CV_MAX_BYTES) {
    return { ok: false, error: `CV on liian suuri (max ${formatMb(CV_MAX_BYTES)}).` };
  }
  const ext = extOf(originalname);
  const mime = String(mimetype || '').toLowerCase();
  if (CV_EXTENSIONS.has(ext)) return { ok: true };
  if (CV_MIMES.has(mime) && (ext === '.pdf' || ext === '.txt' || ext === '.doc' || ext === '.docx')) {
    return { ok: true };
  }
  if (mime === 'application/pdf' || mime === 'text/plain') return { ok: true };
  return {
    ok: false,
    error: 'Tuetut CV-tiedostot: PDF, TXT, DOC, DOCX (max ' + formatMb(CV_MAX_BYTES) + ').'
  };
}

function isAllowedPhotoUpload({ originalname, mimetype, size }) {
  if (size != null && size > PHOTO_MAX_BYTES) {
    return { ok: false, error: `Kuva on liian suuri (max ${formatMb(PHOTO_MAX_BYTES)}).` };
  }
  const ext = extOf(originalname);
  const mime = String(mimetype || '').toLowerCase();
  if (PHOTO_EXTENSIONS.has(ext)) return { ok: true };
  if (PHOTO_MIMES.has(mime) && PHOTO_MIME_PREFIXES.some((p) => mime.startsWith(p))) return { ok: true };
  if (PHOTO_MIME_PREFIXES.some((p) => mime.startsWith(p))) return { ok: true };
  return {
    ok: false,
    error: 'Tuetut kuvat: JPG, PNG, WebP, GIF, HEIC, TIFF ja muut yleiset kuvaformaatit (max '
      + formatMb(PHOTO_MAX_BYTES) + ').'
  };
}

function formatMb(bytes) {
  return Math.round(bytes / (1024 * 1024)) + ' MB';
}

function multerLimits() {
  return {
    cvMaxBytes: CV_MAX_BYTES,
    photoMaxBytes: PHOTO_MAX_BYTES
  };
}

function multerErrorMessage(err, kind) {
  const max = kind === 'photo' ? PHOTO_MAX_BYTES : CV_MAX_BYTES;
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return `${kind === 'photo' ? 'Kuva' : 'CV'} on liian suuri (max ${formatMb(max)}).`;
  }
  return (err && err.message) || 'Tiedoston lataus epäonnistui.';
}

module.exports = {
  CV_MAX_BYTES,
  PHOTO_MAX_BYTES,
  CV_EXTENSIONS,
  PHOTO_EXTENSIONS,
  isAllowedCvUpload,
  isAllowedPhotoUpload,
  multerLimits,
  multerErrorMessage,
  formatMb
};
