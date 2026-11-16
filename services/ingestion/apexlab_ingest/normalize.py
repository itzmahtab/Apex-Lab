"""Distance-from-speed normalisation (mirror of packages/analytics/src/normalize.ts).

Pure functions: no I/O. Times are seconds from lap start; speeds km/h.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class RawSample:
    t: float
    speed: Optional[float]
    throttle: Optional[float]
    brake: Optional[float]
    gear: Optional[int]
    rpm: Optional[float] = None
    drs: Optional[bool] = None


def _speed_at(samples: list[RawSample], t: float) -> Optional[float]:
    for lo, hi in zip(samples, samples[1:]):
        if lo.t <= t <= hi.t:
            if lo.speed is None or hi.speed is None:
                return None
            return lo.speed if hi.t == lo.t else lo.speed + (hi.speed - lo.speed) * (t - lo.t) / (hi.t - lo.t)
    return None


def _clamp(v: Optional[float]) -> Optional[float]:
    return None if v is None else max(0.0, min(100.0, v))


def normalize_lap(raw: list[RawSample], lap_duration_s: float) -> list[dict]:
    """Integrate distance from speed (trapezoid), pin t=0 and t=duration. Missing speed adds no distance."""
    ordered = sorted(raw, key=lambda s: s.t)
    inside = [s for s in ordered if 0 < s.t < lap_duration_s]
    if len(inside) < 2:
        return []
    first, last = inside[0], inside[-1]
    start_v = _speed_at(ordered, 0.0)
    end_v = _speed_at(ordered, lap_duration_s)
    seq = [
        RawSample(0.0, start_v if start_v is not None else first.speed, first.throttle, first.brake, first.gear, first.rpm, first.drs),
        *inside,
        RawSample(lap_duration_s, end_v if end_v is not None else last.speed, last.throttle, last.brake, last.gear, last.rpm, last.drs),
    ]
    out: list[dict] = []
    d = 0.0
    prev: Optional[RawSample] = None
    for s in seq:
        if prev is not None:
            dt = s.t - prev.t
            if dt <= 0 or prev.speed is None or s.speed is None:
                continue
            d += (prev.speed + s.speed) / 2 / 3.6 * dt
        prev = s
        out.append({
            "distanceM": round(d, 1), "timeS": round(s.t, 3), "speedKph": s.speed,
            "throttlePct": _clamp(s.throttle), "brakePct": _clamp(s.brake), "gear": s.gear,
            "rpm": s.rpm, "drs": s.drs,
        })
    return [s for i, s in enumerate(out) if i == 0 or s["distanceM"] > out[i - 1]["distanceM"]]
