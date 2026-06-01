/**
 * PDF text extraction (pdf-parse + pdfjs-dist fallback).
 * Shared by final module uploads and Minna CV upload.
 */
async function extractWithPdfParse(buf) {
  let mod;
  try {
    mod = require('pdf-parse');
  } catch (loadErr) {
    console.error('pdf-parse module load failed:', loadErr);
    return '';
  }
  try {
    if (mod && typeof mod.PDFParse === 'function') {
      const parser = new mod.PDFParse({ data: buf });
      try {
        const r = await parser.getText();
        return (r && r.text ? String(r.text) : '').trim();
      } finally {
        try { await parser.destroy(); } catch (_) {}
      }
    }
    if (typeof mod === 'function') {
      const data = await mod(buf);
      return (data && data.text ? String(data.text) : '').trim();
    }
    console.error('pdf-parse: unknown module shape', typeof mod);
    return '';
  } catch (e) {
    console.error('pdf-parse error:', e && e.message ? e.message : e);
    return '';
  }
}

async function extractWithPdfjs(buf) {
  let pdfjs;
  try {
    const { pathToFileURL } = require('url');
    const path = require('path');
    const pdfParseMain = require.resolve('pdf-parse');
    const pdfParseDir = path.resolve(path.dirname(pdfParseMain), '..', '..', '..');
    const pdfjsMjs = path.join(pdfParseDir, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs');
    pdfjs = await import(pathToFileURL(pdfjsMjs).href);
  } catch (loadErr) {
    console.error('pdfjs-dist load failed:', loadErr && loadErr.message ? loadErr.message : loadErr);
    return '';
  }
  try {
    const uint8 = new Uint8Array(buf);
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: false,
      verbosity: 0
    });
    const doc = await loadingTask.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const txt = (content.items || [])
        .map(it => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      pages.push(txt);
      try { page.cleanup(); } catch (_) {}
    }
    try { await doc.destroy(); } catch (_) {}
    return pages.join('\n').replace(/\s+\n/g, '\n').trim();
  } catch (e) {
    console.error('pdfjs-dist error:', e && e.message ? e.message : e);
    return '';
  }
}

async function extractPdfTextFromBuffer(buf) {
  if (!buf || !buf.length) return '';
  const primary = await extractWithPdfParse(buf);
  if (primary && primary.length >= 50) return primary;
  const fallback = await extractWithPdfjs(buf);
  if (fallback && fallback.length >= 50) return fallback;
  return (fallback && fallback.length > primary.length) ? fallback : primary;
}

module.exports = { extractPdfTextFromBuffer };
