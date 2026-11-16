import copy
import json
from pathlib import Path

import pytest

from apexlab_ingest.calc import interpolate_at, lap_delta_ms, sector_deltas_ms
from apexlab_ingest.cli import main
from apexlab_ingest.demo_source import build_demo
from apexlab_ingest.model import ArtifactError, validate_artifact
from apexlab_ingest.writer import write_json_atomic


def test_lap_and_sector_delta_sign():
    assert lap_delta_ms(90000, 90312) == 312
    assert lap_delta_ms(None, 1) is None
    assert sector_deltas_ms([1, None, 3], [2, 5, 1]) == [1, None, -2]


def test_interpolation_never_fabricates_zero():
    d = [0.0, 100.0, 200.0]
    v = [100.0, 200.0, None]
    assert interpolate_at(d, v, 50.0) == 150.0
    assert interpolate_at(d, v, 150.0) is None
    assert interpolate_at(d, v, 250.0) is None


def test_demo_is_deterministic_and_valid():
    c1, a1 = build_demo()
    c2, a2 = build_demo()
    assert c1 == c2 and a1 == a2
    for a in a1:
        validate_artifact(a)
        assert a["source"]["rightsStatus"] == "synthetic-demo"
        l = a["lap"]
        assert l["sector1Ms"] + l["sector2Ms"] + l["sector3Ms"] == l["lapTimeMs"]


def test_partial_signal_reported():
    _, arts = build_demo()
    miss = [validate_artifact(a) for a in arts if a["lap"]["number"] == 5 and a["driver"]["key"].endswith("-b")]
    assert miss == [["throttle"]]


def test_validation_rejects_bad_data():
    _, arts = build_demo()
    a = copy.deepcopy(arts[0])
    a["samples"][3]["distanceM"] = a["samples"][2]["distanceM"]
    with pytest.raises(ArtifactError) as e:
        validate_artifact(a)
    assert e.value.code == "NON_MONOTONIC_DISTANCE"
    a = copy.deepcopy(arts[0]); a["samples"][1]["throttlePct"] = 130
    with pytest.raises(ArtifactError):
        validate_artifact(a)
    a = copy.deepcopy(arts[0]); a["schemaVersion"] = 99
    with pytest.raises(ArtifactError) as e:
        validate_artifact(a)
    assert e.value.code == "UNSUPPORTED_VERSION"
    a = copy.deepcopy(arts[0]); del a["source"]["rightsStatus"]
    with pytest.raises(ArtifactError):
        validate_artifact(a)


def test_atomic_write_idempotent(tmp_path: Path):
    p = tmp_path / "x" / "a.json"
    assert write_json_atomic(p, {"a": 1}) is True
    assert write_json_atomic(p, {"a": 1}) is False
    assert write_json_atomic(p, {"a": 2}) is True
    assert json.loads(p.read_text()) == {"a": 2}
    assert not list(p.parent.glob("*.tmp"))


def test_cli_rerun_creates_no_duplicates(tmp_path: Path):
    assert main(["demo", "--out", str(tmp_path)]) == 0
    first = sorted(str(p.relative_to(tmp_path)) for p in tmp_path.rglob("*.json"))
    assert main(["demo", "--out", str(tmp_path)]) == 0
    assert first == sorted(str(p.relative_to(tmp_path)) for p in tmp_path.rglob("*.json"))
    assert main(["validate", "--root", str(tmp_path)]) == 0


def test_fastf1_gated(monkeypatch):
    monkeypatch.delenv("APEXLAB_ENABLE_FASTF1", raising=False)
    assert main(["fastf1", "--year", "2099", "--event", "x", "--session", "Q"]) == 3


def test_committed_fixtures_match_generator():
    root = Path(__file__).resolve().parents[3] / "data" / "fixtures" / "demo"
    catalog, _ = build_demo()
    assert json.loads((root / "catalog.json").read_text()) == catalog
