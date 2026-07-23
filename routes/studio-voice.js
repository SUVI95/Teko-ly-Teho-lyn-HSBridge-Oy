/**
 * Live voice-to-voice for the Rivon-viikko module (served as
 * moduuli-ai-laatulaboratorio). OpenAI Realtime API plays the counterpart in
 * three freelance scenarios: keeping the Latu contract (Jari), selling a used
 * bike on Tori (a haggler) and defending a city pilot (Marja). Coaching /
 * rubric scoring is produced separately by Claude via /api/ai.
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

/** Newest realtime model available in this deployment. */
function realtimeModel() {
  return envTrim('OPENAI_REALTIME_MODEL') || envTrim('OPENAI_VOICE_MODEL') || 'gpt-realtime-2.1';
}

function realtimeVoice() {
  return envTrim('OPENAI_STUDIO_REALTIME_VOICE') || envTrim('OPENAI_REALTIME_VOICE') || 'marin';
}

const SHARED_RULES = [
  'Puhut suomea luonnollisesti, kuin oikea ihminen puhelimessa. Et ole robotti etkä lue listaa.',
  'TÄRKEIN SÄÄNTÖ: sano vain yksi asia kerrallaan ja esitä täsmälleen yksi kysymys tai siirto. Kun olet sanonut sen, LOPETA ja odota hiljaa, kunnes käyttäjä vastaa.',
  'Pidä jokainen puheenvuoro lyhyenä: enintään 2–3 lausetta.',
  'Älä anna valmennuspalautetta, älä opeta promptaamista, älä arvostele suoritusta. Pysy roolissasi koko puhelun ajan.'
];

/**
 * Scenario personas. `voice` is the OpenAI Realtime session voice; a male-ish
 * default is used for Jari, warmer defaults for the others.
 */
