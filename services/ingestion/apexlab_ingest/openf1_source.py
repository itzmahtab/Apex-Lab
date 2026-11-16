"""OpenF1 source adapter (https://openf1.org): free, public, no key required.

Fetches one lap and converts it to the versioned artifact contract. Network access
is isolated in `fetch_json` so normalisation can be tested without the internet.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional

from .normalize import RawSample, normalize_lap

BASE = "https://api.openf1.org/v1"
ATTRIBUTION = "Timing and telemetry from OpenF1 (openf1.org), an unofficial community API. Not affiliated with Formula 1."

Fetch = Callable[[str, dict[str, Any]], list[dict[str, Any]]]


class SourceError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code


def build_url(path: str, params: dict[str, Any]) -> str:
    """OpenF1 comparison filters ("date>") are part of the key: keep the operator unencoded."""
    parts = []
    for k, v in params.items():
        op = next((o for o in (">=", "<=", ">", "<") if k.endswith(o)), "")
        name = k[: -len(op)] if op else k
        parts.append(f"{urllib.parse.quote(name)}{op or '='}{urllib.parse.quote(str(v))}")
    return f"{BASE}/{path}?{'&'.join(parts)}"


def fetch_json(path: str, params: dict[str, Any], retries: int = 3) -> list[dict[str, Any]]:  # pragma: no cover - network
    url = build_url(path, params)
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"accept": "application/json"}), timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return []
            if e.code != 429 and e.code < 500 or attempt == retries:
                raise SourceError("UPSTREAM_HTTP", f"{e.code} for /{path}") from e
        except urllib.error.URLError as e:
            if attempt == retries:
                raise SourceError("UPSTREAM_UNREACHABLE", str(e.reason)) from e
        time.sleep(0.8 * 2 ** attempt)
    return []


def _parse(ts: str) -> datetime:
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _ms(v: Optional[float]) -> Optional[int]:
    return None if v is None else round(v * 1000)


def build_artifact(session_key: int, driver_number: int, lap_number: int, fetch: Fetch = fetch_json) -> dict[str, Any]:
    sessions = fetch("sessions", {"session_key": session_key})
    if not sessions:
        raise SourceError("NOT_FOUND", f"session {session_key}")
    s = sessions[0]
    laps = fetch("laps", {"session_key": session_key, "driver_number": driver_number, "lap_number": lap_number})
    if not laps or laps[0].get("lap_duration") is None or not laps[0].get("date_start"):
        raise SourceError("NO_TIMED_LAP", f"car {driver_number} lap {lap_number}")
    lap = laps[0]
    t0 = _parse(lap["date_start"])
    dur = float(lap["lap_duration"])
    window = {
        "session_key": session_key, "driver_number": driver_number,
        "date>": (t0 - timedelta(seconds=1.5)).isoformat(), "date<": (t0 + timedelta(seconds=dur + 1.5)).isoformat(),
    }
    car = fetch("car_data", window)
    loc = fetch("location", window)
    drivers = fetch("drivers", {"session_key": session_key, "driver_number": driver_number})
    raw = [
        RawSample(
            t=(_parse(r["date"]) - t0).total_seconds(), speed=r.get("speed"), throttle=r.get("throttle"),
            brake=r.get("brake"), gear=None if r.get("n_gear") is None else max(0, min(9, int(r["n_gear"]))),
            rpm=r.get("rpm"), drs=None if r.get("drs") is None else r["drs"] >= 10,
        )
        for r in car
    ]
    samples = normalize_lap(raw, dur)
    if len(samples) < 2:
        raise SourceError("NO_TELEMETRY", f"car {driver_number} lap {lap_number}")
    track = [
        {"timeS": round((_parse(p["date"]) - t0).total_seconds(), 3), "x": p["x"], "y": p["y"]}
        for p in loc
        if p.get("x") is not None and p.get("y") is not None and not (p["x"] == 0 and p["y"] == 0)
    ]
    track = [p for p in track if 0 <= p["timeS"] <= dur]
    art: dict[str, Any] = {
        "schemaVersion": 1,
        "source": {"name": "openf1", "retrievedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                   "rightsStatus": "unverified", "notes": ATTRIBUTION},
        "session": {"season": s["year"], "eventKey": str(s["meeting_key"]), "sessionKey": str(session_key)},
        "driver": {"key": str(driver_number), "abbreviation": (drivers[0].get("name_acronym") if drivers else None) or f"#{driver_number}"},
        "lap": {"number": lap_number, "lapTimeMs": _ms(dur), "sector1Ms": _ms(lap.get("duration_sector_1")),
                "sector2Ms": _ms(lap.get("duration_sector_2")), "sector3Ms": _ms(lap.get("duration_sector_3")), "isValid": None},
        "units": {"distance": "m", "speed": "km/h", "throttle": "percent", "brake": "boolean", "time": "seconds-from-lap-start"},
        "samples": samples,
    }
    if len(track) >= 10:
        art["track"] = track
    return art
