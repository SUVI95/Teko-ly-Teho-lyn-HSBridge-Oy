/**
 * Desktop CRM + agent phone — exact markup from crm-and-phone-mockup.html
 */
(function (global) {
  'use strict';

  var STATUS_LABELS = { open: 'Avoin', pending: 'Odottaa', escalated: 'Eskaloitu' };
  var PHASE_MAP = global.CsCrmUI ? global.CsCrmUI.PHASE_MAP : {
    opening: { label: 'Avaus', n: 1 },
    problem: { label: 'Ongelma', n: 2 },
    escalation: { label: 'Kiristyminen', n: 3 },
    resolution: { label: 'Ratkaisu', n: 4 },
    confirmation: { label: 'Vahvistus', n: 5 },
    closing: { label: 'Lopetus', n: 6 },
    done: { label: 'Valmis', n: 6 }
  };

  var FIELD_DATA_KEY = {
    'invoice-amount': 'invoice',
    'billing-history': 'history',
    'refund-policy': 'refund',
    'delivery-promise': 'delivery',
    'tracking-status': 'tracking',
    'compensation-policy': 'compensation',
    'trip-dates': 'trip',
    'prepaid-amount': 'prepaid',
    'bereavement-policy': 'bereavement',
    'case-notes': 'case',
    'confirmation-channel': 'confirmation',
    'general-policy': 'policy'
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name) {
    return String(name || 'A').split(/\s+/).slice(0, 2).map(function (p) {
      return (p[0] || '').toUpperCase();
    }).join('');
  }

  function fmtMmSs(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function WorkbenchRig(el, ticket, opts) {
    this.el = el;
    this.ticket = ticket;
    this.found = (opts.foundIds || []).slice();
    this.requireOrderSearch = opts.requireOrderSearch !== false;
    this.ticketUnlocked = !this.requireOrderSearch || !!opts.ticketUnlocked;
    this.onFieldFound = opts.onFieldFound || function () {};
    this.onEndCall = opts.onEndCall || function () {};
    this.onPickUp = opts.onPickUp || function () {};
    this.onManualMicToggle = opts.onManualMicToggle || function () {};
    this.onManualMicTranscribe = opts.onManualMicTranscribe || null;
    this.onManualMicSend = opts.onManualMicSend || function () {};
    this.onManualMicRecordStart = opts.onManualMicRecordStart || function () {};
    this.canAcceptManualMic = opts.canAcceptManualMic || function () { return true; };
    this.phaseTotal = opts.phaseTotal || 6;
    this.incoming = opts.incoming !== false;
    this.pickupPending = false;
    this.phase = 'opening';
    this.phoneWaiting = true;
    this.callSec = 0;
    this.customerLine = this.incoming ? 'Soittaa...' : 'Odota asiakkaan avausta...';
    this.isCustomerSpeaking = false;
    this.isSilent = false;
    this.silenceSec = 0;
    this.searching = false;
    this.searchHint = '';
    this.ringTimer = null;
    this.manualMicMode = false;
    this.manualMicRecording = false;
    this.manualMicBusy = false;
    this.manualMicRecorder = null;
    this.manualMicChunks = [];
    this.render();
  }

  WorkbenchRig.prototype.isFound = function (field) {
    if (!this.ticketUnlocked) return false;
    if (!field.hiddenUntilSearched) return true;
    return this.found.indexOf(field.id) >= 0;
  };

  WorkbenchRig.prototype.matchesOrderSearch = function (query) {
    var q = String(query || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return false;
    var t = this.ticket;
    var order = String(t.orderId || '').toLowerCase().replace(/\s+/g, '');
    var orderNum = order.replace(/^ord-/, '');
    var ticketId = String(t.ticketId || '').toLowerCase().replace(/\s+/g, '');
    return (
      (order && (q === order || q === orderNum || q === 'ord' + orderNum)) ||
      (orderNum && q.indexOf(orderNum) >= 0 && order.indexOf(q) >= 0) ||
      (ticketId && q === ticketId)
    );
  };

  WorkbenchRig.prototype.unlockTicket = function () {
    var self = this;
    if (this.ticketUnlocked) return;
    this.ticketUnlocked = true;
    this.ticket.fields.forEach(function (f) {
      if (self.found.indexOf(f.id) < 0) {
        self.found.push(f.id);
        self.onFieldFound(f.id);
      }
    });
    this.updateCrmLockState();
    var hintEl = this.el.querySelector('#search-hint');
    if (hintEl) {
      hintEl.textContent = 'Tilaus löytyi — asiakastiedot avattu.';
      hintEl.classList.add('ok');
    }
    var tip = this.el.querySelector('#search-tip');
    if (tip) tip.classList.remove('show');
  };

  WorkbenchRig.prototype.updateCrmLockState = function () {
    var t = this.ticket;
    var tierLabel = t.customerTierLabel || t.productName;
    var ticketCol = this.el.querySelector('#ticket-col');
    var headRow = this.el.querySelector('#ticket-head-row');
    var ticketIdEl = this.el.querySelector('#ticket-id-line');
    var custNameEl = this.el.querySelector('#cust-name-line');
    var custMetaEl = this.el.querySelector('#cust-meta-line');
    var statusEl = this.el.querySelector('#ticket-status');
    var activityCol = this.el.querySelector('#activity-col');

    if (ticketCol) ticketCol.classList.toggle('unlocked', this.ticketUnlocked);
    if (headRow) headRow.classList.toggle('locked', !this.ticketUnlocked);
    if (activityCol) activityCol.classList.toggle('unlocked', this.ticketUnlocked);

    if (this.ticketUnlocked) {
      if (ticketIdEl) ticketIdEl.textContent = t.ticketId + ' · ' + t.orderId;
      if (custNameEl) custNameEl.textContent = t.customerName;
      if (custMetaEl) custMetaEl.textContent = 'Asiakkaana vuodesta ' + t.customerSince + ' · ' + tierLabel;
      if (statusEl) {
        statusEl.textContent = STATUS_LABELS[t.status] || t.status;
        statusEl.className = 'status-badge';
      }
    } else {
      if (ticketIdEl) ticketIdEl.textContent = 'Ei valittua tilausta';
      if (custNameEl) custNameEl.textContent = 'Tuntematon asiakas';
      if (custMetaEl) custMetaEl.textContent = 'Hae tilausnumero kun asiakas kertoo sen puhelussa';
      if (statusEl) {
        statusEl.textContent = 'Hae ensin';
        statusEl.className = 'status-badge status-muted';
      }
    }

    this.renderFields();
    this.renderActivity();
    this.renderAgentGuide();
  };

  WorkbenchRig.prototype.renderAgentGuide = function () {
    var box = this.el.querySelector('#agent-guide');
    if (!box) return;
    if (!this.ticketUnlocked || !this.ticket.agentGuide || !this.ticket.agentGuide.length) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML =
      '<p class="title">Mitä vastauksesi pitää sisältää</p><ul>' +
      this.ticket.agentGuide.map(function (line) { return '<li>' + esc(line) + '</li>'; }).join('') +
      '</ul>';
  };

  WorkbenchRig.prototype.addFound = function (id) {
    if (this.found.indexOf(id) < 0) this.found.push(id);
    this.onFieldFound(id);
  };

  WorkbenchRig.prototype.handleSearch = function () {
    var self = this;
    if (this.searching) return;
    var input = this.el.querySelector('#search-input');
    var query = input ? input.value : '';
    var hintEl = this.el.querySelector('#search-hint');
    if (hintEl) {
      hintEl.classList.remove('ok');
      hintEl.textContent = '';
    }

    if (this.ticketUnlocked) {
      if (hintEl) hintEl.textContent = 'Asiakastiedot on jo avattu.';
      if (hintEl) hintEl.classList.add('ok');
      return;
    }

    if (!this.matchesOrderSearch(query)) {
      if (hintEl) {
        hintEl.textContent = query.trim()
          ? 'Ei tuloksia. Asiakas kertoo tilausnumeron puhelussa — syötä se tähän.'
          : 'Syötä tilausnumero (esim. ORD-55291).';
      }
      return;
    }

    this.searching = true;
    var btn = this.el.querySelector('#search-btn');
    if (btn) btn.textContent = '...';
    setTimeout(function () {
      self.searching = false;
      if (btn) btn.textContent = 'Hae';
      self.unlockTicket();
    }, 400 + Math.floor(Math.random() * 250));
  };

  WorkbenchRig.prototype.isWideField = function (field) {
    return field.id === 'contract-tier' || field.id === 'refund-policy' ||
      field.id === 'confirmation-channel' ||
      field.id === 'bereavement-policy' || field.id === 'general-policy' ||
      field.id === 'compensation-policy';
  };

  WorkbenchRig.prototype.confirmationHint = function () {
    var t = this.ticket;
    if (!t.customerEmail) return '';
    return (t.confirmationChannel || 'Sähköposti') + ': ' + t.customerEmail;
  };

  WorkbenchRig.prototype.fieldCardHtml = function (field) {
    if (!this.ticketUnlocked) return '';
    var wide = this.isWideField(field);
    var dataKey = FIELD_DATA_KEY[field.id] || field.id;
    return (
      '<div class="field-card unlocked' + (wide ? ' wide' : '') + '" data-field-id="' + esc(field.id) + '" data-field="' + esc(dataKey) + '">' +
      '<div class="field-label">' + esc(field.label) + '</div>' +
      '<p class="field-value">' + esc(field.value) + '</p></div>'
    );
  };

  WorkbenchRig.prototype.renderFields = function () {
    var grid = this.el.querySelector('#field-grid');
    if (!grid) return;
    if (!this.ticketUnlocked) {
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = this.ticket.fields.map(this.fieldCardHtml, this).join('');
  };

  WorkbenchRig.prototype.renderActivity = function () {
    var t = this.ticket;
    var detail = this.el.querySelector('#activity-detail');
    if (!detail) return;
    if (!this.ticketUnlocked) return;
    var events = t.activityEvents && t.activityEvents.length
      ? t.activityEvents
      : [
        { text: 'Puhelu alkoi — asiakas linjalla', time: 'juuri nyt', now: true },
        { text: 'Tiketti avattu — ' + t.productName, time: '2 min sitten' }
      ];
    detail.innerHTML = events.map(function (ev) {
      return '<div class="activity-item' + (ev.now ? ' now' : '') + '"><div class="activity-dot"></div><div>' +
        '<div class="activity-text">' + esc(ev.text) + '</div><div class="activity-time">' + esc(ev.time) + '</div></div></div>';
    }).join('');
  };

  WorkbenchRig.prototype.pulseRing = function () {
    var ring = this.el.querySelector('#ring');
    if (!ring || !this.isCustomerSpeaking) return;
    ring.style.transition = 'none';
    ring.style.opacity = '0.7';
    ring.style.transform = 'scale(1)';
    var self = this;
    requestAnimationFrame(function () {
      ring.style.transition = 'all 1.1s ease-out';
      ring.style.opacity = '0';
      ring.style.transform = 'scale(1.35)';
    });
  };

  WorkbenchRig.prototype.startRingLoop = function () {
    var self = this;
    clearInterval(this.ringTimer);
    this.ringTimer = setInterval(function () {
      if (self.isCustomerSpeaking) self.pulseRing();
    }, 1400);
  };

  WorkbenchRig.prototype.updatePhone = function () {
    var pm = PHASE_MAP[this.phase] || PHASE_MAP.problem;
    var label = this.el.querySelector('#call-label');
    var line = this.el.querySelector('#transcript-current');
    var dur = this.el.querySelector('#call-duration');
    var silence = this.el.querySelector('#silence-bar');
    var banner = this.el.querySelector('#live-banner');
    if (this.incoming) {
      if (label) label.textContent = 'Saapuva puhelu · Vaihe 1/' + this.phaseTotal;
      if (banner) {
        banner.classList.add('incoming');
        banner.innerHTML = '<span class="live-dot"></span> Saapuva puhelu — hae tilausnumero CRM:stä';
      }
    } else if (this.phoneWaiting) {
      if (label) label.textContent = 'Odota puhelua';
      if (banner) banner.classList.remove('incoming');
    } else {
      if (banner) banner.classList.remove('incoming');
      if (label) label.textContent = 'Live-puhelu · Vaihe ' + pm.n + '/' + this.phaseTotal;
      if (banner && !this.wrapUpMode) {
        banner.innerHTML = '<span class="live-dot"></span> Live-puhelu käynnissä — ' + fmtMmSs(this.callSec);
      }
    }
    if (line) line.textContent = '"' + this.customerLine + '"';
    if (dur) dur.textContent = fmtMmSs(this.callSec);
    if (silence && this.incoming) {
      silence.classList.remove('show');
      silence.textContent = '';
    } else if (silence) {
      var show = this.isSilent && this.silenceSec >= 5;
      silence.classList.toggle('show', show);
      silence.textContent = show ? 'Hiljaisuus ' + this.silenceSec + ' s — asiakas odottaa' : '';
    }
  };

  WorkbenchRig.prototype.setIncoming = function (incoming) {
    this.incoming = incoming;
    if (incoming) this.phoneWaiting = false;
    var screen = this.el.querySelector('#call-screen');
    var incCtrl = this.el.querySelector('#incoming-controls');
    var prepCtrl = this.el.querySelector('#prep-controls');
    var callCtrl = this.el.querySelector('#call-controls');
    var pickupBtn = this.el.querySelector('#pickup-btn');
    if (screen) screen.classList.toggle('incoming', incoming);
    if (incCtrl) incCtrl.classList.toggle('active', incoming);
    if (prepCtrl) prepCtrl.classList.toggle('active', !incoming && !!this.phoneWaiting);
    if (callCtrl) callCtrl.classList.toggle('active', !incoming && !this.phoneWaiting);
    if (pickupBtn) pickupBtn.disabled = this.pickupPending;
    this.setManualMicVisible(!incoming && !this.phoneWaiting && !this.wrapUpMode);
    if (incoming) {
      this.customerLine = 'Soittaa...';
      this.isCustomerSpeaking = true;
      this.pulseRing();
    } else if (!this.phoneWaiting) {
      this.isCustomerSpeaking = false;
    }
    this.updatePhone();
  };

  WorkbenchRig.prototype.setPhoneWaiting = function (caption) {
    this.incoming = false;
    this.phoneWaiting = true;
    var prepCtrl = this.el.querySelector('#prep-controls');
    var incCtrl = this.el.querySelector('#incoming-controls');
    var callCtrl = this.el.querySelector('#call-controls');
    var screen = this.el.querySelector('#call-screen');
    var cap = this.el.querySelector('#prep-caption');
    if (screen) screen.classList.remove('incoming');
    if (prepCtrl) prepCtrl.classList.add('active');
    if (incCtrl) incCtrl.classList.remove('active');
    if (callCtrl) callCtrl.classList.remove('active');
    if (cap && caption) cap.textContent = caption;
    this.isCustomerSpeaking = false;
    this.updatePhone();
  };

  WorkbenchRig.prototype.setPickupPending = function (pending) {
    this.pickupPending = pending;
    var pickupBtn = this.el.querySelector('#pickup-btn');
    if (pickupBtn) pickupBtn.disabled = pending;
  };

  WorkbenchRig.prototype.suggestSearchFromCustomer = function (text) {
    var t = this.ticket;
    var tip = this.el.querySelector('#search-tip');
    var input = this.el.querySelector('#search-input');
    if (!tip) return;
    var lower = String(text || '').toLowerCase();
    var order = String(t.orderId || '');
    var orderNum = order.replace(/^ord-/i, '').toLowerCase();
    var mentionedOrder =
      (order && lower.indexOf(order.toLowerCase()) >= 0) ||
      (orderNum && lower.indexOf(orderNum) >= 0) ||
      /\bord-\d+/i.test(text || '');
    var mentionedBill = /lasku|laskut|89|49[,.]90|summa|hinta|velo/i.test(text || '');
    if (mentionedOrder || mentionedBill) {
      tip.textContent = mentionedOrder
        ? 'Asiakas mainitsi tilauksen — syötä tilausnumero ' + order + ' hakukenttään ja paina Hae.'
        : 'Asiakas puhuu laskusta — kysy tilausnumero ja hae se CRM:stä.';
      tip.classList.add('show');
    }
  };

  WorkbenchRig.prototype.setPhase = function (phaseId) {
    this.phase = phaseId;
    this.updatePhone();
  };

  WorkbenchRig.prototype.setCustomerSpeaking = function (v) {
    this.isCustomerSpeaking = v;
    if (v) this.pulseRing();
  };

  WorkbenchRig.prototype.setPressure = function (state) {
    this.isSilent = state && state.escalationLevel > 0;
    this.silenceSec = state ? Math.floor((state.totalSilenceMsThisPhase || 0) / 1000) : 0;
    this.updatePhone();
  };

  WorkbenchRig.prototype.setCallDuration = function (sec) {
    this.callSec = sec;
    this.updatePhone();
  };

  WorkbenchRig.prototype.setBannerMessage = function (text, incoming) {
    var banner = this.el.querySelector('#live-banner');
    if (!banner) return;
    banner.classList.toggle('incoming', !!incoming);
    banner.innerHTML = '<span class="live-dot"></span> ' + esc(text);
  };

  WorkbenchRig.prototype.setManualMicVisible = function (visible) {
    var wrap = this.el.querySelector('#manual-mic-wrap');
    if (wrap) wrap.classList.toggle('show', !!visible);
  };

  WorkbenchRig.prototype.setManualMicEnabled = function (enabled) {
    this.manualMicMode = !!enabled;
    var toggle = this.el.querySelector('#manual-mic-toggle');
    var panel = this.el.querySelector('#manual-mic-panel');
    if (toggle) toggle.checked = this.manualMicMode;
    if (panel) panel.classList.toggle('active', this.manualMicMode);
    this.updateManualMicControls();
  };

  WorkbenchRig.prototype.setManualMicStatus = function (text) {
    var el = this.el.querySelector('#manual-mic-status');
    if (el) el.textContent = text || '';
  };

  WorkbenchRig.prototype.setManualMicPreview = function (text) {
    var ta = this.el.querySelector('#manual-mic-preview');
    if (ta) ta.value = text || '';
    this.updateManualMicControls();
  };

  WorkbenchRig.prototype.updateManualMicControls = function () {
    var canSend = this.canAcceptManualMic();
    var recBtn = this.el.querySelector('#manual-mic-record-btn');
    var sendBtn = this.el.querySelector('#manual-mic-send-btn');
    var retryBtn = this.el.querySelector('#manual-mic-retry-btn');
    var preview = this.el.querySelector('#manual-mic-preview');
    var hasText = preview && String(preview.value || '').trim().length > 0;
    if (recBtn) {
      recBtn.disabled = !this.manualMicMode || !canSend || this.manualMicBusy;
      recBtn.classList.toggle('recording', this.manualMicRecording);
      recBtn.textContent = this.manualMicRecording ? 'Lopeta nauhoitus' : 'Nauhoita vastaus';
    }
    if (sendBtn) sendBtn.disabled = !this.manualMicMode || !canSend || this.manualMicBusy || !hasText;
    if (retryBtn) retryBtn.disabled = !this.manualMicMode || this.manualMicBusy || this.manualMicRecording;
  };

  WorkbenchRig.prototype.stopManualMicRecording = function () {
    if (this.manualMicRecorder && this.manualMicRecorder.state !== 'inactive') {
      try { this.manualMicRecorder.stop(); } catch (e) {}
    }
    if (this.manualMicStream) {
      try { this.manualMicStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    }
    this.manualMicStream = null;
    this.manualMicRecording = false;
    this.updateManualMicControls();
  };

  WorkbenchRig.prototype.startManualMicRecording = async function () {
    var self = this;
    if (this.manualMicRecording || this.manualMicBusy || !this.manualMicMode) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setManualMicStatus('Mikrofoni ei ole käytettävissä tässä selaimessa.');
      return;
    }
    this.setManualMicPreview('');
    this.setManualMicStatus('Nauhoitetaan — puhu nyt selkeästi puhelimeen.');
    this.onManualMicRecordStart();
    try {
      this.manualMicStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
      });
      this.manualMicChunks = [];
      var mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '');
      this.manualMicRecorder = mime
        ? new MediaRecorder(this.manualMicStream, { mimeType: mime })
        : new MediaRecorder(this.manualMicStream);
      this.manualMicRecorder.ondataavailable = function (e) {
        if (e.data && e.data.size) self.manualMicChunks.push(e.data);
      };
      this.manualMicRecorder.onstop = function () {
        self.manualMicRecording = false;
        self.updateManualMicControls();
        var blob = new Blob(self.manualMicChunks, { type: self.manualMicRecorder.mimeType || 'audio/webm' });
        self.manualMicChunks = [];
        if (!blob.size) {
          self.setManualMicStatus('Nauhoitus tyhjä — yritä uudelleen ja puhu lähempänä mikrofonia.');
          return;
        }
        if (typeof self.onManualMicTranscribe !== 'function') {
          self.setManualMicStatus('Transkriptio ei ole käytössä.');
          return;
        }
        self.manualMicBusy = true;
        self.setManualMicStatus('Transkriboidaan nauhoitetta…');
        self.updateManualMicControls();
        Promise.resolve(self.onManualMicTranscribe(blob))
          .then(function (text) {
            self.setManualMicPreview(text);
            self.setManualMicStatus(
              text
                ? 'Tarkista transkripti ja paina Lähetä vastaus — asiakas kuulee vastauksesi sen jälkeen.'
                : 'Transkriptio tyhjä — yritä nauhoittaa uudelleen tai kirjoita vastaus alle.'
            );
          })
          .catch(function (err) {
            self.setManualMicStatus((err && err.message) || 'Transkriptio epäonnistui — yritä uudelleen.');
          })
          .finally(function () {
            self.manualMicBusy = false;
            self.updateManualMicControls();
          });
      };
      this.manualMicRecorder.start();
      this.manualMicRecording = true;
      this.updateManualMicControls();
    } catch (err) {
      this.setManualMicStatus('Mikrofonin käyttö estetty — salli mikrofoni selaimessa.');
      this.manualMicRecording = false;
      this.updateManualMicControls();
    }
  };

  WorkbenchRig.prototype.toggleManualMicRecording = function () {
    if (this.manualMicRecording) this.stopManualMicRecording();
    else this.startManualMicRecording();
  };

  WorkbenchRig.prototype.bindManualMicHandlers = function () {
    var self = this;
    var toggle = this.el.querySelector('#manual-mic-toggle');
    var recBtn = this.el.querySelector('#manual-mic-record-btn');
    var sendBtn = this.el.querySelector('#manual-mic-send-btn');
    var retryBtn = this.el.querySelector('#manual-mic-retry-btn');
    if (toggle && !toggle._bound) {
      toggle._bound = true;
      toggle.addEventListener('change', function () {
        self.setManualMicEnabled(toggle.checked);
        self.onManualMicToggle(toggle.checked);
        self.setManualMicStatus(
          toggle.checked
            ? 'Nauhoitustila: live-mikrofoni on pois päältä. Nauhoita vastaus ja lähetä se asiakkaalle.'
            : 'Live-mikrofoni käytössä — puhu normaalisti puhelimessa.'
        );
      });
    }
    if (recBtn && !recBtn._bound) {
      recBtn._bound = true;
      recBtn.addEventListener('click', function () { self.toggleManualMicRecording(); });
    }
    if (sendBtn && !sendBtn._bound) {
      sendBtn._bound = true;
      sendBtn.addEventListener('click', function () {
        var preview = self.el.querySelector('#manual-mic-preview');
        var text = preview ? String(preview.value || '').trim() : '';
        if (!text) {
          self.setManualMicStatus('Kirjoita tai nauhoita vastaus ennen lähettämistä.');
          return;
        }
        self.onManualMicSend(text);
        self.setManualMicPreview('');
        self.setManualMicStatus('Vastaus lähetetty — odota asiakkaan reaktiota.');
        self.updateManualMicControls();
      });
    }
    if (retryBtn && !retryBtn._bound) {
      retryBtn._bound = true;
      retryBtn.addEventListener('click', function () {
        self.stopManualMicRecording();
        self.setManualMicPreview('');
        self.setManualMicStatus('Nauhoita uusi vastaus.');
        self.updateManualMicControls();
      });
    }
    var preview = this.el.querySelector('#manual-mic-preview');
    if (preview && !preview._bound) {
      preview._bound = true;
      preview.addEventListener('input', function () { self.updateManualMicControls(); });
    }
  };

  WorkbenchRig.prototype.setCustomerLine = function (text) {
    this.customerLine = text || '...';
    this.updatePhone();
  };

  WorkbenchRig.prototype.setTranscript = function () {};

  WorkbenchRig.prototype.enterWrapUpMode = function (opts) {
    var self = this;
    opts = opts || {};
    this.wrapUpMode = true;
    this.onWrapUpSave = opts.onSave || function () {};
    if (!this.ticketUnlocked) this.unlockTicket();

    var phoneWrap = this.el.querySelector('.phone-wrap');
    if (phoneWrap) phoneWrap.style.display = 'none';

    var searchRow = this.el.querySelector('.search-row');
    var tabNote = this.el.querySelector('.tab-note');
    var tabs = this.el.querySelector('.tabs');
    if (searchRow) searchRow.style.display = 'none';
    if (tabNote) tabNote.style.display = 'none';
    if (tabs) tabs.style.display = 'none';

    var banner = this.el.querySelector('#live-banner');
    if (banner) {
      banner.classList.remove('incoming');
      banner.innerHTML = '<span class="live-dot"></span> Puhelu päättyi — täytä CRM-kirjaus';
      banner.style.background = '#eef2f8';
      banner.style.color = '#1c1d1f';
    }

    var panel = this.el.querySelector('#wrap-up-panel');
    if (panel) {
      panel.style.display = 'block';
      var emailInp = panel.querySelector('#wrap-email');
      if (emailInp && !emailInp.value && this.ticket.customerEmail) {
        emailInp.value = this.ticket.customerEmail;
      }
      var saveBtn = panel.querySelector('#wrap-save-btn');
      if (saveBtn && !saveBtn._bound) {
        saveBtn._bound = true;
        saveBtn.addEventListener('click', function () {
          var data = self.getWrapUpData();
          if (!data.callNotes.trim()) {
            var hint = panel.querySelector('#wrap-hint');
            if (hint) {
              hint.textContent = 'Kirjoita lyhyt puhelun yhteenveto ennen jatkamista.';
              hint.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            var notes = panel.querySelector('#wrap-notes');
            if (notes) notes.focus();
            return;
          }
          saveBtn.disabled = true;
          self.onWrapUpSave(data);
        });
      }
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  WorkbenchRig.prototype.setWrapUpSaveEnabled = function (enabled) {
    var saveBtn = this.el.querySelector('#wrap-save-btn');
    if (saveBtn) saveBtn.disabled = !enabled;
  };

  WorkbenchRig.prototype.getWrapUpData = function () {
    var promised = this.el.querySelector('#wrap-promised');
    var email = this.el.querySelector('#wrap-email');
    var notes = this.el.querySelector('#wrap-notes');
    return {
      promised: promised ? promised.value.trim() : '',
      confirmationEmail: email ? email.value.trim() : '',
      confirmationChannel: this.ticket.confirmationChannel || 'Sähköposti',
      callNotes: notes ? notes.value.trim() : ''
    };
  };

  WorkbenchRig.prototype.destroy = function () {
    clearInterval(this.ringTimer);
    this.stopManualMicRecording();
  };

  WorkbenchRig.prototype.render = function () {
    var self = this;
    var t = this.ticket;
    var tierLabel = t.customerTierLabel || t.productName;
    var mustFindItems = (t.mustFindLabels && t.mustFindLabels.length)
      ? t.mustFindLabels.map(function (label) { return '<li>' + esc(label) + '</li>'; }).join('')
      : (t.mustFindBeforePromise || []).map(function (id) {
        var f = t.fields.find(function (x) { return x.id === id; });
        return '<li>' + esc(f ? f.label : id) + '</li>';
      }).join('');
    var activityHtml =
      '<p class="activity-placeholder">Tapahtumat näkyvät kun tilaus on haettu CRM:stä.</p>' +
      '<div class="activity-detail" id="activity-detail"></div>';

    this.el.innerHTML =
      '<div class="rig">' +
      '<div class="crm-app">' +
      '<div class="crm-nav"><div class="logo">HB</div><div class="nav-icon active">☰</div><div class="nav-icon">◧</div><div class="nav-icon">✆</div><div class="nav-icon">⚙</div></div>' +
      '<div class="crm-main">' +
      '<div class="crm-topbar"><div class="crumbs">Tiketit <span style="color:var(--hint)">/</span> <b>' + esc(t.ticketId) + '</b></div>' +
      '<div class="topbar-right"><span class="queue-count">Jonossa: 4</span><div class="agent-chip"><span class="dot">SP</span> Suvi P.</div></div></div>' +
      '<div class="crm-body">' +
      '<div class="ticket-col" id="ticket-col">' +
      '<div class="live-banner" id="live-banner"><span class="live-dot"></span> Live-puhelu käynnissä — 00:00</div>' +
      '<div class="ticket-head-row locked" id="ticket-head-row"><div>' +
      '<p class="ticket-id" id="ticket-id-line">Ei valittua tilausta</p>' +
      '<p class="cust-name" id="cust-name-line">Tuntematon asiakas</p>' +
      '<p class="cust-meta" id="cust-meta-line">Hae tilausnumero kun asiakas kertoo sen puhelussa</p></div>' +
      '<span class="status-badge status-muted" id="ticket-status">Hae ensin</span></div>' +
      '<div class="tabs"><div class="tab active" title="Kaikki tarvittava tieto">Yhteenveto</div><div class="tab" title="Ei käytössä — tiedot Yhteenveto-välilehdellä">Tilaus</div><div class="tab" title="Ei käytössä — tiedot Yhteenveto-välilehdellä">Laskutus</div><div class="tab" title="Ei käytössä — tiedot Yhteenveto-välilehdellä">Käytännöt</div><div class="tab" title="Ei käytössä — tapahtumat oikealla">Historia</div></div>' +
      '<p class="tab-note">Kaikki puheluun tarvittava tieto on Yhteenveto-välilehdellä. Muut välilehdet ovat vain ulkoasua.</p>' +
      '<div class="search-row"><input id="search-input" type="search" placeholder="Hae tilausnumero, laskun numero tai asiakkaan nimi..." autocomplete="off" />' +
      '<button type="button" id="search-btn">Hae</button></div>' +
      '<p class="search-tip" id="search-tip"></p>' +
      '<p class="search-hint" id="search-hint"></p>' +
      '<div class="crm-empty-state" id="crm-empty-state"><p>Asiakastiedot piilotettu. Kun asiakas kertoo <strong>tilausnumeron</strong> puhelussa, syötä se hakukenttään — kaikki tiedot avautuvat kerralla.</p></div>' +
      '<div class="field-grid" id="field-grid"></div>' +
      '<div class="must-find"><p class="title">Tarkista ennen lupausta</p><ul>' + mustFindItems + '</ul></div>' +
      '<div class="agent-guide" id="agent-guide" style="display:none"></div>' +
      '<div class="wrap-up-panel" id="wrap-up-panel" style="display:none">' +
      '<p class="wrap-title">CRM-kirjaus puhelun jälkeen</p>' +
      '<p class="wrap-lead">Kirjaa mitä lupasit ja mitä tapahtui — seuraava agentti ja asiakashistoria näkevät tämän.</p>' +
      '<label class="wrap-label" for="wrap-promised">Mitä lupasit asiakkaalle?</label>' +
      '<textarea id="wrap-promised" class="wrap-input" rows="2" placeholder="Esim. hyvitys, korjauslasku, käsittelyaika..."></textarea>' +
      '<label class="wrap-label" for="wrap-email">Vahvistus lähetetään (kanava / osoite)</label>' +
      '<input id="wrap-email" class="wrap-input wrap-email" type="email" placeholder="asiakas@email.fi" />' +
      '<p class="wrap-channel-hint">Vahvistuskanava CRM:ssä: ' + esc(this.confirmationHint() || '—') + '</p>' +
      '<label class="wrap-label" for="wrap-notes">Puhelun yhteenveto seuraavalle agentille</label>' +
      '<textarea id="wrap-notes" class="wrap-input" rows="4" placeholder="Mitä tapahtui, mitä teit, mitä vielä pitää tehdä..."></textarea>' +
      '<p class="wrap-hint" id="wrap-hint"></p>' +
      '<button type="button" class="wrap-save-btn" id="wrap-save-btn">Tallenna kirjaus ja jatka palauteeseen →</button></div>' +
      '</div>' +
      '<div class="activity-col" id="activity-col"><h4>Tapahtumat</h4>' + activityHtml + '</div></div></div></div>' +
      '<div class="phone-wrap"><div class="phone-label">Agentin puhelin</div>' +
      '<div class="phone"><div class="statusbar"><span id="clock">--:--</span><span>Wifi 100%</span></div>' +
      '<div class="call-screen incoming" id="call-screen"><div class="call-label" id="call-label">Saapuva puhelu · Vaihe 1/' + this.phaseTotal + '</div>' +
      '<div class="avatar-wrap"><div class="ring" id="ring"></div><div class="avatar">' + esc(initials(t.customerName)) + '</div></div>' +
      '<p class="call-name">' + esc(t.customerName) + '</p><p class="call-sub">' + esc(t.phone) + '</p>' +
      '<p class="call-duration" id="call-duration">00:00</p></div>' +
      '<div class="transcript-strip"><p class="transcript-line">asiakas sanoi juuri</p>' +
      '<p class="transcript-current" id="transcript-current">"Soittaa..."</p></div>' +
      '<div class="silence-bar" id="silence-bar"></div>' +
      '<div class="prep-controls active" id="prep-controls">' +
      '<p class="prep-icon">📵</p>' +
      '<p class="incoming-label">Puhelu ei vielä soi</p>' +
      '<p class="pickup-caption" id="prep-caption">Aloita CRM-aika ylhäältä — vasta sitten puhelu soi ja näet Vastaa puhelu -napin.</p></div>' +
      '<div class="incoming-controls" id="incoming-controls">' +
      '<p class="incoming-label">Saapuva puhelu</p>' +
      '<button type="button" class="pickup-btn" id="pickup-btn" aria-label="Vastaa puhelu">' +
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>' +
      '<p class="pickup-caption">Vastaa puhelu — ' + esc(t.customerName.split(' ')[0] || t.customerName) + ' odottaa</p></div>' +
      '<div class="call-controls" id="call-controls">' +
      '<button type="button" class="ctrl-btn mute" aria-label="Mykistä"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>' +
      '<button type="button" class="ctrl-btn end" id="hangup-btn" aria-label="Lopeta puhelu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg></button>' +
      '<button type="button" class="ctrl-btn speaker" aria-label="Kaiutin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>' +
      '</div>' +
      '<div class="manual-mic-wrap" id="manual-mic-wrap">' +
      '<label class="manual-mic-toggle-row"><input type="checkbox" id="manual-mic-toggle" />' +
      '<span>Mikrofoni ei kuule? Käytä nauhoitustilaa</span></label>' +
      '<div class="manual-mic-panel" id="manual-mic-panel">' +
      '<p class="manual-mic-lead">Nauhoita vastauksesi, tarkista transkripti ja lähetä — asiakas vastaa sen jälkeen.</p>' +
      '<button type="button" class="manual-mic-record-btn" id="manual-mic-record-btn">Nauhoita vastaus</button>' +
      '<p class="manual-mic-status" id="manual-mic-status"></p>' +
      '<textarea class="manual-mic-preview" id="manual-mic-preview" rows="3" placeholder="Transkripti näkyy tässä — voit korjata tekstiä ennen lähettämistä"></textarea>' +
      '<div class="manual-mic-actions">' +
      '<button type="button" class="manual-mic-send-btn" id="manual-mic-send-btn">Lähetä vastaus asiakkaalle</button>' +
      '<button type="button" class="manual-mic-retry-btn" id="manual-mic-retry-btn">Nauhoita uudelleen</button>' +
      '</div></div></div></div>' +
      '<p class="caption">Puhelin ja CRM ovat kaksi eri laitetta: agentti puhuu puhelimessa samalla kun katsoo CRM:ää työpöytäruudulta.</p></div></div>';

    this.updateCrmLockState();
    this.setPhoneWaiting('Aloita CRM-aika ylhäältä — vasta sitten puhelu soi.');
    this.startRingLoop();

    var tickClock = function () {
      var c = self.el.querySelector('#clock');
      if (c) c.textContent = new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    };
    tickClock();
    setInterval(tickClock, 30000);

    var searchBtn = this.el.querySelector('#search-btn');
    var searchInp = this.el.querySelector('#search-input');
    if (searchBtn) searchBtn.addEventListener('click', function () { self.handleSearch(); });
    if (searchInp) {
      searchInp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); self.handleSearch(); }
      });
    }
    var hang = this.el.querySelector('#hangup-btn');
    if (hang) hang.addEventListener('click', function () { self.onEndCall(); });
    var pickup = this.el.querySelector('#pickup-btn');
    if (pickup) pickup.addEventListener('click', function () { self.onPickUp(); });
    this.bindManualMicHandlers();
    this.setManualMicVisible(false);
  };

  global.CsWorkbenchRig = WorkbenchRig;
})(typeof window !== 'undefined' ? window : global);
