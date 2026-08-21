"""Fail-closed contracts for deployment-safe pipeline-to-UI artifacts.

``stillhere.demo.v1`` is the authoritative live-demo contract. The retained
v0 validators protect older generated artifacts that remain in supported
build paths. Every emitted artifact also crosses the precise-location privacy
deny-list before it may be written.
"""

from __future__ import annotations

import re
from typing import Any, cast, get_args

from stillhere_pipeline.normalize import SleeperType
from stillhere_pipeline.suppress import SMALL_CELL_THRESHOLD

# Field names that must never appear in deployment-safe artifacts (issue #7
# hardens this further; the build refuses to emit them from day one).
PRECISE_FIELD_DENY_LIST = frozenset(
    {"x", "y", "lat", "latitude", "lng", "lon", "longitude", "address", "street_address"}
)
# Exact raw-record identifiers and free-text/location fields that are not all
# coordinates but are equally outside the demo deployment boundary.
DEMO_RAW_FIELD_DENY_LIST = frozenset(
    {
        "block_id",
        "floc",
        "iamfloc",
        "pole",
        "pole_id",
        "public_description",
        "sap_notification_number",
        "service_request_id",
        "service_request_parent_id",
        "sub_area",
        "sub-area",
        "zipcode",
    }
)

OBSERVATION_TYPE_FIELDS: tuple[str, ...] = get_args(SleeperType)
OBSERVATION_COUNT_FIELDS = ("total", *(f"by_type.{name}" for name in OBSERVATION_TYPE_FIELDS))
OBSERVATION_SUPPRESSION_FIELD = "suppressed"


class ContractViolation(ValueError):
    """An artifact that does not meet its declared contract."""


_MONTH_RE = re.compile(r"\d{4}-(?:0[1-9]|1[0-2])\Z")
_SHA256_RE = re.compile(r"[0-9a-f]{64}\Z")


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


def _assert_no_demo_raw_fields(node: Any, path: str = "$") -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if isinstance(key, str) and key.lower() in DEMO_RAW_FIELD_DENY_LIST:
                raise ContractViolation(f"raw-record field {key!r} at {path}")
            _assert_no_demo_raw_fields(value, f"{path}.{key}")
    elif isinstance(node, list | tuple):
        for index, item in enumerate(node):
            _assert_no_demo_raw_fields(item, f"{path}[{index}]")


def _require_month(doc: dict[str, Any], field: str) -> str:
    value = _require(doc, field, str)
    if not _MONTH_RE.fullmatch(value):
        raise ContractViolation(f"field {field} must be a YYYY-MM month")
    return cast(str, value)


def _require_number(doc: dict[str, Any], field: str) -> int | float:
    return cast(int | float, _require(doc, field, (int, float)))


def _require_nonnegative_number(doc: dict[str, Any], field: str) -> int | float:
    value = _require_number(doc, field)
    if value < 0:
        raise ContractViolation(f"field {field} must be non-negative")
    return value


def _require_object_list(doc: dict[str, Any], field: str) -> list[dict[str, Any]]:
    values = _require(doc, field, list)
    if not all(isinstance(value, dict) for value in values):
        raise ContractViolation(f"field {field} must contain only objects")
    return cast(list[dict[str, Any]], values)


def _validate_demo_forecast_row(row: dict[str, Any]) -> None:
    _require(row, "area", str)
    status = _require(row, "status", str)
    if status not in {"ok", "insufficient_forecast_evidence"}:
        raise ContractViolation(f"unknown demo forecast status {status!r}")
    _require(row, "model_scorecard", list)
    _require(row, "backtest", dict)
    _require(row, "limitations", list)
    if status != "ok":
        return
    point = _require_nonnegative_number(row, "point")
    lower = _require_nonnegative_number(row, "lower")
    upper = _require_nonnegative_number(row, "upper")
    if not lower <= point <= upper:
        raise ContractViolation("demo forecast interval must be ordered around the point")


