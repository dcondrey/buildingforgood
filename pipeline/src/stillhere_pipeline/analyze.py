"""Analytical artifact build: drop-test evidence and baseline forecasts.

Issues #8 and #9. Reads the published observations artifact plus the decision
contract and deterministically emits ``evidence.v0.json`` and
``forecast.v0.json`` for every published area. Runs after the data build:

    python -m stillhere_pipeline.analyze

The classification honors the contract's force-insufficient conditions: while
the geography version is unresolved, every area's drop test reports
``insufficient_evidence`` with the computed components still attached.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from stillhere_pipeline.contracts import (
    validate_evidence_v0,
    validate_forecast_v0,
    validate_observations_v0,
)
from stillhere_pipeline.drop_test import DropTestConfig, evaluate_drop
from stillhere_pipeline.forecast import ForecastConfig, forecast_area


class AnalyzeError(RuntimeError):
    pass


def _load_json(path: Path) -> dict[str, Any]:
    try:
        loaded = json.loads(path.read_text())
    except FileNotFoundError:
        raise AnalyzeError(f"missing input: {path}") from None
    except json.JSONDecodeError as error:
        raise AnalyzeError(f"{path} is not valid JSON: {error}") from None
    if not isinstance(loaded, dict):
        raise AnalyzeError(f"{path} must contain a JSON object")
    return loaded


def _published_totals(neighborhood: dict[str, Any]) -> dict[str, int]:
    totals: dict[str, int] = {}
    for row in neighborhood["observations"]:
        if row.get("suppressed") is True or row.get("total") is None:
            continue
        totals[row["month"]] = row["total"]
    return totals


def _active_forced_conditions(contract: dict[str, Any]) -> tuple[str, ...]:
    declared = contract.get("drop_test", {}).get("force_insufficient_evidence_when", [])
    active: list[str] = []
    if (
        "geography_version_is_unresolved" in declared
        and contract.get("geography", {}).get("status") != "resolved"
    ):
        active.append("geography_version_is_unresolved")
    return tuple(active)


def _drop_config(contract: dict[str, Any], forced: tuple[str, ...]) -> DropTestConfig:
    block = contract["drop_test"]
    return DropTestConfig(
        comparison_window_periods=block["comparison_window_periods"]["value"],
        minimum_sustained_periods=block["minimum_sustained_periods"]["value"],
        minimum_recent_completeness_ratio=block["minimum_recent_completeness_ratio"]["value"],
        possible_displacement_minimum_matched_share=block[
            "possible_displacement_minimum_matched_share"
        ]["value"],
        active_forced_conditions=forced,
    )


def _forecast_config(contract: dict[str, Any]) -> ForecastConfig:
    block = contract["forecast"]
    return ForecastConfig(
        horizon_periods=block["horizon_periods"]["value"],
        seasonal_periods=block["seasonal_periods"]["value"],
        minimum_training_periods=block["minimum_training_periods"]["value"],
    )


def run_analyze(observations_path: Path, contract_path: Path, out_dir: Path) -> dict[str, Any]:
    observations = _load_json(observations_path)
    validate_observations_v0(observations)
    contract = _load_json(contract_path)

    forced = _active_forced_conditions(contract)
    drop_config = _drop_config(contract, forced)
    forecast_config = _forecast_config(contract)
    method_breaks = {event["month"]: event["id"] for event in observations["comparability_events"]}
    source = observations["source"]

    evidence_areas: list[dict[str, Any]] = []
    forecast_areas: list[dict[str, Any]] = []
    for neighborhood in observations["neighborhoods"]:
        area = neighborhood["neighborhood"]
        totals = _published_totals(neighborhood)
        if not totals:
            continue
        period = max(totals)
        evidence = evaluate_drop(
            area=area,
            period=period,
            totals=totals,
            config=drop_config,
            method_break_months=method_breaks,
            adjacency_available=False,
        )
        evidence_areas.append(
            {
                "area": area,
                "period": evidence.period,
                "window_months": evidence.window_months,
                "classification": evidence.classification,
                "forced_reasons": evidence.forced_reasons,
                "components": [
                    {
                        "id": component.id,
                        "direction": component.direction,
                        "statement": component.statement,
                        "value": component.value,
                    }
                    for component in evidence.components
                ],
            }
        )

        result = forecast_area(area, totals, forecast_config)
        forecast_areas.append(
            {
                "area": area,
                "status": result.status,
                "model": result.model,
                "target_month": result.target_month,
                "point": result.point,
                "lower": result.lower,
                "upper": result.upper,
                "interval_level": result.interval_level,
                "backtest": {
                    "evaluated_points": result.backtest.evaluated_points,
                    "mean_absolute_error": result.backtest.mean_absolute_error,
                    "interval_points": result.backtest.interval_points,
                    "empirical_coverage": result.backtest.empirical_coverage,
                },
                "limitations": result.limitations,
            }
        )

    thresholds_status = {
        "status": "provisional",
        "review_issue_number": 35,
        "comparison_window_periods": drop_config.comparison_window_periods,
        "minimum_sustained_periods": drop_config.minimum_sustained_periods,
        "minimum_recent_completeness_ratio": drop_config.minimum_recent_completeness_ratio,
        "possible_displacement_minimum_matched_share": (
            drop_config.possible_displacement_minimum_matched_share
        ),
    }
    evidence_doc: dict[str, Any] = {
        "schema": "evidence.v0",
        "source": source,
        "thresholds": thresholds_status,
        "language_note": (
            "Classifications describe evidence about aggregate observations of places. "
            "They never identify, track, or explain the circumstances of any person, "
            "and they make no causal claim."
        ),
        "areas": evidence_areas,
    }
    forecast_doc: dict[str, Any] = {
        "schema": "forecast.v0",
        "source": source,
        "settings": {
            "status": "provisional",
            "review_issue_number": 36,
            "horizon_periods": forecast_config.horizon_periods,
            "horizon_unit": "month",
            "seasonal_periods": forecast_config.seasonal_periods,
            "minimum_training_periods": forecast_config.minimum_training_periods,
            "interval_level": forecast_config.interval_level,
            "candidate_promotion_rule": "held_out_improvement_over_baseline_required",
        },
        "areas": forecast_areas,
    }

    validate_evidence_v0(evidence_doc)
    validate_forecast_v0(forecast_doc)

    out_dir.mkdir(parents=True, exist_ok=True)
    for name, doc in (("evidence.v0.json", evidence_doc), ("forecast.v0.json", forecast_doc)):
        (out_dir / name).write_text(json.dumps(doc, indent=2, sort_keys=True) + "\n")
    return {
        "areas": len(evidence_areas),
        "forecast_ok": sum(1 for a in forecast_areas if a["status"] == "ok"),
        "forced_conditions": list(forced),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build drop-test and forecast artifacts.")
    parser.add_argument(
        "--observations", type=Path, default=Path("public/generated/observations.v0.json")
    )
    parser.add_argument("--contract", type=Path, default=Path("config/decision.v1.json"))
    parser.add_argument("--out", type=Path, default=Path("public/generated"))
    args = parser.parse_args(argv)
    try:
        summary = run_analyze(args.observations, args.contract, args.out)
    except AnalyzeError as error:
        print(f"ANALYZE FAILED: {error}")
        return 1
    print(f"ANALYZE OK: {json.dumps(summary, sort_keys=True)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
