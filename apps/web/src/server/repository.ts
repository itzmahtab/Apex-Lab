import "server-only";
import {
  artifactSchema, catalogSchema, ARTIFACT_SCHEMA_VERSION, keySchema,
  type EventSummary, type SessionDetail, type SessionSummary, type TelemetryArtifact,
} from "@apexlab/contracts";
import { LayeredCache, MemoryCache, OpenF1Client, OpenF1Repository, UpstreamError, type CacheStore } from "@apexlab/openf1";
import { env } from "@/env";
import { AppError } from "./errors";
import bundle from "./fixtures.bundle.json";

/**
 * Data access boundary. Pages and API routes depend on this interface only.
 * It is lazy (season → events → sessions → session detail → lap telemetry) because a
 * real-data catalog is far too large to load at once.
 */
export interface Repository {
  listSeasons(): Promise<number[]>;
  listEvents(year: number): Promise<EventSummary[]>;
  getEvent(eventKey: string): Promise<{ event: EventSummary; sessions: SessionSummary[] } | null>;
  getSession(sessionKey: string): Promise<SessionDetail | null>;
  getLapTelemetry(sessionKey: string, driverKey: string, lap: number, opts?: { withTrack?: boolean }): Promise<TelemetryArtifact | null>;
  latestSession(sessionName: string): Promise<SessionSummary | null>;
}

// ---------------- Synthetic demo fixtures (offline, deterministic) ----------------

export const DEMO_PREFIX = "demo-";
const catalog = catalogSchema.parse(bundle.catalog);

export class FixtureRepository implements Repository {
  async listSeasons() { return catalog.seasons.map((s) => s.year); }
  private event(key: string): EventSummary | null {
    const e = catalog.events.find((x) => x.key === key);
    const season = catalog.seasons.find((s) => s.eventKeys.includes(key));
    if (!e || !season) return null;
    return {
      key: e.key, year: season.year, name: e.name, officialName: null, countryName: null, countryCode: e.countryCode,
      circuitName: e.circuitName, location: "Synthetic", startDate: null, endDate: null, isTesting: false,
    };
  }
  private session(key: string): SessionSummary | null {
    const s = catalog.sessions.find((x) => x.key === key);
    return s ? { key: s.key, eventKey: s.eventKey, name: s.name, sessionType: s.sessionType, startDate: null, endDate: null, status: "completed" } : null;
  }
  async listEvents(year: number) {
    const season = catalog.seasons.find((s) => s.year === year);
    return (season?.eventKeys ?? []).map((k) => this.event(k)).filter((e): e is EventSummary => !!e);
  }
  async getEvent(key: string) {
    const event = this.event(key);
    if (!event) return null;
    const e = catalog.events.find((x) => x.key === key)!;
    return { event, sessions: e.sessionKeys.map((k) => this.session(k)).filter((s): s is SessionSummary => !!s) };
  }
  async getSession(key: string): Promise<SessionDetail | null> {
    const s = catalog.sessions.find((x) => x.key === key);
    const summary = this.session(key);
    const event = s && this.event(s.eventKey);
    if (!s || !summary || !event) return null;
    return { session: summary, event, drivers: s.drivers, laps: s.laps, stints: [], source: s.source };
  }
  async latestSession() { return this.session(catalog.sessions[0]!.key); }
  async getLapTelemetry(sessionKey: string, driverKey: string, lap: number) {
    const s = keySchema.parse(sessionKey), d = keySchema.parse(driverKey);
    const raw = (bundle.artifacts as Record<string, unknown>)[`${s}/${d}-lap${lap}`];
    if (raw === undefined) return null;
    if ((raw as { schemaVersion?: unknown }).schemaVersion !== ARTIFACT_SCHEMA_VERSION)
      throw new AppError("UNSUPPORTED_ARTIFACT_VERSION", "This telemetry artifact needs to be reprocessed.");
    const parsed = artifactSchema.safeParse(raw);
    if (!parsed.success) throw new AppError("TELEMETRY_UNAVAILABLE", "Telemetry for this lap failed validation.");
    return parsed.data;
  }
}

// ---------------- OpenF1 (real data) ----------------

interface KVLike { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void> }

/** Cloudflare KV, when the Worker has an OPENF1_CACHE binding. Absent locally — then memory only. */
async function kvCache(): Promise<CacheStore | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const kv = (getCloudflareContext().env as { OPENF1_CACHE?: KVLike }).OPENF1_CACHE;
    if (!kv) return null;
    return {
      get: (k) => kv.get(k),
      put: (k, v, ttl) => kv.put(k, v, { expirationTtl: Math.max(60, ttl) }),
    };
  } catch {
    return null;
  }
}

/**
 * Local-development disk cache (set OPENF1_CACHE_DIR). Keeps repeated dev runs off the OpenF1 rate limit.
 * Never used on Workers, which have no writable filesystem.
 */
