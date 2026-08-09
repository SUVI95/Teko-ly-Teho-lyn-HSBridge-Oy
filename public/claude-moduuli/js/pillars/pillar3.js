window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p3',
  num: 3,
  name: 'Live Artifacts',
  subtitle: 'Elävät työkalut',
  briefingLabel: 'Malli',

  theory: {
    tagline: 'Live Artifact (Cowork Artifact) on dynaaminen työkalu — ei kertavastaus chattiin.',
    whatItDoes: 'Coworkissa Claude voi rakentaa <b>Live Artifactin</b>: pysyvän, vuorovaikutteisen HTML-työkalun. Se jää sivupalkin <b>Live artifacts</b> -välilehteen ja pysyy kytkettynä paikallisiin tiedostoihisi — kun data muuttuu, näkymä päivittyy.',
    howItWorks: 'Pyydät työkalua Coworkissa ja yhdistät sen kansioon/tiedostoon. Claude rakentaa Artifactin. Kun muutat paikallista tiedostoa, Artifact hakee tuoreen tilanteen avattaessa (tai heti synkassa). Versiohistoria antaa turvaverkon.',
    benefits: 'Yksi elävä työkalu korvaa viikoittain uudelleen rakennettavan taulukon. Chat ei ole ainoa muisti.',
    whereToUse: 'Kun tarvitset dynaamisen, pitkäkestoisen työkalun paikallisen datan päälle — matka, tapahtuma, ateriat, sisältökalenteri, tiimin lomat…',
    capabilities: [
      {title: 'Elävä data', body: 'Artifact näyttää “tänään, ei rakennuspäivänä” — kytketty tiedostoihin ja lähteisiin.'},
      {title: 'Pysyvä työkalu', body: 'Oma välilehti sivupalkissa. Ei hautaudu chat-historiaan.'},
      {title: 'Versiohistoria', body: 'Kokeile muutoksia turvallisesti ja palauta tarvittaessa.'},
      {title: 'Älykäs sovellus', body: 'Syötteet, laskenta ja vuorovaikutus selaimessa — ei pelkkä staattinen kaavio.'},
    ],
  },

  briefing: async (container, { goToExample }) => {
    container.innerHTML = `
      <div class="la-briefing">
        <section class="la-hero">
          <p class="la-kicker">Ennen harjoituksia</p>
          <h2>Live Artifact ≠ kertavastaus chatissa</h2>
          <p class="la-lead">Käytä sitä, kun tarvitset <b>dynaamisen työkalun paikallisen datan päälle</b>. Harjoituksissa näet kaavan: <b>yksinkertainen tiedosto oikealla → elävä Artifact vasemmalla</b>.</p>
        </section>

        <section class="la-cases">
          <article class="la-case"><div class="la-case-num">1</div><div class="la-case-body">
            <h3>Data elää ja muuttuu</h3>
            <p>Projekti, pipeline, budjetti, matka — et rakenna näkymää joka viikko uudelleen.</p>
            <div class="la-case-punch">Artifact hakee uusimman datan — <em>tänään, ei rakennuspäivänä</em>.</div>
          </div></article>
          <article class="la-case"><div class="la-case-num">2</div><div class="la-case-body">
            <h3>Pysyvä työkalu, ei chat-widget</h3>
            <p>Oma välilehti sivupalkissa — käytät sitä kuin dokumenttia kuukausia.</p>
            <div class="la-case-punch">Tärkeä näkymä ei hautaudu <em>pitkään chat-historiaan</em>.</div>
          </div></article>
          <article class="la-case"><div class="la-case-num">3</div><div class="la-case-body">
            <h3>Iterointi + versiohistoria</h3>
            <p>Voit kokeilla ulkoasua ja ominaisuuksia turvallisesti.</p>
            <div class="la-case-punch">Jokainen muutos tallentuu — <em>palauta milloin tahansa</em>.</div>
          </div></article>
          <article class="la-case"><div class="la-case-num">4</div><div class="la-case-body">
            <h3>Vuorovaikutteinen sovellus</h3>
            <p>Laskurit, kartat, checklistat — Claude “ajattelee” artefaktin sisällä.</p>
            <div class="la-case-punch"><em>Dynaaminen työkalu selaimessa</em>, ei staattinen kuva.</div>
          </div></article>
        </section>

        <section class="la-vs">
          <h3>Harjoitusten kaava</h3>
          <div class="la-vs-grid">
            <div class="la-vs-card skip">
              <header>Paikallinen tiedosto</header>
              <p>Yksinkertainen .txt / .csv / kansio — sinä muutat rivejä.</p>
            </div>
            <div class="la-vs-card use">
              <header>Live Artifact</header>
              <p>Visuaalinen työkalu päivittyy heti — kalenteri, kartta, lista, kanban…</p>
            </div>
          </div>
        </section>

        <div class="la-footer">
          <button type="button" class="btn primary" id="laGoExample">Katso esimerkki →</button>
          <p class="la-footer-hint">H1–H5: matka · seating · ateriat · kanban · tiimin lomat — jokaisessa tiedosto ↔ Artifact.</p>
        </div>
      </div>`;
    [...container.querySelectorAll('.la-case')].forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(10px)';
      setTimeout(() => {
        c.style.transition = 'opacity .45s ease, transform .45s ease';
        c.style.opacity = '1';
        c.style.transform = 'none';
      }, 180 + i * 140);
    });
    container.querySelector('#laGoExample').addEventListener('click', () => goToExample && goToExample());
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'artifacts',
      topbarTitle: 'Live artifacts — tiedosto → näkymä',
      composerHint: 'Cowork · Live artifact',
    });
    Engine.renderWorkspacePanel(panel, {
      rootLabel: 'Trip/',
      pathHint: 'local',
      entries: [{id:'t', kind:'file', name:'trip_ideas.txt', type:'doc', meta:'source', openable:true, content:
`DATES: 12–14 Jun
HOTEL: Hotel Calm, Lisbon
DAY 1: Arrive · team dinner
DAY 2: Workshop · evening walk
DAY 3: Depart`}],
    });
    Engine.addNarrator(thread, 'Esimerkki: yksinkertainen matkatiedosto → Live Artifact -kalenteri. Sitten muutat tiedostoa.');
    await Engine.wait(400);
    await Engine.simulateUserType(thread, userInput, 'Build a travel dashboard Live Artifact from trip_ideas.txt — day calendar + packing list');
    await Engine.addThinking(thread, 1100);
    await Engine.addAssistantMsg(thread, ['Travel Dashboard on Live artifacts -välilehdessä ja kytketty trip_ideas.txt-tiedostoon.']);

    const art0 = `
      <div class="la-travel">
        <div class="la-travel-hero">
          <div><b>Lisbon retreat</b><small>Hotel Calm · 12–14 Jun</small></div>
          <div class="la-travel-wx"><strong>24°</strong>Clear</div>
        </div>
        <div class="la-travel-body">
          <div class="la-days">
            <div class="la-day"><em>Day 1</em><span>Arrive · team dinner</span></div>
            <div class="la-day"><em>Day 2</em><span>Workshop · evening walk</span></div>
            <div class="la-day"><em>Day 3</em><span>Depart</span></div>
          </div>
          <div class="la-pack"><b>Packing</b>
            <label><input type="checkbox" checked> Light jacket</label>
            <label><input type="checkbox"> Sneakers</label>
          </div>
        </div>
      </div>`;
    const artRain = `
      <div class="la-travel rainy">
        <div class="la-travel-hero">
          <div><b>Bergen retreat</b><small>Bryggen Lodge · 12–14 Jun</small></div>
          <div class="la-travel-wx"><strong>11°</strong>Rain</div>
        </div>
        <div class="la-travel-body">
          <div class="la-days">
            <div class="la-day"><em>Day 1</em><span>Arrive · team dinner</span></div>
            <div class="la-day on"><em>Day 2</em><span>Workshop · museum</span></div>
            <div class="la-day"><em>Day 3</em><span>Depart</span></div>
          </div>
          <div class="la-pack"><b>Packing</b>
            <label class="new"><input type="checkbox"> Rain gear</label>
            <label class="new"><input type="checkbox"> Waterproof shoes</label>
            <label><input type="checkbox"> Layered clothes</label>
          </div>
        </div>
      </div>`;

    const lab = Engine.openLiveArtifactLab(container, {
      scene: 'travel',
      artifactTitle: 'Travel Dashboard',
      artifactSub: 'Linked to trip_ideas.txt',
      fileName: 'trip_ideas.txt',
      fileMeta: 'local · source of truth',
      fileContent: 'DATES: 12–14 Jun\nHOTEL: Hotel Calm, Lisbon\nDAY 1: Arrive · team dinner\nDAY 2: Workshop · evening walk\nDAY 3: Depart',
      artifactHTML: art0,
      hint: 'Vaihda kohde tiedostossa — kalenteri ja packing-lista päivittyvät.',
      edits: [{
        id: 'bergen',
        label: 'Vaihda hotelli → Bergen (sateinen)',
        fileContent: 'DATES: 12–14 Jun\nHOTEL: Bryggen Lodge, Bergen\nDAY 1: Arrive · team dinner\nDAY 2: Workshop · museum\nDAY 3: Depart\nNOTE: rainy forecast',
        artifactHTML: artRain,
        syncNote: 'Bergen + sateinen → packingiin rain gear',
      }],
    });
    await lab.whenEdited;
    Engine.addComplete(lab.thread, 'Esimerkki päättyi — tiedosto ohjaa Artifactia. Tee sama H1–H5:ssä.');
  },

  exercises: [
    /* ---- H1 Travel ---- */
    {
      label: 'H1 · Travel planner',
      outcome: 'txt → kalenteri + packing',
      run: async (container) => {
        const trip0 = `DATES: 18–20 Sep
HOTEL: Hotel Calm, Lisbon
DAY 1: Arrive · welcome dinner
DAY 2: Strategy workshop · evening walk
DAY 3: Free morning · depart
PACK NOTE: warm city`;
        const trip1 = `DATES: 18–20 Sep
HOTEL: Bryggen Lodge, Bergen
DAY 1: Arrive · welcome dinner
DAY 2: Strategy workshop · fjord museum
DAY 3: Free morning · depart
PACK NOTE: rainy coastal`;

        const artLisbon = `
          <div class="la-travel">
            <div class="la-travel-hero">
              <div><b>Corporate retreat</b><small>Lisbon · Hotel Calm · 18–20 Sep</small></div>
              <div class="la-travel-wx"><strong>24°</strong>Sunny</div>
            </div>
            <div class="la-travel-body">
              <div class="la-days">
                <div class="la-day"><em>Fri 18</em><span>Arrive · welcome dinner</span></div>
                <div class="la-day"><em>Sat 19</em><span>Strategy workshop · evening walk</span></div>
                <div class="la-day"><em>Sun 20</em><span>Free morning · depart</span></div>
              </div>
              <div class="la-pack"><b>Packing checklist</b>
                <label><input type="checkbox"> Light jacket</label>
                <label><input type="checkbox"> Walking shoes</label>
                <label><input type="checkbox"> Adapter</label>
              </div>
            </div>
          </div>`;
        const artBergen = `
          <div class="la-travel rainy">
            <div class="la-travel-hero">
              <div><b>Corporate retreat</b><small>Bergen · Bryggen Lodge · 18–20 Sep</small></div>
              <div class="la-travel-wx"><strong>11°</strong>Rain</div>
            </div>
            <div class="la-travel-body">
              <div class="la-days">
                <div class="la-day"><em>Fri 18</em><span>Arrive · welcome dinner</span></div>
                <div class="la-day on"><em>Sat 19</em><span>Strategy workshop · fjord museum</span></div>
                <div class="la-day"><em>Sun 20</em><span>Free morning · depart</span></div>
              </div>
              <div class="la-pack"><b>Packing checklist</b>
                <label class="new"><input type="checkbox"> Rain gear</label>
                <label class="new"><input type="checkbox"> Waterproof shoes</label>
                <label><input type="checkbox"> Warm layers</label>
                <label><input type="checkbox"> Adapter</label>
              </div>
            </div>
          </div>`;

        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Travel',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactScene(container, {
          scene: 'travel',
          kicker: 'Exercise 1 · Lifestyle / Travel',
          title: 'Interactive Travel Planner',
          sub: 'Tehtäväsi: pyydä Claudelta Live Artifact, joka lukee trip_ideas.txt-tiedostoa — ei kertaluonteista chat-listaa.',
          chips: ['Lähde: trip_ideas.txt', 'Päivänäkymä', 'Packing', 'Sää'],
        });
        Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Trip/',
          pathHint: 'local asset — kurkista',
          entries: [{id:'trip', kind:'file', name:'trip_ideas.txt', type:'doc', meta:'dates · hotel · days', openable:true, content: trip0}],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H1 · Travel planner',
            situation: 'Suunnittelet monipäiväistä retreatia tai lomamatkaa. Hotelli ja päivät elävät vielä. Koneella on yksinkertainen trip_ideas.txt (kurkista oikealta): päivämäärät, hotelli, karkea päiväohjelma.',
            job: 'Pyydä Claudelta <b>Live Artifact</b> — visuaalinen matkanäkymä, joka käyttää trip_ideas.txt-tiedostoa lähteenä. Näkymässä pitää olla ainakin päiväkohtainen kalenteri ja packing-lista. Artifactin pitää pysyä kytkettynä tiedostoon (kun tiedosto myöhemmin vaihtuu, näkymä voi päivittyä).',
            outcome: 'Artifact on Live artifacts -välilehdellä. Seuraavaksi kokeilet tiedostomuutosta ja näet, päivittyykö näkymä.',
            folderNote: 'Älä rakenna kertalistaa chattiin. Tarvitset työkalun, jota voit avata uudelleen kun suunnitelma muuttuu.',
            mustInclude: [
              'Mainitse lähde: trip_ideas.txt',
              'Pyydä Live Artifact / dashboard / työkalu (ei vain “listaa päivät”)',
              'Kerro mitä näkymässä näkyy (päivät + packing; sää saa olla mukana)',
            ],
            nextHint: '↓ Kirjoita oma pyyntö omin sanoin. Briiffi kertoo mitä — ei valmista lausetta.',
          },
          minChars: 50,
          requireGroups: [
            ['trip', 'ideas', 'txt', 'matka', 'hotel', 'hotelli', 'itiner'],
            ['artifact', 'artefakt', 'live', 'dashboard', 'kalenter', 'packing', 'travel', 'työkalu'],
          ],
          banSnippets: ['Suunnittelet monipäiväistä', 'Pyydä Claudelta'],
        });

        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Travel Dashboard valmis ja kytketty trip_ideas.txt-tiedostoon.']);
        const lab = Engine.openLiveArtifactLab(container, {
          scene: 'travel',
          artifactTitle: 'Travel Dashboard',
          artifactSub: 'Linked to trip_ideas.txt',
          fileName: 'trip_ideas.txt',
          fileContent: trip0,
          artifactHTML: artLisbon,
          hint: 'Vaihda kohde tiedostossa — kalenteri + packing päivittyvät (esim. rain gear).',
          edits: [{
            id: 'rain',
            label: 'Vaihda → Bergen (sateinen)',
            fileContent: trip1,
            artifactHTML: artBergen,
            syncNote: 'Bergen + sade → packingiin rain gear',
          }],
        });
        await lab.whenEdited;
        Engine.addComplete(lab.thread, 'H1 valmis — tiedosto ohjaa matkanäkymää.');
      },
    },

    /* ---- H2 Seating ---- */
    {
      label: 'H2 · Seating chart',
      outcome: 'CSV → pöytäkartta',
      run: async (container) => {
        const csv0 = `name,rsvp,diet,table
Ada Kim,Yes,none,1
Ben Ortiz,Yes,vegetarian,1
Cara Ng,Yes,peanut allergy,2
Diego Ruiz,Yes,none,2
Eva Holm,Yes,none,2
Farah Ali,Pending,none,3`;
        const csv1 = `name,rsvp,diet,table
Ada Kim,Yes,none,1
Ben Ortiz,Yes,vegetarian,1
Cara Ng,Yes,peanut allergy,2
Diego Ruiz,Declined,none,
Eva Holm,Yes,none,2
Farah Ali,Yes,none,2
Gus Park,Yes,none,2`;

        const mapOk = `
          <div class="la-seat">
            <div class="la-seat-legend"><span class="ok">Confirmed</span><span class="warn">Allergy</span><span class="bad">Overfull</span></div>
            <div class="la-room">
              <div class="la-room-stage">STAGE</div>
              <div class="la-tables">
                <div class="la-table"><b>T1</b><div class="seats"><i class="ok"></i><i class="ok"></i><i></i><i></i></div><small>Ada · Ben (veg)</small></div>
                <div class="la-table warn"><b>T2</b><div class="seats"><i class="warn"></i><i class="ok"></i><i class="ok"></i><i></i></div><small>Cara · peanut · Diego · Eva</small></div>
                <div class="la-table"><b>T3</b><div class="seats"><i class="pend"></i><i></i><i></i><i></i></div><small>Farah (pending)</small></div>
              </div>
            </div>
          </div>`;
        const mapBad = `
          <div class="la-seat">
            <div class="la-seat-alert">Table 2 over capacity · peanut allergy flagged</div>
            <div class="la-seat-legend"><span class="ok">Confirmed</span><span class="warn">Allergy</span><span class="bad">Overfull</span></div>
            <div class="la-room">
              <div class="la-room-stage">STAGE</div>
              <div class="la-tables">
                <div class="la-table"><b>T1</b><div class="seats"><i class="ok"></i><i class="ok"></i><i></i><i></i></div><small>Ada · Ben (veg)</small></div>
                <div class="la-table bad"><b>T2</b><div class="seats"><i class="warn flash"></i><i class="ok"></i><i class="ok"></i><i class="ok"></i><i class="bad"></i></div><small>Cara · Eva · Farah · Gus</small></div>
                <div class="la-table empty"><b>T3</b><div class="seats"><i></i><i></i><i></i><i></i></div><small>Diego declined</small></div>
              </div>
            </div>
          </div>`;

        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Seating',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactScene(container, {
          scene: 'gala',
          kicker: 'Exercise 2 · Event planning',
          title: 'Guest List & Seating Chart',
          sub: 'Tehtäväsi: pyydä Live Artifact -pöytäkartta, joka lukee guest_list.csv-tiedostoa (RSVP + dieetti + pöytä).',
          chips: ['Lähde: guest_list.csv', 'Huonekartta', 'Allergia / yliääni'],
        });
        Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Gala/',
          pathHint: 'local asset — kurkista',
          entries: [{id:'g', kind:'file', name:'guest_list.csv', type:'doc', meta:'RSVP · diet · table', openable:true, content: csv0}],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H2 · Seating chart',
            situation: 'Järjestät hyväntekeväisyysgalaa tai networking-illallista. RSVP:t tippuvat sisään koko ajan. Vierailla on dieettirajoituksia. Koneella on guest_list.csv (kurkista): nimi, RSVP, dieetti, pöytänumero.',
            job: 'Pyydä Claudelta <b>Live Artifact</b> — visuaalinen huone-/pöytäkartta (pöydät + paikat), joka käyttää CSV:tä lähteenä. Kartan pitää reagoida muutoksiin (esim. Declined, pöydän vaihto) ja liputtaa ongelmia (liikaa vieraita / allergia).',
            outcome: 'Artifact on valmis ja kytketty CSV:hen. Seuraavaksi muutat tiedostoa ja katsot, päivittyykö kartta.',
            folderNote: 'Pelkkä “listaa vieraat chattiin” ei riitä — tarvitset elävän kartan, jota avaat uudelleen kun RSVP muuttuu.',
            mustInclude: [
              'Mainitse lähde: guest_list.csv',
              'Pyydä Live Artifact / seating map / pöytäkartta',
              'Kerro että näkymä seuraa RSVP:tä / pöytiä (varoitus dieetistä tai yliäänestä saa olla mukana)',
            ],
            nextHint: '↓ Kirjoita oma pyyntö. Älä kopioi briiffiä.',
          },
          minChars: 50,
          requireGroups: [
            ['guest', 'csv', 'lista', 'rsvp', 'table', 'pöyt', 'seat'],
            ['artifact', 'artefakt', 'live', 'map', 'kart', 'seating', 'layout', 'työkalu'],
          ],
          banSnippets: ['Järjestät hyväntekeväisyysgalaa', 'Pyydä Claudelta'],
        });

        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Room & Seating Map valmis — kytketty guest_list.csv-tiedostoon.']);
        const lab = Engine.openLiveArtifactLab(container, {
          scene: 'gala',
          artifactTitle: 'Room & Seating Map',
          artifactSub: 'Linked to guest_list.csv',
          fileName: 'guest_list.csv',
          fileContent: csv0,
          artifactHTML: mapOk,
          hint: 'Päivitä RSVP / pöytä CSV:ssä — kartta varoittaa yliäänistä ja allergioista.',
          edits: [{
            id: 'decline',
            label: 'Diego → Declined · Gus pöytään 2',
            fileContent: csv1,
            artifactHTML: mapBad,
            syncNote: 'T2 yli täynnä + peanut-varoitus',
          }],
        });
        await lab.whenEdited;
        Engine.addComplete(lab.thread, 'H2 valmis — CSV ohjaa pöytäkarttaa.');
      },
    },

    /* ---- H3 Menu / grocery ---- */
    {
      label: 'H3 · Smart menu',
      outcome: 'meals.txt → ostoslista',
      run: async (container) => {
        const meals0 = `Monday: Chicken Caesar Salad
Tuesday: Veggie Stir-fry
Wednesday: Overnight oats
Thursday: Chicken Caesar Salad
Friday: Tomato soup + bread`;
        const meals1 = `Monday: Beef Tacos
Tuesday: Veggie Stir-fry
Wednesday: Overnight oats
Thursday: Beef Tacos
Friday: Tomato soup + bread`;

        function shopHTML(mode, servings){
          const caesar = `
            <div class="la-aisle"><b>Produce</b><label><input type="checkbox"> Romaine ×${servings}</label><label><input type="checkbox"> Lemon</label></div>
            <div class="la-aisle"><b>Dairy</b><label><input type="checkbox"> Parmesan</label></div>
            <div class="la-aisle"><b>Meat</b><label><input type="checkbox"> Chicken ×${servings}</label></div>
            <div class="la-aisle"><b>Pantry</b><label><input type="checkbox"> Croutons</label><label><input type="checkbox"> Dressing</label></div>`;
          const tacos = `
            <div class="la-aisle"><b>Produce</b><label class="new"><input type="checkbox"> Lime ×${servings}</label><label><input type="checkbox"> Cilantro</label></div>
            <div class="la-aisle"><b>Dairy</b><label class="new"><input type="checkbox"> Sour cream</label></div>
            <div class="la-aisle"><b>Meat</b><label class="new"><input type="checkbox"> Beef ×${(servings*0.15).toFixed(1)} kg</label></div>
            <div class="la-aisle"><b>Pantry</b><label class="new"><input type="checkbox"> Tortillas ×${servings*2}</label><label class="new"><input type="checkbox"> Salsa</label></div>`;
          const title = mode === 'taco' ? 'Beef Tacos week' : 'Caesar week';
          const chips = mode === 'taco'
            ? '<span class="chip on">Beef Tacos ×2</span><span class="chip">Stir-fry</span><span class="chip">Oats</span><span class="chip">Soup</span>'
            : '<span class="chip on">Chicken Caesar ×2</span><span class="chip">Stir-fry</span><span class="chip">Oats</span><span class="chip">Soup</span>';
          return `
            <div class="la-menu">
              <div class="la-menu-hero">
                <div><b>${title}</b><small>Auto grocery by aisle</small></div>
                <div class="serv">Servings ${servings}</div>
              </div>
              <div class="la-menu-body">
                <div class="la-recipes">${chips}</div>
                <div class="la-shop">${mode === 'taco' ? tacos : caesar}</div>
              </div>
            </div>`;
        }

        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Meals',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactScene(container, {
          scene: 'kitchen',
          kicker: 'Exercise 3 · Wellness / Home',
          title: 'Smart Menu & Grocery List',
          sub: 'Tehtäväsi: pyydä Live Artifact, joka tekee ostoslistan weekly_meals.txt-ruokalajeista (hyllyittäin).',
          chips: ['Lähde: weekly_meals.txt', 'Ostoslista', 'Hyllyt', 'Annoskoko'],
        });
        Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Kitchen/',
          pathHint: 'local asset — kurkista',
          entries: [{id:'m', kind:'file', name:'weekly_meals.txt', type:'doc', meta:'dish names only', openable:true, content: meals0}],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H3 · Menu & grocery',
            situation: 'Haluat meal-prepata viikon, mutta et jaksa etsiä aineksia käsin. Koneella on weekly_meals.txt (kurkista) — siinä on vain ruokalajien nimet päivittäin (esim. “Monday: Chicken Caesar Salad”).',
            job: 'Pyydä Claudelta <b>Live Artifact</b>: vuorovaikutteinen ruoka-/ostoslista-appi, joka lukee tuota tiedostoa. Listan pitää olla jaoteltu kaupan hyllyittäin (esim. Produce / Dairy / Meat). Kun vaihdat ruokalajia tiedostossa, ostoslistan pitää vaihtua.',
            outcome: 'Artifact on valmis. Seuraavaksi vaihdat aterian tiedostossa ja tarkistat, päivittyykö lista.',
            folderNote: 'Et tarvitse valmista reseptikirjaa chattiin — tarvitset elävän työkalun tiedoston päälle.',
            mustInclude: [
              'Mainitse lähde: weekly_meals.txt',
              'Pyydä Live Artifact / shopping list -työkalu',
              'Kerro että lista on hyllyittäin / päivittyy kun ateriat muuttuvat',
            ],
            nextHint: '↓ Kirjoita oma pyyntö. Älä kopioi briiffiä.',
          },
          minChars: 50,
          requireGroups: [
            ['meal', 'weekly', 'txt', 'ruoka', 'menu', 'ater'],
            ['artifact', 'artefakt', 'live', 'shop', 'ostos', 'grocery', 'lista', 'recipe', 'työkalu'],
          ],
          banSnippets: ['Haluat meal-prepata', 'Pyydä Claudelta'],
        });

        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Recipe & Shopping List -Artifact valmis — kytketty weekly_meals.txt-tiedostoon.']);
        const lab = Engine.openLiveArtifactLab(container, {
          scene: 'kitchen',
          artifactTitle: 'Recipe & Shopping List',
          artifactSub: 'Linked to weekly_meals.txt',
          fileName: 'weekly_meals.txt',
          fileContent: meals0,
          artifactHTML: shopHTML('caesar', 2),
          hint: 'Vaihda ruokalaji tiedostossa — ostoslista vaihtuu hyllyittäin.',
          edits: [{
            id: 'taco',
            label: 'Vaihda Caesar → Beef Tacos',
            fileContent: meals1,
            artifactHTML: shopHTML('taco', 2),
            syncNote: 'Tacos → tortillat, nauta, salsa',
          }],
        });
        await lab.whenEdited;
        Engine.addComplete(lab.thread, 'H3 valmis — notepad → ostoslista.');
      },
    },

    /* ---- H4 Kanban ---- */
    {
      label: 'H4 · Content kanban',
      outcome: 'drafts + log → board',
      run: async (container) => {
        const log0 = `ideas: podcast-outline.md
writing: linkedin-ai-tips.md
ready: newsletter-march.md`;
        const log1 = `ideas: podcast-outline.md
writing:
ready: newsletter-march.md
ready: linkedin-ai-tips.md`;

        const board0 = `
          <div class="la-kanban-wrap">
            <h3>Publishing board · this week</h3>
            <div class="la-kanban">
              <div class="la-col"><h4>Ideas</h4><div class="la-card">podcast-outline<small>draft_articles/</small></div></div>
              <div class="la-col"><h4>Writing</h4><div class="la-card writing">linkedin-ai-tips<small>In progress</small></div></div>
              <div class="la-col"><h4>Ready to Publish</h4><div class="la-card ready">newsletter-march<small>Ready</small></div></div>
            </div>
          </div>`;
        const board1 = `
          <div class="la-kanban-wrap">
            <h3>Publishing board · this week</h3>
            <div class="la-kanban">
              <div class="la-col"><h4>Ideas</h4><div class="la-card">podcast-outline<small>draft_articles/</small></div></div>
              <div class="la-col"><h4>Writing</h4><div class="la-card empty">Empty</div></div>
              <div class="la-col"><h4>Ready to Publish</h4>
                <div class="la-card ready">newsletter-march<small>Ready</small></div>
                <div class="la-card ready move-in">linkedin-ai-tips<small>Just moved</small></div>
              </div>
            </div>
          </div>`;

        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Content',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactScene(container, {
          scene: 'studio',
          kicker: 'Exercise 4 · Marketing / Writing',
          title: 'Content Calendar & Kanban',
          sub: 'Tehtäväsi: pyydä Live Artifact -kanban, joka seuraa status_log.txt + draft_articles/ -kansiota.',
          chips: ['Lähde: status_log.txt', 'Ideas', 'Writing', 'Ready'],
        });
        Engine.renderWorkspacePanel(panel, {
          rootLabel: 'Content/',
          pathHint: 'drafts + log — kurkista',
          entries: [
            {id:'d', kind:'folder', name:'draft_articles', children: [
              {id:'d1', kind:'file', name:'linkedin-ai-tips.md', type:'doc', meta:'writing', openable:true, content:'# 5 AI tips for consultants\n\nDraft in progress…'},
              {id:'d2', kind:'file', name:'newsletter-march.md', type:'doc', meta:'ready', openable:true, content:'# March newsletter\n\nReady to send.'},
              {id:'d3', kind:'file', name:'podcast-outline.md', type:'doc', meta:'idea', openable:true, content:'Episode ideas…'},
            ]},
            {id:'log', kind:'file', name:'status_log.txt', type:'doc', meta:'kanban source', openable:true, content: log0},
          ],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H4 · Content kanban',
            situation: 'Olet konsultti / sisällöntuottaja. Julkaisuaikataulu elää LinkedInissä, blogissa ja uutiskirjeessä. Koneella on draft_articles/ -kansio + status_log.txt, joka kertoo onko luonnos Ideas / Writing / Ready (kurkista molemmat).',
            job: 'Pyydä Claudelta <b>Live Artifact</b> — visuaalinen Kanban-board (Ideas · Writing · Ready to Publish), jossa jokainen luonnos on kortti. Boardin pitää olla kytketty status_logiin / draft-kansioon: kun status muuttuu, kortti siirtyy.',
            outcome: 'Board on Live artifacts -välilehdellä. Seuraavaksi muutat lokia ja katsot, liikkuuko kortti.',
            folderNote: 'Chat-muistilista ei riitä — tarvitset boardin, joka seuraa oikeita tiedostoja.',
            mustInclude: [
              'Mainitse status_log.txt ja/tai draft_articles',
              'Pyydä Live Artifact / kanban / board',
              'Kerro sarakkeet tai että status ohjaa kortteja',
            ],
            nextHint: '↓ Kirjoita oma pyyntö. Älä kopioi briiffiä.',
          },
          minChars: 50,
          requireGroups: [
            ['status', 'log', 'draft', 'article', 'kansio', 'content', 'txt'],
            ['artifact', 'artefakt', 'live', 'kanban', 'board', 'calendar', 'työkalu', 'sarake'],
          ],
          banSnippets: ['Olet konsultti', 'Pyydä Claudelta'],
        });

        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Kanban Board valmis — kytketty status_log.txt + draft_articles -kansioon.']);
        const lab = Engine.openLiveArtifactLab(container, {
          scene: 'studio',
          artifactTitle: 'Content Kanban',
          artifactSub: 'Linked to status_log.txt + drafts/',
          fileName: 'status_log.txt',
          fileMeta: 'tracks draft_articles/',
          fileContent: log0,
          artifactHTML: board0,
          hint: 'Siirrä luonnos “ready”-tilaan lokissa — kortti liikkuu boardilla.',
          edits: [{
            id: 'ready',
            label: 'linkedin-ai-tips → Ready to Publish',
            fileContent: log1,
            artifactHTML: board1,
            syncNote: 'Kortti siirtyi Writing → Ready',
          }],
        });
        await lab.whenEdited;
        Engine.addComplete(lab.thread, 'H4 valmis — tiedosto-organisaatio ↔ kanban.');
      },
    },

    /* ---- H5 Vacation coverage ---- */
    {
      label: 'H5 · Team coverage',
      outcome: 'schedule → risk grid',
      run: async (container) => {
        const vac0 = `Lee Park: 2–4 Jul (approved)
Sam Okonkwo: —
Priya Shah: 10–12 Jul (requested)
Jordan Lee: —`;
        const vac1 = `Lee Park: 2–4 Jul (approved)
Sam Okonkwo: 3–5 Jul (requested)
Priya Shah: 10–12 Jul (requested)
Jordan Lee: —`;

        const grid0 = `
          <div class="la-cov">
            <div class="la-cov-head"><b>Team Coverage</b><span>July · Ops team</span></div>
            <div class="la-cov-alert ok">Coverage OK — no critical overlap</div>
            <div class="la-cov-grid">
              <div class="la-cov-row"><span>Lee</span><div class="bar"><i style="--s:2;--w:3" class="away"></i></div></div>
              <div class="la-cov-row"><span>Sam</span><div class="bar"></div></div>
              <div class="la-cov-row"><span>Priya</span><div class="bar"><i style="--s:10;--w:3" class="req"></i></div></div>
              <div class="la-cov-row"><span>Jordan</span><div class="bar"></div></div>
            </div>
            <div class="la-cov-days"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>…</span><span>10</span><span>11</span><span>12</span></div>
          </div>`;
        const grid1 = `
          <div class="la-cov">
            <div class="la-cov-head"><b>Team Coverage</b><span>July · Ops team</span></div>
            <div class="la-cov-alert bad">Coverage risk — Lee + Sam overlap 3–4 Jul. Fallback: Jordan covers standup; delay Sam to 6–8 Jul.</div>
            <div class="la-cov-grid">
              <div class="la-cov-row"><span>Lee</span><div class="bar"><i style="--s:2;--w:3" class="away"></i></div></div>
              <div class="la-cov-row"><span>Sam</span><div class="bar"><i style="--s:3;--w:3" class="req conflict"></i></div></div>
              <div class="la-cov-row"><span>Priya</span><div class="bar"><i style="--s:10;--w:3" class="req"></i></div></div>
              <div class="la-cov-row"><span>Jordan</span><div class="bar"></div></div>
            </div>
            <div class="la-cov-days"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>…</span><span>10</span><span>11</span><span>12</span></div>
          </div>`;

        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Coverage',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactScene(container, {
          scene: 'office',
          kicker: 'Exercise 5 · HR / Leadership',
          title: 'Team Vacation & Coverage',
          sub: 'Tehtäväsi: pyydä Live Artifact -coverage-kalenteri vacation_schedule.txt-tiedostosta + riskivaroitus limityksistä.',
          chips: ['Lähde: vacation_schedule.txt', 'Aikajana', 'Risk alert'],
        });
        Engine.renderWorkspacePanel(panel, {
          rootLabel: 'HR/',
          pathHint: 'local asset — kurkista',
          entries: [{id:'v', kind:'file', name:'vacation_schedule.txt', type:'doc', meta:'names · dates', openable:true, content: vac0}],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H5 · Team coverage',
            situation: 'Olet tiiminvetäjä. Kesälomia pitää hyväksyä, mutta osasto ei saa jäädä vajaaksi. Koneella on vacation_schedule.txt (kurkista): nimet + pyydetyt päivät.',
            job: 'Pyydä Claudelta <b>Live Artifact</b> — coverage-kalenteri / aikajana, joka näyttää kuka on poissa milloinkin. Mukana “Coverage Risk Alert”: jos kriittiset henkilöt limittäin, varoitus (ja mieluiten fallback-ehdotus). Artifact lukee schedule-tiedostoa.',
            outcome: 'Grid on valmis. Seuraavaksi lisäät lomapyynnön tiedostoon ja katsot, syttyykö riski.',
            folderNote: 'Staattinen taulukko chatissa ei riitä — tarvitset elävän näkymän, jota päivität lomakauden ajan.',
            mustInclude: [
              'Mainitse lähde: vacation_schedule.txt',
              'Pyydä Live Artifact / coverage calendar / grid',
              'Kerro riskivaroituksesta limityksille (coverage)',
            ],
            nextHint: '↓ Kirjoita oma pyyntö. Älä kopioi briiffiä.',
          },
          minChars: 50,
          requireGroups: [
            ['vacation', 'schedule', 'txt', 'loma', 'leave', 'team', 'hr'],
            ['artifact', 'artefakt', 'live', 'coverage', 'calendar', 'risk', 'grid', 'työkalu', 'hälyt'],
          ],
          banSnippets: ['Olet tiiminvetäjä', 'Pyydä Claudelta'],
        });

        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Team Coverage Grid valmis — kytketty vacation_schedule.txt-tiedostoon.']);
        const lab = Engine.openLiveArtifactLab(container, {
          scene: 'office',
          artifactTitle: 'Team Coverage Grid',
          artifactSub: 'Linked to vacation_schedule.txt',
          fileName: 'vacation_schedule.txt',
          fileContent: vac0,
          artifactHTML: grid0,
          hint: 'Lisää lomapyyntö tiedostoon — kalenteri + riskialert päivittyvät.',
          edits: [{
            id: 'overlap',
            label: 'Lisää Sam 3–5 Jul (requested)',
            fileContent: vac1,
            artifactHTML: grid1,
            syncNote: 'Risk alert — Lee + Sam limittäin',
          }],
        });
        await lab.whenEdited;
        Engine.addComplete(lab.thread, 'H5 valmis — schedule → coverage risk.');
      },
    },
  ],
});
