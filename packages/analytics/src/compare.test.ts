import { describe, expect, it } from "vitest";
import type { TelemetryArtifact, TelemetrySample } from "@apexlab/contracts";
import { alignByDistance, deterministicSummary, interpolateAt, lapDeltaMs, missingSignals, sectorDeltasMs } from "./compare";
import { formatDelta, formatLapTime } from "./format";

const s = (distanceM: number, timeS: number | null, speedKph: number | null, throttlePct: number | null = 50): TelemetrySample =>
  ({ distanceM, timeS, speedKph, throttlePct, brakePct: 0, gear: 4 });

const art = (samples: TelemetrySample[]): TelemetryArtifact => ({
  schemaVersion: 1,
  source: { name: "t", retrievedAt: "2026-01-01T00:00:00Z", rightsStatus: "synthetic-demo" },
  session: { season: 2099, eventKey: "e", sessionKey: "s" },
  driver: { key: "d", abbreviation: "D" },
  lap: { number: 1, lapTimeMs: 1, sector1Ms: null, sector2Ms: null, sector3Ms: null, isValid: true },
  units: { distance: "m", speed: "km/h", throttle: "percent", brake: "percent", time: "seconds-from-lap-start" },
  samples,
});

describe("deltas", () => {
  it("lap delta is B - A", () => {
    expect(lapDeltaMs(90000, 90312)).toBe(312);
    expect(lapDeltaMs(90312, 90000)).toBe(-312);
  });
  it("null when either missing", () => {
    expect(lapDeltaMs(null, 1)).toBeNull();
    expect(sectorDeltasMs([1, null, 3], [2, 5, 1])).toEqual([1, null, -2]);
  });
});

describe("interpolation", () => {
  const samples = [s(0, 0, 100), s(100, 2, 200), s(200, 3, null)];
  it("interpolates linearly", () => {
    expect(interpolateAt(samples, "speedKph", 50).value).toBe(150);
  });
  it("returns null across a gap rather than zero", () => {
    expect(interpolateAt(samples, "speedKph", 150).value).toBeNull();
  });
});

describe("alignByDistance", () => {
  it("aligns by distance, not index", () => {
    // A samples every 100 m; B samples every 50 m, B is slower in time
    const a = art([s(0, 0, 100), s(100, 2, 100), s(200, 4, 100)]);
    const b = art([s(0, 0, 90), s(50, 1.5, 90), s(100, 3, 90), s(150, 4.5, 90), s(200, 6, 90)]);
    const pts = alignByDistance(a, b, { stepM: 50 });
    expect(pts.map((p) => p.distanceM)).toEqual([0, 50, 100, 150, 200]);
    expect(pts.map((p) => p.deltaS)).toEqual([0, 0.5, 1, 1.5, 2]);
    expect(pts[2]?.speedA).toBe(100);
    expect(pts[2]?.speedB).toBe(90);
  });
  it("truncates to the shorter lap", () => {
    const a = art([s(0, 0, 1), s(300, 3, 1)]);
    const b = art([s(0, 0, 1), s(200, 3, 1)]);
    const pts = alignByDistance(a, b, { stepM: 100 });
    expect(pts[pts.length - 1]?.distanceM).toBe(200);
  });
  it("keeps null throttle as null", () => {
    const a = art([s(0, 0, 1, null), s(100, 1, 1, null)]);
    const b = art([s(0, 0, 1, 40), s(100, 1, 1, 60)]);
    const p = alignByDistance(a, b, { stepM: 50 })[1];
    expect(p?.throttleA).toBeNull();
    expect(p?.throttleB).toBe(50);
  });
});

describe("missingSignals / summary / format", () => {
  it("detects wholly missing signals", () => {
    expect(missingSignals(art([s(0, 0, 1, null), s(1, 1, 1, null)]))).toEqual(["throttle"]);
  });
  it("summary names the faster driver and best sector", () => {
    const t = deterministicSummary({ aLabel: "A", bLabel: "B", lapDeltaMs: 300, sectorDeltasMs: [100, 250, -50] });
    expect(t).toContain("A was 0.300 s faster than B");
    expect(t).toContain("sector 2");
  });
  it("formats", () => {
    expect(formatLapTime(90400)).toBe("1:30.400");
    expect(formatLapTime(61005)).toBe("1:01.005");
    expect(formatDelta(312)).toBe("+0.312 s");
    expect(formatDelta(-5)).toBe("−0.005 s");
  });
});
