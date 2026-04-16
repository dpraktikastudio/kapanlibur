(function () {
  "use strict";

  /**
   * GA4 (gtag) — safe no-op if gtag is absent or throws.
   * @param {string} eventName
   * @param {Record<string, unknown>} [params]
   */
  function track(eventName, params) {
    if (typeof gtag !== "function" || !eventName) return;
    try {
      gtag("event", eventName, params && typeof params === "object" ? params : {});
    } catch (e) {}
  }

  window.kapanliburGa = { track: track };
})();
