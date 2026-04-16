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

function bustHtml(html, assetHashes, jsonHash) {
  let out = html;
  for (const name of BUST_ASSETS) {
    const h = assetHashes[name];
    const base = `/assets/${name}`;
    out = out.split(base).join(`${base}?v=${h}`);
  }
  const jsonPath = "/json/2026.json";
  out = out.split(jsonPath).join(`${jsonPath}?v=${jsonHash}`);
  return out;
}

function patchSitePdfJs(js, jsonHash) {
  const jsonPath = "/json/2026.json";
  return js.split(jsonPath).join(`${jsonPath}?v=${jsonHash}`);
}

fs.mkdirSync(dist, { recursive: true });

const assetHashes = Object.fromEntries(
  BUST_ASSETS.map((name) => [
    name,
    shortHash(path.join(root, "assets", name)),
  ]),
);
const jsonHash = shortHash(path.join(root, "json", "2026.json"));

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
  "about.html",
  "privacy-policy.html",
]) {
  const raw = fs.readFileSync(path.join(root, page), "utf8");
  const busted = bustHtml(raw, assetHashes, jsonHash);
  const out = await minify(busted, minifyOpts);
  fs.writeFileSync(path.join(dist, page), out);
}

fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
fs.cpSync(path.join(root, "json"), path.join(dist, "json"), { recursive: true });

const pdfJsPath = path.join(dist, "assets", "site-pdf.js");
fs.writeFileSync(
  pdfJsPath,
  patchSitePdfJs(fs.readFileSync(pdfJsPath, "utf8"), jsonHash),
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
