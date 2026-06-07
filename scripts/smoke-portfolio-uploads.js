#!/usr/bin/env node
/**
 * Smoke tests for portfolio file upload validation and BYTEA storage.
 * Usage: node scripts/smoke-portfolio-uploads.js
 * Optional: DATABASE_URL in .env for DB roundtrip test.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  CV_MAX_BYTES,
  PHOTO_MAX_BYTES,
  isAllowedCvUpload,
  isAllowedPhotoUpload,
  formatMb
} = require('../lib/portfolio-upload-limits');

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log('  ✓', label);
}

function fail(label, err) {
  failed += 1;
  console.error('  ✗', label, err ? '— ' + err : '');
}

function assertCv(name, meta, expectOk) {
  const r = isAllowedCvUpload(meta);
  if (!!r.ok === expectOk) ok(name);
  else fail(name, 'expected ok=' + expectOk + ' got ' + JSON.stringify(r));
}

function assertPhoto(name, meta, expectOk) {
  const r = isAllowedPhotoUpload(meta);
  if (!!r.ok === expectOk) ok(name);
  else fail(name, 'expected ok=' + expectOk + ' got ' + JSON.stringify(r));
}

console.log('Portfolio upload smoke tests\n');
console.log('Limits: CV max', formatMb(CV_MAX_BYTES) + ', photo max', formatMb(PHOTO_MAX_BYTES));

console.log('\nCV format & size');
assertCv('small PDF', { originalname: 'cv.pdf', mimetype: 'application/pdf', size: 1024 }, true);
assertCv('3-page-ish PDF size ~3MB', { originalname: 'long-cv.pdf', mimetype: 'application/pdf', size: 3 * 1024 * 1024 }, true);
assertCv('large PDF at limit', { originalname: 'big.pdf', mimetype: 'application/pdf', size: CV_MAX_BYTES }, true);
assertCv('PDF over limit', { originalname: 'huge.pdf', mimetype: 'application/pdf', size: CV_MAX_BYTES + 1 }, false);
assertCv('TXT cv', { originalname: 'cv.txt', mimetype: 'text/plain', size: 5000 }, true);
assertCv('DOCX cv', {
  originalname: 'cv.docx',
  mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  size: 800000
}, true);
assertCv('reject exe', { originalname: 'virus.exe', mimetype: 'application/octet-stream', size: 1000 }, false);

console.log('\nPhoto format & size');
assertPhoto('JPEG profile', { originalname: 'me.jpg', mimetype: 'image/jpeg', size: 400000 }, true);
assertPhoto('PNG profile', { originalname: 'photo.png', mimetype: 'image/png', size: 2 * 1024 * 1024 }, true);
assertPhoto('HEIC iPhone', { originalname: 'IMG_1234.heic', mimetype: 'image/heic', size: 3 * 1024 * 1024 }, true);
assertPhoto('HEIC octet-stream', { originalname: 'pic.heic', mimetype: 'application/octet-stream', size: 2000000 }, true);
assertPhoto('WebP', { originalname: 'a.webp', mimetype: 'image/webp', size: 100000 }, true);
assertPhoto('GIF', { originalname: 'a.gif', mimetype: 'image/gif', size: 100000 }, true);
assertPhoto('TIFF', { originalname: 'scan.tiff', mimetype: 'image/tiff', size: 8 * 1024 * 1024 }, true);
assertPhoto('photo at limit', { originalname: 'big.jpg', mimetype: 'image/jpeg', size: PHOTO_MAX_BYTES }, true);
assertPhoto('photo over limit', { originalname: 'big.jpg', mimetype: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 }, false);
assertPhoto('reject pdf as photo', { originalname: 'doc.pdf', mimetype: 'application/pdf', size: 1000 }, false);

async function dbRoundtrip() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('\nDB roundtrip: skipped (no DATABASE_URL)');
    return;
  }
  console.log('\nDB BYTEA roundtrip');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });
  const sizes = [1024, 512 * 1024, 2 * 1024 * 1024, 6 * 1024 * 1024];
  try {
    for (const size of sizes) {
      const buf = Buffer.alloc(size, 0xab);
      const r = await pool.query('SELECT $1::bytea AS b', [buf]);
      const out = r.rows[0].b;
      if (!Buffer.isBuffer(out)) {
        fail('bytea ' + size + ' bytes', 'not a buffer');
        continue;
      }
      if (out.length !== size) {
        fail('bytea ' + size + ' bytes', 'length ' + out.length);
        continue;
      }
      ok('PostgreSQL BYTEA roundtrip ' + Math.round(size / 1024) + ' KB');
    }
  } catch (e) {
    fail('DB connection', e.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function samplePdfExtract() {
  console.log('\nPDF extract (generated + repo samples)');
  const { extractPdfTextFromBuffer } = require('../lib/pdf-extract');
  let any = false;

  try {
    const PDFDocument = require('pdfkit');
    const sizes = [
      { label: '1-page text PDF', pages: 1 },
      { label: '3-page text PDF', pages: 3 },
      { label: '5-page text PDF', pages: 5 }
    ];
    for (const spec of sizes) {
      any = true;
      const chunks = [];
      const doc = new PDFDocument({ margin: 50 });
      doc.on('data', (c) => chunks.push(c));
      const done = new Promise((resolve) => doc.on('end', resolve));
      for (let p = 0; p < spec.pages; p += 1) {
        if (p) doc.addPage();
        doc.fontSize(12).text(
          'Portfolio smoke test CV page ' + (p + 1) + '. Maria Korhonen, Helsinki. '
          + 'Asiakaspalvelija ja myyntiassistentti. Kokemusta vähittäiskaupasta ja tiimityöstä.',
          { width: 500 }
        );
      }
      doc.end();
      await done;
      const buf = Buffer.concat(chunks);
      try {
        const text = await extractPdfTextFromBuffer(buf);
        if (text && text.replace(/\s/g, '').length > 20) {
          ok(spec.label + ' (' + Math.round(buf.length / 1024) + ' KB, ' + text.length + ' chars)');
        } else {
          fail(spec.label, 'empty text');
        }
      } catch (e) {
        fail(spec.label, e.message);
      }
    }
  } catch (e) {
    console.log('  (pdfkit not available — skipped generated PDFs)');
  }

  const samples = [
    path.join(__dirname, '../node_modules/pdf-parse/test/data/05-versions-space.pdf')
  ];
  for (const p of samples) {
    if (!fs.existsSync(p)) continue;
    any = true;
    try {
      const buf = fs.readFileSync(p);
      const text = await extractPdfTextFromBuffer(buf);
      if (text && text.length > 10) ok('extract text from ' + path.basename(p) + ' (' + text.length + ' chars)');
      else fail('extract text from ' + path.basename(p), 'empty');
    } catch (e) {
      fail('extract ' + path.basename(p), e.message);
    }
  }
  if (!any) {
    console.log('  (no PDF samples — skipped)');
  }
}

(async function main() {
  await dbRoundtrip();
  await samplePdfExtract();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
