# kapanlibur.com — contributor & agent reference

Static site for Indonesian national holidays (“libur nasional”, “cuti bersama”, weekends in the dataset). **Interactive app** in [`index.html`](../index.html): hero cards, month-scoped list, year calendar with Popper-based day popover. **Static reference** in [`hari-libur-nasional-2026.html`](../hari-libur-nasional-2026.html): tables and long-weekend copy. **Info:** [`about.html`](../about.html), [`privacy-policy.html`](../privacy-policy.html). **Data:** one JSON file per year ([`json/2026.json`](../json/2026.json)). No bundler or framework; Node is only for build and JSON-LD checks.

**PDF links:** [`assets/site-pdf.js`](../assets/site-pdf.js) (deferred) fetches `json/2026.json`, sets every `a[data-pdf-source]` `href` from top-level `source`, with a hardcoded Kemenko PDF URL as fallback when fetch fails or `source` is missing. On the home page it also reveals `#source-line` when run.

Use this doc when changing UI, data shape, SEO, assets, or build output so edits stay consistent.

---

## Purpose

- Show **today’s holiday status**, a **navigable “next/previous” holiday card**, **one month at a time** of upcoming rows, and a **full-year calendar**.
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
| `index.html` | Interactive UI: critical CSS (shared wide shell + `body.page-index` hero), inline FOUC snippet for `data-theme`, inline IIFE, deferred [`assets/non-critical.css`](../assets/non-critical.css), [`assets/site-nav.js`](../assets/site-nav.js), [`assets/site-theme.js`](../assets/site-theme.js), [`assets/site-pdf.js`](../assets/site-pdf.js). GA4 in `<head>`. |
| `hari-libur-nasional-2026.html` | Static reference; JSON-LD (WebPage, ItemList, Events, BreadcrumbList); same nav + theme + `site-pdf.js` as other main pages. |
| `about.html`, `privacy-policy.html` | Info pages; same header chrome + `site-theme.js` as home; OG/Twitter meta + favicons; deferred `site-pdf.js`. |
| [`assets/non-critical.css`](../assets/non-critical.css) | Shared UI: **site shell** (`.wrap`, flush-top sticky `header`, mobile full-bleed nav bar, in-flow hamburger), **`.site-brand`**, **`.site-nav-cluster`**, **`.theme-toggle`**, lists, calendar, tables, `.site-nav`, `.site-logo`, footer, `.footer-links`, popover, etc. |
| [`assets/site-nav.js`](../assets/site-nav.js) | Below `640px`: hamburger opens a fixed drawer for `#site-nav-panel`; backdrop + Escape close. Desktop: inline nav bar. |
| [`assets/site-theme.js`](../assets/site-theme.js) | On every page that includes `#theme-toggle`: sets `html[data-theme="light"|"dark"]`, persists **`localStorage` key `kapanlibur-theme`**, updates `#theme-color-meta`. If the key is absent, `data-theme` is omitted and **`prefers-color-scheme`** controls palette (see each page’s critical CSS + boot IIFE in `<head>`). |
| [`assets/site-pdf.js`](../assets/site-pdf.js) | PDF `href` hydration from JSON `source` (+ fallback). |
| `json/YYYY.json` | `{ "source"?: "<url>", "data": [ ... ] }` — app currently hardcodes **`json/2026.json`** in `fetch`. |
| [`manifest.json`](../manifest.json) | PWA manifest: `theme_color`, icons under `/assets/kapanlibur-favicon-*.png`. |
| [`og-image.html`](../og-image.html) | Optional **design template** for the social image (fixed 1200×630 layout). Export/screenshot should be saved as **`assets/OgImage.png`**; live URLs use the **exact** filename (case-sensitive on Linux). |
| [`scripts/build.mjs`](../scripts/build.mjs) | Writes minified HTML to `dist/`, copies `assets/`, `json/`, and root SEO files. |
| [`scripts/validate-jsonld.mjs`](../scripts/validate-jsonld.mjs) | JSON-LD syntax check. |
| [`_headers`](../_headers) | Netlify-style security/cache headers + `sitemap.xml` content type. |
| `sitemap.xml`, `robots.txt` | Discovery; update `lastmod` in sitemap when pages meaningfully change. |
| `docs/guide.md` | This reference. |

