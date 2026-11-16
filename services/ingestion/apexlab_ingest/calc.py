"""Pure calculation helpers. No I/O, no CLI concerns.

Sign convention: delta = B - A (positive => B slower). Times are integer ms.
"""
from __future__ import annotations

from typing import Optional, Sequence

Num = Optional[float]


def lap_delta_ms(a: Optional[int], b: Optional[int]) -> Optional[int]:
    return None if a is None or b is None else b - a


def sector_deltas_ms(a: Sequence[Optional[int]], b: Sequence[Optional[int]]) -> list[Optional[int]]:
    return [lap_delta_ms(a[i], b[i]) for i in range(3)]


def interpolate_at(distances: Sequence[float], values: Sequence[Num], x: float) -> Num:
    """Linear interpolation; None if either bracketing value is missing (never 0)."""
    n = len(distances)
    if n < 2 or x < distances[0] or x > distances[-1]:
        return None
    lo = 0
    for i in range(n - 1):
        if distances[i] <= x <= distances[i + 1]:
            lo = i
            break
    lv, hv = values[lo], values[lo + 1]
    if lv is None or hv is None:
        return None
    span = distances[lo + 1] - distances[lo]
    t = 0.0 if span == 0 else (x - distances[lo]) / span
    return lv + (hv - lv) * t


def distance_is_monotonic(distances: Sequence[float]) -> bool:
    return all(distances[i] > distances[i - 1] for i in range(1, len(distances)))
