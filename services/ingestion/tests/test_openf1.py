"""OpenF1 adapter tests. Payloads are OpenF1-shaped but synthetic: no real data is committed."""
from datetime import datetime, timedelta

import pytest

from apexlab_ingest.model import validate_artifact
from apexlab_ingest.normalize import RawSample, normalize_lap
from apexlab_ingest.openf1_source import SourceError, build_artifact, build_url

T0 = datetime.fromisoformat("2099-05-25T14:00:00+00:00")


def iso(s: float) -> str:
    return (T0 + timedelta(seconds=s)).isoformat()


def fake_fetch(lap_duration=10.0, speed=36.0, missing_lap=False):
    def fetch(path, params):
        if path == "sessions":
            return [{"session_key": 1, "meeting_key": 2, "year": 2099}]
        if path == "laps":
            return [] if missing_lap else [{"lap_number": 3, "date_start": iso(0), "lap_duration": lap_duration,
                                            "duration_sector_1": 3.0, "duration_sector_2": None, "duration_sector_3": 4.0}]
        if path == "car_data":
            return [{"date": iso(t / 4), "speed": speed, "throttle": 100, "brake": 0, "n_gear": 7, "rpm": 11000, "drs": 12}
                    for t in range(-4, 46)]
        if path == "location":
            return [{"date": iso(t / 4), "x": t * 10, "y": 0} for t in range(0, 41)]
        if path == "drivers":
            return [{"name_acronym": "TST"}]
        raise AssertionError(path)
    return fetch


def test_url_keeps_operators():
    assert build_url("car_data", {"session_key": 1, "date>": "2024-01-01T00:00:00+00:00"}) == \
        "https://api.openf1.org/v1/car_data?session_key=1&date>2024-01-01T00%3A00%3A00%2B00%3A00"


def test_normalize_matches_typescript_contract():
    s = normalize_lap([RawSample(-0.5, 36, 1, 0, 7), RawSample(2, 36, 1, 0, 7), RawSample(5, 36, 1, 0, 7),
                       RawSample(8, 36, 1, 0, 7), RawSample(10.4, 36, 1, 0, 7)], 10)
    assert s[0]["distanceM"] == 0 and s[0]["timeS"] == 0
    assert s[-1]["distanceM"] == 100 and s[-1]["timeS"] == 10
    assert next(x for x in s if x["timeS"] == 5)["distanceM"] == 50


def test_build_artifact_is_valid_and_ms_integer():
    art = build_artifact(1, 44, 3, fetch=fake_fetch())
    assert validate_artifact(art) == []
    assert art["lap"]["lapTimeMs"] == 10000 and art["lap"]["sector2Ms"] is None
    assert art["driver"]["abbreviation"] == "TST"
    assert art["samples"][-1]["distanceM"] == 100.0  # 10 m/s for 10 s
    assert art["samples"][1]["drs"] is True
    assert len(art["track"]) >= 10


def test_missing_lap_raises_stable_code():
    with pytest.raises(SourceError) as e:
        build_artifact(1, 44, 3, fetch=fake_fetch(missing_lap=True))
    assert e.value.code == "NO_TIMED_LAP"
