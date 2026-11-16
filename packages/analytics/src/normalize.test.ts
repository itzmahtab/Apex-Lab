import { describe, expect, it } from "vitest";
import type { TelemetryArtifact, TelemetrySample } from "@apexlab/contracts";
import { normalizeLap, type RawCarSample } from "./normalize";
import { alignByDistance, miniSectors, trackMap } from "./compare";

const raw = (t: number, speedKph: number | null): RawCarSample => ({ t, speedKph, throttlePct: 100, brakePct: 0, gear: 7 });
const art = (samples: TelemetrySample[], track?: TelemetryArtifact["track"]): TelemetryArtifact => ({
  schemaVersion: 1,
  source: { name: "t", retrievedAt: "2026-01-01T00:00:00Z", rightsStatus: "unverified" },
  session: { season: 2024, eventKey: "e", sessionKey: "s" },
  driver: { key: "d", abbreviation: "D" },
  lap: { number: 1, lapTimeMs: 1, sector1Ms: null, sector2Ms: null, sector3Ms: null, isValid: null },
  units: { distance: "m", speed: "km/h", throttle: "percent", brake: "boolean", time: "seconds-from-lap-start" },
  samples, track,
});

describe("normalizeLap", () => {
  it("integrates distance from speed and pins the lap boundaries", () => {
    // 36 km/h = 10 m/s constant, 10 s lap => 100 m
    const s = normalizeLap([raw(-0.5, 36), raw(2, 36), raw(5, 36), raw(8, 36), raw(10.4, 36)], 10);
    expect(s[0]).toMatchObject({ distanceM: 0, timeS: 0 });
    expect(s[s.length - 1]).toMatchObject({ distanceM: 100, timeS: 10 });
    expect(s.find((x) => x.timeS === 5)?.distanceM).toBe(50);
  });
  it("adds no distance across a missing-speed gap", () => {
    const s = normalizeLap([raw(-1, 36), raw(1, 36), raw(2, null), raw(3, 36), raw(11, 36)], 10);
    expect(s.every((x, i) => i === 0 || x.distanceM > s[i - 1]!.distanceM)).toBe(true);
    expect(s.some((x) => x.speedKph === null)).toBe(false);
  });
  it("returns [] when there is not enough data", () => {
    expect(normalizeLap([raw(1, 100)], 10)).toEqual([]);
  });
});

describe("length-normalised alignment", () => {
  // Same pace, but B's integrated distance is 2 % long (speed-integration drift)
  const lin = (len: number, dur: number): TelemetrySample[] =>
    Array.from({ length: 11 }, (_, i) => ({ distanceM: (len * i) / 10, timeS: (dur * i) / 10, speedKph: 100, throttlePct: 100, brakePct: 0, gear: 7 }));
  it("makes the finish-line delta equal the lap-time delta", () => {
    const pts = alignByDistance(art(lin(1000, 60)), art(lin(1020, 60.5)), { normalizeLength: true, stepM: 10 });
    expect(pts[pts.length - 1]?.distanceM).toBe(1010);
    expect(pts[pts.length - 1]?.deltaS).toBe(0.5);
  });
  it("without normalisation truncates to the shorter lap (delta at end is wrong)", () => {
    const pts = alignByDistance(art(lin(1000, 60)), art(lin(1020, 60.5)), { stepM: 10 });
    expect(pts[pts.length - 1]?.distanceM).toBe(1000);
    expect(pts[pts.length - 1]?.deltaS).not.toBe(0.5);
  });
});

describe("miniSectors + trackMap", () => {
  const pts = Array.from({ length: 101 }, (_, i) => ({
    distanceM: i * 10, speedA: 1, speedB: 1, throttleA: null, throttleB: null, brakeA: null, brakeB: null,
    // B loses time in the first half, gains it back in the second
    deltaS: i <= 50 ? i * 0.01 : 0.5 - (i - 50) * 0.004,
  }));
  it("credits each mini-sector to the faster driver and sums to the total delta", () => {
    const ms = miniSectors(pts, 4);
    expect(ms.map((m) => m.winner)).toEqual(["a", "a", "b", "b"]);
    expect(ms.reduce((t, m) => t + (m.gainMs ?? 0), 0)).toBe(300);
  });
  it("tags track points with their mini-sector", () => {
    const samples = Array.from({ length: 11 }, (_, i) => ({ distanceM: i * 100, timeS: i, speedKph: 1, throttlePct: 1, brakePct: 0, gear: 1 }));
    const track = Array.from({ length: 21 }, (_, i) => ({ timeS: i / 2, x: i, y: 0 }));
    const map = trackMap(art(samples, track), 1000, miniSectors(pts, 4));
    expect(map?.points[0]?.s).toBe(0);
    expect(map?.points[map.points.length - 1]?.s).toBe(3);
  });
});
