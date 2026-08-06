/**
 * Live voice-to-voice for moduuli-voice-deep-search.
 * OpenAI Realtime = role-play audio. Claude = post-call coaching feedback.
 * Brief (profession + AI research notes) is injected into every persona.
 */
const express = require('express');
const { fetch } = require('undici');
const { buildMultipartForm } = require('../lib/multipart-form');

const router = express.Router();

function envTrim(name) {
  const v = process.env[name];
  return v == null ? '' : String(v).trim();
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function realtimeModel() {
  // Best current speech-to-speech Realtime model
  return envTrim('OPENAI_REALTIME_MODEL') || envTrim('OPENAI_VOICE_MODEL') || 'gpt-realtime-2.1';
}

function realtimeVoice() {
  // One calm, easy-going Realtime voice for every live call on this page.
  // cedar = OpenAI-recommended high-quality Realtime voice (natural / warm).
  return (
    envTrim('OPENAI_VDS_REALTIME_VOICE') ||
    envTrim('OPENAI_REALTIME_VOICE') ||
    'cedar'
  );
}

function claudeModel() {
  return envTrim('ANTHROPIC_MODEL') || 'claude-sonnet-4-5';
}

const SHARED_RULES = [
  'Puhut suomea luonnollisesti, kuin oikea ihminen. Et ole robotti etkä lue listaa.',
  'ÄÄNI JA TYYLI: puhu rauhallisesti, ystävällisesti ja rennosti. Älä kiirehdi. Pidä sävy helposti lähestyttävänä — ei tiukka, ei dramaattinen.',
  'TÄRKEIN SÄÄNTÖ: sano vain yksi asia kerrallaan ja esitä täsmälleen yksi kysymys tai haaste. Kun olet sanonut sen, LOPETA ja odota hiljaa, kunnes käyttäjä vastaa.',
  'Pidä jokainen puheenvuoro lyhyenä: enintään 2–3 lausetta.',
  'Älä anna valmennuspalautetta, älä opeta STAR-mallia, älä arvostele suoritusta ääneen. Pysy roolissasi koko keskustelun ajan.',
  'ÄLÄ KOSKAAN toista samoja kysymyksiä kuin toisessa harjoituksessa. Pysy tämän skenaarion omassa kysymyslistassa.'
];

const SCENARIOS = {
  ai_defense: {
    key: 'ai_defense',
    label: 'Skeptinen esihenkilö · AI-puolustus',
    turns: 5,
    persona: [
      'Olet skeptinen esihenkilö. Työntekijä on tehnyt Deep Search -tutkimuksen tekoälyn vaikutuksesta omaan alaansa.',
      'Tiedät jo ammattialan briefistä — ÄLÄ kysy "mikä on ammattisi?" tai "kerro itsestäsi".',
      'Tämä EI ole työhaastattelu eikä STAR-harjoitus. Älä pyydä STAR-tarinaa. Älä kysy motivaatiota uralle.',
      'Kysy yksi asia kerrallaan, tässä järjestyksessä:',
      '1) Aloita suoraan: "Mainitsit tutkimuksessa AI-työkaluja — anna yksi konkreettinen esimerkki, miten niitä käytetään arjessa teidän alallanne."',
      '2) "Mikä tässä säästää oikeasti aikaa — älä myy hypeä, anna yksi mitattava hyöty."',
      '3) "Kerro yksi riski tai haitta jota et voi sivuuttaa. Mitä teet jos tekoäly erehtyy?"',
      '4) "Miksi juuri sinun pitäisi saada käyttää näitä työkaluja — mitä vastuuta otat itse?"',
      '5) Lyhyt päätös: kuulostaako perustelu uskottavalta vai vielä hataralta? Yksi lause, ei valmennuslistaa.',
      'Jos vastaus on ympäripyöreä, pyydä yksi esimerkki. Jos haitat unohtuvat, muistuta niistä.'
    ]
  },
  job_interview: {
    key: 'job_interview',
    label: 'Rekrytoija · työhaastattelu',
    turns: 5,
    persona: [
      'Olet rekrytoija suomalaisessa yrityksessä. Haastattelet hakijaa briefissä olevaan ammattialaan.',
      'KIELTO — älä koskaan kysy näitä (ne on jo harjoiteltu muualla): "mikä on ammattisi?", "kerro itsestäsi / taustastasi", "kerro tilanteesta jossa ratkaisit ongelman", STAR-tarina (tilanne–tehtävä–toiminta–tulos), "mitä AI-työkaluja alalla käytetään?", "mitkä ovat tekoälyn riskit alallasi?".',
      'Käytä briefiä taustatietona hiljaa. Aloita suoraan haastattelukysymyksillä — älä pyydä esittelyä.',
      'Kysy yksi asia kerrallaan, tässä järjestyksessä (luova, eri kuin STAR/Deep Search):',
      '1) Motivaatio nyt: "Mikä tässä työssä / alalla kiinnostaa sinua juuri nyt — yksi konkreettinen syy?"',
      '2) Yhteistyö: "Kerro tilanteesta jossa tiimissä oli eriävät mielipiteet. Miten sovittelit asian?" (Älä pyydä STAR-rakennetta ääneen.)',
      '3) Oppiminen paineessa: "Miten opit uuden työkalun tai tavan, kun aikaa on vähän?"',
      '4) Arvostelukyky: "Kollega pyytää käyttämään tekoälyä tavalla joka tuntuu epäselvältä tai riskialttiilta. Mitä teet ensin?"',
      '5) Valinta: "Anna yksi konkreettinen syy, miksi juuri sinut kannattaisi valita tähän rooliin."',
      'Ole rauhallinen ja ystävällinen. Älä paljasta mallivastauksia. Pidä tempo kuin oikeassa haastattelussa.'
    ]
  },
  star_drill: {
    key: 'star_drill',
    label: 'Haastattelija · STAR-harjoitus',
    turns: 4,
    persona: [
      'Olet harjoittelukumppani STAR-vastaukselle. STAR = Tilanne, Tehtävä, Toiminta, Tulos.',
      'Tämä on VAIN STAR-harjoitus — ei työhaastattelu, ei Deep Search -puolustus.',
      'KIELTO — älä kysy: ammattia, "kerro itsestäsi", motivaatiota uralle, AI-työkalulistaa, tekoälyn riskejä alalla, miksi sinut pitäisi palkata.',
      'Aloita HETI yhdellä kysymyksellä: "Kerro yksi konkreettinen tilanne työstäsi, jossa ratkaisit vaikean asian. Aloita siitä, missä olit ja mikä meni pieleen."',
      'Kuuntele. Seuraavissa vuoroissa kysy TÄSMÄLLEEN yksi puuttuva STAR-osa kerrallaan: mikä oli sinun tehtäväsi / mitä SINÄ teit askel askeleelta / mikä oli mitattava tulos.',
      'Jos kaikki osat ovat jo vastauksessa, pyydä vain: "Tiivistä sama tarina alle minuuttiin" — älä vaihda uuteen aiheeseen.',
      'Älä selitä STAR-teoriaa ääneen. Älä anna pisteitä.'
    ]
  },
  case_judgment: {
    key: 'case_judgment',
    label: 'Kollega Matti · AI-tilanne',
    turns: 4,
    persona: [
      'Olet Matti, innokas kollega asiakaspalvelutiimissä. Ehdotat nopeaa AI-tapaa hoitaa valitusviestit.',
      'TILANNE jonka opiskelija näkee ruudulla: asiakas valittaa myöhästyneestä tilauksesta. Sinä (Matti) ehdotat: 1) liität koko asiakassähköpostin ChatGPT:hen, 2) lähetät AI-vastauksen sellaisenaan, 3) annat AI:n luvata 50 euron hyvityksen rauhoittaaksesi asiakasta.',
      'TYÖPAIKAN SÄÄNNÖT (opiskelija näkee nämä): A) Älä liitä asiakkaan henkilötietoja avoimeen AI-työkaluun. B) Ihminen lukee AI-luonnoksen ennen lähetystä. C) Hintalupaukset ja hyvitykset vaativat esihenkilön luvan. D) AI saa auttaa kieliasussa ja rakenteessa.',
      'Tehtäväsi: puolustaa omaa “nopeaa” tapaasi kevyesti ja kysyä miksi opiskelija vastustaa. Ole ystävällinen, et toru. Painosta hieman: “Eikö tämä säästä aikaa?” “Asiakas on vihainen, eikö hyvitys auta?”',
      'Kysy yksi asia kerrallaan. ÄLÄ kerro mikä on oikein tai väärin. ÄLÄ opeta sääntöjä. Jos opiskelija viittaa sääntöön, reagoi luonnollisesti (“Ahaa, ok”) ja kysy yksi jatkokysymys.',
      'Älä kysy mitään tämän tilanteen ulkopuolelta. Älä kysy ammattia, Deep Searchista, CV:stä tai STAR-mallista.'
    ]
  }
};

function resolveScenario(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return SCENARIOS[key] ? key : 'ai_defense';
}

function phasesFor(scenarioKey) {
  const maps = {
    ai_defense: [
      { id: 'tyokalut', label: 'Esimerkki', tag: 'Arki' },
      { id: 'hyodyt', label: 'Hyöty', tag: 'Mittari' },
      { id: 'riskit', label: 'Riskit', tag: 'Haitat' },
      { id: 'vastuu', label: 'Vastuu', tag: 'Sinä' },
      { id: 'puolustus', label: 'Päätös', tag: 'Lopetus' }
    ],
    job_interview: [
      { id: 'motivation', label: 'Motivaatio', tag: 'Miksi' },
      { id: 'team', label: 'Tiimi', tag: 'Yhteistyö' },
      { id: 'learning', label: 'Oppiminen', tag: 'Paine' },
      { id: 'judgment', label: 'Harkinta', tag: 'AI-raja' },
      { id: 'why_you', label: 'Miksi sinä', tag: 'Päätös' }
    ],
    star_drill: [
      { id: 'story', label: 'Tarina', tag: 'Avaus' },
      { id: 'probe1', label: 'Tarkenne 1', tag: 'STAR' },
      { id: 'probe2', label: 'Tarkenne 2', tag: 'STAR' },
      { id: 'tighten', label: 'Tiivistys', tag: 'Päätös' }
    ],
    case_judgment: [
      { id: 'idea', label: 'Matin idea', tag: 'Avaus' },
      { id: 'data', label: 'Tiedot AI:lle', tag: 'Sääntö' },
      { id: 'send', label: 'Lähetys', tag: 'Sääntö' },
      { id: 'promise', label: 'Hyvitys', tag: 'Sääntö' }
    ]
  };
  return maps[scenarioKey] || maps.ai_defense;
}

function cleanBrief(brief) {
  return String(brief || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
}

function buildInstructions(scenarioKey, brief) {
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.ai_defense;
  const parts = [...scenario.persona, ...SHARED_RULES];

  // Ready-made case: no research brief.
  if (scenarioKey === 'case_judgment') {
    return parts.filter(Boolean).join('\n');
  }

  // STAR drill: never pull profession Qs from the brief.
  if (scenarioKey === 'star_drill') {
    parts.push(
      'Älä käytä tutkimusbriefiä kysymysten lähteenä. Älä kysy ammattia. Pysy yhdessä STAR-tarinassa.'
    );
    return parts.filter(Boolean).join('\n');
  }

  const ctx = cleanBrief(brief);
  if (ctx) {
    parts.push(
      'KÄYTTÄJÄN TUTKIMUSBRIEF (taustatieto — älä kysele näitä uudestaan, käytä niitä kontekstina):\n' + ctx,
      'Briefissä on jo ammattiala ja tutkimustiedot. ÄLÄ kysy ammattia, AI-työkalulistaa tai riskilistaa uudelleen.'
    );
  } else if (scenarioKey === 'ai_defense') {
    parts.push(
      'Brief tyhjä. Aloita: "Mistä ammatista teit tutkimuksen?" — sen jälkeen jatka työkalu/hyöty/haitta -kysymyksillä. Ei STAR-tarinaa.'
    );
  } else if (scenarioKey === 'job_interview') {
    parts.push(
      'Brief tyhjä. Älä silti tee STAR-harjoitusta. Aloita motivaatiokysymyksellä; jos ala ei selviä, kysy lyhyesti millaisesta roolista haetaan — sitten jatka tiimi/oppiminen/harkinta -kysymyksiin.'
    );
  }

  return parts.filter(Boolean).join('\n');
}

function buildSessionConfig(scenarioKey, brief) {
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.ai_defense;
  return {
    type: 'realtime',
    model: realtimeModel(),
    instructions: buildInstructions(scenarioKey, brief),
    output_modalities: ['audio'],
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: 24000 },
        turn_detection: {
          type: 'semantic_vad',
          eagerness: 'low',
          create_response: false,
          interrupt_response: false
        },
        transcription: { model: 'gpt-4o-mini-transcribe', language: 'fi' }
      },
      output: {
        format: { type: 'audio/pcm', rate: 24000 },
        voice: realtimeVoice()
      }
    }
  };
}

