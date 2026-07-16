/**
 * Optional deploy refresh helper for long-lived module tabs.
 * Polls a stable build id; reloads once when it changes.
 */
(function () {
  "use strict";
  if (window.__autoReloadInit) return;
  window.__autoReloadInit = true;

  var KEY = "aipolku_build_id";
  var INTERVAL_MS = 3 * 60 * 1000;

  function check() {
    fetch("/api/health", { cache: "no-store", credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        var id = d && d.buildId ? String(d.buildId) : "";
        if (!id) return;
        try {
          var prev = sessionStorage.getItem(KEY);
          if (prev && prev !== id) window.location.reload();
          sessionStorage.setItem(KEY, id);
        } catch (e) {
          /* ignore */
        }
      })
      .catch(function () {
        /* ignore */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
  setInterval(check, INTERVAL_MS);
})();
