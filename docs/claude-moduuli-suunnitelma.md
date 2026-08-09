# Claude-moduuli — suunnitelma ja faktatarkistus

Tämä on työdokumentti sinulle, ei opiskelijoille. Opiskelijoille näkyvä teksti on suomeksi ja Voikko-tarkistettu; tämä suunnittelutaso on sekakielinen, jotta pystyt skannaamaan sen nopeasti.

---

## 1. Faktatarkistus: mitä NotebookLM sai oikein

Tarkistin jokaisen "pilarin" tämänhetkisistä Anthropicin dokumenteista (support.claude.com), koska rakennat tätä opiskelijoille faktana, ei promptivinkkinä. Hyvä uutinen: NotebookLM osui pääosin oikeaan. Kolme tarkennusta ennen kuin rakennamme:

1. **Cowork ja Chat ovat nyt sama sovellus.** Heinäkuusta 2026 lähtien chat ja Cowork jakavat saman "kodin" — yksi sivupalkki, yksi haku, ja tilaa vaihdetaan viestikentän valitsimella istunnon sisällä. Tämä kannattaa näyttää simulaattorissa sellaisenaan, koska se on juuri se asia, jonka opiskelija näkee kun avaa oikean Clauden.
2. **"Co-Work Artifacts" on virallisesti nimeltään Live Artifacts.** Ne ovat pysyviä, päivittyviä HTML-sivuja Coworkissa (dashboardit, seurantataulukot), joilla on oma välilehti ja versiohistoria. Tämä vastaa NotebookLM:n kuvausta hyvin — nimi vain muutettu tarkaksi.
3. **Dispatch on todellinen, ei keksitty.** Puhelin lähettää tehtävän, pöytäkone suorittaa sen (lukee tiedostot, käyttää liitäntöjä, ajaa koodia), tulos tulee takaisin puhelimeen. Vaatii Claude Desktopin auki ja koneen hereillä. Aktivoidaan Coworkin sivupalkista "Dispatch"-painikkeella ja QR-koodin skannauksella.
4. **Ajastetut tehtävät (Scheduled Tasks)** käynnistetään komennolla `/schedule` missä tahansa Cowork-tehtävässä, tai Scheduled-sivulta sivupalkista. Ne pyörivät pilvessä — konetta ei tarvitse pitää auki.
5. **Claude Design** on oma pinta (claude.ai/design), ei chat-ikkuna joka sattuu tuottamaan HTML:ää. Siellä kommentoidaan suoraan elementtiä, muokataan tekstiä paikan päällä ja säädetään väliä liu'uilla — tarkalleen niin kuin alkuperäinen kuvaus sanoi.

**Tärkeä yksityiskohta simulaattoria varten:** Clauden käyttöliittymä ei tue suomea kieliasetuksena (tuetut kielet: englanti, ranska, saksa, indonesia, italia, japani, korea, portugali, venäjä, kiina (molemmat), espanja). Opiskelija näkee siis oikeassa Claudessa englanninkieliset painikkeet ja valikot, vaikka kirjoittaakin ja saa vastauksia suomeksi. Siksi rakennan käyttöliittymän kuoren (napit, valikot, otsikot) englanniksi — täsmälleen niin kuin oikeassa sovelluksessa — ja kaiken pedagogisen tekstin, ohjeet ja Clauden simuloidut vastaukset suomeksi. Tämä on itse asiassa arvokas opetuskohta: kannattaa sanoa ääneen tunnilla, ettei UI ole rikki suomeksi — sitä ei vain ole käännetty.

Lähteet tärkeimmille väitteille: support.claude.com/articles (Cowork-aloitus, Dispatch, Live Artifacts, Ajastetut tehtävät, Claude Design) — kaikki tarkistettu elokuussa 2026.

---

## 2. Arkkitehtuuriratkaisu: moottori + skriptatut skenaariot

Sen sijaan että rakennettaisiin seitsemän erillistä mock-sivua, rakennan yhden uudelleenkäytettävän "Claude-kuoren" (engine), jota ajaa data-pohjainen skenaario. Sama malli kuin aiemmissa aipolku-moduuleissasi (esim. Rivon-viikko, hallusinaatiomoduuli): kuori pysyy samana, sisältö vaihtuu JSON-tyyppisenä skriptinä.

