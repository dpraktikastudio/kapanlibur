(function () {
  var STORAGE_KEY = "kapanlibur-theme";
  var btn = document.getElementById("theme-toggle");
  var meta = document.getElementById("theme-color-meta");
  if (!btn) return;

  function effectiveDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t === "dark") return true;
    if (t === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function syncUi() {
    var dark = effectiveDark();
    btn.setAttribute("aria-pressed", dark ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"
    );
    if (meta) {
      meta.setAttribute("content", dark ? "#115e59" : "#0d9488");
    }
  }

  function setStoredTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {}
    syncUi();
  }

  btn.addEventListener("click", function () {
    setStoredTheme(effectiveDark() ? "light" : "dark");
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return;
      } catch (e) {
        return;
      }
      document.documentElement.removeAttribute("data-theme");
      syncUi();
    });

  syncUi();
})();
