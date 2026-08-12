window.PILLARS = window.PILLARS || [];

(() => {
  const STORAGE_KEY = 'claudeAutomationControlRoomV1';
  const WORK_ID = 'moduuli-claude-automation';
  const SOURCE_META = {
    calendar: { icon: '▦', name: 'Google Calendar', detail: 'Viime viikon kokoukset' },
    gmail: { icon: '✉', name: 'Gmail', detail: 'Tärkeät asiakasviestit' },
    crm: { icon: '◎', name: 'HubSpot CRM', detail: 'Riskit ja seuraavat askeleet' },
    drive: { icon: '▱', name: 'Google Drive', detail: 'Uusimmat asiakirjat' }
  };
  const TESTS = {
    normal: {
      number: '01',
      name: 'Normaali maanantai',
      detail: 'Kaikki lähteet ovat saatavilla ja ajantasaisia.',
      expected: 'Katsaus valmistuu.'
    },
    stale: {
      number: '02',
      name: 'Vanhentunut lähde',
      detail: 'Asiakasrekisteriä ei ole päivitetty 13 päivään.',
      expected: 'Automaatio pysähtyy.'
    },
    conflict: {
      number: '03',
      name: 'Ristiriitaiset lähteet',
      detail: 'Kalenteri ja asiakkaan sähköposti näyttävät eri päivämäärän.',
      expected: 'Ihminen tekee päätöksen.'
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

  function apiUrl(path) {
    const preview = new URLSearchParams(window.location.search).get('preview') === '1';
    return `/api/claude-automation${path}${preview ? '?preview=1' : ''}`;
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

  function freshState() {
    return {
      version: 1,
      phase: 'build',
      form: {
        goal: '',
        output: 'Tiivis maanantaikatsaus: kokoukset, asiakkaiden tärkeät viestit, avoimet riskit ja kolme seuraavaa tehtävää.',
        guardrail: 'Pysähdy ja ilmoita, jos lähde puuttuu, on yli seitsemän päivää vanha tai on ristiriidassa toisen lähteen kanssa.',
        approval: 'Pyydä hyväksyntä ennen kuin lähetät viestin, muutat kalenteria tai päivität asiakasrekisteriä.',
        sources: [],
        day: 'monday',
        time: '08:15'
      },
      skill: null,
      tests: {},
      selectedTest: 'normal',
      activated: false,
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
      const summary = `Automation Control Room · ${state.phase} · ${Object.keys(state.tests || {}).length}/3 testiä`;
      window.moduleWork.saveModuleWork(WORK_ID, clone(state), summary).catch(() => {});
    }, 800);
  }

  function instruction(phase) {
    const copy = {
      build: {
        step: 'Vaihe 1/4 · Rakenna',
        goal: 'Paketoi toistuva työ selkeäksi ja uudelleenkäytettäväksi taidoksi.',
        action: 'Määritä tavoite, lähteet, lopputulos, pysäytysehto ja hyväksymisraja.',
        proof: 'Taito toimii ilman, että ohje pitää kirjoittaa seuraavalla kerralla uudelleen.'
      },
      review: {
        step: 'Vaihe 2/4 · Tarkasta',
        goal: 'Erota taito, yhteydet, ajastus ja hyväksymisportti toisistaan.',
        action: 'Lue Clauden rakentama työnkulku ja korjaa lähtötietoja tarvittaessa.',
        proof: 'Jokaisella vaiheella on lähde, tarkoitus ja turvallinen poistumistapa.'
      },
      test: {
        step: 'Vaihe 3/4 · Testaa',
        goal: 'Varmista, ettei automaatio onnistu vain ihannetilanteessa.',
        action: 'Aja normaali, vanhentuneen lähteen ja ristiriitaisten lähteiden testi.',
        proof: 'Poikkeustilanteet pysäyttävät automaation ja nostavat päätöksen ihmiselle.'
      },
      active: {
        step: 'Vaihe 4/4 · Aktivoi',
        goal: 'Ota käyttöön testattu harjoitusautomaatio ja tarkasta seuraava ajo.',
        action: 'Vie työnkulku mukaasi tai aloita uusi versio.',
        proof: 'Ajastus, testitulokset ja hyväksymisrajat näkyvät samassa tarkastusketjussa.'
      }
    }[phase];
    return `
      <div class="ac-instruction">
        <div class="ac-step">${copy.step}</div>
        <dl>
          <div><dt>Tavoite</dt><dd>${copy.goal}</dd></div>
          <div><dt>Tee näin</dt><dd>${copy.action}</dd></div>
          <div><dt>Mistä tiedät onnistuneesi?</dt><dd>${copy.proof}</dd></div>
        </dl>
      </div>`;
  }

  function progress(phase) {
    const phases = ['build', 'review', 'test', 'active'];
    const current = Math.max(0, phases.indexOf(phase));
    const labels = ['Rakenna', 'Tarkasta', 'Testaa', 'Aktivoi'];
    return `
      <div class="ac-progress">
        ${labels.map((label, index) => `
          <div class="${index < current ? 'done' : ''} ${index === current ? 'active' : ''}">
            <span>${index < current ? '✓' : index + 1}</span><b>${label}</b>
          </div>`).join('')}
      </div>`;
  }

  function mission() {
    return `
      <section class="ac-mission">
        <div class="ac-mission-badge"><span>MON</span><b>08:15</b></div>
        <div>
          <p class="ac-kicker">Automaatiohaaste · Northstar Consulting</p>
          <h2>Rakenna maanantaikatsaus, johon voi luottaa</h2>
          <p>Tiimi käyttää joka maanantai 45 minuuttia kokousten, asiakasviestien, riskien ja asiakirjojen kokoamiseen. Muuta työ uudelleenkäytettäväksi taidoksi, ajasta se ja varmista testeillä, ettei automaatio peitä vanhaa tai ristiriitaista tietoa.</p>
        </div>
        <div class="ac-mission-metric"><small>Nykyinen työ</small><strong>45 min / viikko</strong><span>Tavoite: valmis luonnos klo 8.15</span></div>
      </section>`;
  }

  function shell(state, body) {
    return `<div class="ac-shell">${instruction(state.phase)}${progress(state.phase)}${body}</div>`;
  }

  function sourceCard(id, state) {
    const source = SOURCE_META[id];
    const selected = state.form.sources.includes(id);
    return `
      <button type="button" class="ac-source ${selected ? 'selected' : ''}" data-source="${id}" aria-pressed="${selected}">
        <span>${source.icon}</span>
        <div><b>${source.name}</b><small>${source.detail}</small></div>
        <em>${selected ? '✓' : '+'}</em>
      </button>`;
  }

  function buildForm(container, state, render) {
    container.innerHTML = shell(state, `
      ${mission()}
      <section class="ac-builder">
        <header>
          <div><p class="ac-kicker">Skill Builder</p><h2>Mitä automaatio tekee joka maanantai?</h2></div>
          <span class="ac-autosave">● Tallennetaan automaattisesti</span>
        </header>
        <form data-builder-form>
          <div class="ac-form-main">
            <label class="ac-field">
              <span><b>1. Taidon pysyvä ohje</b><small>Tämä osa käytetään jokaisella ajokerralla.</small></span>
              <textarea name="goal" rows="7" placeholder="Kokoa edellisen viikon asiakastyöstä maanantaikatsaus. Tarkista…">${esc(state.form.goal)}</textarea>
              <em data-count="goal">${state.form.goal.length}/1000</em>
            </label>
            <label class="ac-field">
              <span><b>2. Valmis lopputulos</b><small>Mitä taito tuottaa ja kenelle?</small></span>
              <textarea name="output" rows="4">${esc(state.form.output)}</textarea>
            </label>
            <div class="ac-form-split">
              <label class="ac-field safety">
                <span><b>3. Pysäytysehto</b><small>Milloin automaatio ei saa jatkaa?</small></span>
                <textarea name="guardrail" rows="5">${esc(state.form.guardrail)}</textarea>
              </label>
              <label class="ac-field approval">
                <span><b>4. Ihmisen hyväksyntä</b><small>Mitä automaatio ei saa tehdä itsenäisesti?</small></span>
                <textarea name="approval" rows="5">${esc(state.form.approval)}</textarea>
              </label>
            </div>
          </div>
          <aside class="ac-form-side">
            <section>
              <p class="ac-panel-label">Tietolähteet</p>
              <p>Valitse vain katsaukseen tarvittavat yhteydet.</p>
              <div class="ac-source-list">${Object.keys(SOURCE_META).map((id) => sourceCard(id, state)).join('')}</div>
            </section>
            <section class="ac-schedule-box">
              <p class="ac-panel-label">Ajastettu tehtävä</p>
              <label><span>Viikonpäivä</span><select name="day">
                <option value="monday" ${state.form.day === 'monday' ? 'selected' : ''}>Maanantai</option>
                <option value="tuesday" ${state.form.day === 'tuesday' ? 'selected' : ''}>Tiistai</option>
                <option value="wednesday" ${state.form.day === 'wednesday' ? 'selected' : ''}>Keskiviikko</option>
                <option value="thursday" ${state.form.day === 'thursday' ? 'selected' : ''}>Torstai</option>
                <option value="friday" ${state.form.day === 'friday' ? 'selected' : ''}>Perjantai</option>
              </select></label>
              <label><span>Kellonaika</span><input name="time" type="time" value="${esc(state.form.time)}"></label>
              <small>Europe/Helsinki · tehtävä ajetaan harjoitusympäristössä.</small>
            </section>
            <p class="ac-error" data-error></p>
            <button class="btn primary" type="submit">Rakenna taito Claudella →</button>
          </aside>
        </form>
        <div class="ac-loading" data-loading hidden><span></span><b>Claude paketoi ohjeen uudelleenkäytettäväksi taidoksi…</b><small>Taito, ajastus ja turvallisuusrajat erotetaan toisistaan.</small></div>
      </section>`);

    const form = container.querySelector('[data-builder-form]');
    form.querySelectorAll('textarea, select, input').forEach((field) => {
      field.addEventListener('input', () => {
        state.form[field.name] = field.value.slice(0, field.name === 'goal' ? 1000 : 700);
        const count = container.querySelector(`[data-count="${field.name}"]`);
        if (count) count.textContent = `${state.form[field.name].length}/1000`;
        saveState(state);
      });
    });
    container.querySelectorAll('[data-source]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.source;
        state.form.sources = state.form.sources.includes(id)
          ? state.form.sources.filter((source) => source !== id)
          : [...state.form.sources, id];
        saveState(state);
        render();
      });
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = container.querySelector('[data-error]');
      Object.assign(state.form, {
        goal: form.elements.goal.value.trim(),
        output: form.elements.output.value.trim(),
        guardrail: form.elements.guardrail.value.trim(),
        approval: form.elements.approval.value.trim(),
        day: form.elements.day.value,
        time: form.elements.time.value
      });
      if (state.form.goal.length < 30) {
        error.textContent = 'Kuvaa taidon tavoite vähintään 30 merkillä.';
        return;
      }
      if (state.form.sources.length < 2) {
        error.textContent = 'Valitse vähintään kaksi tietolähdettä.';
        return;
      }
      error.textContent = '';
      container.querySelector('[data-loading]').hidden = false;
      try {
        const result = await callApi('/compile', {
          goal: state.form.goal,
          output: state.form.output,
          guardrail: state.form.guardrail,
          approval: state.form.approval,
          sources: state.form.sources,
          schedule: { day: state.form.day, time: state.form.time }
        });
        state.skill = result.skill;
        state.tests = {};
        state.phase = 'review';
        saveState(state);
        render();
      } catch (requestError) {
        container.querySelector('[data-loading]').hidden = true;
        error.textContent = requestError.message;
      }
    });
  }

  function dayLabel(day) {
    return {
      monday: 'maanantaisin',
      tuesday: 'tiistaisin',
      wednesday: 'keskiviikkoisin',
      thursday: 'torstaisin',
      friday: 'perjantaisin'
    }[day] || day;
  }

  function flowNodes(skill) {
    const nodes = [
      { type: 'trigger', icon: '◷', title: 'Ajastus', detail: `${dayLabel(skill.schedule.day)} klo ${skill.schedule.time}` },
      ...skill.steps.slice(0, 6).map((step) => ({
        type: step.kind,
        icon: step.kind === 'read' ? '↳' : step.kind === 'check' ? '✓' : step.kind === 'approval' ? '◇' : step.kind === 'write' ? '↗' : '✦',
        title: step.title,
        detail: step.instruction
      })),
      { type: 'output', icon: '▤', title: skill.output.title, detail: skill.output.destination }
    ];
    return nodes.map((node, index) => `
      <div class="ac-flow-node type-${esc(node.type)}">
        <span>${node.icon}</span>
        <div><small>${String(index + 1).padStart(2, '0')}</small><b>${esc(node.title)}</b><p>${esc(node.detail)}</p></div>
      </div>`).join('<i class="ac-flow-arrow">↓</i>');
  }

  function reviewSkill(container, state, render) {
    const skill = state.skill;
    container.innerHTML = shell(state, `
      <section class="ac-control-room">
        <header class="ac-control-bar">
          <div><span class="ac-live-dot"></span><b>Automation Control Room</b><small>Luonnos · ei vielä aktiivinen</small></div>
          <button class="ac-text-button" data-edit type="button">← Muokkaa lähtötietoja</button>
        </header>
        <div class="ac-review-grid">
          <aside class="ac-skill-card">
            <p class="ac-panel-label">Uudelleenkäytettävä taito</p>
            <div class="ac-skill-icon">✦</div>
            <h2>${esc(skill.name)}</h2>
            <code>${esc(skill.invocation)}</code>
            <p>${esc(skill.purpose)}</p>
            <div class="ac-skill-meta"><span>${skill.instructions.length} ohjetta</span><span>${skill.sources.length} lähdettä</span><span>${skill.guardrails.length} turvarajaa</span></div>
            <div class="ac-skill-sources">${skill.sources.map((id) => `<span>${SOURCE_META[id]?.icon || '◇'} ${esc(SOURCE_META[id]?.name || id)}</span>`).join('')}</div>
          </aside>
          <main class="ac-flow">
            <div class="ac-section-head">
              <div><p class="ac-kicker">Automaation työnkulku</p><h2>Yksi taito, yksi ajastus, näkyvät rajat</h2></div>
              <span class="ac-schedule-chip">◷ ${dayLabel(skill.schedule.day)} ${esc(skill.schedule.time)}</span>
            </div>
            <div class="ac-flow-list">${flowNodes(skill)}</div>
          </main>
          <aside class="ac-guardrails">
            <p class="ac-panel-label">Turvallisuusrajat</p>
            ${skill.guardrails.map((item) => `<div class="ac-guard"><span>✓</span><p>${esc(item)}</p></div>`).join('')}
            <div class="ac-approval-gate">
              <span>◇ Ihmisen hyväksyntä</span>
              <b>${esc(skill.approvalGate.when)}</b>
              <p>${esc(skill.approvalGate.action)}</p>
            </div>
          </aside>
        </div>
        <footer class="ac-review-footer">
          <div><b>Miksi testaus tarvitaan?</b><span>Hyvältä näyttävä työnkulku voi silti käsitellä vanhaa tai ristiriitaista tietoa väärin.</span></div>
          <button class="btn primary" data-test type="button">Siirry testilaboratorioon →</button>
        </footer>
      </section>`);
    container.querySelector('[data-edit]').addEventListener('click', () => {
      state.phase = 'build';
      saveState(state);
      render();
    });
    container.querySelector('[data-test]').addEventListener('click', () => {
      state.phase = 'test';
      saveState(state);
      render();
    });
  }

  function testCard(id, state) {
    const test = TESTS[id];
    const result = state.tests[id];
    return `
      <button type="button" class="ac-test-card ${state.selectedTest === id ? 'selected' : ''} ${result ? `tested ${result.status}` : ''}" data-select-test="${id}">
        <span>${test.number}</span>
        <div><b>${test.name}</b><small>${test.detail}</small><em>${result ? (result.status === 'completed' ? '✓ Valmistui turvallisesti' : '⏸ Pysähtyi turvallisesti') : test.expected}</em></div>
      </button>`;
  }

  function eventTimeline(result) {
    if (!result) {
      return `<div class="ac-run-empty"><span>▷</span><b>Valitse testitilanne ja käynnistä ajo</b><p>Tapahtumaloki näyttää, mitä automaatio lukee, päättelee ja pysäyttää.</p></div>`;
    }
    return `
      <div class="ac-run-result status-${esc(result.status)}">
        <header><span>${result.status === 'completed' ? '✓' : '⏸'}</span><div><small>${result.status === 'completed' ? 'Ajo valmistui' : 'Ajo pysäytettiin'}</small><h3>${esc(result.headline)}</h3></div></header>
        <div class="ac-event-list">
          ${result.events.map((event, index) => `
            <div class="ac-event ${esc(event.status)}">
              <span>${String(index + 1).padStart(2, '0')}</span>
              <i></i>
              <div><b>${esc(event.label)}</b><p>${esc(event.detail)}</p></div>
              <em>${esc(event.source)}</em>
            </div>`).join('')}
        </div>
        ${result.warning ? `<div class="ac-run-warning"><b>Huomio</b><p>${esc(result.warning)}</p></div>` : ''}
        <div class="ac-run-summary"><b>${esc(result.summary)}</b><p>${esc(result.recommendation)}</p></div>
        ${result.outputPreview ? `<details><summary>Katso tuloksen esikatselu</summary><pre>${esc(result.outputPreview)}</pre></details>` : ''}
      </div>`;
  }

  function testLab(container, state, render) {
    const selectedId = state.selectedTest || 'normal';
    const selected = TESTS[selectedId];
    const result = state.tests[selectedId];
    const completedCount = Object.keys(state.tests).length;
    container.innerHTML = shell(state, `
      <section class="ac-test-lab">
        <header class="ac-control-bar">
          <div><span class="ac-live-dot"></span><b>Automation Test Lab</b><small>${completedCount}/3 testiä ajettu</small></div>
          <button class="ac-text-button" data-back type="button">← Tarkasta työnkulku</button>
        </header>
        <div class="ac-test-grid">
          <aside>
            <p class="ac-panel-label">Testitilanteet</p>
            <div class="ac-test-list">${Object.keys(TESTS).map((id) => testCard(id, state)).join('')}</div>
            <div class="ac-test-progress"><span style="width:${completedCount / 3 * 100}%"></span></div>
            <small>${completedCount === 3 ? 'Kaikki testit läpäisty.' : `Aja vielä ${3 - completedCount} testiä ennen aktivointia.`}</small>
          </aside>
          <main>
            <div class="ac-run-toolbar">
              <div><p class="ac-kicker">Valittu testi</p><h2>${selected.name}</h2><span>${selected.detail}</span></div>
              <button class="btn primary" data-run type="button">${result ? 'Aja testi uudelleen' : 'Käynnistä testiajo'}</button>
            </div>
            <div class="ac-run-stage">${eventTimeline(result)}</div>
          </main>
        </div>
        <footer class="ac-test-footer">
          <p data-test-message>${completedCount === 3 ? 'Normaali ajo valmistui ja molemmat poikkeustilanteet pysähtyivät turvallisesti.' : 'Automaatio voidaan aktivoida vasta kaikkien kolmen testin jälkeen.'}</p>
          <button class="btn primary" data-activate type="button" ${completedCount < 3 ? 'disabled' : ''}>Aktivoi harjoitusautomaatio →</button>
        </footer>
        <div class="ac-loading" data-loading hidden><span></span><b>Claude ajaa automaatiota harjoitustiedoilla…</b><small>Lähteitä, turvarajoja ja hyväksymisporttia seurataan.</small></div>
      </section>`);

    container.querySelectorAll('[data-select-test]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedTest = button.dataset.selectTest;
        saveState(state);
        render();
      });
    });
    container.querySelector('[data-back]').addEventListener('click', () => {
      state.phase = 'review';
      saveState(state);
      render();
    });
    container.querySelector('[data-run]').addEventListener('click', async () => {
      const loading = container.querySelector('[data-loading]');
      loading.hidden = false;
      try {
        const response = await callApi('/simulate', { skill: state.skill, scenarioId: selectedId });
        state.tests[selectedId] = response.simulation;
        saveState(state);
        render();
      } catch (error) {
        loading.hidden = true;
        container.querySelector('[data-test-message]').textContent = error.message;
      }
    });
    container.querySelector('[data-activate]').addEventListener('click', () => {
      state.activated = true;
      state.phase = 'active';
      saveState(state);
      render();
    });
  }

  function calculateScore(state) {
    const exactSources = Object.keys(SOURCE_META).every((id) => state.form.sources.includes(id))
      && state.form.sources.length === 4;
    const skill = Math.min(25, 10 + Math.round((state.skill?.instructions?.length || 0) * 1.5) + Math.round((state.skill?.steps?.length || 0)));
    const sources = exactSources ? 25 : Math.max(8, state.form.sources.length * 5);
    const schedule = state.form.day === 'monday' && state.form.time === '08:15' ? 25 : 17;
    const tests = ['normal', 'stale', 'conflict'].reduce((total, id) => {
      const expected = id === 'normal' ? 'completed' : 'paused';
      return total + (state.tests[id]?.status === expected ? 8 : 0);
    }, 1);
    return { skill, sources, schedule, tests, total: skill + sources + schedule + tests };
  }

  function exportWorkflow(state) {
    const payload = {
      exercise: 'Automation Control Room',
      exportedAt: new Date().toISOString(),
      skill: state.skill,
      testResults: state.tests,
      score: calculateScore(state),
      environment: 'sandbox'
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'claude-automation-tyonkulku.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function activeAutomation(container, state, render) {
    const score = calculateScore(state);
    const skill = state.skill;
    container.innerHTML = shell(state, `
      <section class="ac-active">
        <div class="ac-active-hero">
          <div class="ac-power"><span></span>ON</div>
          <div><p class="ac-kicker">Harjoitusautomaatio aktiivinen</p><h2>${esc(skill.name)}</h2><p>Skill, ajastus, yhteydet ja hyväksymisportti toimivat nyt yhtenä testattuna työnkulkuna.</p></div>
          <div class="ac-next-run"><small>Seuraava harjoitusajo</small><b>Ma 17.8. · ${esc(skill.schedule.time)}</b><span>Europe/Helsinki</span></div>
        </div>
        <div class="ac-active-grid">
          <main>
            <div class="ac-section-head"><div><p class="ac-kicker">Aktiivinen työnkulku</p><h2>Maanantaikatsauksen tarkastusketju</h2></div><code>${esc(skill.invocation)}</code></div>
            <div class="ac-active-flow">${flowNodes(skill)}</div>
          </main>
          <aside>
            <div class="ac-score-ring" style="--score:${score.total * 3.6}deg"><span><b>${score.total}</b>/100</span></div>
            <h3>Automaatiovalmius</h3>
            <div class="ac-score-lines">
              <span><b>Taito</b><em>${score.skill}/25</em></span>
              <span><b>Lähteet</b><em>${score.sources}/25</em></span>
              <span><b>Ajastus</b><em>${score.schedule}/25</em></span>
              <span><b>Poikkeustestit</b><em>${score.tests}/25</em></span>
            </div>
          </aside>
        </div>
        <div class="ac-test-receipts">
          ${Object.keys(TESTS).map((id) => {
            const result = state.tests[id];
            return `<article><span>${result.status === 'completed' ? '✓' : '⏸'}</span><div><b>${TESTS[id].name}</b><small>${esc(result.headline)}</small></div><em>${result.status === 'completed' ? 'Valmis' : 'Turvallisesti pysäytetty'}</em></article>`;
          }).join('')}
        </div>
        <footer class="ac-active-footer">
          <div><b>Tärkein oppi</b><p>Taito kertoo, miten työ tehdään. Ajastus kertoo, milloin se käynnistyy. Yhteydet tuovat tiedon. Hyväksymisportti pitää vaikutukset ihmisen hallinnassa.</p></div>
          <div><button class="btn" data-export type="button">Lataa työnkulku</button><button class="btn primary" data-restart type="button">Rakenna uusi versio</button></div>
        </footer>
        <div class="narrator done">✓ <b>Skills, Scheduled Tasks ja Automation -harjoitus suoritettu.</b></div>
      </section>`);
    container.querySelector('[data-export]').addEventListener('click', () => exportWorkflow(state));
    container.querySelector('[data-restart]').addEventListener('click', () => {
      const next = freshState();
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, next);
      saveState(state);
      render();
    });
  }

  async function runAutomationLab(container) {
    let state = loadState() || freshState();
    function render() {
      if (state.phase === 'review' && state.skill) return reviewSkill(container, state, render);
      if (state.phase === 'test' && state.skill) return testLab(container, state, render);
      if (state.phase === 'active' && state.skill) return activeAutomation(container, state, render);
      buildForm(container, state, render);
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

  function renderMethods(container) {
    container.innerHTML = `
      <div class="ac-methods">
        ${instruction('build')}
        <section>
          <p class="ac-kicker">Neljä eri rakennusosaa</p>
          <h2>Automaatio ei ole pelkkä ajastettu kehote</h2>
          <p>Luotettava työnkulku syntyy vasta, kun pysyvä ohje, tietolähteet, käynnistyshetki ja ihmisen päätösvalta määritellään erikseen.</p>
        </section>
        <div class="ac-method-grid">
          <article><span>SKILL</span><h3>Taito</h3><p>Uudelleenkäytettävä ohje kertoo, miten tehtävä tehdään samalla tavalla joka kerta.</p><b>Kirjoita kerran, käytä uudelleen.</b></article>
          <article><span>CONNECT</span><h3>Yhteydet</h3><p>Kalenteri, sähköposti ja asiakasrekisteri tuovat ajantasaisen tiedon.</p><b>Anna vain tarvittava pääsy.</b></article>
          <article><span>TRIGGER</span><h3>Ajastus</h3><p>Ajastettu tehtävä käynnistää taidon sovittuna aikana pilvessä.</p><b>Määritä myös aikavyöhyke.</b></article>
          <article><span>GATE</span><h3>Hyväksymisportti</h3><p>Poikkeus tai vaikutuksia aiheuttava toiminto palauttaa päätöksen ihmiselle.</p><b>Automaattinen ei tarkoita valvomatonta.</b></article>
        </div>
      </div>`;
  }

  async function renderExample(container) {
    container.innerHTML = `
      <div class="ac-example">
        <div><p class="ac-kicker">Työnkulun läpileikkaus</p><h2>Samasta taidosta turvalliseksi automaatioksi</h2><p>Esimerkki näyttää, mitä tapahtuu ennen maanantaiaamun valmista katsausta.</p></div>
        <div class="ac-example-flow">
          <article><span>1</span><b>Ajastus käynnistää</b><p>Maanantai klo 8.15, Europe/Helsinki</p></article><i>→</i>
          <article><span>2</span><b>Taito ohjaa</b><p>Sama rakenne ja tarkistukset joka viikko</p></article><i>→</i>
          <article><span>3</span><b>Yhteydet lukevat</b><p>Kalenteri, sähköposti, CRM ja Drive</p></article><i>→</i>
          <article><span>4</span><b>Turvaraja tarkistaa</b><p>Tuoreus, puuttuva tieto ja ristiriidat</p></article><i>→</i>
          <article><span>5</span><b>Luonnos valmistuu</b><p>Ei viestien lähetystä ilman hyväksyntää</p></article>
        </div>
      </div>`;
  }

  window.PILLARS.push({
    id: 'p6',
    num: 6,
    name: 'Skills & Scheduled Tasks',
    subtitle: 'Taidot, ajastukset ja automaatiot',
    briefingLabel: 'Automaation rakenne',
    theory: {
      tagline: 'Paketoi toimiva ohje taidoksi, käynnistä se ajastuksella ja testaa poikkeukset ennen automaation aktivointia.',
      whatItDoes: 'Skill eli taito säilyttää tehtävän työohjeen uudelleenkäyttöä varten. Scheduled Task eli ajastettu tehtävä käynnistää taidon sovittuna aikana. Automaatio yhdistää nämä tietolähteisiin, turvarajoihin ja hyväksymisportteihin.',
      howItWorks: 'Taito määrittelee vaiheet ja lopputuloksen. Yhteydet tuovat ajantasaiset tiedot. Ajastus määrittelee käynnistyshetken ja aikavyöhykkeen. Testit varmistavat, että vanha, puuttuva tai ristiriitainen tieto pysäyttää työnkulun sen sijaan, että automaatio jatkaisi hiljaa.',
      benefits: 'Toistuva työ valmistuu samalla rakenteella, mutta ihminen säilyttää päätösvallan poikkeuksissa ja vaikutuksia aiheuttavissa toiminnoissa.',
      whereToUse: 'Viikko- ja kuukausikatsaukset, seurantaraportit, aineiston tarkistukset sekä muut tehtävät, joiden lähteet, rakenne ja turvallisuusrajat voidaan määritellä etukäteen.'
    },
    briefing: async (container) => renderMethods(container),
    example: async (container) => renderExample(container),
    exercises: [{
      label: 'Automation Control Room · Maanantaikatsaus',
      outcome: 'Rakenna taito → ajasta → testaa poikkeukset → aktivoi automaatio',
      run: runAutomationLab
    }]
  });
})();
