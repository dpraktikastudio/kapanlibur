(function () {
  "use strict";

  const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const DOW_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const heroContext = {
    byDate: null,
    sortedData: null,
    selectedIndex: null,
  };

  let heroSwipeInitialized = false;

  function todayISO() {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, "0");
    const d = String(n.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function parseISODate(iso) {
    const p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function diffDays(fromISO, toISO) {
    const a = parseISODate(fromISO);
    const b = parseISODate(toISO);
    return Math.round((b - a) / 86400000);
  }

  function formatLongID(iso) {
    const d = parseISODate(iso);
    const day = d.getDay();
    const name = DOW_LONG[day];
    return name + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
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

  function chainStartISO(row, byDate) {
    if (!byDate || !byDate.get) return row.date;
    let cur = row.date;
    const len = row.chain_holidays;
    while (true) {
      const prev = addDaysISO(cur, -1);
      const pr = byDate.get(prev);
      if (!pr || pr.chain_holidays !== len) break;
      cur = prev;
    }
    return cur;
  }

  function formatChainWeekdayList(startISO, n) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const iso = addDaysISO(startISO, i);
      parts.push(DOW_LONG[parseISODate(iso).getDay()]);
    }
    return parts.join(", ");
  }

  function formatRantaiBerturutForRow(row, byDate) {
    if (!byDate || !byDate.get) {
      return String(row.chain_holidays) + " hari";
    }
    const start = chainStartISO(row, byDate);
    return (
      row.chain_holidays +
      " hari (" +
      formatChainWeekdayList(start, row.chain_holidays) +
      ")"
    );
  }

  function showTypeBadgeForRow(type) {
    return type !== "Sabtu" && type !== "Minggu";
  }

  function daysUntilPhrase(n) {
    if (n <= 0) return "hari ini";
    if (n === 1) return "besok";
    return n + " hari lagi";
  }

  function menujuNextHolidayCaption(row) {
    if (row.type === "Sabtu") return "Menuju libur Sabtu";
    if (row.type === "Minggu") return "Menuju libur Minggu";
    if (row.type === "Cuti Bersama") {
      return "Menuju cuti bersama — " + row.description;
    }
    return "Menuju libur nasional — " + row.description;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildShareTodayText(t, todayRow, byDate) {
    const lines = ["Per " + formatLongID(t)];
    if (todayRow) {
      lines.push(
        "Hari ini libur: " + todayRow.description + " (" + todayRow.type + ")"
      );
      lines.push(
        "Libur berturut-turut: " +
          formatRantaiBerturutForRow(todayRow, byDate)
      );
      if (todayRow.is_long_weekend) {
        lines.push("Libur panjang");
      }
    } else {
      lines.push("Hari ini tidak libur menurut data SKB 3 Menteri.");
    }
    lines.push("");
    return lines.join("\n");
  }

  function buildShareSelectedText(t, selectedRow, byDate) {
    if (!selectedRow) {
      return "Tidak ada data libur untuk ditampilkan.";
    }
    const lines = [];
    const rantaiStr = formatRantaiBerturutForRow(selectedRow, byDate);
    if (selectedRow.date > t) {
      const n = diffDays(t, selectedRow.date);
      lines.push(
        formatLongID(selectedRow.date) +
          " — " +
          selectedRow.description +
          " (" +
          selectedRow.type +
          ")"
      );
      let meta = daysUntilPhrase(n) + " · Libur " + rantaiStr;
      if (selectedRow.is_long_weekend) {
        meta += " · Libur panjang";
      }
      lines.push(meta);
    } else {
      lines.push(
        formatLongID(selectedRow.date) +
          " — " +
          selectedRow.description +
          " (" +
          selectedRow.type +
          ")"
      );
      let meta = "Libur " + rantaiStr;
      if (selectedRow.is_long_weekend) {
        meta += " · Libur panjang";
      }
      lines.push(meta);
    }
    lines.push("");
    return lines.join("\n");
  }

  function shareIconSvg() {
    return (
      '<svg class="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5M16.5 3h6m0 0v6m0-6L10.5 16.5" />' +
      "</svg>"
    );
  }

  function runShare(text, toast) {
    const url = typeof location !== "undefined" ? location.href : "";
    if (navigator.share) {
      navigator
        .share({
          title: "kapanlibur.com",
          text: text,
          url: url,
        })
        .catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text + "\n\n" + url)
        .then(function () {
          if (toast) {
            toast.textContent = "Disalin ke papan klip";
            toast.classList.add("show");
            setTimeout(function () {
              toast.classList.remove("show");
            }, 2500);
          }
        })
        .catch(function () {
          window.prompt("Salin teks:", text + "\n\n" + url);
        });
    } else {
      window.prompt("Salin teks:", text + "\n\n" + url);
    }
  }

  function attachHeroSwipe(navEl) {
    let startX = 0;
    let startY = 0;
    let ptrId = null;
    function trySwipe(endX, endY) {
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      const idx = heroContext.selectedIndex;
      const max = heroContext.sortedData.length - 1;
      if (dx < 0) {
        if (idx < max) {
          heroContext.selectedIndex = idx + 1;
          renderMainCard();
        }
      } else {
        if (idx > 0) {
          heroContext.selectedIndex = idx - 1;
          renderMainCard();
        }
      }
    }
    navEl.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );
    navEl.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches.length) return;
        trySwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      },
      { passive: true }
    );
    navEl.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ptrId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
    });
    navEl.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch") return;
      if (ptrId === null || e.pointerId !== ptrId) return;
      ptrId = null;
      trySwipe(e.clientX, e.clientY);
    });
    navEl.addEventListener("pointercancel", function () {
      ptrId = null;
    });
  }

  function badgeClass(type) {
    if (type === "Libur Nasional") {
      return (
        "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border border-transparent " +
        "bg-primary-container text-on-primary-container " +
        "dark:bg-white/15 dark:text-white dark:border-white/25"
      );
    }
    if (type === "Cuti Bersama") {
      return (
        "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border border-transparent " +
        "bg-secondary-container text-on-secondary-container " +
        "dark:bg-white/10 dark:text-white dark:border-white/20"
      );
    }
    return (
      "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border border-transparent " +
      "bg-surface-variant text-on-surface-variant " +
      "dark:bg-white/10 dark:text-white dark:border-white/15"
    );
  }

  function renderBadgeSpans(row, byDate) {
    let html = "";
    if (showTypeBadgeForRow(row.type)) {
      html +=
        '<span class="' +
        badgeClass(row.type) +
        '">' +
        escapeHtml(row.type) +
        "</span>";
    }
    if (row.is_long_weekend) {
      html +=
        '<span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-amber-100 text-amber-900 dark:text-white dark:border dark:border-red-500/40 dark:bg-red-600/20">Libur panjang</span>';
    }
    return html;
  }

  function setTodayBody(el, todayRow, byDate) {
    if (!el) return;
    if (todayRow) {
      let html =
        '<p class="text-on-surface">' +
        escapeHtml("Karena " + todayRow.description) +
        "</p>";
      const badges = renderBadgeSpans(todayRow, byDate);
      if (badges) {
        html += '<div class="flex flex-wrap gap-2">' + badges + "</div>";
      }
      html +=
        '<p class="text-sm text-on-surface-variant">Libur berturut-turut: <strong class="text-on-surface">' +
        escapeHtml(formatRantaiBerturutForRow(todayRow, byDate)) +
        "</strong></p>";
      el.innerHTML = html;
    } else {
      el.innerHTML =
        '<p class="text-on-surface-variant">Tidak ada libur pada tanggal ini menurut data SKB 3 Menteri.</p>';
    }
  }

  function renderMainCard() {
    const elDate = document.getElementById("hero-today-date");
    const elHeadline = document.getElementById("hero-today-headline");
    const elBody = document.getElementById("hero-today-body");
    const btnShareToday = document.getElementById("hero-share-today");
    const toastToday = document.getElementById("hero-share-today-toast");
    const nextCol = document.getElementById("hero-next-column");
    const nextCard = document.getElementById("hero-next-card");
    const elNextTitle = document.getElementById("hero-next-section-title");
    const elCountdown = document.getElementById("hero-next-countdown");
    const elCountPri = document.getElementById("hero-next-count-primary");
    const elCountSub = document.getElementById("hero-next-count-sub");
    const elBecause = document.getElementById("hero-next-because");
    const elBadges = document.getElementById("hero-next-badges");
    const elChain = document.getElementById("hero-next-chain");
    const elNextDate = document.getElementById("hero-next-date");
    // const elChipText = document.getElementById("hero-next-chip-text");
    const btnShareNext = document.getElementById("hero-share-next");
    const toastNext = document.getElementById("hero-share-next-toast");
    const prevNav = document.getElementById("hero-nav-prev");
    const nextNav = document.getElementById("hero-nav-next");

    const byDate = heroContext.byDate;
    const sortedData = heroContext.sortedData;
    const t = todayISO();
    
    // * Test, manipulate date
    // const t = "2026-05-01";
    
    const todayRow = byDate && byDate.get ? byDate.get(t) || null : null;

    if (elDate) {
      elDate.setAttribute("datetime", t);
      elDate.textContent = formatLongID(t);
    }

    if (!sortedData || !sortedData.length) {
      if (elHeadline) {
        elHeadline.innerHTML =
          'Data <span class="text-outline">belum</span> tersedia';
      }
      if (elBody) {
        elBody.innerHTML =
          '<p class="text-on-surface-variant">Tidak ada data libur untuk ditampilkan.</p>';
      }
      if (nextCol) nextCol.classList.add("hidden");
      if (btnShareToday) {
        btnShareToday.innerHTML = shareIconSvg() + "<span>Bagikan</span>";
        btnShareToday.onclick = function () {
          runShare(buildShareTodayText(t, null, byDate), toastToday);
        };
      }
      return;
    }

    if (nextCol) nextCol.classList.remove("hidden");

    if (elHeadline) {
      if (todayRow) {
        elHeadline.innerHTML =
          'Hari ini <span class="text-primary">libur</span>.';
      } else {
        elHeadline.innerHTML =
          'Hari ini <span class="text-outline">tidak</span> libur.';
      }
    }
    setTodayBody(elBody, todayRow, byDate);

    if (btnShareToday) {
      btnShareToday.innerHTML = shareIconSvg() + "<span>Bagikan</span>";
      btnShareToday.onclick = function () {
        runShare(buildShareTodayText(t, todayRow, byDate), toastToday);
      };
    }

    const firstFutureIdx = sortedData.findIndex(function (r) {
      return r.date > t;
    });
    if (heroContext.selectedIndex === null) {
      heroContext.selectedIndex =
        firstFutureIdx >= 0 ? firstFutureIdx : sortedData.length - 1;
    }
    let idx = heroContext.selectedIndex;
    idx = Math.max(0, Math.min(sortedData.length - 1, idx));
    heroContext.selectedIndex = idx;

    const selectedRow = sortedData[idx];
    const atMin = idx === 0;
    const atMax = idx === sortedData.length - 1;
    const showCountdown = selectedRow.date > t;
    const nextCardDimmed = selectedRow.date < t;

    let nextSectionTitle;
    if (selectedRow.date > t) {
      nextSectionTitle = "Libur berikutnya";
    } else if (selectedRow.date < t) {
      nextSectionTitle = "Libur sebelumnya";
    } else {
      nextSectionTitle = "Libur pada hari ini";
    }

    if (nextCard) {
      nextCard.classList.toggle("opacity-60", nextCardDimmed);
    }

    if (elNextTitle) elNextTitle.textContent = nextSectionTitle;

    if (elCountdown && elCountPri && elCountSub) {
      if (showCountdown) {
        elCountdown.classList.remove("hidden");
        const n = diffDays(t, selectedRow.date);
        const until = daysUntilPhrase(n);
        const untilDisp = until.charAt(0).toUpperCase() + until.slice(1);
        elCountPri.textContent = untilDisp;
        elCountSub.textContent = menujuNextHolidayCaption(selectedRow);
      } else {
        elCountdown.classList.add("hidden");
        elCountPri.textContent = "";
        elCountSub.textContent = "";
      }
    }

    if (elBecause) {
      // elBecause.textContent = "Karena " + selectedRow.description;
    }
    if (elBadges) {
      elBadges.innerHTML = renderBadgeSpans(selectedRow, byDate);
    }
    if (elChain) {
      elChain.innerHTML =
        "Libur berturut-turut: <strong class=\"text-white\">" +
        escapeHtml(formatRantaiBerturutForRow(selectedRow, byDate)) +
        "</strong>";
    }
    if (elNextDate) {
      elNextDate.setAttribute("datetime", selectedRow.date);
      elNextDate.textContent = formatLongID(selectedRow.date);
    }
    // if (elChipText) {
    //   elChipText.textContent = selectedRow.description;
    // }

    if (btnShareNext) {
      btnShareNext.innerHTML = shareIconSvg() + "<span>Bagikan</span>";
      btnShareNext.onclick = function () {
        runShare(
          buildShareSelectedText(t, selectedRow, byDate),
          toastNext
        );
      };
    }

    if (prevNav) {
      prevNav.disabled = atMin;
      prevNav.setAttribute("aria-disabled", atMin ? "true" : "false");
      prevNav.onclick = function () {
        if (!atMin) {
          heroContext.selectedIndex = heroContext.selectedIndex - 1;
          renderMainCard();
        }
      };
    }
    if (nextNav) {
      nextNav.disabled = atMax;
      nextNav.setAttribute("aria-disabled", atMax ? "true" : "false");
      nextNav.onclick = function () {
        if (!atMax) {
          heroContext.selectedIndex = heroContext.selectedIndex + 1;
          renderMainCard();
        }
      };
    }

    const heroNextNav = document.getElementById("hero-next-nav");
    if (heroNextNav) {
      heroNextNav.setAttribute("aria-label", nextSectionTitle);
    }
  }

  function ensureHeroSwipe() {
    if (heroSwipeInitialized) return;
    const nav = document.getElementById("hero-next-nav");
    if (nav) {
      attachHeroSwipe(nav);
      heroSwipeInitialized = true;
    }
  }

  function onDataLoaded(data) {
    const byDate = new Map(data.map(function (r) { return [r.date, r]; }));
    heroContext.byDate = byDate;
    heroContext.sortedData = data;
    heroContext.selectedIndex = null;

    const loading = document.getElementById("hero-loading");
    const errBox = document.getElementById("hero-error");
    const content = document.getElementById("hero-content");
    const section = document.getElementById("hero-section");

    if (loading) loading.classList.add("hidden");
    if (errBox) errBox.classList.add("hidden");
    if (content) content.classList.remove("hidden");
    if (section) section.setAttribute("aria-busy", "false");

    renderMainCard();
    ensureHeroSwipe();
  }

  function onDataError() {
    const loading = document.getElementById("hero-loading");
    const errBox = document.getElementById("hero-error");
    const msg = document.getElementById("hero-error-msg");
    const section = document.getElementById("hero-section");

    if (loading) loading.classList.add("hidden");
    if (errBox) errBox.classList.remove("hidden");
    if (msg) {
      msg.textContent =
        "Tidak bisa memuat data. Gunakan server statis lokal (bukan file://), misalnya: npx serve di folder proyek.";
    }
    if (section) section.setAttribute("aria-busy", "false");
  }

  fetch("/json/2026.json")
    .then(function (r) {
      if (!r.ok) {
        throw new Error("Gagal memuat json/2026.json (" + r.status + ")");
      }
      return r.json();
    })
    .then(function (json) {
      const data = json.data.slice().sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });
      onDataLoaded(data);
    })
    .catch(function (err) {
      console.error(err);
      onDataError();
    });
})();
