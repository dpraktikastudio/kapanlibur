(function () {
  var FALLBACK =
    "https://www.kemenkopmk.go.id/sites/default/files/pengumuman/2025-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202026.pdf";

  function applyPdfUrl(url) {
    document.querySelectorAll("a[data-pdf-source]").forEach(function (a) {
      a.setAttribute("href", url);
    });
    var line = document.getElementById("source-line");
    if (line) line.hidden = false;
  }

  function run() {
    fetch("/json/2026.json")
      .then(function (r) {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(function (json) {
        var url = FALLBACK;
        if (json && typeof json.source === "string" && json.source.trim()) {
          url = json.source.trim();
        }
        applyPdfUrl(url);
      })
      .catch(function () {
        applyPdfUrl(FALLBACK);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
