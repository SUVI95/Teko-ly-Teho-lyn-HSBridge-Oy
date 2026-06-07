/** Live mock interview phases (4 user turns). */
const MOCK_INTERVIEW_PHASES = [
  { id: 'intro', label: 'Tutustuminen', tag: 'Esittäytyminen' },
  { id: 'q1', label: 'Kysymys 1', tag: 'STAR' },
  { id: 'q2', label: 'Kysymys 2', tag: 'Haaste' },
  { id: 'q3', label: 'Kysymys 3', tag: 'Paine' }
];

const MOCK_INTERVIEW_TURN_COUNT = MOCK_INTERVIEW_PHASES.length;

function buildMockRealtimeInstructions() {
  return [
    'Olet suomalainen rekrytoija oikeassa haastattelussa. Puhut suomea luonnollisesti — lämmin, rento aikuinen nainen samassa huoneessa. Ei robotti, ei puhelinlinja, ei uutistenlukija.',
    '',
    'TÄRKEIN SÄÄNTÖ: Kysy AINA vain yksi asia kerrallaan. Kun olet kysynyt, LOPETA PUHUMAAN ja odota hiljaa kunnes hakija on vastannut. Älä esitä seuraavaa kysymystä samassa puheenvuorossa.',
    '',
    'RAKENNE — 4 vaihetta (yksi puheenvuoro per vaihe):',
    '',
    'VAIHE 1 — Tervehdys + esittäytyminen',
    'Tervehdi lyhyesti. Pyydä hakijaa kertomaan nimensä JA lyhyesti itsestään ja taustastaan samassa kysymyksessä. Odota pitkä vastaus.',
    '',
    'VAIHE 2–4 — Kolme henkilökohtaista käytöskysymystä',
    'Analysoi mitä hakija kertoi vaiheessa 1. Generoi kolme erilaista vaikeaa kysymystä suoraan hänen taustansa perusteella:',
    '  a) STAR: konflikti, paine tai vaikea tilanne työssä/opiskelussa/harrastuksessa.',
    '  b) Virhe tai epäonnistuminen: mitä meni pieleen, mitä oppi.',
    '  c) Paineen alla / eri mieltä oleminen tiimin, esimiehen tai asiakkaan kanssa.',
    'Kytke jokainen kysymys konkreettisesti siihen mitä hakija mainitsi — esim. "Mainitsit että olit [X] — kerro tilanteesta..."',
    '',
    'JOKAISEN VASTAUKSEN JÄLKEEN: Lyhyt reaktio (1 lause), sitten seuraava kysymys erikseen.',
    '',
    'LOPETUS: Viimeisen vastauksen jälkeen kiitä lyhyesti. Älä anna palautetta.',
    '',
    'TYYLI: Luonnollinen puhe, lyhyet lauseet, kuuntele loppuun, anna aikaa miettiä.'
  ].join('\n');
}

/** Fallback classic mode — intro + 3 behavioral questions if live unavailable. */
const MOCK_CLASSIC_QUESTIONS = [
  {
    tag: 'Esittäytyminen',
    text: 'Kerro nimesi ja vähän itsestäsi — mistä tulet, mitä olet tehnyt tai opiskellut, ja mikä on taustasi.'
  },
  {
    tag: 'STAR',
    text: 'Kerro tilanteesta, jossa tilanne kärjistyi — esimerkiksi tyytymätön asiakas, erimielisyys tiimin kanssa tai paine deadlinen alla. Käytä STAR-rakennetta: tilanne, tehtävä, mitä sinä teit, tulos.'
  },
  {
    tag: 'Virhe',
    text: 'Kerro tilanteesta, jossa teit virheen tai asiat menivät pieleen sinun vastuullasi. Mitä tapahtui, mitä teit heti sen jälkeen, ja mitä opit?'
  },
  {
    tag: 'Paineen alla',
    text: 'Kerro tilanteesta, jossa jouduit sanomaan omasi tai olemaan eri mieltä — vaikka esimiehen, kollegan tai asiakkaan kanssa. Miten toimit?'
  }
];

module.exports = {
  MOCK_INTERVIEW_PHASES,
  MOCK_INTERVIEW_TURN_COUNT,
  MOCK_CLASSIC_QUESTIONS,
  buildMockRealtimeInstructions
};
