window.PILLARS = window.PILLARS || [];

window.PILLARS.push({
  id: 'p2',
  num: 2,
  name: 'Dispatch',
  subtitle: 'Mobile → Desktop',
  briefingLabel: 'Malli',

  theory: {
    tagline: 'Lähetät tehtävän puhelimesta, pöytäkoneesi tekee työn taustalla.',
    whatItDoes: 'Dispatch antaa lähettää tehtävän Claude-mobiilisovelluksesta; pöytäkoneesi suorittaa sen ja tulos odottaa kun palaat sen ääreen.',
    howItWorks: 'Puhelin ja pöytäkone yhdistetään kerran QR-koodilla Coworkin sivupalkista. Sen jälkeen sama keskustelu jatkuu molemmissa laitteissa — puhelin vain lähettää viestin, pöytäkone tekee varsinaisen työn (lukee tiedostot, käyttää liitäntöjä ja sovelluksia). Pöytäkoneen pitää olla auki ja hereillä.',
    benefits: 'Et ole sidottu näytön ääreen. Tehtävä etenee, vaikka olisit kokouksessa, kahvilassa tai matkalla — tulos on valmiina kun avaat koneen.',
    whereToUse: 'Kun huomaat kesken päivän jotain, mitä pitäisi tehdä tietokoneella, mutta olet muualla: tarkista tarjous, kokoa tiedosto, aja pieni koodikorjaus.',
  },

  /* Teoria → Malli → Esimerkki: mental model + formula + Triage Desk */
  briefing: async (container, { goToExample }) => {
    container.innerHTML = `
      <div class="dispatch-briefing">
        <section class="db-hero">
          <div class="db-hero-copy">
            <p class="db-kicker">Ennen kuin kirjoitat yhtään promptia</p>
            <h2>Puhelin ei ole vain chat — se on walkie-talkie kotikoneellesi</h2>
            <p class="db-lead">Jos ajattelet Clauden mobiilia “tavallisena chatbotina”, pyydät vain sähköposteja. Dispatchissä puhelin on <b>ohjain</b>; raskas työ (PDF, Excel, kansiot) tapahtuu hereillä olevalla pöytäkoneella.</p>
          </div>
          <div class="db-phone" aria-hidden="true">
            <div class="db-phone-bezel">
              <div class="db-phone-notch"></div>
              <div class="db-phone-screen">
                <div class="db-phone-status">Claude · Dispatch</div>
                <div class="db-bubble out">Open the Q2 deck on my office PC — paste final sales numbers and ping me when done.</div>
                <div class="db-bubble in">On it — desktop is awake. Opening Excel…</div>
                <div class="db-phone-hint">← sinä lähetät · kone tekee →</div>
              </div>
            </div>
            <div class="db-phone-caption">Puhelin = kaukosäädin<br>Pöytäkone = aivot + tiedostot</div>
          </div>
        </section>

        <section class="db-compare">
          <h3>1 · Vanha tapa vs Dispatch</h3>
          <div class="db-compare-grid">
            <article class="db-card old">
              <header>Vanha tapa — kitkaa</header>
              <p>Olet taksissa. Tarvitset 50-sivuisen PDF:n toimistokoneelta, vertailun markkinadataan, yhden lausekkeen muokkauksen ja viestin asiakkaalle.</p>
              <ul>
                <li>Odotat kunnes pääset koneelle</li>
                <li>Avaat läppärin, lataat, tutkit, muokkaat</li>
                <li>Vasta sitten lähetät</li>
              </ul>
            </article>
            <article class="db-card new">
              <header>Dispatch — nolla kitkaa</header>
              <p>Käytät puhelinta ohjaimena. 10 sekunnin viesti taksissa.</p>
              <ul>
                <li>Kotikone on hereillä ja online</li>
                <li>Se avaa paikallisen kansion, tekee raskaan työn</li>
                <li>Yhteenveto palaa puhelimen näyttöön</li>
              </ul>
            </article>
          </div>
        </section>

        <section class="db-formula">
          <h3>2 · Dispatch-promptin kaava</h3>
          <p class="db-formula-intro">Hyvä Dispatch-viesti koostuu aina kolmesta osasta:</p>
          <div class="db-formula-box">
            <span class="db-f-part">Paikallinen lähde</span>
            <span class="db-f-plus">+</span>
            <span class="db-f-part">Raskas toimenpide</span>
            <span class="db-f-plus">+</span>
            <span class="db-f-part">Mobiilille tulos</span>
          </div>
          <div class="db-formula-example">
            <div><b>Lähde</b> “Open the contract in my work folder…”</div>
            <div><b>Toimenpide</b> “…check renewal date and hidden fees, add our new clauses…”</div>
            <div><b>Tulos</b> “…and text me back exactly what you find.”</div>
          </div>
        </section>

        <section class="db-triage">
          <h3>3 · Triage Desk — katso oikea komento (auto)</h3>
          <p class="db-scenario">Tilanne: olet kävelemässä palaveriin <b>5 minuutin päästä</b>. Toimistokoneen esityksestä puuttuvat lopulliset Q2-myyntiluvut. Kone on hereillä. Demo näyttää, mikä komento oikeasti hyödyntää Dispatchiä — sinun ei tarvitse klikata.</p>
          <div class="db-choices" id="triageChoices">
            <div class="db-choice" data-role="a">
              <span class="db-choice-tag">A</span>
              <span>“Kirjoita minulle myyntipuhe Q2-luvuista — olen matkalla palaveriin.”</span>
            </div>
            <div class="db-choice" data-role="b" data-ok="1">
              <span class="db-choice-tag">B</span>
              <span id="correctMsg">“Open the Q2 deck on my office computer, pull final sales numbers from the Excel in the same folder, paste them into the deck, save, and text me when it’s ready.”</span>
            </div>
            <div class="db-choice" data-role="c">
              <span class="db-choice-tag">C</span>
              <span>“Muistuta minua myöhemmin, että tarkistan Q2-luvut koneella.”</span>
            </div>
          </div>
          <p class="db-feedback" id="triageFeedback">Demo käynnistyy…</p>
          <div class="db-split" id="triageSplit" hidden>
            <div class="db-split-phone">
              <div class="db-mini-label">Puhelin</div>
              <div class="db-mini-phone">
                <div class="db-mini-msg out" id="splitOut">…</div>
                <div class="db-mini-msg in" id="splitIn" hidden>Success — Q2 numbers are in the deck.</div>
              </div>
            </div>
            <div class="db-split-desk">
              <div class="db-mini-label">Pöytäkone (hereillä)</div>
              <div class="db-desk-stage">
                <div class="db-desk-step" data-step="0">Avaa Excel · Q2_sales.xlsx</div>
                <div class="db-desk-step" data-step="1">Kopioi lopulliset luvut</div>
                <div class="db-desk-step" data-step="2">Liitä PowerPoint-esitykseen</div>
                <div class="db-desk-step" data-step="3">Tallenna · ilmoitus puhelimeen</div>
              </div>
            </div>
          </div>
        </section>

        <div class="db-footer">
          <button type="button" class="btn primary" id="dbGoExample" disabled>Katso Dispatch-esimerkki →</button>
          <p class="db-footer-hint" id="dbHint">Odota — animaatio näyttää, miten oikea komento etenee.</p>
        </div>
      </div>`;

    const feedback = container.querySelector('#triageFeedback');
    const split = container.querySelector('#triageSplit');
    const goBtn = container.querySelector('#dbGoExample');
    const hint = container.querySelector('#dbHint');
    const choiceA = container.querySelector('[data-role="a"]');
    const choiceB = container.querySelector('[data-role="b"]');
    const choiceC = container.querySelector('[data-role="c"]');
    const correctMsg = container.querySelector('#correctMsg').textContent.replace(/^"|"$/g, '');

    async function playSplit(msg){
      split.hidden = false;
      split.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      container.querySelector('#splitOut').textContent = msg;
      const inn = container.querySelector('#splitIn');
      inn.hidden = true;
      const steps = [...container.querySelectorAll('.db-desk-step')];
      steps.forEach(s => s.classList.remove('on', 'done'));
      for(const step of steps){
        step.classList.add('on');
        await Engine.wait(650);
        step.classList.remove('on');
        step.classList.add('done');
      }
      inn.hidden = false;
      goBtn.disabled = false;
      hint.textContent = 'Demo valmis — jatka esimerkkiin kun olet valmis.';
    }

    // Auto-demo: flash weak options, lock onto B, run phone↔desktop animation
    await Engine.wait(900);
    feedback.className = 'db-feedback bad';
    feedback.textContent = 'A ja C eivät käytä pöytäkoneen tiedostoja — ne ovat pelkkää chatia tai muistutusta.';
    choiceA.classList.add('wrong');
    choiceC.classList.add('wrong');
    await Engine.wait(1100);
    choiceA.classList.remove('wrong');
    choiceC.classList.remove('wrong');
    choiceA.style.opacity = '0.45';
    choiceC.style.opacity = '0.45';
    choiceB.classList.add('correct');
    feedback.className = 'db-feedback ok';
    feedback.textContent = 'B on oikea Dispatch-komento: lähde + raskas työ koneella + tulos puhelimeen. Seuraa animaatiota.';
    await Engine.wait(700);
    await playSplit(correctMsg);

    goBtn.addEventListener('click', () => goToExample && goToExample());
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
    /* ---- H1 Airport compliance ---- */
    {
      label: 'H1 · Airport gate',
      outcome: 'PDF vs policy → short text',
      run: async (container) => {
        container.innerHTML = '';
        Engine.renderDispatchHud(container, {
          scene: 'airport',
          location: 'Boarding · Gate B12 · Inbox just pinged',
          battery: 3,
          timeLeft: '3:00',
          signal: 1,
          note: 'Battery dies in minutes. You cannot read 150 pages — Dispatch the desktop for a ≤300-word text.',
        });
        const shell = Engine.el('<div class="dispatch-shell-wrap"></div>');
        container.appendChild(shell);
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(shell, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch · Airport gate',
          composerHint: 'Dispatch · desktop awake',
        });
        const desk = Engine.renderDispatchDesktopPanel(panel, {
          folderLabel: 'Inbox/',
          pathHint: 'Desktop/Legal',
          files: [
            {id:'reg', name:'Regulatory_Update_2026.pdf', meta:'150 s · uusi', type:'doc', content:
`REGULATORY UPDATE 2026 — DRAFT DROP (excerpt peek)
§12 Retention of customer logs extended to 36 months (was 12).
§19 Cross-border transfer: new SCC checklist required before EU→US sync.
§27 Incident notify window: 24h to authority (was 72h).
… [pages 4–149 omitted in peek] …
Appendix C: penalties up to 4% global turnover for delayed notify.`},
            {id:'pol', name:'Compliance_Policy.docx', meta:'yrityksen nykyinen', type:'doc', content:
`COMPANY COMPLIANCE POLICY v2024
Log retention: 12 months.
Cross-border: “follow legal advice” — no SCC checklist.
Incident notify: “as soon as practicable / 72h target”.
No explicit mapping to 2026 §12 / §19 / §27.`},
          ],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H1 · Compliance triage',
            situation: 'Uusi 150-sivuinen regulatory PDF tipahti Inboxiin. Vanha Compliance_Policy.docx on samassa koneessa. Kurkista tiedostot oikealta.',
            outcome: 'Claude skannaa PDF:n koneella, vertaa policyyn, löytää 3 isointa aukkoa ja lähettää ≤300 sanan yhteenvedon puhelimeesi.',
            mustInclude: ['Lähde (Inbox / PDF + policy)', 'Vertailu / aukot', 'Lyhyt tulos puhelimeen'],
            nextHint: '↓ Dispatch-viesti: lähde + raskas työ + mobiilitulos.',
          },
          minChars: 70,
          requireGroups: [
            ['inbox', 'regulatory', 'pdf', 'policy', 'compliance', 'sopimus', 'kansio'],
            ['vertaa', 'compare', 'gap', 'aukko', 'scan', 'skann', 'etsi', 'find'],
            ['text', 'teksti', 'phone', 'puhelin', 'summary', 'yhteenv', 'lyhyt', '300'],
          ],
          requireSafety: [],
          banSnippets: ['Uusi 150-sivuinen regulatory PDF tipahti'],
        });

        await Engine.addThinking(thread, 700);
        await Engine.addAssistantMsg(thread, ['Vastaanotettu. Avaan Inboxin pöytäkoneella — tiivis yhteenveto tulee tähän kun valmis.']);
        await Engine.runChecklist(desk.checklist, [
          'Avataan Regulatory_Update_2026.pdf (150 s)',
          'Avataan Compliance_Policy.docx',
          'Verrataan §12 / §19 / §27',
          'Kirjoitetaan ≤300 sanan executive summary → phone',
        ]);
        await Engine.addAssistantMsg(thread, [
          'TOP 3 GAPS (phone):\n1) Log retention 12→36 mo — policy outdated.\n2) No SCC checklist for EU→US.\n3) Notify window still 72h vs new 24h.\nAction: update policy §§ logs / transfers / incidents this week.',
        ]);
        Engine.showOutcome(thread, {
          title: 'Mobile output',
          lines: [
            {label:'Missä työ', value:'Pöytäkone · Inbox'},
            {label:'Puhelimeen', value:'3 gapia + lyhyt yhteenveto'},
          ],
        });
        Engine.addComplete(thread, 'H1 valmis — raskas PDF → lyhyt teksti portilla.');
      },
    },

    /* ---- H2 Cab-ride finance ---- */
    {
      label: 'H2 · Cab-ride forecast',
      outcome: 'Excel IRR → yes/no text',
      run: async (container) => {
        container.innerHTML = '';
        Engine.renderDispatchHud(container, {
          scene: 'taxi',
          location: 'City traffic · partner meeting in 12 min',
          battery: 18,
          timeLeft: '12:00',
          signal: 3,
          sms: {
            from: 'Partner · Alex',
            body: 'hey — updated numbers from ops\nutilities q3 roughly 61k (was way off)\nmaintenance more like 27400\ncan you check the model — do we still clear our 12% return bar?\nsorry messy — meeting in 15',
            hint: 'Paste this SMS into your Dispatch prompt. The question to answer is already in the message.',
          },
          mission: 'With these new costs, is our return still at least 12%? Get a short yes/no text back — not the whole Excel.',
          note: 'You don’t need to know finance terms. Peek the spreadsheet → it already explains the 12% rule.',
        });
        const shell = Engine.el('<div class="dispatch-shell-wrap"></div>');
        container.appendChild(shell);
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(shell, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch · Cab ride',
          composerHint: 'Dispatch · desktop awake',
        });
        const desk = Engine.renderDispatchDesktopPanel(panel, {
          folderLabel: 'Finance/',
          pathHint: 'Desktop/Models',
          files: [
            {id:'val', name:'valuation_model.xlsx', meta:'multi-tab', type:'doc', content:
`valuation_model.xlsx — what this file is for (plain English)

QUESTION THIS MODEL ANSWERS
→ “Is our investment return still high enough?”

RULE ALREADY IN THE FILE
→ Minimum return we accept = 12%
  (labelled in the sheet as hurdle_irr / IRR — just means “return rate”)

CURRENT NUMBERS (old — before partner’s SMS)
→ Q3 utilities = 42,000 €
→ Q3 maintenance = 18,500 €
→ Current return (IRR) = 14.1%  ← above 12%, so OK today

YOUR JOB VIA DISPATCH
→ Tell Claude to put the SMS costs into those Q3 cells,
  recalculate the return, and text you: still ≥ 12%? yes/no.`},
          ],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H2 · Cab-ride numbers check',
            situation: 'Partnerin SMS (luvut + kysymys) on puhelimen näytöllä ylhäällä. Excel on koneella — kurkista se: siellä lukee mitä 12 % tarkoittaa.',
            outcome: 'Lyhyt kyllä/ei puhelimeen: onko tuotto uusilla kuluilla yhä vähintään 12 %?',
            mustInclude: [
              'Liitä partnerin SMS (luvut tulevat sieltä)',
              'Kerro Claudelle että malli on valuation_model.xlsx',
              'Pyydä lyhyt vastaus puhelimeen (yli/alle 12 %)',
            ],
            nextHint: '↓ Kirjoita oma Dispatch-viesti. Kysymys on SMS:ssä ja Excel-peekissä — älä odota valmista lausetta.',
          },
          minChars: 80,
          requireGroups: [
            ['valuation', 'excel', 'xlsx', 'model', 'malli', 'finance', 'tauluk'],
            ['utility', 'utilities', 'maintenance', '61', '27400', '27', 'q3', 'päivitä', 'update', 'sms', 'kulut', 'cost'],
            ['12', 'return', 'tuotto', 'irr', 'threshold', 'kynnys', 'text', 'teksti', 'phone', 'puhelin', 'yes', 'no', 'kyllä', 'ei', 'above', 'yli', 'alle'],
          ],
          requireSafety: [],
          banSnippets: ['valuation_model.xlsx on koneella', 'Partnerin SMS (luvut'],
        });

        await Engine.runChecklist(desk.checklist, [
          'Avataan valuation_model.xlsx',
          'Päivitetään Q3-kulut SMS-luvuilla',
          'Lasketaan tuotto (IRR) uudelleen',
          'Tekstataan kyllä/ei: ≥ 12 %?',
        ]);
        await Engine.addAssistantMsg(thread, [
          'Phone: New costs in. Recalculated return ≈ 11.4% — NO, below your 12% bar. Tell Alex before the meeting.',
        ]);
        Engine.showOutcome(thread, {
          title: 'Mobile output',
          lines: [
            {label:'Tuotto', value:'~11.4% (alle 12%)'},
            {label:'Vastaus', value:'Ei — kynnys ei täyty'},
          ],
        });
        Engine.addComplete(thread, 'H2 valmis — sotkuinen SMS → Excel → kyllä/ei.');
      },
    },

    /* ---- H3 Dinner competitor ---- */
    {
      label: 'H3 · Dinner PR',
      outcome: 'Web + local specs → talking points',
      run: async (container) => {
        container.innerHTML = '';
        Engine.renderDispatchHud(container, {
          scene: 'dinner',
          location: 'Industry dinner · someone just mentioned a competitor attack',
          battery: 41,
          timeLeft: 'ASAP',
          signal: 4,
          sms: {
            from: 'Colleague · Mira',
            body: 'urgent — ApexJust dropped a press release saying our whole industry’s safety standards are “unsafe & outdated”. People at your table will ask. Can you get 3 short lines I can say out loud? Don’t invent — check our real safety file on the PC.',
            hint: 'This message is your cue. Paste the ask into Dispatch. Claude can search the web + read your local safety file.',
          },
          mission: 'Get 3 short lines you can say at the table now. Longer written answer can be saved on the desktop in PR/.',
          note: 'You don’t need PR jargon. Peek the safety file → it shows what is true about your product.',
        });
        const shell = Engine.el('<div class="dispatch-shell-wrap"></div>');
        container.appendChild(shell);
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(shell, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch · Dinner party',
          composerHint: 'Dispatch · desktop + web',
        });
        const desk = Engine.renderDispatchDesktopPanel(panel, {
          folderLabel: 'Product_Safety/',
          pathHint: 'Desktop + PR/',
          files: [
            {id:'spec', name:'safety_specs.pdf', meta:'our facts · local', type:'doc', content:
`safety_specs.pdf — what this file is for (plain English)

THIS IS OUR PRODUCT’S REAL SAFETY FACTS (keep on PC — not public inventing)

What we CAN say truthfully:
• Certified: IEC 61508 SIL-2 (field modules)
• Battery backup / failover tested for 4 hours
• Checked by an external lab in Nov 2025

What we should NOT claim:
• “Zero incidents industry-wide” (we never promised that)

YOUR JOB VIA DISPATCH
→ Have Claude find ApexJust’s live press release on the web,
  compare their attacks to THESE facts,
  text you 3 short speaking lines for dinner,
  and save a longer written reply in the PR/ folder.`},
            {id:'pr', name:'PR/', meta:'empty folder · for the long reply', type:'doc', content:
`PR/ folder — empty for now

Put the longer written answer here (full reply to the press attack).
Your phone only needs the short speaking lines.`},
          ],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H3 · Dinner table reply',
            situation: 'Kollega Miran viesti on puhelimen näytöllä. Kilpailija ApexJust hyökkäsi alan turvallisuutta vastaan. Omalla koneella on safety_specs.pdf (kurkista) + tyhjä PR-kansio.',
            outcome: '3 lyhyttä lausetta puhelimeen (voit sanoa ne pöydässä) + pidempi vastaus tallennettuna PR-kansioon.',
            mustInclude: [
              'Kerro Miran pyyntö / ApexJust-pressi',
              'Hae pressi verkosta + lue safety_specs.pdf koneelta',
              'Lyhyt vastaus puhelimeen + pidempi tiedosto PR-kansioon',
            ],
            nextHint: '↓ Kirjoita oma Dispatch-viesti. Ainekset ovat Miran viestissä + speksipeekissä — ei valmista lausetta.',
          },
          minChars: 80,
          requireGroups: [
            ['safety', 'specs', 'pdf', 'local', 'kansio', 'product', 'speks'],
            ['web', 'press', 'internet', 'search', 'hae', 'verk', 'competitor', 'kilpail', 'apex'],
            ['pr', 'rebuttal', 'talking', 'phone', 'puhelin', 'text', 'point', 'lause', 'vastaus', 'reply', 'dinner', 'pöyd'],
          ],
          requireSafety: [],
          banSnippets: ['Kilpailija hyökkäsi alan turvallisuutta', 'Kollega Miran viesti on'],
        });

        await Engine.runChecklist(desk.checklist, [
          'Web: haetaan ApexJustin pressitiedote',
          'Avataan safety_specs.pdf (omat faktat)',
          'Verrataan väitteet ↔ meidän faktat',
          'Tallennetaan pidempi vastaus → PR/',
          '3 lyhyttä lausetta → puhelimeen',
        ]);
        await Engine.addAssistantMsg(thread, [
          'Phone — say these 3 lines:\n1) Our field modules are SIL-2 certified (external lab, Nov 2025).\n2) We tested 4-hour failover — “industry unsafe” is a blanket claim, not about our product.\n3) Happy to share the cert summary; full written reply is in PR/ on my desktop.',
        ]);
        Engine.showOutcome(thread, {
          title: 'Mobile output',
          lines: [
            {label:'Puhelimeen', value:'3 speaking lines'},
            {label:'Koneelle', value:'PR/ — longer written reply'},
          ],
        });
        Engine.addComplete(thread, 'H3 valmis — web + local facts → phone lines + PR-tiedosto.');
      },
    },

    /* ---- H4 Convention floor CRM ---- */
    {
      label: 'H4 · Floor leads',
      outcome: 'Voice note → JSON + draft',
      run: async (container) => {
        container.innerHTML = '';
        Engine.renderDispatchHud(container, {
          scene: 'convention',
          location: 'Hall B · walking the floor with voice notes',
          battery: 22,
          timeLeft: '~8 min',
          signal: 2,
          sms: {
            from: 'Voice memo · just dictated',
            body: 'Sarah from Acme wants a demo next week, her email is sarah@acme.com, she mentioned they are struggling with API scaling',
            hint: 'This messy note is your input — paste it into Dispatch. Peek the desktop files to see where leads and email drafts live.',
          },
          mission: 'Save this new contact into the leads file on the PC, and get a short follow-up email draft written for you — don’t type JSON on the phone.',
          note: 'You don’t need to know what JSON is. Peek the leads file — it shows the fields in plain English.',
        });
        const shell = Engine.el('<div class="dispatch-shell-wrap"></div>');
        container.appendChild(shell);
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(shell, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch · Convention floor',
          composerHint: 'Dispatch · desktop awake',
        });
        const desk = Engine.renderDispatchDesktopPanel(panel, {
          folderLabel: 'CRM/',
          pathHint: 'Desktop/Sales',
          files: [
            {id:'crm', name:'CRM_leads.json', meta:'leads list · local', type:'doc', content:
`CRM_leads.json — what this file is for (plain English)

THIS IS OUR CONTACT / LEADS LIST on the PC
(the .json ending just means “structured list” — Claude can edit it)

Each lead has fields like:
• name
• company
• email
• need (what they struggle with)
• next (what we promised to do)

Already in the list:
• Lee Park · Orbit · lee@orbit.io · need: offline sync · next: send one-pager

YOUR JOB VIA DISPATCH
→ Paste the messy voice note from your phone,
  add Sarah from Acme as a new lead (don’t overwrite Lee),
  and ask Claude to write a short follow-up email draft in the Drafts folder.`},
            {id:'drafts', name:'Drafts/', meta:'empty · for email drafts', type:'doc', content:
`Drafts/ folder — empty for now

Put follow-up email drafts here (e.g. a short note to Sarah).
Your phone only needs a quick “saved + draft ready” confirmation.`},
          ],
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H4 · Messu → lead listalle',
            situation: 'Äänimuistio on puhelimen näytöllä. Koneella on leads-lista (CRM_leads.json) ja tyhjä Drafts-kansio — kurkista molemmat.',
            outcome: 'Sarah/Acme lisätään lead-listalle + lyhyt follow-up -luonnos Drafts-kansioon. Puhelimeen vain lyhyt kuittaus.',
            mustInclude: [
              'Liitä äänimuistio (Sarah / Acme)',
              'Päivitä CRM_leads.json koneella',
              'Kirjoita luonnos Drafts-kansioon',
            ],
            nextHint: '↓ Kirjoita oma Dispatch-viesti. Ainekset ovat muistiossa + tiedostopeekissä — ei valmista lausetta.',
          },
          minChars: 70,
          requireGroups: [
            ['crm', 'json', 'leads', 'database', 'lista', 'lead'],
            ['sarah', 'acme', 'parse', 'append', 'add', 'lisää', 'kent', 'muistio', 'voice', 'note'],
            ['draft', 'follow', 'kansio', 'folder', 'email', 'luonnos', 'viesti'],
          ],
          requireSafety: [],
          banSnippets: ['Kävelet messulattiaa', 'Äänimuistio on puhelimen'],
        });

        await Engine.runChecklist(desk.checklist, [
          'Avataan CRM_leads.json',
          'Poimitaan Sarah / Acme / email / tarve muistiosta',
          'Lisätään rivi listaan (Lee jää)',
          'Kirjoitetaan Drafts/followup_sarah_acme.md',
        ]);
        await Engine.addAssistantMsg(thread, [
          'Phone: Lead saved — Sarah @ Acme, demo next week, pain=API scaling. Draft ready in Drafts/.',
        ]);
        Engine.showOutcome(thread, {
          title: 'Mobile output',
          lines: [
            {label:'Puhelimeen', value:'Lead saved + draft ready'},
            {label:'Koneelle', value:'CRM + Drafts/follow-up'},
          ],
        });
        Engine.addComplete(thread, 'H4 valmis — voice → lead-lista + luonnos.');
      },
    },

    /* ---- H5 Boardroom PPT rescue ---- */
    {
      label: 'H5 · Boardroom deck hunt',
      outcome: 'Scan 12 decks → chart data',
      run: async (container) => {
        container.innerHTML = '';
        Engine.renderDispatchHud(container, {
          scene: 'boardroom',
          location: 'Floor 12 · door opens any second',
          battery: 9,
          timeLeft: '2:00',
          signal: 3,
          sms: {
            from: 'Boss · Kim',
            body: 'I’m about to walk in — need the numbers from the “Q3 Projected Growth” chart. Which of the 12 decks has it?? Text me the bar %s only. Don’t send a whole deck.',
            hint: 'This ask is your cue. Peek the messy folder on the desktop — you don’t have time to open every file yourself.',
          },
          mission: 'Find the “Q3 Projected Growth” chart in the messy decks folder and get only the bar percentages texted to your phone — before the door opens.',
          note: 'You don’t need to know PowerPoint. Tell Claude which folder + which chart title + that you want a short text.',
        });
        const shell = Engine.el('<div class="dispatch-shell-wrap"></div>');
        container.appendChild(shell);
        const { thread, panel, userInput, sendBtn } = Engine.renderChatShell(shell, {
          sidebarHighlight: 'dispatch',
          topbarTitle: 'Dispatch · Boardroom door',
          composerHint: 'Dispatch · desktop awake',
        });
        const messy = [
          {id:'readme', name:'_READ_ME_first.txt', meta:'start here', content:
`Decks_messy/ — what this folder is for (plain English)

12 presentation files with confusing names.
Somewhere inside ONE of them is a slide titled:
  “Q3 Projected Growth”
with a bar chart (month %).

You do NOT have time to open them all before the boardroom.
YOUR JOB VIA DISPATCH → ask Claude to scan the folder, find that slide, and text you only the bar numbers.`},
          {id:'d1', name:'presentation_v1.pptx', meta:'vanha', content:'Old intro slides. No Q3 Projected Growth chart.'},
          {id:'d2', name:'final_final_v3.pptx', meta:'?', content:'Marketing fluff. Has a Q2 actuals chart — wrong quarter.'},
          {id:'d3', name:'deck_edit_latest.pptx', meta:'?', content:'Contains slides including charts. Quick peek can’t reliably read chart numbers — Dispatch Claude to extract “Q3 Projected Growth” if this is the right file.'},
          {id:'d4', name:'board_pack_OLD.pptx', meta:'2025', content:'Prior year pack. Ignore for today’s Q3 ask.'},
          {id:'d5', name:'q3_notes_scratch.pptx', meta:'scratch', content:'Bullet dump / notes. No growth chart.'},
          {id:'d6', name:'investor_lite.pptx', meta:'lite', content:'Three slides. No growth chart.'},
          {id:'d7', name:'presentation_v2_copy.pptx', meta:'copy', content:'Duplicate of an old intro deck.'},
          {id:'d8', name:'FINAL.pptx', meta:'huono nimi', content:'Logo page only. Misleading name.'},
          {id:'d9', name:'deck_with_charts.pptx', meta:'?', content:'Has a revenue pie chart — not “Q3 Projected Growth”.'},
          {id:'d10', name:'strategy_offsite.pptx', meta:'offsite', content:'Workshop photos. No numbers chart.'},
          {id:'d11', name:'numbers_maybe.pptx', meta:'?', content:'Headcount table — not the growth chart Kim asked for.'},
          {id:'d12', name:'almost_board.pptx', meta:'almost', content:'Agenda + team. No Q3 Projected Growth chart.'},
        ].map(f => ({...f, type:'doc'}));

        const desk = Engine.renderDispatchDesktopPanel(panel, {
          folderLabel: 'Decks_messy/',
          pathHint: '12 files · confusing names',
          files: messy,
        });

        await Engine.runOwnPrompt(thread, userInput, sendBtn, {
          brief: {
            title: 'H5 · Oikeat luvut ennen ovea',
            situation: 'Kimin viesti on puhelimen näytöllä: tarvitaan “Q3 Projected Growth” -käyrän prosentit. Koneella on Decks_messy/ (12 sekavaa tiedostoa) — kurkista _READ_ME_first.txt.',
            outcome: 'Claude skannaa kansioita puolestasi ja tekstaa puhelimeen vain käyrän avainluvut — ei koko esitystä.',
            mustInclude: [
              'Kerro Kimin pyyntö / chartin nimi',
              'Lähde: Decks_messy/ (skannaa esitykset)',
              'Lyhyt tulos puhelimeen nyt',
            ],
            nextHint: '↓ Kirjoita oma Dispatch-viesti. Ainekset ovat Kimin viestissä + kansion peekissä — ei valmista lausetta.',
          },
          minChars: 60,
          requireGroups: [
            ['deck', 'pptx', 'presentation', 'kansio', 'folder', 'scan', 'skann', 'messy', 'esity'],
            ['q3', 'growth', 'projected', 'chart', 'käyr', 'slide', 'kasvu'],
            ['text', 'teksti', 'phone', 'puhelin', 'now', 'nyt', 'luvut', 'numbers', 'prosent'],
          ],
          requireSafety: [],
          banSnippets: ['Ulkona boardroomista', 'Kimin viesti on puhelimen'],
        });

        await Engine.runChecklist(desk.checklist, [
          'Skannataan Decks_messy/ (12× .pptx)',
          'Löydetään deck_edit_latest.pptx · slide 9',
          'Poimitaan Jul/Aug/Sep %',
          'Tekstataan luvut puhelimeen',
        ]);
        desk.openFile('d3');
        await Engine.addAssistantMsg(thread, [
          'Phone: Found in deck_edit_latest.pptx (slide 9) — Q3 Projected Growth: Jul 12% · Aug 14% · Sep 17%.',
        ]);
        Engine.showOutcome(thread, {
          title: 'Mobile output',
          lines: [
            {label:'Löytyi', value:'deck_edit_latest.pptx · slide 9'},
            {label:'Puhelimeen', value:'Jul 12% · Aug 14% · Sep 17%'},
          ],
        });
        Engine.addComplete(thread, 'H5 valmis — 12 tiedostoa → 3 lukua oven takana.');
      },
    },
  ],
});
