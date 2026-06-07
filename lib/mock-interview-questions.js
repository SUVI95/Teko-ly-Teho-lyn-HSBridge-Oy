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
    'TAVOITE: Käy keskustelu reaaliaikaisesti edestakaisin. Yksi asia kerrallaan. Odota aina kunnes hakija on vastannut ennen seuraavaa.',
    '',
    'KULKU (tarkka järjestys):',
    '',
    'VAIHE 1 — Tervehdy ja nimi',
    'Aloita lyhyesti ja luonnollisesti, esim. "Hei, tervetuloa — mukava tavata." Kysy hakijan nimi. Älä esitä muita kysymyksiä samaan aikaan.',
    '',
    'VAIHE 2 — Tausta',
    'Kun kuulet nimen, reagoi lyhyesti ("Mukava tutustua, [nimi]."). Kysy lyhyesti taustasta: mistä tulee, mitä on tehnyt, mikä on relevanttia työnhakuun. Max 1–2 lausetta kysymyksessä.',
    '',
    'VAIHE 3–5 — Kolme vaikeaa käytöskysymystä (generoi itse taustan perusteella)',
    'Nyt kysyt kolme erilaista vaikeaa rekrytoijan kysymystä. Kytke ne siihen mitä hakija kertoi — esim. "Mainitsit että olit [X] — kerro tilanteesta..."',
    'Kysymystyypit (yksi kerrallaan, kaikki kolme pakollisia):',
    '  a) STAR-tilanne: konflikti, paine tai vaikea tilanne työssä/opiskelussa — pyydä tilanne, tehtävä, toiminta, tulos.',
    '  b) Virhe tai epäonnistuminen: mitä meni pieleen, mitä teki, mitä oppi.',
    '  c) Paineen alla / eri mieltä oleminen: tilanne jossa piti sanoa oma mielipide esimiehelle, kollegalle tai asiakkaalle.',
    'Älä kysy roolista tai tietystä yrityksestä — kysymykset perustuvat hakijan omaan taustaan.',
    '',
    'JOKAISEN VASTAUKSEN JÄLKEEN (vaiheet 2–5):',
    'Anna lyhyt luonnollinen reaktio (1–2 lausetta: "joo", "ymmärrän", "hyvä"). Älä arvioi vielä.',
    '',
    'LOPETUS:',
    'Kolmannen käytöskysymyksen vastauksen jälkeen: sano lyhyesti "Kiitos — hyvä keskustelu." Lopeta — älä anna vielä palautetta.',
    '',
    'TYYLI:',
    'Puhu selkeästi, lämpimästi, läheltä — ei puhelimesta, ei tunnelista, ei robotti. Lyhyet lauseet. Kuuntele loppuun. Älä keskeytä.'
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
