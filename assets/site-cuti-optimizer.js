(function () {
  "use strict";

  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];

  let byDateMap = null;

  function parseISODate(iso) {
    const p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function toISOFromDate(d) {
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function addDaysISO(iso, delta) {
    const d = parseISODate(iso);
    d.setDate(d.getDate() + delta);
    return toISOFromDate(d);
  }

  function todayISO() {
    const n = new Date();
    return toISOFromDate(n);
  }

  function isOff(iso, byDate) {
    const d = parseISODate(iso);
    const w = d.getDay();
    if (w === 0 || w === 6) return true;
    return byDate.has(iso);
  }

  function countLeaveInRange(L, R, byDate) {
    let n = 0;
    let cur = L;
    while (true) {
      if (!isOff(cur, byDate)) n++;
      if (cur === R) break;
      cur = addDaysISO(cur, 1);
    }
    return n;
  }

  function formatShort(iso) {
    const d = parseISODate(iso);
    return (
      d.getDate() +
      " " +
      MONTHS_SHORT[d.getMonth()] +
      " " +
      d.getFullYear()
    );
  }

  function collectLeaveDates(L, R, byDate) {
    const out = [];
    let cur = L;
    while (true) {
      if (!isOff(cur, byDate)) out.push(cur);
      if (cur === R) break;
      cur = addDaysISO(cur, 1);
    }
    return out;
  }

  function formatLeaveList(isos) {
    if (!isos.length) return "";
    if (isos.length === 1) return formatShort(isos[0]);
    let consec = true;
    for (let i = 1; i < isos.length; i++) {
      if (addDaysISO(isos[i - 1], 1) !== isos[i]) {
        consec = false;
        break;
      }
    }
    if (consec) {
      return (
        formatShort(isos[0]) + " – " + formatShort(isos[isos.length - 1])
      );
    }
    return isos.map(formatShort).join(", ");
  }

  function findBestLeaveWindow(today, N, byDate) {
    const maxHorizon = 180;
    const maxWidth = 50;
    let best = null;
    let bestSpan = -1;
    for (let i = 0; i <= maxHorizon; i++) {
      const L = addDaysISO(today, i);
      for (let w = 0; w <= maxWidth; w++) {
        const R = addDaysISO(L, w);
        const cnt = countLeaveInRange(L, R, byDate);
        if (cnt > N) break;
        if (cnt === N) {
          const span = w + 1;
          if (
            span > bestSpan ||
            (span === bestSpan && (!best || L.localeCompare(best.L) < 0))
          ) {
            bestSpan = span;
            best = { L: L, R: R, span: span };
          }
        }
      }
    }
    return best;
  }

  function runOptimizer() {
    const input = document.getElementById("cuti-optimizer-n");
    const results = document.getElementById("cuti-optimizer-results");
    const errEl = document.getElementById("cuti-optimizer-error");
    const hint = document.getElementById("cuti-optimizer-hint");
    const leaveEl = document.getElementById("cuti-optimizer-leave-dates");
    const rangeEl = document.getElementById("cuti-optimizer-span-range");
    const totalEl = document.getElementById("cuti-optimizer-total");

    if (!input || !byDateMap) return;

    if (errEl) {
      errEl.classList.add("hidden");
      errEl.textContent = "";
    }
    if (results) results.classList.add("hidden");

    const N = parseInt(String(input.value), 10);
    if (!N || N < 1 || N > 10) {
      if (hint) hint.classList.remove("hidden");
      if (errEl) {
        errEl.textContent = "Masukkan jumlah hari cuti antara 1 dan 10.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    const t = todayISO();
    const best = findBestLeaveWindow(t, N, byDateMap);
    if (!best) {
      if (hint) hint.classList.remove("hidden");
      if (errEl) {
        errEl.textContent =
          "Tidak menemukan kombinasi untuk jumlah hari itu. Coba angka lain.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    const leaves = collectLeaveDates(best.L, best.R, byDateMap);
    if (leaveEl) leaveEl.textContent = formatLeaveList(leaves);
    if (rangeEl) {
      rangeEl.textContent =
        formatShort(best.L) + " – " + formatShort(best.R);
    }
    if (totalEl) {
      totalEl.textContent = best.span + " hari libur";
    }
    if (results) results.classList.remove("hidden");
    if (hint) hint.classList.add("hidden");
  }

  function onHolidaysLoaded(ev) {
    const d = ev && ev.detail;
    if (!d || !d.byDate) return;
    byDateMap = d.byDate;
  }

  document.addEventListener("kapanlibur:holidays-loaded", onHolidaysLoaded);

  const runBtn = document.getElementById("cuti-optimizer-run");
  if (runBtn) {
    runBtn.addEventListener("click", runOptimizer);
  }
})();
