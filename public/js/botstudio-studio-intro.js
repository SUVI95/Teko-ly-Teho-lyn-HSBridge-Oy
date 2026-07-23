/**
 * Bot Studio — intro page demo player.
 *
 * Plays a sandboxed walkthrough that reuses the studio's real two-panel layout
 * (builder on the left, live portfolio preview + chat on the right) with a mock
 * candidate. Nothing is saved and no API is called — purely a visual "näin se
 * toimii" that looks like the real tool in action.
 */
(function () {
  "use strict";

  var BRAND = "duunijobs AI";
  var timers = [];
  var sceneIdx = 0;
  var stageEl = null;
  var stepperEl = null;
  var playing = false;

  var MOCK = {
    name: "Mika Laine",
    first: "Mika",
    initial: "M",
    tagline: "Asiakaspalvelu · verkkokauppa",
    slug: "mika-laine",
    cv:
      "Mika Laine — Asiakaspalvelu\n\n" +
      "4 vuotta asiakaspalvelua verkkokaupassa. Vastasin chat- ja\n" +
      "puhelinpalvelusta, reklamaatioista ja tilausten seurannasta.\n" +
      "Perehdytin uudet työntekijät ja kehitin vastausmalleja.",
    skills: ["asiakaspalvelu", "reklamaatiot", "tilaustenhallinta", "suomi", "englanti", "tiimityö"],
    exp: "4",
    job:
      "Asiakaspalveluasiantuntija — Verkkokauppa Oy\n\n" +
      "Etsimme asiakaspalvelun ammattilaista verkkokauppaamme.\n" +
      "Vaatimukset: sujuva suomi ja englanti, kokemus verkko-\n" +
      "kaupasta, CRM-järjestelmät. Ruotsin kieli katsotaan eduksi.",
    jobName: "Asiakaspalveluasiantuntija — Verkkokauppa Oy",
    fit: 78,
    atsOk: ["asiakaspalvelu", "suomi", "englanti", "verkkokauppa"],
    atsMiss: ["CRM", "ruotsi"],
    improve: [
      "Nosta CRM-kokemus esiin — mainitse käyttämäsi järjestelmät.",
      "Lisää ruotsin kielitaito, jos sinulla on sitä.",
    ],
    chat: [
      { who: "user", text: "Vertaa CV:täni tähän työpaikkaan." },
      { who: "bot", text: "Fit score on 78 %. Vahvuutesi: verkkokaupan asiakaspalvelu, suomi ja englanti." },
      { who: "user", text: "Mitä minun kannattaa parantaa?" },
      { who: "bot", text: "Nosta CRM-kokemus näkyviin ja lisää ruotsin taito — ne puuttuvat ATS-avainsanoista." },
    ],
  };

  var SCENES = [
    { key: "upload", label: "Lataa CV", ms: 6000 },
    { key: "train", label: "Kouluta", ms: 4400 },
    { key: "job", label: "Työpaikka", ms: 6400 },
    { key: "result", label: "Tulos", ms: 4800 },
    { key: "chat", label: "Testaa", ms: 7200 },
  ];

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function later(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearTimers() {
    timers.forEach(function (t) {
      clearTimeout(t);
      clearInterval(t);
    });
    timers = [];
  }

  // ---------------- builder (left) ----------------
  var TABS = [
    { k: "ai", label: "Ohjeet" },
    { k: "train", label: "Kouluta" },
    { k: "job", label: "Työpaikka" },
    { k: "look", label: "Ulkoasu" },
  ];
  function tabsHtml(active) {
    return (
      '<div class="d-tabs">' +
      TABS.map(function (t) {
        return '<div class="d-tab' + (t.k === active ? " on" : "") + '">' + t.label + "</div>";
      }).join("") +
      "</div>"
    );
  }
  function builderHtml(active, bodyHtml) {
    return '<div class="d-builder" id="dLeft">' + tabsHtml(active) + '<div class="d-bbody">' + bodyHtml + "</div></div>";
  }

  function bodyUpload() {
    return (
      '<div class="bsi-scene-label">1 · Lataa CV — PDF, DOCX tai TXT</div>' +
      '<div class="cv-upload-wrap"><div class="cv-upload d-upzone">' +
      '<div class="cv-upload-icon"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>' +
      '<div class="cv-upload-copy"><strong class="d-uptitle">Lataa CV (PDF, DOCX tai TXT)</strong>' +
      '<span class="d-uphint">Raahaa tiedosto tähän tai klikkaa valitaksesi</span>' +
      '<span class="cv-upload-meta">' + BRAND + ' lukee CV:n · max 25 MB</span></div></div>' +
      '<div class="cv-upload-status d-upstatus"></div></div>' +
      '<label class="lbl" style="margin-top:2px">CV-teksti (täyttyy automaattisesti)</label>' +
      '<div class="ta lg d-cvtext" style="min-height:60px;flex:1;color:var(--text3)">Odottaa CV:tä…</div>'
    );
  }

  function bodyTrain(ready) {
    return (
      '<div class="bsi-scene-label">2 · Kouluta botti — tarkista &amp; tallenna</div>' +
      '<label class="lbl">CV-teksti</label>' +
      '<div class="ta lg" style="min-height:80px">' + esc(MOCK.cv) + "</div>" +
      '<label class="lbl" style="margin-top:4px">Taidot (luettu CV:stä)</label>' +
      '<div class="d-skills">' + skillTags(MOCK.skills) + "</div>" +
      '<button class="btn btn-analyze d-trainbtn" type="button" style="margin-top:6px;pointer-events:none">Tallenna &amp; kouluta botti</button>' +
      '<div class="train-status ' + (ready ? "ready" : "wait") + ' d-trainstatus" style="margin-top:8px">' +
      (ready ? "Botti tallennettu · CV + " + MOCK.skills.length + " taitoa" : "Tarkista tiedot — paina Tallenna & kouluta") +
      "</div>"
    );
  }
  function bodyJob(filled, statusHtml) {
    return (
      '<div class="bsi-scene-label">2 · Liitä työpaikkailmoitus</div>' +
      '<label class="lbl">Ilmoituksen teksti</label>' +
      '<div class="ta job bsi-typed" data-type="job" style="min-height:118px;flex:1">' + (filled ? esc(MOCK.job) : "") + "</div>" +
      '<div class="job-analyze-status d-jobstatus">' + (statusHtml || "") + "</div>" +
      '<button class="btn btn-analyze" type="button" style="margin-top:4px;pointer-events:none">Analysoi sopivuus &amp; ATS</button>'
    );
  }
  function bodyAiSummary() {
    var prompt =
      "ROOLI:\nUravalmentaja joka vertaa CV:tä työpaikkoihin.\n\n" +
      "CV-DATA:\nMika Laine — 4 v asiakaspalvelua verkkokaupassa…\n\n" +
      "TAIDOT:\n" + MOCK.skills.join(", ");
    return (
      '<div class="bsi-scene-label">Botti valmis · testaa oikealta</div>' +
      '<label class="lbl">Järjestelmäohje (kokonaisuus)</label>' +
      '<div class="ta lg readonly" style="min-height:150px;white-space:pre-wrap">' + esc(prompt) + "</div>" +
      '<div class="train-status ready" style="margin-top:auto">Botti koulutettu · fit score 78 %</div>'
    );
  }

  // ---------------- preview (right) ----------------
  function skillTags(list) {
    return (
      '<div class="skill-tags">' +
      list.map(function (s) {
        return "<span>" + esc(s) + "</span>";
      }).join("") +
      "</div>"
    );
  }

  function heroBlock(pills) {
    return (
      '<div class="site-hero"><div class="photo">' + MOCK.initial + "</div><div>" +
      "<h2>" + esc(MOCK.name) + "</h2>" +
      '<div class="tag">' + esc(MOCK.tagline) + "</div>" +
      '<div class="meta">' + pills + "</div></div></div>"
    );
  }
  function statGrid() {
    return (
      '<div class="site-grid">' +
      '<div class="stat-box"><b>' + MOCK.exp + "</b><span>v kokemusta</span></div>" +
      '<div class="stat-box"><b>—</b><span>palveluarvosana</span></div>' +
      '<div class="stat-box"><b>' + MOCK.skills.length + "</b><span>taidot listattu</span></div></div>"
    );
  }
  function skillsSection() {
    return '<div class="site-section"><div class="site-section-h">Osaaminen (botti koulutettu näillä)</div>' + skillTags(MOCK.skills) + "</div>";
  }
  function widgetHtml(chatOpen) {
    if (chatOpen) {
      return (
        '<div class="widget"><div class="chat">' +
        '<div class="chat-hd"><div class="av">' + MOCK.initial + "</div>" +
        "<div><h4>" + esc(MOCK.first) + " · uravalmentaja</h4><p>Työnhakubotti</p></div></div>" +
        '<div class="chat-msgs d-chatmsgs"></div>' +
        '<div class="chat-ft"><div class="fake-inp">Kysy…</div><div class="fake-send">→</div></div>' +
        "</div></div>"
      );
    }
    return (
      '<div class="widget"><button class="launcher" type="button" aria-hidden="true">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></button></div>'
    );
  }

  /** level: 'empty' | 'trained' | 'analyzing' | 'analyzed' */
  function previewInner(level, opts) {
    opts = opts || {};
    var url, body;
    if (level === "empty") {
      url = "portfolio.fi";
      body =
        heroBlock('<span class="pill warn">CV puuttuu</span><span class="pill">Tekoälybotti · kupla</span>') +
        '<div class="site-banner"><strong>Ei vielä tietoja</strong>Lataa CV ja taidot Kouluta-välilehdellä — esikatselu täyttyy.</div>' +
        '<div class="site-cta"><span class="dot"></span> Aloita: Kouluta → lataa CV → Tallenna &amp; kouluta</div>';
    } else if (level === "trained") {
      url = MOCK.slug + ".portfolio.fi";
      body =
        heroBlock('<span class="pill ok">Botti koulutettu</span><span class="pill">Ei työpaikka-analyysiä</span><span class="pill">Tekoälybotti · kupla</span>') +
        '<div class="site-banner"><strong>Työnhakubottisi on valmiina</strong>Liitä työpaikka vasemmalta nähdäksesi match-analyysin.</div>' +
        statGrid() +
        skillsSection() +
        '<div class="site-cta"><span class="dot"></span> Klikkaa violettia kuplaa — testaa bottia</div>';
    } else if (level === "analyzing") {
      url = MOCK.slug + ".portfolio.fi";
      body =
        heroBlock('<span class="pill ok">Botti koulutettu</span><span class="pill warn">Analysoidaan…</span><span class="pill">Tekoälybotti · kupla</span>') +
        '<div class="site-banner warn"><strong>Analysoidaan työpaikkaa…</strong>' + BRAND + ' vertaa CV:tä ilmoitukseen — fit score ja ATS hetkessä.</div>' +
        statGrid() +
        skillsSection();
    } else {
      // analyzed
      url = MOCK.slug + ".portfolio.fi";
      var total = MOCK.atsOk.length + MOCK.atsMiss.length;
      body =
        heroBlock('<span class="pill ok">Botti koulutettu</span><span class="pill brand">Match ' + MOCK.fit + '%</span><span class="pill">Tekoälybotti · kupla</span>') +
        '<div class="site-banner match"><strong>Viimeisin työpaikka: ' + esc(MOCK.jobName) + "</strong>Fit score " + MOCK.fit + "% · ATS " + MOCK.atsOk.length + "/" + total + " avainsanaa · Klikkaa kuplaa kysyäksesi lisää.</div>" +
        '<div class="site-cards">' +
        '<div class="mini-card"><div class="mh">Fit score</div><div class="score d-fit">0%</div><div class="score-sub">Hyvä sopivuus — hae rohkeasti</div></div>' +
        '<div class="mini-card"><div class="mh">ATS-tilanne</div><div class="mb"><span style="color:var(--ok)">' + MOCK.atsOk.length + ' osuu</span> · <span style="color:var(--bad)">' + MOCK.atsMiss.length + ' puuttuu</span><br><span style="font-size:10px;color:var(--text3)">Puuttuu: ' + MOCK.atsMiss.join(", ") + "</span></div></div></div>" +
        '<div class="site-section"><div class="site-section-h">ATS-avainsanat</div><div class="skill-tags">' +
        MOCK.atsOk.map(function (k) { return '<span style="background:var(--ok-soft);color:var(--ok);border-color:#a7f3d0">' + esc(k) + "</span>"; }).join("") +
        MOCK.atsMiss.map(function (k) { return '<span style="background:var(--bad-soft);color:var(--bad);border:1px solid #fecaca">' + esc(k) + "</span>"; }).join("") +
        "</div></div>" +
        '<div class="site-section"><div class="site-section-h">Nopea CV-parannus</div><div class="mini-card"><div class="mb">' +
        MOCK.improve.map(function (i) { return "• " + esc(i); }).join("<br>") + "</div></div></div>" +
        skillsSection();
    }
    return (
      '<div class="browser"><div class="browser-chrome"><span class="c r"></span><span class="c y"></span><span class="c g"></span>' +
      '<span class="ub">' + url + "</span></div>" +
      '<div class="site-pad">' + body + "</div></div>" +
      widgetHtml(!!opts.chatOpen)
    );
  }

  function split(active, leftBody, level, opts) {
    return (
      '<div class="d-split">' +
      builderHtml(active, leftBody) +
      '<div class="d-preview" id="dRight">' + previewInner(level, opts) + "</div>" +
      "</div>"
    );
  }
  function setRight(level, opts) {
    var r = $("#dRight", stageEl);
    if (r) r.innerHTML = previewInner(level, opts);
  }

  // ---------------- typing ----------------
  function typeInto(el, text, speed, done, step) {
    if (!el) return;
    var i = 0;
    step = step || 2;
    el.innerHTML = '<span class="bsi-txt"></span><span class="bsi-caret"></span>';
    var span = el.querySelector(".bsi-txt");
    var id = setInterval(function () {
      i += step;
      span.textContent = text.slice(0, i);
      el.scrollTop = el.scrollHeight;
      if (i >= text.length) {
        clearInterval(id);
        var caret = el.querySelector(".bsi-caret");
        if (caret) caret.remove();
        if (done) done();
      }
    }, speed || 46);
    timers.push(id);
  }

  // ---------------- stepper ----------------
  function paintStepper(idx) {
    if (!stepperEl) return;
    var dots = stepperEl.querySelectorAll(".bsi-dot");
    dots.forEach(function (d, i) {
      d.classList.remove("on", "done");
      var bar = d.querySelector(".bar i");
      if (bar) {
        bar.style.transition = "none";
        bar.style.width = "";
      }
      if (i < idx) d.classList.add("done");
    });
    var active = dots[idx];
    if (active) {
      active.classList.add("on");
      var abar = active.querySelector(".bar i");
      if (abar) {
        abar.style.width = "0";
        void abar.offsetWidth;
        abar.style.transition = "width " + SCENES[idx].ms + "ms linear";
        abar.style.width = "100%";
      }
    }
  }

  // ---------------- scenes ----------------
  function runScene(idx) {
    sceneIdx = idx;
    var scene = SCENES[idx];
    if (!stageEl || !scene) return;
    paintStepper(idx);

    if (scene.key === "upload") {
      stageEl.innerHTML = split("train", bodyUpload(), "empty", { launcher: true });
      var zone = $(".d-upzone", stageEl);
      var hint = $(".d-uphint", stageEl);
      var status = $(".d-upstatus", stageEl);
      // 1) drag file over the zone
      later(function () {
        if (zone) zone.classList.add("drag");
        if (hint) hint.innerHTML = '<span class="d-file-chip">📄 mika-laine-cv.pdf</span>';
      }, 1100);
      // 2) drop → AI reading
      later(function () {
        if (zone) zone.classList.remove("drag");
        if (status) status.innerHTML = '<span class="d-spin"></span> ' + BRAND + ' lukee CV:stä…';
      }, 2300);
      // 3) read complete → CV text + skills fill
      later(function () {
        if (status) {
          status.className = "cv-upload-status ok d-upstatus";
          status.textContent = "✓ CV luettu · " + BRAND + " — tarkista teksti ja taidot";
        }
        var cvt = $(".d-cvtext", stageEl);
        if (cvt) {
          cvt.className = "ta lg d-cvtext bsi-fade";
          cvt.style.color = "var(--text)";
          cvt.textContent = MOCK.cv;
        }
      }, 4400);
    } else if (scene.key === "train") {
      stageEl.innerHTML = split("train", bodyTrain(false), "trained", { launcher: true });
      // press "Tallenna & kouluta" → trained
      later(function () {
        var btn = $(".d-trainbtn", stageEl);
        if (btn) {
          btn.style.transform = "scale(.97)";
          btn.style.filter = "brightness(.95)";
        }
      }, 1600);
      later(function () {
        var btn = $(".d-trainbtn", stageEl);
        if (btn) {
          btn.style.transform = "";
          btn.style.filter = "";
        }
        var ts = $(".d-trainstatus", stageEl);
        if (ts) {
          ts.className = "train-status ready d-trainstatus";
          ts.textContent = "Botti tallennettu · CV + " + MOCK.skills.length + " taitoa";
        }
        setRight("trained", { launcher: true });
      }, 2100);
    } else if (scene.key === "job") {
      stageEl.innerHTML = split("job", bodyJob(false, ""), "trained", { launcher: true });
      typeInto(
        $('[data-type="job"]', stageEl),
        MOCK.job,
        48,
        function () {
          var js = $(".d-jobstatus", stageEl);
          if (js) {
            js.className = "job-analyze-status ok d-jobstatus";
            js.textContent = "Valmis analysoitavaksi — paina Analysoi";
          }
          later(function () {
            var btn = $(".btn-analyze", stageEl);
            if (btn) {
              btn.style.transform = "scale(.98)";
              btn.style.filter = "brightness(.95)";
            }
          }, 700);
          later(function () {
            var btn = $(".btn-analyze", stageEl);
            if (btn) {
              btn.style.transform = "";
              btn.style.filter = "";
            }
            if (js) {
              js.className = "job-analyze-status d-jobstatus";
              js.innerHTML = '<span class="d-spin"></span> ' + BRAND + ' analysoi sopivuutta…';
            }
            setRight("analyzing", { launcher: true });
          }, 1400);
        },
        2
      );
    } else if (scene.key === "result") {
      stageEl.innerHTML = split("job", bodyJob(true, '<span style="color:var(--ok)">Analyysi valmis — katso oikea paneeli</span>'), "analyzed", { launcher: true });
      var fitEl = $(".d-fit", stageEl);
      var n = 0;
      var id = setInterval(function () {
        n += 2;
        if (n >= MOCK.fit) {
          n = MOCK.fit;
          clearInterval(id);
        }
        if (fitEl) fitEl.textContent = n + "%";
      }, 45);
      timers.push(id);
    } else if (scene.key === "chat") {
      stageEl.innerHTML = split("ai", bodyAiSummary(), "analyzed", { chatOpen: true });
      var box = $(".d-chatmsgs", stageEl);
      var d = 700;
      MOCK.chat.forEach(function (m) {
        later(function () {
          if (!box) return;
          var b = document.createElement("div");
          b.className = "bubble " + (m.who === "user" ? "user" : "bot") + " bsi-fade";
          b.textContent = m.text;
          box.appendChild(b);
          box.scrollTop = box.scrollHeight;
        }, d);
        d += 1500;
      });
    }

    if (idx < SCENES.length - 1) {
      later(function () {
        runScene(idx + 1);
      }, scene.ms);
    } else {
      later(function () {
        var dots = stepperEl ? stepperEl.querySelectorAll(".bsi-dot") : [];
        if (dots[idx]) dots[idx].classList.add("done");
        playing = false;
        var replay = $("#demoReplay");
        if (replay) replay.hidden = false;
      }, scene.ms);
    }
  }

  function play(fromStart) {
    clearTimers();
    playing = true;
    var replay = $("#demoReplay");
    if (replay) replay.hidden = true;
    runScene(fromStart ? 0 : sceneIdx);
  }

  // ---------------- cover (no empty whitespace) ----------------
  function renderCover() {
    stageEl.innerHTML = split("train", bodyTrain(true), "trained", { launcher: true });
    var ov = document.createElement("div");
    ov.className = "d-cover-ov";
    ov.innerHTML =
      '<button class="pl" type="button" id="demoCoverPlay" aria-label="Toista demo"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>' +
      "<b>Näin se toimii</b>" +
      "<span>Katso miten esimerkkihakija kouluttaa botin, liittää työpaikan, näkee sopivuuden ja testaa bottia — samoilla näkymillä kuin sinä pian.</span>";
    stageEl.appendChild(ov);
    $("#demoCoverPlay", stageEl).addEventListener("click", startFromTop);
  }

  function startFromTop() {
    play(true);
    var wrap = $("#demoWrap");
    if (wrap && wrap.scrollIntoView) wrap.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---------------- init ----------------
  function buildStepper() {
    if (!stepperEl) return;
    stepperEl.innerHTML = SCENES.map(function (s, i) {
      return '<div class="bsi-dot" data-i="' + i + '"><div class="bar"><i></i></div><div class="cap">' + (i + 1) + " " + esc(s.label) + "</div></div>";
    }).join("");
    stepperEl.querySelectorAll(".bsi-dot").forEach(function (dot) {
      dot.addEventListener("click", function () {
        clearTimers();
        playing = true;
        var r = $("#demoReplay");
        if (r) r.hidden = true;
        runScene(parseInt(dot.dataset.i, 10) || 0);
      });
    });
  }

  function init() {
    stageEl = $("#demoStage");
    stepperEl = $("#demoStepper");
    if (!stageEl) return;
    buildStepper();
    renderCover();
    var playBtn = $("#demoPlay");
    if (playBtn) playBtn.addEventListener("click", startFromTop);
    var replay = $("#demoReplay");
    if (replay) replay.addEventListener("click", function () { play(true); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
