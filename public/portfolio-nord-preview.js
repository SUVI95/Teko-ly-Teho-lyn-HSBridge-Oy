/* Nord — Veyssette layout with masculine navy / steel palettes */
(function () {
  'use strict';

  var NORD_DEFAULTS = {
    cream: '#F4F7FB',
    cream2: '#E8EEF5',
    ink: '#0B1F33',
    ink_soft: '#5A6B7D',
    gold: '#1B4F8A',
    gold_light: '#3D6FA3'
  };

  function withNordTheme(p) {
    var src = (p && p.visual_style) || {};
    // Start from Nord navy; allow editor palette overrides (Steel, Ocean…).
    var vs = Object.assign({}, NORD_DEFAULTS, src);
    // If demo/draft still has Veyssette cream/gold, force Nord defaults.
    var warmGold = String(vs.gold || '').toLowerCase();
    var warmCream = String(vs.cream || '').toLowerCase();
    if (warmGold === '#a67c52' || warmGold === '#c4a574' || warmCream === '#f8f4ee' || warmCream === '#f0ebe3') {
      vs = Object.assign({}, vs, NORD_DEFAULTS);
    }
    if (!vs.ink_soft) vs.ink_soft = NORD_DEFAULTS.ink_soft;
    var out = Object.assign({}, p || {});
    out.visual_style = vs;
    out.brand_bg = vs.cream;
    out.brand_color = vs.ink;
    out.brand_accent = vs.gold;
    return out;
  }

  function renderNordPreview(p) {
    if (typeof renderVeyssettePreview !== 'function') {
      return '<!DOCTYPE html><html><body style="font-family:system-ui;padding:2rem">Nord tarvitsee portfolio-veyssette-preview.js</body></html>';
    }
    var themed = withNordTheme(p);
    var html = renderVeyssettePreview(themed);
    var vs = themed.visual_style;
    // Force CSS vars after template :root so no leftover brown wins in iframes.
    var force =
      '<style id="nord-force">' +
      'html,:root{' +
      '--cream:' + vs.cream + '!important;' +
      '--cream2:' + vs.cream2 + '!important;' +
      '--ink:' + vs.ink + '!important;' +
      '--ink-soft:' + (vs.ink_soft || '#5A6B7D') + '!important;' +
      '--gold:' + vs.gold + '!important;' +
      '--gold-light:' + vs.gold_light + '!important;' +
      '}' +
      '.cta-band{background:linear-gradient(135deg,var(--ink) 0%,#132A45 100%)!important}.site-header{background:color-mix(in srgb, var(--cream) 94%, transparent)!important}' +
      '.btn-primary{background:var(--gold)!important;color:#fff!important}' +
      '.exp-card .co,.eyebrow,.skill-row{border-left-color:var(--gold)!important}' +
      '.counter-n,.testi-quote::before{color:var(--gold)!important}' +
      '.testi-av,.trust-avatars span{background:var(--gold)!important}' +
      '</style>';
    if (html.indexOf('</head>') >= 0) return html.replace('</head>', force + '</head>');
    return force + html;
  }

  window.renderNordPreview = renderNordPreview;
  window.NORD_IMAGE_SLOTS = typeof VEY_IMAGE_SLOTS !== 'undefined' ? VEY_IMAGE_SLOTS : [];
})();
