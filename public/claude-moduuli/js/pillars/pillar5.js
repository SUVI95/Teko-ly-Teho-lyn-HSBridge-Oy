window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p5',
  num: 5,
  name: 'Connectors',
  subtitle: 'Yhteydet muihin työkaluihin',

  theory: {
    tagline: 'Claude käyttää muita ohjelmia suoraan sen sijaan että kopioisit tietoa käsin.',
    whatItDoes: 'Yhteydet (Connectors) antavat Clauden lukea ja kirjoittaa suoraan muihin työkaluihin — kalenteriin, muistiinpanotyökaluun, sähköpostiin — samalla tavalla kuin se käsittelee paikallisia tiedostoja.',
    howItWorks: 'Yhdistät palvelun kerran (esimerkiksi Google Calendarin). Sen jälkeen Claude voi pyynnöstäsi etsiä vapaan ajan, lisätä muistiinpanon tai koota tietoa useammasta palvelusta yhteen vastaukseen. Jos yhteyttä ei ole tai se puuttuu, Claude sanoo sen suoraan sen sijaan että väittäisi tehneensä jotain.',
    benefits: 'Yksi pyyntö riittää tehtävään, joka muuten vaatisi hyppimistä useamman ohjelman välillä ja tiedon kopioimista käsin.',
    whereToUse: 'Kun tehtävä koskee tietoa, joka asuu jossain toisessa työkalussa: kalenteri, muistiinpanot, asiakasrekisteri.',
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'connectors',
      topbarTitle: 'Connectors — Google Calendar',
      composerHint: 'Connected: Google Calendar',
    });
    const { grid } = Engine.renderCalendarPanel(panel);
    Engine.addNarrator(thread, 'Katso miten tämä etenee kokonaan.');
    await Engine.wait(500);
    await Engine.simulateUserType(thread, userInput, 'Etsi kahden tunnin vapaa aika ennen perjantaita');
    await Engine.addThinking(thread, 1100);
    const free = [...grid.querySelectorAll('.cal-slot:not(.busy)')].slice(0,2);
    free.forEach(s => s.classList.add('picked'));
    await Engine.addAssistantMsg(thread, ['Löysin vapaan kahden tunnin ajan — merkitsin sen kalenteriin oikealla.']);
    Engine.addComplete(thread, 'Esimerkki päättyi. Kokeile nyt itse harjoituksissa.');
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Kalenteriaukko',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'connectors',
          topbarTitle: 'Connectors — Google Calendar',
          composerHint: 'Connected: Google Calendar',
        });
        const { grid } = Engine.renderCalendarPanel(panel);
        Engine.addTaskBrief(thread, {
          goal: 'Kalenterisi on yhdistetty. Pyydä Claudelta vapaa aika kokoukselle — päätä itse kuinka pitkä ja mihin mennessä.',
          hint: 'Lopputulos: oikealla näkyvä kalenteri saa merkinnän löytämästäsi ajasta.',
        });
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['vapaa','aika','etsi','varaa','tunti','tunnin'],
          clarifyText: 'Kuinka pitkän vapaan ajan tarvitset, ja mihin mennessä?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }

        await Engine.addThinking(thread, 1100);
        const free = [...grid.querySelectorAll('.cal-slot:not(.busy)')].slice(0,2);
        free.forEach(s => s.classList.add('picked'));
        await Engine.addAssistantMsg(thread, ['Löysin ja merkitsin kalenteriin vapaan ajan, joka vastaa pyyntöäsi — katso oikealta.']);

        await Engine.addQuiz(thread, {
          question: 'Mistä Claude tiesi, mitkä ajat kalenterissa ovat jo varattuja?',
          options: [
            {text:'Yhteyden kautta se luki kalenterisi todellisen sisällön, ei arvannut', correct:true,
             feedback:'Oikein. Yhteys antaa Claudelle pääsyn oikeaan dataan — se ei arvaa aikatauluasi, vaan tarkistaa sen.'},
            {text:'Se kysyi sinulta jokaisen varatun ajan erikseen ennen vastaamista', correct:false,
             feedback:'Ei — koko pointti yhteydessä on, ettei sinun tarvitse listata varauksia käsin.'},
            {text:'Se arvasi todennäköisen aikataulun tyypillisen työpäivän perusteella', correct:false,
             feedback:'Ei — ilman yhteyttä Claude ei tietäisi kalenteriasi lainkaan eikä väittäisi tietävänsä.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 1 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 2 · Kun yhteyttä ei ole',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'connectors',
          topbarTitle: 'Connectors — ei yhdistettyä laskutusjärjestelmää',
          composerHint: 'No connector for: laskutusjärjestelmä',
        });
        Engine.renderScenarioPanel(panel, `
          <h4>Tilanne</h4>
          <p>Yrityksesi käyttää omaa, pientä laskutusjärjestelmää, jota ei ole listalla valmiiden yhteyksien joukossa.</p>`);
        Engine.addTaskBrief(thread, {
          goal: 'Pyydä Claudelta jotain, joka koskee tätä laskutusjärjestelmää — katso mitä tapahtuu kun yhteyttä ei ole olemassa.',
          hint: 'Ei ole väärää tapaa kirjoittaa pyyntö — tämä testaa mitä Claude tekee, ei sinua.',
        });
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: [''],
          clarifyText: '',
        });

        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, [
          'Minulla ei ole yhteyttä tähän laskutusjärjestelmään, joten en pääse siihen käsiksi suoraan enkä voi väittää tarkistaneeni sitä.',
          'Voin silti auttaa: jos viet tiedot CSV- tai PDF-tiedostona, voin lukea ne Cowork-tilassa. Vai onko järjestelmässä oma yhteysvaihtoehto (MCP), jonka voisi lisätä?',
        ]);

        const correct = await Engine.addQuiz(thread, {
          question: 'Mikä näistä kuvaa parhaiten sitä, mitä juuri tapahtui?',
          options: [
            {text:'Claude kertoi rehellisesti rajan ja tarjosi kaksi vaihtoehtoista tapaa edetä', correct:true,
             feedback:'Juuri näin. Kun yhteyttä ei ole, oikea vastaus on sanoa se — ei teeskennellä tarkistaneensa jotain mihin sillä ei ole pääsyä.'},
            {text:'Claude teki parhaansa mukaan arvion laskutustilanteesta', correct:false,
             feedback:'Ei — Claude ei arvannut mitään laskutuksesta. Se kertoi suoraan, ettei pääse siihen käsiksi.'},
            {text:'Tehtävä epäonnistui kokonaan eikä mitään voi tehdä', correct:false,
             feedback:'Ei aivan — Claude tarjosi konkreettisen vaihtoehdon (tiedoston lukeminen tai uuden yhteyden lisääminen).'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Ristiriitaiset lähteet',
      run: async (container) => {
        const { thread } = Engine.renderChatShell(container, {
          sidebarHighlight: 'connectors',
          topbarTitle: 'Connectors — kalenteri vs. sähköposti',
          composerHint: 'Connected: Google Calendar, Gmail',
        });
        Engine.addTaskBrief(thread, {
          goal: 'Kaksi yhdistettyä lähdettä antavat tästä tilanteesta eri vastauksen. Päätä ja kirjoita, miten haluat Claudelta jatkossa käsiteltävän tällaiset ristiriidat.',
        });
        await Engine.addThinking(thread, 800);
        await Engine.addAssistantMsg(thread, [
          'Tarkistin huomisen asiakastapaamisen kahdesta lähteestä. Kalenterissa se on klo 13:00. Viimeisimmässä sähköpostiketjussa asiakas ehdotti klo 14:00, etkä ole vielä vahvistanut sitä kalenteriin.',
        ]);
        await Engine.addReflection(thread, {
          prompt: 'Mitä haluaisit Claudelta tässä tilanteessa — mitä sen pitäisi tehdä, ja mitä sen ei pitäisi olettaa puolestasi?',
          placeholder: 'Haluaisin että Claude…',
        });
        await Engine.addThinking(thread, 700);
        await Engine.addAssistantMsg(thread, ['Yleinen periaate: kun lähteet ovat eri mieltä, oikea vastaus ei ole arvata kumpi pitää paikkansa vaan kertoa ristiriita näkyvästi ja jättää päätös sinulle — sama logiikka kuin Live Artifacts -pilarin datalähdeharjoituksessa.']);
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Tietoturva ja yhteydet',
      run: async (container) => {
        const { thread } = Engine.renderChatShell(container, {
          sidebarHighlight: 'connectors',
          topbarTitle: 'Connectors — mitä yhdistän',
          composerHint: 'Available: Calendar, Email, Accounting, HR system',
        });
        Engine.addTaskBrief(thread, {
          goal: 'Neljä mahdollista yhteyttä: kalenteri, sähköposti, kirjanpitojärjestelmä, henkilöstöhallinnon järjestelmä. Päätä mitkä yhdistäisit työ-Claudeen ja missä järjestyksessä — jos ollenkaan kaikkia.',
          hint: 'Ei yhtä oikeaa vastausta. Perustelu ratkaisee, ei lopputulos.',
        });
        await Engine.addReflection(thread, {
          prompt: 'Kirjoita valintasi ja järjestyksesi perusteluineen.',
          placeholder: 'Yhdistäisin ensin…, koska…',
        });
        Engine.addComplete(thread, 'Harjoitus 4 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 5 · Valitse oikeat yhteydet',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'connectors',
          topbarTitle: 'Connectors — maanantaikatsaus',
          composerHint: 'Choose connectors for this task',
        });
        Engine.renderScenarioPanel(panel, `<h4>9 saatavilla olevaa yhteyttä</h4><p>Valinta näkyy alla chatissa. Lue tehtävä huolella ennen kuin valitset.</p>`);

        Engine.addTaskBrief(thread, {
          goal: 'Kokoat maanantaiaamun tiimikatsauksen. Sen pitää kertoa (1) mitä kokouksia pidit viime viikolla, (2) mitä oleellista asiakkailta tuli sähköpostilla, ja (3) tallentaa yhteenveto tiimin yhteiseen muistiinpanotyökaluun, josta koko tiimi näkee sen.',
          hint: 'Yhdeksästä yhteydestä tarvitset täsmälleen kolme — ei enempää, ei vähemmän. Valitse ennen kuin jatkat.',
        });

        const items = [
          {id:'calendar', label:'Google Calendar', sublabel:'kokoukset, aikataulu', icon: Engine.ICONS.calendar},
          {id:'gmail', label:'Gmail', sublabel:'sähköposti', icon: Engine.ICONS.mail},
          {id:'notion', label:'Notion', sublabel:'tiimin muistiinpanot', icon: Engine.ICONS.page},
          {id:'slack', label:'Slack', sublabel:'tiimiviestintä', icon: Engine.ICONS.chat},
          {id:'salesforce', label:'Salesforce', sublabel:'asiakasrekisteri', icon: Engine.ICONS.cloud},
          {id:'github', label:'GitHub', sublabel:'koodivarasto', icon: Engine.ICONS.code},
          {id:'dropbox', label:'Dropbox', sublabel:'tiedostojen jako', icon: Engine.ICONS.folder},
          {id:'zapier', label:'Zapier', sublabel:'automaatioketjut', icon: Engine.ICONS.bolt},
          {id:'asana', label:'Asana', sublabel:'projektinhallinta', icon: Engine.ICONS.list},
        ];
        const selected = await Engine.addPickerTask(thread, { items, correctIds: ['calendar','gmail','notion'] });

        await Engine.wait(300);
        Engine.addNarrator(thread, 'Kirjoita nyt pyyntösi — se joka todella kokoaa katsauksen näiden kolmen yhteyden avulla.');
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['kokoa','tee','kirjoita','yhteenve','katsau','viikko'],
          clarifyText: 'Mitä konkreettisesti haluat koottavan näiden kolmen yhteyden pohjalta?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }

        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, ['Käyn läpi kaikki kolme lähdettä järjestyksessä — katso oikealta.']);

        const { grid } = Engine.renderCalendarPanel(panel);
        await Engine.wait(400);
        [...grid.querySelectorAll('.cal-slot.busy')].slice(0,4).forEach(s => s.classList.add('picked'));
        await Engine.addAssistantMsg(thread, ['Kalenterista: neljä kokousta viime viikolta.']);
        await Engine.wait(700);

        Engine.renderInboxPanel(panel, [
          {from:'Merja Salo — Kaiku Audio', subject:'Toimitusaika venymässä viikolla', relevant:true},
          {from:'Uutiskirje', subject:'Kevään webinaarit', relevant:false},
          {from:'Tomi Lahtinen', subject:'Kysymys sopimuksen ehdoista', relevant:true},
          {from:'LinkedIn', subject:'Sinulla on 3 uutta yhteydenottoa', relevant:false},
        ]);
        await Engine.addAssistantMsg(thread, ['Sähköpostista: kaksi asiaa nousi esiin, kaksi muuta viestiä ei liittynyt asiaan ja jätin ne pois.']);
        await Engine.wait(700);

        const { list } = Engine.renderNotionPanel(panel);
        const rows = ['Viikon kokoukset (4)', 'Asiakasasiat: toimitusaika, sopimusehdot', 'Seuraavat askeleet'];
        for(const r of rows){
          const item = Engine.el(`<div class="notion-item">${Engine.ICONS.page}<span>${r}</span></div>`);
          list.appendChild(item);
          await Engine.wait(150);
          item.classList.add('show');
        }
        await Engine.addAssistantMsg(thread, ['Notion-sivu koottu ja tallennettu tiimin työtilaan. Kaikki kolme yhteyttä toimivat yhden pyynnön takana — et kopioinut mitään käsin niiden välillä.']);
        Engine.addComplete(thread, 'Harjoitus 5 suoritettu. Valitsit oikeat työkalut yhdeksästä ja näit koko ketjun toiminnassa.');
      },
    },
  ],
});
