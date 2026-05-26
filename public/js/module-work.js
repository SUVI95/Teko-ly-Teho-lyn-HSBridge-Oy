/* Per-user module form state — server + scoped localStorage (not shared across logins) */
(function () {
  var cachedUserId = null;

  function workModuleId(moduleId) {
    return moduleId + '__work';
  }

  async function getUserId() {
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

  function localStorageKey(moduleId) {
    return 'mw_' + (cachedUserId || 'anon') + '_' + moduleId;
  }

  function parsePayload(text) {
    if (!text) return null;
    try {
      var o = JSON.parse(text);
      if (o && typeof o === 'object' && o.data !== undefined) return o;
    } catch (e) {}
    return { v: 1, data: text, summary: String(text).slice(0, 500) };
  }

  async function saveModuleWork(moduleId, data, summary) {
    var payload = JSON.stringify({
      v: 1,
      data: data,
      summary: summary || '',
      savedAt: new Date().toISOString()
    });
    var initialKey = localStorageKey(moduleId);
    try {
      localStorage.setItem(initialKey, payload);
    } catch (e) {}
    try {
      await getUserId();
      var resolvedKey = localStorageKey(moduleId);
      if (resolvedKey !== initialKey) {
        try {
          localStorage.setItem(resolvedKey, payload);
        } catch (e2) {}
      }
    } catch (e3) {}
    try {
      await fetch('/api/reflections/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleId: workModuleId(moduleId),
          reflectionText: payload
        })
      });
    } catch (e) {}
  }

  async function loadModuleWork(moduleId) {
    await getUserId();
    try {
      var r = await fetch(
        '/api/reflections/module/' + encodeURIComponent(workModuleId(moduleId)),
        { credentials: 'include' }
      );
      if (r.ok) {
        var d = await r.json();
        if (d.reflection && d.reflection.reflection_text) {
          var parsed = parsePayload(d.reflection.reflection_text);
          try {
            localStorage.setItem(localStorageKey(moduleId), d.reflection.reflection_text);
          } catch (e) {}
          return parsed ? parsed.data : null;
        }
      }
    } catch (e) {}
    try {
      var local = localStorage.getItem(localStorageKey(moduleId));
      if (local) {
        var p = parsePayload(local);
        return p ? p.data : null;
      }
    } catch (e) {}
    return null;
  }

  function clearLegacyPrefix(prefix) {
    try {
      var remove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) remove.push(k);
      }
      remove.forEach(function (k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  /**
   * @param {string} moduleId
   * @param {{ legacyPrefix?: string, collect: Function, apply: Function, summarize?: Function, debounceMs?: number, fieldIds?: string[] }} options
   */
  async function initModuleWork(moduleId, options) {
    options = options || {};
    await getUserId();
    if (options.legacyPrefix) clearLegacyPrefix(options.legacyPrefix);

    var data = await loadModuleWork(moduleId);
    if (data && typeof options.apply === 'function') {
      options.apply(data);
    }

    var debounceMs = options.debounceMs == null ? 900 : options.debounceMs;
    var timer = null;
    var dirty = false;

    function persistNow() {
      if (typeof options.collect !== 'function') return Promise.resolve();
      var collected = options.collect();
      var summary = typeof options.summarize === 'function' ? options.summarize(collected) : '';
      dirty = false;
      return saveModuleWork(moduleId, collected, summary);
    }

    function scheduleSave() {
      if (typeof options.collect !== 'function') return;
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        persistNow();
      }, debounceMs);
    }

    function flushPendingSave() {
      if (!dirty && !timer) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // Fire-and-forget: localStorage is written synchronously first.
      persistNow();
    }

    if (options.fieldIds && options.fieldIds.length) {
      options.fieldIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', scheduleSave);
        el.addEventListener('change', scheduleSave);
      });
    }

    window.addEventListener('pagehide', flushPendingSave);
    window.addEventListener('beforeunload', flushPendingSave);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flushPendingSave();
    });

    return {
      data: data,
      saveNow: function () {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        return persistNow();
      },
      scheduleSave: scheduleSave
    };
  }

  function formatWorkBlock(moduleId, reflectionText) {
    var parsed = parsePayload(reflectionText);
    if (!parsed) return escapeHtml(reflectionText || '—');
    var lines = [];
    if (parsed.summary) lines.push(parsed.summary);
    var d = parsed.data;
    if (!d || typeof d !== 'object') {
      return escapeHtml(parsed.summary || reflectionText || '—');
    }
    if (moduleId.indexOf('visibility-growth') >= 0 || moduleId.indexOf('visibility-growth-automation') >= 0) {
      if (d.appName) lines.push('Sovellus: ' + d.appName);
      if (d.problemOneliner) lines.push('Ongelma: ' + d.problemOneliner);
      if (d.appUrl) lines.push('Julkinen linkki: ' + d.appUrl);
      if (d.defence && d.defence.q1) lines.push('Puolustus 1: ' + d.defence.q1);
    }
    if (moduleId.indexOf('esitykset') >= 0) {
      if (d.pdCompany) lines.push('Aihe: ' + d.pdCompany);
      if (d.pdRole) lines.push('Ongelma: ' + d.pdRole);
      if (d.gammaLink) lines.push('Gamma-linkki: ' + d.gammaLink);
    }
    return escapeHtml(lines.filter(Boolean).join('\n\n') || parsed.summary || 'Tallennettu');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.moduleWork = {
    saveModuleWork: saveModuleWork,
    loadModuleWork: loadModuleWork,
    initModuleWork: initModuleWork,
    formatWorkBlock: formatWorkBlock,
    workModuleId: workModuleId,
    clearLegacyPrefix: clearLegacyPrefix
  };
})();
