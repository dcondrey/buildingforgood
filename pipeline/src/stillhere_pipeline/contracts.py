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


# The count-bearing paths in an observation row. The artifact DECLARES these
# (issue #4 slice) so the privacy scanner's small-cell rule is a lookup, not
# shape-inference; this constant is the single source the emitter writes and
# the validator checks against.
OBSERVATION_TYPE_FIELDS = ("individual", "structure", "vehicle")
OBSERVATION_COUNT_FIELDS = ("total", *(f"by_type.{name}" for name in OBSERVATION_TYPE_FIELDS))
OBSERVATION_SUPPRESSION_FIELD = "suppressed"


def _validate_contract_block(doc: dict[str, Any]) -> None:
    from stillhere_pipeline.suppress import SMALL_CELL_THRESHOLD

    contract = _require(doc, "contract", dict)
    count_fields = _require(contract, "count_fields", list)
    if any(not isinstance(field, str) for field in count_fields):
        raise ContractViolation("contract count_fields must contain only strings")
    if sorted(count_fields) != sorted(OBSERVATION_COUNT_FIELDS):
        raise ContractViolation(
            "contract count_fields must declare exactly the count-bearing paths: "
            f"expected {sorted(OBSERVATION_COUNT_FIELDS)}, got {sorted(count_fields)}"
        )
    threshold = _require(contract, "small_cell_threshold", int)
    if threshold != SMALL_CELL_THRESHOLD:
        raise ContractViolation(
            f"contract small_cell_threshold {threshold} does not match the policy "
            f"threshold {SMALL_CELL_THRESHOLD}"
        )
    marker = _require(contract, "suppression_marker", dict)
    marker_field = _require(marker, "field", str)
    if marker_field != OBSERVATION_SUPPRESSION_FIELD:
        raise ContractViolation(
            f"suppression_marker field must be {OBSERVATION_SUPPRESSION_FIELD!r}, "
            f"got {marker_field!r}"
        )
    affirmative = marker.get("affirmative")
    if not isinstance(affirmative, list) or len(affirmative) != 1 or affirmative[0] is not True:
        raise ContractViolation("suppression_marker affirmative encoding must be exactly [true]")


def validate_observations_v0(doc: dict[str, Any]) -> None:
    if _require(doc, "schema", str) != "observations.v0":
        raise ContractViolation("schema must be observations.v0")
    _validate_contract_block(doc)
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
            if set(by_type) != set(OBSERVATION_TYPE_FIELDS):
                raise ContractViolation(
                    "by_type fields must match the declared count paths exactly: "
                    f"expected {sorted(OBSERVATION_TYPE_FIELDS)}, got {sorted(by_type)}"
                )
            for type_name, value in by_type.items():
                if value is not None and (isinstance(value, bool) or not isinstance(value, int)):
                    raise ContractViolation(f"by_type value for {type_name} must be an int or null")
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