async function fsCache(): Promise<CacheStore | null> {
  const dir = process.env.OPENF1_CACHE_DIR;
  if (!dir) return null;
  const [{ mkdir, readFile, writeFile }, { createHash }, { join }] = await Promise.all([import("node:fs/promises"), import("node:crypto"), import("node:path")]);
  const file = (k: string) => join(dir, createHash("sha256").update(k).digest("hex").slice(0, 32) + ".json");
  return {
    async get(k) {
      try {
        const { exp, v } = JSON.parse(await readFile(file(k), "utf8")) as { exp: number; v: string };
        return exp > Date.now() ? v : null;
      } catch { return null; }
    },
    async put(k, v, ttl) {
      await mkdir(dir, { recursive: true });
      await writeFile(file(k), JSON.stringify({ exp: Date.now() + ttl * 1000, v }));
    },
  };
}

const memory = new MemoryCache(400);

/** Workers' waitUntil, so background cache refreshes finish after the response is sent. */
async function waitUntilHook(): Promise<((p: Promise<unknown>) => void) | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext().ctx as { waitUntil?: (p: Promise<unknown>) => void } | undefined;
    return ctx?.waitUntil ? (p) => ctx.waitUntil!(p) : undefined;
  } catch {
    return undefined;
  }
}
let openf1: OpenF1Repository | undefined;
async function openF1(): Promise<OpenF1Repository> {
  // KV is request-scoped on Workers, so the layered cache is rebuilt per call; the memory layer is shared.
  const durable = (await kvCache()) ?? (await fsCache());
  if (!durable) return (openf1 ??= new OpenF1Repository(new OpenF1Client({ cache: memory, staleWhileRevalidate: true })));
  return new OpenF1Repository(new OpenF1Client({ cache: new LayeredCache([memory, durable]), staleWhileRevalidate: true, waitUntil: await waitUntilHook() }));
}

/** Direct access to the OpenF1 adapter, for season-hub data that sits outside the Repository interface. */
export const openF1Repository = openF1;

/**
 * Jolpica (the community successor to the Ergast API): calendar, classifications and standings.
 * Shares the cache layers with OpenF1. Create one client per page render and reuse it, so its
 * request queue keeps calls spaced inside Jolpica's limits (4 req/s burst, 500 req/h).
 */
let jolpica: OpenF1Client | undefined;
export async function jolpicaClient(): Promise<OpenF1Client> {
  const opts = { baseUrl: "https://api.jolpi.ca/ergast/f1", minIntervalMs: 400, notFoundAsEmpty: false, timeoutMs: 10000, retries: 4, retryStatuses: [403],
    userAgent: "ApexLab/1.0 (+https://github.com/itzmahtab/apex-lab)" };
  const durable = (await kvCache()) ?? (await fsCache());
  if (!durable) return (jolpica ??= new OpenF1Client({ ...opts, cache: memory, staleWhileRevalidate: true }));
  return new OpenF1Client({ ...opts, cache: new LayeredCache([memory, durable]), staleWhileRevalidate: true, waitUntil: await waitUntilHook() });
}

/** Converts upstream failures into a stable, user-safe error. */
async function upstream<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UpstreamError) {
      console.error("[apexlab] openf1", e.message);
      throw new AppError("UPSTREAM_UNAVAILABLE", e.status === 429
        ? "OpenF1's free API is rate-limiting requests right now. Please try again in about a minute."
        : "The live data source (OpenF1) is not responding. Please try again in a moment.");
    }
    throw e;
  }
}

export class OpenF1BackedRepository implements Repository {
  async listSeasons() { return (await openF1()).listSeasons(); }
  async listEvents(year: number) { return upstream(async () => (await openF1()).listEvents(year)); }
  async getEvent(key: string) { return upstream(async () => (await openF1()).getEvent(key)); }
  async getSession(key: string) { return upstream(async () => (await openF1()).getSession(key)); }
  async getLapTelemetry(s: string, d: string, lap: number, o?: { withTrack?: boolean }) { return upstream(async () => (await openF1()).getLapTelemetry(s, d, lap, o)); }
  async latestSession(name: string) {
    return upstream(async () => {
      const r = await openF1();
      for (const y of r.listSeasons()) { const s = await r.latestSession(y, name); if (s) return s; }
      return null;
    });
  }
}

/** Real data by default; any key starting with "demo-" is served from the offline fixtures. */
class RoutedRepository implements Repository {
  constructor(private real: Repository, private demo: Repository) {}
  private pick = (key: string) => (key.startsWith(DEMO_PREFIX) ? this.demo : this.real);
  listSeasons() { return this.real.listSeasons(); }
  listEvents(year: number) { return this.real.listEvents(year); }
  getEvent(k: string) { return this.pick(k).getEvent(k); }
  getSession(k: string) { return this.pick(k).getSession(k); }
  getLapTelemetry(s: string, d: string, lap: number, o?: { withTrack?: boolean }) { return this.pick(s).getLapTelemetry(s, d, lap, o); }
  latestSession(name: string) { return this.real.latestSession(name); }
}

let repo: Repository | undefined;
export function getRepository(): Repository {
  return (repo ??= env().DATA_SOURCE === "fixture" ? new FixtureRepository() : new RoutedRepository(new OpenF1BackedRepository(), new FixtureRepository()));
}
