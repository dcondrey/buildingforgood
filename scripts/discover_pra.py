#!/usr/bin/env python3
"""Inventory what the portal holds on homelessness, without downloading it.

`survey_pra.py` walks the 36 documents already pinned. This asks the prior
question: what else is there? The portal holds 166,105 public documents and the
pinned corpus is a thin slice of it.

Two deliberate limits.

**Titles only, and nothing fetched.** The portal's search is a title match — a
phrase in a document's body is not findable — so this produces candidates, not
answers. It writes an inventory and downloads nothing, because choosing what to
open should be a decision somebody makes rather than a side effect of a sweep.

**Screen before opening.** Public-records releases carry personal information.
Every document pinned in this repository was reviewed for client-level content
first, and a bulk pull of unreviewed releases into a project whose whole claim
is that no person-level data exists here is precisely how person-level data
would arrive. Titles that suggest rosters, sign-ins, case files or complaints
are flagged `AVOID` rather than listed as candidates.

    python scripts/discover_pra.py --out inventory.md
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from stillhere_pipeline.nextrequest import AGENT, PORTAL, pinned_hashes

#: What to sweep, and why each is here. Narrow on purpose: "proposal" alone
#: returns 984 documents about sewers and street lights.
TERMS = [
    "homeless",
    "unsheltered",
    "encampment",
    "outreach",
    "shelter",
    "HHAP",
    "point in time",
    "scope and budget",
]

#: Titles that suggest person-level content. These are not candidates and are
#: not opened; the flag exists so the sweep records that it saw them and left
#: them alone, rather than silently omitting them.
AVOID = re.compile(
    r"roster|sign[- ]?in|case ?file|client list|participant list|intake|"
    r"medical|complaint|grievance|personnel file|resume|application form",
    re.I,
)

#: A candidate has to be about the subject AND look like data. Requiring only
#: the second returned sixty-eight "CSD P6 Monthly Report" documents, which are
#: underground utility projects — the sweep term "monthly report" is generic
#: enough to match most of a city's paperwork.
SUBJECT = re.compile(
    r"homeless|unsheltered|shelter|encampment|outreach|HHAP|abatement|"
    r"interim housing|safe parking|bridge",
    re.I,
)
SHAPE = re.compile(
    r"monthly|count|census|capacity|by neighborhood|by area|quarterly|"
    r"point.?in.?time|dashboard|report|budget|scope",
    re.I,
)


def promising(title: str) -> bool:
    return bool(SUBJECT.search(title) and SHAPE.search(title))


def sweep(term: str, pause: float) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    page = 1
    while True:
        query = urllib.parse.urlencode({"search_term": term, "page_number": page})
        request = urllib.request.Request(
            f"{PORTAL}/client/documents?{query}", headers={"User-Agent": AGENT}
        )
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - pinned host
            payload = json.loads(response.read())
        rows = payload.get("documents", [])
        if not rows:
            break
        out.extend(rows)
        total = payload.get("total_count", 0)
        if len(out) >= int(total if isinstance(total, int) else 0) or page > 40:
            break
        page += 1
        time.sleep(pause)
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, help="write the inventory here")
    parser.add_argument("--pause", type=float, default=1.0)
    args = parser.parse_args(argv)

    pinned = set(pinned_hashes(args.root, prefix="pra_sandiego"))
    seen: dict[int, dict[str, object]] = {}
    for term in TERMS:
        rows = sweep(term, args.pause)
        print(f"  {term:18} {len(rows):>5} documents", flush=True)
        for row in rows:
            seen.setdefault(int(str(row["id"])), row)
        time.sleep(args.pause)

    candidates, avoided, already = [], [], []
    for doc in seen.values():
        title = str(doc.get("title", ""))
        if AVOID.search(title):
            avoided.append(doc)
        elif title in pinned:
            already.append(doc)
        elif promising(title):
            candidates.append(doc)

    lines = [
        "# Portal inventory — homelessness",
        "",
        f"{len(seen)} distinct documents across {len(TERMS)} title searches. "
        f"{len(already)} already pinned. {len(candidates)} candidates. "
        f"{len(avoided)} flagged as possibly person-level and not opened.",
        "",
        "Titles only. Nothing here was downloaded.",
        "",
        "## Candidates",
        "",
    ]
    for doc in sorted(candidates, key=lambda d: str(d.get("title", ""))):
        lines.append(f"- `{doc['id']}` ({doc.get('pretty_id')}) — {doc.get('title')}")
    lines += ["", "## Flagged, not opened", ""]
    for doc in sorted(avoided, key=lambda d: str(d.get("title", ""))):
        lines.append(f"- `{doc['id']}` ({doc.get('pretty_id')}) — {doc.get('title')}")

    report = "\n".join(lines)
    if args.out:
        args.out.write_text(report, encoding="utf-8")
        print(f"\nwrote {args.out}")
    else:
        print(report)
    print(f"\n{len(seen)} distinct · {len(candidates)} candidates · {len(avoided)} flagged")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
