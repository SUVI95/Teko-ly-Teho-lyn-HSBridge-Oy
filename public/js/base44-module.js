/* Base44 — Rakenna oma sovellus (moduuli-visibility-growth-automation) */
(function () {
  var B44_FIRST_MESSAGE = 'Hei! 👋 Tässä on hauska tehtävä.\n' +
    'Minulla on 10 kysymystä sinulle. Ei tenttiä — oikea utelias keskustelu siitä miten elät ja mitä teet. Vastausten perusteella löydän sinulle 7 sovellus-ideaa jotka oikeasti sopivat sinulle.\n' +
    'Aloitetaan helposti: kerro joku asia arjessasi — työssä tai kotona — joka toistuu viikosta toiseen ja johon menee enemmän aikaa tai energiaa kuin pitäisi. Iso tai pieni, ei väliä.';

  var B44_SYS = [
    'TÄRKEINTÄ: Ole hauska, lämmin ja aito. Käytä emojia kohtuudella. Viittaa siihen mitä käyttäjä kertoi — älä kysy asioita joihin hän on jo vastannut. Jos käyttäjä on hauska, ole hauska takaisin. Jos he ovat väsyneitä, ole empaattinen. Tämän pitää tuntua oikealta keskustelulta — ei lomakkeelta.',
    'Kun käyttäjä antaa lyhyen vastauksen älä luovuta. Sen sijaan:',
    '',
    'Ihmettele ääneen: "Oho, tämä kuulostaa tutulta — kerro lisää?"',
    'Anna esimerkki: "Tarkoitatko ehkä sitä kun..."',
    'Tee se konkreettiseksi: "Miltä viime tiistai näytti — mitä tapahtui?"',
    '',
    'Muista: tämä on löytöretki, ei kuulustelu.',
    '',
    'Haastattelet käyttäjää löytääksesi parhaan sovelluksen rakentamisen heidän elämänsä helpottamiseksi. Sinulla on tärkeä tehtävä: kaivaa esiin oikea ongelma joka kannattaa ratkaista.',
    '',
    'KRIITTISET OHJEET LYHYISIIN VASTAUKSIIN:',
    'Jos käyttäjä vastaa yhdellä sanalla tai epäselvällä vastauksella — ÄLÄ jatka seuraavaan kysymykseen. Sen sijaan tee yksi näistä:',
    '- Ehdota konkreettinen esimerkki: "Tarkoitatko esimerkiksi sitä, että..."',
    '- Kuvaile tilanne: "Kuvittele tilanne: tulet kotiin töistä ja..."',
    '- Käänny eri kulmasta: "Kerrotko tarkemmin — tarkoitatko X vai Y?"',
    '- Käytä huumoria kevyesti jos tunnelma on jäinen: "Okei, koti — se on laaja käsite! Onko se enemmän kaaos vai pelkkä aika?"',
    'Sinulla on lupa haastaa ja uudelleenkysyä. Et saa luovuttaa alle 6 hyvän vastauksen jälkeen.',
    '',
    'HAASTATTELU — maksimissaan 10 kysymystä, minimissään 6 HYVÄÄ vastausta:',
    'Vaihe 1 — Elämänalue (1-2 kysymystä): Missä elämänalueessa on eniten toistuvaa työtä tai turhautumista? Työ, koti, harrastukset, talous, terveys?',
    'Vaihe 2 — Konkreettinen tilanne (2-3 kysymystä): Kuvaile viime viikon konkreettinen hetki. Mitä tapahtui? Mitä teit? Mitä haluaisit olisi tapahtunut?',
    'Vaihe 3 — Aika ja toistuvuus (1-2 kysymystä): Kuinka usein tämä tapahtuu? Paljonko aikaa menee? Mikä ärsyttää eniten?',
    'Vaihe 4 — Unelmaratkaisu (1 kysymys): Jos olisi taikasauva — mitä se tekisi?',
    '',
    'MILLOIN GENEROIDA IDEAT:',
    'Vasta kun sinulla on vähintään 6 konkreettista vastausta jotka kertovat jotain oikeaa tästä ihmisestä — ei ennen. Yleiset vastaukset kuten "koti" tai "ok" eivät laske vastauksiksi.',
    '',
    'Kun olet valmis, kirjoita TÄSMÄLLEEN tässä muodossa ilman poikkeamia:',
    '',
    '---ANALYYSI ALKAA---',
    'HAVAINTOSI: [2-3 lausetta — henkilökohtainen, viittaa konkreettisiin asioihin joita he kertoivat. Jos et saanut tarpeeksi tietoa, kirjoita rehellisesti: Sain rajallisesti tietoa, mutta tässä on ideoita sen perusteella mitä kerroit]',
    '',
    'IDEA 1: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 2: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 3: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 4: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 5: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 6: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    'IDEA 7: [Nimi] | [Mitä tekee — konkreettinen lause] | [Miten säästää aikaa — numero tai tilanne]',
    '---ANALYYSI LOPPUU---',
    '',
    'IDEOIDEN LAATU:',
    'Ideat tulee perustua suoraan siihen mitä käyttäjä kertoi — ei geneerisiä ideoita. Eri tyypit: seurantatyökalu, muistuttaja, generaattori, laskuri, dashboard, lomaketyökalu, analysoija. Ei kahta samantyyppistä ideaa. Kirjoita suomeksi.',
    '',
    'Jos et ole vielä saanut 6 hyvää vastausta, esitä vain yksi seuraava kysymys tai tarkennus — älä tuota analyysiä.'
  ].join('\n');

  var b44Thread = [];
  var b44AnalysisShown = false;
  var b44PromptLoadTimer = null;
  var B44_LOADING_MSGS = [
    'Yhdistellään haastatteluasi...',
    'Lisätään teknisiä vaatimuksia...',
    'Varmistetaan animaatiot...',
    'Viimeistellään ohjetta...',
    'Melkein valmis...'
  ];
  var B44_STATE = { selectedIdea: null, basePrompt: '', refinedPrompt: '', appUrl: '', device: 'Molemmat', promptReady: false };

  function setChatEmptyVisible(show) {
    var el = document.getElementById('b44ChatEmpty');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function setChatTypingVisible(show) {
    var el = document.getElementById('b44ChatTyping');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function refreshS3IdeaPanel() {
    var card = document.getElementById('b44S3IdeaCard');
    var empty = document.getElementById('b44S3IdeaEmpty');
    if (!card || !empty) return;
    var i = B44_STATE.selectedIdea;
    if (!i) {
      empty.style.display = 'block';
      card.style.display = 'none';
      return;
    }
    empty.style.display = 'none';
    card.style.display = 'block';
    var nm = document.getElementById('b44S3IdeaName');
    var dc = document.getElementById('b44S3IdeaDesc');
    var sv = document.getElementById('b44S3IdeaSaves');
    if (nm) nm.textContent = i.name || '';
    if (dc) dc.textContent = i.does || '';
    if (sv) {
      if (i.saves) {
        sv.textContent = i.saves;
        sv.style.display = 'block';
      } else {
        sv.textContent = '';
        sv.style.display = 'none';
      }
    }
  }

  function getApiBase() {
    var pathname = window.location.pathname || '';
    var idx = pathname.indexOf('/module/');
    return idx > 0 ? pathname.substring(0, idx) : '';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function addChat(text, isUser) {
    var c = document.getElementById('b44Chat');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'chat-msg ' + (isUser ? 'user' : 'ai');
    d.innerHTML = '<div class="chat-bubble">' + escapeHtml(text) + '</div>';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function claudeApi(messages, maxTok) {
    return fetch((window.location.origin || '') + getApiBase() + '/api/ai/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ system: B44_SYS, messages: messages, max_tokens: maxTok || 2500 })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (o) {
        if (!o.ok) throw new Error(o.d.error || o.d.message || 'Claude-virhe');
        return o.d.text || '';
      });
  }

  function openAiSingle(system, user, maxTok) {
    return fetch((window.location.origin || '') + getApiBase() + '/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: maxTok || 3000,
        system: system,
        messages: [{ role: 'user', content: user }]
      })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (o) {
        if (!o.ok) throw new Error(o.d.error || o.d.message || 'OpenAI-virhe');
        return o.d.text || '';
      });
  }

  function parseIdeaLine(rest) {
    var parts = rest.split(/\s*\|\s*/);
    if (parts.length >= 3) {
      return { name: parts[0].trim(), does: parts[1].trim(), saves: parts[2].trim() };
    }
    if (parts.length === 2) {
      return { name: parts[0].trim(), does: parts[1].trim(), saves: '' };
    }
    parts = rest.split(/\s*—\s*/);
    if (parts.length >= 3) {
      return { name: parts[0].trim(), does: parts[1].trim(), saves: parts[2].trim() };
    }
    if (parts.length === 2) {
      return { name: parts[0].trim(), does: parts[1].trim(), saves: '' };
    }
    return null;
  }

  function parseIdeas(fullText) {
    var start = fullText.indexOf('---ANALYYSI ALKAA---');
    var end = fullText.indexOf('---ANALYYSI LOPPUU---');
    if (start < 0 || end < 0 || end <= start) return [];
    var block = fullText.slice(start + '---ANALYYSI ALKAA---'.length, end);
    var ideas = [];
    var lines = block.split('\n');
    var re = /^IDEA\s*(\d+)\s*:\s*(.+)$/i;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].trim().match(re);
      if (!m) continue;
      var parsed = parseIdeaLine(m[2]);
      if (!parsed) continue;
      ideas.push({
        n: parseInt(m[1], 10),
        name: parsed.name,
        does: parsed.does,
        saves: parsed.saves
      });
    }
    return ideas;
  }

  function clearB44S3Fields() {
    ['b44InData', 'b44InActions', 'b44InWho', 'b44InMust'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function displayChatReply(raw) {
    if (raw.indexOf('---ANALYYSI ALKAA---') >= 0 && !b44AnalysisShown) {
      b44AnalysisShown = true;
      var pre = raw.split('---ANALYYSI ALKAA---')[0].trim();
      pre = pre.replace(/\bANALYYSI\s+VALMIS\b\.?/gi, '').trim();
      var shortMsg = pre ? pre + '\n\n✨ Tässä ne ovat — seitsemän ideaa juuri sinun kertomuksestasi. Tartu siihen joka kipaisee.' : '✨ Tässä ne ovat — seitsemän ideaa juuri sinun kertomuksestasi. Tartu siihen joka kipaisee.';
      addChat(shortMsg, false);
      var ideas = parseIdeas(raw);
      var hw = document.getElementById('b44IdeaHeadingWrap');
      if (hw) {
        hw.style.display = 'block';
        hw.classList.remove('b44-fade-in');
        void hw.offsetWidth;
        hw.classList.add('b44-fade-in');
      }
      renderIdeaCards(ideas);
      document.getElementById('b44IdeaInstr').style.display = 'block';
      return;
    }
    addChat(raw, false);
  }

  function renderIdeaCards(ideas) {
    var box = document.getElementById('b44IdeaCards');
    if (!box) return;
    box.innerHTML = '';
    box.style.display = ideas.length ? 'grid' : 'none';
    ideas.forEach(function (idea, idx) {
      var card = document.createElement('div');
      card.className = 'b44-idea-card';
      card.setAttribute('data-idx', String(idx));
      card.innerHTML =
        '<span class="b44-idea-badge">Idea ' + idea.n + '</span>' +
        '<h4 class="b44-idea-name">' + escapeHtml(idea.name) + '</h4>' +
        '<p class="b44-idea-does">' + escapeHtml(idea.does) + '</p>' +
        '<p class="b44-idea-saves">' + escapeHtml(idea.saves) + '</p>' +
        '<button type="button" class="practice-btn b44-select-btn" style="margin-top:0.75rem;">Tämä on se 🔥</button>';
      card.querySelector('.b44-select-btn').onclick = function () {
        [].forEach.call(box.querySelectorAll('.b44-idea-card'), function (el) { el.classList.remove('selected'); });
        card.classList.add('selected');
        B44_STATE.selectedIdea = idea;
        clearB44S3Fields();
        document.getElementById('b44ContinueBtn').disabled = false;
        var cel = document.getElementById('b44IdeaPickCelebrate');
        if (cel) cel.style.display = 'block';
        syncSelectedIdeaBox();
      };
      box.appendChild(card);
    });
  }

  function syncSelectedIdeaBox() {
    refreshS3IdeaPanel();
    var el = document.getElementById('b44SelectedIdeaBox');
    if (!el) return;
    var i = B44_STATE.selectedIdea;
    if (!i) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }
    el.innerHTML = '<strong>' + escapeHtml(i.name) + '</strong><br>' + escapeHtml(i.does) + (i.saves ? '<br><em style="color:var(--accent3);">' + escapeHtml(i.saves) + '</em>' : '');
    el.style.display = 'block';
  }

  window.b44StartInterview = function () {
    var btn = document.getElementById('b44StartInterviewBtn');
    if (btn) btn.style.display = 'none';
    B44_STATE.selectedIdea = null;
    clearB44S3Fields();
    syncSelectedIdeaBox();
    b44Thread = [];
    b44AnalysisShown = false;
    document.getElementById('b44Chat').innerHTML = '';
    document.getElementById('b44IdeaCards').innerHTML = '';
    document.getElementById('b44IdeaCards').style.display = 'none';
    var hw = document.getElementById('b44IdeaHeadingWrap');
    if (hw) { hw.style.display = 'none'; hw.classList.remove('b44-fade-in'); }
    var cel = document.getElementById('b44IdeaPickCelebrate');
    if (cel) cel.style.display = 'none';
    document.getElementById('b44IdeaInstr').style.display = 'none';
    document.getElementById('b44ContinueBtn').disabled = true;
    var sendBtn = document.getElementById('b44SendBtn');
    setChatEmptyVisible(false);
    addChat(B44_FIRST_MESSAGE, false);
    b44Thread.push({ role: 'user', content: 'Käyttäjä aloitti haastattelun ja on valmis vastaamaan.' });
    b44Thread.push({ role: 'assistant', content: B44_FIRST_MESSAGE });
    if (sendBtn) sendBtn.disabled = false;
  };

  window.b44SendChat = function () {
    var inp = document.getElementById('b44Input');
    var text = inp.value.trim();
    if (!text || b44AnalysisShown) return;
    addChat(text, true);
    inp.value = '';
    b44Thread.push({ role: 'user', content: text });
    var apiMsgs = b44Thread.map(function (m) {
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });
    var sendBtn = document.getElementById('b44SendBtn');
    sendBtn.disabled = true;
    setChatTypingVisible(true);
    claudeApi(apiMsgs, 2500).then(function (reply) {
      b44Thread.push({ role: 'assistant', content: reply });
      displayChatReply(reply);
    }).catch(function (e) {
      addChat('Virhe: ' + (e.message || 'yhteys'), false);
    }).then(function () {
      setChatTypingVisible(false);
      sendBtn.disabled = false;
    });
  };

  window.b44ContinueToPrompt = function () {
    if (!B44_STATE.selectedIdea) return;
    document.getElementById('s3-prompt').scrollIntoView({ behavior: 'smooth', block: 'start' });
    syncSelectedIdeaBox();
  };

  window.b44SetDevice = function (label) {
    B44_STATE.device = label;
    [].forEach.call(document.querySelectorAll('.b44-chip'), function (c) {
      c.classList.toggle('active', c.getAttribute('data-dev') === label);
    });
  };

  window.b44BuildPrompt = function () {
    var i = B44_STATE.selectedIdea;
    if (!i) { alert('Valitse ensin idea haastattelusta.'); return; }
    var d1 = document.getElementById('b44InData').value.trim();
    var d2 = document.getElementById('b44InActions').value.trim();
    var d3 = document.getElementById('b44InWho').value.trim();
    var d5 = document.getElementById('b44InMust').value.trim();
    if (!d1 || !d2 || !d3 || !d5) { alert('Täytä kaikki kentät.'); return; }
    var ctx =
      'VALITTU IDEA:\nNimi: ' + i.name + '\nMitä tekee: ' + i.does + '\nAikasäästö: ' + i.saves + '\n\n' +
      '1) Tieto jota käsitellään: ' + d1 + '\n' +
      '2) Toiminnot: ' + d2 + '\n' +
      '3) Kenelle: ' + d3 + '\n' +
      '4) Laite: ' + B44_STATE.device + '\n' +
      '5) Tärkein ominaisuus: ' + d5;

    var sys = 'Olet kokenut ohjelmistokehittäjä ja tuotesuunnittelija. Luo täydellinen prompt Base44-sovelluksen rakentamiseksi. Prompt menee ensin ChatGPT:hen tarkentamista varten ja sitten Base44:ään rakentamista varten.\n' +
      'Luo prompt joka sisältää kaikki nämä elementit:\n' +
      'SOVELLUKSEN NIMI JA TARKOITUS: [käyttäjän idea]\n' +
      'TOIMINNALLISUUS: [käyttäjän vastaukset]\n' +
      'TEKNISET VAATIMUKSET jotka lisäät AINA riippumatta käyttäjän vastauksista:\n\n' +
      'Kaikilla sivuilla on animaatiot — sivut liukuvat sisään, kortit animoituvat näkyviin\n' +
      'Kaikki painikkeet reagoivat klikkaukseen visuaalisesti — hover-efekti ja click-animaatio\n' +
      'Latausnäkymä kun data haetaan — ei tyhjää ruutua koskaan\n' +
      'Mobiiliresponsiivinen — toimii täydellisesti puhelimella\n' +
      'Tyhjä tila -näkymä kun ei ole dataa — kannustava teksti ei virheilmoitus\n' +
      'Onnistumisviesti kun käyttäjä tekee jotain — esim tallentaa tai poistaa\n' +
      'Värimaailma: moderni, ammattimainen, tumma sidebar vaalealla sisältöalueella\n' +
      'Navigaatio: selkeä valikko vasemmalla tai ylhäällä\n' +
      'Hakutoiminto jos sovelluksessa on listoja\n' +
      'Tyhjiä kenttiä ei voi tallentaa — validointi ennen tallennusta\n\n' +
      'Kirjoita prompt englanniksi koska Base44 toimii parhaiten englanniksi. Promptin tulee olla niin yksityiskohtainen että Base44 rakentaa täydellisen toimivan sovelluksen ensimmäisellä yrityksellä. Älä kirjoita ohjeita miten käyttää promptia — kirjoita vain prompt itse.';

    var out = document.getElementById('b44PromptOut');
    var post = document.getElementById('b44PromptPostGen');
    var loadEl = document.getElementById('b44PromptLoading');
    var readyB = document.getElementById('b44PromptReadyBanner');
    if (b44PromptLoadTimer) {
      clearInterval(b44PromptLoadTimer);
      b44PromptLoadTimer = null;
    }
    B44_STATE.promptReady = false;
    if (post) post.style.display = 'none';
    if (readyB) readyB.style.display = 'none';
    out.classList.remove('b44-prompt-out-flash');
    out.textContent = '…';
    var li = 0;
    if (loadEl) {
      loadEl.style.display = 'block';
      loadEl.textContent = B44_LOADING_MSGS[0];
      b44PromptLoadTimer = setInterval(function () {
        li = (li + 1) % B44_LOADING_MSGS.length;
        if (loadEl) loadEl.textContent = B44_LOADING_MSGS[li];
      }, 2000);
    }
    openAiSingle(sys, ctx, 3500).then(function (text) {
      if (b44PromptLoadTimer) {
        clearInterval(b44PromptLoadTimer);
        b44PromptLoadTimer = null;
      }
      if (loadEl) loadEl.style.display = 'none';
      out.textContent = text;
      B44_STATE.basePrompt = text;
      B44_STATE.promptReady = true;
      if (readyB) readyB.style.display = 'block';
      if (post) post.style.display = 'block';
      out.classList.remove('b44-prompt-out-flash');
      void out.offsetWidth;
      out.classList.add('b44-prompt-out-flash');
      setTimeout(function () { out.classList.remove('b44-prompt-out-flash'); }, 1000);
    }).catch(function (e) {
      if (b44PromptLoadTimer) {
        clearInterval(b44PromptLoadTimer);
        b44PromptLoadTimer = null;
      }
      if (loadEl) loadEl.style.display = 'none';
      out.textContent = 'Virhe: ' + e.message;
      B44_STATE.promptReady = false;
      if (post) post.style.display = 'none';
      if (readyB) readyB.style.display = 'none';
    });
  };

  window.b44CopyPrompt = function (btn) {
    var t = document.getElementById('b44PromptOut').textContent;
    if (!t || t === '…' || !B44_STATE.promptReady) return;
    navigator.clipboard.writeText(t).then(function () {
      btn.textContent = '✓ Kopioitu!';
      setTimeout(function () { btn.textContent = '📋 Kopioi rakennusohje'; }, 2200);
    });
  };

  window.b44CopyChatgptTemplate = function (el) {
    var prev = el.textContent;
    var t = (prev || '').trim();
    if (!t) return;
    navigator.clipboard.writeText(t).then(function () {
      el.textContent = '✓ Kopioitu leikepöydälle!';
      el.style.borderColor = 'var(--accent)';
      setTimeout(function () {
        el.textContent = prev;
        el.style.borderColor = '';
      }, 2000);
    });
  };

  window.b44GoToBuild = function () {
    var sec = document.getElementById('b44-rakennus');
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.b44SaveRefined = function () {
    var v = document.getElementById('b44RefinedPrompt').value.trim();
    if (!v) { alert('Liitä ChatGPT:n parannettu prompti.'); return; }
    B44_STATE.refinedPrompt = v;
    try { localStorage.setItem('b44_refined_prompt', v); } catch (e) {}
    var m = document.getElementById('b44RefinedOk');
    if (m) { m.style.display = 'block'; }
  };

  function syncUrlCelebrationLinks(u) {
    var link = document.getElementById('b44CelebrateLink');
    var urlCel = document.getElementById('b44UrlCelebration');
    var urlLink = document.getElementById('b44UrlCelebrationLink');
    if (!u) {
      if (urlCel) urlCel.style.display = 'none';
      return;
    }
    var href = u.indexOf('http') === 0 ? u : 'https://' + u;
    if (link) {
      link.href = href;
      link.textContent = u;
    }
    if (urlLink) {
      urlLink.href = href;
      urlLink.textContent = u;
    }
    if (urlCel) urlCel.style.display = 'block';
  }

  function refreshMilestoneCelebration() {
    var u = B44_STATE.appUrl || '';
    syncUrlCelebrationLinks(u);
    var card = document.getElementById('b44MilestoneCard');
    if (!card) return;
    card.style.display = u ? 'block' : 'none';
  }

  function initB44FinaleStats() {
    var card = document.getElementById('b44FinaleCard');
    if (!card || card.getAttribute('data-counted') === '1') return;
    function ease(t) { return 1 - Math.pow(1 - t, 2.5); }
    function run() {
      card.setAttribute('data-counted', '1');
      var d = 950;
      var s0 = performance.now();
      var n1 = document.getElementById('b44Stat1');
      var n2 = document.getElementById('b44Stat2');
      var n3 = document.getElementById('b44Stat3');
      function tick(now) {
        var p = Math.min(1, (now - s0) / d);
        var e = ease(p);
        if (n1) n1.textContent = String(Math.round(e * 1));
        if (n2) n2.textContent = String(Math.round(e * 60));
        if (n3) n3.textContent = String(Math.round(e * 0));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }
    var ob = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          run();
          ob.disconnect();
        }
      });
    }, { threshold: 0.15 });
    ob.observe(card);
  }

  window.b44SaveAppUrl = function () {
    var u = document.getElementById('b44AppUrl').value.trim();
    if (!u) { alert('Liitä sovelluksesi URL.'); return; }
    B44_STATE.appUrl = u;
    try { localStorage.setItem('b44_app_url', u); } catch (e) {}
    var m = document.getElementById('b44UrlOk');
    if (m) {
      m.textContent = '🔗 Linkki tallennettu — sovelluksesi on olemassa';
      m.style.display = 'block';
    }
    syncUrlCelebrationLinks(u);
    refreshMilestoneCelebration();
  };

  window.b44CopyFix = function (el) {
    var t = el.textContent || '';
    navigator.clipboard.writeText(t.trim());
    el.style.borderColor = 'var(--accent3)';
    setTimeout(function () { el.style.borderColor = ''; }, 1200);
  };

  window.b44CopyFixPre = function (btn, preId) {
    var pre = document.getElementById(preId);
    if (!pre) return;
    var t = (pre.textContent || '').trim();
    if (!t) return;
    var label = btn.getAttribute('data-label') || '📋 Kopioi';
    navigator.clipboard.writeText(t).then(function () {
      btn.textContent = 'Kopioitu!';
      setTimeout(function () { btn.textContent = label; }, 2000);
    });
  };

  window.b44ShareDoneCheck = function () {
    var c = document.getElementById('b44ShareDoneCb');
    var m = document.getElementById('b44ShareDoneMsg');
    if (m && c) m.style.display = c.checked ? 'block' : 'none';
  };

  window.b44WeekChallengeCheck = function () {
    var c = document.getElementById('b44WeekChallengeCb');
    var m = document.getElementById('b44WeekChallengeMsg');
    if (m && c) m.style.display = c.checked ? 'block' : 'none';
  };

  function parseB44ReflectionComb(comb) {
    var out = { r1: '', r2: '', r3: '' };
    if (!comb || !comb.trim()) return out;
    var cut4 = comb.indexOf('\n\n4) Jako ja palaute:');
    var main = cut4 >= 0 ? comb.substring(0, cut4) : comb;
    var m1 = main.match(/^1\)[^\n]*\n([\s\S]*?)(?=\n\n2\)|$)/);
    if (m1) out.r1 = m1[1].trim();
    var m2 = main.match(/\n\n2\)[^\n]*\n([\s\S]*?)(?=\n\n3\)|$)/);
    if (m2) out.r2 = m2[1].trim();
    var m3 = main.match(/\n\n3\)[^\n]*\n([\s\S]*?)$/);
    if (m3) out.r3 = m3[1].trim();
    return out;
  }

  window.b44SaveReflections = function () {
    var r1 = document.getElementById('b44Refl1').value.trim();
    var r2 = document.getElementById('b44Refl2').value.trim();
    var r3 = document.getElementById('b44Refl3').value.trim();
    if (!r1 && !r2 && !r3) {
      alert('Kirjoita vähintään yhteen kenttään ennen tallennusta.');
      return;
    }
    var combined = '';
    if (r1) combined += '1) Mikä yllätti sinut eniten tänään:\n' + r1;
    if (r2) {
      if (combined) combined += '\n\n';
      combined += '2) Minkä ongelman ratkaisit — ja kuinka paljon aikaa säästät viikossa?:\n' + r2;
    }
    if (r3) {
      if (combined) combined += '\n\n';
      combined += '3) Jos rakentaisit toisen sovelluksen huomenna — mitä se olisi?:\n' + r3;
    }
    var shareToEl = document.getElementById('b44ShareTo');
    var shareDone = document.getElementById('b44ShareDoneCb');
    var weekCh = document.getElementById('b44WeekChallengeCb');
    var shareTo = shareToEl ? shareToEl.value.trim() : '';
    if (shareTo || (shareDone && shareDone.checked)) {
      combined += '\n\n4) Jako ja palaute:\nKenelle: ' + (shareTo || '—') + '\nLähetin linkin: ' + (shareDone && shareDone.checked ? 'kyllä' : 'ei');
    }
    if (weekCh && weekCh.checked) {
      combined += '\n\n5) Viikon haaste: otin vastaan';
    }
    var hidden = document.getElementById('reflectionText');
    if (hidden) hidden.value = combined;
    window.saveReflectionToAPI('moduuli-visibility-growth-automation');
  };

  document.addEventListener('DOMContentLoaded', function () {
    refreshS3IdeaPanel();
    setChatEmptyVisible(true);
    try {
      var rp = localStorage.getItem('b44_refined_prompt');
      if (rp) {
        B44_STATE.refinedPrompt = rp;
        var ta = document.getElementById('b44RefinedPrompt');
        if (ta) ta.value = rp;
      }
      var url = localStorage.getItem('b44_app_url');
      if (url) {
        B44_STATE.appUrl = url;
        var inp = document.getElementById('b44AppUrl');
        if (inp) inp.value = url;
        syncUrlCelebrationLinks(url);
      }
    } catch (e) {}
    refreshMilestoneCelebration();
    initB44FinaleStats();
    if (window.loadReflection) {
      window.loadReflection('moduuli-visibility-growth-automation');
      setTimeout(function () {
        var comb = document.getElementById('reflectionText') && document.getElementById('reflectionText').value;
        if (!comb) return;
        var parsed = parseB44ReflectionComb(comb);
        if (parsed.r1) document.getElementById('b44Refl1').value = parsed.r1;
        if (parsed.r2) document.getElementById('b44Refl2').value = parsed.r2;
        if (parsed.r3) document.getElementById('b44Refl3').value = parsed.r3;
      }, 500);
    }
  });
})();
