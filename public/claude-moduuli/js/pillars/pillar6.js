window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p6',
  num: 6,
  name: 'Skills & Scheduled Tasks',
  subtitle: 'Toistuva työ paketoituna',

  theory: {
    tagline: 'Ohje, jonka kirjoitat kerran, ja joka joko tallentuu uudelleenkäyttöön tai ajastuu itsestään toistumaan.',
    whatItDoes: 'Taito (Skill) pakkaa toistuvan ohjeen — esimerkiksi tarkistuslistan — uudelleenkäytettäväksi paketiksi. Ajastettu tehtävä (Scheduled Task) ajaa saman ohjeen automaattisesti valitsemallasi kellon mukaan, ilman että pyydät sitä uudelleen.',
    howItWorks: 'Kirjoitat ohjeen kerran ja tallennat sen taidoksi — se ilmestyy sivupalkkiin ja on käytettävissä missä tahansa uudessa keskustelussa. Komento <code>/schedule</code> puolestaan muuttaa minkä tahansa tehtävän toistuvaksi: valitset tiheyden (päivittäin, viikoittain) ja ajan, ja Claude ajaa sen pilvessä ilman että koneesi tarvitsee olla auki.',
    benefits: 'Toistuva mekaaninen työ — tarkistuslistat, viikkoraportit, kansion siivous — hoituu ilman että muistat pyytää sitä joka kerta erikseen.',
    whereToUse: 'Kun huomaat tekeväsi saman pyynnön Claudelle useammin kuin kerran: sama tarkistus eri dokumenteille, sama raportti joka viikko.',
  },

  example: async (container) => {
    const { thread, panel, userInput } = Engine.renderChatShell(container, {
      sidebarHighlight: 'scheduled',
      topbarTitle: 'Skills — Sopimustarkistus',
      composerHint: 'Cowork · saving as Skill',
    });
    const { list } = Engine.renderSkillPanel(panel);
    Engine.addNarrator(thread, 'Katso miten tämä etenee kokonaan.');
    await Engine.wait(500);
    await Engine.simulateUserType(thread, userInput, 'Tarkista sopimuksesta irtisanomisaika, hinta ja piilokulut — tee tästä taito jota voin käyttää uudelleen');
    await Engine.addThinking(thread, 1200);
    await Engine.addAssistantMsg(thread, ['Tallensin tämän taidoksi: "Sopimustarkistus". Voit ajaa sen millä tahansa dokumentilla ilman että kirjoitat ohjeen uudelleen.']);
    const item = Engine.el(`<div class="skill-item">${Engine.ICONS.skill}<span>Sopimustarkistus</span></div>`);
    list.appendChild(item);
    await Engine.wait(150);
    item.classList.add('show');
    await Engine.wait(600);
    await Engine.addAssistantMsg(thread, ['Ensi kerralla riittää: "aja Sopimustarkistus tälle."']);
    Engine.addComplete(thread, 'Esimerkki päättyi. Kokeile nyt itse harjoituksissa.');
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Paketoi ohje taidoksi',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'scheduled',
          topbarTitle: 'Skills — uusi taito',
          composerHint: 'Cowork · saving as Skill',
        });
        const { list } = Engine.renderSkillPanel(panel);
        Engine.addNarrator(thread, 'Kirjoita tarkistuslista, jota haluaisit käyttää uudelleen useammalle sopimukselle — esimerkiksi mitä kohtia aina tarkistat.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['tarkist','taito','sopimus','irtisano','hinta','ehdo'],
          clarifyText: 'Mitä kohtia haluaisit aina tarkistettavan? Kirjoita ne listana.',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }

        await Engine.addThinking(thread, 1200);
        await Engine.addAssistantMsg(thread, ['Tallensin tämän taidoksi. Se ilmestyi sivupalkkiin oikealla — löydät sen jatkossa mistä tahansa keskustelusta.']);
        const item = Engine.el(`<div class="skill-item">${Engine.ICONS.skill}<span>Oma tarkistuslista</span><button class="btn run-again">Aja uudelleen</button></div>`);
        list.appendChild(item);
        // Listener kiinnitetään heti liittämisen jälkeen, ennen mitään odotusta,
        // jotta nappi on aidosti toimiva sinä hetkenä kun se ilmestyy näkyviin.
        const runAgainPromise = new Promise(resolve => {
          item.querySelector('.run-again').addEventListener('click', async function once(){
            item.querySelector('.run-again').removeEventListener('click', once);
            await Engine.addThinking(thread, 900);
            await Engine.addAssistantMsg(thread, ['Ajoin saman tarkistuslistan toiselle dokumentille. Kolme kohtaa löytyi tällä kertaa poikkeavana — käyn ne läpi kanssasi.']);
            resolve();
          });
        });
        await Engine.wait(150);
        item.classList.add('show');
        Engine.addNarrator(thread, 'Kuvittele, että sinulla on toinen sopimus. Klikkaa "Aja uudelleen" — huomaa, ettet kirjoita ohjetta enää kertaakaan.');
        await runAgainPromise;

        await Engine.addQuiz(thread, {
          question: 'Mitä jouduit kirjoittamaan toisella kerralla, kun ajoit taidon uudelleen?',
          options: [
            {text:'Et mitään — klikkasit vain "Aja uudelleen"', correct:true,
             feedback:'Juuri tässä on taidon pointti: ohje kirjoitetaan kerran huolella, sen jälkeen se on yhden klikkauksen päässä.'},
            {text:'Sama tarkistuslista piti kirjoittaa vielä kerran', correct:false,
             feedback:'Ei — taito juuri poistaa tarpeen kirjoittaa sama ohje uudelleen joka kerta.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 1 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 2 · Aseta ajastus',
      run: async (container) => {
        const { thread, panel } = Engine.renderChatShell(container, {
          sidebarHighlight: 'scheduled',
          topbarTitle: 'Scheduled — /schedule',
          composerHint: 'Cowork · /schedule',
        });
        const { list } = Engine.renderSchedulePanel(panel);
        Engine.addNarrator(thread, 'Haluat, että viikkoraportti kootaan automaattisesti joka perjantai. Valitse alta toistuvuus ja kellonaika, sitten vahvista.');

        const formCard = Engine.el(`
          <div class="card">
            <div class="card-title">${Engine.ICONS.clock}/schedule — Viikkoraportti</div>
            <p>Kuinka usein tehtävä ajetaan?</p>
            <div class="card-actions" data-role="freq" style="flex-wrap:wrap;">
              <button class="btn" data-v="daily">Päivittäin</button>
              <button class="btn" data-v="weekly">Viikoittain</button>
              <button class="btn" data-v="weekdays">Arkisin</button>
            </div>
            <p style="margin-top:12px;">Mihin kellonaikaan?</p>
            <div class="card-actions" data-role="time" style="flex-wrap:wrap;">
              <button class="btn" data-v="07:00">07:00</button>
              <button class="btn" data-v="09:00">09:00</button>
              <button class="btn" data-v="16:00">16:00</button>
            </div>
            <div class="card-actions" style="margin-top:14px;">
              <button class="btn primary" data-role="confirm" disabled>Vahvista ajastus</button>
            </div>
          </div>`);
        thread.appendChild(formCard);
        Engine.scrollDown(thread);

        let chosenFreq = null, chosenTime = null;
        const confirmBtn = formCard.querySelector('[data-role="confirm"]');
        function checkReady(){ confirmBtn.disabled = !(chosenFreq && chosenTime); }
        formCard.querySelectorAll('[data-role="freq"] button').forEach(b => b.addEventListener('click', () => {
          formCard.querySelectorAll('[data-role="freq"] button').forEach(x => x.classList.remove('primary'));
          b.classList.add('primary');
          chosenFreq = b.dataset.v;
          checkReady();
        }));
        formCard.querySelectorAll('[data-role="time"] button').forEach(b => b.addEventListener('click', () => {
          formCard.querySelectorAll('[data-role="time"] button').forEach(x => x.classList.remove('primary'));
          b.classList.add('primary');
          chosenTime = b.dataset.v;
          checkReady();
        }));

        await new Promise(resolve => confirmBtn.addEventListener('click', resolve));
        formCard.querySelectorAll('button').forEach(b => b.disabled = true);

        const freqLabel = {daily:'Päivittäin', weekly:'Viikoittain', weekdays:'Arkisin'}[chosenFreq];
        await Engine.addThinking(thread, 900);
        await Engine.addAssistantMsg(thread, [`Ajastettu: "Viikkoraportti" — ${freqLabel.toLowerCase()}, klo ${chosenTime}. Näet sen Scheduled-listalla oikealla, ja voit muokata tai poistaa sen sieltä koska tahansa.`]);
        const item = Engine.el(`<div class="sched-item">${Engine.ICONS.clock}<span>Viikkoraportti — ${freqLabel}, ${chosenTime}</span></div>`);
        list.appendChild(item);
        await Engine.wait(150);
        item.classList.add('show');

        await Engine.addQuiz(thread, {
          question: 'Koneesi on sammuksissa perjantaina klo 16:00, kun ajastettu tehtävä pitäisi ajaa. Mitä tapahtuu?',
          options: [
            {text:'Tehtävä ajetaan silti — se pyörii pilvessä, ei omalla koneellasi', correct:true,
             feedback:'Oikein. Ajastetut tehtävät ajetaan pilvipalvelimella, joten koneesi ei tarvitse olla auki — toisin kuin Dispatch, joka vaatii sen.'},
            {text:'Tehtävä jää ajamatta ja käynnistyy vasta kun avaat koneen', correct:false,
             feedback:'Tämä koskee Dispatchia, ei ajastettuja tehtäviä — ajastetut tehtävät ajetaan pilvessä ajallaan.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Milloin ei kannata ajastaa',
      run: async (container) => {
        const { thread } = Engine.renderChatShell(container, {
          sidebarHighlight: 'scheduled',
          topbarTitle: 'Scheduled — neljä tehtävää',
          composerHint: 'Cowork · /schedule',
        });
        Engine.addNarrator(thread, 'Neljä toistuvaa tehtävää. Mieti kullekin: ajastaisitko sen kokonaan automaattiseksi, vai pitäisikö sen odottaa ihmisen käynnistystä joka kerta?');
        await Engine.addAssistantMsg(thread, [
          '1) Viikkoraportin kokoaminen valmiista lukuista. 2) Palautteiden lukeminen ja yhteenveto ennen kuin vastaat asiakkaalle. 3) Vanhojen lokitiedostojen siivous kansiosta. 4) Palkkalaskelmien tarkistus ennen maksatusta.',
        ]);
        await Engine.addReflection(thread, {
          prompt: 'Kirjoita ratkaisusi kaikkiin neljään ja lyhyt perustelu. Mikä yhdistää ne tehtävät, jotka et ajastaisi?',
          placeholder: '1) …  2) …  3) …  4) …',
        });
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Virheellinen ajastettu tehtävä',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'scheduled',
          topbarTitle: 'Scheduled — viikkoraportti epäonnistui hiljaisesti',
          composerHint: 'Cowork · /schedule',
        });
        Engine.renderScenarioPanel(panel, `<h4>Tilanne</h4><p>Ajastettu viikkoraportti on ajanut kolme viikkoa automaattisesti. Huomasit juuri, että lähdetiedosto ei ollut päivittynyt kahteen viikkoon — raportti näytti vanhaa dataa ilman että kukaan huomasi.</p>`);
        Engine.addNarrator(thread, 'Kirjoita uusi versio ajastetun tehtävän ohjeesta, joka estäisi tämän toistumisen.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);
        let attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, {
          accept: ['tarkist','päivit','varmista','vertaa','ilmoita','vanha','tuore'],
          clarifyText: 'Mitä pitäisi tarkistaa ennen kuin raportti kootaan, jotta vanha data ei mene läpi huomaamatta?',
        });
        while(!attempt.matched){ attempt = await attempt.retry(); }
        await Engine.addThinking(thread, 1000);
        await Engine.addAssistantMsg(thread, [
          'Päivitin ajastetun tehtävän ohjeen. Jatkossa se tarkistaa lähdetiedoston muokkauspäivän ennen raportin kokoamista, ja jos data on vanhempaa kuin odotettu, se ei koosta raporttia hiljaa — se ilmoittaa sinulle sen sijaan.',
        ]);
        Engine.addComplete(thread, 'Harjoitus 4 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 5 · Rakenna oma taito alusta loppuun',
      run: async (container) => {
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(container, {
          sidebarHighlight: 'scheduled',
          topbarTitle: 'Skills — oma taito',
          composerHint: 'Cowork · saving as Skill',
        });
        const { list } = Engine.renderSkillPanel(panel);
        Engine.addNarrator(thread, 'Kirjoita täydellinen, uudelleenkäytettävä taito omasta oikeasta työtehtävästäsi. Sisällytä: mitä taito tekee, milloin sitä EI pitäisi käyttää sellaisenaan, ja mitä poikkeuksia sen pitäisi tunnistaa.');
        await Engine.wait(400);
        Engine.armInput(userInput, sendBtn);

        const categories = {
          does: ['tarkist','tee','kokoa','lue','vertaa','järjest','kirjoita'],
          exception: ['paitsi','poikkeus','ellei','jos','ei koske'],
        };
        let missing = [];
        while(true){
          const attempt = await Engine.waitForFreeText(thread, userInput, sendBtn, { accept: [''], clarifyText: '' });
          const lower = attempt.text.toLowerCase();
          missing = Object.entries(categories).filter(([k, words]) => !words.some(w => lower.includes(w))).map(([k]) => k);
          if(missing.length === 0) break;
          const labels = {does:'mitä taito konkreettisesti tekee', exception:'milloin sitä ei pitäisi soveltaa suoraan'};
          await Engine.addThinking(thread, 800);
          await Engine.addAssistantMsg(thread, [`Taidosta puuttuu vielä: ${missing.map(m=>labels[m]).join(', ')}. Täydennä.`]);
          Engine.armInput(userInput, sendBtn);
        }

        await Engine.addThinking(thread, 1200);
        await Engine.addAssistantMsg(thread, ['Tallensin taidon kokonaisuutena — mukana on sekä perustoiminto että poikkeus, jonka määrittelit. Tämä on juuri se ero hätäisesti kirjoitetun ja oikeasti uudelleenkäytettävän taidon välillä.']);
        const item = Engine.el(`<div class="skill-item">${Engine.ICONS.skill}<span>Oma taito — valmis</span></div>`);
        list.appendChild(item);
        await Engine.wait(150);
        item.classList.add('show');
        Engine.addComplete(thread, 'Harjoitus 5 suoritettu.');
      },
    },
  ],
});
