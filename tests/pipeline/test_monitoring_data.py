"""Integrity and model-boundary checks for public monitoring observations."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

import pytest
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
    assert lineage["required_source_ids"] == [
        "dsdp_public_monthly_reports",
        "rtfh_public_monitoring",
    ]
    assert set(lineage["excluded_from"]) == {
        "demo_v1_training",
        "demo_v1_forecast_selection",
        "demo_v1_planner",
    }

    demo_sources = set(ledger["artifact_lineages"]["demo_v1"]["required_source_ids"])
    demo_sources.update(ledger["artifact_lineages"]["demo_v1"]["optional_diagnostic_source_ids"])
    assert "dsdp_public_monthly_reports" not in demo_sources
    assert "rtfh_public_monitoring" not in demo_sources


def test_rtfh_annual_checkpoints_stay_in_the_monitoring_lane() -> None:
    """Transcription lock plus model-boundary check for the RTFH table.

    The exact totals are asserted so a silent edit fails review; when the
    pinned 2026 workbook is present locally, the transcription is verified
    against the publisher-computed total rows directly.
    """
    path = REPO_ROOT / "data" / "monitoring" / "rtfh_annual_checkpoints.csv"
    with path.open(newline="", encoding="utf-8") as source:
        rows = list(csv.DictReader(source))
    assert {row["model_eligible"] for row in rows} == {"false"}
    assert {row["source_id"] for row in rows} == {"rtfh_public_monitoring"}
    values = {(row["count_year"], row["geography"]): int(row["value"]) for row in rows}
    assert values == {
        ("2025", "City of San Diego"): 3354,
        ("2025", "San Diego County"): 5714,
        ("2026", "City of San Diego"): 3132,
        ("2026", "San Diego County"): 5108,
    }
    for year in ("2025", "2026"):
        assert values[(year, "City of San Diego")] <= values[(year, "San Diego County")]

    ledger = yaml.safe_load((REPO_ROOT / "data" / "cards" / "source_ledger.yaml").read_text())
    lineage = ledger["artifact_lineages"]["public_monitoring"]
    assert "data/monitoring/rtfh_annual_checkpoints.csv" in lineage["additional_artifacts"]

    workbook_path = (
        REPO_ROOT
        / "data"
        / "raw"
        / "rtfh_pitc"
        / ("2026-PITC-Unsheltered-Census-Tract-per-City.xlsx")
    )
    if not workbook_path.exists():
        return  # raw snapshots are ignored by git; CI verifies the lock above
    openpyxl = pytest.importorskip("openpyxl")
    sheet = openpyxl.load_workbook(workbook_path, read_only=True).worksheets[0]
    totals = {
        str(row[1]): int(row[3])
        for row in sheet.iter_rows(values_only=True)
        if row and isinstance(row[1], str) and row[1].strip() in ("San Diego Total", "Grand Total")
    }
    assert totals["San Diego Total"] == values[("2026", "City of San Diego")]
    assert totals["Grand Total"] == values[("2026", "San Diego County")]


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
