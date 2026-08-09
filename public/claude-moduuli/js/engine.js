/* =============================================================================
   ENGINE.JS
   Jaetut rakennuspalikat kaikille seitsemälle pilarille. Yksittäinen pilari
   (js/pillars/pillarN.js) ei koskaan rakenna omaa käyttöliittymää tyhjästä —
   se kutsuu näitä funktioita. Uuden harjoituksen lisääminen tarkoittaa siis
   käytännössä uuden datan/skriptin kirjoittamista, ei uutta CSS:ää tai HTML:ää.

   Cursorille: kaikki backendiin kytkettävät kohdat on merkitty
   "// TODO(backend):" -kommentilla. Ne vastaavat suoraan projektin
   olemassa olevia konventioita (esim. reflections-taulu, authenticateToken).
   ============================================================================= */

window.Engine = (() => {

  function el(html){ const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
  function esc(s){ return (s||'').replace(/</g,'&lt;'); }

  const CLAUDE_MARK = `<svg class="mark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L14.2 9.2 L21.5 9.2 L15.6 13.7 L17.9 21 L12 16.5 L6.1 21 L8.4 13.7 L2.5 9.2 L9.8 9.2 Z"/></svg>`;

  const ICONS = {
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-6-6-4 4-3-3-5 5"/></svg>`,
    invoice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,
    desktop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="1"/><path d="M8 20h8M12 17v3"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
    page: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l5 5v15H6z"/><path d="M9 13h6M9 17h6"/></svg>`,
    skill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v4l3 2"/><circle cx="12" cy="12" r="9"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v12H8l-4 4z"/></svg>`,
    cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 18a4 4 0 0 1-1-7.9 5 5 0 0 1 9.6-2A4.5 4.5 0 0 1 17 18z"/></svg>`,
    code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 8l-5 4 5 4M15 8l5 4-5 4"/></svg>`,
    bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`,
    list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
    megaphone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5V4l-3 5H5a2 2 0 0 0-2 2z"/><path d="M14 8a4 4 0 0 1 0 8"/></svg>`,
  };

  /* ---------------------------------------------------------------------
     VIESTIT (toimivat minkä tahansa .thread-elementin sisällä)
     --------------------------------------------------------------------- */

  function scrollDown(thread){ thread.scrollTop = thread.scrollHeight + 600; }

  function addNarrator(thread, text){
    thread.appendChild(el(`<div class="narrator">${text}</div>`));
    scrollDown(thread);
  }

  function addUserMsg(thread, text){
    thread.appendChild(el(`<div class="msg user">${esc(text)}</div>`));
    scrollDown(thread);
  }

  async function addThinking(thread, ms=1300){
    const node = el(`<div class="thinking">${CLAUDE_MARK}<div class="dots"><span></span><span></span><span></span></div></div>`);
    thread.appendChild(node);
    scrollDown(thread);
    await wait(ms);
    node.remove();
  }

  async function typeText(node, text, speed=14){
    const words = text.split(' ');
    for(let i=0;i<words.length;i++){
      node.textContent += (i===0?'':' ') + words[i];
      if(i % 3 === 0) node.closest('.thread') && scrollDown(node.closest('.thread'));
      await wait(speed);
    }
  }

  async function addAssistantMsg(thread, paragraphs){
    const wrap = el(`<div class="msg assistant">${CLAUDE_MARK}<div class="bubble"></div></div>`);
    thread.appendChild(wrap);
    const bubble = wrap.querySelector('.bubble');
    for(const p of paragraphs){
      const pEl = document.createElement('p');
      bubble.appendChild(pEl);
      await typeText(pEl, p);
      scrollDown(thread);
    }
    return wrap;
  }

  function addCard(thread, {title, body, actions, icon, auto}){
    // `auto` (vain Esimerkki-osioissa): { ms, actionId } klikkaa itse itseään
    // hetken kuluttua, jotta demo pyörii ilman katsojan klikkausta. Harjoituksissa
    // auto jätetään pois — silloin oikea klikkaus todella tarvitaan.
    const actionsHtml = actions.map(a => `<button class="btn ${a.primary?'primary':''}" data-action="${a.id}">${a.label}</button>`).join('');
    const node = el(`
      <div class="card">
        <div class="card-title">${icon || ICONS.check}${title}</div>
        <p>${body}</p>
        <div class="card-actions">${actionsHtml}</div>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
    const promise = new Promise(resolve => {
      node.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          node.querySelectorAll('button').forEach(b => b.disabled = true);
          btn.style.borderColor = 'var(--dark)';
          resolve(btn.dataset.action);
        });
      });
    });
    if(auto){
      wait(auto.ms).then(() => {
        const btn = node.querySelector(`[data-action="${auto.actionId}"]`);
        if(btn && !btn.disabled) btn.click();
      });
    }
    return promise;
  }

  function addQuiz(thread, {question, options}){
    const optsHtml = options.map((o,i) => `<button class="quiz-opt" data-i="${i}">${o.text}</button>`).join('');
    const node = el(`
      <div class="card quiz-card">
        <div class="card-title">${ICONS.check}Tarkistuskysymys</div>
        <p>${question}</p>
        <div class="quiz-opts">${optsHtml}</div>
        <div class="quiz-feedback" style="display:none"></div>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
    return new Promise(resolve => {
      node.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = +btn.dataset.i;
          const opt = options[i];
          node.querySelectorAll('.quiz-opt').forEach(b => b.disabled = true);
          btn.classList.add(opt.correct ? 'correct' : 'incorrect');
          if(!opt.correct){
            const correctBtn = node.querySelector(`.quiz-opt[data-i="${options.findIndex(o=>o.correct)}"]`);
            if(correctBtn) correctBtn.classList.add('correct');
          }
          const fb = node.querySelector('.quiz-feedback');
          fb.style.display = 'block';
          fb.textContent = opt.feedback;
          scrollDown(thread);
          resolve(opt.correct);
        });
      });
    });
  }

  function addReflection(thread, {prompt, placeholder}){
    const node = el(`
      <div class="card reflect-box">
        <div class="card-title">${ICONS.check}Pohdi hetki</div>
        <p>${prompt}</p>
        <textarea placeholder="${placeholder||''}"></textarea>
        <button class="btn primary" disabled>Jatka</button>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
    const ta = node.querySelector('textarea');
    const btn = node.querySelector('button');
    ta.addEventListener('input', () => { btn.disabled = ta.value.trim().length < 8; });
    return new Promise(resolve => {
      btn.addEventListener('click', () => {
        ta.disabled = true;
        btn.disabled = true;
        // TODO(backend): tallenna ta.value opiskelijan reflections-tauluun
        // (sama konventio kuin aipolku:n muissa moduuleissa).
        resolve(ta.value.trim());
      });
    });
  }

  function addComplete(thread, text){
    thread.appendChild(el(`<div class="narrator done">✓ <b>${text}</b></div>`));
    scrollDown(thread);
    // TODO(backend): merkitse harjoitus suoritetuksi opiskelijan edistymiseen.
  }

  /* Tehtäväbriiffi: kertoo mitä pitää saavuttaa, EI miten. Näytetään aina
     harjoituksen alussa, jotta opiskelija tietää mitä hänen pitää kirjoittaa
     tai valita ennen kuin hän aloittaa — ei paljasta oikeaa vastausta. */
  function addTaskBrief(thread, brief){
    // Supports {goal, hint} OR richer {title, situation, task|outcome, folderNote, mustInclude, example}
    // Prefer `outcome` (short goal) over a recipe-style `task` — students must write their own prompt.
    if(brief.goal && !brief.situation){
      const node = el(`
        <div class="task-brief">
          <div class="task-brief-label">${ICONS.check}Tehtävä</div>
          <p>${brief.goal}</p>
          ${brief.hint ? `<p class="task-brief-hint">${brief.hint}</p>` : ''}
        </div>`);
      thread.appendChild(node);
      scrollDown(thread);
      return;
    }
    const must = (brief.mustInclude || []).map(x => `<li>${x}</li>`).join('');
    const rightTitle = brief.outcome ? 'Tavoite' : 'Mitä teet';
    const rightBody = brief.outcome || brief.task || '';
    const node = el(`
      <div class="card task-brief-card">
        <div class="card-title">${ICONS.page}${brief.title || 'Tehtävä'}</div>
        <div class="tb-grid">
          <div><h4>Tilanne</h4><div class="tb-body">${brief.situation || ''}</div></div>
          <div><h4>${rightTitle}</h4><div class="tb-body">${rightBody}</div></div>
        </div>
        ${brief.folderNote ? `<p class="tb-folder">${brief.folderNote}</p>` : ''}
        ${must ? `<h4>Huomioi</h4><ul class="tb-must">${must}</ul>` : ''}
        ${brief.example ? `<div class="tb-example"><span>Vinkki / runko</span><code>${esc(brief.example)}</code></div>` : ''}
        <p class="tb-next">${brief.nextHint || '↓ Valitse listasta, sitten kirjoita oma toimeksianto Claudelle — älä kopioi briiffiä.'}</p>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
  }

  async function runLiveWork(thread, { title, steps }){
    const node = el(`
      <div class="card live-work">
        <div class="card-title">${CLAUDE_MARK.replace('class="mark"','class="mark" style="width:16px;height:16px"')} ${title || 'Claude työskentelee'}</div>
        <div class="lw-steps"></div>
      </div>`);
    thread.appendChild(node);
    const box = node.querySelector('.lw-steps');
    for(const step of steps){
      const row = el(`<div class="lw-step"><span class="lw-spin"></span><div><b>${step.label}</b>${step.detail ? `<span>${step.detail}</span>` : ''}</div></div>`);
      box.appendChild(row);
      scrollDown(thread);
      await wait(step.ms || 650);
      row.classList.add('done');
      row.querySelector('.lw-spin').className = 'lw-check';
    }
    return node;
  }

  function showOutcome(thread, {title, lines}){
    const body = (lines||[]).map(l => `<div class="outcome-line"><b>${l.label}</b><span>${esc(l.value)}</span></div>`).join('');
    thread.appendChild(el(`
      <div class="card outcome-card">
        <div class="card-title">${ICONS.check}${title}</div>
        <div class="outcome-body">${body}</div>
      </div>`));
    scrollDown(thread);
  }

  function addDeliverable(thread, {title, intro, fields, submitLabel}){
    const fieldsHtml = fields.map(f => `
      <label class="deliv-field"><span>${f.label}</span>
      <textarea data-fid="${f.id}" rows="${f.rows||3}" placeholder="${f.placeholder||''}"></textarea></label>`).join('');
    const node = el(`
      <div class="card deliverable-card">
        <div class="card-title">${ICONS.page}${title}</div>
        <p>${intro}</p>
        <div class="deliv-fields">${fieldsHtml}</div>
        <button class="btn primary" disabled>${submitLabel || 'Lukitse'}</button>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
    const btn = node.querySelector('button');
    const areas = [...node.querySelectorAll('textarea')];
    const check = () => {
      btn.disabled = !fields.every((f,i) => areas[i].value.trim().length >= (f.minLength||24));
    };
    areas.forEach(a => a.addEventListener('input', check));
    return new Promise(resolve => {
      btn.addEventListener('click', () => {
        areas.forEach(a => a.disabled = true);
        btn.disabled = true;
        const data = {};
        fields.forEach((f,i) => { data[f.id] = areas[i].value.trim(); });
        resolve(data);
      });
    });
  }

  async function runPromptStep(thread, userInput, sendBtn, { brief, accept, clarifyText }){
    if(brief) addTaskBrief(thread, brief);
    armInput(userInput, sendBtn);
    let attempt = await waitForFreeText(thread, userInput, sendBtn, { accept, clarifyText });
    while(!attempt.matched) attempt = await attempt.retry();
    return attempt;
  }

  /* Own-prompt gate: rejects copy-paste / too-short / missing scope or safety.
     opts:
       minChars
       requireGroups: [[alt1, alt2], ...] — each group needs ≥1 match
       requireSafety: [words] — ≥1 match (HR / signed / ask-before / älä koske…)
       banSnippets: strings that look like the brief recipe — high overlap → reject
       clarifyTooShort / clarifyMissing / clarifySafety / clarifyCopy */
  function scorePrompt(text, opts={}){
    const lower = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const reasons = [];
    const minChars = opts.minChars || 70;
    if(lower.length < minChars) reasons.push('short');

    const rejectPatterns = opts.rejectPatterns || [];
    if(rejectPatterns.some(p => lower.includes(String(p).toLowerCase()))){
      reasons.push('reject');
    }

    const groups = opts.requireGroups || [];
    const missingGroups = groups.filter(g => !g.some(w => lower.includes(w.toLowerCase())));
    if(missingGroups.length) reasons.push('missing');

    const safety = opts.requireSafety || [];
    if(safety.length && !safety.some(w => lower.includes(w.toLowerCase()))) reasons.push('safety');

    const bans = (opts.banSnippets || []).map(s => s.toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean);
    for(const ban of bans){
      if(ban.length < 24) continue;
      // reject if student pasted a long chunk of the brief
      if(lower.includes(ban.slice(0, Math.min(48, ban.length)))){
        reasons.push('copy');
        break;
      }
      const words = ban.split(' ').filter(w => w.length > 4);
      const hits = words.filter(w => lower.includes(w)).length;
      if(words.length >= 5 && hits / words.length >= 0.7){
        reasons.push('copy');
        break;
      }
    }
    return { ok: reasons.length === 0, reasons, text };
  }

  async function runOwnPrompt(thread, userInput, sendBtn, opts={}){
    if(opts.brief) addTaskBrief(thread, opts.brief);
    armInput(userInput, sendBtn);

    async function once(){
      return new Promise(resolve => {
        function handler(){
          const text = userInput.value.trim();
          if(!text) return;
          addUserMsg(thread, text);
          userInput.value = '';
          sendBtn.disabled = true;
          sendBtn.removeEventListener('click', handler);
          userInput.removeEventListener('keydown', keyHandler);
          resolve(text);
        }
        function keyHandler(e){
          if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handler(); }
        }
        sendBtn.addEventListener('click', handler);
        userInput.addEventListener('keydown', keyHandler);
      });
    }

    while(true){
      const text = await once();
      const { ok, reasons } = scorePrompt(text, opts);
      if(ok) return { text, matched: true };

      await addThinking(thread, 700);
      let msg;
      if(reasons.includes('reject')){
        msg = opts.clarifyReject || 'Tuo ohjaa väärään suuntaan. Tarvitaan follow-up joka korjaa vain puuttuvan kohdan — ei “jätä tyhjäksi” eikä “aja kaikki uudelleen”.';
      } else if(reasons.includes('copy')){
        msg = opts.clarifyCopy || 'Tuo kuulostaa briiffin tekstiltä. Kirjoita toimeksianto omin sanoin — mitä Clauden pitää tehdä ja mihin kansioon.';
      } else if(reasons.includes('short')){
        msg = opts.clarifyTooShort || 'Liian lyhyt. Kerro kansio/tiedosto, mitä lopputulosta haluat, ja yksi rajaus (mitä Claude EI saa koskea).';
      } else if(reasons.includes('safety')){
        msg = opts.clarifySafety || 'Puuttuu turvarajaus. Mainitse eksplisiittisesti mitä Claude ei saa avata tai ylikirjoittaa (esim. HR / allekirjoitetut).';
      } else {
        msg = opts.clarifyMissing || 'Toimeksianto on vielä vajaa. Tarvitsen työalueen (kansio), tavoitellun lopputuloksen ja riittävästi kontekstia jotta voin rajata työn.';
      }
      await addAssistantMsg(thread, [msg]);
      armInput(userInput, sendBtn);
    }
  }

  async function runSafetyGate(thread, { title, body, safeId='refuse', unsafeId='allow', safeLabel, unsafeLabel, unsafeFeedback }){
    const action = await addCard(thread, {
      title: title || 'Turvallisuus / rajaus',
      body,
      actions: [
        {id: unsafeId, label: unsafeLabel || 'Salli'},
        {id: safeId, label: safeLabel || 'Kieltäydy / rajaa uudelleen', primary:true},
      ],
    });
    if(action === safeId) return { ok:true, action };
    await addAssistantMsg(thread, [unsafeFeedback || 'Se ei ole turvallinen rajaus tässä tilanteessa. Valitse uudelleen — älä avaa arkaluonteista tai allekirjoitettua aineistoa ilman erillistä lupaa.']);
    return runSafetyGate(thread, { title, body, safeId, unsafeId, safeLabel, unsafeLabel, unsafeFeedback });
  }

  /* Valintaruudukko useasta vaihtoehdosta, joista osa on harhautuksia.
     items: [{id, label, sublabel, icon}]. correctIds: täsmälleen oikea joukko.
     Palauttaa vasta kun valinta täsmää — antaa suunnan (liikaa/liian vähän/
     väärä yhdistelmä) muttei koskaan sano mikä yksittäinen valinta on väärin. */
  function addPickerTask(thread, {items, correctIds}){
    const grid = el(`
      <div class="card picker-card">
        <div class="picker-grid"></div>
        <div class="card-actions" style="margin-top:14px;">
          <button class="btn primary" data-role="confirm">Vahvista valinta (<span data-role="count">0</span> valittu)</button>
        </div>
        <div class="quiz-feedback" style="display:none;"></div>
      </div>`);
    const gridEl = grid.querySelector('.picker-grid');
    items.forEach(item => {
      const card = el(`
        <div class="picker-item" data-id="${item.id}">
          <div class="picker-item-icon">${item.icon || ICONS.file}</div>
          <div class="picker-item-label">${item.label}</div>
          ${item.sublabel ? `<div class="picker-item-sub">${item.sublabel}</div>` : ''}
          <div class="picker-item-check">${ICONS.check}</div>
        </div>`);
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        countEl.textContent = gridEl.querySelectorAll('.picker-item.selected').length;
      });
      gridEl.appendChild(card);
    });
    thread.appendChild(grid);
    scrollDown(thread);
    const countEl = grid.querySelector('[data-role="count"]');
    const confirmBtn = grid.querySelector('[data-role="confirm"]');
    const feedback = grid.querySelector('.quiz-feedback');
    let attempts = 0;

    return new Promise(resolve => {
      confirmBtn.addEventListener('click', async function onConfirm(){
        const selectedNodes = [...gridEl.querySelectorAll('.picker-item.selected')];
        const selected = selectedNodes.map(n => n.dataset.id);
        attempts++;
        const correctSet = new Set(correctIds);
        const isCorrect = correctSet.size === selected.length && selected.every(id => correctSet.has(id));
        feedback.style.display = 'block';
        if(isCorrect){
          confirmBtn.disabled = true;
          confirmBtn.removeEventListener('click', onConfirm);
          gridEl.querySelectorAll('.picker-item').forEach(n => n.style.pointerEvents = 'none');
          feedback.style.color = 'var(--green)';
          feedback.textContent = 'Oikea yhdistelmä. Yhdistetään…';
          for(const node of selectedNodes){
            node.classList.add('connecting');
            await wait(350);
            node.classList.remove('connecting');
            node.classList.add('connected');
            await wait(150);
          }
          resolve(selected);
        } else {
          let msg;
          if(selected.length > correctIds.length) msg = 'Valitsit enemmän kuin tehtävä tarvitsee — jokin valituista ei oikeasti liity mihinkään pyydettyyn osaan.';
          else if(selected.length < correctIds.length) msg = 'Valitsit vähemmän kuin tehtävä tarvitsee — tarkista, kattaako valintasi kaikki tehtävän osat.';
          else msg = 'Määrä on oikea, mutta joukossa on ainakin yksi turha ja yksi puuttuva. Lue tehtävä vielä kerran.';
          if(attempts >= 3) msg += ` Vihje: tarvitset täsmälleen ${correctIds.length} yhteyttä.`;
          feedback.textContent = msg;
        }
      });
    });
  }

  /* Odottaa opiskelijan omaa tekstiä composer-kentästä. Ei säädetä oikeaa
     Claudea — tunnistetaan avainsanoja. Jos mikään ei osu, Claude pyytää
     tarkennusta luonnollisesti sen sijaan että harjoitus juuttuisi. */
  function waitForFreeText(thread, userInput, sendBtn, { accept, clarifyText }){
    return new Promise(resolve => {
      function handler(){
        const text = userInput.value.trim();
        if(!text) return;
        addUserMsg(thread, text);
        userInput.value = '';
        sendBtn.disabled = true;
        sendBtn.removeEventListener('click', handler);
        userInput.removeEventListener('keydown', keyHandler);

        const lower = text.toLowerCase();
        const matched = accept.some(word => lower.includes(word));
        resolve({ text, matched, retry: async () => {
          await addThinking(thread, 700);
          await addAssistantMsg(thread, [clarifyText]);
          armInput(userInput, sendBtn);
          return waitForFreeText(thread, userInput, sendBtn, {accept, clarifyText});
        }});
      }
      function keyHandler(e){
        if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handler(); }
      }
      sendBtn.addEventListener('click', handler);
      userInput.addEventListener('keydown', keyHandler);
    });
  }

  /* Käytetään Esimerkki-osiossa: näyttää tekstin ilmestyvän kenttään aivan
     kuin joku kirjoittaisi sitä, lähettää sen itse. Ei odota opiskelijaa —
     esimerkki on demonstraatio, ei harjoitus. */
  async function simulateUserType(thread, userInput, text){
    userInput.disabled = false;
    userInput.value = '';
    for(let i=0;i<text.length;i++){
      userInput.value += text[i];
      if(i % 4 === 0) await wait(12);
    }
    await wait(400);
    addUserMsg(thread, text);
    userInput.value = '';
    userInput.disabled = true;
  }

  function armInput(userInput, sendBtn){
    userInput.disabled = false;
    sendBtn.disabled = true;
    userInput.value = '';
    userInput.focus();
  }

  /* ---------------------------------------------------------------------
     KUORET (SHELLS)
     Jokainen palauttaa kahvat DOM-elementteihin, joita pilari tarvitsee.
     --------------------------------------------------------------------- */

  function renderChatShell(container, { sidebarHighlight, topbarTitle, composerHint }){
    container.innerHTML = `
      <div class="app">
        <div class="sidebar">
          <div class="brand">${CLAUDE_MARK.replace('class="mark"','class="mark" style="width:22px;height:22px"')}<span class="word">Claude</span></div>
          <div class="new-chat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>New chat</div>
          <div class="mode-toggle"><button>Chat</button><button class="active">Cowork</button></div>
          <div class="nav-group">
            <div class="nav-label">Workspace</div>
            <div class="nav-item" data-nav="files">${ICONS.folder}Files &amp; folders</div>
            <div class="nav-item" data-nav="artifacts">${ICONS.chart}Live artifacts</div>
            <div class="nav-item" data-nav="scheduled">${ICONS.clock}Scheduled</div>
            <div class="nav-item" data-nav="dispatch">${ICONS.phone}Dispatch</div>
            <div class="nav-item" data-nav="connectors">${ICONS.calendar}Connectors</div>
          </div>
          <div class="sidebar-footer">
            <div class="avatar-chip">SS</div>
            <div><div class="who">Opiskelija</div><div class="plan">Pro plan</div></div>
          </div>
        </div>
        <div class="main">
          <div class="topbar"><div class="title">${topbarTitle}</div><div class="badge">simulaatio</div></div>
          <div class="thread"></div>
          <div class="composer">
            <div class="composer-box">
              <textarea rows="1" placeholder="Kirjoita viestisi Claudelle…" disabled></textarea>
              <div class="composer-row">
                <div class="composer-mode"><span class="swatch"></span>${composerHint}</div>
                <button class="send-btn" disabled><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
              </div>
            </div>
          </div>
        </div>
        <div class="panel"></div>
      </div>`;
    if(sidebarHighlight){
      const item = container.querySelector(`.nav-item[data-nav="${sidebarHighlight}"]`);
      if(item){ item.classList.add('highlight'); item.insertAdjacentHTML('beforeend', '<span class="pulse"></span>'); }
    }
    const thread = container.querySelector('.thread');
    const panel = container.querySelector('.panel');
    const userInput = container.querySelector('textarea');
    const sendBtn = container.querySelector('.send-btn');
    userInput.addEventListener('input', () => { sendBtn.disabled = userInput.value.trim().length === 0 || userInput.disabled; });
    return { thread, panel, userInput, sendBtn };
  }

  function renderTerminalShell(container, { title }){
    container.innerHTML = `
      <div class="terminal-wrap">
        <div class="terminal-bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span><span class="term-title">${title}</span></div>
        <div class="terminal-body"></div>
        <div class="terminal-input-row">
          <span class="prompt">&gt;</span>
          <textarea rows="1" placeholder="Kuvaile mitä tarvitset…" disabled></textarea>
          <button class="btn primary send-terminal" disabled>Lähetä</button>
        </div>
      </div>`;
    const body = container.querySelector('.terminal-body');
    const userInput = container.querySelector('textarea');
    const sendBtn = container.querySelector('.send-terminal');
    userInput.addEventListener('input', () => { sendBtn.disabled = userInput.value.trim().length === 0 || userInput.disabled; });
    return { body, userInput, sendBtn };
  }

  async function termLine(body, text, cls=''){
    const line = el(`<div class="term-line ${cls}"></div>`);
    body.appendChild(line);
    body.parentElement.scrollTop = body.parentElement.scrollHeight + 400;
    await typeText(line, text, 8);
    return line;
  }

  function renderDesignShell(container, { title }){
    container.innerHTML = `
      <div class="design-wrap">
        <div class="design-topbar">
          <span class="design-title">${title}</span>
          <span class="badge">claude.ai/design — simulaatio</span>
        </div>
        <div class="design-body">
          <div class="design-canvas"></div>
          <div class="design-side">
            <div class="design-side-label">Kommentit</div>
            <div class="design-comments"></div>
          </div>
        </div>
      </div>`;
    return {
      canvas: container.querySelector('.design-canvas'),
      comments: container.querySelector('.design-comments'),
    };
  }

  /* ---------------------------------------------------------------------
     PANEELIT (oikean reunan sisältö chat-kuoressa)
     --------------------------------------------------------------------- */

  function renderScenarioPanel(panel, html){
    panel.innerHTML = `<div class="panel-scenario">${html}</div>`;
  }

  function renderFileExplorerPanel(panel, files, {folderLabel='Downloads'}={}){
    panel.innerHTML = `
      <div class="panel-header">${folderLabel} <span class="path">/ ${files.length} items</span></div>
      <div class="panel-body"><div class="file-grid"></div><div class="folder-row"></div></div>`;
    const grid = panel.querySelector('.file-grid');
    files.forEach(f => {
      const icon = ICONS[f.type] || ICONS.file;
      grid.appendChild(el(`<div class="file-item ${f.type}" data-name="${f.name}">${icon}<span>${f.name}</span></div>`));
    });
    return { grid, folderRow: panel.querySelector('.folder-row') };
  }

  /* Workspace tree: folders + files that can open with real-looking content.
     entries: [{id, kind:'folder'|'file', name, type?, meta?, content?, children?, openable?}] */
  function renderWorkspacePanel(panel, {rootLabel='Workspace', pathHint='', entries=[]}={}){
    const count = countTreeEntries(entries);
    panel.innerHTML = `
      <div class="panel-header">${rootLabel} <span class="path">${pathHint || `/ ${count} items`}</span></div>
      <div class="panel-body">
        <div class="ws-tree" data-role="tree"></div>
        <div class="doc-viewer" data-role="viewer" style="display:none;"></div>
      </div>`;
    const tree = panel.querySelector('[data-role="tree"]');
    const viewer = panel.querySelector('[data-role="viewer"]');
    const state = { entries, rootLabel, pathHint };

    function paint(){
      tree.innerHTML = '';
      renderTreeLevel(tree, state.entries, 0, viewer, state);
    }
    paint();

    return {
      tree, viewer, state,
      refresh(){ paint(); },
      setEntries(next){ state.entries = next; paint(); },
      openFile(id){
        const found = findEntry(state.entries, id);
        if(found) showDocViewer(viewer, tree, found);
      },
      closeViewer(){
        viewer.style.display = 'none';
        viewer.innerHTML = '';
        tree.style.display = '';
      },
      addEntries(parentId, newOnes){
        if(!parentId){
          state.entries = [...state.entries, ...newOnes];
        } else {
          const parent = findEntry(state.entries, parentId);
          if(parent){
            parent.children = [...(parent.children||[]), ...newOnes];
            parent.kind = 'folder';
          }
        }
        paint();
      },
      markActive(id){
        tree.querySelectorAll('.ws-row').forEach(r => r.classList.toggle('active', r.dataset.id === id));
      },
    };
  }

  function countTreeEntries(entries){
    let n = 0;
    (entries||[]).forEach(e => {
      n++;
      if(e.children) n += countTreeEntries(e.children);
    });
    return n;
  }

  function findEntry(entries, id){
    for(const e of entries||[]){
      if(e.id === id) return e;
      if(e.children){
        const hit = findEntry(e.children, id);
        if(hit) return hit;
      }
    }
    return null;
  }

  function renderTreeLevel(host, entries, depth, viewer, state){
    (entries||[]).forEach(entry => {
      const isFolder = entry.kind === 'folder';
      const icon = isFolder ? ICONS.folder : (ICONS[entry.type] || ICONS.file);
      const row = el(`
        <div class="ws-row ${isFolder?'is-folder':'is-file'}" data-id="${entry.id}" style="padding-left:${10 + depth*14}px">
          <span class="ws-icon">${icon}</span>
          <span class="ws-name">${entry.name}</span>
          ${entry.meta ? `<span class="ws-meta">${entry.meta}</span>` : ''}
        </div>`);
      if(entry.kind === 'file' && entry.openable !== false){
        row.classList.add('openable');
        row.title = 'Avaa tiedosto';
        row.addEventListener('click', () => showDocViewer(viewer, host.closest('.panel-body').querySelector('[data-role="tree"]'), {
          ...entry,
          content: entry.content != null ? entry.content : '(Tiedosto avautui — sisältö tyhjä, binäärinen stub tai ei relevantti tälle tehtävälle.)',
        }));
      }
      host.appendChild(row);
      if(isFolder && entry.children && entry.children.length){
        renderTreeLevel(host, entry.children, depth+1, viewer, state);
      }
    });
  }

  function showDocViewer(viewer, tree, entry){
    tree.style.display = 'none';
    viewer.style.display = 'block';
    const gapRe = /(⚠️|NOT FOUND|GAP:|PUUTTUU|MISSING|TBD|VAJA|copy incomplete|ENTRY MISSING|— puuttuu)/i;
    const lines = (entry.content || '(tyhjä)').split('\n');
    const gapLines = [];
    const body = lines.map((line, i) => {
      const isGap = gapRe.test(line);
      if(isGap) gapLines.push({i, line: line.trim()});
      return `<div class="doc-line ${isGap ? 'doc-gap' : ''}" data-line="${i}">${esc(line) || '&nbsp;'}</div>`;
    }).join('');
    const gapBanner = gapLines.length
      ? `<div class="doc-gap-banner">
          <b>Puuttuu / vajaa (${gapLines.length})</b>
          <ul>${gapLines.slice(0, 4).map(g => `<li>${esc(g.line)}</li>`).join('')}</ul>
          <span>Keltaisella korostetut rivit alla — tähän follow-up kohdistuu.</span>
        </div>`
      : '';
    viewer.innerHTML = `
      <div class="doc-bar">
        <button class="btn doc-back" type="button">← Palaa kansioon</button>
        <span class="doc-fname">${entry.name}</span>
        ${gapLines.length ? `<span class="doc-gap-pill">${gapLines.length} vajaa</span>` : ''}
      </div>
      <div class="doc-meta">${entry.meta || 'Paikallinen tiedosto · Cowork'}</div>
      ${gapBanner}
      <div class="doc-body">${body}</div>`;
    viewer.querySelector('.doc-back').addEventListener('click', () => {
      viewer.style.display = 'none';
      viewer.innerHTML = '';
      tree.style.display = '';
    });
    const firstGap = viewer.querySelector('.doc-gap');
    const bodyEl = viewer.querySelector('.doc-body');
    if(firstGap && bodyEl){
      // scroll gap into view inside the doc pane
      setTimeout(() => {
        firstGap.scrollIntoView({block:'center', behavior:'smooth'});
      }, 80);
    }
  }

  function askTextInput(thread, {title, prompt, placeholder, minLength=3, submitLabel='Käytä'}){
    const node = el(`
      <div class="card">
        <div class="card-title">${ICONS.folder}${title || 'Nimeä'}</div>
        <p>${prompt}</p>
        <input class="name-input" type="text" placeholder="${placeholder||''}" />
        <div class="card-actions" style="margin-top:12px;">
          <button class="btn primary" disabled>${submitLabel}</button>
        </div>
      </div>`);
    thread.appendChild(node);
    scrollDown(thread);
    const input = node.querySelector('input');
    const btn = node.querySelector('button');
    input.addEventListener('input', () => { btn.disabled = input.value.trim().length < minLength; });
    input.focus();
    return new Promise(resolve => {
      const done = () => {
        const v = input.value.trim();
        if(v.length < minLength) return;
        input.disabled = true;
        btn.disabled = true;
        resolve(v);
      };
      btn.addEventListener('click', done);
      input.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); done(); } });
    });
  }

  function updateArtifactRows(panel, rows, updatedText){
    const rowsEl = panel.querySelector('.dash-rows');
    if(!rowsEl) return;
    rowsEl.innerHTML = '';
    rows.forEach(r => rowsEl.appendChild(el(`<div class="dash-row"><span>${r.label}</span><b>${r.value}</b></div>`)));
    const upd = panel.querySelector('.dash-updated');
    if(upd) upd.textContent = updatedText || 'Päivitetty juuri nyt';
  }

  async function animateSortIntoFolders(panel, folders){
    const folderRow = panel.querySelector('.folder-row');
    folders.forEach(f => folderRow.appendChild(el(`<div class="folder-item" data-type="${f.type}">${ICONS.folder}<span>${f.name}</span><span class="count">0 tiedostoa</span></div>`)));
    await wait(150);
    panel.querySelectorAll('.folder-item').forEach(f => f.classList.add('show'));
    await wait(400);
    const counts = {};
    folders.forEach(f => counts[f.type] = 0);
    const items = [...panel.querySelectorAll('.file-item')];
    for(const item of items){
      const type = [...item.classList].find(c => folders.some(f=>f.type===c));
      if(type !== undefined) counts[type]++;
      item.classList.add('fading');
      await wait(90);
    }
    await wait(500);
    items.forEach(i => i.remove());
    panel.querySelectorAll('.folder-item').forEach(f => {
      f.querySelector('.count').textContent = counts[f.dataset.type] + ' tiedostoa';
    });
  }

  function renderPhoneDesktopPanel(panel){
    panel.innerHTML = `
      <div class="panel-header">Dispatch <span class="path">phone → desktop</span></div>
      <div class="panel-body phone-desktop">
        <div class="pd-col">
          <div class="pd-frame phone">${ICONS.phone}<span>Puhelin</span><div class="pd-status" data-role="phoneStatus">valmis</div></div>
        </div>
        <div class="pd-arrow">→</div>
        <div class="pd-col">
          <div class="pd-frame desktop" data-role="desktopFrame">${ICONS.desktop}<span>Pöytäkone</span><div class="pd-status" data-role="desktopStatus">hereillä</div></div>
        </div>
        <div class="pd-checklist" data-role="checklist"></div>
      </div>`;
    return {
      desktopFrame: panel.querySelector('[data-role="desktopFrame"]'),
      desktopStatus: panel.querySelector('[data-role="desktopStatus"]'),
      checklist: panel.querySelector('[data-role="checklist"]'),
    };
  }

  async function runChecklist(checklistEl, steps){
    for(const step of steps){
      const item = el(`<div class="checklist-item"><span class="ci-dot"></span>${step}</div>`);
      checklistEl.appendChild(item);
      await wait(650);
      item.classList.add('done');
    }
  }

  function renderArtifactDashboardPanel(panel, {title, rows}){
    panel.innerHTML = `
      <div class="panel-header">${title} <span class="path">Live artifact</span></div>
      <div class="panel-body">
        <div class="dash-card">
          <div class="dash-rows"></div>
          <div class="dash-updated">Päivitetty juuri nyt</div>
        </div>
        <div class="version-row" data-role="versions"></div>
      </div>`;
    const rowsEl = panel.querySelector('.dash-rows');
    rows.forEach(r => rowsEl.appendChild(el(`<div class="dash-row"><span>${r.label}</span><b>${r.value}</b></div>`)));
    return { rowsEl, updatedEl: panel.querySelector('.dash-updated'), versionsEl: panel.querySelector('[data-role="versions"]') };
  }

  function renderCalendarPanel(panel){
    panel.innerHTML = `
      <div class="panel-header">Google Calendar <span class="path">tämä viikko</span></div>
      <div class="panel-body">
        <div class="cal-grid" data-role="calGrid"></div>
      </div>`;
    const grid = panel.querySelector('[data-role="calGrid"]');
    const days = ['Ma','Ti','Ke','To','Pe'];
    days.forEach((d,di) => {
      grid.appendChild(el(`<div class="cal-day-label">${d}</div>`));
    });
    for(let h=0; h<6; h++){
      days.forEach((d,di) => {
        const busy = Math.random() < 0.35;
        grid.appendChild(el(`<div class="cal-slot ${busy?'busy':''}" data-day="${di}" data-hour="${h}"></div>`));
      });
    }
    return { grid };
  }

  function renderNotionPanel(panel){
    panel.innerHTML = `
      <div class="panel-header">Notion <span class="path">Työtila</span></div>
      <div class="panel-body"><div class="notion-list" data-role="list"></div></div>`;
    return { list: panel.querySelector('[data-role="list"]') };
  }

  function renderInboxPanel(panel, emails){
    panel.innerHTML = `
      <div class="panel-header">Gmail <span class="path">Saapuneet</span></div>
      <div class="panel-body"><div class="notion-list" data-role="list"></div></div>`;
    const list = panel.querySelector('[data-role="list"]');
    emails.forEach(e => {
      const item = el(`<div class="notion-item show ${e.relevant?'':'dim'}">${ICONS.mail}<div><div style="font-weight:${e.relevant?600:400}">${e.from}</div><div style="color:#948f7c;font-size:11.5px;">${e.subject}</div></div></div>`);
      list.appendChild(item);
    });
    return { list };
  }

  function renderSkillPanel(panel){
    panel.innerHTML = `
      <div class="panel-header">Skills <span class="path">tallennetut taidot</span></div>
      <div class="panel-body"><div class="skill-list" data-role="list"></div></div>`;
    return { list: panel.querySelector('[data-role="list"]') };
  }

  function renderSchedulePanel(panel){
    panel.innerHTML = `
      <div class="panel-header">Scheduled <span class="path">/schedule</span></div>
      <div class="panel-body"><div class="sched-list" data-role="list"></div></div>`;
    return { list: panel.querySelector('[data-role="list"]') };
  }

  return {
    el, wait, esc, ICONS, CLAUDE_MARK,
    addNarrator, addUserMsg, addThinking, addAssistantMsg, addCard, addQuiz, addReflection, addComplete,
    waitForFreeText, armInput, typeText, scrollDown, simulateUserType,
    addTaskBrief, addPickerTask, runLiveWork, showOutcome, addDeliverable, runPromptStep,
    scorePrompt, runOwnPrompt, runSafetyGate,
    renderChatShell, renderTerminalShell, renderDesignShell, termLine,
    renderScenarioPanel, renderFileExplorerPanel, animateSortIntoFolders,
    renderWorkspacePanel, askTextInput, updateArtifactRows, findEntry,
    renderPhoneDesktopPanel, runChecklist, renderArtifactDashboardPanel,
    renderCalendarPanel, renderNotionPanel, renderInboxPanel, renderSkillPanel, renderSchedulePanel,
  };
})();
