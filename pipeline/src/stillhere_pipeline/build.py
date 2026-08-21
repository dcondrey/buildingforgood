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
import io
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
from stillhere_pipeline.suppress import SMALL_CELL_THRESHOLD, suppress_observation_row

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
    # StringIO, not splitlines(): the csv module must see real newlines so
    # quoted fields with embedded line breaks survive intact.
    return list(csv.DictReader(io.StringIO(payload.decode("utf-8"))))


def _write_json(path: Path, doc: dict[str, Any]) -> None:
    path.write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")


def run_build(raw_dir: Path, cards_dir: Path, out_dir: Path) -> dict[str, Any]:
    try:
        ledger = yaml.safe_load((cards_dir / "source_ledger.yaml").read_text())
    except yaml.YAMLError as error:
        raise BuildError(f"source ledger is not valid YAML: {error}") from None
    retrieved_at = ledger.get("retrieved_at") if isinstance(ledger, dict) else None
    if not isinstance(retrieved_at, str) or not retrieved_at:
        # An unquoted YAML timestamp parses as a datetime and would silently
        # change the manifest byte format; fail closed and ask for a string.
        raise BuildError(
            "source ledger retrieved_at must be a non-empty quoted string, "
            f"got {type(retrieved_at).__name__}"
        )

    pins = _load_pinned_checksums(cards_dir)
    counts_rel = f"data/raw/{SOURCE_ID}/counts.csv"
    files_rel = f"data/raw/{SOURCE_ID}/files.csv"
    counts_payload = _verify_and_read(raw_dir / SOURCE_ID / "counts.csv", counts_rel, pins)
    files_payload = _verify_and_read(raw_dir / SOURCE_ID / "files.csv", files_rel, pins)

    normalization = normalize_records(_read_csv(counts_payload))
    series = aggregate_observations(normalization.records)
    if not series:
        raise BuildError("no valid records survived normalization")
    files_rows = _read_csv(files_payload)
    mismatches = cross_check_file_totals(normalization.records, files_rows)
    counted_ids = {record.file_id for record in normalization.records}
    maps_without_counts = sorted(
        {row.get("file_id", "") for row in files_rows} - counted_ids - {""}
    )

    observed_months = sorted({record.month for record in normalization.records})
    suppressed_rows = 0
    suppressed_cells = 0
    neighborhoods: list[dict[str, Any]] = []
    for s in series:
        rows: list[dict[str, Any]] = []
        for o in s.observations:
            published = suppress_observation_row(
                {"month": o.month, "total": o.total, "by_type": dict(o.by_type)}
            )
            if published.get("suppressed"):
                suppressed_rows += 1
            suppressed_cells += len(published.get("by_type_suppressed", []))
            rows.append(published)
        neighborhoods.append(
            {
                "neighborhood": s.neighborhood,
                "label_variants": s.label_variants,
                "coverage_start": s.coverage_start,
                "coverage_end": s.coverage_end,
                "observed_gap_months": s.observed_gap_months,
                "observations": rows,
            }
        )
    observations_doc: dict[str, Any] = {
        "schema": "observations.v0",
        "source": {"source_id": SOURCE_ID, "retrieved_at": retrieved_at},
        "months_observed": observed_months,
        "missing_months_global": monthly_gaps(observed_months),
        "neighborhoods": neighborhoods,
        "comparability_events": COMPARABILITY_EVENTS,
    }
    suppression_stats = {
        "threshold": SMALL_CELL_THRESHOLD,
        "rows_suppressed": suppressed_rows,
        "cells_suppressed": suppressed_cells,
        "policy": "complementary; zeros publishable; small totals suppress the row",
    }
    quality_doc = build_quality_report(
        normalization=normalization,
        series=series,
        file_total_mismatches=mismatches,
        source_maps_without_counts=maps_without_counts,
        small_cell_suppression=suppression_stats,
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
