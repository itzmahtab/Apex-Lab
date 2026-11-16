import {
  CALCULATION_VERSION,
  type ChartPoint,
  type TelemetryArtifact,
  type TelemetrySample,
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

type NumericKey = "timeS" | "speedKph" | "throttlePct" | "brakePct";

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
  stepM?: number;
}

/**
 * Align two laps on a shared distance axis (0 .. min(maxDistA, maxDistB)).
 * Samples are NOT compared by index. Interpolation is deterministic linear.
 */
export function alignByDistance(
  a: TelemetryArtifact,
  b: TelemetryArtifact,
  { stepM = 10 }: AlignOptions = {},
): ChartPoint[] {
  const sa = a.samples;
  const sb = b.samples;
  const maxA = sa[sa.length - 1]?.distanceM ?? 0;
  const maxB = sb[sb.length - 1]?.distanceM ?? 0;
  const end = Math.min(maxA, maxB);
  const points: ChartPoint[] = [];
  let ha = { s: 0, t: 0, th: 0, br: 0 };
  let hb = { s: 0, t: 0, th: 0, br: 0 };
  const grid: number[] = [];
  for (let d = 0; d < end; d += stepM) grid.push(d);
  grid.push(end);
  for (const d of grid) {
    const sA = interpolateAt(sa, "speedKph", d, ha.s);
    const sB = interpolateAt(sb, "speedKph", d, hb.s);
    const tA = interpolateAt(sa, "timeS", d, ha.t);
    const tB = interpolateAt(sb, "timeS", d, hb.t);
    const thA = interpolateAt(sa, "throttlePct", d, ha.th);
    const thB = interpolateAt(sb, "throttlePct", d, hb.th);
    const brA = interpolateAt(sa, "brakePct", d, ha.br);
    const brB = interpolateAt(sb, "brakePct", d, hb.br);
    ha = { s: sA.hint, t: tA.hint, th: thA.hint, br: brA.hint };
    hb = { s: sB.hint, t: tB.hint, th: thB.hint, br: brB.hint };
    points.push({
      distanceM: round(d, 1) ?? 0,
      speedA: round(sA.value, 1),
      speedB: round(sB.value, 1),
      throttleA: round(thA.value, 1),
      throttleB: round(thB.value, 1),
      brakeA: round(brA.value, 1),
      brakeB: round(brB.value, 1),
      deltaS: tA.value == null || tB.value == null ? null : round(tB.value - tA.value, 3),
    });
  }
  return points;
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
  "Telemetry is compared on a shared distance axis (10 m steps) using linear interpolation; samples are never matched by array index.",
  "Interpolation does not add measured precision. Gaps in a signal stay gaps; missing values are never replaced with zero.",
  "The cumulative time delta is the interpolated lap-time difference at each distance point (B − A).",
] as const;

export { CALCULATION_VERSION };
