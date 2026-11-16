import {
  CALCULATION_VERSION,
  type ChartPoint,
  type MiniSector,
  type TelemetryArtifact,
  type TelemetrySample,
  type TrackMap,
} from "@apexlab/contracts";

/** Sign convention: delta = B - A. Positive means B was slower than A. */
export function lapDeltaMs(aMs: number | null, bMs: number | null): number | null {
  return aMs == null || bMs == null ? null : bMs - aMs;
}

export function sectorDeltasMs(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
): [number | null, number | null, number | null] {
  const d = (i: number) => lapDeltaMs(a[i] ?? null, b[i] ?? null);
  return [d(0), d(1), d(2)];
}

type NumericKey = "timeS" | "speedKph" | "throttlePct" | "brakePct" | "gear";

/**
 * Linear interpolation of one signal at distance `x`. Returns null when either
 * bracketing sample lacks the signal (never fabricates values across gaps).
 * Samples must be sorted by distance; the caller guarantees this.
 */
export function interpolateAt(
  samples: readonly TelemetrySample[],
  key: NumericKey,
  x: number,
  hint = 0,
): { value: number | null; hint: number } {
  let i = Math.min(hint, samples.length - 2);
  while (i > 0 && (samples[i]?.distanceM ?? 0) > x) i--;
  while (i < samples.length - 2 && (samples[i + 1]?.distanceM ?? 0) < x) i++;
  const lo = samples[i];
  const hi = samples[i + 1];
  if (!lo || !hi) return { value: null, hint: i };
  const lv = lo[key];
  const hv = hi[key];
  if (lv == null || hv == null) return { value: null, hint: i };
  const span = hi.distanceM - lo.distanceM;
  const t = span === 0 ? 0 : Math.min(1, Math.max(0, (x - lo.distanceM) / span));
  return { value: lv + (hv - lv) * t, hint: i };
}

export function isStrictlyIncreasingDistance(samples: readonly TelemetrySample[]): boolean {
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i]?.distanceM ?? 0) <= (samples[i - 1]?.distanceM ?? 0)) return false;
  }
  return true;
}

const round = (v: number | null, dp: number): number | null =>
  v == null ? null : Math.round(v * 10 ** dp) / 10 ** dp;

export interface AlignOptions {
  /** Grid spacing in metres. Defaults to lapLength / 600 (at least 2 m). */
  stepM?: number;
  /**
   * Scale both laps to their mean length before aligning. Needed when distance is
   * integrated from speed: two laps of the same circuit then differ by ~0.5–2 %.
   * Without it the delta at the line would not equal the lap-time delta.
   */
  normalizeLength?: boolean;
}

function scaled(samples: readonly TelemetrySample[], factor: number): TelemetrySample[] {
  return factor === 1 ? (samples as TelemetrySample[]) : samples.map((s) => ({ ...s, distanceM: s.distanceM * factor }));
}

export function lapLength(a: TelemetryArtifact, b: TelemetryArtifact, normalize: boolean): number {
  const maxA = a.samples[a.samples.length - 1]?.distanceM ?? 0;
  const maxB = b.samples[b.samples.length - 1]?.distanceM ?? 0;
  return normalize ? (maxA + maxB) / 2 : Math.min(maxA, maxB);
}

/**
 * Align two laps on a shared distance axis. Samples are NOT compared by index.
 * Interpolation is deterministic linear; gaps stay null.
 */
export function alignByDistance(a: TelemetryArtifact, b: TelemetryArtifact, opts: AlignOptions = {}): ChartPoint[] {
  const normalize = opts.normalizeLength ?? false;
  const maxA = a.samples[a.samples.length - 1]?.distanceM ?? 0;
  const maxB = b.samples[b.samples.length - 1]?.distanceM ?? 0;
  const end = lapLength(a, b, normalize);
  const sa = scaled(a.samples, normalize && maxA > 0 ? end / maxA : 1);
  const sb = scaled(b.samples, normalize && maxB > 0 ? end / maxB : 1);
  const stepM = opts.stepM ?? Math.max(2, Math.round(end / 600));
  const grid: number[] = [];
  for (let d = 0; d < end; d += stepM) grid.push(d);
  if (grid[grid.length - 1] !== end) grid.push(end);
  const keys: NumericKey[] = ["speedKph", "timeS", "throttlePct", "brakePct", "gear"];
  const hA: Record<string, number> = {}, hB: Record<string, number> = {};
  const at = (s: TelemetrySample[], h: Record<string, number>, k: NumericKey, d: number) => {
    const r = interpolateAt(s, k, d, h[k] ?? 0);
    h[k] = r.hint;
    return r.value;
  };
  return grid.map((d) => {
    const v = Object.fromEntries(keys.flatMap((k) => [[`${k}A`, at(sa, hA, k, d)], [`${k}B`, at(sb, hB, k, d)]])) as Record<string, number | null>;
    const tA = v.timeSA ?? null, tB = v.timeSB ?? null;
    return {
      distanceM: round(d, 1) ?? 0,
      speedA: round(v.speedKphA ?? null, 1),
      speedB: round(v.speedKphB ?? null, 1),
      throttleA: round(v.throttlePctA ?? null, 1),
      throttleB: round(v.throttlePctB ?? null, 1),
      brakeA: round(v.brakePctA ?? null, 1),
      brakeB: round(v.brakePctB ?? null, 1),
      // gear is categorical: use the nearer sample rather than an interpolated fraction
      gearA: v.gearA == null ? null : Math.round(v.gearA),
      gearB: v.gearB == null ? null : Math.round(v.gearB),
      deltaS: tA == null || tB == null ? null : round(tB - tA, 3),
    };
  });
}

