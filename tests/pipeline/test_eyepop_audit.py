"""Offline checks for the digitization-audit module and its engine seam.

The engines themselves are environment-gated (Apple Vision on macOS; EyePop
behind EYEPOP_API_KEY); these tests pin the pure parts — token filtering, the
privacy-filtered page summary, the card shape — and the fail-closed paths.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from stillhere_pipeline.eyepop_audit import (
    ENGINES,
    VALUE_THRESHOLD,
    audit_card,
    eyepop_engine,
    integer_values,
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
