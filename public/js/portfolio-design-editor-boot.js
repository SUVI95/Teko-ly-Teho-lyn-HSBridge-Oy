/** Shared boot: load draft, init UI order, ?demo=1 refresh, resetDemo without reload. */
(function (global) {
  'use strict';

  function isDemoQuery() {
    return /[?&](demo|mock)=1/.test((global.location && global.location.search) || '');
  }

  global.bootPortfolioDesignEditor = function (opts) {
    opts = opts || {};
    var draftKey = opts.draftKey;

    function applyDemo() {
      if (typeof global.clonePortfolioDemo !== 'function') return;
      global.P = global.clonePortfolioDemo(opts.template);
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

    if (opts.initUi) opts.initUi();
    if (opts.fillForm) opts.fillForm();
    if (opts.renderPreview) opts.renderPreview();
    if (opts.initPortfolioEditor) opts.initPortfolioEditor();

    if (isDemoQuery()) applyDemo();
  };
})(window);
