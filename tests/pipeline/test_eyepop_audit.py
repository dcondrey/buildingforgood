"""Offline checks for the digitization-audit module and its engine seam.

The engines themselves are environment-gated (Apple Vision on macOS; EyePop
behind EYEPOP_API_KEY); these tests pin the pure parts — token filtering, the
privacy-filtered page summary, the card shape — and the fail-closed paths.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from stillhere_pipeline.eyepop_audit import (
    CONFIDENCE_FLOORS,
    ENGINES,
    VALUE_THRESHOLD,
    agreement_card,
    audit_card,
    eyepop_engine,
    integer_values,
    main,
    page_summary,
)


def test_integer_values_keeps_standalone_digits_above_confidence_floor() -> None:
    observations = [
        {"text": "152", "confidence": 0.9},
        {"text": "14", "confidence": 0.6},
        {"text": "12AM-5AM", "confidence": 0.9},  # not a standalone integer
        {"text": "7", "confidence": 0.05},  # below the confidence floor
        {"text": "3", "confidence": 0.9},
        {"text": "= 2.03 homeless individuals in", "confidence": 0.9},
    ]
    assert integer_values(observations) == [152, 14, 3]


def test_page_summary_withholds_block_scale_values() -> None:
    observations = [
        {"text": "152", "confidence": 0.9},
        {"text": "14", "confidence": 0.9},
        {"text": "3", "confidence": 0.9},  # block-scale: counted, never written
        {"text": "11", "confidence": 0.9},  # block-scale: counted, never written
    ]
    summary = page_summary(4, observations)
    assert summary["values"] == [14, 152]
    assert summary["withheld_below_threshold"] == 2
    assert summary["integer_tokens"] == 4
    assert all(v >= VALUE_THRESHOLD for v in summary["values"])  # type: ignore[union-attr]


def test_audit_card_records_engine_and_boundary() -> None:
    card = audit_card([page_summary(1, [])], "report.pdf", "local")
    assert card["engine"] == "local"
    assert card["kind"] == "digitization_audit"
    assert "never a model input" in str(card["boundary"])
    assert "No block identifiers" in str(card["boundary"])


def test_engine_registry_offers_local_and_eyepop() -> None:
    assert set(ENGINES) == {"local", "eyepop"}


def test_eyepop_engine_fails_closed_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("EYEPOP_API_KEY", raising=False)
    with pytest.raises(SystemExit, match="EYEPOP_API_KEY"):
        eyepop_engine(Path("page.png"))


def test_page_summary_reports_confidence_band_as_counts_only() -> None:
    observations = [
        {"text": "152", "confidence": 0.9},  # qualifies at every floor
        {"text": "27", "confidence": 0.25},  # qualifies only at the 0.2 floor
        {"text": "14", "confidence": 0.4},  # qualifies at 0.2 and 0.3
        {"text": "3", "confidence": 0.9},  # block-scale at every floor
    ]
    summary = page_summary(1, observations)
    assert summary["qualifying_by_confidence"] == {"0.2": 3, "0.3": 2, "0.5": 1}
    # The 0.25-confidence value is counted at the loose floor but never written.
    assert summary["values"] == [14, 152]
    assert set(summary["qualifying_by_confidence"]) == {f"{f:.1f}" for f in CONFIDENCE_FLOORS}  # type: ignore[union-attr]


def _card(engine: str, pages: list[dict[str, object]]) -> dict[str, object]:
    return audit_card(pages, "report.pdf", engine)


def test_agreement_card_counts_shared_and_engine_only_values() -> None:
    first = _card("local", [{"page": 1, "values": [14, 152, 152], "integer_tokens": 3}])
    second = _card("eyepop", [{"page": 1, "values": [14, 152], "integer_tokens": 2}])
    card = agreement_card(first, second)
    assert card["kind"] == "digitization_audit_agreement"
    assert card["engines"] == ["local", "eyepop"]
    (row,) = card["pages"]  # type: ignore[misc]
    assert row["shared_values"] == [14, 152]
    assert row["only_in_first"] == 1  # the duplicated 152
    assert row["only_in_second"] == 0
    assert card["summary"] == {
        "pages_compared": 1,
        "shared_total": 2,
        "first_total": 3,
        "second_total": 2,
        "agreement_share": 0.8,
    }


def test_agreement_card_handles_disjoint_pages_and_empty_cards() -> None:
    first = _card("local", [{"page": 1, "values": [152]}])
    second = _card("eyepop", [{"page": 2, "values": [152]}])
    card = agreement_card(first, second)
    assert [row["page"] for row in card["pages"]] == [1, 2]  # type: ignore[index]
    assert card["summary"]["shared_total"] == 0  # type: ignore[index]
    empty = agreement_card(_card("local", []), _card("eyepop", []))
    assert empty["summary"]["agreement_share"] is None  # type: ignore[index]


def test_agreement_card_refuses_mismatched_thresholds() -> None:
    first = _card("local", [])
    second = dict(_card("eyepop", []), value_threshold=VALUE_THRESHOLD + 1)
    with pytest.raises(SystemExit, match="different value thresholds"):
        agreement_card(first, second)


def test_cli_compare_writes_agreement_card(tmp_path: Path) -> None:
    import json

    a = tmp_path / "a.json"
    b = tmp_path / "b.json"
    out = tmp_path / "agreement.json"
    a.write_text(json.dumps(_card("local", [{"page": 1, "values": [152]}])))
    b.write_text(json.dumps(_card("eyepop", [{"page": 1, "values": [152]}])))
    assert main(["--compare", str(a), str(b), "--out", str(out)]) == 0
    card = json.loads(out.read_text())
    assert card["kind"] == "digitization_audit_agreement"
    assert card["summary"]["agreement_share"] == 1.0


def test_cli_requires_pdf_without_compare(tmp_path: Path) -> None:
    with pytest.raises(SystemExit):
        main(["--out", str(tmp_path / "card.json")])
