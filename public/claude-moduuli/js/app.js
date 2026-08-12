/* =============================================================================
   APP.JS — kurssin navigointi ja näkymän vaihto.
   Ei tunne yhdenkään pilarin sisältöä — lukee kaiken window.PILLARS-listalta.
   Optional: pillar.briefing(container) → screen between Teoria and Esimerkki.
   ============================================================================= */

(() => {
  const pillars = window.PILLARS.slice().sort((a,b) => a.num - b.num);
  const pillarNavEl = document.getElementById('pillarNav');
  const subNavEl = document.getElementById('subNav');
  const theoryViewEl = document.getElementById('theoryView');
  const practiceAreaEl = document.getElementById('practiceArea');
  const query = new URLSearchParams(window.location.search);
  const requestedPillar = Number(query.get('pillar'));
  const COURSE_STORAGE_KEY = 'claude101CourseProgressV1';
  const COURSE_WORK_ID = 'moduuli-claude-course-progress';
  const explicitLocation = query.has('pillar') || query.has('section');
  let remoteSaveTimer = null;
  let exerciseCompletionObserver = null;

  function loadCourseProgress(){
    try {
      const parsed = JSON.parse(localStorage.getItem(COURSE_STORAGE_KEY) || 'null');
      return parsed && parsed.version === 1 ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function validSection(pillar, section){
    if(['theory','briefing','example'].includes(section)) {
      if(section === 'briefing' && typeof pillar.briefing !== 'function') return 'theory';
      return section;
    }
    const index = Number(section);
    return Number.isInteger(index) && index >= 0 && index < pillar.exercises.length ? index : 'theory';
  }

  const savedCourse = loadCourseProgress();
  const savedPillar = pillars.find(p => p.id === savedCourse?.currentPillarId);
  let currentPillar = pillars.find(p => p.num === requestedPillar) || savedPillar || pillars[0];
  let currentSection = query.get('section') === 'studio' && currentPillar.exercises.length
    ? 0
    : validSection(currentPillar, savedCourse?.currentPillarId === currentPillar.id ? savedCourse?.currentSection : 'theory');
  const doneMap = { ...(savedCourse?.doneMap || {}) };
  const autosaveStatusEl = Engine.el('<div class="course-autosave-status"><span></span>Tallennetaan automaattisesti</div>');
  subNavEl.insertAdjacentElement('afterend', autosaveStatusEl);

  function coursePayload(){
    return {
      version: 1,
      currentPillarId: currentPillar.id,
      currentSection,
      doneMap: { ...doneMap },
      ts: Date.now()
    };
  }

  function saveCourseProgress(){
    const payload = coursePayload();
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
    autosaveStatusEl.classList.add('saved');
    autosaveStatusEl.innerHTML = '<span></span>Tallennettu automaattisesti';
    if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      remoteSaveTimer = null;
      if(!window.moduleWork || typeof window.moduleWork.saveModuleWork !== 'function') return;
      const completed = Object.values(doneMap).filter(Boolean).length;
      window.moduleWork.saveModuleWork(COURSE_WORK_ID, payload, `Claude 101 · ${completed} harjoitusta suoritettu`).catch(() => {});
    }, 500);
  }

  function setSection(section){
    currentSection = validSection(currentPillar, section);
    saveCourseProgress();
    render();
  }

  function markExerciseDone(pillarId, index){
    const key = pillarId + ':' + index;
    if(doneMap[key]) return;
    doneMap[key] = true;
    saveCourseProgress();
    highlightSubNav();
  }

  function hasBriefing(){
    return typeof currentPillar.briefing === 'function';
  }

  function buildPillarNav(){
    pillarNavEl.innerHTML = '';
    pillars.forEach(p => {
      const pill = Engine.el(`<button class="pillar-pill"><span class="n">${p.num}</span>${p.name}</button>`);
      pill.addEventListener('click', () => selectPillar(p));
      pillarNavEl.appendChild(pill);
    });
    highlightPillarNav();
  }
  function highlightPillarNav(){
    [...pillarNavEl.children].forEach((el2,i) => el2.classList.toggle('active', pillars[i].id === currentPillar.id));
  }

  function selectPillar(p){
    currentPillar = p;
    currentSection = 'theory';
    saveCourseProgress();
    highlightPillarNav();
    buildSubNav();
    render();
  }

  function buildSubNav(){
    subNavEl.innerHTML = '';
    const theoryBtn = Engine.el(`<button class="sub-pill" data-sec="theory"><span class="dot"></span>Teoria</button>`);
    theoryBtn.addEventListener('click', () => setSection('theory'));
    subNavEl.appendChild(theoryBtn);

    if(hasBriefing()){
      const label = currentPillar.briefingLabel || 'Malli';
      const briefBtn = Engine.el(`<button class="sub-pill" data-sec="briefing"><span class="dot"></span>${label}</button>`);
      briefBtn.addEventListener('click', () => setSection('briefing'));
      subNavEl.appendChild(briefBtn);
    }

    const exBtn = Engine.el(`<button class="sub-pill" data-sec="example"><span class="dot"></span>Esimerkki</button>`);
    exBtn.addEventListener('click', () => setSection('example'));
    subNavEl.appendChild(exBtn);

    currentPillar.exercises.forEach((ex, i) => {
      const btn = Engine.el(`<button class="sub-pill" data-sec="ex-${i}"><span class="dot"></span>${ex.label}</button>`);
      btn.addEventListener('click', () => setSection(i));
      subNavEl.appendChild(btn);
    });
    highlightSubNav();
  }

  function highlightSubNav(){
    const children = [...subNavEl.children];
    children.forEach(c => c.classList.remove('active'));
    const key = typeof currentSection === 'number' ? `ex-${currentSection}` : currentSection;
    const active = children.find(c => c.dataset.sec === key);
    if(active) active.classList.add('active');

    currentPillar.exercises.forEach((ex,i) => {
      const btn = children.find(c => c.dataset.sec === `ex-${i}`);
      if(btn && doneMap[currentPillar.id + ':' + i]) btn.classList.add('done');
    });
  }

  function renderTheory(){
    const t = currentPillar.theory;
    theoryViewEl.style.display = 'block';
    practiceAreaEl.style.display = 'none';
    const caps = Array.isArray(t.capabilities) && t.capabilities.length
      ? `<div class="theory-caps">
          ${t.capabilities.map(c => `
            <div class="theory-cap">
              <h4>${c.title}</h4>
              <p>${c.body}</p>
            </div>`).join('')}
        </div>`
      : '';
    const nextLabel = hasBriefing()
      ? `Seuraava: ${currentPillar.briefingLabel || 'Malli'} →`
      : 'Katso esimerkki →';
    theoryViewEl.innerHTML = `
      <div class="theory-card">
        <h2>${currentPillar.num}. ${currentPillar.name}</h2>
        <div class="theory-tagline">${t.tagline}</div>
        ${caps}
        <div class="theory-grid">
          <div class="theory-block"><h3>Mitä se tekee</h3><p>${t.whatItDoes}</p></div>
          <div class="theory-block"><h3>Miten se toimii</h3><p>${t.howItWorks}</p></div>
          <div class="theory-block"><h3>Mitä saat siitä</h3><p>${t.benefits}</p></div>
          <div class="theory-block"><h3>Milloin käytät</h3><p>${t.whereToUse}</p></div>
        </div>
        <button type="button" class="btn primary theory-example-btn" id="goNextFromTheory">${nextLabel}</button>
      </div>`;
    document.getElementById('goNextFromTheory').addEventListener('click', () => {
      setSection(hasBriefing() ? 'briefing' : 'example');
    });
  }

  function renderPracticeHeader(label, showReplay){
    return Engine.el(`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:13px;color:#5a5850;">${label}</div>
        ${showReplay ? '<button class="btn" id="replayBtn">↺ Toista</button>' : ''}
      </div>`);
  }

  async function renderBriefing(){
    theoryViewEl.style.display = 'none';
    practiceAreaEl.style.display = 'block';
    practiceAreaEl.innerHTML = '';
    const stage = Engine.el('<div class="briefing-stage"></div>');
    practiceAreaEl.appendChild(stage);
    await currentPillar.briefing(stage, {
      goToExample: () => setSection('example'),
    });
  }

  async function renderExample(){
    theoryViewEl.style.display = 'none';
    practiceAreaEl.style.display = 'block';
    practiceAreaEl.innerHTML = '';
    const header = renderPracticeHeader('Esimerkki — katso, sitten kokeile itse harjoituksissa', true);
    const stage = Engine.el('<div></div>');
    practiceAreaEl.appendChild(header);
    practiceAreaEl.appendChild(stage);
    async function play(){
      stage.innerHTML = '';
      await currentPillar.example(stage);
    }
    header.querySelector('#replayBtn').addEventListener('click', play);
    play();
  }

  async function renderExercise(i){
    theoryViewEl.style.display = 'none';
    practiceAreaEl.style.display = 'block';
    practiceAreaEl.innerHTML = '';
    const pillarId = currentPillar.id;
    const ex = currentPillar.exercises[i];
    const header = renderPracticeHeader(ex.label, false);
    const stage = Engine.el('<div></div>');
    practiceAreaEl.appendChild(header);
    practiceAreaEl.appendChild(stage);
    const observer = new MutationObserver(() => {
      if(stage.querySelector('.narrator.done')){
        markExerciseDone(pillarId, i);
        observer.disconnect();
        if(exerciseCompletionObserver === observer) exerciseCompletionObserver = null;
      }
    });
    exerciseCompletionObserver = observer;
    observer.observe(stage, { childList: true, subtree: true });
    await ex.run(stage);
    if(stage.querySelector('.narrator.done')){
      markExerciseDone(pillarId, i);
      observer.disconnect();
      if(exerciseCompletionObserver === observer) exerciseCompletionObserver = null;
    }
  }

  function render(){
    if(exerciseCompletionObserver){
      exerciseCompletionObserver.disconnect();
      exerciseCompletionObserver = null;
    }
    practiceAreaEl.dataset.autosaveScope = currentPillar.id + ':' + String(currentSection);
    highlightSubNav();
    saveCourseProgress();
    if(currentSection === 'theory') renderTheory();
    else if(currentSection === 'briefing') renderBriefing();
    else if(currentSection === 'example') renderExample();
    else renderExercise(currentSection);
  }

  buildPillarNav();
  buildSubNav();
  render();

  (async function hydrateCourseProgress(attempt = 0){
    if(!window.moduleWork || typeof window.moduleWork.loadModuleWork !== 'function'){
      if(attempt < 30) setTimeout(() => hydrateCourseProgress(attempt + 1), 100);
      return;
    }
    try {
      const remote = await window.moduleWork.loadModuleWork(COURSE_WORK_ID);
      if(!remote || remote.version !== 1) return;
      Object.assign(doneMap, remote.doneMap || {});
      if(!explicitLocation && Number(remote.ts || 0) > Number(savedCourse?.ts || 0)){
        const pillar = pillars.find(p => p.id === remote.currentPillarId);
        if(pillar){
          currentPillar = pillar;
          currentSection = validSection(pillar, remote.currentSection);
          highlightPillarNav();
          buildSubNav();
          render();
          return;
        }
      }
      highlightSubNav();
      saveCourseProgress();
    } catch (_) {}
  })();
})();
