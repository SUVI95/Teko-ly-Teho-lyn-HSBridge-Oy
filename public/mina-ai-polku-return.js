/**
 * Minä meidän osana — paluu AI Polkuun
 * Lisää tämä sivun loppuun (ennen </body>): <script src="https://<AI-POLKU-HOST>/mina-ai-polku-return.js" defer></script>
 * Kun käyttäjä avaa sivun linkistä, jossa on ?ai_polku_return=https%3A%2F%2F..., tämä skripti ohjaa
 * a[href="index.html"] ja a[href="./index.html"] -linkit takaisin AI Polkuun (ei Minä-sivuston etusivulle).
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

  function run() {
    try {
      var sp = new URLSearchParams(window.location.search);
      var ret = normalizeReturn(sp.get('ai_polku_return'));
      if (!ret) return;
      patchAnchors(ret);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
