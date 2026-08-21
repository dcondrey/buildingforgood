"""Digitization audit for the published DSDP count documents.

The monthly counts ship as scanned, hand-annotated field sheets whose
handwritten totals are digitized by hand into the published tables. This
module audits that digitization step by recovering text from the pinned
public PDF's pages and reporting, per page, the recovered area-scale totals —
then a human compares them with the transcribed monitoring values.

It is built around a swappable OCR engine so a sponsor API is a drop-in:

- ``--engine local`` (default): Apple Vision handwriting recognition, fully
  offline, macOS only.
- ``--engine eyepop``: EyePop.ai's hosted abilities via the ``eyepop`` SDK;
  fail-closed without ``EYEPOP_API_KEY``.

Both engines emit the same text-observation shape (``text``/``confidence``),
so the audit card is engine-independent and records which engine produced it.

Privacy boundary (C-02): the input is an already-published aggregate
document, and the card carries page-level results only — a count of integer
tokens and the recovered values at or above an area-total threshold. No block
identifiers, no geometry, and no sub-threshold values are written.

Usage:
    .venv/bin/python -m stillhere_pipeline.eyepop_audit \
        --pdf data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf \
        --out data/monitoring/digitization_audit.json [--engine local|eyepop]
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Callable
from pathlib import Path

MIN_CONFIDENCE = 0.3
VALUE_THRESHOLD = 12  # below this, a bare integer could be a block-level mark

TextObservation = dict[str, object]
Engine = Callable[[Path], list[TextObservation]]


def integer_values(
    observations: list[TextObservation], min_confidence: float = MIN_CONFIDENCE
) -> list[int]:
    """Standalone integer tokens above the confidence floor. Pure; tested."""
    values: list[int] = []
    for obs in observations:
        confidence = obs.get("confidence")
        if not isinstance(confidence, (int, float)) or confidence < min_confidence:
            continue
        text = str(obs.get("text", "")).strip()
        if text.isdigit():
            values.append(int(text))
    return values


def page_summary(page: int, observations: list[TextObservation]) -> dict[str, object]:
    """Privacy-filtered per-page summary. Pure; tested.

    Sub-threshold integers are counted but never written, so a stray
    block-level digit cannot leak into the committed card.
    """
    values = integer_values(observations)
    return {
        "page": page,
        "integer_tokens": len(values),
        "values": sorted(v for v in values if v >= VALUE_THRESHOLD),
        "withheld_below_threshold": sum(1 for v in values if v < VALUE_THRESHOLD),
    }


def audit_card(pages: list[dict[str, object]], pdf: str, engine: str) -> dict[str, object]:
    return {
        "kind": "digitization_audit",
        "status": "experimental",
        "engine": engine,
        "source_pdf": pdf,
        "value_threshold": VALUE_THRESHOLD,
        "pages": pages,
        "boundary": (
            "Text recovered from an already-published aggregate count "
            "document. Page-level results only: integer-token counts and "
            "values at or above the area-total threshold. No block "
            "identifiers, no geometry, no sub-threshold values; a reference "
            "card for auditing the digitization lineage, never a model input."
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


def local_engine(image: Path) -> list[TextObservation]:
    """Apple Vision handwriting OCR; offline, macOS only."""
    if sys.platform != "darwin":  # pragma: no cover - platform-specific
        raise SystemExit("--engine local uses Apple Vision and requires macOS.")
    try:  # pragma: no cover - environment-specific
        import Quartz  # type: ignore[import-untyped,import-not-found,unused-ignore]
        import Vision  # type: ignore[import-untyped,import-not-found,unused-ignore]
        from Foundation import NSURL  # type: ignore[import-untyped,import-not-found,unused-ignore]
    except ImportError as error:  # pragma: no cover
        raise SystemExit(
            "Apple Vision bindings missing: uv pip install pyobjc-framework-Vision"
        ) from error

    url = NSURL.fileURLWithPath_(str(image))
    source = Quartz.CGImageSourceCreateWithURL(url, None)
    cg_image = Quartz.CGImageSourceCreateImageAtIndex(source, 0, None)
    request = Vision.VNRecognizeTextRequest.alloc().init()
    request.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg_image, None)
    handler.performRequests_error_([request], None)
    return [
        {"text": str(obs.text()), "confidence": float(obs.confidence())}
        for obs in (request.results() or [])
    ]


def eyepop_engine(image: Path) -> list[TextObservation]:
    """EyePop.ai text recognition; drop-in replacement for the local engine."""
    if not os.environ.get("EYEPOP_API_KEY"):
        raise SystemExit(
            "EYEPOP_API_KEY is not set. Get credentials from the EyePop rep "
            "or andy@eyepop.ai (code DSA2026), export the key, and re-run."
        )
    try:  # pragma: no cover - environment-specific
        from eyepop import EyePopSdk  # type: ignore[import-not-found]
    except ImportError as error:  # pragma: no cover
        raise SystemExit("The eyepop package is missing: uv pip install eyepop") from error

    with EyePopSdk.workerEndpoint() as endpoint:  # pragma: no cover - network
        result = endpoint.upload(str(image)).predict()
    texts = result.get("texts", []) if isinstance(result, dict) else []
    return [
        {"text": str(t.get("text", "")), "confidence": t.get("confidence", 1.0)}
        for t in texts
        if isinstance(t, dict)
    ]


ENGINES: dict[str, Engine] = {"local": local_engine, "eyepop": eyepop_engine}


def run_audit(pdf: Path, out_path: Path, engine_name: str = "local") -> dict[str, object]:
    engine = ENGINES[engine_name]
    pages: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory() as scratch:
        for index, image in enumerate(rasterize(pdf, Path(scratch)), start=1):
            pages.append(page_summary(index, engine(image)))
    card = audit_card(pages, str(pdf), engine_name)
    out_path.write_text(json.dumps(card, indent=2, sort_keys=True) + "\n")
    return card


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--engine", choices=sorted(ENGINES), default="local")
    args = parser.parse_args(argv)
    card = run_audit(args.pdf, args.out, args.engine)
    pages = card["pages"]
    page_count = len(pages) if isinstance(pages, list) else 0
    print(f"wrote {args.out} · engine={args.engine} · {page_count} pages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
