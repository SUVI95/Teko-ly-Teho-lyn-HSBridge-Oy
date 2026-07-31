/** Shared boot: load draft, init UI order, ?demo=1 refresh, style-pick default colors. */
(function (global) {
  'use strict';

  var STYLE_PICK_KEY = 'ecv_style_just_picked';
  var STYLE_SELECTED_KEY = 'ecv_selected_style';

  function isDemoQuery() {
    return /[?&](demo|mock)=1/.test((global.location && global.location.search) || '');
  }

  /** Hub sets this when student taps a style card — editor applies that style's default palette once. */
  global.markElavaStylePicked = function (templateId) {
    try {
      global.localStorage.setItem(STYLE_SELECTED_KEY, templateId);
      global.localStorage.setItem(STYLE_PICK_KEY, templateId);
    } catch (e) { /* ignore */ }
  };

  /**
   * If student just chose this style on the hub, apply its default colors onto P.
   * Colors stay editable in Visuaali — this only pre-fills the style look.
   */
  global.applyElavaStyleDefaultsIfPicked = function (template) {
    var P = global.P;
    if (!P || !template) return false;
    var justPicked = false;
    try {
      if (global.localStorage.getItem(STYLE_PICK_KEY) === template) {
        global.localStorage.removeItem(STYLE_PICK_KEY);
        justPicked = true;
      }
    } catch (e) { /* ignore */ }

    var missing =
      !P.visual_style ||
      typeof P.visual_style !== 'object' ||
      (!P.visual_style.gold && !P.visual_style.accent && !P.visual_style.rose && !P.brand_accent);

    if ((justPicked || missing) && typeof global.applyTemplateDefaultColors === 'function') {
      global.applyTemplateDefaultColors(P, template);
      try {
        // Survive async /api/portfolio/mine load so hub style colors aren't overwritten once.
        global.sessionStorage.setItem('ecv_force_style_colors', template);
      } catch (e2) { /* ignore */ }
      return true;
    }
    return false;
  };

  /**
   * Palette chips: select the chip matching current colors; clicking applies palette (still changeable).
   * opts: { gridId, palettes, getP, applyPalette(p), swatchHtml(p), matchKeys?: string[] }
   */
  global.mountStylePaletteGrid = function (opts) {
    opts = opts || {};
    var g = global.document.getElementById(opts.gridId || 'paletteGrid');
    if (!g || g.childElementCount) return;
    var palettes = opts.palettes || [];
    var getP = opts.getP || function () { return global.P; };
    var applyPalette = opts.applyPalette;
    var keys = opts.matchKeys || null;

    function norm(c) { return String(c || '').trim().toLowerCase(); }
    function matches(vs, p) {
      if (!vs || !p) return false;
      var check = keys || Object.keys(p).filter(function (k) { return k !== 'label' && k !== 'accent_text' && p[k]; });
      for (var i = 0; i < check.length; i++) {
        var k = check[i];
        if (p[k] == null) continue;
        if (norm(vs[k]) !== norm(p[k])) return false;
      }
      return true;
    }

    var vs = (getP() && getP().visual_style) || {};
    var sel = 0;
    for (var i = 0; i < palettes.length; i++) {
      if (matches(vs, palettes[i])) { sel = i; break; }
    }

    palettes.forEach(function (p, i) {
      var d = global.document.createElement('div');
      d.className = 'style-chip' + (i === sel ? ' selected' : '');
      d.innerHTML = opts.swatchHtml
        ? opts.swatchHtml(p)
        : ('<div class="swatch"></div>' + (p.label || ''));
      d.onclick = function () {
        g.querySelectorAll('.style-chip').forEach(function (c) { c.classList.remove('selected'); });
        d.classList.add('selected');
        if (typeof applyPalette === 'function') applyPalette(p);
      };
      g.appendChild(d);
    });
  };

  global.bootPortfolioDesignEditor = function (opts) {
    opts = opts || {};
    var draftKey = opts.draftKey;
    var template = opts.template;

    function applyDemo() {
      if (typeof global.clonePortfolioDemo !== 'function') return;
      global.P = global.clonePortfolioDemo(template);
      if (opts.onApplyDemo) opts.onApplyDemo();
      if (opts.fillForm) opts.fillForm();
      if (opts.renderPreview) opts.renderPreview();
      if (draftKey) {
        try {
          global.localStorage.setItem(draftKey, JSON.stringify({ P: global.P, ts: Date.now() }));
        } catch (e) { /* ignore */ }
      }
      if (opts.setStatus) opts.setStatus('✓ Demo-data — esikatselu päivitetty');
    }

    global.resetDemo = function () {
      if (draftKey) {
        try { global.localStorage.removeItem(draftKey); } catch (e) { /* ignore */ }
      }
      if (opts.publishKey) {
        try {
          global.localStorage.removeItem(opts.publishKey);
          global.sessionStorage.removeItem(opts.publishKey);
        } catch (e) { /* ignore */ }
      }
      applyDemo();
    };

    if (isDemoQuery() && draftKey) {
      try { global.localStorage.removeItem(draftKey); } catch (e) { /* ignore */ }
    } else if (draftKey) {
      try {
        var raw = global.localStorage.getItem(draftKey);
        if (raw) {
          var d = JSON.parse(raw);
          if (d && d.P) global.P = d.P;
        }
      } catch (e) { /* ignore */ }
    }

    // Style hub → editor: pre-select this design's default colors (user can still change them).
    if (global.applyElavaStyleDefaultsIfPicked(template) && draftKey) {
      try {
        global.localStorage.setItem(draftKey, JSON.stringify({ P: global.P, ts: Date.now() }));
      } catch (e) { /* ignore */ }
    }

    if (opts.initUi) opts.initUi();
    if (opts.fillForm) opts.fillForm();
    if (opts.renderPreview) opts.renderPreview();
    if (opts.initPortfolioEditor) opts.initPortfolioEditor();

    if (isDemoQuery()) applyDemo();
  };
})(window);
