(function () {
  var teaser = document.getElementById("newsletter-teaser-email");
  var openBtn = document.getElementById("newsletter-dialog-open");
  var dialog = document.getElementById("newsletter-dialog");
  var closeBtn = document.getElementById("newsletter-dialog-close");
  var snackbarGlobal = document.getElementById("site-snackbar");
  var snackbarInDialog = document.getElementById("newsletter-dialog-snackbar");
  var successEl = document.getElementById("success-message");
  var errorEl = document.getElementById("error-message");

  var hideTimer;
  var hideAfterTransitionTimer;
  var prevSuccessVisible = false;
  var prevErrorVisible = false;

  function syncOpenDisabled() {
    if (!teaser || !openBtn) return;
    var v = teaser.value.trim();
    openBtn.disabled = !v || !teaser.checkValidity();
  }

  function focusEmail() {
    var email = document.getElementById("EMAIL");
    if (email) email.focus();
  }

  function panelVisible(el) {
    if (!el) return false;
    return window.getComputedStyle(el).display !== "none";
  }

  function hideAllSnackbars() {
    [snackbarGlobal, snackbarInDialog].forEach(function (el) {
      if (!el) return;
      el.classList.remove("site-snackbar--visible");
    });
  }

  function hideSnackbarFinish() {
    clearTimeout(hideAfterTransitionTimer);
    hideAfterTransitionTimer = setTimeout(function () {
      [snackbarGlobal, snackbarInDialog].forEach(function (el) {
        if (!el) return;
        if (!el.classList.contains("site-snackbar--visible")) {
          el.hidden = true;
          el.textContent = "";
          el.removeAttribute("role");
          el.removeAttribute("aria-live");
        }
      });
    }, 220);
  }

  function showSnackbar(message, variant) {
    var inModal =
      variant === "error" && dialog && snackbarInDialog && dialog.open === true;
    var el = inModal ? snackbarInDialog : snackbarGlobal;
    if (!el) return;

    clearTimeout(hideTimer);
    hideAllSnackbars();

    var text = (message && String(message).trim()) || "";
    if (!text) text = variant === "error" ? "Terjadi kesalahan." : "Berhasil.";

    el.textContent = text;
    el.classList.remove("site-snackbar--success", "site-snackbar--error");
    el.classList.add(variant === "error" ? "site-snackbar--error" : "site-snackbar--success");
    el.setAttribute("role", variant === "error" ? "alert" : "status");
    el.setAttribute("aria-live", variant === "error" ? "assertive" : "polite");
    el.hidden = false;

    requestAnimationFrame(function () {
      el.classList.add("site-snackbar--visible");
    });

    var ms = variant === "error" ? 5000 : 4000;
    hideTimer = setTimeout(function () {
      hideAllSnackbars();
      hideSnackbarFinish();
    }, ms);
  }

  function onBrevoPanelsMaybeChanged() {
    if (!successEl || !errorEl) return;

    var sVis = panelVisible(successEl);
    var eVis = panelVisible(errorEl);

    if (sVis && !prevSuccessVisible) {
      var okSpan = successEl.querySelector(".sib-form-message-panel__inner-text");
      var msg = okSpan ? okSpan.textContent : "";
      if (dialog && dialog.open) dialog.close();
      requestAnimationFrame(function () {
        showSnackbar(msg, "success");
      });
      if (teaser) teaser.value = "";
      syncOpenDisabled();
    } else if (eVis && !prevErrorVisible) {
      var errSpan = errorEl.querySelector(".sib-form-message-panel__inner-text");
      showSnackbar(errSpan ? errSpan.textContent : "", "error");
    }

    prevSuccessVisible = sVis;
    prevErrorVisible = eVis;
  }

  if (successEl && errorEl) {
    var mo = new MutationObserver(onBrevoPanelsMaybeChanged);
    mo.observe(successEl, { attributes: true, attributeFilter: ["style", "class"] });
    mo.observe(errorEl, { attributes: true, attributeFilter: ["style", "class"] });
    queueMicrotask(onBrevoPanelsMaybeChanged);
  }

  if (!teaser || !openBtn || !dialog || !closeBtn || typeof dialog.showModal !== "function") return;

  syncOpenDisabled();
  teaser.addEventListener("input", syncOpenDisabled);
  teaser.addEventListener("change", syncOpenDisabled);

  openBtn.addEventListener("click", function () {
    if (openBtn.disabled) return;
    var emailField = document.getElementById("EMAIL");
    if (emailField) emailField.value = teaser.value.trim();
    dialog.showModal();
    requestAnimationFrame(focusEmail);
  });

  closeBtn.addEventListener("click", function () {
    dialog.close();
  });

  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) dialog.close();
  });
})();