def validate_demo_v1(doc: dict[str, Any]) -> None:
    """Fail closed on the single deployment artifact used by the live demo.

    This contract deliberately validates both shape and a small set of
    decision-critical invariants. It also applies the precise-location deny
    list to the complete pre-serialization document, including optional
    reporting, parking, and weather lanes.
    """

    if not isinstance(doc, dict):
        raise ContractViolation("demo artifact must be an object")
    # Run the privacy gate before structural checks so a malformed artifact
    # cannot obscure a precise-location regression behind an earlier error.
    assert_no_precise_fields(doc)
    _assert_no_demo_raw_fields(doc)
    if _require(doc, "schema", str) != "stillhere.demo.v1":
        raise ContractViolation("schema must be stillhere.demo.v1")

    generated = _require(doc, "generated_from", dict)
    _require(generated, "bundle", str)
    _require_month(generated, "source_data_through")
    if _require(generated, "deterministic", bool) is not True:
        raise ContractViolation("generated_from.deterministic must be true")
    input_hashes = _require(generated, "input_sha256", dict)
    if not input_hashes:
        raise ContractViolation("generated_from.input_sha256 must be non-empty")
    for filename, digest in input_hashes.items():
        if not isinstance(filename, str) or not filename or "/" in filename or "\\" in filename:
            raise ContractViolation("input_sha256 keys must be base filenames")
        if not isinstance(digest, str) or not _SHA256_RE.fullmatch(digest):
            raise ContractViolation(f"input_sha256 digest for {filename!r} is not SHA-256")

    scenario = _require(doc, "scenario", dict)
    for field in ("id", "title", "headline", "decision_question", "claim_boundary"):
        _require(scenario, field, str)
    _require_month(scenario, "prepared_observation_month")
    _require_month(scenario, "prepared_forecast_month")

    observations = _require(doc, "observations", dict)
    coverage = _require(observations, "coverage", dict)
    start_month = _require_month(coverage, "start_month")
    end_month = _require_month(coverage, "end_month")
    latest_month = _require_month(coverage, "latest_reported_month")
    if not start_month <= latest_month <= end_month:
        raise ContractViolation("observation coverage months are not ordered")
    calendar_months = _require(coverage, "calendar_months", int)
    reported_months = _require(coverage, "reported_months", int)
    completeness = _require_number(coverage, "completeness_pct")
    if calendar_months <= 0 or not 0 <= reported_months <= calendar_months:
        raise ContractViolation("observation coverage counts are inconsistent")
    if not 0 <= completeness <= 100:
        raise ContractViolation("observation completeness_pct must be in [0, 100]")

    scope = _require(observations, "scope", dict)
    areas = _require(scope, "areas", list)
    if not areas or not all(isinstance(area, str) and area for area in areas):
        raise ContractViolation("observations.scope.areas must be non-empty strings")
    if len(set(areas)) != len(areas):
        raise ContractViolation("observations.scope.areas must be unique")

    history = _require_object_list(observations, "history")
    if len(history) != calendar_months:
        raise ContractViolation("history length must equal coverage.calendar_months")
    history_months = [_require_month(row, "month") for row in history]
    if history_months != sorted(set(history_months)):
        raise ContractViolation("observation history months must be unique and sorted")
    if history_months[0] != start_month or history_months[-1] != end_month:
        raise ContractViolation("observation history must span the declared coverage")
    missing: list[str] = []
    observed_count = 0
    for row in history:
        status = _require(row, "status", str)
        if status == "not_reported":
            if row.get("total") is not None:
                raise ContractViolation("not_reported history rows must have total null")
            missing.append(row["month"])
        elif status == "reported_verified_total":
            _require_nonnegative_number(row, "total")
            observed_count += 1
        else:
            raise ContractViolation(f"unknown observation history status {status!r}")
    if observed_count != reported_months:
        raise ContractViolation("reported history rows do not match coverage.reported_months")
    declared_missing = _require(observations, "missing_months", list)
    if declared_missing != missing:
        raise ContractViolation("missing_months must exactly match not_reported history rows")

    latest = _require_object_list(observations, "latest_by_area")
    latest_areas = [_require(row, "area", str) for row in latest]
    if sorted(latest_areas) != sorted(areas):
        raise ContractViolation("latest_by_area must contain each scoped area exactly once")
    for row in latest:
        if _require_month(row, "month") != latest_month:
            raise ContractViolation("latest_by_area months must match latest_reported_month")
        _require_nonnegative_number(row, "total")

    evidence = _require(doc, "evidence", dict)
    panel = _require(evidence, "balanced_panel", dict)
    panel_size = _require(panel, "panel_size", int)
    if panel_size <= 0:
        raise ContractViolation("balanced_panel.panel_size must be positive")
    panel_areas = _require_object_list(panel, "areas")
    if sorted(_require(row, "area", str) for row in panel_areas) != sorted(areas):
        raise ContractViolation("balanced-panel areas must match the observation scope")
    if sum(_require(row, "panel_blocks", int) for row in panel_areas) != panel_size:
        raise ContractViolation("balanced-panel area block counts must sum to panel_size")
    if any("components" in row for row in panel_areas):
        raise ContractViolation("per-area component breakdowns must not deploy")
    validity = _require(evidence, "validity_checks", dict)
    if validity.get("same_block_set") is not True:
        raise ContractViolation("balanced-panel evidence must verify the same block set")
    robustness = _require(evidence, "robustness", dict)
    for lane_name in ("parking_exposure", "count_day_weather"):
        lane = _require(robustness, lane_name, dict)
        status = _require(lane, "status", str)
        if status == "unavailable":
            _require(lane, "reason", str)
        elif status == "not_requested":
            pass
        elif status not in {
            "descriptive_exposure_sensitivity",
            "descriptive_same_day_robustness",
        }:
            raise ContractViolation(f"unknown {lane_name} status {status!r}")

    forecast = _require(doc, "forecast", dict)
    _require_month(forecast, "target_month")
    _require_month(forecast, "data_frozen_through")
    _require(forecast, "selection_rule", dict)
    aggregate = _require(forecast, "aggregate", dict)
    _validate_demo_forecast_row(aggregate)
    forecast_areas = _require_object_list(forecast, "areas")
    if sorted(_require(row, "area", str) for row in forecast_areas) != sorted(areas):
        raise ContractViolation("forecast areas must match the observation scope")
    for row in forecast_areas:
        _validate_demo_forecast_row(row)

    planner = _require(doc, "planner", dict)
    budget = _require(planner, "budget_hours", int)
    minimum = _require(planner, "minimum_hours_per_area", int)
    if budget <= 0 or minimum < 0:
        raise ContractViolation("planner budget and minimum must be non-negative")
    if _require(planner, "decision_support_only", bool) is not True:
        raise ContractViolation("planner must remain decision_support_only")
    allocations = _require_object_list(planner, "allocations")
    if sorted(_require(row, "area", str) for row in allocations) != sorted(areas):
        raise ContractViolation("planner allocations must contain each scoped area exactly once")
    allocated_total = 0
    for row in allocations:
        allocated = _require(row, "allocated_hours", int)
        base = _require(row, "base_hours", int)
        variable = _require(row, "variable_hours", int)
        _require_nonnegative_number(row, "planning_load")
        if allocated < minimum or base < minimum or variable < 0 or allocated != base + variable:
            raise ContractViolation(
                "planner allocation violates its declared floor or decomposition"
            )
        allocated_total += allocated
    if allocated_total != budget:
        raise ContractViolation("planner allocated hours must equal budget_hours")
    constraints = _require(planner, "constraints", dict)
    for forbidden_input in (
        "complaint_data_used",
        "precise_location_data_used",
        "reporting_bias_diagnostic_used",
    ):
        if constraints.get(forbidden_input) is not False:
            raise ContractViolation(f"planner constraint {forbidden_input} must be false")

    reporting_bias = _require(doc, "reporting_bias", dict)
    reporting_status = _require(reporting_bias, "status", str)
    if reporting_status in {"unavailable", "not_requested"}:
        _require(reporting_bias, "reason", str)
    elif reporting_status == "descriptive_diagnostic_only":
        _require(reporting_bias, "monthly", list)
        _require(reporting_bias, "excluded_uses", list)
    else:
        raise ContractViolation(f"unknown reporting_bias status {reporting_status!r}")

    _require(doc, "quality_audit", dict)
    _require(doc, "technical_summary", dict)
    limitations = _require(doc, "limitations", list)
    if not limitations or not all(isinstance(item, str) and item for item in limitations):
        raise ContractViolation("limitations must be a non-empty list of strings")


def _validate_contract_block(doc: dict[str, Any]) -> None:
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
