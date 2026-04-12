import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;

for (const f of ["index.html", "hari-libur-nasional-2026.html"]) {
  const h = fs.readFileSync(path.join(root, f), "utf8");
  let m;
  let n = 0;
  re.lastIndex = 0;
  while ((m = re.exec(h))) {
    n++;
    JSON.parse(m[1]);
  }
  if (n === 0) throw new Error("No JSON-LD blocks in " + f);
  console.log("JSON-LD OK:", f, n, "blocks");
}
