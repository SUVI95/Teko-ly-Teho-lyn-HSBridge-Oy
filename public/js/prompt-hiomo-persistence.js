/* Prompt-hiomo — autosave + restore (server + localStorage) */
(function () {
  "use strict";

  var LOCAL_KEY = "prompt-hiomo-state-v1";
  var saveTimer = null;
  var restored = false;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (typeof window.savePromptHiomoState === "function") window.savePromptHiomoState();
    }, 700);
  }

  function collectFields() {
    var fields = {};
    document.querySelectorAll("textarea[id], input[id][type='text'], select[id]").forEach(function (el) {
      if (!el.id) return;
      fields[el.id] = el.value != null ? String(el.value) : "";
    });
    return fields;
  }

  function collectSnapshot() {
    var snap = {
      v: 1,
      ts: Date.now(),
      fields: collectFields(),
      stage: (function () {
        var active = document.querySelector(".stage.active");
        return active ? active.id : "stageIntro";
      })(),
    };
    if (typeof window.__promptHiomoGetSnapshot === "function") {
      var extra = window.__promptHiomoGetSnapshot();
      if (extra) {
        snap.runtime = extra.runtime;
        snap.ui = extra.ui;
      }
    }
    return snap;
  }

  function restoreFields(fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || fields[id] == null) return;
      el.value = fields[id];
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  window.savePromptHiomoState = function (opts) {
    opts = opts || {};
    var json = JSON.stringify(collectSnapshot());
    try {
      localStorage.setItem(LOCAL_KEY, json);
    } catch (e) {
      /* ignore */
    }
    if (window.BonusModule && typeof window.BonusModule.saveEntry === "function") {
      return window.BonusModule.saveEntry("_state", json, null, null, opts).then(function () {
        if (!opts.silent && window.__bonusShowSaved) window.__bonusShowSaved();
      });
    }
    return Promise.resolve();
  };

  window.restorePromptHiomoState = function (raw) {
    if (!raw || restored) return;
    var snap = raw;
    if (typeof raw === "string") {
      try {
        snap = JSON.parse(raw);
      } catch (e) {
        return;
      }
    }
    if (!snap || snap.v == null) return;
    restored = true;

    if (typeof window.__promptHiomoPrepareRestore === "function") {
      window.__promptHiomoPrepareRestore(snap);
    }

    restoreFields(snap.fields);

    if (typeof window.__promptHiomoApplySnapshot === "function") {
      window.__promptHiomoApplySnapshot(snap);
    }

    if (typeof window.__promptHiomoAfterRestore === "function") {
      window.__promptHiomoAfterRestore(snap);
    }
  };

  function tryLocalRestore() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      if (raw) window.restorePromptHiomoState(raw);
    } catch (e) {
      /* ignore */
    }
  }

  function bindAutosave() {
    document.addEventListener("input", function (e) {
      var t = e.target;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT")) {
        scheduleSave();
      }
    });
    document.addEventListener("change", scheduleSave);
    document.addEventListener("prompt-hiomo:state-changed", scheduleSave);
  }

  function onReady() {
    bindAutosave();
    var serverState = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      serverState = window.BonusModule.getEntry("_state");
    }
    if (serverState) {
      restored = false;
      window.restorePromptHiomoState(serverState);
      return;
    }
    if (!restored) tryLocalRestore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.addEventListener("bonus-module:ready", onReady, { once: true });
    });
  } else {
    document.addEventListener("bonus-module:ready", onReady, { once: true });
  }
})();
