#!/usr/bin/env python3
"""Verify the document claims in the research notes against the portal.

`docs/project/DATA_OPPORTUNITIES.md` cites documents by id and requests by
number and says what they are. Nothing checked any of it, and in one afternoon
that produced three errors a reader caught rather than a check:

* a set of worksheets described as an outreach budget, from a request that is a
  *Police* request for bank statements;
* a facility named "the Cortez Hill shelter", which was a cost-object label
  compressed into a building — the programme is the Cortez Hill Family Center,
  interim housing for families;
* "the buyer's records never carry hours", stated before searching for the
  document types that carry hours.

The claim inventory covers adopter-facing surfaces. Research prose is where the
factual assertions about the outside world actually live, and it had no gate at
all. This is that gate.

    python scripts/check_research.py

It needs the network, so it is not part of `verify.sh`. It checks what can be
checked mechanically — that every cited document id resolves, and that the
request it belongs to is the request the notes claim. It cannot check whether a
sentence characterises a document fairly; that still needs a reader. What it
removes is the class of error where a citation points somewhere else entirely.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import urllib.request
from pathlib import Path

from stillhere_pipeline.nextrequest import AGENT, PORTAL

#: A document id in the notes: seven to nine digits in backticks. Bounded to
#: avoid matching RFP numbers, dollar figures and years, which are also digits.
DOC_ID = re.compile(r"`(\d{7,9})`")
#: Requests are cited as `request 24-3385` or `(24-3385)`.
REQUEST_NEAR = re.compile(r"(?:request\s+|\()(\d{2}-\d{3,4})\)?", re.I)


def document(doc_id: int) -> dict[str, object] | None:
    """The portal's own record for one document, or None if it does not resolve."""
    request = urllib.request.Request(f"{PORTAL}/documents/{doc_id}", headers={"User-Agent": AGENT})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - pinned host
            page = response.read().decode("utf-8", "replace")
    except Exception:
        return None
    # The document page carries its request path; that is the fact worth
    # checking, because it is the one I got wrong.
    match = re.search(r"/requests/(\d{2}-\d{3,4})", page)
    title = re.search(r"<title>([^<]*)</title>", page)
    return {
        "request": match.group(1) if match else None,
        "title": (title.group(1).strip() if title else ""),
    }


def request_meta(pretty_id: str) -> dict[str, object] | None:
    request = urllib.request.Request(
        f"{PORTAL}/client/requests/{pretty_id}", headers={"User-Agent": AGENT}
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:  # noqa: S310 - pinned host
            payload = json.loads(response.read())
    except Exception:
        return None
    return {"department": payload.get("department_names")}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--notes", type=Path, default=Path("docs/project/DATA_OPPORTUNITIES.md"))
    parser.add_argument("--pause", type=float, default=1.0)
    args = parser.parse_args(argv)

    text = (args.root / args.notes).read_text("utf-8")
    lines = text.splitlines()

    failures: list[str] = []
    checked = 0

    for number, line in enumerate(lines, start=1):
        for raw in DOC_ID.findall(line):
            doc_id = int(raw)
            record = document(doc_id)
            checked += 1
            if record is None:
                failures.append(f"{args.notes}:{number}: document {doc_id} does not resolve")
                continue
            claimed = REQUEST_NEAR.search(line)
            actual = record["request"]
            if claimed and actual and claimed.group(1) != actual:
                failures.append(
                    f"{args.notes}:{number}: document {doc_id} is in request {actual}, "
                    f"the notes say {claimed.group(1)}"
                )
            time.sleep(args.pause)

    # Departments, because "a homelessness request" was the assumption that
    # produced the worst of the three errors.
    for pretty_id in sorted(set(REQUEST_NEAR.findall(text))):
        meta = request_meta(pretty_id)
        checked += 1
        if meta is None:
            failures.append(f"request {pretty_id} does not resolve")
        else:
            print(f"  request {pretty_id:<9} department: {meta['department']}")
        time.sleep(args.pause)

    print()
    if failures:
        print("RESEARCH CHECK FAILED — a citation points somewhere other than it claims:\n")
        for failure in failures:
            print(f"  {failure}")
        print(
            f"\n{len(failures)} of {checked} checks failed. A note nobody can follow back to "
            "its source is the same defect as a claim with no code behind it."
        )
        return 1
    print(f"RESEARCH CHECK PASSED — {checked} citations resolve to what the notes say.")
    print("Note: this checks that citations point where they claim. Whether a sentence")
    print("characterises a document fairly still needs a reader.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
