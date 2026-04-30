/**
 * Minä meidän osana — paluu AI Polkuun
 * Lisää sivun loppuun (ennen </body>):
 * <script src="https://<AI-POLKU-HOST>/mina-ai-polku-return.js" defer></script>
 *
 * Kun käyttäjä avaa sivun linkistä, jossa on ?ai_polku_return=https%3A%2F%2F...,
 * skripti ohjaa a[href="index.html"] / a[href="./index.html"] takaisin AI Polkuun.
 *
 * Optional: lisää URL:iin hide_external_breadcrumb=1 jos haluat piilottaa
 * Minä-sivuston yläpolun ("Etusivu › AI-moduulit › ...") näiltä käyttäjiltä.
 */
(function () {
  'use strict';

  function allowedReturnHost(hostname) {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (/^teko-ly-teho-lyn-hs-bridge-oy-.+\.vercel\.app$/i.test(hostname)) return true;
    return false;
  }

  function normalizeReturn(raw) {
    if (!raw || typeof raw !== 'string') return null;
    var t = raw.trim();
    if (!t) return null;
    try {
      var u = new URL(t);
      var okProto =
        u.protocol === 'https:' ||
        (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
      if (!okProto) return null;
      if (!allowedReturnHost(u.hostname)) return null;
      var path = u.pathname || '/';
      if (path === '/' || path === '') return u.origin + '/';
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  function patchAnchors(returnUrl) {
    var sel = 'a[href="index.html"], a[href="./index.html"]';
    document.querySelectorAll(sel).forEach(function (a) {
      a.setAttribute('href', returnUrl);
    });
  }

  function hideExternalBreadcrumbIfRequested(sp) {
    if (sp.get('hide_external_breadcrumb') !== '1') return;

    // unelmatyo.html style nav breadcrumbs
    document.querySelectorAll('.nav-left .nav-sep, .nav-left .nav-badge, .nav-left .nav-title').forEach(function (el) {
      el.style.display = 'none';
    });
    document.querySelectorAll('.nav-left a[href="ai-modules.html"], .nav-left a[href="./ai-modules.html"]').forEach(function (el) {
      el.style.display = 'none';
    });

    // module-01-confidence.html sticky nav breadcrumb
    document.querySelectorAll('.sticky-nav .nav-breadcrumb').forEach(function (el) {
      el.style.display = 'none';
    });
  }

  function run() {
    try {
      var sp = new URLSearchParams(window.location.search);
      var ret = normalizeReturn(sp.get('ai_polku_return'));
      if (!ret) return;
      patchAnchors(ret);
      hideExternalBreadcrumbIfRequested(sp);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
