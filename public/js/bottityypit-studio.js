/**
 * Bottityypit Bot Studio — työnhakubotti + ATS (tallennetaan alustalle, ei julkaisua).
 */
(function () {
  "use strict";

  var LOCAL_KEY = "bottityypit-studio-v1";
  var trained = false;
  var analysisData = null;
  var saveTimer = null;
  var restored = false;

  function $(id) {
    return document.getElementById(id);
  }

  function wc(s) {
    return (String(s || "").trim().match(/\S+/g) || []).length;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fieldIds() {
    return [
      "botName",
      "role",
      "personality",
      "behavior",
      "limits",
      "fullPrompt",
      "cvText",
      "skillsText",
      "jobPost",
      "welcome",
      "chip1",
      "chip2",
      "chip3",
      "hexMain",
    ];
  }

  function collectFields() {
    var fields = {};
    fieldIds().forEach(function (id) {
      var el = $(id);
      if (el) fields[id] = el.value != null ? String(el.value) : "";
    });
    return fields;
  }

  function collectSnapshot() {
    var sw = document.querySelector(".swatch.on");
    var pos = document.querySelector("#posRow button.on");
    return {
      v: 1,
      ts: Date.now(),
      trained: trained,
      fields: collectFields(),
      widgetColor: $("colorMain") ? $("colorMain").value : "#6366f1",
      widgetPos: pos ? pos.dataset.pos : "right",
      analysisData: analysisData,
    };
  }

  function setSaveStatus(msg, ok) {
    var el = $("studioSaveStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "save-status" + (ok ? " ok" : "");
  }

  function saveStudio(opts) {
    opts = opts || {};
    var snap = collectSnapshot();
    var json = JSON.stringify(snap);
    try {
      localStorage.setItem(LOCAL_KEY, json);
    } catch (e) {
      /* ignore */
    }
    if (window.BonusModule && typeof window.BonusModule.saveEntry === "function") {
      return window.BonusModule.saveEntry("_studio", json, null, null, opts).then(function () {
        if (!opts.silent) setSaveStatus("Tallennettu", true);
      });
    }
    if (!opts.silent) setSaveStatus("Tallennettu (paikallisesti)", true);
    return Promise.resolve();
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveStudio({ silent: true });
    }, 800);
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

  function restoreSnapshot(snap) {
    if (!snap || restored) return;
    restored = true;
    if (snap.fields) {
      Object.keys(snap.fields).forEach(function (id) {
        var el = $(id);
        if (!el || snap.fields[id] == null) return;
        el.value = snap.fields[id];
      });
    }
    trained = !!snap.trained;
    analysisData = snap.analysisData || null;
    if (snap.widgetColor) {
      applyColors(snap.widgetColor);
      if ($("colorMain")) $("colorMain").value = snap.widgetColor;
      if ($("hexMain")) $("hexMain").value = snap.widgetColor;
      document.querySelectorAll(".swatch").forEach(function (s) {
        s.classList.toggle("on", s.dataset.c === snap.widgetColor);
      });
    }
    if (snap.widgetPos && $("widget")) {
      document.querySelectorAll("#posRow button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.pos === snap.widgetPos);
      });
      $("widget").className = "widget " + snap.widgetPos;
    }
    syncPrompt();
    updateTrainStatus();
    if (analysisData) renderAnalysisPanel();
    renderChips();
    renderSitePreview();
    if (trained) setSaveStatus("Botti ladattu — voit jatkaa tai muokata", true);
  }

  function syncPrompt() {
    var p = [
      "ROOLI:\n" + $("role").value,
      "PERSOONALLISUUS:\n" + $("personality").value,
      "KÄYTTÄYTYMINEN:\n" + $("behavior").value,
      "RAJAT:\n" + $("limits").value,
      "CV-DATA:\n" + $("cvText").value.slice(0, 200) + "…",
      "TAIDOT:\n" + $("skillsText").value,
    ].join("\n\n");
    $("fullPrompt").value = p;
    $("promptWc").textContent = wc(p) + " sanaa";
    $("chatTitle").textContent = $("botName").value.trim() || parseCvName();
    $("av").textContent = (parseCvName().charAt(0) || "A").toUpperCase();
  }

  function parseCvName() {
    var cv = $("cvText").value.trim();
    var m = cv.match(/^([A-ZÅÄÖa-zåäö\s]+?)(?:\s*—|\s*-)/);
    return m ? m[1].trim() : "Hakija";
  }

  function parseCvStats() {
    var cv = $("cvText").value;
    var exp = (cv.match(/(\d+)\s*vuotta?/i) || [])[1] || "—";
    var score = (cv.match(/(\d+)\s*%/) || [])[1];
    return { exp: exp, score: score ? score + "%" : "—" };
  }

  function parseSkills() {
    return $("skillsText").value
      .split(/[,\n]/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .slice(0, 8);
  }

  function updateTrainStatus() {
    var st = $("trainStatus");
    if (!st) return;
    if (trained) {
      st.className = "train-status ready";
      st.textContent =
        "Botti tallennettu · CV + " + wc($("skillsText").value) + " taitoa · ei tarvitse kouluttaa uudelleen";
    } else {
      st.className = "train-status wait";
      st.textContent = "Lisää CV ja taidot — paina Tallenna & kouluta";
    }
  }

  function renderSitePreview() {
    var name = parseCvName();
    var stats = parseCvStats();
    var skills = parseSkills();
    var initial = name.charAt(0).toUpperCase();
    var slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    $("siteUrl").textContent = (slug || "hakija") + ".portfolio.fi";

    var trainPill = trained
      ? '<span class="pill ok">Botti koulutettu</span>'
      : '<span class="pill warn">Botti ei vielä koulutettu</span>';
    var analysisPill = analysisData
      ? '<span class="pill brand">Viimeisin match: ' + analysisData.score + "%</span>"
      : '<span class="pill">Ei työpaikka-analyysiä</span>';

    var bannerHtml;
    if (analysisData) {
      bannerHtml =
        '<div class="site-banner match"><strong>Viimeisin työpaikka: ' +
        esc(analysisData.jobName) +
        "</strong>Fit score " +
        analysisData.score +
        "% · ATS " +
        analysisData.atsMatched.length +
        "/" +
        (analysisData.atsMatched.length + analysisData.atsMissing.length) +
        " avainsanaa · Klikkaa kuplaa kysyäksesi lisää.</div>";
    } else if (trained) {
      bannerHtml =
        '<div class="site-banner"><strong>Työnhakubottisi on valmiina</strong>Käytät sitä täällä alustalla. Liitä työpaikka vasemmalta nähdäksesi match-analyysin.</div>';
    } else {
      bannerHtml =
        '<div class="site-banner"><strong>Portfolio-esikatselu</strong>Tallenna CV ja taidot — sitten näet mitä rekrytoija näkisi.</div>';
    }

    var matchCards = "";
    if (analysisData) {
      matchCards =
        '<div class="site-cards">' +
        '<div class="mini-card"><div class="mh">Fit score</div><div class="score">' +
        analysisData.score +
        '%</div><div class="score-sub">Hyvä sopivuus — hae rohkeasti</div></div>' +
        '<div class="mini-card"><div class="mh">ATS-tilanne</div><div class="mb"><span style="color:var(--ok)">' +
        analysisData.atsMatched.length +
        ' osuu</span> · <span style="color:var(--bad)">' +
        analysisData.atsMissing.length +
        ' puuttuu</span><br><span style="font-size:10px;color:var(--text3)">Puuttuvat: ' +
        analysisData.atsMissing.slice(0, 3).join(", ") +
        "…</span></div></div></div>";
    }

    var improvePreview = "";
    if (analysisData) {
      improvePreview =
        '<div class="site-section"><div class="site-section-h">Nopea CV-parannus (esikatselu)</div><div class="mini-card"><div class="mb">' +
        analysisData.improve
          .slice(0, 2)
          .map(function (i) {
            return "• " + esc(i);
          })
          .join("<br>") +
        "</div></div></div>";
    }

    $("sitePreview").innerHTML =
      '<div class="site-hero">' +
      '<div class="photo">' +
      initial +
      "</div><div>" +
      "<h2>" +
      esc(name) +
      "</h2>" +
      '<div class="tag">Asiakaspalvelu & myynti · Etsin uutta roolia · Avoin työnhakuun</div>' +
      '<div class="meta">' +
      trainPill +
      analysisPill +
      '<span class="pill">Tekoälybotti · kupla alakulmassa</span></div></div></div>' +
      bannerHtml +
      '<div class="site-grid">' +
      '<div class="stat-box"><b>' +
      stats.exp +
      "</b><span>v kokemusta</span></div>" +
      '<div class="stat-box"><b>' +
      stats.score +
      "</b><span>palveluarvosana</span></div>" +
      '<div class="stat-box"><b>' +
      skills.length +
      "</b><span>taidot listattu</span></div></div>" +
      matchCards +
      '<div class="site-section"><div class="site-section-h">Osaaminen (botti koulutettu näillä)</div><div class="skill-tags">' +
      skills
        .map(function (s) {
          return "<span>" + esc(s) + "</span>";
        })
        .join("") +
      "</div></div>" +
      improvePreview +
      '<div class="site-section"><div class="site-section-h">Mitä voit tehdä</div>' +
      '<div class="mini-card"><div class="mb">1) Vertaa CV:tä työpaikkoihin<br>2) Tarkista ATS-avainsanat<br>3) Pyydä hakemustekstiehdotuksia<br>4) Käytä kuplaa kuten rekrytoija tekisi</div></div></div>' +
      '<div class="site-cta"><span class="dot"></span> Klikkaa violettia kuplaa — testaa bottia</div>';

    $("av").textContent = initial;
    $("chatTitle").textContent = $("botName").value.trim() || name;
  }

  function applyColors(hex) {
    document.documentElement.style.setProperty("--widget", hex);
    document.documentElement.style.setProperty("--widget2", hex);
    document.documentElement.style.setProperty("--widget-soft", hex + "18");
  }

  function renderChips() {
    $("chips").innerHTML = "";
    ["chip1", "chip2", "chip3"].forEach(function (id) {
      var t = $(id).value.trim();
      if (!t) return;
      var b = document.createElement("button");
      b.textContent = t;
      b.onclick = function () {
        userMsg(t);
        if (/vertaa|työpaikka/i.test(t)) runAnalysis(true);
        else if (/cv|parann/i.test(t))
          addBotRich(
            "CV-parannukset",
            analysisData ? analysisData.improve.join("\n• ") : "Analysoi työpaikka ensin."
          );
        else if (/hakemus|teksti/i.test(t))
          addBotRich(
            "Hakemusehdotus",
            analysisData ? analysisData.cover : "Analysoi työpaikka ensin."
          );
      };
      $("chips").appendChild(b);
    });
  }

  function renderAnalysisPanel() {
    if (!analysisData) return;
    $("jobTitle").textContent = analysisData.jobName;
    $("analysisEmpty").style.display = "none";
    var el = $("analysisResult");
    el.style.display = "block";
    var skillHtml = analysisData.skills
      .map(function (s) {
        return (
          '<div class="skill-row"><span style="width:100px">' +
          s.n +
          '</span><div class="bar"><i style="width:' +
          s.p +
          '%"></i></div><span class="pct">' +
          s.p +
          "%</span></div>"
        );
      })
      .join("");
    el.innerHTML =
      '<div class="score-card"><div class="score-ring" style="background:conic-gradient(var(--widget) ' +
      analysisData.score * 3.6 +
      'deg, var(--border) 0)"><div><div class="val">' +
      analysisData.score +
      '%</div><div class="lbl">Fit score</div></div></div><div class="score-meta"><div class="t">Hyvä sopivuus — hakeminen kannattaa</div><div class="d">Vahva: asiakaspalvelu, CRM, kielet. Heikko: B2B/SaaS, myyntiluvut.</div></div></div>' +
      '<div class="card"><div class="card-h">ATS-avainsanat — osuu</div><div class="card-b"><div class="kw-wrap">' +
      analysisData.atsMatched
        .map(function (k) {
          return '<span class="kw ok">' + k + "</span>";
        })
        .join("") +
      "</div></div></div>" +
      '<div class="card"><div class="card-h">ATS — puuttuu CV:stä</div><div class="card-b"><div class="kw-wrap">' +
      analysisData.atsMissing
        .map(function (k) {
          return '<span class="kw miss">' + k + "</span>";
        })
        .join("") +
      "</div></div></div>" +
      '<div class="card"><div class="card-h">Taitojen match</div><div class="card-b"><div class="skill-rows">' +
      skillHtml +
      "</div></div></div>" +
      '<div class="card"><div class="card-h">Paranna CV:tä</div><div class="card-b"><ul class="improve">' +
      analysisData.improve
        .map(function (i) {
          return "<li>" + i + "</li>";
        })
        .join("") +
      "</ul></div></div>" +
      '<div class="card"><div class="card-h">Ehdotus — saatekirje</div><div class="card-b"><div class="draft" id="coverDraft">' +
      analysisData.cover +
      '</div><button class="copy-btn" type="button" data-copy="coverDraft">Kopioi</button></div></div>' +
      '<div class="card"><div class="card-h">Ehdotus — hakemus (lyhyt)</div><div class="card-b"><div class="draft" id="applyDraft">' +
      analysisData.apply +
      '</div><button class="copy-btn" type="button" data-copy="applyDraft">Kopioi</button></div></div>';
    el.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.onclick = function () {
        var t = $(btn.dataset.copy);
        if (t) navigator.clipboard.writeText(t.textContent);
      };
    });
  }

  function runAnalysis(fromChat) {
    if (!trained) {
      alert("Tallenna botti ensin (CV + taidot).");
      return;
    }
    var job = $("jobPost").value.trim();
    if (!job) {
      alert("Liitä työpaikkailmoitus.");
      return;
    }

    analysisData = {
      score: 78,
      jobName: "Customer Success Specialist — TechNova Oy",
      atsMatched: [
        "asiakaspalvelu",
        "CRM",
        "Salesforce",
        "suomen kieli",
        "englannin kieli",
        "ongelmanratkaisu",
        "etätyö",
      ],
      atsMissing: ["B2B", "SaaS", "myyntihenkisyyttä", "HubSpot", "tuloshakuisuutta"],
      skills: [
        { n: "Asiakaspalvelu", p: 95 },
        { n: "CRM (Salesforce)", p: 90 },
        { n: "Kielitaidot", p: 88 },
        { n: "B2B / SaaS", p: 35 },
        { n: "Myyntitulokset", p: 25 },
        { n: "Etätyö (ekspl.)", p: 40 },
      ],
      improve: [
        'Lisää CV:hen yksi mitattava tulos (esim. "ratkaisi 40+ tapausta/viikko" tai myynti-%).',
        "Mainitse B2B-kokemus jos ollut — tai kirjoita siirtymätarina B2C→B2B.",
        'Lisää rivi: "Etätyökokemus" jos olet työskennellyt etänä.',
        "Nosta englanti ja CRM avainsanoina ylemmäs ATS:ää varten.",
      ],
      cover:
        "Hei,\n\nOlen kiinnostunut Customer Success Specialist -tehtävästä TechNovalla. Minulla on 4 vuoden B2C-asiakaspalvelukokemus, vahva CRM-osaaminen (Salesforce, Zendesk) ja 92 % palveluarvosana. Logistiikkataustani on tuonut prosessiosaamista ja paineensietoa — haluan siirtää nämä B2B SaaS -ympäristöön.\n\nLiitteenä CV. Olen tavoitettavissa haastatteluun viikon sisällä.\n\nYstävällisin terveisin,\n" +
        parseCvName(),
      apply:
        "TechNova / Customer Success\n\nVahvuuteni tähän rooliin: asiakastyö, CRM ja ongelmanratkaisu. Kehityskohteeni: myyntiluvut CV:hen — olen valmis osoittamaan tuloshakuisuuden käytännössä.",
    };

    renderAnalysisPanel();
    if (fromChat) {
      addBotRich(
        "Fit score: " + analysisData.score + "%",
        "ATS: " +
          analysisData.atsMatched.length +
          " osuu · " +
          analysisData.atsMissing.length +
          " puuttuu.\n\nKatso täydellinen analyysi oikealta paneelilta."
      );
    } else {
      openChat();
      addBot(
        "Analysoin TechNova-ilmoituksen CV:täsi vasten. Fit score on " +
          analysisData.score +
          " %. Katso portfolio-sivulta yhteenveto ja oikealta täydellinen analyysi."
      );
    }
    renderSitePreview();
    saveStudio({ silent: true });
  }

  function openChat() {
    $("chat").classList.remove("hide");
    $("launch").classList.add("hide");
  }

  function addBot(t) {
    var d = document.createElement("div");
    d.className = "bubble bot";
    d.textContent = t;
    $("msgs").appendChild(d);
    $("msgs").scrollTop = 9999;
  }

  function addBotRich(title, body) {
    var d = document.createElement("div");
    d.className = "bubble rich";
    d.innerHTML =
      '<div class="rich-card"><div class="rh">' +
      title +
      '</div><div class="rb">' +
      body +
      "</div></div>";
    $("msgs").appendChild(d);
    $("msgs").scrollTop = 9999;
  }

  function userMsg(t) {
    var d = document.createElement("div");
    d.className = "bubble user";
    d.textContent = t;
    $("msgs").appendChild(d);
    $("msgs").scrollTop = 9999;
  }

  function trainAndSave() {
    if (wc($("cvText").value) < 20) {
      alert("CV liian lyhyt — lisää tekstiä.");
      return;
    }
    trained = true;
    syncPrompt();
    updateTrainStatus();
    renderSitePreview();
    saveStudio().then(function () {
      setSaveStatus("Botti tallennettu — voit palata milloin tahansa", true);
    });
  }

  function wire() {
    document.querySelectorAll("#tabs button").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll("#tabs button").forEach(function (x) {
          x.classList.remove("on");
        });
        document.querySelectorAll(".panel-tab").forEach(function (p) {
          p.classList.remove("on");
        });
        b.classList.add("on");
        $("tab-" + b.dataset.tab).classList.add("on");
      };
    });

    fieldIds().forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () {
        syncPrompt();
        renderSitePreview();
        scheduleSave();
      });
    });

    $("trainBtn").onclick = trainAndSave;
    $("analyzeBtn").onclick = function () {
      runAnalysis(false);
    };

    document.querySelectorAll(".swatch").forEach(function (s) {
      s.onclick = function () {
        document.querySelectorAll(".swatch").forEach(function (x) {
          x.classList.remove("on");
        });
        s.classList.add("on");
        applyColors(s.dataset.c);
        scheduleSave();
      };
    });

    if ($("colorMain")) {
      $("colorMain").oninput = function () {
        applyColors(this.value);
        $("hexMain").value = this.value;
        scheduleSave();
      };
    }

    $("launch").onclick = function () {
      openChat();
      $("msgs").innerHTML = "";
      addBot($("welcome").value);
      renderChips();
    };
    $("closeChat").onclick = function () {
      $("chat").classList.add("hide");
      $("launch").classList.remove("hide");
    };
    $("syncBtn").onclick = function () {
      syncPrompt();
      renderChips();
      renderSitePreview();
    };

    document.querySelectorAll("#posRow button").forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll("#posRow button").forEach(function (x) {
          x.classList.remove("on");
        });
        b.classList.add("on");
        $("widget").className = "widget " + b.dataset.pos;
        scheduleSave();
      };
    });

    window.addEventListener("pagehide", function () {
      saveStudio({ silent: true, keepalive: true });
    });
  }

  function onReady() {
    var serverRaw = null;
    if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
      serverRaw = window.BonusModule.getEntry("_studio");
    }
    var best = pickBestSnapshot(serverRaw);
    wire();
    syncPrompt();
    renderChips();
    if (best) restoreSnapshot(best);
    else {
      renderSitePreview();
      updateTrainStatus();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      document.addEventListener("bonus-module:ready", onReady, { once: true });
    });
  } else {
    document.addEventListener("bonus-module:ready", onReady, { once: true });
  }

  window.BottityypitStudio = {
    isTrained: function () {
      return trained;
    },
    getSnapshot: collectSnapshot,
  };
})();