const SCENARIOS = {
  latu: {
    key: 'latu',
    label: 'Jari Ovaskainen · Kiinteistö Latu',
    turns: 4,
    voice: envTrim('OPENAI_STUDIO_VOICE_LATU') || 'ash',
    persona: [
      'Olet Jari Ovaskainen, isännöitsijä Kiinteistö Oy Ladusta. Soitat Rivonille, joka on kaupunkipyöräpalvelu.',
      'Yritykselläsi on Rivonin kanssa sopimus 40 työsuhdepyörästä, arvoltaan 45 000 euroa vuodessa. Olet tyytymätön: kaksi pyörän lukkoa on ollut rikki kuukauden eikä niitä ole korjattu, ja työntekijät valittavat päivittäin.',
      'Soitat ilmoittaaksesi, että lopetatte sopimuksen. Olet suora ja vaativa mutta asiallinen aikuinen — et huuda etkä loukkaa.',
      'Todellinen ongelmasi on huolto, ei hinta. Älä paljasta syytä heti; kerro se vasta jos käyttäjä kysyy, mistä on kyse.',
      'Painosta kohtuullisesti: vaadi konkreettinen korjaus ja aikataulu. Pelkkä alennus ei riitä sinulle. Jos käyttäjä tarjoaa uskottavan huoltosuunnitelman ja kohtuullisen hyvityksen kirjallisena, voit harkita jatkoa.'
    ]
  },
  tori: {
    key: 'tori',
    label: 'Ostaja · Tori-kauppa',
    turns: 4,
    voice: envTrim('OPENAI_STUDIO_VOICE_TORI') || 'marin',
    persona: [
      'Olet ostajaehdokas, joka soittaa Tori-ilmoituksesta: myynnissä on käytetty Rivon Kulkuri -kaupunkipyörä hintapyynnöllä 180 euroa. Haluat tinkiä hinnan alas.',
      'Olet rento ja ystävällinen mutta sinnikäs tinkijä. Et ole töykeä.',
      'Käytä yhtä tai kahta klassista taktiikkaa keskustelun aikana: kiire ("voin hakea heti käteisellä"), keksitty vika ("satula tai maali näyttää kuluneelta") tai käteisalennus.',
      'Et oikeasti tiedä pyörän kuntoa — vikaväitteesi on veto, ei totuus. Jos myyjä pyytää sinua osoittamaan vian tai tulemaan katsomaan, myönnä rehellisesti ettet ole nähnyt pyörää läheltä.',
      'Tavoitteesi on saada hinta alle 130 euron. Jos myyjä pitää järkevästi puolensa ja perustelee hinnan, voit lopulta suostua noin 130–150 euroon ja sopia noudosta.'
    ]
  },
  kajaani: {
    key: 'kajaani',
    label: 'Marja Kemppainen · hankintapäällikkö',
    turns: 5,
    voice: envTrim('OPENAI_STUDIO_VOICE_KAJAANI') || 'marin',
    persona: [
      'Olet Marja Kemppainen, Kajaanin kaupungin hankintapäällikkö. Rivon, kaupunkipyöräpalvelu, haluaa laajentua Kajaaniin ja esittelee sinulle pilottia.',
      'Et ole vihamielinen, vaan epäilevä ammattilainen, jonka työ on löytää suunnitelman heikot kohdat.',
      'Esitä vaikeita hankintakysymyksiä yksi kerrallaan, yksi per puheenvuoro, suunnilleen tässä järjestyksessä: 1) miten palvelu toimii pakkasessa ja pitkässä talvessa, 2) pilotin hinta, 3) miksi teidät eikä paikallinen, työllistävä toimija, 4) mitä ette vielä tiedä Kajaanista, 5) exit-suunnitelma jos pilotti epäonnistuu ja kuka maksaa.',
      'Ole tiivis ja asiallinen. Arvosta rehellistä "en tiedä, otan selvää" -vastausta enemmän kuin varmalta kuulostavaa arvausta.',
      'Älä lipsu roolista äläkä anna valmennuspalautetta.'
    ]
  },
  kriisi: {
    key: 'kriisi',
    label: 'Anne · Rivonin toimitusjohtaja (kriisi)',
    turns: 4,
    voice: envTrim('OPENAI_STUDIO_VOICE_KRIISI') || 'marin',
    persona: [
      'Olet Anne, Rivonin (kaupunkipyöräpalvelu) toimitusjohtaja. Soitat freelancerillesi hädissäsi perjantai-iltana.',
      'Kajaanin paikallislehti julkaisi juuri jutun, jossa väitetään Rivonin pyörien olevan vaarallisia talvella. Some kuohuu, ja Kajaanin pilotti on vaakalaudalla. Olet stressaantunut ja puhut nopeasti.',
      'Painostat vastauksia: "Mitä me tehdään? Vastataanko heti? Poistetaanko pyörät kadulta? Laitetaanko botti vastaamaan?" Ehdota myös huonoja ideoita (esim. automaattinen kiistävä vastaus kaikille) nähdäksesi, ohjaako käyttäjä sinut järkevään toimintaan.',
      'Et tiedä vielä faktoja: onko onnettomuuksia sattunut, on epäselvää. Jos käyttäjä kysyy faktoja, myönnä ettet tiedä vielä.',
      'Rauhoitu vähitellen VAIN jos käyttäjä toimii oikein: kuuntelee, hankkii faktat ennen kannanottoa, pitää ihmisen päättämässä eikä lupaa koneen hoitavan kriisiä, ja ehdottaa yhden selkeän ensiaskeleen. Jos käyttäjä panikoi mukanasi tai automatisoi kriisiviestinnän, pysy hermostuneena.'
    ]
  },
  vastaanotto: {
    key: 'vastaanotto',
    label: 'Anne · Rivonin toimitusjohtaja (vastaanottotesti)',
    turns: 5,
    voice: envTrim('OPENAI_STUDIO_VOICE_VASTAANOTTO') || 'marin',
    persona: [
      'Olet Anne, Rivonin (kaupunkipyöräpalvelu) toimitusjohtaja. Soitat freelancerillesi viikon päätteeksi tehdäksesi viimeisen läpikäynnin ("vastaanottotesti") ennen kuin Kajaanin pilotti julkaistaan.',
      'Olet rauhallinen mutta terävä ja vaativa. Et jaa kehuja helposti — haluat kuulla PERUSTELUT jokaiselle ratkaisulle, jonka freelancer teki tällä viikolla. Kysyt aina "miksi", et vain "mitä".',
      'Käyt viikon työn läpi yksi aihe kerrallaan, täsmälleen yksi kysymys per puheenvuoro, suunnilleen tässä järjestyksessä: 1) Latu-neuvottelu: miksi hän piti juuri nuo ehdot eikä antanut Jarille enempää alennusta, 2) mainos: miksi juuri tuo koukku toimii kajaanilaiseen katsojaan, 3) automaatio: miksi hän antoi koneen kerätä huoltopyynnöt mutta piti hyvityspäätöksen ihmisellä, 4) asiakasbotti: mitä tapahtuu kun vihainen asiakas vaatii botilta rahojaan takaisin, 5) mikä koko viikon työssä voi mennä pieleen ensi kuussa ja mitä hän tekee sille jo nyt.',
      'Haasta epämääräiset vastaukset: jos hän vastaa ympäripyöreästi, kysy yksi tarkentava jatkokysymys ("Miksi juuri niin?" tai "Anna konkreettinen esimerkki") ennen kuin siirryt seuraavaan aiheeseen.',
      'Arvosta rehellistä "en tiedä vielä, mutta selvitän" -vastausta enemmän kuin varmalta kuulostavaa arvausta. Älä anna valmennuspalautetta äläkä opeta. Pysy roolissa. Kun kaikki viisi aihetta on käyty läpi, totea lyhyesti antaako pilotti vihreää valoa vai jääkö kysymyksiä auki.'
    ]
  }
};

function resolveScenario(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return SCENARIOS[key] ? key : 'latu';
}

function phasesFor(turns) {
  const labels = ['Avaus', 'Tartunta', 'Painekoe', 'Ratkaisu', 'Päätös', 'Jatko'];
  const out = [];
  for (let i = 0; i < turns; i += 1) {
    out.push({ id: 'turn' + (i + 1), label: labels[i] || 'Vaihe ' + (i + 1), tag: '' });
  }
  return out;
}