function extractAnthropicText(data) {
  const blocks = Array.isArray(data && data.content) ? data.content : [];
  return blocks
    .filter((b) => b && b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('\n')
    .trim();
}

async function callClaudeFeedback({ system, prompt }) {
  const anthropicKey = envTrim('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    const models = [claudeModel(), 'claude-sonnet-4-5'];
    for (const modelId of models) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 700,
            system,
            messages: [{ role: 'user', content: prompt }]
          }),
          signal: timeoutSignal(40000)
        });
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          console.warn('VDS Claude feedback', modelId, response.status, errText.slice(0, 180));
          continue;
        }
        const data = await response.json();
        const text = extractAnthropicText(data);
        if (text) return { text, provider: 'anthropic', model: modelId };
      } catch (err) {
        console.warn('VDS Claude feedback throw', err.message);
      }
    }
  }

  const openaiApiKey = envTrim('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('Ei Claude- eikä OpenAI-avainta palautteelle');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: envTrim('OPENAI_VOICE_MODEL') || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: 700,
      temperature: 0.5
    }),
    signal: timeoutSignal(45000)
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error('OpenAI feedback failed: ' + details.slice(0, 200));
  }
  const data = await response.json();
  return {
    text: (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '',
    provider: 'openai',
    model: data.model
  };
}

