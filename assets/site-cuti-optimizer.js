(function () {
  "use strict";

  /**
   * Perencana cuti (hitung libur maksimal) — ranked multi-option engine (pure core + DOM).
   *
   * Urutan sort (lexikografis):
   *   1) Span kalender [L,R] terbesar
   *   2) Seri sama span: placementSort 5 (akhir pekan murni) kalah dari 3–4
   *   3) Mulai lebih dekat dari hari ini
   *   4) placementSort lebih kecil
   *   5) L
   *
   * Top opsi: dedupe by chainSignature (hari off di [L,R] selain cuti); non-weekend dulu,
   *   placement 5 (weekend-only) di akhir antrian.
   */

  const MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];

  const DEFAULT_HORIZON = 180;
  const DEFAULT_MAX_WIDTH = 50;
  const LN_CB_FORWARD_STEPS = 24;
  const LN_CB_BACKWARD_STEPS = 24;
  const TOP_N = 5;

  /**
   * Rekomendasi trip per durasi — mudah diubah (link afiliasi per destinasi).
   * trip_type: international (7+ hari), asean (5–6), domestic (≤4).
   */
  const TRIP_CONFIG = {
    international: {
      minDays: 7,
      label: "Internasional",
      destinations: [
        {
          name: "Jepang",
          code: "TYO",
          affiliateLink: "",
          highlights: [
            {
              destination: "Tokyo",
              description: "Pusat belanja, kuliner, dan city vibe modern Jepang.",
              affiliateLink: "",
            },
            {
              destination: "Kyoto",
              description: "Kota budaya Jepang dengan kuil klasik dan taman indah.",
              affiliateLink: "",
            },
            {
              destination: "Osaka",
              description: "Surga street food dan akses cepat ke kawasan Kansai.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Korea Selatan",
          code: "ICN",
          affiliateLink: "",
          highlights: [
            {
              destination: "Seoul",
              description: "Kota metropolitan dengan belanja, kuliner, dan nightlife.",
              affiliateLink: "",
            },
            {
              destination: "Busan",
              description: "Pantai populer, seafood segar, dan suasana kota pelabuhan.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Australia",
          code: "SYD",
          affiliateLink: "",
          highlights: [
            {
              destination: "Sydney",
              description: "Ikon Opera House, harbour, dan city walk yang ikonik.",
              affiliateLink: "",
            },
            {
              destination: "Melbourne",
              description: "Kota artsy dengan kafe, galeri, dan street art.",
              affiliateLink: "",
            },
          ],
        },
      ],
    },
    asean: {
      minDays: 5,
      label: "ASEAN",
      destinations: [
        {
          name: "Singapura",
          code: "SIN",
          affiliateLink: "",
          highlights: [
            {
              destination: "Singapura",
              description: "City break cepat dengan kuliner dan belanja kelas dunia.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Thailand",
          code: "BKK",
          affiliateLink: "",
          highlights: [
            {
              destination: "Bangkok",
              description: "Surga street food, night market, dan pusat belanja.",
              affiliateLink: "",
            },
            {
              destination: "Phuket",
              description: "Pantai tropis dan island hopping favorit di Thailand.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Vietnam",
          code: "SGN",
          affiliateLink: "",
          highlights: [
            {
              destination: "Ho Chi Minh",
              description: "Kota sejarah dengan kuliner Vietnam yang autentik.",
              affiliateLink: "",
            },
            {
              destination: "Da Nang",
              description: "Pantai cantik dan akses mudah ke Hoi An.",
              affiliateLink: "",
            },
          ],
        },
      ],
    },
    domestic: {
      minDays: 0,
      label: "Domestik",
      destinations: [
        {
          name: "Bali",
          code: "DPS",
          affiliateLink: "",
          highlights: [
            {
              destination: "Denpasar",
              description: "Akses utama ke area pantai dan pusat kuliner Bali.",
              affiliateLink: "",
            },
            {
              destination: "Ubud",
              description: "Nuansa alam, budaya, dan retreat yang menenangkan.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Yogyakarta",
          code: "JOG",
          affiliateLink: "",
          highlights: [
            {
              destination: "Yogyakarta",
              description: "Kota budaya dengan kuliner khas dan suasana santai.",
              affiliateLink: "",
            },
            {
              destination: "Borobudur",
              description: "Wisata sejarah dengan sunrise dan panorama ikonik.",
              affiliateLink: "",
            },
          ],
        },
        {
          name: "Labuan Bajo",
          code: "LBJ",
          affiliateLink: "",
          highlights: [
            {
              destination: "Labuan Bajo",
              description: "Gerbang ke Pulau Komodo dan island hopping eksotis.",
              affiliateLink: "",
            },
            {
              destination: "Komodo",
              description: "Eksplorasi taman nasional dan laut yang jernih.",
              affiliateLink: "",
            },
          ],
        },
      ],
    },
  };

  /** Fallback jika affiliateLink destinasi masih kosong */
  const DEFAULT_TRIP_AFFILIATE_HREF = "https://atid.me/00nu87002p98";

  /** @type {Map<string, object>|null} */
  let byDateMap = null;

  /** Durasi rentang libur (hari kalender) → ide aktivitas (placeholder; bisa diganti nanti). */
  const ACTIVITY_BY_SPAN = [
    {
      maxSpan: 2,
      text:
        "Cocok untuk istirahat singkat di kota: kafe, bioskop, atau main ke taman terdekat.",
      promoHref: "https://atid.me/00nu87002p98",
    },
    {
      maxSpan: 4,
      text:
        "Cukup untuk road trip dekat atau mengunjungi satu destinasi wisata regional.",
      promoHref: "https://atid.me/00nu87002p98",
    },
    {
      maxSpan: 5,
      text:
        "Anda bisa rencanakan liburan 4–5 hari: pantai, pegunungan, atau city break.",
      promoHref: "https://atid.me/00nu87002p98",
    },
    {
      maxSpan: Infinity,
      text:
        "Waktu panjang — pertimbangkan liburan luar kota, keluarga besar, atau trip antar pulau.",
      promoHref: "https://atid.me/00nu87002p98",
    },
  ];

  function sanitizePromoHref(href) {
    if (href == null || typeof href !== "string") return "";
    const t = href.trim();
    if (/^https:\/\//i.test(t)) return t;
    if (/^http:\/\//i.test(t)) return t;
    return "";
  }

  function promoHrefForSpan(span) {
    for (let i = 0; i < ACTIVITY_BY_SPAN.length; i++) {
      if (span <= ACTIVITY_BY_SPAN[i].maxSpan) {
        return sanitizePromoHref(ACTIVITY_BY_SPAN[i].promoHref);
      }
    }
    return sanitizePromoHref(
      ACTIVITY_BY_SPAN[ACTIVITY_BY_SPAN.length - 1].promoHref
    );
  }

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
    return toISOFromDate(new Date());
  }

  function diffCalendarDays(fromISO, toISO) {
    const a = parseISODate(fromISO);
    const b = parseISODate(toISO);
    return Math.round((b - a) / 86400000);
  }

  function isOff(iso, byDate) {
    const d = parseISODate(iso);
    const w = d.getDay();
    if (w === 0 || w === 6) return true;
    return byDate.has(iso);
  }

  function isLnCb(iso, byDate) {
    const row = byDate.get(iso);
    if (!row || !row.type) return false;
    return (
      row.type === "Libur Nasional" || row.type === "Cuti Bersama"
    );
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

  /** Tanggal ringkas untuk daftar harian (tanpa tahun jika tidak perlu). */
  function formatDayMonth(iso) {
    const d = parseISODate(iso);
    return d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
  }

  /**
   * Label bulan untuk sudut kanan atas kartu (satu bulan atau rentang).
   * @returns {string}
   */
  function rangeMonthBadge(L, R) {
    const a = parseISODate(L);
    const b = parseISODate(R);
    const yA = a.getFullYear();
    const yB = b.getFullYear();
    const mA = a.getMonth();
    const mB = b.getMonth();
    if (yA === yB && mA === mB) {
      return MONTHS_SHORT[mA] + " " + yA;
    }
    if (yA === yB) {
      return MONTHS_SHORT[mA] + "–" + MONTHS_SHORT[mB] + " " + yA;
    }
    return MONTHS_SHORT[mA] + " " + yA + " – " + MONTHS_SHORT[mB] + " " + yB;
  }

  function forEachDayInRange(L, R, fn) {
    let cur = L;
    while (true) {
      fn(cur);
      if (cur === R) break;
      cur = addDaysISO(cur, 1);
    }
  }

  /** @param {number} span */
  function tripTypeKeyForSpan(span) {
    if (span >= 7) return "international";
    if (span >= 5) return "asean";
    return "domestic";
  }

  /**
   * Distribusi 3 kartu berdasarkan durasi libur.
   * - 7+ hari: 1 internasional, 1 ASEAN, 1 domestik
   * - 5–6 hari: 1 ASEAN, 2 domestik
   * - ≤4 hari: 3 domestik
   * @param {number} span
   */
  function getCardDistribution(span) {
    if (span >= 7) {
      return [
        { tier: "international", index: 0 },
        { tier: "asean", index: 0 },
        { tier: "domestic", index: 0 },
      ];
    }
    if (span >= 5) {
      return [
        { tier: "asean", index: 0 },
        { tier: "domestic", index: 0 },
        { tier: "domestic", index: 1 },
      ];
    }
    return [
      { tier: "domestic", index: 0 },
      { tier: "domestic", index: 1 },
      { tier: "domestic", index: 2 },
    ];
  }

  /** Rentang tanggal singkat untuk label CTA (contoh: 26 Mei – 1 Jun 2026). */
  function formatCtaDateRange(L, R) {
    const a = parseISODate(L);
    const b = parseISODate(R);
    const yA = a.getFullYear();
    const yB = b.getFullYear();
    const partA =
      a.getDate() +
      " " +
      MONTHS_SHORT[a.getMonth()] +
      (yA === yB ? "" : " " + yA);
    const partB =
      b.getDate() + " " + MONTHS_SHORT[b.getMonth()] + " " + yB;
    return partA + " – " + partB;
  }

  /**
   * Insight singkat berbasis kalender resmi + pola booking Indonesia.
   * @param {string} L
   * @param {string} R
   * @param {Map<string, object>} byDate
   * @returns {string}
   */
  function generateUrgencyInsight(L, R, byDate) {
    if (!byDate || !byDate.get) {
      return (
        "Semakin dekat tanggal berangkat, harga tiket ke rute favorit biasanya naik 10–30%. " +
        "Cek sekarang lebih aman."
      );
    }
    const hits = {
      idulFitri: false,
      idulAdha: false,
      natalAkhirTahun: false,
      imlek: false,
      waisak: false,
      longWeekendLnCb: 0,
    };
    forEachDayInRange(L, R, function (iso) {
      const row = byDate.get(iso);
      if (!row) return;
      const desc = String(row.description || "").toLowerCase();
      const type = row.type || "";
      if (type !== "Libur Nasional" && type !== "Cuti Bersama") return;
      if (/idul fitri|lebaran/.test(desc)) hits.idulFitri = true;
      if (/idul adha/.test(desc)) hits.idulAdha = true;
      if (/imlek|kongzili/.test(desc)) hits.imlek = true;
      if (/waisak/.test(desc)) hits.waisak = true;
      if (/natal|kelahiran yesus|tahun baru masehi/.test(desc)) {
        hits.natalAkhirTahun = true;
      }
      if (row.is_long_weekend) hits.longWeekendLnCb++;
    });

    const today = todayISO();
    const daysOut = diffCalendarDays(today, L);
    const parts = [];

    if (hits.idulFitri) {
      parts.push(
        "Periode ini overlap momentum Lebaran: permintaan tiket & hotel biasanya puncak, harga sering melonjak 30%+ mendekati tanggal ini."
      );
    } else if (hits.idulAdha && hits.waisak) {
      parts.push(
        "Jendela ini berdekatan dengan Idul Adha + Waisak — klasifikasi high season domestik & Asia; slot habis lebih cepat."
      );
    } else if (hits.idulAdha) {
      parts.push(
        "Sekitar Idul Adha termasuk puncak permintaan tiket domestik & regional; harga naik 10–30% tipikal menjelang H-14."
      );
    } else if (hits.imlek) {
      parts.push(
        "High season Imlek: rute Asia Timur/Tenggara sering penuh lebih awal; harga tiket cenderung naik tiap minggu."
      );
    } else if (hits.natalAkhirTahun) {
      parts.push(
        "Musim Natal & pergantian tahun: booking puncak biasanya H-21; harga tiket internasional/domestik sering naik signifikan."
      );
    } else if (hits.waisak) {
      parts.push(
        "Long weekend Waisak + libur sekitarnya: pola klasik penumpukan permintaan tiket dalam negeri."
      );
    } else if (hits.longWeekendLnCb >= 2) {
      parts.push(
        "Rangkaian long weekend + LN/CB: banyak yang ambil cuti serupa, tekanan harga tiket biasanya naik mendekati tanggal ini."
      );
    }

    if (daysOut >= 0 && daysOut <= 21 && parts.length < 2) {
      parts.push(
        "Keberangkatan dalam " +
          daysOut +
          " hari — untuk rute favorit, harga tiket sering naik 10–30% dibanding beberapa minggu lalu."
      );
    } else if (daysOut > 21 && daysOut <= 60 && parts.length === 0) {
      parts.push(
        "Masih ada waktu, tapi pola umum: pembelian tiket menguat H-21 ke H-7 untuk tanggal libur panjang."
      );
    }

    if (parts.length === 0) {
      return (
        "Di luar puncak besar, harga tetap cenderung naik mendekati tanggal terbang — cek lebih awal biasanya lebih tenang."
      );
    }
    return parts.slice(0, 2).join(" ");
  }

  /**
   * @param {number} span
   * @param {string} L
   * @param {string} R
   * @param {string} tripKey
   * @param {Map<string, object>} byDate
   */
  function generateReasoning(span, L, R, tripKey, byDate) {
    const start = parseISODate(L);
    const m = start.getMonth();
    let musim = "";
    if (m >= 5 && m <= 7) {
      musim = "Bertepatan musim liburan sekolah domestik — booking lebih ramai.";
    } else if (m === 11 || m === 0) {
      musim = "Dekat akhir tahun — permintaan tiket biasanya lebih tinggi.";
    }
    const overlapLnCb = [];
    if (byDate && byDate.get) {
      forEachDayInRange(L, R, function (iso) {
        const row = byDate.get(iso);
        if (!row) return;
        const t = row.type || "";
        if (t === "Libur Nasional" || t === "Cuti Bersama") {
          const d = row.description || "";
          if (d && overlapLnCb.indexOf(d) === -1) overlapLnCb.push(d);
        }
      });
    }
    const timing =
      overlapLnCb.length > 0
        ? " Waktu ini memanfaatkan " +
          overlapLnCb.slice(0, 2).join(" & ") +
          " di kalender resmi."
        : "";

    if (tripKey === "international") {
      return (
        span +
        " hari kalender pas untuk rute internasional (buffer jet lag + eksplor). " +
        (musim ? musim + " " : "") +
        timing.trim()
      ).trim();
    }
    if (tripKey === "asean") {
      return (
        span +
        " hari nyaman untuk short-haul ASEAN tanpa membuang banyak hari di jalan. " +
        (musim ? musim + " " : "") +
        timing.trim()
      ).trim();
    }
    return (
      span +
      " hari ideal untuk domestik: hemat waktu tempuh, cocok long weekend yang sudah dirangkai. " +
      (musim ? musim + " " : "") +
      timing.trim()
    ).trim();
  }

  /**
   * Payload JSON terstruktur (primary, secondary, urgency, cta).
   * @param {object} opt enriched option (L, R, span, leaveDates, …)
   * @param {Map<string, object>} byDate
   */
  function buildTripPlanJson(opt, byDate) {
    const span = opt.span;
    const tripKey = tripTypeKeyForSpan(span);
    const tier = TRIP_CONFIG[tripKey];
    const dests = tier.destinations;
    const primaryDest = dests[0];
    const primaryHighlights = primaryDest.highlights
      ? primaryDest.highlights.slice(0, 3)
      : [
          {
            destination: primaryDest.name,
            description: "",
            affiliateLink: primaryDest.affiliateLink,
          },
        ];
    const reasoning = generateReasoning(span, opt.L, opt.R, tripKey, byDate);
    const urgency = generateUrgencyInsight(opt.L, opt.R, byDate);
    const dateLabel = formatCtaDateRange(opt.L, opt.R);

    const secondary = dests.slice(1, 3).map(function (d) {
      const subHighlights = d.highlights
        ? d.highlights.slice(0, 3)
        : [
            {
              destination: d.name,
              description: "",
              affiliateLink: d.affiliateLink,
            },
          ];
      return {
        title: span + " hari",
        trip_type: tripKey,
        highlights: subHighlights,
        destination: d.name,
        reasoning:
          "Alternatif durasi sama — jarak terbang lebih pendek atau pola harga berbeda dari rekomendasi utama.",
      };
    });

    return {
      primary: {
        title: span + " hari",
        trip_type: tripKey,
        highlights: primaryHighlights,
        destination: primaryDest.name,
        reasoning: reasoning,
        label: "Rekomendasi terbaik",
      },
      secondary: secondary,
      urgency: urgency,
      cta_primary: {
        label:
          "Cek tiket Jakarta → " +
          primaryDest.name +
          " (" +
          dateLabel +
          ")",
        params: {
          origin: "CGK",
          destination: primaryDest.code,
          depart_date: opt.L,
          return_date: opt.R,
        },
        affiliate_link:
          sanitizePromoHref(primaryDest.affiliateLink) ||
          DEFAULT_TRIP_AFFILIATE_HREF,
      },
      cta_secondary: {
        label: "Lihat alternatif destinasi",
      },
    };
  }

  function primaryCtaHref(plan) {
    const h = plan && plan.cta_primary && plan.cta_primary.affiliate_link;
    return sanitizePromoHref(h) || DEFAULT_TRIP_AFFILIATE_HREF;
  }

  /**
   * Teks libur per tanggal untuk ditampilkan ke pengguna (bukan penjelasan peringkat).
   */
  function offDayUserLabel(iso, leaveSet, byDate) {
    if (leaveSet.has(iso)) return "Hari cuti Anda";
    const row = byDate.get(iso);
    if (row && row.description) return row.description;
    const wd = parseISODate(iso).getDay();
    if (wd === 0) return "Minggu";
    if (wd === 6) return "Sabtu";
    return "Libur";
  }

  /**
   * Satu baris per hari di rentang [L,R] (untuk UI + teks bagikan).
   * @returns {{ dayPart: string, detailPart: string, isLeave: boolean }[]}
   */
  function buildScheduleLines(L, R, leaveDates, byDate) {
    const leaveSet = new Set(leaveDates);
    const lines = [];
    let cur = L;
    while (true) {
      lines.push({
        dayPart: formatDayMonth(cur),
        detailPart: offDayUserLabel(cur, leaveSet, byDate),
        isLeave: leaveSet.has(cur),
      });
      if (cur === R) break;
      cur = addDaysISO(cur, 1);
    }
    return lines;
  }

  function compareNearestFirst(a, b) {
    if (a.daysUntilStart !== b.daysUntilStart) {
      return a.daysUntilStart - b.daysUntilStart;
    }
    if (b.span !== a.span) return b.span - a.span;
    return a.L.localeCompare(b.L);
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

  /**
   * Dari hari cuti terakhir: jalan maju selama masih off sampai ketemu LN/CB atau hari kerja.
   */
  function touchesLnCbAfter(lastLeave, byDate) {
    let cur = addDaysISO(lastLeave, 1);
    for (let i = 0; i < LN_CB_FORWARD_STEPS; i++) {
      if (!isOff(cur, byDate)) return false;
      if (isLnCb(cur, byDate)) return true;
      cur = addDaysISO(cur, 1);
    }
    return false;
  }

  /**
   * Dari hari cuti pertama: jalan mundur selama off sampai ketemu LN/CB atau hari kerja.
   */
  function touchesLnCbBefore(firstLeave, byDate) {
    let cur = addDaysISO(firstLeave, -1);
    for (let i = 0; i < LN_CB_BACKWARD_STEPS; i++) {
      if (!isOff(cur, byDate)) return false;
      if (isLnCb(cur, byDate)) return true;
      cur = addDaysISO(cur, -1);
    }
    return false;
  }

  /**
   * placementSort: 3 = gap, 4 = rangkai LN/CB, 5 = akhir pekan (tie-break setelah span & jarak).
   * @returns {{ placementSort: number, tierKey: string, tierLabel: string }}
   */
  function classifyPlacement(L, R, leaveDates, byDate) {
    const prevOff = isOff(addDaysISO(L, -1), byDate);
    const nextOff = isOff(addDaysISO(R, 1), byDate);
    if (prevOff && nextOff) {
      return {
        placementSort: 3,
        tierKey: "gap",
        tierLabel: "Mengisi celah antar hari libur",
      };
    }
    if (!leaveDates.length) {
      return {
        placementSort: 5,
        tierKey: "weekend",
        tierLabel: "Merangkai dengan akhir pekan (Sabtu–Minggu)",
      };
    }
    const first = leaveDates[0];
    const last = leaveDates[leaveDates.length - 1];
    const runUp = touchesLnCbAfter(last, byDate);
    const runOut = touchesLnCbBefore(first, byDate);
    if (runUp || runOut) {
      return {
        placementSort: 4,
        tierKey: "before_ln_cb",
        tierLabel:
          "Merangkai cuti sebelum/sesudah libur nasional atau cuti bersama",
      };
    }
    return {
      placementSort: 5,
      tierKey: "weekend",
      tierLabel: "Merangkai dengan akhir pekan (Sabtu–Minggu)",
    };
  }

  function activityRecommendationForSpan(span) {
    for (let i = 0; i < ACTIVITY_BY_SPAN.length; i++) {
      if (span <= ACTIVITY_BY_SPAN[i].maxSpan) {
        return ACTIVITY_BY_SPAN[i].text;
      }
    }
    return ACTIVITY_BY_SPAN[ACTIVITY_BY_SPAN.length - 1].text;
  }

  function buildReasons(placement, span, daysUntilStart, leaveCount) {
    const reasons = [];
    reasons.push(
      "Prioritas 1 — lama rangkaian libur: " +
        span +
        " hari kalender berturut-turut (memakai " +
        leaveCount +
        " hari cuti)."
    );
    reasons.push(
      "Prioritas 2 — bila span sama: opsi yang bukan pola akhir pekan murni (bukan nilai 5) diutamakan daripada yang dominan akhir pekan."
    );
    if (daysUntilStart === 0) {
      reasons.push("Prioritas 3 — mulai dari hari ini (lebih dekat diutamakan).");
    } else if (daysUntilStart === 1) {
      reasons.push("Prioritas 3 — mulai besok (lebih dekat diutamakan).");
    } else {
      reasons.push(
        "Prioritas 3 — mulai dalam " +
          daysUntilStart +
          " hari dari hari ini (lebih dekat diutamakan)."
      );
    }
    reasons.push(
      "Prioritas 4 — jenis rangkaian: " +
        placement.tierLabel +
        " (3=celah libur, 4=rangkai LN/CB, 5=akhir pekan; opsi ini: " +
        placement.placementSort +
        ")."
    );
    return reasons;
  }

  /**
   * Hari off di [L,R] yang bukan hari cuti — dedupe antar opsi (substrat rantai).
   */
  function chainSignature(w, byDate) {
    const leaveSet = new Set(w.leaveDates);
    const parts = [];
    let cur = w.L;
    while (true) {
      if (isOff(cur, byDate) && !leaveSet.has(cur)) parts.push(cur);
      if (cur === w.R) break;
      cur = addDaysISO(cur, 1);
    }
    return parts.sort().join("|");
  }

  /**
   * Span besar → non-weekend-only jika seri → dekat → placement → L.
   */
  function compareWindows(a, b, today, byDate) {
    if (b.span !== a.span) return b.span - a.span;
    const sa = classifyPlacement(a.L, a.R, a.leaveDates, byDate).placementSort;
    const sb = classifyPlacement(b.L, b.R, b.leaveDates, byDate).placementSort;
    const wa = sa === 5 ? 1 : 0;
    const wb = sb === 5 ? 1 : 0;
    if (wa !== wb) return wa - wb;
    const da = diffCalendarDays(today, a.L);
    const db = diffCalendarDays(today, b.L);
    if (da !== db) return da - db;
    if (sa !== sb) return sa - sb;
    return a.L.localeCompare(b.L);
  }

  /**
   * @param {string} today
   * @param {number} N
   * @param {Map<string, object>} byDate
   * @param {{ horizon?: number, maxWidth?: number }} [opts]
   * @returns {{ L: string, R: string, span: number, leaveDates: string[] }[]}
   */
  function enumerateLeaveWindows(today, N, byDate, opts) {
    const horizon = (opts && opts.horizon) || DEFAULT_HORIZON;
    const maxWidth = (opts && opts.maxWidth) || DEFAULT_MAX_WIDTH;
    const seen = new Set();
    const out = [];
    for (let i = 0; i <= horizon; i++) {
      const L = addDaysISO(today, i);
      for (let w = 0; w <= maxWidth; w++) {
        const R = addDaysISO(L, w);
        const cnt = countLeaveInRange(L, R, byDate);
        if (cnt > N) break;
        if (cnt === N) {
          const key = L + "|" + R;
          if (seen.has(key)) continue;
          seen.add(key);
          const leaveDates = collectLeaveDates(L, R, byDate);
          out.push({
            L: L,
            R: R,
            span: w + 1,
            leaveDates: leaveDates,
          });
        }
      }
    }
    return out;
  }

  function leaveDatesKey(leaveDates) {
    if (!leaveDates.length) return "";
    return leaveDates.slice().sort().join("|");
  }

  /**
   * Dari dua jendela raw dengan cuti sama, pilih yang menang urutan global.
   */
  function pickBetterRawWindow(a, b, today, byDate) {
    const c = compareWindows(a, b, today, byDate);
    return c <= 0 ? a : b;
  }

  /**
   * Satu opsi per kombinasi tanggal cuti unik (urutan ISO disortir untuk kunci).
   */
  function collapseUniqueLeaveWindows(raw, today, byDate) {
    const map = new Map();
    for (let i = 0; i < raw.length; i++) {
      const w = raw[i];
      const key = leaveDatesKey(w.leaveDates);
      if (!map.has(key)) {
        map.set(key, w);
      } else {
        map.set(key, pickBetterRawWindow(w, map.get(key), today, byDate));
      }
    }
    const out = [];
    map.forEach(function (v) {
      out.push(v);
    });
    return out;
  }

  /**
   * Top-N dengan signature rantai unik; placement 5 (weekend-only) di akhir antrian.
   */
  function pickTopUniqueChains(collapsed, topN, today, byDate) {
    const sorted = collapsed.slice().sort(function (a, b) {
      return compareWindows(a, b, today, byDate);
    });
    const nonWeekend = [];
    const weekendOnly = [];
    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      const pl = classifyPlacement(w.L, w.R, w.leaveDates, byDate).placementSort;
      if (pl === 5) weekendOnly.push(w);
      else nonWeekend.push(w);
    }
    const ordered = nonWeekend.concat(weekendOnly);
    const seenSig = new Set();
    const picked = [];
    for (let i = 0; i < ordered.length && picked.length < topN; i++) {
      const w = ordered[i];
      let sig = chainSignature(w, byDate);
      if (sig === "") sig = "leave:" + leaveDatesKey(w.leaveDates);
      if (seenSig.has(sig)) continue;
      seenSig.add(sig);
      picked.push(w);
    }
    return picked;
  }

  /**
   * @param {string} today
   * @param {number} N
   * @param {Map<string, object>} byDate
   * @param {{ horizon?: number, maxWidth?: number, topN?: number }} [opts]
   */
  function rankLeaveOptions(today, N, byDate, opts) {
    const raw = enumerateLeaveWindows(today, N, byDate, opts);
    const collapsed = collapseUniqueLeaveWindows(raw, today, byDate);
    const topN = (opts && opts.topN) || TOP_N;
    collapsed.sort(function (a, b) {
      return compareWindows(a, b, today, byDate);
    });
    const topRaw = pickTopUniqueChains(collapsed, topN, today, byDate);

    function enrich(w) {
      const placement = classifyPlacement(
        w.L,
        w.R,
        w.leaveDates,
        byDate
      );
      const daysUntilStart = diffCalendarDays(today, w.L);
      const reasons = buildReasons(
        placement,
        w.span,
        daysUntilStart,
        w.leaveDates.length
      );
      const activityHint = activityRecommendationForSpan(w.span);
      const promoHref = promoHrefForSpan(w.span);
      const scheduleLines = buildScheduleLines(
        w.L,
        w.R,
        w.leaveDates,
        byDate
      );
      return {
        L: w.L,
        R: w.R,
        span: w.span,
        leaveDates: w.leaveDates,
        placementSort: placement.placementSort,
        tier: placement.placementSort,
        tierKey: placement.tierKey,
        tierLabel: placement.tierLabel,
        daysUntilStart: daysUntilStart,
        reasons: reasons,
        activityHint: activityHint,
        promoHref: promoHref,
        rangeLabel: formatShort(w.L) + " – " + formatShort(w.R),
        leaveLabel: formatLeaveList(w.leaveDates),
        monthBadge: rangeMonthBadge(w.L, w.R),
        scheduleLines: scheduleLines,
      };
    }

    const ranked = collapsed.map(function (w) {
      return enrich(w);
    });
    return {
      allRanked: ranked,
      top: topRaw.map(enrich),
      _rawCount: raw.length,
      _uniqueCount: collapsed.length,
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Angka tebal untuk teks dibagikan (Unicode Mathematical Sans-Serif Bold Digit). */
  function shareBoldNumber(n) {
    const base = 0x1d7ec;
    return String(n).replace(/\d/g, function (d) {
      return String.fromCodePoint(base + parseInt(d, 10));
    });
  }

  /**
   * Teks untuk dibagikan (mirip isi kartu opsi).
   * @param {object} opt enriched option
   */
  function buildCutiOptionShareText(opt) {
    const leaveN = opt.leaveDates ? opt.leaveDates.length : 0;
    const lines = [];
    lines.push(
      "Dengan cuti " +
        leaveN +
        " hari kamu bisa dapet total libur " +
        shareBoldNumber(opt.span) +
        " hari."
    );
    lines.push("");
    lines.push("Tanggal cuti: " + opt.leaveLabel);
    lines.push("Rentang libur: " + opt.rangeLabel);
    lines.push("");
    lines.push("Rincian hari:");
    (opt.scheduleLines || []).forEach(function (row) {
      lines.push("• " + row.dayPart + ": " + row.detailPart);
    });
    lines.push("");
    lines.push("Ide aktivitas: " + opt.activityHint);
    const plan =
      byDateMap && byDateMap.get
        ? buildTripPlanJson(opt, byDateMap)
        : null;
    if (plan) {
      lines.push("");
      lines.push("Rencana trip (cuplikan):");
      lines.push("• " + plan.primary.title + " — " + plan.primary.label);
      lines.push("• " + plan.urgency);
      lines.push("• " + plan.cta_primary.label);
    }
    lines.push("");
    lines.push("Yuk rencanain liburanmu bareng kapanlibur.com!");
    return lines.join("\n");
  }

  function runCutiShare(text) {
    if (window.kapanliburGa && window.kapanliburGa.track) {
      window.kapanliburGa.track("bagikan_click", {
        placement: "cuti_option",
      });
    }
    const toast = document.getElementById("cuti-optimizer-share-toast");
    const url =
      typeof location !== "undefined" && location.href
        ? location.href
        : "https://kapanlibur.com";
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

  let cutiCarouselIndex = 0;
  let cutiCarouselCount = 0;
  /** @type {object[]} */
  let cutiShareTopSnapshot = [];
  /** @type {object[]|null} */
  let cutiLastTopRankOrder = null;
  let cutiSortNearestMode = false;
  let cutiCarouselSwipeBound = false;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let cutiReorderHideTimer = null;
  const CUTI_REORDER_HIDE_MS = 180;
  /** @type {null | (function (): void)} */
  let cutiRevealAnimCleanup = null;

  function cutiPrefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function triggerCutiResultsReveal() {
    const el = document.getElementById("cuti-optimizer-results");
    if (!el || cutiPrefersReducedMotion()) return;
    if (cutiRevealAnimCleanup) {
      cutiRevealAnimCleanup();
      cutiRevealAnimCleanup = null;
    }
    el.classList.remove("cuti-optimizer-results-reveal");
    void el.offsetWidth;
    function onCutiResultsRevealEnd(e) {
      if (e.target !== el) return;
      if (e.animationName !== "cutiResultsReveal") return;
      el.classList.remove("cuti-optimizer-results-reveal");
      el.removeEventListener("animationend", onCutiResultsRevealEnd);
      cutiRevealAnimCleanup = null;
    }
    cutiRevealAnimCleanup = function () {
      el.removeEventListener("animationend", onCutiResultsRevealEnd);
    };
    el.addEventListener("animationend", onCutiResultsRevealEnd);
    el.classList.add("cuti-optimizer-results-reveal");
  }

  /**
   * Ganti isi track setelah fade-out singkat, lalu fade-in (hindari flash saat ganti urutan).
   */
  function renderCutiTrackFromTopAnimatedReorder(topList) {
    const host = document.getElementById("cuti-optimizer-carousel-host");
    const results = document.getElementById("cuti-optimizer-results");
    if (
      !host ||
      !results ||
      results.classList.contains("hidden") ||
      cutiPrefersReducedMotion()
    ) {
      renderCutiTrackFromTop(topList);
      return;
    }
    if (cutiReorderHideTimer) {
      clearTimeout(cutiReorderHideTimer);
      cutiReorderHideTimer = null;
      host.classList.remove("is-cuti-reorder-hidden");
    }
    host.classList.add("is-cuti-reorder-hidden");
    cutiReorderHideTimer = window.setTimeout(function () {
      cutiReorderHideTimer = null;
      renderCutiTrackFromTop(topList);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          host.classList.remove("is-cuti-reorder-hidden");
        });
      });
    }, CUTI_REORDER_HIDE_MS);
  }

  function cutiCarouselSwipeActive() {
    const results = document.getElementById("cuti-optimizer-results");
    if (results && results.classList.contains("hidden")) return false;
    return cutiCarouselCount > 1;
  }

  /**
   * Geser horizontal pada viewport: kiri = opsi berikutnya, kanan = sebelumnya
   * (sama ambang & pola dengan libur mendatang di site-home-hero.js).
   */
  function attachCutiOptimizerSwipe(hostEl) {
    if (cutiCarouselSwipeBound) return;
    if (!hostEl) return;
    cutiCarouselSwipeBound = true;
    let startX = 0;
    let startY = 0;
    let ptrId = null;
    function trySwipe(endX, endY) {
      if (!cutiCarouselSwipeActive()) return;
      const dx = endX - startX;
      const dy = endY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) {
        if (cutiCarouselIndex < cutiCarouselCount - 1) {
          cutiCarouselIndex++;
          updateCutiCarouselUi();
        }
      } else {
        if (cutiCarouselIndex > 0) {
          cutiCarouselIndex--;
          updateCutiCarouselUi();
        }
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

  function syncCutiCarouselLayout() {
    const viewport = document.getElementById("cuti-optimizer-viewport");
    const track = document.getElementById("cuti-optimizer-track");
    if (!viewport || !track || cutiCarouselCount < 1) return;
    const W = viewport.clientWidth;
    if (W < 1) return;
    const slides = track.querySelectorAll(".cuti-optimizer-slide");
    for (let i = 0; i < slides.length; i++) {
      slides[i].style.flex = "0 0 " + W + "px";
      slides[i].style.width = W + "px";
    }
    track.style.transform =
      "translateX(" + -cutiCarouselIndex * W + "px)";
  }

  function updateCutiCarouselUi() {
    const label = document.getElementById("cuti-optimizer-slide-label");
    const prev = document.getElementById("cuti-optimizer-nav-prev");
    const next = document.getElementById("cuti-optimizer-nav-next");
    const toolbar = document.getElementById("cuti-optimizer-nav-toolbar");
    const prevGlobDisabled =
      cutiCarouselCount < 2 || cutiCarouselIndex <= 0;
    const nextGlobDisabled =
      cutiCarouselCount < 2 ||
      cutiCarouselIndex >= cutiCarouselCount - 1;
    if (toolbar) {
      toolbar.style.display = cutiCarouselCount > 1 ? "flex" : "none";
    }
    if (prev) {
      prev.disabled = prevGlobDisabled;
      prev.setAttribute("aria-disabled", prev.disabled ? "true" : "false");
    }
    if (next) {
      next.disabled = nextGlobDisabled;
      next.setAttribute("aria-disabled", next.disabled ? "true" : "false");
    }
    if (label) {
      label.textContent =
        cutiCarouselCount > 0
          ? "Opsi " + (cutiCarouselIndex + 1) + " dari " + cutiCarouselCount
          : "";
    }
    syncCutiCarouselLayout();
  }

  function renderOptionCard(rankIndex, opt, shareIndex) {
    const scheduleHtml = (opt.scheduleLines || [])
      .map(function (row) {
        const detailClass = row.isLeave
          ? "text-primary font-semibold"
          : "text-on-surface";
        return (
          "<li class=\"text-sm text-on-surface\"><span class=\"text-on-surface-variant tabular-nums\">" +
          escapeHtml(row.dayPart) +
          "</span>: <span class=\"" +
          detailClass +
          "\">" +
          escapeHtml(row.detailPart) +
          "</span></li>"
        );
      })
      .join("");
    const dateLabel = formatCtaDateRange(opt.L, opt.R);
    const cardDistribution = getCardDistribution(opt.span);
    const cardItems = cardDistribution
      .map(function (card, idx) {
        const tier = TRIP_CONFIG[card.tier];
        const destination =
          tier.destinations[card.index] || tier.destinations[0];
        const highlight =
          destination.highlights && destination.highlights.length
            ? destination.highlights[0]
            : {
                destination: destination.name,
                description: "",
                affiliateLink: destination.affiliateLink,
              };
        const href =
          sanitizePromoHref(highlight.affiliateLink) ||
          sanitizePromoHref(destination.affiliateLink) ||
          DEFAULT_TRIP_AFFILIATE_HREF;
        const isPrimary = idx === 0;
        const borderClass = isPrimary
          ? "border border-primary/60"
          : "border border-outline-variant/40";
        const hiddenClass = isPrimary ? "" : " hidden";
        const heading = isPrimary
          ? '<p class="text-xs font-bold uppercase tracking-wide text-primary">Bingung mau kemana?</p>'
          : "";
        return (
          '<a href="' +
          escapeHtml(href) +
          '" class="cuti-trip-card flex h-full flex-col rounded-xl ' +
          borderClass +
          " bg-surface-container-low/20 p-4 space-y-2 hover:bg-surface-variant/30 transition-colors" +
          hiddenClass +
          '" target="_blank" rel="sponsored noopener noreferrer" data-trip-card="' +
          (isPrimary ? "primary" : "secondary") +
          '" data-trip-tier="' +
          escapeHtml(card.tier) +
          '" data-trip-destination="' +
          escapeHtml(destination.name) +
          '">' +
          heading +
          '<p class="text-xs font-semibold text-on-surface-variant">' +
          escapeHtml(tier.label) +
          "</p>" +
          '<p class="text-base font-bold text-on-surface">' +
          escapeHtml("Liburan " + opt.span + " hari ke " + destination.name) +
          "</p>" +
          '<p class="text-sm text-on-surface-variant leading-relaxed">' +
          escapeHtml(highlight.description || "") +
          "</p>" +
          '<div class="mt-auto flex justify-end text-right pt-2">' +
          '<span class="text-sm font-semibold text-primary">' +
          escapeHtml("Cek tiket ke " + destination.name + " (" + dateLabel + ")") +
          "</span>" +
          "</div>" +
          "</a>"
        );
      })
      .join("");
    const marketingBlock =
      '<div class="space-y-3 border-t border-outline-variant/30 pt-3">' +
      '<div class="cuti-trip-cards space-y-3" data-cuti-opt-index="' +
      shareIndex +
      '" data-expanded="false">' +
      cardItems +
      "</div>" +
      '<button type="button" class="cuti-alt-cta text-sm font-semibold text-primary hover:underline" data-cuti-opt-index="' +
      shareIndex +
      '" aria-expanded="false">' +
      "Lihat anjuran liburan lainnya" +
      "</button>" +
      "</div>";
    const shareBtn =
      '<button type="button" class="cuti-option-share inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-outline-variant text-sm font-semibold text-primary hover:bg-surface-variant/40 transition-colors shrink-0" data-cuti-opt-index="' +
      shareIndex +
      '" aria-label="Bagikan opsi ini">' +
      '<span class="material-symbols-outlined text-base leading-none font-normal" aria-hidden="true">share</span>' +
      "<span>Bagikan</span>" +
      "</button>";
    const actionsFooter =
      '<div class="pt-3 border-t border-outline-variant/30 flex flex-col gap-3">' +
      '<div class="flex justify-end">' +
      shareBtn +
      "</div>" +
      "</div>";
    return (
      '<article class="relative rounded-lg border border-outline-variant/50 bg-surface/50 dark:bg-surface-container-low/40 p-4 pt-5 space-y-3 min-h-[12rem]">' +
      '<span class="absolute top-3 right-3 max-w-[55%] text-right text-xs font-bold text-on-surface-variant leading-tight">' +
      escapeHtml(opt.monthBadge || "") +
      "</span>" +
      '<div class="flex flex-wrap items-center gap-2 pr-16">' +
      '<span class="text-xs font-bold uppercase tracking-wide text-primary">Opsi ' +
      rankIndex +
      "</span>" +
      "</div>" +
      '<p class="text-sm text-on-surface"><span class="text-on-surface-variant">Tanggal cuti:</span> <strong class="text-primary">' +
      escapeHtml(opt.leaveLabel) +
      "</strong></p>" +
      '<p class="text-sm text-on-surface"><span class="text-on-surface-variant">Rentang libur:</span> <strong>' +
      escapeHtml(opt.rangeLabel) +
      "</strong></p>" +
      '<p class="text-lg font-bold text-primary">' +
      escapeHtml(String(opt.span)) +
      " hari libur</p>" +
      '<div><p class="text-[0.65rem] font-bold uppercase tracking-wide text-on-surface-variant mb-1">Rincian hari</p>' +
      '<ul class="list-disc list-inside space-y-1">' +
      scheduleHtml +
      "</ul></div>" +
      marketingBlock +
      actionsFooter +
      "</article>"
    );
  }

  function toggleTripCardsByIndex(idx) {
    const wrapper = document.querySelector(
      '.cuti-trip-cards[data-cuti-opt-index="' + idx + '"]'
    );
    if (!wrapper) return;
    const expanded = wrapper.getAttribute("data-expanded") === "true";
    const next = !expanded;
    wrapper.setAttribute("data-expanded", next ? "true" : "false");
    const cards = wrapper.querySelectorAll('[data-trip-card="secondary"]');
    for (let i = 0; i < cards.length; i++) {
      if (next) cards[i].classList.remove("hidden");
      else cards[i].classList.add("hidden");
    }
    const btn = document.querySelector(
      '.cuti-alt-cta[data-cuti-opt-index="' + idx + '"]'
    );
    if (btn) {
      btn.textContent = next
        ? "Sembunyikan anjuran liburan lainnya"
        : "Lihat anjuran liburan lainnya";
      btn.setAttribute("aria-expanded", next ? "true" : "false");
    }
  }

  function renderCutiTrackFromTop(topList) {
    const track = document.getElementById("cuti-optimizer-track");
    if (!track) return;
    cutiShareTopSnapshot = topList.slice();
    const toast = document.getElementById("cuti-optimizer-share-toast");
    if (toast) {
      toast.textContent = "";
      toast.classList.remove("show");
    }
    let html = "";
    for (let i = 0; i < topList.length; i++) {
      html +=
        '<div class="cuti-optimizer-slide" role="listitem">' +
        renderOptionCard(i + 1, topList[i], i) +
        "</div>";
    }
    track.innerHTML = html;
    cutiCarouselCount = topList.length;
    cutiCarouselIndex = 0;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        updateCutiCarouselUi();
      });
    });
  }

  function runOptimizer() {
    const input = document.getElementById("cuti-optimizer-n");
    const results = document.getElementById("cuti-optimizer-results");
    const track = document.getElementById("cuti-optimizer-track");
    const noteEl = document.getElementById("cuti-optimizer-options-note");
    const errEl = document.getElementById("cuti-optimizer-error");

    if (!input || !byDateMap) return;

    if (errEl) {
      errEl.classList.add("hidden");
      errEl.textContent = "";
    }
    if (results) {
      if (cutiRevealAnimCleanup) {
        cutiRevealAnimCleanup();
        cutiRevealAnimCleanup = null;
      }
      results.classList.remove(
        "cuti-optimizer-results-reveal",
        "cuti-optimizer-results-preface"
      );
      results.classList.add("hidden");
    }
    if (noteEl) {
      noteEl.classList.add("hidden");
      noteEl.textContent = "";
    }
    if (track) track.innerHTML = "";
    const carouselHost = document.getElementById("cuti-optimizer-carousel-host");
    if (cutiReorderHideTimer) {
      clearTimeout(cutiReorderHideTimer);
      cutiReorderHideTimer = null;
    }
    if (carouselHost) carouselHost.classList.remove("is-cuti-reorder-hidden");
    cutiCarouselIndex = 0;
    cutiCarouselCount = 0;
    cutiShareTopSnapshot = [];
    cutiLastTopRankOrder = null;
    cutiSortNearestMode = false;
    const sortBtn = document.getElementById("cuti-optimizer-sort-nearest");
    if (sortBtn) {
      sortBtn.classList.add("hidden");
      sortBtn.setAttribute("aria-pressed", "false");
    }

    const N = parseInt(String(input.value), 10);
    if (!N || N < 1 || N > 10) {
      if (errEl) {
        errEl.textContent = "Masukkan jumlah hari cuti antara 1 dan 10.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    const t = todayISO();
    const { top, allRanked } = rankLeaveOptions(t, N, byDateMap, {
      topN: TOP_N,
    });

    if (!top.length) {
      if (errEl) {
        errEl.textContent =
          "Tidak menemukan kombinasi untuk jumlah hari itu. Coba angka lain atau jangka waktu lain.";
        errEl.classList.remove("hidden");
      }
      return;
    }

    cutiLastTopRankOrder = top.slice();
    cutiSortNearestMode = false;
    renderCutiTrackFromTop(top);
    if (sortBtn) {
      if (top.length > 1) {
        sortBtn.classList.remove("hidden");
        sortBtn.textContent = "Tampilkan terdekat";
        sortBtn.setAttribute("aria-pressed", "false");
      } else {
        sortBtn.classList.add("hidden");
      }
    }

    if (results) {
      results.classList.remove("hidden");
      if (cutiPrefersReducedMotion()) {
        triggerCutiResultsReveal();
      } else {
        results.classList.add("cuti-optimizer-results-preface");
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            results.classList.remove("cuti-optimizer-results-preface");
            triggerCutiResultsReveal();
          });
        });
      }
    }

    if (noteEl && top.length < TOP_N) {
      noteEl.textContent =
        "Hanya tersedia " +
        top.length +
        " opsi dengan rantai libur berbeda dalam jangka waktu pencarian.";
      noteEl.classList.remove("hidden");
    }
  }

  function onHolidaysLoaded(ev) {
    const d = ev && ev.detail;
    if (!d || !d.byDate) return;
    byDateMap = d.byDate;
  }

  document.addEventListener("kapanlibur:holidays-loaded", onHolidaysLoaded);

  const runBtn = document.getElementById("cuti-optimizer-run");
  if (runBtn) {
    runBtn.addEventListener("click", function () {
      const input = document.getElementById("cuti-optimizer-n");
      const N = input ? parseInt(String(input.value), 10) : NaN;
      const valid = !(!N || N < 1 || N > 10);
      if (window.kapanliburGa && window.kapanliburGa.track) {
        window.kapanliburGa.track("rencanakan_cuti_click", {
          leave_days: valid ? N : undefined,
          valid_input: valid,
        });
      }
      runOptimizer();
    });
  }

  const cutiViewportSwipe = document.getElementById("cuti-optimizer-viewport");
  attachCutiOptimizerSwipe(cutiViewportSwipe);

  const cutiNavPrev = document.getElementById("cuti-optimizer-nav-prev");
  const cutiNavNext = document.getElementById("cuti-optimizer-nav-next");
  const cutiTrackForShare = document.getElementById("cuti-optimizer-track");
  if (cutiTrackForShare) {
    cutiTrackForShare.addEventListener("click", function (ev) {
      const promoA = ev.target.closest("a.cuti-trip-card");
      if (promoA && promoA.href) {
        if (window.kapanliburGa && window.kapanliburGa.track) {
          window.kapanliburGa.track("cuti_promo_tiket_click", {
            link_url: promoA.href,
            destination: promoA.getAttribute("data-trip-destination") || "",
            trip_tier: promoA.getAttribute("data-trip-tier") || "",
          });
        }
        return;
      }
      const shareBtn = ev.target.closest(".cuti-option-share");
      if (shareBtn) {
        const idx = parseInt(shareBtn.getAttribute("data-cuti-opt-index"), 10);
        if (idx < 0 || idx >= cutiShareTopSnapshot.length) return;
        const opt = cutiShareTopSnapshot[idx];
        if (!opt) return;
        runCutiShare(buildCutiOptionShareText(opt));
        return;
      }
      const altCta = ev.target.closest(".cuti-alt-cta");
      if (altCta) {
        const idx = parseInt(altCta.getAttribute("data-cuti-opt-index"), 10);
        if (!Number.isNaN(idx)) {
          toggleTripCardsByIndex(idx);
        }
      }
    });
  }
  if (cutiNavPrev) {
    cutiNavPrev.addEventListener("click", function () {
      if (cutiCarouselIndex > 0) {
        cutiCarouselIndex--;
        updateCutiCarouselUi();
      }
    });
  }
  if (cutiNavNext) {
    cutiNavNext.addEventListener("click", function () {
      if (cutiCarouselIndex < cutiCarouselCount - 1) {
        cutiCarouselIndex++;
        updateCutiCarouselUi();
      }
    });
  }

  const sortNearestBtn = document.getElementById("cuti-optimizer-sort-nearest");
  if (sortNearestBtn) {
    sortNearestBtn.addEventListener("click", function () {
      if (!cutiLastTopRankOrder || cutiLastTopRankOrder.length < 2) return;
      const btn = sortNearestBtn;
      if (!cutiSortNearestMode) {
        const sorted = cutiLastTopRankOrder.slice().sort(compareNearestFirst);
        cutiSortNearestMode = true;
        btn.textContent = "Tampilkan terpanjang";
        btn.setAttribute("aria-pressed", "true");
        renderCutiTrackFromTopAnimatedReorder(sorted);
      } else {
        cutiSortNearestMode = false;
        btn.textContent = "Tampilkan terdekat";
        btn.setAttribute("aria-pressed", "false");
        renderCutiTrackFromTopAnimatedReorder(cutiLastTopRankOrder);
      }
    });
  }

  window.addEventListener("resize", function () {
    const results = document.getElementById("cuti-optimizer-results");
    if (
      results &&
      !results.classList.contains("hidden") &&
      cutiCarouselCount > 0
    ) {
      syncCutiCarouselLayout();
    }
  });

  if (typeof window !== "undefined") {
    window.KapanliburCutiOptimizer = {
      enumerateLeaveWindows: enumerateLeaveWindows,
      collapseUniqueLeaveWindows: collapseUniqueLeaveWindows,
      leaveDatesKey: leaveDatesKey,
      chainSignature: chainSignature,
      pickTopUniqueChains: pickTopUniqueChains,
      rankLeaveOptions: rankLeaveOptions,
      compareWindows: compareWindows,
      classifyPlacement: classifyPlacement,
      activityRecommendationForSpan: activityRecommendationForSpan,
      promoHrefForSpan: promoHrefForSpan,
      sanitizePromoHref: sanitizePromoHref,
      addDaysISO: addDaysISO,
      diffCalendarDays: diffCalendarDays,
      isOff: function (iso, byDate) {
        return isOff(iso, byDate);
      },
      isLnCb: function (iso, byDate) {
        return isLnCb(iso, byDate);
      },
      ACTIVITY_BY_SPAN: ACTIVITY_BY_SPAN,
      TRIP_CONFIG: TRIP_CONFIG,
      buildTripPlanJson: buildTripPlanJson,
      generateUrgencyInsight: generateUrgencyInsight,
      tripTypeKeyForSpan: tripTypeKeyForSpan,
      getCardDistribution: getCardDistribution,
      DEFAULT_HORIZON: DEFAULT_HORIZON,
      TOP_N: TOP_N,
    };
  }
})();
