"""CLI: `python -m apexlab_ingest.cli demo|validate|fastf1 ...`"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

from .demo_source import build_demo
from .model import PROCESSING_VERSION, ArtifactError, validate_artifact
from .writer import write_json_atomic

log = logging.getLogger("apexlab.ingest")


def artifact_path(root: Path, art: dict) -> Path:
    return root / "artifacts" / art["session"]["sessionKey"] / f"{art['driver']['key']}-lap{art['lap']['number']}.json"


def cmd_demo(out: Path) -> int:
    t0 = time.monotonic()
    catalog, artifacts = build_demo()
    # validate everything first; write nothing if anything is invalid (keeps last good output)
    for a in artifacts:
        try:
            validate_artifact(a)
        except ArtifactError as e:
            log.error("source=demo-fixture session=%s error_category=%s", a["session"]["sessionKey"], e.code)
            print(f"validation failed: {e}", file=sys.stderr)
            return 2
    changed = write_json_atomic(out / "catalog.json", catalog)
    for a in artifacts:
        changed |= write_json_atomic(artifact_path(out, a), a)
    log.info("source=demo-fixture version=%s artifacts=%d changed=%s duration=%.2fs",
             PROCESSING_VERSION, len(artifacts), changed, time.monotonic() - t0)
    print(f"demo fixtures {'written' if changed else 'already up to date'}: {len(artifacts)} artifacts -> {out}")
    return 0


def cmd_validate(root: Path) -> int:
    bad = 0
    files = sorted((root / "artifacts").rglob("*.json"))
    for f in files:
        try:
            missing = validate_artifact(json.loads(f.read_text(encoding="utf-8")))
            print(f"ok   {f.relative_to(root)}" + (f"  (missing: {', '.join(missing)})" if missing else ""))
        except (ArtifactError, KeyError, json.JSONDecodeError) as e:
            bad += 1
            print(f"FAIL {f.relative_to(root)}: {e}", file=sys.stderr)
    print(f"{len(files) - bad}/{len(files)} valid")
    return 1 if bad else 0


def cmd_openf1(args: argparse.Namespace) -> int:
    from .openf1_source import SourceError, build_artifact

    t0 = time.monotonic()
    try:
        art = build_artifact(args.session, args.driver, args.lap)
        missing = validate_artifact(art)
    except (SourceError, ArtifactError) as e:
        log.error("source=openf1 session=%s driver=%s lap=%s error_category=%s", args.session, args.driver, args.lap, e.code)
        print(f"error: {e}", file=sys.stderr)
        return 2
    path = artifact_path(args.out, art)
    changed = write_json_atomic(path, art)
    log.info("source=openf1 session=%s version=%s samples=%d missing=%s changed=%s duration=%.2fs",
             args.session, PROCESSING_VERSION, len(art["samples"]), missing, changed, time.monotonic() - t0)
    print(f"{'wrote' if changed else 'unchanged'} {path}")
    return 0


def cmd_fastf1(args: argparse.Namespace) -> int:
    from .fastf1_source import FastF1Disabled, load_session

    try:
        load_session(args.year, args.event, args.session, str(Path(args.cache)))
    except FastF1Disabled as e:
        print(f"error: {e}", file=sys.stderr)
        return 3
    print("FastF1 normalization is not implemented yet (see docs/data-rights.md).", file=sys.stderr)
    return 4


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", stream=sys.stderr)
    p = argparse.ArgumentParser(prog="apexlab-ingest")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("demo", help="write synthetic demo fixtures")
    d.add_argument("--out", type=Path, default=Path("../../data/fixtures/demo"))
    v = sub.add_parser("validate", help="validate artifacts under a data root")
    v.add_argument("--root", type=Path, default=Path("../../data/fixtures/demo"))
    o = sub.add_parser("openf1", help="snapshot one lap from OpenF1 into a validated artifact")
    o.add_argument("--session", type=int, required=True, help="OpenF1 session_key, e.g. 9519")
    o.add_argument("--driver", type=int, required=True, help="car number, e.g. 16")
    o.add_argument("--lap", type=int, required=True)
    o.add_argument("--out", type=Path, default=Path("../../data/artifacts"))
    f = sub.add_parser("fastf1", help="(gated) ingest a FastF1 session")
    f.add_argument("--year", type=int, required=True)
    f.add_argument("--event", required=True)
    f.add_argument("--session", required=True)
    f.add_argument("--cache", default="../../data/cache/fastf1")
    a = p.parse_args(argv)
    if a.cmd == "demo":
        return cmd_demo(a.out)
    if a.cmd == "validate":
        return cmd_validate(a.root)
    if a.cmd == "openf1":
        return cmd_openf1(a)
    return cmd_fastf1(a)


if __name__ == "__main__":
    raise SystemExit(main())