router.get('/realtime/config', (req, res) => {
  const scenarioKey = resolveScenario(req.query.scenario);
  const scenario = SCENARIOS[scenarioKey];
  const phases = phasesFor(scenarioKey);
  res.json({
    scenario: scenarioKey,
    persona: scenario.label,
    model: realtimeModel(),
    voice: realtimeVoice(),
    phases,
    expectedTurns: scenario.turns,
    instructions: buildInstructions(scenarioKey, req.query.brief),
    available: Boolean(envTrim('OPENAI_API_KEY')),
    scenarios: Object.values(SCENARIOS).map((s) => ({
      id: s.key,
      label: s.label,
      turns: s.turns
    }))
  });
});

router.post(
  '/realtime/session',
  express.text({ type: ['application/sdp', 'text/plain'], limit: '512kb' }),
  async (req, res) => {
    try {
      let sdp = String(req.body || '');
      if (!sdp.trim()) return res.status(400).json({ error: 'SDP offer required' });
      if (!/\r?\n$/.test(sdp)) sdp += '\r\n';

      const openaiApiKey = envTrim('OPENAI_API_KEY');
      if (!openaiApiKey) {
        return res.status(503).json({ error: 'Live-ääni ei ole käytössä. Aseta OPENAI_API_KEY.' });
      }

      const scenarioKey = resolveScenario(req.query.scenario);
      const brief = String(req.query.brief || '');
      const sessionConfig = buildSessionConfig(scenarioKey, brief);

      const { body, contentType } = buildMultipartForm([
        { name: 'sdp', value: sdp, contentType: 'application/sdp' },
        { name: 'session', value: JSON.stringify(sessionConfig), contentType: 'application/json' }
      ]);

      let response = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await fetch('https://api.openai.com/v1/realtime/calls', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
              'Content-Type': contentType
            },
            body,
            signal: timeoutSignal(20000)
          });
          if (response.status >= 502 && response.status <= 504) {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }
          }
          break;
        } catch (err) {
          lastErr = err;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
        }
      }

      if (!response) {
        return res.status(502).json({
          error: 'Live-yhteys ei juuri nyt vastannut.',
          details: lastErr ? lastErr.message : 'unknown'
        });
      }

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        console.error('VDS realtime session error:', response.status, details);
        return res.status(response.status >= 500 ? 502 : response.status).json({
          error: 'Live-yhteys epäonnistui',
          details
        });
      }

      const answerSdp = await response.text();
      res.set('Content-Type', 'application/sdp');
      res.send(answerSdp);
    } catch (error) {
      console.error('VDS realtime session error:', error.message);
      res.status(500).json({ error: 'Live-yhteys epäonnistui', message: error.message });
    }
  }
);

