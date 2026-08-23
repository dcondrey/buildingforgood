"""Digitization audit for the published DSDP count documents.

The monthly counts ship as scanned, hand-annotated field sheets whose
handwritten totals are digitized by hand into the published tables. This
module audits that digitization step by recovering text from the pinned
public PDF's pages and reporting, per page, the recovered area-scale totals —
then a human compares them with the transcribed monitoring values.

It is built around a swappable OCR engine so a sponsor API is a drop-in:

- ``--engine local`` (default): Apple Vision handwriting recognition, fully
  offline, macOS only.
- ``--engine eyepop``: EyePop.ai's hosted detect-then-recognize OCR via the
  ``eyepop`` SDK; fail-closed without ``EYEPOP_API_KEY``.
- ``--engine eyepop-vlm``: EyePop.ai's hosted image-contents VLM reading the
  same pages a second way; same credential gate.

Every engine emits the same text-observation shape (``text``/``confidence``),
so the audit card is engine-independent and records which engine produced it,
and at what raster resolution (``--dpi``; handwriting recognition is not
stable across resolutions, which is itself a finding the agreement card can
quantify).

Privacy boundary (C-02): the input is an already-published aggregate
document, and the card carries page-level results only — a count of integer
tokens and the recovered values at or above an area-total threshold. No block
identifiers, no geometry, and no sub-threshold values are written.

Usage (``stillhere-audit`` and ``python -m stillhere_pipeline.eyepop_audit``
are the same entry point):

    stillhere-audit --pdf report.pdf --out card.json [--engine local] [--dpi 200]
    stillhere-audit --pdf report.pdf --also-run @300 --out agreement.json
    stillhere-audit --compare card_a.json card_b.json --out agreement.json
    stillhere-audit --pdf report.pdf --format table

See docs/project/DIGITIZATION_AUDIT_CLI.md.
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
DEFAULT_DPI = 200  # the only resolution the module ever rasterized at before
# --dpi existed, so a card without a "dpi" field was produced at this value.
# The card reports how many qualifying values survive at each floor, so a
# single-threshold count reads as the stability band it actually sits in.
CONFIDENCE_FLOORS = (0.2, 0.3, 0.5)

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
        # isdecimal, not isdigit: superscripts are "digits" but not int()-able.
        if text.isdecimal():
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
        # Counts only, never values: a value that qualifies only under a lower
        # floor stays unwritten, so loosening the floor cannot leak anything
        # the standard floor withheld.
        "qualifying_by_confidence": {
            f"{floor:.1f}": sum(
                1 for v in integer_values(observations, floor) if v >= VALUE_THRESHOLD
            )
            for floor in CONFIDENCE_FLOORS
        },
    }


def audit_card(
    pages: list[dict[str, object]], pdf: str, engine: str, dpi: int = DEFAULT_DPI
) -> dict[str, object]:
    return {
        "kind": "digitization_audit",
        "status": "experimental",
        "engine": engine,
        "dpi": dpi,
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


def agreement_card(first: dict[str, object], second: dict[str, object]) -> dict[str, object]:
    """Two-engine agreement summary over two audit cards. Pure; tested.

    Both inputs are already page-level, privacy-filtered cards, so the
    comparison can only ever write values one of them already carries.
    """
    from collections import Counter

    if first.get("value_threshold") != second.get("value_threshold"):
        raise SystemExit("Cannot compare cards produced under different value thresholds.")

    def pages_of(card: dict[str, object]) -> dict[int, Counter[int]]:
        pages = card.get("pages")
        if not isinstance(pages, list):
            return {}
        return {
            int(str(p.get("page"))): Counter(v for v in p.get("values", []) if isinstance(v, int))
            for p in pages
            if isinstance(p, dict)
        }

    def run_of(card: dict[str, object]) -> dict[str, object]:
        # Cards written before the --dpi flag existed carry no "dpi" field;
        # every such run rasterized at DEFAULT_DPI, so backfilling it here is
        # recorded provenance, not a guess.
        return {"engine": card.get("engine"), "dpi": card.get("dpi", DEFAULT_DPI)}

    first_pages, second_pages = pages_of(first), pages_of(second)
    rows: list[dict[str, object]] = []
    shared_total = first_total = second_total = 0
    for page in sorted(first_pages.keys() | second_pages.keys()):
        a, b = first_pages.get(page, Counter()), second_pages.get(page, Counter())
        shared = a & b
        rows.append(
            {
                "page": page,
                "shared_values": sorted(shared.elements()),
                "shared": sum(shared.values()),
                "only_in_first": sum((a - b).values()),
                "only_in_second": sum((b - a).values()),
            }
        )
        shared_total += sum(shared.values())
        first_total += sum(a.values())
        second_total += sum(b.values())
    denominator = first_total + second_total
    return {
        "kind": "digitization_audit_agreement",
        "status": "experimental",
        "engines": [first.get("engine"), second.get("engine")],
        "runs": [run_of(first), run_of(second)],
        "source_pdfs": sorted({str(first.get("source_pdf")), str(second.get("source_pdf"))}),
        "value_threshold": first.get("value_threshold"),
        "pages": rows,
        "summary": {
            "pages_compared": len(rows),
            "shared_total": shared_total,
            "first_total": first_total,
            "second_total": second_total,
            "agreement_share": round(2 * shared_total / denominator, 3) if denominator else None,
        },
        "boundary": (
            "Agreement summary over two page-level, privacy-filtered "
            "digitization-audit cards. It writes only values already present "
            "in a filtered card; independent-engine agreement is evidence "
            "about the digitization lineage, never a model input."
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


def collect_text_observations(node: object) -> list[TextObservation]:
    """Flatten recognized text from a prediction dict. Pure; tested.

    OCR strings can appear at the top-level ``texts`` (whole-frame abilities)
    or nested under each detected region in ``objects[i].texts`` (the
    detect-then-recognize composition), so this walks both.
    """
    observations: list[TextObservation] = []
    if not isinstance(node, dict):
        return observations
    for text in node.get("texts") or []:
        if isinstance(text, dict) and "text" in text:
            observations.append(
                {"text": str(text["text"]), "confidence": text.get("confidence", 1.0)}
            )
    for obj in node.get("objects") or []:
        observations.extend(collect_text_observations(obj))
    return observations


def eyepop_text_pop() -> object:
    """The detect-then-recognize Pop for OCR over a rasterized page.

    Mirrors the SDK's own text example: eyepop.text finds regions, CropForward
    hands each crop to eyepop.text.recognize.landscape.
    """
    from eyepop.worker.worker_types import (  # type: ignore[import-not-found]
        CropForward,
        InferenceComponent,
        Pop,
    )

    return Pop(
        components=[
            InferenceComponent(
                ability="eyepop.text:latest",
                categoryName="text",
                confidenceThreshold=0.5,
                forward=CropForward(
                    maxItems=256,
                    targets=[
                        InferenceComponent(
                            ability="eyepop.text.recognize.landscape:latest",
                            confidenceThreshold=0.1,
                        )
                    ],
                ),
            )
        ]
    )


def eyepop_vlm_pop() -> object:
    """The whole-frame image-contents Pop: EyePop's VLM reading the page.

    A second, independent way to read the same page — a vision-language model
    describing frame contents rather than a detect-then-recognize OCR chain —
    so OCR-vs-VLM disagreement on one engine vendor's stack is measurable with
    the same agreement card. Emits top-level ``texts``, which
    ``collect_text_observations`` already parses.
    """
    from eyepop.worker.worker_types import InferenceComponent, Pop

    return Pop(components=[InferenceComponent(ability="eyepop.image-contents:latest")])


def _require_eyepop_credentials() -> None:
    """Fail closed before any network use; shared by both hosted engines."""
    if not os.environ.get("EYEPOP_API_KEY"):
        raise SystemExit(
            "EYEPOP_API_KEY is not set. Get credentials from the EyePop rep "
            "or andy@eyepop.ai (code DSA2026), export the key, and re-run."
        )
    if os.environ.get("EYEPOP_POP_ID"):
        raise SystemExit(
            "Unset EYEPOP_POP_ID: API-key auth requires the default transient "
            "pop (a named pop needs EYEPOP_SECRET_KEY instead)."
        )
    try:
        import eyepop  # type: ignore[import-not-found]  # noqa: F401
    except ImportError as error:
        raise SystemExit("The eyepop package is missing: uv pip install eyepop") from error


_EYEPOP_ENDPOINTS: dict[str, object] = {}


def _eyepop_endpoint(kind: str, pop_factory: Callable[[], object]) -> object:
    """One worker session per pop for the whole run instead of one per page."""
    if kind not in _EYEPOP_ENDPOINTS:
        import atexit

        from eyepop import EyePopSdk

        endpoint = EyePopSdk.sync_worker(pop=pop_factory())
        endpoint.__enter__()
        atexit.register(endpoint.__exit__, None, None, None)
        _EYEPOP_ENDPOINTS[kind] = endpoint
    return _EYEPOP_ENDPOINTS[kind]


def eyepop_engine(image: Path) -> list[TextObservation]:
    """EyePop.ai hosted OCR; drop-in replacement for the local engine.

    API-key auth works only with the default transient pop, so
    ``EYEPOP_POP_ID`` must stay unset when authenticating with
    ``EYEPOP_API_KEY``.
    """
    _require_eyepop_credentials()
    endpoint = _eyepop_endpoint("ocr", eyepop_text_pop)
    result = endpoint.upload(str(image)).predict()  # type: ignore[attr-defined]
    return collect_text_observations(result)


def word_tokens(observations: list[TextObservation]) -> list[TextObservation]:
    """Split each observation into whitespace-delimited tokens. Pure; tested.

    A VLM answers in phrases ("Total 152"), where OCR emits per-region
    strings; splitting keeps ``integer_values``'s standalone-token contract
    meaningful for both. Confidence carries to every token unchanged.
    """
    tokens: list[TextObservation] = []
    for obs in observations:
        for word in str(obs.get("text", "")).split():
            tokens.append({"text": word, "confidence": obs.get("confidence", 1.0)})
    return tokens


def eyepop_vlm_engine(image: Path) -> list[TextObservation]:
    """EyePop.ai hosted image-contents VLM; same gate, second reading."""
    _require_eyepop_credentials()
    endpoint = _eyepop_endpoint("vlm", eyepop_vlm_pop)
    result = endpoint.upload(str(image)).predict()  # type: ignore[attr-defined]
    return word_tokens(collect_text_observations(result))


ENGINES: dict[str, Engine] = {
    "local": local_engine,
    "eyepop": eyepop_engine,
    "eyepop-vlm": eyepop_vlm_engine,
}
HOSTED_ENGINES = frozenset({"eyepop", "eyepop-vlm"})


def preflight(engine_name: str) -> None:
    """Fail closed before rasterizing rather than after every page is drawn."""
    if engine_name not in ENGINES:
        raise SystemExit(
            f"Unknown engine {engine_name!r}; choose from {', '.join(sorted(ENGINES))}."
        )
    if engine_name in HOSTED_ENGINES:
        _require_eyepop_credentials()
    elif sys.platform != "darwin":  # pragma: no cover - platform-specific
        raise SystemExit("--engine local uses Apple Vision and requires macOS.")


def audit_pdf(pdf: Path, engine_name: str = "local", dpi: int = DEFAULT_DPI) -> dict[str, object]:
    """Rasterize every page at ``dpi`` and return the privacy-filtered card."""
    preflight(engine_name)
    engine = ENGINES[engine_name]
    pages: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory() as scratch:
        for index, image in enumerate(rasterize(pdf, Path(scratch), dpi=dpi), start=1):
            pages.append(page_summary(index, engine(image)))
    return audit_card(pages, str(pdf), engine_name, dpi=dpi)


def write_card(card: dict[str, object], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(card, indent=2, sort_keys=True) + "\n")


def run_audit(
    pdf: Path, out_path: Path | None, engine_name: str = "local", dpi: int = DEFAULT_DPI
) -> dict[str, object]:
    card = audit_pdf(pdf, engine_name, dpi=dpi)
    if out_path is not None:
        write_card(card, out_path)
    return card


def parse_run_spec(spec: str, default_engine: str, default_dpi: int) -> tuple[str, int]:
    """``ENGINE@DPI`` for a second run; either half may be omitted. Pure; tested."""
    engine_text, _, dpi_text = spec.partition("@")
    engine = engine_text.strip() or default_engine
    if engine not in ENGINES:
        raise SystemExit(f"Unknown engine {engine!r}; choose from {', '.join(sorted(ENGINES))}.")
    dpi_text = dpi_text.strip()
    if not dpi_text:
        return engine, default_dpi
    if not dpi_text.isdecimal() or int(dpi_text) <= 0:
        raise SystemExit(f"Bad --also-run {spec!r}: expected ENGINE@DPI, e.g. local@300.")
    return engine, int(dpi_text)


TABLE_VALUE_PREVIEW = 10


def _page_rows(card: dict[str, object]) -> list[dict[str, object]]:
    pages = card.get("pages")
    return [p for p in pages if isinstance(p, dict)] if isinstance(pages, list) else []


def _int_at(row: dict[str, object], key: str) -> int:
    value = row.get(key)
    return value if isinstance(value, int) else 0


def _values_at(row: dict[str, object], key: str) -> list[int]:
    values = row.get(key)
    return [v for v in values if isinstance(v, int)] if isinstance(values, list) else []


def _preview(values: list[int]) -> str:
    if not values:
        return "—"
    head = ", ".join(str(v) for v in values[:TABLE_VALUE_PREVIEW])
    extra = len(values) - TABLE_VALUE_PREVIEW
    return f"{head}, +{extra} more" if extra > 0 else head


def _grid(headers: list[str], rows: list[list[str]]) -> list[str]:
    """Right-align every column but the last, which is free text."""
    widths = [
        max(len(h), *(len(r[i]) for r in rows)) if rows else len(h) for i, h in enumerate(headers)
    ]
    last = len(headers) - 1

    def line(cells: list[str]) -> str:
        parts = [
            c.ljust(widths[i]) if i == last else c.rjust(widths[i]) for i, c in enumerate(cells)
        ]
        return "  ".join(parts).rstrip()

    return [line(headers), line(["-" * w for w in widths])] + [line(r) for r in rows]


def _run_label(run: object, fallback: object) -> str:
    if isinstance(run, dict):
        return f"{run.get('engine')}@{run.get('dpi', DEFAULT_DPI)}dpi"
    return f"{fallback}@{DEFAULT_DPI}dpi"


def format_audit_table(card: dict[str, object]) -> str:
    """Human-readable rendering of an audit card. Pure; writes only card fields."""
    rows = _page_rows(card)
    threshold = card.get("value_threshold", VALUE_THRESHOLD)
    body = [
        [
            str(_int_at(row, "page")),
            str(_int_at(row, "integer_tokens")),
            str(len(_values_at(row, "values"))),
            str(_int_at(row, "withheld_below_threshold")),
            _preview(_values_at(row, "values")),
        ]
        for row in rows
    ]
    dpi = card.get("dpi")
    dpi_text = str(dpi) if dpi is not None else f"{DEFAULT_DPI} (not recorded; pre-flag card)"
    lines = [
        f"digitization audit · engine={card.get('engine')} "
        f"· dpi={dpi_text} · value threshold={threshold}",
        f"source: {card.get('source_pdf')}",
        "",
        *_grid(["page", "tokens", "reported", "withheld", f"values >= {threshold}"], body),
        "",
        f"{len(rows)} pages · "
        f"{sum(_int_at(r, 'integer_tokens') for r in rows)} integer tokens · "
        f"{sum(len(_values_at(r, 'values')) for r in rows)} reported · "
        f"{sum(_int_at(r, 'withheld_below_threshold') for r in rows)} withheld below threshold",
        "Recovered values are candidates for human verification, never counts.",
    ]
    return "\n".join(lines)


def format_agreement_table(card: dict[str, object]) -> str:
    """Human-readable rendering of an agreement card. Pure; writes only card fields."""
    rows = _page_rows(card)
    engines = card.get("engines")
    engines = engines if isinstance(engines, list) else [None, None]
    runs = card.get("runs")
    runs = runs if isinstance(runs, list) else [None, None]
    first, second = _run_label(runs[0], engines[0]), _run_label(runs[1], engines[1])
    body = [
        [
            str(_int_at(row, "page")),
            str(_int_at(row, "shared")),
            str(_int_at(row, "only_in_first")),
            str(_int_at(row, "only_in_second")),
            _preview(_values_at(row, "shared_values")),
        ]
        for row in rows
    ]
    summary = card.get("summary")
    summary = summary if isinstance(summary, dict) else {}
    share = summary.get("agreement_share")
    share_text = "n/a (no values recovered)" if share is None else f"{float(share):.1%}"
    return "\n".join(
        [
            f"digitization audit agreement · {first} vs {second} "
            f"· value threshold={card.get('value_threshold')}",
            "",
            *_grid(["page", "shared", f"only {first}", f"only {second}", "shared values"], body),
            "",
            f"{summary.get('pages_compared', len(rows))} pages compared · "
            f"{summary.get('shared_total', 0)} shared · "
            f"{summary.get('first_total', 0)} vs {summary.get('second_total', 0)} recovered",
            f"agreement share: {share_text}",
            "Disagreement is the finding: every recovered value needs human verification.",
        ]
    )


def format_table(card: dict[str, object]) -> str:
    if card.get("kind") == "digitization_audit_agreement":
        return format_agreement_table(card)
    return format_audit_table(card)


def _emit(card: dict[str, object], out: Path | None, fmt: str) -> None:
    if out is not None:
        write_card(card, out)
    if fmt == "table":
        print(format_table(card))
    elif fmt == "json":
        print(json.dumps(card, indent=2, sort_keys=True))
    elif card.get("kind") == "digitization_audit_agreement":
        print(f"wrote {out} · engines={card.get('engines')} · {card.get('summary')}")
    else:
        print(
            f"wrote {out} · engine={card.get('engine')} · dpi={card.get('dpi')} "
            f"· {len(_page_rows(card))} pages"
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="stillhere-audit",
        description=(
            "Audit the digitization of a scanned, hand-annotated count PDF: recover "
            "text per page and report integer-token counts plus the values at or above "
            "the area-total threshold. Recovered values are candidates for human "
            "verification, never counts."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  stillhere-audit --pdf report.pdf --out card.json\n"
            "  stillhere-audit --pdf report.pdf --format table\n"
            "  stillhere-audit --pdf report.pdf --also-run @300 --out agreement.json\n"
            "  stillhere-audit --compare card_a.json card_b.json --out agreement.json\n"
            "  stillhere-audit --show card.json\n"
        ),
    )
    parser.add_argument("--pdf", type=Path, help="The PDF to audit.")
    parser.add_argument(
        "--out",
        type=Path,
        help="Write the resulting JSON card here. Optional; without it the card is "
        "printed as a table and nothing is written.",
    )
    parser.add_argument("--engine", choices=sorted(ENGINES), default="local")
    parser.add_argument(
        "--dpi",
        type=int,
        default=DEFAULT_DPI,
        help="Raster resolution; recorded in the card because handwriting "
        "recognition is not stable across resolutions.",
    )
    parser.add_argument(
        "--also-run",
        metavar="ENGINE@DPI",
        help="Run a second configuration over the same PDF and write their agreement "
        "card instead of a single audit card. Either half may be omitted: "
        "'@300' reuses --engine, 'eyepop' reuses --dpi.",
    )
    parser.add_argument(
        "--card-dir",
        type=Path,
        help="With --also-run, also write each individual audit card into this directory.",
    )
    parser.add_argument(
        "--show",
        type=Path,
        metavar="CARD",
        help="Render an existing audit or agreement card, no OCR run and no write.",
    )
    parser.add_argument(
        "--compare",
        nargs=2,
        type=Path,
        metavar=("CARD_A", "CARD_B"),
        help="Two existing audit-card JSON files; writes their agreement card, no OCR run.",
    )
    parser.add_argument(
        "--format",
        choices=("summary", "table", "json"),
        help="Stdout rendering. Defaults to 'summary' with --out, 'table' without it.",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    fmt: str = args.format or ("summary" if args.out else "table")
    if args.show:
        _emit(json.loads(args.show.read_text()), None, "table" if fmt == "summary" else fmt)
        return 0
    if args.compare:
        first, second = (json.loads(path.read_text()) for path in args.compare)
        _emit(agreement_card(first, second), args.out, fmt)
        return 0
    if args.pdf is None:
        parser.error("--pdf is required unless --compare is given")
    if args.also_run is None:
        _emit(audit_pdf(args.pdf, args.engine, dpi=args.dpi), args.out, fmt)
        return 0
    second_engine, second_dpi = parse_run_spec(args.also_run, args.engine, args.dpi)
    preflight(args.engine)
    preflight(second_engine)
    cards = [
        audit_pdf(args.pdf, args.engine, dpi=args.dpi),
        audit_pdf(args.pdf, second_engine, dpi=second_dpi),
    ]
    if args.card_dir is not None:
        for card in cards:
            write_card(card, args.card_dir / f"audit_{card['engine']}_{card['dpi']}dpi.json")
    _emit(agreement_card(cards[0], cards[1]), args.out, fmt)
    return 0


if __name__ == "__main__":
    sys.exit(main())
