"""Artifact model + validation (stdlib only). Mirrors packages/contracts."""
from __future__ import annotations

import re
from typing import Any

from .calc import distance_is_monotonic

SCHEMA_VERSION = 1
PROCESSING_VERSION = "1.0.0"
KEY_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
RIGHTS = {"synthetic-demo", "cleared", "unverified"}


class ArtifactError(ValueError):
    """Raised with a stable `code` and human message."""

    def __init__(self, code: str, message: str):
        super().__init__(f"{code}: {message}")
        self.code = code


def _range(name: str, v: Any, lo: float, hi: float | None = None) -> None:
    if v is None:
        return
    if not isinstance(v, (int, float)) or isinstance(v, bool) or v < lo or (hi is not None and v > hi):
        raise ArtifactError("INVALID_SAMPLE", f"{name}={v!r} out of range")


def validate_artifact(art: dict[str, Any]) -> list[str]:
    """Raise ArtifactError if malformed. Returns list of wholly-missing signals."""
    if art.get("schemaVersion") != SCHEMA_VERSION:
        raise ArtifactError("UNSUPPORTED_VERSION", f"schemaVersion={art.get('schemaVersion')!r}")
    if art.get("source", {}).get("rightsStatus") not in RIGHTS:
        raise ArtifactError("MISSING_PROVENANCE", "source.rightsStatus missing/invalid")
    for k in ("eventKey", "sessionKey"):
        if not KEY_RE.match(str(art["session"].get(k, ""))):
            raise ArtifactError("INVALID_KEY", f"session.{k}")
    if not KEY_RE.match(str(art["driver"].get("key", ""))):
        raise ArtifactError("INVALID_KEY", "driver.key")
    samples = art.get("samples", [])
    if len(samples) < 2:
        raise ArtifactError("TOO_FEW_SAMPLES", "need >= 2 samples")
    if not distance_is_monotonic([s["distanceM"] for s in samples]):
        raise ArtifactError("NON_MONOTONIC_DISTANCE", "distance must strictly increase")
    for s in samples:
        _range("distanceM", s["distanceM"], 0)
        _range("timeS", s.get("timeS"), 0)
        _range("speedKph", s.get("speedKph"), 0)
        _range("throttlePct", s.get("throttlePct"), 0, 100)
        _range("brakePct", s.get("brakePct"), 0, 100)
    missing = []
    for label, key in (("speed", "speedKph"), ("throttle", "throttlePct"), ("brake", "brakePct"), ("time", "timeS")):
        if all(s.get(key) is None for s in samples):
            missing.append(label)
    return missing
