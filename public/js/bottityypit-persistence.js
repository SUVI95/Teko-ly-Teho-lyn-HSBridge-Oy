/* Bottityypit — autosave + restore (server + localStorage) */
(function () {
  "use strict";

  var LOCAL_KEY = "bottityypit-state-v1";
  var saveTimer = null;
  var restored = false;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (typeof window.saveBottityypitState === "function") window.saveBottityypitState();
    }, 700);
  }

  function isSkippableInput(el) {
    var type = (el.type || "").toLowerCase();
    return (
      type === "file" ||
      type === "password" ||
      type === "submit" ||
      type === "button" ||
      type === "reset" ||
      type === "image"
    );
  }

  function collectFields() {
    var fields = {};
    document.querySelectorAll("textarea[id], input[id], select[id]").forEach(function (el) {
      if (!el.id || isSkippableInput(el)) return;
      var type = (el.type || "").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        fields[el.id] = el.checked ? "1" : "0";
      } else {
        fields[el.id] = el.value != null ? String(el.value) : "";
      }
    });
    return fields;
  }

  function collectSnapshot() {
    var snap = {
      v: 1,
      ts: Date.now(),
      fields: collectFields(),
    };
    if (typeof window.__bottityypitGetSnapshot === "function") {
      var extra = window.__bottityypitGetSnapshot();
      if (extra) snap.runtime = extra;
    }
    return snap;
  }

  function restoreFields(fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || fields[id] == null) return;
      var type = (el.type || "").toLowerCase();
      if (type === "checkbox" || type === "radio") {
        el.checked = fields[id] === "1" || fields[id] === true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        el.value = fields[id];
        el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      }
    });
  }

  window.saveBottityypitState = function (opts) {
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

  function flushSaveNow(opts) {
    if (typeof window.saveBottityypitState === "function") {
      window.saveBottityypitState(opts || { silent: true });
    }
  }

  function bindPageLeaveSave() {
    if (window.__bottityypitPageLeaveBound) return;
    window.__bottityypitPageLeaveBound = true;
    window.addEventListener("pagehide", function () {
      flushSaveNow({ silent: true, keepalive: true });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushSaveNow({ silent: true });
    });
  }

  function parseSnapshot(raw) {
    if (!raw) return null;
    var snap = raw;
    if (typeof raw === "string") {
      try {
        snap = JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
    if (!snap || snap.v == null) return null;
    return snap;
  }

  function readLocalSnapshot() {
    try {
      return parseSnapshot(localStorage.getItem(LOCAL_KEY));
    } catch (e) {
      return null;
    }
  }

  function pickBestSnapshot(serverRaw) {
    var server = parseSnapshot(serverRaw);
    var local = readLocalSnapshot();
    if (server && local) {
      return (local.ts || 0) >= (server.ts || 0) ? local : server;
    }
    return server || local;
  }

  window.restoreBottityypitState = function (raw) {
    if (!raw || restored) return;
    var snap = parseSnapshot(raw);
    if (!snap) return;
    restored = true;

    restoreFields(snap.fields);

    if (typeof window.__bottityypitApplySnapshot === "function" && snap.runtime) {
      window.__bottityypitApplySnapshot(snap.runtime);
    }

    if (typeof window.__bottityypitAfterRestore === "function") {
      window.__bottityypitAfterRestore(snap.runtime || {}, snap.fields || {});
    }
  };

  function bindAutosave() {
    document.addEventListener(
      "input",
      function (e) {
        var t = e.target;
        if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT")) {
          scheduleSave();
        }
      },
      true
    );
    document.addEventListener("change", scheduleSave, true);
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (
        t.closest(".choice") ||
        t.closest(".type-opt") ||
        t.closest(".wu-opt") ||
        t.closest(".cp-sugg") ||
        t.closest("[data-bottityypit-track]")
      ) {
        scheduleSave();
      }
    }, true);
    document.addEventListener("bottityypit:state-changed", scheduleSave);
  }

  function onReady() {
    bindAutosave();
    bindPageLeaveSave();
    var serverRaw = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      serverRaw = window.BonusModule.getEntry("_state");
    }
    var best = pickBestSnapshot(serverRaw);
    if (best) {
      restored = false;
      window.restoreBottityypitState(best);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.addEventListener("bonus-module:ready", onReady, { once: true });
    });
  } else {
    document.addEventListener("bonus-module:ready", onReady, { once: true });
  }
})();