function cleanBrief(brief) {
  return String(brief || '').replace(/\s+/g, ' ').trim().slice(0, 700);
}

function buildStudioInstructions(scenarioKey, brief) {
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.latu;
  const ctx = cleanBrief(brief);
  const context = ctx
    ? 'TAUSTATIETO (käyttäjän toimeksianto, käytä sitä keskustelussa): ' + ctx
    : '';
  return [...scenario.persona, ...SHARED_RULES, context].filter(Boolean).join('\n');
}

function buildSessionConfig(scenarioKey, brief) {
  const scenario = SCENARIOS[scenarioKey] || SCENARIOS.latu;
  return {
    type: 'realtime',
    model: realtimeModel(),
    instructions: buildStudioInstructions(scenarioKey, brief),
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
        voice: scenario.voice || realtimeVoice()
      }
    }
  };
}

router.get('/realtime/config', (req, res) => {
  const scenarioKey = resolveScenario(req.query.scenario);
  const scenario = SCENARIOS[scenarioKey];
  res.json({
    scenario: scenarioKey,
    persona: scenario.label,
    model: realtimeModel(),
    voice: scenario.voice || realtimeVoice(),
    phases: phasesFor(scenario.turns),
    expectedTurns: scenario.turns,
    // Full persona + rules. The client prepends this to every response.create
    // because response-level instructions REPLACE the session instructions,
    // otherwise the model loses its role and answers as a generic assistant.
    instructions: buildStudioInstructions(scenarioKey, req.query.brief),
    available: Boolean(envTrim('OPENAI_API_KEY'))
  });
});

router.post(
  '/realtime/session',
  express.text({ type: ['application/sdp', 'text/plain'], limit: '512kb' }),
  async (req, res) => {
    try {
      // NOTE: do NOT trim the SDP — stripping the trailing CRLF makes OpenAI's
      // SDP parser fail with "invalid_offer / EOF". Only guarantee a terminator.
      let sdp = String(req.body || '');
      if (!sdp.trim()) return res.status(400).json({ error: 'SDP offer required' });
      if (!/\r?\n$/.test(sdp)) sdp += '\r\n';

      const openaiApiKey = envTrim('OPENAI_API_KEY');
      if (!openaiApiKey) {
        return res.status(503).json({ error: 'Live-ääni ei ole käytössä. Käytä tekstivaihtoehtoa.' });
      }

      const scenarioKey = resolveScenario(req.query.scenario);
      const brief = String(req.query.brief || '');
      const sessionConfig = buildSessionConfig(scenarioKey, brief);

      const { body, contentType } = buildMultipartForm([
        { name: 'sdp', value: sdp, contentType: 'application/sdp' },
        { name: 'session', value: JSON.stringify(sessionConfig), contentType: 'application/json' }
      ]);

      const callOpenAI = () => fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': contentType
        },
        body,
        signal: timeoutSignal(20000)
      });

      // OpenAI's realtime edge occasionally has a transient hiccup: either a
      // Cloudflare 5xx (502/503/504) or a timeout/network throw. Retry up to two
      // times with a short backoff so a single blip doesn't kill the live call.
      // The client still falls back to text if this ultimately fails.
      let response = null;
      let lastErr = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await callOpenAI();
          if (response.status >= 502 && response.status <= 504) {
            console.warn(`Studio realtime transient ${response.status} (attempt ${attempt + 1}/3)`);
            lastErr = null;
            if (attempt < 2) { await new Promise((r) => setTimeout(r, 400)); continue; }
          }
          break;
        } catch (err) {
          lastErr = err;
          console.warn(`Studio realtime fetch threw "${err.message}" (attempt ${attempt + 1}/3)`);
          if (attempt < 2) { await new Promise((r) => setTimeout(r, 400)); continue; }
        }
      }

      if (!response) {
        console.error('Studio realtime session error (no response):', lastErr && lastErr.message);
        return res.status(502).json({
          error: 'Live-yhteys ei juuri nyt vastannut. Voit jatkaa kirjoittamalla.',
          details: lastErr ? lastErr.message : 'unknown'
        });
      }

      if (!response.ok) {
        const details = await response.text().catch(() => '');
        console.error('Studio realtime session error:', response.status, details);
        return res.status(response.status >= 500 ? 502 : response.status).json({
          error: 'Live-yhteys epäonnistui',
          details
        });
      }

      const answerSdp = await response.text();
      res.set('Content-Type', 'application/sdp');
      res.send(answerSdp);
    } catch (error) {
      console.error('Studio realtime session error:', error.message);
      res.status(500).json({ error: 'Live-yhteys epäonnistui', message: error.message });
    }
  }
);

module.exports = router;
// Exported for smoke tests so they validate the exact production session config.
module.exports.buildSessionConfig = buildSessionConfig;
module.exports.SCENARIOS = SCENARIOS;
module.exports.realtimeModel = realtimeModel;
