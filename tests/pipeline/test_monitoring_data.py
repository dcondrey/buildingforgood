"""Integrity and model-boundary checks for public monitoring observations."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
MONITORING_PATH = REPO_ROOT / "data" / "monitoring" / "dsdp_public_checkpoints.csv"
CORE_AREAS = {
    "City Center",
    "Columbia",
    "Cortez",
    "East Village",
    "Gaslamp",
    "Marina",
}


def _rows() -> list[dict[str, str]]:
    with MONITORING_PATH.open(newline="", encoding="utf-8") as source:
        return list(csv.DictReader(source))


def test_public_monitoring_is_excluded_from_demo_modeling() -> None:
    rows = _rows()
    assert rows
    assert {row["model_eligible"] for row in rows} == {"false"}
    assert {row["source_id"] for row in rows} == {"dsdp_public_monthly_reports"}

    ledger = yaml.safe_load((REPO_ROOT / "data" / "cards" / "source_ledger.yaml").read_text())
    lineage = ledger["artifact_lineages"]["public_monitoring"]
    assert lineage["required_source_ids"] == ["dsdp_public_monthly_reports"]
    assert set(lineage["excluded_from"]) == {
        "demo_v1_training",
        "demo_v1_forecast_selection",
        "demo_v1_planner",
    }

    demo_sources = set(ledger["artifact_lineages"]["demo_v1"]["required_source_ids"])
    demo_sources.update(ledger["artifact_lineages"]["demo_v1"]["optional_diagnostic_source_ids"])
    assert "dsdp_public_monthly_reports" not in demo_sources


def test_area_totals_reconcile_to_both_published_geographies() -> None:
    by_month: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in _rows():
        by_month[row["report_month"]].append(row)

    assert set(by_month) == {"2026-04-01", "2026-06-01"}
    for rows in by_month.values():
        area_values = {
            row["geography"]: int(row["value"]) for row in rows if row["series"] == "area_total"
        }
        assert set(area_values) == CORE_AREAS | {"Outside Perimeter"}

        core_total = next(
            int(row["value"]) for row in rows if row["series"] == "six_area_core_total"
        )
        published_total = next(
            int(row["value"]) for row in rows if row["series"] == "seven_area_total"
        )

        assert core_total == sum(area_values[area] for area in CORE_AREAS)
        assert published_total == core_total + area_values["Outside Perimeter"]
