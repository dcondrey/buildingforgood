"""Provisional v0 artifact contracts (issue #6; superseded by issue #4).

Fail-closed validators for the pipeline-to-UI JSON artifacts, plus the
privacy deny-list guard: no precise-location field may appear anywhere in a
deployable artifact. Issue #4 replaces these with the versioned schema set;
until then every artifact the build emits must pass here.
"""

from __future__ import annotations

from typing import Any

# Field names that must never appear in deployment-safe artifacts (issue #7
# hardens this further; the build refuses to emit them from day one).
PRECISE_FIELD_DENY_LIST = frozenset(
    {"x", "y", "lat", "latitude", "lng", "lon", "longitude", "address", "street_address"}
)


class ContractViolation(ValueError):
    """An artifact that does not meet its declared contract."""


def _require(doc: dict[str, Any], field: str, kind: type | tuple[type, ...]) -> Any:
    if field not in doc:
        raise ContractViolation(f"missing required field: {field}")
    value = doc[field]
    if not isinstance(value, kind):
        raise ContractViolation(f"field {field} has wrong type: {type(value).__name__}")
    return value


def assert_no_precise_fields(node: Any, path: str = "$") -> None:
    """Recursively reject any deny-listed key anywhere in the artifact."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key in PRECISE_FIELD_DENY_LIST:
                raise ContractViolation(f"precise-location field {key!r} at {path}")
            assert_no_precise_fields(value, f"{path}.{key}")
    elif isinstance(node, list):
        for index, item in enumerate(node):
            assert_no_precise_fields(item, f"{path}[{index}]")


def validate_observations_v0(doc: dict[str, Any]) -> None:
    if _require(doc, "schema", str) != "observations.v0":
        raise ContractViolation("schema must be observations.v0")
    source = _require(doc, "source", dict)
    _require(source, "source_id", str)
    _require(source, "retrieved_at", str)
    neighborhoods = _require(doc, "neighborhoods", list)
    if not neighborhoods:
        raise ContractViolation("neighborhoods must be non-empty")
    for entry in neighborhoods:
        if not isinstance(entry, dict):
            raise ContractViolation("neighborhood entries must be objects")
        _require(entry, "neighborhood", str)
        _require(entry, "label_variants", list)
        _require(entry, "coverage_start", str)
        _require(entry, "coverage_end", str)
        observations = _require(entry, "observations", list)
        for observation in observations:
            if not isinstance(observation, dict):
                raise ContractViolation("observations must be objects")
            _require(observation, "month", str)
            _require(observation, "total", int)
            _require(observation, "by_type", dict)
    _require(doc, "comparability_events", list)
    assert_no_precise_fields(doc)


def validate_quality_report_v0(doc: dict[str, Any]) -> None:
    if _require(doc, "schema", str) != "quality_report.v0":
        raise ContractViolation("schema must be quality_report.v0")
    _require(doc, "source", dict)
    _require(doc, "row_counts", dict)
    _require(doc, "duplicates_dropped", int)
    _require(doc, "invalid_rows", list)
    _require(doc, "missing_months_global", list)
    _require(doc, "file_total_mismatches", list)
    _require(doc, "comparability_events", list)
    assert_no_precise_fields(doc)
