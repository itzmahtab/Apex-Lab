import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LayeredCache, MemoryCache, OpenF1Client, UpstreamError } from "./client";
import { toDrivers, toLaps, sessionStatus } from "./adapter";

const row = z.object({ n: z.number() });
const res = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function client(responses: Response[], extra = {}) {
  const fetchImpl = vi.fn(async () => responses.shift() ?? res(500, {}));
  return { c: new OpenF1Client({ fetchImpl: fetchImpl as unknown as typeof fetch, minIntervalMs: 0, retries: 2, ...extra }), fetchImpl };
}

describe("OpenF1Client", () => {
  it("keeps filter operators in the URL", () => {
    const { c } = client([]);
    expect(c.url("car_data", { session_key: 1, "date>": "2024-01-01T00:00:00.000Z", x: undefined }))
      .toBe("https://api.openf1.org/v1/car_data?session_key=1&date>2024-01-01T00%3A00%3A00.000Z");
  });
  it("validates, caches and de-duplicates", async () => {
    const { c, fetchImpl } = client([res(200, [{ n: 1, extra: true }])]);
    const [a, b] = await Promise.all([c.list("x", {}, row, 60), c.list("x", {}, row, 60)]);
    expect(a).toEqual([{ n: 1 }]);
    expect(b).toEqual(a);
    expect(await c.list("x", {}, row, 60)).toEqual(a);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("treats 404 as an empty result", async () => {
    const { c } = client([res(404, { detail: "No results found." })]);
    expect(await c.list("x", {}, row, 60)).toEqual([]);
  });
  it("retries 5xx then succeeds", async () => {
    const { c, fetchImpl } = client([res(502, {}), res(200, [{ n: 2 }])]);
    expect(await c.list("x", {}, row, 60)).toEqual([{ n: 2 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("fails fast on a long rate-limit wait instead of hanging", async () => {
    const { c, fetchImpl } = client([res(429, {}, { "retry-after": "60" })]);
    await expect(c.list("x", {}, row, 60)).rejects.toMatchObject({ status: 429 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("rejects unexpected shapes", async () => {
    const { c } = client([res(200, [{ n: "nope" }])]);
    await expect(c.list("x", {}, row, 60)).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("stale-if-error", () => {
  it("serves a stale copy when upstream fails, and refreshes when it works", async () => {
    const cache = new MemoryCache();
    const url = "https://api.openf1.org/v1/x";
    await cache.put(url, JSON.stringify({ d: [{ n: 1 }], f: Date.now() - 1 }), 60);
    const failing = client([res(503, {}), res(503, {}), res(503, {})], { cache });
    expect(await failing.c.list("x", {}, row, 60)).toEqual([{ n: 1 }]);
    const ok = client([res(200, [{ n: 2 }])], { cache });
    expect(await ok.c.list("x", {}, row, 60)).toEqual([{ n: 2 }]);
    expect(JSON.parse((await cache.get(url))!).d).toEqual([{ n: 2 }]);
  });
  it("with staleWhileRevalidate, answers from the stale copy at once and refreshes in the background", async () => {
    const cache = new MemoryCache();
    const url = "https://api.openf1.org/v1/x";
    await cache.put(url, JSON.stringify({ d: [{ n: 1 }], f: Date.now() - 1 }), 60);
    const bg: Promise<unknown>[] = [];
    const { c, fetchImpl } = client([res(200, [{ n: 2 }])], { cache, staleWhileRevalidate: true, waitUntil: (p: Promise<unknown>) => bg.push(p) });
    expect(await c.list("x", {}, row, 60)).toEqual([{ n: 1 }]);
    expect(bg).toHaveLength(1);
    await Promise.all(bg);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await c.list("x", {}, row, 60)).toEqual([{ n: 2 }]);
  });
  it("still errors when there is nothing cached", async () => {
    const { c } = client([res(429, {}, { "retry-after": "60" })]);
    await expect(c.list("x", {}, row, 60)).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe("caches", () => {
  it("memory cache expires and evicts", async () => {
    const m = new MemoryCache(2);
    await m.put("a", "1", 60); await m.put("b", "2", 60); await m.put("c", "3", 60);
    expect(await m.get("a")).toBeNull();
    expect(await m.get("c")).toBe("3");
    await m.put("d", "4", -1);
    expect(await m.get("d")).toBeNull();
  });
  it("layered cache back-fills faster layers", async () => {
    const fast = new MemoryCache(), slow = new MemoryCache();
    await slow.put("k", "v", 60);
    expect(await new LayeredCache([fast, slow]).get("k")).toBe("v");
    expect(await fast.get("k")).toBe("v");
  });
});

describe("adapter mapping", () => {
  it("maps laps to integer milliseconds and keeps missing values null", () => {
    const [l] = toLaps([{ driver_number: 16, lap_number: 25, date_start: "2024-05-25T14:50:00Z", lap_duration: 70.27, duration_sector_1: 18.4, duration_sector_2: null, duration_sector_3: 18.9, is_pit_out_lap: false }],
      [{ driver_number: 16, stint_number: 4, lap_start: 20, lap_end: 26, compound: "SOFT", tyre_age_at_start: 0 }]);
    expect(l).toMatchObject({ driverKey: "16", lapTimeMs: 70270, sector2Ms: null, compound: "SOFT", hasTelemetry: true, isValid: null });
  });
  it("dedupes drivers and validates team colours", () => {
    const d = toDrivers([
      { driver_number: 1, name_acronym: "VER", full_name: "Max VERSTAPPEN", first_name: "Max", last_name: "Verstappen", team_name: "Red Bull Racing", team_colour: "3671c6" },
      { driver_number: 1, name_acronym: "VER", full_name: null, team_name: null, team_colour: null },
      { driver_number: 99, name_acronym: null, full_name: null, team_name: null, team_colour: "not-a-colour" },
    ]);
    expect(d).toHaveLength(2);
    expect(d.find((x) => x.key === "1")).toMatchObject({ displayName: "Max Verstappen", teamColour: "3671C6" });
    expect(d.find((x) => x.key === "99")).toMatchObject({ abbreviation: "#99", teamColour: null });
  });
  it("derives session status from dates", () => {
    const now = Date.parse("2026-06-01T12:00:00Z");
    expect(sessionStatus("2026-05-01T00:00:00Z", "2026-05-01T01:00:00Z", now)).toBe("completed");
    expect(sessionStatus("2026-06-01T11:00:00Z", "2026-06-01T13:00:00Z", now)).toBe("live");
    expect(sessionStatus("2026-07-01T00:00:00Z", "2026-07-01T01:00:00Z", now)).toBe("upcoming");
  });
});

describe("OpenF1Client.get (generic JSON, used for Jolpica)", () => {
  const obj = z.object({ MRData: z.object({ total: z.string() }) });
  it("validates object responses and sends the configured user agent", async () => {
    const { c, fetchImpl } = client([res(200, { MRData: { total: "3" } })], { userAgent: "Test/1.0" });
    expect(await c.get("current.json", {}, obj, 60)).toEqual({ MRData: { total: "3" } });
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>)["user-agent"]).toBe("Test/1.0");
  });
  it("retries opted-in statuses (403 burst shedding) and otherwise fails fast", async () => {
    const a = client([res(403, {}), res(200, { MRData: { total: "1" } })], { retryStatuses: [403] });
    expect(await a.c.get("x", {}, obj, 60)).toEqual({ MRData: { total: "1" } });
    expect(a.fetchImpl).toHaveBeenCalledTimes(2);
    const b = client([res(403, {})]);
    await expect(b.c.get("x", {}, obj, 60)).rejects.toMatchObject({ status: 403 });
    expect(b.fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("does not turn a 404 into [] when notFoundAsEmpty is off", async () => {
    const { c } = client([res(404, {})], { notFoundAsEmpty: false });
    await expect(c.get("x", {}, obj, 60)).rejects.toBeInstanceOf(UpstreamError);
  });
});
