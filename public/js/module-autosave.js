(function () {
  if (window.__globalModuleAutosaveInitialized) return;
  // Modules with their own persistence (e.g. haastattelu) opt out so the
  // generic field scraper cannot race and overwrite richer module-work state.
  if (window.__DISABLE_GLOBAL_MODULE_AUTOSAVE__) return;
  window.__globalModuleAutosaveInitialized = true;

  function detectModuleId() {
    if (window.__MODULE_ID__) return String(window.__MODULE_ID__);
    var m = (window.location.pathname || '').match(/\/module\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  var moduleId = detectModuleId();
  if (!moduleId) return;

  var recordModuleId = moduleId + '__autosave';
  var userId = 'anon';
  var saveTimer = null;
  var localDraftTimer = null;
  var dirty = false;
  var lastSavedJson = '';
  var applyingState = false;

  function localStorageKey() {
    return 'gma_' + userId + '_' + moduleId;
  }

  function safeParse(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function toTimestamp(iso) {
    var t = Date.parse(iso || '');
    return Number.isFinite(t) ? t : 0;
  }

  function isTrackableInput(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'select') return true;
    if (tag === 'input') {
      var type = (el.type || '').toLowerCase();
      if (!type) return true;
      if (['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image'].indexOf(type) >= 0) return false;
      return true;
    }
    return el.getAttribute && el.getAttribute('contenteditable') === 'true';
  }

  function shouldSkipElement(el) {
    if (!el) return true;
    if (el.hasAttribute && el.hasAttribute('data-autosave-ignore')) return true;
    if (el.closest && el.closest('[data-autosave-ignore]')) return true;
    return false;
  }

  function getElementKey(el, idxMap) {
    var tag = el.tagName.toLowerCase();
    var id = el.id ? String(el.id) : '';
    if (id) return tag + '#'+ id;
    var name = el.name ? String(el.name) : '';
    var bucket = tag + '|' + name;
    var idx = idxMap[bucket] || 0;
    idxMap[bucket] = idx + 1;
    return tag + '[name="' + name + '"]::' + idx;
  }

  function collectState() {
    var idxMap = {};
    var fields = {};
    var nodes = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!isTrackableInput(el) || shouldSkipElement(el)) continue;
      var key = getElementKey(el, idxMap);
      var tag = el.tagName.toLowerCase();
      if (tag === 'input') {
        var type = (el.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') {
          fields[key] = { kind: 'checked', value: !!el.checked };
        } else {
          fields[key] = { kind: 'value', value: String(el.value || '') };
        }
        continue;
      }
      if (tag === 'textarea' || tag === 'select') {
        fields[key] = { kind: 'value', value: String(el.value || '') };
        continue;
      }
      fields[key] = { kind: 'text', value: String(el.textContent || '') };
    }

    var checklist = document.querySelectorAll('.check-box');
    for (var c = 0; c < checklist.length; c++) {
      fields['class:.check-box::' + c] = { kind: 'classChecked', value: checklist[c].classList.contains('checked') };
    }

    var topicCards = document.querySelectorAll('.topic-card');
    for (var t = 0; t < topicCards.length; t++) {
      fields['class:.topic-card::' + t] = { kind: 'classSelected', value: topicCards[t].classList.contains('selected') };
    }

    return {
      v: 1,
      moduleId: moduleId,
      savedAt: new Date().toISOString(),
      fields: fields
    };
  }

  function dispatchInput(el) {
    try {
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}
  }

  function dispatchChange(el) {
    try {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {}
  }

  function applyState(state) {
    if (!state || !state.fields || typeof state.fields !== 'object') return;
    applyingState = true;
    try {
      var fields = state.fields;
      var idxMap = {};
      var nodes = document.querySelectorAll('input, textarea, select, [contenteditable="true"]');
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!isTrackableInput(el) || shouldSkipElement(el)) continue;
        var key = getElementKey(el, idxMap);
        var cell = fields[key];
        if (!cell) continue;
        var tag = el.tagName.toLowerCase();

        if (cell.kind === 'checked' && tag === 'input') {
          if (!el.checked && cell.value === true) {
            el.checked = true;
            dispatchChange(el);
          }
          continue;
        }

        if (cell.kind === 'value') {
          var currentValue = String(el.value == null ? '' : el.value);
          var nextValue = String(cell.value == null ? '' : cell.value);
          if (!nextValue) continue;
          if (tag === 'select') {
            var defaultValue = String(el.defaultValue == null ? '' : el.defaultValue);
            if (currentValue === '' || currentValue === defaultValue) {
              el.value = nextValue;
              dispatchChange(el);
            }
          } else if (currentValue.trim() === '') {
            el.value = nextValue;
            dispatchInput(el);
          }
          continue;
        }

        if (cell.kind === 'text' && el.getAttribute('contenteditable') === 'true') {
          var currentText = String(el.textContent || '').trim();
          var nextText = String(cell.value || '').trim();
          if (!currentText && nextText) {
            el.textContent = nextText;
            dispatchInput(el);
          }
        }
      }

      var checklist = document.querySelectorAll('.check-box');
      for (var c = 0; c < checklist.length; c++) {
        var ck = fields['class:.check-box::' + c];
        if (ck && ck.value === true && !checklist[c].classList.contains('checked')) {
          checklist[c].classList.add('checked');
        }
      }

      var selectedCards = document.querySelectorAll('.topic-card.selected').length;
      if (selectedCards === 0) {
        var topicCards = document.querySelectorAll('.topic-card');
        for (var t = 0; t < topicCards.length; t++) {
          var tc = fields['class:.topic-card::' + t];
          if (tc && tc.value === true) {
            topicCards[t].classList.add('selected');
            break;
          }
        }
      }
    } finally {
      applyingState = false;
    }
  }

  function saveLocal(state) {
    try {
      localStorage.setItem(localStorageKey(), JSON.stringify(state));
    } catch (e) {}
  }

  function loadLocal() {
    try {
      return safeParse(localStorage.getItem(localStorageKey()));
    } catch (e) {
      return null;
    }
  }

  async function resolveUserId() {
    try {
      var r = await fetch('/api/auth/me', { credentials: 'include' });
      if (!r.ok) return;
      var d = await r.json();
      if (d && d.user && d.user.id != null) userId = String(d.user.id);
    } catch (e) {}
  }

  async function loadRemote() {
    try {
      var r = await fetch('/api/reflections/module/' + encodeURIComponent(recordModuleId), { credentials: 'include' });
      if (!r.ok) return null;
      var d = await r.json();
      if (!d || !d.reflection || !d.reflection.reflection_text) return null;
      return safeParse(d.reflection.reflection_text);
    } catch (e) {
      return null;
    }
  }

  function pickNewest(a, b) {
    if (!a) return b || null;
    if (!b) return a;
    return toTimestamp(a.savedAt) >= toTimestamp(b.savedAt) ? a : b;
  }

  function persistRemote(jsonPayload, preferBeacon) {
    var body = JSON.stringify({
      moduleId: recordModuleId,
      reflectionText: jsonPayload
    });

    if (preferBeacon && navigator.sendBeacon) {
      try {
        var ok = navigator.sendBeacon('/api/reflections/save', new Blob([body], { type: 'application/json' }));
        if (ok) return;
      } catch (e) {}
    }

    fetch('/api/reflections/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: !!preferBeacon,
      body: body
    }).catch(function () {});
  }

  function saveNow(preferBeacon) {
    var state = collectState();
    var jsonPayload = JSON.stringify(state);
    if (!preferBeacon && jsonPayload === lastSavedJson) return;
    lastSavedJson = jsonPayload;
    dirty = false;
    saveLocal(state);
    persistRemote(jsonPayload, !!preferBeacon);
  }

  function scheduleLocalDraftSnapshot() {
    if (applyingState) return;
    if (localDraftTimer) clearTimeout(localDraftTimer);
    localDraftTimer = setTimeout(function () {
      localDraftTimer = null;
      try {
        saveLocal(collectState());
      } catch (e) {}
    }, 180);
  }

  function scheduleSave() {
    if (applyingState) return;
    dirty = true;
    scheduleLocalDraftSnapshot();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      saveNow(false);
    }, 1200);
  }

  function flushPendingSave() {
    if (localDraftTimer) {
      clearTimeout(localDraftTimer);
      localDraftTimer = null;
    }
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (dirty) saveNow(true);
  }

  function bindListeners() {
    document.addEventListener('input', function (ev) {
      if (isTrackableInput(ev.target)) scheduleSave();
    }, true);

    document.addEventListener('change', function (ev) {
      if (isTrackableInput(ev.target)) scheduleSave();
    }, true);

    document.addEventListener('click', function (ev) {
      var el = ev.target;
      if (!el || !el.closest) return;
      if (el.closest('.check-box') || el.closest('.topic-card') || el.closest('[data-module-autosave-track]')) {
        scheduleSave();
      }
    }, true);

    window.addEventListener('pagehide', flushPendingSave);
    window.addEventListener('beforeunload', flushPendingSave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushPendingSave();
    });
  }

  async function init() {
    bindListeners();
    await resolveUserId();
    var localState = loadLocal();
    var remoteState = await loadRemote();
    var state = pickNewest(localState, remoteState);
    if (state) {
      applyState(state);
      lastSavedJson = JSON.stringify(state);
    }
    // Make sure DB has at least one record for this module session.
    scheduleSave();
  }

  init();
})();
