/* HITL architect preview — progressive sections + try again / continue */
(function () {
  "use strict";

  if (!document.body.classList.contains("hitl-progressive")) return;

  var STORAGE_KEY = "hitl-architect-unlock-v2";
  var PERSIST_KEY = "hitl-architect-state-v4";

  window.__hitlProgressive = {
    getUnlocked: function () {
      return JSON.parse(JSON.stringify(unlocked));
    },
    setUnlocked: function (data) {
      if (!data) return;
      Object.keys(data).forEach(function (id) {
        if (data[id]) unlocked[id] = true;
      });
      saveProgress();
      applyLocks();
    },
    refreshUi: function () {
      applyLocks();
      STEPS.forEach(function (step) {
        if (!unlocked[step.section]) ensureHint(step);
        if (step.aiBox && step.next) ensureExerciseActions(step);
      });
      ensurePorttiActions();
      if (unlocked["s-matriisi"]) ensureMatrixActions();
    },
  };

  var SECTION_LABELS = {
    "s-ex1": "Harjoitus 1",
    "s-ex2": "Harjoitus 2",
    "s-ex3": "Harjoitus 3",
    "s-ex4": "Harjoitus 4",
    "s-ex5": "Harjoitus 5",
    "s-matriisi": "Eskalaatiomatriisi",
    "s-tulokset": "Tulokset",
  };

  var BEGINNER = document.body.classList.contains("hitl-beginner");

  var STEPS = BEGINNER
    ? [
        {
          section: "s-ex1",
          hintAfter: "s-portti",
          hint:
            "Harjoitus 1 avautuu, kun kokeilet hyväksymisporttia — tai painat Jatka alla portin jälkeen.",
          watchPortti: true,
        },
        {
          section: "s-ex2",
          hintAfter: "s-ex1",
          hint:
            "Harjoitus 2 avautuu, kun lähetät Harjoitus 1:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex1Ai",
          submitId: "ex1Submit",
          next: "s-ex2",
        },
        {
          section: "s-ex3",
          hintAfter: "s-ex2",
          hint:
            "Harjoitus 3 avautuu, kun lähetät Harjoitus 2:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex2Ai",
          submitId: "ex2Submit",
          next: "s-ex3",
        },
        {
          section: "s-tulokset",
          hintAfter: "s-ex3",
          hint:
            "Tulokset avautuvat, kun lähetät Harjoitus 3:n arvioon ja painat Jatka tuloksiin.",
          aiBox: "ex3Ai",
          submitId: "ex3Submit",
          next: "s-tulokset",
          beginnerFinish: true,
        },
      ]
    : [
        {
          section: "s-ex1",
          hintAfter: "s-portti",
          hint:
            "Harjoitus 1 avautuu, kun kokeilet hyväksymisporttia — tai painat Jatka alla portin jälkeen.",
          watchPortti: true,
        },
        {
          section: "s-ex2",
          hintAfter: "s-ex1",
          hint:
            "Harjoitus 2 avautuu, kun lähetät Harjoitus 1:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex1Ai",
          submitId: "ex1Submit",
          next: "s-ex2",
        },
        {
          section: "s-ex3",
          hintAfter: "s-ex2",
          hint:
            "Harjoitus 3 avautuu, kun lähetät Harjoitus 2:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex2Ai",
          submitId: "ex2Submit",
          next: "s-ex3",
        },
        {
          section: "s-ex4",
          hintAfter: "s-ex3",
          hint:
            "Harjoitus 4 avautuu, kun lähetät Harjoitus 3:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex3Ai",
          submitId: "ex3Submit",
          next: "s-ex4",
        },
        {
          section: "s-ex5",
          hintAfter: "s-ex4",
          hint:
            "Harjoitus 5 avautuu, kun lähetät Harjoitus 4:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex4Ai",
          submitId: "ex4Submit",
          next: "s-ex5",
        },
        {
          section: "s-matriisi",
          hintAfter: "s-ex5",
          hint:
            "Eskalaatiomatriisi avautuu, kun lähetät Harjoitus 5:n arvioon ja painat Jatka seuraavaan.",
          aiBox: "ex5Ai",
          submitId: "ex5Submit",
          next: "s-matriisi",
        },
        {
          section: "s-tulokset",
          hintAfter: "s-matriisi",
          hint: "Tulokset avautuvat matriisin jälkeen — paina Jatka tuloksiin.",
          matrixActions: true,
        },
      ];

  var unlocked = { "s-teoria": true, "s-portti": true };

  function loadProgress() {
    try {
      var persisted = localStorage.getItem(PERSIST_KEY);
      if (persisted) {
        var state = JSON.parse(persisted);
        if (state && state.unlocked) {
          mergeUnlockedFromState({ v: state.v, unlocked: state.unlocked });
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && data.unlocked) {
        Object.keys(data.unlocked).forEach(function (id) {
          if (data.unlocked[id]) unlocked[id] = true;
        });
      }
    } catch (e) {
      /* ignore */
    }
  }

  function mergeUnlockedFromState(state) {
    if (!state || !state.unlocked) return;
    Object.keys(state.unlocked).forEach(function (id) {
      if (id === "s-ex3" && Number(state.v || 0) < 4) return;
      if (state.unlocked[id]) unlocked[id] = true;
    });
  }

  function saveProgress() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked: unlocked }));
    } catch (e) {
      /* ignore */
    }
    if (typeof window.saveHitlState === "function") window.saveHitlState();
  }

  function unlockSection(id, scroll) {
    if (unlocked[id]) {
      if (scroll) {
        var sec = document.getElementById(id);
        if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }
    unlocked[id] = true;
    saveProgress();
    applyLocks();
    removeHintsPointingTo(id);
    showUnlockBanner(id);
    if (id === "s-matriisi") ensureMatrixActions();
    if (scroll) {
      var sec2 = document.getElementById(id);
      if (sec2) sec2.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function applyLocks() {
    STEPS.forEach(function (step) {
      var sec = document.getElementById(step.section);
      if (!sec) return;
      if (unlocked[step.section]) {
        sec.classList.remove("hitl-locked");
        sec.classList.add("hitl-unlocked");
      } else {
        sec.classList.add("hitl-locked");
        sec.classList.remove("hitl-unlocked");
      }
    });

    document.querySelectorAll(".rail-step[data-tgt]").forEach(function (a) {
      var tgt = a.getAttribute("data-tgt");
      var locked = STEPS.some(function (s) {
        return s.section === tgt && !unlocked[tgt];
      });
      a.classList.toggle("hitl-rail-locked", locked);
    });
  }

  function isStepLocked(sectionId) {
    return STEPS.some(function (s) {
      return s.section === sectionId && !unlocked[sectionId];
    });
  }

  function bindRailJumps() {
    document.querySelectorAll(".rail-step[data-tgt]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        var tgt = a.getAttribute("data-tgt");
        if (!tgt || !isStepLocked(tgt)) return;
        e.preventDefault();
        if (isLocalPreview()) unlockSection(tgt, true);
      });
    });
  }

  function isLocalPreview() {
    return (
      /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) &&
      new URLSearchParams(window.location.search).get("preview") === "1"
    );
  }

  function unlockFromHash() {
    var hash = (window.location.hash || "").replace("#", "");
    if (!hash || !isStepLocked(hash)) return;
    if (!isLocalPreview()) return;
    unlockSection(hash, false);
    var sec = document.getElementById(hash);
    if (sec) sec.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function removeHintsPointingTo(targetSection) {
    document.querySelectorAll(".hitl-next-hint").forEach(function (h) {
      if (h.getAttribute("data-unlocks") === targetSection) h.remove();
    });
  }

  function ensureHint(step) {
    if (unlocked[step.section]) return;
    var after = document.getElementById(step.hintAfter);
    if (!after) return;
    if (document.getElementById("hint-unlock-" + step.section)) return;

    var wrap = after.querySelector(".wrap") || after;
    var hint = document.createElement("div");
    hint.className = "hitl-next-hint";
    hint.id = "hint-unlock-" + step.section;
    hint.setAttribute("data-unlocks", step.section);
    hint.innerHTML =
      '<span class="hnh-icon" aria-hidden="true">🔒</span>' +
      '<p class="hnh-text">' +
      step.hint +
      "</p>";
    wrap.appendChild(hint);
  }

  function showUnlockBanner(sectionId) {
    var label = SECTION_LABELS[sectionId] || sectionId;
    var old = document.getElementById("hitl-unlock-toast");
    if (old) old.remove();

    var toast = document.createElement("div");
    toast.id = "hitl-unlock-toast";
    toast.className = "hitl-unlock-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML =
      '<span class="hut-icon" aria-hidden="true">✓</span>' +
      "<span><strong>" +
      label +
      "</strong> on nyt auki — jatka alta.</span>";
    document.body.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add("show");
    });
    setTimeout(function () {
      toast.classList.remove("show");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 4200);
  }

  function feedbackReady(el) {
    if (!el || !el.classList.contains("show")) return false;
    var html = el.innerHTML || "";
    if (!html.trim()) return false;
    if (el.querySelector(".ai-loading")) return false;
    return (
      el.querySelector(".fb-verdict") ||
      el.querySelector(".fb-body") ||
      html.length > 80
    );
  }

  function removeActionBar(aiId) {
    var bar = document.getElementById("actions-" + aiId);
    if (bar) bar.remove();
  }

  function ensureExerciseActions(flow) {
    var ai = document.getElementById(flow.aiBox);
    if (!feedbackReady(ai)) return;

    if (document.getElementById("actions-" + flow.aiBox)) return;

    var nextLabel = SECTION_LABELS[flow.next] || "Seuraava";
    if (flow.beginnerFinish) nextLabel = "Tulokset";

    var bar = document.createElement("div");
    bar.className = "hitl-ex-actions";
    bar.id = "actions-" + flow.aiBox;
    bar.innerHTML =
      '<p class="hea-note">Voit jatkaa seuraavaan vaikka palaute pyytäisi vielä tarkennusta.</p>' +
      '<div class="hea-btns">' +
      '<button type="button" class="outline-btn hitl-retry-btn">Kokeile uudelleen</button>' +
      '<button type="button" class="ex-btn primary hitl-continue-btn">Jatka: ' +
      nextLabel +
      " →</button>" +
      "</div>";

    ai.insertAdjacentElement("afterend", bar);

    bar.querySelector(".hitl-retry-btn").addEventListener("click", function () {
      removeActionBar(flow.aiBox);
      if (ai) {
        ai.classList.remove("show");
        ai.innerHTML = "";
      }
      var submit = document.getElementById(flow.submitId);
      if (submit) {
        submit.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(function () {
          submit.click();
        }, 200);
      }
    });

    bar.querySelector(".hitl-continue-btn").addEventListener("click", function () {
      unlockSection(flow.next, true);
      if (flow.beginnerFinish) {
        var results = document.getElementById("resultsSection");
        if (results) results.style.display = "block";
        var finish = document.getElementById("beginnerFinish");
        if (finish) finish.style.display = "block";
      }
    });
  }

  function watchAiBox(flow) {
    var el = document.getElementById(flow.aiBox);
    if (!el) return;
    var obs = new MutationObserver(function () {
      ensureExerciseActions(flow);
    });
    obs.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    ensureExerciseActions(flow);
  }

  function ensurePorttiActions() {
    var pill = document.getElementById("gateStatusPill");
    if (!pill) return;
    var decided =
      pill.classList.contains("approved") ||
      pill.classList.contains("rejected");
    if (!decided) return;
    if (document.getElementById("actions-portti")) return;

    var anchor = document.querySelector(".gate-reset") || document.getElementById("s-portti");
    if (!anchor) return;

    var bar = document.createElement("div");
    bar.className = "hitl-ex-actions";
    bar.id = "actions-portti";
    bar.innerHTML =
      '<div class="hea-btns">' +
      '<button type="button" class="outline-btn hitl-portti-retry">Kokeile porttia uudelleen</button>' +
      '<button type="button" class="ex-btn primary hitl-portti-continue">Jatka: Harjoitus 1 →</button>' +
      "</div>";

    anchor.insertAdjacentElement("afterend", bar);

    bar.querySelector(".hitl-portti-retry").addEventListener("click", function () {
      var reset = document.getElementById("gateReset");
      if (reset) reset.click();
      bar.remove();
    });

    bar.querySelector(".hitl-portti-continue").addEventListener("click", function () {
      unlockSection("s-ex1", true);
    });
  }

  function watchPortti() {
    var pill = document.getElementById("gateStatusPill");
    if (!pill) return;
    function check() {
      if (
        pill.classList.contains("approved") ||
        pill.classList.contains("rejected")
      ) {
        ensurePorttiActions();
        unlockSection("s-ex1", false);
      }
    }
    var obs = new MutationObserver(check);
    obs.observe(pill, { attributes: true, attributeFilter: ["class"] });
    check();
  }

  function ensureMatrixActions() {
    if (!unlocked["s-matriisi"] || unlocked["s-tulokset"]) return;
    if (document.getElementById("actions-matriisi")) return;

    var anchor = document.querySelector("#s-matriisi .ex-submit");
    if (!anchor) return;

    var bar = document.createElement("div");
    bar.className = "hitl-ex-actions hitl-matrix-actions";
    bar.id = "actions-matriisi";
    bar.innerHTML =
      '<p class="hea-note">Voit siirtyä tuloksiin myös ennen kuin kaikki tiketit on päätetty.</p>' +
      '<div class="hea-btns">' +
      '<button type="button" class="outline-btn hitl-matrix-retry">Aloita matriisi alusta</button>' +
      '<button type="button" class="ex-btn primary hitl-matrix-continue">Jatka tuloksiin →</button>' +
      "</div>";

    anchor.insertAdjacentElement("afterend", bar);

    bar.querySelector(".hitl-matrix-retry").addEventListener("click", function () {
      var reset = document.getElementById("resetExerciseBtn");
      if (reset) reset.click();
    });

    bar.querySelector(".hitl-matrix-continue").addEventListener("click", function () {
      unlockSection("s-tulokset", true);
      var results = document.getElementById("resultsSection");
      if (results) results.style.display = "block";
    });
  }

  function watchMatrixSubmit() {
    var btn = document.getElementById("exSubmitBtn");
    if (!btn) return;
    btn.addEventListener(
      "click",
      function () {
        if (btn.disabled) return;
        unlockSection("s-tulokset", false);
      },
      true,
    );
  }

  function init() {
    loadProgress();
    document.addEventListener("bonus-module:ready", function () {
      if (window.BonusModule && window.BonusModule.getEntry) {
        try {
          var raw = window.BonusModule.getEntry("_state");
          if (raw) mergeUnlockedFromState(JSON.parse(raw));
        } catch (e) {
          /* ignore */
        }
      }
      applyLocks();
    });
    applyLocks();

    STEPS.forEach(function (step) {
      if (!unlocked[step.section]) ensureHint(step);
      if (step.watchPortti) watchPortti();
      if (step.aiBox && step.next) watchAiBox(step);
      if (step.matrixActions) ensureMatrixActions();
    });

    if (unlocked["s-matriisi"]) ensureMatrixActions();
    watchMatrixSubmit();
    bindRailJumps();
    unlockFromHash();
    window.addEventListener("hashchange", unlockFromHash);

    /* Re-attach action bars after refresh if feedback already visible */
    STEPS.forEach(function (step) {
      if (step.aiBox && step.next) ensureExerciseActions(step);
    });
    ensurePorttiActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
