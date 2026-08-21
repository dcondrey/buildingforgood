"""Build the single, deterministic artifact used by the hackathon demo.

The supplied bundle contains two analytically distinct lanes:

* verified, published neighborhood totals for the monthly trend/forecast; and
* raw digitized units on a fixed 261-block panel for spatial change.

They intentionally remain distinct in the output.  Missing reports remain
``null`` (never zero or imputed), the spatial comparison never uses the
expanded 382-block footprint, and no block identifier or precise geometry is
published.

Run from the repository root with::

    PYTHONPATH=pipeline/src python -m stillhere_pipeline.demo
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from datetime import date, timedelta
from pathlib import Path
from statistics import median
from typing import Any

SCHEMA = "stillhere.demo.v1"
CORE_AREAS = (
    "City Center",
    "Columbia",
    "Cortez",
    "East Village",
    "Gaslamp",
    "Marina",
)
MONTHLY_FILE = "DowntownCounts_Monthly.csv"
PANEL_FILE = "BlockLevel_Counts_Panel261.csv"
FULL_BLOCK_FILE = "BlockLevel_Counts.csv"
METHOD_FILE = "Methodology_Periods.csv"
CROSSWALK_FILE = "Area_Crosswalk.csv"
GET_IT_DONE_FILE = "get_it_done_requests_CD3_datasd.csv"
GET_IT_DONE_DEFAULT = Path("data/raw/get_it_done") / GET_IT_DONE_FILE
PARKING_DEFAULT = Path("data/raw/parking_meters")
PARKING_TRANSACTION_FILES = tuple(
    f"treas_meters_{year}_pole_by_month_datasd.csv" for year in range(2022, 2026)
)
PARKING_CURRENT_FILE = "parking_meters_current.csv"
PARKING_HISTORIC_FILE = "treas_parking_meters_loc_datasd.csv"
WEATHER_FILE = "san_diego_airport_daily_2017_2025.csv"
WEATHER_DEFAULT = Path("data/raw/weather") / WEATHER_FILE
PLACEBO_SERVICES = (
    "Pothole",
    "Street Light Maintenance",
    "Traffic Signal Issue",
)

FORECAST_TRAINING_START = "2021-01"
PROMOTION_START = "2023-01"
PROMOTION_END = "2023-12"
CALIBRATION_START = "2024-01"
CALIBRATION_END = "2024-12"
AUDIT_START = "2025-01"
AUDIT_END = "2025-12"
INTERVAL_LEVEL = 0.8


class DemoBuildError(RuntimeError):
    """The curated inputs do not satisfy the demo artifact assumptions."""


def _read_csv(path: Path) -> list[dict[str, str]]:
    try:
        with path.open(newline="", encoding="utf-8") as handle:
            return list(csv.DictReader(handle))
    except FileNotFoundError:
        raise DemoBuildError(f"missing input: {path}") from None


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _month(raw: str) -> str:
    return raw[:7]


def _shift_month(month: str, delta: int) -> str:
    year, number = int(month[:4]), int(month[5:7])
    number += delta
    while number < 1:
        year -= 1
        number += 12
    while number > 12:
        year += 1
        number -= 12
    return f"{year:04d}-{number:02d}"


def _month_range(start: str, end: str) -> list[str]:
    values: list[str] = []
    current = start
    while current <= end:
        values.append(current)
        current = _shift_month(current, 1)
    return values


def _percent_change(before: float, after: float) -> float | None:
    if before == 0:
        return None
    return round((after - before) / before * 100, 1)


def _quantile(values: list[float], q: float) -> float:
    if not values:
        raise DemoBuildError("cannot calculate a quantile without values")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = q * (len(ordered) - 1)
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def _conformal_radius(absolute_errors: list[float], level: float) -> float:
    """Finite-sample corrected absolute-residual quantile.

    This is the split-conformal rank ``ceil((n + 1) * level)`` capped at n.
    Exchangeability can be doubtful in a time series, so the artifact calls
    the interval *conformal-style* and reports walk-forward coverage rather
    than claiming nominal coverage as a guarantee.
    """
    if not absolute_errors:
        raise DemoBuildError("cannot calibrate an interval without residuals")
    if not 0 < level < 1:
        raise DemoBuildError("interval level must be between zero and one")
    ordered = sorted(absolute_errors)
    rank = min(len(ordered), math.ceil((len(ordered) + 1) * level))
    return ordered[rank - 1]


def _published_observations(rows: list[dict[str, str]]) -> dict[str, Any]:
    totals = [
        row
        for row in rows
        if row["area"] in CORE_AREAS
        and row["area_type"] == "neighborhood"
        and row["component"] == "total"
    ]
    by_month: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    for row in totals:
        month = _month(row["date"])
        area = row["area"]
        if area in by_month[month]:
            raise DemoBuildError(f"duplicate published total for {area} in {month}")
        by_month[month][area] = row

    months = sorted(by_month)
    if not months:
        raise DemoBuildError("monthly input has no core-area published totals")

    history: list[dict[str, Any]] = []
    area_series: dict[str, dict[str, float]] = {area: {} for area in CORE_AREAS}
    missing_months: list[str] = []
    for month in _month_range(months[0], months[-1]):
        area_rows = by_month.get(month, {})
        if set(area_rows) != set(CORE_AREAS):
            absent = sorted(set(CORE_AREAS) - set(area_rows))
            raise DemoBuildError(f"{month} is missing core-area rows: {absent}")

        methods = {row["method"] for row in area_rows.values()}
        fellowships = {row["fellowship_month"] == "True" for row in area_rows.values()}
        if len(methods) != 1 or len(fellowships) != 1:
            raise DemoBuildError(f"inconsistent methodology metadata within {month}")

        reported = [row for row in area_rows.values() if row["count"] != ""]
        warning_areas = sorted(
            row["area"] for row in area_rows.values() if row["flag"] == "component_total_mismatch"
        )
        if len(reported) == len(CORE_AREAS):
            value: int | None = sum(int(float(row["count"])) for row in reported)
            status = "reported_verified_total"
            for row in reported:
                area_series[row["area"]][month] = float(row["count"])
        else:
            # A partial geography is not a comparable downtown total.  Keep a
            # null even if some areas happened to report.
            value = None
            status = "not_reported" if not reported else "partial_not_aggregated"
            missing_months.append(month)
            for row in reported:
                area_series[row["area"]][month] = float(row["count"])

        history.append(
            {
                "month": month,
                "total": value,
                "status": status,
                "reported_area_count": len(reported),
                "method": next(iter(methods)),
                "fellowship_month": next(iter(fellowships)),
                "component_quality_warning_areas": warning_areas,
            }
        )

    latest_by_area: list[dict[str, Any]] = []
    for area in CORE_AREAS:
        series = area_series[area]
        if not series:
            raise DemoBuildError(f"no published totals for {area}")
        latest = max(series)
        latest_by_area.append({"area": area, "month": latest, "total": int(series[latest])})

    reported_count = sum(row["total"] is not None for row in history)
    return {
        "scope": {
            "label": "Six-area consistent downtown core",
            "areas": list(CORE_AREAS),
            "count_definition": (
                "Sum of verified published neighborhood totals; totals apply the DSDP "
                "occupancy multipliers in force for each month."
            ),
            "excluded": [
                {
                    "area": "Outside Perimeter",
                    "reason": "Joined the program in 2021 and would break geographic consistency.",
                },
                {
                    "area": "East Village subareas",
                    "reason": "They overlap the East Village neighborhood total.",
                },
                {
                    "area": "Outreach Area (legacy)",
                    "reason": "Supplemental 2017 geography outside the downtown total.",
                },
            ],
        },
        "coverage": {
            "start_month": history[0]["month"],
            "end_month": history[-1]["month"],
            "calendar_months": len(history),
            "reported_months": reported_count,
            "completeness_pct": round(reported_count / len(history) * 100, 1),
            "latest_reported_month": max(
                row["month"] for row in history if row["total"] is not None
            ),
        },
        "missing_months": missing_months,
        "history": history,
        "latest_by_area": latest_by_area,
        "_area_series": area_series,
    }


def _methodology(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    periods: list[dict[str, Any]] = []
    for row in rows:
        periods.append(
            {
                "id": row["method"],
                "effective_from": row["effective_from"],
                "effective_to": row["effective_to"] or None,
                "multipliers": {
                    "individual": float(row["individual_multiplier"]),
                    "tent_structure": float(row["tent_multiplier"]),
                    "vehicle": float(row["vehicle_multiplier"]),
                },
                "note": row["note"],
            }
        )
    return periods


def _level_change(before: list[float], after: list[float]) -> dict[str, Any]:
    if not before or not after:
        raise DemoBuildError("reporting-bias comparison periods must be non-empty")
    before_mean = sum(before) / len(before)
    after_mean = sum(after) / len(after)
    return {
        "pre_monthly_mean": round(before_mean, 1),
        "post_monthly_mean": round(after_mean, 1),
        "absolute_change": round(after_mean - before_mean, 1),
        "percent_change": (
            round((after_mean - before_mean) / before_mean * 100, 1) if before_mean else None
        ),
    }


def _reporting_bias(rows: Iterable[dict[str, str]]) -> dict[str, Any]:
    """Aggregate the Get It Done reporting lane without retaining PII.

    The common geography and clock are prespecified: exact
    ``comm_plan_name == 'DOWNTOWN'`` and the request month parsed from
    ``date_requested``. Parent sensitivity counts distinct top-level request
    ids (rows with no parent) independently within each month, excluding child
    reports rather than pretending they are independent threads.
    """
    start_month = "2022-01"
    end_month = "2025-12"
    months = _month_range(start_month, end_month)
    counts: dict[str, dict[str, Any]] = {
        month: {
            "all_reports": 0,
            "encampment_raw": 0,
            "encampment_roots": set(),
            "encampment_mobile": 0,
            "placebos": {service: 0 for service in PLACEBO_SERVICES},
        }
        for month in months
    }
    invalid_requested_dates = 0
    all_request_ids: set[str] = set()
    duplicate_request_rows = 0
    conflicting_parent_rows = 0
    parent_edges: dict[str, str] = {}
    parent_references: Counter[str] = Counter()
    self_parent_links = 0
    eligible_encampment_ids: set[str] = set()
    eligible_parent_references: Counter[str] = Counter()
    community_case_variants: Counter[str] = Counter()
    service_case_variants: Counter[str] = Counter()
    closure_by_requested_year: dict[str, Counter[str]] = defaultdict(Counter)
    workflow_statuses: Counter[str] = Counter()
    negative_case_age_rows = 0
    close_before_request_rows = 0
    for row in rows:
        workflow_statuses[row.get("status", "") or "blank"] += 1
        request_id = row.get("service_request_id", "")
        parent_id = row.get("service_request_parent_id", "")
        if request_id:
            if request_id in all_request_ids:
                duplicate_request_rows += 1
            all_request_ids.add(request_id)
            if parent_id:
                if request_id in parent_edges and parent_edges[request_id] != parent_id:
                    conflicting_parent_rows += 1
                else:
                    parent_edges[request_id] = parent_id
                parent_references[parent_id] += 1
                self_parent_links += int(request_id == parent_id)
        community = row.get("comm_plan_name", "")
        if community.upper() == "DOWNTOWN":
            community_case_variants[community] += 1
        service_value = row.get("service_name", "")
        if service_value.casefold() == "encampment":
            service_case_variants[service_value] += 1
        raw_case_age = row.get("case_age_days", "")
        if raw_case_age:
            try:
                negative_case_age_rows += int(float(raw_case_age) < 0)
            except ValueError:
                pass
        requested_date = row.get("date_requested", "")[:10]
        closed_date = row.get("date_closed", "")[:10]
        close_before_request_rows += int(
            bool(closed_date and requested_date and closed_date < requested_date)
        )
        if row.get("comm_plan_name") != "DOWNTOWN":
            continue
        requested = row.get("date_requested", "")
        month = requested[:7]
        requested_year = requested[:4]
        if requested_year in {"2022", "2023", "2024", "2025"}:
            closure_by_requested_year[requested_year]["all_rows"] += 1
            closure_by_requested_year[requested_year]["missing_date_closed"] += int(
                not row.get("date_closed", "")
            )
            if row.get("service_name") == "Encampment":
                closure_by_requested_year[requested_year]["encampment_rows"] += 1
                closure_by_requested_year[requested_year]["encampment_missing_date_closed"] += int(
                    not row.get("date_closed", "")
                )
        if len(requested) < 10 or month not in counts:
            # Only invalid dates that otherwise match the requested geography
            # are auditable exclusions. Dates outside 2022-2025 are expected.
            if start_month <= month <= end_month:
                invalid_requested_dates += 1
            continue
        bucket = counts[month]
        bucket["all_reports"] += 1
        service = row.get("service_name", "")
        if service == "Encampment":
            if not request_id:
                raise DemoBuildError("Encampment request lacks service_request_id")
            eligible_encampment_ids.add(request_id)
            if parent_id:
                eligible_parent_references[parent_id] += 1
            bucket["encampment_raw"] += 1
            # A top-level request has no parent. Distinct root ids are the
            # conservative unique-parent sensitivity; child reports are
            # excluded even when their parent originated in another month.
            if not parent_id:
                bucket["encampment_roots"].add(request_id)
            bucket["encampment_mobile"] += int(row.get("case_origin") == "Mobile")
        if service in PLACEBO_SERVICES:
            bucket["placebos"][service] += 1

    monthly: list[dict[str, Any]] = []
    for month in months:
        bucket = counts[month]
        all_reports = int(bucket["all_reports"])
        encampment_raw = int(bucket["encampment_raw"])
        unique_parent = len(bucket["encampment_roots"])
        mobile_origin = int(bucket["encampment_mobile"])
        monthly.append(
            {
                "month": month,
                "all_reports": all_reports,
                "encampment_raw": encampment_raw,
                "encampment_unique_parent": unique_parent,
                "encampment_share_pct": (
                    round(encampment_raw / all_reports * 100, 1) if all_reports else None
                ),
                "encampment_mobile_origin": mobile_origin,
                "encampment_mobile_origin_share_pct": (
                    round(mobile_origin / encampment_raw * 100, 1) if encampment_raw else None
                ),
                "placebos": {
                    service: int(bucket["placebos"][service]) for service in PLACEBO_SERVICES
                },
            }
        )

    pre_months = _month_range("2023-01", "2023-06")
    post_months = _month_range("2023-08", "2024-01")
    matched_pre_months = _month_range("2022-08", "2023-01")
    monthly_by_month = {row["month"]: row for row in monthly}

    def period_values(field: str, period: list[str]) -> list[float]:
        return [float(monthly_by_month[month][field]) for month in period]

    def placebo_values(service: str, period: list[str]) -> list[float]:
        return [float(monthly_by_month[month]["placebos"][service]) for month in period]

    raw_change = _level_change(
        period_values("encampment_raw", pre_months),
        period_values("encampment_raw", post_months),
    )
    parent_change = _level_change(
        period_values("encampment_unique_parent", pre_months),
        period_values("encampment_unique_parent", post_months),
    )
    all_change = _level_change(
        period_values("all_reports", pre_months),
        period_values("all_reports", post_months),
    )
    pre_encampment = sum(period_values("encampment_raw", pre_months))
    post_encampment = sum(period_values("encampment_raw", post_months))
    pre_all = sum(period_values("all_reports", pre_months))
    post_all = sum(period_values("all_reports", post_months))
    pre_mobile = sum(period_values("encampment_mobile_origin", pre_months))
    post_mobile = sum(period_values("encampment_mobile_origin", post_months))
    pre_share = pre_encampment / pre_all * 100 if pre_all else 0.0
    post_share = post_encampment / post_all * 100 if post_all else 0.0
    matched_pre_all = sum(period_values("all_reports", matched_pre_months))
    matched_pre_raw = sum(period_values("encampment_raw", matched_pre_months))
    matched_pre_parent = sum(period_values("encampment_unique_parent", matched_pre_months))
    placebo_changes = [
        {
            "service_name": service,
            **_level_change(
                placebo_values(service, pre_months),
                placebo_values(service, post_months),
            ),
        }
        for service in PLACEBO_SERVICES
    ]
    pre_placebo_combined = [
        sum(placebo_values(service, pre_months)[index] for service in PLACEBO_SERVICES)
        for index in range(len(pre_months))
    ]
    post_placebo_combined = [
        sum(placebo_values(service, post_months)[index] for service in PLACEBO_SERVICES)
        for index in range(len(post_months))
    ]
    raw_total = sum(int(row["encampment_raw"]) for row in monthly)
    monthly_parent_total = sum(int(row["encampment_unique_parent"]) for row in monthly)

    def cycle_summary(edges: dict[str, str]) -> tuple[set[str], int]:
        completed: set[str] = set()
        found: set[str] = set()
        cycle_count = 0
        for start in edges:
            if start in completed:
                continue
            path: list[str] = []
            positions: dict[str, int] = {}
            node = start
            while node in edges and node not in completed and node not in positions:
                positions[node] = len(path)
                path.append(node)
                node = edges[node]
            if node in positions:
                found.update(path[positions[node] :])
                cycle_count += 1
            completed.update(path)
        return found, cycle_count

    cyclic_ids, cycle_count = cycle_summary(parent_edges)
    orphan_parent_ids = {
        parent_id for parent_id in parent_references if parent_id not in all_request_ids
    }
    eligible_orphan_parent_ids = {
        parent_id for parent_id in eligible_parent_references if parent_id not in all_request_ids
    }
    eligible_outside_scope_parent_ids = {
        parent_id
        for parent_id in eligible_parent_references
        if parent_id in all_request_ids and parent_id not in eligible_encampment_ids
    }

    def robust_month_flags(field: str, *, differences: bool = False) -> list[dict[str, Any]]:
        values = [(row["month"], float(row[field])) for row in monthly]
        if differences:
            values = [
                (values[index][0], values[index][1] - values[index - 1][1])
                for index in range(1, len(values))
            ]
        center = median(value for _, value in values)
        mad = median(abs(value - center) for _, value in values)
        if mad == 0:
            return []
        return [
            {
                "month": month,
                "value": int(value),
                "robust_z": round(0.6745 * (value - center) / mad, 1),
            }
            for month, value in values
            if abs(0.6745 * (value - center) / mad) > 3.5
        ]

    return {
        "status": "descriptive_diagnostic_only",
        "geography": {
            "field": "comm_plan_name",
            "exact_value": "DOWNTOWN",
            "near_match_labels_in_source_excluded": True,
        },
        "time": {
            "field": "date_requested",
            "start_month": start_month,
            "end_month": end_month,
            "calendar_months": len(months),
            "invalid_requested_dates_excluded": invalid_requested_dates,
        },
        "definitions": {
            "all_reports": "Raw Get It Done request rows in the exact geography.",
            "encampment_raw": "Rows with service_name exactly equal to Encampment.",
            "encampment_unique_parent": (
                "Distinct service_request_id among top-level Encampment rows whose "
                "service_request_parent_id is empty, counted independently by month."
            ),
            "encampment_share_pct": "Encampment raw rows divided by all report rows.",
            "child_report_share": (
                "Share of Encampment rows with a non-empty parent id. These are related "
                "child requests in the workflow, not verified duplicate observations."
            ),
            "case_origin": (
                "Submission channel metadata; Mobile does not identify who submitted a "
                "request or why."
            ),
        },
        "placebo_categories": [
            {
                "service_name": service,
                "prespecified_role": (
                    "Non-homelessness municipal-report category used to check whether a "
                    "platform-wide reporting shift moved in the same direction."
                ),
            }
            for service in PLACEBO_SERVICES
        ],
        "monthly": monthly,
        "comparison": {
            "design": {
                "pre_period": {"start_month": "2023-01", "end_month": "2023-06"},
                "transition_excluded": "2023-07",
                "post_period": {"start_month": "2023-08", "end_month": "2024-01"},
                "estimand": "Difference in six-month mean monthly reporting levels.",
                "randomization": False,
                "causal_identification": False,
            },
            "all_reports": all_change,
            "encampment_raw": raw_change,
            "encampment_unique_parent": parent_change,
            "encampment_share": {
                "pre_pct": round(pre_share, 1),
                "post_pct": round(post_share, 1),
                "change_percentage_points": round(post_share - pre_share, 1),
            },
            "placebos": placebo_changes,
            "placebo_combined_raw": _level_change(pre_placebo_combined, post_placebo_combined),
            "raw_vs_parent_sensitivity": {
                "pre_raw_reports": int(pre_encampment),
                "pre_unique_parent_requests": int(
                    sum(period_values("encampment_unique_parent", pre_months))
                ),
                "post_raw_reports": int(post_encampment),
                "post_unique_parent_requests": int(
                    sum(period_values("encampment_unique_parent", post_months))
                ),
                "raw_percent_change": raw_change["percent_change"],
                "unique_parent_percent_change": parent_change["percent_change"],
                "difference_percentage_points": round(
                    float(parent_change["percent_change"]) - float(raw_change["percent_change"]),
                    1,
                ),
                "direction_consistent": (
                    float(raw_change["absolute_change"]) * float(parent_change["absolute_change"])
                    > 0
                ),
                "pre_duplicate_child_share_pct": round(
                    (pre_encampment - sum(period_values("encampment_unique_parent", pre_months)))
                    / pre_encampment
                    * 100,
                    1,
                ),
                "post_duplicate_child_share_pct": round(
                    (post_encampment - sum(period_values("encampment_unique_parent", post_months)))
                    / post_encampment
                    * 100,
                    1,
                ),
                "caveat": (
                    "A parent id marks a related child workflow request; it does not prove "
                    "that two reports describe the same real-world observation."
                ),
            },
            "case_origin_sensitivity": {
                "channel": "Mobile",
                "pre_share_pct": round(pre_mobile / pre_encampment * 100, 1),
                "post_share_pct": round(post_mobile / post_encampment * 100, 1),
                "change_percentage_points": round(
                    (post_mobile / post_encampment - pre_mobile / pre_encampment) * 100,
                    1,
                ),
                "interpretation": (
                    "Mobile remained the dominant intake channel in both periods, so the "
                    "raw reporting increase is not explained by a switch into Mobile."
                ),
            },
            "matched_calendar_sensitivity": {
                "pre_period": {
                    "start_month": "2022-08",
                    "end_month": "2023-01",
                },
                "post_period": {
                    "start_month": "2023-08",
                    "end_month": "2024-01",
                },
                "all_reports": {
                    "pre_total": int(matched_pre_all),
                    "post_total": int(post_all),
                    "percent_change": _percent_change(matched_pre_all, post_all),
                },
                "encampment_raw": {
                    "pre_total": int(matched_pre_raw),
                    "post_total": int(post_encampment),
                    "percent_change": _percent_change(matched_pre_raw, post_encampment),
                },
                "encampment_unique_parent": {
                    "pre_total": int(matched_pre_parent),
                    "post_total": int(sum(period_values("encampment_unique_parent", post_months))),
                    "percent_change": _percent_change(
                        matched_pre_parent,
                        sum(period_values("encampment_unique_parent", post_months)),
                    ),
                },
                "encampment_share": {
                    "pre_pct": round(matched_pre_raw / matched_pre_all * 100, 1),
                    "post_pct": round(post_share, 1),
                    "change_percentage_points": round(
                        post_share - matched_pre_raw / matched_pre_all * 100, 1
                    ),
                },
                "interpretation": (
                    "The reporting increase is larger against the same six calendar "
                    "months one year earlier, so the result is not explained by the "
                    "unmatched seasonal composition of the prepared pre/post windows."
                ),
            },
            "interpretation": (
                "Encampment reporting rose more than total reporting, and the direction is "
                "unchanged after parent grouping. The placebo categories are mixed and do "
                "not supply a causal counterfactual. This is a pre/post reporting-pattern "
                "shift, not an estimate of homelessness or intervention impact."
            ),
        },
        "period_sensitivity": {
            "encampment_raw_rows_2022_2025": raw_total,
            "sum_of_monthly_unique_parent_counts": monthly_parent_total,
            "monthly_parent_grouping_reduction_pct": (
                round((1 - monthly_parent_total / raw_total) * 100, 1) if raw_total else None
            ),
        },
        "source_quality": {
            "request_ids": {
                "rows_with_id": sum(1 for _ in all_request_ids) + duplicate_request_rows,
                "distinct_ids": len(all_request_ids),
                "duplicate_extra_rows": duplicate_request_rows,
                "conflicting_parent_rows": conflicting_parent_rows,
                "eligible_downtown_encampment_duplicate_extra_rows": raw_total
                - len(eligible_encampment_ids),
            },
            "parent_graph": {
                "rows_with_parent": sum(parent_references.values()),
                "self_parent_links": self_parent_links,
                "orphan_reference_rows": sum(
                    parent_references[parent_id] for parent_id in orphan_parent_ids
                ),
                "distinct_orphan_parent_ids": len(orphan_parent_ids),
                "cycle_nodes": len(cyclic_ids),
                "cycles": cycle_count,
                "maximum_child_rows_per_parent": max(parent_references.values(), default=0),
                "parents_with_at_least_25_child_rows": sum(
                    value >= 25 for value in parent_references.values()
                ),
                "eligible_downtown_encampment": {
                    "distinct_request_ids": len(eligible_encampment_ids),
                    "orphan_reference_rows": sum(
                        eligible_parent_references[parent_id]
                        for parent_id in eligible_orphan_parent_ids
                    ),
                    "parents_outside_filtered_scope": len(eligible_outside_scope_parent_ids),
                    "outside_filtered_scope_reference_rows": sum(
                        eligible_parent_references[parent_id]
                        for parent_id in eligible_parent_references
                        if parent_id not in eligible_encampment_ids
                    ),
                    "cycle_nodes": len(cyclic_ids & eligible_encampment_ids),
                    "maximum_child_rows_per_parent": max(
                        eligible_parent_references.values(), default=0
                    ),
                },
                "treatment": (
                    "The diagnostic reports both raw rows and no-parent root rows. It does "
                    "not traverse or repair the workflow graph and makes no incident or "
                    "unique-person claim."
                ),
            },
            "label_exactness": {
                "community_case_variants": dict(sorted(community_case_variants.items())),
                "encampment_service_case_variants": dict(sorted(service_case_variants.items())),
                "treatment": (
                    "Prepared aggregates use exact comm_plan_name=DOWNTOWN and exact "
                    "service_name=Encampment; near-match labels are excluded."
                ),
            },
            "closure_right_censor": {
                "workflow_status_rows_full_extract": dict(sorted(workflow_statuses.items())),
                "by_request_year": {
                    year: dict(counts) for year, counts in sorted(closure_by_requested_year.items())
                },
                "close_before_request_rows_full_extract": close_before_request_rows,
                "treatment": (
                    "Monthly assignment uses date_requested and includes all workflow "
                    "statuses; date_closed and case_age_days do not enter the diagnostic."
                ),
            },
            "excluded_case_age": {
                "negative_rows_full_extract": negative_case_age_rows,
                "treatment": "Excluded as workflow metadata, not interpreted as response time.",
            },
            "monthly_outlier_screen": {
                "method": "Global median/MAD descriptive flag at |robust z| > 3.5.",
                "level_flags": {
                    field: robust_month_flags(field)
                    for field in (
                        "all_reports",
                        "encampment_raw",
                        "encampment_unique_parent",
                    )
                },
                "month_over_month_change_flags": {
                    field: robust_month_flags(field, differences=True)
                    for field in (
                        "all_reports",
                        "encampment_raw",
                        "encampment_unique_parent",
                    )
                },
                "treatment": "Retained without correction; no flagged month is excluded.",
            },
        },
        "staged_context": [
            {
                "period": "2023-06",
                "label": "Safe Sleeping program stage",
                "role": "Coincident context; no isolated effect is estimated.",
            },
            {
                "period": "2023-07-31",
                "label": "Unsafe Camping Ordinance enforcement stage",
                "role": "Coincident context; no isolated effect is estimated.",
            },
            {
                "period": "2023-10",
                "label": "Training and O Lot stage",
                "role": "Coincident context; no isolated effect is estimated.",
            },
        ],
        "excluded_uses": [
            "planning load or outreach allocation",
            "unique people or person movement",
            "verified abatement or resolution",
            "causal effect of any ordinance, site, training, or operational change",
        ],
        "workflow_caveat": (
            "case_age_days is closure/referral workflow elapsed time only. It is excluded "
            "and must not be interpreted as response time, resolution quality, or abatement."
        ),
    }


def _cross_source_checkpoints(
    monthly_rows: list[dict[str, str]], reporting_bias: dict[str, Any]
) -> dict[str, Any]:
    """Three descriptive checkpoints across deliberately mismatched constructs."""
    if reporting_bias.get("status") != "descriptive_diagnostic_only":
        return {
            "status": "unavailable",
            "reason": "Reporting-bias monthly aggregates were not built.",
        }
    checkpoint_months = ("2023-05", "2024-01", "2025-06")
    reporting_by_month = {row["month"]: row for row in reporting_bias["monthly"]}
    checkpoints: list[dict[str, Any]] = []
    for month in checkpoint_months:
        neighborhood_totals = [
            row
            for row in monthly_rows
            if _month(row["date"]) == month
            and row["area_type"] == "neighborhood"
            and row["component"] == "total"
        ]
        if len(neighborhood_totals) != 7 or any(row["count"] == "" for row in neighborhood_totals):
            raise DemoBuildError(f"checkpoint {month} lacks seven published area totals")
        published_total = sum(int(float(row["count"])) for row in neighborhood_totals)
        gid = reporting_by_month[month]
        raw = int(gid["encampment_raw"])
        unique_parent = int(gid["encampment_unique_parent"])
        checkpoints.append(
            {
                "month": month,
                "dsdp_all_neighborhood_published_total": published_total,
                "gid_encampment_raw": raw,
                "gid_encampment_unique_parent": unique_parent,
                "raw_reports_per_published_total_unit": round(raw / published_total, 2),
                "unique_parent_requests_per_published_total_unit": round(
                    unique_parent / published_total, 2
                ),
            }
        )
    by_month = {row["month"]: row for row in checkpoints}
    may = by_month["2023-05"]
    january = by_month["2024-01"]
    june = by_month["2025-06"]
    return {
        "status": "descriptive_mismatched_constructs",
        "checkpoints": checkpoints,
        "changes": {
            "published_total_may_2023_to_june_2025_pct": _percent_change(
                float(may["dsdp_all_neighborhood_published_total"]),
                float(june["dsdp_all_neighborhood_published_total"]),
            ),
            "raw_gid_may_2023_to_january_2024_pct": _percent_change(
                float(may["gid_encampment_raw"]),
                float(january["gid_encampment_raw"]),
            ),
        },
        "interpretation": (
            "The three checkpoints show that reporting intensity per published total unit "
            "changed sharply over time. The ratio is a bias diagnostic only and must not "
            "be called reports per person."
        ),
        "noncomparability": [
            (
                "DSDP uses seven published neighborhood totals, including Outside "
                "Perimeter; Get It Done uses the DOWNTOWN community-plan boundary."
            ),
            (
                "The DSDP denominator is a multiplier-adjusted visual observation total, "
                "not unique people; the numerator is reporting events, not incidents."
            ),
            "The selected months are descriptive checkpoints, not an identified time-series model.",
        ],
    }


def _parse_city_date(raw: str) -> date:
    try:
        month, day, short_year = (int(value) for value in raw.split("/"))
        return date(2000 + short_year, month, day)
    except (TypeError, ValueError):
        raise DemoBuildError(f"invalid parking location date: {raw!r}") from None


def _parking_exposure(
    transaction_rows: Iterable[dict[str, str]],
    historic_rows: Iterable[dict[str, str]],
    current_rows: Iterable[dict[str, str]],
    reporting_bias: dict[str, Any],
) -> dict[str, Any]:
    """Build a fixed-meter downtown paid-parking exposure sensitivity."""
    coverage_months = _month_range("2022-01", "2025-12")
    pre_months = _month_range("2023-01", "2023-06")
    post_months = _month_range("2023-08", "2024-01")
    comparison_months = pre_months + post_months
    matched_pre_months = _month_range("2022-08", "2023-01")
    matched_months = matched_pre_months + post_months
    transactions: dict[str, dict[str, int]] = {month: {} for month in coverage_months}
    areas_by_month: dict[str, dict[str, str]] = {month: {} for month in coverage_months}
    transaction_rows_seen = 0
    all_transaction_keys: list[tuple[str, str]] = []
    pole_areas: dict[str, set[str]] = defaultdict(set)
    pole_zones: dict[str, set[str]] = defaultdict(set)
    invalid_transaction_values = 0
    for row in transaction_rows:
        transaction_rows_seen += 1
        try:
            month = f"{int(row['year']):04d}-{int(row['month']):02d}"
            raw_count = float(row["num_trans"])
            if raw_count < 0 or not raw_count.is_integer():
                invalid_transaction_values += 1
            count = int(raw_count)
        except (KeyError, TypeError, ValueError):
            raise DemoBuildError("parking transaction row has malformed year/month/count") from None
        pole = row.get("pole_id", "")
        all_transaction_keys.append((month, pole))
        pole_areas[pole].add(row.get("area", ""))
        pole_zones[pole].add(row.get("zone", ""))
        if row.get("zone") != "Downtown":
            continue
        if month not in transactions:
            continue
        if not pole:
            raise DemoBuildError("parking transaction row lacks pole_id")
        if pole in transactions[month]:
            raise DemoBuildError(f"duplicate parking pole/month row: {pole} {month}")
        if count < 0:
            raise DemoBuildError("parking transaction count cannot be negative")
        transactions[month][pole] = count
        areas_by_month[month][pole] = row.get("area", "")
    if any(not transactions[month] for month in coverage_months):
        missing = [month for month in coverage_months if not transactions[month]]
        raise DemoBuildError(f"parking transaction coverage has empty months: {missing}")

    candidate_cohort = set.intersection(*(set(transactions[month]) for month in comparison_months))
    # Require the source's area classification to stay stable across all 12
    # comparison months as a second guard beyond exact zone equality.
    stable_area_candidates = {
        pole
        for pole in candidate_cohort
        if len({areas_by_month[month][pole] for month in comparison_months}) == 1
    }
    matched_candidates = set.intersection(*(set(transactions[month]) for month in matched_months))
    matched_stable_candidates = {
        pole
        for pole in matched_candidates
        if len({areas_by_month[month][pole] for month in matched_months}) == 1
    }

    history: dict[str, list[tuple[date, date, str]]] = defaultdict(list)
    historic_keys: list[tuple[str, str, str]] = []
    historic_exact_rows: list[tuple[tuple[str, str], ...]] = []
    historic_missing_dates = 0
    for row in historic_rows:
        pole = row.get("pole", "")
        historic_exact_rows.append(tuple(sorted(row.items())))
        historic_keys.append((pole, row.get("start_date", ""), row.get("end_date", "")))
        historic_missing_dates += int(not row.get("start_date", "") or not row.get("end_date", ""))
        if pole not in stable_area_candidates | matched_stable_candidates:
            continue
        history[pole].append(
            (
                _parse_city_date(row.get("start_date", "")),
                _parse_city_date(row.get("end_date", "")),
                row.get("zone", ""),
            )
        )

    def verify_history(candidates: set[str], span_start: date, span_end: date) -> set[str]:
        span_days: list[date] = []
        cursor = span_start
        while cursor <= span_end:
            span_days.append(cursor)
            cursor += timedelta(days=1)
        return {
            pole
            for pole in candidates
            if all(
                any(
                    start <= day <= end and zone == "Downtown" for start, end, zone in history[pole]
                )
                for day in span_days
            )
        }

    verified_cohort = verify_history(stable_area_candidates, date(2023, 1, 1), date(2024, 1, 31))
    matched_verified_cohort = verify_history(
        matched_stable_candidates, date(2022, 8, 1), date(2024, 1, 31)
    )
    if not verified_cohort:
        raise DemoBuildError("no historically verified downtown fixed-meter cohort")
    current_rows_list = list(current_rows)
    current_poles = [row.get("pole", "") for row in current_rows_list]
    current_downtown = {
        row.get("pole", "") for row in current_rows_list if row.get("zone") == "Downtown"
    }

    monthly: list[dict[str, Any]] = []
    for month in coverage_months:
        month_rows = transactions[month]
        monthly.append(
            {
                "month": month,
                "all_downtown_transactions": sum(month_rows.values()),
                "observed_downtown_meters": len(month_rows),
                "fixed_cohort_transactions": (
                    sum(month_rows.get(pole, 0) for pole in verified_cohort)
                    if month in comparison_months
                    else None
                ),
            }
        )
    monthly_by_month = {row["month"]: row for row in monthly}

    def values(field: str, months: list[str]) -> list[float]:
        result: list[float] = []
        for month in months:
            value = monthly_by_month[month][field]
            if value is None:
                raise DemoBuildError(f"parking comparison value missing in {month}")
            result.append(float(value))
        return result

    fixed_change = _level_change(
        values("fixed_cohort_transactions", pre_months),
        values("fixed_cohort_transactions", post_months),
    )
    all_change = _level_change(
        values("all_downtown_transactions", pre_months),
        values("all_downtown_transactions", post_months),
    )
    matched_fixed_change = _level_change(
        [
            float(sum(transactions[month].get(pole, 0) for pole in matched_verified_cohort))
            for month in matched_pre_months
        ],
        [
            float(sum(transactions[month].get(pole, 0) for pole in matched_verified_cohort))
            for month in post_months
        ],
    )
    matched_all_change = _level_change(
        values("all_downtown_transactions", matched_pre_months),
        values("all_downtown_transactions", post_months),
    )
    reporting_context: dict[str, Any] | None = None
    if reporting_bias.get("status") == "descriptive_diagnostic_only":
        comparison = reporting_bias["comparison"]
        reporting_context = {
            "all_gid_reports_percent_change": comparison["all_reports"]["percent_change"],
            "encampment_raw_percent_change": comparison["encampment_raw"]["percent_change"],
            "encampment_unique_parent_percent_change": comparison["encampment_unique_parent"][
                "percent_change"
            ],
        }
    return {
        "status": "descriptive_exposure_sensitivity",
        "source_measure": "num_trans (paid parking transactions)",
        "geography_filter": {"field": "zone", "exact_value": "Downtown"},
        "coverage": {
            "start_month": coverage_months[0],
            "end_month": coverage_months[-1],
            "calendar_months": len(coverage_months),
        },
        "source_quality": {
            "transaction_rows": transaction_rows_seen,
            "duplicate_pole_month_keys": len(all_transaction_keys) - len(set(all_transaction_keys)),
            "negative_or_fractional_transaction_counts": invalid_transaction_values,
            "poles_with_area_label_drift": sum(len(values) > 1 for values in pole_areas.values()),
            "poles_with_zone_label_drift": sum(len(values) > 1 for values in pole_zones.values()),
            "observed_downtown_meter_inventory": {
                "minimum": min(len(transactions[month]) for month in coverage_months),
                "maximum": max(len(transactions[month]) for month in coverage_months),
            },
            "historic_location_exact_duplicate_rows": len(historic_exact_rows)
            - len(set(historic_exact_rows)),
            "historic_parallel_config_extra_rows": len(historic_keys) - len(set(historic_keys)),
            "historic_location_rows_missing_dates": historic_missing_dates,
            "current_inventory_duplicate_poles": len(current_poles) - len(set(current_poles)),
            "treatment": (
                "Primary sensitivity uses a historically continuous, transaction-complete "
                "fixed cohort; changing all-meter inventory remains a disclosed sensitivity."
            ),
        },
        "cohort": {
            "definition": (
                "Poles with a Downtown transaction row in every comparison month, stable "
                "transaction-area label, and continuous historic Downtown location coverage "
                "from 2023-01-01 through 2024-01-31."
            ),
            "transaction_complete_candidates": len(candidate_cohort),
            "stable_area_candidates": len(stable_area_candidates),
            "historically_verified_poles": len(verified_cohort),
            "historic_location_gap_exclusions": len(stable_area_candidates - verified_cohort),
            "still_listed_as_current_downtown": len(verified_cohort & current_downtown),
            "current_status_required_for_cohort": False,
        },
        "monthly": monthly,
        "comparison": {
            "pre_period": {"start_month": "2023-01", "end_month": "2023-06"},
            "transition_excluded": "2023-07",
            "post_period": {"start_month": "2023-08", "end_month": "2024-01"},
            "fixed_cohort": {
                **fixed_change,
                "pre_transactions_per_meter_month": round(
                    float(fixed_change["pre_monthly_mean"]) / len(verified_cohort), 1
                ),
                "post_transactions_per_meter_month": round(
                    float(fixed_change["post_monthly_mean"]) / len(verified_cohort), 1
                ),
            },
            "all_observed_downtown_meters": all_change,
            "matched_calendar_sensitivity": {
                "pre_period": {"start_month": "2022-08", "end_month": "2023-01"},
                "post_period": {"start_month": "2023-08", "end_month": "2024-01"},
                "historically_verified_poles": len(matched_verified_cohort),
                "fixed_cohort": matched_fixed_change,
                "all_observed_downtown_meters": matched_all_change,
                "interpretation": (
                    "Paid-parking transactions also fell in the same six calendar months "
                    "one year apart, so the exposure result is not driven by the unmatched "
                    "seasonal composition of the prepared windows."
                ),
            },
            "reporting_context": reporting_context,
            "interpretation": (
                "Paid-parking transactions did not rise in the aligned windows, while Get "
                "It Done Encampment reporting rose. This weakens a simple broad-footfall "
                "explanation but does not identify why reporting changed."
            ),
        },
        "limitations": [
            "A parking transaction is neither a unique visitor nor a complete trip count.",
            (
                "Rates, hours, meter inventory, payment substitution, free parking, events, "
                "transit, and economic conditions can change transactions."
            ),
            (
                "The fixed cohort conditions on a positive transaction row in every "
                "comparison month; the all-meter result is supplied as a sensitivity."
            ),
            (
                "The pre/post windows contain different calendar months, so seasonality is "
                "not eliminated."
            ),
            (
                "Parking zone Downtown and Get It Done community plan DOWNTOWN are related "
                "labels, not proven identical boundaries."
            ),
        ],
    }


def _parking_exposure_from_dir(directory: Path, reporting_bias: dict[str, Any]) -> dict[str, Any]:
    required = [
        *(directory / name for name in PARKING_TRANSACTION_FILES),
        directory / PARKING_HISTORIC_FILE,
        directory / PARKING_CURRENT_FILE,
    ]
    missing = [path.name for path in required if not path.exists()]
    if missing:
        return {
            "status": "unavailable",
            "reason": f"Optional parking inputs are absent: {', '.join(sorted(missing))}",
        }
    transaction_rows: list[dict[str, str]] = []
    for name in PARKING_TRANSACTION_FILES:
        transaction_rows.extend(_read_csv(directory / name))
    return _parking_exposure(
        transaction_rows,
        _read_csv(directory / PARKING_HISTORIC_FILE),
        _read_csv(directory / PARKING_CURRENT_FILE),
        reporting_bias,
    )


def _count_day_weather(rows: Iterable[dict[str, str]]) -> dict[str, Any]:
    station = "USW00023188"
    dates = ("2024-01-25", "2025-01-31")
    selected: dict[str, dict[str, Any]] = {}
    row_count = 0
    stations: set[str] = set()
    station_dates: list[str] = []
    missing_tmax = 0
    missing_tmin = 0
    negative_precipitation = 0
    impossible_temperature_order = 0
    for row in rows:
        row_count += 1
        stations.add(row.get("STATION", ""))
        if row.get("STATION") != station:
            continue
        station_dates.append(row.get("DATE", ""))
        missing_tmax += int(not row.get("TMAX", ""))
        missing_tmin += int(not row.get("TMIN", ""))
        try:
            if row.get("PRCP", ""):
                negative_precipitation += int(float(row["PRCP"]) < 0)
            if row.get("TMAX", "") and row.get("TMIN", ""):
                impossible_temperature_order += int(float(row["TMAX"]) < float(row["TMIN"]))
        except ValueError:
            raise DemoBuildError("NOAA input contains a malformed weather value") from None
        if row.get("DATE") not in dates:
            continue
        if row["DATE"] in selected:
            raise DemoBuildError("NOAA input duplicates a prepared count date")
        try:
            selected[row["DATE"]] = {
                "date": row["DATE"],
                "precipitation_inches": float(row["PRCP"]),
                "maximum_temperature_f": int(row["TMAX"]),
            }
        except (KeyError, TypeError, ValueError):
            raise DemoBuildError("count-day weather row lacks PRCP or TMAX") from None
    if set(selected) != set(dates):
        raise DemoBuildError("NOAA input lacks one or both prepared count dates")
    first, second = (selected[value] for value in dates)
    return {
        "status": "descriptive_same_day_robustness",
        "station": {
            "id": station,
            "label": "San Diego International Airport",
        },
        "dates": [first, second],
        "source_quality": {
            "rows": row_count,
            "stations": sorted(stations),
            "station_date_start": min(station_dates),
            "station_date_end": max(station_dates),
            "duplicate_station_dates": len(station_dates) - len(set(station_dates)),
            "missing_tmax_rows": missing_tmax,
            "missing_tmin_rows": missing_tmin,
            "negative_precipitation_rows": negative_precipitation,
            "tmax_below_tmin_rows": impossible_temperature_order,
            "selected_rows_complete": True,
            "units": {"PRCP": "inches", "TMAX": "degrees Fahrenheit"},
            "treatment": (
                "Only exact station/date rows enter the descriptive count-day check; "
                "the two selected rows are complete."
            ),
        },
        "comparison": {
            "both_zero_precipitation": (
                first["precipitation_inches"] == second["precipitation_inches"] == 0.0
            ),
            "maximum_temperature_difference_f": (
                second["maximum_temperature_f"] - first["maximum_temperature_f"]
            ),
            "interpretation": (
                "The two fixed-panel count dates were both dry and differed by only 1°F in "
                "maximum temperature at the airport station, ruling out an obvious same-day "
                "rain or maximum-temperature contrast."
            ),
        },
        "limitations": [
            "One airport station may not represent block-level downtown conditions.",
            "Same-day precipitation and maximum temperature do not capture prior weather.",
            "Weather similarity does not make the year-over-year comparison causal.",
        ],
    }


def _count_day_weather_from_path(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "status": "unavailable",
            "reason": "Optional NOAA daily weather input is absent.",
        }
    return _count_day_weather(_read_csv(path))


def _reporting_bias_from_path(path: Path) -> dict[str, Any]:
    try:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            return _reporting_bias(csv.DictReader(handle))
    except FileNotFoundError:
        return {
            "status": "unavailable",
            "reason": (
                "Optional local Get It Done extract is absent; this does not affect the "
                "observation, forecast, evidence, or planner lanes."
            ),
        }


def _raw_units(row: dict[str, str]) -> int | None:
    values = (row["individuals"], row["tents_structures"], row["vehicles"])
    if any(value == "" for value in values):
        return None
    return sum(int(value) for value in values)


def _organizer_quality_audit(
    monthly_rows: list[dict[str, str]],
    panel_rows: list[dict[str, str]],
    full_rows: list[dict[str, str]],
    crosswalk_rows: list[dict[str, str]],
) -> dict[str, Any]:
    """Deterministic anomaly ledger for the organizer-provided analytical lanes."""

    monthly_keys = [(row["date"], row["area"], row["component"]) for row in monthly_rows]
    duplicate_monthly_keys = len(monthly_keys) - len(set(monthly_keys))
    missing_cells = [row for row in monthly_rows if row["count"] == ""]
    missing_flags = Counter(row["flag"] or "unlabeled" for row in missing_cells)
    missing_by_month = Counter(_month(row["date"]) for row in missing_cells)
    invalid_monthly_counts = 0
    for row in monthly_rows:
        if row["count"] == "":
            continue
        try:
            value = float(row["count"])
        except ValueError:
            invalid_monthly_counts += 1
            continue
        invalid_monthly_counts += int(
            not math.isfinite(value) or value < 0 or not value.is_integer()
        )
    core_total_missing_months = sorted(
        {
            _month(row["date"])
            for row in monthly_rows
            if row["area"] in CORE_AREAS and row["component"] == "total" and row["count"] == ""
        }
    )

    grouped_monthly: dict[tuple[str, str], dict[str, dict[str, str]]] = defaultdict(dict)
    for row in monthly_rows:
        grouped_monthly[(row["date"], row["area"])][row["component"]] = row
    formula_differences: list[tuple[str, float, bool]] = []
    for (row_date, _), components in grouped_monthly.items():
        required = ("individual", "tent", "vehicle", "total")
        if not all(name in components and components[name]["count"] != "" for name in required):
            continue
        total_row = components["total"]
        implied = (
            float(components["individual"]["count"])
            + float(components["tent"]["count"]) * float(total_row["tent_multiplier"])
            + float(components["vehicle"]["count"]) * float(total_row["vehicle_multiplier"])
        )
        difference = float(total_row["count"]) - implied
        if not math.isclose(difference, 0.0, abs_tol=1e-9):
            formula_differences.append(
                (_month(row_date), difference, total_row["flag"] == "component_total_mismatch")
            )
    flagged_mismatches = [value for _, value, flagged in formula_differences if flagged]
    flagged_mismatch_months = Counter(month for month, _, flagged in formula_differences if flagged)
    unflagged_rounding = [value for _, value, flagged in formula_differences if not flagged]

    high_tail_flags = []
    total_series: dict[str, list[tuple[str, float]]] = defaultdict(list)
    for row in monthly_rows:
        if row["component"] == "total" and row["count"] != "":
            total_series[row["area"]].append((_month(row["date"]), float(row["count"])))
    for area, values in total_series.items():
        center = median(value for _, value in values)
        mad = median(abs(value - center) for _, value in values)
        if mad == 0:
            continue
        for month, value in values:
            robust_z = 0.6745 * (value - center) / mad
            if abs(robust_z) > 5:
                high_tail_flags.append(
                    {
                        "area": area,
                        "month": month,
                        "total": int(value),
                        "robust_z": round(robust_z, 1),
                    }
                )

    def block_checks(rows: list[dict[str, str]]) -> dict[str, Any]:
        keys = [(row["report_month"], row["block_id"]) for row in rows]
        area_by_block: dict[str, set[str]] = defaultdict(set)
        source_by_block: dict[str, set[str]] = defaultdict(set)
        count_dates: dict[str, set[str]] = defaultdict(set)
        invalid_values = 0
        missing_values = 0
        for row in rows:
            area_by_block[row["block_id"]].add(row["area"])
            source_by_block[row["block_id"]].add(row["neighborhood_source"])
            count_dates[_month(row["report_month"])].add(row["count_date"])
            for field in ("individuals", "tents_structures", "vehicles"):
                raw = row[field]
                if raw == "":
                    missing_values += 1
                    continue
                try:
                    value = float(raw)
                except ValueError:
                    invalid_values += 1
                    continue
                invalid_values += int(value < 0 or not value.is_integer())
        cadence_offsets = sorted(
            month
            for month, dates in count_dates.items()
            if any(_month(count_date) != month for count_date in dates)
        )
        return {
            "rows": len(rows),
            "blocks": len(area_by_block),
            "report_months": len(count_dates),
            "duplicate_block_month_keys": len(keys) - len(set(keys)),
            "blocks_with_area_drift": sum(len(values) > 1 for values in area_by_block.values()),
            "blocks_with_source_label_drift": sum(
                len(values) > 1 for values in source_by_block.values()
            ),
            "report_months_with_multiple_count_dates": sum(
                len(values) > 1 for values in count_dates.values()
            ),
            "report_months_with_count_date_offset": cadence_offsets,
            "missing_component_cells": missing_values,
            "negative_or_fractional_component_cells": invalid_values,
        }

    panel_checks = block_checks(panel_rows)
    full_checks = block_checks(full_rows)
    panel_blocks = {row["block_id"] for row in panel_rows}
    full_panel_blocks = {row["block_id"] for row in full_rows if row.get("in_panel_261") == "True"}
    panel_counts = Counter(_month(row["report_month"]) for row in panel_rows)

    block_components: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {"individual": 0, "tent": 0, "vehicle": 0}
    )
    block_names = {
        "individuals": "individual",
        "tents_structures": "tent",
        "vehicles": "vehicle",
    }
    for row in full_rows:
        month = _month(row["report_month"])
        if row["area"] not in CORE_AREAS:
            continue
        for source_name, output_name in block_names.items():
            if row[source_name] != "":
                block_components[(month, row["area"])][output_name] += int(row[source_name])
    monthly_components: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)
    for row in monthly_rows:
        month = _month(row["date"])
        if (
            row["area"] in CORE_AREAS
            and row["component"] in {"individual", "tent", "vehicle"}
            and row["count"] != ""
        ):
            monthly_components[(month, row["area"])][row["component"]] = int(float(row["count"]))
    comparisons: list[tuple[tuple[str, str], dict[str, int]]] = []
    for key in sorted(set(block_components) & set(monthly_components)):
        if set(monthly_components[key]) != {"individual", "tent", "vehicle"}:
            continue
        deltas = {
            component: block_components[key][component] - monthly_components[key][component]
            for component in ("individual", "tent", "vehicle")
        }
        comparisons.append((key, deltas))
    selected_cross_lane: list[dict[str, Any]] = []
    for month in ("2024-01", "2025-01"):
        block_totals = {name: 0 for name in ("individual", "tent", "vehicle")}
        monthly_totals = {name: 0 for name in ("individual", "tent", "vehicle")}
        for (candidate_month, _), block_values in block_components.items():
            if candidate_month == month:
                for component, value in block_values.items():
                    block_totals[component] += value
        for (candidate_month, _), monthly_block_values in monthly_components.items():
            if candidate_month == month:
                for component, value in monthly_block_values.items():
                    monthly_totals[component] += value
        selected_cross_lane.append(
            {
                "month": month,
                "block_map_digitization": block_totals,
                "monthly_table_digitization": monthly_totals,
            }
        )

    crosswalk_pairs = [(row["source_file"], row["source_label"]) for row in crosswalk_rows]
    crosswalk_map = {
        (row["source_file"], row["source_label"]): row["canonical_area"] for row in crosswalk_rows
    }
    monthly_labels = {row["area_source_label"] for row in monthly_rows}
    block_labels = {row["neighborhood_source"] for row in full_rows}
    unmapped_monthly = monthly_labels - {
        label for source, label in crosswalk_map if source == "RawCounts_AllYears.csv"
    }
    unmapped_blocks = block_labels - {
        label
        for source, label in crosswalk_map
        if source == "Downtown_BlockGrid / BlockLevel_Counts"
    }

    return {
        "status": "audited_with_retained_source_values",
        "policy": (
            "No cherry-picked corrections: retain source values, fail closed on structural "
            "violations used by a claim, and disclose material descriptive anomalies."
        ),
        "ledger": [
            {
                "id": "monthly_missing_cells",
                "count": len(missing_cells),
                "affected_claim": "Monthly completeness and forecast origins",
                "treatment": "Retain as null; never zero-fill or interpolate.",
            },
            {
                "id": "component_total_mismatch_area_months",
                "count": len(flagged_mismatches),
                "affected_claim": "Component-derived estimates",
                "treatment": "Use published totals for trend; label components secondary.",
            },
            {
                "id": "robust_monthly_high_tail_flags",
                "count": len(high_tail_flags),
                "affected_claim": "Subarea descriptive levels",
                "treatment": "Retain without correction; none enters the core-total lead.",
            },
            {
                "id": "panel_missing_component_cells",
                "count": panel_checks["missing_component_cells"],
                "affected_claim": "Annual panel sensitivity",
                "treatment": (
                    "Exclude both annual pairs touching the missing January 2020 cell; "
                    "the prepared 2024-2025 comparison is complete."
                ),
            },
            {
                "id": "cross_digitization_area_month_differences",
                "count": sum(
                    any(value != 0 for value in deltas.values()) for _, deltas in comparisons
                ),
                "affected_claim": "Component-level spatial change",
                "treatment": (
                    "Disclose separate-digitization sensitivity; do not call it independent "
                    "validation."
                ),
            },
            {
                "id": "report_month_count_date_offsets",
                "count": len(panel_checks["report_months_with_count_date_offset"]),
                "affected_claim": "Panel time alignment",
                "treatment": "Index by organizer report_month, not count-date calendar month.",
            },
        ],
        "monthly_table": {
            "rows": len(monthly_rows),
            "duplicate_date_area_component_keys": duplicate_monthly_keys,
            "missing_component_cells": len(missing_cells),
            "negative_fractional_or_nonfinite_counts": invalid_monthly_counts,
            "missing_flags": dict(sorted(missing_flags.items())),
            "missing_cells_by_month": dict(sorted(missing_by_month.items())),
            "core_total_missing_months": core_total_missing_months,
            "material_component_total_mismatch_area_months": len(flagged_mismatches),
            "maximum_material_mismatch_units": round(
                max((abs(value) for value in flagged_mismatches), default=0.0), 1
            ),
            "material_mismatch_area_months_by_month": dict(sorted(flagged_mismatch_months.items())),
            "unflagged_formula_differences": len(unflagged_rounding),
            "maximum_unflagged_formula_difference": round(
                max((abs(value) for value in unflagged_rounding), default=0.0), 2
            ),
            "unflagged_formula_difference_note": (
                "Published totals are integer values while raw tent/vehicle components use "
                "decimal multipliers; small unflagged residuals are expected rounding, "
                "distinct from source-flagged material mismatches."
            ),
            "robust_high_tail_flags_gt_5_mad": high_tail_flags,
            "treatment": (
                "Published total rows are authoritative; missing values remain null; "
                "component-derived results are explicitly secondary."
            ),
        },
        "balanced_panel": {
            **panel_checks,
            "rows_per_report_month": dict(sorted(panel_counts.items())),
            "panel_membership_matches_full_file_flag": panel_blocks == full_panel_blocks,
            "treatment": "All selected spatial claims require the complete fixed 261-block panel.",
        },
        "expanded_block_file": {
            **full_checks,
            "treatment": (
                "The expanded footprint is used only for coverage sensitivity; its one "
                "missing component cell is outside the prepared comparison."
            ),
        },
        "cross_digitization_consistency": {
            "comparable_core_area_months": len(comparisons),
            "area_months_with_any_difference": sum(
                any(value != 0 for value in deltas.values()) for _, deltas in comparisons
            ),
            "maximum_absolute_delta": {
                component: max(abs(deltas[component]) for _, deltas in comparisons)
                for component in ("individual", "tent", "vehicle")
            },
            "prepared_months": selected_cross_lane,
            "direction_consistent_in_prepared_change": all(
                (
                    selected_cross_lane[1]["block_map_digitization"][component]
                    - selected_cross_lane[0]["block_map_digitization"][component]
                )
                * (
                    selected_cross_lane[1]["monthly_table_digitization"][component]
                    - selected_cross_lane[0]["monthly_table_digitization"][component]
                )
                > 0
                for component in ("individual", "tent", "vehicle")
            ),
            "treatment": (
                "These are separate digitizations of the same underlying map images, not "
                "independent validation. Spatial claims use block-map values; the published "
                "monthly total remains authoritative for trend and forecasting."
            ),
        },
        "area_crosswalk": {
            "rows": len(crosswalk_rows),
            "duplicate_source_label_keys": len(crosswalk_pairs) - len(set(crosswalk_pairs)),
            "unmapped_monthly_source_labels": sorted(unmapped_monthly),
            "unmapped_block_source_labels": sorted(unmapped_blocks),
            "treatment": "No unmapped label enters a prepared aggregate.",
        },
    }


def _adjusted_units(row: dict[str, str]) -> float | None:
    values = (row["individuals"], row["tents_structures"], row["vehicles"])
    if any(value == "" for value in values):
        return None
    return (
        int(row["individuals"]) + 1.75 * int(row["tents_structures"]) + 2.03 * int(row["vehicles"])
    )


def _spatial_metrics(
    before: dict[str, dict[str, str]], after: dict[str, dict[str, str]]
) -> dict[str, Any]:
    if set(before) != set(after):
        raise DemoBuildError("spatial comparison does not use an identical block panel")

    changes: list[int] = []
    before_total = 0
    after_total = 0
    before_active = 0
    after_active = 0
    component_before = {"individuals": 0, "tents_structures": 0, "vehicles": 0}
    component_after = {"individuals": 0, "tents_structures": 0, "vehicles": 0}
    for key in sorted(before):
        left = _raw_units(before[key])
        right = _raw_units(after[key])
        if left is None or right is None:
            raise DemoBuildError("selected spatial comparison contains an unreported unit")
        before_total += left
        after_total += right
        before_active += int(left > 0)
        after_active += int(right > 0)
        changes.append(right - left)
        for component in component_before:
            component_before[component] += int(before[key][component])
            component_after[component] += int(after[key][component])

    return {
        "raw_observation_units": {
            "from": before_total,
            "to": after_total,
            "change": after_total - before_total,
            "change_pct": _percent_change(before_total, after_total),
        },
        "active_blocks": {
            "from": before_active,
            "to": after_active,
            "change": after_active - before_active,
            "change_pct": _percent_change(before_active, after_active),
        },
        "gross_change": {
            "increase_units_on_blocks_with_growth": sum(value for value in changes if value > 0),
            "decrease_units_on_blocks_with_decline": -sum(value for value in changes if value < 0),
            "blocks_with_increase": sum(value > 0 for value in changes),
            "blocks_with_decrease": sum(value < 0 for value in changes),
            "blocks_unchanged": sum(value == 0 for value in changes),
        },
        "components": {
            name: {
                "from": component_before[name],
                "to": component_after[name],
                "change": component_after[name] - component_before[name],
            }
            for name in component_before
        },
    }


def _spatial_distribution_sensitivity(
    before: dict[str, dict[str, str]], after: dict[str, dict[str, str]]
) -> dict[str, Any]:
    if set(before) != set(after):
        raise DemoBuildError("distribution sensitivity requires an identical block panel")
    before_values: dict[str, int] = {}
    after_values: dict[str, int] = {}
    for key in before:
        left = _raw_units(before[key])
        right = _raw_units(after[key])
        if left is None or right is None:
            raise DemoBuildError("distribution sensitivity contains an unreported unit")
        before_values[key] = left
        after_values[key] = right

    thresholds: list[dict[str, Any]] = []
    for threshold in (1, 2, 3):
        left_active = {key for key, value in before_values.items() if value >= threshold}
        right_active = {key for key, value in after_values.items() if value >= threshold}
        thresholds.append(
            {
                "minimum_raw_units": threshold,
                "from_active_blocks": len(left_active),
                "to_active_blocks": len(right_active),
                "change": len(right_active) - len(left_active),
                "entered_threshold": len(right_active - left_active),
                "exited_threshold": len(left_active - right_active),
                "retained_at_threshold": len(left_active & right_active),
            }
        )

    def concentration(values: dict[str, int]) -> tuple[float, float]:
        total = sum(values.values())
        if total <= 0:
            raise DemoBuildError("concentration requires a positive raw-unit total")
        hhi = sum((value / total) ** 2 for value in values.values())
        return hhi, 1 / hhi

    before_hhi, before_effective = concentration(before_values)
    after_hhi, after_effective = concentration(after_values)
    return {
        "active_block_thresholds": thresholds,
        "single_unit_blocks": {
            "from": sum(value == 1 for value in before_values.values()),
            "to": sum(value == 1 for value in after_values.values()),
            "change": sum(value == 1 for value in after_values.values())
            - sum(value == 1 for value in before_values.values()),
        },
        "concentration": {
            "measure": (
                "HHI of each block's share of raw observation units; lower HHI and a "
                "higher effective number indicate more even intensity."
            ),
            "from": {
                "hhi": round(before_hhi, 6),
                "effective_number_of_blocks": round(before_effective, 1),
            },
            "to": {
                "hhi": round(after_hhi, 6),
                "effective_number_of_blocks": round(after_effective, 1),
            },
            "hhi_change_pct": _percent_change(before_hhi, after_hhi),
            "effective_blocks_change_pct": _percent_change(
                before_effective,
                after_effective,
            ),
        },
        "interpretation": (
            "The extensive-margin increase survives after excluding one-unit blocks "
            "(91 to 101 at a two-unit threshold), but disappears at three units (70 to "
            "70). The mixed-index HHI rises and effective blocks fall, but component-specific "
            "results show this is driven by the shift away from tents, whose footprint "
            "contracted and concentration rose; individual concentration was nearly flat."
        ),
    }


def _component_distribution_sensitivity(
    before: dict[str, dict[str, str]], after: dict[str, dict[str, str]]
) -> dict[str, Any]:
    """Compare like-for-like component levels and block footprints.

    This is the primary footprint sensitivity because the numerator and the
    block threshold use the same component. The mixed raw-unit index remains a
    useful secondary summary, but a tent and an individual are not treated as
    interchangeable in this result.
    """
    if set(before) != set(after):
        raise DemoBuildError("component sensitivity requires an identical block panel")
    labels = {
        "individuals": "Individuals observed",
        "tents_structures": "Tents or structures observed",
        "vehicles": "Vehicles observed",
    }
    components: list[dict[str, Any]] = []
    totals_by_component: dict[str, tuple[int, int]] = {}
    for component, label in labels.items():
        left_values = {key: int(row[component]) for key, row in before.items()}
        right_values = {key: int(row[component]) for key, row in after.items()}
        thresholds = []
        for threshold in (1, 2):
            left_active = {key for key, value in left_values.items() if value >= threshold}
            right_active = {key for key, value in right_values.items() if value >= threshold}
            thresholds.append(
                {
                    "minimum_component_units": threshold,
                    "from_active_blocks": len(left_active),
                    "to_active_blocks": len(right_active),
                    "change": len(right_active) - len(left_active),
                    "entered_threshold": len(right_active - left_active),
                    "exited_threshold": len(left_active - right_active),
                    "retained_at_threshold": len(left_active & right_active),
                }
            )
        left_total, right_total = sum(left_values.values()), sum(right_values.values())
        totals_by_component[component] = (left_total, right_total)

        def concentration(values: dict[str, int], total: int) -> dict[str, float]:
            if total <= 0:
                raise DemoBuildError("component concentration requires a positive total")
            hhi = sum((value / total) ** 2 for value in values.values())
            return {
                "hhi": round(hhi, 6),
                "effective_number_of_blocks": round(1 / hhi, 1),
            }

        left_concentration = concentration(left_values, left_total)
        right_concentration = concentration(right_values, right_total)
        components.append(
            {
                "component": component,
                "label": label,
                "observed_units": {
                    "from": left_total,
                    "to": right_total,
                    "change": right_total - left_total,
                    "change_pct": _percent_change(left_total, right_total),
                },
                "active_block_thresholds": thresholds,
                "concentration": {
                    "measure": "HHI of each block's share of this component.",
                    "from": left_concentration,
                    "to": right_concentration,
                    "hhi_change_pct": _percent_change(
                        left_concentration["hhi"], right_concentration["hhi"]
                    ),
                    "effective_blocks_change_pct": _percent_change(
                        left_concentration["effective_number_of_blocks"],
                        right_concentration["effective_number_of_blocks"],
                    ),
                },
            }
        )
    before_adjusted = (
        totals_by_component["individuals"][0]
        + 1.75 * totals_by_component["tents_structures"][0]
        + 2.03 * totals_by_component["vehicles"][0]
    )
    after_adjusted = (
        totals_by_component["individuals"][1]
        + 1.75 * totals_by_component["tents_structures"][1]
        + 2.03 * totals_by_component["vehicles"][1]
    )
    return {
        "role": "primary_spatial_sensitivity",
        "lead_component": "individuals",
        "components": components,
        "post2020_multiplier_decomposition": {
            "status": "secondary_derived_estimate",
            "formula": "individuals + 1.75*tents_structures + 2.03*vehicles",
            "from": round(before_adjusted, 2),
            "to": round(after_adjusted, 2),
            "change": round(after_adjusted - before_adjusted, 2),
            "change_pct": _percent_change(before_adjusted, after_adjusted),
            "contributions_to_change": {
                "individuals": round(
                    totals_by_component["individuals"][1] - totals_by_component["individuals"][0],
                    2,
                ),
                "tents_structures": round(
                    1.75
                    * (
                        totals_by_component["tents_structures"][1]
                        - totals_by_component["tents_structures"][0]
                    ),
                    2,
                ),
                "vehicles": round(
                    2.03
                    * (totals_by_component["vehicles"][1] - totals_by_component["vehicles"][0]),
                    2,
                ),
            },
            "interpretation": (
                "The derived decline is structure-driven and partly offset by more visually "
                "observed individuals. It is based on secondary component digitization and "
                "must not be equated with unique people or the published total series."
            ),
        },
        "headline": (
            "Individuals observed rose from 510 to 548 while blocks with at least one "
            "individual rose from 111 to 136; the block increase remains at a "
            "two-observed-individual threshold (78 to 94)."
        ),
        "interpretation": (
            "The like-for-like individual footprint widened at both prespecified thresholds, "
            "while individual concentration was nearly unchanged. Tent and vehicle "
            "footprints contracted, and tent concentration rose sharply. Thus, the mixed-index "
            "HHI increase is composition-driven. These are aggregate visual observations, "
            "not unique people or linked movements."
        ),
    }


def _footprint_sensitivity(
    full_rows: list[dict[str, str]], panel_rows: list[dict[str, str]]
) -> dict[str, Any]:
    from_month = "2021-02"
    to_month = "2023-01"

    def summary(rows: list[dict[str, str]]) -> dict[str, Any]:
        selected = {
            month: [row for row in rows if _month(row["report_month"]) == month]
            for month in (from_month, to_month)
        }
        values: dict[str, float] = {}
        for month, month_rows in selected.items():
            adjusted = [_adjusted_units(row) for row in month_rows]
            if not month_rows or any(value is None for value in adjusted):
                raise DemoBuildError(f"footprint sensitivity is incomplete for {month}")
            values[month] = sum(value for value in adjusted if value is not None)
        return {
            "blocks": {
                "from": len(selected[from_month]),
                "to": len(selected[to_month]),
            },
            "adjusted_estimate": {
                "from": round(values[from_month], 2),
                "to": round(values[to_month], 2),
                "change_pct": _percent_change(values[from_month], values[to_month]),
            },
        }

    expanded = summary(full_rows)
    balanced = summary(panel_rows)
    expanded_change = expanded["adjusted_estimate"]["change_pct"]
    balanced_change = balanced["adjusted_estimate"]["change_pct"]
    if expanded_change is None or balanced_change is None:
        raise DemoBuildError("footprint sensitivity has a zero comparison base")
    return {
        "comparison": {"from_month": from_month, "to_month": to_month},
        "measure": (
            "Block-level estimate using POST2020 factors: individuals + 1.75*tents + 2.03*vehicles."
        ),
        "expanded_footprint": expanded,
        "balanced_261_panel": balanced,
        "expansion_overstatement_percentage_points": round(expanded_change - balanced_change, 1),
        "conclusion": (
            "The apparent increase is materially larger when 121 newly covered blocks are "
            "mistaken for longitudinal change; all primary spatial comparisons use panel261."
        ),
    }


def _annual_panel_contrasts(rows: list[dict[str, str]]) -> dict[str, Any]:
    by_month: dict[str, dict[str, int | None]] = defaultdict(dict)
    for row in rows:
        month = _month(row["report_month"])
        value = _raw_units(row)
        by_month[month][row["block_id"]] = value
    contrasts: list[dict[str, Any]] = []
    ineligible: list[dict[str, Any]] = []
    for to_month in sorted(by_month):
        from_month = f"{int(to_month[:4]) - 1:04d}-{to_month[5:]}"
        if from_month not in by_month:
            continue
        before, after = by_month[from_month], by_month[to_month]
        if set(before) != set(after) or len(before) != 261:
            raise DemoBuildError("annual contrast does not use the complete panel")
        missing_values = sum(value is None for value in before.values()) + sum(
            value is None for value in after.values()
        )
        if missing_values:
            ineligible.append(
                {
                    "from_month": from_month,
                    "to_month": to_month,
                    "reason": "At least one component cell is unreported; no zero imputation.",
                    "missing_block_rows": missing_values,
                }
            )
            continue
        before_complete = [value for value in before.values() if value is not None]
        after_complete = [value for value in after.values() if value is not None]
        before_total, after_total = sum(before_complete), sum(after_complete)
        before_active = sum(value >= 1 for value in before_complete)
        after_active = sum(value >= 1 for value in after_complete)
        total_change_pct = _percent_change(before_total, after_total)
        active_change_pct = _percent_change(before_active, after_active)
        if total_change_pct is None or active_change_pct is None:
            raise DemoBuildError("annual contrast has a zero comparison base")
        contrasts.append(
            {
                "from_month": from_month,
                "to_month": to_month,
                "raw_units_change_pct": total_change_pct,
                "active_blocks_change_pct": active_change_pct,
                "active_blocks_change": after_active - before_active,
                "direction_divergence_percentage_points": round(
                    active_change_pct - total_change_pct, 1
                ),
                "selected": from_month == "2024-01" and to_month == "2025-01",
            }
        )
    selected = next((row for row in contrasts if row["selected"]), None)
    if selected is None:
        raise DemoBuildError("prepared annual panel contrast is unavailable")
    divergence_rank = 1 + sum(
        row["direction_divergence_percentage_points"]
        > selected["direction_divergence_percentage_points"]
        for row in contrasts
    )
    return {
        "selection_rule": "Most recent eligible same-month year-over-year panel contrast.",
        "eligible_contrasts": len(contrasts),
        "ineligible_contrasts": ineligible,
        "selected_divergence_rank_descending": divergence_rank,
        "contrasts": contrasts,
        "interpretation": (
            "The prepared contrast was selected as the most recent eligible annual pair, "
            "not by maximizing divergence. It has the largest total-down/active-up gap "
            f"among the {len(contrasts)} complete contrasts. Two otherwise available annual "
            "pairs are excluded rather than imputing a missing January 2020 tent cell. The "
            "prepared result is unusually strong rather than a typical year."
        ),
    }


def _balanced_panel_evidence(
    rows: list[dict[str, str]], full_rows: list[dict[str, str]]
) -> dict[str, Any]:
    from_month = "2024-01"
    to_month = "2025-01"
    by_month: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    for row in rows:
        month = _month(row["report_month"])
        key = row["block_id"]
        if key in by_month[month]:
            raise DemoBuildError(f"duplicate panel row in {month}")
        by_month[month][key] = row

    before = by_month.get(from_month, {})
    after = by_month.get(to_month, {})
    if len(before) != 261 or len(after) != 261:
        raise DemoBuildError("prepared comparison requires all 261 panel blocks")

    areas: list[dict[str, Any]] = []
    for area in CORE_AREAS:
        area_before = {key: row for key, row in before.items() if row["area"] == area}
        area_after = {key: row for key, row in after.items() if row["area"] == area}
        area_metrics = _spatial_metrics(area_before, area_after)
        # Component cells can be very small at area grain.  The UI needs the
        # total/active-block contrast, not these secondary component cells;
        # omit them rather than publishing suppressible values.
        del area_metrics["components"]
        areas.append(
            {
                "area": area,
                "panel_blocks": len(area_before),
                **area_metrics,
            }
        )

    return {
        "panel_size": 261,
        "comparison": {
            "from_month": from_month,
            "to_month": to_month,
            "why_these_months": (
                "This is the latest available same-month year-over-year pair: the same "
                "POST2020 method and exactly the same 261 blocks on both dates. It was "
                "not selected by maximizing the observed divergence."
            ),
        },
        "measure": {
            "id": "raw_observation_units",
            "role": "secondary_composite_index",
            "formula": "individuals + tents_structures + vehicles",
            "reason": (
                "The block maps contain raw observed units. Occupancy multipliers are not "
                "applied, so this is not an estimated person total."
            ),
        },
        **_spatial_metrics(before, after),
        "component_distribution_sensitivity": _component_distribution_sensitivity(before, after),
        "distribution_sensitivity": _spatial_distribution_sensitivity(before, after),
        "areas": areas,
        "annual_contrast_sensitivity": _annual_panel_contrasts(rows),
        "footprint_sensitivity": _footprint_sensitivity(full_rows, rows),
        "validity_checks": {
            "same_block_set": set(before) == set(after),
            "same_month_of_year": from_month[5:] == to_month[5:],
            "same_methodology": "POST2020",
            "complete_selected_panel": len(before) == len(after) == 261,
            "expanded_footprint_excluded": True,
            "comparison_selection": "latest eligible same-month year-over-year pair",
            "claim_guard": (
                "Gross increases and decreases are arithmetic changes on blocks. They do "
                "not link observations across time and cannot establish person movement."
            ),
        },
        "interpretation": (
            "The like-for-like individual footprint widened at the one- and two-person "
            "thresholds while tent and vehicle footprints contracted. The mixed raw-unit "
            "index is retained as a secondary summary. This is not a claim of more even "
            "intensity or evidence that any identified person moved."
        ),
        "privacy": "Only aggregate summaries ship; block identifiers and geometry are omitted.",
    }


Predictor = Callable[[str, dict[str, float]], float | None]


def _seasonal_naive(target: str, observed: dict[str, float]) -> float | None:
    return observed.get(_shift_month(target, -12))


def _recent_three(target: str, observed: dict[str, float]) -> float | None:
    prior = [observed[month] for month in sorted(observed) if month < target]
    if len(prior) < 3:
        return None
    return sum(prior[-3:]) / 3


def _local_linear_six(target: str, observed: dict[str, float]) -> float | None:
    prior = [(month, observed[month]) for month in sorted(observed) if month < target]
    if len(prior) < 6:
        return None
    recent = prior[-6:]

    def ordinal(month: str) -> int:
        return int(month[:4]) * 12 + int(month[5:7]) - 1

    xs = [float(ordinal(month)) for month, _ in recent]
    ys = [value for _, value in recent]
    x_mean = sum(xs) / len(xs)
    y_mean = sum(ys) / len(ys)
    denominator = sum((value - x_mean) ** 2 for value in xs)
    if denominator == 0:
        return y_mean
    slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys, strict=True)) / denominator
    prediction = y_mean + slope * (ordinal(target) - x_mean)
    return max(0.0, prediction)


MODELS: dict[str, Predictor] = {
    "local_linear_6_observed": _local_linear_six,
    "recent_3_observed_mean": _recent_three,
    "seasonal_naive_12m": _seasonal_naive,
}


def _predictions(
    series: dict[str, float], start: str, end: str, predictor: Predictor
) -> list[tuple[str, float, float]]:
    results: list[tuple[str, float, float]] = []
    for month in _month_range(start, end):
        actual = series.get(month)
        prediction = predictor(month, {key: value for key, value in series.items() if key < month})
        if actual is not None and prediction is not None:
            results.append((month, actual, prediction))
    return results


def _point_metrics(predictions: list[tuple[str, float, float]]) -> dict[str, Any]:
    if not predictions:
        return {"evaluated_points": 0, "mae": None, "wape_pct": None}
    errors = [actual - predicted for _, actual, predicted in predictions]
    denominator = sum(actual for _, actual, _ in predictions)
    return {
        "evaluated_points": len(predictions),
        "mae": round(sum(abs(error) for error in errors) / len(errors), 1),
        "wape_pct": (
            round(sum(abs(error) for error in errors) / denominator * 100, 1)
            if denominator
            else None
        ),
    }


def _promote_model(scorecard: list[dict[str, Any]]) -> tuple[str, bool]:
    baseline_name = "seasonal_naive_12m"
    by_name = {item["model"]: item for item in scorecard}
    baseline = by_name.get(baseline_name)
    if baseline is None or baseline["mae"] is None:
        raise DemoBuildError("seasonal-naive baseline is not evaluable on the promotion holdout")
    challengers = [
        item for item in scorecard if item["model"] != baseline_name and item["mae"] is not None
    ]
    if not challengers:
        return baseline_name, False
    best = min(challengers, key=lambda item: (item["mae"], item["model"]))
    # Strict improvement only.  A tie cannot displace the registered baseline.
    if best["mae"] < baseline["mae"]:
        return str(best["model"]), True
    return baseline_name, False


def _forecast_series(area: str, series: dict[str, float], target: str) -> dict[str, Any]:
    eligible = {month: value for month, value in series.items() if month >= FORECAST_TRAINING_START}
    scorecard: list[dict[str, Any]] = []
    promotion_predictions: dict[str, list[tuple[str, float, float]]] = {}
    for model, predictor in sorted(MODELS.items()):
        predictions = _predictions(eligible, PROMOTION_START, PROMOTION_END, predictor)
        promotion_predictions[model] = predictions
        scorecard.append(
            {
                "model": model,
                "role": "registered_baseline" if model == "seasonal_naive_12m" else "challenger",
                **_point_metrics(predictions),
            }
        )

    try:
        selected, promoted = _promote_model(scorecard)
    except DemoBuildError:
        return {
            "area": area,
            "status": "insufficient_forecast_evidence",
            "model": None,
            "point": None,
            "lower": None,
            "upper": None,
            "interval_level": INTERVAL_LEVEL,
            "model_scorecard": scorecard,
            "promotion": None,
            "backtest": {
                "evaluated_points": 0,
                "mae": None,
                "wape_pct": None,
                "interval_points": 0,
                "empirical_coverage_pct": None,
            },
            "limitations": [
                "The registered baseline could not be scored on the promotion holdout."
            ],
        }

    predictor = MODELS[selected]
    audit = _predictions(eligible, AUDIT_START, AUDIT_END, predictor)
    calibration_predictions = _predictions(eligible, CALIBRATION_START, CALIBRATION_END, predictor)
    calibration = [abs(actual - predicted) for _, actual, predicted in calibration_predictions]
    covered = 0
    interval_points = 0
    for _, actual, predicted in audit:
        if calibration:
            radius = _conformal_radius(calibration, INTERVAL_LEVEL)
            lower = max(0.0, predicted - radius)
            upper = predicted + radius
            interval_points += 1
            covered += int(lower <= actual <= upper)
        calibration.append(abs(actual - predicted))

    point = predictor(target, eligible)
    promotion = {
        "baseline_model": "seasonal_naive_12m",
        "selected_model": selected,
        "challenger_promoted": promoted,
        "criterion": (
            "A challenger is promoted only for strictly lower rolling-origin MAE on the "
            "2023 promotion holdout; ties retain seasonal naive."
        ),
    }
    if point is None or not audit:
        return {
            "area": area,
            "status": "insufficient_forecast_evidence",
            "model": selected,
            "point": None,
            "lower": None,
            "upper": None,
            "interval_level": INTERVAL_LEVEL,
            "model_scorecard": scorecard,
            "promotion": promotion,
            "backtest": {
                **_point_metrics(audit),
                "interval_points": interval_points,
                "empirical_coverage_pct": (
                    round(covered / interval_points * 100, 1) if interval_points else None
                ),
            },
            "limitations": ["The selected model cannot produce the requested target."],
        }

    radius = _conformal_radius(calibration, INTERVAL_LEVEL)
    lower = max(0.0, point - radius)
    upper = point + radius
    return {
        "area": area,
        "status": "ok",
        "model": selected,
        "point": round(point, 1),
        "lower": round(lower, 1),
        "upper": round(upper, 1),
        "interval_level": INTERVAL_LEVEL,
        "model_scorecard": scorecard,
        "promotion": promotion,
        "backtest": {
            **_point_metrics(audit),
            "interval_points": interval_points,
            "empirical_coverage_pct": (
                round(covered / interval_points * 100, 1) if interval_points else None
            ),
        },
        "limitations": [
            "A planning baseline, not a prediction of service need or an operational target.",
            (
                "The symmetric residual-quantile interval is conformal-style, not a "
                "guarantee under structural change."
            ),
        ],
    }


def _forecast(observations: dict[str, Any]) -> dict[str, Any]:
    history = observations["history"]
    aggregate_series = {
        row["month"]: float(row["total"]) for row in history if row["total"] is not None
    }
    latest = observations["coverage"]["latest_reported_month"]
    target = _shift_month(latest, 1)
    areas = [
        _forecast_series(area, observations["_area_series"][area], target) for area in CORE_AREAS
    ]
    return {
        "scenario_status": "historical_one_step_ahead_planning_scenario",
        "target_month": target,
        "data_frozen_through": latest,
        "current_use_guard": (
            "Replays the decision that could have been made with data frozen through "
            "2025-12; it is not a live forecast as of artifact generation."
        ),
        "training_window": {
            "start_month": FORECAST_TRAINING_START,
            "end_month": latest,
            "why": (
                "Starts after the final Fellowship-assisted count; all months use the "
                "unchanged POST2020 DSDP multiplier method."
            ),
            "missing_values": "Retained as missing and skipped; never imputed as zero.",
        },
        "selection_rule": {
            "models": sorted(MODELS),
            "promotion_holdout": f"{PROMOTION_START}..{PROMOTION_END}",
            "interval_calibration_window": f"{CALIBRATION_START}..{CALIBRATION_END}",
            "final_audit_window": f"{AUDIT_START}..{AUDIT_END}",
            "rule": (
                "Seasonal naive remains the baseline unless the best challenger has "
                "strictly lower rolling-origin MAE on the 2023 promotion holdout; WAPE "
                "is reported as a scale-relative diagnostic but does not govern promotion."
            ),
            "leakage_control": (
                "No random split: promotion ends before the separately reported 2025 audit. "
                "Each origin can read only observations earlier than its target."
            ),
            "interval_method": (
                "Symmetric 80% finite-sample-corrected absolute-residual quantile, "
                "calibrated on 2024 origins and checked with walk-forward empirical "
                "coverage on the 2025 audit."
            ),
        },
        "aggregate": _forecast_series("Six-area downtown core", aggregate_series, target),
        "areas": areas,
    }


def _largest_remainder_allocations(
    loads: dict[str, float], budget: int, minimum: int
) -> dict[str, int]:
    if budget < minimum * len(loads):
        raise DemoBuildError(
            f"budget {budget} cannot satisfy {minimum} hours across {len(loads)} areas"
        )
    remaining = budget - minimum * len(loads)
    load_total = sum(loads.values())
    if load_total <= 0:
        raise DemoBuildError("planner requires a positive aggregate planning load")
    exact = {area: remaining * load / load_total for area, load in loads.items()}
    variable = {area: math.floor(value) for area, value in exact.items()}
    leftover = remaining - sum(variable.values())
    order = sorted(loads, key=lambda area: (-(exact[area] - variable[area]), area))
    for area in order[:leftover]:
        variable[area] += 1
    return {area: minimum + variable[area] for area in loads}


def _planner(forecast: dict[str, Any], budget: int, minimum: int) -> dict[str, Any]:
    eligible = [area for area in forecast["areas"] if area["status"] == "ok"]
    if len(eligible) != len(CORE_AREAS):
        raise DemoBuildError("prepared planner requires a forecast for every core area")
    loads = {area["area"]: float(area["upper"]) for area in eligible}
    hours = _largest_remainder_allocations(loads, budget, minimum)
    total_load = sum(loads.values())
    allocations = []
    for area in eligible:
        name = area["area"]
        variable = hours[name] - minimum
        allocations.append(
            {
                "area": name,
                "planning_load": loads[name],
                "planning_load_definition": "upper bound of the area monthly baseline",
                "load_share_pct": round(loads[name] / total_load * 100, 1),
                "base_hours": minimum,
                "variable_hours": variable,
                "allocated_hours": hours[name],
                "reason": (
                    f"{minimum}h user-set coverage-continuity floor plus a proportional "
                    "share of the remaining hours using the uncertainty-aware planning load."
                ),
            }
        )
    return {
        "status": "prepared_decision_support",
        "decision_support_only": True,
        "budget_hours": budget,
        "minimum_hours_per_area": minimum,
        "basis": (
            "Every area receives a user-set coverage-continuity floor; remaining whole "
            "staff-hours are distributed by forecast upper bound with deterministic "
            "largest-remainder rounding."
        ),
        "allocations": allocations,
        "constraints": {
            "allocated_hours_equal_budget": sum(hours.values()) == budget,
            "minimum_floor_satisfied": all(value >= minimum for value in hours.values()),
            "complaint_data_used": False,
            "reporting_bias_diagnostic_used": False,
            "precise_location_data_used": False,
            "human_review_required": True,
        },
        "not_in_scope": [
            "live routing",
            "shelter capacity or eligibility",
            "person-level prioritization",
            "enforcement recommendations",
        ],
    }


def build_demo_document(
    raw_dir: Path,
    *,
    budget_hours: int = 80,
    minimum_hours_per_area: int = 8,
    get_it_done_path: Path | None = None,
    parking_dir: Path | None = None,
    weather_path: Path | None = None,
) -> dict[str, Any]:
    monthly_path = raw_dir / MONTHLY_FILE
    panel_path = raw_dir / PANEL_FILE
    full_block_path = raw_dir / FULL_BLOCK_FILE
    method_path = raw_dir / METHOD_FILE
    crosswalk_path = raw_dir / CROSSWALK_FILE
    monthly_rows = _read_csv(monthly_path)
    panel_rows = _read_csv(panel_path)
    full_rows = _read_csv(full_block_path)
    crosswalk_rows = _read_csv(crosswalk_path)
    observations = _published_observations(monthly_rows)
    observations["methodology_periods"] = _methodology(_read_csv(method_path))
    balanced_panel = _balanced_panel_evidence(panel_rows, full_rows)
    evidence = {
        "balanced_panel": balanced_panel,
        "validity_checks": balanced_panel["validity_checks"],
    }
    forecast = _forecast(observations)
    planner = _planner(forecast, budget_hours, minimum_hours_per_area)
    reporting_bias: dict[str, Any] = (
        _reporting_bias_from_path(get_it_done_path)
        if get_it_done_path is not None
        else {
            "status": "not_requested",
            "reason": (
                "The optional reporting-bias lane was not requested for this in-memory build."
            ),
        }
    )
    if reporting_bias.get("status") == "descriptive_diagnostic_only":
        reporting_bias["cross_source_checkpoints"] = _cross_source_checkpoints(
            monthly_rows, reporting_bias
        )
    robustness = {
        "parking_exposure": (
            _parking_exposure_from_dir(parking_dir, reporting_bias)
            if parking_dir is not None
            else {"status": "not_requested"}
        ),
        "count_day_weather": (
            _count_day_weather_from_path(weather_path)
            if weather_path is not None
            else {"status": "not_requested"}
        ),
    }
    evidence["robustness"] = robustness
    quality_audit = _organizer_quality_audit(monthly_rows, panel_rows, full_rows, crosswalk_rows)
    quality_audit["optional_sources"] = {
        "get_it_done": reporting_bias.get(
            "source_quality", {"status": reporting_bias.get("status", "unavailable")}
        ),
        "parking_meters": robustness["parking_exposure"].get(
            "source_quality",
            {"status": robustness["parking_exposure"].get("status", "unavailable")},
        ),
        "noaa_weather": robustness["count_day_weather"].get(
            "source_quality",
            {"status": robustness["count_day_weather"].get("status", "unavailable")},
        ),
    }
    if "source_quality" in reporting_bias:
        gid_quality = reporting_bias["source_quality"]
        quality_audit["ledger"].extend(
            [
                {
                    "id": "gid_duplicate_request_rows",
                    "count": gid_quality["request_ids"]["duplicate_extra_rows"],
                    "affected_claim": "Raw Get It Done row counts",
                    "treatment": (
                        "Disclose globally; none occurs in the prepared Downtown Encampment slice."
                    ),
                },
                {
                    "id": "gid_orphan_parent_reference_rows",
                    "count": gid_quality["parent_graph"]["orphan_reference_rows"],
                    "affected_claim": "Workflow parent sensitivity",
                    "treatment": (
                        "Do not repair or traverse the graph; show raw and no-parent-root "
                        "counts and make no incident claim."
                    ),
                },
                {
                    "id": "gid_parent_cycles",
                    "count": gid_quality["parent_graph"]["cycles"],
                    "affected_claim": "Workflow parent sensitivity",
                    "treatment": "No graph resolution; root counts use empty parent ids only.",
                },
            ]
        )
    parking_quality: Any = robustness["parking_exposure"].get("source_quality")
    if isinstance(parking_quality, dict):
        inventory: dict[str, Any] = parking_quality["observed_downtown_meter_inventory"]
        quality_audit["ledger"].append(
            {
                "id": "parking_observed_inventory_range",
                "count": inventory["maximum"] - inventory["minimum"],
                "affected_claim": "Broad activity-exposure sensitivity",
                "treatment": (
                    "Lead with a historically continuous fixed cohort and retain all-meter "
                    "results as sensitivity."
                ),
            }
        )
    weather_quality: Any = robustness["count_day_weather"].get("source_quality")
    if isinstance(weather_quality, dict):
        quality_audit["ledger"].append(
            {
                "id": "noaa_missing_temperature_rows_full_series",
                "count": weather_quality["missing_tmax_rows"]
                + weather_quality["missing_tmin_rows"],
                "affected_claim": "Count-day weather robustness",
                "treatment": "Both exact prepared station/date rows are complete.",
            }
        )
    quality_audit["claim_treatments"] = [
        {
            "claim": "Monthly level and forecast",
            "treatment": "Use verified published totals; retain missing months as null.",
        },
        {
            "claim": "Spatial change",
            "treatment": (
                "Use the fixed panel and lead with like-for-like components; retain the "
                "mixed raw-unit index only as a secondary summary."
            ),
        },
        {
            "claim": "Reporting-pattern shift",
            "treatment": (
                "Show raw/root and matched-calendar sensitivities; exclude the lane from "
                "forecasting and allocation."
            ),
        },
        {
            "claim": "Outreach allocation",
            "treatment": (
                "Use forecast upper bounds plus a user-set coverage-continuity guard; "
                "require human review."
            ),
        },
    ]
    input_sha256 = {
        MONTHLY_FILE: _sha256(monthly_path),
        PANEL_FILE: _sha256(panel_path),
        FULL_BLOCK_FILE: _sha256(full_block_path),
        METHOD_FILE: _sha256(method_path),
        CROSSWALK_FILE: _sha256(crosswalk_path),
    }
    if get_it_done_path is not None and get_it_done_path.exists():
        input_sha256[GET_IT_DONE_FILE] = _sha256(get_it_done_path)
    if parking_dir is not None:
        for name in (
            *PARKING_TRANSACTION_FILES,
            PARKING_HISTORIC_FILE,
            PARKING_CURRENT_FILE,
        ):
            path = parking_dir / name
            if path.exists():
                input_sha256[name] = _sha256(path)
    if weather_path is not None and weather_path.exists():
        input_sha256[WEATHER_FILE] = _sha256(weather_path)

    # Internal series support the forecast build but are not part of the UI
    # contract and must not leak into the artifact.
    del observations["_area_series"]
    panel = evidence["balanced_panel"]
    component_lead = panel["component_distribution_sensitivity"]
    individual_lead = next(
        row for row in component_lead["components"] if row["component"] == "individuals"
    )
    individual_blocks = individual_lead["active_block_thresholds"][0]
    individual_block_change_pct = _percent_change(
        individual_blocks["from_active_blocks"], individual_blocks["to_active_blocks"]
    )
    headline = (
        "Two rulers, like for like: on the same 261 blocks, individuals observed rose "
        f"{individual_lead['observed_units']['change_pct']}% while blocks with at least one "
        f"observed individual rose {individual_block_change_pct}%."
    )
    return {
        "schema": SCHEMA,
        "generated_from": {
            "bundle": "SD Downtown Homelessness hackathon-provided curated data",
            "source_data_through": observations["coverage"]["end_month"],
            "deterministic": True,
            "input_sha256": input_sha256,
        },
        "scenario": {
            "id": "wider-footprint-next-shift",
            "title": "Two rulers, one city",
            "headline": headline,
            "decision_question": (
                "How can an outreach coordinator distribute 80 staff-hours across the six "
                "prepared downtown areas in the historical one-step-ahead scenario while "
                "preserving coverage continuity?"
            ),
            "decision_owner": "Outreach or community-services coordinator",
            "prepared_observation_month": observations["coverage"]["latest_reported_month"],
            "prepared_forecast_month": forecast["target_month"],
            "spatial_comparison": panel["comparison"],
            "claim_boundary": (
                "The scenario describes aggregate place observations. It does not identify "
                "people, infer movement, establish causality, or measure service need."
            ),
        },
        "observations": observations,
        "evidence": evidence,
        "reporting_bias": reporting_bias,
        "forecast": forecast,
        "planner": planner,
        "quality_audit": quality_audit,
        "technical_summary": {
            "monthly_estimand": (
                "Verified published multiplier-adjusted total on a fixed six-area core."
            ),
            "spatial_estimand": (
                "Raw observed units on the identical 261 blocks; no occupancy inference."
            ),
            "primary_spatial_sensitivity": {
                "lead_component": component_lead["lead_component"],
                "observed_units": individual_lead["observed_units"],
                "active_block_thresholds": individual_lead["active_block_thresholds"],
                "concentration": individual_lead["concentration"],
            },
            "annual_contrast_selection": {
                "selection_rule": panel["annual_contrast_sensitivity"]["selection_rule"],
                "eligible_contrasts": panel["annual_contrast_sensitivity"]["eligible_contrasts"],
                "selected_divergence_rank_descending": panel["annual_contrast_sensitivity"][
                    "selected_divergence_rank_descending"
                ],
            },
            "validation_design": (
                "Historical one-step-ahead planning scenario with data frozen through "
                "2025-12. Three deterministic models use rolling origins only: 2023 "
                "promotion holdout, 2024 interval calibration, then a separate 2025 audit."
            ),
            "aggregate_model_scorecard": forecast["aggregate"]["model_scorecard"],
            "aggregate_promotion": forecast["aggregate"]["promotion"],
            "aggregate_final_audit": forecast["aggregate"]["backtest"],
            "footprint_sensitivity": panel["footprint_sensitivity"],
            "reporting_bias_design": (
                "Optional, allocation-excluded Get It Done reporting diagnostic using "
                "exact DOWNTOWN community-plan geography and date_requested."
            ),
            "robustness_design": (
                "A historically verified fixed cohort of downtown paid-parking meters "
                "tests broad activity exposure; NOAA compares weather on the two prepared "
                "fixed-panel count dates. Neither enters forecasting or allocation."
            ),
            "allocation_sensitivity": {
                "floor_hours": minimum_hours_per_area,
                "variable_budget_hours": budget_hours - minimum_hours_per_area * len(CORE_AREAS),
                "interpretation": (
                    "The user-set guard preserves coverage continuity in every included area; "
                    "only the variable budget responds to uncertainty-aware forecast load."
                ),
            },
        },
        "limitations": [
            (
                "The monthly figures are visual street-sweep observations, not a census "
                "of unique people."
            ),
            (
                "Published totals use period-specific occupancy multipliers; cross-break "
                "changes need caution."
            ),
            "Four 2025 reports are absent and remain null; no missing month is zero-filled.",
            (
                "Component mismatches affect secondary digitized components, not the "
                "verified total trend used here."
            ),
            (
                "Spatial evidence uses raw units while monthly totals are "
                "multiplier-adjusted; their levels should not be equated."
            ),
            (
                "Balanced-panel redistribution is an aggregate pattern, not evidence of "
                "person movement or causality."
            ),
            (
                "The allocation is an explainable scenario for human review, not automatic "
                "operational authorization."
            ),
            (
                "Get It Done reports reflect reporting behavior and workflow, not unique "
                "people, verified abatements, or outreach need."
            ),
        ],
    }


def run_demo(
    raw_dir: Path,
    out_path: Path,
    *,
    budget_hours: int = 80,
    minimum_hours_per_area: int = 8,
    get_it_done_path: Path | None = None,
    parking_dir: Path | None = None,
    weather_path: Path | None = None,
) -> dict[str, Any]:
    document = build_demo_document(
        raw_dir,
        budget_hours=budget_hours,
        minimum_hours_per_area=minimum_hours_per_area,
        get_it_done_path=get_it_done_path,
        parking_dir=parking_dir,
        weather_path=weather_path,
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n")
    return document


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build the deterministic hackathon demo artifact.")
    parser.add_argument("--raw", type=Path, default=Path("data/raw/hackathon_provided"))
    parser.add_argument("--out", type=Path, default=Path("public/generated/demo.v1.json"))
    parser.add_argument("--budget-hours", type=int, default=80)
    parser.add_argument("--minimum-hours-per-area", type=int, default=8)
    parser.add_argument(
        "--get-it-done",
        type=Path,
        default=GET_IT_DONE_DEFAULT,
        help="Optional council-district Get It Done CSV used only for reporting bias.",
    )
    parser.add_argument(
        "--parking-dir",
        type=Path,
        default=PARKING_DEFAULT,
        help="Optional official parking-meter CSV directory for exposure sensitivity.",
    )
    parser.add_argument(
        "--weather",
        type=Path,
        default=WEATHER_DEFAULT,
        help="Optional NOAA daily CSV for count-day weather robustness.",
    )
    args = parser.parse_args(argv)
    try:
        document = run_demo(
            args.raw,
            args.out,
            budget_hours=args.budget_hours,
            minimum_hours_per_area=args.minimum_hours_per_area,
            get_it_done_path=args.get_it_done,
            parking_dir=args.parking_dir,
            weather_path=args.weather,
        )
    except DemoBuildError as error:
        print(f"DEMO BUILD FAILED: {error}")
        return 1
    panel = document["evidence"]["balanced_panel"]
    print(
        "DEMO BUILD OK: "
        + json.dumps(
            {
                "schema": document["schema"],
                "history_months": len(document["observations"]["history"]),
                "missing_months": len(document["observations"]["missing_months"]),
                "panel_change_pct": panel["raw_observation_units"]["change_pct"],
                "allocated_hours": sum(
                    row["allocated_hours"] for row in document["planner"]["allocations"]
                ),
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
