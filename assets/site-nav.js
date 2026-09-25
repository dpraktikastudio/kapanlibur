(function () {
  var mq = window.matchMedia("(max-width: 639px)");
  var toggle = document.getElementById("site-nav-toggle");
  var backdrop = document.getElementById("site-nav-backdrop");
  var panel = document.getElementById("site-nav-panel");
  if (!toggle || !backdrop || !panel) return;

  function isMobile() {
    return mq.matches;
  }

  function navFocusables() {
    return panel.querySelectorAll("a, summary");
  }

  function closeAllNavDropdowns(except) {
    panel.querySelectorAll(".site-nav-dd[open]").forEach(function (dd) {
      if (except && dd === except) return;
      dd.removeAttribute("open");
    });
  }

  function updateDrawerLinksTabIndex() {
    var items = navFocusables();
    if (!isMobile()) {
      items.forEach(function (el) {
        el.removeAttribute("tabindex");
      });
      return;
    }
    var open = document.body.classList.contains("site-nav-open");
    items.forEach(function (el) {
      if (open) el.removeAttribute("tabindex");
      else el.setAttribute("tabindex", "-1");
    });
  }

  function syncAria() {
    if (!isMobile()) {
      panel.removeAttribute("aria-hidden");
      toggle.setAttribute("aria-expanded", "false");
      updateDrawerLinksTabIndex();
      return;
    }
    var open = document.body.classList.contains("site-nav-open");
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    updateDrawerLinksTabIndex();
  }

  function setOpen(open) {
    if (!isMobile()) return;
    document.body.classList.toggle("site-nav-open", open);
    if (open) backdrop.removeAttribute("hidden");
    else {
      backdrop.setAttribute("hidden", "");
      closeAllNavDropdowns();
    }
    toggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    syncAria();
    if (open) {
      var first = panel.querySelector("a, summary");
      if (first) first.focus();
    } else {
      toggle.focus();
    }
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", function () {
    if (!isMobile()) return;
    setOpen(!document.body.classList.contains("site-nav-open"));
  });

  backdrop.addEventListener("click", close);

  panel.addEventListener("click", function (e) {
    if (!isMobile()) return;
    if (e.target.closest("a")) close();
  });

  panel.querySelectorAll(".site-nav-dd").forEach(function (dd) {
    dd.addEventListener("toggle", function () {
      if (!dd.open) return;
      panel.querySelectorAll(".site-nav-dd[open]").forEach(function (other) {
        if (other !== dd) other.removeAttribute("open");
      });
    });
  });

  document.addEventListener("click", function (e) {
    if (isMobile()) return;
    if (e.target.closest(".site-nav-dd")) return;
    closeAllNavDropdowns();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("site-nav-open")) {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Escape") closeAllNavDropdowns();
  });

  mq.addEventListener("change", function () {
    if (!isMobile()) {
      document.body.classList.remove("site-nav-open");
      backdrop.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Buka menu navigasi");
      closeAllNavDropdowns();
    }
    syncAria();
  });

  syncAria();
})();
