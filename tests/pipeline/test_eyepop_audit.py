"""Offline checks for the EyePop digitization-audit module.

The network path needs an EYEPOP_API_KEY and is exercised at the venue; these
tests pin the pure parts — detection summarization, the audit card's shape and
boundary language, and the fail-closed behavior without credentials.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from stillhere_pipeline.eyepop_audit import (
    MIN_CONFIDENCE,
    PageAudit,
    audit_card,
    run_audit,
    summarize_detections,
)


def test_summarize_detections_filters_low_confidence_and_counts_labels() -> None:
    objects = [
        {"classLabel": "tent symbol", "confidence": 0.9},
        {"classLabel": "tent symbol", "confidence": 0.5},
        {"classLabel": "tent symbol", "confidence": MIN_CONFIDENCE - 0.01},
        {"classLabel": "dot marker", "confidence": 0.8},
        {"classLabel": "dot marker"},  # missing confidence is dropped
        {"confidence": 0.99},  # missing label counts as unknown
    ]
    assert summarize_detections(objects) == {
        "tent symbol": 2,
        "dot marker": 1,
        "unknown": 1,
    }


def test_audit_card_totals_pages_and_states_the_boundary() -> None:
    pages = [
        PageAudit(page=1, detections={"tent symbol": 3}),
        PageAudit(page=2, detections={"tent symbol": 2, "dot marker": 4}),
    ]
    card = audit_card(pages, "some.pdf", ("tent symbol",))
    assert card["symbol_total"] == 9
    assert card["pages"][1]["total"] == 6
    assert card["status"] == "experimental"
    assert "never a model input" in card["boundary"]
    assert "person-level" in card["boundary"]


def test_run_audit_fails_closed_without_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EYEPOP_API_KEY", raising=False)
    with pytest.raises(SystemExit, match="EYEPOP_API_KEY"):
        run_audit(pdf=Path("x.pdf"), out_path=Path("y.json"))
