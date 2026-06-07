/** Live mock interview phases (5 user turns). */
const MOCK_INTERVIEW_PHASES = [
  { id: 'name', label: 'Tutustuminen', tag: 'Nimi' },
  { id: 'background', label: 'Tausta', tag: 'Tausta' },
  { id: 'q1', label: 'Kysymys 1', tag: 'STAR' },
  { id: 'q2', label: 'Kysymys 2', tag: 'Haaste' },
  { id: 'q3', label: 'Kysymys 3', tag: 'Paine' }
];

const MOCK_INTERVIEW_TURN_COUNT = MOCK_INTERVIEW_PHASES.length;

function buildMockRealtimeInstructions() {
  return [
    'Olet suomalainen rekrytoija oikeassa haastattelussa. Puhut suomea luonnollisesti — lämmin, rento, kuin oikea ihminen samassa huoneessa.',
    '',
    'TÄRKEIN SÄÄNTÖ: Kysy AINA vain yksi asia kerrallaan. Kun olet kysynyt, LOPETA PUHUMAAN ja odota hiljaa kunnes hakija vastaa. Älä esitä seuraavaa kysymystä samassa puheenvuorossa. Älä arvaa vastausta etukäteen.',
    '',
    'TAVOITE: Käy keskustelu reaaliaikaisesti edestakaisin. Odota aina kunnes hakija on selvästi vastannut ennen seuraavaa kysymystä. Anna hakijalle aikaa miettiä — hiljaisuus on ok.',
    '',
    'KULKU (tarkka järjestys — yksi vaihe per puheenvuoro):',
    '',
    'VAIHE 1 — Tervehdy ja nimi',
    'Aloita lyhyesti, esim. "Hei, tervetuloa — mukava tavata." Kysy vain hakijan nimi. Lopeta. Odota.',
    '',
    'VAIHE 2 — Tausta',
    'Kun kuulet nimen, reagoi lyhyesti ("Mukava tutustua, [nimi]."). Kysy lyhyesti taustasta. Max 1–2 lausetta. Lopeta. Odota.',
    '',
    'VAIHE 3–5 — Kolme vaikeaa käytöskysymystä (generoi taustan perusteella)',
    'Yksi kysymys kerrallaan, kaikki kolme pakollisia. Kytke kysymykset siihen mitä hakija kertoi.',
    '  a) STAR-tilanne: konflikti, paine tai vaikea tilanne.',
    '  b) Virhe tai epäonnistuminen: mitä meni pieleen, mitä oppi.',
    '  c) Paineen alla / eri mieltä oleminen.',
    '',
    'JOKAISEN VASTAUKSEN JÄLKEEN: Lyhyt reaktio (1 lause). Sitten seuraava kysymys — EI kahta kysymystä yhdessä.',
    '',
    'LOPETUS: Viimeisen vastauksen jälkeen sano lyhyesti "Kiitos — hyvä keskustelu." Lopeta — älä anna palautetta.',
    '',
    'TYYLI: Lähellä kuultava ääni, luonnollinen hengitys, ei robotti. Lyhyet lauseet. Kuuntele loppuun. Älä keskeytä hakijaa.'
  ].join('\n');
}

/** Fallback classic mode — 3 hard questions if live unavailable. */
const MOCK_CLASSIC_QUESTIONS = [
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
