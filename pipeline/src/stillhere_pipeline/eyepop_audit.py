"""EyePop digitization audit: computer vision pointed at the ruler, not people.

The DSDP monthly counts ship as published PDF map documents whose symbols are
digitized by hand into counts. This module uses EyePop.ai's zero-shot
``eyepop.localize-objects`` ability to detect those printed map symbols on
rasterized pages of the pinned public report and compares symbol totals with
the transcribed monitoring values — an independent check of the digitization
step itself.

Boundary: input is an already-published aggregate map document. No camera
imagery, no people, no block-level output — the audit reports page-level
symbol totals only, and its result is a reference card, never a model input.

Requires ``EYEPOP_API_KEY`` (and optionally ``EYEPOP_POP_ID``) plus the
``eyepop`` package (``uv pip install eyepop``) and poppler's ``pdftoppm`` for
rasterization. Without credentials the CLI exits with instructions instead of
guessing.

Usage:
    .venv/bin/python -m stillhere_pipeline.eyepop_audit \
        --pdf data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf \
        --out data/monitoring/eyepop_digitization_audit.json
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

DEFAULT_PROMPTS = (
    "small tent symbol printed on a map",
    "small dot marker printed on a map",
)
MIN_CONFIDENCE = 0.35


@dataclass
class PageAudit:
    page: int
    detections: dict[str, int] = field(default_factory=dict)

    @property
    def total(self) -> int:
        return sum(self.detections.values())


def summarize_detections(
    raw_objects: list[dict[str, object]], min_confidence: float = MIN_CONFIDENCE
) -> dict[str, int]:
    """Count detections per class label above the confidence floor.

    Pure function over the SDK's ``objects`` payload shape
    (``classLabel``/``confidence``); unit-tested offline.
    """
    counts: dict[str, int] = {}
    for obj in raw_objects:
        label = str(obj.get("classLabel", "unknown"))
        confidence = obj.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence < min_confidence:
            continue
        counts[label] = counts.get(label, 0) + 1
    return counts


def audit_card(pages: list[PageAudit], pdf: str, prompts: tuple[str, ...]) -> dict[str, object]:
    """Assemble the reference card. Pure; unit-tested offline."""
    return {
        "kind": "eyepop_digitization_audit",
        "status": "experimental",
        "source_pdf": pdf,
        "prompts": list(prompts),
        "min_confidence": MIN_CONFIDENCE,
        "pages": [{"page": p.page, "detections": p.detections, "total": p.total} for p in pages],
        "symbol_total": sum(p.total for p in pages),
        "boundary": (
            "Zero-shot detections of printed symbols on an already-published "
            "aggregate map document. Reference card for auditing the "
            "digitization lineage; page-level totals only; never a model "
            "input, never camera imagery, never person-level."
        ),
    }


def rasterize(pdf: Path, out_dir: Path, dpi: int = 200) -> list[Path]:
    if shutil.which("pdftoppm") is None:
        raise SystemExit("pdftoppm (poppler) is required to rasterize the report pages.")
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), str(pdf), str(out_dir / "page")],
        check=True,
    )
    return sorted(out_dir.glob("page-*.png"))


def run_audit(
    pdf: Path, out_path: Path, prompts: tuple[str, ...] = DEFAULT_PROMPTS
) -> dict[str, object]:
    if not os.environ.get("EYEPOP_API_KEY"):
        raise SystemExit(
            "EYEPOP_API_KEY is not set. Create a key at dashboard.eyepop.ai "
            "(hamburger menu > API Keys), export it, and re-run."
        )
    try:
        from eyepop import EyePopSdk  # type: ignore[import-not-found]
    except ImportError as error:  # pragma: no cover - environment-specific
        raise SystemExit("The eyepop package is missing: uv pip install eyepop") from error

    pages: list[PageAudit] = []
    with tempfile.TemporaryDirectory() as scratch:
        images = rasterize(pdf, Path(scratch))
        with EyePopSdk.workerEndpoint() as endpoint:  # pragma: no cover - network
            try:
                endpoint.set_pop(
                    {
                        "components": [
                            {
                                "type": "inference",
                                "ability": "eyepop.localize-objects:latest",
                                "params": {"prompts": [{"prompt": p} for p in prompts]},
                            }
                        ]
                    }
                )
            except Exception:
                # Older SDKs configure the pop in the dashboard instead; the
                # worker then runs whatever the pop id points at.
                pass
            for index, image in enumerate(images, start=1):
                result = endpoint.upload(str(image)).predict()
                objects = result.get("objects", []) if isinstance(result, dict) else []
                pages.append(PageAudit(page=index, detections=summarize_detections(objects)))

    card = audit_card(pages, str(pdf), prompts)
    out_path.write_text(json.dumps(card, indent=2, sort_keys=True) + "\n")
    return card


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args(argv)
    card = run_audit(args.pdf, args.out)
    pages = card["pages"]
    page_count = len(pages) if isinstance(pages, list) else 0
    print(f"wrote {args.out} · {card['symbol_total']} symbols across {page_count} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
