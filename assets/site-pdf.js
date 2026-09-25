(function () {
  "use strict";
  /** PDF links in nav/footer use static hrefs. Reveal #source-line on home if present. */
  function run() {
    var line = document.getElementById("source-line");
    if (line) line.hidden = false;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
