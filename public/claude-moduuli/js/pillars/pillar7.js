window.PILLARS = window.PILLARS || [];

function waitForTerminalInput(body, userInput, sendBtn){
  return new Promise(resolve => {
    function handler(){
      const text = userInput.value.trim();
      if(!text) return;
      Engine.termLine(body, text, 'user');
      userInput.value = '';
      userInput.disabled = true;
      sendBtn.disabled = true;
      sendBtn.removeEventListener('click', handler);
      userInput.removeEventListener('keydown', keyHandler);
      resolve(text);
    }
    function keyHandler(e){ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handler(); } }
    sendBtn.addEventListener('click', handler);
    userInput.addEventListener('keydown', keyHandler);
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  });
}

window.PILLARS.push({
  id: 'p7',
  num: 7,
  name: 'Claude Code',
  subtitle: 'Terminaali',

  theory: {
    tagline: 'Suunnitelma ennen koodia — ja koodi joka oikeasti toimii.',
    whatItDoes: 'Claude Code kirjoittaa ja ajaa oikeaa koodia terminaalissa. Lopputulos on toimiva sovellus tai skripti, ei vain kuvaus tai näytön näköinen luonnos.',
    howItWorks: 'Kuvailet mitä tarvitset. Claude esittää ensin suunnitelman vaihe vaiheelta ennen kuin kirjoittaa yhtään riviä koodia — voit hyväksyä sen tai muokata suuntaa ajoissa. Sen jälkeen koodi kirjoitetaan ja ajetaan, ja voit antaa jatko-ohjeita luonnollisella kielellä.',
    benefits: 'Näet ja hyväksyt suunnan ennen kuin työ tehdään, et vasta valmiista lopputuloksesta — väärä suunta huomataan sekunneissa, ei tuntien työn jälkeen.',
    whereToUse: 'Kun tarvitset oikeasti toimivan ohjelman, skriptin tai automaation — et pelkkää kuvausta siitä miltä se voisi näyttää.',
  },

  example: async (container) => {
    const { body, userInput, sendBtn } = Engine.renderTerminalShell(container, { title: 'claude code — habit-tracker' });
    await Engine.termLine(body, 'Katso miten tämä etenee kokonaan.', 'muted');
    await Engine.wait(500);
    userInput.disabled = false;
    userInput.value = 'Tee yksinkertainen tapaseurantasovellus';
    await Engine.wait(600);
    await Engine.termLine(body, 'Tee yksinkertainen tapaseurantasovellus', 'user');
    userInput.disabled = true;
    await Engine.wait(500);
    await Engine.termLine(body, 'Suunnitelma:', 'plan');
    await Engine.termLine(body, '1. Luo tietorakenne tavoille ja päivittäisille merkinnöille', 'plan');
    await Engine.termLine(body, '2. Rakenna näkymä jossa tavan voi merkitä tehdyksi', 'plan');
    await Engine.termLine(body, '3. Laske ja näytä putki (streak) per tapa', 'plan');
    await Engine.wait(700);
    await Engine.termLine(body, 'Suunnitelma hyväksytty. Kirjoitetaan koodi.', 'muted');
    await Engine.wait(400);
    await Engine.termLine(body, 'function toggleHabit(id, date) { ... }', 'code');
    await Engine.termLine(body, 'function calculateStreak(habit) { ... }', 'code');
    await Engine.wait(300);
    await Engine.termLine(body, 'Valmis. Sovellus käynnissä osoitteessa localhost:3000', 'muted');
  },

  exercises: [
    {
      label: 'Harjoitus 1 · Lue suunnitelma ensin',
      run: async (container) => {
        const { body, userInput, sendBtn } = Engine.renderTerminalShell(container, { title: 'claude code — uusi sovellus' });
        await Engine.termLine(body, 'Kuvaile lyhyesti minkälaisen sovelluksen tarvitset.', 'muted');
        const request = await waitForTerminalInput(body, userInput, sendBtn);

        await Engine.wait(500);
        await Engine.termLine(body, 'Suunnitelma:', 'plan');
        await Engine.termLine(body, '1. Määritellään mitä tietoa sovellus tallentaa', 'plan');
        await Engine.termLine(body, '2. Rakennetaan näkymä, jossa tietoa lisätään ja muokataan', 'plan');
        await Engine.termLine(body, '3. Lisätään yhteenveto tai laskenta näkyville', 'plan');
        await Engine.wait(500);

        const approveRow = Engine.el(`
          <div style="margin-top:10px;display:flex;gap:8px;">
            <button class="btn primary" data-v="approve">Hyväksy suunnitelma</button>
            <button class="btn" data-v="edit">Pyydä muutos ensin</button>
          </div>`);
        body.appendChild(approveRow);
        body.parentElement.scrollTop = body.parentElement.scrollHeight + 400;

        const choice = await new Promise(resolve => {
          approveRow.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
            approveRow.querySelectorAll('button').forEach(x => x.disabled = true);
            resolve(b.dataset.v);
          }));
        });

        if(choice === 'edit'){
          await Engine.termLine(body, 'Selvä — mitä muuttaisit suunnitelmassa ennen kuin jatkan?', 'muted');
          userInput.disabled = false; sendBtn.disabled = false; userInput.focus();
          await waitForTerminalInput(body, userInput, sendBtn);
          await Engine.termLine(body, 'Päivitin suunnitelman ehdotuksesi mukaan.', 'muted');
        }

        await Engine.wait(400);
        await Engine.termLine(body, 'Kirjoitetaan koodi suunnitelman mukaan.', 'muted');
        await Engine.termLine(body, 'function saveEntry(data) { ... }', 'code');
        await Engine.termLine(body, 'function renderList() { ... }', 'code');
        await Engine.wait(300);
        await Engine.termLine(body, 'Valmis ja käynnissä.', 'muted');

        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.appendChild(thread);
        await Engine.addQuiz(thread, {
          question: 'Miksi kannattaa lukea suunnitelma ennen kuin koodi kirjoitetaan, eikä vasta valmiin sovelluksen jälkeen?',
          options: [
            {text:'Väärä suunta huomataan heti, ennen kuin sitä on rakennettu mitään päälle', correct:true,
             feedback:'Juuri näin — yhden suunnitelman lukeminen vie sekunteja, väärään suuntaan rakennetun sovelluksen purkaminen vie paljon enemmän.'},
            {text:'Suunnitelma ei oikeasti vaikuta lopputulokseen mitenkään', correct:false,
             feedback:'Vaikuttaa suoraan — jos hyväksyt suunnitelman, koodi seuraa sitä. Siksi kannattaa lukea se huolella.'},
          ],
        });
        Engine.addComplete(thread, 'Harjoitus 1 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 2 · Puhuttu korjaus',
      run: async (container) => {
        const { body, userInput, sendBtn } = Engine.renderTerminalShell(container, { title: 'claude code — habit-tracker' });
        await Engine.termLine(body, 'Tee yksinkertainen tapaseurantasovellus', 'user');
        await Engine.wait(300);
        await Engine.termLine(body, 'function toggleHabit(id, date) { entries[id].push(date); }', 'code');
        await Engine.termLine(body, 'Valmis ja käynnissä osoitteessa localhost:3000.', 'muted');
        await Engine.wait(500);

        const micRow = Engine.el(`
          <div style="margin-top:10px;">
            <button class="btn primary" data-v="mic">🎙 Sano korjaus ääneen</button>
          </div>`);
        body.appendChild(micRow);
        body.parentElement.scrollTop = body.parentElement.scrollHeight + 400;
        await new Promise(resolve => micRow.querySelector('button').addEventListener('click', resolve));
        micRow.remove();

        await Engine.termLine(body, '(mikrofoni kuuntelee — kirjoita mitä "sanoisit")', 'muted');
        const correction = await waitForTerminalInput(body, userInput, sendBtn);

        await Engine.wait(500);
        await Engine.termLine(body, 'Tulkittu pyyntönä: rajoita merkinnät kerran päivässä per tapa.', 'muted');
        await Engine.termLine(body, '- entries[id].push(date);', 'code');
        await Engine.termLine(body, '+ if (!entries[id].includes(date)) entries[id].push(date);', 'code');
        await Engine.wait(400);
        await Engine.termLine(body, 'Muutos tehty puhutun korjauksen perusteella.', 'muted');

        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.appendChild(thread);
        await Engine.addReflection(thread, {
          prompt: 'Kirjoitit korjauksen luonnollisella kielellä, et koodina. Miksi tämä on hyödyllistä nimenomaan silloin kun testaat sovellusta ja huomaat virheen kesken kaiken?',
          placeholder: 'Koska…',
        });
        Engine.addComplete(thread, 'Harjoitus 2 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 3 · Löydä puute suunnitelmasta',
      run: async (container) => {
        const { body } = Engine.renderTerminalShell(container, { title: 'claude code — asiakasrekisteri' });
        await Engine.termLine(body, 'Tee sovellus joka tallentaa asiakkaiden yhteystiedot ja hakuhistorian', 'user');
        await Engine.wait(500);
        await Engine.termLine(body, 'Suunnitelma:', 'plan');
        await Engine.termLine(body, '1. Luodaan tietorakenne asiakkaille ja hakuhistorialle', 'plan');
        await Engine.termLine(body, '2. Rakennetaan lomake uuden asiakkaan lisäämiseen', 'plan');
        await Engine.termLine(body, '3. Rakennetaan näkymä asiakaslistalle', 'plan');
        await Engine.wait(600);

        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.appendChild(thread);
        Engine.addNarrator(thread, 'Sovellus tallentaa henkilötietoja. Suunnitelmasta puuttuu jotain oleellista tähän liittyen. Kirjoita mitä lisäisit ennen kuin hyväksyt suunnitelman.');
        await Engine.addReflection(thread, {
          prompt: 'Mitä suunnitelmasta puuttuu?',
          placeholder: 'Suunnitelmaan pitäisi lisätä…',
        });
        await Engine.wait(400);
        await Engine.termLine(body, 'Päivitetty suunnitelma:', 'plan');
        await Engine.termLine(body, '4. Rajataan pääsy tietoihin ja lisätään poisto-oikeus asiakkaan pyynnöstä', 'plan');
        await Engine.termLine(body, 'Kirjoitetaan koodi päivitetyn suunnitelman mukaan.', 'muted');
        Engine.addComplete(thread, 'Harjoitus 3 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 4 · Priorisoi korjaukset',
      run: async (container) => {
        const { body } = Engine.renderTerminalShell(container, { title: 'claude code — testitulokset' });
        await Engine.termLine(body, 'Testataan sovellusta ennen julkaisua.', 'muted');
        await Engine.wait(500);
        await Engine.termLine(body, 'BUG 1: Hintakenttä hyväksyy negatiivisia lukuja', 'code');
        await Engine.termLine(body, 'BUG 2: Painikkeen väri ei vastaa brändin sävyä', 'code');
        await Engine.termLine(body, 'BUG 3: Sovellus kaatuu jos asiakasnimi on tyhjä', 'code');
        await Engine.wait(500);

        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.appendChild(thread);
        await Engine.addReflection(thread, {
          prompt: 'Julkaisuun on aikaa yksi tunti, ja korjaat vain yhden näistä ennen sitä. Minkä valitset, ja minkä jätät myöhempään? Perustele.',
          placeholder: 'Korjaisin ensin…, koska…',
        });
        await Engine.addThinking(thread, 800);
        await Engine.addAssistantMsg(thread, ['Yksi näkökulma tähän: kaatuminen keskeyttää koko sovelluksen käytön kaikilta, väärä väri ei estä kenenkään työtä, ja negatiivinen hinta on datavirhe joka voi jäädä huomaamatta pitkäksi aikaa. Vakavuus ja huomaamattomuus ovat usein eri asioita.']);
        Engine.addComplete(thread, 'Harjoitus 4 suoritettu.');
      },
    },
    {
      label: 'Harjoitus 5 · Määrittele oma projekti',
      run: async (container) => {
        const { body, userInput, sendBtn } = Engine.renderTerminalShell(container, { title: 'claude code — oma projekti' });
        await Engine.termLine(body, 'Kuvaile pieni työkalu, jonka oikeasti tarvitsisit omassa työssäsi. Ennen kuin lähetät: mieti myös mitä suunnitelman pitäisi mielestäsi sisältää.', 'muted');
        const request = await waitForTerminalInput(body, userInput, sendBtn);

        const thread = Engine.el('<div class="thread" style="padding:16px 20px 0;"></div>');
        container.appendChild(thread);
        await Engine.addReflection(thread, {
          prompt: 'Ennen kuin näytän Clauden suunnitelman: mitä odotat sen sisältävän? Mitä vaiheita, ja mitä varotoimia?',
          placeholder: 'Odotan että suunnitelma sisältää…',
        });

        await Engine.wait(500);
        await Engine.termLine(body, 'Suunnitelma:', 'plan');
        await Engine.termLine(body, '1. Määritellään tallennettava tieto ja sen rakenne', 'plan');
        await Engine.termLine(body, '2. Rakennetaan näkymä tiedon syöttämiseen ja tarkasteluun', 'plan');
        await Engine.termLine(body, '3. Lisätään yksinkertainen haku tai suodatus', 'plan');
        await Engine.termLine(body, '4. Varmistetaan virheellisen syötteen käsittely', 'plan');
        await Engine.wait(500);

        await Engine.addReflection(thread, {
          prompt: 'Vastasiko suunnitelma odotuksiasi? Mikä siinä yllätti, puuttui, tai osui juuri oikeaan?',
          placeholder: 'Suunnitelma…',
        });
        Engine.addComplete(thread, 'Harjoitus 5 suoritettu. Koko moduulin viimeinen harjoitus — sovelsit teoriaa alusta loppuun omaan työhösi.');
      },
    },
  ],
});