/**
 * Split the lap into `count` equal-length mini-sectors and attribute each to the driver
 * who spent less time in it (from the cumulative delta at its boundaries).
 */
export function miniSectors(points: readonly ChartPoint[], count = 24, tieMs = 5): MiniSector[] {
  const end = points[points.length - 1]?.distanceM ?? 0;
  if (!end || points.length < 2) return [];
  const deltaAt = (d: number): number | null => {
    let best: ChartPoint | undefined;
    for (const p of points) {
      if (p.deltaS == null) continue;
      if (!best || Math.abs(p.distanceM - d) < Math.abs(best.distanceM - d)) best = p;
      if (p.distanceM > d && best) break;
    }
    return best?.deltaS ?? null;
  };
  const out: MiniSector[] = [];
  for (let i = 0; i < count; i++) {
    const startM = (end * i) / count, endM = (end * (i + 1)) / count;
    const d0 = i === 0 ? 0 : deltaAt(startM), d1 = deltaAt(endM);
    const gainMs = d0 == null || d1 == null ? null : Math.round((d1 - d0) * 1000);
    out.push({
      index: i, startM: round(startM, 1) ?? 0, endM: round(endM, 1) ?? 0, gainMs,
      winner: gainMs == null ? null : Math.abs(gainMs) <= tieMs ? "tie" : gainMs > 0 ? "a" : "b",
    });
  }
  return out;
}

/**
 * Track outline from lap A's position samples, each point tagged with its mini-sector.
 * Position timestamps are mapped to (normalised) distance via lap A's time→distance trace.
 */
export function trackMap(a: TelemetryArtifact, lengthM: number, sectors: readonly MiniSector[], maxPoints = 400): TrackMap | null {
  const track = a.track;
  if (!track || track.length < 10 || !sectors.length) return null;
  const s = a.samples;
  const maxA = s[s.length - 1]?.distanceM ?? 0;
  if (!maxA) return null;
  const factor = lengthM / maxA;
  let j = 0;
  const pts: TrackMap["points"] = [];
  const stride = Math.max(1, Math.ceil(track.length / maxPoints));
  for (let i = 0; i < track.length; i += stride) {
    const p = track[i]!;
    while (j < s.length - 2 && (s[j + 1]!.timeS ?? 0) < p.timeS) j++;
    const lo = s[j]!, hi = s[j + 1] ?? lo;
    const t0 = lo.timeS ?? 0, t1 = hi.timeS ?? t0;
    const f = t1 > t0 ? Math.min(1, Math.max(0, (p.timeS - t0) / (t1 - t0))) : 0;
    const dist = (lo.distanceM + (hi.distanceM - lo.distanceM) * f) * factor;
    const idx = Math.min(sectors.length - 1, Math.max(0, Math.floor((dist / lengthM) * sectors.length)));
    pts.push({ x: p.x, y: p.y, s: idx });
  }
  return { points: pts };
}

/** Signals with no measured value anywhere in an artifact. */
export function missingSignals(art: TelemetryArtifact): string[] {
  const out: string[] = [];
  const has = (k: NumericKey) => art.samples.some((s) => s[k] != null);
  if (!has("speedKph")) out.push("speed");
  if (!has("throttlePct")) out.push("throttle");
  if (!has("brakePct")) out.push("brake");
  if (!has("timeS")) out.push("time");
  return out;
}

export function deterministicSummary(args: {
  aLabel: string;
  bLabel: string;
  lapDeltaMs: number | null;
  sectorDeltasMs: readonly (number | null)[];
}): string {
  const { aLabel, bLabel, lapDeltaMs: d, sectorDeltasMs: s } = args;
  if (d == null) return "A lap time is missing for one of the selected laps, so no overall delta can be computed.";
  if (d === 0) return `${aLabel} and ${bLabel} recorded identical lap times.`;
  const faster = d < 0 ? bLabel : aLabel;
  const slower = d < 0 ? aLabel : bLabel;
  let text = `${faster} was ${(Math.abs(d) / 1000).toFixed(3)} s faster than ${slower}.`;
  const known = s.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v != null);
  if (known.length) {
    // best sector for the overall faster driver = the one with the largest gain
    const sign = d < 0 ? -1 : 1;
    const best = known.reduce((m, x) => (x.v * sign > m.v * sign ? x : m));
    if (best.v !== 0) {
      const gainer = best.v < 0 ? bLabel : aLabel;
      text += ` The biggest single gain was in sector ${best.i + 1} (${gainer}, ${(Math.abs(best.v) / 1000).toFixed(3)} s).`;
    }
  }
  return text;
}

export const METHODOLOGY = [
  "Delta = Driver B − Driver A. A positive value means B's lap took longer than A's.",
  "Lap and sector times are integer milliseconds. Sector deltas are shown only when both laps have the sector value.",
  "Telemetry is compared on a shared distance axis using linear interpolation; samples are never matched by array index.",
  "When a source has no distance channel, distance is integrated from speed and both laps are scaled to their mean length so that the delta at the finish line equals the lap-time delta.",
  "Track dominance splits the lap into 24 equal-length mini-sectors and credits each to the driver who lost less time in it (ties within 5 ms).",
  "Interpolation does not add measured precision. Gaps in a signal stay gaps; missing values are never replaced with zero.",
  "The cumulative time delta is the interpolated lap-time difference at each distance point (B − A).",
] as const;

export { CALCULATION_VERSION };
