"""Integrity and model-boundary checks for public monitoring observations."""

from __future__ import annotations

import csv
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree

import pytest
import yaml

MAIN_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL_NS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

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


def _column_index(reference: str) -> int:
    """`B5` -> 1. The column letters of a cell reference, as a zero-based index."""
    index = 0
    for character in reference:
        if not character.isalpha():
            break
        index = index * 26 + (ord(character.upper()) - ord("A") + 1)
    return index - 1


def _xlsx_first_sheet(path: Path) -> list[list[object]]:
    """The first worksheet of an `.xlsx`, as rows of cell values, stdlib only.

    This used to be `pytest.importorskip("openpyxl")` followed by
    `load_workbook(...)`, and `openpyxl` is in no dependency list in this
    repository — so the assertions below had never once executed. An `.xlsx` is
    a zip of XML and the two things this file needs from it, a shared-string
    table and a sheet, are twenty lines of stdlib. Reading it here rather than
    adding a dependency means the check runs for anyone holding the workbook
    instead of for nobody.

    Deliberately partial: no dates, no formulas, no styles. It reads the label
    and integer columns of one publisher's total rows, which is all the
    transcription lock needs.
    """
    with zipfile.ZipFile(path) as archive:
        workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
        first = workbook.find(f"{MAIN_NS}sheets/{MAIN_NS}sheet")
        assert first is not None, f"{path.name} declares no worksheet"
        relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(
            str(relationship.get("Target"))
            for relationship in relationships
            if relationship.get("Id") == first.get(f"{REL_NS}id")
        )
        member = target if target.startswith("xl/") else f"xl/{target.lstrip('/')}"

        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            table = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            shared = [
                "".join(node.text or "" for node in entry.iter(f"{MAIN_NS}t")) for entry in table
            ]
        sheet = ElementTree.fromstring(archive.read(member))

    rows: list[list[object]] = []
    for row in sheet.iter(f"{MAIN_NS}row"):
        cells: list[object] = []
        for cell in row.iter(f"{MAIN_NS}c"):
            # Empty cells are omitted from the XML entirely, so the reference
            # is the only thing that keeps column D at index 3.
            position = _column_index(str(cell.get("r") or ""))
            while len(cells) < position:
                cells.append(None)
            value = cell.find(f"{MAIN_NS}v")
            text = value.text if value is not None else None
            kind = cell.get("t")
            if kind == "s" and text is not None:
                cells.append(shared[int(text)])
            elif kind == "inlineStr":
                inline = cell.find(f"{MAIN_NS}is")
                cells.append(
                    ""
                    if inline is None
                    else "".join(node.text or "" for node in inline.iter(f"{MAIN_NS}t"))
                )
            elif text is None:
                cells.append(None)
            else:
                cells.append(float(text) if "." in text else int(text))
        rows.append(cells)
    return rows


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
    against the publisher-computed total rows directly, read with `zipfile`
    rather than a spreadsheet library, so no dependency stands between the
    assertion and running.
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
        # This was `return`, which reported the test as passed while verifying
        # nothing below it. A skip says the same thing honestly, and the reason
        # string is registered in docs/adoption/CLAIMS.yaml so the cost shows up
        # in the claim inventory instead of inside a green line.
        pytest.skip("pinned RTFH 2026 workbook is intentionally not tracked")
    totals = {
        str(row[1]).strip(): int(row[3])
        for row in _xlsx_first_sheet(workbook_path)
        if len(row) > 3
        and isinstance(row[1], str)
        and row[1].strip() in ("San Diego Total", "Grand Total")
        and isinstance(row[3], (int, float))
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
