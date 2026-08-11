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
    const rightTitle = brief.outcome ? 'Valmis kun' : 'Mitä teet';
    const rightBody = brief.outcome || brief.task || '';
    const node = el(`
      <div class="card task-brief-card">
        <div class="card-title">${ICONS.page}${brief.title || 'Tehtävä'}</div>
        <div class="tb-grid">
          <div><h4>Tilanne</h4><div class="tb-body">${brief.situation || ''}</div></div>
          <div><h4>${rightTitle}</h4><div class="tb-body">${rightBody}</div></div>
        </div>
        ${brief.job ? `<div class="tb-job"><h4>Tehtäväsi</h4><div class="tb-body">${brief.job}</div></div>` : ''}
        ${brief.folderNote ? `<p class="tb-folder">${brief.folderNote}</p>` : ''}
        ${must ? `<h4>Promptissasi pitää näkyä</h4><ul class="tb-must">${must}</ul>` : ''}
        ${brief.example ? `<div class="tb-example"><span>Vinkki / runko</span><code>${esc(brief.example)}</code></div>` : ''}
        <p class="tb-next">${brief.nextHint || '↓ Kirjoita oma toimeksianto Claudelle — älä kopioi briiffiä sanasta sanaan.'}</p>
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

  /* Design lab: photo asset rail + canvas + tools + right panel */
  function renderDesignLab(container, {
    title = 'Claude Design',
    assetsLabel = 'Uploads',
    assets = [], // [{id, label, meta, thumb?, swatchClass?, selected?}]
    tools = [], // [{id, label, active?}]
    sideLabel = 'Kommentit',
    multiSelect = false,
  } = {}){
    const toolsHtml = (tools || []).map(t =>
      `<button type="button" class="cd-tool ${t.active ? 'active' : ''}" data-tool="${t.id}">${t.label}</button>`
    ).join('');
    const assetsHtml = (assets || []).map(a => `
      <button type="button" class="cd-asset ${a.selected ? 'selected' : ''}" data-asset="${a.id}">
        ${a.thumb
          ? `<img class="cd-asset-thumb img" src="${a.thumb}" alt="">`
          : `<span class="cd-asset-thumb ${a.swatchClass || ''}" aria-hidden="true"></span>`}
        <span class="cd-asset-meta">
          <b>${a.label}</b>
          <small>${a.meta || ''}</small>
        </span>
      </button>`).join('');

    container.innerHTML = `
      <div class="design-wrap design-lab">
        <div class="design-topbar">
          <span class="design-title">${title}</span>
          <div class="cd-tools" data-role="tools">${toolsHtml}</div>
          <span class="badge">claude.ai/design</span>
        </div>
        <div class="design-body design-lab-body">
          <aside class="cd-assets" data-role="assets">
            <div class="design-side-label">${assetsLabel}</div>
            <p class="cd-assets-hint">Valitse kuva (simuloitu upload)</p>
            <div class="cd-asset-list">${assetsHtml}</div>
          </aside>
          <div class="design-canvas" data-role="canvas"></div>
          <div class="design-side">
            <div class="design-side-label" data-role="side-label">${sideLabel}</div>
            <div class="design-comments" data-role="side"></div>
          </div>
        </div>
      </div>`;

    const canvas = container.querySelector('[data-role="canvas"]');
    const side = container.querySelector('[data-role="side"]');
    const sideLabelEl = container.querySelector('[data-role="side-label"]');
    const selected = new Set((assets || []).filter(a => a.selected).map(a => a.id));

    function paintAssets(){
      container.querySelectorAll('.cd-asset').forEach(btn => {
        btn.classList.toggle('selected', selected.has(btn.dataset.asset));
      });
    }

    container.querySelectorAll('.cd-asset').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.asset;
        if(multiSelect){
          if(selected.has(id)) selected.delete(id);
          else selected.add(id);
        } else {
          selected.clear();
          selected.add(id);
        }
        paintAssets();
        container.dispatchEvent(new CustomEvent('cd-asset', { detail: { ids: [...selected] } }));
      });
    });

    container.querySelectorAll('.cd-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cd-tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        container.dispatchEvent(new CustomEvent('cd-tool', { detail: { tool: btn.dataset.tool } }));
      });
    });

    return {
      canvas,
      side,
      comments: side,
      setSideLabel(t){ if(sideLabelEl) sideLabelEl.textContent = t; },
      getSelected(){ return [...selected]; },
      setTool(id){
        container.querySelectorAll('.cd-tool').forEach(b => b.classList.toggle('active', b.dataset.tool === id));
      },
      onAsset(fn){ container.addEventListener('cd-asset', e => fn(e.detail.ids)); },
      onTool(fn){ container.addEventListener('cd-tool', e => fn(e.detail.tool)); },
      root: container.querySelector('.design-lab'),
      /** Show a real photo on the canvas with optional click hotspots */
      showPhoto({src, alt='', hotspots=[], caption='', className=''}={}){
        const pins = (hotspots || []).map((h,i) => `
          <button type="button" class="cd-hotspot" data-hot="${h.id || ('h'+i)}"
            style="left:${h.x}%;top:${h.y}%;" title="${h.label || 'Comment here'}">
            <span>${i+1}</span>
          </button>`).join('');
        canvas.innerHTML = `
          <div class="cd-photo-stage ${className}">
            ${caption ? `<p class="cd-photo-cap">${caption}</p>` : ''}
            <div class="cd-photo-frame">
              <img src="${src}" alt="${alt || ''}">
              ${pins}
            </div>
          </div>`;
        return canvas.querySelector('.cd-photo-frame');
      },
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

  /* Situation phone — lock-screen + scene atmosphere */
  const DISPATCH_SCENES = {
    airport: {
      title: 'Airport gate',
      sub: 'Boarding now · Gate B12',
      clock: '14:57',
      art: `<svg class="dh-art" viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="skyA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7eb6d9"/><stop offset="55%" stop-color="#c9dce8"/><stop offset="100%" stop-color="#e8e2d4"/></linearGradient></defs><rect width="320" height="120" fill="url(#skyA)"/><path d="M0 88 L40 70 L70 78 L110 55 L150 72 L190 48 L230 68 L270 52 L320 74 L320 120 L0 120Z" fill="#2a3538" opacity=".35"/><path d="M0 98 H320 V120 H0Z" fill="#1e2628"/><rect x="40" y="62" width="90" height="36" rx="2" fill="#243033"/><rect x="48" y="70" width="18" height="12" fill="#8ec8e8" opacity=".5"/><rect x="72" y="70" width="18" height="12" fill="#8ec8e8" opacity=".35"/><rect x="96" y="70" width="18" height="12" fill="#8ec8e8" opacity=".5"/><g transform="translate(210,40)"><ellipse cx="28" cy="22" rx="36" ry="8" fill="#1a1a18"/><path d="M-10 18 L70 18 L78 22 L70 26 L-10 26 Z" fill="#2c2c2a"/><path d="M20 10 L48 18 L20 18Z" fill="#3a3a38"/><circle cx="8" cy="26" r="3" fill="#e0783c"/></g><text x="16" y="28" fill="#1c1b18" font-size="11" font-family="Poppins,sans-serif" font-weight="600" opacity=".55">DEPARTURES</text></svg>`,
    },
    taxi: {
      title: 'In a taxi',
      sub: 'En route · partner meeting',
      clock: '08:41',
      art: `<svg class="dh-art" viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="skyT" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3d4a5c"/><stop offset="50%" stop-color="#6a7a8a"/><stop offset="100%" stop-color="#c4a882"/></linearGradient></defs><rect width="320" height="120" fill="url(#skyT)"/><rect x="0" y="78" width="320" height="42" fill="#2a2a28"/><rect x="0" y="92" width="320" height="6" fill="#e0b95a" opacity=".35"/><g opacity=".4"><rect x="20" y="40" width="28" height="40" fill="#1a1a18"/><rect x="60" y="28" width="36" height="52" fill="#1a1a18"/><rect x="110" y="36" width="24" height="44" fill="#1a1a18"/><rect x="250" y="30" width="40" height="50" fill="#1a1a18"/></g><g transform="translate(100,58)"><rect x="0" y="12" width="110" height="28" rx="6" fill="#e0b95a"/><rect x="18" y="0" width="70" height="20" rx="4" fill="#d4a84a"/><rect x="24" y="4" width="22" height="12" rx="2" fill="#7eb6d9" opacity=".7"/><rect x="52" y="4" width="22" height="12" rx="2" fill="#7eb6d9" opacity=".5"/><circle cx="22" cy="40" r="8" fill="#1a1a18"/><circle cx="88" cy="40" r="8" fill="#1a1a18"/><rect x="42" y="16" width="24" height="6" rx="1" fill="#1a1a18" opacity=".35"/></g><circle cx="280" cy="24" r="14" fill="#f0d090" opacity=".55"/></svg>`,
    },
    dinner: {
      title: 'Industry dinner',
      sub: 'Noisy table · competitor just spoke',
      clock: '19:22',
      art: `<svg class="dh-art" viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a221c"/><stop offset="100%" stop-color="#4a3a2e"/></linearGradient></defs><rect width="320" height="120" fill="url(#skyD)"/><ellipse cx="160" cy="95" rx="120" ry="28" fill="#1a1510" opacity=".6"/><ellipse cx="160" cy="88" rx="90" ry="18" fill="#3a2e24"/><circle cx="100" cy="70" r="16" fill="#5a4030" opacity=".5"/><circle cx="160" cy="62" r="18" fill="#5a4030" opacity=".55"/><circle cx="220" cy="70" r="16" fill="#5a4030" opacity=".5"/><circle cx="130" cy="82" r="5" fill="#e0783c" opacity=".7"/><circle cx="160" cy="78" r="6" fill="#e0b95a" opacity=".8"/><circle cx="190" cy="82" r="5" fill="#e0783c" opacity=".6"/><rect x="148" y="40" width="24" height="8" rx="2" fill="#e0b95a" opacity=".25"/><text x="16" y="28" fill="#e8dcc8" font-size="11" font-family="Poppins,sans-serif" font-weight="600" opacity=".4">LIVE PRESS DROP</text></svg>`,
    },
    convention: {
      title: 'Convention floor',
      sub: 'Between sessions · loud hall',
      clock: '11:08',
      art: `<svg class="dh-art" viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="skyC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8eef2"/><stop offset="100%" stop-color="#d0d8e0"/></linearGradient></defs><rect width="320" height="120" fill="url(#skyC)"/><rect x="0" y="70" width="320" height="50" fill="#b8c0c8"/><g opacity=".55"><rect x="20" y="35" width="50" height="40" rx="3" fill="#3a6ea5"/><rect x="85" y="28" width="55" height="47" rx="3" fill="#c45c3a"/><rect x="155" y="38" width="48" height="37" rx="3" fill="#3d7a4a"/><rect x="220" y="30" width="60" height="45" rx="3" fill="#6a5a9a"/></g><g fill="#2a2a28" opacity=".35"><circle cx="45" cy="95" r="6"/><circle cx="70" cy="98" r="5"/><circle cx="140" cy="94" r="6"/><circle cx="200" cy="97" r="5"/><circle cx="260" cy="95" r="6"/></g><text x="16" y="22" fill="#3a3830" font-size="10" font-family="Poppins,sans-serif" font-weight="700" opacity=".45">HALL B · BOOTHS</text></svg>`,
    },
    boardroom: {
      title: 'Outside boardroom',
      sub: 'Door opens in minutes',
      clock: '09:58',
      art: `<svg class="dh-art" viewBox="0 0 320 120" aria-hidden="true"><defs><linearGradient id="skyB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e6e2d8"/><stop offset="100%" stop-color="#cfc9ba"/></linearGradient></defs><rect width="320" height="120" fill="url(#skyB)"/><rect x="90" y="20" width="140" height="100" fill="#8a8478"/><rect x="105" y="32" width="110" height="88" fill="#5a564c"/><rect x="118" y="48" width="36" height="55" rx="2" fill="#3a3830"/><rect x="162" y="48" width="36" height="55" rx="2" fill="#3a3830"/><circle cx="150" cy="78" r="3" fill="#e0b95a"/><rect x="0" y="100" width="320" height="20" fill="#b0aaa0"/><text x="16" y="28" fill="#3a3830" font-size="11" font-family="Poppins,sans-serif" font-weight="600" opacity=".4">FLOOR 12 · WAITING</text></svg>`,
    },
  };

  function renderDispatchHud(host, opts={}){
    const {
      scene = 'airport',
      location,
      battery = 12,
      timeLeft = '3 min',
      note,
      signal = 2,
      /** Incoming phone content students must use in the Dispatch prompt */
      sms = null, // {from, body, hint?}
      /** Plain-language question the student should get answered (no jargon assumed) */
      mission = null, // string
    } = opts;
    const sc = DISPATCH_SCENES[scene] || DISPATCH_SCENES.airport;
    const bat = Math.max(0, Math.min(100, Number(battery) || 0));
    const batWarn = bat <= 15;
    const batCrit = bat <= 8;
    const place = location || `${sc.title} · ${sc.sub}`;
    const bars = [1,2,3,4].map(i =>
      `<span class="dh-sig-bar ${i <= signal ? 'on' : ''}"></span>`
    ).join('');

    const smsBlock = sms ? `
      <div class="dh-sms">
        <div class="dh-sms-head">
          <span class="dh-sms-badge">New message</span>
          <span class="dh-sms-from">${sms.from || 'Unknown'}</span>
        </div>
        <p class="dh-sms-body">${sms.body}</p>
        <p class="dh-sms-hint">${sms.hint || 'Copy this into your Dispatch prompt — Claude on the desktop has the files.'}</p>
      </div>` : '';

    const node = el(`
      <div class="dispatch-hud scene-${scene}${batWarn ? ' bat-low' : ''}${batCrit ? ' bat-crit' : ''}${sms ? ' has-sms' : ''}">
        <div class="dh-scene" aria-hidden="true">${sc.art}</div>
        <div class="dh-overlay">
          <div class="dh-phone">
            <div class="dh-status-bar">
              <span class="dh-clock">${sc.clock}</span>
              <span class="dh-sig" title="Signal">${bars}</span>
              <span class="dh-bat ${batWarn?'warn':''}" title="Battery">
                <span class="dh-bat-body"><span class="dh-bat-fill" style="width:${bat}%"></span></span>
                <span class="dh-bat-cap"></span>
                <span class="dh-bat-pct">${bat}%</span>
              </span>
            </div>
            <div class="dh-lock">
              <div class="dh-place">
                <span class="dh-pin" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </span>
                <div>
                  <div class="dh-place-title">${sc.title}</div>
                  <div class="dh-place-sub">${place}</div>
                </div>
              </div>
              <div class="dh-meters">
                <div class="dh-meter warn">
                  <div class="dh-meter-k">Time left</div>
                  <div class="dh-meter-v dh-countdown">${timeLeft}</div>
                  <div class="dh-meter-bar"><span style="width:${batCrit?92:batWarn?78:55}%"></span></div>
                </div>
                <div class="dh-meter ${batWarn?'warn':''}">
                  <div class="dh-meter-k">Phone battery</div>
                  <div class="dh-meter-v">${bat}%${batWarn ? ' · dying' : ''}</div>
                  <div class="dh-meter-bar bat"><span style="width:${bat}%"></span></div>
                </div>
              </div>
              ${smsBlock}
              ${mission ? `<div class="dh-mission"><span class="dh-mission-k">Ask Claude this</span><p>${mission}</p></div>` : ''}
              ${note ? `<div class="dh-alert"><span class="dh-alert-dot"></span><p>${note}</p></div>` : ''}
              <div class="dh-link-row">
                <span class="dh-link-ok"></span>
                Desktop awake · Dispatch ready
              </div>
            </div>
          </div>
        </div>
      </div>`);
    host.appendChild(node);
    return node;
  }

  /* Right panel: desktop awake + peekable local files + live checklist */
  function renderDispatchDesktopPanel(panel, {folderLabel='Desktop', pathHint='', files=[], desktopOk=true}={}){
    const entries = files.map((f,i) => ({
      id: f.id || ('df'+i),
      kind: 'file',
      name: f.name,
      type: f.type || 'doc',
      meta: f.meta || 'peek',
      content: f.content || '(tyhjä)',
      openable: true,
    }));
    panel.innerHTML = `
      <div class="panel-header">Desktop <span class="path">${desktopOk ? 'awake · paired' : 'offline'}</span></div>
      <div class="panel-body">
        <div class="dd-status ${desktopOk?'ok':'off'}">${ICONS.desktop}<span>${desktopOk ? 'Claude Desktop hereillä — voit Dispatchata' : 'Ei yhteyttä pöytäkoneeseen'}</span></div>
        <div class="dd-folder-label">${folderLabel} <span>${pathHint || ''}</span></div>
        <p class="dd-peek-hint">Klikkaa tiedostoa → kurkista sisältö (tiedät mitä Claudella on käytössä).</p>
        <div class="ws-tree" data-role="tree"></div>
        <div class="doc-viewer" data-role="viewer" style="display:none;"></div>
        <div class="pd-checklist" data-role="checklist" style="margin-top:12px;"></div>
      </div>`;
    const tree = panel.querySelector('[data-role="tree"]');
    const viewer = panel.querySelector('[data-role="viewer"]');
    const state = { entries };
    function paint(){
      tree.innerHTML = '';
      renderTreeLevel(tree, state.entries, 0, viewer, state);
    }
    paint();
    return {
      checklist: panel.querySelector('[data-role="checklist"]'),
      tree, viewer, state,
      openFile(id){
        const found = findEntry(state.entries, id);
        if(found) showDocViewer(viewer, tree, found);
      },
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

  /* Immersive scene strip above the Cowork shell (exercise context) */
  function renderArtifactScene(container, {
    scene = 'travel',
    kicker = 'Live Artifact lab',
    title = '',
    sub = '',
    chips = [],
  } = {}){
    const chipHtml = (chips || []).map(c => `<span class="la-scene-chip">${c}</span>`).join('');
    const node = el(`
      <div class="la-scene scene-${scene}">
        <div class="la-scene-veil">
          <p class="la-scene-kicker">${kicker}</p>
          <h3 class="la-scene-title">${title}</h3>
          <p class="la-scene-sub">${sub}</p>
          ${chipHtml ? `<div class="la-scene-chips">${chipHtml}</div>` : ''}
        </div>
      </div>`);
    if(container.firstChild) container.insertBefore(node, container.firstChild);
    else container.appendChild(node);
    return node;
  }

  /* After building: left = Live Artifact app, right = local file + guided edits */
  function openLiveArtifactLab(container, {
    scene = 'travel',
    artifactTitle = 'Live artifact',
    artifactSub = 'Linked to local file',
    fileName = 'local.txt',
    fileMeta = 'local · Cowork',
    fileContent = '',
    artifactHTML = '',
    edits = [],
    hint = 'Muuta paikallista tiedostoa — Live Artifact vasemmalla päivittyy heti.',
  } = {}){
    const app = container.querySelector('.app');
    const main = container.querySelector('.main');
    const panel = container.querySelector('.panel');
    if(!app || !main || !panel) return null;
    app.classList.add('la-lab-mode', `scene-${scene}`);

    main.innerHTML = `
      <div class="la-app-chrome">
        <div class="la-app-dots" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="la-app-meta">
          <span class="la-app-live">LIVE</span>
          <div>
            <div class="la-app-title">${artifactTitle}</div>
            <div class="la-app-sub">${artifactSub}</div>
          </div>
        </div>
        <div class="la-app-tab">Live artifacts</div>
      </div>
      <div class="la-art-host scene-${scene}" data-role="art">${artifactHTML}</div>
      <div class="la-lab-sync" data-role="sync">
        <span class="la-sync-dot"></span>
        Synkassa paikallisen tiedoston kanssa — muuta tiedostoa oikealla
      </div>
      <div class="thread la-lab-thread" data-role="lab-thread"></div>`;

    panel.innerHTML = `
      <div class="la-file-chrome">
        <div class="la-file-badge">LOCAL FILE</div>
        <div>
          <div class="la-file-name">${fileName}</div>
          <div class="la-file-meta">${fileMeta}</div>
        </div>
      </div>
      <div class="panel-body la-file-body">
        <p class="la-file-hint">${hint}</p>
        <div class="la-file-window">
          <div class="la-file-window-bar">
            <span>${fileName}</span>
            <span class="la-file-unsaved">saved</span>
          </div>
          <pre class="la-file-editor" data-role="file"></pre>
        </div>
        <div class="la-edits-label">Simuloi muutos tiedostoon</div>
        <div class="la-edits" data-role="edits"></div>
        <div class="la-flow-hint">
          <span>1. Muuta tiedosto</span>
          <span class="arrow">→</span>
          <span>2. Artifact päivittyy</span>
        </div>
      </div>`;

    const artHost = main.querySelector('[data-role="art"]');
    const fileEl = panel.querySelector('[data-role="file"]');
    const editsHost = panel.querySelector('[data-role="edits"]');
    const syncEl = main.querySelector('[data-role="sync"]');
    const thread = main.querySelector('[data-role="lab-thread"]');
    const unsaved = panel.querySelector('.la-file-unsaved');
    fileEl.textContent = fileContent;

    let settle;
    const whenEdited = new Promise(r => { settle = r; });

    function paintEdit(edit){
      unsaved.textContent = 'saving…';
      unsaved.classList.add('busy');
      fileEl.textContent = edit.fileContent;
      fileEl.classList.remove('flash');
      void fileEl.offsetWidth;
      fileEl.classList.add('flash');
      setTimeout(() => {
        unsaved.textContent = 'saved';
        unsaved.classList.remove('busy');
        artHost.innerHTML = edit.artifactHTML;
        artHost.classList.remove('la-art-refresh');
        void artHost.offsetWidth;
        artHost.classList.add('la-art-refresh');
        syncEl.innerHTML = `<span class="la-sync-dot on"></span> ${edit.syncNote || 'Artifact päivitetty tiedoston muutoksesta'}`;
        syncEl.classList.add('pulse');
      }, 280);
      [...editsHost.querySelectorAll('button')].forEach(b => {
        if(b.dataset.id === edit.id){
          b.disabled = true;
          b.textContent = '✓ Käytetty';
        }
      });
    }

    (edits || []).forEach(edit => {
      const btn = el(`<button type="button" class="btn la-edit-btn ${edit.primary === false ? '' : 'primary'}" data-id="${edit.id}">
        <span class="la-edit-k">Edit file</span>
        <span class="la-edit-v">${edit.label}</span>
      </button>`);
      btn.addEventListener('click', () => {
        paintEdit(edit);
        settle(edit.id);
      });
      editsHost.appendChild(btn);
    });

    return { artHost, fileEl, thread, whenEdited, applyEdit: paintEdit };
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
    renderChatShell, renderTerminalShell, renderDesignShell, renderDesignLab, termLine,
    renderScenarioPanel, renderFileExplorerPanel, animateSortIntoFolders,
    renderWorkspacePanel, askTextInput, updateArtifactRows, findEntry,
    renderPhoneDesktopPanel, renderDispatchHud, renderDispatchDesktopPanel, runChecklist, renderArtifactDashboardPanel, renderArtifactScene, openLiveArtifactLab,
    renderCalendarPanel, renderNotionPanel, renderInboxPanel, renderSkillPanel, renderSchedulePanel,
  };
})();
