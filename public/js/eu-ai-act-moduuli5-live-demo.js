(function () {
  if (!/liveDemo=1/.test(location.search) && !window.EU_AI_ACT_LIVE_DEMO) return;

  var PAUSE = 2400;
  var TYPE_MS = 38;

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  function banner(text) {
    var el = document.getElementById("live-demo-banner");
    if (!el) {
      el = document.createElement("div");
      el.id = "live-demo-banner";
      el.style.cssText =
        "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;" +
        "background:#0F5A52;color:#fff;padding:14px 22px;border-radius:12px;" +
        "font:600 15px Inter,system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.28);" +
        "max-width:92vw;text-align:center;pointer-events:none;";
      document.body.appendChild(el);
    }
    el.textContent = "▶ " + text;
    console.log("[demo]", text);
  }

  function showStartOverlay() {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.id = "live-demo-start";
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:100000;background:rgba(16,20,35,.72);" +
        "display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;";
      overlay.innerHTML =
        '<div style="background:#fff;border-radius:16px;padding:32px 40px;max-width:480px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3);">' +
        '<p style="margin:0 0 8px;font:600 13px Inter,sans-serif;color:#454E63;text-transform:uppercase;letter-spacing:.06em;">EU AI Act · Moduuli 5</p>' +
        '<h2 style="margin:0 0 12px;font:600 22px Fraunces,serif;color:#101423;">Live-opiskelijademo</h2>' +
        '<p style="margin:0 0 24px;font:400 15px Inter,sans-serif;color:#454E63;line-height:1.55;">Sivu klikkaa ja kirjoittaa jokaisen harjoituksen läpi automaattisesti. Seuraa vihreää banneria alareunassa.</p>' +
        '<button type="button" id="liveDemoStartBtn" style="background:#0F5A52;color:#fff;border:none;border-radius:10px;padding:14px 32px;font:600 16px Inter,sans-serif;cursor:pointer;">▶ Käynnistä demo</button>' +
        "</div>";
      document.body.appendChild(overlay);
      document.getElementById("liveDemoStartBtn").onclick = function () {
        overlay.remove();
        resolve();
      };
    });
  }

  function click(sel) {
    var el = document.querySelector(sel);
    if (!el) throw new Error("Missing: " + sel);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.click();
    return wait(500);
  }

  function clickText(text) {
    var btn = Array.prototype.find.call(document.querySelectorAll("button"), function (b) {
      return b.textContent.indexOf(text) !== -1;
    });
    if (!btn) throw new Error("Button not found: " + text);
    btn.scrollIntoView({ block: "center", behavior: "smooth" });
    btn.click();
    return wait(500);
  }

  async function slowType(sel, text) {
    var el = document.querySelector(sel);
    if (!el) throw new Error("Missing input: " + sel);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus();
    el.value = "";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    for (var i = 0; i < text.length; i++) {
      el.value += text.charAt(i);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(TYPE_MS);
    }
  }

  async function goTab(tab) {
    await click('.tab-btn[data-tab="' + tab + '"]');
    await wait(900);
  }

  async function run() {
    await showStartOverlay();
    await wait(600);
    banner("LIVE DEMO — seuraan opiskelijana joka harjoitusta");

    await banner("Tapaus 1 · Botti A — claim-block, situation-block, pinned question");
    await goTab("ex1");
    await wait(1200);

    await banner("Opiskelija painaa Hylkää");
    await click("button.act-btn.reject");

    await banner("Kirjoitan: mikä ongelma on?");
    await slowType(
      "#ex1-problem-1",
      "Asiakas luulee puhuvansa oikealle ihmiselle ilman tekoälymainintaa.",
    );

    await banner("Kirjoitan: mitä asiakkaalle voi tapahtua?");
    await slowType("#ex1-impact-1", "Luottamus romahtaa kun totuus paljastuu myöhemmin.");

    await banner("Korjaan avausviestin");
    await slowType(
      "#ex1-fix-1",
      "Hei! Olen tekoälyavustaja Sarah. Autan tilausasioissa — en ole ihminen.",
    );

    await banner("Valitsen vakavuuden, varmuuden, en julkaisisi omalla nimelläni");
    await click('#ex1-sev-1 button[data-val="vakava"]');
    await click('#ex1-conf-1 button[data-val="75"]');
    await click('#ex1-mgr-1 button[data-val="ei"]');
    await slowType("#ex1-mgrwhy-1", "En haluaisi nimeäni liitettynä valehenkilöön.");

    await banner("Lähetän arvioon — odota AI-palautetta…");
    await click("#ex1-submit-1");
    await wait(14000);

    await banner("Tapaus 3 · Vaihe 1/8 — constraint-chipit inline");
    await goTab("ex3");
    await wait(1000);

    await banner("Avaan kampanjamateriaalit → progress bar päivittyy");
    await clickText("Avaa kampanjamateriaalit");

    await banner("Kirjoitan kolme havaintoa");
    await slowType(
      "#ex3observe",
      "- Video ei näytä oikealta toimitusjohtajalta\n- Tekoälymaininta puuttuu\n- Markkinointi painostaa lähettämään",
    );
    await click("#ex3ObserveSubmit");
    await wait(14000);

    var cont = document.getElementById("ex3InvestigateContinue");
    if (cont && cont.offsetParent !== null && cont.style.display !== "none") {
      await banner("Havainnot ok — jatkan päätökseen");
      cont.click();
      await wait(800);
      await click('input[name="ex3pressure"][value="delay"]');
      await slowType(
        "#ex3ethical",
        "En tuntisi, koska tieto tekoälystä puuttuisi ja luottamus romahtaisi.",
      );
      await clickText("Tallenna päätös");
      await wait(10000);
    }

    await banner("Kirjoitusvaihe — sticky reference panel + 120 sanaa chip");
    window.ex3ShowStep("ex3step-rewrite");
    await wait(2000);

    await banner("Tapaus 4 · Eskalaatio — vaihe 1/9");
    await goTab("ex4");
    await wait(1000);
    await clickText("Avaa tarkastusmateriaalit");
    await banner("Kirjoitan havainnon eskalaatiopolusta");
    await slowType(
      "#ex4missing",
      "Ihmisapu on piilotettu valikon taakse — asiakas ei löydä sitä kiireessä.",
    );
    await clickText("Jatka triageen");
    await wait(1500);

    await banner("Tapaus 5 · Käyttöönoton tarkistus");
    await goTab("ex5");
    await wait(1000);
    await clickText("Aloita tarkistus");
    await wait(1200);

    await banner("Esimiehen viesti — enintään 120 sanaa chip");
    window.ex5ShowStep("ex5step-supervisor");
    await wait(800);
    await slowType(
      "#ex5supervisor",
      "Hei, demo näytti hyvältä mutta asiakkaalle ei kerrota tekoälystä. Ihmisapu on liian piilossa. Suosittelen viivyttämään maanantaita.",
    );
    await wait(2000);

    await banner("Tapaus 6 · SAMAT neutraalit chipit kaikissa 3 paneeleissa");
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.remove("active");
    });
    document.getElementById("panel-ex6").classList.add("active");
    window.ex6ShowStep("ex6step-brief");
    await wait(2500);

    await banner("Eroavaisuudet — hint-strong, ei värikoodattuja vihjeitä");
    window.ex6ShowStep("ex6step-mismatch");
    await wait(2500);

    await banner("✅ Demo valmis — voit nyt klikata itse vapaasti");
  }

  function boot() {
    setTimeout(function () {
      run().catch(function (err) {
        console.error(err);
        banner("Demo virhe: " + err.message);
      });
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
