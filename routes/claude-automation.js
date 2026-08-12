const express = require('express');
const { fetch } = require('undici');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const callsByUser = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CALLS = 24;
const ALLOWED_SOURCES = new Set(['calendar', 'gmail', 'crm', 'drive']);
const ALLOWED_SCENARIOS = new Set(['normal', 'stale', 'conflict']);

const SCENARIOS = {
  normal: {
    label: 'Normaali maanantai',
    now: '17.8.2026 klo 8.15',
    sources: {
      calendar: {
        checkedAt: '17.8.2026 klo 8.15',
        dataPeriod: '10.–16.8.2026',
        meetings: [
          'Kaiku Audio — jatkosopimus',
          'Lumo Labs — käyttöönottopalaveri',
          'Sisäinen viikkokatsaus'
        ]
      },
      gmail: {
        checkedAt: '17.8.2026 klo 8.16',
        importantThreads: [
          'Kaiku Audio: tukimallin jatkokysymys',
          'Lumo Labs: käyttöönoton aikataulu vahvistettu'
        ],
        newslettersExcluded: 7
      },
      crm: {
        checkedAt: '17.8.2026 klo 8.16',
        updatedAt: '16.8.2026 klo 17.40',
        risks: ['Kaiku Audio — hyvitys vielä avoinna'],
        nextSteps: ['Vahvista Kaiku Audion hyvitysehdotus keskiviikkoon mennessä']
      },
      drive: {
        checkedAt: '17.8.2026 klo 8.17',
        latestFiles: ['Kaiku_Audio_tapaamismuistio.md', 'Lumo_Labs_kayttoonotto_v2.pdf'],
        oldestSourceAgeHours: 42
      }
    }
  },
  stale: {
    label: 'Vanhentunut lähde',
    now: '24.8.2026 klo 8.15',
    sources: {
      calendar: {
        checkedAt: '24.8.2026 klo 8.15',
        dataPeriod: '17.–23.8.2026',
        meetings: ['Kaiku Audio — hyvityksen vahvistus', 'Sisäinen viikkokatsaus']
      },
      gmail: {
        checkedAt: '24.8.2026 klo 8.16',
        importantThreads: ['Kaiku Audio: hyvitys hyväksytty sähköpostissa'],
        newslettersExcluded: 4
      },
      crm: {
        checkedAt: '24.8.2026 klo 8.16',
        updatedAt: '11.8.2026 klo 16.20',
        staleDays: 13,
        warning: 'Asiakaskorttia ei ole päivitetty 13 päivään.',
        risks: ['Kaiku Audio — hyvitys näkyy edelleen avoimena']
      },
      drive: {
        checkedAt: '24.8.2026 klo 8.17',
        latestFiles: ['Kaiku_Audio_hyvitys_vahvistettu.pdf'],
        oldestSourceAgeHours: 20
      }
    }
  },
  conflict: {
    label: 'Ristiriitaiset lähteet',
    now: '31.8.2026 klo 8.15',
    sources: {
      calendar: {
        checkedAt: '31.8.2026 klo 8.15',
        meetings: ['Lumo Labs — tuotantoon siirto 2.9.2026']
      },
      gmail: {
        checkedAt: '31.8.2026 klo 8.16',
        importantThreads: ['Lumo Labs: asiakkaan pyyntö siirtää tuotantoon siirto 9.9.2026'],
        conflict: 'Sähköpostin päivämäärä poikkeaa kalenterista.'
      },
      crm: {
        checkedAt: '31.8.2026 klo 8.16',
        updatedAt: '30.8.2026 klo 14.30',
        nextSteps: ['Tuotantoon siirto 2.9.2026'],
        conflict: 'Asiakasrekisteri vastaa kalenteria, mutta on sähköpostia vanhempi.'
      },
      drive: {
        checkedAt: '31.8.2026 klo 8.17',
        latestFiles: ['Lumo_Labs_kayttoonotto_v2.pdf']
      }
    }
  }
};

function envTrim(name) {
  return String(process.env[name] || '').trim();
}

function cleanText(value, max = 900) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function cleanList(value, maxItems = 8, maxText = 300) {
  return Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanText(item, maxText)).filter(Boolean)
    : [];
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

async function callClaudeJson({ system, user, maxTokens = 2800, temperature = 0.2 }) {
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
        model: envTrim('ANTHROPIC_AUTOMATION_MODEL') || envTrim('ANTHROPIC_MODEL') || 'claude-haiku-4-5',
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }]
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Claude Automation Anthropic error:', response.status, detail.slice(0, 500));
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

