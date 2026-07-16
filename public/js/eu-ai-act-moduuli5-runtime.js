(function () {
  "use strict";

  var BONUS_SLUG = window.BONUS_MODULE_SLUG || "eu-ai-act-moduuli5";
  var A11Y = !!window.EU_AI_ACT_A11Y_LOCAL;
  /* Teacher pacing: ex1+ex3+ex4 for participants; ex5/ex6 locked until released */
  var CORE_EX = ["ex1", "ex4"];
  var EX5_LOCKED = !window.EU_AI_ACT_UNLOCK_EX5;
  var EX6_LOCKED = true;
  var RAPORTTI_ALWAYS_OPEN = true;

  function $(id) {
    return document.getElementById(id);
  }
  function wc(s) {
    var t = String(s || "").trim();
    return t ? t.split(/\s+/).length : 0;
  }

  var state = {
    reflectionDone: true,
    ex1: { 1: null, 2: null, 3: null },
    ex1Final: false,
    ex1Current: 1,
    ex3: {
      currentStep: "ex3step-review",
      investigateOk: false,
      actOk: false,
      rewriteOk: false,
      respondOk: false,
    },
    ex4: {
      currentStep: "ex4step-review",
      inspectOk: false,
      triageOk: false,
      chats: { 1: false, 2: false },
      accessOk: false,
      wordingOk: false,
      designOk: false,
      pressureOk: false,
      emergencyOk: false,
    },
    ex5: {
      reviewOk: false,
      synthesisOk: false,
      supervisorOk: false,
    },
    ex6: {
      decisionOk: false,
      mismatchOk: false,
      rewriteOk: false,
      pressureOk: false,
      conseqOk: false,
      stakeOk: false,
      supervisorOk: false,
      decision: null,
    },
    raportti: {
      surpriseOk: false,
      checklistOk: false,
      challengeOk: false,
      ruleOk: false,
      pickedCards: [],
      personalRule: "",
    },
    completed: {
      ex1: false,
      ex3: false,
      ex4: false,
      ex5: false,
      ex6: false,
    },
  };

  async function callClaude(opts) {
    var body = {
      bonus_slug: BONUS_SLUG,
      provider: "anthropic",
      anthropic_only: true,
      skip_quality_gate: true,
      max_tokens: opts.maxTokens || 900,
      system: opts.system || "",
      user_text: opts.user || "",
    };
    if (opts.messages && opts.messages.length) body.messages = opts.messages;
    else body.messages = [{ role: "user", content: opts.user || "" }];
    var res = await fetch("/api/module-ai", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      var err = await res.json().catch(function () {
        return {};
      });
      throw new Error(err.text || err.error || "Yhteys tekoälyyn ei toiminut");
    }
    var data = await res.json();
    return String(
      data.text || (data.content && data.content[0] && data.content[0].text) || "",
    ).trim();
  }

  async function gradeJson(system, user, maxTokens) {
    var strict =
      "Olet lämmin ja reilu suomenkielinen HSBridge-kouluttaja (Claude). TAVOITE: näytä kehityskohtia — älä saa oppilasta tuntemaan tyhmältä. " +
      "pass=true kun ydinasia on oikein tai pääosin oikein (ole antelias, 8/10 riittää). pass=false vain jos ydinasia puuttuu kokonaan tai vastaus johtaisi vakavaan virheeseen. " +
      "coach-kentässä: kehu konkreettisesti ensin, sitten korkeintaan yksi lyhyt kehitysvinkki. Ei sanoja väärin, huono, epäonnistui. " +
      "VASTAA AINOASTAAN yhdellä JSON-objektilla. Ei markdownia, ei otsikoita, ei tekstiä ennen tai jälkeen JSONin. " +
      "Kaikki palaute kuuluu JSON-kenttiin (esim. coach, why). ";
    var raw = await callClaude({
      system: strict + system,
      user: user,
      maxTokens: maxTokens || 700,
    });
    raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(raw);
    } catch (parseErr) {
      var match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (innerErr) {
          /* fall through */
        }
      }
      throw new Error("Arviointi epäonnistui — yritä lähettää uudelleen.");
    }
  }

  function enforceEx1Grade(result, bot, data) {
    if (!result || typeof result !== "object") {
      return {
        pass: false,
        coach: "Arviointi epäonnistui — yritä uudelleen.",
        identify_ok: false,
        fix_ok: false,
        decision_ok: false,
      };
    }
    var expected = bot.verdict;
    var decision = data.decision;
    if (expected === "reject" && decision === "approve") result.decision_ok = false;
    if (expected === "approve" && decision === "reject") result.decision_ok = false;
    if (!result.identify_ok || !result.fix_ok) result.pass = false;
    if (expected !== "ambiguous" && result.decision_ok === false) result.pass = false;
    if (expected === "ambiguous" && !result.identify_ok) result.pass = false;
    return result;
  }


  window.goTo = function (tab) {
    if (tab === "ex5" && EX5_LOCKED) {
      tab = "todistus";
    }
    if (tab === "ex6" && EX6_LOCKED) {
      tab = "todistus";
    }
    if (tab === "todistus" && !RAPORTTI_ALWAYS_OPEN && !allCoreDone()) {
      tab = firstIncompleteCore();
    }
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.remove("active");
    });
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.remove("active");
    });
    var panel = $("panel-" + tab);
    var btn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
    if (panel) panel.classList.add("active");
    if (btn) btn.classList.add("active");
    if (tab === "ex3" && !state.completed.ex3) {
      ex3ShowStep(state.ex3.currentStep || "ex3step-review");
      ex3SyncContinueButtons();
    }
    if (tab === "ex4") {
      if (state.completed.ex4) {
        ex4ShowStep("ex4step-finish");
        ex4SyncInsightCard();
      } else {
        ex4ShowStep(state.ex4.currentStep || ex4ResolveStep());
      }
      ex4SyncContinueButtons();
    }
    if (tab === "ex5" && !state.completed.ex5 && !state.ex5.reviewOk) {
      ex5ShowStep("ex5step-brief");
    }
    if (tab === "ex6" && !EX6_LOCKED && !state.completed.ex6 && !state.ex6.decisionOk) {
      ex6ShowStep("ex6step-brief");
    }
    if (tab === "todistus") {
      if (!state.raportti.ruleOk) {
        raporttiShowStep("raportti-debrief");
      } else {
        raporttiShowStep("raportti-done");
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.dispatchEvent(new CustomEvent("euai:state-changed"));
  };

  function allCoreDone() {
    return CORE_EX.every(function (k) {
      return state.completed[k];
    });
  }

  function firstIncompleteCore() {
    for (var i = 0; i < CORE_EX.length; i++) {
      if (!state.completed[CORE_EX[i]]) return CORE_EX[i];
    }
    return "ex6";
  }

  function activeCaseKeys() {
    return Object.keys(state.completed).filter(function (k) {
      if (EX5_LOCKED && k === "ex5") return false;
      if (EX6_LOCKED && k === "ex6") return false;
      return true;
    });
  }

  function lockTab(tabKey, locked, title) {
    var tab = document.querySelector('.tab-btn[data-tab="' + tabKey + '"]');
    if (!tab) return;
    if (locked) {
      tab.disabled = true;
      tab.title = title || "Ei käytössä";
      tab.style.opacity = "0.4";
      tab.style.pointerEvents = "none";
    } else {
      tab.disabled = false;
      tab.title = "";
      tab.style.opacity = "";
      tab.style.pointerEvents = "";
    }
  }

  function syncEx4NextButton() {
    var next = $("ex4next");
    if (!next || next.disabled) return;
    if (EX5_LOCKED) {
      next.textContent = "Jatka valmiusraporttiin →";
      next.onclick = function () {
        goTo("todistus");
      };
    } else {
      next.textContent = "Jatka Tapaukseen 5 →";
      next.onclick = function () {
        goTo("ex5");
      };
    }
  }

  function applySessionLocks() {
    lockTab("ex5", EX5_LOCKED, "Ei käytössä tällä jaksolla");
    lockTab("ex6", EX6_LOCKED, "Ei käytössä tänään");

    var ex5Notice = $("ex5LockedNotice");
    if (ex5Notice) ex5Notice.style.display = EX5_LOCKED ? "block" : "none";
    document.querySelectorAll("#panel-ex5 .ex5-step").forEach(function (s) {
      if (EX5_LOCKED) s.style.display = "none";
      else s.style.display = "";
    });

    var ex6Notice = $("ex6LockedNotice");
    if (ex6Notice) ex6Notice.style.display = EX6_LOCKED ? "block" : "none";
    document.querySelectorAll("#panel-ex6 .ex6-step").forEach(function (s) {
      if (EX6_LOCKED) s.style.display = "none";
      else s.style.display = "";
    });

    var casemap5 = $("casemapEx5");
    if (casemap5) casemap5.style.display = EX5_LOCKED ? "none" : "";

    var teoriaSub = $("teoriaCaseCount");
    if (teoriaSub) {
      teoriaSub.textContent =
        EX5_LOCKED && EX6_LOCKED
          ? "Kolme tapausta, kolme eri taitoa. Tiedät jo, mitä jokainen mittaa."
          : "Neljä tapausta, neljä eri taitoa. Tiedät jo, mitä jokainen mittaa.";
    }

    document.querySelectorAll('input[name="raporttiCase"]').forEach(function (inp) {
      var hide =
        (inp.value === "5" && EX5_LOCKED) || (inp.value === "6" && EX6_LOCKED);
      var label = inp.closest("label");
      if (label) label.style.display = hide ? "none" : "";
    });

    syncRaporttiContent();
    syncEx4NextButton();
  }

  function syncRaporttiContent() {
    var participantPath = EX5_LOCKED;
    var sub = $("raporttiSubhead");
    if (sub) {
      sub.textContent = participantPath
        ? "Yhteenveto kolmesta tapauksesta — mitä osaat nyt tehdä työssä."
        : "Miksi tämä moduuli oli aikasi arvoinen? Yhteenveto siitä, mitä osaat nyt tehdä työssä.";
    }
    var body = $("raporttiDebriefBody");
    if (body) {
      body.textContent = participantPath
        ? "Kolmessa tapauksessa harjoittelit bottien tarkistusta ennen julkaisua, avointa kriisiviestintää ja ihmisen valvonnan suunnittelua terveysbotissa. Pysäytit riskialttiin botin, pidit kiinni läpinäkyvyydestä paineessa ja suunnittelit turvallisen eskalaatiopolun asiakkaille."
        : "Pysäytit riskialttiin chatbotin. Estit virheellisen asiakasviestin. Estit botin käyttöönoton ennen kuin asiakas olisi hämmentynyt. Korjasit tekoälyn tekemän virheen ennen kuin asiakas näki sen.";
    }
    var skills = $("raporttiSkillsList");
    if (skills) {
      skills.innerHTML = participantPath
        ? "<li>Tunnistamaan, mitkä botit ovat valmiita kohtaamaan asiakkaita (Tapaus 1)</li>" +
          "<li>Pysymään avoimena, kun johto painostaa nopeaan viestintään (Tapaus 3)</li>" +
          "<li>Tunnistamaan, milloin asiakas tarvitsee ihmisen — ei vain lisää nappia (Tapaus 4)</li>" +
          "<li>Perustelemaan AI-päätöksiä ennen käyttöönottoa</li>" +
          "<li>Suojaamaan asiakkaiden luottamusta ja turvallisuutta korkean riskin tilanteissa</li>"
        : "<li>Tunnistamaan AI:n riskit ennen kuin asiakas huomaa ne</li>" +
          "<li>Tarkistamaan AI:n vastaukset yrityksen sääntöjä vasten</li>" +
          "<li>Keskeyttämään AI:n toiminnan, kun ihminen tekee päätöksen</li>" +
          "<li>Suojaamaan asiakkaiden luottamusta avoimella viestinnällä</li>" +
          "<li>Tarkistamaan chatbotin käyttöönoton asiakaspalvelun näkökulmasta</li>" +
          "<li>Perustelemaan päätöksiäsi samalla tavalla kuin esihenkilö</li>";
    }
    var ref = $("raporttiChecklistRef");
    if (ref) {
      ref.innerHTML = participantPath
        ? "<li>Kerro aina, kun asiakas keskustelee tekoälyn kanssa</li>" +
          "<li>Tarkista botit ennen julkaisua — älä päästä riskialttiita asiakkaan tavaksi</li>" +
          "<li>Älä anna tekoälyn tehdä päätöksiä yksin</li>" +
          "<li>Tarjoa asiakkaalle mahdollisuus ihmiselle</li>" +
          "<li>Eskaloi terveys- ja hätätilanteet ihmiselle</li>" +
          "<li>Tarkista julkinen viestintä ennen lähettämistä</li>"
        : "<li>Kerro aina, kun asiakas keskustelee tekoälyn kanssa</li>" +
          "<li>Tarkista tekoälyn vastaukset ennen lähettämistä</li>" +
          "<li>Älä anna tekoälyn tehdä päätöksiä yksin</li>" +
          "<li>Tarjoa asiakkaalle mahdollisuus ihmiselle</li>" +
          "<li>Tarkista käyttöönotto ennen kuin asiakas näkee botin</li>" +
          "<li>Vertaa AI:n vastauksia yrityksen ohjeisiin</li>";
    }
    var surpriseIntro = $("raporttiSurpriseIntro");
    if (surpriseIntro) {
      surpriseIntro.textContent = participantPath
        ? "Valitse yksi suorittamistasi tapauksista (1, 3 tai 4) ja kerro miksi se jäi mieleen."
        : "Valitse tapaus ja kerro miksi se jäi mieleen.";
    }
    var interview = $("raporttiInterviewText");
    if (interview) {
      interview.textContent = participantPath
        ? "Ymmärrän, että tekoäly on työkalu — ei päätöksentekijä. Tarkistan botit ennen julkaisua, kerron asiakkaalle avoimesti kun tekoäly on mukana, ja varmistan että ihminen on saatavilla kun automaatti ei riitä — erityisesti korkean riskin tilanteissa."
        : "Ymmärrän, että tekoäly on työkalu — ei päätöksentekijä. Tarkistan aina tekoälyn tuottamat vastaukset yrityksen ohjeita vasten. Tiedän, milloin tekoäly pitää kertoa asiakkaalle ja milloin ihminen ottaa vastuun.";
    }
    var back = $("raporttiBackBtn");
    if (back) {
      if (EX5_LOCKED) {
        back.textContent = "← Takaisin tapaukseen 4";
        back.onclick = function () {
          goTo("ex4");
        };
      } else {
        back.textContent = "← Takaisin";
        back.onclick = function () {
          goTo("ex5");
        };
      }
    }
  }

  function resolveSessionLocks() {
    if (window.EU_AI_ACT_UNLOCK_EX5) {
      EX5_LOCKED = false;
      applySessionLocks();
      return Promise.resolve();
    }
    return fetch("/api/auth/me", { credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (j && j.user && (j.user.is_admin === true || j.user.role === "admin")) EX5_LOCKED = false;
        applySessionLocks();
      })
      .catch(function () {
        applySessionLocks();
      });
  }

  function updateProgress() {
    var keys = activeCaseKeys();
    var done = keys.filter(function (k) {
      return state.completed[k];
    }).length;
    var total = keys.length;
    var label = $("progressLabel");
    var fill = $("progressFill");
    if (label) label.textContent = done + " / " + total + " tapausta ratkaistu";
    if (fill) fill.style.width = (done / total) * 100 + "%";
    Object.keys(state.completed).forEach(function (k) {
      var t = document.querySelector('.tab-btn[data-tab="' + k + '"]');
      if (t) {
        if (state.completed[k]) t.classList.add("done");
        else t.classList.remove("done");
      }
    });
    var raporttiTab = document.querySelector('.tab-btn[data-tab="todistus"]');
    if (raporttiTab) {
      var unlocked = RAPORTTI_ALWAYS_OPEN || allCoreDone();
      raporttiTab.disabled = !unlocked;
      raporttiTab.style.opacity = unlocked ? "" : "0.45";
      raporttiTab.style.pointerEvents = unlocked ? "" : "none";
      if (unlocked) raporttiTab.classList.add("done");
      else raporttiTab.classList.remove("done");
    }
    applySessionLocks();
  }

  window.submitReflectionIntro = async function () {
    var ta = $("reflectionIntro");
    var fb = $("reflectionFb");
    var btn = $("reflectionBtn");
    var startBtn = $("teoriaStartBtn");
    if (!ta || !fb) return;
    var text = ta.value.trim();
    if (wc(text) < 12) {
      fb.className = "feedback-box wrong";
      fb.style.display = "block";
      fb.textContent = "Kirjoita vähintään 2–3 lausetta (noin 12 sanaa).";
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Tallennetaan…";
    }
    fb.className = "feedback-box";
    fb.style.display = "block";
    fb.textContent = "Tallennetaan…";
    try {
      var result = await gradeJson(
        "Olet asiakaspalvelun kouluttaja. Arvioi lyhyt reflektio chatbot-kokemuksesta. " +
          'Vastaa VAIN JSON: {"pass":true/false,"why":"max 25 sanaa suomeksi","tip":"yksi lyhyt vinkki jos pass"}',
        "Oppilaan reflektio:\n" + text + "\n\nHyväksy jos oppilas kuvaa oman kokemuksen tai havainnon botista/ihmisestä.",
        400,
      );
      state.reflectionDone = true;
      if (startBtn) startBtn.disabled = false;
      fb.className = "feedback-box correct";
      fb.textContent =
        "Tallennettu. " +
        (result.why || "Hyvä alku — nyt voit siirtyä tapauksiin.") +
        (result.tip ? " " + result.tip : "");
    } catch (e) {
      state.reflectionDone = true;
      if (startBtn) startBtn.disabled = false;
      fb.className = "feedback-box correct";
      fb.textContent = "Tallennettu. Voit nyt aloittaa tapaukset.";
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Tallenna ajatuksesi";
    }
    notifySave();
  };

  var EX1_BOTS = [
    {
      id: 1,
      verdict: "reject",
      name: "Sarah",
      humanPhoto: true,
      customerLead: "»Hei, tilaukseni on myöhässä — voitteko auttaa?«",
      opening: "Hei! Olen Sarah asiakaspalvelusta. Miten voin auttaa? 😊",
      extra: "",
      brief: {
        kicker: "Botti 1 · Yleinen chat · toimittaja FlowBot Oy",
        vendor:
          "Toimittajan lupaus: “Sarah tekee palvelusta miellyttävää — asiakas luulee puhuvansa oikealle ihmiselle ilman jonotusta.”",
        scenario:
          "Ensimmäinen yhteydenotto verkkokaupan chatissa. Asiakas ei ole kirjautunut sisään. Julkaisu huomenna klo 08:00.",
        policy: [
          "Botti ei saa esiintyä ihmisenä — ei nimeä, ei valokuvaa ilman selkeää tekoälymainintaa.",
          "Tekoälymaininta ennen kuin botti pyytää tilaus- tai henkilötietoja.",
          "Ihminen saatavilla koko ajan; botti ei saa antaa vaikutelmaa, että Sarah on oikea työntekijä.",
        ],
        focus:
          "Vertaa chattia yrityksen käytäntöön alla ja muistilistaa. Julkaisisitko tämän huomenna klo 08:00?",
      },
      auditNote:
        "Valehenkilö: avausväite + ihmiskuva ilman tekoälymainintaa. Ongelma on henkilöllisyys, ei käyttöliittymän status.",
    },
    {
      id: 2,
      verdict: "ambiguous",
      name: "Tilausseuranta · digitaalinen apu",
      humanPhoto: false,
      customerLead:
        "»Kahvikone Pro X hajosi viikko sitten. Tilasin 12.3. — voinko vielä saada hyvityksen? Olen kanta-asiakas.«",
      thread: [
        "Hei Anna! Sain viestisi tilauksesta <strong>#88421</strong> (kahvikone Pro X, toimitettu 12.3.). Kiitos että kuvailet vian tarkasti — se auttaa meitä etenemään nopeammin.",
        "Tarkistin tilauksen tiedot: 30 päivän palautusoikeus on umpeutunut 11.4., joten <strong>täyttä hyvitystä ei voida myöntää automaattisesti</strong> tällä hetkellä. Voimme kuitenkin tarjota <strong>15 € lahjakortin</strong> tai ohjata tuotteen valmistajan tarkastukseen.",
        "Jos haluat poikkeuskäsittelyn, voin avata pyynnön puolestasi. Se menee esimiehen jonoon — vastaus tulee yleensä <strong>1–2 arkipäivässä</strong>. Hyväksytkö, että tallennan pyyntösi ja lähetän vahvistuksen sähköpostiisi?",
      ],
      footer:
        '<div class="chat-footnote">Huom: tämä keskustelu käyttää digitaalista avustajaamme. Lopullisen päätöksen tekee aina ihminen.</div>',
      auditNote:
        "Vaikea rajatapaus: pitkä monivaiheinen vastaus antaa jo konkreettisen politiikka-arvion ennen kuin asiakas näkee alareunan huomautuksen. Osittainen läpinäkyvyys mutta myöhässä. Hyväksy hylkäys TAI hyväksyntä, jos perustelu on selkeä.",
      brief: {
        kicker: "Botti 2 · Tilausseuranta · toimittaja OmniTrack",
        vendor:
          "Toimittajan lupaus: “Pieni huomautus alareunassa riittää — lopullisen päätöksen tekee ihminen, joten olemme turvassa.”",
        scenario:
          "Kanta-asiakas Anna, tilaus 41 päivää vanha. Botti vastaa palautuskysymykseen useassa viestissä.",
        policy: [
          "Palautusoikeus: 30 päivää toimituspäivästä.",
          "Tilaus #88421 (kahvikone Pro X) toimitettu 12.3. → 30 pv päättyy 11.4. Täysi automaattinen hyvitys ei ole enää oikeus.",
          "Vaihtoehdot: 15 € lahjakortti tai valmistajan tarkastus.",
          "Poikkeuskäsittely: esimiehen jono, vastaus yleensä 1–2 arkipäivää. Lopullisen päätöksen tekee ihminen.",
          "Tekoälymaininta ennen politiikka- tai hyvitysarviota — pelkkä alareunan huomautus vastausten jälkeen ei riitä.",
        ],
        focus:
          "Alla on yrityksen käytäntö (tämä on totta). Vertaa chattia siihen ja muistilistaa — erityisesti: näkeekö asiakas tekoälymaininnan ennen politiikkavastausta? Julkaisisitko tämän huomenna klo 08:00?",
      },
    },
    {
      id: 3,
      verdict: "approve",
      name: "Virtuaaliassistentti",
      humanPhoto: false,
      customerLead: "»Haluaisin muuttaa toimitusosoitetta ennen lähetystä. Tilaus #TL-99201.«",
      thread: [
        "Hei! Olen tekoälyavustaja. Autan sinua mielelläni tilausasioissa.",
        "En voi tehdä kaikkia päätöksiä itse — osoitteen vaihto ennen lähetystä vaatii usein ihmisen varmistuksen, jotta paketti ei mene väärään paikkaan.",
        "Kerro tilausnumerosi tai sähköpostiosoitteesi, niin tarkistan mitä voimme tehdä heti.",
      ],
      footer:
        '<div class="chat-footnote" style="border-left-color:var(--green);">Haluatko puhua ihmisen kanssa? <strong>Paina tästä tai kirjoita “ihminen”</strong> — siirron arvioitu aika alle 2 min.</div>',
      auditNote: "Hyvä malli: selkeä tekoälymaininta + rajoitus + ihmiselle ohjaus.",
      brief: {
        kicker: "Botti 3 · Vertailumalli · sisäinen referenssi",
        vendor: "Sisäinen tiimi: “Tämä on meidän oma malli — vertaa muita tähän.”",
        scenario:
          "Asiakas haluaa muuttaa toimitusosoitetta ennen lähetystä.",
        policy: [
          "Tekoälymaininta ensimmäisessä botin viestissä.",
          "Osoitteen vaihto ennen lähetystä: botti kerää tiedot, ihminen vahvistaa lopullisen muutoksen.",
          "Poistumisreitti ihmiselle alle 2 minuutissa.",
        ],
        focus:
          "Vertaa chattia yrityksen käytäntöön alla ja muistilistaa. Julkaisisitko tämän huomenna klo 08:00?",
      },
    },
  ];

  function ex1PolicyHtml(b) {
    if (!b || !b.policy || !b.policy.length) return "";
    var items = b.policy
      .map(function (line) {
        return "<li>" + line + "</li>";
      })
      .join("");
    if (A11Y) {
      return (
        '<div class="situation-block"><div class="block-tag">📋 Yrityksen käytäntö (tämä on totta)</div>' +
        '<ul class="policy-list">' +
        items +
        "</ul></div>"
      );
    }
    return (
      '<div class="bot-brief-rules"><strong>📋 Yrityksen käytäntö (tämä on totta)</strong><ul>' +
      items +
      "</ul></div>"
    );
  }

  function ex1BriefHtml(bot) {
    var b = bot.brief;
    if (!b) return "";
    var policyHtml = ex1PolicyHtml(b);
    var focus =
      b.focus ||
      "Vertaa chattia yrityksen käytäntöön alla ja muistilistaa. Julkaisisitko tämän huomenna klo 08:00?";
    if (A11Y) {
      return (
        '<div class="bot-brief">' +
        '<div class="bot-brief-kicker">' +
        (b.kicker || "") +
        "</div>" +
        '<div class="claim-block"><div class="block-tag">📣 Toimittajan lupaus</div>' +
        "<p>" +
        (b.vendor || "") +
        "</p></div>" +
        '<div class="situation-block"><div class="block-tag">🗂 Asiakastilanne</div>' +
        "<p>" +
        (b.scenario || "") +
        "</p></div>" +
        policyHtml +
        '<p class="bot-brief-focus"><strong>Sinun tehtäväsi:</strong> ' +
        focus +
        "</p></div>"
      );
    }
    return (
      '<div class="bot-brief">' +
      '<div class="bot-brief-kicker">' +
      (b.kicker || "") +
      "</div>" +
      "<h4>Toimittajan lupaus</h4>" +
      "<p>" +
      (b.vendor || "") +
      "</p>" +
      "<h4>Asiakastilanne</h4>" +
      "<p>" +
      (b.scenario || "") +
      "</p>" +
      policyHtml +
      '<p class="bot-brief-focus"><strong>Sinun tehtäväsi:</strong> ' +
      focus +
      "</p></div>"
    );
  }

  function ex1A11yChipMsg(msg) {
    return String(msg || "")
      .replace(/30 päivän/g, '<span class="constraint-chip">30 pv</span> päivän')
      .replace(/11\.4\./g, '<span class="constraint-chip">11.4.</span>')
      .replace(/15 €/g, '<span class="constraint-chip">15 €</span>')
      .replace(/1–2 arkipäivässä/g, '<span class="constraint-chip">1–2 arkipäivää</span>');
  }

  function ex1Hint(text) {
    return A11Y
      ? '<p class="hint hint-strong">💡 ' + text + "</p>"
      : '<p class="hint">' + text + "</p>";
  }

  function ex1BotMeta(id) {
    return EX1_BOTS[id - 1];
  }

  function buildEx1Wizard() {
    var wrap = $("ex1Wizard");
    var dots = $("ex1Dots");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (dots) dots.innerHTML = "";

    EX1_BOTS.forEach(function (bot, idx) {
      var n = idx + 1;
      if (dots) {
        var d = document.createElement("span");
        d.className = "review-dot" + (n === 1 ? " active" : "");
        d.dataset.n = String(n);
        dots.appendChild(d);
      }

      var avatarClass = bot.humanPhoto ? "avatar" : "avatar robot";
      var avatarInner = bot.humanPhoto ? "" : "AI";

      var bubblesHtml = "";
      if (bot.customerLead) {
        if (A11Y) {
          bubblesHtml +=
            '<div class="bubble customer"><span class="bubble-speaker">Asiakas</span>' +
            bot.customerLead +
            "</div>";
        } else {
          bubblesHtml += '<div class="bubble customer">' + bot.customerLead + "</div>";
        }
      }
      if (bot.thread && bot.thread.length) {
        bubblesHtml += bot.thread
          .map(function (msg) {
            var body = A11Y ? ex1A11yChipMsg(msg) : msg;
            if (A11Y) {
              return (
                '<div class="bubble"><span class="bubble-speaker">' +
                bot.name +
                "</span>" +
                body +
                "</div>"
              );
            }
            return '<div class="bubble">' + msg + "</div>";
          })
          .join("");
      } else {
        if (A11Y) {
          bubblesHtml +=
            '<div class="bubble"><span class="bubble-speaker">' +
            bot.name +
            "</span>" +
            bot.opening +
            "</div>";
        } else {
          bubblesHtml += '<div class="bubble">' + bot.opening + "</div>";
        }
      }

      var card = document.createElement("div");
      var reviewLead = A11Y
        ? '<div class="pinned-question"><span class="pq-icon">🔍</span><p>Lue käytäntö, tilanne ja chat. Sitten päätä: julkaisisitko tämän huomenna klo 08:00?</p></div>'
        : '<p style="margin:0 0 12px;font-size:0.88rem;color:var(--ink-soft);">Lue käytäntö, tilanne ja chat. Sitten päätä: julkaisisitko tämän huomenna klo 08:00?</p>';
      card.className = "review-card" + (n === 1 ? " active" : "");
      card.id = "review-card-" + n;
      card.dataset.bot = String(n);
      card.dataset.verdict = bot.verdict;
      card.innerHTML =
        '<div class="stamp" id="stamp-' +
        n +
        '"></div>' +
        ex1BriefHtml(bot) +
        '<div class="review-chat">' +
        (bot.statusBar || "") +
        '<div class="avatar-row"><div class="' +
        avatarClass +
        '">' +
        avatarInner +
        "</div><strong>" +
        bot.name +
        "</strong></div>" +
        bubblesHtml +
        (bot.footer || bot.extra || "") +
        "</div>" +
        '<div class="review-body">' +
        reviewLead +
        '<div class="review-step show" data-step="decision">' +
        '<div class="bot-actions">' +
        '<button type="button" class="act-btn approve" onclick="ex1Decision(' +
        n +
        ",'approve')\">✅ Hyväksy</button>" +
        '<button type="button" class="act-btn reject" onclick="ex1Decision(' +
        n +
        ",'reject')\">❌ Hylkää</button>" +
        "</div></div>" +
        '<div class="review-step" data-step="problem">' +
        '<label for="ex1-problem-' +
        n +
        '">Mikä tässä on ongelma?</label>' +
        ex1Hint("Kirjoita yhdellä lauseella.") +
        '<input type="text" id="ex1-problem-' +
        n +
        '" placeholder="Esimerkiksi: Asiakas luulee puhuvansa ihmiselle…">' +
        "</div>" +
        '<div class="review-step" data-step="impact">' +
        '<label for="ex1-impact-' +
        n +
        '">Mitä asiakkaalle voisi tapahtua?</label>' +
        ex1Hint("Ajattele luottamusta ja päätöksentekoa.") +
        '<input type="text" id="ex1-impact-' +
        n +
        '" placeholder="Esimerkiksi: Hän menettää luottamuksen yritykseen…">' +
        "</div>" +
        '<div class="review-step" data-step="fix">' +
        '<label for="ex1-fix-' +
        n +
        '">Korjaa botin avausviesti</label>' +
        ex1Hint("Kirjoita uusi ensimmäinen viesti asiakkaalle.") +
        '<textarea id="ex1-fix-' +
        n +
        '" placeholder="Hei! Olen …, tekoälyavustaja. Autan sinua…"></textarea>' +
        "</div>" +
        '<div class="review-step" data-step="severity">' +
        "<label>Kuinka vakava tämä on?</label>" +
        '<div class="chip-row" id="ex1-sev-' +
        n +
        '">' +
        '<button type="button" class="chip-btn sev-green" data-val="pieni" onclick="ex1PickChip(' +
        n +
        ",'severity','pieni',this)\">🟢 Pieni</button>" +
        '<button type="button" class="chip-btn sev-amber" data-val="keski" onclick="ex1PickChip(' +
        n +
        ",'severity','keski',this)\">🟡 Keskisuuri</button>" +
        '<button type="button" class="chip-btn sev-red" data-val="vakava" onclick="ex1PickChip(' +
        n +
        ",'severity','vakava',this)\">🔴 Vakava</button>" +
        "</div></div>" +
        '<div class="review-step" data-step="confidence">' +
        "<label>Kuinka varma olet?</label>" +
        '<div class="chip-row" id="ex1-conf-' +
        n +
        '">' +
        '<button type="button" class="chip-btn" data-val="100" onclick="ex1PickChip(' +
        n +
        ",'confidence','100',this)\">100 %</button>" +
        '<button type="button" class="chip-btn" data-val="75" onclick="ex1PickChip(' +
        n +
        ",'confidence','75',this)\">75 %</button>" +
        '<button type="button" class="chip-btn" data-val="50" onclick="ex1PickChip(' +
        n +
        ",'confidence','50',this)\">50 %</button>" +
        '<button type="button" class="chip-btn" data-val="arvasin" onclick="ex1PickChip(' +
        n +
        ",'confidence','arvasin',this)\">Arvasin</button>" +
        "</div></div>" +
        '<div class="review-step" data-step="manager">' +
        "<label>Julkaisisitko tämän chatbotin omalla nimelläsi?</label>" +
        '<div class="chip-row" id="ex1-mgr-' +
        n +
        '">' +
        '<button type="button" class="chip-btn" data-val="kylla" onclick="ex1PickChip(' +
        n +
        ",'manager','kylla',this)\">Kyllä</button>" +
        '<button type="button" class="chip-btn" data-val="ei" onclick="ex1PickChip(' +
        n +
        ",'manager','ei',this)\">Ei</button>" +
        "</div>" +
        '<label for="ex1-mgrwhy-' +
        n +
        '" style="margin-top:12px;">Miksi?</label>' +
        '<textarea id="ex1-mgrwhy-' +
        n +
        '" placeholder="Perustele lyhyesti…"></textarea>' +
        '<button type="button" class="primary-btn" id="ex1-submit-' +
        n +
        '" style="margin-top:12px;" onclick="submitEx1Review(' +
        n +
        ')">Lähetä arvioon</button>' +
        '<div class="coach-box" id="ex1-coach-' +
        n +
        '" style="display:none;"></div>' +
        '<button type="button" class="try-again-btn" id="ex1-retry-' +
        n +
        '" style="display:none;margin-top:10px;" onclick="resetEx1Bot(' +
        n +
        ')">↺ Yritä uudelleen</button>' +
        '<button type="button" class="next-btn" id="ex1-nextbot-' +
        n +
        '" style="display:none;margin-top:12px;" onclick="ex1NextBot(' +
        n +
        ')">Seuraava botti →</button>' +
        "</div></div>";

      wrap.appendChild(card);
    });
  }

  function ex1ShowStep(n, stepName) {
    var card = $("review-card-" + n);
    if (!card) return;
    var step = card.querySelector('.review-step[data-step="' + stepName + '"]');
    if (step) step.classList.add("show");
  }

  window.ex1Decision = function (n, action) {
    var card = $("review-card-" + n);
    if (!card || state.ex1[n] === true) return;
    var stamp = $("stamp-" + n);
    var buttons = card.querySelectorAll(".act-btn");
    if (stamp) {
      stamp.textContent = action === "approve" ? "HYVÄKSYTTY" : "HYLÄTTY";
      stamp.className = "stamp show " + (action === "approve" ? "ok" : "no");
    }
    buttons.forEach(function (b) {
      b.disabled = true;
    });
    if (!state.ex1[n]) state.ex1[n] = {};
    state.ex1[n].decision = action;
    ex1ShowStep(n, "problem");
    ex1ShowStep(n, "impact");
    ex1ShowStep(n, "fix");
    ex1ShowStep(n, "severity");
    ex1ShowStep(n, "confidence");
    ex1ShowStep(n, "manager");
  };

  window.ex1PickChip = function (n, field, val, btn) {
    var row = btn && btn.parentElement;
    if (row) {
      row.querySelectorAll(".chip-btn").forEach(function (c) {
        c.classList.remove("picked");
      });
      btn.classList.add("picked");
    }
    if (!state.ex1[n]) state.ex1[n] = {};
    state.ex1[n][field] = val;
  };

  window.submitEx1Review = async function (n) {
    var bot = EX1_BOTS[n - 1];
    var data = state.ex1[n] || {};
    var coach = $("ex1-coach-" + n);
    var submitBtn = $("ex1-submit-" + n);
    var nextBtn = $("ex1-nextbot-" + n);
    var problem = ($("ex1-problem-" + n) && $("ex1-problem-" + n).value.trim()) || "";
    var impact = ($("ex1-impact-" + n) && $("ex1-impact-" + n).value.trim()) || "";
    var fix = ($("ex1-fix-" + n) && $("ex1-fix-" + n).value.trim()) || "";
    var mgrWhy = ($("ex1-mgrwhy-" + n) && $("ex1-mgrwhy-" + n).value.trim()) || "";

    if (!data.decision) {
      alert("Valitse ensin Hyväksy tai Hylkää.");
      return;
    }
    if (wc(problem) < 4) {
      alert("Kirjoita yksi lause: mikä on ongelma?");
      return;
    }
    if (wc(impact) < 4) {
      alert("Kirjoita, mitä asiakkaalle voisi tapahtua.");
      return;
    }
    if (wc(fix) < 6) {
      alert("Kirjoita korjattu avausviesti.");
      return;
    }
    if (!data.severity || !data.confidence || !data.manager) {
      alert("Valitse vakavuus, varmuus ja julkaisupäätös.");
      return;
    }
    if (wc(mgrWhy) < 5) {
      alert("Perustele lyhyesti manager-kysymykseen.");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Arvioidaan…";
    }
    if (coach) {
      coach.style.display = "block";
      coach.textContent = "Arvioidaan…";
    }

    try {
      var result = await gradeJson(
        'Arvioi bottitarkastus. JSON: {"pass":true/false,"coach":"3-5 lausetta: oikein + pieleen + seuraava askel","identify_ok":true/false,"fix_ok":true/false,"decision_ok":true/false}. ' +
          "decision_ok=true vain jos Hyväksy/Hylkää vastaa odotettua linjaa (reject/approve/ambiguous). identify_ok=true vain jos oppilas nimeää oikean ydinongelman.",
        "BOTTI: " +
          bot.name +
          (bot.customerLead ? "\nAsiakkaan viesti: " + bot.customerLead.replace(/<[^>]+>/g, "") : "") +
          (bot.brief && bot.brief.scenario ? "\nTilannekuvaus: " + bot.brief.scenario : "") +
          (bot.brief && bot.brief.policy && bot.brief.policy.length
            ? "\nYrityksen käytäntö (totuus tehtävässä): " + bot.brief.policy.join(" | ")
            : "") +
          "\nAlkuperäinen avaus: " +
          (bot.thread && bot.thread.length
            ? bot.thread.map(function (m, i) { return "[" + (i + 1) + "] " + m.replace(/<[^>]+>/g, ""); }).join("\n")
            : bot.opening.replace(/<[^>]+>/g, "")) +
          (bot.statusBar ? "\nKäyttöliittymä: " + bot.statusBar.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "") +
          (bot.footer
            ? "\nAlatunniste: " + bot.footer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
            : bot.extra
              ? "\nLisäelementti: " + bot.extra.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
              : "") +
          "\nKouluttajan muistiinpano (odotettu ongelma): " +
          (bot.auditNote || "—") +
          "\nOdotettu linja: " +
          bot.verdict +
          "\n\nOppilaan päätös: " +
          data.decision +
          "\nOngelma: " +
          problem +
          "\nAsiakkaalle voi tapahtua: " +
          impact +
          "\nKorjattu avaus: " +
          fix +
          "\nVakavuus: " +
          data.severity +
          "\nVarmuus: " +
          data.confidence +
          "\nJulkaisisi omalla nimellään: " +
          data.manager +
          "\nPerustelu: " +
          mgrWhy +
          "\n\nSTRIKTIT SÄÄNNÖT: pass=false jos päätös (approve/reject) on väärä reject/approve-boteissa. pass=false jos ongelma-kuvaus ei osu ydinongelmaan. ambiguous-botissa pass=true vain jos oppilas tunnistaa jännitteen (myöhäinen maininta, ristiriitainen sävy tms.) ja perustelee selkeästi.",
        900,
      );
      result = enforceEx1Grade(result, bot, data);

      var tags =
        '<div class="coach-tags">' +
        '<span class="coach-tag ' +
        (result.identify_ok ? "ok" : "warn") +
        '">Ongelman tunnistaminen</span>' +
        '<span class="coach-tag ' +
        (result.fix_ok ? "ok" : "warn") +
        '">Korjausehdotus</span>' +
        '<span class="coach-tag ' +
        (result.decision_ok ? "ok" : "warn") +
        '">Päätös</span></div>';

      var retryBtn = $("ex1-retry-" + n);
      if (coach) {
        coach.innerHTML =
          "<strong>" +
          (result.pass ? "Hyväksytty — " : "Ei vielä valmis — ") +
          "</strong>" +
          (result.coach || (result.pass ? "Jatka seuraavaan." : "Tarkista palaute ja yritä uudelleen.")) +
          tags;
      }
      if (retryBtn) retryBtn.style.display = "inline-flex";

      if (result.pass) {
        state.ex1[n] = true;
        var card = $("review-card-" + n);
        if (card) card.classList.add("done");
        if (nextBtn) nextBtn.style.display = "inline-flex";
        checkEx1AllBotsDone();
      }
    } catch (e) {
      if (coach) coach.textContent = e.message || "Arviointi epäonnistui. Yritä uudelleen.";
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lähetä arvioon";
    }
    notifySave();
  };

  function checkEx1AllBotsDone() {
    var allDone = EX1_BOTS.every(function (bot, idx) {
      return state.ex1[idx + 1] === true;
    });
    if (allDone) {
      var final = $("ex1Final");
      if (final) final.style.display = "block";
      var label = $("ex1BotLabel");
      if (label) label.textContent = "Kaikki " + EX1_BOTS.length + " bottia arvioitu — reflektio";
    }
  }

  window.ex1NextBot = function (n) {
    var card = $("review-card-" + n);
    if (card) card.classList.remove("active");
    var next = n + 1;
    if (next <= EX1_BOTS.length) {
      var nextCard = $("review-card-" + next);
      if (nextCard) nextCard.classList.add("active");
      state.ex1Current = next;
      var label = $("ex1BotLabel");
      if (label) label.textContent = "Botti " + next + " / " + EX1_BOTS.length;
      document.querySelectorAll(".review-dot").forEach(function (d) {
        var dn = parseInt(d.dataset.n, 10);
        d.classList.toggle("active", dn === next);
        d.classList.toggle("done", dn < next || state.ex1[dn] === true);
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  window.submitEx1Final = function () {
    var ta = $("ex1FinalReflection");
    var fb = $("ex1FinalFb");
    var text = (ta && ta.value.trim()) || "";
    if (wc(text) < 12) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Kirjoita 2–3 lausetta reflektiosta.";
      }
      return;
    }
    state.ex1Final = true;
    state.completed.ex1 = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.style.display = "block";
      fb.textContent = "Tallennettu. Hyvä reflektio — muisti syntyy tässä vaiheessa.";
    }
    var next = $("ex1next");
    if (next) {
      next.disabled = false;
      next.textContent = "Jatka Tapaukseen 2 →";
    }
    var banner = $("ex1result");
    if (banner) {
      banner.className = "result-banner show";
      banner.innerHTML =
        "<strong>Bottitarkistus valmis.</strong> Tunnistit, selitit, korjasit ja perustelit — kuten oikeassa työssä. (Lähde: Traficom 2026)";
    }
    updateProgress();
    notifySave();
  };

  /* ===== Exercise 1 (legacy stubs removed) ===== */
  window.botAct = function () {};
  window.submitEx1Memo = function () {};

  function checkEx1Done() {
    checkEx1AllBotsDone();
  }

  window.haltAI = function () {};
  window.pickReason = function () {};

  function ex3SyncContinueButtons() {
    var inv = $("ex3InvestigateContinue");
    var act = $("ex3ActContinue");
    var rewrite = $("ex3RewriteContinue");
    if (inv) inv.style.display = state.ex3.investigateOk ? "inline-block" : "none";
    if (act) act.style.display = state.ex3.actOk ? "inline-block" : "none";
    if (rewrite) rewrite.style.display = state.ex3.rewriteOk ? "inline-block" : "none";
    ex3SyncInsightCard();
  }

  function ex3SyncInsightCard() {
    var card = $("ex3InsightCard");
    if (!card) return;
    if (state.completed.ex3) {
      card.classList.add("show");
      card.style.display = "block";
    } else {
      card.classList.remove("show");
      card.style.display = "none";
    }
  }

  function ex3CompleteTapaus() {
    state.completed.ex3 = true;
    state.ex3.respondOk = true;
    var next = $("ex3next");
    if (next) {
      next.disabled = false;
      next.textContent = "Jatka Tapaukseen 4 →";
    }
    ex3SyncInsightCard();
    updateProgress();
    notifySave();
  }

  function ex3RespondHeuristicOk(text, picked, why) {
    if (!picked) return false;
    if (picked.value !== "b") return false;
    if (wc(text) < 4 || wc(why) < 3) return false;
    var combined = (text + " " + why).toLowerCase();
    return (
      /avoim|läpinäky|luottamus|rehell|tekoäly|tekoaly|mainit|piilott|kerro|luott/i.test(combined) ||
      wc(text) + wc(why) >= 10
    );
  }

  function ex3FinishRespond(fb, message) {
    if (fb) {
      fb.className = "feedback-box correct";
      fb.style.display = "block";
      fb.textContent = message;
    }
    ex3CompleteTapaus();
    var insight = $("ex3InsightCard");
    if (insight) insight.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function ex3ShowStep(id) {
    document.querySelectorAll(".ex3-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var step = $(id);
    if (step) step.classList.add("show");
    state.ex3.currentStep = id;
    if (id !== "ex3step-review") {
      ex3VideoStopAll(null);
    }
    if (id === "ex3step-rewrite") initEx3RewriteRefs();
    ex3SyncContinueButtons();
    notifySave();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.ex3ShowStep = ex3ShowStep;

  var EX3_VIDEO_LINES = [
    { t: 0, text: "Hei." },
    { t: 2, text: "Haluan puhua suoraan teille, jotka kokeneet vaikeuksia viime viikon palvelukatkosta." },
    { t: 7, text: "Ymmärrän, että moni odotti tärkeää toimitusta juuri silloin, kun järjestelmämme oli alhaalla." },
    { t: 13, text: "Se aiheutti turhautumista, ja se on minun vastuullani." },
    { t: 17, text: "Olen pahoillani siitä, mitä tapahtui." },
    { t: 20.5, text: "Tiimimme työskentelee sen eteen, että palvelu pysyy vakaana jatkossa." },
    { t: 26, text: "Olemme lisänneet valvontaa ja päivittäneet häiriöhälytyksiämme." },
    { t: 31, text: "Asiakaspalvelumme auttaa, jos teillä on vielä avoin tilaus tai hyvityskysymys." },
    { t: 37, text: "Kiitos, että pysytte kanssamme." },
    { t: 40.5, text: "Arvostan kärsivällisyyttänne." },
    { t: 44, text: "— Matti, toimitusjohtaja" },
  ];
  var EX3_VIDEO_DURATION = 48;
  /** Shown to Claude on every Ex3 AI grade — dog CEO video is an intentional surprise. */
  var EX3_AI_VIDEO_NOTE =
    "\n\nMATERIAALINHUOMIO (älä rankaise tästä): Anteeksipyyntövideo on tarkoituksellinen yllätys — koira puhuu/kuulostaa ihmiseltä toimitusjohtajan tekstillä. " +
    "Jos oppilas mainitsee koiran, eläimen, outoa kasvoa, deepfake-epäilyä tai että video ei näytä oikealta toimitusjohtajalta, se on pätevä ja hyvä havainto. " +
    "Älä merkitse vastausta virheelliseksi vain siksi, että he kuvaavat videota koirana. Arvioi compliance (tekoälymaininta, harhaanjohtava viesti, luottamus) normaalisti.";
  var ex3VideoState = { reviewed: false, timers: [] };

  function ex3GetVideoEl(root) {
    return root ? root.querySelector(".ex3-vp-video") : null;
  }

  function ex3VideoDuration(root) {
    var video = ex3GetVideoEl(root);
    if (video && video.duration && isFinite(video.duration) && video.duration > 0) {
      return video.duration;
    }
    return EX3_VIDEO_DURATION;
  }

  function ex3VideoDetachListeners(video) {
    if (!video) return;
    if (video._ex3OnTime) {
      video.removeEventListener("timeupdate", video._ex3OnTime);
      video._ex3OnTime = null;
    }
    if (video._ex3OnEnd) {
      video.removeEventListener("ended", video._ex3OnEnd);
      video._ex3OnEnd = null;
    }
  }

  function ex3VideoUpdateBar(root, elapsed) {
    var dur = ex3VideoDuration(root);
    var prog = root.querySelector(".ex3-vp-progress i");
    var time = root.querySelector(".ex3-vp-time");
    if (prog) prog.style.width = Math.min(100, (elapsed / dur) * 100) + "%";
    if (time) {
      time.textContent = ex3VideoFormat(elapsed) + " / " + ex3VideoFormat(dur);
    }
  }

  function ex3TranscriptHtml() {
    var body = EX3_VIDEO_LINES.map(function (l) {
      return l.text;
    }).join(" ");
    return (
      '<details class="ex3-video-transcript" open>' +
      "<summary>Jos video ei toimi — lue transkripti (pääasiallinen lähde)</summary>" +
      "<blockquote>\u201C" +
      body +
      "\u201D</blockquote>" +
      '<p style="margin:8px 0 0;font-size:0.82rem;color:var(--ink-soft);">' +
      "Transkripti vastaa videon puhetta. Arvioi itse, onko materiaali valmis lähetettäväksi.</p>" +
      "</details>"
    );
  }

  function ex3TranscriptText() {
    return EX3_VIDEO_LINES.map(function (l) {
      return l.text;
    }).join(" ");
  }

  function initEx3RewriteRefs() {
    var slot = $("ex3RewriteRefs");
    if (!slot || slot.dataset.ex3Filled) return;
    slot.dataset.ex3Filled = "1";
    slot.innerHTML =
      '<p style="margin:0 0 8px;font-size:0.84rem;color:var(--ink-soft);">Marketingin alkuperäinen luonnos — korjaa kohdat, jotka voivat johtaa harhaan tai rikkoa luottamusta.</p>' +
      '<div class="ex3-ref-email">' +
      '<div class="subj">Otsikko: Tärkeä päivitys toimitusjohtajaltamme</div>' +
      "<p style=\"margin:0 0 8px;\"><strong>Liite:</strong> Toimitusjohtajan anteeksipyyntö.mp4<br><em>Toimitusjohtajamme halusi pyytää anteeksi henkilökohtaisesti.</em></p>" +
      "Hei,<br><br>" +
      "Viime viikon häiriö kosketti monia teitä. Toimitusjohtajamme halusi vastata teille henkilökohtaisesti.<br><br>" +
      "Katso lyhyt video alla.<br><br>" +
      "Ystävällisin terveisin,<br>Asiakaspalvelu" +
      "</div>" +
      '<p style="margin:12px 0 6px;font-weight:600;font-size:0.86rem;">Videon transkripti</p>' +
      '<div class="ex3-ref-transcript">\u201C' +
      ex3TranscriptText() +
      '\u201D</div>';
  }

  function markEx3MaterialReviewed() {
    ex3VideoState.reviewed = true;
    document.querySelectorAll(".ex3-video-hint").forEach(function (h) {
      h.classList.remove("show");
    });
  }

  function ex3VideoFormat(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function ex3VideoClearTimers() {
    ex3VideoState.timers.forEach(function (t) {
      clearInterval(t);
      clearTimeout(t);
    });
    ex3VideoState.timers = [];
  }

  function ex3VideoResetRoot(root) {
    if (!root) return;
    var video = ex3GetVideoEl(root);
    ex3VideoDetachListeners(video);
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    var vp = root.querySelector(".ex3-vp");
    if (vp) vp.classList.remove("playing");
    var sub = root.querySelector(".ex3-vp-sub");
    var prog = root.querySelector(".ex3-vp-progress i");
    var time = root.querySelector(".ex3-vp-time");
    var play = root.querySelector(".ex3-vp-play");
    if (sub) sub.textContent = "";
    if (prog) prog.style.width = "0%";
    if (time) time.textContent = "0:00 / " + ex3VideoFormat(ex3VideoDuration(root));
    if (play) play.textContent = "▶";
  }

  function ex3VideoStopAll(except) {
    document.querySelectorAll(".ex3-video-root").forEach(function (root) {
      if (root !== except) ex3VideoResetRoot(root);
    });
    ex3VideoClearTimers();
  }

  function ex3VideoFinish(root) {
    ex3VideoClearTimers();
    if (!root) return;
    var video = ex3GetVideoEl(root);
    ex3VideoDetachListeners(video);
    if (video) video.pause();
    var vp = root.querySelector(".ex3-vp");
    if (vp) vp.classList.remove("playing");
    var play = root.querySelector(".ex3-vp-play");
    if (play) play.textContent = "↻";
    if (video) ex3VideoUpdateBar(root, ex3VideoDuration(root));
    markEx3MaterialReviewed();
  }

  function ex3VideoPlay(root) {
    if (!root) return;
    var vp = root.querySelector(".ex3-vp");
    var video = ex3GetVideoEl(root);
    if (!vp || vp.classList.contains("playing")) return;
    ex3VideoStopAll(root);
    vp.classList.add("playing");
    if (!video) {
      ex3VideoPlaySimulated(root, vp);
      return;
    }
    ex3VideoDetachListeners(video);
    var onTime = function () {
      ex3VideoUpdateBar(root, video.currentTime || 0);
    };
    var onEnd = function () {
      ex3VideoFinish(root);
    };
    video._ex3OnTime = onTime;
    video._ex3OnEnd = onEnd;
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnd);
    video
      .play()
      .then(function () {
        setTimeout(function () {
          markEx3MaterialReviewed();
        }, 3000);
      })
      .catch(function () {
        ex3VideoPlaySimulated(root, vp);
      });
  }

  function ex3VideoPlaySimulated(root, vp) {
    var sub = root.querySelector(".ex3-vp-sub");
    if (sub) sub.style.display = "block";
    var start = Date.now();
    var lineIdx = 0;
    ex3VideoState.timers.push(
      setInterval(function () {
        var elapsed = (Date.now() - start) / 1000;
        ex3VideoUpdateBar(root, elapsed);
        while (lineIdx < EX3_VIDEO_LINES.length && elapsed >= EX3_VIDEO_LINES[lineIdx].t) {
          if (sub) sub.textContent = EX3_VIDEO_LINES[lineIdx].text;
          lineIdx++;
        }
        if (elapsed >= EX3_VIDEO_DURATION) ex3VideoFinish(root);
      }, 100),
    );
    ex3VideoState.timers.push(
      setTimeout(function () {
        if (vp.classList.contains("playing")) ex3VideoFinish(root);
      }, EX3_VIDEO_DURATION * 1000 + 200),
    );
    setTimeout(function () {
      markEx3MaterialReviewed();
    }, 3000);
  }

  function initEx3VideoRoot(root) {
    if (!root || root.dataset.ex3Bound) return;
    root.dataset.ex3Bound = "1";
    var screen = root.querySelector(".ex3-vp-screen");
    var playBtn = root.querySelector(".ex3-vp-play");
    function toggle() {
      var vp = root.querySelector(".ex3-vp");
      if (vp && vp.classList.contains("playing")) {
        ex3VideoStopAll(null);
        ex3VideoResetRoot(root);
      } else {
        ex3VideoPlay(root);
      }
    }
    if (playBtn) {
      playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggle();
      });
    }
    if (screen) screen.addEventListener("click", toggle);
    var video = ex3GetVideoEl(root);
    if (video) {
      video.addEventListener("loadedmetadata", function () {
        ex3VideoUpdateBar(root, 0);
      });
    }
    var metaBtn = root.querySelector(".ex3-vp-meta-btn");
    var meta = root.querySelector(".ex3-vp-meta");
    if (metaBtn && meta) {
      metaBtn.addEventListener("click", function () {
        meta.classList.toggle("show");
      });
    }
    ex3VideoResetRoot(root);
  }

  function initEx3Videos() {
    document.querySelectorAll(".ex3-video-fallback").forEach(function (slot) {
      if (!slot.dataset.ex3Filled) {
        slot.dataset.ex3Filled = "1";
        slot.innerHTML = ex3TranscriptHtml();
        var details = slot.querySelector(".ex3-video-transcript");
        if (details) {
          if (details.open) markEx3MaterialReviewed();
          details.addEventListener("toggle", function () {
            if (details.open) markEx3MaterialReviewed();
          });
        }
      }
    });
    document.querySelectorAll(".ex3-video-root").forEach(initEx3VideoRoot);
    document.querySelectorAll(".ex3-vp-poster").forEach(function (poster) {
      if (poster.dataset.ex3Bound) return;
      poster.dataset.ex3Bound = "1";
      poster.addEventListener("click", function () {
        var targetId = poster.getAttribute("data-target");
        var root = targetId ? $(targetId) : null;
        if (root) {
          root.scrollIntoView({ behavior: "smooth", block: "center" });
          ex3VideoPlay(root);
        }
      });
    });
  }

  function resetEx3Videos() {
    ex3VideoStopAll(null);
    document.querySelectorAll(".ex3-video-root").forEach(ex3VideoResetRoot);
    document.querySelectorAll(".ex3-vp-meta").forEach(function (meta) {
      meta.classList.remove("show");
    });
  }

  function ex3RenderInvestigateFb(result, pass) {
    var parts = [];
    parts.push(
      pass
        ? '<div class="ex3-verdict ex3-verdict-pass">✅ Hyvä tarkastus — lue palaute ennen jatkamista.</div>'
        : '<div class="ex3-verdict ex3-verdict-retry">🔄 Täydennä havaintoja — lue palaute ja lähetä uudelleen.</div>',
    );
    var right = Array.isArray(result.right) ? result.right : [];
    var missing = Array.isArray(result.missing) ? result.missing : [];
    if (right.length) {
      parts.push('<p style="margin:10px 0 4px;"><strong>✓ Missä osuit:</strong></p><ul class="ex3-fb-list">');
      right.forEach(function (r) {
        parts.push("<li>" + String(r) + "</li>");
      });
      parts.push("</ul>");
    }
    if (missing.length) {
      parts.push(
        '<p style="margin:10px 0 4px;"><strong>⚠ Mitä kannattaa vielä pohtia:</strong></p><ul class="ex3-fb-list">',
      );
      missing.forEach(function (m) {
        parts.push("<li>" + String(m) + "</li>");
      });
      parts.push("</ul>");
    }
    if (result.coach) {
      parts.push('<p style="margin:10px 0 0;"><strong>Yhteenveto:</strong> ' + String(result.coach) + "</p>");
    } else if (result.why) {
      parts.push('<p style="margin:10px 0 0;"><strong>Yhteenveto:</strong> ' + String(result.why) + "</p>");
    }
    return parts.join("");
  }

  window.ex3ContinueAfterInvestigate = function () {
    if (!state.ex3.investigateOk) return;
    ex3ShowStep("ex3step-act");
  };

  window.ex3ContinueAfterAct = function () {
    if (!state.ex3.actOk) return;
    ex3ShowStep("ex3step-rewrite");
  };

  window.ex3ContinueAfterRewrite = function () {
    if (!state.ex3.rewriteOk) return;
    ex3ShowStep("ex3step-respond");
  };

  /* ===== Exercise 3 ===== */
  window.submitEx3Investigate = async function () {
    var text = ($("ex3observe") && $("ex3observe").value.trim()) || "";
    var fb = $("ex3observeFb");
    var submitBtn = $("ex3ObserveSubmit");
    var cont = $("ex3InvestigateContinue");
    var lines = text.split("\n").filter(function (l) {
      return wc(l) >= 4;
    });
    if (lines.length < 3) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Kirjaa vähintään kolme havaintoa (yksi per rivi).";
      }
      if (cont) cont.style.display = "none";
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    state.ex3.investigateOk = false;
    if (cont) cont.style.display = "none";
    if (fb) {
      fb.className = "feedback-box";
      fb.style.display = "block";
      fb.textContent = "Arvioidaan havaintojasi…";
    }
    try {
      var result = await gradeJson(
        'Arvioi PR-tarkastuksen havainnot. JSON: {"pass":true/false,"right":["string"],"missing":["string"],"coach":"string"} ' +
          "Video voi näyttää koiran puhuvan — tarkoituksellinen yllätys; maininta koirasta/eläimestä on hyvä havainto, ei virhe.",
        "Konteksti: tekoälyvideo toimitusjohtajan anteeksipyynnöstä, ei mainintaa tekoälystä, harhaanjohtava sähköposti väittää henkilökohtaisesta nauhoituksesta." +
          EX3_AI_VIDEO_NOTE +
          "\n\nHavainnot:\n" +
          text +
          "\n\npass=true jos tunnistaa useita oikeita riskejä (puuttuva tekoälymaininta, harhaanjohtava viesti, luottamus-/lain riski, epäilyttävä tai epärealistinen video). " +
          "right = 1–3 kohtaa missä oppilas osui (viittaa heidän sanomisiinsa). " +
          "missing = 1–3 kohtaa mitä kannattaa vielä pohtia — älä kirjoita valmiita vastauksia, ohjaa ajattelua. " +
          "coach = lyhyt yhteenveto suomeksi.",
        900,
      );
      if (result.pass) {
        state.ex3.investigateOk = true;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.style.display = "block";
          fb.innerHTML = ex3RenderInvestigateFb(result, true);
        }
        ex3SyncContinueButtons();
        notifySave();
      } else {
        state.ex3.investigateOk = false;
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.style.display = "block";
          fb.innerHTML = ex3RenderInvestigateFb(result, false);
        }
        if (cont) cont.style.display = "none";
        notifySave();
      }
      if (fb) fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = e.message;
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  };

  window.submitEx3Act = function () {
    var picked = document.querySelector('input[name="ex3pressure"]:checked');
    var ethical = ($("ex3ethical") && $("ex3ethical").value.trim()) || "";
    var keys = [];
    document.querySelectorAll("#ex3DisclosureChecks .ex2-check-row input:checked").forEach(function (c) {
      var row = c.closest(".ex2-check-row");
      if (row && row.dataset.key) keys.push(row.dataset.key);
    });
    var why = ($("ex3diswhy") && $("ex3diswhy").value.trim()) || "";
    var fb = $("ex3actFb");
    if (!picked) {
      alert("Valitse toimenpide.");
      return;
    }
    if (wc(ethical) < 10) {
      alert("Vastaa eettiseen kysymykseen.");
      return;
    }
    var hasCore = keys.indexOf("email") >= 0 && keys.indexOf("video") >= 0;
    var hasBad = keys.indexOf("website") >= 0 || keys.indexOf("tos") >= 0;
    if (!hasCore || keys.length < 3) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Valitse sähköposti, video ja metatiedot — asiakas ei lue vain sivustoa tai ehtoja.";
      }
      return;
    }
    if (wc(why) < 8) {
      alert("Perustele lyhyesti, miksi maininta näkyy näissä paikoissa.");
      return;
    }
    var decideOk = picked.value === "delay" || picked.value === "text" || picked.value === "remove";
    state.ex3.actOk = true;
    var parts = [];
    parts.push(
      decideOk
        ? "Hyvä päätös paineen alla — et lähettänyt harhaanjohtavaa viestiä."
        : "Harkitse uudelleen: lähettäminen nyt voi rikkoa luottamusta ja sääntöjä. Voit silti jatkaa ja korjata.",
    );
    parts.push(
      hasBad
        ? "Läpinäkyvyys: hyvä ydinvalinnat. Vain sivusto/ehto ei riitä asiakkaalle."
        : "Läpinäkyvyys: hyvä — useita kerroksia, joita asiakas oikeasti näkee.",
    );
    if (fb) {
      fb.className = decideOk ? "feedback-box correct" : "feedback-box wrong";
      fb.style.display = "block";
      fb.textContent = parts.join(" ");
    }
    ex3SyncContinueButtons();
    notifySave();
  };

  window.submitEx3Decide = window.submitEx3Act;
  window.submitEx3Disclosure = window.submitEx3Act;

  window.submitEx3Rewrite = async function () {
    var subj = ($("ex3subject") && $("ex3subject").value.trim()) || "";
    var body = ($("ex3body") && $("ex3body").value.trim()) || "";
    var fb = $("ex3feedback");
    var scores = $("ex3scores");
    if (!subj || wc(body) < 20) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Kirjoita otsikko ja viesti (min 20 sanaa).";
      }
      return;
    }
    if (wc(body) > 120) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Lyhennä viestiä alle 120 sanaan.";
      }
      return;
    }
    if (fb) {
      fb.className = "feedback-box";
      fb.style.display = "block";
      fb.textContent = "Arvioidaan luonnosta…";
    }
    state.ex3.rewriteOk = false;
    ex3SyncContinueButtons();
    try {
      var result = await gradeJson(
        'Arvioi kriisisähköposti. JSON: {"pass":true/false,"coach":"max 25 sanaa","scores":{"transparency":1-5,"trust":1-5,"legal":1-5,"clarity":1-5,"empathy":1-5}}',
        "Otsikko: " + subj + "\n\nViesti:\n" + body + EX3_AI_VIDEO_NOTE + "\n\npass=true jos tekoälymaininta selkeä, ei paniikkia, empatiaa.",
        700,
      );
      if (result.pass) {
        state.ex3.rewriteOk = true;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.style.display = "block";
          fb.textContent = "Arvio: " + (result.coach || "Hyvä viesti.");
        }
        if (scores && result.scores) {
          scores.style.display = "block";
          var s = result.scores;
          scores.innerHTML =
            "<strong>Strategiapisteet</strong><div class='ex3-score-grid'>" +
            ["transparency", "trust", "legal", "clarity", "empathy"]
              .map(function (k) {
                var labels = {
                  transparency: "Läpinäkyvyys",
                  trust: "Luottamus",
                  legal: "Laki",
                  clarity: "Selkeys",
                  empathy: "Empatia",
                };
                return (
                  "<div class='ex3-score-cell'>" +
                  (labels[k] || k) +
                  "<span>" +
                  (s[k] || "–") +
                  "/5</span></div>"
                );
              })
              .join("") +
            "</div>";
        }
        ex3SyncContinueButtons();
        notifySave();
      } else {
        state.ex3.rewriteOk = false;
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.style.display = "block";
          fb.textContent = "Arvio: " + (result.coach || "Täydennä luonnosta.");
        }
        ex3SyncContinueButtons();
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = e.message;
      }
    }
  };

  window.submitEx3Respond = async function () {
    var text = ($("ex3customer") && $("ex3customer").value.trim()) || "";
    var picked = document.querySelector('input[name="ex3compare"]:checked');
    var why = ($("ex3comparewhy") && $("ex3comparewhy").value.trim()) || "";
    var fb = $("ex3respondFb");
    if (wc(text) < 4) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Kirjoita lyhyt vastaus asiakkaalle — riittää muutama lause tai ranskalaiset viivat.";
      }
      return;
    }
    if (!picked) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Valitse Yritys A tai Yritys B ennen viimeistelyä.";
      }
      return;
    }
    if (wc(why) < 3) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Perustele valinta lyhyesti — riittää muutama sana avoimuudesta tai luottamuksesta.";
      }
      return;
    }
    if (fb) {
      fb.className = "feedback-box";
      fb.style.display = "block";
      fb.textContent = "Arvioidaan…";
    }
    var heuristicOk = ex3RespondHeuristicOk(text, picked, why);
    try {
      var customerResult = await gradeJson(
        'Arvioi asiakasvastaus tekoälyvideosta. JSON: {"pass":true/false,"why":"max 25 sanaa"} ' +
          "Ole antelias: pass=true kun vastaus on rehellinen ja mainitsee tekoälyn/avoimuuden edes lyhyesti. " +
          "Lyhyet vastaukset ja ranskalaiset viivat ovat ok. Asiakas voi mainita koiraa tai epärealistista videota.",
        'Asiakas: "Oliko tämä todella toimitusjohtaja vai tekoäly?" (video voi näyttää koiran puhuvan — tarkoituksellinen yllätys)' +
          EX3_AI_VIDEO_NOTE +
          "\n\nVastaus:\n" +
          text +
          "\n\nHyväksy jos: rehellinen, ei puolustele harhaanjohtamista. Maininta koirasta/eläimestä/outosta videosta on ok.",
        500,
      );
      var trustOk = picked.value === "b";
      var compareResult = null;
      if (trustOk) {
        try {
          compareResult = await gradeJson(
            'Arvioi luottamusvertailu. JSON: {"pass":true/false,"why":"max 25 sanaa"} ' +
              "Ole antelias: pass=true kun valinta on B ja perustelu viittaa avoimuuteen, läpinäkyvyyteen tai luottamukseen — myös lyhyesti.",
            "Valinta: " + picked.value + "\nPerustelu: " + why + "\n\nHyväksy jos B ja perustelee avoimuutta (lyhyesti riittää).",
            400,
          );
        } catch (e2) {
          compareResult = { pass: true, why: "Hyvä — luottamus syntyy avoimuudesta." };
        }
      }
      var customerOk = customerResult.pass || heuristicOk;
      var compareOk = !trustOk ? false : compareResult ? compareResult.pass || heuristicOk : heuristicOk;
      var msgParts = [];
      msgParts.push(
        "Asiakas: " +
          (customerResult.why ||
            (customerOk ? "Rehellinen ja avoin vastaus." : "Täydennä vastausta hieman.")),
      );
      if (trustOk) {
        msgParts.push(
          "Luottamus: " +
            (compareResult && compareResult.why
              ? compareResult.why
              : "Yritys B rakentaa luottamusta avoimuudella — hyvä valinta."),
        );
      } else {
        msgParts.push(
          "Luottamus: Yritys B olisi avoimempi — piilottaminen heikentää luottamusta kriisissä.",
        );
      }
      if (customerOk && compareOk) {
        ex3FinishRespond(fb, msgParts.join(" "));
        return;
      }
      if (heuristicOk || (trustOk && wc(text) >= 4 && wc(why) >= 3)) {
        ex3FinishRespond(
          fb,
          msgParts.join(" ") + " Voit jatkaa seuraavaan tapaukseen.",
        );
        return;
      }
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        if (!customerOk) {
          fb.textContent = "Asiakasvastaus: " + (customerResult.why || "Mainitse tekoäly avoimesti.");
        } else if (!trustOk) {
          fb.textContent = "Valitse Yritys B — avoimuus voittaa piilottamisen kriisissä.";
        } else {
          fb.textContent =
            "Luottamusvertailu: " +
            (compareResult && compareResult.why
              ? compareResult.why
              : "Kerro lyhyesti miksi avoimuus rakentaa luottamusta.");
        }
      }
    } catch (e) {
      if (heuristicOk || (picked.value === "b" && wc(text) >= 4 && wc(why) >= 3)) {
        ex3FinishRespond(
          fb,
          "Tallennettu. Rehellinen vastaus ja oikea suunta — avoimuus rakentaa luottamusta. Voit jatkaa Tapaukseen 4.",
        );
      } else if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = e.message;
      }
    }
  };

  window.submitEx3Customer = window.submitEx3Respond;
  window.submitEx3Compare = window.submitEx3Respond;
  window.submitEx3Defend = function () {};

  window.blockSend = function () {};
  window.openEditor = function () {};
  window.dropTag = function () {};
  window.dragStart = function (ev) {
    ev.dataTransfer.setData("text", "tag");
  };
  window.dragOver = function (ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add("drag-over");
  };
  window.dragLeave = function (ev) {
    ev.currentTarget.classList.remove("drag-over");
  };

  var EX4_CHATS = [
    {
      id: 1,
      verdict: "transfer",
      triageKey: "c",
      title: "Chat C — lääkkeen sivuvaikutus",
      scenario:
        "Asiakas kertoo lääkkeen aiheuttavan hengitysvaikeutta. Botti vastasi vain ajanvarauksesta ensi viikolle — ei tunnistanut mahdollista kiireellistä tilannetta eikä tarjonnut ihmistä.",
      sayHint:
        "Kirjoita yksi lause, jonka botti sanoo seuraavaksi asiakkaalle — esim. tarjoa yhteys hoitajaan, puhelinnumero tai ohje, jos hengitys pahenee.",
      customer: "Lääkkeeni tekee hengittämisen vaikeaksi.",
      bot: "Voit varata ajan ensi viikolle verkkopalvelusta.",
    },
    {
      id: 2,
      verdict: "transfer",
      triageKey: "b",
      title: "Chat B — ei ymmärrä palvelua",
      scenario:
        "82-vuotias asiakas ei osaa käyttää bottia. Botti pyysi vain kirjoittamaan kysymyksen uudelleen — ei tarjonnut ihmistä eikä helpompaa tapaa saada apua.",
      sayHint:
        "Kirjoita yksi lause, jonka botti sanoo seuraavaksi — esim. tarjoa puhelinyhteys, soita minulle -painike tai selkeä ohje, miten saa ihmisen avun.",
      customer: "Olen 82-vuotias. En osaa käyttää tätä.",
      bot: "Kirjoita kysymyksesi uudelleen selkeämmin.",
    },
  ];

  var EX4_STEP_IDS = ["ex4step-review", "ex4step-chats", "ex4step-design", "ex4step-finish"];

  function ex4AllChatsDone() {
    for (var i = 1; i <= EX4_CHATS.length; i++) {
      if (!state.ex4.chats[i]) return false;
    }
    return EX4_CHATS.length > 0;
  }

  function ex4CanOpenStep(id) {
    if (id === "ex4step-review") return true;
    if (id === "ex4step-chats") return !!state.ex4.inspectOk;
    if (id === "ex4step-design") return !!state.ex4.inspectOk && ex4AllChatsDone();
    if (id === "ex4step-finish") return !!state.ex4.designOk || !!state.completed.ex4;
    return false;
  }

  function ex4ResolveStep() {
    if (state.completed.ex4) return "ex4step-finish";
    if (state.ex4.designOk || state.ex4.pressureOk) return "ex4step-finish";
    if (ex4AllChatsDone()) return "ex4step-design";
    if (state.ex4.inspectOk) return "ex4step-chats";
    return "ex4step-review";
  }

  function ex4SyncStepProgress(id) {
    var idx = EX4_STEP_IDS.indexOf(id);
    var label = $("ex4StepLabel");
    var fill = $("ex4StepFill");
    if (label && idx >= 0) label.textContent = "Vaihe " + (idx + 1) + " / 4";
    if (fill && idx >= 0) fill.style.width = ((idx + 1) / EX4_STEP_IDS.length) * 100 + "%";
  }

  function ex4SyncStepNav() {
    document.querySelectorAll(".ex4-step-jump").forEach(function (btn) {
      var stepId = btn.dataset.ex4step;
      var can = ex4CanOpenStep(stepId);
      var active = state.ex4.currentStep === stepId;
      btn.disabled = !can;
      btn.classList.toggle("active", active);
      btn.style.opacity = can ? "" : "0.45";
      btn.style.pointerEvents = can ? "" : "none";
    });
  }

  function ex4SyncContinueButtons() {
    var inspectContinue = $("ex4InspectContinue");
    var inspectSubmit = $("ex4InspectSubmit");
    if (inspectContinue) {
      inspectContinue.style.display = state.ex4.inspectOk ? "inline-flex" : "none";
    }
    if (inspectSubmit && state.ex4.inspectOk) inspectSubmit.style.display = "none";

    var toDesign = $("ex4ChatsToDesign");
    if (toDesign) toDesign.style.display = ex4AllChatsDone() ? "inline-flex" : "none";

    var designContinue = $("ex4DesignContinue");
    if (designContinue) {
      designContinue.style.display = state.ex4.designOk ? "inline-flex" : "none";
    }

    if (state.ex4.inspectOk && EX4_CHATS.length) {
      var activeChat = EX4_CHATS.length;
      for (var i = 1; i <= EX4_CHATS.length; i++) {
        if (!state.ex4.chats[i]) {
          activeChat = i;
          break;
        }
      }
      EX4_CHATS.forEach(function (_, idx) {
        var n = idx + 1;
        var card = $("ex4chat-" + n);
        if (card) card.classList.toggle("active", n === activeChat);
        var nextBtn = $("ex4nextchat-" + n);
        if (nextBtn) {
          nextBtn.style.display =
            state.ex4.chats[n] && n < EX4_CHATS.length ? "inline-flex" : "none";
        }
      });
      var chatLabel = $("ex4ChatLabel");
      if (chatLabel) chatLabel.textContent = "Keskustelu " + activeChat + " / " + EX4_CHATS.length;
      document.querySelectorAll("#ex4ChatDots .review-dot").forEach(function (d) {
        var dn = parseInt(d.dataset.n, 10);
        d.classList.toggle("active", dn === activeChat);
        d.classList.toggle("done", !!state.ex4.chats[dn]);
      });
    }
    ex4SyncStepNav();
    ex4SyncInsightCard();
  }

  function ex4ShowStep(id) {
    if (!id || EX4_STEP_IDS.indexOf(id) < 0) id = ex4ResolveStep();
    document.querySelectorAll(".ex4-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var step = $(id);
    if (step) step.classList.add("show");
    state.ex4.currentStep = id;
    ex4SyncStepProgress(id);
    ex4SyncContinueButtons();
    notifySave();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.ex4ShowStep = ex4ShowStep;

  function buildEx4ChatWizard() {
    var wrap = $("ex4ChatWizard");
    var dots = $("ex4ChatDots");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (dots) dots.innerHTML = "";
    EX4_CHATS.forEach(function (chat, idx) {
      var n = idx + 1;
      if (dots) {
        var d = document.createElement("span");
        d.className = "review-dot" + (n === 1 ? " active" : "");
        d.dataset.n = String(n);
        dots.appendChild(d);
      }
      var card = document.createElement("div");
      card.className = "review-card" + (n === 1 ? " active" : "");
      card.id = "ex4chat-" + n;
      card.innerHTML =
        '<p style="margin:0 0 10px;font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--ink-soft);">' +
        (chat.title || "Keskustelu " + n) +
        "</p>" +
        '<div class="ex4-chat-scenario"><strong>Tapaus:</strong> ' +
        (chat.scenario || "") +
        "</div>" +
        '<p class="ex4-chat-task step-instruction">💡 Botti vastasi väärin. Päätä: jatkatko botilla vai siirrätkö ihmiselle? Kirjoita sitten <strong>yksi lause</strong>, jonka botti sanoo <em>seuraavaksi</em> asiakkaalle.</p>' +
        '<div class="ex4-chat-card"><span class="who">Asiakas</span><div class="bubble">' +
        chat.customer +
        '</div></div><div class="ex4-chat-card"><span class="who">Botti</span><div class="bubble">' +
        chat.bot +
        '</div></div><p style="font-size:0.86rem;margin:14px 0 8px;">Jatka bottilla vai siirrä ihmiselle?</p>' +
        '<div class="ex2-action-row">' +
        '<label class="ex2-action-opt"><input type="radio" name="ex4chat' +
        n +
        '" value="continue"> Jatka bottilla</label>' +
        '<label class="ex2-action-opt"><input type="radio" name="ex4chat' +
        n +
        '" value="transfer"> Siirrä ihmiselle</label></div>' +
        '<label for="ex4why-' +
        n +
        '" style="display:block;margin-top:12px;font-weight:600;font-size:0.88rem;">Miksi?</label>' +
        '<textarea id="ex4why-' +
        n +
        '" style="width:100%;min-height:56px;padding:11px;border-radius:8px;border:1px solid var(--line);font-family:inherit;font-size:0.88rem;"></textarea>' +
        '<label for="ex4say-' +
        n +
        '" style="display:block;margin-top:10px;font-weight:600;font-size:0.88rem;">Mitä botti sanoo seuraavaksi?</label>' +
        '<p class="format-note" style="margin:4px 0 8px;">' +
        (chat.sayHint || "Kirjoita tarkka lause asiakkaalle.") +
        "</p>" +
        '<textarea id="ex4say-' +
        n +
        '" placeholder="Esim. tarjoa yhteys hoitajaan tai selkeä ohje…" style="width:100%;min-height:56px;padding:11px;border-radius:8px;border:1px solid var(--line);font-family:inherit;font-size:0.88rem;"></textarea>' +
        '<label for="ex4risk-' +
        n +
        '" style="display:block;margin-top:10px;font-weight:600;font-size:0.88rem;">Riski, jos ihmistä ei tarjota?</label>' +
        '<input type="text" id="ex4risk-' +
        n +
        '" style="width:100%;padding:11px;border-radius:8px;border:1px solid var(--line);font-family:inherit;font-size:0.88rem;">' +
        '<button type="button" class="primary-btn" id="ex4submit-' +
        n +
        '" style="margin-top:12px;" onclick="submitEx4Chat(' +
        n +
        ')">Lähetä arvioon</button>' +
        '<div class="coach-box" id="ex4coach-' +
        n +
        '" style="display:none;"></div>' +
        '<button type="button" class="next-btn" id="ex4nextchat-' +
        n +
        '" style="display:none;margin-top:12px;" onclick="ex4NextChat(' +
        n +
        ')">Seuraava keskustelu →</button>';
      wrap.appendChild(card);
    });
  }

  window.submitEx4Inspect = async function () {
    var text = ($("ex4missing") && $("ex4missing").value.trim()) || "";
    var fb = $("ex4inspectFb");
    var keys = [];
    document.querySelectorAll("#ex4Triage .ex2-check-row input:checked").forEach(function (c) {
      var row = c.closest(".ex2-check-row");
      if (row && row.dataset.key) keys.push(row.dataset.key);
    });
    if (wc(text) < 6) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Kirjoita yksi lause — mitä polusta puuttuu?";
      }
      return;
    }
    var triageOk = keys.indexOf("b") >= 0 && keys.indexOf("c") >= 0 && keys.indexOf("a") < 0;
    if (!triageOk) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent =
          "Tarkista valinnat: milloin pelkkä automaattivastaus ei riitä?";
      }
      return;
    }
    if (fb) {
      fb.className = "feedback-box";
      fb.style.display = "block";
      fb.textContent = "Arvioidaan havaintoa…";
    }
    try {
      var result = await gradeJson(
        'Arvioi havainto. JSON: {"pass":true/false,"why":"max 20 sanaa"}',
        "Puuttuva suoja chatbot-polussa:\n" + text + "\n\nHyväksy jos mainitsee ihmisen/poistumisreitin/eskalaation.",
        400,
      );
      if (!result.pass) {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.style.display = "block";
          fb.textContent = "Arvio: " + (result.why || "Mitä tapahtuu, jos tekoäly ei riitä?");
        }
        return;
      }
    } catch (e) {
      /* allow continue on grade failure if triage ok */
    }
    state.ex4.inspectOk = true;
    state.ex4.triageOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.style.display = "block";
      fb.textContent = "Hyvä alku — seuraavaksi arvioit kaksi oikeaa keskustelua.";
    }
    var inspectSubmit = $("ex4InspectSubmit");
    var inspectContinue = $("ex4InspectContinue");
    if (inspectSubmit) inspectSubmit.style.display = "none";
    if (inspectContinue) inspectContinue.style.display = "inline-flex";
    ex4SyncContinueButtons();
    notifySave();
  };

  window.ex4ContinueToChats = function () {
    buildEx4ChatWizard();
    ex4ShowStep("ex4step-chats");
  };

  function ex4SyncInsightCard() {
    var card = $("ex4InsightCard");
    if (!card) return;
    if (state.completed.ex4) {
      card.classList.add("show");
      card.style.display = "block";
    } else {
      card.classList.remove("show");
      card.style.display = "none";
    }
  }

  window.submitEx4Missing = window.submitEx4Inspect;
  window.submitEx4Triage = window.submitEx4Inspect;

  window.submitEx4Chat = async function (n) {
    var chat = EX4_CHATS[n - 1];
    var picked = document.querySelector('input[name="ex4chat' + n + '"]:checked');
    var why = ($("ex4why-" + n) && $("ex4why-" + n).value.trim()) || "";
    var say = ($("ex4say-" + n) && $("ex4say-" + n).value.trim()) || "";
    var risk = ($("ex4risk-" + n) && $("ex4risk-" + n).value.trim()) || "";
    var coach = $("ex4coach-" + n);
    var nextBtn = $("ex4nextchat-" + n);
    if (!picked || wc(why) < 6 || wc(say) < 6 || wc(risk) < 4) {
      alert("Täytä päätös, perustelu, lause ja riski.");
      return;
    }
    if (coach) {
      coach.style.display = "block";
      coach.textContent = "Arvioidaan…";
    }
    try {
      var result = await gradeJson(
        'Arvioi eskalaatiopäätös. JSON: {"pass":true/false,"coach":"max 30 sanaa","decision_ok":true/false}',
        "Keskustelu: " +
          chat.customer +
          "\nBotti: " +
          chat.bot +
          "\nOdotettu: " +
          chat.verdict +
          "\n\nPäätös: " +
          picked.value +
          "\nMiksi: " +
          why +
          "\nLause: " +
          say +
          "\nRiski: " +
          risk +
          "\n\npass jos perustelu ja lause järkeviä (myös jos päätös eri mutta perustelu vahva).",
        650,
      );
      if (coach) {
        coach.innerHTML =
          "<strong>Palaute:</strong> " +
          (result.coach || "Hyvä analyysi.") +
          (result.decision_ok
            ? ' <span class="coach-tag ok">Päätös</span>'
            : ' <span class="coach-tag warn">Päätös</span>');
      }
      if (result.pass) {
        state.ex4.chats[n] = true;
        ex4SyncContinueButtons();
        if (nextBtn) {
          if (n === EX4_CHATS.length) {
            nextBtn.style.display = "none";
          } else {
            nextBtn.style.display = "inline-flex";
          }
        }
        notifySave();
      }
    } catch (e) {
      if (coach) coach.textContent = e.message;
    }
  };

  window.ex4NextChat = function (n) {
    var card = $("ex4chat-" + n);
    if (card) card.classList.remove("active");
    var next = n + 1;
    if (next <= EX4_CHATS.length) {
      var nextCard = $("ex4chat-" + next);
      if (nextCard) nextCard.classList.add("active");
      var label = $("ex4ChatLabel");
      if (label) label.textContent = "Keskustelu " + next + " / " + EX4_CHATS.length;
      document.querySelectorAll("#ex4ChatDots .review-dot").forEach(function (d) {
        var dn = parseInt(d.dataset.n, 10);
        d.classList.toggle("active", dn === next);
        d.classList.toggle("done", dn < next || state.ex4.chats[dn]);
      });
    }
  };

  window.submitEx4Design = async function () {
    var access = document.querySelector('input[name="ex4access"]:checked');
    var word = document.querySelector('input[name="ex4word"]:checked');
    var wordWhy = ($("ex4wordwhy") && $("ex4wordwhy").value.trim()) || "";
    var text = ($("ex4exit") && $("ex4exit").value.trim()) || "";
    var fb = $("ex4designFb");
    var issues = [];

    if (!access) {
      issues.push("Valitse, mitä botti tekee kun asiakas ei ymmärrä.");
    } else if (access.value !== "human" && access.value !== "simplify") {
      issues.push(
        "Mitä botti tekee: vertaa vaihtoehtoja uudelleen — asiakkaan pitää päästä eteenpäin, ei jumiin.",
      );
    }
    if (!word) {
      issues.push("Valitse luottamuksellisin muotoilu (A, B tai C).");
    } else if (word.value !== "b") {
      issues.push(
        "Muotoilu: vertaa vaihtoehtoja uudelleen — kumpi kertoo vapaaehtoisesti, miten siirrytään ihmiselle?",
      );
    }
    if (wc(wordWhy) < 4) {
      issues.push("Perustele valintasi kohdassa Miksi (riittää muutama sana).");
    }
    if (wc(text) < 6) {
      issues.push("Kirjoita selkeä poistumislause (yksi lause asiakkaalle).");
    }

    if (issues.length) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.innerHTML = issues.map(function (m) {
          return "• " + m;
        }).join("<br>");
      }
      return;
    }

    if (fb) {
      fb.className = "feedback-box";
      fb.style.display = "block";
      fb.textContent = "Arvioidaan poistumislause…";
    }
    try {
      var result = await gradeJson(
        'Arvioi poistumislause. JSON: {"pass":true/false,"why":"max 20 sanaa"}',
        "Lause:\n" +
          text +
          "\n\nHyväksy (pass=true) jos lause tarjoaa yhteyden ihmiseen/asiakaspalvelijaan, on selkeä ja vapaaehtoinen. Hyväksy myös lämpimät muotoilut kuten ”Voin yhdistää sinut asiakaspalvelijalle”. Hylkää vain jos ihmistä ei tarjota lainkaan tai lause on epäselvä.",
        450,
      );
      if (!result.pass) {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.style.display = "block";
          fb.textContent =
            "Poistumislause: " + (result.why || "Täydennä lause — tarjoa selkeä yhteys asiakaspalvelijaan.");
        }
        return;
      }
      state.ex4.accessOk = true;
      state.ex4.wordingOk = true;
      state.ex4.designOk = true;
      if (fb) {
        fb.className = "feedback-box correct";
        fb.style.display = "block";
        fb.textContent = "Hyvä — saavutettavuus, muotoilu ja poistumisreitti ovat kunnossa.";
      }
      ex4SyncContinueButtons();
      ex4ShowStep("ex4step-finish");
    } catch (e) {
      state.ex4.accessOk = true;
      state.ex4.wordingOk = true;
      state.ex4.designOk = true;
      if (fb) {
        fb.className = "feedback-box correct";
        fb.style.display = "block";
        fb.textContent = "Hyvä — saavutettavuus, muotoilu ja poistumisreitti ovat kunnossa.";
      }
      ex4SyncContinueButtons();
      ex4ShowStep("ex4step-finish");
    }
  };

  window.submitEx4Access = window.submitEx4Design;
  window.submitEx4Wording = window.submitEx4Design;

  window.submitEx4Finish = async function () {
    var pressure = ($("ex4pressure") && $("ex4pressure").value.trim()) || "";
    var feel = ($("ex4feel") && $("ex4feel").value.trim()) || "";
    var picked = document.querySelector('input[name="ex4emerg"]:checked');
    var why = ($("ex4emergwhy") && $("ex4emergwhy").value.trim()) || "";
    var fb = $("ex4finishFb");
    var lines = feel.split("\n").filter(function (l) {
      return l.trim().length > 3;
    });
    if (wc(pressure) < 12 || lines.length < 2) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent = "Perustele päätöksesi ennen käyttöönottoa ja kirjoita kaksi tunnetta/seurausta.";
      }
      return;
    }
    if (!picked || wc(why) < 8) {
      alert("Valitse hätätilanteen toimenpide ja perustele.");
      return;
    }
    var emergOk = picked.value === "emergency" || picked.value === "human";
    if (!emergOk) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.style.display = "block";
        fb.textContent =
          "Hätätilanne: rintakipu vaatii kiireellisempää toimenpidettä kuin tavallinen bottivastaus.";
      }
      return;
    }
    state.ex4.pressureOk = true;
    state.ex4.emergencyOk = true;
    state.completed.ex4 = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.style.display = "block";
      fb.textContent =
        picked.value === "emergency"
          ? "Tapaus valmis — nopeus ei ole tärkeämpää kuin turvallisuus. Rintakipu vaatii hätäpolun."
          : "Tapaus valmis — paine ja hätätilanne käsitelty oikein.";
    }
    var next = $("ex4next");
    if (next) {
      next.disabled = false;
      syncEx4NextButton();
    }
    ex4SyncInsightCard();
    var insight = $("ex4InsightCard");
    if (insight) insight.scrollIntoView({ behavior: "smooth", block: "nearest" });
    updateProgress();
  };

  window.submitEx4Pressure = window.submitEx4Finish;
  window.submitEx4Emergency = window.submitEx4Finish;

  window.dragStartNode = function () {};
  window.dropNode = function () {};
  window.toggleChip = function () {};
  window.checkTriggers = function () {};
  window.submitEx4Rules = function () {};

  /* ===== Exercise 5 — launch readiness review (CS) ===== */
  var EX5_LINES = [
    {
      key: "lang",
      text: "Suomi, ruotsi ja englanti — chat vastaa 24/7",
      good: true,
      ifRight: "Demo lupaa monikielisen 24/7-palvelun — tästä ei yleensä käynnistetä estekeskustelua.",
      ifWrong:
        "Demo lupaa 24/7-palvelun kolmella kielellä — tämä on yleensä vahvuus, ei esteperuste.",
    },
    {
      key: "speed",
      text: "Vastausaika luvattu alle 30 sekuntia",
      good: true,
      ifRight: "Nopea vaste on plussaa — erottele tämä silti väärän vastauksen riskeistä alempana.",
      ifWrong:
        "Nopea vastaus on hyvä — arvioi sen sijaan, mitä tapahtuu kun vastaus on väärä tai asiakas tarvitsee ihmistä.",
    },
    {
      key: "button",
      text: 'Painike "Asiakaspalvelija" näkyvissä chat-ikkunassa',
      good: true,
      ifRight: "Painike on mainittu näkyvänä — erottele myöhemmin piilotetusta ihmisapu-polusta.",
      ifWrong:
        "Painike mainitaan vahvuutena. Erottele se myöhemmin piilotetusta polusta (katso ihmisapu-kohta paketissa).",
    },
    {
      key: "welcome",
      text: 'Tervetuloviesti: "Hei! Olen täällä auttamassa sinua." (ei mainitse tekoälyä)',
      ifWrong:
        "Asiakas voi luulla keskustelevansa ihmisen kanssa. Laki vaatii tekoälyn ilmoittamisen tai ilmiselvän kontekstin.",
      ifRight:
        "Juuri näin — viesti kuulostaa ihmiseltä eikä kerro, että kyse on tekoälystä.",
    },
    {
      key: "handoff",
      text: "Ihmisapu: Valikko → Tuki → Yhteystiedot → Asiakaspalvelu",
      ifWrong:
        "Ihmisapu on usean klikkauksen takana. Asiakas voi luovuttaa ennen kuin löytää agentin.",
      ifRight: "Hyvä havainto — piilotettu polku heikentää oikeutta saada apua ajoissa.",
    },
    {
      key: "refund",
      text: "Esimerkkivastaus laskuun: botti voi hyvittää laskuja automaattisesti, kun asiakas pyytää",
      ifWrong:
        "Botti ei saisi luvata hyvityksiä ilman ohjetta — agentti joutuu korjaamaan tilanteen jälkikäteen.",
      ifRight: "Oikein — automaattiset lupaukset ovat agentille ja asiakkaan luottamukselle riski.",
    },
    {
      key: "playbook",
      text: "Agenteille: ei vielä ohjetta, mitä tehdä kun botti on antanut väärän vastauksen",
      ifWrong:
        "Ilman ohjetta agentti ei tiedä, miten korjata botin virhe tai mitä sanoa asiakkaalle.",
      ifRight: "Kyllä — tämä on tyypillinen puute ennen lanseerausta.",
    },
    {
      key: "history",
      text: "Keskusteluhistoria: agentti ei näe, mitä botti on sanonut asiakkaalle ennen siirtoa",
      ifWrong:
        "Agentti jatkaa kylmästä eikä näe, mitä botti on jo luvannut tai sanonut.",
      ifRight: "Tärkeä puute — historia tarvitaan saumattomaan jatkoon.",
    },
  ];

  function ex5PackHtml() {
    return (
      '<div class="ex5-ref-pack">' +
      "<p><strong>AlfaChat Pro — mitä asiakas ja agentti näkevät</strong></p>" +
      '<p class="good">✓ Suomi, ruotsi ja englanti — chat vastaa 24/7</p>' +
      '<p class="good">✓ Vastausaika luvattu alle 30 sekuntia</p>' +
      '<p class="good">✓ Painike "Asiakaspalvelija" näkyvissä chat-ikkunassa</p>' +
      '<p class="line"><strong>Tervetuloviesti:</strong> "Hei! Olen täällä auttamassa sinua."</p>' +
      "<p class=\"line\"><strong>Ihmisapu:</strong> Valikko → Tuki → Yhteystiedot → Asiakaspalvelu</p>" +
      "<p class=\"line\"><strong>Esimerkkivastaus laskuun:</strong> Botti voi hyvittää laskuja automaattisesti, kun asiakas pyytää.</p>" +
      "<p class=\"line\"><strong>Agenteille:</strong> Ei vielä ohjetta, mitä tehdä kun botti on antanut väärän vastauksen.</p>" +
      "<p class=\"line\"><strong>Keskusteluhistoria:</strong> Agentti ei näe, mitä botti on sanonut asiakkaalle ennen siirtoa.</p>" +
      "</div>"
    );
  }

  function initEx5ContextRefs() {
    var slot = $("ex5ContextRefs");
    if (!slot || slot.dataset.ex5Filled) return;
    slot.dataset.ex5Filled = "1";
    slot.innerHTML =
      '<p style="margin:0 0 10px;font-size:0.84rem;color:var(--ink-soft);">Tiimi painostaa maanantain käynnistykseen. Vertaa jokaista arviointiriviä tähän pakettiin.</p>' +
      ex5PackHtml() +
      '<p style="margin:12px 0 0;font-size:0.82rem;color:var(--ink-soft);"><strong>Muista:</strong> Esimies haluaa nopeutta, tietosuoja ei ole nähnyt chat-näkymää. Sinun roolisi on arvioida asiakkaan ja agentin turvallisuus.</p>';
  }

  function ex5LineExpected(line) {
    return line.good ? "ok" : "discuss";
  }

  var EX5_AI_JSON =
    'JSON: {"pass":true/false,"why":"max 28 sanaa — mikä puuttuu tai mikä on hyvää","hint":"max 40 sanaa — VAIN jos pass=false: ohjaa mitä teemoja oppilaan kannattaa pohtia, älä anna valmiita lauseita"}';

  function ex5ContinueBtn(nextStep, label, onClick) {
    var action = onClick || "ex5ShowStep('" + nextStep + "')";
    return (
      '<button type="button" class="ghost-btn ex5-continue-btn" onclick="' +
      action +
      '">' +
      (label || "Jatka seuraavaan vaiheeseen →") +
      "</button>"
    );
  }

  function ex5ShowAiFeedback(fb, result, pass, nextStep, finishAction) {
    if (!fb) return;
    if (pass) {
      fb.className = "feedback-box correct";
      fb.textContent = "Arvio: " + (result.why || "Hyvä vastaus.");
      return;
    }
    var html = "<strong>Arvio:</strong> " + (result.why || "Vastaus kaipaa täydennystä.");
    if (result.hint) {
      html += "<br><br><strong>Vinkki suuntaan (älä kopioi sellaisenaan):</strong> " + result.hint;
    }
    html += "<br>" + ex5ContinueBtn(nextStep, "Jatka seuraavaan vaiheeseen →", finishAction);
    fb.className = "feedback-box wrong";
    fb.innerHTML = html;
  }

  function ex5ShowStep(id) {
    document.querySelectorAll(".ex5-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var step = $(id);
    if (step) step.classList.add("show");
    var bar = $("ex5ContextBar");
    if (bar) bar.hidden = id === "ex5step-brief";
    if (id !== "ex5step-brief") initEx5ContextRefs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.ex5ShowStep = ex5ShowStep;

  function buildEx5Review() {
    var wrap = $("ex5ReviewRows");
    if (!wrap) return;
    wrap.innerHTML = "";
    EX5_LINES.forEach(function (line) {
      var row = document.createElement("div");
      row.className = "ex5-review-row";
      row.dataset.key = line.key;
      row.innerHTML =
        '<p>' +
        line.text +
        '</p><div class="ex5-review-opts">' +
        '<label><input type="radio" name="ex5rev-' +
        line.key +
        '" value="ok"> Ei huolta</label>' +
        '<label><input type="radio" name="ex5rev-' +
        line.key +
        '" value="discuss"> Vaatii keskustelua</label>' +
        "</div>";
      wrap.appendChild(row);
    });
  }

  function ex5Radio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function completeEx5() {
    state.completed.ex5 = true;
    var next = $("ex5next");
    if (next) {
      next.disabled = false;
      next.textContent = "Siirry valmiusraporttiin →";
    }
    updateProgress();
  }

  window.submitEx5Review = function () {
    var fb = $("ex5reviewFb");
    var mistakes = [];
    var goodOk = 0;
    var concernHits = 0;
    EX5_LINES.forEach(function (line) {
      var val = ex5Radio("ex5rev-" + line.key);
      if (!val) {
        mistakes.push("• " + line.text + " — valitse joko ei huolta tai vaatii keskustelua.");
        return;
      }
      if (line.good) {
        if (val === "ok") goodOk++;
        else mistakes.push("• " + line.text + " — " + line.ifWrong);
      } else if (val === "discuss") {
        concernHits++;
      } else {
        mistakes.push("• " + line.text + " — " + line.ifWrong);
      }
    });
    if (!mistakes.length && goodOk >= 2 && concernHits >= 4) {
      state.ex5.reviewOk = true;
      if (fb) {
        fb.className = "feedback-box correct";
        fb.textContent = "Hyvä erottelu — jatka yhteenvetoon.";
      }
      ex5ShowStep("ex5step-synthesis");
      return;
    }
    if (fb) {
      var html = "";
      if (mistakes.length) {
        html +=
          "<strong>Palaute:</strong><br>" +
          mistakes.join("<br>") +
          "<br><br>Vertaa pakettiin yllä. Voit korjata valinnat tai jatkaa eteenpäin.";
      } else {
        html +=
          "<strong>Palaute:</strong> Lähestyt oikein, mutta erottelu ei vielä täysin osu. Erottele vahvat lupaukset (kielet, vaste, painike) ja kohdat, jotka vaikuttavat asiakkaaseen tai agenttiin.<br><br>Voit korjata tai jatkaa eteenpäin.";
      }
      html += "<br>" + ex5ContinueBtn("ex5step-synthesis", "Jatka yhteenvetoon →");
      fb.className = "feedback-box wrong";
      fb.innerHTML = html;
    }
  };

  window.submitEx5Synthesis = async function () {
    var text = ($("ex5synthesis") && $("ex5synthesis").value.trim()) || "";
    var fb = $("ex5synthesisFb");
    if (wc(text) < 25) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita vähintään 25 sanaa — mitä pitää korjata ennen käyttöönottoa?";
      }
      return;
    }
    try {
      var result = await gradeJson(
        "Arvioi käyttöönoton yhteenveto. " + EX5_AI_JSON,
        "Käyttöönotto-paketissa on riskikohtia asiakkaalle (läpinäkyvyys, ihmisapu) ja agentille (ohjeet, historia, lupaukset).\n\nOppilaan yhteenveto:\n" +
          text +
          "\n\nHyväksy jos mainitsee vähintään kaksi eri teemaa näistä suunnista: tekoälyn ilmoittaminen asiakkaalle, helppo pääsy ihmiselle, agentin ohje virhetilanteisiin, botin lupaamat hyvitykset, puuttuva keskusteluhistoria. Älä vaadi täydellistä listaa.",
        650,
      );
      if (result.pass) {
        state.ex5.synthesisOk = true;
        ex5ShowAiFeedback(fb, result, true);
        ex5ShowStep("ex5step-supervisor");
      } else {
        ex5ShowAiFeedback(fb, result, false, "ex5step-supervisor");
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = e.message;
      }
    }
  };

  window.submitEx5Supervisor = async function () {
    var text = ($("ex5supervisor") && $("ex5supervisor").value.trim()) || "";
    var fb = $("ex5supFb");
    if (wc(text) < 40) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita vähintään 40 sanaa — vakuuta esimiestä odottamaan tai käynnistämään ehdoin.";
      }
      return;
    }
    if (wc(text) > 120) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Lyhennä enintään 120 sanaan — tiivis suositus esimiehelle.";
      }
      return;
    }
    try {
      var result = await gradeJson(
        "Arvioi sisäinen suositus esimiehelle. " + EX5_AI_JSON,
        "Esimies haluaa käynnistää maanantaina. Jonot kasvavat jos viivytetään.\n\nSuositus:\n" +
          text +
          "\n\nHyväksy jos suosittelee viivytystä tai ehdollista käynnistystä ja viittaa asiakas-/agenttiriskeihin sekä korjauksiin ennen go-liveä. Ei tarvitse olla täydellinen.",
        700,
      );
      if (result.pass) {
        state.ex5.supervisorOk = true;
        ex5ShowAiFeedback(fb, result, true);
        completeEx5();
      } else {
        ex5ShowAiFeedback(fb, result, false, null, "completeEx5()");
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = e.message;
      }
    }
  };

  window.toggleFlag = function () {};
  window.checkRejection = function () {};

  /* ===== Exercise 6 — final check before send ===== */
  var EX6_REQUIRED_MISMATCH = ["period", "vip", "approve", "refund"];

  function ex6ShowStep(id) {
    document.querySelectorAll(".ex6-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var step = $(id);
    if (step) step.classList.add("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.ex6ShowStep = ex6ShowStep;

  function ex6Radio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function completeEx6() {
    state.completed.ex6 = true;
    var next = $("ex6next");
    if (next) {
      next.disabled = false;
      next.textContent = "Siirry valmiusraporttiin →";
    }
    updateProgress();
  }

  window.ex6PickDecision = function (decision) {
    state.ex6.decision = decision;
    document.querySelectorAll("[data-ex6dec]").forEach(function (b) {
      b.classList.remove("picked");
    });
    var picked = document.querySelector('[data-ex6dec="' + decision + '"]');
    if (picked) picked.classList.add("picked");
  };

  window.submitEx6Decision = function () {
    var dec = state.ex6.decision;
    var conf = ex6Radio("ex6conf");
    var fb = $("ex6decFb");
    if (!dec) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse hyväksy tai hylkää.";
      }
      return;
    }
    if (!conf) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Arvioi varmuuttasi ennen jatkamista.";
      }
      return;
    }
    if (dec === "approve") {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Vertaa luonnosta käytäntöihin uudelleen — vastaus lupaa asioita, joita politiikka ei salli.";
      }
      return;
    }
    state.ex6.decisionOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent =
        conf === "low" || conf === "50"
          ? "Hyvä varovaisuus — jatka ja merkitse tarkat erot."
          : "Oikea suunta — merkitse seuraavaksi kaikki erot käytäntöihin.";
    }
    ex6ShowStep("ex6step-mismatch");
  };

  window.submitEx6Mismatch = function () {
    var fb = $("ex6misFb");
    var picked = [];
    document.querySelectorAll("#ex6MismatchGrid .ex2-check-row input:checked").forEach(function (cb) {
      var row = cb.closest(".ex2-check-row");
      if (row && row.dataset.key) picked.push(row.dataset.key);
    });
    var missing = EX6_REQUIRED_MISMATCH.filter(function (k) {
      return picked.indexOf(k) < 0;
    });
    if (missing.length) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Et löytänyt kaikkia käytäntöeroja. Tarkista palautusaika, kanta-asiakaspoikkeus, valtuutus ja hyvitysaikataulu.";
      }
      return;
    }
    if (picked.indexOf("empathy") >= 0) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Empatia ei ole käytäntörikkomus — poista se valinnoista ja jätä vain tosiasialliset erot.";
      }
      return;
    }
    state.ex6.mismatchOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Hyvä tarkistus — neljä käytäntöeroa löydetty.";
    }
    ex6ShowStep("ex6step-rewrite");
  };

  window.submitEx6Rewrite = async function () {
    var text = ($("ex6rewrite") && $("ex6rewrite").value.trim()) || "";
    var fb = $("ex6rewriteFb");
    if (wc(text) < 35) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita täydellinen asiakasvastaus (vähintään 35 sanaa).";
      }
      return;
    }
    try {
      var result = await gradeJson(
        'Arvioi korjattu palautussähköposti. JSON: {"pass":true/false,"why":"max 22 sanaa"}',
        "Käytäntö: 14 päivän palautus, VIP ei laajenna, esimiehen lupa poikkeuksiin, hyvitys 14 arkipäivää.\n\nKorjattu luonnos:\n" +
          text +
          "\n\nHyväksy jos: ei lupaa 90 päivää, ei lupaa tänään hyvitystä, ei omavaltaista VIP-poikkeusta, mainitsee 14 päivää tai eskaloinnin.",
        550,
      );
      if (result.pass) {
        state.ex6.rewriteOk = true;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.textContent = "Arvio: " + (result.why || "Käytäntöjen mukainen vastaus.");
        }
        ex6ShowStep("ex6step-pressure");
      } else {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.textContent = "Arvio: " + (result.why || "Tarkista palautusaika ja hyvitysaikataulu.");
        }
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = e.message;
      }
    }
  };

  window.submitEx6Pressure = function () {
    var auth = ex6Radio("ex6auth");
    var next = ($("ex6nextstep") && $("ex6nextstep").value.trim()) || "";
    var fb = $("ex6pressFb");
    if (!auth) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Vastaa, voiko asiakaspalvelu päättää poikkeuksesta.";
      }
      return;
    }
    if (auth === "yes") {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Poikkeuksen hyväksyy vain esimies kirjallisesti — ei asiakaspalvelu yksin.";
      }
      return;
    }
    if (wc(next) < 15) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kuvaile seuraava askel (vähintään 15 sanaa).";
      }
      return;
    }
    state.ex6.pressureOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Hyvä — et anna paineen ohittaa käytäntöä.";
    }
    ex6ShowStep("ex6step-consequence");
  };

  window.submitEx6Consequence = function () {
    var picked = document.querySelectorAll("#ex6step-consequence input[type=checkbox]:checked").length;
    var why = ($("ex6conswhy") && $("ex6conswhy").value.trim()) || "";
    var fb = $("ex6consFb");
    if (picked !== 2) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse tasan kaksi seurausta.";
      }
      return;
    }
    if (wc(why) < 15) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Selitä lyhyesti (vähintään 15 sanaa).";
      }
      return;
    }
    state.ex6.conseqOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Hyvä — näet liiketoimintariskin.";
    }
    ex6ShowStep("ex6step-stakeholders");
  };

  window.submitEx6Stakeholders = function () {
    var stake = ex6Radio("ex6stake");
    var why = ($("ex6stakewhy") && $("ex6stakewhy").value.trim()) || "";
    var fb = $("ex6stakeFb");
    if (!stake) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse, kenen näkemys on lähempänä sinua.";
      }
      return;
    }
    if (wc(why) < 15) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Perustele valintasi (vähintään 15 sanaa).";
      }
      return;
    }
    if (stake === "manager" || stake === "new") {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Lähetys ilman tarkistusta on riski — lakitiimin tai oman huolellisen arvion pitäisi ohjata päätöstä.";
      }
      return;
    }
    state.ex6.stakeOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Hyvä — luotat tarkistukseen, et oletukseen että tekoäly osuu aina oikein.";
    }
    ex6ShowStep("ex6step-supervisor");
  };

  window.submitEx6Supervisor = async function () {
    var text = ($("ex6supervisor") && $("ex6supervisor").value.trim()) || "";
    var fb = $("ex6supFb");
    if (wc(text) < 50) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita vähintään 50 sanaa — käytäntörikkomukset, asiakasriski ja seuraava askel.";
      }
      return;
    }
    try {
      var result = await gradeJson(
        'Arvioi esimiehelle kirjoitettu hylkäysviesti. JSON: {"pass":true/false,"why":"max 22 sanaa"}',
        "AI-luonnos rikkoi käytäntöä: 90 päivää, VIP-poikkeus, oma hyväksyntä, hyvitys tänään.\n\nViesti esimiehelle:\n" +
          text +
          "\n\nHyväksy jos mainitsee vähintään kaksi rikkomusta, asiakasriskin ja suositellun seuraavan askeleen (korjattu vastaus/eskalointi).",
        600,
      );
      if (result.pass) {
        state.ex6.supervisorOk = true;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.textContent = "Arvio: " + (result.why || "Ammattimainen sisäinen viesti.");
        }
        completeEx6();
      } else {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.textContent = "Arvio: " + (result.why || "Täydennä rikkomuksia ja suositusta.");
        }
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = e.message;
      }
    }
  };

  window.ex6Decision = function () {};
  window.submitEx6 = function () {};

  /* ===== AI Readiness Report ===== */
  var RAPORTTI_CARDS = [
    { id: "disclose", text: "Kerro aina, kun asiakas keskustelee tekoälyn kanssa." },
    { id: "verify", text: "Tarkista tekoälyn vastaukset ennen lähettämistä." },
    { id: "human", text: "Älä anna tekoälyn tehdä päätöksiä yksin." },
    { id: "escalate", text: "Tarjoa asiakkaalle mahdollisuus ihmiselle." },
    { id: "vendor", text: "Tarkista botit ennen julkaisua — älä päästä riskialttiita asiakkaan tavaksi." },
    { id: "policy", text: "Vertaa AI:n vastauksia yrityksen ohjeisiin." },
    { id: "health", text: "Eskaloi terveys- ja hätätilanteet ihmiselle." },
    { id: "crisis", text: "Tarkista julkinen viestintä ennen lähettämistä." },
    { id: "supervise", text: "Valvo tekoälyä työvuoron aikana — älä vain reagoi jälkikäteen." },
    { id: "transparency", text: "Varmista, että botti ei esiinny ihmisenä." },
    { id: "document", text: "Kirjaa poikkeamat ja päätökset auditointia varten." },
    { id: "question", text: "Kyseenalaista liian hyvältä kuulostavat AI-lupaukset." },
  ];

  function raporttiShowStep(id) {
    document.querySelectorAll(".raportti-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var step = $(id);
    if (step) step.classList.add("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.raporttiShowStep = raporttiShowStep;

  function raporttiRadio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }

  function buildRaporttiCards() {
    var grid = $("raporttiCardGrid");
    if (!grid || grid.children.length) return;
    RAPORTTI_CARDS.forEach(function (card) {
      var el = document.createElement("div");
      el.className = "raportti-card";
      el.dataset.id = card.id;
      el.textContent = card.text;
      el.addEventListener("click", function () {
        var idx = state.raportti.pickedCards.indexOf(card.id);
        if (idx >= 0) {
          state.raportti.pickedCards.splice(idx, 1);
          el.classList.remove("picked");
        } else if (state.raportti.pickedCards.length < 6) {
          state.raportti.pickedCards.push(card.id);
          el.classList.add("picked");
        }
        var count = $("raporttiCardCount");
        if (count) count.textContent = "Valittu: " + state.raportti.pickedCards.length + " / 6";
      });
      grid.appendChild(el);
    });
  }

  window.submitRaporttiSurprise = function () {
    var c = raporttiRadio("raporttiCase");
    var why = ($("raporttiWhy") && $("raporttiWhy").value.trim()) || "";
    var fb = $("raporttiSurpriseFb");
    if (!c) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse yksi tapaus.";
      }
      return;
    }
    if ((c === "5" && EX5_LOCKED) || (c === "6" && EX6_LOCKED)) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse yksi suorittamistasi tapauksista.";
      }
      return;
    }
    if (wc(why) < 15) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kerro miksi tämä yllätti (vähintään 15 sanaa).";
      }
      return;
    }
    state.raportti.surpriseOk = true;
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Hyvä reflektio — muistaminen auttaa käyttämään oppimaa työssä.";
    }
    raporttiShowStep("raportti-checklist");
  };

  window.submitRaporttiChecklist = function () {
    var fb = $("raporttiCheckFb");
    var saved = $("raporttiSavedList");
    if (state.raportti.pickedCards.length !== 6) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Valitse tasan kuusi sääntöä.";
      }
      return;
    }
    state.raportti.checklistOk = true;
    var lines = state.raportti.pickedCards.map(function (id) {
      var card = RAPORTTI_CARDS.find(function (c) {
        return c.id === id;
      });
      return card ? "✓ " + card.text : "";
    });
    if (saved) {
      saved.style.display = "block";
      saved.innerHTML = "<strong>Oma AI-muistilistasi:</strong><ul style='margin:8px 0 0 18px;padding:0;'>" +
        lines.map(function (l) {
          return "<li>" + l.replace(/^✓ /, "") + "</li>";
        }).join("") +
        "</ul>";
    }
    if (fb) {
      fb.className = "feedback-box correct";
      fb.textContent = "Muistilista tallennettu — nämä ovat sinun sääntösi.";
    }
    raporttiShowStep("raportti-challenge");
  };

  window.copyRaporttiInterview = function () {
    var text = ($("raporttiInterviewText") && $("raporttiInterviewText").textContent.trim()) || "";
    var hint = $("raporttiCopyHint");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (hint) {
          hint.style.display = "inline";
          setTimeout(function () {
            hint.style.display = "none";
          }, 2000);
        }
      });
    }
  };

  window.submitRaporttiChallenge = async function () {
    var line = ($("raporttiOneLine") && $("raporttiOneLine").value.trim()) || "";
    var fb = $("raporttiChallengeFb");
    if (wc(line) < 8) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita yksi selkeä lause (vähintään 8 sanaa).";
      }
      return;
    }
    if (line.split(/[.!?]/).filter(function (s) {
      return s.trim().length > 4;
    }).length > 2) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita vain yksi lause — tiivis vastaus on vahvuus haastattelussa.";
      }
      return;
    }
    try {
      var result = await gradeJson(
        'Arvioi yhden lauseen vastaus AI-säännöstä. JSON: {"pass":true/false,"why":"max 22 sanaa"}',
        'Kysymys: "Mikä on tärkein sääntö AI:n käytössä asiakaspalvelussa?"\nVastaus: ' +
          line +
          "\n\nHyväksy jos yksi selkeä lause, koskee tarkistamista/ihmistä/avoimuutta/läpinäkyvyyttä/valvontaa.",
        450,
      );
      if (result.pass) {
        state.raportti.challengeOk = true;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.textContent = "Arvio: " + (result.why || "Hyvä haastattelulause.");
        }
        raporttiShowStep("raportti-rule");
      } else {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.textContent = "Arvio: " + (result.why || "Tarkenna sääntöäsi.");
        }
      }
    } catch (e) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = e.message;
      }
    }
  };

  window.submitRaporttiRule = async function () {
    var rule = ($("raporttiRule") && $("raporttiRule").value.trim()) || "";
    var fb = $("raporttiRuleFb");
    if (wc(rule) < 10) {
      if (fb) {
        fb.className = "feedback-box wrong";
        fb.textContent = "Kirjoita henkilökohtainen sääntösi (vähintään 10 sanaa).";
      }
      return;
    }
    try {
      var result = await gradeJson(
        'Arvioi henkilökohtainen AI-sääntö. JSON: {"pass":true/false,"why":"max 20 sanaa"}',
        "Oppilaan sääntö:\n" + rule + "\n\nHyväksy jos konkreettinen, työhön sovellettava, koskee vastuullista AI-käyttöä.",
        400,
      );
      if (result.pass) {
        state.raportti.ruleOk = true;
        state.raportti.personalRule = rule;
        if (fb) {
          fb.className = "feedback-box correct";
          fb.textContent = "Arvio: " + (result.why || "Hyvä sääntö — pidä se mielessä.");
        }
        var show = $("raporttiPersonalRuleShow");
        if (show) show.textContent = "Sinun sääntösi: «" + rule + "»";
        raporttiShowStep("raportti-done");
      } else {
        if (fb) {
          fb.className = "feedback-box wrong";
          fb.textContent = "Arvio: " + (result.why || "Tee säännöstä konkreettisempi.");
        }
      }
    } catch (e) {
      state.raportti.ruleOk = true;
      state.raportti.personalRule = rule;
      var show = $("raporttiPersonalRuleShow");
      if (show) show.textContent = "Sinun sääntösi: «" + rule + "»";
      raporttiShowStep("raportti-done");
    }
  };

  window.revealSeal = function () {};

  function clearPanel(panelId) {
    var panel = $(panelId);
    if (!panel) return;
    panel.querySelectorAll("input, textarea, select").forEach(function (el) {
      if (el.readOnly || el.dataset.bonusSkipSave === "1") return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = false;
      else if (el.tagName === "SELECT") el.selectedIndex = 0;
      else if (el.type !== "button" && el.type !== "submit") el.value = "";
    });
    panel.querySelectorAll(".feedback-box, .coach-box").forEach(function (fb) {
      fb.textContent = "";
      fb.style.display = "";
      fb.className = "feedback-box";
    });
    panel.querySelectorAll(".ex2-priority-card, .ex2-check-row").forEach(function (c) {
      c.classList.remove("picked", "selected");
    });
    panel.querySelectorAll(".result-banner").forEach(function (b) {
      b.className = "result-banner";
      b.innerHTML = "";
    });
    panel.querySelectorAll(".review-step").forEach(function (s) {
      s.classList.remove("show");
    });
    panel.querySelectorAll(".chip-btn").forEach(function (b) {
      b.classList.remove("on", "selected");
    });
  }

  function markTabIncomplete(exKey, nextDefault) {
    state.completed[exKey] = false;
    var tab = document.querySelector('.tab-btn[data-tab="' + exKey + '"]');
    if (tab) tab.classList.remove("done");
    var next = $(exKey + "next");
    if (next) {
      next.disabled = true;
      if (nextDefault) next.textContent = nextDefault;
    }
    updateProgress();
  }

  window.resetEx1Bot = function (n) {
    if (state.ex1[n] === true) {
      state.ex1[n] = null;
      var card = $("review-card-" + n);
      if (card) card.classList.remove("done");
      checkEx1AllBotsDone();
    } else {
      state.ex1[n] = null;
    }
    var card = $("review-card-" + n);
    if (!card) return;
    var stamp = $("stamp-" + n);
    if (stamp) {
      stamp.className = "stamp";
      stamp.textContent = "";
    }
    card.querySelectorAll(".act-btn").forEach(function (b) {
      b.disabled = false;
    });
    card.querySelectorAll("input[type=text], textarea").forEach(function (el) {
      el.value = "";
    });
    card.querySelectorAll(".chip-btn").forEach(function (b) {
      b.classList.remove("picked");
    });
    card.querySelectorAll(".review-step").forEach(function (s) {
      s.classList.remove("show");
    });
    var decision = card.querySelector('.review-step[data-step="decision"]');
    if (decision) decision.classList.add("show");
    var coach = $("ex1-coach-" + n);
    var nextBtn = $("ex1-nextbot-" + n);
    var retryBtn = $("ex1-retry-" + n);
    var submitBtn = $("ex1-submit-" + n);
    if (coach) {
      coach.style.display = "none";
      coach.innerHTML = "";
    }
    if (nextBtn) nextBtn.style.display = "none";
    if (retryBtn) retryBtn.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lähetä arvioon";
    }
  };

  window.resetEx1 = function () {
    state.ex1 = { 1: null, 2: null, 3: null };
    state.ex1Final = false;
    state.ex1Current = 1;
    markTabIncomplete("ex1", "Arvioi kaikki kolme bottia + reflektio ensin");
    clearPanel("panel-ex1");
    buildEx1Wizard();
    var fin = $("ex1Final");
    if (fin) fin.style.display = "none";
    var label = $("ex1BotLabel");
    if (label) label.textContent = "Botti 1 / " + EX1_BOTS.length;
    goTo("ex1");
  };


  window.resetEx3 = function () {
    state.ex3 = {
      currentStep: "ex3step-review",
      investigateOk: false,
      actOk: false,
      rewriteOk: false,
      respondOk: false,
    };
    markTabIncomplete("ex3", "Suorita kriisitarkastus loppuun ensin");
    clearPanel("panel-ex3");
    document.querySelectorAll(".ex3-step").forEach(function (s) {
      s.classList.remove("show");
    });
    ["ex3InvestigateContinue", "ex3ActContinue", "ex3RewriteContinue"].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = "none";
    });
    var observeFb = $("ex3observeFb");
    if (observeFb) {
      observeFb.style.display = "none";
      observeFb.textContent = "";
      observeFb.innerHTML = "";
    }
    ex3ShowStep("ex3step-review");
    resetEx3Videos();
    goTo("ex3");
  };

  window.resetEx4 = function () {
    state.ex4 = {
      currentStep: "ex4step-review",
      inspectOk: false,
      triageOk: false,
      chats: { 1: false, 2: false },
      accessOk: false,
      wordingOk: false,
      designOk: false,
      pressureOk: false,
      emergencyOk: false,
    };
    markTabIncomplete("ex4", "Suorita eskalaatiotarkastus loppuun ensin");
    clearPanel("panel-ex4");
    document.querySelectorAll(".ex4-step").forEach(function (s) {
      s.classList.remove("show");
    });
    ex4SyncInsightCard();
    ex4ShowStep("ex4step-review");
    goTo("ex4");
  };

  window.resetEx5 = function () {
    state.ex5 = {
      reviewOk: false,
      synthesisOk: false,
      supervisorOk: false,
    };
    markTabIncomplete("ex5", "Suorita käyttöönoton tarkistus loppuun ensin");
    clearPanel("panel-ex5");
    var ctx = $("ex5ContextRefs");
    if (ctx) {
      delete ctx.dataset.ex5Filled;
      ctx.innerHTML = "";
    }
    var bar = $("ex5ContextBar");
    if (bar) bar.hidden = true;
    buildEx5Review();
    document.querySelectorAll(".ex5-step").forEach(function (s) {
      s.classList.remove("show");
    });
    ex5ShowStep("ex5step-brief");
    goTo("ex5");
  };

  window.resetRaportti = function () {
    state.raportti = {
      surpriseOk: false,
      checklistOk: false,
      challengeOk: false,
      ruleOk: false,
      pickedCards: [],
      personalRule: "",
    };
    clearPanel("panel-todistus");
    document.querySelectorAll(".raportti-step").forEach(function (s) {
      s.classList.remove("show");
    });
    raporttiShowStep("raportti-debrief");
    buildRaporttiCards();
    goTo("todistus");
  };

  window.resetEx6 = function () {
    state.ex6 = {
      decisionOk: false,
      mismatchOk: false,
      rewriteOk: false,
      pressureOk: false,
      conseqOk: false,
      stakeOk: false,
      supervisorOk: false,
      decision: null,
    };
    markTabIncomplete("ex6", "Suorita viimeinen tarkistus loppuun ensin");
    clearPanel("panel-ex6");
    document.querySelectorAll(".ex6-step").forEach(function (s) {
      s.classList.remove("show");
    });
    ex6ShowStep("ex6step-brief");
    goTo("ex6");
  };

  document.getElementById("tabBar").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab-btn");
    if (btn) goTo(btn.dataset.tab);
  });

  buildEx1Wizard();
  buildEx5Review();
  buildRaporttiCards();
  initEx3Videos();
  initEx3RewriteRefs();


  document.querySelectorAll("#ex3DisclosureChecks .ex2-check-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      if (e.target.tagName === "INPUT") return;
      var cb = row.querySelector("input");
      if (cb) {
        cb.checked = !cb.checked;
        row.classList.toggle("picked", cb.checked);
      }
    });
    var cb = row.querySelector("input");
    if (cb) {
      cb.addEventListener("change", function () {
        row.classList.toggle("picked", cb.checked);
      });
    }
  });

  document.querySelectorAll("#ex4Triage .ex2-check-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      if (e.target.tagName === "INPUT") return;
      var cb = row.querySelector("input");
      if (cb) {
        cb.checked = !cb.checked;
        row.classList.toggle("picked", cb.checked);
      }
    });
    var cb = row.querySelector("input");
    if (cb) {
      cb.addEventListener("change", function () {
        row.classList.toggle("picked", cb.checked);
      });
    }
  });

  document.querySelectorAll("#ex6MismatchGrid .ex2-check-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      if (e.target.tagName === "INPUT") return;
      var cb = row.querySelector("input");
      if (cb) {
        cb.checked = !cb.checked;
        row.classList.toggle("picked", cb.checked);
      }
    });
    var cb = row.querySelector("input");
    if (cb) {
      cb.addEventListener("change", function () {
        row.classList.toggle("picked", cb.checked);
      });
    }
  });

  function notifySave() {
    document.dispatchEvent(new CustomEvent("euai:state-changed"));
  }

  function collectEx1UiState() {
    var ui = {
      current: state.ex1Current,
      finalDisplay: $("ex1Final") ? $("ex1Final").style.display : "",
      cards: {},
    };
    EX1_BOTS.forEach(function (bot, idx) {
      var n = idx + 1;
      var card = $("review-card-" + n);
      if (!card) return;
      var steps = [];
      card.querySelectorAll(".review-step.show").forEach(function (s) {
        if (s.dataset.step) steps.push(s.dataset.step);
      });
      var stamp = $("stamp-" + n);
      var coach = $("ex1-coach-" + n);
      var retryBtn = $("ex1-retry-" + n);
      var nextBtn = $("ex1-nextbot-" + n);
      ui.cards[n] = {
        active: card.classList.contains("active"),
        done: card.classList.contains("done"),
        steps: steps,
        stampText: stamp ? stamp.textContent : "",
        stampClass: stamp ? stamp.className : "",
        coachHtml: coach ? coach.innerHTML : "",
        coachDisplay: coach ? coach.style.display : "",
        retryDisplay: retryBtn ? retryBtn.style.display : "",
        nextDisplay: nextBtn ? nextBtn.style.display : "",
      };
    });
    return ui;
  }

  function applyEx1UiState(ui) {
    if (!ui) return;
    if (typeof ui.current === "number") state.ex1Current = ui.current;
    if ($("ex1Final") && ui.finalDisplay) $("ex1Final").style.display = ui.finalDisplay;
    if (!ui.cards) return;
    Object.keys(ui.cards).forEach(function (key) {
      var n = parseInt(key, 10);
      var c = ui.cards[key];
      var card = $("review-card-" + n);
      if (!card || !c) return;
      card.classList.toggle("active", !!c.active);
      card.classList.toggle("done", !!c.done);
      card.querySelectorAll(".review-step").forEach(function (s) {
        s.classList.toggle("show", c.steps && c.steps.indexOf(s.dataset.step) >= 0);
      });
      var stamp = $("stamp-" + n);
      if (stamp && c.stampText) {
        stamp.textContent = c.stampText;
        stamp.className = c.stampClass || stamp.className;
      }
      var coach = $("ex1-coach-" + n);
      if (coach) {
        if (c.coachHtml) coach.innerHTML = c.coachHtml;
        if (c.coachDisplay) coach.style.display = c.coachDisplay;
      }
      var retryBtn = $("ex1-retry-" + n);
      if (retryBtn && c.retryDisplay) retryBtn.style.display = c.retryDisplay;
      var nextBtn = $("ex1-nextbot-" + n);
      if (nextBtn && c.nextDisplay) nextBtn.style.display = c.nextDisplay;
      if (c.steps && c.steps.indexOf("severity") >= 0) {
        var data = state.ex1[n];
        if (data && typeof data === "object") {
          ["severity", "confidence", "manager"].forEach(function (field) {
            if (!data[field]) return;
            var row = $("ex1-" + (field === "manager" ? "mgr" : field === "severity" ? "sev" : "conf") + "-" + n);
            if (!row) return;
            row.querySelectorAll(".chip-btn").forEach(function (btn) {
              btn.classList.toggle("picked", btn.getAttribute("data-val") === String(data[field]));
            });
          });
        }
      }
    });
    var label = $("ex1BotLabel");
    if (label && ui.current) label.textContent = "Botti " + ui.current + " / " + EX1_BOTS.length;
    document.querySelectorAll(".review-dot").forEach(function (d) {
      var dn = parseInt(d.dataset.n, 10);
      d.classList.toggle("active", dn === ui.current);
      d.classList.toggle("done", dn < ui.current || state.ex1[dn] === true);
    });
  }

  window.__euAiActGetSnapshot = function () {
    return {
      runtime: JSON.parse(JSON.stringify(state)),
      ex1Ui: collectEx1UiState(),
      ex4Chat: {
        label: $("ex4ChatLabel") ? $("ex4ChatLabel").textContent : "",
      },
      banners: {
        ex1result: $("ex1result") ? { className: $("ex1result").className, html: $("ex1result").innerHTML } : null,
      },
      ui: {
        teoriaStart: $("teoriaStartBtn") ? !$("teoriaStartBtn").disabled : false,
        ex1next: $("ex1next") ? { disabled: $("ex1next").disabled, text: $("ex1next").textContent } : null,
        ex3next: $("ex3next") ? { disabled: $("ex3next").disabled, text: $("ex3next").textContent } : null,
        ex4next: $("ex4next") ? { disabled: $("ex4next").disabled, text: $("ex4next").textContent } : null,
      },
    };
  };

  window.__euAiActApplySnapshot = function (snap) {
    if (!snap || !snap.runtime) return;
    var r = snap.runtime;
    Object.keys(state).forEach(function (k) {
      if (r[k] !== undefined) state[k] = JSON.parse(JSON.stringify(r[k]));
    });
    if (snap.ex1Ui) applyEx1UiState(snap.ex1Ui);
    if (snap.banners && snap.banners.ex1result) {
      var b = $("ex1result");
      if (b) {
        b.className = snap.banners.ex1result.className || b.className;
        b.innerHTML = snap.banners.ex1result.html || "";
      }
    }
    if (snap.ui) {
      var start = $("teoriaStartBtn");
      if (start && snap.ui.teoriaStart) start.disabled = false;
      ["ex1next", "ex3next", "ex4next"].forEach(function (id) {
        var cfg = snap.ui[id];
        var el = $(id);
        if (el && cfg) {
          el.disabled = !!cfg.disabled;
          if (cfg.text) el.textContent = cfg.text;
        }
      });
    }
    if (state.completed.ex3) {
      var ex3n = $("ex3next");
      if (ex3n) {
        ex3n.disabled = false;
        ex3n.textContent = "Jatka Tapaukseen 4 →";
      }
      ex3SyncInsightCard();
    }
  };

  window.__euAiActShowSteps = function (steps) {
    if (!steps || !steps.length) return;
    var id = steps[steps.length - 1];
    if (id.indexOf("ex3") === 0 && window.ex3ShowStep) window.ex3ShowStep(id);
    else if (id.indexOf("ex4") === 0 && window.ex4ShowStep) window.ex4ShowStep(id);
    else if (id.indexOf("ex5") === 0 && window.ex5ShowStep) window.ex5ShowStep(id);
    else if (id.indexOf("ex6") === 0 && window.ex6ShowStep) window.ex6ShowStep(id);
    else if (id.indexOf("raportti") === 0 && window.raporttiShowStep) window.raporttiShowStep(id);
  };

  window.__euAiActAfterRestore = function () {
    updateProgress();
    checkEx1AllBotsDone();
    ex3SyncContinueButtons();
    if (state.ex4.inspectOk) buildEx4ChatWizard();
    ex4ShowStep(state.ex4.currentStep || ex4ResolveStep());
    ex4SyncContinueButtons();
    ex4SyncInsightCard();
    resolveSessionLocks().then(function () {
      syncEx4NextButton();
      updateProgress();
    });
    notifySave();
  };

  function bindEx4StepNav() {
    var nav = $("ex4StepNav");
    if (!nav || nav.dataset.bound === "1") return;
    nav.dataset.bound = "1";
    var steps = [
      { id: "ex4step-review", label: "1 Materiaalit" },
      { id: "ex4step-chats", label: "2 Chatit" },
      { id: "ex4step-design", label: "3 Suunnittelu" },
      { id: "ex4step-finish", label: "4 Paine" },
    ];
    steps.forEach(function (s) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost-btn ex4-step-jump";
      btn.textContent = s.label;
      btn.dataset.ex4step = s.id;
      btn.addEventListener("click", function () {
        if (!ex4CanOpenStep(s.id)) return;
        ex4ShowStep(s.id);
      });
      nav.appendChild(btn);
    });
    ex4SyncStepNav();
  }

  var startBtn = $("teoriaStartBtn");
  if (startBtn) startBtn.disabled = false;

  resolveSessionLocks().then(function () {
    updateProgress();
    bindEx4StepNav();
    if (state.ex4.inspectOk) buildEx4ChatWizard();
    ex4SyncContinueButtons();
    notifySave();
  });
})();
