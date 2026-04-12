# kapanlibur.com — agent reference

Static single-page app for Indonesian national holidays. **One HTML file** ([`index.html`](../index.html)), **JSON data** per year ([`json/2026.json`](../json/2026.json)), no bundler or framework.

Use this doc when changing UI, data shape, or behavior so future edits stay consistent.

---

## Purpose

- Show **today’s holiday status**, **navigable holiday “card”** (next/past in the dataset), **month-scoped upcoming list**, and **year calendar**.
- Copy and labels are **Bahasa Indonesia**.
- “Hari ini” uses the **device date** (`todayISO()`).

---

## Running locally

Data is loaded with `fetch("json/2026.json")`. **Opening `index.html` as `file://` usually fails** (CORS / fetch). Use any static server from the project root, e.g. `npx serve` or `python -m http.server`, then open the served URL.

---

## File layout

| Path | Role |
|------|------|
| `index.html` | All markup, CSS, and JS (IIFE at bottom). |
| `json/YYYY.json` | `{ "source": "<url>", "data": [ ... ] }` — one file per year; app currently loads **`json/2026.json`** (hardcoded in `fetch`). |
| `docs/guide.md` | This reference. |

**CDN:** [`@popperjs/core`](https://popper.js.org/) v2 (`https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js`) loads before the app script. The calendar day dialog (`#cal-popover`) uses `Popper.createPopper` in `openCalPopover` (reference = clicked cell) and `destroy()` in `closeCalPopover`.

---

## JSON row schema (`data[]`)

Each entry is one **calendar day** that counts as holiday/off in the dataset (including weekly **Sabtu** / **Minggu** rows).

| Field | Meaning |
|--------|--------|
| `number` | Sequence in file. |
| `date` | `YYYY-MM-DD` (local calendar semantics; compared as strings for same year). |
| `day` | Indonesian weekday name (e.g. `Jumat`). |
| `description` | Human label (e.g. event name or `Sabtu` / `Minggu`). |
| `type` | `Libur Nasional` \| `Cuti Bersama` \| `Sabtu` \| `Minggu`. |
| `is_long_weekend` | Boolean; long weekend / bridge context. |
| `chain_holidays` | **Length** of the **contiguous** holiday block this row belongs to (not “days from today”). |

**Chains:** `chain_holidays` is shared across consecutive days in the same block. To list **which weekdays** are in the chain, the code walks **backward** from `row.date` while `byDate.get(prev)` exists and `prevRow.chain_holidays === row.chain_holidays`, then lists **N** days from that start (`chainStartISO`, `formatChainWeekdayList`, `formatRantaiBerturutForRow`). Do not assume the chain starts on `row.date`.

Top-level `source` is optional; if present, the header can show a link to the official PDF/SKB.

---

## Main JS modules (conceptual)

All live in the same IIFE in `index.html`:

### Date / text helpers

- `todayISO()` — local date `YYYY-MM-DD`.
- `parseISODate(iso)` — local `Date` (no UTC shift bugs for date-only strings).
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
| `heroContext` | `byDate`, `sortedData`, `selectedIndex` | Hero cards: index into **full** sorted `data` for the navigable card. |
| `listContext` | `sortedData`, `byDate`, `dataYear`, `listYearMonth` | Month filter `YYYY-MM` within `dataYear`. |
| `calContext` | `year`, `byDate`, `mobileMonth` | 0–11 for **mobile** single-month view. |

After load, `heroContext.selectedIndex` is reset to `null` so the first paint picks the **first future** row, or the **last** row if none left in the year.

---

## UI sections (behavior)

### 1. Hero (`#hero-stack`)

Two **separate** `.hero` cards:

1. **Libur hari ini** — Full date, libur/tidak, description, badges (type; LW only if `is_long_weekend`; no “LW Tidak”), rantai line, **Bagikan** (`buildShareTodayText`).
2. **Libur berikutnya / sebelumnya / pada hari ini** — Dynamic title from comparing `selectedRow.date` vs `todayISO`; **dimmed** when `selectedRow.date < today`. Countdown (“Besok” / “N hari lagi”) only when **`selectedRow.date > today`**. Prev/next arrows and swipe on the list area; **Long weekend** chip only when `is_long_weekend`. **Bagikan** uses `buildShareSelectedText`.

Swipe: `attachHeroSwipe` on `#hero-next-nav` — left = next index, right = prev; pointer ignores `pointerType === "touch"` to avoid double-firing with touch events.

### 2. Libur mendatang (`#list`)

- **One month** at a time: `listContext.listYearMonth` = `YYYY-MM` within `dataYear`.
- Shows **all** holidays in that month; rows with `date < today` get **`list-row-past`** (dimmed).
- **Header row**: title + month label + **‹ ›** in `#list-month-nav`; swipe on `#list-swipe-host`.
- Month step: `listMonthStep` (clamp Jan–Dec for that year).

### 3. Kalender (`#calendar-wrap`)

- **Desktop** (`min-width: 641px`): **12** months (`buildMonthGrid` in a loop).
- **Mobile** (`max-width: 640px`): **one** month (`calContext.mobileMonth`), toolbar `#cal-month-toolbar`, swipe on `#calendar-wrap` via `attachCalendarWrapSwipeOnce` (persist listeners — `#calendar` innerHTML is cleared each render).
- **Today** cells get `.is-today`.
- **Holiday cell** click opens **`#cal-popover`** (`openCalPopover`) — **no** scroll-to-list. Close: backdrop, Tutup, Escape.

`matchMedia("(max-width: 640px)")` **change** re-runs `renderCalendar` so layout switches correctly when resizing.

---

## Fetch pipeline

1. `fetch("json/2026.json")` → parse.
2. `data` sorted by `date` string compare.
3. `byDate = Map(date → row)`.
4. `year` = year of first row (label + calendar).
5. `heroContext`, `listContext`, `calContext` filled; `renderMainCard()`, `renderList()`, `renderCalendar()`.
6. `initMonthNavAndPopover()` runs once (after functions exist): list/cal nav buttons, popover close, list swipe, calendar-wrap swipe, **resize listener** for calendar.

---

## Conventions for future changes

- **Strings:** Indonesian UI; escape user/data strings with `escapeHtml` in HTML templates.
- **New calendar year:** Add `json/YYYY.json` and **update the `fetch` path** in `index.html` (or introduce a small config / single entry point if you add multi-year later).
- **Badges:** Sabtu/Minggu type chips are suppressed in hero cards; list still shows type chips.
- **Accessibility:** Nav buttons use `aria-label` / `aria-disabled` when disabled; popover uses `role="dialog"` and Escape to close.
- **CSS:** Design tokens in `:root` and dark mode in `prefers-color-scheme: dark`.

---

## Error handling

`showError()` sets loading/error states on hero/list/calendar states and hides `list-month-wrap`, `list-month-nav`, `calendar-wrap` where applicable.

---

## Quick checklist for agents

- [ ] After changing DOM ids, grep for `getElementById` and update listeners/templates.
- [ ] After changing JSON fields, update any row mapping and chip/calendar class logic.
- [ ] Test with **static server**, not `file://`.
- [ ] If touching month boundaries, verify `listYearMonth` and `calContext.mobileMonth` clamps.
- [ ] If touching chains, verify `chainStartISO` + `formatRantaiBerturutForRow` still match product intent.
