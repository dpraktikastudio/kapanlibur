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

  const listContext = {
    sortedData: null,
    byDate: null,
    dataYear: null,
    listYearMonth: null,
  };

  let heroSwipeInitialized = false;
  let liburMendatangSwipeBound = false;
  let liburMendatangInited = false;

  const calContext = {
    year: null,
    byDate: null,
    mobileMonth: 0,
  };
  const CAL_MOBILE_MQ = "(max-width: 640px)";
  const DOW_CAL_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  let calPopperInstance = null;
  let calPopoverRow = null;
  let calPopoverLastFocus = null;
  let calendarSwipeBound = false;
  let calendarUIInited = false;

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

  function monthAbbrevFromISO(iso) {
    const m = parseInt(iso.slice(5, 7), 10) - 1;
    return MONTHS[m].slice(0, 3).toUpperCase();
  }

  function rowBorderAccentClass(type) {
    if (type === "Libur Nasional") return "border-primary";
    if (type === "Cuti Bersama") return "border-secondary";
    return "border-outline-variant";
  }

  function liburMendatangMonthStep(delta) {
    if (!listContext.listYearMonth) return;
    let m = parseInt(listContext.listYearMonth.slice(5, 7), 10) - 1 + delta;
    if (m < 0) m = 0;
    if (m > 11) m = 11;
    listContext.listYearMonth =
      listContext.dataYear + "-" + String(m + 1).padStart(2, "0");
    renderLiburMendatangList();
  }

  function attachLiburMendatangSwipe(hostEl) {
    if (liburMendatangSwipeBound) return;
    if (!hostEl) return;
    liburMendatangSwipeBound = true;
    let startX = 0;
    let startY = 0;
    let ptrId = null;
    function trySwipe(endX, endY) {
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) {
        liburMendatangMonthStep(1);
      } else {
        liburMendatangMonthStep(-1);
      }
    }
    hostEl.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );
    hostEl.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches.length) return;
        trySwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      },
      { passive: true }
    );
    hostEl.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ptrId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
    });
    hostEl.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch") return;
      if (ptrId === null || e.pointerId !== ptrId) return;
      ptrId = null;
      trySwipe(e.clientX, e.clientY);
    });
    hostEl.addEventListener("pointercancel", function () {
      ptrId = null;
    });
  }

  function initLiburMendatangControls() {
    if (liburMendatangInited) return;
    liburMendatangInited = true;
    const prev = document.getElementById("libur-mendatang-prev");
    const next = document.getElementById("libur-mendatang-next");
    const listEl = document.getElementById("libur-mendatang-list");
    const host = document.getElementById("libur-mendatang-swipe-host");
    const toast = document.getElementById("libur-mendatang-share-toast");
    if (prev) {
      prev.addEventListener("click", function () {
        liburMendatangMonthStep(-1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        liburMendatangMonthStep(1);
      });
    }
    if (listEl) {
      listEl.addEventListener("click", function (e) {
        const btn = e.target.closest(".libur-mendatang-row-share");
        if (!btn) return;
        e.preventDefault();
        const date = btn.getAttribute("data-date");
        if (!date || !listContext.byDate) return;
        const row = listContext.byDate.get(date);
        if (!row) return;
        runShare(
          buildShareSelectedText(todayISO(), row, listContext.byDate),
          toast
        );
      });
    }
    attachLiburMendatangSwipe(host);
  }

  function showLiburMendatangLoaded() {
    const sk = document.getElementById("libur-mendatang-skeleton");
    const err = document.getElementById("libur-mendatang-error");
    const host = document.getElementById("libur-mendatang-swipe-host");
    const nav = document.getElementById("libur-mendatang-nav");
    if (sk) {
      sk.classList.add("hidden");
      sk.setAttribute("aria-hidden", "true");
    }
    if (err) err.classList.add("hidden");
    if (host) host.classList.remove("hidden");
    if (nav) nav.classList.remove("hidden");
  }

  function showLiburMendatangError() {
    const sk = document.getElementById("libur-mendatang-skeleton");
    const err = document.getElementById("libur-mendatang-error");
    const host = document.getElementById("libur-mendatang-swipe-host");
    const nav = document.getElementById("libur-mendatang-nav");
    if (sk) {
      sk.classList.add("hidden");
      sk.setAttribute("aria-hidden", "true");
    }
    if (err) err.classList.remove("hidden");
    if (host) host.classList.add("hidden");
    if (nav) nav.classList.add("hidden");
  }

  function renderLiburMendatangList() {
    const labelEl = document.getElementById("libur-mendatang-month-label");
    const listEl = document.getElementById("libur-mendatang-list");
    const prev = document.getElementById("libur-mendatang-prev");
    const next = document.getElementById("libur-mendatang-next");
    const sorted = listContext.sortedData;
    const byDate = listContext.byDate;
    const t = todayISO();

    if (!sorted || !sorted.length) {
      if (labelEl) labelEl.textContent = "";
      if (listEl) {
        listEl.innerHTML =
          '<p class="text-on-surface-variant text-sm">Tidak ada data libur.</p>';
      }
      if (prev) {
        prev.disabled = true;
        prev.setAttribute("aria-disabled", "true");
      }
      if (next) {
        next.disabled = true;
        next.setAttribute("aria-disabled", "true");
      }
      return;
    }

    const ym = listContext.listYearMonth;
    const mIdx = parseInt(ym.slice(5, 7), 10) - 1;
    if (labelEl) {
      labelEl.textContent = MONTHS[mIdx] + " " + listContext.dataYear;
    }
    if (prev) {
      prev.disabled = mIdx <= 0;
      prev.setAttribute("aria-disabled", mIdx <= 0 ? "true" : "false");
    }
    if (next) {
      next.disabled = mIdx >= 11;
      next.setAttribute("aria-disabled", mIdx >= 11 ? "true" : "false");
    }

    const rows = sorted.filter(function (r) {
      return r.date.slice(0, 7) === ym;
    });

    if (!rows.length) {
      if (listEl) {
        listEl.innerHTML =
          '<p class="text-on-surface-variant text-sm">Tidak ada libur pada bulan ini.</p>';
      }
      return;
    }

    if (listEl) {
      listEl.innerHTML = rows
        .map(function (row) {
          const past = row.date < t;
          const pastClass = past ? " opacity-60" : "";
          const borderAccent = rowBorderAccentClass(row.type);
          const dayNum = parseISODate(row.date).getDate();
          const monAbbr = monthAbbrevFromISO(row.date);
          const badges = renderBadgeSpans(row, byDate);
          const rantai = formatRantaiBerturutForRow(row, byDate);
          const badgeRow =
            badges !== ""
              ? '<div class="flex flex-wrap items-center gap-2">' +
                badges +
                "</div>"
              : "";
          return (
            '<article class="flex items-start gap-6 group' +
            pastClass +
            '" id="list-row-' +
            row.date +
            '" role="listitem">' +
            '<div class="flex-shrink-0 w-16 h-16 bg-surface-container-highest rounded-lg flex flex-col items-center justify-center border-l-4 ' +
            borderAccent +
            '">' +
            '<span class="text-xs font-bold text-on-surface-variant">' +
            escapeHtml(monAbbr) +
            "</span>" +
            '<span class="text-2xl font-extrabold text-on-surface">' +
            dayNum +
            "</span></div>" +
            '<div class="flex-grow pt-1 min-w-0">' +
            '<div class="flex flex-wrap items-start gap-3 mb-1">' +
            '<h4 class="font-bold text-lg text-on-surface flex-1 min-w-[12rem]">' +
            escapeHtml(row.description) +
            "</h4>" +
            '<div class="flex flex-wrap items-center gap-2 shrink-0">' +
            badgeRow +
            '<button type="button" class="libur-mendatang-row-share inline-flex items-center justify-center p-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant/40 transition-colors" data-date="' +
            escapeHtml(row.date) +
            '" aria-label="Bagikan">' +
            shareIconSvg() +
            "</button></div></div>" +
            '<p class="text-on-surface-variant text-sm">' +
            escapeHtml(row.day) +
            " · Libur " +
            escapeHtml(rantai) +
            "</p></div></article>"
          );
        })
        .join("");
    }
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

  function isCalMobile() {
    return typeof window.matchMedia !== "undefined" &&
      window.matchMedia(CAL_MOBILE_MQ).matches;
  }

  function calCellClasses(type) {
    if (type === "Libur Nasional") {
      return "bg-primary text-on-primary font-bold cursor-pointer";
    }
    if (type === "Cuti Bersama") {
      return "bg-secondary-container text-on-secondary-container font-bold cursor-pointer";
    }
    if (type === "Sabtu") {
      return "bg-surface-container-high text-on-surface-variant cursor-pointer";
    }
    if (type === "Minggu") {
      return "bg-surface-container-high text-on-surface-variant cursor-pointer";
    }
    return "bg-tertiary-container text-on-tertiary-container font-medium cursor-pointer";
  }

  function closeCalPopover() {
    if (calPopperInstance) {
      calPopperInstance.destroy();
      calPopperInstance = null;
    }
    const backdrop = document.getElementById("cal-popover-backdrop");
    const popoverEl = document.getElementById("cal-popover");
    if (backdrop) {
      backdrop.classList.add("hidden");
      backdrop.setAttribute("aria-hidden", "true");
    }
    if (popoverEl) {
      popoverEl.classList.add("hidden");
      popoverEl.style.top = "";
      popoverEl.style.left = "";
      popoverEl.style.transform = "";
    }
    calPopoverRow = null;
    if (calPopoverLastFocus && calPopoverLastFocus.focus) {
      try {
        calPopoverLastFocus.focus();
      } catch (err) {}
    }
    calPopoverLastFocus = null;
  }

  function openCalPopover(row, triggerEl) {
    const byDate = calContext.byDate;
    const title = document.getElementById("cal-popover-title");
    const body = document.getElementById("cal-popover-body");
    const popoverEl = document.getElementById("cal-popover");
    const backdrop = document.getElementById("cal-popover-backdrop");
    if (!title || !body || !popoverEl || !backdrop) return;

    calPopoverRow = row;
    calPopoverLastFocus = document.activeElement;

    title.innerHTML =
      '<time datetime="' +
      escapeHtml(row.date) +
      '">' +
      escapeHtml(formatLongID(row.date)) +
      "</time>";

    const badges = renderBadgeSpans(row, byDate);
    const badgeBlock =
      badges !== ""
        ? '<div class="flex flex-wrap gap-2">' + badges + "</div>"
        : "";

    body.innerHTML =
      '<p class="text-on-surface text-base font-medium mb-2">' +
      escapeHtml(row.description) +
      "</p>" +
      '<p class="text-on-surface-variant text-sm mb-4">' +
      '<time datetime="' +
      escapeHtml(row.date) +
      '">' +
      escapeHtml(row.day) +
      "</time> · Libur " +
      escapeHtml(formatRantaiBerturutForRow(row, byDate)) +
      "</p>" +
      '<div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/20">' +
      badgeBlock +
      '<div class="flex items-center gap-2 shrink-0">' +
      '<button type="button" id="cal-popover-share" class="inline-flex items-center justify-center p-2 rounded-lg border border-outline-variant text-primary hover:bg-surface-variant/40 transition-colors" aria-label="Bagikan">' +
      shareIconSvg() +
      "</button>" +
      '<span id="cal-popover-share-toast" class="share-toast text-primary text-xs whitespace-nowrap" aria-live="polite"></span>' +
      "</div></div>";

    if (calPopperInstance) {
      calPopperInstance.destroy();
      calPopperInstance = null;
    }

    backdrop.classList.remove("hidden");
    backdrop.setAttribute("aria-hidden", "false");
    popoverEl.classList.remove("hidden");

    const refEl =
      triggerEl instanceof Element ? triggerEl : document.getElementById("calendar");

    if (typeof Popper !== "undefined" && refEl) {
      popoverEl.style.top = "";
      popoverEl.style.left = "";
      popoverEl.style.transform = "";
      calPopperInstance = Popper.createPopper(refEl, popoverEl, {
        placement: "bottom",
        strategy: "fixed",
        modifiers: [
          { name: "offset", options: { offset: [0, 8] } },
          { name: "flip" },
          { name: "preventOverflow", options: { padding: 8 } },
        ],
      });
      requestAnimationFrame(function () {
        if (calPopperInstance) calPopperInstance.update();
      });
    } else {
      popoverEl.style.top = "50%";
      popoverEl.style.left = "50%";
      popoverEl.style.transform = "translate(-50%, -50%)";
    }

    const closeBtn = document.getElementById("cal-popover-close");
    if (closeBtn && closeBtn.focus) closeBtn.focus();
  }

  function buildHomeMonthGrid(year, month, byDate) {
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startPad = first.getDay();
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col";

    const h = document.createElement("h4");
    h.className = "font-bold text-lg mb-4 text-on-surface";
    h.textContent = MONTHS[month] + " " + year;
    wrap.appendChild(h);

    const dow = document.createElement("div");
    dow.className =
      "grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-outline mb-2 uppercase";
    DOW_CAL_SHORT.forEach(function (label) {
      const s = document.createElement("div");
      s.textContent = label;
      dow.appendChild(s);
    });
    wrap.appendChild(dow);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-7 gap-y-2 gap-x-1 text-sm";

    for (let i = 0; i < startPad; i++) {
      const pad = document.createElement("div");
      pad.className = "invisible pointer-events-none h-8";
      pad.setAttribute("aria-hidden", "true");
      grid.appendChild(pad);
    }

    const tISO = todayISO();
    const tParts = tISO.split("-").map(Number);
    const isThisYearToday = tParts[0] === year;

    for (let day = 1; day <= lastDay; day++) {
      const iso =
        year +
        "-" +
        String(month + 1).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0");
      const cell = document.createElement("div");
      const span = document.createElement("span");
      span.className = "tabular-nums";
      span.textContent = String(day);
      cell.appendChild(span);

      const row = byDate.get(iso);
      let cls =
        "h-8 flex items-center justify-center rounded-lg text-sm transition-colors";

      if (row) {
        cls += " " + calCellClasses(row.type);
        cell.title = row.description + " (" + row.type + ")";
        cell.setAttribute("tabindex", "0");
        cell.setAttribute("role", "button");
        (function (r, c) {
          c.addEventListener("click", function (e) {
            e.stopPropagation();
            openCalPopover(r, c);
          });
          c.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openCalPopover(r, c);
            }
          });
        })(row, cell);
      } else {
        cls +=
          " text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface";
      }

      if (iso < tISO) cls += " opacity-60";
      if (isThisYearToday && iso === tISO) {
        cls += " ring-2 ring-primary ring-offset-2 ring-offset-background";
      }

      cell.className = cls;
      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    return wrap;
  }

  function stepCalMobileMonth(delta) {
    calContext.mobileMonth += delta;
    if (calContext.mobileMonth < 0) calContext.mobileMonth = 0;
    if (calContext.mobileMonth > 11) calContext.mobileMonth = 11;
    renderHomeCalendar();
  }

  function renderHomeCalendar() {
    const container = document.getElementById("calendar");
    if (!container || !calContext.byDate || calContext.year == null) return;

    const byDate = calContext.byDate;
    const year = calContext.year;
    const toolbarLabel = document.getElementById("cal-toolbar-label");
    const prevCal = document.getElementById("cal-nav-prev");
    const nextCal = document.getElementById("cal-nav-next");
    const mobile = isCalMobile();

    if (mobile) {
      if (toolbarLabel) {
        toolbarLabel.textContent = MONTHS[calContext.mobileMonth] + " " + year;
      }
      if (prevCal) {
        prevCal.disabled = calContext.mobileMonth <= 0;
        prevCal.setAttribute(
          "aria-disabled",
          calContext.mobileMonth <= 0 ? "true" : "false"
        );
      }
      if (nextCal) {
        nextCal.disabled = calContext.mobileMonth >= 11;
        nextCal.setAttribute(
          "aria-disabled",
          calContext.mobileMonth >= 11 ? "true" : "false"
        );
      }
      container.innerHTML = "";
      container.appendChild(
        buildHomeMonthGrid(year, calContext.mobileMonth, byDate)
      );
    } else {
      if (toolbarLabel) toolbarLabel.textContent = "";
      if (prevCal) {
        prevCal.disabled = true;
        prevCal.setAttribute("aria-disabled", "true");
      }
      if (nextCal) {
        nextCal.disabled = true;
        nextCal.setAttribute("aria-disabled", "true");
      }
      container.innerHTML = "";
      for (let m = 0; m < 12; m++) {
        container.appendChild(buildHomeMonthGrid(year, m, byDate));
      }
    }
  }

  function attachCalendarWrapSwipeOnce() {
    if (calendarSwipeBound) return;
    const wrap = document.getElementById("calendar-wrap");
    if (!wrap) return;
    calendarSwipeBound = true;
    let startX = 0;
    let startY = 0;
    let ptrId = null;
    function trySwipe(endX, endY) {
      if (!isCalMobile()) return;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) {
        stepCalMobileMonth(1);
      } else {
        stepCalMobileMonth(-1);
      }
    }
    wrap.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true }
    );
    wrap.addEventListener(
      "touchend",
      function (e) {
        if (!e.changedTouches.length) return;
        trySwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      },
      { passive: true }
    );
    wrap.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      ptrId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
    });
    wrap.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch") return;
      if (ptrId === null || e.pointerId !== ptrId) return;
      ptrId = null;
      trySwipe(e.clientX, e.clientY);
    });
    wrap.addEventListener("pointercancel", function () {
      ptrId = null;
    });
  }

  function initCalendarUIOnce() {
    if (calendarUIInited) return;
    calendarUIInited = true;

    const backdrop = document.getElementById("cal-popover-backdrop");
    const popover = document.getElementById("cal-popover");
    const closeBtn = document.getElementById("cal-popover-close");

    if (backdrop) backdrop.addEventListener("click", closeCalPopover);
    if (closeBtn) closeBtn.addEventListener("click", closeCalPopover);

    document.addEventListener("keydown", function (e) {
      if (
        e.key === "Escape" &&
        popover &&
        !popover.classList.contains("hidden")
      ) {
        closeCalPopover();
      }
    });

    if (popover) {
      popover.addEventListener("click", function (e) {
        if (!e.target.closest("#cal-popover-share")) return;
        e.stopPropagation();
        if (!calPopoverRow || !calContext.byDate) return;
        const text = buildShareSelectedText(
          todayISO(),
          calPopoverRow,
          calContext.byDate
        );
        const toast = document.getElementById("cal-popover-share-toast");
        runShare(text, toast);
      });
    }

    const prev = document.getElementById("cal-nav-prev");
    const next = document.getElementById("cal-nav-next");
    if (prev) {
      prev.addEventListener("click", function () {
        stepCalMobileMonth(-1);
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        stepCalMobileMonth(1);
      });
    }

    attachCalendarWrapSwipeOnce();

    if (typeof window.matchMedia !== "undefined") {
      window.matchMedia(CAL_MOBILE_MQ).addEventListener("change", function () {
        if (calContext.byDate && calContext.year != null) {
          renderHomeCalendar();
        }
      });
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

    const t = todayISO();
    if (data.length) {
      const year = parseInt(data[0].date.slice(0, 4), 10);
      listContext.sortedData = data;
      listContext.byDate = byDate;
      listContext.dataYear = year;
      listContext.listYearMonth =
        t.slice(0, 4) === String(year) ? t.slice(0, 7) : year + "-01";
      calContext.year = year;
      calContext.byDate = byDate;
      calContext.mobileMonth =
        t.slice(0, 4) === String(year)
          ? parseInt(t.slice(5, 7), 10) - 1
          : 0;
    } else {
      listContext.sortedData = [];
      listContext.byDate = byDate;
      const y = new Date().getFullYear();
      listContext.dataYear = y;
      listContext.listYearMonth = y + "-01";
      calContext.year = y;
      calContext.byDate = byDate;
      calContext.mobileMonth = 0;
    }
    showLiburMendatangLoaded();
    initLiburMendatangControls();
    renderLiburMendatangList();
    initCalendarUIOnce();
    renderHomeCalendar();
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

    showLiburMendatangError();

    const calEl = document.getElementById("calendar");
    if (calEl) {
      calEl.innerHTML =
        '<p class="text-on-surface-variant text-sm col-span-full">Tidak bisa memuat kalender. Muat ulang halaman atau buka <a class="text-primary font-semibold hover:underline" href="/hari-libur-nasional-2026.html">daftar lengkap</a>.</p>';
    }
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
