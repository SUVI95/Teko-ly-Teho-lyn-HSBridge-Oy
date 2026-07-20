/**
 * Deploy refresh helper for long-lived module tabs.
 * Polls a stable build id and reloads the page once it changes, so students
 * who never touch the refresh button still land on the current deploy.
 */
(function () {
  "use strict";
  if (window.__autoReloadInit) return;
  window.__autoReloadInit = true;

  var KEY = "aipolku_build_id";
  var INTERVAL_MS = 30 * 1000;
  var checking = false;

  function store(id) {
    try {
      localStorage.setItem(KEY, id);
    } catch (e) {
      try { sessionStorage.setItem(KEY, id); } catch (e2) { /* ignore */ }
    }
  }

  function read() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      try { return sessionStorage.getItem(KEY); } catch (e2) { return null; }
    }
  }

  function check() {
    if (checking) return;
    checking = true;
    fetch("/api/health", { cache: "no-store", credentials: "same-origin" })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (d) {
        var id = d && d.buildId ? String(d.buildId) : "";
        if (!id) return;
        var prev = read();
        if (prev && prev !== id) {
          window.location.reload();
          return;
        }
        if (!prev) store(id);
      })
      .catch(function () {
        /* ignore */
      })
      .then(function () {
        checking = false;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check);
  } else {
    check();
  }
  setInterval(check, INTERVAL_MS);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });
})();
