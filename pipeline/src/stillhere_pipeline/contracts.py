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


def _validate_currency(currency: dict[str, Any]) -> None:
    """Validate the optional currency block emitted by the monthly refresh.

    Optional by design: artifacts built before the refresh command existed
    stay valid. Present-but-malformed is a violation, so the UI can trust the
    block whenever it is there.
    """
    _require_month(currency, "source_data_through")
    _require(currency, "as_of", str)
    _require(currency, "generated_at", str)
    status = _require(currency, "status", str)
    if status not in {"current", "stale"}:
        raise ContractViolation(f"unknown currency status {status!r}")
    is_stale = _require(currency, "is_stale", bool)
    if is_stale is not (status == "stale"):
        raise ContractViolation("currency.is_stale must agree with currency.status")

    staleness = _require(currency, "staleness", dict)
    for field in ("elapsed", "threshold"):
        span = _require(staleness, field, dict)
        if _require(span, "months", int) < 0:
            raise ContractViolation(f"currency.staleness.{field}.months must be non-negative")
    _require(staleness, "reason", str)

    expected = _require(currency, "next_publication_expected", dict)
    _require_month(expected, "month")
    _require(expected, "basis", str)
    if _require(expected, "cadence", dict).get("months", 0) < 1:
        raise ContractViolation("currency.next_publication_expected.cadence.months must be >= 1")

    lane = _require(currency, "observed_not_model_eligible", dict)
    if _require(lane, "status", str) != "observed_not_model_eligible":
        raise ContractViolation("currency lane status must be observed_not_model_eligible")
    reason = _require(lane, "exclusion_reason", dict)
    grounds = _require(reason, "grounds", list)
    if not grounds or not all(isinstance(item, str) and item for item in grounds):
        raise ContractViolation("exclusion_reason.grounds must be a non-empty list of strings")
    _require(reason, "promotion_rule", str)
    _require(reason, "source", str)
    excluded_from = _require(lane, "excluded_from", list)
    if not excluded_from:
        raise ContractViolation("observed_not_model_eligible.excluded_from must be non-empty")
    months = _require(lane, "months", list)
    rows = _require_object_list(lane, "rows")
    if not rows:
        raise ContractViolation("observed_not_model_eligible.rows must be non-empty")
    for row in rows:
        _require_month(row, "month")
        _require_nonnegative_number(row, "value")
        if _require(row, "model_eligible", bool) is not False:
            raise ContractViolation("observed_not_model_eligible rows must be model_eligible=false")
    if months != sorted({row["month"] for row in rows}):
        raise ContractViolation("observed_not_model_eligible.months must summarize its rows")


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
    # Only rows with a published interval carry an upper bound to check
    # against; an area whose forecast is `insufficient_forecast_evidence` has
    # no in-artifact value to reconcile with. See the residual gap noted in
    # docs/project/PHASE1_ADVERSARIAL.md.
    forecast_upper_by_area = {
        row["area"]: _require_number(row, "upper")
        for row in forecast_areas
        if row.get("status") == "ok"
    }
    latest_total_by_area = {row["area"]: row["total"] for row in latest if "total" in row}
    allocated_total = 0
    declared_derivations: list[str] = []
    for row in allocations:
        allocated = _require(row, "allocated_hours", int)
        base = _require(row, "base_hours", int)
        variable = _require(row, "variable_hours", int)
        area_name = row["area"]
        load = _require_nonnegative_number(row, "planning_load")
        forecast_upper = forecast_upper_by_area.get(area_name)

        if forecast_upper is not None:
            # The forecast settles it by arithmetic, so the label is optional
            # here -- and that matters, because a label is the one thing an
            # attacker gets to write.
            derivation = row.get("planning_load_derivation", _FORECAST_DERIVATION)
            if derivation != _FORECAST_DERIVATION:
                raise ContractViolation(
                    f"planner allocation for {area_name!r} declares planning_load_derivation "
                    f"{derivation!r}, but that area published a forecast interval and must "
                    f"plan against {PLANNING_LOAD_DERIVATIONS[_FORECAST_DERIVATION]}"
                )
            expected: int | float = forecast_upper
        else:
            # Nothing to reconcile against unless the artifact says which
            # fallback it used, so here the declaration is required.
            if "planning_load_derivation" not in row:
                raise ContractViolation(
                    f"planner allocation for {area_name!r} has no published forecast interval "
                    "and declares no planning_load_derivation. An area with no forecast must "
                    f"say what its planning load is derived from "
                    f"(permitted: {sorted(PLANNING_LOAD_DERIVATIONS)}); an unexplained load is "
                    "refused, because that is the shape complaint volume arrives in."
                )
            derivation = _require(row, "planning_load_derivation", str)
            if derivation == _FORECAST_DERIVATION:
                raise ContractViolation(
                    f"planner allocation for {area_name!r} claims a forecast upper bound, but "
                    "that area published no forecast interval"
                )
            if derivation == "latest_observed_total":
                if area_name not in latest_total_by_area:
                    raise ContractViolation(
                        f"planner allocation for {area_name!r} claims a latest observed total "
                        "that the observations block does not publish"
                    )
                expected = latest_total_by_area[area_name]
            elif derivation == "coverage_floor_only":
                expected = 0
            else:
                raise ContractViolation(
                    f"planner allocation for {area_name!r} declares planning_load_derivation "
                    f"{derivation!r}, which is not permitted "
                    f"(permitted: {sorted(PLANNING_LOAD_DERIVATIONS)}). A planning load with no "
                    "permitted derivation is refused: complaint volume, service demand, or any "
                    "other unstated basis may never become allocation weight."
                )

        declared_derivations.append(derivation)
        if abs(load - expected) > _PLANNING_LOAD_TOLERANCE:
            raise ContractViolation(
                f"planner allocation for {area_name!r} declares planning_load {load} derived "
                f"from {PLANNING_LOAD_DERIVATIONS[derivation]}, but that value is {expected}. "
                "A planning load must reconcile with what it is derived from; a number that "
                "does not is refused whatever it is called and whatever it declares."
            )
        if allocated < minimum or base < minimum or variable < 0 or allocated != base + variable:
            raise ContractViolation(
                "planner allocation violates its declared floor or decomposition"
            )
        allocated_total += allocated
    if allocated_total != budget:
        raise ContractViolation("planner allocated hours must equal budget_hours")
    constraints = _require(planner, "constraints", dict)
    # complaint_data_used is checked against the value derived from the
    # declared derivations rather than taken on the writer's word alone. This
    # is a partial derivation, and saying so matters: rows that declare no
    # derivation contribute nothing to it, so for those the flag remains an
    # assertion. What is no longer possible is the artifact that passed attack
    # C -- complaint volume in planning_load, complaint_data_used=false -- and
    # that is stopped by the reconciliation above, not by this flag.
    derived_complaint_use = any(
        derivation in COMPLAINT_DERIVED_PLANNING_LOADS for derivation in declared_derivations
    )
    if constraints.get("complaint_data_used") is not derived_complaint_use:
        raise ContractViolation(
            "planner constraint complaint_data_used must equal the value derived from the "
            f"declared planning-load derivations ({derived_complaint_use}), not an "
            "independent assertion"
        )
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

    if "currency" in doc:
        _validate_currency(_require(doc, "currency", dict))


