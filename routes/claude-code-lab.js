const express = require('express');
const { fetch } = require('undici');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const callsByUser = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CALLS = 20;

const PROJECTS = {
  event: {
    label: 'Tapahtuman ilmoittautumissivu',
    purpose: 'Sivu, jolla kävijä näkee tapahtuman tiedot, ilmoittautuu ja saa vahvistuksen.',
    required: [
      'tapahtuman nimi, aika, paikka ja lyhyt kuvaus',
      'nimi- ja sähköpostikenttä',
      'selkeä ilmoittautumispainike',
      'onnistumisviesti ja osallistujamäärä'
    ]
  },
  expenses: {
    label: 'Kululaskuri',
    purpose: 'Pieni työkalu, jolla käyttäjä lisää kuluja ja näkee yhteissumman sekä kulut luokittain.',
    required: [
      'kulun nimi, summa ja luokka',
      'uuden kulun lisääminen',
      'kulujen poistaminen',
      'yhteissumma euroina ja luokkakohtainen yhteenveto'
    ]
  },
  followup: {
    label: 'Asiakkaiden jatkotoimien seuranta',
    purpose: 'Työkalu, jolla käyttäjä kirjaa asiakkaan seuraavan yhteydenoton ja merkitsee tehtävän valmiiksi.',
    required: [
      'asiakkaan nimi, seuraava päivä ja lyhyt muistio',
      'uuden jatkotoimen lisääminen',
      'avoimien ja valmiiden tehtävien erottaminen',
      'tehtävän merkitseminen valmiiksi'
    ]
  }
};

function envTrim(name) {
  return String(process.env[name] || '').trim();
}

function cleanText(value, max = 1000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max);
}

function isLocalPreview(req) {
  const host = String(req.hostname || '').toLowerCase();
  return process.env.NODE_ENV !== 'production'
    && (host === 'localhost' || host === '127.0.0.1')
    && req.query.preview === '1';
}

function authOrPreview(req, res, next) {
  if (isLocalPreview(req)) {
    req.user = { id: 'local-preview', is_admin: true };
    return next();
  }
  return authenticateToken(req, res, next);
}

function rateLimit(req, res, next) {
  const key = String(req.user?.id || req.ip || 'unknown');
  const now = Date.now();
  const recent = (callsByUser.get(key) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    return res.status(429).json({ error: 'Liian monta pyyntöä. Odota hetki ja yritä uudelleen.' });
  }
  recent.push(now);
  callsByUser.set(key, recent);
  next();
}

function parseJsonObject(raw) {
  const text = String(raw || '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('Claude ei palauttanut kelvollista JSON-vastausta.');
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function callClaudeJson({ system, user, maxTokens = 4000, temperature = 0.3 }) {
  const key = envTrim('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY puuttuu.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: envTrim('ANTHROPIC_CODE_LAB_MODEL') || envTrim('ANTHROPIC_MODEL') || 'claude-haiku-4-5',
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Claude Code Lab Anthropic error:', response.status, detail.slice(0, 500));
      throw new Error('Claude-palvelu ei vastannut. Yritä uudelleen.');
    }
    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('\n');
    return parseJsonObject(text);
  } finally {
    clearTimeout(timer);
  }
}

function projectInput(body) {
  const project = PROJECTS[body?.project] ? body.project : null;
  const subject = cleanText(body?.subject, 160);
  const audience = cleanText(body?.audience, 220);
  const style = cleanText(body?.style, 220);
  if (!project) throw new Error('Valitse ensin rakennettava projekti.');
  if (subject.length < 3 || audience.length < 3 || style.length < 3) {
    throw new Error('Täytä projektin nimi tai aihe, käyttäjät ja toivottu ilme.');
  }
  return { project, subject, audience, style };
}

function cleanList(value, maxItems = 8, maxText = 400) {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanText(item, maxText)).filter(Boolean)
    : [];
}

function normalizePlan(raw, input) {
  const project = PROJECTS[input.project];
  const rawFiles = Array.isArray(raw?.files) ? raw.files : [];
  const allowedFiles = ['index.html', 'styles.css', 'app.js'];
  return {
    project: input.project,
    name: cleanText(raw?.name || input.subject, 100),
    summary: cleanText(raw?.summary || project.purpose, 600),
    userJourney: cleanList(raw?.userJourney, 6, 300),
    features: cleanList(raw?.features, 8, 300),
    files: allowedFiles.map((path) => {
      const match = rawFiles.find((file) => file?.path === path);
      const fallbacks = {
        'index.html': 'Sivun sisältö ja rakenne',
        'styles.css': 'Värit, typografia ja mukautuminen eri näytöille',
        'app.js': 'Painikkeiden, lomakkeiden ja laskennan toiminta'
      };
      return { path, purpose: cleanText(match?.purpose || fallbacks[path], 250) };
    }),
    boundaries: cleanList(raw?.boundaries, 6, 300),
    acceptanceCriteria: cleanList(raw?.acceptanceCriteria, 8, 300)
  };
}