**Miksi tämä ratkaisee ongelmasi:**
- Ei API-kutsuja, ei viestirajoja, ei riippuvuutta siitä onko Clauden palvelu juuri sillä hetkellä pystyssä.
- Toistettavissa identtisesti joka oppitunnilla — ei riskiä, että Claude vastaa eri tavalla kuin harjoituksessa on suunniteltu.
- Uuden pilarin lisääminen on skenaariodatan kirjoittamista, ei uuden käyttöliittymän koodaamista.
- Opiskelija kirjoittaa silti oikeita, omia lauseita tekstikenttään (ei pelkkää klikkailua) — moottori tunnistaa avainsanoja ja reagoi niiden mukaan, tai pyytää tarkennusta jos ei tunnista mitään. Tämä säilyttää sen, että harjoitus tuntuu elävältä, mutta pysyy täysin ennustettavana.

Rakensin ensimmäisen pilarin täyteen mittaan tätä mallia noudattaen (ks. kohta 4 ja liitetiedosto). Loput kuusi ovat alla suunniteltuina skenaarioina, joita voidaan pyytää minulta yksi kerrallaan — täsmälleen sama työtapa kuin muissa moduuleissasi.

---

## 3. Pedagogiset periaatteet (sovellettu jokaiseen pilariin)

- Opiskelija **tekee**, ei vain katso: jokaisessa harjoituksessa on aidosti kirjoitettava oma teksti tai tehtävä valinta, joka vaikuttaa lopputulokseen.
- Ei "tekoäly-slangia": vältetään sanoja kuten *mullistava*, *saumaton*, *voimaannuttava*, *matka*, *sukellamme*, *hyödynnä*, *maisema* — ja rakennetta "ei vain X vaan myös Y".
- Ei kielteistä kehystystä: ei aloiteta sillä mitä Claude *ei* osaa. Rajat (esim. lupakysymykset, konteksti-ikkuna) esitetään suunnittelupäätöksinä, ei puutteina.
- Aikuisopiskelijan arvokkuus: skenaariot ovat oikeita työelämän tilanteita (laskut, sopimukset, asiakaspalaute), ei leikkimielisiä esimerkkejä.
- Todennettavat väitteet: jokainen harjoitus perustuu siihen, miten oikea tuote todella toimii (esim. lupakysymys ennen tiedostojen siirtoa on oikea turvallisuusominaisuus, ei keksitty draama).

---

## 4. Pilari 1 — Cowork: "Tiedostot ja kansiot" (RAKENNETTU, ks. liite)

**Mitä opetetaan:** Claude voi lukea, järjestää ja muokata paikallisia tiedostoja Cowork-tilassa; toimenpiteet, jotka eivät ole peruutettavissa, vaativat aina vahvistuksen.

### Harjoitus 1: Sekainen kansio
Opiskelija näkee jaetun näkymän: chat vasemmalla, 12 sekalaista tiedostoa oikealla (laskuja, sopimuksia, kuitteja, kuvia — oikean tuntuisilla suomalaisilla tiedostonimillä). Opiskelija kirjoittaa oman pyyntönsä tyhjään kenttään. Moottori tunnistaa järjestämiseen liittyvät sanat, Claude ehdottaa kansiorakennetta ja pyytää vahvistusta ennen siirtoa. Tarkistuskysymys: miksi vahvistusta kysyttiin.

### Harjoitus 2: Oma toimeksianto
Opiskelija saa työelämän tilanteen (40 asiakaspalautetta tekstitiedostona, tarvitaan yhteenveto) ilman valmista pohjaa ja kirjoittaa pyynnön alusta asti itse. Claude tuottaa lyhyen yhteenvedon. Pohdintakysymys avoimena tekstinä: miten pyyntöä pitäisi muuttaa, jos halutaan yhteenveto vain kielteisestä palautteesta.

### Harjoitus 3 (ehdotus, ei vielä rakennettu): "Milloin EI kannata"
Lyhyt päätöksentekoharjoitus: opiskelija saa neljä tilannetta (esim. henkilötietoja sisältävä kansio, kirjanpitotositteet) ja arvioi, mihin hän antaisi Claudelle pääsyn suoraan ja mihin ei ilman erillistä tarkistusta. Ei oikeaa/väärää vastausta — perustelu on pääasia.

---

## 5. Pilarit 2–7 — suunnitellut skenaariot (rakennetaan seuraavaksi, yksi kerrallaan)

