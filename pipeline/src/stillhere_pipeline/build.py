"""Deterministic pipeline build (issue #6).

One command rebuilds identical processed artifacts from the recorded inputs:
raw CSVs are checksum-verified against the source ledger's pins before
anything is read, artifacts are emitted with sorted keys and a stable
manifest whose build_time is the ledger's retrieved_at (input-derived, so the
whole output is byte-reproducible).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from pathlib import Path
from typing import Any

import yaml

from stillhere_pipeline.aggregate import aggregate_observations, monthly_gaps
from stillhere_pipeline.contracts import validate_observations_v0, validate_quality_report_v0
from stillhere_pipeline.manifest import build_manifest
from stillhere_pipeline.normalize import normalize_records
from stillhere_pipeline.quality import (
    COMPARABILITY_EVENTS,
    build_quality_report,
    cross_check_file_totals,
)

SOURCE_ID = "sdrdl_source"


class BuildError(RuntimeError):
    pass


def _load_pinned_checksums(cards_dir: Path) -> dict[str, str]:
    pins: dict[str, str] = {}
    for line in (cards_dir / "checksums.sha256").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        digest, _, path = line.partition("  ")
        pins[path.strip()] = digest.strip()
    return pins


def _verify_and_read(path: Path, repo_relative: str, pins: dict[str, str]) -> bytes:
    if repo_relative not in pins:
        raise BuildError(f"no pinned checksum for {repo_relative}; update the source ledger")
    payload = path.read_bytes()
    actual = hashlib.sha256(payload).hexdigest()
    if actual != pins[repo_relative]:
        raise BuildError(
            f"checksum mismatch for {repo_relative}: pinned {pins[repo_relative]}, got {actual}"
        )
    return payload


def _read_csv(payload: bytes) -> list[dict[str, str]]:
    return list(csv.DictReader(payload.decode("utf-8").splitlines()))


def _write_json(path: Path, doc: dict[str, Any]) -> None:
    path.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")


def run_build(raw_dir: Path, cards_dir: Path, out_dir: Path) -> dict[str, Any]:
    ledger = yaml.safe_load((cards_dir / "source_ledger.yaml").read_text())
    retrieved_at = str(ledger["retrieved_at"])

    pins = _load_pinned_checksums(cards_dir)
    counts_rel = f"data/raw/{SOURCE_ID}/counts.csv"
    files_rel = f"data/raw/{SOURCE_ID}/files.csv"
    counts_payload = _verify_and_read(raw_dir / SOURCE_ID / "counts.csv", counts_rel, pins)
    files_payload = _verify_and_read(raw_dir / SOURCE_ID / "files.csv", files_rel, pins)

    normalization = normalize_records(_read_csv(counts_payload))
    series = aggregate_observations(normalization.records)
    if not series:
        raise BuildError("no valid records survived normalization")
    mismatches = cross_check_file_totals(normalization.records, _read_csv(files_payload))

    observed_months = sorted({record.month for record in normalization.records})
    observations_doc: dict[str, Any] = {
        "schema": "observations.v0",
        "source": {"source_id": SOURCE_ID, "retrieved_at": retrieved_at},
        "months_observed": observed_months,
        "missing_months_global": monthly_gaps(observed_months),
        "neighborhoods": [
            {
                "neighborhood": s.neighborhood,
                "label_variants": s.label_variants,
                "coverage_start": s.coverage_start,
                "coverage_end": s.coverage_end,
                "observed_gap_months": s.observed_gap_months,
                "observations": [
                    {"month": o.month, "total": o.total, "by_type": dict(o.by_type)}
                    for o in s.observations
                ],
            }
            for s in series
        ],
        "comparability_events": COMPARABILITY_EVENTS,
    }
    quality_doc = build_quality_report(
        normalization=normalization,
        series=series,
        file_total_mismatches=mismatches,
        source_id=SOURCE_ID,
        retrieved_at=retrieved_at,
    )

    validate_observations_v0(observations_doc)
    validate_quality_report_v0(quality_doc)

    manifest = build_manifest(
        schema_version="v0",
        build_time=retrieved_at,
        inputs={counts_rel: counts_payload, files_rel: files_payload},
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    _write_json(out_dir / "observations.v0.json", observations_doc)
    _write_json(out_dir / "quality_report.v0.json", quality_doc)
    _write_json(out_dir / "manifest.v0.json", dict(manifest))
    return {
        "neighborhoods": len(series),
        "months": len(observed_months),
        "invalid_rows": len(normalization.invalid_rows),
        "duplicates_dropped": normalization.duplicates_dropped,
        "file_total_mismatches": len(mismatches),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build deployment-safe aggregate artifacts.")
    parser.add_argument("--raw", type=Path, default=Path("data/raw"))
    parser.add_argument("--cards", type=Path, default=Path("data/cards"))
    parser.add_argument("--out", type=Path, default=Path("public/generated"))
    args = parser.parse_args(argv)
    try:
        summary = run_build(args.raw, args.cards, args.out)
    except (BuildError, FileNotFoundError) as error:
        print(f"BUILD FAILED: {error}")
        return 1
    print(f"BUILD OK: {json.dumps(summary, sort_keys=True)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
