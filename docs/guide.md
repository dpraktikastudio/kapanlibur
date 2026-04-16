# kapanlibur.com — contributor & agent reference

Static site for Indonesian national holidays (“libur nasional”, “cuti bersama”, weekends in the dataset). **Interactive app** in [`index.html`](../index.html): sticky **next-holiday** promo strip, a **2:1 top row** on large viewports (**`#home-top-split`**, `lg:grid-cols-3`: cuti **`lg:col-span-2`**, status **`lg:col-span-1`**) — **perencana cuti** (`#cuti-optimizer-section`, primary `h1`, **Hitung Cuti Saya**, carousel), **status hari ini** card (`<aside>` + `#hero-content.hero-today-card`: eyebrow, date, `h2`, detail body, optional **`#hero-next-ln-cb`** inset for next **Libur Nasional / Cuti Bersama** only, **Bagikan**); stacks **cuti then today** on small screens. Month-scoped **Libur mendatang** list (red date box for **libur panjang** rows), year calendar with Popper-based day popover. **Static reference** in [`hari-libur-nasional-2026.html`](../hari-libur-nasional-2026.html): tables and long-weekend copy. **Info:** [`about.html`](../about.html), [`privacy-policy.html`](../privacy-policy.html). **Data:** one JSON file per year ([`json/2026.json`](../json/2026.json)). No bundler or framework; Node is only for build and JSON-LD checks.

**PDF links:** [`assets/site-pdf.js`](../assets/site-pdf.js) (deferred) fetches `json/2026.json`, sets every `a[data-pdf-source]` `href` from top-level `source`, with a hardcoded Kemenko PDF URL as fallback when fetch fails or `source` is missing. On the home page it also reveals `#source-line` when run.

Use this doc when changing UI, data shape, SEO, assets, or build output so edits stay consistent.

---

## Purpose

- Show **perencana cuti** (leave-window ranking + carousel) beside **today’s holiday status** on desktop, a **navigable “next/previous” holiday** line in the **sticky promo bar**, **one month at a time** of upcoming rows, and a **full-year calendar**.
- Copy and labels are **Bahasa Indonesia**.
- “Hari ini” uses the **device local date** (`todayISO()`).

---

## Running locally

Data loads via `fetch("json/2026.json")`. **Do not rely on `file://`** (fetch/CORS). From the repo root:

```bash
npx serve .
```

Then open the printed URL. For production-like output, run `npm run build` and serve `dist/` the same way.

**Quality gate:** `npm run validate:jsonld` parses every `application/ld+json` block in `index.html` and `hari-libur-nasional-2026.html` and fails if any block is invalid JSON or missing.

---

## File layout

