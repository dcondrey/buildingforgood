#!/usr/bin/env python3
"""Re-fetch a pinned NextRequest document and check it against its hash.

The ledger described these as "manual authenticated download", which overstated
it. The requests are Published: their documents come down over plain HTTP with a
session cookie and a referer, no account. That matters for provenance — a hash
in `checksums.sha256` that anybody can reproduce is a stronger record than one
that rests on somebody's browser session.

    python scripts/fetch_pra.py --search "FY23 Executed_DSDP FRP"
    python scripts/fetch_pra.py --doc-id 22974590 --scan

`--scan` reports whether the file carries a text layer and prints the context
around anything that looks like a staffing or cost denominator. It prints
context rather than counts on purpose: a bare count of `FTE` matches the letters
inside "after", which is how a first pass reported sixteen mentions of a term
that appears nowhere in the document.

Nothing is written into the repository. Downloads go to a temporary directory
unless `--out` names somewhere, and `data/raw/` stays ignored.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

from stillhere_pipeline.pdftext import extract_text, find, has_text_layer

PORTAL = "https://sandiego.nextrequest.com"
AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"
)

#: Patterns worth reading in a contract, and the reason each is here. Bounded,
#: because the unbounded versions match inside ordinary words.
DENOMINATORS = {
    r"\bFTE\b": "an FTE count",
    r"full[- ]time equivalent": "an FTE count, spelled out",
    r"\b\d[\d,.]*\s*hours?\b": "an hours figure",
    r"\$\s?[\d,]+(?:\.\d\d)?\s*(?:/|per )\s*(?:hour|hr)": "an hourly rate",
    r"\bcase ?load\b": "a caseload ratio",
    r"\b\d+\s+(?:outreach\s+)?staff\b": "a staffing count",
    r"\bper shift\b|\bper day\b": "a shift or daily basis",
}


def _open(url: str, referer: str | None = None) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": AGENT})
    if referer:
        request.add_header("Referer", referer)
    with urllib.request.urlopen(request, timeout=180) as response:  # noqa: S310 - pinned host
        return bytes(response.read())


def search(term: str, limit: int = 10) -> list[dict[str, object]]:
    query = urllib.parse.urlencode({"search_term": term})
    payload = json.loads(_open(f"{PORTAL}/client/documents?{query}"))
    return list(payload.get("documents", []))[:limit]


def download(doc_id: int) -> bytes:
    page = f"{PORTAL}/documents/{doc_id}"
    _open(page)  # the download 403s without the referring page having been seen
    return _open(f"{page}/download", referer=page)


def pinned_hashes(root: Path) -> dict[str, str]:
    lines = (root / "data/cards/checksums.sha256").read_text("utf-8").splitlines()
    out: dict[str, str] = {}
    for line in lines:
        parts = line.split(None, 1)
        if len(parts) == 2:
            out[Path(parts[1].strip()).name] = parts[0]
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--search", help="find documents by title")
    parser.add_argument("--doc-id", type=int, help="download this document id")
    parser.add_argument("--out", type=Path, help="save the file here instead of a temp directory")
    parser.add_argument("--scan", action="store_true", help="report text layer and denominators")
    args = parser.parse_args(argv)

    if args.search:
        for doc in search(args.search):
            print(f"  {doc['id']:>9}  {str(doc.get('pretty_id')):>9}  {str(doc['title'])[:66]}")
        if not args.doc_id:
            return 0

    if not args.doc_id:
        parser.error("give --search, --doc-id, or both")

    blob = download(args.doc_id)
    digest = hashlib.sha256(blob).hexdigest()
    print(f"document {args.doc_id}: {len(blob)} bytes\n  sha256 {digest}")

    matches = [name for name, value in pinned_hashes(args.root).items() if value == digest]
    print(f"  pinned as: {matches[0]}" if matches else "  NOT among the pinned hashes")

    destination = args.out or Path(tempfile.gettempdir()) / f"pra-{args.doc_id}.pdf"
    destination.write_bytes(blob)
    print(f"  saved {destination}")

    if args.scan:
        if not has_text_layer(blob):
            print("  no text layer — this is a scan, and belongs in the OCR path")
            return 0
        text = extract_text(blob)
        print(f"  text layer: {len(text)} characters")
        for pattern, why in DENOMINATORS.items():
            hits = find(text, pattern, window=150)
            if not hits:
                continue
            print(f"\n  -- {why} --")
            for hit in hits[:4]:
                print(f"     …{hit}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
