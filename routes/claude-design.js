const express = require('express');
const { fetch } = require('undici');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const PROJECTS = {
  service: {
    label: 'Ammatillisen palvelun laskeutumissivu',
    required: 'hero, palvelulupaus, hyödyt tai palvelut, luottamusta lisäävä näyttö, toimintakehotus ja usein kysytyt kysymykset'
  },
  event: {
    label: 'Tapahtumakampanjan yhden sivun kokonaisuus',
    required: 'hero, tapahtuman lupaus, ohjelma, puhujat tai vetäjät, käytännön tiedot ja ilmoittautuminen'
  },
  pitch: {
    label: 'Viiden dian myyntiesitys',
    required: 'ongelma, ratkaisu, näyttö, tarjous ja seuraava askel'
  }
};

const callsByIp = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CALLS = 18;

function envTrim(name) {
  return String(process.env[name] || '').trim();
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
  const recent = (callsByIp.get(key) || []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    return res.status(429).json({ error: 'Liian monta pyyntöä. Odota hetki ja yritä uudelleen.' });
  }
  recent.push(now);
  callsByIp.set(key, recent);
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

async function callClaudeJson({ system, user, maxTokens = 6000 }) {
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
        // Design Studio is interactive: Haiku keeps iteration responsive.
        // Set ANTHROPIC_DESIGN_MODEL to Sonnet/Opus when maximum depth is preferred.
        model: envTrim('ANTHROPIC_DESIGN_MODEL') || envTrim('ANTHROPIC_MODEL') || 'claude-haiku-4-5',
        max_tokens: maxTokens,
        temperature: 0.75,
        system,
        messages: [{ role: 'user', content: user }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Claude Design Anthropic error:', response.status, detail.slice(0, 500));
      throw new Error('Claude-palvelu ei vastannut. Yritä uudelleen.');
    }
    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block && block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    return parseJsonObject(text);
  } finally {
    clearTimeout(timer);
  }
}

function cleanText(value, max = 900) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function cleanColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 8).map((item, index) => ({
    id: cleanText(item?.id || `item-${index + 1}`, 50),
    title: cleanText(item?.title, 120),
    text: cleanText(item?.text || item?.body, 500),
    meta: cleanText(item?.meta, 120),
    price: cleanText(item?.price, 80)
  }));
}

function normalizeDesign(raw, project, index = 0) {
  const palette = [
    ['#f6f1e7', '#ffffff', '#1e2621', '#59635c', '#276749', '#d99557'],
    ['#111827', '#1f2937', '#f9fafb', '#cbd5e1', '#f59e0b', '#38bdf8'],
    ['#f4f0ff', '#ffffff', '#241b35', '#6d617d', '#7357c8', '#db6f8d']
  ][index % 3];
  const theme = raw?.theme || {};
  const sections = Array.isArray(raw?.sections) ? raw.sections.slice(0, project === 'pitch' ? 5 : 8) : [];
  return {
    project,
    direction: {
      name: cleanText(raw?.direction?.name || `Suunta ${index + 1}`, 80),
      rationale: cleanText(raw?.direction?.rationale, 500)
    },
    theme: {
      background: cleanColor(theme.background, palette[0]),
      surface: cleanColor(theme.surface, palette[1]),
      text: cleanColor(theme.text, palette[2]),
      muted: cleanColor(theme.muted, palette[3]),
      accent: cleanColor(theme.accent, palette[4]),
      accent2: cleanColor(theme.accent2, palette[5]),
      radius: Math.max(0, Math.min(36, Number(theme.radius) || 16)),
      spacing: Math.max(12, Math.min(40, Number(theme.spacing) || 24)),
      fontStyle: ['modern', 'editorial', 'humanist'].includes(theme.fontStyle) ? theme.fontStyle : 'modern'
    },
    sections: sections.map((section, sectionIndex) => ({
      id: cleanText(section?.id || `section-${sectionIndex + 1}`, 60),
      type: cleanText(section?.type || 'content', 40),
      eyebrow: cleanText(section?.eyebrow, 100),
      title: cleanText(section?.title, 180),
      body: cleanText(section?.body, 900),
      cta: cleanText(section?.cta, 100),
      secondaryCta: cleanText(section?.secondaryCta, 100),
      items: cleanItems(section?.items)
    }))
  };
}

