#!/usr/bin/env python3
"""Payroll-tax load for San Diego homeless-services providers, from Form 990.

`loaded_hourly_rate` is an operator input, and the operator supplies the wage.
What they cannot easily supply is a local check on the *loading* — how much sits
on top of a wage once payroll taxes and benefits are counted. Section 4c of
`docs/project/DATA_OPPORTUNITIES.md` found one such figure inside a provider's
payroll worksheets, which are person-level and were read and deleted.

This is the same question asked of a source that is aggregate by construction.
Form 990 reports organisation-level compensation and payroll taxes; ProPublica's
Nonprofit Explorer serves them as JSON. No individual appears anywhere in it.

    python scripts/nonprofit_loading.py

**What it does not give.** ProPublica's summary omits Part IX lines 8 and 9 —
pension contributions and other employee benefits — so this is payroll tax only,
not a full fringe load. Do not read it as the loading factor.

**On rejected rows.** Three filings report zero salaries against tens of
millions in expenses, which produces payroll-tax loads above 100%. That is a gap
in the source extract rather than an organisation with no staff, and rows failing
the sanity check are reported as rejected rather than dropped quietly — a median
taken over them would have been badly wrong and entirely plausible-looking.
"""

from __future__ import annotations

import argparse
import json
import statistics
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path

API = "https://projects.propublica.org/nonprofits/api/v2"
AGENT = {"User-Agent": "Mozilla/5.0 (research; still-here-sd)"}

#: San Diego homeless-services organisations, by EIN. Two kinds on purpose: a
#: direct-service operator and a coordinating body, because the difference
#: between them turns out to be the finding.
ORGANISATIONS: dict[str, str] = {
    "330215585": "Alpha Project for the Homeless",
    "951874073": "San Diego Rescue Mission",
    "113723093": "Regional Task Force on Homelessness",
}

#: An employer's payroll tax is FICA at 7.65% plus unemployment, so a few
#: percent either side of eight is expected and forty percent is not. The upper
#: bound is deliberately loose: the point is to reject the impossible, not to
#: assume the answer.
PLAUSIBLE = (0.03, 0.40)


@dataclass(frozen=True)
class Filing:
    organisation: str
    year: int
    compensation: int
    payroll_tax: int

    @property
    def load(self) -> float:
        return self.payroll_tax / self.compensation


def filings(ein: str, name: str, timeout: int = 45) -> list[Filing]:
    request = urllib.request.Request(f"{API}/organizations/{ein}.json", headers=AGENT)
    with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - pinned host
        payload = json.loads(response.read())
    out: list[Filing] = []
    for row in payload.get("filings_with_data", []):
        compensation = (row.get("othrsalwages") or 0) + (row.get("compnsatncurrofcr") or 0)
        out.append(
            Filing(
                organisation=name,
                year=int(row.get("tax_prd_yr") or 0),
                compensation=int(compensation),
                payroll_tax=int(row.get("payrolltx") or 0),
            )
        )
    return out


def usable(filing: Filing) -> str | None:
    """Why a filing cannot be used, or None if it can."""
    if filing.compensation <= 0:
        return "reports no compensation"
    if filing.payroll_tax <= 0:
        return "reports no payroll tax"
    low, high = PLAUSIBLE
    if not low <= filing.load <= high:
        return f"payroll-tax load of {filing.load:.0%} is not possible"
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pause", type=float, default=1.0)
    parser.add_argument("--out", type=Path)
    args = parser.parse_args(argv)

    accepted: list[Filing] = []
    rejected: list[tuple[Filing, str]] = []
    for ein, name in ORGANISATIONS.items():
        for filing in filings(ein, name):
            reason = usable(filing)
            if reason:
                rejected.append((filing, reason))
            else:
                accepted.append(filing)
        time.sleep(args.pause)

    lines = [
        f"{'organisation':36} {'year':>5} {'compensation':>14} {'payroll tax':>12} {'load':>7}"
    ]
    for filing in sorted(accepted, key=lambda f: (f.organisation, -f.year)):
        lines.append(
            f"{filing.organisation[:36]:36} {filing.year:>5} {filing.compensation:>14,} "
            f"{filing.payroll_tax:>12,} {filing.load:>6.1%}"
        )

    by_org: dict[str, list[float]] = {}
    for filing in accepted:
        by_org.setdefault(filing.organisation, []).append(filing.load)
    lines.append("")
    for name, loads in sorted(by_org.items()):
        lines.append(f"  {name[:36]:36} median {statistics.median(loads):.1%}  (n={len(loads)})")

    if rejected:
        lines += ["", f"REJECTED — {len(rejected)} filings the source cannot support:"]
        for filing, reason in sorted(rejected, key=lambda p: (p[0].organisation, -p[0].year)):
            lines.append(f"  {filing.organisation[:34]:34} {filing.year}  {reason}")
        lines.append("  These are gaps in the extract, not organisations without staff. A median")
        lines.append("  taken over them would look entirely reasonable and be wrong.")

    report = "\n".join(lines)
    print(report)
    if args.out:
        args.out.write_text(report + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
