"""FastF1 adapter — OPTIONAL and gated.

Not required for the UI. Disabled unless APEXLAB_ENABLE_FASTF1=1 and the
`fastf1` extra is installed. Review docs/data-rights.md before enabling: the
FastF1 licence does not itself grant rights to the underlying data.
"""
from __future__ import annotations

import os


class FastF1Disabled(RuntimeError):
    pass


def load_session(year: int, event: str, session: str, cache_dir: str):  # pragma: no cover - needs network
    if os.environ.get("APEXLAB_ENABLE_FASTF1") != "1":
        raise FastF1Disabled(
            "FastF1 ingestion is disabled. Set APEXLAB_ENABLE_FASTF1=1 only after the data-rights "
            "checklist in docs/data-rights.md is satisfied."
        )
    try:
        import fastf1  # type: ignore
    except ImportError as e:
        raise FastF1Disabled("fastf1 is not installed: pip install '.[fastf1]'") from e
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)
    ses = fastf1.get_session(year, event, session)
    ses.load(telemetry=True, weather=False, messages=False)
    return ses
# NOTE: normalization of FastF1 frames into the artifact contract (ms integers,
# distance axis from Telemetry.add_distance(), NaN -> None) is intentionally left
# for the dedicated real-data phase, after rights are confirmed.
