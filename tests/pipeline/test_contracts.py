"""Binds the contract validators' rejection paths (they were mutation-unbound)."""

import json
from pathlib import Path

import pytest

from stillhere_pipeline.contracts import (
    ContractViolation,
    assert_no_precise_fields,
    validate_observations_v0,
    validate_quality_report_v0,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def valid_observations() -> dict:
    return {
        "schema": "observations.v0",
        "source": {"source_id": "sdrdl_source", "retrieved_at": "2026-08-21T01:06:45Z"},
        "months_observed": ["2018-01"],
        "missing_months_global": [],
        "neighborhoods": [
            {
                "neighborhood": "east_village",
                "label_variants": ["east_village"],
                "coverage_start": "2018-01",
                "coverage_end": "2018-01",
                "observed_gap_months": [],
                "observations": [{"month": "2018-01", "total": 5, "by_type": {"individual": 5}}],
            }
        ],
        "comparability_events": [],
    }


class TestObservationsValidatorRejects:
    def test_valid_document_passes(self) -> None:
        validate_observations_v0(valid_observations())

    def test_wrong_schema_string(self) -> None:
        doc = {**valid_observations(), "schema": "observations.v1"}
        with pytest.raises(ContractViolation, match="schema"):
            validate_observations_v0(doc)

    def test_missing_source(self) -> None:
        doc = valid_observations()
        del doc["source"]
        with pytest.raises(ContractViolation, match="source"):
            validate_observations_v0(doc)

    def test_empty_neighborhoods(self) -> None:
        doc = {**valid_observations(), "neighborhoods": []}
        with pytest.raises(ContractViolation, match="non-empty"):
            validate_observations_v0(doc)

    def test_non_string_month(self) -> None:
        doc = valid_observations()
        doc["neighborhoods"][0]["observations"][0]["month"] = 201801
        with pytest.raises(ContractViolation, match="month"):
            validate_observations_v0(doc)

    def test_boolean_total_is_not_an_int(self) -> None:
        doc = valid_observations()
        doc["neighborhoods"][0]["observations"][0]["total"] = True
        with pytest.raises(ContractViolation, match="total"):
            validate_observations_v0(doc)

    def test_non_dict_by_type(self) -> None:
        doc = valid_observations()
        doc["neighborhoods"][0]["observations"][0]["by_type"] = "individual:5"
        with pytest.raises(ContractViolation, match="by_type"):
            validate_observations_v0(doc)


class TestQualityValidatorRejects:
    def test_missing_required_field(self) -> None:
        with pytest.raises(ContractViolation, match="row_counts"):
            validate_quality_report_v0({"schema": "quality_report.v0", "source": {}})


class TestDenyList:
    def test_uppercase_key_is_still_precise(self) -> None:
        with pytest.raises(ContractViolation, match="precise-location"):
            assert_no_precise_fields({"points": [{"X": 1.0}]})

    def test_mixed_case_lat(self) -> None:
        with pytest.raises(ContractViolation, match="precise-location"):
            assert_no_precise_fields({"Lat": 32.7})

    def test_tuple_values_are_walked(self) -> None:
        with pytest.raises(ContractViolation, match="precise-location"):
            assert_no_precise_fields({"rows": ({"lng": -117.1},)})

    def test_non_string_keys_do_not_crash(self) -> None:
        assert_no_precise_fields({1: "fine", None: ["also", "fine"]})


class TestShippedArtifactsMeetContracts:
    """The gate must bind the artifacts that actually ship, not only in-memory docs."""

    def test_committed_generated_artifacts_validate(self) -> None:
        generated = REPO_ROOT / "public" / "generated"
        observations = generated / "observations.v0.json"
        quality = generated / "quality_report.v0.json"
        if not observations.exists():
            pytest.skip("generated artifacts not present on this branch")
        validate_observations_v0(json.loads(observations.read_text()))
        validate_quality_report_v0(json.loads(quality.read_text()))
