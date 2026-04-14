(function () {
  var teaser = document.getElementById("newsletter-teaser-email");
  var openBtn = document.getElementById("newsletter-dialog-open");
  var dialog = document.getElementById("newsletter-dialog");
  var closeBtn = document.getElementById("newsletter-dialog-close");

  if (!teaser || !openBtn || !dialog || !closeBtn || typeof dialog.showModal !== "function") return;

  function syncOpenDisabled() {
    var v = teaser.value.trim();
    openBtn.disabled = !v || !teaser.checkValidity();
  }

  function focusEmail() {
    var email = document.getElementById("EMAIL");
    if (email) email.focus();
  }

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
