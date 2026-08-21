"""Raw-independent contract tests for the artifact used by the live demo."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

import stillhere_pipeline.demo as demo_module
from stillhere_pipeline.contracts import ContractViolation, validate_demo_v1

REPO_ROOT = Path(__file__).resolve().parents[2]
SHIPPED_DEMO = REPO_ROOT / "public" / "generated" / "demo.v1.json"


@pytest.fixture
def demo_document() -> dict:
    return json.loads(SHIPPED_DEMO.read_text())


def test_shipped_demo_v1_meets_authoritative_contract(demo_document: dict) -> None:
    validate_demo_v1(demo_document)


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda doc: doc.update(schema="stillhere.demo.v2"), "schema"),
        (
            lambda doc: doc["generated_from"]["input_sha256"].update({"new.csv": "not-a-digest"}),
            "SHA-256",
        ),
        (
            lambda doc: doc["planner"]["constraints"].update(reporting_bias_diagnostic_used=True),
            "reporting_bias_diagnostic_used",
        ),
        (
            lambda doc: doc["planner"]["allocations"][0].update(allocated_hours=999),
            "decomposition",
        ),
    ],
)
def test_demo_contract_rejects_decision_critical_mutations(
    demo_document: dict, mutation, message: str
) -> None:
    mutation(demo_document)
    with pytest.raises(ContractViolation, match=message):
        validate_demo_v1(demo_document)


def test_demo_contract_rejects_precise_location_anywhere(demo_document: dict) -> None:
    demo_document["reporting_bias"]["monthly"][0]["latitude"] = 32.7
    with pytest.raises(ContractViolation, match="precise-location"):
        validate_demo_v1(demo_document)


def test_demo_contract_rejects_raw_record_identifiers(demo_document: dict) -> None:
    demo_document["quality_audit"]["sample"] = {"block_id": "restricted-row-id"}
    with pytest.raises(ContractViolation, match="raw-record"):
        validate_demo_v1(demo_document)


def test_demo_contract_rejects_per_area_component_breakdown(demo_document: dict) -> None:
    demo_document["evidence"]["balanced_panel"]["areas"][0]["components"] = {
        "vehicles": {"from": 1, "to": 0}
    }
    with pytest.raises(ContractViolation, match="per-area component"):
        validate_demo_v1(demo_document)


def test_demo_contract_keeps_missing_months_null(demo_document: dict) -> None:
    missing = next(
        row for row in demo_document["observations"]["history"] if row["status"] == "not_reported"
    )
    missing["total"] = 0
    with pytest.raises(ContractViolation, match="total null"):
        validate_demo_v1(demo_document)


def test_run_demo_validates_before_touching_output(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, demo_document: dict
) -> None:
    invalid = copy.deepcopy(demo_document)
    invalid["planner"]["constraints"]["precise_location_data_used"] = True
    monkeypatch.setattr(demo_module, "build_demo_document", lambda *args, **kwargs: invalid)
    output = tmp_path / "nested" / "demo.v1.json"

    with pytest.raises(ContractViolation, match="precise_location_data_used"):
        demo_module.run_demo(tmp_path / "unused-raw", output)

    assert not output.exists()
    assert not output.parent.exists()
