(function () {
  var mq = window.matchMedia("(max-width: 639px)");
  var toggle = document.getElementById("site-nav-toggle");
  var backdrop = document.getElementById("site-nav-backdrop");
  var panel = document.getElementById("site-nav-panel");
  if (!toggle || !backdrop || !panel) return;

  function isMobile() {
    return mq.matches;
  }

  function updateDrawerLinksTabIndex() {
    var links = panel.querySelectorAll("a");
    if (!isMobile()) {
      links.forEach(function (a) {
        a.removeAttribute("tabindex");
      });
      return;
    }
    var open = document.body.classList.contains("site-nav-open");
    links.forEach(function (a) {
      if (open) a.removeAttribute("tabindex");
      else a.setAttribute("tabindex", "-1");
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
    else backdrop.setAttribute("hidden", "");
    toggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    syncAria();
    if (open) {
      var first = panel.querySelector("a");
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

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("site-nav-open")) {
      e.preventDefault();
      close();
    }
  });

  mq.addEventListener("change", function () {
    if (!isMobile()) {
      document.body.classList.remove("site-nav-open");
      backdrop.setAttribute("hidden", "");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Buka menu navigasi");
    }
    syncAria();
  });

  syncAria();
})();
