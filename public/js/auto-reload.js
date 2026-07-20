/**
 * Auto-reload DISABLED.
 *
 * This helper previously polled the deploy build id and reloaded long-lived
 * module tabs. A bug caused an infinite reload loop on a live student tab, so
 * the behaviour is intentionally turned off. This file is now a no-op and is
 * no longer injected into module pages.
 */
(function () {
  "use strict";
  // Defensively stop any reload loop from a previously cached version of this
  // script that may still be running in an open tab.
  try {
    window.__autoReloadInit = true;
  } catch (e) {
    /* ignore */
  }
})();