function stripHtmlDangerous(value) {
  return cleanText(value, 16000)
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<(?:link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function cleanCss(value) {
  return cleanText(value, 18000)
    .replace(/@import[\s\S]*?;/gi, '')
    .replace(/url\s*\([^)]*\)/gi, 'none')
    .replace(/<\/style/gi, '');
}

function cleanJavaScript(value) {
  const code = cleanText(value, 18000);
  const blocked = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|eval|Function|importScripts|localStorage|sessionStorage)\b|(?:window\.)?(?:parent|top)\b|\bprocess\b|\brequire\s*\(/;
  if (blocked.test(code)) {
    throw new Error('Luotu projekti yritti käyttää harjoitusympäristön ulkopuolista toimintoa. Pyydä Claudea rakentamaan paikallinen versio.');
  }
  return code.replace(/<\/script/gi, '<\\/script');
}

function projectChecks(files, project) {
  const html = files.html.toLowerCase();
  const css = files.css.toLowerCase();
  const js = files.js.toLowerCase();
  const common = [
    { id: 'content', label: 'Sivulla on otsikko, sisältö ja toiminto', passed: /<h1|<h2/.test(html) && /<button|<form/.test(html) },
    { id: 'form', label: 'Käyttäjän tiedot tarkistetaan ennen tallennusta', passed: /required/.test(html) || /trim\(\)/.test(js) },
    { id: 'interaction', label: 'Painikkeet ja lomake reagoivat käyttäjään', passed: /addeventlistener/.test(js) },
    { id: 'responsive', label: 'Näkymä mukautuu myös pieneen näyttöön', passed: /@media/.test(css) || /grid|flex/.test(css) },
    { id: 'offline', label: 'Projekti toimii ilman ulkopuolisia palveluja', passed: !/\bfetch\b|https?:\/\//.test(js + html + css) }
  ];
  const specific = {
    event: { id: 'project', label: 'Ilmoittautuminen näyttää vahvistuksen', passed: /vahvist|kiitos|onnist/.test(html + js) },
    expenses: { id: 'project', label: 'Kulut voidaan laskea ja näyttää euroina', passed: /total|yhteensä|summa/.test(js + html) && /€|eur/.test(js + html) },
    followup: { id: 'project', label: 'Jatkotoimen voi merkitä valmiiksi', passed: /valmis|done|complete/.test(js + html) }
  }[project];
  return [...common, specific];
}

function normalizeBuild(raw, input) {
  const files = {
    html: stripHtmlDangerous(raw?.files?.html),
    css: cleanCss(raw?.files?.css),
    js: cleanJavaScript(raw?.files?.js)
  };
  if (files.html.length < 300 || files.css.length < 300 || files.js.length < 200) {
    throw new Error('Claude ei tuottanut vielä toimivaa kokonaisuutta. Täsmennä projektia ja yritä uudelleen.');
  }
  return {
    files,
    explanation: cleanText(raw?.explanation, 800),
    changes: cleanList(raw?.changes, 8, 300),
    checklist: cleanList(raw?.checklist, 8, 300),
    checks: projectChecks(files, input.project)
  };
}

const BUILD_SYSTEM = `Toimit Claude Codena suomalaiselle ensikertalaiselle.
Rakenna pieni, oikeasti toimiva selainprojekti tavallisella HTML:llä, CSS:llä ja JavaScriptillä.
Käyttäjä ei ole ohjelmoija. Kirjoita käyttöliittymän tekstit luonnollisella ja huolitellulla suomella.
Älä käytä ulkoisia kirjastoja, verkkopyyntöjä, kuvia, fontteja, tietokantaa, selaimen tallennustilaa tai ulkopuolisia palveluja.
Kaiken pitää toimia paikallisesti yhdellä sivulla ja muistissa sivun aukiolon ajan.
HTML-kentässä saa olla vain body-elementin sisälle tuleva sisältö: ei html-, head-, style- eikä script-elementtejä.
CSS- ja JS-kentissä saa olla vain niiden oma sisältö.
Käytä selkeitä tunnisteita, saavutettavia lomakekenttiä ja responsiivista ulkoasua.
Palauta vain JSON:
{
  "files":{"html":"","css":"","js":""},
  "explanation":"",
  "changes":[""],
  "checklist":[""]
}`;

router.get('/health', authOrPreview, (req, res) => {
  res.json({
    ok: true,
    provider: envTrim('ANTHROPIC_API_KEY') ? 'claude' : 'missing',
    sandbox: true,
    projects: Object.keys(PROJECTS)
  });
});

router.post('/plan', authOrPreview, rateLimit, async (req, res) => {
  try {
    const input = projectInput(req.body);
    const project = PROJECTS[input.project];
    const raw = await callClaudeJson({
      system: `Toimit Claude Codena ja suunnittelet pienen selainprojektin ihmiselle, joka ei ole ohjelmoija.
Käytä tavallista suomea. Älä käytä teknisiä lyhenteitä tai oleta, että käyttäjä ymmärtää koodia.
Suunnittele vain kolme paikallista tiedostoa: index.html, styles.css ja app.js.
Projekti ei käytä verkkoa, kirjautumista, tietokantaa eikä oikeita henkilötietoja.
Palauta vain JSON:
{
  "name":"",
  "summary":"",
  "userJourney":[""],
  "features":[""],
  "files":[{"path":"index.html","purpose":""},{"path":"styles.css","purpose":""},{"path":"app.js","purpose":""}],
  "boundaries":[""],
  "acceptanceCriteria":[""]
}`,
      user: `Suunnittele tämä projekti:
Projektityyppi: ${project.label}
Projektin nimi tai aihe: ${input.subject}
Kenelle: ${input.audience}
Toivottu ilme: ${input.style}
Pakolliset toiminnot: ${project.required.join('; ')}`,
      maxTokens: 2200,
      temperature: 0.25
    });
    res.json({ success: true, input, plan: normalizePlan(raw, input) });
  } catch (error) {
    console.error('Claude Code Lab plan:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({ error: error.name === 'AbortError' ? 'Suunnittelu kesti liian kauan. Yritä uudelleen.' : (error.message || 'Suunnittelu epäonnistui.') });
  }
});

router.post('/build', authOrPreview, rateLimit, async (req, res) => {
  try {
    const input = projectInput(req.body);
    const project = PROJECTS[input.project];
    const plan = req.body?.plan && typeof req.body.plan === 'object' ? req.body.plan : {};
    const raw = await callClaudeJson({
      system: BUILD_SYSTEM,
      user: `Rakenna projekti tämän suunnitelman perusteella.

Projektityyppi: ${project.label}
Projektin nimi tai aihe: ${input.subject}
Kenelle: ${input.audience}
Toivottu ilme: ${input.style}
Pakolliset toiminnot: ${project.required.join('; ')}
Hyväksytty suunnitelma: ${JSON.stringify({
  summary: cleanText(plan.summary, 600),
  userJourney: cleanList(plan.userJourney, 6, 300),
  features: cleanList(plan.features, 8, 300),
  boundaries: cleanList(plan.boundaries, 6, 300)
})}`,
      maxTokens: 6000,
      temperature: 0.35
    });
    res.json({ success: true, build: normalizeBuild(raw, input) });
  } catch (error) {
    console.error('Claude Code Lab build:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({ error: error.name === 'AbortError' ? 'Rakentaminen kesti liian kauan. Yritä uudelleen.' : (error.message || 'Projektin rakentaminen epäonnistui.') });
  }
});

router.post('/revise', authOrPreview, rateLimit, async (req, res) => {
  try {
    const input = projectInput(req.body);
    const instruction = cleanText(req.body?.instruction, 900);
    if (instruction.length < 10) throw new Error('Kuvaa muutos vähintään 10 merkillä.');
    const current = {
      html: stripHtmlDangerous(req.body?.files?.html),
      css: cleanCss(req.body?.files?.css),
      js: cleanJavaScript(req.body?.files?.js)
    };
    if (!current.html || !current.css || !current.js) throw new Error('Nykyinen projekti puuttuu.');
    const raw = await callClaudeJson({
      system: BUILD_SYSTEM,
      user: `Muokkaa nykyistä projektia käyttäjän palautteen perusteella.
Säilytä toimivat ominaisuudet ja muuta vain tarvittavat kohdat.

Käyttäjän muutos: ${instruction}
Projektityyppi: ${PROJECTS[input.project].label}
Projektin nimi tai aihe: ${input.subject}
Kenelle: ${input.audience}
Toivottu ilme: ${input.style}

Nykyiset tiedostot:
${JSON.stringify(current)}`,
      maxTokens: 6000,
      temperature: 0.25
    });
    res.json({ success: true, build: normalizeBuild(raw, input) });
  } catch (error) {
    console.error('Claude Code Lab revise:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({ error: error.name === 'AbortError' ? 'Muutos kesti liian kauan. Yritä uudelleen.' : (error.message || 'Projektin muuttaminen epäonnistui.') });
  }
});

module.exports = router;