**CDN:** [`@popperjs/core`](https://popper.js.org/) v2 (`cdn.jsdelivr.net`) loads before the main script. Calendar cell clicks open `#cal-popover` with `Popper.createPopper` (`openCalPopover` / `closeCalPopover`).

### Site shell & navigation (all main HTML pages)

- **`body .wrap`:** **`width: 92vw`**, **`max-width: 1440px`**, **`padding-top: 0`**, horizontal **`clamp`** on **≥640px**; below **640px**, full width with **`max(0.75rem, env(safe-area-inset-*))`** horizontal inset. **`body .wrap > header`:** **only** `.site-nav-bar` (`.site-brand` + `.site-nav-cluster` with links + **`#theme-toggle`** + hamburger); titles and intro copy sit in **`<main>`** as **`.page-intro`**, not inside the sticky bar. **Sticky**, **flush to the viewport top**, **no top border**, **`border-radius: 0 0 14px 14px`** on **≥640px**; **full-bleed** bar on small viewports. **`#site-nav-toggle`** is **in-flow** under **640px** (not `position: fixed`). Each page’s **critical** `<style>` duplicates this shell to limit FOUC before `non-critical.css` loads.
- **Legal / about / privacy:** `body:has(.legal-panel) main` uses **`max-width: 52rem`** centered so prose stays readable inside the wide shell.

### Home page (`index.html`) layout & theme

- **`body.page-index`:** Same header chrome and theme behavior as other main pages. Hero: `#hero-today` / `#hero-next` use **`hero-card-today`** / **`hero-card-next`**; from **960px** up, `#hero-stack` is a row (~62% / ~35%). The next card uses a fixed emerald gradient (not tied to `--surface`).
- **Theme:** All four main HTML pages load `site-theme.js` and expose **`#theme-toggle`**; clearing **`localStorage.kapanlibur-theme`** restores system-driven appearance on the next full load when no stored preference applies.

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
2. Minifies **`index.html`**, **`hari-libur-nasional-2026.html`**, **`about.html`**, **`privacy-policy.html`** (collapse whitespace, strip HTML comments; CSS/JS inside pages not minified).
3. Recursively copies **`assets/`** and **`json/`** into `dist/`.
4. Copies **`manifest.json`**, **`robots.txt`**, **`sitemap.xml`**, **`_headers`**, **`og-image.html`**.

Deploy **`dist/`** (or equivalent) so paths like `/assets/OgImage.png` and `/json/2026.json` resolve. Do not expect `og-image.html` to be linked from the app; it is an optional authoring aid.

---

## SEO and structured data

- **Canonical URLs** and **meta description** are set per page; **JSON-LD** lives in `index.html` (WebSite + related) and heavily in `hari-libur-nasional-2026.html` (WebPage, ItemList, Events, BreadcrumbList).
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

All live in the same IIFE in `index.html`:

### Date / text helpers

- `todayISO()` — local date `YYYY-MM-DD`.
- `parseISODate(iso)` — local `Date` (avoids UTC drift on date-only strings).
- `formatLongID(iso)` — e.g. `Jumat, 1 Mei 2026`.
- `diffDays(fromISO, toISO)` — integer day difference.
- `daysUntilPhrase(n)` — `hari ini` / `besok` / `N hari lagi`.
- `escapeHtml`, `chipClass`, `calCellClass`, `showTypeBadgeForRow` (type chip hidden for Sabtu/Minggu in **hero** cards only).

### Rantai (chain) copy

- `formatRantaiBerturutForRow(row, byDate)` — `N hari (Senin, Selasa, …)`; falls back to `N hari` if `byDate` missing.

### Share text

- `buildShareTodayText(t, todayRow, byDate)` — today-only paragraph(s).
- `buildShareSelectedText(t, selectedRow, byDate)` — text for the **selected** hero card row.

### State bags (reset on each successful fetch)

| Object | Fields | Role |
|--------|--------|------|
| `heroContext` | `byDate`, `sortedData`, `selectedIndex` | Hero: index into **full** sorted `data` for the navigable card. |
| `listContext` | `sortedData`, `byDate`, `dataYear`, `listYearMonth` | Month filter `YYYY-MM` within `dataYear`. |
| `calContext` | `year`, `byDate`, `mobileMonth` | 0–11 for **mobile** single-month view. |

After load, `heroContext.selectedIndex` is reset to `null` so the first paint picks the **first future** row, or the **last** row if none remain in the year.

---

## UI sections (behavior)

### 1. Hero (`#hero-stack`)

Two **separate** `.hero` cards:

1. **Libur hari ini** — Full date, libur/tidak, description, badges (type; LW only if `is_long_weekend`; no “LW Tidak”), rantai line, **Bagikan** (`buildShareTodayText`).
2. **Libur berikutnya / sebelumnya / pada hari ini** — Title from comparing `selectedRow.date` vs `todayISO`; **dimmed** when `selectedRow.date < today`. Countdown (“Besok” / “N hari lagi”) only when **`selectedRow.date > today`**. Prev/next arrows and swipe on the list area; **Long weekend** chip only when `is_long_weekend`. **Bagikan** uses `buildShareSelectedText`.

Swipe: `attachHeroSwipe` on `#hero-next-nav` — left = next index, right = prev; pointer handler ignores `pointerType === "touch"` where needed to avoid double-firing with touch events.

### 2. Libur mendatang (`#list`)

- **One month** at a time: `listContext.listYearMonth` = `YYYY-MM` within `dataYear`.
- Lists **all** holiday rows in that month; rows with `date < today` get **`list-row-past`** (dimmed).
- **Header row**: month title plus prev/next controls in `#list-month-nav`; swipe on `#list-swipe-host`.
- Month step: `listMonthStep` (clamp January–December for that year).

### 3. Kalender (`#calendar-wrap`)

- **Desktop** (`min-width: 641px`): **12** months (`buildMonthGrid` in a loop).
- **Mobile** (`max-width: 640px`): **one** month (`calContext.mobileMonth`), toolbar `#cal-month-toolbar`, swipe on `#calendar-wrap` via `attachCalendarWrapSwipeOnce` (listeners must persist because `#calendar` innerHTML is replaced on render).
- **Today** cells get `.is-today`.
- **Holiday cell** click opens **`#cal-popover`** (`openCalPopover`) — **no** scroll-to-list. Close: backdrop, Tutup, Escape.

`matchMedia("(max-width: 640px)")` **change** re-runs `renderCalendar` so layout tracks viewport changes.

---

## Fetch pipeline (home page)

1. **`assets/site-pdf.js`** (deferred): `fetch("json/2026.json")` → apply `source` or fallback to all `a[data-pdf-source]`; unhide `#source-line` when appropriate.
2. **`index.html` IIFE:** `fetch("json/2026.json")` → parse.
3. `data` sorted by `date` string order.
4. `byDate = Map(date → row)`.
5. `year` from first row (labels + calendar).
6. `heroContext`, `listContext`, `calContext` filled; `renderMainCard()`, `renderList()`, `renderCalendar()`.
7. `initMonthNavAndPopover()` runs once: list/calendar nav, popover teardown, list swipe, calendar-wrap swipe, **resize listener** for calendar.

Two `fetch` calls to the same JSON are intentional; responses are cacheable and small.

---

## Conventions for future changes

- **Strings:** Indonesian UI; use `escapeHtml` when interpolating data into HTML strings.
- **New calendar year:** Add `json/YYYY.json`, update **every** hardcoded `fetch("json/2026.json")` (and any copy that says “2026” if product requires it), and refresh static tables in `hari-libur-nasional-2026.html` / JSON-LD if that page stays year-specific.
- **Badges:** Sabtu/Minggu type chips are suppressed in hero cards only; list still shows type chips.
- **Accessibility:** Nav controls use `aria-label` / `aria-disabled`; popover uses `role="dialog"` and Escape to close.
- **CSS:** Design tokens in `:root`; dark mode via `prefers-color-scheme: dark` in page `<style>` and shared rules in `non-critical.css`.
- **Branding:** Prefer updating files under `assets/` and absolute `https://kapanlibur.com/assets/...` meta URLs together; watch **filename case** on Linux hosts.
- **Sitemap:** When shipping meaningful content updates, update `<lastmod>` in `sitemap.xml`.

---

## Error handling

`showError()` sets loading/error states on hero/list/calendar, and hides `list-month-wrap`, `list-month-nav`, `calendar-wrap` where applicable.

---

## Quick checklist for agents

- [ ] After changing DOM ids, grep for `getElementById` / `querySelector` and update listeners and templates.
- [ ] After changing JSON fields, update row mapping, chips, calendar classes, and any static reference page tables.
- [ ] Test with a **static HTTP server**, not `file://`.
- [ ] If touching month boundaries, verify `listYearMonth` and `calContext.mobileMonth` clamps.
- [ ] If touching chains, verify `chainStartISO` + `formatRantaiBerturutForRow` match product intent.
- [ ] After JSON-LD edits: `npm run validate:jsonld`.
- [ ] After HTML changes: `npm run build` and smoke-test `dist/`.
- [ ] If changing social image: `assets/OgImage.png` + meta dimensions + caches (CDNs/social debuggers).
