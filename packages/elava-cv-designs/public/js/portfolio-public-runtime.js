/** Public portfolio runtime — visit tracking, contact form, FAQ bot */
window.PortfolioPublic = (function () {
  var state = {};

  function buildFaqAnswer(p) {
    var sk = (p.skills || []).map(function (s) { return typeof s === 'string' ? s : (s.name || ''); }).filter(Boolean);
    var exTxt = (p.experience || []).map(function (e) {
      return [e.role || e.title, e.company, e.period || e.years, e.desc || e.description].filter(Boolean).join(' · ');
    }).filter(Boolean).join('\n');
    return function (q) {
      q = (q || '').toLowerCase();
      if (/vahvuus|skill|osaaminen|taito/.test(q)) return p.hidden_strengths || ('Taidot: ' + sk.join(', ')) || p.career_summary || 'Katso Taidot-osio.';
      if (/palkata|miksi|hire|valita/.test(q)) return p.career_summary || p.bio || ('Kiinnostunut: ' + (p.target_role || 'uusista mahdollisuuksista') + '.');
      if (/kokemus|experience|työ|ura/.test(q)) return exTxt || 'Katso Kokemus-osio.';
      if (/yhteys|email|sähköpost|tavoita|haastattelu/.test(q)) return 'Täytä yhteydenottolomake sivulla.' + (p.email_public ? ' Tai: ' + p.email_public : '');
      if (/cv|lataa|resume/.test(q)) return p.has_cv ? 'CV:n voi ladata Lataa CV -painikkeesta.' : 'Lähetä viesti lomakkeella.';
      if (/linkedin/.test(q)) return p.linkedin_url ? 'LinkedIn-linkki on sivulla.' : 'LinkedIn ei ole lisätty.';
      return p.bio || p.career_summary || 'Lähetä viesti yhteydenottolomakkeella.';
    };
  }

  function trackVisit(slug) {
    try {
      if (!slug) return;
      if (new URLSearchParams(location.search).get('preview') === '1') return;
      var k = 'pf_v_' + slug;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
      fetch('/api/portfolio/event/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug })
      });
    } catch (e) { /* ignore */ }
  }

  async function sendContact() {
    var btn = document.getElementById('pfContactSubmit');
    var ok = document.getElementById('pfContactOk');
    var err = document.getElementById('pfContactErr');
    var name = (document.getElementById('pfContactName') || {}).value || '';
    var email = (document.getElementById('pfContactEmail') || {}).value || '';
    var message = (document.getElementById('pfContactMsg') || {}).value || '';
    name = name.trim(); email = email.trim(); message = message.trim();
    if (!name || !email || !message) {
      if (err) { err.style.display = 'block'; err.textContent = 'Täytä kaikki kentät.'; }
      if (ok) ok.style.display = 'none';
      return;
    }
    if (btn) btn.disabled = true;
    if (err) err.style.display = 'none';
    try {
      var r = await fetch('/api/portfolio/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: state.slug, name: name, email: email, message: message })
      });
      var d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Virhe');
      if (ok) { ok.style.display = 'block'; ok.textContent = '✓ Viesti lähetetty! Hakija saa sen sähköpostiinsa.'; }
      document.getElementById('pfContactName').value = '';
      document.getElementById('pfContactEmail').value = '';
      document.getElementById('pfContactMsg').value = '';
    } catch (e) {
      if (err) { err.style.display = 'block'; err.textContent = e.message || 'Lähetys epäonnistui.'; }
    }
    if (btn) btn.disabled = false;
  }

  function addChatMsg(text, role) {
    var m = document.getElementById('pfCpMsgs');
    if (!m) return;
    var d = document.createElement('div');
    d.className = 'pf-msg ' + role;
    d.textContent = text;
    m.appendChild(d);
    m.scrollTop = m.scrollHeight;
  }

  function sendChat() {
    var inp = document.getElementById('pfChatInput');
    if (!inp) return;
    var t = inp.value.trim();
    if (!t) return;
    inp.value = '';
    addChatMsg(t, 'user');
    var sugs = document.getElementById('pfSugs');
    if (sugs) sugs.style.display = 'none';
    var ans = state.faq ? state.faq(t) : 'Täytä yhteydenottolomake.';
    setTimeout(function () { addChatMsg(ans, 'ai'); }, 260);
  }

  function bindUi() {
    var submit = document.getElementById('pfContactSubmit');
    if (submit) submit.addEventListener('click', sendContact);
    var chatBtn = document.getElementById('pfChatBtn');
    var chatPanel = document.getElementById('pfChatPanel');
    var chatClose = document.getElementById('pfChatClose');
    if (chatBtn && chatPanel) {
      chatBtn.addEventListener('click', function () { chatPanel.classList.toggle('open'); });
    }
    if (chatClose && chatPanel) {
      chatClose.addEventListener('click', function () { chatPanel.classList.remove('open'); });
    }
    var chatSend = document.getElementById('pfChatSend');
    if (chatSend) chatSend.addEventListener('click', sendChat);
    var chatInput = document.getElementById('pfChatInput');
    if (chatInput) {
      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); sendChat(); }
      });
    }
    document.querySelectorAll('.pf-sug').forEach(function (b) {
      b.addEventListener('click', function () {
        if (chatInput) chatInput.value = b.textContent;
        sendChat();
      });
    });
  }

  function init(p) {
    state = p || {};
    state.faq = buildFaqAnswer(state);
    bindUi();
    if (state.slug) trackVisit(state.slug);
  }

  return { init: init, trackVisit: trackVisit, sendContact: sendContact };
})();
