(function () {
  if (!window.EU_AI_ACT_UX_LOCAL) return;

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

  function buildDots(dotsEl, count) {
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    for (var i = 0; i < count; i++) {
      var d = document.createElement("span");
      d.className = "review-dot" + (i === 0 ? " active" : "");
      d.dataset.i = String(i);
      dotsEl.appendChild(d);
    }
  }

  function updateDots(dotsEl, activeIndex) {
    if (!dotsEl) return;
    dotsEl.querySelectorAll(".review-dot").forEach(function (d, i) {
      d.classList.remove("active", "done");
      if (i < activeIndex) d.classList.add("done");
      else if (i === activeIndex) d.classList.add("active");
    });
  }

  function makeProgress(steps, labelId, dotsId) {
    var labelEl = $(labelId);
    var dotsEl = $(dotsId);
    buildDots(dotsEl, steps.length);

    return function (stepId, extra) {
      var idx = steps.indexOf(stepId);
      if (idx < 0) idx = 0;
      updateDots(dotsEl, idx);
      if (labelEl) {
        labelEl.textContent =
          extra || "Vaihe " + (idx + 1) + " / " + steps.length;
      }
    };
  }

  var updateEx3 = makeProgress(EX3_STEPS, "ex3StepLabel", "ex3Dots");
  var updateEx4 = makeProgress(EX4_STEPS, "ex4StepLabel", "ex4Dots");
  var updateEx5 = makeProgress(EX5_STEPS, "ex5StepLabel", "ex5Dots");

  function wrapStep(name, steps, updater, extraFn) {
    var orig = window[name];
    if (!orig) return;
    window[name] = function (id) {
      orig(id);
      var extra = extraFn ? extraFn(id) : null;
      updater(id, extra);
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

  wrapStep("ex3ShowStep", EX3_STEPS, updateEx3);
  wrapStep("ex4ShowStep", EX4_STEPS, updateEx4, ex4ExtraLabel);
  wrapStep("ex5ShowStep", EX5_STEPS, updateEx5);

  var origEx4Next = window.ex4NextChat;
  if (origEx4Next) {
    window.ex4NextChat = function (n) {
      origEx4Next(n);
      var chatLabel = $("ex4ChatLabel");
      updateEx4(
        "ex4step-chats",
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
        p.classList.contains("step-instruction") ||
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
      p.classList.add("step-instruction");
      p.removeAttribute("style");
    });
  }

  function addFormatNoteAfter(textareaId, html) {
    var ta = $(textareaId);
    if (!ta || ta.dataset.uxFormatNote) return;
    var note = document.createElement("p");
    note.className = "format-note";
    note.innerHTML = html;
    ta.parentNode.insertBefore(note, ta);
    ta.dataset.uxFormatNote = "1";
  }

  function enhanceEx4ChatWizard() {
    var wrap = $("ex4ChatWizard");
    if (!wrap || wrap.dataset.uxEnhanced) return;
    wrap.dataset.uxEnhanced = "1";
    wrap.querySelectorAll("textarea").forEach(function (ta) {
      if (ta.id && ta.id.indexOf("ex4why") === 0) {
        var note = document.createElement("p");
        note.className = "format-note";
        note.textContent =
          "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.";
        ta.parentNode.insertBefore(note, ta);
      }
    });
  }

  function enhanceEx3Act() {
    var step = $("ex3step-act");
    if (!step || step.dataset.uxEnhanced) return;
    var sub = step.querySelector("p[style*='0.86rem']");
    if (sub && !sub.classList.contains("step-instruction")) {
      sub.className = "step-instruction";
      sub.removeAttribute("style");
      sub.textContent = "Valitse kaikki sopivat paikat — asiakas näkee nämä ensin.";
    }
    addFormatNoteAfter(
      "ex3diswhy",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    step.dataset.uxEnhanced = "1";
  }

  function enhanceEx4Pressure() {
    addFormatNoteAfter(
      "ex4feel",
      "✍️ Kirjoita kaksi seurausta — täydet lauseet tai lyhyet viivat käyvät.",
    );
  }

  function enhanceEx4Design() {
    addFormatNoteAfter(
      "ex4exit",
      "✍️ Yksi selkeä lause riittää. Voit kirjoittaa myös lyhyenä viivana.",
    );
  }

  function init() {
    enhanceEx3Act();
    enhanceEx4Pressure();
    enhanceEx4Design();
    enhanceEx4ChatWizard();

    var origBuildEx4 = null;
    if (typeof buildEx4ChatWizard !== "undefined") {
      origBuildEx4 = buildEx4ChatWizard;
    }

    var chatObserver = new MutationObserver(function () {
      enhanceEx4ChatWizard();
    });
    var chatWrap = $("ex4ChatWizard");
    if (chatWrap) {
      chatObserver.observe(chatWrap, { childList: true });
    }

    EX3_STEPS.forEach(autoUpgradeStep);
    EX4_STEPS.forEach(autoUpgradeStep);
    EX5_STEPS.forEach(autoUpgradeStep);

    var activeEx3 = document.querySelector(".ex3-step.show");
    if (activeEx3) updateEx3(activeEx3.id);
    var activeEx4 = document.querySelector(".ex4-step.show");
    if (activeEx4) updateEx4(activeEx4.id, ex4ExtraLabel(activeEx4.id));
    var activeEx5 = document.querySelector(".ex5-step.show");
    if (activeEx5) updateEx5(activeEx5.id);

    addFormatNoteAfter(
      "ex3ethical",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    addFormatNoteAfter(
      "ex3customer",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    addFormatNoteAfter(
      "ex3comparewhy",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    addFormatNoteAfter(
      "ex4wordwhy",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    addFormatNoteAfter(
      "ex4pressure",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
    addFormatNoteAfter(
      "ex4emergwhy",
      "✍️ Täydet lauseet tai lyhyet ranskalaiset viivat käyvät molemmat.",
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
