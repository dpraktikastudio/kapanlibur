/**
 * Regenerate script-src / script-src-elem hashes for _headers after changing
 * inline <script> bodies. Run: node scripts/csp-hash-inline-scripts.mjs
 */
import fs from "fs";
import crypto from "crypto";

const files = [
  "index.html",
  "hari-libur-nasional-2026.html",
  "about.html",
  "privacy-policy.html",
];

const re =
  /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

/** Browser-reported hashes (prod may differ slightly from repo whitespace). */
const extra = [
  "sha256-ZUpZIswCAeXmiWoHwf7Gxz0H0/lioaUgePMdITMhlkU=",
  "sha256-a5is/FfCtBo6YGbbGdJLKsZc50D9MHcQTOPlvZITW1c=",
  "sha256-/Kio5IFT7H9kchQMRYxEgZPlxQKp3Ehg0rHmAS/HvIU=",
  "sha256-/S+fcZzEoX1+Tb5dHnygfNe0pZeswMRencbAO/mhAgM=",
];

/** Legacy inline hashes still referenced by deployed CSP. */
const legacy = [
  "sha256-CIiuqstcg3By72dj/yf9Xg9wgHUhb6CDWYbF+FtIFR8=",
  "sha256-pVfxCC1VI5wrQNV48IpNhOLVyCdEobc/LdapU9fhe2A=",
  "sha256-gz47Swv90SpcM5KrYedNP3N9bxbmo59HrHckv6Gkg2A=",
  "sha256-6UqIf9Ht2YFOLrezWknddNGxthKho2itUp4Sr/xsmFs=",
  "sha256-3RisPvxcMRcPxxOERHVrx0GPBir7h8XtCEtXF4aUXlc=",
  "sha256-VRxLWGA+voXC1WJiFJ99woyYO6ypvDZmOL3JrOdMAr0=",
  "sha256-XAYvcZUxONb1B5I3Y7cHKggqnPsxASQ1dBzYyMBXutw=",
];

const seen = new Set();
for (const h of [...legacy, ...extra]) seen.add(h);

for (const f of files) {
  const html = fs.readFileSync(f, "utf8");
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = m[1].trim();
    if (!body) continue;
    const h =
      "sha256-" + crypto.createHash("sha256").update(body, "utf8").digest("base64");
    seen.add(h);
  }
}

const hashes = [...seen].sort();
const hosts =
  "https://cdn.tailwindcss.com https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://cdn.brevo.com https://sibforms.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com";

const part =
  "'self' " +
  hashes.map((h) => `'${h}'`).join(" ") +
  " " +
  hosts;

console.log("script-src " + part + "; script-src-elem " + part + ";");
