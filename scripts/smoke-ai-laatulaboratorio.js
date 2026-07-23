#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const MODULE_URL = `${BASE}/module/moduuli-ai-laatulaboratorio?preview=1`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(check, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(100);
  }
  throw new Error(`Aikakatkaisu: ${message}`);
}

async function main() {
  if (!fs.existsSync(CHROME)) throw new Error(`Chromea ei löydy: ${CHROME}`);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rivon-viikko-chrome-'));
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    MODULE_URL,
  ], { stdio: 'ignore' });

  let socket;
  const pending = new Map();
  let callId = 0;
  const exceptions = [];

  try {
    let target;
    await waitFor(async () => {
      try {
        const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
        target = targets.find((item) => item.type === 'page');
        return Boolean(target && target.webSocketDebuggerUrl);
      } catch {
        return false;
      }
    }, 'Chromen etävianmääritys');

    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params);
      if (!message.id || !pending.has(message.id)) return;
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++callId;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const response = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description || 'Selainarviointi epäonnistui');
      }
      return response.result.value;
    }

    async function click(selector) {
      return evaluate(`(() => { const n=document.querySelector(${JSON.stringify(selector)}); if(!n) throw new Error('Puuttuu: ${selector}'); n.click(); return true; })()`);
    }

    async function setValue(id, value) {
      return evaluate(`(() => { const n=document.getElementById(${JSON.stringify(id)}); if(!n) throw new Error('Puuttuu: ${id}'); n.value=${JSON.stringify(value)}; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); return n.value; })()`);
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await waitFor(
      () => evaluate(`document.readyState==='complete' && document.querySelectorAll('[data-screen]').length===20 && typeof window.startCall==='function'`),
      'moduulin latautuminen',
    );

    assert(await evaluate(`document.querySelectorAll('[data-screen]').length===20`), 'kaksikymmentä Rivon-viikon näyttöä renderöityy');
    assert(await evaluate(`document.querySelector('[data-screen="intro"]').classList.contains('active')`), 'aloitusnäyttö on aktiivinen ensin');
    assert(await evaluate(`document.querySelector('.brand').textContent.trim()==='Rivon-viikko'`), 'yläpalkki näyttää Rivon-viikko-otsikon');
    assert(await evaluate(`document.body.innerText.includes('ElevenLabs') && document.body.innerText.includes('Kling') && document.body.innerText.includes('ChatGPT') && document.body.innerText.includes('Poe')`), 'ilmaiset puhelintyökalut ElevenLabs, Kling, ChatGPT ja Poe näkyvät');
    assert(await evaluate(`!document.body.innerText.includes('CapCut') && !/Google Sheet/i.test(document.body.innerText) && !document.body.innerText.includes('Canva')`), 'CapCut, Google Sheets ja Canva on poistettu');

    // Sticky brief strip keeps context and task on the same screen as the exercise.
    await evaluate(`window.next()`);
    await waitFor(() => evaluate(`document.querySelector('[data-screen="theory-voice"]').classList.contains('active')`), 'teoriaan siirtyminen');
    await evaluate(`window.next()`);
    await waitFor(() => evaluate(`document.querySelector('[data-screen="ex1"]').classList.contains('active')`), 'maanantain harjoitukseen siirtyminen');
    assert(await evaluate(`(()=>{const s=document.querySelector('[data-screen="ex1"]');return !!s.querySelector('.brief-strip')&&!!s.querySelector('.situation')&&!!s.querySelector('#stage-ex1');})()`), 'tehtäväbriiffi, tilanne ja puheareena ovat samalla näytöllä');

    // OpenAI Realtime engine + per-scenario config.
    const realtime = await evaluate(`(async()=>{
      const hasEngine = typeof window.StudioVoiceCall === 'function';
      const orbs = ['orb-ex1','orb-ex2','orb-ex3'].every((id)=>document.getElementById(id));
      const ends = ['end-ex1','end-ex2','end-ex3'].every((id)=>document.getElementById(id));
      async function cfg(s){ try{ return await (await fetch('/api/studio-voice/realtime/config?scenario='+s,{credentials:'include'})).json(); }catch(e){ return null; } }
      const latu = await cfg('latu'); const tori = await cfg('tori'); const kaj = await cfg('kajaani');
      return {
        hasEngine, orbs, ends,
        latuOk: !!(latu && latu.expectedTurns===4 && /realtime/i.test(latu.model||'') && /Jari/.test(latu.persona||'')),
        toriOk: !!(tori && tori.expectedTurns===4 && tori.scenario==='tori'),
        kajOk: !!(kaj && kaj.expectedTurns===5 && /Marja/.test(kaj.persona||''))
      };
    })()`);
    assert(realtime.hasEngine, 'OpenAI Realtime -moottori (StudioVoiceCall) latautuu');
    assert(realtime.orbs && realtime.ends, 'kolmessa puheareenassa on orb- ja lopetuspainike');
    assert(realtime.latuOk, 'Latu-skenaario palauttaa uusimman mallin, Jarin ja neljä vuoroa');
    assert(realtime.toriOk, 'Tori-skenaario on erillinen ja nelivuoroinen');
    assert(realtime.kajOk, 'Kajaani-skenaario tuo Marjan ja viisi vastalausetta');

    // Text fallback + Claude scoring, with AI calls blocked (offline behaviour).
    await send('Network.setBlockedURLs', { urls: ['*/api/ai/claude*', '*/api/ai/speech*'] });
    await click('#text-ex1');
    await waitFor(() => evaluate(`!document.getElementById('textwrap-ex1').hidden && document.querySelectorAll('#transcript-ex1 .turn.ai').length>=1`), 'tekstivaihtoehdon avaus tuo Jarin avauksen');
    assert(await evaluate(`document.querySelectorAll('#transcript-ex1 .turn.ai').length>=1`), 'puheareenassa on aina tekstivaihtoehto');
    await setValue('reply-ex1', 'Ennen kuin puhutaan hinnasta — kerro tarkalleen, mitkä lukot ovat rikki ja milloin ilmoitit niistä?');
    await click('#send-ex1');
    await waitFor(() => evaluate(`document.querySelectorAll('#transcript-ex1 .turn').length>=3`), 'offline-varavastaus jatkaa keskustelua');
    assert(await evaluate(`document.querySelectorAll('#transcript-ex1 .turn').length>=3`), 'tekstikeskustelu tuottaa vastapuolen vuoron myös offline');

    await click('#end-ex1');
    await waitFor(() => evaluate(`document.getElementById('result-ex1').classList.contains('show')`), 'arviopaneelin avautuminen');
    assert(await evaluate(`document.querySelectorAll('#rubric-ex1 .rubric-item').length===5`), 'arviorubriikissa on viisi kohtaa');

    // Autosave + restore (localStorage survives reload; module-work applies it).
    await setValue('ex4b-proof', 'Tyyni naisääni, koska mainos kertoo arjen helpottumisesta.');
    await sleep(1300);
    await send('Page.navigate', { url: MODULE_URL });
    await waitFor(
      () => evaluate(`document.readyState==='complete' && typeof window.startCall==='function' && document.querySelectorAll('[data-screen]').length===20 && document.getElementById('ex4b-proof')?.value.includes('Tyyni')`),
      'automaattisesti tallennetun työn palautuminen',
    );
    assert(true, 'automaattitallennus palauttaa työn sivun latauksen jälkeen');
    // Keep random interruptions from firing mid-assertion during the deterministic test run.
    await evaluate(`window.setAutoInterrupt && window.setAutoInterrupt(false)`);

    // Mobile ergonomics.
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    const mobile = await evaluate(`({
      noOverflow: document.documentElement.scrollWidth<=window.innerWidth,
      controls: [...document.querySelectorAll('button')].filter((b)=>b.offsetParent!==null&&b.getBoundingClientRect().height>0).every((b)=>b.getBoundingClientRect().height>=38)
    })`);
    assert(mobile.noOverflow, '390 pikselin näkymässä ei ole vaakavieritystä');
    assert(mobile.controls, 'puhelinnäkymän painikkeet säilyvät kosketettavina');

    // Hamburger drawer.
    await evaluate(`document.getElementById('menuBtn').click()`);
    await waitFor(() => evaluate(`!document.getElementById('drawer').hidden && document.getElementById('drawer').classList.contains('open')`), 'hampurilaisvalikon avautuminen');
    const drawer = await evaluate(`({
      visible: !document.getElementById('drawer').hidden,
      items: document.querySelectorAll('.drawer-item').length,
      tappable: [...document.querySelectorAll('.drawer-item')].every((n)=>n.getBoundingClientRect().height>=40),
      expanded: document.getElementById('menuBtn').getAttribute('aria-expanded')==='true'
    })`);
    assert(drawer.visible && drawer.items === 20 && drawer.tappable && drawer.expanded, 'hampurilaisvalikko avaa kaksikymmentä kosketettavaa osiolinkkiä');

    await evaluate(`document.querySelector('[data-drawer-nav="ex4c"]').click()`);
    await waitFor(() => evaluate(`document.getElementById('drawer').classList.contains('open')===false`), 'valikon sulkeutuminen osiovalinnan jälkeen');
    const afterNav = await evaluate(`({
      active: document.querySelector('[data-screen="ex4c"]').classList.contains('active'),
      collapsed: document.getElementById('menuBtn').getAttribute('aria-expanded')==='false'
    })`);
    assert(afterNav.active && afterNav.collapsed, 'osiolinkki siirtää videoklippeihin ja sulkee valikon');

    // Automation arc: judgment exercise + Claude/Anne review + build target + acceptance test.
    assert(await evaluate(`!!document.querySelector('[data-drawer-nav="auto-decide"]')&&!!document.querySelector('[data-screen="auto-build"]')&&!!document.querySelector('[data-screen="auto-bot"]')&&!!document.querySelector('[data-screen="acceptance"]')`), 'automaatioarc lisää arvioi-, rakenna-, botti- ja vastaanottotestinäytöt');
    assert(await evaluate(`typeof window.reviewBot==='function' && document.body.innerText.includes('asiakasbotti')`), 'Poe-asiakasbotti-harjoitus on lisätty');
    await evaluate(`document.querySelector('[data-drawer-nav="auto-decide"]').click()`);
    await waitFor(() => evaluate(`!!document.querySelector('[data-screen="auto-decide"]') && document.querySelector('[data-screen="auto-decide"]').classList.contains('active')`), 'automaation arviointinäyttöön siirtyminen');
    await evaluate(`window.pickVerdict('A','automate');window.pickVerdict('B','partly');window.pickVerdict('C','dont');window.pickBuild('A')`);
    assert(await evaluate(`document.querySelector('.verdicts[data-task="A"] .verdict[data-v="automate"]').classList.contains('sel') && document.querySelector('.verdict[data-pick="A"]').classList.contains('sel')`), 'tehtäväpäätökset ja rakennusvalinta tallentuvat valituiksi');
    assert(await evaluate(`document.getElementById('chosen-task').textContent.includes('Työ A')`), 'valittu rakennuskohde näkyy suunnittelunäytöllä');
    await evaluate(`window.reviewDecide()`);
    await waitFor(() => evaluate(`document.getElementById('decide-feedback').style.display!=='none' && document.getElementById('decide-feedback-text').innerText.length>40`), 'Annen arvion näkyminen offline-tilassa');
    assert(await evaluate(`document.getElementById('decide-feedback-text').innerText.length>40`), 'Anne (Claude/varapalaute) haastaa automaatiopäätökset');

    await evaluate(`document.querySelector('[data-drawer-nav="acceptance"]').click()`);
    await waitFor(() => evaluate(`document.querySelector('[data-screen="acceptance"]').classList.contains('active')`), 'vastaanottotestinäyttöön siirtyminen');
    assert(await evaluate(`!!document.getElementById('orb-acceptance') && !!document.getElementById('rubric-acceptance') && typeof window.startCall==='function' && document.body.innerText.includes('Puolusta viikkosi työ')`), 'viimeinen koe on Annen ääni-vastaanottotesti (puolusta valintasi)');

    // Pedagogy layer: skill headers, osaamispassi, case file.
    assert(await evaluate(`(()=>{const h=document.querySelector('[data-screen="ex1"] .skill-header');return !!h && /Opit tämän/.test(h.innerText) && /Käytä tosielämässä/.test(h.innerText) && /Onnistut kun/.test(h.innerText);})()`), 'jokaisella harjoituksella on taito-otsikko (opit / käytä tosielämässä / mittari)');
    assert(await evaluate(`document.querySelectorAll('.skill-header[data-skill]').length>=12 && [...document.querySelectorAll('.skill-header')].every(h=>h.innerText.trim().length>20)`), 'kaikki harjoitusnäytöt saavat pedagogisen taito-otsikon');
    assert(await evaluate(`!!document.querySelector('[data-passport]') && document.querySelector('[data-passport]').innerText.includes('Osaamispassi')`), 'osaamispassi näkyy ja listaa taidot');
    assert(await evaluate(`typeof window.openCaseFile==='function' && !!document.getElementById('casefilePanel') && !!document.getElementById('casefileBtn')`), 'muistio (case file) -paneeli ja -painike ovat olemassa');

    // Capstone: Claude assesses the whole module, gives an overall score + per-area retry for low scores.
    assert(await evaluate(`typeof window.assessAll==='function' && typeof window.gotoScreen==='function' && !!document.getElementById('capAssessBtn') && !!document.getElementById('cap-score') && !!document.getElementById('cap-areas')`), 'loppuarvio: Claude-arviopainike, kokonaispisteet ja harjoituskohtainen koonti ovat olemassa');
    // Offline path renders overall score + a retry button for a low-scoring (empty) area.
    assert(await evaluate(`(()=>{const d=window.capAssessOffline();return !!d && Array.isArray(d.areas) && d.areas.length>=11;})()`), 'loppuarvion offline-kooste tuottaa arviot kaikista harjoituksista');
    assert(await evaluate(`(()=>{const d=window.capAssessOffline();window.renderAssess(d);return document.getElementById('cap-areas').innerText.length>40 && /uudelleen/.test(document.getElementById('cap-areas').innerText);})()`), 'heikoista harjoituksista syntyy "tee uudelleen" -painike');

    // Random interruption shift (adapted from monikanava IRQ): popups fire mid-work, not a start-button screen.
    assert(await evaluate(`typeof window.runRemainingInterrupts==='function' && typeof window.reflexAdvance==='function' && typeof window.fireInterruptNow==='function' && !!document.getElementById('reflexOverlay')`), 'satunnainen keskeytysmoottori ja popup-overlay ovat olemassa');
    assert(await evaluate(`(()=>{const s=document.querySelector('[data-screen="reflex"]');return !!s && !s.querySelector('#reflexStartBtn') && !!document.getElementById('reflex-tally') && !!document.getElementById('reflexRunBtn');})()`), 'keskeytysnäyttö on koontinäkymä (ei erillistä aloita-nappia)');
    await evaluate(`window.setAutoInterrupt(false)`);
    await evaluate(`document.querySelector('[data-drawer-nav="reflex"]').click()`);
    await waitFor(() => evaluate(`document.querySelector('[data-screen="reflex"]').classList.contains('active')`), 'vuoron keskeytysnäyttöön siirtyminen');
    // Shift auto-started once past intro; catch-up button clears any interruptions that did not fire randomly.
    await evaluate(`window.runRemainingInterrupts()`);
    await waitFor(() => evaluate(`document.getElementById('reflexOverlay').classList.contains('open')`), 'ensimmäinen keskeytyspopup avautuu');
    assert(await evaluate(`/\\d+/.test(document.getElementById('reflexSec').textContent) && document.getElementById('reflexCount').textContent.includes('/ 6')`), 'keskeytyspopupissa on ajastin ja 6 keskeytyksen laskuri');
    // First interruption is a text-input recall question (colleague asks for tool advice).
    assert(await evaluate(`getComputedStyle(document.getElementById('reflexInput')).display!=='none' && !!document.getElementById('reflexInputBox')`), 'ensimmäinen keskeytys pyytää Tomin oman vastauksen (tekstikenttä)');
    // Handle all six. Input popups: type an answer + submit. Choice popups: index 1 is the correct call.
    await evaluate(`(async()=>{
      for(let step=0;step<6;step++){
        for(let t=0;t<80 && !document.getElementById('reflexOverlay').classList.contains('open'); t++){ await new Promise(r=>setTimeout(r,50)); }
        const inp=document.getElementById('reflexInput');
        if(inp && getComputedStyle(inp).display!=='none'){
          const box=document.getElementById('reflexInputBox');
          box.value='Kokeilisin Lovablea tai Base44:ää — kuvailet mitä haluat ja tekoäly rakentaa sivun ilman koodausta. Replit jos haluat pidemmälle.';
          document.getElementById('reflexSubmit').click();
        } else {
          for(let t=0;t<40 && document.querySelectorAll('#reflexOpts .rp-opt').length<3; t++){ await new Promise(r=>setTimeout(r,50)); }
          const opts=[...document.querySelectorAll('#reflexOpts .rp-opt')];
          opts[Math.min(1,opts.length-1)].click();
        }
        for(let t=0;t<60 && document.getElementById('reflexNext').style.display==='none'; t++){ await new Promise(r=>setTimeout(r,50)); }
        const nb=document.getElementById('reflexNext'); if(nb && nb.style.display!=='none') nb.click();
        await new Promise(r=>setTimeout(r,150));
      }
    })()`);
    await waitFor(() => evaluate(`document.getElementById('reflex-result').classList.contains('show') && !document.getElementById('reflexOverlay').classList.contains('open')`), 'vuoron koonti näkyy kaikkien keskeytysten jälkeen');
    assert(await evaluate(`document.querySelectorAll('#reflex-dots .reflex-dot').length===6 && document.getElementById('reflex-score').textContent.trim()==='6 / 6'`), 'kaikki kuusi keskeytystä pisteytetään koontiin');
    assert(await evaluate(`[...document.querySelectorAll('.stamp')].some(s=>/Nopea harkinta/.test(s.innerText)&&s.classList.contains('on'))`), 'nopean harkinnan taito leimautuu osaamispassiin');

    // Curveball crisis call exists with a first-move judgment + voice stage.
    assert(await evaluate(`!!document.querySelector('[data-screen="crisis"]') && typeof window.pickMove==='function' && !!document.getElementById('stage-crisis') && document.querySelectorAll('.verdict[data-move-opt]').length===4`), 'umpikuja-kriisipuhelu tarjoaa ensisiirtovalinnan ja ääniareenan');
    const crisisCfg = await evaluate(`(async()=>{try{const r=await(await fetch('/api/studio-voice/realtime/config?scenario=kriisi',{credentials:'include'})).json();return !!(r&&/Anne/i.test(r.persona||''));}catch(e){return false;}})()`);
    assert(crisisCfg, 'kriisi-skenaario palauttaa Anne-persoonan Realtime-moottorista');

    // Kolme yleisöä: same facts, three tones, soft timer + Claude/Anne review (offline fallback).
    assert(await evaluate(`!!document.querySelector('[data-screen="voices"]') && typeof window.startVoices==='function' && typeof window.reviewVoices==='function' && ['voices-public','voices-city','voices-team'].every(id=>document.getElementById(id))`), 'kolme yleisöä -harjoitus tarjoaa kolme sävyversiota ja ajastimen');
    await evaluate(`document.querySelector('[data-drawer-nav="voices"]').click()`);
    await waitFor(() => evaluate(`document.querySelector('[data-screen="voices"]').classList.contains('active')`), 'kolme yleisöä -näyttöön siirtyminen');
    await setValue('voices-public', 'Ymmärrämme huolenne täysin. Kyse oli yhdestä löysästä jarrusta, joka on jo korjattu — ei sarjaviasta. Tarkastamme parhaillaan koko kaluston.');
    await setValue('voices-city', 'Hei Marja, tiedotan poikkeamasta: yksittäinen jarru oli löysällä, se on korjattu, eikä kyse ole sarjaviasta. Käynnistimme koko kaluston tarkastuksen ja raportoimme tulokset teille.');
    await setValue('voices-team', 'Tiimi: tilanne hallinnassa. Fakta: yksi löysä jarru, korjattu, ei sarjavikaa. Nyt: tarkastetaan kaikki pyörät tänä iltana. Kiitos rauhallisuudesta.');
    await evaluate(`window.reviewVoices()`);
    await waitFor(() => evaluate(`document.getElementById('voices-feedback').style.display!=='none' && document.getElementById('voices-feedback-text').innerText.length>40`), 'Annen arvion näkyminen kolmelle yleisölle (offline)');
    assert(await evaluate(`document.querySelector('[data-passport]') && [...document.querySelectorAll('.stamp')].some(s=>/Viestintä yleisöille/.test(s.innerText)&&s.classList.contains('on'))`), 'viestintätaito leimautuu osaamispassiin arvion jälkeen');

    assert(exceptions.length === 0, 'selain ei raportoi JavaScript-poikkeuksia');
  } finally {
    if (socket && socket.readyState < 2) socket.close();
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once('exit', resolve));
      chrome.kill('SIGTERM');
      await Promise.race([exited, sleep(2000)]);
    }
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // Chrome can briefly retain cache files after exit; cleanup must not mask test failures.
    }
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
