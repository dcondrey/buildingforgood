#!/usr/bin/env python3
"""Walk every pinned PRA document: fetch, verify, read, and report.

Thirty-six PRA files are pinned in `checksums.sha256` and most had never been
opened. Reading them one at a time by hand found real things — a budget booked
as a consultant line, a rate-shaped number that is a scoring example — and was
plainly the wrong way to cover thirty-six documents.

For each pinned file this locates the document on the portal, downloads it,
compares its SHA-256 against the pin, decides whether it is typed or scanned,
and scans the text for staffing and cost denominators. It writes a report and
changes nothing in the repository.

    python scripts/survey_pra.py --out survey.md          # everything
    python scripts/survey_pra.py --only 24-3385           # one request
    python scripts/survey_pra.py --ocr                    # read scans too (macOS)

**On hashes.** A file whose digest does not match its pin is the interesting
case, not an error to smooth over: either the portal reissued the document or
the pin is wrong, and both need a person. The report says MISMATCH and keeps
going.

**On scans.** Roughly a third carry no text layer. `--ocr` runs them through
`tools/ocr`, which needs a `swift build -c release` there first. Without it they
are listed as unread rather than silently skipped, because a document nobody
read is not a document with nothing in it.

Politeness: one document at a time with a short pause. This is a public portal
run by a city, not a CDN.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import time
from pathlib import Path

from stillhere_pipeline.nextrequest import (
    best_match,
    digest,
    download,
    pinned_hashes,
    search,
)
from stillhere_pipeline.pdftext import extract_text, find, has_text_layer

#: Patterns worth reading, and why each is here. Bounded, because the unbounded
#: versions match inside ordinary words — a case-insensitive `FTE` matches the
#: letters in "after", which once produced sixteen phantom mentions.
DENOMINATORS: dict[str, str] = {
    r"\bFTE\b": "an FTE count",
    r"full[- ]time equivalent": "an FTE count, spelled out",
    r"\b\d[\d,.]*\s*(?:staff[- ])?hours?\b": "an hours figure",
    r"\$\s?[\d,]+(?:\.\d\d)?\s*(?:/|per )\s*(?:hour|hr)\b": "an hourly rate",
    r"\bcase ?load\b": "a caseload ratio",
    r"\b\d+\s*(?::|to)\s*\d+\s*(?:ratio|case)": "a stated ratio",
    r"\b\d+\s+(?:outreach\s+)?staff\b": "a staffing count",
}

OCR_BINARY = Path("tools/ocr/.build/release/ocr")


def ocr(path: Path) -> str:
    result = subprocess.run(
        [str(OCR_BINARY), str(path)], capture_output=True, text=True, timeout=900
    )
    return result.stdout if result.returncode == 0 else ""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, help="write the report here instead of stdout")
    parser.add_argument("--only", default="", help="restrict to pinned paths containing this")
    parser.add_argument("--ocr", action="store_true", help="OCR documents with no text layer")
    parser.add_argument("--pause", type=float, default=1.5, help="seconds between documents")
    args = parser.parse_args(argv)

    pins = pinned_hashes(args.root, prefix="pra_sandiego")
    names = sorted(n for n in pins if args.only in n or not args.only)
    if args.only:
        # `--only 24-3385` names a request, which appears in the path rather than
        # the basename, so filter against the full ledger line too.
        text = (args.root / "data/cards/checksums.sha256").read_text("utf-8")
        wanted = {
            Path(line.split(None, 1)[1].strip()).name
            for line in text.splitlines()
            if len(line.split(None, 1)) == 2 and args.only in line
        }
        names = sorted(n for n in pins if n in wanted)

    if args.ocr and not (args.root / OCR_BINARY).exists():
        print(f"note: {OCR_BINARY} is not built; scans will be listed unread.")
        print("      build it with: cd tools/ocr && swift build -c release\n")

    lines: list[str] = ["# PRA survey", ""]
    counts = {"matched": 0, "mismatch": 0, "not_found": 0, "typed": 0, "scan": 0, "read": 0}
    findings_total = 0

    for index, name in enumerate(names, start=1):
        print(f"[{index}/{len(names)}] {name}", flush=True)
        lines.append(f"## {name}")
        if Path(name).suffix.lower() not in {".pdf"}:
            lines.append("- not a PDF; skipped by this survey\n")
            continue

        found = best_match(name, search(Path(name).stem, limit=25))
        if found is None:
            counts["not_found"] += 1
            lines.append("- **not found on the portal by title**\n")
            time.sleep(args.pause)
            continue

        blob = download(found.id)
        actual = digest(blob)
        pinned = pins[name]
        if actual == pinned:
            counts["matched"] += 1
            status = "hash matches the pin"
        else:
            counts["mismatch"] += 1
            status = f"**MISMATCH** — pinned `{pinned[:12]}…`, portal `{actual[:12]}…`"
        lines.append(f"- document `{found.id}` (request {found.request}) — {status}")

        text = ""
        if has_text_layer(blob):
            counts["typed"] += 1
            text = extract_text(blob)
            lines.append(f"- typed, {len(text)} characters")
        else:
            counts["scan"] += 1
            if args.ocr and (args.root / OCR_BINARY).exists():
                scratch = Path("/tmp") / f"pra-{found.id}.pdf"
                scratch.write_bytes(blob)
                text = ocr(scratch)
                scratch.unlink(missing_ok=True)
                lines.append(f"- scanned, OCR recovered {len(text)} characters")
            else:
                lines.append("- **scanned, and not read** — no text layer, OCR not run")

        if text:
            counts["read"] += 1
            hits = {
                why: find(text, pattern, window=140)[:2] for pattern, why in DENOMINATORS.items()
            }
            hits = {why: found_hits for why, found_hits in hits.items() if found_hits}
            findings_total += sum(len(v) for v in hits.values())
            if hits:
                for why, examples in hits.items():
                    lines.append(f"- {why}:")
                    for example in examples:
                        flat = re.sub(r"\s+", " ", example)
                        lines.append(f"  - …{flat}…")
            else:
                lines.append("- no staffing or cost denominator found")
        lines.append("")
        time.sleep(args.pause)

    summary = (
        f"{len(names)} pinned documents · {counts['matched']} hashes reproduced · "
        f"{counts['mismatch']} mismatched · {counts['not_found']} not found · "
        f"{counts['typed']} typed · {counts['scan']} scanned · {counts['read']} read · "
        f"{findings_total} denominator hits"
    )
    lines.insert(1, summary)
    lines.insert(2, "")
    report = "\n".join(lines)
    if args.out:
        args.out.write_text(report, encoding="utf-8")
        print(f"\nwrote {args.out}")
    else:
        print(report)
    print(f"\n{summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
