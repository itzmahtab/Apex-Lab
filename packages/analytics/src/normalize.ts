import type { TelemetrySample } from "@apexlab/contracts";

/** A raw, time-stamped car sample as delivered by a source (e.g. OpenF1 car_data), seconds from lap start. */
export interface RawCarSample {
  t: number;
  speedKph: number | null;
  throttlePct: number | null;
  brakePct: number | null;
  gear: number | null;
  rpm?: number | null;
  drs?: boolean | null;
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

function interpolateSpeed(samples: RawCarSample[], t: number): number | null {
  for (let i = 0; i < samples.length - 1; i++) {
    const lo = samples[i]!, hi = samples[i + 1]!;
    if (lo.t <= t && t <= hi.t) {
      if (lo.speedKph == null || hi.speedKph == null) return null;
      return hi.t === lo.t ? lo.speedKph : lerp(lo.speedKph, hi.speedKph, (t - lo.t) / (hi.t - lo.t));
    }
  }
  return null;
}

/**
 * Build a distance-based lap trace from time-stamped samples.
 *
 * Distance is not measured by most public sources, so it is integrated from speed
 * (trapezoidal rule) — the same approach FastF1 uses. Samples outside [0, lapDurationS]
 * are used only to interpolate the boundary values, and the trace is pinned so that
 * time = 0 at distance 0 and time = lapDurationS at the final distance.
 * A gap with a missing speed contributes no distance (we never fabricate a value).
 */
export function normalizeLap(raw: RawCarSample[], lapDurationS: number): TelemetrySample[] {
  const sorted = [...raw].sort((a, b) => a.t - b.t);
  const inside = sorted.filter((s) => s.t > 0 && s.t < lapDurationS);
  if (inside.length < 2) return [];
  const first = inside[0]!, last = inside[inside.length - 1]!;
  const startSpeed = interpolateSpeed(sorted, 0) ?? first.speedKph;
  const endSpeed = interpolateSpeed(sorted, lapDurationS) ?? last.speedKph;
  const seq: RawCarSample[] = [
    { ...first, t: 0, speedKph: startSpeed },
    ...inside,
    { ...last, t: lapDurationS, speedKph: endSpeed },
  ];
  const out: TelemetrySample[] = [];
  let d = 0;
  for (let i = 0; i < seq.length; i++) {
    const s = seq[i]!;
    if (i > 0) {
      const p = seq[i - 1]!;
      const dt = s.t - p.t;
      if (dt <= 0) continue; // duplicate timestamps add nothing and would break monotonic distance
      if (p.speedKph != null && s.speedKph != null) d += ((p.speedKph + s.speedKph) / 2 / 3.6) * dt;
      else continue;
    }
    out.push({
      distanceM: Math.round(d * 10) / 10,
      timeS: Math.round(s.t * 1000) / 1000,
      speedKph: s.speedKph,
      throttlePct: s.throttlePct == null ? null : Math.max(0, Math.min(100, s.throttlePct)),
      brakePct: s.brakePct == null ? null : Math.max(0, Math.min(100, s.brakePct)),
      gear: s.gear,
      rpm: s.rpm ?? null,
      drs: s.drs ?? null,
    });
  }
  // Rounding can create equal distances at very low speed; keep distance strictly increasing.
  return out.filter((s, i) => i === 0 || s.distanceM > out[i - 1]!.distanceM);
}
