/* HITL Architect — autosave + restore (server + localStorage) */
(function () {
  "use strict";

  var LOCAL_KEY = "hitl-architect-state-v4";
  var AI_SECTIONS = [
    { section: "ex1-ghost-policy", box: "ex1Ai" },
    { section: "ex2-empathy-override", box: "ex2Ai" },
    { section: "ex3-escalation-plan", box: "ex3Ai" },
    { section: "ex4-legal-triage", box: "ex4Ai" },
    { section: "ex5-root-cause", box: "ex5Ai" },
  ];
  var saveTimer = null;
  var restored = false;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      window.saveHitlState();
    }, 700);
  }

  function collectPhases() {
    var phases = {};
    for (var n = 1; n <= 5; n++) {
      document.querySelectorAll(".ex" + n + "-phase").forEach(function (p) {
        if (p.id && p.classList.contains("show")) phases[p.id] = true;
      });
    }
    return phases;
  }

  function collectFields() {
    var fields = {};
    document
      .querySelectorAll("textarea[id], select[id], input[type='text'][id], input[type='number'][id]")
      .forEach(function (el) {
        if (!el.id || el.type === "hidden") return;
        fields[el.id] = el.value != null ? String(el.value) : "";
      });
    return fields;
  }

  function collectRadios() {
    var radios = {};
    document.querySelectorAll('input[type="radio"]:checked').forEach(function (el) {
      if (el.name) radios[el.name] = el.value;
    });
    return radios;
  }

  function collectChecks() {
    var checks = {};
    document.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
      if (!el.id && !el.name) return;
      var key = el.id || el.name + ":" + el.value;
      checks[key] = !!el.checked;
    });
    return checks;
  }

  function collectPicked() {
    var picked = {};
    document.querySelectorAll("[data-ex1gate].picked").forEach(function (btn) {
      picked.ex1gate = btn.getAttribute("data-ex1gate");
    });
    document.querySelectorAll("[data-ex2send].picked").forEach(function (btn) {
      picked.ex2send = btn.getAttribute("data-ex2send");
    });
    document.querySelectorAll("#ex4PriorityGrid .ex2-check-row.picked input").forEach(function (cb) {
      if (!picked.ex4priority) picked.ex4priority = [];
      picked.ex4priority.push(cb.value);
    });
    return picked;
  }

  function collectEx5Evidence() {
    var seen = {};
    document.querySelectorAll("#ex5EvidenceTabs .ex5-ev-tab.seen").forEach(function (tab) {
      var key = tab.getAttribute("data-ev");
      if (key) seen[key] = true;
    });
    var open = document.querySelector("#ex5EvidenceTabs .ex5-ev-tab.open");
    return { seen: seen, open: open ? open.getAttribute("data-ev") : null };
  }

  function collectState() {
    var inline = window.__hitlInline || {};
    var exercises = window.__hitlExercises || {};
    var progressive = window.__hitlProgressive || {};
    return {
      v: 4,
      ts: Date.now(),
      phases: collectPhases(),
      fields: collectFields(),
      radios: collectRadios(),
      checks: collectChecks(),
      picked: collectPicked(),
      ex5Evidence: collectEx5Evidence(),
      ex2OverrideDone: !!exercises.ex2OverrideDone,
      ex4: exercises.getEx4State ? exercises.getEx4State() : null,
      gate: inline.getGate ? inline.getGate() : null,
      matrix: inline.getMatrix ? inline.getMatrix() : null,
      unlocked: progressive.getUnlocked ? progressive.getUnlocked() : null,
    };
  }

  function setFieldValue(id, value) {
    var el = document.getElementById(id);
    if (!el || value == null) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function restorePhases(phases) {
    if (!phases) return;
    var first = null;
    Object.keys(phases).forEach(function (id) {
      if (!phases[id]) return;
      var el = document.getElementById(id);
      if (!el) return;
      var prefix = id.match(/^(ex\d)/);
      if (prefix) {
        document.querySelectorAll("." + prefix[1] + "-phase").forEach(function (p) {
          p.classList.remove("show");
        });
      }
      el.classList.add("show");
      if (id === "ex1PhaseAudit") {
        var vocab = document.getElementById("ex1VocabAudit");
        if (vocab) vocab.style.display = "block";
      }
      if (id.indexOf("ex1Phase") === 0 && typeof window.__hitlEx1UpdateStepBar === "function") {
        window.__hitlEx1UpdateStepBar(id);
      }
      if (!first) first = id;
    });
  }

  function restoreFields(fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (id) {
      setFieldValue(id, fields[id]);
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

  function restoreChecks(checks) {
    if (!checks) return;
    Object.keys(checks).forEach(function (key) {
      var el = document.getElementById(key);
      if (!el && key.indexOf(":") >= 0) {
        var parts = key.split(":");
        el = document.querySelector('input[type="checkbox"][name="' + parts[0] + '"][value="' + parts[1] + '"]');
      }
      if (el) {
        el.checked = !!checks[key];
        el.dispatchEvent(new Event("change", { bubbles: true }));
        var row = el.closest(".ex2-check-row");
        if (row) row.classList.toggle("picked", el.checked);
      }
    });
  }

  function restorePicked(picked) {
    if (!picked) return;
    if (picked.ex1gate) {
      document.querySelectorAll("[data-ex1gate]").forEach(function (btn) {
        btn.classList.toggle("picked", btn.getAttribute("data-ex1gate") === picked.ex1gate);
      });
      if (window.__hitlExercises && window.__hitlExercises.setEx1GateChoice) {
        window.__hitlExercises.setEx1GateChoice(picked.ex1gate);
      }
    }
    if (picked.ex2send) {
      document.querySelectorAll("[data-ex2send]").forEach(function (btn) {
        btn.classList.toggle("picked", btn.getAttribute("data-ex2send") === picked.ex2send);
      });
      if (window.__hitlExercises && window.__hitlExercises.setEx2SendChoice) {
        window.__hitlExercises.setEx2SendChoice(picked.ex2send);
      }
    }
    if (picked.ex4priority && window.__hitlExercises && window.__hitlExercises.restoreEx4Priority) {
      window.__hitlExercises.restoreEx4Priority(picked.ex4priority);
    }
  }

  function restoreEx5Evidence(ev) {
    if (!ev || !ev.seen) return;
    Object.keys(ev.seen).forEach(function (key) {
      if (!ev.seen[key]) return;
      var tab = document.querySelector('#ex5EvidenceTabs .ex5-ev-tab[data-ev="' + key + '"]');
      if (tab) tab.classList.add("seen");
    });
    if (ev.open) {
      var openTab = document.querySelector('#ex5EvidenceTabs .ex5-ev-tab[data-ev="' + ev.open + '"]');
      if (openTab) openTab.click();
    }
  }

  function restoreAiFeedback() {
    var entries = window.__BONUS_MODULE_ENTRIES || {};
    AI_SECTIONS.forEach(function (item) {
      var e = entries[item.section];
      if (!e || !e.ai_response) return;
      if (window.__hitlRenderFeedback) {
        window.__hitlRenderFeedback(item.box, e.ai_response);
      } else {
        var box = document.getElementById(item.box);
        if (box) {
          box.classList.add("show");
          box.textContent = e.ai_response;
        }
      }
      if (window.__hitlAddRetry) window.__hitlAddRetry(item.box);
    });
  }

  window.saveHitlState = function (opts) {
    opts = opts || {};
    var state = collectState();
    var json = JSON.stringify(state);
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

  window.restoreHitlState = function (state) {
    if (!state || restored) return;
    if (typeof state === "string") {
      try {
        state = JSON.parse(state);
      } catch (e) {
        return;
      }
    }
    if (!state || state.v == null) return;
    restored = true;

    restoreFields(state.fields);
    restoreRadios(state.radios);
    restoreChecks(state.checks);
    restorePicked(state.picked);
    restoreEx5Evidence(state.ex5Evidence);

    if (state.ex2OverrideDone && window.__hitlExercises && window.__hitlExercises.restoreEx2Override) {
      window.__hitlExercises.restoreEx2Override();
    }

    if (state.ex4 && window.__hitlExercises && window.__hitlExercises.restoreEx4State) {
      window.__hitlExercises.restoreEx4State(state.ex4);
    }

    if (state.gate && window.__hitlInline && window.__hitlInline.setGate) {
      window.__hitlInline.setGate(state.gate);
    }

    if (state.matrix && window.__hitlInline && window.__hitlInline.setMatrix) {
      window.__hitlInline.setMatrix(state.matrix);
    }

    if (state.unlocked && window.__hitlProgressive && window.__hitlProgressive.setUnlocked) {
      var restoredUnlocked = Object.assign({}, state.unlocked);
      if (Number(state.v || 0) < 4) delete restoredUnlocked["s-ex3"];
      window.__hitlProgressive.setUnlocked(restoredUnlocked);
    }

    restorePhases(state.phases);
    restoreAiFeedback();

    if (window.__hitlProgressive && window.__hitlProgressive.refreshUi) {
      window.__hitlProgressive.refreshUi();
    }
  };

  function tryRestoreFromLocal() {
    try {
      var raw = localStorage.getItem(LOCAL_KEY);
      if (raw) window.restoreHitlState(raw);
    } catch (e) {
      /* ignore */
    }
  }

  function bindAutosave() {
    document
      .querySelectorAll(
        "textarea, select, input[type='text'], input[type='number'], input[type='radio'], input[type='checkbox']",
      )
      .forEach(function (el) {
        if (el.dataset.hitlAutosaveBound) return;
        el.dataset.hitlAutosaveBound = "1";
        el.addEventListener("input", scheduleSave);
        el.addEventListener("change", scheduleSave);
        el.addEventListener("blur", scheduleSave);
      });
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (
        t.closest("[data-ex1gate]") ||
        t.closest("[data-ex2send]") ||
        t.closest(".dbtn") ||
        t.closest(".rchip") ||
        t.closest("#gateApprove") ||
        t.closest("#gateCorrect") ||
        t.closest("#gateReject")
      ) {
        scheduleSave();
      }
    });
  }

  var readyDone = false;
  function onReady() {
    if (readyDone) return;
    readyDone = true;
    bindAutosave();
    restored = false;
    var serverState = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      serverState = window.BonusModule.getEntry("_state");
    }
    if (serverState) {
      window.restoreHitlState(serverState);
    } else {
      tryRestoreFromLocal();
    }
    document.addEventListener("hitl:state-changed", scheduleSave);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.addEventListener("bonus-module:ready", onReady, { once: true });
      setTimeout(onReady, 1200);
    });
  } else {
    document.addEventListener("bonus-module:ready", onReady, { once: true });
    setTimeout(onReady, 1200);
  }
})();
