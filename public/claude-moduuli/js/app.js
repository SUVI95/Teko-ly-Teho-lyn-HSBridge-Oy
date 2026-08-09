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

  let currentPillar = pillars[0];
  let currentSection = 'theory'; // 'theory' | 'briefing' | 'example' | number
  const doneMap = {};

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
    highlightPillarNav();
    buildSubNav();
    render();
  }

  function buildSubNav(){
    subNavEl.innerHTML = '';
    const theoryBtn = Engine.el(`<button class="sub-pill" data-sec="theory"><span class="dot"></span>Teoria</button>`);
    theoryBtn.addEventListener('click', () => { currentSection = 'theory'; render(); });
    subNavEl.appendChild(theoryBtn);

    if(hasBriefing()){
      const label = currentPillar.briefingLabel || 'Malli';
      const briefBtn = Engine.el(`<button class="sub-pill" data-sec="briefing"><span class="dot"></span>${label}</button>`);
      briefBtn.addEventListener('click', () => { currentSection = 'briefing'; render(); });
      subNavEl.appendChild(briefBtn);
    }

    const exBtn = Engine.el(`<button class="sub-pill" data-sec="example"><span class="dot"></span>Esimerkki</button>`);
    exBtn.addEventListener('click', () => { currentSection = 'example'; render(); });
    subNavEl.appendChild(exBtn);

    currentPillar.exercises.forEach((ex, i) => {
      const btn = Engine.el(`<button class="sub-pill" data-sec="ex-${i}"><span class="dot"></span>${ex.label}</button>`);
      btn.addEventListener('click', () => { currentSection = i; render(); });
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
      currentSection = hasBriefing() ? 'briefing' : 'example';
      render();
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
      goToExample: () => { currentSection = 'example'; render(); },
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
    const ex = currentPillar.exercises[i];
    const header = renderPracticeHeader(ex.label, false);
    const stage = Engine.el('<div></div>');
    practiceAreaEl.appendChild(header);
    practiceAreaEl.appendChild(stage);
    await ex.run(stage);
    doneMap[currentPillar.id + ':' + i] = true;
    highlightSubNav();
  }

  function render(){
    highlightSubNav();
    if(currentSection === 'theory') renderTheory();
    else if(currentSection === 'briefing') renderBriefing();
    else if(currentSection === 'example') renderExample();
    else renderExercise(currentSection);
  }

  buildPillarNav();
  buildSubNav();
  render();
})();
