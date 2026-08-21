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
    kinds = kind if isinstance(kind, tuple) else (kind,)
    if isinstance(value, bool) and bool not in kinds:
        # bool is an int subclass in Python; a count field holding True is a
        # contract violation, not a 1.
        raise ContractViolation(f"field {field} has wrong type: bool")
    return value


def assert_no_precise_fields(node: Any, path: str = "$") -> None:
    """Recursively reject any deny-listed key anywhere in the artifact.

    Key matching is case-insensitive ("Lat" and "X" are as precise as "lat"
    and "x"), and tuples are walked like lists so pre-serialization structures
    cannot smuggle a precise field past the gate.
    """
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(key, str) and key.lower() in PRECISE_FIELD_DENY_LIST:
                raise ContractViolation(f"precise-location field {key!r} at {path}")
            assert_no_precise_fields(value, f"{path}.{key}")
    elif isinstance(node, list | tuple):
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
            if observation.get("suppressed") is True:
                # Whole-row small-cell suppression: total is null and no
                # per-type breakdown is published.
                if observation.get("total") is not None:
                    raise ContractViolation("suppressed rows must have total null")
                if "by_type" in observation:
                    raise ContractViolation("suppressed rows must not publish by_type")
                continue
            _require(observation, "total", int)
            by_type = _require(observation, "by_type", dict)
            for type_name, value in by_type.items():
                if value is not None and (isinstance(value, bool) or not isinstance(value, int)):
                    raise ContractViolation(f"by_type value for {type_name} must be an int or null")
    _require(doc, "comparability_events", list)
    assert_no_precise_fields(doc)


ALLOWED_CLASSIFICATIONS = frozenset(
    {"likely_improvement", "possible_displacement", "insufficient_evidence"}
)


def validate_evidence_v0(doc: dict[str, Any]) -> None:
    if _require(doc, "schema", str) != "evidence.v0":
        raise ContractViolation("schema must be evidence.v0")
    _require(doc, "source", dict)
    _require(doc, "thresholds", dict)
    areas = _require(doc, "areas", list)
    for entry in areas:
        if not isinstance(entry, dict):
            raise ContractViolation("evidence areas must be objects")
        _require(entry, "area", str)
        _require(entry, "period", str)
        classification = _require(entry, "classification", str)
        if classification not in ALLOWED_CLASSIFICATIONS:
            raise ContractViolation(f"unknown classification {classification!r}")
        _require(entry, "forced_reasons", list)
        components = _require(entry, "components", list)
        if not components:
            raise ContractViolation("every evidence entry must publish its components")
        for component in components:
            if not isinstance(component, dict):
                raise ContractViolation("evidence components must be objects")
            _require(component, "id", str)
            if _require(component, "direction", str) not in {"for", "against", "uncertainty"}:
                raise ContractViolation("component direction must be for/against/uncertainty")
            _require(component, "statement", str)
    assert_no_precise_fields(doc)


def validate_forecast_v0(doc: dict[str, Any]) -> None:
    if _require(doc, "schema", str) != "forecast.v0":
        raise ContractViolation("schema must be forecast.v0")
    _require(doc, "source", dict)
    _require(doc, "settings", dict)
    areas = _require(doc, "areas", list)
    for entry in areas:
        if not isinstance(entry, dict):
            raise ContractViolation("forecast areas must be objects")
        _require(entry, "area", str)
        status = _require(entry, "status", str)
        if status not in {"ok", "insufficient_forecast_evidence"}:
            raise ContractViolation(f"unknown forecast status {status!r}")
        _require(entry, "backtest", dict)
        _require(entry, "limitations", list)
        if status == "ok":
            point = _require(entry, "point", (int, float))
            lower, upper = entry.get("lower"), entry.get("upper")
            if lower is not None and upper is not None:
                if not (lower <= point <= upper):
                    raise ContractViolation("interval must be ordered around the point")
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