function normalizeInput(body) {
  const goal = cleanText(body?.goal, 1000);
  const output = cleanText(body?.output, 500);
  const guardrail = cleanText(body?.guardrail, 700);
  const approval = cleanText(body?.approval, 700);
  const sources = [...new Set((Array.isArray(body?.sources) ? body.sources : [])
    .map((item) => cleanText(item, 30))
    .filter((item) => ALLOWED_SOURCES.has(item)))];
  const day = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(body?.schedule?.day)
    ? body.schedule.day
    : 'monday';
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body?.schedule?.time || ''))
    ? String(body.schedule.time)
    : '08:15';
  if (goal.length < 30) throw new Error('Kuvaa taidon tavoite vähintään 30 merkillä.');
  if (output.length < 10) throw new Error('Kuvaa, millainen lopputulos automaation pitää tuottaa.');
  if (guardrail.length < 15) throw new Error('Kuvaa vähintään yksi tilanne, jossa automaation pitää pysähtyä.');
  if (approval.length < 15) throw new Error('Kuvaa, mikä toiminto vaatii ihmisen hyväksynnän.');
  if (sources.length < 2) throw new Error('Valitse vähintään kaksi tietolähdettä.');
  return { goal, output, guardrail, approval, sources, schedule: { day, time, timezone: 'Europe/Helsinki' } };
}

function normalizeSkill(raw, input) {
  const steps = Array.isArray(raw?.steps) ? raw.steps.slice(0, 8) : [];
  return {
    version: 1,
    name: cleanText(raw?.name || 'Maanantaikatsaus', 90),
    purpose: cleanText(raw?.purpose || input.goal, 500),
    invocation: cleanText(raw?.invocation || '/maanantaikatsaus', 80),
    sources: input.sources,
    instructions: cleanList(raw?.instructions, 8, 400),
    steps: steps.map((step, index) => ({
      id: cleanText(step?.id || `step-${index + 1}`, 50),
      title: cleanText(step?.title, 120),
      instruction: cleanText(step?.instruction, 500),
      kind: ['read', 'check', 'reason', 'write', 'approval'].includes(step?.kind) ? step.kind : 'reason',
      connector: input.sources.includes(step?.connector) ? step.connector : ''
    })),
    output: {
      title: cleanText(raw?.output?.title || 'Maanantaikatsaus', 120),
      format: cleanText(raw?.output?.format || input.output, 300),
      destination: cleanText(raw?.output?.destination || 'Claude-keskustelu', 120)
    },
    guardrails: cleanList(raw?.guardrails, 8, 400),
    approvalGate: {
      required: true,
      when: cleanText(raw?.approvalGate?.when || input.approval, 500),
      action: cleanText(raw?.approvalGate?.action || 'Pysäytä ajo ja pyydä hyväksyntä.', 300)
    },
    schedule: input.schedule
  };
}

function normalizeSimulation(raw, scenarioId, selectedSources) {
  const events = Array.isArray(raw?.events) ? raw.events.slice(0, 12) : [];
  const expectedStatus = scenarioId === 'normal' ? 'completed' : 'paused';
  return {
    scenarioId,
    // The sandbox orchestrator enforces the safety policy even if a model response is too permissive.
    status: expectedStatus,
    headline: cleanText(raw?.headline, 150),
    summary: cleanText(raw?.summary, 1000),
    warning: cleanText(raw?.warning, 500),
    requiresApproval: scenarioId !== 'normal' || Boolean(raw?.requiresApproval),
    recommendation: cleanText(raw?.recommendation, 600),
    outputPreview: cleanText(raw?.outputPreview, 1600),
    events: events.map((event, index) => ({
      id: cleanText(event?.id || `event-${index + 1}`, 50),
      source: selectedSources.includes(event?.source) ? event.source : 'automation',
      label: cleanText(event?.label, 140),
      detail: cleanText(event?.detail, 500),
      status: ['ok', 'warning', 'paused'].includes(event?.status) ? event.status : 'ok'
    }))
  };
}

router.get('/health', authOrPreview, (req, res) => {
  res.json({
    ok: true,
    provider: envTrim('ANTHROPIC_API_KEY') ? 'claude' : 'missing',
    sandbox: true
  });
});

