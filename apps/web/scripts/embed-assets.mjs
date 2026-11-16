// Embeds .open-next/assets into a module so the Worker can serve static files itself (no Workers Assets upload needed).
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
const dir = ".open-next/assets";
const types = { js: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", map: "application/json" };
const out = {};
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const ext = f.split(".").pop();
    out["/" + relative(dir, p)] = { type: types[ext] ?? "text/plain; charset=utf-8", body: readFileSync(p, "utf8") };
  }
})(dir);
writeFileSync(".open-next/embedded-assets.json", JSON.stringify(out));
console.log("embedded", Object.keys(out).length, "assets");
