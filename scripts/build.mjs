import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

/** Content-addressed ?v= for static assets (cache bust without manual bumps). */
function shortHash(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
}

const BUST_ASSETS = [
  "non-critical.css",
  "tailwind.css",
  "site-chrome.css",
  "site-newsletter.css",
  "site-holiday-list.css",
  "site-analytics.js",
  "site-nav.js",
  "site-theme.js",
  "site-pdf.js",
  "site-newsletter.js",
  "site-home-hero.js",
  "site-cuti-optimizer.js",
  "Logo-no-bg.png",
  "kalender-libur-indonesia-2026.ics",
  "favicon.ico",
  "favicon-32x32.png",
  "favicon-16x16.png",
  "apple-touch-icon.png",
];

const JSON_YEARS = ["2026", "2027"];

function bustHtml(html, assetHashes, jsonHashes) {
  let out = html;
  for (const name of BUST_ASSETS) {
    const h = assetHashes[name];
    const base = `/assets/${name}`;
    out = out.split(base).join(`${base}?v=${h}`);
  }
  for (const year of JSON_YEARS) {
    const jsonPath = `/json/${year}.json`;
    out = out.split(jsonPath).join(`${jsonPath}?v=${jsonHashes[year]}`);
  }
  return out;
}

function patchJsonPathsInJs(js, jsonHashes) {
  let out = js;
  for (const year of JSON_YEARS) {
    const jsonPath = `/json/${year}.json`;
    out = out.split(jsonPath).join(`${jsonPath}?v=${jsonHashes[year]}`);
  }
  return out;
}

fs.mkdirSync(dist, { recursive: true });

const assetHashes = Object.fromEntries(
  BUST_ASSETS.map((name) => [
    name,
    shortHash(path.join(root, "assets", name)),
  ]),
);
const jsonHashes = Object.fromEntries(
  JSON_YEARS.map((year) => [
    year,
    shortHash(path.join(root, "json", `${year}.json`)),
  ]),
);

for (const stale of ["icon.svg", "og-image.png"]) {
  const stalePath = path.join(dist, stale);
  if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath);
}

const minifyOpts = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: false,
  minifyJS: false,
  keepClosingSlash: true,
};
for (const page of [
  "index.html",
  "hari-libur-nasional-2026.html",
  "hari-libur-nasional-2027.html",
  "peta-liburan.html",
  "about.html",
  "privacy-policy.html",
]) {
  const raw = fs.readFileSync(path.join(root, page), "utf8");
  const busted = bustHtml(raw, assetHashes, jsonHashes);
  const out = await minify(busted, minifyOpts);
  fs.writeFileSync(path.join(dist, page), out);
}

fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
fs.cpSync(path.join(root, "json"), path.join(dist, "json"), { recursive: true });

const heroJsPath = path.join(dist, "assets", "site-home-hero.js");
fs.writeFileSync(
  heroJsPath,
  patchJsonPathsInJs(fs.readFileSync(heroJsPath, "utf8"), jsonHashes),
);

for (const f of [
  "manifest.json",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "og-image.html",
]) {
  fs.copyFileSync(path.join(root, f), path.join(dist, f));
}

console.log("Built dist/");
