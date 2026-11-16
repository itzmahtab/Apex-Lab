// Embeds .open-next/assets into a module so the Worker can serve static files itself (no Workers Assets upload needed).
// Text files are stored as-is; binary files (fonts, images) as base64.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
const dir = ".open-next/assets";
const types = {
  js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", map: "application/json",
  woff2: "font/woff2", woff: "font/woff", png: "image/png", svg: "image/svg+xml", ico: "image/x-icon", webp: "image/webp",
};
const binary = new Set(["woff2", "woff", "png", "ico", "webp"]);
const out = {};
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const ext = f.split(".").pop();
    const bin = binary.has(ext);
    out["/" + relative(dir, p)] = { type: types[ext] ?? "text/plain; charset=utf-8", b64: bin, body: readFileSync(p, bin ? "base64" : "utf8") };
  }
})(dir);
writeFileSync(".open-next/embedded-assets.json", JSON.stringify(out));
console.log("embedded", Object.keys(out).length, "assets");
