/* Prompt-hiomo — autosave + restore (bonus API + reflections + localStorage) */
(function () {
  "use strict";

  var LOCAL_KEY = "prompt-hiomo-state-v1";
  var WORK_MODULE_ID = "moduuli-prompt-hiomo__work";
  var saveTimer = null;
  var restored = false;
  var readyStarted = false;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (typeof window.savePromptHiomoState === "function") {
        window.savePromptHiomoState({ silent: true });
      }
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
        if (extra.reflectLearn != null) snap.reflectLearn = extra.reflectLearn;
        if (extra.reflectHard != null) snap.reflectHard = extra.reflectHard;
      }
    }
    return snap;
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

  function pickBestSnapshot() {
    var best = null;
    for (var i = 0; i < arguments.length; i++) {
      var snap = parseSnapshot(arguments[i]);
      if (!snap) continue;
      if (!best || (snap.ts || 0) >= (best.ts || 0)) best = snap;
    }
    return best;
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

  function saveToReflections(json, opts) {
    opts = opts || {};
    return fetch("/api/reflections/save", {
      method: "POST",
      credentials: "include",
      keepalive: !!opts.keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: WORK_MODULE_ID, reflectionText: json }),
    }).catch(function () {});
  }

  function loadFromReflections() {
    return fetch("/api/reflections/module/" + encodeURIComponent(WORK_MODULE_ID), {
      credentials: "include",
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        return d && d.reflection && d.reflection.reflection_text
          ? d.reflection.reflection_text
          : null;
      })
      .catch(function () {
        return null;
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
    var jobs = [saveToReflections(json, opts)];
    if (window.BonusModule && typeof window.BonusModule.saveEntry === "function") {
      jobs.push(window.BonusModule.saveEntry("_state", json, null, null, opts));
    }
    return Promise.all(jobs).then(function () {
      if (window.__bonusShowSaved) window.__bonusShowSaved();
    });
  };

  window.restorePromptHiomoState = function (raw) {
    if (!raw || restored) return;
    var snap = parseSnapshot(raw);
    if (!snap) return;
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

  function flushSaveNow(opts) {
    if (typeof window.savePromptHiomoState === "function") {
      window.savePromptHiomoState(opts || { silent: true, keepalive: true });
    }
  }

  function bindPageLeaveSave() {
    if (window.__promptHiomoPageLeaveBound) return;
    window.__promptHiomoPageLeaveBound = true;
    window.addEventListener("pagehide", function () {
      flushSaveNow({ silent: true, keepalive: true });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushSaveNow({ silent: true });
    });
  }

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
        t.closest(".ctx-turn") ||
        t.closest(".ev-pick") ||
        t.closest(".aslot") ||
        t.closest(".strike-row") ||
        t.closest("[data-prompt-hiomo-track]")
      ) {
        scheduleSave();
      }
    }, true);
    document.addEventListener("prompt-hiomo:state-changed", scheduleSave);
  }

  function onReady() {
    if (readyStarted) return;
    readyStarted = true;
    bindAutosave();
    bindPageLeaveSave();

    var bonusRaw = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      bonusRaw = window.BonusModule.getEntry("_state");
    }

    loadFromReflections().then(function (workRaw) {
      var best = pickBestSnapshot(bonusRaw, workRaw, readLocalSnapshot());
      if (best) {
        restored = false;
        window.restorePromptHiomoState(best);
      }
      if (window.__bonusShowSaved) window.__bonusShowSaved();
    });
  }

  function boot() {
    document.addEventListener("bonus-module:ready", onReady, { once: true });
    setTimeout(onReady, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
