"""Reconcile the public SDRDL package against the official published series.

`sdrdl_source` is an independent digitization of the same DSP Clean & Safe
observations the shipped artifact rests on. Comparing the two is the only check
this project has that corroborates its evidence base from *outside* itself, and
the figures it produces are cited in `docs/project/DATA_OPPORTUNITIES.md`.

The arithmetic lives here rather than in `scripts/` so that ruff, mypy and the
test suite all reach it. A number a document cites is a claim, and this
repository does not ship claims with nothing behind them.

Nothing here reads `x`/`y`. The package carries EPSG:2230 point coordinates,
which sit on the deployment deny-list; every function below aggregates to
area-month and the columns are never touched.
"""

from __future__ import annotations

import collections
import statistics
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

#: `core` (2014-2019) and `City Center` (2020-2022) never co-occur: one area
#: relabelled, not two areas. `east_village_south` is a split of East Village
#: from 2017. `Barrio Logan`, `Golden Hill` and `Sherman Height` (sic) appear
#: only from 2021 and lie outside the six-area core, so they are excluded by
#: name — the same way the East Village quadrants are excluded from the
#: seven-area profile, and for the same reason.
CORE_AREAS: Mapping[str, str] = {
    "core": "City Center",
    "City Center": "City Center",
    "columbia": "Columbia",
    "cortez": "Cortez",
    "east_village": "East Village",
    "east_village_south": "East Village",
    "gaslamp": "Gaslamp",
    "marina": "Marina",
}

#: The package schema documents `type` as "Individual", "Structure" or
#: "Vehicle" and never mentions the numeric codes that most records carry, and
#: its two description lines list the categories in different orders — so
#: order-based inference is ambiguous between exactly the two whose multipliers
#: differ. `monthly_totals` scores both orderings so the choice stays evidence
#: rather than assumption.
TEXT_TYPES: Mapping[str, str] = {
    "Individual": "individual",
    "Structure": "tent_structure",
    "Vehicle": "vehicle",
}


def code_types(*, swap: bool) -> dict[str, str]:
    """Numeric code mapping. `swap` tests the alternative reading of 2 and 3."""
    return {
        "1": "individual",
        "2": "vehicle" if swap else "tent_structure",
        "3": "tent_structure" if swap else "vehicle",
    }


def multiplier_for(month: str, category: str, periods: Sequence[Mapping[str, Any]]) -> float:
    """The occupancy multiplier in force for a category in a given month.

    Probed mid-month, because the periods change on a day boundary and the
    observations only carry a reliable year and month.
    """
    probe = f"{month}-15"
    for period in periods:
        ends = period["effective_to"]
        if period["effective_from"] <= probe and (ends is None or probe <= ends):
            return float(period["multipliers"][category])
    return 1.0


def _count(row: Mapping[str, Any]) -> float:
    try:
        return float(row["count"] or 1)
    except (TypeError, ValueError):
        return 1.0


def monthly_totals(
    rows: Sequence[Mapping[str, Any]],
    periods: Sequence[Mapping[str, Any]],
    *,
    swap: bool = False,
) -> dict[str, float]:
    """Multiplied six-area-core totals by month. Out-of-core areas are dropped."""
    lookup = {**TEXT_TYPES, **code_types(swap=swap)}
    totals: dict[str, float] = collections.defaultdict(float)
    for row in rows:
        if row["neighborhood"] not in CORE_AREAS or not row["date"]:
            continue
        category = lookup.get(row["type"])
        if category is None:
            continue
        month = str(row["date"])[:7]
        totals[month] += _count(row) * multiplier_for(month, category, periods)
    return dict(totals)


def composition(rows: Sequence[Mapping[str, Any]]) -> dict[str, dict[str, float]]:
    """Unmultiplied share by type and year — the table that killed the splice.

    Structures are absent before 2017 and 11-36% after. That is an annotation
    change, not tents appearing downtown in 2017, which is why the earlier
    months cannot be spliced into the series.
    """
    lookup = {**TEXT_TYPES, **code_types(swap=False)}
    by_year: dict[str, dict[str, float]] = collections.defaultdict(
        lambda: collections.defaultdict(float)
    )
    for row in rows:
        if row["neighborhood"] not in CORE_AREAS or not row["date"]:
            continue
        category = lookup.get(row["type"])
        if category is None:
            continue
        by_year[str(row["date"])[:4]][category] += _count(row)
    return {year: dict(counts) for year, counts in by_year.items()}


