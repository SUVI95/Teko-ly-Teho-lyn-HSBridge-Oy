const express = require('express');
const { fetch } = require('undici');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const callsByUser = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_CALLS = 20;

const FIXTURES = {
  calendar: {
    connector: 'Google Calendar',
    checkedAt: '12.8.2026 klo 9.08',
    data: {
      eventId: 'cal-2048',
      title: 'Kaiku Audio — sopimuksen jatko',
      date: '12.8.2026',
      time: '13.00–14.00',
      participants: ['Laura Niemi / Kaiku Audio', 'Aino Korhonen / Northstar'],
      location: 'Google Meet',
      updatedAt: '8.8.2026 klo 15.42',
      note: 'Kalenterikutsu on vanhempi kuin asiakkaan viimeisin sähköposti.'
    }
  },
  gmail: {
    connector: 'Gmail',
    checkedAt: '12.8.2026 klo 9.09',
    data: {
      threadId: 'mail-771',
      from: 'Laura Niemi <laura@kaikuaudio.example>',
      subject: 'Re: Sopimuksen jatko — tapaamisaika',
      receivedAt: '12.8.2026 klo 8.17',
      message: 'Hei Aino, klo 14 sopii meille molemmille. Voitko päivittää kutsun? Haluaisimme käsitellä myös toimitusviivettä ja ensi kauden tukimallia.',
      status: 'Ei vastausta'
    }
  },
  crm: {
    connector: 'HubSpot CRM',
    checkedAt: '12.8.2026 klo 9.09',
    data: {
      company: 'Kaiku Audio Oy',
      contact: 'Laura Niemi, operatiivinen johtaja',
      renewalDate: '31.8.2026',
      dealStage: 'Jatkosopimus neuvottelussa',
      accountHealth: 'Huomioitava',
      openIssue: 'Kesäkuun toimitus viivästyi seitsemän päivää',
      nextStep: 'Sovi korjaava toimenpide ja tukimalli ennen jatkopäätöstä',
      lastUpdated: '11.8.2026 klo 16.20'
    }
  },
  drive: {
    connector: 'Google Drive',
    checkedAt: '12.8.2026 klo 9.10',
    data: {
      folder: 'Asiakkaat / Kaiku Audio / Jatkosopimus 2026',
      latestFile: 'Kaiku_Audio_tarjous_v3.pdf',
      modifiedAt: '11.8.2026 klo 14.05',
      owner: 'Aino Korhonen',
      keyPoints: [
        'Sopimuskausi 12 kuukautta',
        'Kuukausihinta 4 800 euroa',
        'Tukivaste arkipäivisin neljä tuntia',
        'Avoin kohta: hyvitys kesäkuun toimitusviiveestä'
      ],
      warning: 'Kansiossa on myös vanha v2-versio. Käytä v3-tiedostoa.'
    }
  },
  slack: {
    connector: 'Slack',
    checkedAt: '12.8.2026 klo 9.10',
    data: {
      result: 'Ei asiakkaan vahvistamaa tapaamisaikaa.',
      messages: [
        'Sisäinen viesti: “Kaiku-tapaaminen taitaa olla iltapäivällä.”',
        'Tieto on epävarma eikä korvaa asiakkaan sähköpostia.'
      ]
    }
  },
  github: {
    connector: 'GitHub',
    checkedAt: '12.8.2026 klo 9.10',
    data: {
      result: 'Ei tehtävään liittyviä tietoja.',
      repositoriesSearched: 6
    }
  },
  hr: {
    connector: 'Henkilöstöhallinto',
    checkedAt: '12.8.2026 klo 9.10',
    data: {
      result: 'Ei tehtävään liittyviä tietoja. Henkilöstötietoja ei avattu.',
      accessPrevented: true
    }
  }
};

const TOOL_BY_CONNECTOR = {
  calendar: 'read_calendar',
  gmail: 'search_client_email',
  crm: 'read_customer_record',
  drive: 'read_meeting_folder',
  slack: 'search_team_messages',
  github: 'search_code_repositories',
  hr: 'read_hr_system'
};

