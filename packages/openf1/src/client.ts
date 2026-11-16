import { z } from "zod";

/** Pluggable cache (in-memory, Cloudflare KV, …). Values are JSON strings. */
export interface CacheStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export class MemoryCache implements CacheStore {
  private map = new Map<string, { v: string; exp: number }>();
  constructor(private max = 300) {}
  async get(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.exp < Date.now()) { this.map.delete(key); return null; }
    this.map.delete(key); this.map.set(key, e); // LRU touch
    return e.v;
  }
  async put(key: string, v: string, ttlSeconds: number) {
    this.map.set(key, { v, exp: Date.now() + ttlSeconds * 1000 });
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
}

/** Reads through each layer in order and back-fills faster layers on a hit. */
export class LayeredCache implements CacheStore {
  constructor(private layers: CacheStore[]) {}
  async get(key: string) {
    for (let i = 0; i < this.layers.length; i++) {
      const v = await this.layers[i]!.get(key).catch(() => null);
      if (v != null) {
        await Promise.all(this.layers.slice(0, i).map((l) => l.put(key, v, 3600).catch(() => undefined)));
        return v;
      }
    }
    return null;
  }
  async put(key: string, v: string, ttl: number) {
    await Promise.all(this.layers.map((l) => l.put(key, v, ttl).catch(() => undefined)));
  }
}

export class UpstreamError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export interface ClientOptions {
  baseUrl?: string;
  cache?: CacheStore;
  fetchImpl?: typeof fetch;
  /** Minimum gap between upstream requests from this instance (OpenF1 free tier: 3 req/s). */
  minIntervalMs?: number;
  retries?: number;
  timeoutMs?: number;
  /** Longest single wait honoured for a 429 Retry-After; beyond this we fail fast instead of hanging a page. */
  maxRetryWaitMs?: number;
}

type Params = Record<string, string | number | undefined>;

/**
 * Small, typed OpenF1 client.
 * - every response is validated with Zod (bad upstream data never reaches the UI)
 * - requests are serialised and spaced to stay inside the public rate limit
 * - 429 / 5xx / network errors are retried with exponential backoff
 * - identical in-flight requests are de-duplicated
 */
export class OpenF1Client {
  private base: string;
  private cache: CacheStore;
  private fetchImpl: typeof fetch;
  private minInterval: number;
  private retries: number;
  private timeoutMs: number;
  private maxRetryWait: number;
  private queue: Promise<unknown> = Promise.resolve();
  private last = 0;
  private inflight = new Map<string, Promise<unknown>>();

  constructor(o: ClientOptions = {}) {
    this.base = (o.baseUrl ?? "https://api.openf1.org/v1").replace(/\/$/, "");
    this.cache = o.cache ?? new MemoryCache();
    this.fetchImpl = o.fetchImpl ?? ((...a) => fetch(...a));
    this.minInterval = o.minIntervalMs ?? 350;
    this.retries = o.retries ?? 3;
    this.timeoutMs = o.timeoutMs ?? 15000;
    this.maxRetryWait = o.maxRetryWaitMs ?? 4000;
  }

  /** Builds the URL. OpenF1 filter operators (`date>=`) are part of the key, so keys are encoded but `>=`/`<` kept. */
  url(path: string, params: Params): string {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        const m = /^(.*?)(>=|<=|>|<)?$/.exec(k)!;
        return `${encodeURIComponent(m[1]!)}${m[2] ?? "="}${encodeURIComponent(String(v))}`;
      })
      .join("&");
    return `${this.base}/${path}${qs ? `?${qs}` : ""}`;
  }

  /**
   * Cached GET. Entries are stored as `{ d, f }` (data, fresh-until) and kept for at least STALE_KEEP_S.
   * Fresh hit → returned directly. Stale hit → upstream is tried; if upstream fails, the stale copy is
   * served (stale-if-error), so a rate-limited or offline upstream degrades to "slightly old" not "broken".
   */
  async list<T>(path: string, params: Params, schema: z.ZodType<T>, ttlSeconds: number): Promise<T[]> {
    const url = this.url(path, params);
    const hit = await this.cache.get(url).catch(() => null);
    let stale: T[] | null = null;
    if (hit != null) {
      const entry = readEntry(hit);
      const parsed = entry ? z.array(schema).safeParse(entry.d) : null;
      if (entry && parsed?.success) {
        if (entry.f > Date.now()) return parsed.data;
        stale = parsed.data;
      }
    }
    const pending = this.inflight.get(url) as Promise<T[]> | undefined;
    if (pending) return pending;
    const p = this.schedule(() => this.fetchWithRetry(url)).then(async (body) => {
      const parsed = z.array(schema).safeParse(body);
      if (!parsed.success) throw new UpstreamError(`Unexpected response shape from OpenF1 /${path}`);
      const entry = JSON.stringify({ d: parsed.data, f: Date.now() + ttlSeconds * 1000 });
      await this.cache.put(url, entry, Math.max(ttlSeconds, STALE_KEEP_S)).catch(() => undefined);
      return parsed.data;
    }).catch((e) => {
      if (stale) return stale;
      throw e;
    }).finally(() => this.inflight.delete(url));
    this.inflight.set(url, p);
    return p;
  }

  private schedule<R>(fn: () => Promise<R>): Promise<R> {
    const run = this.queue.then(async () => {
      const wait = this.last + this.minInterval - Date.now();
      if (wait > 0) await sleep(wait);
      this.last = Date.now();
    });
    this.queue = run.catch(() => undefined);
    return run.then(fn);
  }

  private async fetchWithRetry(url: string): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
        const res = await this.fetchImpl(url, { headers: { accept: "application/json" }, signal: ctrl.signal }).finally(() => clearTimeout(timer));
        if (res.status === 404) return []; // OpenF1 answers "no results" with 404
        if (res.ok) return await res.json();
        if (res.status !== 429 && res.status < 500) throw new UpstreamError(`OpenF1 responded ${res.status}`, res.status);
        lastErr = new UpstreamError(`OpenF1 responded ${res.status}`, res.status);
        const ra = Number(res.headers.get("retry-after")) * 1000;
        const wait = Number.isFinite(ra) && ra > 0 ? ra : 600 * 2 ** attempt;
        if (wait > this.maxRetryWait) throw new UpstreamError("OpenF1 rate limit reached", 429);
        if (attempt < this.retries) await sleep(wait);
      } catch (e) {
        if (e instanceof UpstreamError && e.status && e.status < 500 && (e.status !== 429 || /rate limit/.test(e.message))) throw e;
        lastErr = e;
        if (attempt < this.retries) await sleep(500 * 2 ** attempt);
      }
    }
    throw lastErr instanceof UpstreamError ? lastErr : new UpstreamError("OpenF1 is unreachable right now");
  }
}

/** How long a cache entry is kept after it stops being fresh, for stale-if-error. */
export const STALE_KEEP_S = 30 * 86400;

function readEntry(raw: string): { d: unknown; f: number } | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return { d: v, f: 0 }; // legacy format: treat as stale
    if (v && typeof v === "object" && "d" in v && "f" in v) return v as { d: unknown; f: number };
  } catch { /* corrupt entry: ignore */ }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
