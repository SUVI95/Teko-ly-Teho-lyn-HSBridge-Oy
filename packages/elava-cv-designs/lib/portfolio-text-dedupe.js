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

function splitParagraphs(text) {
  return String(text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function dedupeParagraphs(text) {
  const out = [];
  const seen = {};
  for (const p of splitParagraphs(text)) {
    const key = normText(p).slice(0, 120);
    if (!key || seen[key]) continue;
    seen[key] = true;
    out.push(p);
  }
  return out.join('\n\n');
}

/** Bio for Tietoa — drop paragraphs already used as the hero hook. */
function filterBioForAbout(bio, heroText) {
  const paras = splitParagraphs(dedupeParagraphs(bio));
  const hero = String(heroText || '').trim();
  if (!paras.length) return '';
  if (!hero) return paras.join('\n\n');
  const kept = paras.filter((p) => !textsOverlap(p, hero));
  return kept.length ? kept.join('\n\n') : paras.join('\n\n');
}

/** Hero hook = career_summary; bio = background for About only. */
function sanitizePortfolioNarratives(fields) {
  const f = fields && typeof fields === 'object' ? { ...fields } : {};
  if (f.career_summary) f.career_summary = dedupeParagraphs(String(f.career_summary)).trim();
  if (f.bio) f.bio = dedupeParagraphs(String(f.bio));
  if (f.bio && f.career_summary) {
    f.bio = filterBioForAbout(f.bio, f.career_summary);
  }
  return f;
}

function shortHighlight(text, maxWords = 12) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return '';
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '…';
}

module.exports = {
  normText,
  textsOverlap,
  splitParagraphs,
  dedupeParagraphs,
  filterBioForAbout,
  shortHighlight,
  sanitizePortfolioNarratives
};