router.post('/compile', authOrPreview, rateLimit, async (req, res) => {
  try {
    const input = normalizeInput(req.body);
    const raw = await callClaudeJson({
      system: `Toimit suomalaisena automaatioarkkitehtina ja kouluttajana.
Muunna käyttäjän kuvaus uudelleenkäytettäväksi Claude Skill -taidoksi ja turvalliseksi ajastetuksi automaatioksi.
Erota aina neljä asiaa: taidon pysyvä ohje, yhteyksistä luettava tieto, ajastus sekä hyväksyntää vaativa toiminto.
Älä lisää käyttäjän valitsemattomia tietolähteitä.
Ohjeista automaatio pysähtymään, jos lähde on vanhentunut, puuttuu tai on ristiriidassa toisen lähteen kanssa.
Kirjoita huoliteltua suomea ja palauta vain JSON:
{
  "name":"",
  "purpose":"",
  "invocation":"/komento",
  "instructions":[""],
  "steps":[{"id":"","title":"","instruction":"","kind":"read|check|reason|write|approval","connector":"calendar|gmail|crm|drive|"}],
  "output":{"title":"","format":"","destination":""},
  "guardrails":[""],
  "approvalGate":{"when":"","action":""}
}`,
      user: `Rakenna taito ja automaatio näistä tiedoista:
${JSON.stringify(input)}`,
      maxTokens: 3000,
      temperature: 0.2
    });
    const skill = normalizeSkill(raw, input);
    if (skill.steps.length < 4 || skill.guardrails.length < 2) {
      throw new Error('Claude ei tuottanut riittävän täydellistä taitoa. Täsmennä ohjetta ja yritä uudelleen.');
    }
    res.json({ success: true, input, skill });
  } catch (error) {
    console.error('Claude Automation compile:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({
      error: error.name === 'AbortError'
        ? 'Taidon rakentaminen kesti liian kauan. Yritä uudelleen.'
        : (error.message || 'Taidon rakentaminen epäonnistui.')
    });
  }
});

router.post('/simulate', authOrPreview, rateLimit, async (req, res) => {
  try {
    const scenarioId = ALLOWED_SCENARIOS.has(req.body?.scenarioId) ? req.body.scenarioId : null;
    if (!scenarioId) throw new Error('Valitse testitilanne.');
    const sources = [...new Set((Array.isArray(req.body?.skill?.sources) ? req.body.skill.sources : [])
      .map((item) => cleanText(item, 30))
      .filter((item) => ALLOWED_SOURCES.has(item)))];
    if (sources.length < 2) throw new Error('Taidosta puuttuvat tietolähteet.');
    const scenario = SCENARIOS[scenarioId];
    const availableData = Object.fromEntries(
      Object.entries(scenario.sources).filter(([source]) => sources.includes(source))
    );
    const safeSkill = {
      name: cleanText(req.body?.skill?.name, 90),
      purpose: cleanText(req.body?.skill?.purpose, 500),
      instructions: cleanList(req.body?.skill?.instructions, 8, 400),
      steps: (Array.isArray(req.body?.skill?.steps) ? req.body.skill.steps : []).slice(0, 8).map((step, index) => ({
        id: cleanText(step?.id || `step-${index + 1}`, 50),
        title: cleanText(step?.title, 120),
        instruction: cleanText(step?.instruction, 500),
        kind: ['read', 'check', 'reason', 'write', 'approval'].includes(step?.kind) ? step.kind : 'reason',
        connector: sources.includes(step?.connector) ? step.connector : ''
      })),
      output: {
        title: cleanText(req.body?.skill?.output?.title, 120),
        format: cleanText(req.body?.skill?.output?.format, 300),
        destination: cleanText(req.body?.skill?.output?.destination, 120)
      },
      guardrails: cleanList(req.body?.skill?.guardrails, 8, 400),
      approvalGate: {
        required: true,
        when: cleanText(req.body?.skill?.approvalGate?.when, 500),
        action: cleanText(req.body?.skill?.approvalGate?.action, 300)
      }
    };
    const raw = await callClaudeJson({
      system: `Toimit turvallisen automaation testiympäristönä.
Suorita annettu taito vain annetuilla harjoitustiedoilla ja kuvaa jokainen vaihe tapahtumana.
Normaalissa tilanteessa automaatio voi valmistua.
Vanhentuneen lähteen tilanteessa automaation pitää pysähtyä eikä se saa esittää vanhaa tietoa ajantasaisena.
Ristiriitaisten lähteiden tilanteessa automaation pitää pysähtyä ja pyytää ihmisen päätös.
Älä keksi puuttuvia tietoja. Kirjoita huoliteltua suomea.
Palauta vain JSON:
{
  "status":"completed|paused|failed",
  "headline":"",
  "summary":"",
  "warning":"",
  "requiresApproval":true,
  "recommendation":"",
  "outputPreview":"",
  "events":[{"id":"","source":"calendar|gmail|crm|drive|automation","label":"","detail":"","status":"ok|warning|paused"}]
}`,
      user: `Testattava taito:
${JSON.stringify(safeSkill)}

Testitilanne:
${JSON.stringify({
  id: scenarioId,
  label: scenario.label,
  now: scenario.now,
  sources: availableData
})}`,
      maxTokens: 3000,
      temperature: 0.1
    });
    const simulation = normalizeSimulation(raw, scenarioId, sources);
    res.json({ success: true, scenario: { id: scenarioId, label: scenario.label }, simulation });
  } catch (error) {
    console.error('Claude Automation simulate:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({
      error: error.name === 'AbortError'
        ? 'Testiajo kesti liian kauan. Yritä uudelleen.'
        : (error.message || 'Automaation testaus epäonnistui.')
    });
  }
});

module.exports = router;
