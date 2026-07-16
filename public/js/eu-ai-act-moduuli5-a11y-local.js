(function () {
  if (!window.EU_AI_ACT_A11Y_LOCAL) return;

  function $(id) {
    return document.getElementById(id);
  }

  var EX3_STEPS = [
    "ex3step-review",
    "ex3step-act",
    "ex3step-rewrite",
    "ex3step-respond",
  ];

  var EX4_STEPS = [
    "ex4step-review",
    "ex4step-chats",
    "ex4step-design",
    "ex4step-finish",
  ];

  var EX5_STEPS = ["ex5step-brief", "ex5step-review", "ex5step-synthesis", "ex5step-supervisor"];

  function updateStepProgress(steps, stepId, labelId, fillId, extraLabel) {
    var i = steps.indexOf(stepId);
    if (i === -1) return;
    var label = $(labelId);
    var fill = $(fillId);
    if (label) {
      label.textContent =
        extraLabel || "Vaihe " + (i + 1) + " / " + steps.length;
    }
    if (fill) {
      fill.style.width = (((i + 1) / steps.length) * 100) + "%";
    }
  }

  function wrapStep(name, steps, labelId, fillId, extraFn) {
    var orig = window[name];
    if (!orig) return;
    window[name] = function (id) {
      orig(id);
      updateStepProgress(
        steps,
        id,
        labelId,
        fillId,
        extraFn ? extraFn(id) : null,
      );
      autoUpgradeStep(id);
    };
  }

  function ex4ExtraLabel(id) {
    if (id !== "ex4step-chats") return null;
    var chatLabel = $("ex4ChatLabel");
    if (chatLabel && chatLabel.textContent) {
      return "Vaihe 2 / 4 · " + chatLabel.textContent;
    }
    return "Vaihe 2 / 4 · Keskustelu 1 / 2";
  }

  wrapStep("ex3ShowStep", EX3_STEPS, "ex3StepLabel", "ex3StepFill");
  wrapStep("ex4ShowStep", EX4_STEPS, "ex4StepLabel", "ex4StepFill", ex4ExtraLabel);
  wrapStep("ex5ShowStep", EX5_STEPS, "ex5StepLabel", "ex5StepFill");

  var origEx4Next = window.ex4NextChat;
  if (origEx4Next) {
    window.ex4NextChat = function (n) {
      origEx4Next(n);
      var chatLabel = $("ex4ChatLabel");
      updateStepProgress(
        EX4_STEPS,
        "ex4step-chats",
        "ex4StepLabel",
        "ex4StepFill",
        chatLabel ? "Vaihe 2 / 4 · " + chatLabel.textContent : null,
      );
    };
  }

  var INSTRUCTION_RE =
    /kirjoita|vähintään|max\.|enintään|valitse kaikki|merkitse|yksi lause|yksi havainto|3–5|2–3/i;

  function autoUpgradeStep(stepId) {
    var step = $(stepId);
    if (!step) return;
    step.querySelectorAll("p").forEach(function (p) {
      if (
        p.classList.contains("hint") ||
        p.classList.contains("hint-strong") ||
        p.classList.contains("format-note") ||
        p.classList.contains("subhead") ||
        p.closest(".ex3-teams") ||
        p.closest(".ex4-brief-panel") ||
        p.closest(".ex5-proposal")
      ) {
        return;
      }
      var style = p.getAttribute("style") || "";
      if (!/0\.8[0-9]rem|0\.82rem|0\.84rem|0\.86rem/.test(style)) return;
      if (!INSTRUCTION_RE.test(p.textContent)) return;
      p.className = "hint hint-strong";
      if (p.textContent.indexOf("💡") !== 0) {
        p.textContent = "💡 " + p.textContent;
      }
      p.removeAttribute("style");
    });
  }

  function addFormatNoteAfter(textareaId, text) {
    var ta = $(textareaId);
    if (!ta || ta.dataset.a11yFormatNote) return;
    var prev = ta.previousElementSibling;
    while (prev) {
      if (prev.classList && prev.classList.contains("format-note")) {
        ta.dataset.a11yFormatNote = "1";
        return;
      }
      prev = prev.previousElementSibling;
    }
    var note = document.createElement("p");
    note.className = "format-note";
    note.textContent = text;
    ta.parentNode.insertBefore(note, ta);
    ta.dataset.a11yFormatNote = "1";
  }

  function enhanceEx4ChatWizard() {
    var wrap = $("ex4ChatWizard");
    if (!wrap || wrap.dataset.a11yEnhanced) return;
    wrap.dataset.a11yEnhanced = "1";
    wrap.querySelectorAll("textarea").forEach(function (ta) {
      if (ta.id && ta.id.indexOf("ex4why") === 0) {
        addFormatNoteAfter(
          ta.id,
          "Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
        );
      }
    });
  }

  function init() {
    EX3_STEPS.forEach(autoUpgradeStep);
    EX4_STEPS.forEach(autoUpgradeStep);
    EX5_STEPS.forEach(autoUpgradeStep);

    var activeEx3 = document.querySelector(".ex3-step.show");
    if (activeEx3) {
      updateStepProgress(EX3_STEPS, activeEx3.id, "ex3StepLabel", "ex3StepFill");
    }
    var activeEx4 = document.querySelector(".ex4-step.show");
    if (activeEx4) {
      updateStepProgress(
        EX4_STEPS,
        activeEx4.id,
        "ex4StepLabel",
        "ex4StepFill",
        ex4ExtraLabel(activeEx4.id),
      );
    }
    var activeEx5 = document.querySelector(".ex5-step.show");
    if (activeEx5) {
      updateStepProgress(EX5_STEPS, activeEx5.id, "ex5StepLabel", "ex5StepFill");
    }

    enhanceEx4ChatWizard();
    var chatWrap = $("ex4ChatWizard");
    if (chatWrap) {
      new MutationObserver(enhanceEx4ChatWizard).observe(chatWrap, {
        childList: true,
      });
    }

    [
      "ex3observe",
      "ex3ethical",
      "ex3diswhy",
      "ex3body",
      "ex3customer",
      "ex3comparewhy",
      "ex4missing",
      "ex4exit",
      "ex4pressure",
      "ex4feel",
      "ex4emergwhy",
      "ex4wordwhy",
      "ex5synthesis",
      "ex5supervisor",
    ].forEach(function (id) {
      addFormatNoteAfter(
        id,
        "Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
      );
    });

    initLawsJourney();
  }

  function initLawsJourney() {
    var stage = document.getElementById("ljStage");
    if (!stage) return;

    var steps = stage.querySelectorAll(".lj-step");
    var dots = document.querySelectorAll(".lj-dot");
    var countEl = document.getElementById("ljCount");
    var prevBtn = document.getElementById("ljPrev");
    var nextBtn = document.getElementById("ljNext");
    var current = 0;
    var total = steps.length;

    function showStep(i) {
      current = Math.max(0, Math.min(total - 1, i));
      steps.forEach(function (s, idx) {
        s.classList.toggle("active", idx === current);
      });
      dots.forEach(function (d, idx) {
        d.classList.toggle("on", idx === current);
        d.classList.toggle("done", idx < current);
        d.setAttribute("aria-selected", idx === current ? "true" : "false");
      });
      if (countEl) countEl.textContent = (current + 1) + " / " + total;
      if (prevBtn) prevBtn.disabled = current === 0;
      if (nextBtn) {
        nextBtn.textContent = current === total - 1 ? "Valmis ✓" : "Seuraava →";
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        showStep(current - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (current < total - 1) showStep(current + 1);
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var n = parseInt(dot.getAttribute("data-lj"), 10);
        if (!isNaN(n)) showStep(n);
      });
    });

    document.querySelectorAll("[data-lj-jump]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var n = parseInt(btn.getAttribute("data-lj-jump"), 10);
        if (!isNaN(n)) {
          showStep(n);
          var laws = document.getElementById("teoriaLaws");
          if (laws) laws.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    showStep(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
