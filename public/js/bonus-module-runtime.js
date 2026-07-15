/* eslint-disable */
/**
 * Bonus module: OpenAI via /api/module-ai, persistence via /api/bonus-module/responses.
 * Set window.BONUS_MODULE_SLUG before loading (default: ai-asiakaspalvelu).
 */
(function () {
  "use strict";

  // Load the deploy auto-reloader so static module pages refresh on new deploys.
  (function () {
    if (window.__autoReloadInit || document.getElementById("__auto_reload_js")) return;
    var s = document.createElement("script");
    s.id = "__auto_reload_js";
    s.src = "/js/auto-reload.js";
    s.async = true;
    (document.head || document.documentElement).appendChild(s);
  })();

  var SLUG = window.BONUS_MODULE_SLUG || "ai-asiakaspalvelu";
  var entries = {};
  var saveTimer = null;
  var goWrapped = false;

  function apiBase() {
    return "/api/bonus-module/responses?slug=" + encodeURIComponent(SLUG);
  }

  function saveEntry(sectionId, userText, promptText, aiResponse, opts) {
    opts = opts || {};
    if (!sectionId) return Promise.resolve();
    var text = typeof userText === "string" ? userText : JSON.stringify(userText);
    if (!String(text).trim()) return Promise.resolve();
    return fetch("/api/bonus-module/responses", {
      method: "POST",
      credentials: "same-origin",
      keepalive: !!opts.keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: SLUG,
        section_id: sectionId,
        prompt_text: promptText || null,
        user_text: text,
        ai_response: aiResponse || null,
      }),
    }).catch(function () {});
  }

  function flushDrafts(opts) {
    opts = opts || {};
    document.querySelectorAll("textarea[id]").forEach(function (el) {
      if (!el.id || el.getAttribute("data-bonus-skip-save") === "1") return;
      var v = el.value != null ? String(el.value).trim() : "";
      if (v) saveEntry("_draft_" + el.id, v, null, null, opts);
    });
  }

  function flushAll(opts) {
    opts = opts || {};
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flushDrafts(opts);
    saveStateSnapshot(opts);
  }

  function scheduleFlush() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      flushDrafts();
    }, 800);
  }

  function onPageLeave() {
    flushAll({ keepalive: true });
  }

  function getEntry(sectionId) {
    var e = entries[sectionId];
    return e && e.user_text ? e.user_text : null;
  }

  function loadEntries() {
    return fetch(apiBase() + "&raw=1", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        entries = d && d.entries ? d.entries : {};
        window.__BONUS_MODULE_ENTRIES = entries;
      })
      .catch(function () {
        entries = {};
      });
  }

  function saveStateSnapshot(opts) {
    opts = opts || {};
    if (SLUG === "hitl-architect" && typeof window.saveHitlState === "function") {
      return window.saveHitlState(opts);
    }
    if (SLUG === "eu-ai-act-moduuli5" && typeof window.saveEuAiActState === "function") {
      return window.saveEuAiActState(opts);
    }
    if (SLUG === "prompt-hiomo" && typeof window.savePromptHiomoState === "function") {
      return window.savePromptHiomoState(opts);
    }
    if (SLUG === "bottityypit" && typeof window.saveBottityypitState === "function") {
      return window.saveBottityypitState(opts);
    }
    if (SLUG === "julkinen-vastaus" && typeof window.saveModAState === "function") {
      return window.saveModAState(opts);
    }
    if (SLUG === "tilanteen-arviointi" && typeof window.saveModBState === "function") {
      return window.saveModBState(opts);
    }
    if (SLUG === "toimeenpanija" && typeof window.saveMod4State === "function") {
      return window.saveMod4State(opts);
    }
    if (SLUG === "ai-komentokeskus" && typeof window.saveMod5State === "function") {
      return window.saveMod5State(opts);
    }
    if (SLUG === "siirtyma-hr" && typeof window.saveSiirtymaState === "function") {
      return window.saveSiirtymaState(opts);
    }
    if (typeof window.saveModTomiState === "function") {
      var tomiSlugs = [
        "somekieli-rekry",
        "sisalto-ai",
        "tapauskirjaus-hr",
        "sisainen-viestinta",
        "ammattikoulu-polku",
      ];
      if (tomiSlugs.indexOf(SLUG) >= 0) {
        return window.saveModTomiState(opts);
      }
    }
    var state = {
      cur: typeof window.cur === "number" ? window.cur : 1,
      mDone: typeof window.mDone === "number" ? window.mDone : 0,
      mStatus: window.mStatus || {},
      missionOpened: window.missionOpened || {},
      skillDone: !!window.skillDone,
      skillChecks:
        typeof window.getSkillCheckIndices === "function" ? window.getSkillCheckIndices() : [],
      d1done: !!window.d1done,
      d1pick: window.d1pick || null,
      art14Step: typeof window.art14Step === "number" ? window.art14Step : 1,
      art14Evidence: window.art14Evidence || [],
      art14Pressure: window.art14Pressure || null,
      art14Flaws: window.art14Flaws || [],
      art14Action: window.art14Action || null,
      art14Reply: window.art14Reply || null,
      art14Step5Passed: !!window.art14Step5Passed,
      caseHintsShown: typeof window.caseHintsShown === "number" ? window.caseHintsShown : 0,
      caseComplete: !!window.caseComplete,
      caseSubmitted: !!window.caseSubmitted,
      caseSkipped: !!window.caseSkipped,
      casePicks: window.casePicks || [],
      w1done: !!window.w1done,
      w2done: !!window.w2done,
      earnDone: !!window.earnDone,
      finished: !!window.__bonusFinished,
    };
    return saveEntry("_state", JSON.stringify(state), null, null, opts);
  }

  function parseState(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /** Map saved screen index from older 12-screen layout to current 10-screen flow. */
  function migrateScreenIndex(n) {
    if (typeof n !== "number" || n < 1) return 1;
    if (n <= 3) return n;
    if (n === 4 || n === 5) return 4;
    if (n > 12) return 10;
    return n - 2;
  }

  function restoreDrafts() {
    document.querySelectorAll("textarea[id]").forEach(function (el) {
      if (!el.id) return;
      if (el.value && String(el.value).trim()) return;
      var v = getEntry("_draft_" + el.id);
      if (v != null && v !== "") el.value = v;
    });
  }

  function restoreMissionOpened(state) {
    var opened = (state && state.missionOpened) || window.missionOpened || {};
    var ms = window.mStatus || {};
    ["mc1", "mc2", "mc3", "mc4"].forEach(function (mcId) {
      if (!opened[mcId] || ms[mcId]) return;
      var mc = document.getElementById(mcId);
      if (mc) mc.classList.add("opened");
      var ra = document.getElementById("r" + mcId.replace("mc", ""));
      if (ra) ra.classList.add("show");
      var stNum = mcId.replace("mc", "");
      var stEl = document.getElementById("st" + stNum);
      if (stEl) {
        stEl.className = "mc-status opened";
        stEl.textContent = "◐ Avattu — palaa ja kirjoita";
      }
    });
  }

  function restoreAiFeedback() {
    var missionMap = [
      { section: "mission_mc1", txt: "ait_mc1", fb: "aifb_mc1" },
      { section: "mission_mc2", txt: "ait_mc2", fb: "aifb_mc2" },
      { section: "mission_mc3", txt: "ait_mc3", fb: "aifb_mc3" },
      { section: "mission_mc4", txt: "ait_mc4", fb: "aifb_mc4" },
    ];
    missionMap.forEach(function (m) {
      var e = entries[m.section];
      if (!e || !e.ai_response) return;
      if (!window.mStatus) window.mStatus = {};
      if (!window.mStatus[m.section.replace("mission_", "")]) {
        window.mStatus[m.section.replace("mission_", "")] = true;
      }
      var txt = document.getElementById(m.txt);
      if (txt) txt.textContent = e.ai_response;
      var fb = document.getElementById(m.fb);
      if (fb) fb.classList.add("show");
    });
    if (window.mStatus) {
      var doneCount = ["mc1", "mc2", "mc3", "mc4"].filter(function (k) {
        return !!window.mStatus[k];
      }).length;
      if (doneCount > 0) window.mDone = doneCount;
    }
    ["1", "2"].forEach(function (n) {
      var e = entries["write_ta" + n];
      if (!e || !e.ai_response) return;
      var t = document.getElementById("t_ta" + n);
      if (t) t.textContent = e.ai_response;
      var fb = document.getElementById("fb_ta" + n);
      if (fb) fb.classList.add("show");
    });
    var earn = entries.earn_statement;
    if (earn && earn.ai_response) {
      var et = document.getElementById("earnTxt");
      if (et) et.textContent = earn.ai_response;
      var copy = document.getElementById("copybtn");
      if (copy) copy.classList.add("show");
    }
  }

  function restoreMissionUI() {
    var ms = window.mStatus || {};
    ["mc1", "mc2", "mc3", "mc4"].forEach(function (mcId) {
      if (!ms[mcId]) return;
      var mc = document.getElementById(mcId);
      if (mc) {
        mc.classList.remove("opened");
        mc.classList.add("reflected");
      }
      var ra = document.getElementById("r" + mcId.replace("mc", ""));
      if (ra) ra.classList.add("show");
      var stNum = mcId.replace("mc", "");
      var stEl = document.getElementById("st" + stNum);
      if (stEl) {
        stEl.className = "mc-status done";
        stEl.textContent = "✓ Tehty";
      }
    });
    if (typeof window.mDone === "number" && window.mDone >= 4) {
      var all = document.getElementById("allDoneMsg");
      if (all) all.classList.add("show");
      var nav2 = document.getElementById("nav2wait");
      if (nav2) nav2.style.display = "none";
    }
    var mcount = document.getElementById("mcount");
    if (mcount && typeof window.mDone === "number") mcount.textContent = String(window.mDone);
  }

  function restoreFromState(state) {
    if (!state) return;
    if (state.mStatus) window.mStatus = state.mStatus;
    if (state.missionOpened) window.missionOpened = state.missionOpened;
    if (typeof state.mDone === "number") window.mDone = state.mDone;
    if (Array.isArray(state.skillChecks) && typeof window.restoreSkillChecks === "function") {
      window.restoreSkillChecks(state.skillChecks);
    }
    if (state.skillDone || (Array.isArray(state.skillChecks) && state.skillChecks.length > 0)) {
      window.skillDone = true;
      var sr = document.getElementById("skillReveal");
      if (sr) sr.classList.add("show");
      var nav3 = document.getElementById("nav3wait");
      if (nav3) nav3.style.display = "none";
      if (
        Array.isArray(state.skillChecks) &&
        state.skillChecks.length > 0 &&
        typeof window.updateSkillProgress === "function"
      ) {
        window.updateSkillProgress();
      }
    }
    if (state.d1pick) window.d1pick = state.d1pick;
    if (state.d1done) window.d1done = true;
    if (typeof state.art14Step === "number") window.art14Step = state.art14Step;
    if (Array.isArray(state.art14Evidence)) window.art14Evidence = state.art14Evidence;
    if (state.art14Pressure) window.art14Pressure = state.art14Pressure;
    if (Array.isArray(state.art14Flaws)) window.art14Flaws = state.art14Flaws;
    if (state.art14Action) window.art14Action = state.art14Action;
    if (state.art14Reply) window.art14Reply = state.art14Reply;
    if (state.art14Step5Passed) window.art14Step5Passed = true;
    if (typeof window.restoreArt14UI === "function") {
      window.restoreArt14UI(state);
    } else if (state.d1pick && typeof window.applyPick1UI === "function") {
      window.applyPick1UI(state.d1pick);
    } else if (state.d1done && typeof window.applyPick1UI === "function") {
      window.applyPick1UI("good");
    }
    if (state.w1done) window.w1done = true;
    if (state.w2done) window.w2done = true;
    if (state.w1done && state.w2done) {
      var nav11ok = document.getElementById("nav11ok");
      var nav11wait = document.getElementById("nav11wait");
      if (nav11ok) nav11ok.style.display = "flex";
      if (nav11wait) nav11wait.style.display = "none";
    }
    if (typeof window.restoreCaseUI === "function") {
      window.restoreCaseUI(state);
    } else if (state.caseComplete) {
      var caseReveal = document.getElementById("caseReveal");
      if (caseReveal) caseReveal.classList.add("show");
      var nav10 = document.getElementById("nav10wait");
      if (nav10) nav10.style.display = "none";
    }
    if (state.earnDone) window.earnDone = true;
    if (state.finished) {
      window.__bonusFinished = true;
      var b = document.querySelector("#s10 .btn-sage");
      if (b) {
        b.textContent = "Suoritettu";
        b.style.background = "#1a3d2a";
        b.disabled = true;
      }
    }
    restoreMissionUI();
    restoreMissionOpened(state);
    var screen = state.cur && state.cur > 1 ? migrateScreenIndex(state.cur) : 1;
    if (typeof window.go === "function") {
      setTimeout(function () {
        try {
          window.go(screen);
        } catch (e) {}
      }, 80);
    }
  }

  function bindAutosave() {
    document.querySelectorAll("textarea[id]").forEach(function (el) {
      if (!el.id || el.dataset.bonusAutosaveBound) return;
      el.dataset.bonusAutosaveBound = "1";
      el.addEventListener("input", scheduleFlush);
      el.addEventListener("blur", function () {
        var v = el.value != null ? String(el.value).trim() : "";
        if (v) saveEntry("_draft_" + el.id, v, null, null);
      });
    });
  }

  function bindPageLeaveSave() {
    if (window.__bonusPageLeaveBound) return;
    window.__bonusPageLeaveBound = true;
    window.addEventListener("pagehide", onPageLeave);
    window.addEventListener("beforeunload", onPageLeave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") onPageLeave();
    });
  }

  function wrapGo() {
    if (goWrapped || typeof window.go !== "function") return;
    goWrapped = true;
    var orig = window.go;
    window.go = function (n) {
      var ret = orig.apply(this, arguments);
      window.cur = n;
      saveStateSnapshot();
      scheduleFlush();
      return ret;
    };
  }

  function injectSaveIndicator() {
    if (document.getElementById("bonus-save-indicator")) return;
    var el = document.createElement("div");
    el.id = "bonus-save-indicator";
    el.setAttribute("aria-live", "polite");
    el.style.cssText =
      "position:fixed;bottom:12px;left:12px;z-index:10060;font:600 11px 'Space Mono',monospace;letter-spacing:.06em;text-transform:uppercase;padding:6px 12px;border-radius:100px;background:rgba(26,22,18,.88);color:rgba(245,242,236,.75);border:1px solid rgba(255,255,255,.12);pointer-events:none;opacity:0;transition:opacity .2s;";
    el.textContent = "Tallennettu";
    document.body.appendChild(el);
    window.__bonusShowSaved = function () {
      el.style.opacity = "1";
      setTimeout(function () {
        el.style.opacity = "0";
      }, 2000);
    };
  }

  async function callAI(prompt, txtId, fbId, cb, isEarn, sectionId, opts) {
    opts = opts || {};
    var sid = sectionId || (txtId ? "ai_" + txtId : "ai_feedback");
    try {
      var payload = {
        bonus_slug: SLUG,
        section_id: sid,
        model: "gpt-4o",
        max_tokens: opts.max_tokens != null ? opts.max_tokens : isEarn ? 450 : 350,
        user_text: prompt,
        messages: [{ role: "user", content: prompt }],
      };
      if (opts.system) payload.system = opts.system;
      if (opts.skip_quality_gate) payload.skip_quality_gate = true;
      var r = await fetch("/api/module-ai", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      var d = {};
      try {
        d = await r.json();
      } catch (e2) {
        d = {};
      }
      if (r.status === 401) {
        var el401 = document.getElementById(txtId);
        if (el401) el401.textContent = "Kirjaudu sisään uudelleen saadaksesi AI-palautetta.";
        if (cb) cb();
        return;
      }
      var txt =
        (d.content && d.content[0] && d.content[0].text) ||
        d.text ||
        "Palaute ei saatavilla.";
      var el = document.getElementById(txtId);
      if (el) el.textContent = txt;
      if (fbId) {
        var fb = document.getElementById(fbId);
        if (fb) fb.classList.add("show");
      }
      await saveEntry(sid, prompt, null, txt);
      if (window.__bonusShowSaved) window.__bonusShowSaved();
      if (cb) cb();
    } catch (e) {
      var el = document.getElementById(txtId);
      if (el) {
        el.textContent = isEarn
          ? "Harjoittelen EU AI Actin periaatteiden soveltamista tekoälyavusteisessa asiakaspalvelussa. Ymmärrän läpinäkyvyyden (tekoälyn ilmoittaminen), ihmisen valvonnan ja AI-lukutaidon merkityksen työympäristössä. Esimerkiksi varmistaisin, että järjestelmät kertovat selkeästi olevansa tekoäly ja että asiakas voi siirtyä ihmiselle tarvittaessa."
          : "Hyvä — jatka seuraavaan.";
      }
      if (cb) cb();
    }
  }

  function patchFinish() {
    if (typeof window.finish !== "function" || window.__bonusFinishPatched) return;
    window.__bonusFinishPatched = true;
    var origFinish = window.finish;
    window.finish = function () {
      window.__bonusFinished = true;
      saveStateSnapshot();
      saveEntry("_complete", new Date().toISOString(), null, null);
      origFinish();
    };
  }

  function init() {
    injectSaveIndicator();
    loadEntries().then(function () {
      restoreDrafts();
      restoreAiFeedback();
      var state = parseState(getEntry("_state"));
      if (SLUG === "hitl-architect" && typeof window.restoreHitlState === "function") {
        if (state) window.restoreHitlState(state);
      } else if (SLUG === "eu-ai-act-moduuli5" && typeof window.restoreEuAiActState === "function") {
        if (state) {
          window.restoreEuAiActState(state);
        }
      } else if (SLUG === "prompt-hiomo" && typeof window.restorePromptHiomoState === "function") {
        if (state) window.restorePromptHiomoState(state);
      } else if (SLUG === "bottityypit") {
        /* restore handled by bottityypit-persistence.js on bonus-module:ready */
      } else {
        restoreFromState(state);
      }
      bindAutosave();
      bindPageLeaveSave();
      wrapGo();
      patchFinish();
      document.dispatchEvent(new CustomEvent("bonus-module:ready"));
    });
  }

  window.BonusModule = {
    slug: SLUG,
    init: init,
    callAI: callAI,
    saveEntry: saveEntry,
    saveStateSnapshot: saveStateSnapshot,
    flushAll: flushAll,
    getEntry: getEntry,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
