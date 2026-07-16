/**
 * Bottityypit Bot Studio — työnhakubotti + ATS (tallennetaan alustalle, ei julkaisua).
 */
(function () {
  "use strict";

  var LOCAL_KEY = "bottityypit-studio-v2";
  var SHIPPED_TEMPLATES = {
    role:
      "Olet uravalmentaja joka auttaa työnhaussa. Vertaat CV:tä työpaikkoihin, analysoit ATS-sopivuutta ja ehdotat hakemustekstejä. Et lupaa työpaikkaa.",
    personality: "Lämmin, asiallinen, rehellinen. Kerrot suoraan jos sopivuus on heikko.",
    behavior:
      "Kun työpaikka on liitetty, aloita fit scoresta. Anna aina konkreettinen parannus CV:hen ennen hakemustekstiä.",
    limits: "Älä keksi kokemusta. Älä takaa valintaa. Käytä vain koulutusdataa (CV + taidot).",
    welcome:
      "Hei! Olen tekoälyuravalmentajasi. Liitä työpaikka — kerron sopivuuden, ATS:n ja ehdotan hakemustekstit.",
    chip1: "Vertaa tähän työpaikkaan",
    chip2: "Mitä parannan CV:ssä?",
    chip3: "Ehdota hakemusteksti",
  };
  var trained = false;
  var analysisData = null;
  var saveTimer = null;
  var restored = false;
  var cachedUserId = null;
  var userIdLoaded = false;

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

  function localStorageKey() {
    return LOCAL_KEY + ":" + (cachedUserId || "anon");
  }

  function loadUserId() {
    if (userIdLoaded) return Promise.resolve(cachedUserId);
    return fetch("/api/auth/me", { credentials: "include" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        cachedUserId = d && d.user && d.user.id ? String(d.user.id) : "anon";
        userIdLoaded = true;
        return cachedUserId;
      })
      .catch(function () {
        cachedUserId = "anon";
        userIdLoaded = true;
        return cachedUserId;
      });
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
    syncPrompt();
    var snap = collectSnapshot();
    var json = JSON.stringify(snap);
    try {
      localStorage.setItem(localStorageKey(), json);
    } catch (e) {
      /* ignore */
    }
    if (!opts.silent) setSaveStatus("Tallennetaan…", false);

    return fetch("/api/bonus-module/responses", {
      method: "POST",
      credentials: "include",
      keepalive: !!opts.keepalive,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: window.BONUS_MODULE_SLUG || "bottityypit",
        section_id: "_studio",
        user_text: json,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { res: res, data: data };
        });
      })
      .then(function (out) {
        if (out.data && out.data.success) {
          if (!opts.silent) setSaveStatus("Tallennettu", true);
          else setSaveStatus("Tallennettu automaattisesti", true);
          return true;
        }
        if (!opts.silent) {
          setSaveStatus("Tallennettu selaimessa — kirjaudu tallentaaksesi pilveen", true);
        } else {
          setSaveStatus("Tallennettu paikallisesti", true);
        }
        return false;
      })
      .catch(function () {
        if (!opts.silent) setSaveStatus("Tallennettu vain selaimessa", true);
        else setSaveStatus("Tallennettu paikallisesti", true);
        return false;
      });
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
      var scoped = parseSnapshot(localStorage.getItem(localStorageKey()));
      if (scoped) return scoped;
      var legacy = parseSnapshot(localStorage.getItem(LOCAL_KEY));
      if (legacy) {
        try {
          localStorage.setItem(localStorageKey(), JSON.stringify(legacy));
        } catch (e) {
          /* ignore */
        }
        return legacy;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  function isShippedTemplateField(id, value) {
    var shipped = SHIPPED_TEMPLATES[id];
    if (!shipped) return false;
    return String(value || "").trim() === shipped;
  }

  function stripShippedTemplatesFromFields(fields) {
    if (!fields) return fields;
    Object.keys(SHIPPED_TEMPLATES).forEach(function (id) {
      if (isShippedTemplateField(id, fields[id])) fields[id] = "";
    });
    return fields;
  }

  function isTemplateOnlySnapshot(snap) {
    if (!snap || !snap.fields) return false;
    if (snap.trained || snap.analysisData) return false;
    if (wc(snap.fields.cvText) >= 5 || wc(snap.fields.skillsText) >= 3) return false;
    var hasCustom = false;
    ["role", "personality", "behavior", "limits", "welcome", "botName", "jobPost"].forEach(function (id) {
      var v = String(snap.fields[id] || "").trim();
      if (!v) return;
      if (isShippedTemplateField(id, v)) return;
      hasCustom = true;
    });
    return !hasCustom;
  }

  function stripTemplateOnlySnapshot(snap) {
    if (!snap || !isTemplateOnlySnapshot(snap)) return snap;
    snap.fields = stripShippedTemplatesFromFields(Object.assign({}, snap.fields));
    snap.trained = false;
    snap.analysisData = null;
    snap.ts = Date.now();
    return snap;
  }

  function pickBestSnapshot(serverRaw) {
    var server = stripLegacyDemoSnapshot(stripTemplateOnlySnapshot(parseSnapshot(serverRaw)));
    var local = stripLegacyDemoSnapshot(stripTemplateOnlySnapshot(readLocalSnapshot()));
    if (server && local) {
      return (local.ts || 0) >= (server.ts || 0) ? local : server;
    }
    var best = server || local;
    if (best && !hasMeaningfulSnapshot(best)) return null;
    return best;
  }

  function hasMeaningfulSnapshot(snap) {
    if (!snap) return false;
    if (snap.trained || snap.analysisData) return true;
    var f = snap.fields || {};
    if (wc(f.cvText) >= 5 || wc(f.skillsText) >= 3) return true;
    return fieldIds().some(function (id) {
      return String(f[id] || "").trim().length > 0;
    });
  }

  function restoreSnapshot(snap) {
    if (!snap || restored) return;
    restored = true;
    if (snap.fields) {
      snap.fields = stripShippedTemplatesFromFields(Object.assign({}, snap.fields));
      Object.keys(snap.fields).forEach(function (id) {
        if (id === "fullPrompt") return;
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

  function setCvUploadStatus(msg, kind) {
    var el = $("cvUploadStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "cv-upload-status" + (kind ? " " + kind : "");
  }

  function fieldsToCvText(fields) {
    if (!fields) return "";
    var lines = [];
    var head = [fields.name, fields.target_role].filter(Boolean).join(" — ");
    if (head) lines.push(head);
    if (fields.city) lines.push("Sijainti: " + fields.city);
    if (fields.bio) lines.push("\n" + fields.bio);
    if (fields.experience && fields.experience.length) {
      lines.push("\nKokemus:");
      fields.experience.forEach(function (e) {
        var row = [e.role, e.company, e.years].filter(Boolean).join(" · ");
        if (e.desc) row += ": " + e.desc;
        if (row) lines.push("• " + row);
      });
    }
    if (fields.education && fields.education.length) {
      lines.push("\nKoulutus:");
      fields.education.forEach(function (e) {
        lines.push("• " + [e.degree, e.school, e.year].filter(Boolean).join(" · "));
      });
    }
    if (fields.languages && fields.languages.length) {
      lines.push(
        "\nKielet: " +
          fields.languages
            .map(function (l) {
              return l.name + (l.level ? " (" + l.level + ")" : "");
            })
            .join(", ")
      );
    }
    return lines.join("\n").trim();
  }

  function applyCvPortfolioFields(fields) {
    if (!fields) return false;
    var cv = fieldsToCvText(fields);
    if (cv) $("cvText").value = cv;
    if (fields.skills && fields.skills.length) {
      $("skillsText").value = fields.skills.join(", ");
    }
    if (fields.name && !$("botName").value.trim()) {
      var role = fields.target_role ? " · " + fields.target_role : "";
      $("botName").value = fields.name.split(" ")[0] + role;
    }
    syncPrompt();
    renderSitePreview();
    scheduleSave();
    return !!(cv || (fields.skills && fields.skills.length));
  }

  function isAllowedCvFile(file) {
    if (!file) return false;
    var name = (file.name || "").toLowerCase();
    var type = (file.type || "").toLowerCase();
    if (/\.(pdf|txt|docx)$/.test(name)) return true;
    return (
      type === "application/pdf" ||
      type === "text/plain" ||
      type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  function cvFileTypeError(file) {
    var name = (file && file.name) || "tiedosto";
    if (/\.doc$/i.test(name) && !/\.docx$/i.test(name)) {
      return "Vanha Word (.doc) ei tueta — tallenna PDF- tai DOCX-muodossa.";
    }
    return "Tuetut tiedostot: PDF, DOCX ja TXT.";
  }

  function setCvUploadFileName(name) {
    var hint = $("cvUploadHint");
    if (!hint) return;
    hint.textContent = name ? "Valittu: " + name : "Raahaa tiedosto tähän tai klikkaa valitaksesi";
  }

  function parseApiJson(res) {
    return res.text().then(function (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        var err = new Error(
          res.status === 404
            ? "Palvelinpolku puuttuu — yritä uudelleen hetken kuluttua"
            : "Palvelinvirhe (" + res.status + ")"
        );
        err.status = res.status;
        throw err;
      }
    });
  }

  function plainLen(s) {
    return String(s || "").replace(/\s/g, "").length;
  }

  function setJobAnalyzeStatus(msg, kind) {
    var el = $("jobAnalyzeStatus");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "job-analyze-status" + (kind ? " " + kind : "");
  }

  function validateJobAnalysis() {
    var cv = ($("cvText") && $("cvText").value) || "";
    var job = ($("jobPost") && $("jobPost").value) || "";
    if (plainLen(cv) < 20) {
      return "CV on liian lyhyt — lataa tai kirjoita CV ensin Kouluta-välilehdellä.";
    }
    if (plainLen(job) < 30) {
      return "Ilmoitus on liian lyhyt — kopioi koko työpaikkailmoitus (yritys, rooli, vaatimukset).";
    }
    return null;
  }

  function fetchJsonWithTimeout(url, options, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = null;
    if (ctrl) {
      options = options || {};
      options.signal = ctrl.signal;
      timer = setTimeout(function () {
        ctrl.abort();
      }, timeoutMs);
    }
    return fetch(url, options)
      .then(function (res) {
        return parseApiJson(res).then(function (data) {
          return { res: res, data: data };
        });
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  async function parseCvFile(file) {
    if (!file) return;
    var input = $("cvFile");
    if (!isAllowedCvFile(file)) {
      setCvUploadStatus(cvFileTypeError(file), "err");
      return;
    }
    setCvUploadFileName(file.name);
    setCvUploadStatus("Claude lukee CV:stä…", "");
    var zone = $("cvUploadZone");
    if (zone) zone.style.pointerEvents = "none";
    try {
      var fd = new FormData();
      fd.append("file", file);
      var res = await fetch("/api/ai/bottityypit-cv-parse-file", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      var data = await parseApiJson(res);
      if (!res.ok) throw new Error(data.error || "CV:n luku epäonnistui");
      if (data.fields && Object.keys(data.fields).length) {
        var ok = applyCvPortfolioFields(data.fields);
        if (ok) {
          setCvUploadStatus("✓ CV luettu Claudella — tarkista teksti ja taidot", "ok");
          scheduleSave();
        } else {
          setCvUploadStatus(data.message || "CV:stä ei saatu riittävästi tietoa — täydennä käsin", "err");
        }
      } else {
        setCvUploadStatus(
          data.message ||
            "CV:stä ei voitu lukea tekstiä (skannattu PDF?) — liitä teksti käsin",
          "err"
        );
      }
    } catch (e) {
      setCvUploadStatus((e.message || "Lataus epäonnistui") + " — liitä teksti käsin", "err");
    } finally {
      if (zone) zone.style.pointerEvents = "";
      if (input) input.value = "";
    }
  }

  function wireCvUpload() {
    var input = $("cvFile");
    var zone = $("cvUploadZone");
    if (!input || !zone) return;
    input.addEventListener("change", function () {
      if (input.files && input.files[0]) parseCvFile(input.files[0]);
    });
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      zone.classList.add("drag");
    });
    zone.addEventListener("dragleave", function () {
      zone.classList.remove("drag");
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("drag");
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) parseCvFile(f);
    });
  }

  function syncPrompt() {
    var cvSnippet = $("cvText").value.trim();
    if (cvSnippet.length > 200) cvSnippet = cvSnippet.slice(0, 200) + "…";
    else if (!cvSnippet) cvSnippet = "—";
    var p = [
      "ROOLI:\n" + ($("role").value || "").trim(),
      "PERSOONALLISUUS:\n" + ($("personality").value || "").trim(),
      "KÄYTTÄYTYMINEN:\n" + ($("behavior").value || "").trim(),
      "RAJAT:\n" + ($("limits").value || "").trim(),
      "CV-DATA:\n" + cvSnippet,
      "TAIDOT:\n" + ($("skillsText").value || "").trim(),
    ].join("\n\n");
    var fp = $("fullPrompt");
    if (fp) fp.value = p;
    var wcEl = $("promptWc");
    if (wcEl) wcEl.textContent = wc(p) + " sanaa";
    var ct = $("chatTitle");
    if (ct) ct.textContent = $("botName").value.trim() || parseCvName() || "Uravalmentaja";
    var av = $("av");
    if (av) av.textContent = (parseCvName().charAt(0) || "?").toUpperCase();
  }

  function parseCvName() {
    var cv = $("cvText").value.trim();
    if (!cv) return "";
    var m = cv.match(/^([A-ZÅÄÖa-zåäö\s]+?)(?:\s*—|\s*-)/);
    return m ? m[1].trim() : cv.split("\n")[0].trim().slice(0, 40) || "Hakija";
  }

  function isLegacyDemoSnapshot(snap) {
    if (!snap || !snap.fields) return false;
    var cv = String(snap.fields.cvText || "");
    var job = String(snap.fields.jobPost || "");
    var skills = String(snap.fields.skillsText || "");
    var name = String(snap.fields.botName || "");
    var blob = cv + "\n" + job + "\n" + skills + "\n" + name;
    return (
      /aino\s+virtanen|aino-virtanen|aino\s*·/i.test(blob) ||
      /technova|customer success specialist/i.test(blob) ||
      /palveluarvosana\s*92\s*%|salesforce,\s*zendesk/i.test(blob) ||
      /b2c-asiakaspalvelu.*myynti/i.test(cv)
    );
  }

  function isLegacyDemoAnalysis(data) {
    if (!data) return false;
    var blob = JSON.stringify(data);
    return /technova|aino\s+virtanen|customer success specialist/i.test(blob);
  }

  function clearLegacyDemoFromDom() {
    var snap = { fields: collectFields(), trained: trained, analysisData: analysisData };
    if (!isLegacyDemoSnapshot(snap) && !isLegacyDemoAnalysis(analysisData)) return false;
    $("cvText").value = "";
    $("skillsText").value = "";
    $("jobPost").value = "";
    if (/aino/i.test(($("botName").value || "").trim())) $("botName").value = "";
    trained = false;
    analysisData = null;
    $("analysisEmpty").style.display = "block";
    $("analysisResult").style.display = "none";
    $("jobTitle").textContent = "Ei analyysiä vielä — kouluta botti ja liitä ilmoitus";
    syncPrompt();
    updateTrainStatus();
    renderSitePreview();
    return true;
  }

  function stripLegacyDemoSnapshot(snap) {
    if (!snap || !isLegacyDemoSnapshot(snap)) return snap;
    snap.fields.cvText = "";
    snap.fields.skillsText = "";
    snap.fields.jobPost = "";
    if (/aino/i.test(snap.fields.botName || "")) snap.fields.botName = "";
    snap.trained = false;
    snap.analysisData = null;
    snap.ts = Date.now();
    return snap;
  }

  function purgeLegacyDemoPersistence(serverSnap) {
    var cleared = clearLegacyDemoFromDom();
    if (cleared && serverSnap && isLegacyDemoSnapshot(serverSnap)) {
      saveStudio({ silent: true });
    }
    return cleared;
  }

  function bindFieldSync(el) {
    if (!el || el.dataset.studioSyncBound) return;
    el.dataset.studioSyncBound = "1";
    function onEdit() {
      syncPrompt();
      if (el.id === "cvText" || el.id === "skillsText" || el.id === "botName") {
        renderSitePreview();
      }
      scheduleSave();
    }
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
    el.addEventListener("keyup", onEdit);
  }

  function hasCvContent() {
    return wc($("cvText").value) >= 5;
  }

  function parseCvTagline() {
    var cv = $("cvText").value.trim();
    if (!cv) return "Lataa CV vasemmalta — portfolio täyttyy automaattisesti";
    var m = cv.match(/—\s*(.+?)(?:\n|$)/);
    if (m && m[1].trim()) return m[1].trim();
    return "Työnhakija · oma portfolio";
  }

  function renderEmptySitePreview() {
    $("siteUrl").textContent = "portfolio.fi";
    $("sitePreview").innerHTML =
      '<div class="site-hero">' +
      '<div class="photo">?</div><div>' +
      "<h2>Portfolio-esikatselu</h2>" +
      '<div class="tag">Lataa CV vasemmalta (PDF tai teksti) — näet mitä rekrytoija näkisi</div>' +
      '<div class="meta"><span class="pill warn">CV puuttuu</span><span class="pill">Generatiivinen · kupla alakulmassa</span></div></div></div>' +
      '<div class="site-banner"><strong>Ei vielä tietoja</strong>Tallenna CV ja taidot Kouluta-välilehdellä. Sitten esikatselu näyttää oikean nimen, taidot ja match-analyysin.</div>' +
      '<div class="site-cta"><span class="dot"></span> Aloita: Kouluta → lataa CV → Tallenna & kouluta</div>';
    $("av").textContent = "?";
    $("chatTitle").textContent = $("botName").value.trim() || "Uravalmentaja";
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
    if (!hasCvContent() && !trained && !analysisData) {
      renderEmptySitePreview();
      return;
    }
    var name = parseCvName() || "Hakija";
    var stats = parseCvStats();
    var skills = parseSkills();
    var initial = (name.charAt(0) || "?").toUpperCase();
    var slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    $("siteUrl").textContent = (slug || "oma") + ".portfolio.fi";

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
        '<div class="site-banner"><strong>Generatiivinen työnhakubottisi on valmiina</strong>Käytät sitä täällä alustalla. Liitä työpaikka vasemmalta nähdäksesi sopivuuden.</div>';
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
      '<div class="tag">' +
      esc(parseCvTagline()) +
      "</div>" +
      '<div class="meta">' +
      trainPill +
      analysisPill +
      '<span class="pill">Generatiivinen · kupla alakulmassa</span></div></div></div>' +
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
    $("chatTitle").textContent = $("botName").value.trim() || name || "Uravalmentaja";
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
      '%</div><div class="lbl">Fit score</div></div></div><div class="score-meta"><div class="t">' +
      (analysisData.score >= 70
        ? "Hyvä sopivuus — harkitse hakemista"
        : analysisData.score >= 45
          ? "Kohtalainen — paranna CV:tä ensin"
          : "Heikko sopivuus — tarkista vaatimukset") +
      '</div><div class="d">ATS: ' +
      analysisData.atsMatched.length +
      " osuu · " +
      analysisData.atsMissing.length +
      " puuttuu</div></div></div>" +
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
    var validationError = validateJobAnalysis();
    if (validationError) {
      setJobAnalyzeStatus(validationError, "err");
      if (!fromChat) alert(validationError);
      return;
    }
    if (!trained && hasCvContent()) {
      trained = true;
      updateTrainStatus();
    }
    if (!trained) {
      var msg = "Lisää CV ja paina Tallenna & kouluta ensin.";
      setJobAnalyzeStatus(msg, "err");
      alert(msg);
      return;
    }
    var job = $("jobPost").value.trim();

    var btn = $("analyzeBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Analysoidaan…";
    }
    setJobAnalyzeStatus("Claude analysoi sopivuutta — tämä voi kestää 15–30 s…", "wait");
    setSaveStatus("Analysoidaan työpaikkaa…", false);

    fetchJsonWithTimeout(
      "/api/ai/bottityypit-job-match",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvText: $("cvText").value,
          skillsText: $("skillsText").value,
          jobPost: job,
        }),
      },
      75000
    )
      .then(function (out) {
        if (!out.res.ok || !out.data.ok) throw new Error(out.data.error || "Analyysi epäonnistui");
        return out.data.analysis;
      })
      .then(function (analysis) {
        analysisData = analysis;
        renderAnalysisPanel();
        setJobAnalyzeStatus("Analyysi valmis — katso oikea paneeli", "ok");
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
            "Analysoin ilmoituksen CV:täsi vasten. Fit score on " +
              analysisData.score +
              " %. Katso portfolio-sivulta yhteenveto ja oikealta täydellinen analyysi."
          );
        }
        renderSitePreview();
        saveStudio({ silent: true });
        setSaveStatus("Analyysi valmis", true);
      })
      .catch(function (e) {
        var msg =
          e && e.name === "AbortError"
            ? "Analyysi kesti liian kauan — yritä uudelleen."
            : e.message || "Työpaikka-analyysi epäonnistui — yritä uudelleen.";
        setJobAnalyzeStatus(msg, "err");
        alert(msg);
        setSaveStatus("Analyysi epäonnistui", false);
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Analysoi sopivuus & ATS";
        }
      });
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

  function buildChatSystem() {
    syncPrompt();
    var parts = [$("fullPrompt").value || ""];
    if (analysisData) {
      parts.push(
        "VIIMEISIN TYÖPAIKKA-ANALYYSI:\n" +
          "Rooli: " +
          analysisData.jobName +
          "\nFit score: " +
          analysisData.score +
          "%\nATS osuu: " +
          analysisData.atsMatched.join(", ") +
          "\nATS puuttuu: " +
          analysisData.atsMissing.join(", ") +
          "\nParannukset: " +
          analysisData.improve.join("; ")
      );
    }
    var job = $("jobPost").value.trim();
    if (job) parts.push("LIITETTY TYÖPAIKKAILMOITUS:\n" + job.slice(0, 4000));
    parts.push("Vastaa suomeksi, lyhyesti ja käytännöllisesti. Älä keksi CV-tietoja.");
    return parts.filter(Boolean).join("\n\n");
  }

  function callStudioChat(userText) {
    var system = buildChatSystem();
    if (system.length > 12000) system = system.slice(0, 12000) + "\n…";
    return fetchJsonWithTimeout(
      "/api/ai/claude",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: system,
          messages: [{ role: "user", content: userText }],
          max_tokens: 900,
        }),
      },
      75000
    ).then(function (out) {
      if (!out.res.ok) {
        throw new Error(
          (out.data && (out.data.error || out.data.text)) ||
            "Yhteys tekoälyyn ei toiminut (" + out.res.status + ")"
        );
      }
      return String(out.data.text || "").trim();
    });
  }

  function setChatBusy(busy) {
    var inp = $("inp");
    var sendBtn = $("sendBtn");
    if (inp) inp.disabled = !!busy;
    if (sendBtn) sendBtn.disabled = !!busy;
  }

  function handleSendChat() {
    var inp = $("inp");
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;

    if (!trained && !hasCvContent()) {
      addBot("Lisää CV ja paina Tallenna & kouluta ensin Kouluta-välilehdellä.");
      return;
    }

    inp.value = "";
    userMsg(text);

    if (/vertaa|työpaikka|match|sopivuus/i.test(text) && plainLen($("jobPost").value) >= 30) {
      runAnalysis(true);
      return;
    }
    if (/cv|parann/i.test(text)) {
      addBotRich(
        "CV-parannukset",
        analysisData ? analysisData.improve.join("\n• ") : "Liitä työpaikka ja paina Analysoi ensin."
      );
      return;
    }
    if (/hakemus|saate|teksti/i.test(text)) {
      addBotRich(
        "Hakemusehdotus",
        analysisData ? analysisData.cover : "Liitä työpaikka ja paina Analysoi ensin."
      );
      return;
    }

    setChatBusy(true);
    var typing = document.createElement("div");
    typing.className = "bubble bot";
    typing.id = "chatTyping";
    typing.textContent = "Kirjoittaa…";
    $("msgs").appendChild(typing);
    $("msgs").scrollTop = 9999;

    callStudioChat(text)
      .then(function (reply) {
        var el = $("chatTyping");
        if (el) el.remove();
        addBot(reply || "En saanut vastausta — yritä uudelleen.");
      })
      .catch(function (e) {
        var el = $("chatTyping");
        if (el) el.remove();
        addBot((e.message || "Yhteys tekoälyyn epäonnistui") + " — yritä uudelleen.");
      })
      .finally(function () {
        setChatBusy(false);
        if (inp) inp.focus();
      });
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
        if (b.dataset.tab === "ai") syncPrompt();
      };
    });

    fieldIds().forEach(function (id) {
      bindFieldSync($(id));
    });

    if ($("jobPost")) {
      $("jobPost").addEventListener("input", function () {
        var err = validateJobAnalysis();
        if (!err && plainLen($("jobPost").value) >= 30) {
          setJobAnalyzeStatus("Valmis analysoitavaksi — paina Analysoi", "ok");
        } else if (plainLen($("jobPost").value) > 0 && plainLen($("jobPost").value) < 30) {
          setJobAnalyzeStatus("Liitä koko ilmoitus — teksti on vielä liian lyhyt", "err");
        } else {
          setJobAnalyzeStatus("", "");
        }
      });
    }

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
    if ($("sendBtn")) $("sendBtn").onclick = handleSendChat;
    if ($("inp")) {
      $("inp").addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendChat();
        }
      });
    }
    $("syncBtn").onclick = function () {
      syncPrompt();
      renderChips();
      renderSitePreview();
      saveStudio();
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
    loadUserId().then(function () {
      try {
        localStorage.removeItem("bottityypit-studio-v1");
        localStorage.removeItem(LOCAL_KEY);
      } catch (e) {
        /* ignore */
      }
      var serverRaw = null;
      if (window.BonusModule && typeof window.BonusModule.getEntry === "function") {
        serverRaw = window.BonusModule.getEntry("_studio");
      }
      var serverSnap = parseSnapshot(serverRaw);
      var best = pickBestSnapshot(serverRaw);
      wire();
      wireCvUpload();
      syncPrompt();
      if (best) restoreSnapshot(best);
      else syncPrompt();
      renderChips();
      if (!restored) {
        renderSitePreview();
        updateTrainStatus();
      }
      purgeLegacyDemoPersistence(serverSnap);
    });
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
