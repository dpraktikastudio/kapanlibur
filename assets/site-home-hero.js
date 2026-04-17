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
    minSelectableIndex: 0,
    headlineTypingGen: 0,
  };

  const listContext = {
    sortedData: null,
    byDate: null,
    dataYear: null,
    listYearMonth: null,
  };

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

  function indexFirstStrictlyAfterToday(sortedData, todayISO) {
    if (!sortedData || !sortedData.length) return -1;
    return sortedData.findIndex(function (r) {
      return r.date > todayISO;
    });
  }

  function indexFirstFutureNasionalCuti(sortedData, todayISO) {
    if (!sortedData || !sortedData.length) return -1;
    return sortedData.findIndex(function (r) {
      return (
        r.date > todayISO &&
        (r.type === "Libur Nasional" || r.type === "Cuti Bersama")
      );
    });
  }

  function nextLiburNasionalCutiRow(sortedData, todayISO) {
    const i = indexFirstFutureNasionalCuti(sortedData, todayISO);
    if (i < 0) return null;
    return sortedData[i];
  }

  function heroBannerSummaryLines(t, selectedRow, byDate) {
    const dateStr = formatLongID(selectedRow.date);
    const shortDateStr = formatShortDateID(selectedRow.date);
    const desc = selectedRow.description;
    const type = selectedRow.type;
    const eDesc = escapeHtml(desc);
    const eType = escapeHtml(type);
    const eShortDate = escapeHtml(shortDateStr);
    let visualHtml = "";
    let full = "";

    function longWeekendSuffix() {
      const lw = selectedRow.chain_holidays;
      const lwN = typeof lw === "number" && lw > 0 ? lw : 1;
      return {
        visual:
          " • <span class=\"font-semibold text-inherit\">Libur Panjang (" +
          lwN +
          " hari)</span>",
        plain: " • Libur Panjang (" + lwN + " hari)",
      };
    }

    if (selectedRow.date > t) {
      const n = diffDays(t, selectedRow.date);
      const cap = menujuNextHolidayCaption(selectedRow);
      const when = n === 1 ? "besok" : "dalam " + n + " hari";
      visualHtml =
        "<span class=\"hidden sm:inline\">Libur berikutnya: </span>" +
        eDesc +
        " (" +
        eShortDate +
        ") — " +
        when;
      full =
        "Libur berikutnya: " +
        desc +
        " (" +
        shortDateStr +
        ") — " +
        when +
        " — " +
        cap +
        " — " +
        dateStr;
      if (selectedRow.is_long_weekend) {
        const lw = longWeekendSuffix();
        visualHtml += lw.visual;
        full += lw.plain;
      }
    } else if (selectedRow.date < t) {
      visualHtml =
        "<strong class=\"font-semibold text-inherit\">" +
        eDesc +
        "</strong> (" +
        eType +
        ") · " +
        escapeHtml(dateStr);
      full =
        desc +
        " (" +
        type +
        ") · " +
        dateStr +
        " — Libur berturut-turut: " +
        formatRantaiBerturutForRow(selectedRow, byDate);
      if (selectedRow.is_long_weekend) {
        const lw = longWeekendSuffix();
        visualHtml += lw.visual;
        full += lw.plain;
      }
    } else {
      visualHtml =
        "Hari ini: <strong class=\"font-semibold text-inherit\">" +
        eDesc +
        "</strong> (" +
        eType +
        ")";
      full =
        "Hari ini: " +
        desc +
        " (" +
        type +
        ") · " +
        dateStr +
        " — Libur berturut-turut: " +
        formatRantaiBerturutForRow(selectedRow, byDate);
      if (selectedRow.is_long_weekend) {
        const lw = longWeekendSuffix();
        visualHtml += lw.visual;
        full += lw.plain;
      }
    }
    return { visualHtml: visualHtml, full: full };
  }

  function formatLongID(iso) {
    const d = parseISODate(iso);
    const day = d.getDay();
    const name = DOW_LONG[day];
    return name + ", " + d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
  }

  function formatShortDateID(iso) {
    const d = parseISODate(iso);
    return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
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

  function buildShareTodayText(t, todayRow, byDate, sortedData) {
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
    if (sortedData && sortedData.length) {
      const nextLnCb = nextLiburNasionalCutiRow(sortedData, t);
      if (nextLnCb) {
        const n = diffDays(t, nextLnCb.date);
        const when = daysUntilPhrase(n);
        const typeLabel =
          nextLnCb.type === "Cuti Bersama" ? "Cuti bersama" : "Libur nasional";
        lines.push(
          "Libur berikutnya: " +
            when +
            " — " +
            formatLongID(nextLnCb.date) +
            " · " +
            nextLnCb.description +
            " (" +
            typeLabel +
            ")"
        );
      }
    }
    lines.push("");
    lines.push("Rencanakan liburan kamu di https://kapanlibur.com!");
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
      '<span class="material-symbols-outlined share-icon-svg shrink-0 text-base leading-none inline-block align-middle" aria-hidden="true">share</span>'
    );
  }

  function runShare(text, toast, bagikanPlacement) {
    if (bagikanPlacement && window.kapanliburGa && window.kapanliburGa.track) {
      window.kapanliburGa.track("bagikan_click", {
        placement: bagikanPlacement,
      });
    }
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
          toast,
          "libur_mendatang"
        );
      });
    }
    attachLiburMendatangSwipe(host);
  }

  function showLiburMendatangLoaded() {
    const state = document.getElementById("libur-mendatang-state");
    const err = document.getElementById("libur-mendatang-error");
    const host = document.getElementById("libur-mendatang-swipe-host");
    const nav = document.getElementById("libur-mendatang-nav");
    if (state) state.classList.add("hidden");
    if (err) err.classList.add("hidden");
    if (host) host.classList.remove("hidden");
    if (nav) nav.classList.remove("hidden");
  }

  function showLiburMendatangError() {
    const state = document.getElementById("libur-mendatang-state");
    const err = document.getElementById("libur-mendatang-error");
    const host = document.getElementById("libur-mendatang-swipe-host");
    const nav = document.getElementById("libur-mendatang-nav");
    if (state) state.classList.add("hidden");
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
          const isLongWeekend = !!row.is_long_weekend;
          const dateBoxClass =
            "flex-shrink-0 w-12 md:w-16 h-12 md:h-16 bg-surface-container-highest rounded-lg flex flex-col items-center justify-center " +
            (isLongWeekend
              ? "libur-mendatang-datebox--long-weekend"
              : "border-l-4 " + borderAccent);
          const monTextClass = isLongWeekend
            ? "text-xs font-bold libur-mendatang-date-long-text"
            : "text-xs font-bold text-on-surface-variant";
          const dayTextClass = isLongWeekend
            ? "text-lg md:text-2xl font-extrabold libur-mendatang-date-long-text"
            : "text-lg md:text-2xl font-extrabold text-on-surface";
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
            '<article class="flex items-start gap-4 md:gap-6 group' +
            pastClass +
            '" id="list-row-' +
            row.date +
            '" role="listitem">' +
            '<div class="' +
            dateBoxClass +
            '">' +
            '<span class="' +
            monTextClass +
            '">' +
            escapeHtml(monAbbr) +
            "</span>" +
            '<span class="' +
            dayTextClass +
            '">' +
            dayNum +
            "</span></div>" +
            '<div class="flex-grow min-w-0">' +
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
        "bg-primary-fixed text-on-primary-fixed-variant " +
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
        '<span class="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-red-600/20 text-amber-900 dark:text-white dark:border dark:border-red-500/40 dark:bg-red-600/20">Libur panjang</span>';
    }
    return html;
  }

  function setTodayBody(el, todayRow, byDate) {
    if (!el) return;
    if (todayRow) {
      let html =
        '<p class="text-on-surface text-[0.9375rem] leading-relaxed">' +
        escapeHtml("Karena " + todayRow.description) +
        "</p>";
      const badges = renderBadgeSpans(todayRow, byDate);
      if (badges) {
        html +=
          '<div class="flex flex-wrap gap-1.5">' + badges + "</div>";
      }
      html +=
        '<p class="text-xs text-on-surface-variant leading-relaxed">Libur berturut-turut: <strong class="text-on-surface">' +
        escapeHtml(formatRantaiBerturutForRow(todayRow, byDate)) +
        "</strong></p>";
      el.innerHTML = html;
    } else {
      el.innerHTML =
        '<p class="text-on-surface-variant text-[0.9375rem] leading-relaxed">Tidak ada libur pada tanggal ini menurut data SKB 3 Menteri.</p>';
    }
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isInViewport(el) {
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight * 0.95;
  }

  function whenEntersViewport(el, cb) {
    if (!el) return;
    const observeTarget =
      document.getElementById("hero-content") ||
      document.getElementById("home-top-split") ||
      el;
    if (isInViewport(observeTarget)) {
      requestAnimationFrame(cb);
      return;
    }
    const io = new IntersectionObserver(
      function (entries, obs) {
        if (entries[0] && entries[0].isIntersecting) {
          obs.disconnect();
          cb();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(observeTarget);
  }

  function typeHeadlineSegments(el, segments, options) {
    const delayMs = options.delayMs || 38;
    const shouldAbort = options.shouldAbort;
    const onComplete = options.onComplete;
    const prefix = options.prefix || "";
    el.innerHTML = "";
    if (prefix) {
      el.appendChild(document.createTextNode(prefix));
    }
    el.setAttribute("aria-busy", "true");
    let segI = 0;
    let pos = 0;
    let span = null;
    let textNode = null;

    function tick() {
      if (shouldAbort && shouldAbort()) {
        el.removeAttribute("aria-busy");
        return;
      }
      if (segI >= segments.length) {
        el.removeAttribute("aria-busy");
        if (onComplete) onComplete();
        return;
      }
      const seg = segments[segI];
      if (seg.instant) {
        span = null;
        textNode = null;
        if (seg.className) {
          span = document.createElement("span");
          span.className = seg.className;
          span.textContent = seg.text;
          el.appendChild(span);
        } else {
          el.appendChild(document.createTextNode(seg.text));
        }
        segI++;
        pos = 0;
        window.setTimeout(tick, 0);
        return;
      }
      if (pos === 0) {
        span = null;
        textNode = null;
        if (seg.className) {
          span = document.createElement("span");
          span.className = seg.className;
          el.appendChild(span);
        } else {
          textNode = document.createTextNode("");
          el.appendChild(textNode);
        }
      }
      const bucket = span || textNode;
      bucket.textContent += seg.text.charAt(pos);
      pos++;
      if (pos >= seg.text.length) {
        segI++;
        pos = 0;
      }
      window.setTimeout(tick, delayMs);
    }

    window.setTimeout(tick, 300);
  }

  function scheduleHeroTodayHeadline(elHeadline, todayRow, todayIso) {
    if (!elHeadline) return;
    const key = todayIso + ":" + (todayRow ? "libur" : "kerja");
    const prevKey = elHeadline.getAttribute("data-headline-key");
    const done = elHeadline.getAttribute("data-headline-done") === "1";
    const busy = elHeadline.getAttribute("aria-busy") === "true";
    if (prevKey === key && (done || busy)) return;

    heroContext.headlineTypingGen += 1;
    const gen = heroContext.headlineTypingGen;
    elHeadline.setAttribute("data-headline-key", key);
    elHeadline.removeAttribute("data-headline-done");
    if (prevKey != null && prevKey !== key) {
      elHeadline.innerHTML = "";
    }

    const segments = todayRow
      ? [
          { text: "libur", className: "text-red-700 dark:text-red-600" },
          { text: ".", instant: true },
        ]
      : [{ text: "tidak libur.", className: "text-slate-400 dark:text-on-surface-variant" }];

    if (prefersReducedMotion()) {
      if (todayRow) {
        elHeadline.innerHTML =
          'Hari ini <span class="text-primary">libur</span>.';
      } else {
        elHeadline.innerHTML =
          'Hari ini <span class="text-slate-400 dark:text-on-surface-variant">tidak libur.</span>';
      }
      elHeadline.setAttribute("data-headline-done", "1");
      elHeadline.removeAttribute("aria-busy");
      return;
    }

    whenEntersViewport(elHeadline, function () {
      if (gen !== heroContext.headlineTypingGen) return;
      typeHeadlineSegments(elHeadline, segments, {
        prefix: "Hari ini ",
        shouldAbort: function () {
          return gen !== heroContext.headlineTypingGen;
        },
        onComplete: function () {
          if (gen !== heroContext.headlineTypingGen) return;
          elHeadline.setAttribute("data-headline-done", "1");
        },
      });
    });
  }

  function setHeroPromoBarVisible(visible) {
    if (typeof document === "undefined" || !document.body) return;
    document.body.classList.toggle("hero-promo-visible", !!visible);
  }

  function renderMainCard() {
    const elDate = document.getElementById("hero-today-date");
    const elHeadline = document.getElementById("hero-today-headline");
    const elBody = document.getElementById("hero-today-body");
    const btnShareToday = document.getElementById("hero-share-today");
    const toastToday = document.getElementById("hero-share-today-toast");
    const banner = document.getElementById("hero-next-banner");
    const elSummary = document.getElementById("hero-next-banner-summary");
    const elSummarySr = document.getElementById("hero-next-banner-sr");
    const btnShareNext = document.getElementById("hero-share-next");
    const toastNext = document.getElementById("hero-share-next-toast");
    const prevNav = document.getElementById("hero-nav-prev");
    const nextNav = document.getElementById("hero-nav-next");
    const btnTerdekat = document.getElementById("hero-jump-terdekat");
    const calloutLnCb = document.getElementById("hero-next-ln-cb");
    const calloutLnCbValue = document.getElementById("hero-next-ln-cb-value");

    const byDate = heroContext.byDate;
    const sortedData = heroContext.sortedData;
    const t = todayISO();

    const todayRow = byDate && byDate.get ? byDate.get(t) || null : null;

    if (elDate) {
      elDate.setAttribute("datetime", t);
      elDate.textContent = formatLongID(t);
    }

    if (!sortedData || !sortedData.length) {
      if (elHeadline) {
        elHeadline.innerHTML =
          'Data <span class="text-slate-400 dark:text-on-surface-variant">belum</span> tersedia';
      }
      if (elBody) {
        elBody.innerHTML =
          '<p class="text-on-surface-variant">Tidak ada data libur untuk ditampilkan.</p>';
      }
      if (calloutLnCb) calloutLnCb.classList.add("hidden");
      if (calloutLnCbValue) calloutLnCbValue.textContent = "";
      if (banner) banner.classList.add("hidden");
      setHeroPromoBarVisible(false);
      if (btnShareToday) {
        btnShareToday.innerHTML = shareIconSvg() + "<span>Bagikan</span>";
        btnShareToday.onclick = function () {
          runShare(
            buildShareTodayText(t, null, byDate, null),
            toastToday,
            "status_today"
          );
        };
      }
      return;
    }

    if (banner) banner.classList.remove("hidden");
    setHeroPromoBarVisible(true);

    scheduleHeroTodayHeadline(elHeadline, todayRow, t);
    setTodayBody(elBody, todayRow, byDate);

    if (calloutLnCb && calloutLnCbValue) {
      const nextLnCb = nextLiburNasionalCutiRow(sortedData, t);
      if (nextLnCb) {
        const n = diffDays(t, nextLnCb.date);
        const when = daysUntilPhrase(n);
        const typeLabel =
          nextLnCb.type === "Cuti Bersama" ? "cuti bersama" : "libur nasional";
        calloutLnCbValue.textContent =
          when +
          " — " +
          nextLnCb.description +
          " (" +
          typeLabel +
          ")";
        calloutLnCb.classList.remove("hidden");
      } else {
        calloutLnCbValue.textContent = "";
        calloutLnCb.classList.add("hidden");
      }
    }

    if (btnShareToday) {
      btnShareToday.innerHTML = shareIconSvg() + "<span>Bagikan</span>";
      btnShareToday.onclick = function () {
        runShare(
          buildShareTodayText(t, todayRow, byDate, sortedData),
          toastToday,
          "status_today"
        );
      };
    }

    const idxStrictFuture = indexFirstStrictlyAfterToday(sortedData, t);
    const minSelectable =
      idxStrictFuture >= 0 ? idxStrictFuture : sortedData.length - 1;
    heroContext.minSelectableIndex = minSelectable;

    const idxNasCuti = indexFirstFutureNasionalCuti(sortedData, t);
    if (heroContext.selectedIndex === null) {
      heroContext.selectedIndex =
        idxStrictFuture >= 0 ? idxStrictFuture : sortedData.length - 1;
    }
    let idx = heroContext.selectedIndex;
    idx = Math.max(
      minSelectable,
      Math.min(sortedData.length - 1, idx)
    );
    heroContext.selectedIndex = idx;

    const selectedRow = sortedData[idx];
    const atMin = idx <= minSelectable;
    const atMax = idx === sortedData.length - 1;
    const bannerDimmed = selectedRow.date < t;

    let nextSectionTitle;
    if (selectedRow.date > t) {
      nextSectionTitle = "Libur berikutnya";
    } else if (selectedRow.date < t) {
      nextSectionTitle = "Libur sebelumnya";
    } else {
      nextSectionTitle = "Libur pada hari ini";
    }

    if (banner) {
      banner.classList.toggle("opacity-60", bannerDimmed);
    }

    const sum = heroBannerSummaryLines(t, selectedRow, byDate);
    if (elSummary) {
      elSummary.innerHTML = sum.visualHtml;
      elSummary.setAttribute("title", sum.full);
      const scrollHost = elSummary.closest(".hero-promo-summary-scroll");
      if (scrollHost) {
        scrollHost.scrollLeft = 0;
      }
    }
    if (elSummarySr) {
      elSummarySr.textContent = sum.full;
    }

    if (btnShareNext) {
      btnShareNext.onclick = function () {
        runShare(
          buildShareSelectedText(t, selectedRow, byDate),
          toastNext,
          "promo_strip"
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

    if (btnTerdekat) {
      const nasCutiInvalid =
        idxNasCuti >= 0 && idxNasCuti < minSelectable;
      const noTarget = idxNasCuti < 0 || nasCutiInvalid;
      const alreadyThere = !noTarget && idx === idxNasCuti;
      btnTerdekat.disabled = noTarget || alreadyThere;
      btnTerdekat.setAttribute(
        "aria-disabled",
        btnTerdekat.disabled ? "true" : "false"
      );
      btnTerdekat.onclick = function () {
        if (btnTerdekat.disabled) return;
        heroContext.selectedIndex = idxNasCuti;
        renderMainCard();
      };
    }

    const heroNextNav = document.getElementById("hero-next-nav");
    if (heroNextNav) {
      heroNextNav.setAttribute("aria-label", nextSectionTitle);
    }
  }

  function isCalMobile() {
    return typeof window.matchMedia !== "undefined" &&
      window.matchMedia(CAL_MOBILE_MQ).matches;
  }

  function calCellClasses(type) {
    if (type === "Libur Nasional") {
      return "bg-primary-fixed text-on-primary-fixed font-bold cursor-pointer dark:bg-primary dark:text-on-primary";
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

  /** Fixed popover aligned to a reference (bottom-centered, flip, viewport clamp) — replaces @popperjs/core for #cal-popover. */
  function createCalPopoverPositioner(refEl, popoverEl) {
    const padding = 8;
    const offsetMain = 8;

    function update() {
      if (!refEl || !popoverEl.isConnected) return;
      const ref = refEl.getBoundingClientRect();
      const pop = popoverEl.getBoundingClientRect();
      const popW = pop.width;
      const popH = pop.height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = ref.left + ref.width / 2 - popW / 2;
      const spaceBelow = vh - padding - ref.bottom - offsetMain;
      const spaceAbove = ref.top - padding - offsetMain;
      const fitsBelow = popH <= spaceBelow;
      const fitsAbove = popH <= spaceAbove;
      let placeBottom = true;
      if (fitsBelow && !fitsAbove) {
        placeBottom = true;
      } else if (!fitsBelow && fitsAbove) {
        placeBottom = false;
      } else if (fitsBelow && fitsAbove) {
        placeBottom = true;
      } else {
        placeBottom = spaceBelow >= spaceAbove;
      }

      let top = placeBottom
        ? ref.bottom + offsetMain
        : ref.top - offsetMain - popH;

      left = Math.max(padding, Math.min(left, vw - padding - popW));
      top = Math.max(padding, Math.min(top, vh - padding - popH));

      popoverEl.style.top = Math.round(top) + "px";
      popoverEl.style.left = Math.round(left) + "px";
      popoverEl.style.transform = "";
    }

    function onScrollOrResize() {
      update();
    }

    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return {
      update: update,
      destroy: function () {
        window.removeEventListener("scroll", onScrollOrResize, true);
        window.removeEventListener("resize", onScrollOrResize);
      },
    };
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

    popoverEl.style.top = "";
    popoverEl.style.left = "";
    popoverEl.style.transform = "";

    if (refEl) {
      calPopperInstance = createCalPopoverPositioner(refEl, popoverEl);
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
    h.className = "font-bold text-lg mb-4 text-on-surface hidden sm:flex ";
    h.textContent = MONTHS[month] + " " + year;
    wrap.appendChild(h);

    const dow = document.createElement("div");
    dow.className =
      "grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 dark:text-on-surface-variant mb-2 uppercase";
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
        runShare(text, toast, "calendar_popover");
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

    const content = document.getElementById("hero-content");
    const cutiSection = document.getElementById("cuti-optimizer-section");
    const topSplit = document.getElementById("home-top-split");
    const calState = document.getElementById("calendar-state");
    const calLoaded = document.getElementById("calendar-loaded");

    if (content) content.classList.remove("hidden");
    if (cutiSection) cutiSection.classList.remove("hidden");
    if (topSplit) topSplit.setAttribute("aria-busy", "false");
    if (calState) calState.classList.add("hidden");
    if (calLoaded) calLoaded.classList.remove("hidden");

    renderMainCard();

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

    document.dispatchEvent(
      new CustomEvent("kapanlibur:holidays-loaded", {
        detail: { byDate: byDate, sortedData: data },
      })
    );
  }

  function onDataError() {
    const content = document.getElementById("hero-content");
    const cutiSection = document.getElementById("cuti-optimizer-section");
    const banner = document.getElementById("hero-next-banner");
    const topSplit = document.getElementById("home-top-split");
    const calState = document.getElementById("calendar-state");
    const calLoaded = document.getElementById("calendar-loaded");

    if (banner) banner.classList.add("hidden");
    setHeroPromoBarVisible(false);
    if (content) content.classList.add("hidden");
    if (cutiSection) cutiSection.classList.add("hidden");
    if (topSplit) topSplit.setAttribute("aria-busy", "false");
    if (calState) calState.classList.add("hidden");
    if (calLoaded) calLoaded.classList.remove("hidden");

    showLiburMendatangError();

    const calEl = document.getElementById("calendar");
    if (calEl) {
      calEl.innerHTML =
        '<p class="text-on-surface-variant text-sm col-span-full">Tidak bisa memuat kalender. Muat ulang halaman atau buka <a class="text-primary font-semibold hover:underline" href="/hari-libur-nasional-2026.html">daftar lengkap</a>.</p>';
    }
  }

  (function attachAsidePromoAnalytics() {
    const a = document.getElementById("home-aside-promo-cta");
    if (!a) return;
    a.addEventListener("click", function () {
      if (window.kapanliburGa && window.kapanliburGa.track) {
        window.kapanliburGa.track("promo_card_click", {
          link_url: a.href,
        });
      }
    });
  })();

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