router.post('/feedback', async (req, res) => {
  try {
    const sessions = req.body.sessions;
    const scenarioId = resolveScenario(req.body.scenarioId || req.body.scenario);
    const brief = cleanBrief(req.body.brief);
    if (!Array.isArray(sessions) || !sessions.length) {
      return res.status(400).json({ error: 'Sessions array required' });
    }

    const block = sessions
      .map(function (s, i) {
        const q = String(s.question || s.clientText || '').trim();
        const a = String(s.transcript || '').trim();
        const label = String(s.label || 'Vaihe ' + (i + 1)).trim();
        return `--- ${label} ---\nHaastattelija/vastapuoli: ${q || '(ei tallennettu)'}\n\nOpiskelijan vastaus:\n${a || '(tyhjä)'}`;
      })
      .join('\n\n');

    const scenarioHints = {
      ai_defense:
        'Arvioi erityisesti: konkreettiset AI-esimerkit arjesta, mitattava hyöty, riskien tunnistus, henkilökohtainen vastuu. Tämä EI ole STAR-arvio.',
      job_interview:
        'Arvioi erityisesti: motivaatio, yhteistyö eriävissä mielipiteissä, oppiminen paineessa, harkinta kun AI tuntuu riskiltä, miksi juuri hän. ÄLÄ vaadi STAR-rakennetta — sitä harjoiteltiin erikseen.',
      star_drill:
        'Arvioi STAR-rakenteen täydellisyys: puuttuiko Tilanne, Tehtävä, Toiminta tai Tulos? Oliko tulos mitattava? Oliko "minä tein" selvä?',
      case_judgment:
        'Tilanneharjoitus: kollega ehdotti liittämään asiakastiedot ChatGPT:hen, lähettämään AI-vastauksen sellaisenaan ja lupaamaan 50 € hyvityksen. Työpaikan säännöt: ei henkilötietoja avoimeen AI:hin, ihminen lukee luonnoksen, hyvitykset esihenkilöltä, AI saa auttaa kieliasussa. Arvioi löysikö opiskelija nämä rajat. Älä paljasta mallivastausta suoraan — anna palautetta suorituksesta.'
    };

    const system = [
      'Olet työnhaku- ja AI-valmentaja Suomessa. Simuloitu live-äänikeskustelu on päättynyt.',
      'Skenaario: ' + scenarioId + '. ' + (scenarioHints[scenarioId] || ''),
      brief ? 'Opiskelijan brief: ' + brief : '',
      'Anna palaute suomeksi. Merkitse täsmälleen nämä otsikot:',
      '✓ TOIMI:',
      '⚠ PARANNA:',
      '→ MUUTOS:',
      'STAR-HUOMIO: (lyhyt — jos STAR oli relevantti)',
      'Max 12 lausetta. Konkreettinen. Älä kehu tyhjää.'
    ]
      .filter(Boolean)
      .join(' ');

    const result = await callClaudeFeedback({ system, prompt: block });
    res.json({
      feedback: (result.text || '').trim(),
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    console.error('VDS feedback error:', error.message);
    res.status(500).json({ error: 'Palaute epäonnistui', message: error.message });
  }
});

module.exports = router;
module.exports.buildSessionConfig = buildSessionConfig;
module.exports.SCENARIOS = SCENARIOS;
module.exports.realtimeModel = realtimeModel;
