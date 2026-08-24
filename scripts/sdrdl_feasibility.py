#!/usr/bin/env python3
"""Regenerate every figure in docs/project/DATA_OPPORTUNITIES.md section 1.

That document reports specific numbers — a 0.991 median agreement ratio, 74% of
months within 5%, a composition table showing zero structures before 2017. They
were originally produced by a throwaway script in a temp directory, which makes
them exactly what this repository refuses to ship: a number in a document with
nothing behind it. This is the something.

It is deliberately NOT part of `verify.sh`. It needs the network, it reads a
2.8 MB third-party package, and the feasibility question it answers is asked
once rather than on every commit. Run it when the document's claims need
rechecking, or when SDRDL publishes a new package version.

    python scripts/sdrdl_feasibility.py

Privacy: the package carries EPSG:2230 point coordinates, which sit on the
deployment deny-list. This script downloads to a temporary directory, reads
`x`/`y` never, aggregates to area-month inside the process, and writes nothing
to the repository. Nothing it prints is a location.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import statistics
import tempfile
import urllib.request
from pathlib import Path

COUNTS_URL = (
    "https://library.metatab.org/sandiegodata.org-downtown_homeless-source-7.2.3/data/counts.csv"
)

#: `core` (2014-2019) and `City Center` (2020-2022) are disjoint in time: one
#: area relabelled, not two areas. `east_village_south` is a split of East
#: Village from 2017. Barrio Logan, Golden Hill and Sherman Height appear only
#: from 2021 and lie outside the six-area core, so they are excluded by name
#: rather than by assumption.
CORE_AREAS = {
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
#: "Vehicle" and never mentions the numeric codes that most records use. The
#: mapping below is the one the overlap evidence supports. Both orderings are
#: scored on every run, so the choice stays checkable rather than assumed.
TEXT_TYPES = {"Individual": "individual", "Structure": "tent_structure", "Vehicle": "vehicle"}


def fetch(url: str, into: Path) -> Path:
    target = into / "counts.csv"
    with urllib.request.urlopen(url, timeout=120) as response:  # noqa: S310 - pinned https URL
        target.write_bytes(response.read())
    return target


def multiplier_for(month: str, category: str, periods: list[dict]) -> float:
    probe = f"{month}-15"
    for period in periods:
        ends = period["effective_to"]
        if period["effective_from"] <= probe and (ends is None or probe <= ends):
            return float(period["multipliers"][category])
    return 1.0


def monthly_totals(rows: list[dict], periods: list[dict], *, swap: bool) -> collections.Counter:
    codes = {
        "1": "individual",
        "2": "vehicle" if swap else "tent_structure",
        "3": "tent_structure" if swap else "vehicle",
    }
    lookup = {**TEXT_TYPES, **codes}
    totals: collections.Counter = collections.Counter()
    for row in rows:
        if row["neighborhood"] not in CORE_AREAS or not row["date"]:
            continue
        category = lookup.get(row["type"])
        if category is None:
            continue
        try:
            count = float(row["count"] or 1)
        except ValueError:
            count = 1.0
        month = row["date"][:7]
        totals[month] += count * multiplier_for(month, category, periods)
    return totals


def composition(rows: list[dict]) -> dict[str, collections.Counter]:
    """Unmultiplied share by type and year — the table that killed the splice."""
    by_year: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    codes = {"1": "individual", "2": "tent_structure", "3": "vehicle"}
    lookup = {**TEXT_TYPES, **codes}
    for row in rows:
        if row["neighborhood"] not in CORE_AREAS or not row["date"]:
            continue
        category = lookup.get(row["type"])
        if category is None:
            continue
        try:
            count = float(row["count"] or 1)
        except ValueError:
            count = 1.0
        by_year[row["date"][:4]][category] += count
    return by_year


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--counts", type=Path, help="a local counts.csv, to skip the download")
    args = parser.parse_args(argv)

    artifact = json.loads((args.root / "public/generated/demo.v1.json").read_text("utf-8"))
    observations = artifact["observations"]
    periods = observations["methodology_periods"]
    official = {h["month"]: h["total"] for h in observations["history"] if h.get("total")}

    with tempfile.TemporaryDirectory() as tmp:
        path = args.counts or fetch(COUNTS_URL, Path(tmp))
        with path.open(newline="", encoding="utf-8", errors="replace") as handle:
            rows = list(csv.DictReader(handle))

    months = sorted({r["date"][:7] for r in rows if r["date"]})
    print(f"package: {len(rows)} records, {months[0]} -> {months[-1]}, {len(months)} months")

    print("\ncode mapping, scored against the official series over the overlap:")
    best = None
    for label, swap in (("2=Structure, 3=Vehicle", False), ("2=Vehicle, 3=Structure", True)):
        totals = monthly_totals(rows, periods, swap=swap)
        shared = sorted(set(totals) & set(official))
        ratios = [totals[m] / official[m] for m in shared]
        gaps = [abs(totals[m] - official[m]) for m in shared]
        median = statistics.median(ratios)
        print(f"  {label:24} median ratio {median:.3f}   mean abs diff {statistics.mean(gaps):.1f}")
        if best is None:
            best = (totals, shared, ratios)

    totals, shared, ratios = best  # type: ignore[misc]
    ordered = sorted(ratios)

    def within(pct: float) -> float:
        return sum(1 for v in ordered if abs(v - 1) <= pct) / len(ordered) * 100

    print(f"\nagreement over {len(shared)} overlapping months")
    print(
        f"  median {statistics.median(ordered):.3f}   "
        f"p10 {ordered[len(ordered) // 10]:.3f}   p90 {ordered[-len(ordered) // 10]:.3f}"
    )
    print(f"  within 5%: {within(0.05):.0f}%   within 10%: {within(0.10):.0f}%")

    by_year: dict[str, list[float]] = collections.defaultdict(list)
    for month in shared:
        by_year[month[:4]].append(totals[month] / official[month])
    print(
        "  by year: "
        + "  ".join(f"{y} {statistics.median(v):.3f}" for y, v in sorted(by_year.items()))
    )

    worst = sorted(
        ((m, totals[m] / official[m]) for m in shared), key=lambda kv: abs(kv[1] - 1), reverse=True
    )[:5]
    print("  worst months: " + ", ".join(f"{m} {v:.2f}" for m, v in worst))
    absent = sorted(set(m for m in official if months[0] <= m <= months[-1]) - set(totals))
    print(f"  in the official series, absent from the package: {absent}")

    print("\nunmultiplied composition by year — why the pre-2017 months cannot be spliced:")
    print(f"  {'year':6} {'individual':>11} {'structure':>10} {'vehicle':>8}")
    for year, counter in sorted(composition(rows).items()):
        total = sum(counter.values()) or 1
        print(
            f"  {year:6} {counter['individual'] / total * 100:10.1f}% "
            f"{counter['tent_structure'] / total * 100:9.1f}% "
            f"{counter['vehicle'] / total * 100:7.1f}%"
        )
    print(
        "\n  Structures are absent before 2017 and 11-36% after. That is an annotation\n"
        "  change, not tents appearing downtown in 2017, so multipliers have nothing to\n"
        "  act on in the earlier months and the level is not comparable across the break."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