| Path | Role |
|------|------|
| `index.html` | Home app: Tailwind (CDN + inline `tailwind.config`), [`assets/site-chrome.css`](../assets/site-chrome.css), Brevo + [`assets/site-newsletter.css`](../assets/site-newsletter.css), FOUC IIFE for `data-theme`, GA4. Scripts: [`assets/site-nav.js`](../assets/site-nav.js), [`assets/site-theme.js`](../assets/site-theme.js), [`assets/site-pdf.js`](../assets/site-pdf.js) (deferred), [`assets/site-home-hero.js`](../assets/site-home-hero.js), [`assets/site-cuti-optimizer.js`](../assets/site-cuti-optimizer.js) (deferred). |
| [`assets/site-chrome.css`](../assets/site-chrome.css) | Shared chrome for the home layout: palette tokens, `.nav-shell`, sticky **hero promo** bar (`.hero-promo-banner`), `main.site-main` top padding via `--site-nav-clearance` + `--hero-promo-banner-extra` when `body.hero-promo-visible`, **`#home-top-split`** / **`#cuti-optimizer-section`** scroll-margin, **`#home-today-card-shell`** sticky on **≥1024px**, **`.hero-today-card`** / **`.hero-today-body`** / **`.hero-today-inset`** (status card + nested callout), **cuti carousel** (`.cuti-optimizer-carousel`, `.cuti-optimizer-viewport`, track transition, reorder hide class), **Libur mendatang** long-weekend date box (`.libur-mendatang-datebox--long-weekend`, `.libur-mendatang-date-long-text` → `#dc4b48`), theme toggle / nav toggle rules, Material Symbols baseline, `.share-toast`. |
| [`assets/site-home-hero.js`](../assets/site-home-hero.js) | Fetches `json/2026.json`, builds maps, renders **sticky promo strip**, **status hari ini** (`#hero-content`, **`nextLiburNasionalCutiRow`** + **`#hero-next-ln-cb`** when a future LN/CB row exists), **libur mendatang** list (`#libur-mendatang-list`, month nav, swipe host, per-row share), **calendar** + popover, share handlers; clears **`#home-top-split`** `aria-busy` when data is ready; dispatches `kapanlibur:holidays-loaded` (`detail: { byDate, sortedData }`) after a successful load. |
| [`assets/site-cuti-optimizer.js`](../assets/site-cuti-optimizer.js) | **Perencana cuti:** subscribes to `kapanlibur:holidays-loaded`, ranks leave windows (`compareWindows`, `chainSignature`, `pickTopUniqueChains`, `TOP_N` = 5), renders **carousel** (`#cuti-optimizer-track` / viewport), **sort toggle** (e.g. terdekat vs urutan peringkat) with short hide→render→show transition on `#cuti-optimizer-carousel-host`, **swipe** on viewport, **Bagikan** per option (`buildCutiOptionShareText`, `runCutiShare` + `#cuti-optimizer-share-toast`). |
| `hari-libur-nasional-2026.html` | Static reference; JSON-LD (WebPage, ItemList, Events, BreadcrumbList); same nav + theme + `site-pdf.js` as other main pages. |
| `about.html`, `privacy-policy.html` | Info pages; same header chrome + `site-theme.js` as home; OG/Twitter meta + favicons; deferred `site-pdf.js`. |
| [`assets/non-critical.css`](../assets/non-critical.css) | Shared UI: **site shell** (`.wrap`, flush-top sticky `header`, mobile full-bleed nav bar, in-flow hamburger), **`.site-brand`**, **`.site-nav-cluster`**, **`.theme-toggle`**, lists, calendar, tables, `.site-nav`, `.site-logo`, footer, `.footer-links`, popover, etc. |
| [`assets/site-nav.js`](../assets/site-nav.js) | Below `640px`: hamburger opens a fixed drawer for `#site-nav-panel`; backdrop + Escape close. Desktop: inline nav bar. |
| [`assets/site-theme.js`](../assets/site-theme.js) | On every page that includes `#theme-toggle`: sets `html[data-theme="light"|"dark"]`, persists **`localStorage` key `kapanlibur-theme`**, updates `#theme-color-meta`. If the key is absent, `data-theme` is omitted and **`prefers-color-scheme`** controls palette (see each page’s critical CSS + boot IIFE in `<head>`). |
| [`assets/site-pdf.js`](../assets/site-pdf.js) | PDF `href` hydration from JSON `source` (+ fallback). |
| `json/YYYY.json` | `{ "source"?: "<url>", "data": [ ... ] }` — app currently hardcodes **`json/2026.json`** in `fetch`. |
| [`manifest.json`](../manifest.json) | PWA manifest: `theme_color`, icons under `/assets/kapanlibur-favicon-*.png`. |
| [`og-image.html`](../og-image.html) | Optional **design template** for the social image (fixed 1200×630 layout). Export/screenshot should be saved as **`assets/OgImage.png`**; live URLs use the **exact** filename (case-sensitive on Linux). |
| [`scripts/build.mjs`](../scripts/build.mjs) | Writes minified HTML to `dist/`, copies `assets/`, `json/`, and root SEO files. Injects **content hashes** `?v=` into listed assets (including **`site-home-hero.js`**, **`site-cuti-optimizer.js`**, CSS, and **`/json/2026.json`**) so long `Cache-Control` on `/assets/*` and `/json/*` does not strand stale clients after deploy. |
| [`scripts/validate-jsonld.mjs`](../scripts/validate-jsonld.mjs) | JSON-LD syntax check. |
| [`_headers`](../_headers) | Netlify-style security/cache headers + `sitemap.xml` content type. |
| `sitemap.xml`, `robots.txt` | Discovery; update `lastmod` in sitemap when pages meaningfully change. |
| `docs/guide.md` | This reference. |