const TOOL_DEFINITIONS = {
  calendar: {
    name: 'read_calendar',
    description: 'Lue harjoitusympäristön tämänpäiväinen asiakastapahtuma Google Calendarista.',
    input_schema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Tarkistettava päivämäärä.' } },
      required: []
    }
  },
  gmail: {
    name: 'search_client_email',
    description: 'Etsi harjoitusympäristön uusin Kaiku Audio -asiakkaan sähköpostiketju.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Sähköpostihaun hakulause.' } },
      required: []
    }
  },
  crm: {
    name: 'read_customer_record',
    description: 'Lue Kaiku Audio Oy:n asiakaskortti harjoitusympäristön asiakasrekisteristä.',
    input_schema: {
      type: 'object',
      properties: { company: { type: 'string', description: 'Asiakasyrityksen nimi.' } },
      required: []
    }
  },
  drive: {
    name: 'read_meeting_folder',
    description: 'Lue Kaiku Audio -tapaamisen uusin tarjous harjoitusympäristön Google Drive -kansiosta.',
    input_schema: {
      type: 'object',
      properties: { folder: { type: 'string', description: 'Haettava asiakaskansio.' } },
      required: []
    }
  },
  slack: {
    name: 'search_team_messages',
    description: 'Etsi Kaiku Audioon liittyviä viestejä harjoitusympäristön Slackista.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: []
    }
  },
  github: {
    name: 'search_code_repositories',
    description: 'Etsi Kaiku Audioon liittyviä tietoja harjoitusympäristön GitHub-varastoista.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: []
    }
  },
  hr: {
    name: 'read_hr_system',
    description: 'Tarkista, sisältääkö henkilöstöhallinnon järjestelmä tehtävään tarvittavaa tietoa.',
    input_schema: {
      type: 'object',
      properties: { purpose: { type: 'string' } },
      required: []
    }
  }
};

function envTrim(name) {
  return String(process.env[name] || '').trim();
}

function cleanText(value, max = 900) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
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
    if (start === -1 || end <= start) throw new Error('Claude ei palauttanut kelvollista vastausta.');
    return JSON.parse(text.slice(start, end + 1));
  }
}

