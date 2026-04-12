# Kapan Libur

Static site for Indonesian national holidays and collective leave (“cuti bersama”)—interactive calendar and lists on the home page, a full reference page, and legal/info pages. UI copy is **Bahasa Indonesia**.

- **Live:** [kapanlibur.com](https://kapanlibur.com/)

## Tech

- Plain HTML, CSS, and client-side JavaScript (no bundler or framework).
- Holiday data: `json/YYYY.json` (see [`docs/guide.md`](docs/guide.md) for schema and behavior).
- Production build minifies selected HTML into `dist/` and copies assets, JSON, and SEO files.

## Requirements

- **Node.js** (for `npm run build` and validation scripts).

## Scripts

| Command | Description |
|--------|-------------|
| `npm run build` | Minify HTML into `dist/`, copy `assets/`, `json/`, `manifest.json`, `robots.txt`, `sitemap.xml`, etc. |
| `npm run validate:jsonld` | Validate JSON-LD blocks in `index.html` and `hari-libur-nasional-2026.html`. |

## Running locally

The app loads data with `fetch("json/2026.json")`. Opening `index.html` directly as `file://` usually fails; serve the project root over HTTP instead, for example:

```bash
npx serve .
```

Then open the URL shown in the terminal.

## Project layout (short)

| Path | Role |
|------|------|
| `index.html` | Interactive UI (hero, monthly list, calendar, popover). |
| `hari-libur-nasional-2026.html` | Static reference tables and copy. |
| `about.html`, `privacy-policy.html` | About and privacy policy. |
| `assets/non-critical.css` | Shared layout and component styles. |
| `assets/site-nav.js` | Mobile drawer menu for the main site nav (hamburger + backdrop). |
| `assets/site-pdf.js` | Sets official PDF links from JSON `source` on `a[data-pdf-source]`. |
| `json/2026.json` | Source URL + per-day holiday rows. |
| `scripts/build.mjs` | Build pipeline. |
| `docs/guide.md` | Detailed notes for contributors (UI, fetch pipeline, JSON fields). |
