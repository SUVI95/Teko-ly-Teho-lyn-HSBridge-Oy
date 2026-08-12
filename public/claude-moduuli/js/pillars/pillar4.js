window.PILLARS = window.PILLARS || [];

(() => {
  const STORAGE_KEY = 'claudeDesignStudioV2';
  const MODULE_ID = 'moduuli-claude';
  let remoteSaveTimer = null;
  const PROJECTS = {
    service: {
      icon: '↗',
      name: 'Ammatillinen palvelusivu',
      short: 'Tee omasta osaamisesta selkeä ja uskottava palvelu.',
      subjectLabel: 'Palvelu tai osaaminen',
      subjectPlaceholder: 'Esim. taloushallinnon konsultointi pienyrityksille',
      audiencePlaceholder: 'Esim. 5–30 hengen yritysten omistajat',
      context: 'Sinulla on osaamista, mutta ei vielä sivua, joka kertoo nopeasti kenelle palvelu sopii ja miksi siihen kannattaa luottaa.',
      result: 'Toimiva laskeutumissivu, jossa on selkeä lupaus, palvelut, näyttö, toimintakehotus ja usein kysytyt kysymykset.'
    },
    event: {
      icon: '◇',
      name: 'Tapahtuman kampanjasivu',
      short: 'Muuta tapahtuman tiedot houkuttelevaksi kokonaisuudeksi.',
      subjectLabel: 'Tapahtuma',
      subjectPlaceholder: 'Esim. Työelämän tekoälyilta Kuopiossa',
      audiencePlaceholder: 'Esim. alanvaihtajat ja pienyrittäjät',
      context: 'Tapahtuman tiedot ovat hajallaan. Osallistujan pitää ymmärtää yhdellä silmäyksellä, kenelle tapahtuma on, mitä siellä tapahtuu ja miten mukaan pääsee.',
      result: 'Yhden sivun kampanja, jossa ovat lupaus, ohjelma, puhujat, käytännön tiedot ja ilmoittautuminen.'
    },
    pitch: {
      icon: '▤',
      name: 'Viiden dian myyntiesitys',
      short: 'Tiivistä idea tarinaksi, jonka toinen ihminen muistaa.',
      subjectLabel: 'Idea tai ratkaisu',
      subjectPlaceholder: 'Esim. palvelu, joka auttaa työnhakijaa näyttämään osaamisensa',
      audiencePlaceholder: 'Esim. yhteistyökumppanit ja rahoittajat',
      context: 'Sinulla on hyvä idea, mutta sen arvo ei vielä välity. Tarvitset esityksen, joka etenee ongelmasta ratkaisuun ja päättyy selvään seuraavaan askeleeseen.',
      result: 'Viiden dian esitys: ongelma, ratkaisu, näyttö, tarjous ja seuraava askel.'
    }
  };

  const DEFAULT_EXAMPLE = {
    project: 'service',
    direction: {
      name: 'Rauhallinen asiantuntija',
      rationale: 'Selkeä rakenne ja lämmin, luottamusta rakentava ilme sopivat palveluun, jossa asiakas luovuttaa taloustietojaan asiantuntijalle.'
    },
    theme: {
      background: '#f4f0e8',
      surface: '#ffffff',
      text: '#1e2923',
      muted: '#657069',
      accent: '#276749',
      accent2: '#d99557',
      radius: 18,
      spacing: 26,
      fontStyle: 'humanist'
    },
    sections: [
      {
        id: 'hero',
        type: 'hero',
        eyebrow: 'Selkeyttä talouteen',
        title: 'Talousluvut, joiden pohjalta uskallat päättää',
        body: 'Autan pienyritystä muuttamaan kirjanpidon tiedot käytännön näkymäksi kassasta, kannattavuudesta ja seuraavista valinnoista.',
        cta: 'Varaa alkukartoitus',
        secondaryCta: 'Katso työskentelytapa',
        items: []
      },
      {
        id: 'services',
        type: 'features',
        eyebrow: 'Palvelut',
        title: 'Saat tiedon lisäksi tulkinnan',
        body: '',
        cta: '',
        secondaryCta: '',
        items: [
          { id: 'monthly', title: 'Kuukausinäkymä', text: 'Tärkeimmät luvut ja poikkeamat ymmärrettävässä muodossa.', meta: '', price: '' },
          { id: 'forecast', title: 'Kassaennuste', text: 'Näet ajoissa, milloin rahaa tulee ja mihin se sitoutuu.', meta: '', price: '' },
          { id: 'support', title: 'Päätöstuki', text: 'Keskustelu vaihtoehdoista ennen isoa hankintaa tai rekrytointia.', meta: '', price: '' }
        ]
      },
      {
        id: 'faq',
        type: 'faq',
        eyebrow: 'Usein kysyttyä',
        title: 'Mitä ennen aloitusta pitää tietää?',
        body: '',
        cta: '',
        secondaryCta: '',
        items: [
          { id: 'systems', title: 'Pitääkö järjestelmää vaihtaa?', text: 'Ei. Aloitamme nykyisistä työkaluista ja tiedoista.', meta: '', price: '' },
          { id: 'start', title: 'Kuinka nopeasti voimme aloittaa?', text: 'Ensimmäinen kartoitus onnistuu tavallisesti viikon sisällä.', meta: '', price: '' }
        ]
      }
    ]
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function apiUrl(path) {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    return `/api/claude-design${path}${preview ? '?preview=1' : ''}`;
  }

  async function callApi(path, body) {
    const response = await fetch(apiUrl(path), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Pyyntö epäonnistui. Yritä uudelleen.');
    return data;
  }

  function saveState(state) {
    state.ts = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
    if (remoteSaveTimer) clearTimeout(remoteSaveTimer);
    remoteSaveTimer = setTimeout(() => {
      remoteSaveTimer = null;
      if (!window.moduleWork || typeof window.moduleWork.saveModuleWork !== 'function') return;
      const projectName = PROJECTS[state.project]?.name || 'projekti valitsematta';
      const summary = `Claude Design · ${projectName} · vaihe ${state.phase} · ${state.versions?.length || 0} versiota`;
      window.moduleWork.saveModuleWork(MODULE_ID, clone(state), summary).catch(() => {});
    }, 800);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.version === 2 ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function instructionCard({ step, context, task, why, done }) {
    return `
      <aside class="cds-instruction" aria-label="Työohje">
        <div class="cds-step">${esc(step)}</div>
        <dl>
          <div><dt>Tilanne</dt><dd>${esc(context)}</dd></div>
          <div><dt>Tehtäväsi</dt><dd>${esc(task)}</dd></div>
          <div><dt>Miksi</dt><dd>${esc(why)}</dd></div>
          <div><dt>Valmis, kun</dt><dd>${esc(done)}</dd></div>
        </dl>
      </aside>`;
  }

  function themeStyle(theme) {
    const t = theme || {};
    return [
      `--ds-bg:${esc(t.background || '#f4f0e8')}`,
      `--ds-surface:${esc(t.surface || '#fff')}`,
      `--ds-text:${esc(t.text || '#1e2923')}`,
      `--ds-muted:${esc(t.muted || '#657069')}`,
      `--ds-accent:${esc(t.accent || '#276749')}`,
      `--ds-accent2:${esc(t.accent2 || '#d99557')}`,
      `--ds-radius:${Number(t.radius) || 16}px`,
      `--ds-space:${Number(t.spacing) || 24}px`
    ].join(';');
  }

  function editableText(value, sectionId, field, itemIndex) {
    const itemAttr = Number.isInteger(itemIndex) ? ` data-item-index="${itemIndex}"` : '';
    return `<span data-editable data-section-id="${esc(sectionId)}" data-field="${esc(field)}"${itemAttr}>${esc(value)}</span>`;
  }

  function renderItems(section, compact) {
    const items = Array.isArray(section.items) ? section.items : [];
    if (!items.length) return '';
    return `<div class="ds-items ${compact ? 'compact' : ''}">
      ${items.map((item, index) => `
        <article class="ds-item" data-node="${esc(section.id)}:${esc(item.id || index)}">
          ${item.meta ? `<small>${editableText(item.meta, section.id, 'meta', index)}</small>` : ''}
          <h3>${editableText(item.title, section.id, 'title', index)}</h3>
          ${item.price ? `<strong class="ds-price">${editableText(item.price, section.id, 'price', index)}</strong>` : ''}
          <p>${editableText(item.text, section.id, 'text', index)}</p>
        </article>`).join('')}
    </div>`;
  }

  function renderSection(section, project, index) {
    const id = section.id || `section-${index + 1}`;
    const eyebrow = section.eyebrow
      ? `<div class="ds-eyebrow">${editableText(section.eyebrow, id, 'eyebrow')}</div>`
      : '';
    const title = section.title ? `<h2>${editableText(section.title, id, 'title')}</h2>` : '';
    const body = section.body ? `<p class="ds-body">${editableText(section.body, id, 'body')}</p>` : '';
    const ctas = section.cta || section.secondaryCta
      ? `<div class="ds-actions">
          ${section.cta ? `<button type="button" class="ds-button" data-demo-action>${editableText(section.cta, id, 'cta')}</button>` : ''}
          ${section.secondaryCta ? `<button type="button" class="ds-button ghost" data-demo-action>${editableText(section.secondaryCta, id, 'secondaryCta')}</button>` : ''}
        </div>`
      : '';

    if (project === 'pitch') {
      return `<section class="ds-slide ${index === 0 ? 'active' : ''}" data-node="${esc(id)}" data-slide="${index}">
        <div class="ds-slide-count">${String(index + 1).padStart(2, '0')} / 05</div>
        <div class="ds-slide-copy">${eyebrow}${title}${body}${renderItems(section, true)}${ctas}</div>
        <div class="ds-slide-mark" aria-hidden="true">${index + 1}</div>
      </section>`;
    }

    if (section.type === 'hero') {
      return `<section class="ds-section ds-hero" data-node="${esc(id)}">
        <div class="ds-hero-copy">${eyebrow}<h1>${editableText(section.title, id, 'title')}</h1>${body}${ctas}</div>
        <div class="ds-hero-art" aria-hidden="true"><span></span><i></i><b></b></div>
      </section>`;
    }
    if (section.type === 'faq') {
      return `<section class="ds-section ds-content" data-node="${esc(id)}">
        ${eyebrow}${title}${body}
        <div class="ds-faq">
          ${(section.items || []).map((item, itemIndex) => `
            <article data-node="${esc(id)}:${esc(item.id || itemIndex)}">
              <button type="button" data-faq><span>${editableText(item.title, id, 'title', itemIndex)}</span><b>+</b></button>
              <p>${editableText(item.text, id, 'text', itemIndex)}</p>
            </article>`).join('')}
        </div>
      </section>`;
    }
    if (section.type === 'cta') {
      return `<section class="ds-section ds-cta" data-node="${esc(id)}">${eyebrow}${title}${body}${ctas}</section>`;
    }
    return `<section class="ds-section ds-content" data-node="${esc(id)}">
      ${eyebrow}${title}${body}${renderItems(section, false)}${ctas}
    </section>`;
  }

  function designMarkup(design, options = {}) {
    const project = design?.project || 'service';
    const fontStyle = design?.theme?.fontStyle || 'modern';
    const mini = options.mini ? ' mini' : '';
    const mobile = options.mobile ? ' mobile' : '';
    return `
      <div class="ds-prototype${mini}${mobile} font-${esc(fontStyle)}" style="${themeStyle(design?.theme)}" data-prototype>
        <header class="ds-nav" data-node="navigation">
          <b>${esc(design?.direction?.name || 'Design')}</b>
          ${project === 'pitch'
            ? '<span>Pitch deck</span>'
            : '<nav><span>Palvelut</span><span>Tietoa</span><span>Yhteys</span></nav>'}
        </header>
        <main class="ds-main">
          ${(design?.sections || []).map((section, index) => renderSection(section, project, index)).join('')}
        </main>
        ${project === 'pitch' ? `
          <div class="ds-slide-nav">
            <button type="button" data-slide-prev aria-label="Edellinen dia">←</button>
            <span data-slide-status>1 / ${(design.sections || []).length}</span>
            <button type="button" data-slide-next aria-label="Seuraava dia">→</button>
          </div>` : ''}
        <div class="ds-toast" hidden>Prototyypin toiminto vastasi klikkaukseen.</div>
      </div>`;
  }

  function updateEditable(design, element) {
    const section = (design.sections || []).find((entry) => entry.id === element.dataset.sectionId);
    if (!section) return false;
    const field = element.dataset.field;
    const itemIndex = element.dataset.itemIndex;
    const value = element.textContent.trim();
    if (itemIndex !== undefined && section.items?.[Number(itemIndex)]) {
      section.items[Number(itemIndex)][field] = value;
      return true;
    }
    section[field] = value;
    return true;
  }

  function wirePrototype(root, state, onDirectEdit) {
    const prototype = root.querySelector('[data-prototype]');
    if (!prototype) return;
    let slide = 0;
    const slides = [...prototype.querySelectorAll('.ds-slide')];
    const showSlide = (next) => {
      if (!slides.length) return;
      slide = (next + slides.length) % slides.length;
      slides.forEach((entry, index) => entry.classList.toggle('active', index === slide));
      const status = prototype.querySelector('[data-slide-status]');
      if (status) status.textContent = `${slide + 1} / ${slides.length}`;
    };
    prototype.querySelector('[data-slide-prev]')?.addEventListener('click', () => showSlide(slide - 1));
    prototype.querySelector('[data-slide-next]')?.addEventListener('click', () => showSlide(slide + 1));
    prototype.querySelectorAll('[data-faq]').forEach((button) => {
      button.addEventListener('click', () => button.closest('article').classList.toggle('open'));
    });
    prototype.querySelectorAll('[data-demo-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const toast = prototype.querySelector('.ds-toast');
        toast.hidden = false;
        setTimeout(() => { toast.hidden = true; }, 1800);
      });
    });
    prototype.querySelectorAll('[data-node]').forEach((node) => {
      node.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        prototype.querySelectorAll('.selected-node').forEach((entry) => entry.classList.remove('selected-node'));
        node.classList.add('selected-node');
        state.selectedId = node.dataset.node;
        root.dispatchEvent(new CustomEvent('design-node-selected'));
      });
    });
    prototype.querySelectorAll('[data-editable]').forEach((element) => {
      element.contentEditable = state.tool === 'direct' ? 'true' : 'false';
      if (state.tool !== 'direct') return;
      element.addEventListener('click', (event) => event.stopPropagation());
      element.addEventListener('blur', () => {
        if (updateEditable(state.design, element)) onDirectEdit();
      });
    });
  }

  function progressChecklist(state) {
    const m = state.metrics || {};
    const rows = [
      ['chat', 'Rakenteellinen muutos', m.chat > 0],
      ['comment', 'Kohdennettu kommentti', m.comment > 0],
      ['direct', 'Suora tekstimuokkaus', m.direct > 0],
      ['controls', 'Visuaalinen säätö', m.controls > 0],
      ['critique', 'Tekoälyarviointi', !!m.critique],
      ['fixes', 'Kaksi korjausta arvion jälkeen', m.fixes >= 2]
    ];
    return `<div class="cds-checklist">
      ${rows.map((row) => `<div class="${row[2] ? 'done' : ''}"><span>${row[2] ? '✓' : '○'}</span>${row[1]}</div>`).join('')}
    </div>`;
  }

  function requirementsMet(state) {
    const m = state.metrics || {};
    return m.chat > 0 && m.comment > 0 && m.direct > 0 && m.controls > 0 && m.critique && m.fixes >= 2;
  }

  function pushVersion(state, label) {
    state.versions = state.versions || [];
    state.versions.push({
      label,
      at: new Date().toISOString(),
      design: clone(state.design)
    });
    if (state.versions.length > 12) state.versions.shift();
    saveState(state);
  }

  async function runStudio(container) {
    let state = loadState() || {
      version: 2,
      phase: 'choose',
      project: null,
      brief: { subject: '', audience: '', mood: '' },
      directions: [],
      choiceReason: '',
      design: null,
      tool: 'chat',
      selectedId: '',
      mobile: false,
      versions: [],
      messages: [],
      metrics: { chat: 0, comment: 0, direct: 0, controls: 0, critique: false, fixes: 0 },
      critique: null,
      reflection: ''
    };

    return new Promise((resolveComplete) => {
      function showError(message, host) {
        const target = host || container.querySelector('[data-error]');
        if (!target) return;
        target.textContent = message;
        target.hidden = false;
      }

      function setBusy(button, busy, label) {
        if (!button) return;
        button.disabled = busy;
        button.dataset.original = button.dataset.original || button.textContent;
        button.textContent = busy ? label : button.dataset.original;
      }

      function resetStudio() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        state = {
          version: 2,
          phase: 'choose',
          project: null,
          brief: { subject: '', audience: '', mood: '' },
          directions: [],
          choiceReason: '',
          design: null,
          tool: 'chat',
          selectedId: '',
          mobile: false,
          versions: [],
          messages: [],
          metrics: { chat: 0, comment: 0, direct: 0, controls: 0, critique: false, fixes: 0 },
          critique: null,
          reflection: ''
        };
        render();
      }

      function renderChooser() {
        container.innerHTML = `
          <div class="cds-shell">
            ${instructionCard({
              step: '1 / 5 · Valitse projekti',
              context: 'Claude Design alkaa aidosta tarpeesta. Tässä harjoituksessa et kopioi valmista toimeksiantoa, vaan määrittelet kenelle ja mitä suunnittelet.',
              task: 'Valitse yksi kolmesta projektista. Kirjoita aihe, kohderyhmä sekä kolme sanaa tavoitellusta tunnelmasta.',
              why: 'Hyvä lopputulos riippuu siitä, kuinka selkeästi rajaat yleisön, tavoitteen ja visuaalisen suunnan.',
              done: 'Projektityyppi on valittu ja kaikki kolme kenttää on täytetty omin sanoin.'
            })}
            <section class="cds-chooser">
              <div class="cds-project-grid">
                ${Object.entries(PROJECTS).map(([id, project]) => `
                  <button type="button" class="cds-project ${state.project === id ? 'selected' : ''}" data-project="${id}">
                    <span>${project.icon}</span><b>${project.name}</b><small>${project.short}</small>
                  </button>`).join('')}
              </div>
              <div class="cds-brief-form" ${state.project ? '' : 'hidden'}>
                <div class="cds-context-note" data-project-context></div>
                <label><span data-subject-label>Aihe</span>
                  <input type="text" data-brief="subject" value="${esc(state.brief.subject)}">
                </label>
                <label>Kohderyhmä
                  <input type="text" data-brief="audience" value="${esc(state.brief.audience)}">
                </label>
                <label>Tavoiteltu tunnelma
                  <input type="text" data-brief="mood" value="${esc(state.brief.mood)}" placeholder="Esim. rauhallinen, lämmin ja täsmällinen">
                </label>
                <p class="cds-error" data-error hidden></p>
                <button type="button" class="btn primary" data-generate>Luo kolme suunnittelusuuntaa</button>
              </div>
            </section>
          </div>`;

        const updateProjectCopy = () => {
          const project = PROJECTS[state.project];
          if (!project) return;
          const form = container.querySelector('.cds-brief-form');
          form.hidden = false;
          form.querySelector('[data-project-context]').innerHTML = `<b>Tilanne:</b> ${esc(project.context)}<br><b>Tavoite:</b> ${esc(project.result)}`;
          form.querySelector('[data-subject-label]').textContent = project.subjectLabel;
          form.querySelector('[data-brief="subject"]').placeholder = project.subjectPlaceholder;
          form.querySelector('[data-brief="audience"]').placeholder = project.audiencePlaceholder;
        };

        container.querySelectorAll('[data-project]').forEach((button) => {
          button.addEventListener('click', () => {
            state.project = button.dataset.project;
            container.querySelectorAll('[data-project]').forEach((entry) => entry.classList.toggle('selected', entry === button));
            updateProjectCopy();
            saveState(state);
          });
        });
        updateProjectCopy();
        container.querySelectorAll('[data-brief]').forEach((input) => {
          input.addEventListener('input', () => {
            state.brief[input.dataset.brief] = input.value;
            saveState(state);
          });
        });
        container.querySelector('[data-generate]').addEventListener('click', async (event) => {
          if (!state.project || Object.values(state.brief).some((value) => String(value).trim().length < 3)) {
            showError('Valitse projekti ja täytä aihe, kohderyhmä sekä tunnelma.');
            return;
          }
          setBusy(event.currentTarget, true, 'Claude rakentaa suuntia…');
          try {
            const data = await callApi('/directions', { project: state.project, ...state.brief });
            state.directions = data.directions;
            state.phase = 'directions';
            saveState(state);
            render();
          } catch (error) {
            showError(error.message);
            setBusy(event.currentTarget, false);
          }
        });
      }

      function renderDirections() {
        container.innerHTML = `
          <div class="cds-shell">
            ${instructionCard({
              step: '2 / 5 · Vertaa suuntia',
              context: 'Claude teki samojen lähtötietojen pohjalta kolme erilaista ratkaisua. Ensimmäinen tulos ei ole automaattisesti paras.',
              task: 'Tutki sisältöhierarkiaa, tunnelmaa ja kohderyhmälle sopivuutta. Valitse yksi suunta ja perustele valinta vähintään kahdella konkreettisella havainnolla.',
              why: 'Suunnittelu on vaihtoehtojen arviointia. Ammattilainen osaa kertoa, miksi yksi ratkaisu palvelee tavoitetta paremmin.',
              done: 'Yksi suunta on valittu ja perustelussa on vähintään 40 merkkiä.'
            })}
            <section class="cds-directions">
              <div class="cds-direction-grid">
                ${state.directions.map((design, index) => `
                  <article class="cds-direction ${state.selectedDirection === index ? 'selected' : ''}">
                    <div class="cds-direction-head">
                      <span>0${index + 1}</span><div><h3>${esc(design.direction.name)}</h3><p>${esc(design.direction.rationale)}</p></div>
                    </div>
                    <div class="cds-mini-canvas">${designMarkup(design, { mini: true })}</div>
                    <button type="button" class="btn" data-select-direction="${index}">Valitse tämä suunta</button>
                  </article>`).join('')}
              </div>
              <div class="cds-choice-reason">
                <label>Perustele valintasi
                  <textarea rows="3" data-choice-reason placeholder="Valitsen tämän, koska…">${esc(state.choiceReason)}</textarea>
                </label>
                <div class="cds-choice-actions">
                  <button type="button" class="btn" data-back>← Muokkaa lähtötietoja</button>
                  <button type="button" class="btn primary" data-start-editor disabled>Jatka valitulla suunnalla →</button>
                </div>
              </div>
            </section>
          </div>`;

        const continueButton = container.querySelector('[data-start-editor]');
        const refreshContinue = () => {
          continueButton.disabled = !Number.isInteger(state.selectedDirection) || state.choiceReason.trim().length < 40;
        };
        container.querySelectorAll('[data-select-direction]').forEach((button) => {
          button.addEventListener('click', () => {
            state.selectedDirection = Number(button.dataset.selectDirection);
            container.querySelectorAll('.cds-direction').forEach((entry, index) => entry.classList.toggle('selected', index === state.selectedDirection));
            saveState(state);
            refreshContinue();
          });
        });
        container.querySelector('[data-choice-reason]').addEventListener('input', (event) => {
          state.choiceReason = event.target.value;
          saveState(state);
          refreshContinue();
        });
        container.querySelector('[data-back]').addEventListener('click', () => {
          state.phase = 'choose';
          saveState(state);
          render();
        });
        continueButton.addEventListener('click', () => {
          state.design = clone(state.directions[state.selectedDirection]);
          state.versions = [];
          pushVersion(state, 'Valittu suunnittelusuunta');
          state.phase = 'editor';
          saveState(state);
          render();
        });
        refreshContinue();
      }

      function editorInstructions() {
        const tool = state.tool;
        if (tool === 'comment') {
          return {
            step: '3 / 5 · Kohdennettu kommentti',
            context: 'Kun muutos koskee yhtä elementtiä, koko suunnitelmaa ei kannata tehdä uudelleen.',
            task: 'Klikkaa elementtiä prototyypissä. Kirjoita sitten täsmällinen kommentti juuri siihen kohtaan.',
            why: 'Kohdennettu kommentti säilyttää muun suunnitelman ja vähentää väärinymmärryksiä.',
            done: 'Olet tehnyt vähintään yhden kohdennetun muutoksen.'
          };
        }
        if (tool === 'direct') {
          return {
            step: '3 / 5 · Suora muokkaus',
            context: 'Pientä tekstikorjausta varten ei tarvita uutta tekoälykierrosta.',
            task: 'Klikkaa otsikkoa, leipätekstiä tai painiketekstiä ja kirjoita parempi versio suoraan paikalleen.',
            why: 'Suora muokkaus on nopein tapa korjata täsmällinen sana, väite tai toimintakehotus.',
            done: 'Olet muuttanut vähintään yhtä tekstiä suoraan prototyypissä.'
          };
        }
        if (tool === 'controls') {
          return {
            step: '3 / 5 · Visuaaliset säädöt',
            context: 'Välistys, kulmien muoto ja korostusväri vaikuttavat siihen, tuntuuko sivu rauhalliselta, tiiviiltä vai energiseltä.',
            task: 'Kokeile säätimiä ja jätä näkyviin ratkaisu, joka tukee valitsemaasi tunnelmaa.',
            why: 'Kaikkea ei tarvitse pyytää keskustelussa. Suora säätö tekee vertailusta nopeaa.',
            done: 'Olet muuttanut vähintään yhtä visuaalista asetusta.'
          };
        }
        if (tool === 'history') {
          return {
            step: '3 / 5 · Versiohistoria',
            context: 'Kaikki kokeilut eivät paranna suunnitelmaa. Aiempi toimiva ratkaisu pitää voida palauttaa.',
            task: 'Vertaa tallennettuja versioita. Voit palauttaa minkä tahansa version jatkotyön pohjaksi.',
            why: 'Versiohistoria antaa luvan kokeilla ilman pelkoa hyvän työn menettämisestä.',
            done: 'Tiedät, mistä aiempi versio palautetaan.'
          };
        }
        if (tool === 'critique') {
          return {
            step: '4 / 5 · Testaa ja korjaa',
            context: 'Valmis ulkoasu voi silti sisältää heikon hierarkian, epäselvän toimintakehotuksen tai saavutettavuusongelman.',
            task: 'Pyydä tekoälyarvio. Tee sen jälkeen kaksi perusteltua korjausta keskustelulla tai kohdennetulla kommentilla.',
            why: 'Arviointi muuttaa suunnittelun mielipiteestä testattavaksi työksi.',
            done: 'Arvio on tehty ja kaksi sen pohjalta tehtyä korjausta näkyy prototyypissä.'
          };
        }
        return {
          step: '3 / 5 · Rakenteellinen muutos',
          context: 'Keskustelu sopii muutokseen, joka vaikuttaa useaan osioon tai koko sisällön järjestykseen.',
          task: 'Pyydä yksi merkittävä muutos: esimerkiksi vaihda osioiden järjestystä, lisää puuttuva sisältö tai selkeytä koko sivun tarinaa.',
          why: 'Rakenteellinen pyyntö kertoo tavoitteen ja antaa Claudelle tilaa ratkaista kokonaisuus.',
          done: 'Olet tehnyt vähintään yhden rakenteellisen muutoksen.'
        };
      }

      function renderToolPanel() {
        if (state.tool === 'controls') {
          return `
            <div class="cds-controls">
              <label>Välistys <output>${state.design.theme.spacing}px</output>
                <input type="range" min="12" max="40" value="${state.design.theme.spacing}" data-theme-control="spacing">
              </label>
              <label>Kulmien pyöristys <output>${state.design.theme.radius}px</output>
                <input type="range" min="0" max="36" value="${state.design.theme.radius}" data-theme-control="radius">
              </label>
              <label>Korostusväri
                <input type="color" value="${esc(state.design.theme.accent)}" data-theme-control="accent">
              </label>
            </div>`;
        }
        if (state.tool === 'history') {
          return `<div class="cds-history">
            ${(state.versions || []).map((version, index) => `
              <button type="button" data-restore="${index}">
                <span>${String(index + 1).padStart(2, '0')}</span>
                <div><b>${esc(version.label)}</b><small>${new Date(version.at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</small></div>
              </button>`).reverse().join('')}
          </div>`;
        }
        if (state.tool === 'critique') {
          if (!state.critique) {
            return `<div class="cds-critique-empty">
              <p>Claude vertaa suunnitelmaa lähtötietoihin ja arvioi hierarkiaa, käytettävyyttä sekä saavutettavuutta.</p>
              <button type="button" class="btn primary" data-run-critique>Arvioi suunnitelma</button>
            </div>`;
          }
          return `
            <div class="cds-critique">
              <div class="cds-strengths"><b>Toimii jo</b>${state.critique.strengths.map((item) => `<p>✓ ${esc(item)}</p>`).join('')}</div>
              ${state.critique.findings.map((finding, index) => `
                <article class="severity-${esc(finding.severity)}">
                  <span>${index + 1}</span><div><b>${esc(finding.title)}</b><p>${esc(finding.detail)}</p><strong>Korjaa näin: ${esc(finding.action)}</strong></div>
                </article>`).join('')}
              <p class="cds-fix-count">Korjauksia arvion jälkeen: <b>${state.metrics.fixes} / 2</b></p>
            </div>`;
        }
        if (state.tool === 'direct') {
          return `<div class="cds-direct-tip"><span>✎</span><p>Tekstit ovat nyt muokattavia. Klikkaa tekstiä prototyypissä, kirjoita uusi versio ja klikkaa sitten tekstin ulkopuolelle.</p></div>`;
        }
        const isComment = state.tool === 'comment';
        return `
          <div class="cds-revision-box">
            ${isComment ? `<div class="cds-target ${state.selectedId ? 'ready' : ''}">
              ${state.selectedId ? `Valittu: <b>${esc(state.selectedId)}</b>` : 'Klikkaa ensin muutettavaa elementtiä.'}
            </div>` : ''}
            <textarea rows="4" data-revision placeholder="${isComment
              ? 'Esim. Nosta tämä toimintakehotus paremmin esiin, mutta säilytä rauhallinen ilme.'
              : 'Esim. Siirrä luottamusta lisäävä näyttö ennen palveluita ja perustele järjestys sisällöllä.'}"></textarea>
            <p class="cds-error" data-error hidden></p>
            <button type="button" class="btn primary" data-submit-revision ${isComment && !state.selectedId ? 'disabled' : ''}>
              ${isComment ? 'Lähetä kommentti' : 'Tee rakenteellinen muutos'}
            </button>
          </div>`;
      }

      function renderEditor() {
        const instructions = editorInstructions();
        container.innerHTML = `
          <div class="cds-shell cds-editor-shell">
            ${instructionCard(instructions)}
            <section class="cds-studio">
              <header class="cds-studio-bar">
                <div><b>${esc(PROJECTS[state.project].name)}</b><small>${esc(state.design.direction.name)}</small></div>
                <div class="cds-view-switch">
                  <button type="button" class="${state.mobile ? '' : 'active'}" data-view="desktop">Työpöytä</button>
                  <button type="button" class="${state.mobile ? 'active' : ''}" data-view="mobile">Puhelin</button>
                </div>
                <button type="button" class="btn small" data-reset>Aloita alusta</button>
              </header>
              <div class="cds-tool-tabs">
                ${[
                  ['chat', 'Keskustelu'],
                  ['comment', 'Kommentti'],
                  ['direct', 'Muokkaa'],
                  ['controls', 'Säädöt'],
                  ['history', 'Historia'],
                  ['critique', 'Arvioi']
                ].map(([id, label]) => `<button type="button" data-tool="${id}" class="${state.tool === id ? 'active' : ''}">${label}</button>`).join('')}
              </div>
              <div class="cds-studio-body">
                <aside class="cds-work-panel">
                  <div class="cds-panel-label">${state.tool === 'critique' ? 'Testaus' : 'Työkalu'}</div>
                  ${renderToolPanel()}
                  ${state.messages.length ? `<div class="cds-change-log">${state.messages.slice(-4).map((message) => `<p><span>Claude</span>${esc(message)}</p>`).join('')}</div>` : ''}
                </aside>
                <div class="cds-canvas-wrap ${state.mobile ? 'is-mobile' : ''}">
                  <div class="cds-loading" data-loading hidden><span></span><b>Claude muokkaa suunnitelmaa…</b></div>
                  ${designMarkup(state.design, { mobile: state.mobile })}
                </div>
                <aside class="cds-progress-panel">
                  <div class="cds-panel-label">Taitonäyttö</div>
                  ${progressChecklist(state)}
                  <button type="button" class="btn primary cds-finish" data-finish ${requirementsMet(state) ? '' : 'disabled'}>Viimeistele ja vie työ →</button>
                  ${requirementsMet(state) ? '<p class="cds-ready">Kaikki työvaiheet on tehty.</p>' : '<p>Tee kaikki kuusi työvaihetta. Arvion jälkeen tarvitaan kaksi korjausta.</p>'}
                </aside>
              </div>
            </section>
          </div>`;

        const canvasWrap = container.querySelector('.cds-canvas-wrap');
        const renderCanvasOnly = () => {
          const old = canvasWrap.querySelector('[data-prototype]');
          if (old) old.remove();
          canvasWrap.insertAdjacentHTML('beforeend', designMarkup(state.design, { mobile: state.mobile }));
          wirePrototype(canvasWrap, state, () => {
            state.metrics.direct += 1;
            if (state.metrics.critique) state.metrics.fixes += 1;
            pushVersion(state, 'Suora tekstimuokkaus');
            saveState(state);
            renderEditor();
          });
        };
        wirePrototype(canvasWrap, state, () => {
          state.metrics.direct += 1;
          if (state.metrics.critique) state.metrics.fixes += 1;
          pushVersion(state, 'Suora tekstimuokkaus');
          saveState(state);
          renderEditor();
        });
        container.addEventListener('design-node-selected', () => {
          const target = container.querySelector('.cds-target');
          const submit = container.querySelector('[data-submit-revision]');
          if (target) {
            target.classList.add('ready');
            target.innerHTML = `Valittu: <b>${esc(state.selectedId)}</b>`;
          }
          if (submit) submit.disabled = false;
          saveState(state);
        });
        container.querySelectorAll('[data-tool]').forEach((button) => {
          button.addEventListener('click', () => {
            state.tool = button.dataset.tool;
            saveState(state);
            renderEditor();
          });
        });
        container.querySelectorAll('[data-view]').forEach((button) => {
          button.addEventListener('click', () => {
            state.mobile = button.dataset.view === 'mobile';
            saveState(state);
            renderEditor();
          });
        });
        container.querySelector('[data-reset]').addEventListener('click', () => {
          if (window.confirm('Haluatko aloittaa Design Studion alusta? Nykyinen työ poistuu tästä selaimesta.')) resetStudio();
        });

        const submit = container.querySelector('[data-submit-revision]');
        if (submit) {
          submit.addEventListener('click', async () => {
            const textarea = container.querySelector('[data-revision]');
            const instruction = textarea.value.trim();
            if (instruction.length < 10) {
              showError('Kirjoita hieman täsmällisempi muutos.');
              return;
            }
            const loading = container.querySelector('[data-loading]');
            loading.hidden = false;
            submit.disabled = true;
            try {
              const mode = state.tool === 'comment' ? 'comment' : 'chat';
              const data = await callApi('/revise', {
                project: state.project,
                design: state.design,
                instruction,
                targetId: mode === 'comment' ? state.selectedId : '',
                mode
              });
              state.design = data.design;
              state.metrics[mode] += 1;
              if (state.metrics.critique) state.metrics.fixes += 1;
              state.messages.push(data.summary);
              pushVersion(state, mode === 'comment' ? `Kommentti: ${state.selectedId}` : 'Rakenteellinen muutos');
              state.selectedId = '';
              saveState(state);
              renderEditor();
            } catch (error) {
              loading.hidden = true;
              submit.disabled = false;
              showError(error.message);
            }
          });
        }

        container.querySelectorAll('[data-theme-control]').forEach((control) => {
          control.addEventListener('input', () => {
            const key = control.dataset.themeControl;
            state.design.theme[key] = key === 'accent' ? control.value : Number(control.value);
            control.closest('label').querySelector('output')?.replaceChildren(document.createTextNode(`${control.value}px`));
            const prototype = container.querySelector('[data-prototype]');
            prototype.setAttribute('style', themeStyle(state.design.theme));
          });
          control.addEventListener('change', () => {
            state.metrics.controls += 1;
            if (state.metrics.critique) state.metrics.fixes += 1;
            pushVersion(state, 'Visuaalinen säätö');
            saveState(state);
            renderEditor();
          });
        });
        container.querySelectorAll('[data-restore]').forEach((button) => {
          button.addEventListener('click', () => {
            const version = state.versions[Number(button.dataset.restore)];
            if (!version) return;
            state.design = clone(version.design);
            pushVersion(state, `Palautettu: ${version.label}`);
            state.messages.push(`Palautit version “${version.label}”.`);
            renderEditor();
          });
        });
        container.querySelector('[data-run-critique]')?.addEventListener('click', async (event) => {
          setBusy(event.currentTarget, true, 'Claude arvioi…');
          try {
            const data = await callApi('/critique', {
              project: state.project,
              design: state.design,
              brief: state.brief
            });
            state.critique = data;
            state.metrics.critique = true;
            state.metrics.fixes = 0;
            saveState(state);
            renderEditor();
          } catch (error) {
            setBusy(event.currentTarget, false);
            const host = container.querySelector('.cds-critique-empty');
            host.insertAdjacentHTML('beforeend', `<p class="cds-error">${esc(error.message)}</p>`);
          }
        });
        container.querySelector('[data-finish]').addEventListener('click', () => {
          if (!requirementsMet(state)) return;
          state.phase = 'complete';
          saveState(state);
          render();
        });
      }

      function exportHtml() {
        const css = `
body{margin:0;font-family:system-ui,sans-serif;background:#eee}.ds-prototype{max-width:1180px;margin:auto;background:var(--ds-bg);color:var(--ds-text);min-height:100vh}
.ds-nav{display:flex;justify-content:space-between;padding:22px 6%;background:var(--ds-surface)}.ds-nav nav{display:flex;gap:24px}
.ds-section{padding:calc(var(--ds-space)*2) 7%}.ds-hero{min-height:62vh;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:40px}
.ds-eyebrow{color:var(--ds-accent);font-weight:700;text-transform:uppercase;letter-spacing:.08em}.ds-hero h1{font-size:clamp(42px,7vw,84px);line-height:1;margin:.25em 0}
.ds-content h2,.ds-cta h2{font-size:clamp(30px,4vw,54px)}.ds-body{color:var(--ds-muted);font-size:18px;line-height:1.7;max-width:720px}
.ds-items{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--ds-space);margin-top:28px}.ds-item{background:var(--ds-surface);padding:24px;border-radius:var(--ds-radius)}
.ds-button{padding:14px 20px;border:0;border-radius:calc(var(--ds-radius)/2);background:var(--ds-accent);color:#fff;font-weight:700;margin:8px}.ds-button.ghost{background:transparent;color:var(--ds-accent);border:1px solid}
.ds-faq article{border-bottom:1px solid #bbb}.ds-faq button{width:100%;padding:18px 0;border:0;background:none;text-align:left;font-size:18px;font-weight:700}.ds-faq p{display:none}.ds-faq article.open p{display:block}
.ds-slide{display:none;min-height:70vh;padding:8%;position:relative}.ds-slide.active{display:flex;align-items:center}.ds-slide-nav{display:flex;justify-content:center;gap:16px;padding:20px}
@media(max-width:700px){.ds-nav nav{display:none}.ds-hero{grid-template-columns:1fr}.ds-section{padding:48px 6%}}`;
        const script = `<script>document.querySelectorAll('[data-faq]').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));let s=0,slides=[...document.querySelectorAll('.ds-slide')];function show(n){if(!slides.length)return;s=(n+slides.length)%slides.length;slides.forEach((x,i)=>x.classList.toggle('active',i===s));document.querySelector('[data-slide-status]').textContent=(s+1)+' / '+slides.length}document.querySelector('[data-slide-prev]')?.addEventListener('click',()=>show(s-1));document.querySelector('[data-slide-next]')?.addEventListener('click',()=>show(s+1));<\/script>`;
        return `<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.brief.subject)}</title><style>${css}</style><body>${designMarkup(state.design)}${script}</body></html>`;
      }

      function renderComplete() {
        container.innerHTML = `
          <div class="cds-shell">
            ${instructionCard({
              step: '5 / 5 · Viimeistele ja vie',
              context: 'Suunnitelma on kulkenut toimeksiannosta vaihtoehtoihin, kohdennettuihin muutoksiin ja testaukseen.',
              task: 'Kirjoita lyhyt luovutusviesti: mikä muuttui, miksi valinnat palvelevat kohderyhmää ja mitä toteuttajan pitää vielä tietää.',
              why: 'Hyvä luovutus kertoo päätösten perustelut eikä jätä seuraavaa tekijää arvaamaan.',
              done: 'Luovutusviestissä on vähintään 120 merkkiä. Sen jälkeen voit ladata toimivan HTML-prototyypin.'
            })}
            <section class="cds-complete">
              <div class="cds-final-preview">${designMarkup(state.design)}</div>
              <div class="cds-handoff">
                <h2>Luovutusviesti</h2>
                <textarea rows="7" data-reflection placeholder="Valitsin tämän suunnan, koska…">${esc(state.reflection)}</textarea>
                <div class="cds-char-count"><span>${state.reflection.length}</span> / 120 merkkiä</div>
                <div class="cds-final-actions">
                  <button type="button" class="btn" data-back-editor>← Palaa studioon</button>
                  <button type="button" class="btn primary" data-export disabled>Lataa HTML-prototyyppi</button>
                </div>
                <div data-complete-host></div>
              </div>
            </section>
          </div>`;
        wirePrototype(container.querySelector('.cds-final-preview'), state, () => {});
        const textarea = container.querySelector('[data-reflection]');
        const count = container.querySelector('.cds-char-count span');
        const exportButton = container.querySelector('[data-export]');
        const refresh = () => {
          state.reflection = textarea.value;
          count.textContent = state.reflection.length;
          exportButton.disabled = state.reflection.trim().length < 120;
          saveState(state);
        };
        textarea.addEventListener('input', refresh);
        refresh();
        container.querySelector('[data-back-editor]').addEventListener('click', () => {
          state.phase = 'editor';
          saveState(state);
          render();
        });
        exportButton.addEventListener('click', () => {
          const blob = new Blob([exportHtml()], { type: 'text/html;charset=utf-8' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `claude-design-${state.project}.html`;
          link.click();
          URL.revokeObjectURL(link.href);
          const host = container.querySelector('[data-complete-host]');
          if (!host.dataset.done) {
            host.dataset.done = '1';
            Engine.addComplete(host, 'Claude Design Studio valmis — toimeksianto, vaihtoehdot, iterointi, testaus ja luovutus.');
            resolveComplete();
          }
        });
      }

      function render() {
        if (state.phase === 'directions' && state.directions.length) return renderDirections();
        if (state.phase === 'editor' && state.design) return renderEditor();
        if (state.phase === 'complete' && state.design) return renderComplete();
        renderChooser();
      }

      render();
      (async function hydrateFromServer(attempt = 0) {
        if (!window.moduleWork || typeof window.moduleWork.loadModuleWork !== 'function') {
          if (attempt < 30) setTimeout(() => hydrateFromServer(attempt + 1), 100);
          return;
        }
        try {
          const remote = await window.moduleWork.loadModuleWork(MODULE_ID);
          if (!remote || remote.version !== 2 || Number(remote.ts || 0) <= Number(state.ts || 0)) return;
          state = remote;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
          render();
        } catch (_) {}
      })();
    });
  }

  window.PILLARS.push({
    id: 'p4',
    num: 4,
    name: 'Claude Design',
    subtitle: 'Ideasta toimivaksi prototyypiksi',
    briefingLabel: 'Työtavat',
    theory: {
      tagline: 'Suunnittele, vertaa, muokkaa ja testaa samalla työpöydällä.',
      whatItDoes: 'Claude Design rakentaa keskustelun pohjalta <b>visuaalisia kokonaisuuksia ja toimivia prototyyppejä</b>: sivuja, esityksiä, yhden sivun materiaaleja ja muita luonnoksia.',
      howItWorks: 'Kuvaat tavoitteen keskustelussa. Sen jälkeen voit kommentoida yhtä elementtiä, muokata tekstiä suoraan sekä säätää välistystä, värejä ja rakennetta työpinnalla.',
      benefits: 'Saat nopeasti useita toteutuskelpoisia suuntia, joita voit vertailla ennen viimeistelyä tai siirtoa toteutukseen.',
      whereToUse: 'Palvelusivut, tapahtumakampanjat, myyntiesitykset, konseptit ja tilanteet, joissa sisältöä pitää nähdä ja kokeilla ennen julkaisua.',
      capabilities: [
        { title: 'Keskustelu', body: 'Rakenteelliset muutokset ja kokonaisuuden suunta.' },
        { title: 'Työpinta', body: 'Klikkaa, muokkaa, järjestä ja testaa suoraan prototyypissä.' },
        { title: 'Luovutus', body: 'Vie työ HTML-, PDF- tai esitysmuotoon jatkotyötä varten.' }
      ]
    },
    briefing: async (container, { goToExample }) => {
      container.innerHTML = `
        <div class="cds-methods">
          <section>
            <p class="cds-kicker">Valitse oikea työtapa</p>
            <h2>Kaikki muutokset eivät tarvitse uutta promptia</h2>
            <p>Claude Designissa työ nopeutuu, kun valitset muutoksen laajuuteen sopivan tavan.</p>
          </section>
          <div class="cds-method-grid">
            <article><span>01</span><h3>Keskustelu</h3><p>Kun muutos vaikuttaa rakenteeseen, useaan osioon tai koko tarinaan.</p><b>“Nosta näyttö ennen palveluita.”</b></article>
            <article><span>02</span><h3>Kohdennettu kommentti</h3><p>Kun haluat muuttaa yhtä täsmällistä elementtiä muun työn säilyessä.</p><b>“Tämä toimintakehotus jää liian heikoksi.”</b></article>
            <article><span>03</span><h3>Suora muokkaus</h3><p>Kun korjaat otsikon, sanan, hinnan tai painiketekstin itse.</p><b>Kirjoita suoraan työpinnalle.</b></article>
            <article><span>04</span><h3>Säätimet</h3><p>Kun vertaat välistystä, väriä, tiheyttä tai kulmien muotoa.</p><b>Näe muutos heti.</b></article>
          </div>
          <button type="button" class="btn primary" data-example>Katso lyhyt esimerkki →</button>
        </div>`;
      container.querySelector('[data-example]').addEventListener('click', () => goToExample && goToExample());
    },
    example: async (container) => {
      container.innerHTML = `
        <div class="cds-example">
          ${instructionCard({
            step: 'Esimerkki · Kohdennettu muutos',
            context: 'Taloushallinnon asiantuntijan palvelusivu näyttää hyvältä, mutta toimintakehotus jää muun sisällön varjoon.',
            task: 'Klikkaa prototyypin aloitusosiota. Katso, miten kohdennettu kommentti muuttaa vain valittua kohtaa.',
            why: 'Elementtiin sidottu palaute on tarkempi kuin koko sivua koskeva uusi prompti.',
            done: 'Olet klikannut aloitusosiota ja nähnyt muutoksen ennen–jälkeen.'
          })}
          <div class="cds-example-grid">
            <div class="cds-example-canvas">${designMarkup(DEFAULT_EXAMPLE)}</div>
            <aside>
              <h3>Kohdennettu kommentti</h3>
              <p data-example-status>Klikkaa sivun ylintä aloitusosiota.</p>
              <div class="cds-example-comment" hidden>“Nosta toimintakehotus paremmin esiin ja kerro, mitä alkukartoituksessa tapahtuu.”</div>
            </aside>
          </div>
        </div>`;
      const preview = container.querySelector('.cds-example-canvas');
      const hero = preview.querySelector('[data-node="hero"]');
      hero.addEventListener('click', () => {
        hero.classList.add('selected-node', 'example-improved');
        container.querySelector('.cds-example-comment').hidden = false;
        container.querySelector('[data-example-status]').textContent = 'Kommentti kohdistui aloitusosioon. Muu sisältö säilyi ennallaan.';
      }, { once: true });
      wirePrototype(preview, { tool: 'chat', selectedId: '', design: DEFAULT_EXAMPLE }, () => {});
    },
    exercises: [
      {
        label: 'Studio · Oma projekti',
        outcome: 'Toimeksianto → kolme suuntaa → iterointi → arvio → luovutus',
        run: runStudio
      }
    ]
  });
})();
