window.PILLARS = window.PILLARS || [];

(() => {
  const STORAGE_KEY = 'claudeCodeBuildStudioV1';
  const WORK_ID = 'moduuli-claude-code-lab';
  const PROJECTS = {
    event: {
      icon: '◫',
      name: 'Tapahtuman ilmoittautumissivu',
      description: 'Tapahtuman tiedot, ilmoittautumislomake ja vahvistus.',
      example: 'Työelämän tekoälyilta',
      audience: 'Tapahtumasta kiinnostuneet aikuiset',
      style: 'Lämmin, selkeä ja helposti lähestyttävä'
    },
    expenses: {
      icon: '€',
      name: 'Kululaskuri',
      description: 'Lisää kuluja, jaa ne luokkiin ja näe yhteissumma.',
      example: 'Freelancerin kuukausikulut',
      audience: 'Yksinyrittäjät ja kevytyrittäjät',
      style: 'Rauhallinen, käytännöllinen ja selkeä'
    },
    followup: {
      icon: '✓',
      name: 'Asiakkaiden jatkotoimien seuranta',
      description: 'Kirjaa seuraavat yhteydenotot ja merkitse tehtävät valmiiksi.',
      example: 'Asiakastyön viikkoseuranta',
      audience: 'Pienen palveluyrityksen työntekijät',
      style: 'Ammattimainen, kevyt ja helposti silmäiltävä'
    }
  };
  let remoteSaveTimer = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function freshState() {
    return {
      version: 1,
      phase: 'choose',
      project: '',
      subject: '',
      audience: '',
      style: '',
      plan: null,
      permissions: [],
      build: null,
      revisions: [],
      tested: false,
      manualChecks: [],
      activeFile: 'index.html',
      reflection: '',
      ts: Date.now()
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && parsed.version === 1 ? parsed : null;
    } catch (_) {
      return null;
    }
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
      const summary = `Claude Code Build Studio · ${state.phase} · ${state.revisions.length} muutosta`;
      window.moduleWork.saveModuleWork(WORK_ID, clone(state), summary).catch(() => {});
    }, 800);
  }

  function apiUrl(path) {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    return `/api/claude-code-lab${path}${preview ? '?preview=1' : ''}`;
  }

  async function callApi(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Claude-palvelu ei vastannut.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Claude-palvelun vastaus kesti liian kauan. Yritä uudelleen.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function instruction(phase) {
    const copy = {
      choose: {
        step: 'Vaihe 1/4 · Valitse',
        goal: 'Valitse pieni projekti, jonka pystyt testaamaan heti selaimessa.',
        action: 'Kerro nimi, käyttäjät ja toivottu ilme tavallisella kielellä.',
        proof: 'Claude ymmärtää, mitä olet rakentamassa ja kenelle.'
      },
      plan: {
        step: 'Vaihe 2/4 · Hyväksy suunnitelma',
        goal: 'Tarkista ennen rakentamista, että Claude aikoo tehdä oikean asian.',
        action: 'Lue käyttäjän eteneminen, toiminnot ja rajat. Hyväksy vain tarvittava työ.',
        proof: 'Suunnitelma vastaa tavoitettasi eikä käytä oikeita henkilötietoja tai verkkoa.'
      },
      studio: {
        step: 'Vaihe 3/4 · Kokeile ja muuta',
        goal: 'Käytä toimivaa sovellusta ja pyydä vähintään yksi parannus.',
        action: 'Kokeile lomaketta ja painikkeita. Kerro muutos omin sanoin.',
        proof: 'Automaattiset tarkistukset menevät läpi ja oma muutoksesi näkyy sovelluksessa.'
      },
      complete: {
        step: 'Vaihe 4/4 · Ota mukaan',
        goal: 'Tallenna valmis projekti ja ymmärrä käyttämäsi työskentelytapa.',
        action: 'Lataa yhden tiedoston versio tai aloita uusi projekti.',
        proof: 'Osaat ohjata Claudea: tavoite → suunnitelma → kokeilu → korjaus → valmis versio.'
      }
    }[phase];
    return `
      <div class="clab-instruction">
        <div class="clab-step">${copy.step}</div>
        <dl>
          <div><dt>Tavoite</dt><dd>${copy.goal}</dd></div>
          <div><dt>Tee näin</dt><dd>${copy.action}</dd></div>
          <div><dt>Mistä tiedät onnistuneesi?</dt><dd>${copy.proof}</dd></div>
        </dl>
      </div>`;
  }

  function progress(phase) {
    const phases = ['choose', 'plan', 'studio', 'complete'];
    const current = Math.max(0, phases.indexOf(phase));
    return `
      <div class="clab-progress">
        ${['Valitse', 'Suunnittele', 'Kokeile', 'Valmis'].map((label, index) => `
          <div class="${index < current ? 'done' : ''} ${index === current ? 'active' : ''}">
            <span>${index < current ? '✓' : index + 1}</span><b>${label}</b>
          </div>`).join('')}
      </div>`;
  }

  function shell(state, body) {
    return `<div class="clab-shell">${instruction(state.phase)}${progress(state.phase)}${body}</div>`;
  }

  function projectCard(id, state) {
    const project = PROJECTS[id];
    return `
      <button type="button" class="clab-project ${state.project === id ? 'selected' : ''}" data-project="${id}">
        <span>${project.icon}</span>
        <b>${project.name}</b>
        <small>${project.description}</small>
        <em>${state.project === id ? 'Valittu ✓' : 'Valitse'}</em>
      </button>`;
  }

  function chooseProject(container, state, render) {
    const selected = PROJECTS[state.project];
    container.innerHTML = shell(state, `
      <section class="clab-welcome">
        <div>
          <p class="clab-kicker">Claude Code · Ensimmäinen rakennusprojekti</p>
          <h2>Valitse mitä haluat rakentaa</h2>
          <p>Et tarvitse ohjelmointitaitoja. Sinä määrittelet tavoitteen ja arvioit lopputuloksen. Claude suunnittelee tiedostot, rakentaa toimivan sovelluksen ja tekee pyytämäsi muutokset.</p>
        </div>
        <div class="clab-role"><span>Sinun roolisi</span><b>Projektin omistaja</b><small>päätä · kokeile · anna palautetta</small></div>
      </section>
      <section class="clab-chooser">
        <div class="clab-project-grid">${Object.keys(PROJECTS).map((id) => projectCard(id, state)).join('')}</div>
        <form class="clab-brief" data-brief ${selected ? '' : 'hidden'}>
          <div class="clab-context">
            <span>Lyhyt lähtötilanne</span>
            <p>Claude rakentaa turvallisen harjoitusversion. Se ei lähetä tietoja verkkoon eikä tallenna lomakkeeseen kirjoitettuja tietoja pysyvästi.</p>
          </div>
          <label><span>Projektin nimi tai aihe</span><input name="subject" value="${esc(state.subject)}" placeholder="${esc(selected?.example || '')}"></label>
          <label><span>Kenelle se on tarkoitettu?</span><input name="audience" value="${esc(state.audience)}" placeholder="${esc(selected?.audience || '')}"></label>
          <label class="wide"><span>Millainen ilme sopii projektiin?</span><input name="style" value="${esc(state.style)}" placeholder="${esc(selected?.style || '')}"></label>
          <p class="clab-error" data-error></p>
          <button class="btn primary" type="submit">Pyydä Claudelta suunnitelma →</button>
        </form>
        <div class="clab-loading" data-loading hidden><span></span><b>Claude suunnittelee projektia ennen rakentamista…</b><small>Näet suunnitelman ja päätät itse, saako työ alkaa.</small></div>
      </section>`);

    container.querySelectorAll('[data-project]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.project;
        const changed = state.project !== id;
        state.project = id;
        if (changed) {
          state.subject = '';
          state.audience = '';
          state.style = '';
          state.plan = null;
          state.build = null;
        }
        saveState(state);
        render();
      });
    });
    const form = container.querySelector('[data-brief]');
    if (!form) return;
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        state[input.name] = input.value.slice(0, 220);
        saveState(state);
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      state.subject = form.elements.subject.value.trim();
      state.audience = form.elements.audience.value.trim();
      state.style = form.elements.style.value.trim();
      const error = container.querySelector('[data-error]');
      if (state.subject.length < 3 || state.audience.length < 3 || state.style.length < 3) {
        error.textContent = 'Täytä projektin nimi, käyttäjät ja toivottu ilme.';
        return;
      }
      error.textContent = '';
      container.querySelector('[data-loading]').hidden = false;
      try {
        const response = await callApi('/plan', {
          project: state.project,
          subject: state.subject,
          audience: state.audience,
          style: state.style
        });
        state.plan = response.plan;
        state.permissions = [];
        state.phase = 'plan';
        saveState(state);
        render();
      } catch (requestError) {
        container.querySelector('[data-loading]').hidden = true;
        error.textContent = requestError.message;
      }
    });
  }

  function planProject(container, state, render) {
    const plan = state.plan;
    const permissions = [
      { id: 'files', title: 'Luo kolme projektin osaa', detail: 'Sisältö, ulkoasu ja toiminnallisuus harjoituskansioon.' },
      { id: 'offline', title: 'Pidä projekti paikallisena', detail: 'Ei verkkoyhteyksiä, kirjautumista tai ulkopuolisia palveluja.' },
      { id: 'sample', title: 'Käytä vain esimerkkitietoja', detail: 'Älä käytä oikeita asiakas- tai henkilötietoja.' }
    ];
    container.innerHTML = shell(state, `
      <section class="clab-plan">
        <header>
          <div><p class="clab-kicker">Clauden suunnitelma</p><h2>${esc(plan.name)}</h2><p>${esc(plan.summary)}</p></div>
          <button class="clab-text-button" data-back type="button">← Muuta lähtötietoja</button>
        </header>
        <div class="clab-plan-grid">
          <main>
            <p class="clab-panel-label">Miten käyttäjä etenee?</p>
            <div class="clab-journey">
              ${plan.userJourney.map((item, index) => `<div><span>${index + 1}</span><p>${esc(item)}</p></div>`).join('')}
            </div>
            <p class="clab-panel-label">Mitä sovelluksella voi tehdä?</p>
            <div class="clab-features">${plan.features.map((item) => `<span>✓ ${esc(item)}</span>`).join('')}</div>
          </main>
          <aside>
            <p class="clab-panel-label">Mitä Claude luo?</p>
            <div class="clab-files-simple">
              ${plan.files.map((file, index) => `
                <div><span>${['▤', '◐', '⚙'][index]}</span><p><b>${['Sisältö', 'Ulkoasu', 'Toiminta'][index]}</b><small>${esc(file.purpose)}</small><code>${esc(file.path)}</code></p></div>`).join('')}
            </div>
            <p class="clab-note">Tiedostonimet näkyvät, jotta kokemus vastaa Claude Codea. Sinun ei tarvitse avata tai ymmärtää niiden sisältämää koodia.</p>
          </aside>
        </div>
        <section class="clab-permissions">
          <div><p class="clab-kicker">Ennen kuin Claude aloittaa</p><h3>Hyväksy työn rajat</h3><p>Claude Code pyytää luvan ennen tiedostojen luomista tai komentojen suorittamista.</p></div>
          <div class="clab-permission-list">
            ${permissions.map((item) => {
              const checked = state.permissions.includes(item.id);
              return `
                <label class="${checked ? 'checked' : ''}">
                  <input type="checkbox" data-permission="${item.id}" ${checked ? 'checked' : ''}>
                  <span>${checked ? '✓' : ''}</span>
                  <p><b>${item.title}</b><small>${item.detail}</small></p>
                </label>`;
            }).join('')}
          </div>
          <div class="clab-plan-actions">
            <p>${state.permissions.length}/3 rajaa hyväksytty</p>
            <button class="btn primary" data-build type="button" ${state.permissions.length < 3 ? 'disabled' : ''}>Hyväksy ja rakenna projekti →</button>
          </div>
        </section>
        <div class="clab-loading" data-loading hidden><span></span><b>Claude luo projektin kolme osaa…</b><small>Kun työ valmistuu, voit käyttää sovellusta heti.</small></div>
      </section>`);

    container.querySelector('[data-back]').addEventListener('click', () => {
      state.phase = 'choose';
      saveState(state);
      render();
    });
    container.querySelectorAll('[data-permission]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        state.permissions = checkbox.checked
          ? [...new Set([...state.permissions, checkbox.dataset.permission])]
          : state.permissions.filter((id) => id !== checkbox.dataset.permission);
        saveState(state);
        render();
      });
    });
    container.querySelector('[data-build]').addEventListener('click', async () => {
      const loading = container.querySelector('[data-loading]');
      loading.hidden = false;
      try {
        const response = await callApi('/build', {
          project: state.project,
          subject: state.subject,
          audience: state.audience,
          style: state.style,
          plan: state.plan
        });
        state.build = response.build;
        state.revisions = [];
        state.tested = false;
        state.manualChecks = [];
        state.phase = 'studio';
        saveState(state);
        render();
      } catch (error) {
        loading.hidden = true;
        container.querySelector('.clab-plan-actions p').textContent = error.message;
      }
    });
  }

  function previewDocument(build) {
    const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'";
    return `<!doctype html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>${build.files.css}</style></head><body>${build.files.html}<script>${build.files.js}<\/script></body></html>`;
  }

  function fileContent(build, file) {
    if (file === 'styles.css') return build.files.css;
    if (file === 'app.js') return build.files.js;
    return build.files.html;
  }

  function checkPanel(state) {
    if (!state.tested) {
      return `<div class="clab-check-empty"><span>▷</span><p>Kun olet kokeillut sovellusta, aja automaattiset tarkistukset.</p></div>`;
    }
    return `
      <div class="clab-check-list">
        ${state.build.checks.map((check) => `
          <div class="${check.passed ? 'passed' : 'failed'}"><span>${check.passed ? '✓' : '!'}</span><p>${esc(check.label)}</p></div>`).join('')}
      </div>`;
  }

  function manualChecklist(state) {
    const items = state.build.checklist.length
      ? state.build.checklist.slice(0, 4)
      : ['Täytä lomake ja lähetä se', 'Kokeile toista syötettä', 'Tarkista näkymä pienellä näytöllä'];
    return items.map((item, index) => {
      const checked = state.manualChecks.includes(index);
      return `
        <label class="${checked ? 'checked' : ''}">
          <input type="checkbox" data-manual="${index}" ${checked ? 'checked' : ''}>
          <span>${checked ? '✓' : ''}</span><p>${esc(item)}</p>
        </label>`;
    }).join('');
  }

  function studio(container, state, render) {
    const build = state.build;
    const allPassed = build.checks.every((check) => check.passed);
    const ready = state.tested && allPassed && state.revisions.length > 0 && state.manualChecks.length > 0;
    container.innerHTML = shell(state, `
      <section class="clab-studio">
        <header class="clab-studio-bar">
          <div><span class="clab-live-dot"></span><b>Claude Code · ${esc(state.subject)}</b><small>Harjoitusprojekti</small></div>
          <span class="clab-saved">Tallennettu automaattisesti</span>
        </header>
        <div class="clab-studio-grid">
          <aside class="clab-project-panel">
            <p class="clab-panel-label">Projektin osat</p>
            ${[
              ['index.html', '▤', 'Sisältö'],
              ['styles.css', '◐', 'Ulkoasu'],
              ['app.js', '⚙', 'Toiminta']
            ].map(([file, icon, label]) => `
              <button class="${state.activeFile === file ? 'active' : ''}" data-file="${file}">
                <span>${icon}</span><p><b>${label}</b><code>${file}</code></p>
              </button>`).join('')}
            <details class="clab-technical" ${state.activeFile ? '' : ''}>
              <summary>Näytä tekniset tiedot</summary>
              <p>Koodia ei tarvitse ymmärtää. Se näyttää, mitä Claude loi valitsemaasi projektin osaan.</p>
              <pre>${esc(fileContent(build, state.activeFile))}</pre>
            </details>
          </aside>
          <main class="clab-preview">
            <div class="clab-preview-bar">
              <div><span></span><span></span><span></span></div>
              <b>Toimiva esikatselu</b>
              <small>Kokeile lomaketta ja painikkeita</small>
            </div>
            <iframe title="Rakennetun sovelluksen esikatselu" sandbox="allow-scripts" srcdoc="${esc(previewDocument(build))}"></iframe>
          </main>
          <aside class="clab-work-panel">
            <section>
              <p class="clab-panel-label">1. Kokeile itse</p>
              <p class="clab-help">Käytä keskellä näkyvää sovellusta kuten oikea käyttäjä. Merkitse kokeilemasi asiat.</p>
              <div class="clab-manual-list">${manualChecklist(state)}</div>
            </section>
            <section>
              <div class="clab-panel-row"><p class="clab-panel-label">2. Automaattiset tarkistukset</p><button type="button" data-run-checks>${state.tested ? 'Aja uudelleen' : 'Aja tarkistukset'}</button></div>
              ${checkPanel(state)}
            </section>
            <section class="clab-revision">
              <p class="clab-panel-label">3. Pyydä yksi parannus</p>
              <p class="clab-help">Kerro muutos tavallisella kielellä. Esimerkiksi: “Tee yhteissummasta näkyvämpi” tai “Lisää tapahtumaan pukukoodi”.</p>
              <textarea rows="4" data-revision placeholder="Haluaisin, että…"></textarea>
              <p class="clab-error" data-error></p>
              <button class="btn primary" type="button" data-revise>Pyydä Claudea muuttamaan</button>
              <div class="clab-revision-history">
                ${state.revisions.map((item, index) => `<div><span>${index + 1}</span><p>${esc(item)}</p></div>`).join('')}
              </div>
            </section>
          </aside>
        </div>
        <footer class="clab-studio-footer">
          <div class="clab-ready-list">
            <span class="${state.manualChecks.length ? 'done' : ''}">${state.manualChecks.length ? '✓' : '○'} Kokeiltu itse</span>
            <span class="${state.tested && allPassed ? 'done' : ''}">${state.tested && allPassed ? '✓' : '○'} Tarkistukset läpi</span>
            <span class="${state.revisions.length ? 'done' : ''}">${state.revisions.length ? '✓' : '○'} Oma muutos tehty</span>
          </div>
          <button class="btn primary" data-finish type="button" ${ready ? '' : 'disabled'}>Hyväksy valmis projekti →</button>
        </footer>
        <div class="clab-loading" data-loading hidden><span></span><b>Claude tekee pyytämääsi muutosta…</b><small>Toimivat ominaisuudet säilytetään ja tarkistukset ajetaan uudelleen.</small></div>
      </section>`);

    container.querySelectorAll('[data-file]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeFile = button.dataset.file;
        saveState(state);
        render();
      });
    });
    container.querySelectorAll('[data-manual]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const index = Number(checkbox.dataset.manual);
        state.manualChecks = checkbox.checked
          ? [...new Set([...state.manualChecks, index])]
          : state.manualChecks.filter((value) => value !== index);
        saveState(state);
        render();
      });
    });
    container.querySelector('[data-run-checks]').addEventListener('click', () => {
      state.tested = true;
      saveState(state);
      render();
    });
    container.querySelector('[data-revise]').addEventListener('click', async () => {
      const instructionText = container.querySelector('[data-revision]').value.trim();
      const error = container.querySelector('[data-error]');
      if (instructionText.length < 10) {
        error.textContent = 'Kuvaa muutos hieman tarkemmin, vähintään 10 merkillä.';
        return;
      }
      error.textContent = '';
      container.querySelector('[data-loading]').hidden = false;
      try {
        const response = await callApi('/revise', {
          project: state.project,
          subject: state.subject,
          audience: state.audience,
          style: state.style,
          files: state.build.files,
          instruction: instructionText
        });
        state.build = response.build;
        state.revisions.push(instructionText);
        state.tested = false;
        saveState(state);
        render();
      } catch (requestError) {
        container.querySelector('[data-loading]').hidden = true;
        error.textContent = requestError.message;
      }
    });
    container.querySelector('[data-finish]').addEventListener('click', () => {
      state.phase = 'complete';
      saveState(state);
      render();
    });
  }

  function downloadProject(state) {
    const blob = new Blob([previewDocument(state.build)], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${state.subject.toLowerCase().replace(/[^a-z0-9åäö]+/gi, '-').replace(/^-|-$/g, '') || 'claude-projekti'}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function score(state) {
    return {
      brief: state.subject && state.audience && state.style ? 25 : 0,
      plan: state.permissions.length === 3 ? 25 : 0,
      testing: state.tested && state.build.checks.every((check) => check.passed) && state.manualChecks.length ? 25 : 0,
      iteration: state.revisions.length ? 25 : 0
    };
  }

  function complete(container, state, render) {
    const points = score(state);
    const total = Object.values(points).reduce((sum, value) => sum + value, 0);
    container.innerHTML = shell(state, `
      <section class="clab-complete">
        <div class="clab-result">
          <div class="clab-score" style="--score:${total * 3.6}deg"><span><b>${total}</b>/100</span></div>
          <div><p class="clab-kicker">Ensimmäinen Claude Code -projekti valmis</p><h2>${esc(state.subject)}</h2><p>Rakensit toimivan sovelluksen tavallisella kielellä, tarkistit suunnitelman, kokeilit lopputulosta ja ohjasit Claudea yhdellä omalla muutoksella.</p></div>
          <button class="btn primary" data-download type="button">Lataa toimiva projekti</button>
        </div>
        <div class="clab-score-grid">
          <article><span>${points.brief}/25</span><b>Selkeä tavoite</b><p>Kerroin mitä rakennetaan ja kenelle.</p></article>
          <article><span>${points.plan}/25</span><b>Suunnitelman arviointi</b><p>Rajasin työn ennen tiedostojen luomista.</p></article>
          <article><span>${points.testing}/25</span><b>Kokeilu</b><p>Käytin sovellusta ja ajoin tarkistukset.</p></article>
          <article><span>${points.iteration}/25</span><b>Ohjaaminen</b><p>Pyysin muutoksen saadun kokemuksen perusteella.</p></article>
        </div>
        <section class="clab-learning">
          <div><p class="clab-kicker">Mitä opit?</p><h3>Claude Code ei tarkoita, että sinun pitää osata kirjoittaa koodia.</h3><p>Arvokkain taito on kuvata tavoite, arvioida suunnitelma, kokeilla lopputulosta ja antaa täsmällistä palautetta. Tekniset yksityiskohdat voi avata vain silloin, kun niitä tarvitaan.</p></div>
          <div class="clab-final-actions"><button class="btn" data-back-studio type="button">Palaa projektiin</button><button class="btn primary" data-new type="button">Rakenna toinen projekti</button></div>
        </section>
        <div class="narrator done">✓ <b>Claude Code Build Studio suoritettu.</b></div>
      </section>`);
    container.querySelector('[data-download]').addEventListener('click', () => downloadProject(state));
    container.querySelector('[data-back-studio]').addEventListener('click', () => {
      state.phase = 'studio';
      saveState(state);
      render();
    });
    container.querySelector('[data-new]').addEventListener('click', () => {
      const next = freshState();
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, next);
      saveState(state);
      render();
    });
  }

  async function runBuildStudio(container) {
    let state = loadState() || freshState();
    function render() {
      if (state.phase === 'plan' && state.plan) return planProject(container, state, render);
      if (state.phase === 'studio' && state.build) return studio(container, state, render);
      if (state.phase === 'complete' && state.build) return complete(container, state, render);
      chooseProject(container, state, render);
    }
    render();
    (async function hydrateFromServer(attempt = 0) {
      if (!window.moduleWork || typeof window.moduleWork.loadModuleWork !== 'function') {
        if (attempt < 30) setTimeout(() => hydrateFromServer(attempt + 1), 100);
        return;
      }
      try {
        const remote = await window.moduleWork.loadModuleWork(WORK_ID);
        if (!remote || remote.version !== 1 || Number(remote.ts || 0) <= Number(state.ts || 0)) return;
        state = remote;
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
        render();
      } catch (_) {}
    })();
  }

  function renderMethod(container) {
    container.innerHTML = `
      <div class="clab-methods">
        ${instruction('choose')}
        <section>
          <p class="clab-kicker">Sinä johdat, Claude rakentaa</p>
          <h2>Viisi askelta ensimmäiseen toimivaan projektiin</h2>
          <p>Sinun ei tarvitse aloittaa tyhjästä eikä osata teknisiä sanoja. Valitse pieni tavoite, jota voit kokeilla heti.</p>
        </section>
        <div class="clab-method-grid">
          <article><span>01</span><h3>Valitse</h3><p>Aloita pienestä ja tutusta tarpeesta.</p><b>Mitä haluan saada aikaan?</b></article>
          <article><span>02</span><h3>Kerro</h3><p>Kuvaa käyttäjä, sisältö ja toivottu tunnelma.</p><b>Kenelle tämä tehdään?</b></article>
          <article><span>03</span><h3>Hyväksy</h3><p>Lue suunnitelma ennen kuin Claude rakentaa.</p><b>Onko suunta oikea?</b></article>
          <article><span>04</span><h3>Kokeile</h3><p>Käytä sovellusta kuten oikea käyttäjä.</p><b>Mikä toimii tai hämmentää?</b></article>
          <article><span>05</span><h3>Muuta</h3><p>Pyydä yksi parannus kokemuksesi perusteella.</p><b>Mitä haluan seuraavaksi?</b></article>
        </div>
      </div>`;
  }

  async function renderExample(container) {
    container.innerHTML = `
      <div class="clab-example">
        <div><p class="clab-kicker">Esimerkki · Kululaskuri</p><h2>Yhdestä tavallisesta pyynnöstä toimivaksi työkaluksi</h2></div>
        <div class="clab-example-flow">
          <article><span>Sinä</span><p>“Tee yksinyrittäjälle rauhallinen kululaskuri, jossa kulut näkyvät luokittain.”</p></article>
          <i>→</i>
          <article><span>Claude</span><p>Suunnitelma: kulun lisääminen, lista, poistaminen ja yhteissumma.</p></article>
          <i>→</i>
          <article><span>Kokeilu</span><p>Lisäät kaksi kulua ja huomaat, että yhteissumma jää liian pieneksi.</p></article>
          <i>→</i>
          <article><span>Muutos</span><p>“Tee yhteissummasta suurempi ja sijoita se sivun alkuun.”</p></article>
        </div>
        <div class="clab-example-note"><b>Huomaa:</b> käyttäjä ei kirjoittanut koodia. Hän ohjasi tavoitetta ja arvioi näkyvää lopputulosta.</div>
      </div>`;
  }

  window.PILLARS.push({
    id: 'p7',
    num: 7,
    name: 'Claude Code',
    subtitle: 'Rakenna toimiva projekti',
    briefingLabel: 'Työtapa',
    theory: {
      tagline: 'Kerro mitä tarvitset, hyväksy suunnitelma ja kokeile oikeasti toimivaa lopputulosta.',
      whatItDoes: 'Claude Code voi luoda projektin tiedostot, rakentaa toiminnallisuudet ja tehdä pyytämäsi muutokset. Tässä harjoituksessa rakennat pienen selaimessa toimivan sovelluksen ilman ohjelmointiosaamista.',
      howItWorks: 'Valitset rakennettavan projektin ja kuvaat tavoitteen tavallisella kielellä. Claude näyttää ensin suunnitelman. Kun hyväksyt työn rajat, Claude luo toimivan version. Sen jälkeen käytät sovellusta, ajat automaattiset tarkistukset ja pyydät vähintään yhden parannuksen.',
      benefits: 'Saat nopeasti toimivan ensimmäisen version ja opit ohjaamaan rakentamista tavoitteiden, kokeilun ja palautteen avulla.',
      whereToUse: 'Pienet laskurit, ilmoittautumissivut, seurantalistat, työkalut ja muut selkeästi rajatut projektit, joita voi kokeilla heti.'
    },
    briefing: async (container) => renderMethod(container),
    example: async (container) => renderExample(container),
    exercises: [{
      label: 'Build Studio · Rakenna oma projekti',
      outcome: 'Valitse → suunnittele → rakenna → kokeile → pyydä muutos → lataa',
      run: runBuildStudio
    }]
  });
})();
