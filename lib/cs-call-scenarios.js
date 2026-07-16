/** Live customer-service call simulation — AI plays the caller, student plays agent. */

const CS_CALL_PHASES = [
  { id: 'opening', label: 'Puhelun alku', tag: 'Tunnistautuminen' },
  { id: 'problem', label: 'Ongelman kuvaus', tag: 'Kuuntelu' },
  { id: 'escalation', label: 'Kiristyminen', tag: 'Rauhoittaminen' },
  { id: 'resolution', label: 'Ratkaisu', tag: 'Sovittelu' }
];

const CS_CALL_TURN_COUNT = CS_CALL_PHASES.length;

const CS_SCENARIOS = {
  wrong_bill: {
    id: 'wrong_bill',
    emoji: '🧾',
    title: 'Väärä lasku',
    pitch: 'Sähköpostilaskussa on 89 € liikaa verrattuna tarjoukseen. Asiakas on jo maksanut ja haluaa hyvityksen tai selvityksen tänään.',
    opening: 'Hei, soitan koska viime laskussanne on selvä virhe — siellä on paljon enemmän kuin mitä minulle luvattiin.'
  },
  late_delivery: {
    id: 'late_delivery',
    emoji: '📦',
    title: 'Myöhässä oleva toimitus',
    pitch: 'Tilaus oli luvattu viime viikolla. Asiakas tarvitsee tuotteen huomenna tärkeään tilaisuuteen.',
    opening: 'Hei, tilaus numero 48291 on yli viikon myöhässä — minulle luvattiin toimitus viime tiistaina.'
  },
  broken_product: {
    id: 'broken_product',
    emoji: '🔧',
    title: 'Rikkinäinen tuote',
    pitch: 'Juuri ostettu laite ei toimi ollenkaan. Asiakas on turhautunut ja haluaa vaihdon tai rahat takaisin nopeasti.',
    opening: 'Hei, ostin teiltä eilen tuotteen ja se ei toimi ollenkaan — olen todella pettynyt.'
  },
  custom: {
    id: 'custom',
    emoji: '✏️',
    title: 'Oma tilanne',
    pitch: '',
    opening: ''
  }
};

function getScenario(scenarioId) {
  return CS_SCENARIOS[scenarioId] || CS_SCENARIOS.wrong_bill;
}

function buildCustomScenario(customText) {
  const t = String(customText || '').trim();
  if (!t) return CS_SCENARIOS.wrong_bill;
  const dash = t.match(/^(.+?)\s*[—–-]\s*(.+)$/s);
  if (dash) {
    return {
      id: 'custom',
      emoji: '✏️',
      title: dash[1].trim().slice(0, 60),
      pitch: t,
      opening: dash[2].trim().slice(0, 200) || t
    };
  }
  return {
    id: 'custom',
    emoji: '✏️',
    title: 'Oma tilanne',
    pitch: t,
    opening: t.split('\n')[0].slice(0, 200)
  };
}

function resolveScenario(scenarioId, customText) {
  if (scenarioId === 'custom') return buildCustomScenario(customText);
  return getScenario(scenarioId);
}

function buildCsRealtimeInstructions(scenarioId, customText) {
  const scenario = resolveScenario(scenarioId, customText);
  return [
    'Olet suomalainen ASIAKAS joka soittaa yrityksen asiakaspalveluun puhelimella. Et ole rekrytoija etkä valmentaja.',
    'Puhut suomea luonnollisesti — kuin oikea ihminen puhelimessa. Et ole robotti.',
    '',
    'TILANNE: ' + scenario.title,
    scenario.pitch,
    '',
    'TÄRKEIN SÄÄNTÖ: Sano AINA vain yksi asia kerrallaan. Kun olet sanonut, LOPETA ja odota hiljaa kunnes palvelija vastaa.',
    '',
    'RAKENNE — 4 vaihetta (yksi puheenvuoro per vaihe):',
    '',
    'VAIHE 1 — Avaus',
    'Tervehdi lyhyesti ja kerro miksi soitat. Aloitusidea: "' + scenario.opening + '"',
    '',
    'VAIHE 2 — Tarkenna ongelmaa',
    'Anna yksi konkreettinen yksityiskohta (summa, päivämäärä, tilausnumero, mitä tapahtui). Ole hieman kärsimätön jos asia ei tunnu menevän eteenpäin.',
    '',
    'VAIHE 3 — Kiristyminen',
    'Olet pettynyt tai kiireinen. Sano että "tämä ei riitä" tai "haluan selvityksen nyt" — mutta pysy kohtuullisena, et tyly.',
    '',
    'VAIHE 4 — Ratkaisu',
    'Pyydä selkeä seuraava askel: hyvitys, vaihto, soitto takaisin, esimies. Hyväksy kohtuullinen ratkaisu jos palvelija on empaattinen ja selkeä.',
    '',
    'LOPETUS: Viimeisen vastauksen jälkeen kiitä tai sano lyhyesti "toivottavasti tämä selviää" — älä anna palautetta palvelijalle.',
    '',
    'TYYLI: Lyhyet lauseet, luonnollinen puhe, anna palvelijalle aikaa puhua.'
  ].join('\n');
}

/** Fallback classic mode — fixed customer lines if WebRTC unavailable. */
const CS_CLASSIC_LINES = [
  {
    tag: 'Avaus',
    text: 'Hei, soitan koska minulla on ongelma tilaukseni kanssa — voitteko auttaa?'
  },
  {
    tag: 'Yksityiskohta',
    text: 'Tarkemmin sanottuna asia on se, että luvattu toimitus tai hinta ei täsmää. Haluan tietää mitä teette asialle.'
  },
  {
    tag: 'Kiristyminen',
    text: 'Ymmärrän, mutta tämä ei oikeastaan riitä — olen jo odottanut liian kauan. Mitä seuraavaksi?'
  },
  {
    tag: 'Ratkaisu',
    text: 'Selvä. Haluan kuulla konkreettisen ratkaisun — hyvitys, uusi toimitus tai soitto esimieheltä. Milloin saan vastauksen?'
  }
];

module.exports = {
  CS_CALL_PHASES,
  CS_CALL_TURN_COUNT,
  CS_SCENARIOS,
  CS_CLASSIC_LINES,
  getScenario,
  resolveScenario,
  buildCsRealtimeInstructions
};
