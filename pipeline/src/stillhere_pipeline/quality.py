"""Machine-readable data quality report (issue #6).

Missing periods, methodology changes, dropped/invalid rows, and source
arithmetic errors stay explicit in the output; downstream analysis cannot
silently invent completeness the data does not have.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from stillhere_pipeline.aggregate import NeighborhoodSeries, monthly_gaps
from stillhere_pipeline.normalize import NormalizationResult, NormalizedRecord

# Documented breaks and transitions in the SDRDL downtown series. Events with
# "assumption": True encode an interpretation the source does not document;
# they are surfaced so a human can challenge them, never buried.
COMPARABILITY_EVENTS: list[dict[str, Any]] = [
    {
        "id": "occupancy_multiplier_break",
        "month": "2017-04",
        "kind": "methodology",
        "description": (
            "DSP adopted HUD/RTFH occupancy multipliers from 2017-04-27 (1.75 per "
            "tent/structure, 1.66 per vehicle; vehicle updated to 2.03 on 2018-05-31; "
            "2 and 2 before). This series is deliberately UNMULTIPLIED and stays "
            "internally comparable across the break, but diverges from official "
            "published totals after 2017-03."
        ),
    },
    {
        "id": "east_village_south_split",
        "month": "2017-04",
        "kind": "boundary",
        "description": (
            "east_village_south appears from 2017-04 and generally co-occurs with "
            "east_village, with gaps (no extracted counts 2018-03 through 2018-06; "
            "see source_maps_without_counts). Era-consistent East Village totals "
            "across the split require summing both areas after 2017-04."
        ),
    },
    {
        "id": "type_code_switch",
        "month": "2018-07",
        "kind": "encoding",
        "assumption": True,
        "description": (
            "Sleeper types are named (Individual/Structure/Vehicle) through 2018-06 "
            "and digit codes (1/2/3) from 2018-07. The digit mapping "
            "1=individual, 2=structure, 3=vehicle is inferred from rank consistency; "
            "the source package does not document it."
        ),
    },
    {
        "id": "city_center_label_transition",
        "month": "2020-01",
        "kind": "boundary",
        "assumption": True,
        "description": (
            "The label 'core' stops after 2019-11 and 'City Center' begins 2020-01 "
            "with zero overlapping months; both map to city_center. Boundary "
            "equivalence across the rename is assumed, not verified against a map."
        ),
    },
    {
        "id": "coverage_expansion_2021",
        "month": "2021-05",
        "kind": "boundary",
        "description": (
            "barrio_logan, golden_hill, and sherman_heights enter the count from "
            "2021-05. Downtown-total comparisons spanning 2021-05 must exclude the "
            "expansion areas or flag the boundary change."
        ),
    },
]


def cross_check_file_totals(
    records: list[NormalizedRecord],
    files_rows: list[dict[str, str]],
) -> list[dict[str, Any]]:
    """Compare per-map computed sums against the source's hand-summed totals.

    The source documents arithmetic errors in its hand-summed per-map totals;
    this makes every disagreement explicit. Rows whose reported total does not
    parse as an integer are skipped (they carry no comparable claim).
    """
    computed: dict[str, int] = defaultdict(int)
    for record in records:
        computed[record.file_id] += record.count

    mismatches: list[dict[str, Any]] = []
    for row in files_rows:
        file_id = row.get("file_id", "")
        raw_total = row.get("total_count", "")
        try:
            reported_value = float(raw_total)
        except (TypeError, ValueError):
            continue
        if not reported_value.is_integer():
            # Fractional published totals are multiplier-era values (the
            # occupancy_multiplier_break event), not raw hand-sums; they carry
            # no comparable arithmetic claim and are skipped, never truncated.
            continue
        reported = int(reported_value)
        if file_id in computed and computed[file_id] != reported:
            mismatches.append(
                {
                    "file_id": file_id,
                    "computed": computed[file_id],
                    "reported": reported,
                    "delta": computed[file_id] - reported,
                }
            )
    return sorted(mismatches, key=lambda m: str(m["file_id"]))


def build_quality_report(
    normalization: NormalizationResult,
    series: list[NeighborhoodSeries],
    file_total_mismatches: list[dict[str, Any]],
    source_maps_without_counts: list[str],
    source_id: str,
    retrieved_at: str,
) -> dict[str, Any]:
    observed_months = sorted({record.month for record in normalization.records})
    return {
        "schema": "quality_report.v0",
        "source": {"source_id": source_id, "retrieved_at": retrieved_at},
        "row_counts": {
            "normalized": len(normalization.records),
            "invalid": len(normalization.invalid_rows),
        },
        "duplicates_dropped": normalization.duplicates_dropped,
        "invalid_rows": [
            {"row_number": row.row_number, "reason": row.reason}
            for row in normalization.invalid_rows
        ],
        "missing_months_global": monthly_gaps(observed_months),
        "per_neighborhood_gap_months": {
            s.neighborhood: s.observed_gap_months for s in series if s.observed_gap_months
        },
        "file_total_mismatches": file_total_mismatches,
        "source_maps_without_counts": source_maps_without_counts,
        "comparability_events": COMPARABILITY_EVENTS,
        "day_of_month_reliable": False,
    }