function projectInput(body) {
  const project = PROJECTS[body?.project] ? body.project : null;
  if (!project) throw new Error('Valitse ensin projektityyppi.');
  const subject = cleanText(body?.subject, 160);
  const audience = cleanText(body?.audience, 220);
  const mood = cleanText(body?.mood, 220);
  if (subject.length < 3 || audience.length < 3 || mood.length < 3) {
    throw new Error('Täytä aihe, kohderyhmä ja tavoiteltu tunnelma.');
  }
  return { project, subject, audience, mood };
}

const DESIGN_SCHEMA = `{
  "direction": {"name":"", "rationale":""},
  "theme": {
    "background":"#RRGGBB", "surface":"#RRGGBB", "text":"#RRGGBB",
    "muted":"#RRGGBB", "accent":"#RRGGBB", "accent2":"#RRGGBB",
    "radius":16, "spacing":24, "fontStyle":"modern|editorial|humanist"
  },
  "sections": [{
    "id":"unique-kebab-id", "type":"hero|proof|features|pricing|faq|cta|schedule|speakers|problem|solution|content",
    "eyebrow":"", "title":"", "body":"", "cta":"", "secondaryCta":"",
    "items":[{"id":"", "title":"", "text":"", "meta":"", "price":""}]
  }]
}`;

const SYSTEM = `Toimit kokeneena suomalaisena tuote- ja viestintäsuunnittelijana.
Palauta vain pyydetty JSON ilman markdownia. Kirjoita luonnollista, huoliteltua suomea.
Vältä tekoälykliseitä, ympäripyöreitä lupauksia ja tarpeetonta englannin kieltä.
Suunnittelun pitää olla käyttökelpoinen, saavutettava ja aidosti erilainen annetuista vaihtoehdoista.
Älä lisää henkilötietoja, todentamattomia asiakasväitteitä tai keksittyjä prosenttilukuja.`;

router.get('/health', authOrPreview, (req, res) => {
  res.json({ ok: true, provider: envTrim('ANTHROPIC_API_KEY') ? 'claude' : 'missing' });
});

router.post('/directions', authOrPreview, rateLimit, async (req, res) => {
  try {
    const input = projectInput(req.body);
    const project = PROJECTS[input.project];
    const concepts = [
      'Rauhallinen ja typografinen: runsaasti tilaa, vahva sisältöhierarkia ja harkittu asiantuntijavaikutelma.',
      'Modulaarinen ja käytännöllinen: selkeät sisältölohkot, helposti silmäiltävä rakenne ja konkreettinen eteneminen.',
      'Rohkea ja tunnistettava: vahva kontrasti, kiinnostava sommittelu ja mieleen jäävä mutta saavutettava ilme.'
    ];
    const rawDirections = await Promise.all(concepts.map((concept) => callClaudeJson({
      system: SYSTEM,
      user: `Luo yksi ehjä suunnittelusuunta.

Projektityyppi: ${project.label}
Aihe tai palvelu: ${input.subject}
Kohderyhmä: ${input.audience}
Tunnelma ja brändi: ${input.mood}
Pakollinen sisältö: ${project.required}
Tämän suunnan erityinen näkökulma: ${concept}

Myyntiesityksessä sections-taulukossa pitää olla täsmälleen viisi diaa.
Muissa projekteissa sections-taulukossa pitää olla 5–6 osiota.
Pidä tekstit napakoina: section.body enintään kaksi virkettä ja kussakin osiossa enintään neljä items-kohtaa.

Palauta DESIGN-objekti suoraan:
${DESIGN_SCHEMA}`,
      maxTokens: 2600
    })));
    const directions = rawDirections.map((design, index) => normalizeDesign(design, input.project, index));
    if (directions.length !== 3 || directions.some((design) => design.sections.length < 4)) {
      throw new Error('Claude ei tuottanut kolmea ehjää suunnittelusuuntaa. Yritä uudelleen.');
    }
    res.json({ success: true, input, directions });
  } catch (error) {
    console.error('Claude Design directions:', error);
    res.status(400).json({ error: error.message || 'Suunnittelusuuntien luonti epäonnistui.' });
  }
});

