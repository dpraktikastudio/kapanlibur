import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const h = fs.readFileSync(path.join(root, "index.html"), "utf8");
const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
let m;
let n = 0;
while ((m = re.exec(h))) {
  n++;
  JSON.parse(m[1]);
}
if (n === 0) throw new Error("No JSON-LD blocks found");
console.log("JSON-LD OK:", n, "blocks");
