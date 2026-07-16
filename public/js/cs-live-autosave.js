/**
 * Autosave for live customer-call module — localStorage + reflections API backup.
 */
(function (global) {
  'use strict';

  var MODULE_ID = 'moduuli-asiakaspalvelu-live-puhelu';
  var debounceTimer = null;
  var cachedUserId = null;

  function storageKey() {
    return 'cs_live_' + (cachedUserId || 'anon');
  }

  function hasProgress(data) {
    if (!data || typeof data !== 'object') return false;
    if (data.completedScenarios && data.completedScenarios.length) return true;
    if (data.callFeedbackText) return true;
    if (data.scenarioId) return true;
    if (Array.isArray(data.sessions) && data.sessions.filter(Boolean).length) return true;
    if (data.customText && String(data.customText).trim()) return true;
    if (data.wrapUpData && (data.wrapUpData.promised || data.wrapUpData.callNotes || data.wrapUpData.confirmationEmail)) {
      return true;
    }
    if (data.wrapUpDraft && (data.wrapUpDraft.promised || data.wrapUpDraft.callNotes || data.wrapUpDraft.confirmationEmail)) {
      return true;
    }
    if (Array.isArray(data.sessionLog) && data.sessionLog.filter(Boolean).length) return true;
    if (data.emailDraft && (String(data.emailDraft.body || '').trim() || String(data.emailDraft.subject || '').trim())) {
      return true;
    }
    if (data.stage && data.stage !== 'intro' && data.stage !== 'select') return true;
    return false;
  }

  async function resolveUserId() {
    if (cachedUserId) return cachedUserId;
    try {
      var r = await fetch('/api/auth/me', { credentials: 'include' });
      if (r.ok) {
        var d = await r.json();
        if (d.user && d.user.id) cachedUserId = String(d.user.id);
      }
    } catch (e) {}
    return cachedUserId;
  }

  async function persist(snapshot) {
    if (!hasProgress(snapshot)) return;
    await resolveUserId();
    var payload = JSON.stringify({ v: 1, data: snapshot, savedAt: new Date().toISOString() });
    try {
      localStorage.setItem(storageKey(), payload);
    } catch (e) {}
    if (global.moduleAutosave && global.moduleAutosave.saveAutosave) {
      try {
        await global.moduleAutosave.saveAutosave(MODULE_ID, snapshot);
      } catch (e2) {}
      return;
    }
    try {
      await fetch('/api/reflections/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleId: MODULE_ID + '__autosave',
          reflectionText: payload
        })
      });
    } catch (e3) {}
  }

  async function loadFromReflections() {
    try {
      var r = await fetch('/api/reflections/module/' + encodeURIComponent(MODULE_ID + '__autosave'), {
        credentials: 'include'
      });
      if (!r.ok) return null;
      var d = await r.json();
      var text = d && d.reflection && d.reflection.reflection_text;
      if (!text) return null;
      var parsed = typeof text === 'string' ? JSON.parse(text) : text;
      var data = parsed && parsed.data ? parsed.data : parsed;
      if (data && hasProgress(data)) {
        data.savedAt = (parsed && parsed.savedAt) || (d.reflection && (d.reflection.updated_at || d.reflection.created_at)) || null;
        return data;
      }
    } catch (e) {}
    return null;
  }

  async function loadRaw() {
    await resolveUserId();
    var best = null;
    if (global.moduleAutosave && global.moduleAutosave.loadAutosave) {
      try {
        var fromApi = await global.moduleAutosave.loadAutosave(MODULE_ID);
        if (fromApi && hasProgress(fromApi)) best = fromApi;
      } catch (e) {}
    }
    if (!best) {
      best = await loadFromReflections();
    }
    try {
      var local = localStorage.getItem(storageKey());
      if (local) {
        var parsed = JSON.parse(local);
        var data = parsed && parsed.data ? parsed.data : null;
        if (data && hasProgress(data)) {
          if (!best) best = data;
          else {
            var localTs = Date.parse(parsed.savedAt || '') || 0;
            var bestTs = Date.parse(best.savedAt || '') || 0;
            if (localTs > bestTs) best = data;
          }
        }
      }
    } catch (e2) {}
    return best;
  }

  function showBanner(message) {
    var id = 'csLiveRestoreBanner';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.cssText =
        'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
        'max-width:min(520px,calc(100vw - 32px));padding:12px 16px;border-radius:12px;' +
        'background:#1f8a4c;color:#fff;font:14px/1.45 Inter,system-ui,sans-serif;' +
        'box-shadow:0 12px 40px rgba(0,0,0,.25)';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(function () {
      if (el) el.style.display = 'none';
    }, 7000);
  }

  global.CsLiveAutosave = {
    hasProgress: hasProgress,
    saveNow: function (snapshot) {
      return persist(snapshot);
    },
    scheduleSave: function (snapshotFn) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        try {
          var snap = snapshotFn();
          if (snap) persist(snap);
        } catch (e) {}
      }, 700);
    },
    load: loadRaw,
    clear: async function () {
      clearTimeout(debounceTimer);
      await resolveUserId();
      try {
        localStorage.removeItem(storageKey());
      } catch (e) {}
    },
    showBanner: showBanner
  };
})(typeof window !== 'undefined' ? window : global);
