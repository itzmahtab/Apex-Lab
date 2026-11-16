// Bundles data/fixtures/demo into one JSON module so the app runs on runtimes without a filesystem (Cloudflare Workers).
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const root = new URL("../data/fixtures/demo/", import.meta.url).pathname;
const out = { catalog: JSON.parse(readFileSync(join(root, "catalog.json"), "utf8")), artifacts: {} };
for (const s of readdirSync(join(root, "artifacts"))) for (const f of readdirSync(join(root, "artifacts", s)).filter((x) => x.endsWith(".json")).sort())
  out.artifacts[`${s}/${f.replace(/\.json$/, "")}`] = JSON.parse(readFileSync(join(root, "artifacts", s, f), "utf8"));
writeFileSync(new URL("../apps/web/src/server/fixtures.bundle.json", import.meta.url), JSON.stringify(out));
console.log("bundled", Object.keys(out.artifacts).length, "artifacts");
