function normText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function textsOverlap(a, b) {
  const x = normText(a);
  const y = normText(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const shorter = x.length < y.length ? x : y;
  const longer = x.length < y.length ? y : x;
  if (shorter.length >= 60 && longer.includes(shorter)) return true;
  const prefix = shorter.slice(0, 100);
  return prefix.length >= 50 && longer.includes(prefix);
}

function dedupeParagraphs(text) {
  const paras = String(text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out = [];
  const seen = {};
  for (const p of paras) {
    const key = normText(p).slice(0, 120);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(p);
  }
  return out.join('\n\n');
}

/** Keep bio and career_summary distinct; drop redundant paragraphs. */
function sanitizePortfolioNarratives(fields) {
  const f = fields && typeof fields === 'object' ? { ...fields } : {};
  if (f.bio) f.bio = dedupeParagraphs(String(f.bio));
  if (f.career_summary) f.career_summary = dedupeParagraphs(String(f.career_summary)).trim();

  if (f.bio && f.career_summary) {
    if (textsOverlap(f.bio, f.career_summary)) {
      if (normText(f.bio).includes(normText(f.career_summary))) {
        delete f.career_summary;
      } else if (normText(f.career_summary).includes(normText(f.bio))) {
        f.bio = f.career_summary;
        delete f.career_summary;
      } else {
        delete f.career_summary;
      }
    }
  }
  return f;
}

module.exports = {
  normText,
  textsOverlap,
  dedupeParagraphs,
  sanitizePortfolioNarratives
};