async function callAnthropic(payload) {
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
        model: envTrim('ANTHROPIC_CONNECTORS_MODEL') || envTrim('ANTHROPIC_MODEL') || 'claude-haiku-4-5',
        max_tokens: payload.max_tokens || 2200,
        temperature: payload.temperature == null ? 0.2 : payload.temperature,
        ...payload
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('Claude Connectors Anthropic error:', response.status, detail.slice(0, 500));
      throw new Error('Claude-palvelu ei vastannut. Yritä uudelleen.');
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function selectedConnectors(value) {
  const raw = Array.isArray(value) ? value : [];
  return [...new Set(raw.map((id) => cleanText(id, 30)).filter((id) => FIXTURES[id]))].slice(0, 7);
}

function executeRead(connectorId, origin) {
  const fixture = FIXTURES[connectorId];
  return {
    id: `read-${connectorId}`,
    connectorId,
    connector: fixture.connector,
    tool: TOOL_BY_CONNECTOR[connectorId],
    status: 'read',
    origin,
    checkedAt: fixture.checkedAt,
    result: fixture.data
  };
}

function normalizeAnalysis(raw) {
  const findings = Array.isArray(raw?.findings) ? raw.findings.slice(0, 6) : [];
  return {
    summary: cleanText(raw?.summary, 900),
    findings: findings.map((item) => ({
      source: cleanText(item?.source, 80),
      title: cleanText(item?.title, 140),
      detail: cleanText(item?.detail, 500),
      importance: ['high', 'medium', 'low'].includes(item?.importance) ? item.importance : 'medium'
    })),
    conflict: {
      title: cleanText(raw?.conflict?.title, 140),
      detail: cleanText(raw?.conflict?.detail, 500),
      recommendation: cleanText(raw?.conflict?.recommendation, 500)
    },
    nextStep: cleanText(raw?.nextStep, 500)
  };
}

function proposedActions(selected) {
  const has = (id) => selected.includes(id);
  return [
    {
      id: 'calendar-update',
      connectorId: 'calendar',
      connector: 'Google Calendar',
      title: 'Päivitä tapaaminen kello 14:ään',
      detail: 'Muuta tapahtuma ajalle 14.00–15.00. Säilytä osallistujat ja Google Meet -linkki.',
      permission: 'Yhden tapahtuman muokkaus',
      available: has('calendar')
    },
    {
      id: 'email-draft',
      connectorId: 'gmail',
      connector: 'Gmail',
      title: 'Luo vastausluonnos asiakkaalle',
      detail: 'Vahvista uusi aika ja kerro, että toimitusviive sekä tukimalli ovat tapaamisen asialistalla. Älä lähetä viestiä.',
      permission: 'Luonnoksen luonti, ei lähetysoikeutta',
      available: has('gmail')
    },
    {
      id: 'drive-brief',
      connectorId: 'drive',
      connector: 'Google Drive',
      title: 'Tallenna tapaamismuistio',
      detail: 'Luo asiakaskansioon muistio, joka käyttää tarjouksen v3-versiota ja nostaa avoimen hyvityskohdan näkyviin.',
      permission: 'Yhden tiedoston luonti asiakaskansioon',
      available: has('drive')
    },
    {
      id: 'crm-note',
      connectorId: 'crm',
      connector: 'HubSpot CRM',
      title: 'Lisää valmistelumerkintä asiakaskortille',
      detail: 'Kirjaa sovittu aika, toimitusviiveen käsittely ja tukimallia koskeva seuraava askel.',
      permission: 'Merkinnän lisäys yhdelle asiakkaalle',
      available: has('crm')
    }
  ];
}

router.get('/health', authOrPreview, (req, res) => {
  res.json({
    ok: true,
    provider: envTrim('ANTHROPIC_API_KEY') ? 'claude' : 'missing',
    sandbox: true
  });
});

router.post('/investigate', authOrPreview, rateLimit, async (req, res) => {
  try {
    const prompt = cleanText(req.body?.prompt, 1200);
    const selected = selectedConnectors(req.body?.connectors);
    if (prompt.length < 20) throw new Error('Kirjoita Claudelle vähintään 20 merkin toimeksianto.');
    if (selected.length < 2) throw new Error('Valitse vähintään kaksi yhteyttä.');

    const tools = selected.map((id) => TOOL_DEFINITIONS[id]);
    const system = `Olet Claude turvallisessa suomalaisessa yhteysharjoituksessa.
Käyttäjä valmistautuu tänään Kaiku Audio Oy:n jatkosopimustapaamiseen.
Käytä kaikkia sinulle annettuja lukutyökaluja, jotka ovat tehtävän kannalta hyödyllisiä.
Älä väitä muuttaneesi mitään. Tässä vaiheessa saat vain lukea tietoja.
Suhtaudu lähteisiin kriittisesti: huomioi päiväys, lähettäjä, tiedoston versio ja lähteen luotettavuus.
Kirjoita työkalukutsujen jälkeen lyhyt luonnollinen vastaus suomeksi.`;

    let toolResponse = null;
    if (tools.length) {
      toolResponse = await callAnthropic({
        system,
        messages: [{ role: 'user', content: prompt }],
        tools,
        tool_choice: { type: 'any', disable_parallel_tool_use: false },
        max_tokens: 1500,
        temperature: 0
      });
    }

    const log = [];
    const seen = new Set();
    for (const block of toolResponse?.content || []) {
      if (block?.type !== 'tool_use') continue;
      const connectorId = selected.find((id) => TOOL_BY_CONNECTOR[id] === block.name);
      if (!connectorId || seen.has(connectorId)) continue;
      seen.add(connectorId);
      log.push(executeRead(connectorId, 'claude'));
    }
    selected.forEach((connectorId) => {
      if (!seen.has(connectorId)) log.push(executeRead(connectorId, 'orchestrator'));
    });

    const analysisResponse = await callAnthropic({
      system: `Toimit suomalaisena asiakastyön valmisteluavustajana.
Analysoi vain annetut lähdetiedot. Erota vahvistettu tieto, ristiriita ja epävarma tieto.
Älä väitä tehneesi muutoksia. Kirjoita huoliteltua suomea ilman tarpeetonta ammattisanastoa.
Palauta vain JSON muodossa:
{
  "summary":"",
  "findings":[{"source":"","title":"","detail":"","importance":"high|medium|low"}],
  "conflict":{"title":"","detail":"","recommendation":""},
  "nextStep":""
}`,
      messages: [{
        role: 'user',
        content: `Käyttäjän toimeksianto:
${prompt}

Yhteyksistä luetut tiedot:
${JSON.stringify(log.map((entry) => ({
  source: entry.connector,
  checkedAt: entry.checkedAt,
  data: entry.result
})))}`
      }],
      max_tokens: 2200,
      temperature: 0.15
    });
    const analysisText = (analysisResponse.content || [])
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const analysis = normalizeAnalysis(parseJsonObject(analysisText));

    res.json({
      success: true,
      analysis,
      toolLog: log,
      proposals: proposedActions(selected),
      usedClaudeTools: log.some((entry) => entry.origin === 'claude')
    });
  } catch (error) {
    console.error('Claude Connectors investigate:', error);
    const status = error.name === 'AbortError' ? 504 : 400;
    res.status(status).json({
      error: error.name === 'AbortError'
        ? 'Tietojen tutkiminen kesti liian kauan. Yritä uudelleen.'
        : (error.message || 'Yhteyksien tutkiminen epäonnistui.')
    });
  }
});

module.exports = router;
