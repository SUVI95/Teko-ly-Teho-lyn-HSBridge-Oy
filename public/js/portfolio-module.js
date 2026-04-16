/* Elävä CV — portfolio-moduuli (moduuli-ai-verkkosivustotyokalut) */
(function () {
  var portfolioData = {};
  try { portfolioData = JSON.parse(localStorage.getItem('portfolio_builder_data') || '{}'); } catch (e) { portfolioData = {}; }

  var cvData = {};
  try { cvData = JSON.parse(localStorage.getItem('cv_builder_data') || '{}'); } catch (e) { cvData = {}; }

  function savePortfolioField(key, val) {
    portfolioData[key] = val;
    try { localStorage.setItem('portfolio_builder_data', JSON.stringify(portfolioData)); } catch (e) {}
  }

  function getApiBase() {
    var pathname = window.location.pathname || '';
    var idx = pathname.indexOf('/module/');
    return idx > 0 ? pathname.substring(0, idx) : '';
  }

  function openAiMessages(systemPrompt, messages, maxTokens) {
    var url = (window.location.origin || '') + getApiBase() + '/api/ai/chat';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        system: systemPrompt,
        messages: messages,
        max_tokens: maxTokens || 2000,
        model: 'gpt-4o-mini'
      })
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (o) {
        if (!o.ok) throw new Error(o.data.error || o.data.message || 'Virhe');
        return o.data.text || '';
      });
  }

  /** Claude (Anthropic) — richer prompts when ANTHROPIC_API_KEY is set; falls back in API route. */
  function claudeMessages(systemPrompt, messages, maxTokens) {
    var url = (window.location.origin || '') + getApiBase() + '/api/ai/claude';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        system: systemPrompt,
        messages: messages,
        max_tokens: maxTokens || 4500
      })
    }).then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (o) {
        if (!o.ok) throw new Error(o.data.error || o.data.message || 'Claude-virhe');
        return o.data.text || '';
      });
  }

  function withMasterPromptMandatoryBlock() {
    return '\n\n=== USER NON-NEGOTIABLE REQUIREMENTS (you MUST embed every item below in the final English build prompt in full detail — do not summarize away) ===\n' +
      '1) PORTFOLIO CHATBOT (MANDATORY): The site MUST include a visible, modern on-page AI chatbot for visitors. Specify: placement (e.g. floating action button bottom-right opening a chat drawer, OR a dedicated "Kysy minulta" / Ask me section above the footer). Include 3–5 suggested starter questions visitors can tap (in Finnish if the site is Finnish) that the bot should answer using only the candidate\'s content on the page (skills, experience, achievements). Require mobile-friendly UI (full-width panel on small screens), accessible focus/labels, and on-brand styling matching the rest of the site.\n' +
      '2) MODERN VISUAL DESIGN (2024–2025): Explicitly demand a contemporary premium look — not a dated template. Refined type scale (clear hierarchy), generous whitespace, cohesive palette from brand hex colors, optional subtle gradients or glass cards, crisp spacing, professional imagery placeholders if needed. Avoid generic "AI slop" or cluttered hero.\n' +
      '3) MOTION & MICRO-INTERACTIONS (MANDATORY DETAIL): Spell out concrete animation behavior: smooth scroll; section entrances on scroll (staggered fade-up or slide-in with sensible duration/easing); hover states on cards and primary CTAs (subtle lift, shadow, or scale); button and link transitions. Mention respecting prefers-reduced-motion (simpler fades for users who prefer less motion). Optional: very subtle hero background motion (slow gradient drift) — only if it stays professional.\n' +
      '4) POLISH: Keyboard focus rings, WCAG-minded contrast, fast perceived load, consistent component styling.\n' +
      'The output must be ONE copy-paste English prompt for Lovable/Base44 with enough specificity that the builder implements chatbot + motion + modern UI without the user having to add follow-ups.\n';
  }

  function callMasterPromptModel(systemPrompt, userContent, maxTokens) {
    var msgs = [{ role: 'user', content: userContent }];
    return claudeMessages(systemPrompt, msgs, maxTokens).catch(function () {
      return openAiMessages(systemPrompt, msgs, maxTokens);
    });
  }

  var selectedTool = portfolioData.tool || '';
  var brandThread = [];
  var lastBrandRecommendation = '';
  var selectedTagIdx = -1;
  var selectedBioIdx = -1;
  var achFormattedLines = ['', '', ''];

  var BRAND_SYSTEM = 'Olet kokenut henkilöbrändi-asiantuntija ja visuaalinen suunnittelija. Haastattelet ammattilaista portfoliosivuston brändi-identiteetin rakentamiseksi. Kysy tarkalleen nämä 5 kysymystä yksi kerrallaan — älä kysy kaikkia yhtä aikaa. Odota vastaus ennen seuraavaa kysymystä.\n' +
    'Kysymys 1: Kun olet parhaimmillasi työssäsi — mitä teet ja mikä tilanteessa on erityistä?\n' +
    'Kysymys 2: Mikä on se asia jonka kollega tai asiakas aina muistaa sinusta — ominaisuus tai tapa toimia?\n' +
    'Kysymys 3: Mitkä kolme sanaa kuvaisivat sinua ammattilaisena — sanojen joita itse käyttäisit, ei CV-kliseitä?\n' +
    'Kysymys 4: Mitä haluat rekrytoijan tai asiakkaan TUNTEVAN kun he näkevät sivustosi — luottamus, energia, rauhallisuus, rohkeus?\n' +
    'Kysymys 5: Nimeä yksi ammattilainen tai brändi jonka visuaalinen ilme resonoi sinuun — ja kerro miksi.\n' +
    'Kun olet saanut kaikki 5 vastausta, tuota brändisuositus tässä rakenteessa:\n' +
    'VÄRIT: Pääväri (hex), tukiväri (hex), taustaväri (hex) — perustele jokainen valinta vastauksiin viitaten\n' +
    'FONTIT: Otsikkofontit ja tekstifontit — perustele tyyli\n' +
    'TUNNELMA: 3 adjektiivia jotka kuvaavat visuaalista identiteettiä\n' +
    'LAYOUT-SUOSITUS: Minimalistinen / rohkea / klassinen / moderni / lämmin — perustele\n' +
    'YKSI LAUSE: Brändi-identiteettisi tiivistettynä\n' +
    'Kirjoita suomeksi. Ole konkreettinen ja henkilökohtainen — ei geneerisiä suosituksia.\n\n' +
    'Jos käyttäjä on vastannut alle 5 kysymykseen, esitä vain seuraava kysymys numerolla (esim. "Kysymys 2: ..."). Älä toista aiempia kysymyksiä. Pidä viesti lyhyenä.';

  function addBrandMsg(text, isUser) {
    var c = document.getElementById('brandChat');
    if (!c) return;
    var d = document.createElement('div');
    d.className = 'chat-msg ' + (isUser ? 'user' : 'ai');
    d.innerHTML = '<div class="chat-bubble">' + escapeHtml(text) + '</div>';
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function userBrandCount() {
    return brandThread.filter(function (m) { return m.role === 'user'; }).length;
  }

  window.startBrandInterview = function () {
    var btn = document.getElementById('startBrandBtn');
    if (btn) btn.style.display = 'none';
    brandThread = [];
    document.getElementById('brandChat').innerHTML = '';
    var q1 = 'Kysymys 1: Kun olet parhaimmillasi työssäsi — mitä teet ja mikä tilanteessa on erityistä?';
    brandThread.push({ role: 'assistant', content: q1 });
    addBrandMsg(q1, false);
    document.getElementById('brandProgress').textContent = 'Kysymys 1 / 5';
  };

  window.sendBrandMsg = function () {
    var input = document.getElementById('brandInput');
    var text = input.value.trim();
    if (!text) return;
    addBrandMsg(text, true);
    brandThread.push({ role: 'user', content: text });
    input.value = '';
    var uc = userBrandCount();
    document.getElementById('brandProgress').textContent = 'Vastaus ' + uc + ' / 5';
    var sendBtn = document.getElementById('brandSendBtn');
    sendBtn.disabled = true;

    var msgs = brandThread.map(function (m) {
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
    });
    if (msgs.length && msgs[0].role === 'assistant') {
      msgs = [{ role: 'user', content: 'Aloitetaan brändihaastattelu.' }].concat(msgs);
    }

    openAiMessages(BRAND_SYSTEM, msgs, uc >= 5 ? 1800 : 600)
      .then(function (reply) {
        addBrandMsg(reply, false);
        brandThread.push({ role: 'assistant', content: reply });
        if (uc >= 5 || /VÄRIT\s*:/i.test(reply) || /YKSI LAUSE/i.test(reply)) {
          lastBrandRecommendation = reply;
          document.getElementById('brandSaveBlock').classList.remove('hidden');
          document.getElementById('brandProgress').textContent = 'Brändisuositus valmis — tallenna';
        }
      })
      .catch(function (e) { addBrandMsg('Virhe: ' + (e.message || 'yhteys'), false); })
      .then(function () { sendBtn.disabled = false; });
  };

  window.saveBrandIdentity = function () {
    var text = lastBrandRecommendation || (brandThread.length && brandThread[brandThread.length - 1].role === 'assistant' ? brandThread[brandThread.length - 1].content : '');
    if (!text) { alert('Ei tallennettavaa suositusta.'); return; }
    savePortfolioField('brandIdentity', text);
    savePortfolioField('designBrief', text);
    document.getElementById('brandSaveMsg').style.display = 'block';
  };

  function syncCvToPortfolio() {
    try { localStorage.setItem('cv_builder_data', JSON.stringify(cvData)); } catch (e) {}
  }

  window.syncField = function (key, val) {
    cvData[key] = val;
    syncCvToPortfolio();
  };

  function getContentContext() {
    return 'Nimi: ' + (document.getElementById('fldName') && document.getElementById('fldName').value || cvData.name || '') +
      '\nPaikkakunta: ' + (document.getElementById('fldCity') && document.getElementById('fldCity').value || cvData.city || '') +
      '\nTavoiterooli: ' + (document.getElementById('fldRole') && document.getElementById('fldRole').value || cvData.targetRole || '') +
      '\nUrahistoria: ' + (document.getElementById('fldCareer') && document.getElementById('fldCareer').value || cvData.careerSummary || '') +
      '\nTaidot: ' + (document.getElementById('fldSkills') && document.getElementById('fldSkills').value || cvData.skills || '') +
      '\nKoulutus: ' + (document.getElementById('fldEdu') && document.getElementById('fldEdu').value || cvData.education || '') +
      '\nKielet: ' + (document.getElementById('fldLang') && document.getElementById('fldLang').value || cvData.languages || '') +
      '\nBrändi-identiteetti:\n' + (portfolioData.brandIdentity || portfolioData.designBrief || '');
  }

  window.updateContentPreview = function () {
    var el = document.getElementById('contentPreviewText');
    if (!el) return;
    var tag = document.getElementById('pTagline') && document.getElementById('pTagline').value;
    var bio = document.getElementById('pBio') && document.getElementById('pBio').value;
    var ach = achFormattedLines.filter(Boolean).join('\n') || (portfolioData.achievements || '');
    el.textContent = 'TAGLINE:\n' + (tag || '(täytä)') + '\n\nBIO:\n' + (bio || '(täytä)') + '\n\nSAAVUTUKSET:\n' + (ach || '(täytä)');
  };

  window.saveAchRaw = function () {
    var a = (document.getElementById('ach1') || {}).value || '';
    var b = (document.getElementById('ach2') || {}).value || '';
    var c = (document.getElementById('ach3') || {}).value || '';
    savePortfolioField('achRaw', JSON.stringify([a, b, c]));
  };

  window.generateTaglines = function () {
    var btn = document.getElementById('tagGenBtn');
    if (btn) { btn.disabled = true; }
    var sys = 'Olet henkilöbrändäyksen asiantuntija. Luo 3 erilaista tagline-vaihtoehtoa henkilölle portfoliosivustolle. Vaihtoehto 1: faktapohjainen ja tuloksiin fokusoituva. Vaihtoehto 2: persoonallinen ja tunnepohjainen. Vaihtoehto 3: lyhyt ja rohkea — max 5 sanaa. Kirjoita suomeksi. Ei kliseitä kuten motivoitunut tai tiimipelaaja. Vastaa muodossa:\nTAG1: ...\nTAG2: ...\nTAG3: ...';
    openAiMessages(sys, [{ role: 'user', content: getContentContext() }], 500)
      .then(function (reply) {
        var tags = [];
        for (var ti = 1; ti <= 3; ti++) {
          var rm = reply.match(new RegExp('TAG\\s*' + ti + '\\s*[:：]\\s*(.+)', 'i'));
          if (rm) tags.push(rm[1].trim());
        }
        if (tags.length < 3) {
          tags = reply.split(/\n/).map(function (x) { return x.replace(/^TAG\s*\d+\s*[:：]\s*/i, '').trim(); }).filter(function (x) { return x && x.length < 120; }).slice(0, 3);
        }
        var box = document.getElementById('taglineCards');
        box.innerHTML = '';
        tags.forEach(function (t, i) {
          var d = document.createElement('div');
          d.className = 'pick-card' + (i === 0 ? ' selected' : '');
          d.textContent = t;
          d.onclick = function () {
            [].forEach.call(box.querySelectorAll('.pick-card'), function (x) { x.classList.remove('selected'); });
            d.classList.add('selected');
            selectedTagIdx = i;
            document.getElementById('pTagline').value = t;
            savePortfolioField('tagline', t);
            updateContentPreview();
          };
          box.appendChild(d);
        });
        if (tags[0]) {
          document.getElementById('pTagline').value = tags[0];
          savePortfolioField('tagline', tags[0]);
          updateContentPreview();
        }
      })
      .catch(function (e) { alert(e.message); })
      .then(function () { if (btn) btn.disabled = false; });
  };

  window.generateBios = function () {
    var btn = document.getElementById('bioGenBtn');
    if (btn) btn.disabled = true;
    var sys = 'Olet kokenut copywriter joka erikoistuu ammattilaisten henkilöbrändäykseen. Kirjoita 2 erilaista bio-vaihtoehtoa portfoliosivustolle. Bio 1: asiallinen ja tuloshakuinen, 3-4 lausetta. Bio 2: henkilökohtaisempi ja tarinallinen, 3-4 lausetta. Molemmissa: kuka henkilö on, mitä hän tekee parhaiten ja mikä tekee hänestä erityisen. Kirjoita suomeksi. Ei robottikieltä. Ei kliseitä. Vastaa:\nBIO1: ...\nBIO2: ...';
    openAiMessages(sys, [{ role: 'user', content: getContentContext() }], 700)
      .then(function (reply) {
        var bios = [];
        var m = reply.match(/BIO1:\s*([\s\S]*?)BIO2:/i);
        var m2 = reply.match(/BIO2:\s*([\s\S]*)/i);
        if (m && m2) {
          bios.push(m[1].trim());
          bios.push(m2[1].trim());
        } else {
          var parts = reply.split(/\n\n+/);
          bios = parts.slice(0, 2);
        }
        var box = document.getElementById('bioCards');
        box.innerHTML = '';
        bios.forEach(function (b, i) {
          var d = document.createElement('div');
          d.className = 'pick-card' + (i === 0 ? ' selected' : '');
          d.textContent = b;
          d.onclick = function () {
            [].forEach.call(box.querySelectorAll('.pick-card'), function (x) { x.classList.remove('selected'); });
            d.classList.add('selected');
            var ta = document.getElementById('pBio');
            ta.value = b;
            savePortfolioField('bio', b);
            updateContentPreview();
            ta.focus();
            try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {}
          };
          box.appendChild(d);
        });
        if (bios[0]) {
          var ta0 = document.getElementById('pBio');
          ta0.value = bios[0];
          savePortfolioField('bio', bios[0]);
          updateContentPreview();
          ta0.focus();
        }
      })
      .catch(function (e) { alert(e.message); })
      .then(function () { if (btn) btn.disabled = false; });
  };

  window.generateAchievements = function () {
    var a = document.getElementById('ach1').value.trim();
    var b = document.getElementById('ach2').value.trim();
    var c = document.getElementById('ach3').value.trim();
    if (!a && !b && !c) { alert('Täytä vähintään yksi saavutus.'); return; }
    var btn = document.getElementById('achGenBtn');
    if (btn) btn.disabled = true;
    var sys = 'Olet rekrytointikonsultti. Muotoile nämä saavutukset portfoliosivustoon sopiviksi — lyhyt, vaikuttava, numeroilla tuettu. Jokainen saavutus max 15 sanaa. Aloita verbillä. Lisää numero tai mittari jos puuttuu. Kirjoita suomeksi. Vastaa:\nS1: ...\nS2: ...\nS3: ...';
    openAiMessages(sys, [{ role: 'user', content: 'Saavutukset:\n1. ' + a + '\n2. ' + b + '\n3. ' + c }], 400)
      .then(function (reply) {
        var out = ['', '', ''];
        for (var i = 0; i < 3; i++) {
          var re = new RegExp('S' + (i + 1) + ':\\s*([^\\n]+)', 'i');
          var mm = reply.match(re);
          out[i] = mm ? mm[1].trim() : '';
        }
        if (!out[0]) out = reply.split(/\n/).filter(Boolean).slice(0, 3);
        achFormattedLines = out;
        savePortfolioField('achievements', out.join('\n'));
        var wrap = document.getElementById('achFormatted');
        wrap.innerHTML = '<div class="form-group"><label class="form-label">Muokkaa rivejä</label></div>';
        var fg = wrap.querySelector('.form-group');
        out.forEach(function (line, idx) {
          var inp = document.createElement('input');
          inp.className = 'form-input';
          inp.style.marginBottom = '.5rem';
          inp.setAttribute('data-ach-i', String(idx));
          inp.value = line;
          fg.appendChild(inp);
        });
        [].forEach.call(wrap.querySelectorAll('input[data-ach-i]'), function (inp) {
          inp.addEventListener('input', function () {
            var ix = parseInt(inp.getAttribute('data-ach-i'), 10);
            achFormattedLines[ix] = inp.value;
            savePortfolioField('achievements', achFormattedLines.join('\n'));
            updateContentPreview();
          });
        });
        updateContentPreview();
      })
      .catch(function (e) { alert(e.message); })
      .then(function () { if (btn) btn.disabled = false; });
  };

  window.selectTool = function (tool, silent) {
    selectedTool = tool;
    if (!silent) savePortfolioField('tool', tool);
    document.getElementById('toolLovable').classList.toggle('selected', tool === 'lovable');
    document.getElementById('toolBase44').classList.toggle('selected', tool === 'base44');
    var btn = document.getElementById('masterPromptBtn');
    btn.disabled = false;
    showBuildColumns();
  };

  function showBuildColumns() {
    var lov = document.getElementById('colLovable');
    var b44 = document.getElementById('colBase44');
    if (!lov || !b44) return;
    if (selectedTool === 'lovable') {
      lov.classList.remove('hidden');
      b44.classList.add('hidden');
    } else if (selectedTool === 'base44') {
      b44.classList.remove('hidden');
      lov.classList.add('hidden');
    } else {
      lov.classList.remove('hidden');
      b44.classList.remove('hidden');
    }
  }

  function masterPromptUserPayload() {
    return getContentContext() + '\n\nTagline: ' + (portfolioData.tagline || '') +
      '\nBio: ' + (portfolioData.bio || '') +
      '\nSaavutukset:\n' + (portfolioData.achievements || '') +
      '\nBrändi (täysi):\n' + (portfolioData.brandIdentity || portfolioData.designBrief || '') +
      withMasterPromptMandatoryBlock();
  }

  window.buildMasterPrompt = function () {
    if (!selectedTool) { alert('Valitse Lovable tai Base44.'); return; }
    var toolLabel = selectedTool === 'lovable' ? 'Lovable' : 'Base44';
    var wrap = document.getElementById('masterPromptWrap');
    var txt = document.getElementById('masterPromptText');
    wrap.classList.remove('hidden');
    txt.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
    document.getElementById('promptChecklist').classList.remove('hidden');
    document.getElementById('masterInstr').classList.remove('hidden');
    var sys = 'You are a senior product designer and front-end architect. Write ONE comprehensive English master prompt for ' + toolLabel + ' to build a single-page (or clearly sectioned) personal portfolio website for a job seeker.\n\n' +
      'The user message includes CV/brand content AND a block marked USER NON-NEGOTIABLE REQUIREMENTS. You must integrate EVERY requirement (especially the on-site chatbot, detailed motion/animation specs, and modern 2024–2025 visual direction) into the build prompt with concrete, implementation-ready wording — not a vague bullet list.\n\n' +
      'Your output structure (all in English, paste-ready):\n' +
      '1) PROJECT GOAL — one short paragraph\n' +
      '2) VISUAL DESIGN SYSTEM — colors (hex), fonts, spacing vibe, imagery, what to avoid\n' +
      '3) INFORMATION ARCHITECTURE — ordered sections: Hero, About/Bio, Achievements, Skills (as tags/chips), Experience timeline, Contact, plus the CHATBOT (placement, UX flow, starter questions, behavior, mobile)\n' +
      '4) COPY — embed all provided Finnish copy in appropriate sections (tagline, bio, achievements, skills, experience) — you may lightly adapt for clarity in context but do not invent employers or degrees\n' +
      '5) INTERACTIONS & ANIMATION — explicit: scroll behavior, section reveal pattern, hover/focus micro-interactions, reduced-motion fallback\n' +
      '6) QUALITY BAR — accessibility, contrast, performance\n\n' +
      'Rules: No meta-instructions ("here is a prompt"). No markdown title fences unless they help the builder. No code blocks unless essential. Output only the master prompt text that the user will paste into ' + toolLabel + '.';
    callMasterPromptModel(sys, masterPromptUserPayload(), 4500)
      .then(function (reply) {
        txt.textContent = reply;
        savePortfolioField('masterPrompt', reply);
      })
      .catch(function (e) { txt.textContent = 'Virhe: ' + e.message; });
  };

  window.refineMasterPrompt = function () {
    var note = document.getElementById('promptRefineNote').value.trim();
    if (!note) { alert('Kirjoita mitä haluat muuttaa.'); return; }
    var prev = document.getElementById('masterPromptText').textContent;
    var txt = document.getElementById('masterPromptText');
    txt.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
    var sys = 'Update the following portfolio master prompt per the user\'s change request. Output the FULL revised prompt in English, paste-ready for Lovable/Base44.\n' +
      'CRITICAL: You must PRESERVE and RE-EMBED all non-negotiable requirements: on-site AI chatbot (placement, starter questions, mobile, on-brand), modern 2024–2025 visual direction, and detailed motion/micro-interactions with reduced-motion fallback. If the user\'s note accidentally removes them, still keep them.\n' +
      'Do not add meta commentary — only the prompt text.';
    callMasterPromptModel(sys, 'Nykyinen prompt:\n' + prev + '\n\nMuutos / tarkennus (suomeksi tai englanniksi):\n' + note + withMasterPromptMandatoryBlock(), 4500)
      .then(function (reply) {
        txt.textContent = reply;
        savePortfolioField('masterPrompt', reply);
      })
      .catch(function (e) { txt.textContent = 'Virhe: ' + e.message; });
  };

  window.copyMasterPrompt = function (btn) {
    var text = document.getElementById('masterPromptText').textContent;
    if (!text || text.indexOf('loading-dots') >= 0) return;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = '✓ Kopioitu!';
      btn.classList.add('ok');
      setTimeout(function () { btn.textContent = '📋 Kopioi master prompt'; btn.classList.remove('ok'); }, 2200);
    });
  };

  window.copyFix = function (el) {
    var t = el.textContent || '';
    navigator.clipboard.writeText(t).then(function () {
      el.style.borderColor = 'var(--accent3)';
      setTimeout(function () { el.style.borderColor = ''; }, 1200);
    });
  };

  window.saveSiteUrl = function () {
    var u = document.getElementById('pUrl').value.trim();
    if (!u) { alert('Liitä URL.'); return; }
    savePortfolioField('siteUrl', u);
    document.getElementById('urlSavedMsg').style.display = 'block';
    prefillReviewUrl();
  };

  window.prefillReviewUrl = function () {
    var p = document.getElementById('pUrl') && document.getElementById('pUrl').value;
    var r = document.getElementById('reviewUrl');
    if (r && p && !r.value) { r.value = p; savePortfolioField('reviewUrl', p); }
  };

  function sectionChecklistText() {
    var parts = [];
    [].forEach.call(document.querySelectorAll('.rev-sec:checked'), function (cb) {
      parts.push(cb.getAttribute('data-sec'));
    });
    return parts.join(', ');
  }

  window.reviewPortfolio = function () {
    var works = document.getElementById('revWorks').value.trim();
    var weak = document.getElementById('revWeak').value.trim();
    var url = document.getElementById('reviewUrl').value.trim();
    if (!works && !weak) { alert('Täytä vähintään toinen lyhyt kenttä.'); return; }
    var result = document.getElementById('reviewResult');
    var cards = document.getElementById('reviewCards');
    result.style.display = 'block';
    cards.innerHTML = '<span class="loading-dots"><span></span><span></span><span></span></span>';
    var sys = 'Olet kolme eri asiantuntijaa arvioimassa portfoliosivustoa. Anna palautetta tässä rakenteessa:\n' +
      'REKRYTOIJA (10 sekunnin ensivaikutelma):\nMitä huomaan ensin?\nJäänkö sivustolle vai poistunko?\nMitä jää puuttumaan?\nOnko portfolio-chatbot helposti löydettävissä ja uskottava — vai puuttuuko se?\nYksi konkreettinen parannusehdotus\n\n' +
      'UX-SUUNNITTELIJA (käytettävyys ja visuaalisuus):\nMikä designissa toimii?\nMikä haittaa lukukokemusta?\nYksi konkreettinen parannusehdotus\n\n' +
      'KILPAILIJA (strateginen katse):\nMikä erottaa tämän hakijan muista?\nMikä on tämän sivuston heikoin kohta kilpailullisesti?\nYksi asia jonka tekisin eri tavalla\n\n' +
      'Päätä yhteenvetoon: TOP 2 parannusta tärkeysjärjestyksessä.\n\n' +
      'Lopuksi täsmälleen näin (tärkeää):\n===PAR1===\n[Yksi lyhyt suomenkielinen korjausohje jonka voi liittää Lovableen/Base44:ään]\n===PAR2===\n[Toinen lyhyt suomenkielinen korjausohje]\n\n' +
      'Kirjoita suomeksi. Ole rehellinen mutta rakentava. Konkretia on tärkeämpää kuin kohteliaisuus.';
    var ctx = 'Osiot sivulla (valitut): ' + sectionChecklistText() + '\nMikä toimii: ' + works + '\nMikä heikko: ' + weak + '\nLinkki: ' + url + '\nRooli: ' + (cvData.targetRole || '');
    openAiMessages(sys, [{ role: 'user', content: ctx }], 2200)
      .then(function (reply) {
        document.getElementById('reviewText').textContent = reply;
        var r1 = reply.match(/===PAR1===\s*([\s\S]*?)===PAR2===/);
        var r2 = reply.match(/===PAR2===\s*([\s\S]*?)(?:\n===|$)/);
        var p1 = r1 ? r1[1].trim() : 'Paranna hero-osion kontrastia ja varmista että nimi ja tagline näkyvät selvästi mobiilissa.';
        var p2 = r2 ? r2[1].trim() : 'Tiivistä bio ja lisää yksi konkreettinen mittari saavutuksiin.';
        cards.innerHTML =
          '<div class="review-card"><h4>👔 Rekrytoija</h4><div class="ai-result-text" style="white-space:pre-wrap;">' + escapeHtml(extractSection(reply, 'REKRYTOIJA', 'UX-SUUNNITTELIJA')) + '</div></div>' +
          '<div class="review-card"><h4>🎨 UX-suunnittelija</h4><div class="ai-result-text" style="white-space:pre-wrap;">' + escapeHtml(extractSection(reply, 'UX-SUUNNITTELIJA', 'KILPAILIJA')) + '</div></div>' +
          '<div class="review-card"><h4>🎯 Kilpailija</h4><div class="ai-result-text" style="white-space:pre-wrap;">' + escapeHtml(extractSection(reply, 'KILPAILIJA', '===PAR1===')) + '</div></div>';
        document.getElementById('top2text1').textContent = 'Parannus 1';
        document.getElementById('top2text2').textContent = 'Parannus 2';
        document.getElementById('top2prompt1').textContent = p1;
        document.getElementById('top2prompt2').textContent = p2;
        document.getElementById('top2Block').classList.remove('hidden');
      })
      .catch(function (e) {
        cards.innerHTML = '<p>Virhe: ' + escapeHtml(e.message) + '</p>';
      });
  };

  function extractSection(full, start, endKeyword) {
    var i = full.indexOf(start);
    if (i < 0) return '—';
    var j = full.indexOf(endKeyword, i + 15);
    if (j < 0 || endKeyword === 'Päätä') j = full.indexOf('===PAR1===', i);
    if (j < 0) j = full.length;
    return full.substring(i, Math.min(j, i + 1400)).trim();
  }

  window.saveImproveNote = function () {
    document.getElementById('improveSaved').style.display = 'block';
  };

  window.checkPublishAll = function () {
    var ok = ['pub1', 'pub2', 'pub3', 'pub4'].every(function (id) {
      var el = document.getElementById(id);
      return el && el.checked;
    });
    if (ok) {
      document.getElementById('celebrationBlock').classList.remove('hidden');
      var tg = portfolioData.tagline || document.getElementById('pTagline') && document.getElementById('pTagline').value || '—';
      document.getElementById('celeTagline').textContent = tg;
      var u = portfolioData.siteUrl || document.getElementById('pUrl') && document.getElementById('pUrl').value || '#';
      var a = document.getElementById('celeUrl');
      a.href = u.indexOf('http') === 0 ? u : 'https://' + u;
      a.textContent = u;
      document.getElementById('celebrationBlock').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.saveReflection = function () {
    var t1 = document.getElementById('reflectionText1').value.trim();
    var t2 = document.getElementById('reflectionText2').value.trim();
    if (!t1 && !t2) {
      alert('Kirjoita ainakin toinen reflektio-kenttä ennen tallennusta.');
      return;
    }
    var combined = 'Miltä tuntui:\n' + t1 + '\n\nMikä yllätti:\n' + t2;
    document.getElementById('reflectionText').value = combined;
    window.saveReflectionToAPI('moduuli-ai-verkkosivustotyokalut');
  };

  function restoreFormFields() {
    var map = [
      ['fldName', 'name'], ['fldCity', 'city'], ['fldRole', 'targetRole'], ['fldCareer', 'careerSummary'],
      ['fldSkills', 'skills'], ['fldEdu', 'education'], ['fldLang', 'languages']
    ];
    map.forEach(function (pair) {
      var el = document.getElementById(pair[0]);
      if (!el) return;
      var v = portfolioData['fld_' + pair[1]] || cvData[pair[1]] || '';
      if (v) el.value = v;
    });
    if (portfolioData.tagline) document.getElementById('pTagline').value = portfolioData.tagline;
    if (portfolioData.bio) document.getElementById('pBio').value = portfolioData.bio;
    if (portfolioData.siteUrl) document.getElementById('pUrl').value = portfolioData.siteUrl;
    if (portfolioData.reviewUrl) document.getElementById('reviewUrl').value = portfolioData.reviewUrl;
    if (portfolioData.revWorks) document.getElementById('revWorks').value = portfolioData.revWorks;
    if (portfolioData.revWeak) document.getElementById('revWeak').value = portfolioData.revWeak;
    if (portfolioData.shareToWho) document.getElementById('shareToWho').value = portfolioData.shareToWho;
    try {
      var raw = JSON.parse(portfolioData.achRaw || '[]');
      if (raw[0]) document.getElementById('ach1').value = raw[0];
      if (raw[1]) document.getElementById('ach2').value = raw[1];
      if (raw[2]) document.getElementById('ach3').value = raw[2];
    } catch (e) {}
    if (portfolioData.achievements) {
      achFormattedLines = portfolioData.achievements.split('\n');
      updateContentPreview();
    }
    if (selectedTool) selectTool(selectedTool, true);
    showBuildColumns();
    prefillReviewUrl();
  }

  function syncFldToStorage() {
    [['fldName', 'name'], ['fldCity', 'city'], ['fldRole', 'targetRole'], ['fldCareer', 'careerSummary'], ['fldSkills', 'skills'], ['fldEdu', 'education'], ['fldLang', 'languages']].forEach(function (p) {
      var el = document.getElementById(p[0]);
      if (el) {
        cvData[p[1]] = el.value;
        savePortfolioField('fld_' + p[1], el.value);
      }
    });
    syncCvToPortfolio();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var sections = document.querySelectorAll('.section[data-index]');
    var navSteps = document.getElementById('navSteps');
    var progressBar = document.getElementById('progress-bar');
    if (navSteps && sections.length) {
      navSteps.innerHTML = '';
      sections.forEach(function (s, i) {
        var pip = document.createElement('div');
        pip.className = 'step-pip' + (i === 0 ? ' active' : '');
        pip.addEventListener('click', function () { s.scrollIntoView({ behavior: 'smooth' }); });
        navSteps.appendChild(pip);
      });
      function updateProgress() {
        var st = window.scrollY, dh = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar) progressBar.style.width = (dh > 0 ? (st / dh) * 100 : 0) + '%';
        var ai = 0;
        sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) ai = i; });
        navSteps.querySelectorAll('.step-pip').forEach(function (p, i) {
          p.classList.remove('active', 'done');
          if (i === ai) p.classList.add('active'); else if (i < ai) p.classList.add('done');
        });
      }
      window.addEventListener('scroll', updateProgress, { passive: true });
      updateProgress();
    }

    var status = document.getElementById('cvDataStatus');
    if (status) {
      var hasCv = !!(cvData.name || cvData.careerSummary || cvData.skills);
      status.innerHTML = hasCv
        ? '<h3 style="color:var(--accent3);">✓ CV-tiedot löytyivät</h3><p>Voit muokata kenttiä suoraan — ne tallentuvat tähän moduuliin.</p>'
        : '<h3 style="color:var(--accent2);">Täytä kentät itse</h3><p>Jos teit CV-moduulin aiemmin, tiedot voit kopioida tähän. Muuten täytä käsin.</p>';
    }
    restoreFormFields();
    ['fldName', 'fldCity', 'fldRole', 'fldCareer', 'fldSkills', 'fldEdu', 'fldLang'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('blur', syncFldToStorage);
    });
    updateContentPreview();

    if (window.loadReflection) {
      window.loadReflection('moduuli-ai-verkkosivustotyokalut');
      setTimeout(function () {
        var comb = document.getElementById('reflectionText').value;
        if (comb && comb.indexOf('Miltä tuntui:') >= 0) {
          var p = comb.split(/\n\nMikä yllätti:/);
          if (p[0]) document.getElementById('reflectionText1').value = p[0].replace(/^Miltä tuntui:\s*\n?/, '').trim();
          if (p[1]) document.getElementById('reflectionText2').value = p[1].trim();
        }
      }, 400);
    }
  });
})();