### Pilari 2 — Dispatch: "Puhelin ohjaa pöytäkonetta"
- **H1 — Kahvilasta toimistoon:** Opiskelija "on" kahvilassa (mock-puhelinnäkymä) ja lähettää tehtävän ("etsi tarjouksesta korotetut hinnat"); split-screen animaatio näyttää tehtävän etenemisen pöytäkoneella reaaliajassa palkin ja tilailmoitusten avulla.
- **H2 — Kun kone on sammuksissa:** Skenaario, jossa opiskelija yrittää lähettää tehtävän mutta pöytäkone-ikoni on harmaa ("ei yhteyttä"). Opiskelijan pitää tunnistaa miksi (kone ei ole hereillä) — opettaa oikean rajoituksen, ei keksittyä.
- **H3 — Lupaportti:** Tehtävä vaatii tiedoston poistamista; puhelimeen tulee vahvistuspyyntö kesken suorituksen. Opettaa, että Dispatch käyttää samaa lupamallia kuin tavallinen Cowork.

### Pilari 3 — Live Artifacts: "Työkalu joka pysyy hengissä"
- **H1 — Rakenna kojelauta:** Opiskelija pyytää budjettityökalua, näkee sen syntyvän, sulkee simulaation ja "avaa sen huomenna" (aikahyppy-nappi) — luvut ovat päivittyneet.
- **H2 — Versiohistoria pelastaa:** Opiskelija tekee kolme muutosta työkaluun, yksi menee pieleen; palautetaan edellinen versio historiasta.

### Pilari 4 — Claude Design: "Kommentoi, älä kirjoita uudelleen"
- **H1 — Yhden klikkauksen muutos:** Opiskelija klikkaa elementtiä mock-laskeutumissivulla, kirjoittaa kommentin ("tästä väri lämpimämmäksi"), näkee muutoksen suoraan — ei uutta promptia tarvita.
- **H2 — Bränditiedosto ohjaa tulosta:** Sama pyyntö ajetaan kahdesti: kerran ilman bränditiedostoa, kerran sen kanssa. Opiskelija vertailee tuloksia.

### Pilari 5 — Connectors & Plugins: "Claude puhuu muille ohjelmille"
- **H1 — Kalenteriaukko:** "Etsi kaksiöine vapaa aika ennen perjantaita" — mock-kalenteri täyttyy.
- **H2 — Tutkimuksesta tietokantasivuksi:** Pyyntö tuottaa jäsennellyn sivun mock-Notion-työtilaan.
- **H3 — Kun liitäntää ei ole:** Opiskelija pyytää jotain, johon ei ole yhteyttä (esim. oma laskutusjärjestelmä); Claude ehdottaa vaihtoehtoa sen sijaan että väittäisi tehneensä jotain.

### Pilari 6 — Skills & Scheduled Tasks: "Ohje joka muistaa itsensä"
- **H1 — Paketoi ohje taidoksi:** Opiskelija kirjoittaa toistuvan tarkistuslistan (esim. sopimuksen riskikohdat), tallentaa sen "taidoksi", ajaa sen heti uudelleen toisella dokumentilla.
- **H2 — Aseta ajastus:** `/schedule`-komennon simulointi: opiskelija valitsee toistuvuuden ja kellonajan, näkee tehtävän ilmestyvän Ajastetut-listaan.

### Pilari 7 — Claude Code: "Suunnitelma ennen koodia"
- **H1 — Lue suunnitelma ensin:** Opiskelija pyytää sovellusta; terminaali tulostaa ensin vaihe-vaiheelta-suunnitelman, jonka opiskelija hyväksyy tai muokkaa ennen kuin koodi kirjoitetaan.
- **H2 — Puhuttu korjaus:** Mock-mikrofoninappi; opiskelija "sanoo" (kirjoittaa) korjauksen luonnollisella kielellä, terminaali näyttää täsmällisen koodimuutoksen joka siitä syntyi.

---

## 6. Seuraavat askeleet

1. Katso liitetiedosto `claude-simulaattori.html` selaimessa — se on yksi itsenäinen tiedosto, jonka voit siirtää suoraan Next.js-sovellukseesi joko `<iframe>`:na tai muuntaa React-komponentiksi.
2. Kommentoi Pilari 1:n suomenkielinen teksti (sävy, sanavalinnat) — Voikko-tarkisti yksittäiset sanat, mutta lauserakenteen viimeistely on sinun editoriaalinen päätöksesi kuten aina.
3. Sano mistä pilarista jatketaan seuraavaksi (2–7), niin rakennan sen samalla moottorilla.
