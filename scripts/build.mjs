import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

fs.mkdirSync(dist, { recursive: true });

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
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const out = await minify(html, minifyOpts);
  fs.writeFileSync(path.join(dist, page), out);
}

fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
fs.cpSync(path.join(root, "json"), path.join(dist, "json"), { recursive: true });

for (const f of [
  "manifest.json",
  "robots.txt",
  "sitemap.xml",
  "_headers",
  "og-image.png",
  "og-image.html",
  "icon.svg",
]) {
  fs.copyFileSync(path.join(root, f), path.join(dist, f));
}

console.log("Built dist/");