@dataclass(frozen=True)
class Agreement:
    """How closely the independent digitization reproduces the official series."""

    months: int
    median_ratio: float
    p10: float
    p90: float
    within_5pct: float
    within_10pct: float
    mean_abs_diff: float
    by_year: dict[str, float]
    worst: list[tuple[str, float]]
    absent_from_package: list[str]


def agreement(totals: Mapping[str, float], official: Mapping[str, int]) -> Agreement:
    shared = sorted(set(totals) & set(official))
    if not shared:
        raise ValueError("no overlapping months; nothing can be compared")
    ratios = {m: totals[m] / official[m] for m in shared}
    ordered = sorted(ratios.values())

    def within(pct: float) -> float:
        # Inclusive of the boundary, and explicitly so. A month exactly `pct`
        # away lands on `abs(v - 1) == pct` in exact arithmetic, but in binary
        # floating point 0.90 gives 0.09999999999999998 and 1.10 gives
        # 0.10000000000000009 — so a bare `<=` puts one inside the bound and
        # its mirror image outside, and "74% of months within 5%" would depend
        # on which side of parity a month happened to fall. The epsilon makes
        # the reported figure a property of the data rather than of the
        # representation.
        return sum(1 for v in ordered if abs(v - 1) <= pct + 1e-9) / len(ordered) * 100

    by_year: dict[str, list[float]] = collections.defaultdict(list)
    for month, ratio in ratios.items():
        by_year[month[:4]].append(ratio)

    # The span of the PACKAGE, not of the overlap. Spanning the overlap would
    # make a trailing gap unreportable: the last shared month is present in
    # both by definition, so nothing after it could ever be named. This is how
    # 2018-11 and 2019-12 surface — inside the package's coverage, absent from
    # its rows.
    first, last = min(totals), max(totals)
    covered = [m for m in official if first <= m <= last]
    return Agreement(
        months=len(shared),
        median_ratio=statistics.median(ordered),
        p10=ordered[len(ordered) // 10],
        p90=ordered[-len(ordered) // 10],
        within_5pct=within(0.05),
        within_10pct=within(0.10),
        mean_abs_diff=statistics.mean(abs(totals[m] - official[m]) for m in shared),
        by_year={y: statistics.median(v) for y, v in sorted(by_year.items())},
        worst=sorted(ratios.items(), key=lambda kv: abs(kv[1] - 1), reverse=True)[:5],
        absent_from_package=sorted(set(covered) - set(totals)),
    )


def _consecutive(a: str, b: str) -> bool:
    ay, am = (int(part) for part in a.split("-"))
    by, bm = (int(part) for part in b.split("-"))
    return by * 12 + bm - (ay * 12 + am) == 1


def classify_defects(worst: Sequence[tuple[str, float]]) -> list[dict[str, Any]]:
    """Name the shape of each disagreement, so a reader is not left to infer it.

    The classification is the useful half. A short month and a long month are
    two facts; an adjacent pair where one is short by roughly what the next is
    long is one fact — a survey attributed to the wrong side of a month
    boundary — and it is fixable. Consecutive short months are a different fact:
    an incomplete stretch of digitization.

    It belongs here rather than in the interface. The first version inferred the
    pair shape at render time, which put a judgement about the data inside a
    component whose job is to display it.
    """
    ordered = sorted(worst, key=lambda kv: kv[0])
    kinds: dict[str, str] = {}
    for index, (month, ratio) in enumerate(ordered):
        if index + 1 >= len(ordered):
            continue
        next_month, next_ratio = ordered[index + 1]
        if ratio < 1 < next_ratio and _consecutive(month, next_month):
            kinds[month] = "month_boundary_pair"
            kinds[next_month] = "month_boundary_pair"
    for month, ratio in ordered:
        kinds.setdefault(month, "short_run" if ratio < 1 else "unclassified")
    return [{"month": m, "ratio": round(r, 3), "kind": kinds[m]} for m, r in ordered]


@dataclass(frozen=True)
class PublisherAgreement:
    """The shipped series against the publisher's own published totals.

    Stronger than the transcription check, and different in kind. Section 1
    compares two readings of the same paper maps; this compares what ships here
    against the numbers DSP itself issued, multipliers already applied. Where
    they meet, agreement is not "close" — it is equal or it is not.
    """

    months: int
    exactly_equal: int
    differing: list[dict[str, Any]]
    first_month: str
    last_month: str


def publisher_agreement(
    shipped: Mapping[str, int], published: Mapping[str, float]
) -> PublisherAgreement:
    shared = sorted(set(shipped) & set(published))
    if not shared:
        raise ValueError("no overlapping months; nothing can be compared")
    differing = [
        {
            "month": m,
            "shipped": shipped[m],
            "published": int(published[m]),
            "delta": shipped[m] - int(published[m]),
        }
        for m in shared
        if abs(shipped[m] - published[m]) >= 0.5
    ]
    return PublisherAgreement(
        months=len(shared),
        exactly_equal=len(shared) - len(differing),
        differing=differing,
        first_month=shared[0],
        last_month=shared[-1],
    )


def agreement_artifact(
    result: Agreement,
    *,
    package_version: str,
    retrieved: str,
    publisher: PublisherAgreement | None = None,
) -> dict[str, Any]:
    """The committed summary — statistics, not a republished series.

    Deliberately omits the per-month ratios. The official monthly totals are
    already published in this repository, so a full ratio series would let
    anyone multiply the two back into SDRDL's own monthly aggregates, which is
    republishing their data by a longer route. Year medians are taken over
    eleven or twelve months and do not invert. The five named months do invert,
    and are included anyway because a defect nobody can locate cannot be fixed;
    they are identified as defects rather than offered as observations.
    """
    return {
        "kind": "source_agreement",
        "boundary": (
            "Agreement between two independent digitizations of the same DSP Clean & Safe "
            "paper maps: the shipped artifact's series, and the public SDRDL package. It is "
            "evidence about transcription, never a model input, never an allocation weight, "
            "and not an independent count of anything. Summary statistics only; the per-month "
            "ratio series is withheld because it would invert to SDRDL's own monthly figures "
            "against the official totals already published here."
        ),
        "attribution": (
            "Observations collected by the Downtown San Diego Partnership Clean & Safe "
            "program. Digitized and published by the San Diego Regional Data Library. "
            "Both are attributed here because the source ledger requires it of any use "
            "of this package."
        ),
        "package_version": package_version,
        "retrieved_at": retrieved,
        "overlap_months": result.months,
        "median_ratio": round(result.median_ratio, 4),
        "p10_ratio": round(result.p10, 4),
        "p90_ratio": round(result.p90, 4),
        "within_5pct": round(result.within_5pct, 1),
        "within_10pct": round(result.within_10pct, 1),
        "median_ratio_by_year": {y: round(v, 4) for y, v in result.by_year.items()},
        "months_absent_from_package": result.absent_from_package,
        "known_defect_months": classify_defects(result.worst),
        "publisher_check": (
            None
            if publisher is None
            else {
                "note": (
                    "The shipped monthly totals against the totals DSP itself published, "
                    "multipliers already applied. A different and stronger check than the "
                    "transcription agreement above: these either match or they do not."
                ),
                "months": publisher.months,
                "exactly_equal": publisher.exactly_equal,
                "first_month": publisher.first_month,
                "last_month": publisher.last_month,
                "differing": publisher.differing,
                "mechanism_of_difference": (
                    "Undetermined. Every difference is exactly one and the shipped value is "
                    "always the higher, which is a convention rather than a disagreement. "
                    "Rounding was the obvious candidate and does not fit: the differing "
                    "months do not separate from the matching ones by fractional part."
                ),
            }
        ),
    }