**CDN:** [`@popperjs/core`](https://popper.js.org/) v2 (`cdn.jsdelivr.net`) loads before the main script. Calendar cell clicks open `#cal-popover` with `Popper.createPopper` (`openCalPopover` / `closeCalPopover`).

### Site shell & navigation (all main HTML pages)

- **`body .wrap`:** **`width: 92vw`**, **`max-width: 1440px`**, **`padding-top: 0`**, horizontal **`clamp`** on **≥640px**; below **640px**, full width with **`max(0.75rem, env(safe-area-inset-*))`** horizontal inset. **`body .wrap > header`:** **only** `.site-nav-bar` (`.site-brand` + `.site-nav-cluster` with links + **`#theme-toggle`** + hamburger); titles and intro copy sit in **`<main>`** as **`.page-intro`**, not inside the sticky bar. **Sticky**, **flush to the viewport top**, **no top border**, **`border-radius: 0 0 14px 14px`** on **≥640px**; **full-bleed** bar on small viewports. **`#site-nav-toggle`** is **in-flow** under **640px** (not `position: fixed`). Each page’s **critical** `<style>` duplicates this shell to limit FOUC before `non-critical.css` loads.
- **Legal / about / privacy:** `body:has(.legal-panel) main` uses **`max-width: 52rem`** centered so prose stays readable inside the wide shell.

### Home page (`index.html`) layout & theme

- **Shell:** Fixed **`.nav-shell`** (logo, links, theme toggle, mobile drawer). Same theme behavior as other main pages: **`site-theme.js`**, **`localStorage` key `kapanlibur-theme`**, optional `data-theme` override.
- **Sticky promo bar** (`#hero-next-banner`, `.hero-promo-banner`): Shown after holidays load. Sits under the nav; `body.hero-promo-visible` bumps **`--hero-promo-banner-extra`** so `main.site-main` is not covered. Markup: **CSS grid** `auto | 1fr | auto` — left **`#hero-nav-prev`**, right **`#hero-nav-next`**, center cluster **`#hero-next-nav`** (megaphone + scrollable summary + share). Users change the listed holiday **only with the chevrons** (no swipe; horizontal scroll is reserved for long copy on narrow viewports).
- **Top split** (`#home-top-split`): **`aria-busy`** until holidays load. **CSS grid** `lg:grid-cols-3`: **left** `lg:col-span-2` = **`#cuti-optimizer-section`**; **right** `lg:col-span-1` = `<aside aria-label="Status hari ini">` + **`#home-today-card-shell`** (sticky) + **`#hero-content.hero-today-card`**. Single-column flow: cuti first, status card second.
- **Cuti block** (`#cuti-optimizer-section`): Primary **`h1`** “Ubah cuti Anda jadi libur lebih panjang”, subheadline copy, input N, **Hitung Cuti Saya**, trust line **`#cuti-optimizer-hint`** (“Berdasarkan data resmi SKB 3 Menteri”, always visible), results carousel in **`#cuti-optimizer-card`**. Hidden until holidays load; same gate as **`#hero-content`** in `onDataLoaded` / `onDataError`.
- **Status hari ini** (`#hero-content`): **`h2`** `#hero-today-headline`, **`setTodayBody`** detail (badges + rantai), optional **`#hero-next-ln-cb`** inset — shown only when **`nextLiburNasionalCutiRow`** finds a row strictly after today with type **Libur Nasional** or **Cuti Bersama** (Sabtu/Minggu skipped); value uses **`daysUntilPhrase`** + description + Indonesian type label; **Bagikan** today.
- **Below:** Libur mendatang grid column, subscription teaser, full calendar, newsletter `dialog`, footer — list/calendar driven by `site-home-hero.js` in `index.html`.

---

## Branding, PWA, and social preview

| Concern | Where / convention |
|--------|---------------------|
| **Open Graph & Twitter image** | All main HTML pages use absolute URL `https://kapanlibur.com/assets/OgImage.png` for `og:image` and `twitter:image`. Deployed file must match **`assets/OgImage.png`** (capital `O`, capital `I`). |
| **Favicons** | `<link rel="icon">` (16 + 32 PNG) and `apple-touch-icon` (512) under `/assets/kapanlibur-favicon-*.png`. |
| **PWA icons** | [`manifest.json`](../manifest.json) points at `/assets/kapanlibur-favicon-256px.png` and `-512px.png`. |
| **In-page logo** | `.site-nav-bar` starts with `.site-logo` → `assets/kapanlibur-logo-nobg.png` (home link). Styles in `non-critical.css`. |
| **Legacy root files** | Root `icon.svg` and `og-image.png` are **not** used. Build removes stale `dist/icon.svg` and `dist/og-image.png` if present from old deploys. |

When replacing the social image, overwrite `assets/OgImage.png` and keep dimensions aligned with `og:image:width` / `og:image:height` in HTML (currently 1200×630) unless you update those meta tags too.

---

## Production build (`dist/`)

`npm run build` runs [`scripts/build.mjs`](../scripts/build.mjs):

1. Ensures `dist/` exists; deletes **`dist/icon.svg`** and **`dist/og-image.png`** if they exist (leftovers).
2. Minifies **`index.html`**, **`hari-libur-nasional-2026.html`**, **`about.html`**, **`privacy-policy.html`** (collapse whitespace, strip HTML comments; CSS/JS inside pages not minified). **Rewrites** script/CSS/JSON URLs in HTML per `BUST_ASSETS` + JSON hash (see `scripts/build.mjs`).
3. Recursively copies **`assets/`** and **`json/`** into `dist/`.
4. Rewrites hardcoded **`/json/2026.json`** inside **`dist/assets/site-pdf.js`** to the same hashed URL.
5. Copies **`manifest.json`**, **`robots.txt`**, **`sitemap.xml`**, **`_headers`**, **`og-image.html`**.

Deploy **`dist/`** (or equivalent) so paths like `/assets/OgImage.png` and `/json/2026.json` resolve. Do not expect `og-image.html` to be linked from the app; it is an optional authoring aid.

---

## SEO and structured data

- **Canonical URLs** and **meta description** are set per page; **JSON-LD** lives in `index.html` (WebSite + related) and heavily in `hari-libur-nasional-2026.html` (WebPage, ItemList, Events, BreadcrumbList). **Homepage** canonical + `og:url` use **`https://kapanlibur.com`** (no trailing slash) so link previews match both shared forms; [`netlify.toml`](../netlify.toml) 301s **`/index.html`** → **`/`**.
- **Sitemap:** [`sitemap.xml`](../sitemap.xml) lists the four main URLs; bump `<lastmod>` when content changes materially.
- **Headers:** [`_headers`](../_headers) sets baseline security headers and `Cache-Control` for static hosting (e.g. Netlify).

After editing JSON-LD, run `npm run validate:jsonld`.

---

## JSON row schema (`data[]`)

Each entry is one **calendar day** represented in the dataset (including **Sabtu** / **Minggu** rows).

| Field | Meaning |
|--------|--------|
| `number` | Sequence in file. |
| `date` | `YYYY-MM-DD` (local calendar semantics; compared as strings for the same year). |
| `day` | Indonesian weekday name (e.g. `Jumat`). |
| `description` | Human label (event name or `Sabtu` / `Minggu`). |
| `type` | `Libur Nasional` \| `Cuti Bersama` \| `Sabtu` \| `Minggu`. |
| `is_long_weekend` | Boolean; long-weekend / bridge context for copy and badges. |
| `chain_holidays` | **Length** of the **contiguous** holiday block this row belongs to (not “days from today”). |

**Chains:** `chain_holidays` is identical for every day in the same contiguous block. To describe **which weekdays** are in the chain, the code walks **backward** from `row.date` while the previous day exists in `byDate` and shares the same `chain_holidays`, then formats from that start (`chainStartISO`, `formatChainWeekdayList`, `formatRantaiBerturutForRow`). Do not assume the chain starts on `row.date`.

Top-level **`source`** is optional; PDF anchors still get a working link via **`site-pdf.js`** fallback. The home page `#source-line` visibility is tied to that script.

---

## Main JS modules (conceptual)

Home behaviour lives in [`assets/site-home-hero.js`](../assets/site-home-hero.js) (single IIFE). Optimizer logic is separate in [`assets/site-cuti-optimizer.js`](../assets/site-cuti-optimizer.js).

### Date / text helpers

- `todayISO()` — local date `YYYY-MM-DD`.
- `parseISODate(iso)` — local `Date` (avoids UTC drift on date-only strings).
- `formatLongID(iso)` — e.g. `Jumat, 1 Mei 2026`.
- `diffDays(fromISO, toISO)` — integer day difference.
- `daysUntilPhrase(n)` — `hari ini` / `besok` / `N hari lagi`.
- `escapeHtml`, `chipClass`, `calCellClass`, `showTypeBadgeForRow` / `renderBadgeSpans` — **Sabtu/Minggu** type chips are omitted (weekend rows still get “Libur panjang” when `is_long_weekend`); used in **today body**, **month list**, and **calendar popover**.

### Rantai (chain) copy

- `formatRantaiBerturutForRow(row, byDate)` — `N hari (Senin, Selasa, …)`; falls back to `N hari` if `byDate` missing.

### Share text

- `buildShareTodayText(t, todayRow, byDate, sortedData?)` — today paragraph(s); optional **Libur berikutnya** line (next LN/CB via `nextLiburNasionalCutiRow` when `sortedData` present); closing CTA **Rencanakan liburan kamu di https://kapanlibur.com!**
- `buildShareSelectedText(t, selectedRow, byDate)` — text for the **selected** promo / list row (`sortedData[selectedIndex]`).

### State bags (reset on each successful fetch)

| Object | Fields | Role |
|--------|--------|------|
| `heroContext` | `byDate`, `sortedData`, `selectedIndex`, `minSelectableIndex` | **Promo strip** + share text: index into **full** sorted `data`. Selection is clamped so users cannot move **before** the first row strictly after today (`minSelectableIndex`); initial selection follows the same rule. |
| `listContext` | `sortedData`, `byDate`, `dataYear`, `listYearMonth` | Month filter `YYYY-MM` within `dataYear`. |
| `calContext` | `year`, `byDate`, `mobileMonth` | 0–11 for **mobile** single-month view. |

After load, `heroContext.selectedIndex` is reset to `null` so the first paint picks the **first strictly future** row (same floor as prev navigation), or the **last** row if none remain in the year.

---

## UI sections (behavior)

### 1. Hero (promo strip + main column)

**A. Sticky promo** (`#hero-next-banner`)

- **Layout:** Full-width bar inside `max-w-7xl`; **grid** places chevrons on the **outer** columns and centers **`#hero-next-nav`** (campaign icon + `#hero-next-banner-summary` inside `.hero-promo-summary-scroll` + `#hero-share-next` + toast + `#hero-next-banner-sr`).
- **Copy:** `heroBannerSummaryLines()` returns `visualHtml` / `full`. For rows **after today**, the visible prefix **Libur berikutnya:** is wrapped in `<span class="hidden sm:inline">` so it shows from the **`sm`** breakpoint up only; mobile shows the rest of the sentence (and uses a **share** icon instead of the **Bagikan!** label). **`title`** and **`#hero-next-banner-sr`** keep the full plain string (including the prefix) for hover and screen readers.
- **Overflow:** Narrow viewports: **horizontal scroll** on `.hero-promo-summary-scroll` (hidden scrollbar, `touch-action: pan-x` in `site-chrome.css`). From **`sm`:** `overflow-hidden` + **`truncate`** on the summary line with a **`sm:max-w-2xl`** cap on the scroll wrapper.
- **Navigation:** **`#hero-nav-prev` / `#hero-nav-next`** only. **No swipe-to-change-holiday** (removed so it does not fight horizontal scrolling).
- **Dimming:** Bar gets reduced opacity when the selected row is **in the past** (`selectedRow.date < today`).

**B. Status hari ini card** (`#hero-content`, right column, ~⅓ width on `lg`)

- **Today:** Date (`#hero-today-date`), typed headline (`#hero-today-headline`, **`h2`**), body (`#hero-today-body` via **`setTodayBody`**), optional inset **`#hero-next-ln-cb`** (`nextLiburNasionalCutiRow` / `indexFirstFutureNasionalCuti`: next **Libur Nasional** or **Cuti Bersama** only; **`hidden`** if none), **Bagikan** (`buildShareTodayText`).
- **Selected holiday share:** `#hero-share-next` in the promo strip runs `buildShareSelectedText` for the **same** `sortedData[selectedIndex]` row shown there.

### 2. Libur mendatang (`#libur-mendatang-list`)

- **One month** at a time: `listContext.listYearMonth` = `YYYY-MM` within `dataYear`.
- Lists **all** holiday rows in that month; rows with `date < today` get **`opacity-60`** on the `<article>`.
- **Date badge (left column):** default **`border-l-4`** + `rowBorderAccentClass(type)` (LN / CB / outline). If **`row.is_long_weekend`**, uses **`libur-mendatang-datebox--long-weekend`** (2px border `#dc4b48`) and **`libur-mendatang-date-long-text`** for month + day numerals (see `site-chrome.css`).
- **Header:** `#libur-mendatang-month-label`, prev/next **`#libur-mendatang-prev` / `#libur-mendatang-next`** (`#libur-mendatang-nav`); swipe on **`#libur-mendatang-swipe-host`**.
- Per-row **Bagikan**: `.libur-mendatang-row-share` + `data-date`; toast **`#libur-mendatang-share-toast`**.
- Month step: `liburMendatangMonthStep` (clamp January–December for that year).

### 2b. Perencana cuti (`#cuti-optimizer-section`, left column)

- **Data:** listens for **`kapanlibur:holidays-loaded`**; uses same `byDate` as hero.
- **Engine (pure + DOM in `site-cuti-optimizer.js`):** enumerate leave windows, collapse by leave dates, rank (`compareWindows`: span, weekend-only tie-break, distance, placement, `L`), **`pickTopUniqueChains`** with **`chainSignature`** dedupe, top **5** options.
- **UI:** **`#cuti-optimizer-carousel-host`** wraps viewport + horizontal track; slide label + **prev/next** in **`#cuti-optimizer-nav-toolbar`**; optional **Tampilkan terdekat** (or restore rank order) with **`is-cuti-reorder-hidden`** transition; **touch swipe** on **`#cuti-optimizer-viewport`**.
- **Cards:** month badge, tanggal cuti / rentang / span, **Rincian hari** (`scheduleLines`), ide aktivitas, **Bagikan** (plain-text blurb + Unicode-bold span total in share line when applicable).

### 3. Kalender (`#calendar-wrap`)

- **ICS export:** [`assets/kalender-libur-indonesia-2026.ics`](../assets/kalender-libur-indonesia-2026.ics) (source of truth in [`source/kalender-libur-indonesia-2026.ics`](../source/kalender-libur-indonesia-2026.ics); copy to `assets/` for deploy). Section `#kalender-2026` has **Unduh kalender (.ics)** and **Tambahkan ke Google Calendar** (`#cal-ics-google` — `href` filled from `new URL("assets/…", location)` + Google “add by URL”).
- **Desktop** (`min-width: 641px`): **12** months (`buildMonthGrid` in a loop).
- **Mobile** (`max-width: 640px`): **one** month (`calContext.mobileMonth`), toolbar `#cal-month-toolbar`, swipe on `#calendar-wrap` via `attachCalendarWrapSwipeOnce` (listeners must persist because `#calendar` innerHTML is replaced on render).
- **Today** cells get `.is-today`.
- **Holiday cell** click opens **`#cal-popover`** (`openCalPopover`) — **no** scroll-to-list. Close: backdrop, Tutup, Escape.

`matchMedia("(max-width: 640px)")` **change** re-runs `renderCalendar` so layout tracks viewport changes.

---

## Fetch pipeline (home page)

1. **`assets/site-pdf.js`** (deferred): `fetch("json/2026.json")` → apply `source` or fallback to all `a[data-pdf-source]`; unhide `#source-line` when appropriate.
2. **`assets/site-home-hero.js`:** `fetch("json/2026.json")` → parse (second fetch of the same file; cache-friendly).
3. `data` sorted by `date` string order.
4. `byDate = Map(date → row)`.
5. `year` from first row (labels + calendar).
6. `heroContext`, `listContext`, `calContext` filled; `renderMainCard()`, `renderList()`, `renderCalendar()`.
7. `initCalendarUIOnce()` runs once: calendar popover, calendar-wrap swipe, **resize listener** for calendar. List month nav + libur swipe are wired in **`initLiburMendatangControls()`**. A **`kapanlibur:holidays-loaded`** event (with `byDate` + `sortedData` in `detail`) is dispatched for **`site-cuti-optimizer.js`**.

Two `fetch` calls to the same JSON are intentional; responses are cacheable and small.

---

## Conventions for future changes

- **Strings:** Indonesian UI; use `escapeHtml` when interpolating data into HTML strings.
- **New calendar year:** Add `json/YYYY.json`, update **every** hardcoded `fetch("json/2026.json")` (and any copy that says “2026” if product requires it), and refresh static tables in `hari-libur-nasional-2026.html` / JSON-LD if that page stays year-specific.
- **Badges:** Sabtu/Minggu **type** chips are omitted via `showTypeBadgeForRow` anywhere `renderBadgeSpans` runs (today body, list, calendar popover); other types still show chips.
- **Accessibility:** Nav controls use `aria-label` / `aria-disabled`; popover uses `role="dialog"` and Escape to close.
- **CSS:** Design tokens in `:root`; dark mode via `prefers-color-scheme: dark` in page `<style>` and shared rules in `non-critical.css`.
- **Branding:** Prefer updating files under `assets/` and absolute `https://kapanlibur.com/assets/...` meta URLs together; watch **filename case** on Linux hosts.
- **Sitemap:** When shipping meaningful content updates, update `<lastmod>` in `sitemap.xml`.

---

## Error handling

**`onDataError()`** (failed `fetch` / bad JSON in `site-home-hero.js`): hides **`#hero-content`**, **`#cuti-optimizer-section`**, promo bar; shows libur mendatang error UI and a short message in **`#calendar`**; **`#calendar-loaded`** still shown so layout does not collapse entirely. Successful load uses **`onDataLoaded()`** (inverse).

---

## Quick checklist for agents

- [ ] After changing DOM ids, grep for `getElementById` / `querySelector` and update listeners and templates.
- [ ] After changing JSON fields, update row mapping, chips, calendar classes, and any static reference page tables.
- [ ] Test with a **static HTTP server**, not `file://`.
- [ ] If touching month boundaries, verify `listYearMonth` and `calContext.mobileMonth` clamps.
- [ ] If touching cuti UI/DOM, sync `site-cuti-optimizer.js`, `index.html`, and **`docs/guide.md`**; confirm carousel ids and `kapanlibur:holidays-loaded` contract.
- [ ] If touching chains, verify `chainStartISO` + `formatRantaiBerturutForRow` match product intent.
- [ ] After JSON-LD edits: `npm run validate:jsonld`.
- [ ] After HTML changes: `npm run build` and smoke-test `dist/`.
- [ ] If changing social image: `assets/OgImage.png` + meta dimensions + caches (CDNs/social debuggers).
