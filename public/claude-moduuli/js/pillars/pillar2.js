window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p2',
  num: 2,
  name: 'Dispatch',
  subtitle: 'Mobile → Desktop',

  theory: {
    tagline: 'Lähetät tehtävän puhelimesta, pöytäkoneesi tekee työn taustalla.',
    whatItDoes: 'Dispatch antaa lähettää tehtävän Claude-mobiilisovelluksesta; pöytäkoneesi suorittaa sen ja tulos odottaa kun palaat sen ääreen.',
    howItWorks: 'Puhelin ja pöytäkone yhdistetään kerran QR-koodilla Coworkin sivupalkista. Sen jälkeen sama keskustelu jatkuu molemmissa laitteissa — puhelin vain lähettää viestin, pöytäkone tekee varsinaisen työn (lukee tiedostot, käyttää liitäntöjä ja sovelluksia). Pöytäkoneen pitää olla auki ja hereillä.',
    benefits: 'Et ole sidottu näytön ääreen. Tehtävä etenee, vaikka olisit kokouksessa, kahvilassa tai matkalla — tulos on valmiina kun avaat koneen.',
    whereToUse: 'Kun huomaat kesken päivän jotain, mitä pitäisi tehdä tietokoneella, mutta olet muualla: tarkista tarjous, kokoa tiedosto, aja pieni koodikorjaus.',
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'dispatch',
      topbarTitle: 'Dispatch — jatkuva keskustelu',
      composerHint: 'Dispatch · paired with your desktop',
    });
    const { checklist } = Engine.renderPhoneDesktopPanel(panel);
    Engine.addNarrator(thread, 'Katso miten tämä etenee kokonaan.');
    await Engine.wait(500);
    await Engine.simulateUserType(thread, userInput, 'Tarkista tarjousdokumentista, onko hintoja korotettu edelliseen versioon verrattuna');
    await Engine.addThinking(thread, 900);
    await Engine.addAssistantMsg(thread, ['Vastaanotettu. Aloitan pöytäkoneella — voit sulkea puhelimen, kerron kun on valmista.']);
    await Engine.runChecklist(checklist, [
      'Avataan tarjousdokumentti pöytäkoneella',
      'Verrataan edelliseen versioon',
      'Kootaan yhteenveto muutoksista',
    ]);
    await Engine.addAssistantMsg(thread, ['Valmis. Kolme riviä nousi: kuljetus +180 €, asennus +90 €, muut pysyivät ennallaan.']);
    Engine.addComplete(thread, 'Esimerkki päättyi. Kokeile nyt itse harjoituksissa.');
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Kahvilasta toimistoon',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch — jatkuva keskustelu',
          composerHint: 'Dispatch · paired with your desktop',
        });
        const { checklist } = Engine.renderPhoneDesktopPanel(panel);
        Engine.addNarrator(thread, 'Olet kahvilassa. Pöytäkoneesi on kotona, auki ja hereillä. Kirjoita, mitä haluat sen tekevän puolestasi.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['tarkista','etsi','kokoa','tee','avaa','vertaa','lähetä'],
          clarifyText: 'Mitä konkreettista tehtävää haluat pöytäkoneen tekevän — mitä tiedostoa se koskee?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }

        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, ['Vastaanotettu pöytäkoneelle. Voit sulkea puhelimen — jatkan taustalla ja ilmoitan kun on valmista.']);
        await Engine.runChecklist(checklist, ['Avataan tarvittavat tiedostot', 'Käydään sisältö läpi', 'Kootaan tulos']);
        await Engine.addAssistantMsg(thread, ['Valmis pöytäkoneella. Tulos odottaa sinua molemmissa laitteissa, samassa keskustelussa.']);

        await Engine.addQuiz(thread, {
          question: 'Missä varsinainen työ tapahtui — tiedostojen lukeminen, koodin ajaminen?',
          options: [
            {text:'Pöytäkoneella, ei puhelimessa eikä pilvessä', correct:true,
             feedback:'Oikein. Puhelin on ohjain, joka lähettää ja vastaanottaa viestejä — itse työ tehdään aina pöytäkoneella, paikallisesti.'},
            {text:'Puhelimessa, koska sieltä tehtävä lähetettiin', correct:false,
             feedback:'Ei — puhelin ei tee laskentaa tai lue tiedostoja. Se on vain ohjain, joka lähettää viestin.'},
            {text:'Anthropicin pilvipalvelimella', correct:false,
             feedback:'Ei tässä tapauksessa — Dispatch vaatii nimenomaan, että oma pöytäkone on auki ja tekee työn paikallisesti.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 1 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 2 · Kun kone ei ole hereillä',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch — ei yhteyttä',
          composerHint: 'Dispatch · desktop offline',
        });
        const { desktopFrame, desktopStatus, checklist } = Engine.renderPhoneDesktopPanel(panel);
        desktopFrame.classList.add('offline');
        desktopStatus.textContent = 'ei yhteyttä';
        desktopStatus.classList.add('off');

        Engine.renderScenarioPanel(panel, `
          <h4>Tilanne</h4>
          <p>Yrität lähettää tehtävän puhelimesta. Pöytäkone-kuvake oikealla näkyy harmaana: <b>ei yhteyttä</b>.</p>
          <p>Kirjoita silti pyyntösi — katsotaan mitä tapahtuu.</p>`);

        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: [''],  // hyväksy mikä tahansa teksti — pointti on itse vastauksessa
          clarifyText: '',
        });

        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, ['En saa yhteyttä pöytäkoneeseesi juuri nyt. Dispatch tarvitsee, että Claude Desktop on auki ja kone hereillä — tarkista molemmat ja yritä uudelleen.']);

        const correct = await Engine.addQuiz(thread, {
          question: 'Mitkä kaksi asiaa täytyy olla kunnossa, jotta Dispatch toimii?',
          options: [
            {text:'Pöytäkone on hereillä JA Claude Desktop -sovellus on auki siinä', correct:true,
             feedback:'Juuri näin. Molemmat ehdot koskevat pöytäkonetta — puhelimen ei tarvitse tehdä mitään erityistä, se vain odottaa yhteyttä.'},
            {text:'Puhelimessa on internetyhteys JA sovellus on auki', correct:false,
             feedback:'Puhelimen yhteys on tarpeen, mutta se ei riitä — myös pöytäkoneen pitää olla hereillä ja Claude Desktopin auki siellä.'},
            {text:'Molemmat laitteet ovat samassa wifi-verkossa', correct:false,
             feedback:'Ei tarvita samaa verkkoa — yhteys kulkee internetin kautta. Vaatimus koskee sitä, että pöytäkone ja sovellus ovat auki.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Kesken jäänyt tehtävä',
      run: async (container) => {
        const { thread, panel } = Engine.renderChatShell(container, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch — osittainen tulos',
          composerHint: 'Dispatch · paired with your desktop',
        });
        Engine.renderScenarioPanel(panel, `<h4>Tilanne</h4><p>Lähetit aiemmin pyynnön koota yhteenveto viidestä sopimuksesta. Puhelimeesi tulee ilmoitus.</p>`);
        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, [
          'Löysin ja käsittelin neljä sopimusta viidestä. Viides tiedosto — toimitussopimus_2026.pdf — on suojattu salasanalla, jota minulla ei ole. Voin joko jatkaa yhteenvetoa neljän sopimuksen pohjalta nyt, tai odottaa kunnes olet koneella ja voit avata viidennen itse.',
        ]);
        await Engine.addReflection(thread, {
          prompt: 'Olet edelleen matkalla, tulos tarvitaan tunnin sisällä kokoukseen. Kumman valitsisit, ja miksi juuri tässä tilanteessa?',
          placeholder: 'Valitsisin…',
        });
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Etävahvistuksen raja',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch — vahvistus tarvitaan',
          composerHint: 'Dispatch · paired with your desktop',
        });
        Engine.renderScenarioPanel(panel, `<h4>Tilanne</h4><p>Pyysit Dispatchia siivoamaan vanhoja tiedostoja Downloads-kansiosta. Olet junassa, ilman kunnollista yhteyttä, puoli matkaa perillä.</p>`);
        Engine.addNarrator(thread, 'Kirjoita alkuperäinen pyyntösi.');
        await Engine.wait(300);
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, { accept: [''], clarifyText: '' });

        await Engine.addThinking(thread, 900);
        const action = await Engine.addCard(thread, {
          title: 'Vahvistus tarvitaan',
          body: 'Löysin 34 tiedostoa jotka voisi poistaa vapauttaakseen tilaa. Tämä on pysyvä toimenpide. Vahvistatko poiston täältä junasta, vai odotatko kunnes olet koneella?',
          actions: [{id:'here', label:'Vahvista nyt'}, {id:'wait', label:'Odotan koneelle'}],
        });

        await Engine.addReflection(thread, {
          prompt: action === 'here'
            ? 'Vahvistit poiston heikolla yhteydellä liikkuvasta junasta. Mikä voisi mennä pieleen juuri tässä tilanteessa, verrattuna siihen että olisit vahvistanut kotoa?'
            : 'Päätit odottaa. Mitä menetit odottamalla, ja oliko se tässä tilanteessa oikea valinta?',
          placeholder: 'Mielestäni…',
        });
        Engine.addComplete(thread, 'Harjoitus 4 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 5 · Suunnittele oma Dispatch-rutiini',
      run: async (container) => {
        const { thread, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch — oma käyttötapaus',
          composerHint: 'Dispatch · paired with your desktop',
        });
        Engine.addNarrator(thread, 'Mieti oikea tilanne omasta työstäsi, jossa olet poissa koneen äärestä mutta jokin pitäisi hoitua. Kirjoita: (1) missä tilanteessa olet, (2) tarkka pyyntö jonka lähettäisit, (3) mitä odotat löytäväsi kun palaat koneelle.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        const attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, { accept: [''], clarifyText: '' });
        const wordCount = attempt.text.split(/\s+/).filter(Boolean).length;

        await Engine.addThinking(thread, 900);
        if(wordCount < 12){
          await Engine.addAssistantMsg(thread, ['Tämä on aika lyhyt kuvaus vielä. Todellisessa Dispatch-pyynnössä pöytäkoneesi tekee juuri sen minkä kirjoitit — ei enempää. Täydennä: mitä tarkalleen pitäisi tapahtua?']);
          Engine.armInput(userInput, sendBtn);
          await Engine.waitForFreeText(thread, userInput, sendBtn, { accept: [''], clarifyText: '' });
        }
        await Engine.addAssistantMsg(thread, ['Kirjasin rutiinisi. Tällainen konkreettinen, tarkkaan rajattu pyyntö on juuri se, mikä tekee Dispatchista luotettavan — ei yleisluontoinen toive vaan tarkka tehtävä ja tarkka lopputulos.']);
        Engine.addComplete(thread, 'Harjoitus 5 suoritettu.');
      },
    },
  ],
});
