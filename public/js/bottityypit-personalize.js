/**
 * AI Polku personalization: Your World picker + Bot Studio for bottityypit.
 */
(function (global) {
  "use strict";

  var activeId = null;
  var activeScenario = null;
  var onboarding = null;
  var studioState = { facts: {}, blocks: {} };
  var readyCbs = [];

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getScenario() {
    if (activeScenario) return activeScenario;
    var Sc = global.BottityypitScenarios;
    if (!Sc) return null;
    try {
      var saved = sessionStorage.getItem("bt_scenario_id");
      if (saved) return Sc.byId(saved);
    } catch (e) {
      /* ignore */
    }
    return Sc.byId(Sc.DEFAULT_ID || "metsa");
  }

  function patchDom(sc) {
    var map = sc.bind || {};
    Object.keys(map).forEach(function (key) {
      var el = document.querySelector('[data-bt-bind="' + key + '"]');
      if (el) el.innerHTML = map[key];
    });
    var brand = document.querySelector(".brand-txt");
    if (brand && sc.tagline) brand.textContent = sc.tagline;
    var cq = document.querySelector(".compare-q");
    if (cq && sc.cmpQ) cq.textContent = 'Asiakas kysyy: "' + sc.cmpQ + '"';
    var briefFacts = $("briefFactsHost");
    if (briefFacts) {
      briefFacts.innerHTML = (sc.facts || [])
        .map(function (f) {
          return (
            '<div class="bf-row"><span class="bf-k">' +
            esc(f.label.split(" ")[0]) +
            '</span><span class="bf-v">' +
            esc(f.label) +
            "</span></div>"
          );
        })
        .join("");
    }
    var briefRules = $("briefRulesHost");
    if (briefRules) {
      briefRules.innerHTML = (sc.rulesForbidden || [])
        .map(function (r) {
          return "<li>" + r + "</li>";
        })
        .join("");
    }
  }

  function applyScenario(id) {
    var Sc = global.BottityypitScenarios;
    if (!Sc) return;
    activeId = id;
    activeScenario = Sc.byId(id);
    try {
      sessionStorage.setItem("bt_scenario_id", id);
    } catch (e) {
      /* ignore */
    }
    patchDom(activeScenario);
    initBotStudio(true);
    try {
      document.dispatchEvent(
        new CustomEvent("bottityypit:scenario-applied", { detail: { id: id, scenario: activeScenario } })
      );
    } catch (e) {
      /* ignore */
    }
    readyCbs.forEach(function (cb) {
      try {
        cb(activeScenario);
      } catch (err) {
        /* ignore */
      }
    });
  }

  function compileStudioPrompt() {
    var sc = getScenario();
    if (!sc) return "";
    var blocks = sc.promptBlocks || {};
    var company = sc.companyName || "yritys";
    var parts = [];
    var role = $("pbRole");
    var tone = $("pbTone");
    var aiN = $("pbAi");
    var bound = $("pbBound");
    var esca = $("pbEsc");
    if (role && role.value.trim()) parts.push(role.value.trim());
    else parts.push((blocks.role || "").replace("{company}", company));
    if (tone && tone.value.trim()) parts.push(tone.value.trim());
    else if (blocks.tone) parts.push(blocks.tone);
    if (aiN && aiN.value.trim()) parts.push(aiN.value.trim());
    else if (blocks.aiNotice) parts.push(blocks.aiNotice);
    var facts = [];
    (sc.facts || []).forEach(function (f) {
      if (studioState.facts[f.id]) facts.push(f.label);
    });
    if (facts.length) parts.push("Tiedot joita saat käyttää:\n- " + facts.join("\n- "));
    if (bound && bound.value.trim()) parts.push(bound.value.trim());
    else if (blocks.boundaries) parts.push(blocks.boundaries);
    if (esca && esca.value.trim()) parts.push(esca.value.trim());
    else if (blocks.escalation) parts.push(blocks.escalation);
    return parts.filter(Boolean).join("\n\n");
  }

  function syncPromptTextarea() {
    var ta = $("ex5Prompt");
    if (!ta) return;
    var compiled = compileStudioPrompt();
    if (compiled) ta.value = compiled;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initBotStudio(reset) {
    var sc = getScenario();
    if (!sc) return;
    var kb = $("ex5KbPanel");
    if (kb) {
      kb.innerHTML = (sc.facts || [])
        .map(function (f) {
          var on = reset ? true : !!studioState.facts[f.id];
          if (reset) studioState.facts[f.id] = true;
          return (
            '<label class="kb-chip' +
            (on ? " on" : "") +
            '"><input type="checkbox" data-fid="' +
            esc(f.id) +
            '" ' +
            (on ? "checked" : "") +
            "> " +
            esc(f.label) +
            "</label>"
          );
        })
        .join("");
      kb.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
        cb.addEventListener("change", function () {
          studioState.facts[cb.dataset.fid] = cb.checked;
          cb.parentElement.classList.toggle("on", cb.checked);
          syncPromptTextarea();
        });
      });
    }
    var blocks = sc.promptBlocks || {};
    var company = sc.companyName || "";
    if (reset) {
      studioState.blocks = {};
      var fields = [
        ["pbRole", (blocks.role || "").replace("{company}", company)],
        ["pbTone", blocks.tone || ""],
        ["pbAi", blocks.aiNotice || ""],
        ["pbBound", blocks.boundaries || ""],
        ["pbEsc", blocks.escalation || ""]
      ];
      fields.forEach(function (pair) {
        var el = $(pair[0]);
        if (el) el.value = pair[1];
      });
    }
    ["pbRole", "pbTone", "pbAi", "pbBound", "pbEsc"].forEach(function (id) {
      var el = $(id);
      if (!el || el.__btBound) return;
      el.__btBound = true;
      el.addEventListener("input", syncPromptTextarea);
    });
    if (reset) syncPromptTextarea();
  }

  function renderYourWorld() {
    var host = $("ywScenarios");
    if (!host || !global.BottityypitScenarios) return;
    var rank = global.BottityypitScenarios.rankFromOnboarding(onboarding);
    var seen = {};
    var ordered = [];
    rank.forEach(function (id) {
      if (!seen[id]) {
        seen[id] = true;
        ordered.push(id);
      }
    });
    global.BottityypitScenarios.ALL.forEach(function (s) {
      if (!seen[s.id]) ordered.push(s.id);
    });

    host.innerHTML = ordered
      .map(function (id, idx) {
        var s = global.BottityypitScenarios.byId(id);
        var rec = idx === 0 && onboarding;
        return (
          '<button type="button" class="yw-card' +
          (rec ? " rec" : "") +
          '" data-scenario="' +
          esc(s.id) +
          '">' +
          (rec ? '<span class="yw-rec">Suositus sinulle</span>' : "") +
          '<span class="yw-emoji">' +
          esc(s.emoji) +
          "</span>" +
          '<span class="yw-label">' +
          esc(s.label) +
          "</span>" +
          '<span class="yw-co">' +
          esc(s.companyName) +
          "</span></button>"
        );
      })
      .join("");

    host.querySelectorAll(".yw-card").forEach(function (btn) {
      btn.addEventListener("click", function () {
        host.querySelectorAll(".yw-card").forEach(function (b) {
          b.classList.remove("sel");
        });
        btn.classList.add("sel");
        $("ywStart").disabled = false;
        $("ywStart").dataset.scenario = btn.dataset.scenario;
      });
    });

    var hint = $("ywOnboardingHint");
    if (hint && onboarding) {
      var prof = onboarding.profession || "";
      var ch = onboarding.biggest_challenge || "";
      hint.innerHTML =
        "Aloitusmoduulisi perusteella: <b>" +
        esc(prof) +
        "</b>" +
        (ch ? " · painopiste: <b>" + esc(ch) + "</b>" : "") +
        ". Valitse aihe — kaikki harjoitukset mukautuvat siihen.";
      hint.style.display = "block";
    }
  }

  function fetchOnboarding() {
    return fetch("/api/onboarding/status", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        if (d && d.completed && d.onboarding) onboarding = d.onboarding;
      })
      .catch(function () {});
  }

  function initYourWorld() {
    fetchOnboarding().then(function () {
      renderYourWorld();
      var saved = null;
      try {
        saved = sessionStorage.getItem("bt_scenario_id");
      } catch (e) {
        /* ignore */
      }
      if (saved) {
        var card = document.querySelector('.yw-card[data-scenario="' + saved + '"]');
        if (card) {
          card.classList.add("sel");
          $("ywStart").disabled = false;
          $("ywStart").dataset.scenario = saved;
        }
      }
    });
    var start = $("ywStart");
    if (start && !start.__btBound) {
      start.__btBound = true;
      start.addEventListener("click", function () {
        var id = start.dataset.scenario;
        if (!id) return;
        applyScenario(id);
        if (typeof global.__btStartExercises === "function") {
          global.__btStartExercises();
        }
      });
    }
  }

  global.BottityypitPersonalize = {
    getScenario: getScenario,
    applyScenario: applyScenario,
    compileStudioPrompt: compileStudioPrompt,
    syncPromptTextarea: syncPromptTextarea,
    initYourWorld: initYourWorld,
    initBotStudio: initBotStudio,
    onReady: function (cb) {
      if (activeScenario) cb(activeScenario);
      else readyCbs.push(cb);
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    initYourWorld();
    var saved = null;
    try {
      saved = sessionStorage.getItem("bt_scenario_id");
    } catch (e) {
      /* ignore */
    }
    if (saved) applyScenario(saved);
    if (typeof global.ex5OnScenarioApplied === "function") global.ex5OnScenarioApplied();
  });
})(typeof window !== "undefined" ? window : global);
