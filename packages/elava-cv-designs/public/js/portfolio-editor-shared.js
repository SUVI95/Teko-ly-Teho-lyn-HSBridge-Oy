/**
 * Shared portfolio editor backend — save, publish, CV/photo upload, slug, notifications.
 * Usage: PortfolioEditor.init({ template:'reeni', draftKey:'ecv_reeni_draft', getP,setP,fillForm,renderPreview,onLoaded })
 */
window.PortfolioEditor = (function () {
  var cfg = {};
  var portfolioSlug = '';
  var slugManuallyEdited = false;
  var portfolioPublished = false;
  var previewToken = '';
  var cvFilenameOnServer = '';
  var PORTFOLIO_PUBLIC_HOST = 'portfolio.duunijobs.fi';
  var PORTFOLIO_USE_SUBDOMAIN = false;
  var PORTFOLIO_APP_ORIGIN = 'https://aipolku.duunijobs.fi';

  function applyConfig() {
    var c = window.__PORTFOLIO_PUBLIC_CONFIG__;
    if (!c) return;
    if (typeof c.useSubdomain === 'boolean') PORTFOLIO_USE_SUBDOMAIN = c.useSubdomain;
    if (c.appOrigin) PORTFOLIO_APP_ORIGIN = c.appOrigin;
    if (c.publicHost) PORTFOLIO_PUBLIC_HOST = c.publicHost;
  }

  function apiBase() { return window.location.origin || ''; }
  function isLocalDev() {
    var h = window.location.hostname || '';
    return h === 'localhost' || h === '127.0.0.1';
  }
  function portfolioPublicUrl(slug) {
    if (!slug) return '';
    if (isLocalDev()) return apiBase() + '/portfolio/' + slug;
    if (PORTFOLIO_USE_SUBDOMAIN) return 'https://' + PORTFOLIO_PUBLIC_HOST + '/' + slug;
    return PORTFOLIO_APP_ORIGIN.replace(/\/+$/, '') + '/portfolio/' + slug;
  }
  function portfolioPublicUrlDisplay(slug) {
    var u = portfolioPublicUrl(slug);
    return u ? u.replace(/^https?:\/\//, '') : '…';
  }
  function portfolioPreviewUrl(slug, previewQs) {
    if (isLocalDev()) return apiBase() + '/portfolio/' + slug + '?' + previewQs;
    if (PORTFOLIO_USE_SUBDOMAIN) return 'https://' + PORTFOLIO_PUBLIC_HOST + '/' + slug + '?' + previewQs;
    return PORTFOLIO_APP_ORIGIN.replace(/\/+$/, '') + '/portfolio/' + slug + '?' + previewQs;
  }
  function slugifyClient(name) {
    return (name || '').toLowerCase().replace(/[äå]/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
  }
  function normalizeLinkedInUrl(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    return 'https://' + u.replace(/^\/+/, '');
  }

  function getP() { return cfg.getP ? cfg.getP() : window.P; }
  function setStatus(msg) {
    var el = document.getElementById('saveStatus');
    if (el) el.textContent = msg || '';
  }

  function buildWorkspaceDraft(P) {
    var wd = { slugManuallyEdited: !!slugManuallyEdited, savedAt: new Date().toISOString() };
    if (P.visual_style) wd.visual_style = P.visual_style;
    if (P.images) wd.images = P.images;
    return wd;
  }

  function buildSavePayload() {
    var P = getP();
    var slugEl = document.getElementById('f_slug');
    return Object.assign({}, P, {
      slug: (slugEl && slugEl.value) ? slugEl.value.trim() : portfolioSlug,
      template: cfg.template || P.template || 'premium',
      workspace_draft: buildWorkspaceDraft(P)
    });
  }

  function onSlugInput(v) {
    slugManuallyEdited = true;
    portfolioSlug = String(v || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    var el = document.getElementById('f_slug');
    if (el && el.value !== portfolioSlug) el.value = portfolioSlug;
    updateSlugUi();
  }

  function suggestSlugFromName() {
    if (slugManuallyEdited) return;
    var el = document.getElementById('f_slug');
    if (!el) return;
    var nameEl = document.getElementById('f_name');
    var s = slugifyClient(nameEl ? nameEl.value : '');
    if (s) { el.value = s; portfolioSlug = s; }
  }

  function normalizeLinkedInField() {
    var el = document.getElementById('f_linkedin');
    if (!el) return;
    var fixed = normalizeLinkedInUrl(el.value);
    if (fixed !== el.value) el.value = fixed;
    var P = getP();
    P.linkedin_url = fixed;
    if (cfg.renderPreview) cfg.renderPreview();
  }

  function updateSlugUi() {
    var prefix = document.getElementById('slugHostPrefix');
    if (prefix) {
      prefix.textContent = isLocalDev()
        ? (window.location.host || 'localhost') + '/portfolio/'
        : (PORTFOLIO_USE_SUBDOMAIN ? PORTFOLIO_PUBLIC_HOST + '/' : PORTFOLIO_APP_ORIGIN.replace(/^https?:\/\//, '') + '/portfolio/');
    }
    var slugForUrl = (document.getElementById('f_slug') || {}).value || portfolioSlug || 'nimi-sukunimi';
    var box = document.getElementById('publicUrlBox');
    if (box) {
      if (portfolioPublished && portfolioSlug) {
        box.textContent = portfolioPublicUrlDisplay(portfolioSlug);
        box.classList.remove('pending');
      } else if (portfolioSlug) {
        box.textContent = portfolioPublicUrlDisplay(slugForUrl) + ' (julkaise ensin)';
        box.classList.add('pending');
      } else {
        box.textContent = 'Kirjoita nimi tai URL-polku';
        box.classList.add('pending');
      }
    }
    var badge = document.getElementById('publishedBadge');
    if (badge) badge.style.display = portfolioPublished ? 'inline-block' : 'none';
    var cvSt = document.getElementById('cvServerStatus');
    if (cvSt) cvSt.textContent = cvFilenameOnServer ? ('✓ CV palvelimella: ' + cvFilenameOnServer) : 'Ei CV:tä vielä — lataa alle';
    var slugEl = document.getElementById('f_slug');
    if (slugEl && portfolioSlug && !slugEl.value) slugEl.value = portfolioSlug;
  }

  async function applySaveResponse(d) {
    portfolioSlug = d.slug || portfolioSlug;
    if (d.published != null) portfolioPublished = !!d.published;
    if (d.preview_token) previewToken = d.preview_token;
    var slugEl = document.getElementById('f_slug');
    if (slugEl && d.slug) slugEl.value = d.slug;
    var P = getP();
    P.slug = portfolioSlug;
    P.has_cv = !!cvFilenameOnServer;
    updateSlugUi();
    return d.slug;
  }

  async function savePortfolioData() {
    if (!slugManuallyEdited) suggestSlugFromName();
    var payload = buildSavePayload();
    var r = await fetch(apiBase() + '/api/portfolio/save', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Tallennusvirhe — kirjaudu sisään.');
    await applySaveResponse(d);
    if (cfg.onSaved) cfg.onSaved();
    return d;
  }

  async function uploadCvToPortfolio(file) {
    if (!file) return;
    var fd = new FormData();
    fd.append('cv', file);
    var r = await fetch(apiBase() + '/api/portfolio/cv', { method: 'POST', credentials: 'include', body: fd });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'CV:n tallennus epäonnistui');
    cvFilenameOnServer = d.filename || file.name;
    var P = getP();
    P.has_cv = true;
    updateSlugUi();
    setStatus('✓ CV tallennettu — rekrytoija voi ladata sen portfoliossa');
    if (cfg.renderPreview) cfg.renderPreview();
  }

  async function handleCvFileInput(input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    try {
      if (!portfolioSlug) await savePortfolioData();
      await uploadCvToPortfolio(file);
    } catch (e) {
      alert(e.message || 'CV:n lataus epäonnistui');
    }
    input.value = '';
  }

  async function publishPortfolio() {
    if (!slugManuallyEdited) suggestSlugFromName();
    var payload = buildSavePayload();
    payload.published = true;
    var r = await fetch(apiBase() + '/api/portfolio/publish', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Julkaisu epäonnistui');
    portfolioPublished = true;
    portfolioSlug = d.slug || portfolioSlug;
    updateSlugUi();
    setStatus('✓ Julkaistu: ' + portfolioPublicUrlDisplay(portfolioSlug));
    var url = d.public_url || portfolioPublicUrl(portfolioSlug);
    if (url && navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(url); } catch (e) { /* ignore */ }
    }
    return d;
  }

  function copyPublicUrl() {
    var url = portfolioPublicUrl(portfolioSlug || (document.getElementById('f_slug') || {}).value);
    if (!url) { alert('Aseta portfolio-osoite ensin.'); return; }
    if (!portfolioPublished) { alert('Julkaise portfolio ensin.'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { setStatus('✓ Linkki kopioitu'); });
    } else prompt('Kopioi linkki:', url);
  }

  async function openFullPagePreview() {
    try {
      await savePortfolioData();
      if (portfolioSlug) {
        var qs = 'preview=1&t=' + Date.now();
        if (previewToken) qs += '&pt=' + encodeURIComponent(previewToken);
        window.open(portfolioPreviewUrl(portfolioSlug, qs), '_blank');
        return;
      }
    } catch (e) {
      if (!isLocalDev()) { alert(e.message); return; }
    }
    if (cfg.fallbackPreview) cfg.fallbackPreview();
  }

  async function publishLocalPreview() {
    try {
      await publishPortfolio();
      if (portfolioSlug) {
        window.open(portfolioPublicUrl(portfolioSlug), '_blank');
        return;
      }
    } catch (e) { /* fall through */ }
    if (cfg.fallbackPreview) cfg.fallbackPreview();
    else setStatus('Kirjaudu sisään julkaistaksesi');
  }

  async function loadPortfolioMine() {
    try {
      var r = await fetch(apiBase() + '/api/portfolio/mine', { credentials: 'include' });
      if (!r.ok) return;
      var d = await r.json();
      var pf = d.portfolio;
      if (!pf) return;
      portfolioSlug = pf.slug || portfolioSlug;
      portfolioPublished = !!pf.published;
      cvFilenameOnServer = pf.cv_filename || '';
      if (pf.preview_token) previewToken = pf.preview_token;
      var P = getP();
      if (pf.template) P.template = pf.template;
      P.slug = portfolioSlug;
      P.has_cv = !!pf.has_cv;
      P.has_photo = !!pf.has_photo;
      if (pf.workspace_draft) {
        if (pf.workspace_draft.visual_style) P.visual_style = Object.assign({}, P.visual_style || {}, pf.workspace_draft.visual_style);
        if (pf.workspace_draft.images) P.images = pf.workspace_draft.images;
        if (typeof pf.workspace_draft.slugManuallyEdited === 'boolean') slugManuallyEdited = pf.workspace_draft.slugManuallyEdited;
      }
      ['full_name', 'city', 'target_role', 'bio', 'career_summary', 'hidden_strengths', 'email_public', 'linkedin_url', 'brand_color', 'brand_accent', 'brand_bg'].forEach(function (k) {
        if (pf[k] != null && pf[k] !== '') P[k] = pf[k];
      });
      if (pf.skills && pf.skills.length) P.skills = pf.skills;
      if (pf.languages && pf.languages.length) P.languages = pf.languages;
      if (pf.achievements && pf.achievements.length) P.achievements = pf.achievements;
      if (pf.experience && pf.experience.length) P.experience = pf.experience;
      if (pf.education && pf.education.length) P.education = pf.education;
      if (cfg.fillForm) cfg.fillForm();
      if (cfg.onLoaded) cfg.onLoaded();
      updateSlugUi();
      if (cfg.renderPreview) cfg.renderPreview();
    } catch (e) { /* not logged in */ }
  }

  async function loadNotifications() {
    var box = document.getElementById('portfolioNotifications');
    if (!box) return;
    try {
      var r = await fetch(apiBase() + '/api/portfolio/notifications', { credentials: 'include' });
      if (!r.ok) return;
      var d = await r.json();
      var items = (d.events || d.notifications || []).slice(0, 5);
      if (!items.length) { box.style.display = 'none'; return; }
      box.style.display = 'block';
      box.innerHTML = items.map(function (ev) {
        var t = ev.event_type === 'visit' ? '👁 Joku avasi portfoliosi' : ev.event_type === 'contact' ? '✉ Uusi yhteydenotto' : ev.event_type === 'cv_download' ? '📄 CV ladattu' : ev.event_type;
        return '<div style="font-size:.72rem;padding:.35rem 0;border-bottom:1px solid rgba(0,0,0,.06)">' + t + '</div>';
      }).join('');
    } catch (e) { box.style.display = 'none'; }
  }

  function init(opts) {
    cfg = opts || {};
    applyConfig();
    window.onSlugInput = onSlugInput;
    window.suggestSlugFromName = suggestSlugFromName;
    window.normalizeLinkedInField = normalizeLinkedInField;
    window.savePortfolioData = function () { return savePortfolioData().then(function () { setStatus('✓ Tallennettu palvelimelle'); }).catch(function (e) { alert(e.message); }); };
    window.publishPortfolio = function () { return publishPortfolio().catch(function (e) { alert(e.message); }); };
    window.copyPublicUrl = copyPublicUrl;
    window.openFullPagePreview = openFullPagePreview;
    window.publishLocalPreview = publishLocalPreview;
    window.handleEditorCvUpload = function (input) { return handleCvFileInput(input); };
    updateSlugUi();
    loadPortfolioMine();
    loadNotifications();
  }

  return {
    init: init,
    getSlug: function () { return portfolioSlug; },
    isPublished: function () { return portfolioPublished; },
    portfolioPublicUrl: portfolioPublicUrl,
    normalizeLinkedInUrl: normalizeLinkedInUrl
  };
})();
