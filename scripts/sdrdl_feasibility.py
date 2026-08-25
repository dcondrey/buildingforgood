#!/usr/bin/env python3
"""Regenerate every figure in docs/project/DATA_OPPORTUNITIES.md section 1.

That document reports specific numbers — a 0.991 median agreement ratio, 74% of
months within 5%, a composition table showing no structures before 2017. They
were first produced by a throwaway script in a temp directory, which made them
exactly what this repository refuses to ship: a number in a document with
nothing behind it. This is the something.

The arithmetic lives in `stillhere_pipeline.sdrdl`, where ruff, mypy and the
test suite reach it. This file only fetches and prints.

It is deliberately NOT part of `verify.sh`: it needs the network, reads a 2.8 MB
third-party package, and answers a question asked once rather than on every
commit. Run it when the document's claims need rechecking, or when SDRDL
publishes a new package version.

    python scripts/sdrdl_feasibility.py

Privacy: the package carries EPSG:2230 point coordinates, which sit on the
deployment deny-list. This downloads to a temporary directory, never reads
`x`/`y`, aggregates to area-month, and writes nothing to the repository.
Nothing it prints is a location.
"""

from __future__ import annotations

import argparse
import csv
import json
import tempfile
import urllib.request
from pathlib import Path

from stillhere_pipeline.sdrdl import (
    agreement,
    agreement_artifact,
    composition,
    monthly_totals,
    publisher_agreement,
)

PACKAGE_VERSION = "sandiegodata.org-downtown_homeless-source-7.2.3"

#: DSP's own published monthly totals — the multiplied series as the publisher
#: issued it, 2012-01 to 2019-04. A different and stronger check than the
#: transcription agreement: against these, the shipped series either matches or
#: it does not.
PUBLISHED_URL = (
    "https://library.metatab.org/sandiegodata.org-dowtown_homeless-2.1.1/data/monthly_totals.csv"
)

COUNTS_URL = (
    "https://library.metatab.org/sandiegodata.org-downtown_homeless-source-7.2.3/data/counts.csv"
)


def fetch(url: str, into: Path, name: str = "counts.csv") -> Path:
    target = into / name
    with urllib.request.urlopen(url, timeout=120) as response:  # noqa: S310 - pinned https URL
        target.write_bytes(response.read())
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--counts", type=Path, help="a local counts.csv, to skip the download")
    parser.add_argument(
        "--published", type=Path, help="a local monthly_totals.csv, to skip the download"
    )
    parser.add_argument(
        "--emit",
        type=Path,
        help="write the committed summary artifact here (data/monitoring/source_agreement.json)",
    )
    parser.add_argument(
        "--retrieved", default="", help="ISO date the package was retrieved, recorded in --emit"
    )
    args = parser.parse_args(argv)

    artifact = json.loads((args.root / "public/generated/demo.v1.json").read_text("utf-8"))
    observations = artifact["observations"]
    periods = observations["methodology_periods"]
    official = {h["month"]: h["total"] for h in observations["history"] if h.get("total")}

    with tempfile.TemporaryDirectory() as tmp:
        path = args.counts or fetch(COUNTS_URL, Path(tmp))
        with path.open(newline="", encoding="utf-8", errors="replace") as handle:
            rows = list(csv.DictReader(handle))
        published_path = args.published or fetch(PUBLISHED_URL, Path(tmp), name="published.csv")
        with published_path.open(newline="", encoding="utf-8", errors="replace") as handle:
            published = {r["date"][:7]: float(r["count"]) for r in csv.DictReader(handle)}

    months = sorted({r["date"][:7] for r in rows if r["date"]})
    print(f"package: {len(rows)} records, {months[0]} -> {months[-1]}, {len(months)} months")

    print("\ncode mapping, scored against the official series over the overlap:")
    for label, swap in (("2=Structure, 3=Vehicle", False), ("2=Vehicle, 3=Structure", True)):
        scored = agreement(monthly_totals(rows, periods, swap=swap), official)
        print(
            f"  {label:24} median ratio {scored.median_ratio:.3f}   "
            f"mean abs diff {scored.mean_abs_diff:.1f}"
        )

    result = agreement(monthly_totals(rows, periods), official)
    print(f"\nagreement over {result.months} overlapping months")
    print(f"  median {result.median_ratio:.3f}   p10 {result.p10:.3f}   p90 {result.p90:.3f}")
    print(f"  within 5%: {result.within_5pct:.0f}%   within 10%: {result.within_10pct:.0f}%")
    print("  by year: " + "  ".join(f"{y} {v:.3f}" for y, v in result.by_year.items()))
    print("  worst months: " + ", ".join(f"{m} {v:.2f}" for m, v in result.worst))
    print(f"  in the official series, absent from the package: {result.absent_from_package}")

    check = publisher_agreement(official, published)
    print(
        f"\nagainst DSP's own published totals: {check.months} months "
        f"({check.first_month}..{check.last_month}), {check.exactly_equal} exactly equal"
    )
    for row in check.differing:
        print(
            f"  {row['month']}  shipped {row['shipped']}  published {row['published']}"
            f"  delta {row['delta']:+d}"
        )

    print("\nunmultiplied composition by year — why the pre-2017 months cannot be spliced:")
    print(f"  {'year':6} {'individual':>11} {'structure':>10} {'vehicle':>8}")
    for year, counter in sorted(composition(rows).items()):
        total = sum(counter.values()) or 1
        print(
            f"  {year:6} {counter.get('individual', 0) / total * 100:10.1f}% "
            f"{counter.get('tent_structure', 0) / total * 100:9.1f}% "
            f"{counter.get('vehicle', 0) / total * 100:7.1f}%"
        )
    print(
        "\n  Structures are absent before 2017 and 11-36% after. That is an annotation\n"
        "  change, not tents appearing downtown in 2017, so multipliers have nothing to\n"
        "  act on in the earlier months and the level is not comparable across the break."
    )

    if args.emit:
        if not args.retrieved:
            parser.error("--emit needs --retrieved: an artifact with no retrieval date is unpinned")
        artifact_out = agreement_artifact(
            result,
            package_version=PACKAGE_VERSION,
            retrieved=args.retrieved,
            publisher=publisher_agreement(official, published),
        )
        args.emit.write_text(json.dumps(artifact_out, indent=2, sort_keys=True) + "\n", "utf-8")
        print(f"\nwrote {args.emit}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
