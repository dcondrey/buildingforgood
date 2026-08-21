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
    DEFAULT_DPI,
    ENGINES,
    VALUE_THRESHOLD,
    agreement_card,
    audit_card,
    eyepop_engine,
    eyepop_vlm_engine,
    integer_values,
    main,
    page_summary,
    word_tokens,
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


def test_audit_card_records_engine_dpi_and_boundary() -> None:
    card = audit_card([page_summary(1, [])], "report.pdf", "local")
    assert card["engine"] == "local"
    assert card["dpi"] == DEFAULT_DPI
    assert audit_card([], "report.pdf", "local", dpi=300)["dpi"] == 300
    assert card["kind"] == "digitization_audit"
    assert "never a model input" in str(card["boundary"])
    assert "No block identifiers" in str(card["boundary"])


def test_engine_registry_offers_local_and_both_eyepop_modes() -> None:
    assert set(ENGINES) == {"local", "eyepop", "eyepop-vlm"}


@pytest.mark.parametrize("engine", [eyepop_engine, eyepop_vlm_engine])
def test_hosted_engines_fail_closed_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    engine: object,
) -> None:
    monkeypatch.delenv("EYEPOP_API_KEY", raising=False)
    with pytest.raises(SystemExit, match="EYEPOP_API_KEY"):
        engine(Path("page.png"))  # type: ignore[operator]


def test_word_tokens_splits_phrases_and_keeps_confidence() -> None:
    observations = [
        {"text": "Total 152", "confidence": 0.7},
        {"text": "14", "confidence": 0.9},
        {"text": "", "confidence": 0.9},
    ]
    assert word_tokens(observations) == [
        {"text": "Total", "confidence": 0.7},
        {"text": "152", "confidence": 0.7},
        {"text": "14", "confidence": 0.9},
    ]


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
    # Pre---dpi cards carry no "dpi" field; those runs were all DEFAULT_DPI.
    assert card["runs"] == [
        {"engine": "local", "dpi": DEFAULT_DPI},
        {"engine": "eyepop", "dpi": DEFAULT_DPI},
    ]
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


def test_agreement_card_distinguishes_same_engine_runs_by_dpi() -> None:
    first = _card("local", [{"page": 1, "values": [157]}])
    second = dict(_card("local", [{"page": 1, "values": [152]}]), dpi=300)
    card = agreement_card(first, second)
    assert card["runs"] == [
        {"engine": "local", "dpi": DEFAULT_DPI},
        {"engine": "local", "dpi": 300},
    ]
    assert card["summary"]["shared_total"] == 0  # type: ignore[index]


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


def test_collect_text_observations_walks_top_level_and_nested() -> None:
    from stillhere_pipeline.eyepop_audit import collect_text_observations

    prediction = {
        "texts": [{"text": "Grand Total", "confidence": 0.9}],
        "objects": [
            {
                "classLabel": "text",
                "texts": [{"text": "152", "confidence": 0.8}],
                "objects": [{"classLabel": "text", "texts": [{"text": "14"}]}],
            }
        ],
    }
    observations = collect_text_observations(prediction)
    assert [o["text"] for o in observations] == ["Grand Total", "152", "14"]
    assert observations[2]["confidence"] == 1.0  # missing confidence defaults, not drops
    assert collect_text_observations(None) == []
    assert collect_text_observations({"texts": ["not-a-dict"]}) == []


