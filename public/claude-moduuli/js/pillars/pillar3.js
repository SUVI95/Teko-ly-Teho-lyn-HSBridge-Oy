window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p3',
  num: 3,
  name: 'Live Artifacts',
  subtitle: 'Elävät työkalut',

  theory: {
    tagline: 'Live Artifacts (ent. “Co-Work Artifacts”) — dynaaminen työkalu, joka jää Coworkiin chatin jälkeenkin.',
    whatItDoes: 'Coworkissa Claude ei tuota vain hetkellistä vastausta: se voi rakentaa <b>Live Artifactin</b> — pysyvän, päivittyvän HTML-työkalun (kojelaudan, seurantataulukon, budjettinäkymän). Artifactilla on oma välilehti sivupalkissa ja versiohistoria. Se täydentää Coworkin muita kykyjä: paikalliset tiedostot + tarvittaessa verkkotieto.',
    howItWorks: 'Pyydät työkalua Coworkissa. Claude rakentaa sen ja pinnaa sen <b>Live artifacts</b> -kohtaan. Kun avaat sen myöhemmin, luvut voivat päivittyä liitetyistä tiedostoista tai yhteyksistä. Jos muutos menee pieleen, palautat aiemman version historiasta — sama logiikka kuin tiedostojen vahvistuksessa: sinä pidät kontrollin.',
    benefits: 'Yksi Artifact korvaa viikoittain uudelleen rakennettavan taulukon. Työkalu elää; chat-ketju ei ole ainoa muisti.',
    whereToUse: 'Budjetti, myyntiseuranta, projektin tilanne, viikkoraportti, riskiloki — toistuva seuranta jossa tarvitset sekä näkymän että päivityksen.',
    capabilities: [
      {title: 'Pysyy sivupalkissa', body: 'Ei katoa kun suljet chatin — oma Live artifacts -välilehti ja pin.'},
      {title: 'Päivittyvä data', body: 'Voi hakea tuoretta tietoa tiedostoista tai liitännöistä kun avaat uudelleen.'},
      {title: 'Versiohistoria', body: 'Huono muutos → palaa edelliseen versioon ilman että rakennat kaiken alusta.'},
    ],
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'artifacts',
      topbarTitle: 'Live artifacts — Budjettityökalu',
      composerHint: 'Cowork · Live artifact',
    });
    Engine.renderScenarioPanel(panel, `<h4>Live artifact</h4><p>Työkalu ilmestyy tähän kun se on valmis.</p>`);
    Engine.addNarrator(thread, 'Katso miten tämä etenee kokonaan.');
    await Engine.wait(500);
    await Engine.simulateUserType(thread, userInput, 'Tee budjettityökalu joka näyttää tulot, menot ja säästön');
    await Engine.addThinking(thread, 1400);
    await Engine.addAssistantMsg(thread, ['Rakensin budjettityökalun ja tallensin sen Live artifacts -välilehteen.']);
    Engine.renderArtifactDashboardPanel(panel, {
      title: 'Budjettityökalu',
      rows: [{label:'Tulot', value:'2 400 €'}, {label:'Menot', value:'1 850 €'}, {label:'Säästö', value:'550 €'}],
    });
    await Engine.wait(600);
    const action = await Engine.addCard(thread, {
      title: 'Aikahyppy',
      body: 'Suljet simulaation nyt ja "avaat sen huomenna" — katso mitä tapahtuu.',
      actions: [{id:'jump', label:'Avaa huomenna', primary:true}],
      auto: {ms: 900, actionId: 'jump'},
    });
    const rows = panel.querySelectorAll('.dash-row b');
    rows[0].textContent = '2 400 €';
    rows[1].textContent = '1 990 €';
    rows[2].textContent = '410 €';
    panel.querySelector('.dash-updated').textContent = 'Päivitetty juuri nyt — uusia menoja kirjattu eilen illalla';
    await Engine.addAssistantMsg(thread, ['Luvut päivittyivät itsestään — menot kasvoivat 140 €, koska eilen kirjattiin uusi ostos. Et joutunut rakentamaan taulukkoa uudelleen.']);
    Engine.addComplete(thread, 'Esimerkki päättyi. Kokeile nyt itse harjoituksissa.');
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Rakenna kojelauta',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — uusi työkalu',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderScenarioPanel(panel, `<h4>Live artifact</h4><p>Työkalu ilmestyy tähän kun kuvailet mitä tarvitset.</p>`);
        Engine.addNarrator(thread, 'Kuvittele, että haluat seurata kuukausibudjettiasi ilman että rakennat taulukkoa uudelleen joka kuukausi. Kirjoita pyyntösi.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['budjet','työkalu','seura','kojelau','taulukk','tee'],
          clarifyText: 'Minkä tyyppistä työkalua haluaisit — mitä lukuja sen pitäisi näyttää?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }

        await Engine.addThinking(thread, 1400);
        await Engine.addAssistantMsg(thread, ['Rakensin budjettityökalun ja tallensin sen Live artifacts -välilehteen — löydät sen aina sieltä, ei vain tästä keskustelusta.']);
        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Oma budjetti',
          rows: [{label:'Tulot', value:'2 100 €'}, {label:'Menot', value:'1 640 €'}, {label:'Säästö', value:'460 €'}],
        });

        const action = await Engine.addCard(thread, {
          title: 'Kokeile aikahyppyä',
          body: 'Klikkaa, niin "suljet simulaation nyt" ja "avaat sen huomenna" nähdäksesi, mitä eläville artefakteille tapahtuu ajan kuluessa.',
          actions: [{id:'jump', label:'Avaa huomenna', primary:true}],
        });
        const rows = panel.querySelectorAll('.dash-row b');
        rows[1].textContent = '1 790 €';
        rows[2].textContent = '310 €';
        panel.querySelector('.dash-updated').textContent = 'Päivitetty juuri nyt';

        await Engine.addAssistantMsg(thread, ['Luvut muuttuivat ilman että pyysit mitään uudelleen — työkalu haki tuoreen tilanteen kun avasit sen.']);

        await Engine.addQuiz(thread, {
          question: 'Mikä olisi tapahtunut, jos tämä olisi ollut tavallinen (ei-elävä) artefakti?',
          options: [
            {text:'Se olisi näyttänyt saman tiedon kuin rakennushetkellä, kunnes olisit pyytänyt sen uudelleen', correct:true,
             feedback:'Aivan — tavallinen artefakti on tilannekuva. Live artifact taas hakee tuoretta tietoa joka kerta kun avaat sen.'},
            {text:'Se olisi kadonnut kokonaan seuraavana päivänä', correct:false,
             feedback:'Ei — tavallinenkin artefakti säilyy. Ero on siinä, päivittyykö sen sisältö itsestään vai ei.'},
            {text:'Ei mitään eroa, molemmat päivittyvät samalla tavalla', correct:false,
             feedback:'Juuri tämä on ero: vain live artifact hakee tuoretta dataa avatessasi sen uudelleen.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 1 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 2 · Versiohistoria pelastaa',
      run: async (container) => {
        const { thread, panel } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — Myyntiseuranta',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.addNarrator(thread, 'Tässä harjoituksessa Claude tekee kaksi muutosta myyntityökaluun. Yksi niistä menee pieleen. Sinun tehtäväsi on huomata se ja korjata tilanne versiohistoriasta.');
        const { rowsEl, updatedEl, versionsEl } = Engine.renderArtifactDashboardPanel(panel, {
          title: 'Myyntiseuranta',
          rows: [{label:'Myynti (kk)', value:'18 400 €'}, {label:'Tavoite', value:'20 000 €'}, {label:'Ero', value:'−1 600 €'}],
        });
        const versions = [
          {id:'v1', label:'v1 · alkuperäinen', rows:['18 400 €','20 000 €','−1 600 €']},
          {id:'v2', label:'v2 · lisätty alue', rows:['21 900 €','20 000 €','+1 900 €']},
          {id:'v3', label:'v3 · korjattu kaava', rows:['3 100 €','20 000 €','−16 900 €']},
        ];
        versions.forEach((v,i) => {
          const chip = Engine.el(`<div class="version-chip ${i===0?'current':''}" data-id="${v.id}" style="pointer-events:none;opacity:.5;">${v.label}</div>`);
          versionsEl.appendChild(chip);
        });

        await Engine.wait(500);
        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Lisäsin mukaan uuden myyntialueen datan (v2). Kokonaismyynti nousi 21 900 euroon.']);
        rowsEl.querySelectorAll('b')[0].textContent = versions[1].rows[0];
        rowsEl.querySelectorAll('b')[2].textContent = versions[1].rows[2];
        versionsEl.querySelector('[data-id="v1"]').classList.remove('current');
        versionsEl.querySelector('[data-id="v2"]').classList.add('current');

        await Engine.wait(900);
        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Korjasin laskentakaavan vastaamaan uutta raportointimallia (v3).']);
        rowsEl.querySelectorAll('b')[0].textContent = versions[2].rows[0];
        rowsEl.querySelectorAll('b')[2].textContent = versions[2].rows[2];
        versionsEl.querySelector('[data-id="v2"]').classList.remove('current');
        versionsEl.querySelector('[data-id="v3"]').classList.add('current');

        await Engine.addReflection(thread, {
          prompt: 'Katso lukuja oikealla. Jokin meni pieleen versiossa v3 — myynti putosi 3 100 euroon, vaikka mikään ei oikeasti muuttunut niin rajusti. Mitä teet seuraavaksi? Kirjoita, mitä klikkaisit ja miksi.',
          placeholder: 'Klikkaisin…',
        });

        Engine.addNarrator(thread, 'Klikkaa oikealta se versio, johon haluat palata.');
        versionsEl.querySelectorAll('.version-chip').forEach(c => { c.style.pointerEvents = 'auto'; c.style.opacity = '1'; });
        await new Promise(resolve => {
          versionsEl.querySelectorAll('.version-chip').forEach(chip => {
            chip.addEventListener('click', function handler(){
              const id = chip.dataset.id;
              const v = versions.find(x => x.id === id);
              rowsEl.querySelectorAll('b')[0].textContent = v.rows[0];
              rowsEl.querySelectorAll('b')[2].textContent = v.rows[2];
              versionsEl.querySelectorAll('.version-chip').forEach(c => c.classList.remove('current'));
              chip.classList.add('current');
              versionsEl.querySelectorAll('.version-chip').forEach(c => c.removeEventListener('click', handler));
              resolve(id);
            });
          });
        }).then(async (id) => {
          await Engine.addAssistantMsg(thread, [id === 'v1'
            ? 'Palautettu alkuperäiseen versioon. Luvut ovat taas luotettavat, ja voit rakentaa korjauksen tästä eteenpäin rauhassa.'
            : 'Palautit version, jossa virhe on yhä mukana — versiohistoriassa voit palata mihin tahansa aiempaan tilaan, joten voit vielä valita toisen.']);
        });

        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Milloin ei kannata',
      run: async (container) => {
        const { thread } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — kolme tilannetta',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.addNarrator(thread, 'Kolme tilannetta. Kullekin: tekisitkö siitä live artifactin, tavallisen kertaraportin, vai et kumpaakaan? Perustele lyhyesti jokainen.');
        const scenarios = [
          '1) Viikoittainen myyntikatsaus, jota johtoryhmä avaa joka maanantai.',
          '2) Kertaluonteinen analyysi siitä, kannattaako uusi toimipiste — käytetään yhdessä päätöskokouksessa.',
          '3) Henkilöstön palkkatietoja sisältävä yhteenveto, jota vain sinä katsot silloin tällöin.',
        ];
        await Engine.addAssistantMsg(thread, [scenarios.join(' ')]);
        await Engine.addReflection(thread, {
          prompt: 'Kirjoita ratkaisusi kaikkiin kolmeen ja lyhyt perustelu kullekin.',
          placeholder: '1) …  2) …  3) …',
        });
        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, [
          'Yksi asia kannattaa huomata riippumatta vastauksistasi: live artifact hakee dataa joka avauskerralla sieltä mihin se on yhdistetty. Kolmannessa tilanteessa tämä tarkoittaa, että arkaluontoinen data haetaan ja näytetään joka kerta uudelleen — sekin on syy miettiä tarkkaan mitä yhdistää mihinkin.',
        ]);
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Datalähteen luotettavuus',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — kaksi lähdettä',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Kvartaalimyynti',
          rows: [{label:'CRM:stä', value:'184 000 €'}, {label:'Laskutusjärjestelmästä', value:'171 500 €'}, {label:'Ero', value:'12 500 €'}],
        });
        Engine.addNarrator(thread, 'Kojelauta yhdistää kaksi lähdettä, ja luvut eivät täsmää — 12 500 euron ero. Kirjoita Claudelle ohje siitä, miten haluat tällaiset ristiriidat käsiteltävän jatkossa, ei vain tälle kertaa vaan pysyvänä sääntönä kojelaudalle.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['näytä','merkitse','ilmoita','flag','huomaut','vertaa','tarkista','kerro'],
          clarifyText: 'Mitä konkreettisesti pitäisi tapahtua, kun kaksi lähdettä eivät täsmää?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }
        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, ['Lisäsin tämän kojelaudan pysyväksi säännöksi. Jatkossa ristiriidat näkyvät kojelaudalla juuri niin kuin kuvasit, joka kerta kun se päivittyy — et joudu pyytämään tätä uudelleen.']);
        Engine.addComplete(thread, 'Harjoitus 4 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 5 · Rakenna oma KPI-kojelauta',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'artifacts',
          topbarTitle: 'Live artifacts — oma kojelauta',
          composerHint: 'Cowork · Live artifact',
        });
        Engine.renderScenarioPanel(panel, `<h4>Kojelauta ilmestyy tähän</h4><p>Kuvaile ensin mikä oikea, toistuva luku tai tilanne omassa työssäsi ansaitsisi oman kojelaudan.</p>`);
        Engine.addNarrator(thread, 'Kirjoita mitä lukuja kojelauta näyttäisi ja mistä ne tulisivat.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, { accept: [''], clarifyText: '' });

        await Engine.addThinking(thread, 1200);
        await Engine.addAssistantMsg(thread, ['Rakensin kuvauksesi pohjalta luonnoksen.']);
        Engine.renderArtifactDashboardPanel(panel, {
          title: 'Oma kojelauta',
          rows: [{label:'Mittari 1', value:'—'}, {label:'Mittari 2', value:'—'}, {label:'Tavoite', value:'—'}],
        });
        await Engine.addReflection(thread, {
          prompt: 'Kojelauta on nyt olemassa, mutta arvot ovat vielä tyhjiä — oikeassa tilanteessa ne tulisivat yhdistetystä lähteestä. Mikä konkreettisesti laukaisisi sinut avaamaan tämän kojelaudan version historian sen sijaan että vain katsoisit uusimpia lukuja?',
          placeholder: 'Avaisin version historian, jos…',
        });
        Engine.addComplete(thread, 'Harjoitus 5 suoritettu.');
      },
    },
  ],
});
