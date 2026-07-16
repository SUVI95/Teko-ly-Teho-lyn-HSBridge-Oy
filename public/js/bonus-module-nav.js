/* eslint-disable */
/** Next-module navigation for Edistyneet / bonus modules (uses /api/bonus-module/next). */
(function () {
  "use strict";

  var cache = {};
  var prevCache = {};

  function fetchNext(slug) {
    if (cache[slug]) return cache[slug];
    cache[slug] = fetch("/api/bonus-module/next?slug=" + encodeURIComponent(slug), {
      credentials: "same-origin",
    })
      .then(function (r) {
        return r.ok ? r.json() : { href: null };
      })
      .catch(function () {
        return { href: null };
      });
    return cache[slug];
  }

  function fetchPrev(slug) {
    if (prevCache[slug]) return prevCache[slug];
    prevCache[slug] = fetch("/api/bonus-module/prev?slug=" + encodeURIComponent(slug), {
      credentials: "same-origin",
    })
      .then(function (r) {
        return r.ok ? r.json() : { href: null };
      })
      .catch(function () {
        return { href: null };
      });
    return prevCache[slug];
  }

  window.bonusGoNext = function (slug) {
    if (!slug) slug = window.BONUS_MODULE_SLUG;
    if (!slug) {
      window.location.href = "/dashboard";
      return;
    }
    fetchNext(slug).then(function (d) {
      window.location.href = d && d.href ? d.href : "/dashboard";
    });
  };

  window.bonusGoPrev = function (slug) {
    if (!slug) slug = window.BONUS_MODULE_SLUG;
    if (!slug) {
      window.location.href = "/dashboard";
      return;
    }
    fetchPrev(slug).then(function (d) {
      window.location.href = d && d.href ? d.href : "/dashboard";
    });
  };

  window.hydrateBonusNextButtons = function () {
    document.querySelectorAll("[data-bonus-current-slug]").forEach(function (btn) {
      var slug = btn.getAttribute("data-bonus-current-slug");
      if (!slug) return;
      fetchNext(slug).then(function (d) {
        if (d && d.href) {
          btn.textContent = "Jatka: " + (d.nextLabel || d.name) + " \u2192";
          btn.onclick = function () {
            window.location.href = d.href;
          };
        } else {
          btn.textContent = "Takaisin ty\u00f6p\u00f6yd\u00e4lle \u2192";
          btn.onclick = function () {
            window.location.href = "/dashboard";
          };
        }
        btn.style.display = btn.classList.contains("bonus-next-inline") ? "inline-flex" : "";
        if (btn.classList.contains("bonus-next-block")) btn.style.display = "inline-flex";
      });
    });
  };

  window.hydrateBonusPrevButtons = function () {
    document.querySelectorAll("[data-bonus-prev-slug]").forEach(function (btn) {
      var slug = btn.getAttribute("data-bonus-prev-slug");
      if (!slug) return;
      fetchPrev(slug).then(function (d) {
        if (d && d.href) {
          btn.textContent = "\u2190 " + (d.name || "Edellinen moduuli");
          btn.onclick = function () {
            window.location.href = d.href;
          };
        } else {
          btn.style.display = "none";
          return;
        }
        btn.style.display = btn.classList.contains("bonus-prev-inline") ? "inline-flex" : "";
        if (btn.classList.contains("bonus-prev-block")) btn.style.display = "inline-flex";
      });
    });
  };

  function initNav() {
    window.hydrateBonusNextButtons();
    window.hydrateBonusPrevButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNav);
  } else {
    initNav();
  }
  document.addEventListener("bonus-module:ready", initNav);
})();
