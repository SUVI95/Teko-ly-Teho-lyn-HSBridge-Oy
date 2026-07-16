(function () {
  "use strict";

  var CTX_PHASES = [
    "ex3PhaseMission",
    "ex3PhaseBottleneck",
    "ex3PhaseLearn",
    "ex3PhaseRules",
    "ex3PhaseCapacity",
    "ex3PhaseSpot",
  ];

  var PIN_PHASES = [
    "ex3PhaseBottleneck",
    "ex3PhaseLearn",
    "ex3PhaseRules",
    "ex3PhaseCapacity",
    "ex3PhaseSpot",
  ];

  var PIN_ROWS = [
    {
      pct: "62 %",
      title: "Pienet hyvitykset",
      body: "8–40 € · tyyp. <b>18 €</b> · conf <b>0,91</b> · Raja <b>5 €</b> · Lähes kaikki yli 5 € → ihminen",
      open: true,
    },
    {
      pct: "18 %",
      title: "Osoite / salasana",
      body: "Tyyp. <b>0 €</b> · conf <b>0,97</b> · <b>Autonominen</b> · Ei pitäisi eskaloida",
    },
    {
      pct: "8 %",
      title: "Isot hyvitykset",
      body: "&gt;200 € · tyyp. <b>340 €</b> · conf <b>0,82</b> · Raja 5 € · Oikein eskaloidaan",
    },
    {
      pct: "5 %",
      title: "GDPR / lakiasiat",
      body: "conf <b>0,88</b> · Ei pakko-eskalointia · Riski: AI voi poistaa dataa",
    },
    {
      pct: "4 %",
      title: "Julkinen some",
      body: "0–50 € · conf <b>0,71</b> · Vain sentiment · Maine-riski ohittaa summan",
    },
    {
      pct: "3 %",
      title: "Neg. sentimentti",
      body: "tyyp. <b>25 €</b> · conf <b>0,68</b> · Confidence &lt;80 % · Oikein eskaloidaan",
    },
  ];

  var CTX_HTML =
    '<div class="ex3-ctx ex3-ctx-lite">' +
    '<p class="ctx-lite-lead"><strong>Black Friday -ruuhka:</strong> ihmisjono on liian pitkä. Päätät, mitkä kontaktityypit tekoäly saa hoitaa itse ja mitkä pakotetaan aina ihmiselle.</p>' +
    '<p class="ctx-lite-expect">Sinulta odotetaan: löydät suurimman pullonkaulan, kirjoitat JOS–NIIN-säännöt, arvioit jonon koon ja testaat päätökset spot-checkeillä.</p>' +
    '<div class="ctx-lite-row">' +
    '<span class="ctx-lite-badge">🎯 Tehtävä</span>' +
    '<div class="ctx-lite-chips">' +
    '<span class="ctx-lite-chip">Lyhennä ihmisjonoa</span>' +
    '<span class="ctx-lite-chip">AI hoitaa turvalliset</span>' +
    '<span class="ctx-lite-chip lock">GDPR → aina ihminen</span>' +
    '<span class="ctx-lite-chip lock">&gt;200 € → aina ihminen</span>' +
    '<span class="ctx-lite-chip lock">Some & uhat → ihminen</span>' +
    "</div></div>" +
    '<div class="ctx-lite-row">' +
    '<span class="ctx-lite-badge">📊 Confidence</span>' +
    '<div class="ctx-lite-chips">' +
    '<span class="ctx-lite-chip">0,95 varma</span>' +
    '<span class="ctx-lite-chip rail">0,80 raja</span>' +
    '<span class="ctx-lite-chip">0,70 epävarma</span>' +
    "</div>" +
    '<span class="ctx-lite-hint">Alle 0,80 → ihminen katsottava</span>' +
    "</div></div>";

  function buildPinHtml() {
    var rows = PIN_ROWS.map(function (r) {
      return (
        '<details class="edp-row"' +
        (r.open ? " open" : "") +
        ">" +
        '<summary><span class="edp-pct">' +
        r.pct +
        "</span> " +
        r.title +
        "</summary>" +
        '<div class="edp-body">' +
        r.body +
        "</div></details>"
      );
    }).join("");
    return (
      '<div class="edp-label">📎 Kontaktityypit — luvut tallessa (klikkaa riviä)</div>' +
      '<div class="edp-grid">' +
      rows +
      "</div>"
    );
  }

  function insertAtTop(phase, el) {
    var pin = phase.querySelector(".ex3-data-pin");
    if (pin) {
      phase.insertBefore(el, pin);
    } else {
      phase.insertBefore(el, phase.firstChild);
    }
  }

  function injectCtx() {
    if (!document.getElementById("ex3DataCards")) return;
    CTX_PHASES.forEach(function (id) {
      var phase = document.getElementById(id);
      if (!phase || phase.querySelector(".ex3-ctx-lite")) return;
      var ctx = document.createElement("div");
      ctx.innerHTML = CTX_HTML;
      var block = ctx.firstElementChild;
      phase.insertBefore(block, phase.firstChild);
    });
  }

  function injectPins() {
    if (!document.getElementById("ex3DataCards")) return;
    var html = buildPinHtml();
    PIN_PHASES.forEach(function (id) {
      var phase = document.getElementById(id);
      if (!phase || phase.querySelector(".ex3-data-pin")) return;
      var pin = document.createElement("div");
      pin.className = "ex3-data-pin";
      pin.innerHTML = html;
      var ctx = phase.querySelector(".ex3-ctx-lite");
      if (ctx && ctx.nextSibling) {
        phase.insertBefore(pin, ctx.nextSibling);
      } else {
        insertAtTop(phase, pin);
      }
    });
  }

  function init() {
    injectCtx();
    injectPins();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