router.post('/revise', authOrPreview, rateLimit, async (req, res) => {
  try {
    const project = PROJECTS[req.body?.project] ? req.body.project : null;
    const design = normalizeDesign(req.body?.design || {}, project || 'service');
    const instruction = cleanText(req.body?.instruction, 800);
    const targetId = cleanText(req.body?.targetId, 80);
    const mode = ['chat', 'comment'].includes(req.body?.mode) ? req.body.mode : 'chat';
    if (!project || instruction.length < 5) throw new Error('Kirjoita ensin täsmällinen muutos.');
    const scope = mode === 'comment' && targetId
      ? `Muutos kohdistuu vain elementtiin "${targetId}". Säilytä muu suunnitelma mahdollisimman ennallaan.`
      : 'Tämä on rakenteellinen keskustelumuutos. Muuta tarvittavia osia, mutta säilytä toimiva sisältö.';
    const result = await callClaudeJson({
      system: SYSTEM,
      user: `Muokkaa suunnitelmaa käyttäjän ohjeen perusteella.
${scope}
Käyttäjän ohje: ${instruction}

Nykyinen suunnitelma:
${JSON.stringify(design)}

Palauta:
{"summary":"Yksi lyhyt suomenkielinen kuvaus tehdystä muutoksesta","design":DESIGN}

DESIGN-rakenne:
${DESIGN_SCHEMA}`,
      maxTokens: 5200
    });
    const revised = normalizeDesign(result?.design || {}, project);
    if (revised.sections.length < 4) throw new Error('Muokattu suunnitelma jäi vajaaksi.');
    res.json({
      success: true,
      summary: cleanText(result?.summary || 'Suunnitelmaa päivitettiin.', 300),
      design: revised
    });
  } catch (error) {
    console.error('Claude Design revise:', error);
    res.status(400).json({ error: error.message || 'Muutoksen tekeminen epäonnistui.' });
  }
});

router.post('/critique', authOrPreview, rateLimit, async (req, res) => {
  try {
    const project = PROJECTS[req.body?.project] ? req.body.project : null;
    if (!project) throw new Error('Projektityyppi puuttuu.');
    const design = normalizeDesign(req.body?.design || {}, project);
    const brief = {
      subject: cleanText(req.body?.brief?.subject, 160),
      audience: cleanText(req.body?.brief?.audience, 220),
      mood: cleanText(req.body?.brief?.mood, 220)
    };
    const result = await callClaudeJson({
      system: SYSTEM,
      user: `Arvioi tämä suunnitelma käytettävyyden, sisältöhierarkian, saavutettavuuden ja lähtötietojen toteutumisen näkökulmasta.
Älä kehu yleisesti. Nosta kaksi vahvuutta ja täsmälleen kolme korjattavaa asiaa.
Jokaisessa korjauksessa pitää olla toteutettava toimenpide.

Lähtötiedot: ${JSON.stringify(brief)}
Suunnitelma: ${JSON.stringify(design)}

Palauta:
{"strengths":["",""],"findings":[
  {"severity":"high|medium|low","title":"","detail":"","action":""},
  {"severity":"high|medium|low","title":"","detail":"","action":""},
  {"severity":"high|medium|low","title":"","detail":"","action":""}
]}`,
      maxTokens: 1800
    });
    const strengths = (Array.isArray(result?.strengths) ? result.strengths : [])
      .slice(0, 2).map((value) => cleanText(value, 300));
    const findings = (Array.isArray(result?.findings) ? result.findings : [])
      .slice(0, 3).map((finding) => ({
        severity: ['high', 'medium', 'low'].includes(finding?.severity) ? finding.severity : 'medium',
        title: cleanText(finding?.title, 120),
        detail: cleanText(finding?.detail, 450),
        action: cleanText(finding?.action, 350)
      }));
    if (findings.length !== 3) throw new Error('Arvio jäi vajaaksi. Yritä uudelleen.');
    res.json({ success: true, strengths, findings });
  } catch (error) {
    console.error('Claude Design critique:', error);
    res.status(400).json({ error: error.message || 'Arvion luonti epäonnistui.' });
  }
});

module.exports = router;
