/* Base44 — Rakenna oma sovellus (moduuli-visibility-growth-automation) */
(function () {
  var B44_SYS = 'Olet innovaatiokonsultti ja tuotesuunnittelija. Tavoite: auttaa käyttäjää löytämään yhden konkreettisen sovellusidean jonka he oikeasti käyttäisivät omassa elämässään — työssä, kotona, harrastuksissa, perheessä, opiskelussa, terveydessä, taloudessa tai missä tahansa arjessa. Älä ajaudu vain työelämään: kysy uteliaasti myös vapaa-ajasta, kodista ja muusta elämästä. Jos käyttäjä puhuu vain työstä, kysy ainakin kerran myös: missä muualla elämässäsi toistuu sama kaltainen vaiva tai missä säästäisit aikaa ja vaivaa — ellei hän nimenomaan sano haluavansa vain työvälineen.\n' +
    'Käy haastattelu näin:\n\n' +
    'Kysy yksi kysymys kerrallaan\n' +
    'Odota vastaus ennen seuraavaa kysymystä\n' +
    'Maksimissaan 10 kysymystä\n' +
    'Ole utelias ja kaivaudu syvemmälle — jos vastaus on pintapuolinen, pyydä tarkennusta\n' +
    'Luo luottavainen, lämmin tunnelma — ei kuulustelu vaan löytöretki\n\n' +
    'Kysymyspankki — valitse tilanteen mukaan ja sekoita työtä ja muuta elämää; ei tarvitse käyttää kaikkia:\n\n' +
    'Missä elämänalueella kaipaisit eniten apua juuri nyt — työ, koti, harrastus, perhe, opiskelu, terveys, talous vai jotain muuta?\n' +
    'Kuvaile yksi viime päivien tai viikon tilanne jossa turhauduit tai hukkasit aikaa — oli se työhön tai ei.\n' +
    'Onko jokin asia jota teet toistuvasti (viikottain tai kuukausittain) ja joka tuntuu turhalta, hitaalta tai sotkuiselta — töissä tai vapaa-ajalla?\n' +
    'Missä käytät eniten muistilappuja, viestejä, taulukoita tai sovelluksia jotka eivät oikein toimi tarpeisiisi — sekä työssä että muussa arjessa?\n' +
    'Kerro yksi tilanne jossa olet ajatellut: tähän pitäisi olla jokin parempi tapa tai pieni oma työkalu.\n' +
    'Jos ajattelisit vain vapaa-aikaasi ja kotiasi — mikä pieni rutiini tai muistettava asia vie eniten päätäsi tai aikaasi?\n' +
    'Onko harrastuksessa, perheessä tai opiskelussa jokin jota seuraat tai suunnittelet käsin ja unohdat helposti?\n' +
    'Mikä on se asia jonka aina lykkäät koska se tuntuu hankalalta tai tylsältä — vaikka se olisi ihan henkilökohtainen?\n' +
    'Jos voisit automatisoida tai yksinkertaistaa yhden asian koko elämässäsi (ei vain töissä), mikä se olisi?\n' +
    'Onko jokin asia josta sinun pitää muistuttaa itseäsi tai muita toistuvasti?\n' +
    'Jos sinulla olisi henkilökohtainen assistentti vain sinua varten — mitä pyytäisit häntä tekemään ensimmäisenä arjessasi?\n\n' +
    'Kun olet kysynyt riittävästi (vähintään 6 kysymystä, maksimissaan 10) ja sinulla on hyvä kuva käyttäjän tilanteesta, sano: ANALYYSI VALMIS ja tuota tämän jälkeen tarkalleen tässä rakenteessa:\n' +
    '---ANALYYSI ALKAA---\n' +
    'HAVAINTOSI:\n' +
    '[2-3 lausetta siitä mitä opit käyttäjästä ja heidän suurimmista haasteistaan]\n' +
    '7 SOVELLUS-IDEAA SINULLE:\n' +
    'Idea 1: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 2: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 3: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 4: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 5: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 6: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    'Idea 7: [Nimi] — [Yksi lause mitä sovellus tekee] — [Yksi lause miten se säästää aikaa]\n' +
    '---ANALYYSI LOPPUU---\n' +
    'Kirjoita suomeksi. Ole rehellinen ja konkreettinen. Ideoiden tulee olla erilaisia toisistaan — ei 7 variaatiota samasta ideasta. Vaihtele elämänalueita ja tyyppejä: työ, koti, harrastus, terveys, talous, opiskelu, perhe. Tyyppeinä esim. seurantatyökalut, generaattorit, laskurit, muistuttajat, analysoijat. Vähintään 2–3 ideaa saa olla selvästi työn ulkopuolelta jos käyttäjän vastaukset antavat siihen tilaa.\n\n' +
    'Jos et ole vielä kysynyt 6 kysymystä, esitä vain seuraava kysymys — älä tuota analyysiä.';

  var b44Thread = [];
  var b44AnalysisShown = false;
  var B44_STATE = { selectedIdea: null, basePrompt: '', refinedPrompt: '', appUrl: '', device: 'Molemmat' };

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

  function parseIdeas(fullText) {
    var start = fullText.indexOf('---ANALYYSI ALKAA---');
    var end = fullText.indexOf('---ANALYYSI LOPPUU---');
    if (start < 0 || end < 0 || end <= start) return [];
    var block = fullText.slice(start + '---ANALYYSI ALKAA---'.length, end);
    var ideas = [];
    var lines = block.split('\n');
    var re = /^Idea\s*(\d+)\s*:\s*(.+)$/i;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].trim().match(re);
      if (!m) continue;
      var rest = m[2];
      var parts = rest.split(/\s*—\s*/);
      if (parts.length >= 3) {
        ideas.push({ n: parseInt(m[1], 10), name: parts[0].trim(), does: parts[1].trim(), saves: parts[2].trim() });
      } else if (parts.length === 2) {
        ideas.push({ n: parseInt(m[1], 10), name: parts[0].trim(), does: parts[1].trim(), saves: '' });
      }
    }
    return ideas;
  }

  function displayChatReply(raw) {
    if (raw.indexOf('---ANALYYSI ALKAA---') >= 0 && !b44AnalysisShown) {
      b44AnalysisShown = true;
      var pre = raw.split('---ANALYYSI ALKAA---')[0].trim();
      var shortMsg = pre ? pre + '\n\n✓ Analyysi valmis — valitse yksi idea alta.' : '✓ Analyysi valmis — valitse yksi idea alta.';
      addChat(shortMsg, false);
      var ideas = parseIdeas(raw);
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
        '<button type="button" class="practice-btn b44-select-btn" style="margin-top:0.75rem;">Valitse</button>';
      card.querySelector('.b44-select-btn').onclick = function () {
        [].forEach.call(box.querySelectorAll('.b44-idea-card'), function (el) { el.classList.remove('selected'); });
        card.classList.add('selected');
        B44_STATE.selectedIdea = idea;
        document.getElementById('b44ContinueBtn').disabled = false;
        syncSelectedIdeaBox();
      };
      box.appendChild(card);
    });
  }

  function syncSelectedIdeaBox() {
    var el = document.getElementById('b44SelectedIdeaBox');
    if (!el || !B44_STATE.selectedIdea) return;
    var i = B44_STATE.selectedIdea;
    el.innerHTML = '<strong>' + escapeHtml(i.name) + '</strong><br>' + escapeHtml(i.does) + (i.saves ? '<br><em style="color:var(--accent3);">' + escapeHtml(i.saves) + '</em>' : '');
    el.style.display = 'block';
  }

  window.b44StartInterview = function () {
    var btn = document.getElementById('b44StartInterviewBtn');
    if (btn) btn.style.display = 'none';
    b44Thread = [];
    b44AnalysisShown = false;
    document.getElementById('b44Chat').innerHTML = '';
    document.getElementById('b44IdeaCards').innerHTML = '';
    document.getElementById('b44IdeaCards').style.display = 'none';
    document.getElementById('b44IdeaInstr').style.display = 'none';
    document.getElementById('b44ContinueBtn').disabled = true;
    var sendBtn = document.getElementById('b44SendBtn');
    if (sendBtn) sendBtn.disabled = true;
    var msgs = [{ role: 'user', content: 'Aloitetaan haastattelu. Olen valmis vastaamaan.' }];
    claudeApi(msgs, 800).then(function (reply) {
      b44Thread.push({ role: 'user', content: msgs[0].content });
      b44Thread.push({ role: 'assistant', content: reply });
      displayChatReply(reply);
      if (sendBtn) sendBtn.disabled = false;
    }).catch(function (e) {
      addChat('Virhe: ' + (e.message || 'yhteys') + '. Tarkista ANTHROPIC_API_KEY tai yritä uudelleen.', false);
      if (sendBtn) sendBtn.disabled = false;
    });
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
    claudeApi(apiMsgs, 2500).then(function (reply) {
      b44Thread.push({ role: 'assistant', content: reply });
      displayChatReply(reply);
    }).catch(function (e) {
      addChat('Virhe: ' + (e.message || 'yhteys'), false);
    }).then(function () { sendBtn.disabled = false; });
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
    out.textContent = '…';
    openAiSingle(sys, ctx, 3500).then(function (text) {
      out.textContent = text;
      B44_STATE.basePrompt = text;
    }).catch(function (e) {
      out.textContent = 'Virhe: ' + e.message;
    });
  };

  window.b44CopyPrompt = function (btn) {
    var t = document.getElementById('b44PromptOut').textContent;
    if (!t || t === '…') return;
    navigator.clipboard.writeText(t).then(function () {
      btn.textContent = '✓ Kopioitu!';
      setTimeout(function () { btn.textContent = '📋 Kopioi Base44-pohja'; }, 2200);
    });
  };

  window.b44SaveRefined = function () {
    var v = document.getElementById('b44RefinedPrompt').value.trim();
    if (!v) { alert('Liitä ChatGPT:n parannettu prompti.'); return; }
    B44_STATE.refinedPrompt = v;
    try { localStorage.setItem('b44_refined_prompt', v); } catch (e) {}
    var m = document.getElementById('b44RefinedOk');
    if (m) { m.style.display = 'block'; }
  };

  window.b44SaveAppUrl = function () {
    var u = document.getElementById('b44AppUrl').value.trim();
    if (!u) { alert('Liitä sovelluksesi URL.'); return; }
    B44_STATE.appUrl = u;
    try { localStorage.setItem('b44_app_url', u); } catch (e) {}
    var m = document.getElementById('b44UrlOk');
    if (m) m.style.display = 'block';
    var link = document.getElementById('b44CelebrateLink');
    if (link) {
      link.href = u.indexOf('http') === 0 ? u : 'https://' + u;
      link.textContent = u;
    }
  };

  window.b44CopyFix = function (el) {
    var t = el.textContent || '';
    navigator.clipboard.writeText(t.trim());
    el.style.borderColor = 'var(--accent3)';
    setTimeout(function () { el.style.borderColor = ''; }, 1200);
  };

  window.b44ChallengeCheck = function () {
    var c = document.getElementById('b44ChallengeCb');
    var m = document.getElementById('b44ChallengeMsg');
    if (m && c) m.style.display = c.checked ? 'block' : 'none';
  };

  window.b44SaveReflections = function () {
    var r1 = document.getElementById('b44Refl1').value.trim();
    var r2 = document.getElementById('b44Refl2').value.trim();
    var r3 = document.getElementById('b44Refl3').value.trim();
    if (!r1 || !r2 || !r3) {
      alert('Kirjoita kaikki kolme reflektiota ennen tallennusta.');
      return;
    }
    var combined = '1) Mikä yllätti:\n' + r1 + '\n\n2) Ongelma ja aikasäästö:\n' + r2 + '\n\n3) Toinen sovellusidea:\n' + r3;
    var hidden = document.getElementById('reflectionText');
    if (hidden) hidden.value = combined;
    window.saveReflectionToAPI('moduuli-visibility-growth-automation');
  };

  document.addEventListener('DOMContentLoaded', function () {
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
        var link = document.getElementById('b44CelebrateLink');
        if (link) {
          link.href = url.indexOf('http') === 0 ? url : 'https://' + url;
          link.textContent = url;
        }
      }
    } catch (e) {}
    if (window.loadReflection) {
      window.loadReflection('moduuli-visibility-growth-automation');
      setTimeout(function () {
        var comb = document.getElementById('reflectionText') && document.getElementById('reflectionText').value;
        if (!comb || comb.indexOf('1) Mikä yllätti:') < 0) return;
        var p1 = comb.split(/\n\n2\) Ongelma ja aikasäästö:/);
        var p2 = p1[1] && p1[1].split(/\n\n3\) Toinen sovellusidea:/);
        if (p1[0]) document.getElementById('b44Refl1').value = p1[0].replace(/^1\) Mikä yllätti:\s*\n?/, '').trim();
        if (p2 && p2[0]) document.getElementById('b44Refl2').value = p2[0].trim();
        if (p2 && p2[1]) document.getElementById('b44Refl3').value = p2[1].trim();
      }, 500);
    }
  });
})();
