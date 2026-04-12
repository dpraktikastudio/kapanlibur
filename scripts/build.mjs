import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");

fs.mkdirSync(dist, { recursive: true });

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const out = await minify(html, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: false,
  minifyJS: false,
  keepClosingSlash: true,
});
fs.writeFileSync(path.join(dist, "index.html"), out);

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
