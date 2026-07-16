const JOB_MATCH_SYSTEM = [
  'You are a Finnish job-search coach comparing a CV to a job posting.',
  'Be honest about fit. Use only facts from the CV — do not invent experience.',
  'Reply with ONLY valid JSON (no markdown):',
  '{"score":0,"jobName":"role + company short","atsMatched":["keywords in both"],"atsMissing":["job keywords missing from CV"],"skills":[{"n":"label","p":0}],"improve":["3-4 concrete CV fixes in Finnish"],"cover":"cover letter draft in Finnish","apply":"short application blurb in Finnish"}',
  'score: integer 0-100. skills: 4-6 items with match percent p. improve: actionable bullets.'
].join(' ');

function normalizeJobMatch(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var score = Math.max(0, Math.min(100, Math.round(Number(raw.score) || 0)));
  return {
    score: score,
    jobName: String(raw.jobName || 'Työpaikka').trim().slice(0, 120),
    atsMatched: Array.isArray(raw.atsMatched)
      ? raw.atsMatched.map(function (k) {
          return String(k).trim();
        }).filter(Boolean).slice(0, 20)
      : [],
    atsMissing: Array.isArray(raw.atsMissing)
      ? raw.atsMissing.map(function (k) {
          return String(k).trim();
        }).filter(Boolean).slice(0, 20)
      : [],
    skills: Array.isArray(raw.skills)
      ? raw.skills
          .map(function (s) {
            return {
              n: String(s.n || s.name || '').trim().slice(0, 60),
              p: Math.max(0, Math.min(100, Math.round(Number(s.p || s.pct || 0))))
            };
          })
          .filter(function (s) {
            return s.n;
          })
          .slice(0, 8)
      : [],
    improve: Array.isArray(raw.improve)
      ? raw.improve.map(function (i) {
          return String(i).trim();
        }).filter(Boolean).slice(0, 6)
      : [],
    cover: String(raw.cover || '').trim().slice(0, 4000),
    apply: String(raw.apply || '').trim().slice(0, 2000)
  };
}

async function analyzeJobMatch({ cvText, skillsText, jobPost }, completeJson) {
  const cv = String(cvText || '').trim();
  const skills = String(skillsText || '').trim();
  const job = String(jobPost || '').trim();
  if (cv.replace(/\s/g, '').length < 20) {
    const err = new Error('CV on liian lyhyt analyysiin.');
    err.code = 'CV_TOO_SHORT';
    throw err;
  }
  if (job.replace(/\s/g, '').length < 30) {
    const err = new Error('Työpaikkailmoitus on liian lyhyt.');
    err.code = 'JOB_TOO_SHORT';
    throw err;
  }

  const user = [
    'CV:',
    cv.slice(0, 8000),
    '',
    'TAIDOT (lista):',
    skills.slice(0, 2000),
    '',
    'TYÖPAIKKAILMOITUS:',
    job.slice(0, 8000)
  ].join('\n');

  const parsed = await completeJson({
    system: JOB_MATCH_SYSTEM,
    user,
    max_tokens: 2400
  });
  const normalized = normalizeJobMatch(parsed);
  if (!normalized) throw new Error('Analyysin muoto virheellinen.');
  return normalized;
}

module.exports = {
  JOB_MATCH_SYSTEM,
  normalizeJobMatch,
  analyzeJobMatch
};
