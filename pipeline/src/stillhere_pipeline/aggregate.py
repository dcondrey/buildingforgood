"""Aggregate normalized records to the neighborhood/month grain (issue #6).

This is the minimum grain the product uses; precise point locations never
survive past this module. All output ordering is sorted so identical inputs
rebuild byte-identical artifacts.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from stillhere_pipeline.normalize import NormalizedRecord, SleeperType

_TYPES: tuple[SleeperType, ...] = ("individual", "structure", "vehicle")


@dataclass(frozen=True)
class MonthObservation:
    month: str
    total: int
    by_type: dict[SleeperType, int]


@dataclass(frozen=True)
class NeighborhoodSeries:
    neighborhood: str
    label_variants: list[str]
    coverage_start: str
    coverage_end: str
    observed_gap_months: list[str]
    observations: list[MonthObservation]


def month_range(start: str, end: str) -> list[str]:
    """All YYYY-MM months from start to end, inclusive."""
    year, month = int(start[:4]), int(start[5:7])
    end_year, end_month = int(end[:4]), int(end[5:7])
    months: list[str] = []
    while (year, month) <= (end_year, end_month):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year, month = year + 1, 1
    return months


def monthly_gaps(observed: list[str]) -> list[str]:
    """Months missing between the first and last observed month."""
    if not observed:
        return []
    present = set(observed)
    ordered = sorted(present)
    return [m for m in month_range(ordered[0], ordered[-1]) if m not in present]


def aggregate_observations(records: list[NormalizedRecord]) -> list[NeighborhoodSeries]:
    sums: dict[str, dict[str, dict[SleeperType, int]]] = defaultdict(
        lambda: defaultdict(lambda: dict.fromkeys(_TYPES, 0))
    )
    variants: dict[str, set[str]] = defaultdict(set)
    for record in records:
        sums[record.neighborhood][record.month][record.type] += record.count
        variants[record.neighborhood].add(record.source_label)

    series: list[NeighborhoodSeries] = []
    for neighborhood in sorted(sums):
        months = sorted(sums[neighborhood])
        observations = [
            MonthObservation(
                month=month,
                total=sum(sums[neighborhood][month].values()),
                by_type=dict(sums[neighborhood][month]),
            )
            for month in months
        ]
        series.append(
            NeighborhoodSeries(
                neighborhood=neighborhood,
                label_variants=sorted(variants[neighborhood]),
                coverage_start=months[0],
                coverage_end=months[-1],
                observed_gap_months=monthly_gaps(months),
                observations=observations,
            )
        )
    return series
