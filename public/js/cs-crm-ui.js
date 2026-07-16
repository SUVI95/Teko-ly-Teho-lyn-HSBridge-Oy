/**
 * CRM dashboard, briefing, and phone-style live call UI (vanilla JS for static preview HTML).
 */
(function (global) {
  'use strict';

  var TAB_LABELS = {
    customer: 'Asiakas',
    order: 'Tilaus',
    billing: 'Laskutus',
    policy: 'Käytännöt'
  };

  var STATUS_LABELS = {
    open: 'Avoin',
    pending: 'Odottaa',
    escalated: 'Eskaloitu'
  };

  var PHASE_MAP = {
    opening: { key: 'avaus', label: 'Avaus', n: 1 },
    problem: { key: 'ongelma', label: 'Ongelma', n: 2 },
    escalation: { key: 'kiristyminen', label: 'Kiristyminen', n: 3 },
    resolution: { key: 'ratkaisu', label: 'Ratkaisu', n: 4 },
    confirmation: { key: 'ratkaisu', label: 'Vahvistus', n: 5 },
    closing: { key: 'ratkaisu', label: 'Lopetus', n: 6 },
    done: { key: 'ratkaisu', label: 'Valmis', n: 6 }
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name) {
    return String(name || 'A')
      .split(/\s+/)
      .slice(0, 2)
      .map(function (p) { return (p[0] || '').toUpperCase(); })
      .join('');
  }

  function fmtMmSs(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function fmtClock(d) {
    return d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function renderFieldCard(field, unlocked) {
    if (unlocked) {
      return (
        '<div class="crm-field-card found">' +
        '<div class="crm-field-card-hdr">' +
        '<span class="crm-field-label found">' + esc(field.label) + '</span>' +
        '<span class="crm-field-icon found">✓</span></div>' +
        '<p class="crm-field-value">' + esc(field.value) + '</p></div>'
      );
    }
    return (
      '<div class="crm-field-card locked">' +
      '<div class="crm-field-card-hdr">' +
      '<span class="crm-field-label">' + esc(field.label) + '</span>' +
      '<span class="crm-field-icon">🔒</span></div>' +
      '<p class="crm-field-value blurred">' + esc(field.value) + '</p>' +
      '<p class="crm-muted">Hae löytääksesi</p></div>'
    );
  }

  function CrmDashboard(el, ticket, opts) {
    this.el = el;
    this.ticket = ticket;
    this.found = opts.foundIds || [];
    this.onFieldFound = opts.onFieldFound || function () {};
    this.hideHeader = !!opts.hideHeader;
    this.activeTab = 'all';
    this.searching = false;
    this.searchHint = '';
    this.lastUpdated = new Date();
    this.render();
  }

  CrmDashboard.prototype.isFound = function (field) {
    if (!field.hiddenUntilSearched) return true;
    return this.found.indexOf(field.id) >= 0;
  };

  CrmDashboard.prototype.setFound = function (ids) {
    this.found = ids.slice();
    this.render();
  };

  CrmDashboard.prototype.addFound = function (id) {
    if (this.found.indexOf(id) < 0) this.found.push(id);
    this.lastUpdated = new Date();
    this.onFieldFound(id);
    this.render();
  };

  CrmDashboard.prototype.visibleFields = function () {
    var self = this;
    if (this.activeTab === 'all') return this.ticket.fields;
    return this.ticket.fields.filter(function (f) { return f.category === self.activeTab; });
  };

  CrmDashboard.prototype.getSearchQuery = function () {
    var input = this.el.querySelector('.crm-search');
    return input ? input.value : '';
  };

  CrmDashboard.prototype.pickFieldForSearch = function (query) {
    var locked = [];
    for (var i = 0; i < this.ticket.fields.length; i++) {
      var f = this.ticket.fields[i];
      if (f.hiddenUntilSearched && !this.isFound(f)) locked.push(f);
    }
    if (!locked.length) return null;
    var q = String(query || '').trim();
    if (!q) return locked[0];
    var norm = q.toLowerCase().replace(/\s+/g, '');
    var t = this.ticket;
    var order = String(t.orderId || '').toLowerCase().replace(/\s+/g, '');
    var orderNum = order.replace(/^ord-/, '');
    var ticketId = String(t.ticketId || '').toLowerCase();
    var name = String(t.customerName || '').toLowerCase();
    var ticketMatch =
      (order && (norm === order || norm === orderNum || order.indexOf(norm) >= 0 || norm.indexOf(orderNum) >= 0)) ||
      (ticketId && (ticketId.indexOf(norm) >= 0 || norm.indexOf(ticketId) >= 0)) ||
      (name && name.indexOf(q.toLowerCase()) >= 0);
    if (ticketMatch) return locked[0];
    for (var j = 0; j < locked.length; j++) {
      var field = locked[j];
      if (field.label.toLowerCase().indexOf(q.toLowerCase()) >= 0) return field;
      if (field.value.toLowerCase().indexOf(q.toLowerCase()) >= 0) return field;
    }
    return null;
  };

  CrmDashboard.prototype.handleSearch = function () {
    var self = this;
    if (this.searching) return;
    var query = this.getSearchQuery();
    var next = this.pickFieldForSearch(query);
    if (!next) {
      this.searchHint = query.trim()
        ? 'Ei tuloksia haulle "' + query.trim() + '". Kokeile tilausnumeroa (' + this.ticket.orderId + ').'
        : '';
      this.render();
      return;
    }
    this.searchHint = '';
    this.searching = true;
    this.render();
    var delay = 400 + Math.floor(Math.random() * 400);
    setTimeout(function () {
      self.searching = false;
      self.addFound(next.id);
    }, delay);
  };

  CrmDashboard.prototype.renderHeader = function () {
    var t = this.ticket;
    if (this.hideHeader) return '';
    return (
      '<header class="crm-hdr">' +
      '<div class="crm-hdr-top">' +
      '<div class="crm-hdr-main">' +
      '<span class="crm-mono crm-ticket-id">' + esc(t.ticketId) + '</span> ' +
      '<span class="crm-badge">' + esc(STATUS_LABELS[t.status] || t.status) + '</span>' +
      '<div class="crm-name">' + esc(t.customerName) + '</div>' +
      '<div class="crm-since">Asiakkaana vuodesta ' + esc(t.customerSince) + '</div></div>' +
      '<div class="crm-upd cs-muted">Viimeksi päivitetty: ' + fmtClock(this.lastUpdated) + '</div></div>' +
      '<div class="crm-meta crm-mono">' + esc(t.orderId) + ' · ' + esc(t.productName) + ' · ' + esc(t.amount) + '</div>' +
      '</header>'
    );
  };

  CrmDashboard.prototype.render = function () {
    var t = this.ticket;
    var self = this;
    var tabs = ['all', 'customer', 'order', 'billing', 'policy'];
    var tabHtml = tabs.map(function (tab) {
      var lbl = tab === 'all' ? 'Kaikki' : TAB_LABELS[tab];
      return '<button type="button" class="crm-tab' + (self.activeTab === tab ? ' active' : '') + '" data-tab="' + tab + '">' + lbl + '</button>';
    }).join('');

    var fieldsHtml = this.visibleFields().map(function (field) {
      return renderFieldCard(field, self.isFound(field));
    }).join('');

    this.el.innerHTML =
      '<div class="crm-dash">' +
      this.renderHeader() +
      '<div class="crm-toolbar"><div class="crm-tabs">' + tabHtml + '</div>' +
      '<div class="crm-search-row">' +
      '<input type="search" class="crm-search" placeholder="Hae tilausnumero, laskun numero tai asiakkaan nimi..." />' +
      '<button type="button" class="crm-search-btn">Hae</button></div>' +
      (this.searching ? '<div class="crm-loading"><span class="crm-spin"></span> Haetaan...</div>' : '') +
      (this.searchHint ? '<div class="crm-search-hint">' + esc(this.searchHint) + '</div>' : '') +
      '</div>' +
      '<div class="crm-fields">' + fieldsHtml + '</div></div>';

    this.el.querySelectorAll('.crm-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.activeTab = btn.getAttribute('data-tab') || 'all';
        self.render();
      });
    });
    var searchBtn = this.el.querySelector('.crm-search-btn');
    var searchInp = this.el.querySelector('.crm-search');
    if (searchBtn) searchBtn.addEventListener('click', function () { self.handleSearch(); });
    if (searchInp) {
      searchInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); self.handleSearch(); }
      });
    }
  };

  function renderTaskPills(tasks, ticket, found) {
    return tasks.map(function (id) {
      var field = ticket.fields.find(function (f) { return f.id === id; });
      var lbl = field ? field.label : id;
      var ok = found.indexOf(id) >= 0;
      return (
        '<div class="task-pill' + (ok ? ' done' : '') + '">' +
        '<span>' + (ok ? '✓' : '○') + '</span><span>' + esc(lbl) + '</span></div>'
      );
    }).join('');
  }

  function renderTaskList(tasks, ticket, found) {
    var html = '<h3 class="cs-section-label">Löydä ennen puhelua</h3><ul>';
    tasks.forEach(function (id) {
      var field = ticket.fields.find(function (f) { return f.id === id; });
      var lbl = field ? field.label : id;
      var ok = found.indexOf(id) >= 0;
      html += '<li class="' + (ok ? 'done' : '') + '">' + (ok ? '✓' : '○') + ' ' + esc(lbl) + '</li>';
    });
    html += '</ul><p class="cs-muted brief-hint">Hae CRM:stä oikeat tiedot ennen lupauksia. Aika loppuu — puhelu alkaa silti.</p>';
    return html;
  }

  function CrmBriefing(el, ticket, opts) {
    this.el = el;
    this.ticket = ticket;
    this.duration = opts.durationSeconds || 90;
    this.onComplete = opts.onComplete || function () {};
    this.tasks = opts.tasksToFind || ticket.mustFindBeforePromise || [];
    this.found = [];
    this.remaining = this.duration;
    this.transitioning = false;
    this.done = false;
    this.dashboard = null;
    this.timerId = null;
    this.mount();
  }

  CrmBriefing.prototype.renderTopBar = function () {
    var t = this.ticket;
    var urgent = this.remaining <= 15 && this.remaining > 0;
    return (
      '<div class="brief-top-bar">' +
      '<div class="timer-block">' +
      '<div class="timer-number' + (urgent ? ' urgent' : '') + '" id="briefTimer">' + fmtMmSs(this.remaining) + '</div>' +
      '<div class="cs-muted timer-sub">jäljellä</div></div>' +
      '<div class="ticket-header">' +
      '<p class="crm-mono crm-ticket-id">' + esc(t.ticketId) + '</p>' +
      '<p class="ticket-name">' + esc(t.customerName) + '</p>' +
      '<p class="ticket-since">Asiakkaana vuodesta ' + esc(t.customerSince) + '</p></div>' +
      '<span class="status-badge">' + esc(STATUS_LABELS[t.status] || t.status) + '</span></div>'
    );
  };

  CrmBriefing.prototype.mount = function () {
    var self = this;
    this.el.innerHTML =
      '<div class="brief-shell">' +
      this.renderTopBar() +
      '<div class="brief-task-strip" id="briefTaskStrip">' + renderTaskPills(this.tasks, this.ticket, this.found) + '</div>' +
      '<div class="brief-layout">' +
      '<div class="brief-main" id="briefDash"></div>' +
      '<aside class="brief-aside" id="briefTasks">' + renderTaskList(this.tasks, this.ticket, this.found) + '</aside></div></div>';

    this.dashboard = new CrmDashboard(this.el.querySelector('#briefDash'), this.ticket, {
      hideHeader: true,
      foundIds: this.found,
      onFieldFound: function (id) {
        if (self.found.indexOf(id) < 0) self.found.push(id);
        self.renderTasks();
        self.checkComplete();
      }
    });

    this.timerId = setInterval(function () {
      if (self.done) return;
      if (self.remaining > 0) {
        self.remaining--;
        var node = self.el.querySelector('#briefTimer');
        if (node) {
          node.textContent = fmtMmSs(self.remaining);
          node.classList.toggle('urgent', self.remaining <= 15 && self.remaining > 0);
        }
      }
      self.checkComplete();
    }, 1000);
  };

  CrmBriefing.prototype.renderTasks = function () {
    var strip = this.el.querySelector('#briefTaskStrip');
    var aside = this.el.querySelector('#briefTasks');
    if (strip) strip.innerHTML = renderTaskPills(this.tasks, this.ticket, this.found);
    if (aside) aside.innerHTML = renderTaskList(this.tasks, this.ticket, this.found);
  };

  CrmBriefing.prototype.checkComplete = function () {
    var self = this;
    if (this.done || this.transitioning) return;
    var allFound = this.tasks.length > 0 && this.tasks.every(function (id) { return self.found.indexOf(id) >= 0; });
    if (this.remaining === 0 || allFound) {
      this.transitioning = true;
      var overlay = document.createElement('div');
      overlay.className = 'brief-overlay';
      overlay.textContent = 'Valmis, yhdistetään puheluun...';
      this.el.querySelector('.brief-main').appendChild(overlay);
      setTimeout(function () {
        self.done = true;
        clearInterval(self.timerId);
        self.onComplete(self.found.slice());
      }, 1000);
    }
  };

  CrmBriefing.prototype.destroy = function () {
    clearInterval(this.timerId);
  };

  function LiveCallUI(el, ticket, opts) {
    this.el = el;
    this.ticket = ticket;
    this.onFieldFound = opts.onFieldFound || function () {};
    this.onEndCall = opts.onEndCall || function () {};
    this.found = opts.foundIds || [];
    this.phase = opts.phase || 'opening';
    this.isCustomerSpeaking = false;
    this.isSilent = false;
    this.silenceSec = 0;
    this.callSec = 0;
    this.transcript = opts.transcript || [];
    this.crmExpanded = false;
    this.dashboard = null;
    this.render();
  }

  LiveCallUI.prototype.setPhase = function (phaseId) {
    this.phase = phaseId;
    this.renderPhone();
  };

  LiveCallUI.prototype.setCustomerSpeaking = function (v) {
    this.isCustomerSpeaking = v;
    this.renderPhone();
  };

  LiveCallUI.prototype.setPressure = function (state) {
    this.isSilent = state && state.escalationLevel > 0;
    this.silenceSec = state ? Math.floor((state.totalSilenceMsThisPhase || 0) / 1000) : 0;
    this.renderTranscript();
  };

  LiveCallUI.prototype.setCallDuration = function (sec) {
    this.callSec = sec;
    var node = this.el.querySelector('.phone-duration');
    if (node) node.textContent = fmtMmSs(sec);
  };

  LiveCallUI.prototype.setTranscript = function (entries) {
    this.transcript = entries;
    this.renderTranscript();
  };

  LiveCallUI.prototype.addFound = function (id) {
    if (this.found.indexOf(id) < 0) this.found.push(id);
    this.onFieldFound(id);
    if (this.dashboard) this.dashboard.setFound(this.found);
  };

  LiveCallUI.prototype.render = function () {
    var self = this;
    this.el.innerHTML =
      '<div class="phone-shell">' +
      '<div class="phone-top" id="phoneTop"></div>' +
      '<div class="phone-feed-wrap"><div class="phone-feed" id="phoneFeed"></div><div class="phone-silence" id="phoneSilence"></div></div>' +
      '<div class="phone-crm" id="phoneCrm"><button type="button" class="crm-drawer-handle" id="crmHandle"><span></span>CRM — pyyhkäise ylös</button><div class="crm-drawer-body" id="crmDrawer"></div></div>' +
      '<div class="phone-end"><button type="button" class="phone-hangup" id="hangupBtn" aria-label="Lopeta puhelu">📞</button></div></div>';
    this.renderPhone();
    this.renderTranscript();
    this.dashboard = new CrmDashboard(this.el.querySelector('#crmDrawer'), this.ticket, {
      foundIds: this.found,
      onFieldFound: function (id) { self.addFound(id); }
    });
    var handle = this.el.querySelector('#crmHandle');
    if (handle) {
      handle.addEventListener('click', function () {
        self.crmExpanded = !self.crmExpanded;
        self.el.querySelector('.phone-crm').classList.toggle('open', self.crmExpanded);
        handle.innerHTML = '<span></span>CRM — pyyhkäise ' + (self.crmExpanded ? 'alas' : 'ylös');
      });
    }
    var hang = this.el.querySelector('#hangupBtn');
    if (hang) hang.addEventListener('click', function () { self.onEndCall(); });
  };

  LiveCallUI.prototype.renderPhone = function () {
    var top = this.el.querySelector('#phoneTop');
    if (!top) return;
    var pm = PHASE_MAP[this.phase] || PHASE_MAP.problem;
    var now = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    top.innerHTML =
      '<div class="phone-status"><span>' + now + '</span><span class="phone-icons">▂▄▆ ⌁ ▮▮▮</span></div>' +
      '<div class="phone-avatar-wrap' + (this.isCustomerSpeaking ? ' speaking' : '') + '">' +
      '<div class="phone-avatar">' + esc(initials(this.ticket.customerName)) + '</div></div>' +
      '<div class="phone-cname">' + esc(this.ticket.customerName) + '</div>' +
      '<div class="phone-duration crm-mono">' + fmtMmSs(this.callSec) + '</div>' +
      '<div class="phone-phase">Vaihe ' + pm.n + '/4 — ' + pm.label + '</div>';
  };

  LiveCallUI.prototype.renderTranscript = function () {
    var feed = this.el.querySelector('#phoneFeed');
    var sil = this.el.querySelector('#phoneSilence');
    if (!feed) return;
    if (!this.transcript.length) {
      feed.innerHTML = '<p class="feed-empty cs-muted">Odota asiakkaan avausta...</p>';
    } else {
      feed.innerHTML = this.transcript.map(function (e) {
        var agent = e.speaker === 'agentti';
        return (
          '<div class="bubble-row ' + (agent ? 'agent' : 'customer') + '">' +
          '<div class="bubble">' + esc(e.text) + '</div>' +
          '<span class="bubble-ts cs-muted">' + esc(e.ts) + '</span></div>'
        );
      }).join('');
      feed.scrollTop = feed.scrollHeight;
    }
    if (sil) {
      if (this.isSilent && this.silenceSec >= 5) {
        sil.className = 'phone-silence show';
        sil.textContent = 'Hiljaisuus: ' + this.silenceSec + 's — asiakas odottaa';
      } else {
        sil.className = 'phone-silence';
        sil.textContent = '';
      }
    }
  };

  global.CsCrmUI = {
    CrmDashboard: CrmDashboard,
    CrmBriefing: CrmBriefing,
    LiveCallUI: LiveCallUI,
    PHASE_MAP: PHASE_MAP
  };
})(typeof window !== 'undefined' ? window : global);
