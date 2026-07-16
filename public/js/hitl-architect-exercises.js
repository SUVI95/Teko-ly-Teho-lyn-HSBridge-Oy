/* HITL Architect — analytical exercises (write, decide, justify) + Claude */
(function () {
  "use strict";

  var BONUS_SLUG = "hitl-architect";
  var HITL_BEGINNER = document.body.classList.contains("hitl-beginner");
  var GRADE_SYS =
    "Olet HSBridge-koulutuksen asiakaspalvelun ja AI-hallinnan valmentaja (Claude). Arvioit aikuisen opiskelijan vastauksen suomeksi: selkokieli, lyhyet lauseet, lämmin ja reilu sävy. " +
    "TAVOITE: näytä vain kohdat joihin voi vielä kasvaa ja kehittyä — älä saa opiskelijaa tuntemaan tyhmältä tai epäonnistuneelta. Kehu aidosti ja konkreettisesti kun osuivat oikeaan. " +
    "OLE REILU JA ANTELIAS: jos ydinasia on oikein tai selvästi pääosin oikein, anna aina ✅ Oikein ja hyvät pisteet (8–10/10). Pienet puutteet ovat kehitysmahdollisuuksia, ei syitä hylätä. " +
    "Käytä 🔄 Kokeile uudelleen vain jos ydinasia puuttuu kokonaan TAI vastaus johtaisi selvästi väärään päätökseen asiakkaan tai yrityksen kannalta. Älä rankaise sanavalintoja, pituutta tai tyyliä. " +
    "Aloita AINA kahdella rivillä:\n" +
    "Rivi 1 — tuomio:\n" +
    "• Jos ydinasia on oikein: '✅ Oikein — [3–8 sanaa mihin osuit]'\n" +
    "• Jos ydinasia puuttuu olennaisesti: '🔄 Kokeile uudelleen — [3–8 sanaa mitä vielä tarvitaan]' (älä sano vastausta vääräksi tai huonoksi)\n" +
    "Rivi 2 — pisteet: '★ Pisteet: X/10 — [yksi lyhyt reilu perustelu]'\n" +
    "Sen jälkeen käytä täsmälleen tätä muotoa:\n" +
    "✓ Mikä meni hyvin: [2–3 konkreettista kohtaa — viittaa opiskelijan omiin sanoihin; korosta oikeat päätökset ja näkökulmat]\n" +
    "↗ Voit vielä syventää: [0–2 kohtaa — vain aidot kehitysaukot; jos vastaus on jo vahva, kirjoita '—' tai 'Ei pakollista juuri nyt — hyvä analyysi.']\n" +
    "→ Seuraava askel: [1 konkreettinen vihje miten viedä analyysi askelen pidemmälle — ei valmista vastausta]\n" +
    "Kieli: älä käytä sanoja väärin, huono, heikko, epäonnistuit, et ymmärtänyt, pintapuolinen. Käytä: hyvä havainto, oikea suunta, voit lisätä, syvennä, hienoa että. Max 220 sanaa.";

  function wordCount(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function bindWordHint(textareaId, hintId, min) {
    var ta = document.getElementById(textareaId);
    var hint = document.getElementById(hintId);
    if (!ta || !hint) return;
    function upd() {
      var n = wordCount(ta.value);
      hint.textContent = n + " / " + min + " sanaa min." + (n >= min ? " ✓" : "");
      hint.style.color = n >= min ? "var(--green)" : "var(--ink3)";
    }
    ta.addEventListener("input", upd);
    upd();
  }

  async function callAI(system, userText, sectionId) {
    var r = await fetch("/api/module-ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bonus_slug: BONUS_SLUG,
        provider: "anthropic",
        anthropic_only: true,
        skip_quality_gate: true,
        max_tokens: 900,
        system: system,
        user_text: userText,
        messages: [{ role: "user", content: userText }],
        section_id: sectionId,
      }),
    });
    var d = await r.json();
    if (!r.ok) throw new Error((d && d.text) || (d && d.error) || "AI-virhe");
    var out =
      d && d.content && d.content[0] && d.content[0].text
        ? d.content[0].text
        : d && d.text
          ? d.text
          : "Palaute ei saatavilla.";
    if (window.BonusModule && typeof window.BonusModule.saveEntry === "function") {
      window.BonusModule.saveEntry(sectionId, userText, system, out);
      if (window.__bonusShowSaved) window.__bonusShowSaved();
    }
    return out;
  }

  function showAi(boxId, html) {
    var el = document.getElementById(boxId);
    if (!el) return;
    el.classList.add("show");
    el.innerHTML = html;
  }

  // Wrap the first ✅/🔄 verdict line (+ optional ★ points line) in a prominent banner.
  function renderFeedback(boxId, raw) {
    var text = String(raw || "").trim();
    var lines = text.split(/\n/);
    var verdictHtml = "";
    if (lines.length && /^\s*(✅|🔄)/.test(lines[0])) {
      var v = lines.shift().trim();
      var pass = v.indexOf("✅") === 0 || /^✅/.test(v);
      var cls = pass ? "verdict-pass" : "verdict-retry";
      verdictHtml = '<div class="fb-verdict ' + cls + '">' + v + "</div>";
      if (lines.length && /^\s*★/.test(lines[0])) {
        var pts = lines.shift().trim();
        verdictHtml += '<div class="fb-points">' + pts + "</div>";
      }
    }
    var body = lines.join("\n").replace(/\n/g, "<br>").replace(/^(<br>)+/, "");
    showAi(boxId, verdictHtml + '<div class="fb-body">' + body + "</div>");
  }

  function setLoading(boxId) {
    showAi(boxId, '<span class="ai-loading">Claude arvioi vastaustasi…</span>');
  }

  // Lisää "Kokeile uudestaan" -painike palautelaatikon alle. Tyhjentää
  // palautteen ja vie takaisin harjoituksen ensimmäiseen vaiheeseen, jotta
  // opiskelija voi muokata vastaustaan ja lähettää uudelleen.
  function addRetryButton(aiBoxId, showPhaseFn, firstPhaseId) {
    var box = document.getElementById(aiBoxId);
    if (!box || !box.parentNode) return;
    if (document.getElementById(aiBoxId + "Retry")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = aiBoxId + "Retry";
    btn.className = "ex-btn hitl-retry-btn";
    btn.textContent = "🔄 Kokeile uudestaan";
    btn.addEventListener("click", function () {
      box.classList.remove("show");
      box.innerHTML = "";
      btn.remove();
      if (typeof showPhaseFn === "function" && firstPhaseId) {
        showPhaseFn(firstPhaseId);
      }
      document.dispatchEvent(new CustomEvent("hitl:state-changed"));
    });
    box.parentNode.insertBefore(btn, box.nextSibling);
  }

  function ex1UpdateStepBar(id) {
    var bar = document.getElementById("ex1StepBar");
    if (!bar) return;
    var order = HITL_BEGINNER
      ? ["ex1PhaseUrgency", "ex1PhaseAudit", "ex1PhaseRewrite"]
      : ["ex1PhaseUrgency", "ex1PhaseAudit", "ex1PhaseRewrite", "ex1PhaseRisk"];
    var active = id === "ex1PhasePolicy" ? "ex1PhaseUrgency" : id;
    if (HITL_BEGINNER && active === "ex1PhaseRisk") active = "ex1PhaseRewrite";
    var idx = order.indexOf(active);
    if (idx < 0) idx = 0;
    bar.querySelectorAll("[data-ex1step]").forEach(function (s) {
      var si = order.indexOf(s.getAttribute("data-ex1step"));
      s.classList.toggle("on", si === idx);
      s.classList.toggle("done", si >= 0 && si < idx);
    });
  }

  function ex1ShowPhase(id) {
    document.querySelectorAll(".ex1-phase").forEach(function (p) {
      p.classList.remove("show");
    });
    var el = document.getElementById(id);
    if (el) el.classList.add("show");
    if (id === "ex1PhaseAudit") {
      var vocab = document.getElementById("ex1VocabAudit");
      if (vocab) vocab.style.display = "block";
    }
    ex1UpdateStepBar(id);
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ex1AuditQuality(text) {
    var t = (text || "").toLowerCase();
    var hasQuote = /ai sanoo|«|»|vip|60|täysi|täyden|ostohinta|automaattisesti/i.test(t);
    var sectionRefs = (t.match(/§\s*[2469]/g) || []).length;
    var numbered = (t.match(/^\s*[12][).]/gm) || []).length;
    return hasQuote && sectionRefs >= 2 && numbered >= 2;
  }

  /* ── Exercise 1 ── */
  function initEx1() {
    var gateChoice = null;

    // Vapaa navigointi vaiheiden välillä: klikkaa askelta hypätäksesi siihen.
    document.querySelectorAll("#ex1StepBar [data-ex1step]").forEach(function (s) {
      s.setAttribute("role", "button");
      s.setAttribute("tabindex", "0");
      s.addEventListener("click", function () {
        ex1ShowPhase(s.getAttribute("data-ex1step"));
      });
      s.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          ex1ShowPhase(s.getAttribute("data-ex1step"));
        }
      });
    });

    document.querySelectorAll("[data-ex1gate]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        gateChoice = btn.getAttribute("data-ex1gate");
        document.querySelectorAll("[data-ex1gate]").forEach(function (b) {
          b.classList.remove("picked");
        });
        btn.classList.add("picked");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      });
    });

    window.__hitlEx1SetGate = function (v) {
      gateChoice = v;
    };

    document.getElementById("ex1GateSubmit").addEventListener("click", function () {
      var fb = document.getElementById("ex1GateFb");
      if (!gateChoice) {
        showAi("ex1GateFb", "Valitse ensin: lähetä, pysäytä vai en ole varma.");
        return;
      }
      if (gateChoice === "yes") {
        showAi(
          "ex1GateFb",
          "Varovaisuus olisi paikallaan — vertaa luonnosta käytäntöön ennen lähetystä. Jatka silti tarkistukseen.",
        );
      } else {
        showAi("ex1GateFb", "Hyvä vaisto. Nyt vertaat luonnosta viralliseen politiikkaan.");
      }
      var vocab = document.getElementById("ex1VocabAudit");
      if (vocab) vocab.style.display = "block";
      ex1ShowPhase("ex1PhaseAudit");
    });

    document.getElementById("ex1PolicyContinue").addEventListener("click", function () {
      ex1ShowPhase("ex1PhaseAudit");
    });

    document.getElementById("ex1AuditContinue").addEventListener("click", function () {
      var audit = document.getElementById("ex1Audit").value.trim();
      if (!ex1AuditQuality(audit)) {
        showAi(
          "ex1AuditFb",
          "Listaa vähintään kaksi rikkomusta: lainaa AI:n tekstiä, viittaa §-kohtiin ja kerro miksi riski.",
        );
        return;
      }
      showAi("ex1AuditFb", "");
      document.getElementById("ex1AuditFb").classList.remove("show");
      ex1ShowPhase("ex1PhaseRewrite");
    });

    document.getElementById("ex1RewriteContinue").addEventListener("click", function () {
      var rewrite = document.getElementById("ex1Rewrite").value.trim();
      if (wordCount(rewrite) < 40) {
        showAi("ex1RewriteFb", "Kirjoita koko asiakasvastaus — empatia ja politiikan mukainen ratkaisu.");
        return;
      }
      if (/90 päiv|60 päiv|täysi hyvitys|täyden ostohinnan/i.test(rewrite)) {
        showAi("ex1RewriteFb", "Korjattu viesti ei saa toistaa samoja lupauksia. Tarjoa vain politiikan sallima ratkaisu.");
        return;
      }
      if (HITL_BEGINNER) {
        showAi("ex1RewriteFb", "");
        document.getElementById("ex1RewriteFb").classList.remove("show");
        var submitBtn = document.getElementById("ex1Submit");
        if (submitBtn) submitBtn.click();
        return;
      }
      showAi("ex1RewriteFb", "");
      document.getElementById("ex1RewriteFb").classList.remove("show");
      ex1ShowPhase("ex1PhaseRisk");
    });

    async function ex1DoSubmit() {
      var audit = document.getElementById("ex1Audit").value.trim();
      var rewrite = document.getElementById("ex1Rewrite").value.trim();
      var risk = document.getElementById("ex1Risk").value.trim();
      var fooled = document.getElementById("ex1Fooled").value.trim();
      var defectEl = document.getElementById("ex1Defect");
      var defect = defectEl ? defectEl.value : "";
      var defectWhyEl = document.getElementById("ex1DefectWhy");
      var defectWhy = defectWhyEl ? defectWhyEl.value.trim() : "";
      var impression = document.getElementById("ex1FirstImpression").value.trim();
      var aiBox = HITL_BEGINNER ? "ex1Ai" : "ex1Ai";

      if (!ex1AuditQuality(audit)) {
        showAi(aiBox, "Palaa vaiheeseen 1: vähintään kaksi rikkomusta lainauksin ja §-viittauksin.");
        ex1ShowPhase("ex1PhaseAudit");
        return;
      }
      if (wordCount(rewrite) < 40) {
        showAi(aiBox, "Kirjoita korjattu sähköposti ennen lähettämistä.");
        ex1ShowPhase("ex1PhaseRewrite");
        return;
      }
      if (wordCount(risk) < 12) {
        showAi(aiBox, "Kerro lyhyesti mitä pahinta tapahtuisi jos lähettäisit alkuperäisen luonnon.");
        ex1ShowPhase("ex1PhaseRewrite");
        return;
      }
      if (wordCount(fooled) < 8) {
        showAi(aiBox, "Lainaa yksi lause luonnosta ja kerro miksi se kuulosti uskottavalta.");
        ex1ShowPhase("ex1PhaseRewrite");
        return;
      }
      if (defect && wordCount(defectWhy) < 4) {
        showAi(aiBox, "Perustele valitsemasi virhetyyppi yhdellä lauseella — tai jätä tyhjäksi.");
        ex1ShowPhase("ex1PhaseRewrite");
        return;
      }

      setLoading(aiBox);
      try {
        var payload =
          "ENSIVAikutelma: " +
          (impression || "—") +
          "\nPÄÄTÖS ENNEN POLITIIKKAA: " +
          (gateChoice || "—") +
          "\n\nAUDITOINTI:\n" +
          audit +
          "\n\nKORJATTU SÄHKÖPOSTI:\n" +
          rewrite +
          "\n\nRISKI:\n" +
          risk +
          "\n\nMELKEIN HÄMÄSIVÄ LAUSE:\n" +
          fooled +
          "\n\nDEFECT: " +
          defect +
          " — " +
          defectWhy;
        var fb = await callAI(
          GRADE_SYS +
            " Tehtävä: AI hallusinoi 60 pv VIP-palautusajan (oikea 30 pv), lupaa täyden hyvityksen 34 pv kohdalla ilman esimiehen hyväksyntää (§9). " +
            "Opiskelija auditoi, kirjoittaa korjatun viestin ja analysoi riskin. Anna ✅ ja 8–10 pistettä jos tunnistaa vähintään kaksi oikeaa rikkomusta (esim. §2 30 pv ylittyy, §6 täysi hyvitys vain alle 14 pv, §9 yli 50 € vaatii esimiehen) — yksi rikkomus + hyvä korjaus riittää lähelle oikeaa. Kehu erikseen §9:n huomioimista. " +
            "🔄 vain jos hyväksyisi viestin sellaisenaan tai ei tunnista lainkaan politiikan rikkomuksia.",
          payload,
          "ex1-ghost-policy",
        );
        renderFeedback(aiBox, fb);
        addRetryButton("ex1Ai", ex1ShowPhase, "ex1PhaseUrgency");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      } catch (e) {
        showAi(aiBox, "Virhe: " + e.message);
      }
    }

    var ex1SubmitBtn = document.getElementById("ex1Submit");
    var ex1SubmitAdvanced = document.getElementById("ex1SubmitAdvanced");
    function bindEx1Submit(btn) {
      if (!btn) return;
      btn.addEventListener("click", function () {
        ex1DoSubmit();
      });
    }
    bindEx1Submit(ex1SubmitBtn);
    bindEx1Submit(ex1SubmitAdvanced);
    window.__hitlEx1UpdateStepBar = ex1UpdateStepBar;
  }

  /* ── Exercise 2 ── */
  function ex2ShowPhase(id) {
    document.querySelectorAll(".ex2-phase").forEach(function (p) {
      p.classList.remove("show");
    });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("show");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    syncStepNav("ex2", id);
  }

  function ex2Radio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function ex2AnalysisQuality(text) {
    var t = (text || "").toLowerCase();
    var hasContext = /kuoli|kuol|suru|sure|menet|eilen|byrokrat|tunne|tilanne|konteksti|ihmin|puoliso|mies|leski/i.test(t);
    var hasBotGap = /botti|bot|tekoäly|teko?äly|ai\b|prosessi|asiakasnumero|viite|nopea|kohtelia|pyysi|hyppäsi|automaat/i.test(t);
    return wordCount(text) >= 18 && (hasContext || hasBotGap);
  }

  function ex2ReplyQuality(text) {
    var t = (text || "").toLowerCase();
    if (/20\s*%|alennus|peruutusmaksu|15\s*€/i.test(t)) return false;
    var empathy = /pahoill|suru|sure|osanotto|osaa otan|otan osaa|myötätun|voin kuvitella|ymmärrän|valitettav|ikävä/i.test(t);
    var step = /peruut|peru\b|hoidan|hoitan|teen|järjestän|autan|seuraav|hoituu|hoidamme/i.test(t);
    return wordCount(text) >= 25 && empathy && step;
  }

  function ex2ExamplesQuality(text) {
    var lines = (text || "")
      .split(/\n|;/)
      .map(function (s) {
        return s.replace(/^[\s•\-*\d.)]+/, "").trim();
      })
      .filter(function (s) {
        return s.length > 8;
      });
    return lines.length >= 3;
  }

  function initEx2() {
    var sendChoice = null;
    var overrideDone = false;

    document.querySelectorAll("[data-ex2send]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        sendChoice = btn.getAttribute("data-ex2send");
        document.querySelectorAll("[data-ex2send]").forEach(function (b) {
          b.classList.remove("picked");
        });
        btn.classList.add("picked");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      });
    });

    window.__hitlEx2SetSend = function (v) {
      sendChoice = v;
    };

    document.getElementById("ex2SendContinue").addEventListener("click", function () {
      if (!sendChoice) {
        showAi("ex2SendFb", "Valitse ensin: lähetä, muokkaa vai keskeytä.");
        return;
      }
      if (sendChoice === "yes") {
        showAi("ex2SendFb", "Vastaus kuulostaa kohteliaalta — mutta onko se riittävä surutilanteessa? Jatka pohdintaa.");
      } else {
        showAi("ex2SendFb", "Hyvä arvio — jatka.");
      }
      ex2ShowPhase(HITL_BEGINNER ? "ex2PhaseAnalysis" : "ex2PhaseWhen");
    });

    document.getElementById("ex2WhenContinue").addEventListener("click", function () {
      var when = ex2Radio("ex2when");
      var why = document.getElementById("ex2WhenWhy").value.trim();
      if (!when) {
        showAi("ex2WhenFb", "Valitse milloin keskeyttäisit tekoälyn.");
        return;
      }
      if (wordCount(why) < 15) {
        showAi("ex2WhenFb", "Perustele päätöksesi (vähintään muutama lausetta).");
        return;
      }
      if (when === "later" || when === "never") {
        showAi("ex2WhenFb", "Surukontekstissa viive voi pahentaa tilannetta — harkitse uudelleen.");
      } else {
        showAi("ex2WhenFb", "");
        document.getElementById("ex2WhenFb").classList.remove("show");
      }
      ex2ShowPhase("ex2PhaseLearn");
    });

    document.getElementById("ex2LearnContinue").addEventListener("click", function () {
      ex2ShowPhase("ex2PhaseAnalysis");
    });

    var analysis = document.getElementById("ex2Analysis");
    var overrideBtn = document.getElementById("ex2Override");
    var reply = document.getElementById("ex2Reply");
    var chat = document.getElementById("ex2Chat");

    // Button is always clickable; validation happens on click with clear
    // feedback so a filled-in analysis can never leave the student stuck on a
    // dead grey button (previous behaviour left it silently disabled).
    if (overrideBtn) overrideBtn.disabled = false;

    analysis.addEventListener("input", function () {
      if (ex2AnalysisQuality(analysis.value)) {
        var fb = document.getElementById("ex2AnalysisFb");
        if (fb) {
          fb.classList.remove("show");
          fb.innerHTML = "";
        }
      }
    });

    overrideBtn.addEventListener("click", function () {
      if (!ex2AnalysisQuality(analysis.value)) {
        showAi(
          "ex2AnalysisFb",
          "Kirjoita ensin lyhyt analyysi (n. 20 sanaa): mitä asiakas sanoi, mitä botti teki ja mikä jäi huomiotta.",
        );
        analysis.focus();
        return;
      }
      showAi("ex2AnalysisFb", "");
      document.getElementById("ex2AnalysisFb").classList.remove("show");
      overrideDone = true;
      window.__hitlExercises.ex2OverrideDone = true;
      overrideBtn.disabled = true;
      overrideBtn.textContent = "✓ Tekoäly ohitettu — sinä vastaat";
      if (chat) {
        var d = document.createElement("div");
        d.className = "chat-msg sys";
        d.innerHTML = "<span class='who'>Järjestelmä</span>Ihminen otti chatin ohjat.";
        chat.appendChild(d);
        chat.scrollTop = chat.scrollHeight;
      }
      reply.disabled = false;
      reply.focus();
      ex2ShowPhase("ex2PhaseReply");
      document.dispatchEvent(new CustomEvent("hitl:state-changed"));
    });

    window.__hitlEx2RestoreOverride = function () {
      overrideDone = true;
      window.__hitlExercises.ex2OverrideDone = true;
      overrideBtn.disabled = true;
      overrideBtn.textContent = "✓ Tekoäly ohitettu — sinä vastaat";
      if (reply) reply.disabled = false;
    };

    document.getElementById("ex2ReplyContinue").addEventListener("click", function () {
      if (!overrideDone) {
        showAi("ex2ReplyFb", "Ohita tekoäly ja kirjoita vastaus ensin.");
        ex2ShowPhase("ex2PhaseAnalysis");
        return;
      }
      if (!ex2ReplyQuality(reply.value)) {
        showAi(
          "ex2ReplyFb",
          "Vastauksessa pitää olla osanotto, selkeä seuraava askel — ei alennuksia eikä peruutusmaksua.",
        );
        return;
      }
      if (HITL_BEGINNER) {
        showAi("ex2ReplyFb", "");
        document.getElementById("ex2ReplyFb").classList.remove("show");
        var ex2Sub = document.getElementById("ex2Submit");
        if (ex2Sub) ex2Sub.click();
        return;
      }
      showAi("ex2ReplyFb", "");
      document.getElementById("ex2ReplyFb").classList.remove("show");
      ex2ShowPhase("ex2PhaseReflect");
    });

    async function ex2DoSubmit() {
      var when = ex2Radio("ex2when");
      var whenWhyEl = document.getElementById("ex2WhenWhy");
      var whenWhy = whenWhyEl ? whenWhyEl.value.trim() : "";
      var err = ex2Radio("ex2error");
      var rule = document.getElementById("ex2Rule").value.trim();
      var examplesEl = document.getElementById("ex2Examples");
      var examples = examplesEl ? examplesEl.value.trim() : "";
      var aiBox = "ex2Ai";

      if (!overrideDone || !ex2AnalysisQuality(analysis.value)) {
        showAi(aiBox, "Palaa analyysiin ja ohita tekoäly ennen lähettämistä.");
        ex2ShowPhase("ex2PhaseAnalysis");
        return;
      }
      if (!ex2ReplyQuality(reply.value)) {
        showAi(aiBox, "Kirjoita täydellinen ihmisvastaus ennen lähettämistä.");
        ex2ShowPhase("ex2PhaseReply");
        return;
      }
      if (!err) {
        showAi(aiBox, "Valitse tekoälyn suurin virhe.");
        ex2ShowPhase("ex2PhaseReply");
        return;
      }
      if (wordCount(rule) < 8) {
        showAi(aiBox, "Kirjoita yhdellä lauseella milloin keskeyttäisit tekoälyn.");
        ex2ShowPhase("ex2PhaseReply");
        return;
      }
      if (!HITL_BEGINNER && !ex2ExamplesQuality(examples)) {
        showAi(aiBox, "Kirjoita vähintään kolme muuta tilannetta, joissa keskeyttäisit tekoälyn.");
        ex2ShowPhase("ex2PhaseReflect");
        return;
      }

      setLoading(aiBox);
      try {
        var payload =
          "LÄHETTÄISITKÖ: " +
          (sendChoice || "—") +
          "\nKESKEYTYS: " +
          (when || (HITL_BEGINNER ? "now (aloittelijapolku)" : "—")) +
          " — " +
          (whenWhy || (HITL_BEGINNER ? rule : "")) +
          "\n\nANALYYSI:\n" +
          analysis.value.trim() +
          "\n\nIHMISVASTAUS:\n" +
          reply.value.trim() +
          "\n\nSUURIN VIRHE: " +
          err +
          "\nKESKEYTYSÄÄNTÖ: " +
          rule +
          (examples ? "\n\nMUUT TILANTEET:\n" + examples : "");
        var fb = await callAI(
          GRADE_SYS +
            " Tehtävä: asiakkaan puoliso kuoli, hän haluaa peruuttaa tilauksen ilman byrokratiaa. AI vastasi asiallisesti mutta hyppäsi suoraan prosessiin: pyysi asiakasnumeron ja viitteen. " +
            "Kyse EI ole liian vähäisestä empatiasta (asiallinen sävy on suomalaisessa asiakaspalvelussa täysin ok). Ydinvirhe on TILANNETAJU: botti kohteli poikkeustilannetta kuin rutiinipyyntöä ja lisäsi vaivaa sen sijaan että olisi poistanut sen. " +
            "Anna ✅ ja 8–10 pistettä jos opiskelija tunnistaa tilanteen sivuuttamisen / turhan byrokratian ja ehdottaa vaivan poistamista. 🔄 vain jos vastaus jää sävyn kehumiseen eikä poista asiakkaan vaivaa.",
          payload,
          "ex2-empathy-override",
        );
        renderFeedback(aiBox, fb);
        addRetryButton("ex2Ai", ex2ShowPhase, "ex2PhaseChat");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      } catch (e) {
        showAi(aiBox, "Virhe: " + e.message);
      }
    }

    ["ex2Submit", "ex2SubmitAdvanced"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", ex2DoSubmit);
    });
  }

  function ex3ActiveScenarios() {
    if (!HITL_BEGINNER) return EX3_SCENARIOS;
    return EX3_SCENARIOS.filter(function (sc) {
      return sc.id === "sc3" || sc.id === "sc4";
    });
  }

  /* ── Exercise 3 ── */
  var EX3_SCENARIOS = [
    {
      id: "sc1",
      meta: "Chat · 95 € hyvitys · 🟡 epävarma · neutraali",
      quote: '"Tuote viallinen — haluan 95 € hyvityksen tai vaihdon."',
      ambiguous: true,
    },
    {
      id: "sc2",
      meta: "Sähköposti · 340 € · 🟡 melko varma · turhautunut",
      quote: '"Kolmas rikkinäinen lähetys. Haluan täyden 340 € hyvityksen."',
      expect: "human",
    },
    {
      id: "sc3",
      meta: "Lomake · GDPR · 🟢 varma · neutraali",
      quote: '"Poistakaa kaikki tietoni heti GDPR:n perusteella."',
      expect: "human",
    },
    {
      id: "sc4",
      meta: "Twitter/X julkinen · 0 € · 🔴 ei luota · erittäin negatiivinen",
      quote: '"@ScaleNord kolmas kerta kun pakettinne katoaa. Peruutan tilaukseni JULKISESTI."',
      expect: "human",
    },
  ];

  function ex3ShowPhase(id) {
    document.querySelectorAll(".ex3-phase").forEach(function (p) {
      p.classList.remove("show");
    });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("show");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    syncStepNav("ex3", id);
  }

  function ex3Radio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function ex3EvidenceQuality(text) {
    var t = (text || "").toLowerCase();
    var facts = (
      t.match(
        /\d+\s*%|\d+\s*€|5\s*000|4\s*000|62|18|5\s*€|200|erittäin yleinen|yleinen|harvinainen|hyvin harvinainen|nykyinen|sääntö|ihmiselle|tekoäly|varma|epävarma/g,
      ) || []
    ).length;
    return wordCount(text) >= 15 && facts >= 2;
  }

  function ex3RulesQuality(text) {
    var t = (text || "").toLowerCase();
    var josCount = (t.match(/\bjos\b/g) || []).length;
    if (HITL_BEGINNER) {
      return (
        josCount >= 2 &&
        /aina|gdpr|some|confidence|hyvitys|200|€/.test(t) &&
        wordCount(text) >= 35
      );
    }
    return (
      josCount >= 3 &&
      /aina|gdpr|200|some|confidence|hyvitys|raha|€/.test(t) &&
      (/syy|vaikutus|riski/.test(t) || wordCount(text) >= 60)
    );
  }

  function ex3InjectRefPanels() {
    var refAside =
      '<aside class="ex2-ref-col ex3-ref-col" aria-label="Black Friday -tilanne ja taulukko">' +
      '<div class="ex3-ref-mission"><strong>Black Friday klo 14:00</strong> · 4 000 ihmistä jonossa · tavoite alle 1 000</div>' +
      '<div class="ex3-ref-goal"><strong>Aina ihmiselle:</strong> GDPR · yli 200 € hyvitykset · julkinen some</div>' +
      '<table class="data-table ex3-ref-table"><thead><tr><th>Asiatyyppi</th><th>Yleisyys</th><th>Varmuus</th><th>Nyt</th></tr></thead><tbody>' +
      '<tr class="danger"><td>Pienet hyvitykset</td><td>Erittäin yleinen</td><td>🟢</td><td>→ Ihminen</td></tr>' +
      '<tr><td>Osoite/salasana</td><td>Yleinen</td><td>🟢</td><td>Tekoäly</td></tr>' +
      '<tr><td>Isot hyvitykset</td><td>Harvinainen</td><td>🟡</td><td>→ Ihminen</td></tr>' +
      '<tr><td>GDPR</td><td>Harvinainen</td><td>🟡</td><td>Riski!</td></tr>' +
      '<tr><td>Julkinen some</td><td>Hyvin harv.</td><td>🔴</td><td>Maine-riski</td></tr>' +
      '<tr><td>Neg. asiakas</td><td>Hyvin harv.</td><td>🔴</td><td>→ Ihminen</td></tr>' +
      "</tbody></table>" +
      '<p class="ex1-ref-hint">🔴 tai 🟡 → ihminen katsokoon. 🟢 + matala riski → tekoäly voi hoitaa.</p></aside>';

    ["ex3PhaseBottleneck", "ex3PhaseLearn", "ex3PhaseRules", "ex3PhaseCapacity", "ex3PhaseSpot"].forEach(
      function (id) {
        var phase = document.getElementById(id);
        if (!phase || phase.querySelector(".ex3-ref-col")) return;
        var layout = document.createElement("div");
        layout.className = "ex2-work-layout";
        layout.innerHTML = refAside;
        var taskCol = document.createElement("div");
        taskCol.className = "ex2-task-col";
        while (phase.firstChild) taskCol.appendChild(phase.firstChild);
        layout.appendChild(taskCol);
        phase.appendChild(layout);
      },
    );
  }

  function initEx3() {
    ex3InjectRefPanels();
    var list = document.getElementById("ex3Scenarios");
    if (!list) return;

    document.getElementById("ex3MissionContinue").addEventListener("click", function () {
      ex3ShowPhase("ex3PhaseBottleneck");
    });

    document.getElementById("ex3BottleneckContinue").addEventListener("click", function () {
      var row = ex3Radio("ex3row");
      var evidence = document.getElementById("ex3Evidence").value.trim();
      if (!row) {
        showAi("ex3BottleneckFb", "Valitse yksi taulukon rivi.");
        return;
      }
      if (!ex3EvidenceQuality(evidence)) {
        showAi("ex3BottleneckFb", "Kerro miksi valitsit tämän rivin — mainitse vähintään kaksi asiaa taulukosta (esim. kuinka yleinen se on tai mitä nykyinen sääntö tekee).");
        return;
      }
      if (row !== "small") {
        showAi("ex3BottleneckFb", "Usein suurin pullonkaula on pienet hyvitykset — ne tulevat useimmin ja nykyinen 5 € raja lähettää kaiken ihmiselle. Jatka silti.");
      } else {
        showAi("ex3BottleneckFb", "");
        document.getElementById("ex3BottleneckFb").classList.remove("show");
      }
      ex3ShowPhase(HITL_BEGINNER ? "ex3PhaseRules" : "ex3PhaseLearn");
    });

    document.getElementById("ex3LearnContinue").addEventListener("click", function () {
      ex3ShowPhase("ex3PhaseRules");
    });

    document.getElementById("ex3RulesContinue").addEventListener("click", function () {
      var rules = document.getElementById("ex3Rules").value.trim();
      if (!ex3RulesQuality(rules)) {
        showAi(
          "ex3RulesFb",
          HITL_BEGINNER
            ? "Kirjoita vähintään kaksi JOS–NIIN-sääntöä ja mainitse GDPR, iso raha tai some → aina ihminen."
            : "Kirjoita vähintään kolme JOS–NIIN-sääntöä, AINA eskaloi -lista (GDPR/some/200 €) sekä syy tai vaikutus.",
        );
        return;
      }
      showAi("ex3RulesFb", "");
      document.getElementById("ex3RulesFb").classList.remove("show");
      ex3ShowPhase(HITL_BEGINNER ? "ex3PhaseSpot" : "ex3PhaseCapacity");
    });

    document.getElementById("ex3CapacityContinue").addEventListener("click", function () {
      var est = parseInt(document.getElementById("ex3QueueEst").value, 10);
      var trade = document.getElementById("ex3Tradeoff").value.trim();
      if (isNaN(est) || est < 0 || est > 5000) {
        showAi("ex3CapacityFb", "Arvioi ihmisjonon koko numeroina (0–5000).");
        return;
      }
      if (est > 1000) {
        showAi("ex3CapacityFb", "Tavoite on alle 1 000 — tarkista sääntösi tai perustele miksi jono on suurempi.");
        return;
      }
      if (wordCount(trade) < 20 || !/(gdpr|200|yleinen|harvinainen|ihminen|tekoäly|riski|jono|\d)/i.test(trade)) {
        showAi("ex3CapacityFb", "Kerro lyhyesti mitä riskiä hyväksyt ja mitä vältät — viittaa taulukkoon (esim. erittäin yleinen, GDPR, 200 €).");
        return;
      }
      showAi("ex3CapacityFb", "");
      document.getElementById("ex3CapacityFb").classList.remove("show");
      ex3ShowPhase("ex3PhaseSpot");
    });

    if (!list.children.length) {
      ex3ActiveScenarios().forEach(function (sc, i) {
        var card = document.createElement("div");
        card.className = "scenario-card";
        card.innerHTML =
          "<div class='sc-meta'>Tapaustesti " +
          (i + 1) +
          " · " +
          sc.meta +
          (sc.ambiguous ? " · <em>rajatapaus</em>" : "") +
          "</div>" +
          "<div class='sc-quote'>" +
          sc.quote +
          "</div>" +
          "<div class='choice-row'>" +
          "<label><input type='radio' name='" +
          sc.id +
          "' value='ai'> Tekoäly hoitaa</label>" +
          "<label><input type='radio' name='" +
          sc.id +
          "' value='human'> Ihminen hoitaa</label>" +
          "</div>" +
          "<textarea class='ex-ta' id='" +
          sc.id +
          "-why' rows='2' placeholder='Perustelu viitaten omaan sääntöösi…'></textarea>";
        list.appendChild(card);
      });
    }

    document.getElementById("ex3Submit").addEventListener("click", async function () {
      var row = ex3Radio("ex3row");
      var evidence = document.getElementById("ex3Evidence").value.trim();
      var rules = document.getElementById("ex3Rules").value.trim();
      var estEl = document.getElementById("ex3QueueEst");
      var est = estEl ? estEl.value : "";
      var tradeEl = document.getElementById("ex3Tradeoff");
      var trade = tradeEl ? tradeEl.value.trim() : "";
      var compare = document.getElementById("ex3Compare").value.trim();

      if (!row || !ex3EvidenceQuality(evidence) || !ex3RulesQuality(rules)) {
        showAi("ex3Ai", "Täytä pullonkaula ja säännöt ennen lähettämistä.");
        return;
      }

      var spots = "";
      var spotOk = true;
      ex3ActiveScenarios().forEach(function (sc) {
        var picked = document.querySelector('input[name="' + sc.id + '"]:checked');
        var whyEl = document.getElementById(sc.id + "-why");
        var why = whyEl ? whyEl.value.trim() : "";
        if (!picked || wordCount(why) < 12) spotOk = false;
        if (sc.expect && picked && picked.value !== sc.expect) spotOk = false;
        spots +=
          sc.id +
          ": " +
          (picked ? picked.value : "ei valintaa") +
          " — " +
          why +
          "\n";
      });
      if (!spotOk) {
        showAi(
          "ex3Ai",
          HITL_BEGINNER
            ? "Tee päätös ja perustelu molemmista spot-checkeistä. GDPR ja julkinen some → ihminen."
            : "Tee päätös ja perustelu jokaisesta spot-checkistä. GDPR, 340 € ja some → ihminen.",
        );
        return;
      }

      setLoading("ex3Ai");
      try {
        var payload =
          "PULLONKAULA: " +
          row +
          "\nTODISTEET:\n" +
          evidence +
          "\n\nSÄÄNNÖT:\n" +
          rules +
          (est || trade
            ? "\n\nJONO-ARVIO: " + est + "\nLASKENTA:\n" + trade
            : "") +
          "\n\nSPOT-CHECKIT:\n" +
          spots +
          (compare ? "\nVERTAILU AMMATTILAISIIN:\n" + compare : "");
        var fb = await callAI(
          GRADE_SYS +
            " Juurisyy: 5€ raja eskaloi 62% pienistä hyvityksistä (~3100/5000). Anna ✅ ja 8–10 pistettä jos tunnistaa matalan rajan pullonkaulaksi JA ehdottaa rajan nostoa sekä pitää korkean riskin tapaukset (GDPR/uhat/iso raha) ihmisellä — ei vaadi täydellistä laskentaa. " +
            "🔄 vain jos suunnitelma jättää pienet hyvitykset ihmiselle (ei pura pullonkaulaa) tai päästää korkean riskin tapaukset automaatille.",
          payload,
          "ex3-escalation-plan",
        );
        renderFeedback("ex3Ai", fb);
        addRetryButton("ex3Ai", ex3ShowPhase, "ex3PhaseMission");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
        var reveal = document.getElementById("ex3ProReveal");
        if (reveal) reveal.classList.add("show");
      } catch (e) {
        showAi("ex3Ai", "Virhe: " + e.message);
      }
    });
  }

  /* ── Exercise 4 — approval queue ── */
  var EX4_CASES = [
    {
      id: "addr",
      key: "addr",
      title: "Osoitteen vaihto — paketti jo lähetetty",
      body: "AI ehdottaa: päivitä toimitusosoite tilaukseen #7721. Asiakas vahvisti sähköpostilla, mutta paketti lähti eilen vanhasta osoitteesta.",
      ambiguous: true,
      badDecision: "approve",
      badMsg: "Lähetyksen jälkeen osoitteen vaihto voi vaatia logistiikan tarkistuksen — harkitse ihmisen tarkistusta.",
    },
    {
      id: "refund",
      key: "refund",
      title: "15 € myöhästymismaksun poisto",
      body: "AI ehdottaa: hyvitä 15 € myöhästymismaksu. Asiakas 2 pv myöhässä, ensimmäinen valitus, politiikkaraja 25 €.",
      expect: "approve",
      badDecision: "needs_human",
      badMsg: "Pieni hyvitys politiikan sisällä — automaatio voi toimia, jos sääntö on selvä.",
    },
    {
      id: "gdpr",
      key: "gdpr",
      title: "GDPR — poista kaikki tiedot",
      body: 'Asiakas: "Poistakaa KAIKKI tietoni välittömästi." AI ehdottaa: hard delete koko asiakasrekisteristä mukaan lukien tilaushistoria.',
      expect: "needs_human",
      rejectOk: true,
      badDecision: "approve",
      badMsg: "Täysi poisto rikkoo kirjanpito- ja sopimusvelvoitteita — ihminen + legal.",
    },
    {
      id: "password",
      key: "password",
      title: "Salasanan reset",
      body: "AI ehdottaa: lähetä kertakäyttöinen reset-linkki vahvistettuun sähköpostiin. Standardi MFA-polku.",
      expect: "approve",
      badDecision: "needs_human",
      badMsg: "Vahvistettu sähköposti + MFA on rutiinitapa — automaatio yleensä ok.",
    },
    {
      id: "export",
      key: "export",
      title: "Ostohistoria vahvistettuun sähköpostiin",
      body: "AI ehdottaa: lähetä koko ostohistoria PDF:nä asiakkaan profiilissa olevaan sähköpostiin. Asiakas pyysi chatissa, ei uutta osoitetta.",
      ambiguous: true,
      badDecision: "approve",
      badMsg: "Datan vienti vaatii tarkistuksen — onko pyyntö aito ja onko data minimissä?",
    },
    {
      id: "goodwill",
      key: "goodwill",
      title: "250 € hyvitys + some-uhat",
      body: "Influencer vaatii 250 € hyvitystä ja uhkaa TikTok-videolla. AI ehdottaa automaattista hyvitystä mainehaitan välttämiseksi.",
      expect: "needs_human",
      rejectOk: true,
      badDecision: "approve",
      badMsg: "Iso hyvitys + maineuhka vaativat ihmisen ja esimiehen — ei automaattista.",
    },
  ];

  function ex4ShowPhase(id) {
    document.querySelectorAll(".ex4-phase").forEach(function (p) {
      p.classList.remove("show");
    });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("show");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    syncStepNav("ex4", id);
  }

  function ex4CaseFeedback(msg, level) {
    var fb = document.getElementById("ex4CaseFb");
    if (!fb) return;
    fb.className = "ex4-case-fb show " + (level || "ok");
    fb.textContent = msg;
  }

  function initEx4() {
    var queueIdx = 0;
    var decisions = {};

    document.getElementById("ex4MissionContinue").addEventListener("click", function () {
      ex4ShowPhase("ex4PhasePriority");
    });

    document.querySelectorAll("#ex4PriorityGrid .ex2-check-row").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.tagName === "INPUT") return;
        var cb = row.querySelector("input");
        if (!cb) return;
        var checked = document.querySelectorAll("#ex4PriorityGrid input:checked").length;
        if (!cb.checked && checked >= 3) return;
        cb.checked = !cb.checked;
        row.classList.toggle("picked", cb.checked);
      });
      var cb = row.querySelector("input");
      if (cb) {
        cb.addEventListener("change", function () {
          var checked = document.querySelectorAll("#ex4PriorityGrid input:checked").length;
          if (checked > 3) {
            cb.checked = false;
            return;
          }
          row.classList.toggle("picked", cb.checked);
        });
      }
    });

    document.getElementById("ex4PriorityContinue").addEventListener("click", function () {
      var picked = document.querySelectorAll("#ex4PriorityGrid input:checked").length;
      var why = document.getElementById("ex4PriorityWhy").value.trim();
      if (picked !== 3) {
        showAi("ex4PriorityFb", "Valitse tasan kolme tapausta, jotka tarkistat ensin.");
        return;
      }
      if (wordCount(why) < 15) {
        showAi("ex4PriorityFb", "Kerro miksi juuri nämä kolme (muutama lause).");
        return;
      }
      showAi("ex4PriorityFb", "");
      document.getElementById("ex4PriorityFb").classList.remove("show");
      ex4ShowPhase("ex4PhaseQueue");
      renderEx4Case(0);
    });

    function renderEx4Dots() {
      var dots = document.getElementById("ex4QueueDots");
      if (!dots) return;
      dots.innerHTML = "";
      EX4_CASES.forEach(function (c, i) {
        var d = document.createElement("span");
        d.className =
          "ex4-queue-dot" +
          (decisions[c.id] ? " done" : "") +
          (i === queueIdx && !decisions[c.id] ? " active" : "");
        dots.appendChild(d);
      });
    }

    function renderEx4Case(idx) {
      queueIdx = idx;
      var c = EX4_CASES[idx];
      var card = document.getElementById("ex4QueueCard");
      var caseFb = document.getElementById("ex4CaseFb");
      var nextBtn = document.getElementById("ex4CaseNext");
      var doneBtn = document.getElementById("ex4QueueDone");
      if (!card || !c) return;
      if (caseFb) {
        caseFb.className = "ex4-case-fb";
        caseFb.textContent = "";
      }
      if (nextBtn) nextBtn.style.display = "none";
      if (doneBtn) doneBtn.style.display = "none";

      card.innerHTML =
        "<p class='sc-meta'>Tapaus " +
        (idx + 1) +
        " / " +
        EX4_CASES.length +
        (c.ambiguous ? " · rajatapaus" : "") +
        "</p>" +
        "<h4 style='margin:8px 0 10px;font-size:16px'>" +
        c.title +
        "</h4>" +
        "<div class='case-body' style='font-size:13.5px;color:var(--ink2);line-height:1.65;margin-bottom:14px'>" +
        c.body +
        "</div>" +
        "<p class='body-txt' style='font-size:14px;margin-bottom:10px'><strong style=\"color:var(--ink)\">Päätöksesi:</strong></p>" +
        "<div class='ex1-choice-row'>" +
        "<button type='button' class='ex1-choice-btn' data-ex4dec='approve'>Hyväksy — AI toteuttaa</button>" +
        "<button type='button' class='ex1-choice-btn' data-ex4dec='needs_human'>Tarvitsee ihmisen</button>" +
        "<button type='button' class='ex1-choice-btn' data-ex4dec='reject'>Hylkää ehdotus</button>" +
        "</div>" +
        "<label class='field-label' style='margin-top:14px'>Päätökseni perustelu…</label>" +
        "<textarea class='ex-ta' id='ex4stop-" +
        c.id +
        "' rows='2' placeholder='Hyväksyn koska… / Pysäytän koska…'></textarea>" +
        "<label class='field-label' style='margin-top:10px'>Suurin riski tässä on…</label>" +
        "<textarea class='ex-ta' id='ex4risk-" +
        c.id +
        "' rows='2' placeholder='Täydennä lause…'></textarea>" +
        "<button type='button' class='ex-btn primary' id='ex4CaseSubmit' style='margin-top:12px'>Tallenna päätös</button>";

      var pickedDec = null;
      card.querySelectorAll("[data-ex4dec]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          pickedDec = btn.getAttribute("data-ex4dec");
          card.querySelectorAll("[data-ex4dec]").forEach(function (b) {
            b.classList.remove("picked");
          });
          btn.classList.add("picked");
        });
      });

      document.getElementById("ex4CaseSubmit").addEventListener("click", function () {
        var stop = document.getElementById("ex4stop-" + c.id).value.trim();
        var risk = document.getElementById("ex4risk-" + c.id).value.trim();
        if (!pickedDec) {
          ex4CaseFeedback("Valitse päätös ennen jatkamista.", "warn");
          return;
        }
        if (wordCount(stop) < 8 || wordCount(risk) < 8) {
          ex4CaseFeedback("Täydennä molemmat lauseet — perustelu ja riski.", "warn");
          return;
        }

        var level = "ok";
        var msg = "Päätös tallennettu.";
        if (c.badDecision === pickedDec) {
          level = "warn";
          msg = c.badMsg || "Harkitse uudelleen — mutta voit jatkaa.";
        }
        if (c.expect && pickedDec !== c.expect && !(c.rejectOk && pickedDec === "reject")) {
          level = "warn";
          msg = c.badMsg || "Yleinen linja eri — perustele hyvin lopullisessa arviossa.";
        }
        if (c.id === "gdpr" && pickedDec === "approve") {
          level = "bad";
          msg = "Tämä olisi vakava virhe — täysi poisto ei saa mennä automaatiolla.";
          var breach = document.getElementById("ex4Breach");
          if (breach) breach.classList.add("show");
        }

        decisions[c.id] = {
          decision: pickedDec,
          stop: stop,
          risk: risk,
        };
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
        ex4CaseFeedback(msg, level);
        renderEx4Dots();
        if (idx < EX4_CASES.length - 1) {
          if (nextBtn) nextBtn.style.display = "inline-flex";
        } else {
          if (doneBtn) doneBtn.style.display = "inline-flex";
        }
      });

      renderEx4Dots();
    }

    document.getElementById("ex4CaseNext").addEventListener("click", function () {
      renderEx4Case(queueIdx + 1);
    });

    document.getElementById("ex4QueueDone").addEventListener("click", function () {
      if (Object.keys(decisions).length < EX4_CASES.length) {
        ex4CaseFeedback("Käy kaikki kuusi tapausta läpi ensin.", "warn");
        return;
      }
      ex4ShowPhase("ex4PhaseLearn");
    });

    document.getElementById("ex4LearnContinue").addEventListener("click", function () {
      ex4ShowPhase("ex4PhaseReflect");
    });

    document.getElementById("ex4Submit").addEventListener("click", async function () {
      var rule = document.getElementById("ex4Rule").value.trim();
      var priorityWhy = document.getElementById("ex4PriorityWhy").value.trim();
      if (Object.keys(decisions).length < EX4_CASES.length) {
        showAi("ex4Ai", "Käy hyväksymisjono loppuun ennen lähettämistä.");
        ex4ShowPhase("ex4PhaseQueue");
        return;
      }
      if (wordCount(rule) < 10) {
        showAi("ex4Ai", "Kirjoita yksi lause: milloin vaadit aina ihmisen tarkistuksen.");
        return;
      }

      var gdpr = decisions.gdpr;
      if (gdpr && gdpr.decision === "approve") {
        document.getElementById("ex4Breach").classList.add("show");
        showAi("ex4Ai", "GDPR-tapaus ei saa olla automaattinen hyväksyntä — palaa jonoon.");
        return;
      }

      var payload = "PRIORITEETIT (3 ensin):\n" + priorityWhy + "\n\n";
      EX4_CASES.forEach(function (c) {
        var d = decisions[c.id];
        payload +=
          c.title +
          "\nPäätös: " +
          (d ? d.decision : "—") +
          "\nPysäytän koska: " +
          (d ? d.stop : "") +
          "\nRiski: " +
          (d ? d.risk : "") +
          "\n\n";
      });
      payload += "SÄÄNTÖ: " + rule;

      setLoading("ex4Ai");
      try {
        var fb = await callAI(
          GRADE_SYS +
            " Tehtävä: hyväksymisjono GDPR/governance. Anna ✅ ja 8–10 pistettä jos ohjaa peruuttamattomat / korkean riskin toimet (GDPR-poisto, iso raha, uhat) ihmiselle ja perustelee miksi, ja päästää rutiinit automaatille — rajatapaukset (osoite, datan vienti) voivat olla ihmisellä ilman 🔄. " +
            "🔄 vain jos hyväksyisi GDPR-poiston tai ison hyvityksen automaattisesti, tai eskaloi kaiken erottelematta riskiä.",
          payload,
          "ex4-legal-triage",
        );
        renderFeedback("ex4Ai", fb);
        addRetryButton("ex4Ai", ex4ShowPhase, "ex4PhaseMission");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      } catch (e) {
        showAi("ex4Ai", "Virhe: " + e.message);
      }
    });

    window.__hitlEx4GetState = function () {
      return {
        decisions: JSON.parse(JSON.stringify(decisions)),
        queueIdx: queueIdx,
      };
    };

    window.__hitlEx4RestorePriority = function (vals) {
      if (!Array.isArray(vals)) return;
      document.querySelectorAll("#ex4PriorityGrid input").forEach(function (cb) {
        cb.checked = vals.indexOf(cb.value) >= 0;
        var row = cb.closest(".ex2-check-row");
        if (row) row.classList.toggle("picked", cb.checked);
      });
    };

    window.__hitlEx4RestoreState = function (s) {
      if (!s) return;
      if (s.decisions) {
        decisions = JSON.parse(JSON.stringify(s.decisions));
      }
      if (typeof s.queueIdx === "number") queueIdx = s.queueIdx;
      var done = Object.keys(decisions).length;
      if (done >= EX4_CASES.length) {
        ex4ShowPhase("ex4PhaseReflect");
      } else if (done > 0) {
        ex4ShowPhase("ex4PhaseQueue");
        renderEx4Case(Math.min(queueIdx, EX4_CASES.length - 1));
      }
      renderEx4Dots();
    };
  }

  /* ── Exercise 5 — root cause detective ── */
  var EX5_EVIDENCE_KEYS = ["kb", "complaint", "email", "instagram", "crm"];

  function ex5ShowPhase(id) {
    document.querySelectorAll(".ex5-phase").forEach(function (p) {
      p.classList.remove("show");
    });
    var el = document.getElementById(id);
    if (el) {
      el.classList.add("show");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    syncStepNav("ex5", id);
  }

  function initEx5() {
    var evidenceSeen = {};

    document.getElementById("ex5MissionContinue").addEventListener("click", function () {
      ex5ShowPhase("ex5PhaseEvidence");
    });

    document.querySelectorAll("#ex5EvidenceTabs .ex5-ev-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var key = tab.getAttribute("data-ev");
        evidenceSeen[key] = true;
        tab.classList.add("open", "seen");
        document.querySelectorAll("#ex5EvidenceTabs .ex5-ev-tab").forEach(function (t) {
          if (t !== tab) t.classList.remove("open");
        });
        document.querySelectorAll("[data-ev-panel]").forEach(function (panel) {
          panel.classList.toggle("show", panel.getAttribute("data-ev-panel") === key);
        });
      });
    });

    document.getElementById("ex5EvidenceContinue").addEventListener("click", function () {
      var seenCount = EX5_EVIDENCE_KEYS.filter(function (k) {
        return evidenceSeen[k];
      }).length;
      var root = document.getElementById("ex5Root").value.trim();
      var defect = document.getElementById("ex5Defect").value;
      if (seenCount < 4) {
        showAi("ex5EvidenceFb", "Avaa vähintään neljä todistelähdettä ennen johtopäätöstä.");
        return;
      }
      if (wordCount(root) < 20) {
        showAi("ex5EvidenceFb", "Yhdistä todisteet: miksi tekoäly epäonnistui? (muutama lause)");
        return;
      }
      if (!defect) {
        showAi("ex5EvidenceFb", "Valitse defect-luokka.");
        return;
      }
      showAi("ex5EvidenceFb", "");
      document.getElementById("ex5EvidenceFb").classList.remove("show");
      ex5ShowPhase("ex5PhaseAgent");
    });

    document.getElementById("ex5AgentContinue").addEventListener("click", function () {
      var heat = document.getElementById("ex5Heat").value.trim();
      if (wordCount(heat) < 25) {
        showAi("ex5AgentFb", "Kirjoita HEAT-vastaus tälle asiakkaalle (kuule, empatia, anteeksi, toimenpide).");
        return;
      }
      if (!/\[?hear|kuulen|ymmärrän/i.test(heat)) {
        showAi("ex5AgentFb", "Aloita kuuntelemalla asiakkaan tilannetta (H-ear).");
        return;
      }
      showAi("ex5AgentFb", "");
      document.getElementById("ex5AgentFb").classList.remove("show");
      ex5ShowPhase("ex5PhaseOrchestrator");
    });

    document.querySelectorAll("#ex5NotifyGrid .ex2-check-row").forEach(function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.tagName === "INPUT") return;
        var cb = row.querySelector("input");
        if (cb) cb.checked = !cb.checked;
        row.classList.toggle("picked", cb && cb.checked);
      });
      var cb = row.querySelector("input");
      if (cb) {
        cb.addEventListener("change", function () {
          row.classList.toggle("picked", cb.checked);
        });
      }
    });

    document.getElementById("ex5OrchestratorContinue").addEventListener("click", function () {
      var kbNew = document.getElementById("ex5KbNew").value.trim();
      var process = document.getElementById("ex5Process").value.trim();
      var notify = document.querySelectorAll("#ex5NotifyGrid input:checked").length;
      if (wordCount(kbNew) < 30) {
        showAi("ex5OrchestratorFb", "Kirjoita strukturoitu artikkeli — erottele normaali sääntö ja kampanja.");
        return;
      }
      if (!/sääntö|soveltuu|palautusmaksu|0\s*€|15\s*€/i.test(kbNew)) {
        showAi("ex5OrchestratorFb", "Artikkelissa pitää olla selkeät kentät: sääntö, soveltuvuus, maksu.");
        return;
      }
      if (notify < 2) {
        showAi("ex5OrchestratorFb", "Valitse vähintään kaksi tiimiä automaattiseen ilmoitukseen.");
        return;
      }
      if (wordCount(process) < 15) {
        showAi("ex5OrchestratorFb", "Kuvaile prosessimuutos, joka estää saman toiston.");
        return;
      }
      showAi("ex5OrchestratorFb", "");
      document.getElementById("ex5OrchestratorFb").classList.remove("show");
      ex5ShowPhase("ex5PhaseLearn");
    });

    document.getElementById("ex5Submit").addEventListener("click", async function () {
      var heat = document.getElementById("ex5Heat").value.trim();
      var root = document.getElementById("ex5Root").value.trim();
      var defect = document.getElementById("ex5Defect").value;
      var kbNew = document.getElementById("ex5KbNew").value.trim();
      var process = document.getElementById("ex5Process").value.trim();
      var notify = [];
      document.querySelectorAll("#ex5NotifyGrid input:checked").forEach(function (cb) {
        notify.push(cb.value);
      });

      if (!heat || !root || !defect || !kbNew || !process) {
        showAi("ex5Ai", "Käy kaikki vaiheet läpi ennen lähettämistä.");
        return;
      }

      setLoading("ex5Ai");
      try {
        var payload =
          "JUURISYY:\n" +
          root +
          "\n\nDEFECT: " +
          defect +
          "\n\nHEAT:\n" +
          heat +
          "\n\nSTRUKTUROITU KB:\n" +
          kbNew +
          "\n\nILMOITUKSET: " +
          notify.join(", ") +
          "\n\nPROSESSI:\n" +
          process;
        var fb = await callAI(
          GRADE_SYS +
            " Tehtävä: root cause detective. Juurisyy: vanhentunut KB vs Free Returns -kampanja (Instagram/marketing). Anna ✅ ja 8–10 pistettä jos paikantaa KB–kampanja-ristiriidan JA ehdottaa estotoimen joka estää toiston — ei vaadi täydellistä HEAT-viestiä jos suunta on oikea. " +
            "🔄 vain jos syy jää pintaan ('botti mokasi') ilman KB-vs-kampanja-tunnistusta tai estotoimenpide puuttuu kokonaan.",
          payload,
          "ex5-root-cause",
        );
        renderFeedback("ex5Ai", fb);
        addRetryButton("ex5Ai", ex5ShowPhase, "ex5PhaseMission");
        document.dispatchEvent(new CustomEvent("hitl:state-changed"));
      } catch (e) {
        showAi("ex5Ai", "Virhe: " + e.message);
      }
    });
  }

  /* ── Vapaa vaihenavigointi harjoituksille 2–5 ──
     Rakentaa klikattavan askelpalkin jokaisen harjoituksen alkuun, jotta
     opiskelija voi hypätä mihin tahansa vaiheeseen ja takaisin. */
  var STEP_NAV = {
    ex2: [
      { id: "ex2PhaseChat", label: "Päätös" },
      { id: "ex2PhaseWhen", label: "Milloin" },
      { id: "ex2PhaseLearn", label: "Opi" },
      { id: "ex2PhaseAnalysis", label: "Analyysi" },
      { id: "ex2PhaseReply", label: "Ihmisvastaus" },
      { id: "ex2PhaseReflect", label: "Reflektio" },
    ],
    ex3: [
      { id: "ex3PhaseMission", label: "Tehtävä" },
      { id: "ex3PhaseBottleneck", label: "Pullonkaula" },
      { id: "ex3PhaseLearn", label: "Opi" },
      { id: "ex3PhaseRules", label: "Säännöt" },
      { id: "ex3PhaseCapacity", label: "Kapasiteetti" },
      { id: "ex3PhaseSpot", label: "Spot-check" },
    ],
    ex4: [
      { id: "ex4PhaseMission", label: "Tehtävä" },
      { id: "ex4PhasePriority", label: "Priorisointi" },
      { id: "ex4PhaseQueue", label: "Jono" },
      { id: "ex4PhaseLearn", label: "Opi" },
      { id: "ex4PhaseReflect", label: "Sääntö" },
    ],
    ex5: [
      { id: "ex5PhaseMission", label: "Tehtävä" },
      { id: "ex5PhaseEvidence", label: "Todisteet" },
      { id: "ex5PhaseAgent", label: "Asiakas" },
      { id: "ex5PhaseOrchestrator", label: "Orkestrointi" },
      { id: "ex5PhaseLearn", label: "Opi" },
    ],
  };

  var navOrder = {};

  function stepShowFns(prefix) {
    return {
      ex2: ex2ShowPhase,
      ex3: ex3ShowPhase,
      ex4: ex4ShowPhase,
      ex5: ex5ShowPhase,
    }[prefix];
  }

  function syncStepNav(prefix, id) {
    var nav = document.getElementById(prefix + "StepNav");
    if (!nav) return;
    var order = navOrder[prefix] || [];
    var idx = order.indexOf(id);
    nav.querySelectorAll("button").forEach(function (b) {
      var bi = order.indexOf(b.getAttribute("data-phase"));
      b.classList.toggle("on", bi >= 0 && bi === idx);
      b.classList.toggle("done", idx >= 0 && bi >= 0 && bi < idx);
    });
  }

  function buildStepNavs() {
    Object.keys(STEP_NAV).forEach(function (prefix) {
      if (document.getElementById(prefix + "StepNav")) return;
      var items = STEP_NAV[prefix].filter(function (it) {
        var el = document.getElementById(it.id);
        if (!el) return false;
        if (HITL_BEGINNER && el.classList.contains("hitl-advanced-only")) return false;
        return true;
      });
      if (items.length < 2) return;
      var first = document.getElementById(items[0].id);
      if (!first || !first.parentNode) return;

      var nav = document.createElement("div");
      nav.className = "ex-step-nav";
      nav.id = prefix + "StepNav";
      nav.setAttribute("aria-label", "Harjoituksen vaiheet — klikkaa siirtyäksesi");
      items.forEach(function (it, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.setAttribute("data-phase", it.id);
        b.textContent = i + 1 + " · " + it.label;
        b.addEventListener("click", function () {
          var fn = stepShowFns(prefix);
          if (fn) fn(it.id);
        });
        nav.appendChild(b);
      });
      first.parentNode.insertBefore(nav, first);
      navOrder[prefix] = items.map(function (it) {
        return it.id;
      });

      var current = items.filter(function (it) {
        var el = document.getElementById(it.id);
        return el && el.classList.contains("show");
      })[0];
      syncStepNav(prefix, current ? current.id : items[0].id);
    });
  }

  function init() {
    initEx1();
    initEx2();
    initEx3();
    initEx4();
    initEx5();
    buildStepNavs();
    wirePersistence();
  }

  function wirePersistence() {
    window.__hitlRenderFeedback = renderFeedback;
    window.__hitlAddRetry = function (boxId) {
      var map = {
        ex1Ai: ["ex1PhaseUrgency", ex1ShowPhase],
        ex2Ai: ["ex2PhaseChat", ex2ShowPhase],
        ex3Ai: ["ex3PhaseMission", ex3ShowPhase],
        ex4Ai: ["ex4PhaseMission", ex4ShowPhase],
        ex5Ai: ["ex5PhaseMission", ex5ShowPhase],
      };
      var m = map[boxId];
      if (m) addRetryButton(boxId, m[1], m[0]);
    };
    window.__hitlExercises = {
      ex2OverrideDone: false,
      setEx1GateChoice: function (v) {
        if (window.__hitlEx1SetGate) window.__hitlEx1SetGate(v);
      },
      setEx2SendChoice: function (v) {
        if (window.__hitlEx2SetSend) window.__hitlEx2SetSend(v);
      },
      restoreEx2Override: function () {
        if (window.__hitlEx2RestoreOverride) window.__hitlEx2RestoreOverride();
      },
      getEx4State: function () {
        return window.__hitlEx4GetState ? window.__hitlEx4GetState() : null;
      },
      restoreEx4State: function (s) {
        if (window.__hitlEx4RestoreState) window.__hitlEx4RestoreState(s);
      },
      restoreEx4Priority: function (vals) {
        if (window.__hitlEx4RestorePriority) window.__hitlEx4RestorePriority(vals);
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
