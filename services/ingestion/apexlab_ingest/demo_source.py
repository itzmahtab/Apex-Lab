"""Synthetic demo source adapter.

ALL VALUES ARE INVENTED. This is not real F1 data. A fictional circuit, season
2099 and fictional drivers are used so nothing can be mistaken for a result.
Output is fully deterministic (no RNG, no clock) so fixtures are reproducible.
"""
from __future__ import annotations

import math
from typing import Any

SEASON = 2099
EVENT_KEY = "demo-grand-prix"
SESSION_KEY = "demo-qualifying"
TRACK_LENGTH_M = 5000.0
SECTOR_END_M = (1700.0, 3400.0, 5000.0)
RETRIEVED_AT = "2099-01-01T00:00:00Z"  # fixed => deterministic

# (centre_m, half_width_m, min_speed_kph): corners of the fictional circuit
CORNERS = [(600, 140, 95), (1350, 120, 130), (2100, 170, 70), (2900, 110, 150), (3700, 150, 85), (4450, 120, 110)]
TOP_SPEED = 305.0

DRIVERS = [
    # key, abbr, name, pace (corner-speed multiplier), sample spacing (m), top-speed multiplier
    ("demo-driver-a", "DRA", "Demo Driver A", 1.000, 20.0, 1.000),
    ("demo-driver-b", "DRB", "Demo Driver B", 0.985, 25.0, 1.012),
]
# per-lap pace modifiers (invented): lap -> multiplier on corner speed
LAP_PACE = {2: 0.975, 3: 1.004, 4: 0.990, 5: 1.001}
# lap -> special condition
INVALID = {("demo-driver-b", 3)}          # track limits (invented)
NO_THROTTLE = {("demo-driver-b", 5)}      # signal missing -> partial data
NO_TELEMETRY = {("demo-driver-a", 1), ("demo-driver-b", 1)}  # out laps: summary only


def _speed_at(d: float, pace: float, topmul: float) -> float:
    v = TOP_SPEED * topmul
    for c, w, vmin in CORNERS:
        dist = abs(d - c)
        if dist < w * 2.2:
            depth = math.exp(-((dist / w) ** 2))
            v = min(v, v - (v - vmin * pace) * depth)
    return max(v, 40.0)


def _lap(driver: tuple, lap_no: int) -> dict[str, Any]:
    key, abbr, _name, base_pace, step, topmul = driver
    pace = base_pace * LAP_PACE.get(lap_no, 1.0)
    # dense integration at 1 m resolution
    t = 0.0
    times = [0.0]
    speeds = []
    for i in range(int(TRACK_LENGTH_M) + 1):
        speeds.append(_speed_at(float(i), pace, topmul))
    for i in range(int(TRACK_LENGTH_M)):
        v_ms = (speeds[i] + speeds[i + 1]) / 2 / 3.6
        t += 1.0 / v_ms
        times.append(t)
    total_ms = round(times[-1] * 1000)
    sectors = []
    prev = 0.0
    for end in SECTOR_END_M:
        cur = times[int(end)] if end < TRACK_LENGTH_M else times[-1]
        sectors.append(round((cur - prev) * 1000))
        prev = cur
    # fix rounding drift so sectors sum to the lap time
    sectors[2] += total_ms - sum(sectors)

    samples = []
    d = 0.0
    while d <= TRACK_LENGTH_M + 1e-9:
        i = min(int(round(d)), int(TRACK_LENGTH_M))
        v = speeds[i]
        ahead = speeds[min(i + 25, int(TRACK_LENGTH_M))]
        accel = ahead - v
        brake = 0.0 if accel >= -2 else min(100.0, -accel * 2.2)
        throttle = 0.0 if brake > 0 else min(100.0, max(25.0, 55 + accel * 4 + (v / TOP_SPEED) * 40))
        gear = max(1, min(8, int(v // 40) + 1))
        samples.append({
            "distanceM": round(d, 1), "timeS": round(times[i], 3), "speedKph": round(v, 1),
            "throttlePct": round(throttle, 1), "brakePct": round(brake, 1), "gear": gear,
        })
        d += step
    if samples[-1]["distanceM"] < TRACK_LENGTH_M:
        samples.append({**samples[-1], "distanceM": TRACK_LENGTH_M, "timeS": round(times[-1], 3)})
    if (key, lap_no) in NO_THROTTLE:
        for s in samples:
            s["throttlePct"] = None
    return {
        "lap": {
            "number": lap_no, "lapTimeMs": total_ms,
            "sector1Ms": sectors[0], "sector2Ms": sectors[1], "sector3Ms": sectors[2],
            "isValid": (key, lap_no) not in INVALID,
        },
        "samples": samples,
        "abbr": abbr,
    }


def build_demo() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Return (catalog, artifacts). Deterministic."""
    laps_summary: list[dict[str, Any]] = []
    artifacts: list[dict[str, Any]] = []
    compounds = {1: "SOFT", 2: "SOFT", 3: "SOFT", 4: "MEDIUM", 5: "MEDIUM"}
    for drv in DRIVERS:
        for n in range(1, 6):
            lap = _lap(drv, n)
            has_tel = (drv[0], n) not in NO_TELEMETRY
            ls = lap["lap"]
            laps_summary.append({
                "driverKey": drv[0], "lapNumber": n, "lapTimeMs": ls["lapTimeMs"],
                "sector1Ms": ls["sector1Ms"], "sector2Ms": ls["sector2Ms"], "sector3Ms": ls["sector3Ms"],
                "compound": compounds[n], "isValid": ls["isValid"], "hasTelemetry": has_tel,
            })
            if has_tel:
                artifacts.append({
                    "schemaVersion": 1,
                    "source": {
                        "name": "demo-fixture", "retrievedAt": RETRIEVED_AT, "rightsStatus": "synthetic-demo",
                        "notes": "Synthetic demo data. Invented values; not a real F1 lap.",
                    },
                    "session": {"season": SEASON, "eventKey": EVENT_KEY, "sessionKey": SESSION_KEY},
                    "driver": {"key": drv[0], "abbreviation": drv[1]},
                    "lap": ls,
                    "units": {"distance": "m", "speed": "km/h", "throttle": "percent",
                              "brake": "percent", "time": "seconds-from-lap-start"},
                    "samples": lap["samples"],
                })
    catalog = {
        "schemaVersion": 1,
        "seasons": [{"year": SEASON, "eventKeys": [EVENT_KEY]}],
        "events": [{
            "key": EVENT_KEY, "name": "Demo Grand Prix (synthetic)", "circuitName": "Synthetic Circuit",
            "countryCode": None, "sessionKeys": [SESSION_KEY],
        }],
        "sessions": [{
            "key": SESSION_KEY, "eventKey": EVENT_KEY, "sessionType": "qualifying",
            "name": "Demo Qualifying (synthetic)",
            "drivers": [{"key": d[0], "abbreviation": d[1], "displayName": d[2]} for d in DRIVERS],
            "laps": laps_summary,
            "source": {"name": "demo-fixture", "rightsStatus": "synthetic-demo"},
        }],
    }
    return catalog, artifacts
