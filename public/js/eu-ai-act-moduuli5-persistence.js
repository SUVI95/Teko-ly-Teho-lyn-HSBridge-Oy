/* EU AI Act moduuli5 — autosave + restore (server + localStorage) */
(function () {
  "use strict";

  var LOCAL_KEY = "eu-ai-act-moduuli5-state-v1";
  var saveTimer = null;
  var restored = false;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (typeof window.saveEuAiActState === "function") window.saveEuAiActState();
    }, 700);
  }

  function collectFields() {
    var fields = {};
    document.querySelectorAll("main input[id], main textarea[id], main select[id]").forEach(function (el) {
      if (!el.id || el.type === "button" || el.type === "submit" || el.type === "hidden") return;
      if (el.type === "checkbox" || el.type === "radio") return;
      fields[el.id] = el.value != null ? String(el.value) : "";
    });
    return fields;
  }

  function collectChecks() {
    var checks = {};
    document.querySelectorAll('main input[type="checkbox"]').forEach(function (el) {
      var key = el.id || el.name + ":" + el.value;
      checks[key] = !!el.checked;
    });
    return checks;
  }

  function collectRadios() {
    var radios = {};
    document.querySelectorAll('main input[type="radio"]:checked').forEach(function (el) {
      if (el.name) radios[el.name] = el.value;
    });
    return radios;
  }

  function collectFeedback() {
    var fb = {};
    document.querySelectorAll(".feedback-box[id], .coach-box[id]").forEach(function (el) {
      if (!el.id) return;
      if (!el.innerHTML.trim() && el.style.display !== "block") return;
      fb[el.id] = {
        html: el.innerHTML,
        className: el.className,
        display: el.style.display || "",
      };
    });
    return fb;
  }

  function collectVisibleSteps() {
    var steps = [];
    document
      .querySelectorAll(".ex3-step.show, .ex4-step.show, .ex5-step.show, .ex6-step.show, .raportti-step.show")
      .forEach(function (s) {
        if (s.id) steps.push(s.id);
      });
    return steps;
  }

  function collectSnapshot() {
    var snap = {
      v: 1,
      ts: Date.now(),
      fields: collectFields(),
      checks: collectChecks(),
      radios: collectRadios(),
      feedback: collectFeedback(),
      visibleSteps: collectVisibleSteps(),
      tab: (function () {
        var btn = document.querySelector(".tab-btn.active");
        return btn ? btn.getAttribute("data-tab") : "teoria";
      })(),
    };
    if (typeof window.__euAiActGetSnapshot === "function") {
      var extra = window.__euAiActGetSnapshot();
      if (extra) {
        snap.runtime = extra.runtime;
        snap.ex1Ui = extra.ex1Ui;
        snap.ex4Chat = extra.ex4Chat;
        snap.banners = extra.banners;
        snap.ui = extra.ui;
      }
    }
    return snap;
  }

  function setFieldValue(id, value) {
    var el = document.getElementById(id);
    if (!el || value == null) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function restoreFields(fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (id) {
      setFieldValue(id, fields[id]);
    });
  }

  function restoreChecks(checks) {
    if (!checks) return;
    Object.keys(checks).forEach(function (key) {
      var el = document.getElementById(key);
      if (!el && key.indexOf(":") >= 0) {
        var parts = key.split(":");
        el = document.querySelector(
          'input[type="checkbox"][name="' + parts[0] + '"][value="' + parts[1] + '"]',
        );
      }
      if (!el) return;
      el.checked = !!checks[key];
      el.dispatchEvent(new Event("change", { bubbles: true }));
      var row = el.closest(".ex2-check-row, .ex2-priority-card");
      if (row) row.classList.toggle("picked", el.checked);
    });
  }

  function restoreRadios(radios) {
    if (!radios) return;
    Object.keys(radios).forEach(function (name) {
      var el = document.querySelector('input[type="radio"][name="' + name + '"][value="' + radios[name] + '"]');
      if (el) {
        el.checked = true;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  function restoreFeedback(feedback) {
    if (!feedback) return;
    Object.keys(feedback).forEach(function (id) {
      var el = document.getElementById(id);
      var item = feedback[id];
      if (!el || !item) return;
      el.innerHTML = item.html || "";
      el.className = item.className || el.className;
      if (item.display) el.style.display = item.display;
    });
  }

  window.saveEuAiActState = function (opts) {
    opts = opts || {};
    var snap = collectSnapshot();
    var json = JSON.stringify(snap);
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

  window.restoreEuAiActState = function (raw) {
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

    if (typeof window.__euAiActApplySnapshot === "function") {
      window.__euAiActApplySnapshot(snap);
    }

    restoreFields(snap.fields);
    restoreChecks(snap.checks);
    restoreRadios(snap.radios);
    restoreFeedback(snap.feedback);

    if (snap.visibleSteps && snap.visibleSteps.length && typeof window.__euAiActShowSteps === "function") {
      window.__euAiActShowSteps(snap.visibleSteps);
    }

    if (snap.tab && typeof window.goTo === "function") {
      window.goTo(snap.tab);
    }

    if (typeof window.__euAiActAfterRestore === "function") {
      window.__euAiActAfterRestore();
    }
    // Dynamic ex4/ex5 DOM is built in afterRestore — re-apply field values.
    restoreFields(snap.fields);
    restoreChecks(snap.checks);
    restoreRadios(snap.radios);
  };

  function tryLocalRestore() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      if (raw) window.restoreEuAiActState(raw);
    } catch (e) {
      /* ignore */
    }
  }

  function bindAutosave() {
    document.querySelectorAll("main input, main textarea, main select").forEach(function (el) {
      if (el.dataset.euAutosaveBound) return;
      el.dataset.euAutosaveBound = "1";
      el.addEventListener("input", scheduleSave);
      el.addEventListener("change", scheduleSave);
      el.addEventListener("blur", scheduleSave);
    });
    document.addEventListener("euai:state-changed", scheduleSave);
  }

  function onReady() {
    bindAutosave();
    var serverState = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      serverState = window.BonusModule.getEntry("_state");
    }
    if (serverState) {
      restored = false;
      window.restoreEuAiActState(serverState);
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