def _install_fake_eyepop(
    monkeypatch: pytest.MonkeyPatch, prediction: dict[str, object], recorded: dict[str, object]
) -> None:
    import sys
    import types

    import stillhere_pipeline.eyepop_audit as module

    fake_types = types.ModuleType("eyepop.worker.worker_types")

    class Pop:
        def __init__(self, components: list[object]) -> None:
            self.components = components

    class InferenceComponent:
        def __init__(self, **kwargs: object) -> None:
            self.__dict__.update(kwargs)

    class CropForward:
        def __init__(self, **kwargs: object) -> None:
            self.__dict__.update(kwargs)

    fake_types.Pop = Pop  # type: ignore[attr-defined]
    fake_types.InferenceComponent = InferenceComponent  # type: ignore[attr-defined]
    fake_types.CropForward = CropForward  # type: ignore[attr-defined]

    class FakeEndpoint:
        def __enter__(self) -> FakeEndpoint:
            return self

        def __exit__(self, *args: object) -> None:
            recorded["closed"] = True

        def upload(self, path: str) -> FakeEndpoint:
            recorded.setdefault("uploads", []).append(path)  # type: ignore[union-attr]
            return self

        def predict(self) -> dict[str, object]:
            return prediction

    class EyePopSdk:
        @staticmethod
        def sync_worker(pop: object = None) -> FakeEndpoint:
            recorded["workers"] = int(recorded.get("workers", 0)) + 1
            recorded["pop"] = pop
            recorded.setdefault("pops", []).append(pop)  # type: ignore[union-attr]
            return FakeEndpoint()

    fake_eyepop = types.ModuleType("eyepop")
    fake_eyepop.EyePopSdk = EyePopSdk  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "eyepop", fake_eyepop)
    monkeypatch.setitem(sys.modules, "eyepop.worker", types.ModuleType("eyepop.worker"))
    monkeypatch.setitem(sys.modules, "eyepop.worker.worker_types", fake_types)
    monkeypatch.setattr(module, "_EYEPOP_ENDPOINTS", {})


def test_eyepop_engine_configures_ocr_pop_and_parses_nested_texts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EYEPOP_API_KEY", "eyp_test")
    monkeypatch.delenv("EYEPOP_POP_ID", raising=False)
    recorded: dict[str, object] = {}
    prediction = {
        "objects": [{"classLabel": "text", "texts": [{"text": "152", "confidence": 0.8}]}]
    }
    _install_fake_eyepop(monkeypatch, prediction, recorded)

    observations = eyepop_engine(Path("page-01.png"))
    assert observations == [{"text": "152", "confidence": 0.8}]
    assert recorded["uploads"] == ["page-01.png"]
    abilities = [
        getattr(c, "ability", None)
        for c in recorded["pop"].components  # type: ignore[attr-defined]
    ]
    assert abilities == ["eyepop.text:latest"]
    forward = recorded["pop"].components[0].forward  # type: ignore[attr-defined]
    assert [t.ability for t in forward.targets] == ["eyepop.text.recognize.landscape:latest"]

    # A second page reuses the session instead of opening another worker.
    eyepop_engine(Path("page-02.png"))
    assert recorded["workers"] == 1


def test_eyepop_engine_refuses_pop_id_with_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EYEPOP_API_KEY", "eyp_test")
    monkeypatch.setenv("EYEPOP_POP_ID", "some-pop")
    with pytest.raises(SystemExit, match="Unset EYEPOP_POP_ID"):
        eyepop_engine(Path("page.png"))


def test_vlm_engine_configures_image_contents_pop_and_tokenizes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EYEPOP_API_KEY", "eyp_test")
    monkeypatch.delenv("EYEPOP_POP_ID", raising=False)
    recorded: dict[str, object] = {}
    prediction = {"texts": [{"text": "Count 152 tents 14", "confidence": 0.6}]}
    _install_fake_eyepop(monkeypatch, prediction, recorded)

    observations = eyepop_vlm_engine(Path("page-04.png"))
    assert {"text": "152", "confidence": 0.6} in observations
    assert {"text": "tents", "confidence": 0.6} in observations
    assert integer_values(observations) == [152, 14]
    (component,) = recorded["pop"].components  # type: ignore[attr-defined]
    assert component.ability == "eyepop.image-contents:latest"


def test_ocr_and_vlm_engines_use_separate_worker_sessions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EYEPOP_API_KEY", "eyp_test")
    monkeypatch.delenv("EYEPOP_POP_ID", raising=False)
    recorded: dict[str, object] = {}
    _install_fake_eyepop(monkeypatch, {"texts": []}, recorded)

    eyepop_engine(Path("page-01.png"))
    eyepop_vlm_engine(Path("page-01.png"))
    eyepop_engine(Path("page-02.png"))
    eyepop_vlm_engine(Path("page-02.png"))
    # One worker per pop kind, reused across pages — not one per page.
    assert recorded["workers"] == 2
    ocr_pop, vlm_pop = recorded["pops"][:2]  # type: ignore[index]
    assert ocr_pop.components[0].ability == "eyepop.text:latest"
    assert vlm_pop.components[0].ability == "eyepop.image-contents:latest"
