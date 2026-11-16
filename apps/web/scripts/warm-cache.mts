/**
 * Pre-fills the production KV cache with OpenF1 responses, from outside Cloudflare.
 *
 * Why: Workers share egress IPs, so cold OpenF1 requests from the Worker can be rate-limited.
 * Warming means calendars, session lists and featured comparisons never depend on a cold call.
 * Keys are produced by the same OpenF1Client the Worker uses, so they match exactly.
 *
 *   CLOUDFLARE_API_TOKEN=… CF_ACCOUNT_ID=… CF_KV_NAMESPACE_ID=… pnpm warm-cache [--deep]
 *
 * --deep also warms every completed qualifying session (and its top-2 comparison) for the
 * current and previous season.
 */
import { OpenF1Client, OpenF1Repository, type CacheStore } from "@apexlab/openf1";
import type { SessionDetail } from "@apexlab/contracts";
import { FEATURED_SESSIONS } from "../src/server/featured.ts";

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CF_ACCOUNT_ID;
const ns = process.env.CF_KV_NAMESPACE_ID;
if (!token || !account || !ns) throw new Error("CLOUDFLARE_API_TOKEN, CF_ACCOUNT_ID and CF_KV_NAMESPACE_ID are required");
const kvUrl = (k: string) => `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${ns}/values/${encodeURIComponent(k)}`;
const auth = { authorization: `Bearer ${token}` };

let reads = 0, writes = 0;
const kv: CacheStore = {
  async get(k) {
    reads++;
    const r = await fetch(kvUrl(k), { headers: auth });
    return r.ok ? r.text() : null;
  },
  async put(k, v, ttl) {
    const r = await fetch(`${kvUrl(k)}?expiration_ttl=${Math.max(60, ttl)}`, { method: "PUT", headers: auth, body: v });
    if (!r.ok) throw new Error(`KV write failed: ${r.status} ${await r.text()}`);
    writes++;
  },
};

// Slow and patient: this runs offline, so waiting out a rate limit is fine.
const repo = new OpenF1Repository(new OpenF1Client({ cache: kv, minIntervalMs: 1100, retries: 5, maxRetryWaitMs: 70_000 }));
const deep = process.argv.includes("--deep");
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

function fastest(s: SessionDetail, driver: string) {
  return s.laps.filter((l) => l.driverKey === driver && l.lapTimeMs && l.hasTelemetry && !l.isPitOutLap)
    .sort((a, b) => a.lapTimeMs! - b.lapTimeMs!)[0];
}
async function comparison(sessionKey: string, a?: string, b?: string) {
  const s = await repo.getSession(sessionKey);
  if (!s) return log("  missing session", sessionKey);
  const board = s.drivers.map((d) => ({ d, l: fastest(s, d.key) })).filter((x) => x.l).sort((x, y) => x.l!.lapTimeMs! - y.l!.lapTimeMs!);
  const A = a ?? board[0]?.d.key, B = b ?? board.find((x) => x.d.key !== A)?.d.key;
  const la = A && fastest(s, A), lb = B && fastest(s, B);
  if (!la || !lb) return log("  no comparable laps", sessionKey);
  await repo.getLapTelemetry(sessionKey, A!, la.lapNumber);
  await repo.getLapTelemetry(sessionKey, B!, lb.lapNumber, { withTrack: false });
  log(`  ${s.event.name} ${s.event.year} ${s.session.name}: ${A} L${la.lapNumber} vs ${B} L${lb.lapNumber}`);
}

const t0 = Date.now();
log("featured comparisons");
for (const f of FEATURED_SESSIONS) await comparison(f.session, f.a, f.b);

log("calendars and session lists");
const years = repo.listSeasons();
const quali: { key: string; year: number }[] = [];
for (const y of years) {
  const events = await repo.listEvents(y);
  log(`  ${y}: ${events.length} events`);
  for (const e of events) {
    const ev = await repo.getEvent(e.key);
    for (const s of ev?.sessions ?? []) if (s.name === "Qualifying" && s.status === "completed") quali.push({ key: s.key, year: y });
  }
  await repo.latestSession(y, "Qualifying");
}

if (deep) {
  const recent = new Set(years.slice(0, 2));
  log("deep: qualifying sessions for", [...recent].join(", "));
  for (const q of quali.filter((x) => recent.has(x.year))) await comparison(q.key).catch((e) => log("  failed", q.key, String(e)));
}
log(`done in ${Math.round((Date.now() - t0) / 1000)} s · KV reads ${reads} · writes ${writes}`);
