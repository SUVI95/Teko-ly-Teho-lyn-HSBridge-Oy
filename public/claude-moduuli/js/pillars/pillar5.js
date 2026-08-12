window.PILLARS = window.PILLARS || [];

(() => {
  const STORAGE_KEY = 'claudeConnectorCommandCenterV1';
  const WORK_ID = 'moduuli-claude-connectors';
  const REQUIRED = ['calendar', 'gmail', 'crm', 'drive'];
  let remoteSaveTimer = null;

  const CONNECTORS = {
    calendar: {
      icon: '▦',
      name: 'Google Calendar',
      description: 'Tapaamiset, osallistujat ja videolinkit',
      scope: 'Lue tapahtumat · muokkaa yhtä tapahtumaa',
      risk: 'Rajattu kalenteriin'
    },
    gmail: {
      icon: '✉',
      name: 'Gmail',
      description: 'Asiakkaan viestiketju ja vahvistukset',
      scope: 'Lue ketju · luo luonnos · älä lähetä',
      risk: 'Ei lähetysoikeutta'
    },
    crm: {
      icon: '◎',
      name: 'HubSpot CRM',
      description: 'Asiakaskortti, sopimus ja avoimet asiat',
      scope: 'Lue yksi asiakas · lisää merkintä',
      risk: 'Vain Kaiku Audio'
    },
    drive: {
      icon: '▱',
      name: 'Google Drive',
      description: 'Tarjoukset ja tapaamisen asiakirjat',
      scope: 'Lue asiakaskansio · luo yksi tiedosto',
      risk: 'Vain asiakaskansio'
    },
    slack: {
      icon: '#',
      name: 'Slack',
      description: 'Sisäiset keskustelut ja kanavat',
      scope: 'Hae Kaiku Audio -mainintoja',
      risk: 'Tieto voi olla epävarmaa'
    },
    github: {
      icon: '⌘',
      name: 'GitHub',
      description: 'Koodivarastot ja tekniset tehtävät',
      scope: 'Lue organisaation koodivarastoja',
      risk: 'Laaja pääsy'
    },
    hr: {
      icon: '♙',
      name: 'Henkilöstöhallinto',
      description: 'Työsuhde- ja henkilöstötiedot',
      scope: 'Lue henkilöstötietoja',
      risk: 'Arkaluonteista tietoa'
    }
  };

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
    return `/api/claude-connectors${path}${preview ? '?preview=1' : ''}`;
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
      if (error.name === 'AbortError') throw new Error('Tutkiminen kesti liian kauan. Yritä uudelleen.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function freshState() {
    return {
      version: 1,
      phase: 'connect',
      selected: [],
      prompt: '',
      analysis: null,
      toolLog: [],
      proposals: [],
      decision: '',
      approved: [],
      executed: [],
      completed: false,
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

  function stateSummary(state) {
    const labels = {
      connect: 'yhteyksien valinta',
      prompt: 'toimeksianto',
      approve: 'päätös ja hyväksyntä',
      complete: 'valmis'
    };
    return `Connectors · ${labels[state.phase] || state.phase} · ${state.selected.length} yhteyttä`;
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
      window.moduleWork.saveModuleWork(WORK_ID, clone(state), stateSummary(state)).catch(() => {});
    }, 800);
  }

  function instruction(phase) {
    const copy = {
      connect: {
        step: 'Vaihe 1/4 · Rajaa pääsy',
        goal: 'Valitse vain ne palvelut, joita asiakastapaamisen valmistelu todella tarvitsee.',
        action: 'Vertaa tehtävää yhteyksien sisältöön ja käyttöoikeuksiin.',
        proof: 'Hyvä valinta antaa riittävästi tietoa ilman tarpeettomia oikeuksia.'
      },
      prompt: {
        step: 'Vaihe 2/4 · Tutki',
        goal: 'Anna Claudelle yksi toimeksianto, jolla se kokoaa luotettavan tilannekuvan.',
        action: 'Pyydä tarkistamaan lähteet, ristiriidat, ajankohdat ja uusimmat versiot.',
        proof: 'Näet jokaisen lukutoimen tapahtumalokissa.'
      },
      approve: {
        step: 'Vaihe 3/4 · Päätä',
        goal: 'Ratkaise lähteiden ristiriita ja hyväksy kirjoittavat toimet yksitellen.',
        action: 'Tarkista lähde, rajaus ja vaikutus ennen hyväksyntää.',
        proof: 'Mikään muutos ei toteudu ilman päätöstäsi.'
      },
      complete: {
        step: 'Vaihe 4/4 · Tarkasta',
        goal: 'Arvioi työnkulku ja vie tapahtumaloki mukaasi.',
        action: 'Katso, missä onnistuit ja mitä parantaisit oikeassa työssä.',
        proof: 'Valmis loki erottaa luetut tiedot, päätökset ja toteutetut muutokset.'
      }
    }[phase];
    return `
      <div class="cc-instruction">
        <div class="cc-step">${copy.step}</div>
        <dl>
          <div><dt>Tavoite</dt><dd>${copy.goal}</dd></div>
          <div><dt>Tee näin</dt><dd>${copy.action}</dd></div>
          <div><dt>Mistä tiedät onnistuneesi?</dt><dd>${copy.proof}</dd></div>
        </dl>
      </div>`;
  }

  function progress(phase) {
    const phases = ['connect', 'prompt', 'approve', 'complete'];
    const active = Math.max(0, phases.indexOf(phase));
    const labels = ['Yhdistä', 'Tutki', 'Hyväksy', 'Tarkasta'];
    return `
      <div class="cc-progress" aria-label="Tehtävän eteneminen">
        ${labels.map((label, index) => `
          <div class="${index < active ? 'done' : ''} ${index === active ? 'active' : ''}">
            <span>${index < active ? '✓' : index + 1}</span><b>${label}</b>
          </div>`).join('')}
      </div>`;
  }

  function missionCard() {
    return `
      <section class="cc-mission">
        <div class="cc-mission-time"><span>09.05</span><small>Keskiviikko 12.8.</small></div>
        <div>
          <p class="cc-kicker">Tilanne · Northstar Consulting</p>
          <h2>Pelasta tämänpäiväinen asiakastapaaminen</h2>
          <p>Kaiku Audio Oy:n jatkosopimusta käsittelevä tapaaminen alkaa pian. Kalenteri, sähköposti, asiakasrekisteri ja tarjouskansio eivät näytä samaa tilannetta. Selvitä oikea aika, valmistele keskustelu ja pidä kaikki muutokset hyväksyntäsi takana.</p>
        </div>
        <div class="cc-mission-stakes">
          <span>Tapaamiseen</span>
          <strong>4 h 55 min</strong>
          <small>Sopimus uusitaan 31.8.</small>
        </div>
      </section>`;
  }

  function shell(state, body) {
    return `
      <div class="cc-shell">
        ${instruction(state.phase)}
        ${progress(state.phase)}
        ${body}
      </div>`;
  }

  function connectorCard(id, state) {
    const item = CONNECTORS[id];
    const selected = state.selected.includes(id);
    return `
      <button class="cc-connector ${selected ? 'selected' : ''}" data-connector="${id}" type="button" aria-pressed="${selected}">
        <span class="cc-connector-icon">${item.icon}</span>
        <span class="cc-connector-copy">
          <b>${item.name}</b>
          <small>${item.description}</small>
        </span>
        <span class="cc-connector-check">${selected ? '✓' : '+'}</span>
        <span class="cc-scope">${item.scope}</span>
        <span class="cc-risk">${item.risk}</span>
      </button>`;
  }

  function renderConnect(container, state, render) {
    container.innerHTML = shell(state, `
      ${missionCard()}
      <section class="cc-connect">
        <div class="cc-section-head">
          <div>
            <p class="cc-kicker">Saatavilla olevat yhteydet</p>
            <h2>Mihin Claude saa päästä?</h2>
          </div>
          <div class="cc-selection-count"><b>${state.selected.length}</b><span>valittu</span></div>
        </div>
        <p class="cc-lead">Valitse yhteydet tehtävän perusteella. Enemmän yhteyksiä ei tarkoita parempaa tulosta: jokainen yhteys kasvattaa käytettävän tiedon ja käyttöoikeuksien määrää.</p>
        <div class="cc-connector-grid">
          ${Object.keys(CONNECTORS).map((id) => connectorCard(id, state)).join('')}
        </div>
        <div class="cc-connect-footer">
          <p data-connect-feedback>${state.selected.length < 2 ? 'Valitse vähintään kaksi yhteyttä.' : 'Voit jatkaa. Saat myöhemmin palautetta valintojen tarpeellisuudesta.'}</p>
          <button class="btn primary" data-continue type="button" ${state.selected.length < 2 ? 'disabled' : ''}>Jatka toimeksiantoon →</button>
        </div>
      </section>`);

    container.querySelectorAll('[data-connector]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.connector;
        state.selected = state.selected.includes(id)
          ? state.selected.filter((value) => value !== id)
          : [...state.selected, id];
        saveState(state);
        render();
      });
    });
    container.querySelector('[data-continue]').addEventListener('click', () => {
      state.phase = 'prompt';
      state.analysis = null;
      state.toolLog = [];
      state.proposals = [];
      state.decision = '';
      state.approved = [];
      saveState(state);
      render();
    });
  }

  function sourcePlaceholder(id) {
    const connector = CONNECTORS[id];
    return `
      <article class="cc-source waiting">
        <div><span>${connector.icon}</span><b>${connector.name}</b></div>
        <p>Odottaa Clauden tutkimusta</p>
      </article>`;
  }

  function toolLog(log) {
    if (!log.length) {
      return `<div class="cc-log-empty"><span>◇</span><p>Tapahtumaloki täyttyy, kun Claude käyttää yhteyksiä.</p></div>`;
    }
    return `
      <div class="cc-tool-log">
        ${log.map((entry, index) => `
          <div class="cc-log-row">
            <span class="cc-log-index">${String(index + 1).padStart(2, '0')}</span>
            <span class="cc-log-pulse"></span>
            <div><b>${esc(entry.tool)}</b><small>${esc(entry.connector)} · ${esc(entry.checkedAt)}</small></div>
            <span class="cc-log-status">Luettu</span>
          </div>`).join('')}
      </div>`;
  }

  function renderPrompt(container, state, render) {
    const chips = state.selected.map((id) => `<span>${CONNECTORS[id].icon} ${CONNECTORS[id].name}</span>`).join('');
    container.innerHTML = shell(state, `
      ${missionCard()}
      <section class="cc-command-center">
        <header class="cc-command-bar">
          <div><span class="cc-live-dot"></span><b>Connector Command Center</b><small>Turvallinen harjoitusympäristö</small></div>
          <button class="cc-text-button" data-back type="button">← Muuta yhteyksiä</button>
        </header>
        <div class="cc-command-grid">
          <main class="cc-chat">
            <div class="cc-chat-head">
              <span class="cc-claude-mark">✦</span>
              <div><b>Claude</b><small>${state.selected.length} yhteyttä käytettävissä · vain luku tässä vaiheessa</small></div>
            </div>
            <div class="cc-message assistant">
              <p>Olen valmis tutkimaan tapaamisen tilanteen. Kerro tavoite, mitä lähteistä pitää varmistaa ja miten haluat minun käsittelevän ristiriitoja.</p>
            </div>
            <form class="cc-prompt-box" data-prompt-form>
              <label for="ccMissionPrompt">Kirjoita oma toimeksiantosi</label>
              <textarea id="ccMissionPrompt" rows="6" placeholder="Esimerkiksi: Selvitä tämänpäiväisen Kaiku Audio -tapaamisen…">${esc(state.prompt)}</textarea>
              <div class="cc-prompt-help">
                <span>Hyvä toimeksianto kertoo tavoitteen, pyytää lähteet näkyviin ja rajaa muutokset hyväksynnän taakse.</span>
                <span data-char-count>${state.prompt.length}/1200</span>
              </div>
              <p class="cc-error" data-error></p>
              <button class="btn primary" type="submit">Tutki yhteyksien avulla</button>
            </form>
          </main>
          <aside class="cc-sources">
            <div class="cc-panel-title"><span>Yhdistetyt palvelut</span><b>${state.selected.length}</b></div>
            ${state.selected.map(sourcePlaceholder).join('')}
          </aside>
          <section class="cc-log-panel">
            <div class="cc-panel-title"><span>Reaaliaikainen tapahtumaloki</span><small>Lukeminen ei muuta lähteitä</small></div>
            ${toolLog([])}
          </section>
        </div>
        <div class="cc-connection-strip">${chips}</div>
        <div class="cc-loading" data-loading hidden>
          <span></span><b data-loading-text>Claude avaa valittuja yhteyksiä…</b>
          <small>Mitään ei muuteta ilman hyväksyntääsi.</small>
        </div>
      </section>`);

    const textarea = container.querySelector('#ccMissionPrompt');
    const counter = container.querySelector('[data-char-count]');
    textarea.addEventListener('input', () => {
      state.prompt = textarea.value.slice(0, 1200);
      counter.textContent = `${state.prompt.length}/1200`;
      saveState(state);
    });
    container.querySelector('[data-back]').addEventListener('click', () => {
      state.phase = 'connect';
      saveState(state);
      render();
    });
    container.querySelector('[data-prompt-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      state.prompt = textarea.value.trim();
      const error = container.querySelector('[data-error]');
      if (state.prompt.length < 20) {
        error.textContent = 'Kirjoita hieman tarkempi toimeksianto, vähintään 20 merkkiä.';
        return;
      }
      error.textContent = '';
      const loading = container.querySelector('[data-loading]');
      const loadingText = container.querySelector('[data-loading-text]');
      loading.hidden = false;
      const messages = [
        'Claude avaa valittuja yhteyksiä…',
        'Lähteitä ja ajankohtia verrataan…',
        'Uusinta tietoa erotetaan vanhasta…',
        'Tilannekuvaa kootaan…'
      ];
      let messageIndex = 0;
      const statusTimer = setInterval(() => {
        messageIndex = Math.min(messageIndex + 1, messages.length - 1);
        loadingText.textContent = messages[messageIndex];
      }, 1800);
      try {
        const result = await callApi('/investigate', {
          prompt: state.prompt,
          connectors: state.selected
        });
        state.analysis = result.analysis;
        state.toolLog = result.toolLog || [];
        state.proposals = result.proposals || [];
        state.decision = '';
        state.approved = [];
        state.executed = [];
        state.phase = 'approve';
        saveState(state);
        render();
      } catch (requestError) {
        clearInterval(statusTimer);
        loading.hidden = true;
        error.textContent = requestError.message;
      } finally {
        clearInterval(statusTimer);
      }
    });
  }

  function summarizeResult(entry) {
    const data = entry.result || {};
    if (entry.connectorId === 'calendar') return `${data.date} · ${data.time} · ${data.title}`;
    if (entry.connectorId === 'gmail') return `${data.receivedAt} · ${data.subject}`;
    if (entry.connectorId === 'crm') return `${data.dealStage} · ${data.openIssue}`;
    if (entry.connectorId === 'drive') return `${data.latestFile} · muokattu ${data.modifiedAt}`;
    if (Array.isArray(data.messages)) return data.messages.join(' ');
    return data.result || 'Ei tehtävään liittyvää tietoa.';
  }

  function evidenceCards(state) {
    return state.toolLog.map((entry) => `
      <article class="cc-evidence ${REQUIRED.includes(entry.connectorId) ? 'useful' : 'extra'}">
        <header>
          <span>${CONNECTORS[entry.connectorId]?.icon || '◇'}</span>
          <div><b>${esc(entry.connector)}</b><small>${esc(entry.checkedAt)}</small></div>
          <em>${REQUIRED.includes(entry.connectorId) ? 'Olennainen' : 'Ei ratkaiseva'}</em>
        </header>
        <p>${esc(summarizeResult(entry))}</p>
      </article>`).join('');
  }

  function findingCards(analysis) {
    if (!analysis?.findings?.length) return '';
    return analysis.findings.map((finding) => `
      <article class="cc-finding importance-${esc(finding.importance)}">
        <span>${esc(finding.source)}</span>
        <b>${esc(finding.title)}</b>
        <p>${esc(finding.detail)}</p>
      </article>`).join('');
  }

  function actionCard(action, state) {
    const checked = state.approved.includes(action.id);
    return `
      <label class="cc-action ${checked ? 'approved' : ''} ${action.available ? '' : 'unavailable'}">
        <input type="checkbox" data-action="${esc(action.id)}" ${checked ? 'checked' : ''} ${action.available ? '' : 'disabled'}>
        <span class="cc-action-check">${checked ? '✓' : ''}</span>
        <span class="cc-action-copy">
          <small>${esc(action.connector)}</small>
          <b>${esc(action.title)}</b>
          <span>${esc(action.detail)}</span>
          <em>${esc(action.permission)}</em>
        </span>
        <strong>${action.available ? 'Odottaa hyväksyntää' : 'Yhteys puuttuu'}</strong>
      </label>`;
  }

  function renderApprove(container, state, render) {
    const analysis = state.analysis || {};
    container.innerHTML = shell(state, `
      <section class="cc-review">
        <header class="cc-review-head">
          <div>
            <p class="cc-kicker">Clauden tilannekuva</p>
            <h2>Tarkista ennen kuin mitään muutetaan</h2>
          </div>
          <button class="cc-text-button" data-research type="button">← Tutki uudelleen</button>
        </header>
        <div class="cc-review-grid">
          <main>
            <div class="cc-analysis-summary">
              <span class="cc-claude-mark">✦</span>
              <div><b>Yhteenveto</b><p>${esc(analysis.summary || 'Tilannekuva on koottu valituista lähteistä.')}</p></div>
            </div>
            <div class="cc-findings">${findingCards(analysis)}</div>
            <section class="cc-conflict">
              <div class="cc-conflict-head"><span>!</span><div><small>Lähderistiriita</small><h3>${esc(analysis.conflict?.title || 'Tapaamisen kellonaika')}</h3></div></div>
              <p>${esc(analysis.conflict?.detail || 'Kalenterissa ja asiakkaan uusimmassa sähköpostissa on eri kellonaika.')}</p>
              <p class="cc-recommendation"><b>Clauden suositus:</b> ${esc(analysis.conflict?.recommendation || 'Pidä ristiriita näkyvissä ja tee päätös uusimman vahvistetun lähteen perusteella.')}</p>
              <fieldset>
                <legend>Miten toimit?</legend>
                <label><input type="radio" name="decision" value="13" ${state.decision === '13' ? 'checked' : ''}><span><b>Pidä klo 13</b><small>Luota nykyiseen kalenterikutsuun.</small></span></label>
                <label><input type="radio" name="decision" value="14" ${state.decision === '14' ? 'checked' : ''}><span><b>Vaihda klo 14:ään</b><small>Asiakkaan uusin viesti vahvistaa ajan.</small></span></label>
                <label><input type="radio" name="decision" value="ask" ${state.decision === 'ask' ? 'checked' : ''}><span><b>Pyydä vielä vahvistus</b><small>Älä muuta aikaa ennen uutta viestiä.</small></span></label>
              </fieldset>
            </section>
          </main>
          <aside>
            <div class="cc-panel-title"><span>Lähteet</span><b>${state.toolLog.length}</b></div>
            <div class="cc-evidence-list">${evidenceCards(state)}</div>
          </aside>
          <section class="cc-log-panel review-log">
            <div class="cc-panel-title"><span>Tapahtumaloki</span><small>${state.toolLog.length} lukutoimea · 0 muutosta</small></div>
            ${toolLog(state.toolLog)}
          </section>
        </div>
        <section class="cc-approval">
          <div class="cc-section-head">
            <div><p class="cc-kicker">Kirjoittavat toimet</p><h2>Hyväksy jokainen muutos erikseen</h2></div>
            <div class="cc-selection-count"><b>${state.approved.length}</b><span>hyväksytty</span></div>
          </div>
          <p class="cc-lead">${esc(analysis.nextStep || 'Valitse vain toimet, joiden lähteen, rajauksen ja vaikutuksen ymmärrät.')}</p>
          <div class="cc-action-grid">${state.proposals.map((action) => actionCard(action, state)).join('')}</div>
          <div class="cc-approval-footer">
            <p data-approval-feedback>${state.decision ? 'Päätös tallennettu. Tarkista vielä hyväksyttävät toimet.' : 'Ratkaise ensin tapaamisajan ristiriita.'}</p>
            <button class="btn primary" data-execute type="button" ${!state.decision || !state.approved.length ? 'disabled' : ''}>Toteuta hyväksytyt toimet →</button>
          </div>
        </section>
      </section>`);

    container.querySelector('[data-research]').addEventListener('click', () => {
      state.phase = 'prompt';
      saveState(state);
      render();
    });
    container.querySelectorAll('input[name="decision"]').forEach((radio) => {
      radio.addEventListener('change', () => {
        state.decision = radio.value;
        saveState(state);
        render();
      });
    });
    container.querySelectorAll('[data-action]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        state.approved = checkbox.checked
          ? [...new Set([...state.approved, checkbox.dataset.action])]
          : state.approved.filter((id) => id !== checkbox.dataset.action);
        saveState(state);
        render();
      });
    });
    container.querySelector('[data-execute]').addEventListener('click', () => {
      state.executed = [...state.approved];
      state.completed = true;
      state.phase = 'complete';
      saveState(state);
      render();
    });
  }

  function calculateScore(state) {
    const selected = new Set(state.selected);
    const connectorMistakes = [...new Set([
      ...REQUIRED.filter((id) => !selected.has(id)),
      ...state.selected.filter((id) => !REQUIRED.includes(id))
    ])].length;
    const connectors = Math.max(0, 25 - connectorMistakes * 6);
    const prompt = state.prompt.toLowerCase();
    let promptScore = 0;
    if (/läh|kalenter|sähköposti|asiakasrek|drive|tarjous/.test(prompt)) promptScore += 8;
    if (/ristiri|uusin|ajanko|päivä|versio|vahvist/.test(prompt)) promptScore += 9;
    if (/hyväks|älä (muuta|lähetä|päivitä)|ennen muut|vain lue|lupa/.test(prompt)) promptScore += 8;
    const decision = state.decision === '14' ? 25 : state.decision === 'ask' ? 17 : 5;
    const approvals = Math.round(25 * (state.executed.length / 4));
    return {
      connectors,
      prompt: promptScore,
      decision,
      approvals,
      total: connectors + promptScore + decision + approvals
    };
  }

  function scoreFeedback(score) {
    if (score >= 90) return 'Rakensit turvallisen ja käyttökelpoisen yhteystyönkulun.';
    if (score >= 70) return 'Työnkulku toimii. Kiinnitä seuraavaksi huomiota rajauksiin ja lähteiden ajankohtiin.';
    return 'Sait tehtävän valmiiksi. Kokeile uudelleen pienemmillä käyttöoikeuksilla ja täsmällisemmällä toimeksiannolla.';
  }

  function executedOutputs(state) {
    const has = (id) => state.executed.includes(id);
    return `
      <div class="cc-output-grid">
        <article class="${has('calendar-update') ? 'done' : ''}"><span>▦</span><div><b>Google Calendar</b><p>${has('calendar-update') ? (state.decision === '14' ? 'Tapaaminen päivitetty: klo 14.00–15.00' : 'Hyväksytty aika kirjattu') : 'Ei muutoksia'}</p></div><em>${has('calendar-update') ? '✓ Toteutettu' : 'Ohitettu'}</em></article>
        <article class="${has('email-draft') ? 'done' : ''}"><span>✉</span><div><b>Gmail</b><p>${has('email-draft') ? 'Vastausluonnos luotu. Viestiä ei lähetetty.' : 'Ei luonnosta'}</p></div><em>${has('email-draft') ? '✓ Toteutettu' : 'Ohitettu'}</em></article>
        <article class="${has('drive-brief') ? 'done' : ''}"><span>▱</span><div><b>Google Drive</b><p>${has('drive-brief') ? 'Kaiku_Audio_tapaamismuistio.md tallennettu' : 'Ei uutta tiedostoa'}</p></div><em>${has('drive-brief') ? '✓ Toteutettu' : 'Ohitettu'}</em></article>
        <article class="${has('crm-note') ? 'done' : ''}"><span>◎</span><div><b>HubSpot CRM</b><p>${has('crm-note') ? 'Valmistelumerkintä lisätty asiakaskortille' : 'Ei uutta merkintää'}</p></div><em>${has('crm-note') ? '✓ Toteutettu' : 'Ohitettu'}</em></article>
      </div>`;
  }

  function exportAudit(state) {
    const payload = {
      exercise: 'Connector Command Center',
      completedAt: new Date().toISOString(),
      selectedConnectors: state.selected.map((id) => CONNECTORS[id]?.name || id),
      prompt: state.prompt,
      reads: state.toolLog,
      decision: state.decision,
      approvedActions: state.executed,
      score: calculateScore(state)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'claude-connectors-tapahtumaloki.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function renderComplete(container, state, render) {
    const score = calculateScore(state);
    container.innerHTML = shell(state, `
      <section class="cc-complete">
        <div class="cc-result-hero">
          <div class="cc-score-ring" style="--score:${score.total * 3.6}deg"><span><b>${score.total}</b>/100</span></div>
          <div>
            <p class="cc-kicker">Tehtävä valmis</p>
            <h2>Asiakastapaamisen työtila on valmisteltu</h2>
            <p>${scoreFeedback(score.total)}</p>
          </div>
        </div>
        ${executedOutputs(state)}
        <div class="cc-score-grid">
          <article><span>${score.connectors}/25</span><b>Yhteyksien valinta</b><p>Tarvittavat lähteet ilman tarpeettomia palveluja.</p></article>
          <article><span>${score.prompt}/25</span><b>Toimeksianto</b><p>Lähteet, ristiriidat ja hyväksymisraja näkyivät pyynnössä.</p></article>
          <article><span>${score.decision}/25</span><b>Lähdepäätös</b><p>Päätös perustui ajankohtaiseen ja vahvistettuun lähteeseen.</p></article>
          <article><span>${score.approvals}/25</span><b>Hyväksymisportti</b><p>Kirjoittavat toimet tarkistettiin yksitellen.</p></article>
        </div>
        <section class="cc-audit-summary">
          <div>
            <p class="cc-kicker">Tarkastusketju</p>
            <h3>${state.toolLog.length} lukutoimea → 1 ihmisen päätös → ${state.executed.length} hyväksyttyä muutosta</h3>
            <p>Claude kokosi tiedot. Sinä ratkaisit ristiriidan ja päätit, mitä järjestelmiin sai kirjoittaa.</p>
          </div>
          <div class="cc-final-actions">
            <button class="btn" data-export type="button">Lataa tapahtumaloki</button>
            <button class="btn primary" data-restart type="button">Tee tehtävä uudelleen</button>
          </div>
        </section>
        <div class="narrator done">✓ <b>Connectors-harjoitus suoritettu.</b></div>
      </section>`);

    container.querySelector('[data-export]').addEventListener('click', () => exportAudit(state));
    container.querySelector('[data-restart]').addEventListener('click', () => {
      const next = freshState();
      Object.keys(state).forEach((key) => delete state[key]);
      Object.assign(state, next);
      saveState(state);
      render();
    });
  }

  async function runCommandCenter(container) {
    let state = loadState() || freshState();

    function render() {
      if (state.phase === 'prompt') return renderPrompt(container, state, render);
      if (state.phase === 'approve' && state.analysis) return renderApprove(container, state, render);
      if (state.phase === 'complete') return renderComplete(container, state, render);
      renderConnect(container, state, render);
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
      <div class="cc-methods">
        ${instruction('connect')}
        <section>
        <p class="cc-kicker">Yhteyksien turvallinen käyttö</p>
          <h2>Lue vapaammin, kirjoita harkiten</h2>
          <p>Yhteys voi antaa Claudelle oikeuden lukea tietoa tai muuttaa sitä. Nämä ovat eri päätöksiä. Aloita pienimmästä riittävästä oikeudesta ja vaadi erillinen hyväksyntä jokaiselle muutokselle.</p>
        </section>
        <div class="cc-method-grid">
          <article><span>01</span><h3>Tavoite ennen työkalua</h3><p>Valitse yhteys vasta, kun tiedät mitä tietoa tehtävä tarvitsee.</p><b>Kysy: miksi tämä lähde tarvitaan?</b></article>
          <article><span>02</span><h3>Lähde näkyviin</h3><p>Pyydä Claudea kertomaan lähde, ajankohta ja tiedoston versio.</p><b>Kysy: mihin väite perustuu?</b></article>
          <article><span>03</span><h3>Ristiriita ihmiselle</h3><p>Jos lähteet ovat eri mieltä, Claude ei saa valita hiljaa puolestasi.</p><b>Kysy: mikä tieto on uusin ja vahvistettu?</b></article>
          <article><span>04</span><h3>Muutos hyväksyttäväksi</h3><p>Luonnoksen tekeminen ja viestin lähettäminen eivät ole sama toiminto.</p><b>Kysy: mitä tarkalleen muuttuu?</b></article>
        </div>
      </div>`;
  }

  async function renderExample(container) {
    container.innerHTML = `
      <div class="cc-example">
        <div class="cc-example-head">
          <div><p class="cc-kicker">90 sekunnin läpikäynti</p><h2>Näin turvallinen yhteystyönkulku etenee</h2></div>
          <p>Esimerkki näyttää eron lukemisen, päätöksen ja kirjoittamisen välillä. Omassa tehtävässäsi teet nämä valinnat itse.</p>
        </div>
        <div class="cc-example-stage">
          <div class="cc-example-chat">
            <div class="cc-message user"><p>Selvitä tapaamisen oikea aika. Näytä lähteet ja pyydä hyväksyntä ennen muutoksia.</p></div>
            <div class="cc-message assistant"><p>Kalenterissa on klo 13, mutta asiakkaan tänään klo 8.17 lähettämä viesti vahvistaa klo 14. Suosittelen kalenterin päivittämistä, mutta en tee muutosta ilman hyväksyntääsi.</p></div>
            <div class="cc-example-approval"><span>Odottaa hyväksyntää</span><b>Päivitä tapahtuma kello 14:ään</b><button class="btn primary" type="button" disabled>Hyväksy muutos</button></div>
          </div>
          <div class="cc-example-log">
            ${toolLog([
              { tool: 'read_calendar', connector: 'Google Calendar', checkedAt: 'klo 9.08' },
              { tool: 'search_client_email', connector: 'Gmail', checkedAt: 'klo 9.09' }
            ])}
            <div class="cc-example-rule"><b>2 lukutoimea</b><span>0 muutosta</span><em>Ihminen päättää seuraavan vaiheen</em></div>
          </div>
        </div>
      </div>`;
  }

  window.PILLARS.push({
    id: 'p5',
    num: 5,
    name: 'Connectors',
    subtitle: 'Yhteydet muihin työkaluihin',
    briefingLabel: 'Turvallinen käyttö',
    theory: {
      tagline: 'Claude voi koota työn useasta palvelusta, mutta oikea yhteys ja oikea käyttöoikeus ovat osa tehtävää.',
      whatItDoes: 'Connectors eli yhteydet antavat Claudelle rajatun pääsyn esimerkiksi kalenteriin, sähköpostiin, asiakasrekisteriin tai tiedostoihin. Claude voi lukea lähteitä, verrata niitä ja ehdottaa muutoksia yhdessä työtilassa.',
      howItWorks: 'Jokaisella yhteydellä on oma käyttöala ja käyttöoikeus. Lukeminen hakee tietoa. Kirjoittaminen voi luoda luonnoksen, päivittää tapahtuman tai tallentaa merkinnän. Turvallisessa työnkulussa Claude näyttää lähteen ja pyytää hyväksynnän ennen toimintoa, joka muuttaa tietoja.',
      benefits: 'Sinun ei tarvitse kopioida tietoa palvelusta toiseen. Samalla tapahtumaloki näyttää, mitä tietoa käytettiin ja mitä muutoksia tehtiin.',
      whereToUse: 'Tehtävissä, joissa tilannekuva muodostuu useasta ajantasaisesta lähteestä: asiakastyö, kokousvalmistelu, projektien seuranta ja raportointi.'
    },
    briefing: async (container) => renderMethod(container),
    example: async (container) => renderExample(container),
    exercises: [{
      label: 'Yhteyskeskus · Asiakastapaaminen',
      outcome: 'Valitse yhteydet → tutki lähteet → ratkaise ristiriita → hyväksy muutokset',
      run: runCommandCenter
    }]
  });
})();