# Permitted derivations for planner.allocations[].planning_load, mapped to the
# block of the same artifact each one must reconcile with.
#
# `planning_load` is the only number the shipped allocator weights on, and
# until this existed it was checked for nothing but "is a non-negative
# number". Complaint volume is a non-negative number. The bypass was executed,
# not theorised: see docs/project/PHASE1_ADVERSARIAL.md, attack C, where 311
# counts were written straight into planning_load and this validator accepted
# the artifact while it still declared complaint_data_used=false.
#
# A derivation is not taken on trust. Every entry names a value that is
# already somewhere else in the same document, and the validator recomputes
# the comparison rather than believing the label.
#
# There is no entry for "whatever number the writer felt was right". An area
# with no usable forecast is a normal state in this product -- adjacency and
# evidence are often insufficient -- and it still needs staffing, so it may
# plan against its most recent observed total or take the coverage floor and
# no discretionary share. What it may not do is carry a load with no stated,
# checkable basis, because that is the shape complaint volume arrives in.
PLANNING_LOAD_DERIVATIONS: dict[str, str] = {
    "forecast_upper_bound": "forecast.areas[].upper",
    "latest_observed_total": "observations.latest_by_area[].total",
    "coverage_floor_only": "no discretionary load (planning_load must be 0)",
}

# The derivation an area MUST use when its forecast published an interval.
# Without this, an area with a forecast could declare the fallback instead and
# pick whichever number suited it.
_FORECAST_DERIVATION = "forecast_upper_bound"

# Derivations that would mean complaint volume reached the allocator. None is
# permitted, which is why planner.constraints.complaint_data_used can be
# DERIVED from the declared derivations instead of asserted by the writer.
COMPLAINT_DERIVED_PLANNING_LOADS: frozenset[str] = frozenset()

_PLANNING_LOAD_TOLERANCE = 1e-6


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
