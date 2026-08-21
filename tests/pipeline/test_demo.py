import json
from pathlib import Path

import pytest

from stillhere_pipeline.contracts import assert_no_precise_fields
from stillhere_pipeline.demo import (
    CORE_AREAS,
    GET_IT_DONE_DEFAULT,
    PARKING_DEFAULT,
    WEATHER_DEFAULT,
    DemoBuildError,
    _conformal_radius,
    _count_day_weather,
    _cross_source_checkpoints,
    _forecast_series,
    _month_range,
    _parking_exposure,
    _parking_exposure_from_dir,
    _promote_model,
    _read_csv,
    _reporting_bias,
    _reporting_bias_from_path,
    build_demo_document,
    run_demo,
)

RAW = Path("data/raw/hackathon_provided")
RAW_AVAILABLE = all(
    (RAW / name).exists()
    for name in (
        "DowntownCounts_Monthly.csv",
        "BlockLevel_Counts.csv",
        "BlockLevel_Counts_Panel261.csv",
        "Methodology_Periods.csv",
    )
)


@pytest.fixture(scope="module")
def demo() -> dict:
    if not RAW_AVAILABLE:
        pytest.skip("hackathon-provided raw bundle is intentionally not tracked")
    return build_demo_document(RAW)


def test_reliable_history_keeps_reporting_gaps_null(demo: dict) -> None:
    observations = demo["observations"]
    assert observations["coverage"] == {
        "start_month": "2017-01",
        "end_month": "2025-12",
        "calendar_months": 108,
        "reported_months": 104,
        "completeness_pct": 96.3,
        "latest_reported_month": "2025-12",
    }
    assert observations["missing_months"] == [
        "2025-07",
        "2025-08",
        "2025-10",
        "2025-11",
    ]
    missing = [row for row in observations["history"] if row["status"] == "not_reported"]
    assert len(missing) == 4
    assert all(row["total"] is None and row["reported_area_count"] == 0 for row in missing)


def test_monthly_total_uses_fixed_nonoverlapping_core(demo: dict) -> None:
    observations = demo["observations"]
    assert observations["scope"]["areas"] == list(CORE_AREAS)
    january = next(row for row in observations["history"] if row["month"] == "2025-01")
    assert january["total"] == 759
    assert len(observations["latest_by_area"]) == 6


def test_prepared_balanced_panel_result_is_exact(demo: dict) -> None:
    panel = demo["evidence"]["balanced_panel"]
    assert panel["panel_size"] == 261
    assert panel["raw_observation_units"] == {
        "from": 778,
        "to": 670,
        "change": -108,
        "change_pct": -13.9,
    }
    assert panel["active_blocks"] == {
        "from": 121,
        "to": 141,
        "change": 20,
        "change_pct": 16.5,
    }
    assert panel["gross_change"] == {
        "increase_units_on_blocks_with_growth": 274,
        "decrease_units_on_blocks_with_decline": 382,
        "blocks_with_increase": 93,
        "blocks_with_decrease": 75,
        "blocks_unchanged": 93,
    }
    assert all("components" not in area for area in panel["areas"])
    assert demo["evidence"]["validity_checks"]["same_block_set"] is True


def test_spread_result_survives_two_units_but_not_three(demo: dict) -> None:
    sensitivity = demo["evidence"]["balanced_panel"]["distribution_sensitivity"]
    assert sensitivity["active_block_thresholds"] == [
        {
            "minimum_raw_units": 1,
            "from_active_blocks": 121,
            "to_active_blocks": 141,
            "change": 20,
            "entered_threshold": 57,
            "exited_threshold": 37,
            "retained_at_threshold": 84,
        },
        {
            "minimum_raw_units": 2,
            "from_active_blocks": 91,
            "to_active_blocks": 101,
            "change": 10,
            "entered_threshold": 45,
            "exited_threshold": 35,
            "retained_at_threshold": 56,
        },
        {
            "minimum_raw_units": 3,
            "from_active_blocks": 70,
            "to_active_blocks": 70,
            "change": 0,
            "entered_threshold": 28,
            "exited_threshold": 28,
            "retained_at_threshold": 42,
        },
    ]
    assert sensitivity["single_unit_blocks"] == {"from": 30, "to": 40, "change": 10}
    assert sensitivity["concentration"]["from"] == {
        "hhi": 0.023794,
        "effective_number_of_blocks": 42.0,
    }
    assert sensitivity["concentration"]["to"] == {
        "hhi": 0.027423,
        "effective_number_of_blocks": 36.5,
    }


def test_like_for_like_component_footprint_is_primary_sensitivity(demo: dict) -> None:
    sensitivity = demo["evidence"]["balanced_panel"]["component_distribution_sensitivity"]
    components = {row["component"]: row for row in sensitivity["components"]}
    individuals = components["individuals"]
    assert individuals["observed_units"] == {
        "from": 510,
        "to": 548,
        "change": 38,
        "change_pct": 7.5,
    }
    assert [
        (row["minimum_component_units"], row["from_active_blocks"], row["to_active_blocks"])
        for row in individuals["active_block_thresholds"]
    ] == [(1, 111, 136), (2, 78, 94)]
    assert individuals["concentration"]["from"] == {
        "hhi": 0.028466,
        "effective_number_of_blocks": 35.1,
    }
    assert individuals["concentration"]["to"] == {
        "hhi": 0.028231,
        "effective_number_of_blocks": 35.4,
    }
    assert components["tents_structures"]["observed_units"]["from"] == 258
    assert components["tents_structures"]["observed_units"]["to"] == 117
    assert components["vehicles"]["observed_units"]["from"] == 10
    assert components["vehicles"]["observed_units"]["to"] == 5
    assert sensitivity["post2020_multiplier_decomposition"] == {
        "status": "secondary_derived_estimate",
        "formula": "individuals + 1.75*tents_structures + 2.03*vehicles",
        "from": 981.8,
        "to": 762.9,
        "change": -218.9,
        "change_pct": -22.3,
        "contributions_to_change": {
            "individuals": 38,
            "tents_structures": -246.75,
            "vehicles": -10.15,
        },
        "interpretation": sensitivity["post2020_multiplier_decomposition"]["interpretation"],
    }


def test_annual_contrast_is_latest_not_cherry_picked(demo: dict) -> None:
    sensitivity = demo["evidence"]["balanced_panel"]["annual_contrast_sensitivity"]
    assert sensitivity["measure"] == (
        "Observed individuals and blocks with at least one observed individual."
    )
    assert sensitivity["eligible_contrasts"] == 9
    assert sensitivity["selected_divergence_rank_descending"] == 3
    assert sensitivity["ineligible_contrasts"] == []
    selected = next(row for row in sensitivity["contrasts"] if row["selected"])
    assert selected == {
        "from_month": "2024-01",
        "to_month": "2025-01",
        "individuals_change_pct": 7.5,
        "individual_active_blocks_change_pct": 22.5,
        "individual_active_blocks_change": 25,
        "direction_divergence_percentage_points": 15.0,
        "selected": True,
    }


def test_organizer_anomaly_ledger_preserves_claim_boundaries(demo: dict) -> None:
    audit = demo["quality_audit"]
    assert audit["balanced_panel"]["blocks_with_area_drift"] == 0
    assert audit["balanced_panel"]["panel_membership_matches_full_file_flag"] is True
    assert audit["balanced_panel"]["missing_component_cells"] == 1
    assert audit["monthly_table"]["missing_component_cells"] == 143
    assert audit["monthly_table"]["material_component_total_mismatch_area_months"] == 25
    cross_lane = audit["cross_digitization_consistency"]
    assert cross_lane["comparable_core_area_months"] == 72
    assert cross_lane["area_months_with_any_difference"] == 20
    assert cross_lane["maximum_absolute_delta"] == {
        "individual": 13,
        "tent": 9,
        "vehicle": 4,
    }
    assert cross_lane["direction_consistent_in_prepared_change"] is True
    assert audit["area_crosswalk"]["unmapped_monthly_source_labels"] == []
    assert audit["area_crosswalk"]["unmapped_block_source_labels"] == []


def test_forecast_is_temporally_held_out_and_interpretable(demo: dict) -> None:
    forecast = demo["forecast"]
    assert forecast["target_month"] == "2026-01"
    assert forecast["selection_rule"]["promotion_holdout"] == "2023-01..2023-12"
    assert forecast["selection_rule"]["interval_calibration_window"] == "2024-01..2024-12"
    assert forecast["selection_rule"]["final_audit_window"] == "2025-01..2025-12"
    for result in [forecast["aggregate"], *forecast["areas"]]:
        assert result["status"] == "ok"
        assert result["lower"] <= result["point"] <= result["upper"]
        assert len(result["model_scorecard"]) == 3
        assert result["promotion"]["baseline_model"] == "seasonal_naive_12m"
        assert result["backtest"]["evaluated_points"] == 8
        assert result["backtest"]["mae"] is not None
        assert result["backtest"]["wape_pct"] is not None
        assert result["backtest"]["interval_points"] == 8


def test_promotion_requires_strict_holdout_improvement() -> None:
    scores = [
        {"model": "seasonal_naive_12m", "mae": 10.0},
        {"model": "challenger_a", "mae": 10.0},
        {"model": "challenger_b", "mae": 12.0},
    ]
    assert _promote_model(scores) == ("seasonal_naive_12m", False)
    scores[1]["mae"] = 9.9
    assert _promote_model(scores) == ("challenger_a", True)


def test_ineligible_candidates_do_not_prevent_baseline_output() -> None:
    # A challenger without an evaluable holdout score (mae None) is skipped
    # rather than blocking selection, and an all-ineligible field retains the
    # registered baseline (#10 acceptance criterion 2).
    scores = [
        {"model": "seasonal_naive_12m", "mae": 10.0},
        {"model": "challenger_a", "mae": None},
        {"model": "challenger_b", "mae": 9.0},
    ]
    assert _promote_model(scores) == ("challenger_b", True)
    scores[2]["mae"] = None
    assert _promote_model(scores) == ("seasonal_naive_12m", False)


def test_conformal_radius_uses_finite_sample_corrected_rank() -> None:
    # n=4 and level=.8 => ceil(5*.8)=4, so the maximum residual is used.
    assert _conformal_radius([1.0, 4.0, 2.0, 3.0], 0.8) == 4.0


def test_future_audit_values_cannot_change_promotion() -> None:
    months = _month_range("2021-01", "2025-12")
    base = {month: float(100 + index % 12) for index, month in enumerate(months)}
    changed_future = dict(base)
    for month in _month_range("2025-01", "2025-12"):
        changed_future[month] += 1_000
    original = _forecast_series("test", base, "2026-01")
    changed = _forecast_series("test", changed_future, "2026-01")
    assert original["model_scorecard"] == changed["model_scorecard"]
    assert original["promotion"] == changed["promotion"]
    assert original["backtest"] != changed["backtest"]


def test_prepared_allocation_is_feasible_and_excludes_complaints(demo: dict) -> None:
    planner = demo["planner"]
    assert sum(row["allocated_hours"] for row in planner["allocations"]) == 80
    assert all(row["allocated_hours"] >= 8 for row in planner["allocations"])
    assert planner["constraints"]["complaint_data_used"] is False
    assert planner["constraints"]["reporting_bias_diagnostic_used"] is False
    assert planner["constraints"]["precise_location_data_used"] is False
    assert planner["constraints"]["human_review_required"] is True


def test_infeasible_floor_fails_closed() -> None:
    if not RAW_AVAILABLE:
        pytest.skip("hackathon-provided raw bundle is intentionally not tracked")
    with pytest.raises(DemoBuildError, match="cannot satisfy"):
        build_demo_document(RAW, budget_hours=40, minimum_hours_per_area=8)


def test_artifact_is_byte_deterministic_and_privacy_safe(tmp_path: Path, demo: dict) -> None:
    first = tmp_path / "one.json"
    second = tmp_path / "two.json"
    run_demo(RAW, first)
    run_demo(RAW, second)
    assert first.read_bytes() == second.read_bytes()
    assert json.loads(first.read_text()) == demo
    assert_no_precise_fields(demo)


def _request(
    month: str,
    service: str,
    request_id: str,
    *,
    parent_id: str = "",
    geography: str = "DOWNTOWN",
) -> dict[str, str]:
    return {
        "comm_plan_name": geography,
        "date_requested": f"{month}-15 12:00:00.000",
        "service_name": service,
        "service_request_id": request_id,
        "service_request_parent_id": parent_id,
        "case_origin": "Mobile",
    }


def test_reporting_bias_fixture_enforces_geography_parent_groups_and_split() -> None:
    rows: list[dict[str, str]] = []
    for month in _month_range("2023-01", "2023-06"):
        rows.extend(
            [
                _request(month, "Encampment", f"{month}-parent"),
                _request(
                    month,
                    "Encampment",
                    f"{month}-child",
                    parent_id=f"{month}-parent",
                ),
                _request(month, "Pothole", f"{month}-pothole"),
                _request(month, "Street Light Maintenance", f"{month}-light"),
                _request(month, "Traffic Signal Issue", f"{month}-signal"),
                _request(month, "Other", f"{month}-other"),
            ]
        )
    for month in _month_range("2023-08", "2024-01"):
        for group in ("a", "b"):
            rows.extend(
                [
                    _request(month, "Encampment", f"{month}-{group}-parent"),
                    _request(
                        month,
                        "Encampment",
                        f"{month}-{group}-child",
                        parent_id=f"{month}-{group}-parent",
                    ),
                ]
            )
        rows.extend(
            [
                _request(month, "Pothole", f"{month}-pothole"),
                _request(month, "Street Light Maintenance", f"{month}-light"),
                _request(month, "Traffic Signal Issue", f"{month}-signal"),
                _request(month, "Other", f"{month}-other"),
            ]
        )
    rows.append(_request("2023-01", "Encampment", "near-match", geography="Downtown"))

    result = _reporting_bias(rows)
    january = next(row for row in result["monthly"] if row["month"] == "2023-01")
    august = next(row for row in result["monthly"] if row["month"] == "2023-08")
    assert january["all_reports"] == 6
    assert january["encampment_raw"] == 2
    assert january["encampment_unique_parent"] == 1
    assert august["all_reports"] == 8
    assert august["encampment_raw"] == 4
    assert august["encampment_unique_parent"] == 2
    assert result["comparison"]["encampment_raw"]["percent_change"] == 100.0
    assert result["comparison"]["encampment_unique_parent"]["percent_change"] == 100.0
    assert result["comparison"]["all_reports"]["percent_change"] == 33.3
    assert result["comparison"]["design"]["transition_excluded"] == "2023-07"


@pytest.mark.skipif(
    not GET_IT_DONE_DEFAULT.exists(),
    reason="large local Get It Done extract is intentionally not tracked",
)
def test_real_reporting_bias_metrics_and_privacy() -> None:
    result = _reporting_bias_from_path(GET_IT_DONE_DEFAULT)
    comparison = result["comparison"]
    assert result["status"] == "descriptive_diagnostic_only"
    assert len(result["monthly"]) == 48
    assert comparison["all_reports"]["percent_change"] == 9.2
    assert comparison["encampment_raw"]["percent_change"] == 50.7
    assert comparison["encampment_unique_parent"]["percent_change"] == 54.8
    assert comparison["encampment_share"]["change_percentage_points"] == 15.6
    assert comparison["raw_vs_parent_sensitivity"]["pre_raw_reports"] == 10_834
    assert comparison["raw_vs_parent_sensitivity"]["pre_unique_parent_requests"] == 4_485
    assert comparison["raw_vs_parent_sensitivity"]["post_raw_reports"] == 16_327
    assert comparison["raw_vs_parent_sensitivity"]["post_unique_parent_requests"] == 6_943
    assert comparison["case_origin_sensitivity"]["pre_share_pct"] == 93.0
    assert comparison["case_origin_sensitivity"]["post_share_pct"] == 91.4
    assert comparison["matched_calendar_sensitivity"] == {
        "pre_period": {"start_month": "2022-08", "end_month": "2023-01"},
        "post_period": {"start_month": "2023-08", "end_month": "2024-01"},
        "all_reports": {"pre_total": 20_463, "post_total": 28_825, "percent_change": 40.9},
        "encampment_raw": {
            "pre_total": 8_680,
            "post_total": 16_327,
            "percent_change": 88.1,
        },
        "encampment_unique_parent": {
            "pre_total": 3_542,
            "post_total": 6_943,
            "percent_change": 96.0,
        },
        "encampment_share": {
            "pre_pct": 42.4,
            "post_pct": 56.6,
            "change_percentage_points": 14.2,
        },
        "interpretation": comparison["matched_calendar_sensitivity"]["interpretation"],
    }
    source_quality = result["source_quality"]
    assert source_quality["request_ids"]["duplicate_extra_rows"] == 3
    assert source_quality["request_ids"]["eligible_downtown_encampment_duplicate_extra_rows"] == 0
    assert source_quality["parent_graph"]["self_parent_links"] == 0
    assert source_quality["parent_graph"]["cycle_nodes"] == 48
    assert source_quality["parent_graph"]["distinct_orphan_parent_ids"] == 1_087
    assert (
        source_quality["parent_graph"]["eligible_downtown_encampment"][
            "outside_filtered_scope_reference_rows"
        ]
        == 935
    )
    assert [row["service_name"] for row in comparison["placebos"]] == [
        "Pothole",
        "Street Light Maintenance",
        "Traffic Signal Issue",
    ]
    checkpoint = _cross_source_checkpoints(_read_csv(RAW / "DowntownCounts_Monthly.csv"), result)
    assert checkpoint["changes"] == {
        "published_total_may_2023_to_june_2025_pct": -64.0,
        "raw_gid_may_2023_to_january_2024_pct": 27.2,
    }
    assert [row["raw_reports_per_published_total_unit"] for row in checkpoint["checkpoints"]] == [
        1.24,
        3.24,
        1.18,
    ]
    assert_no_precise_fields(result)


def test_parking_fixture_uses_fixed_historically_downtown_cohort() -> None:
    pre = set(_month_range("2023-01", "2023-06"))
    post = set(_month_range("2023-08", "2024-01"))
    rows = []
    for month in _month_range("2022-01", "2025-12"):
        rows.append(
            {
                "pole_id": "P-1",
                "year": month[:4],
                "month": str(int(month[5:])),
                "num_trans": "20" if month in post else "10",
                "zone": "Downtown",
                "area": "Core",
            }
        )
        if month in pre | post:
            rows.append(
                {
                    "pole_id": "not-downtown",
                    "year": month[:4],
                    "month": str(int(month[5:])),
                    "num_trans": "999",
                    "zone": "Uptown",
                    "area": "Other",
                }
            )
    reporting = {
        "status": "descriptive_diagnostic_only",
        "comparison": {
            "all_reports": {"percent_change": 5.0},
            "encampment_raw": {"percent_change": 50.0},
            "encampment_unique_parent": {"percent_change": 48.0},
        },
    }
    result = _parking_exposure(
        rows,
        [
            {
                "pole": "P-1",
                "start_date": "1/1/22",
                "end_date": "12/31/25",
                "zone": "Downtown",
            }
        ],
        [{"pole": "P-1", "zone": "Downtown"}],
        reporting,
    )
    assert result["cohort"]["historically_verified_poles"] == 1
    assert result["comparison"]["fixed_cohort"]["percent_change"] == 100.0
    assert result["comparison"]["all_observed_downtown_meters"]["percent_change"] == 100.0
    assert result["comparison"]["reporting_context"]["encampment_raw_percent_change"] == 50.0
    outside = next(row for row in result["monthly"] if row["month"] == "2022-01")
    assert outside["fixed_cohort_transactions"] is None


def test_weather_fixture_requires_exact_station_and_dates() -> None:
    result = _count_day_weather(
        [
            {
                "STATION": "USW00023188",
                "DATE": "2024-01-25",
                "PRCP": "0.00",
                "TMAX": "62",
            },
            {
                "STATION": "USW00023188",
                "DATE": "2025-01-31",
                "PRCP": "0.00",
                "TMAX": "63",
            },
            {
                "STATION": "other",
                "DATE": "2025-01-31",
                "PRCP": "5.00",
                "TMAX": "90",
            },
        ]
    )
    assert result["comparison"]["both_zero_precipitation"] is True
    assert result["comparison"]["maximum_temperature_difference_f"] == 1


@pytest.mark.skipif(
    not PARKING_DEFAULT.exists(),
    reason="official parking-meter extracts are intentionally not tracked",
)
def test_real_parking_exposure_metrics_and_privacy() -> None:
    result = _parking_exposure_from_dir(PARKING_DEFAULT, {"status": "unavailable"})
    assert result["cohort"]["transaction_complete_candidates"] == 2_040
    assert result["cohort"]["historically_verified_poles"] == 2_035
    assert result["cohort"]["historic_location_gap_exclusions"] == 5
    assert result["comparison"]["fixed_cohort"]["percent_change"] == -1.7
    assert result["comparison"]["all_observed_downtown_meters"]["percent_change"] == -2.9
    matched = result["comparison"]["matched_calendar_sensitivity"]
    assert matched["historically_verified_poles"] == 1_997
    assert matched["fixed_cohort"]["percent_change"] == -2.4
    assert matched["all_observed_downtown_meters"]["percent_change"] == -4.0
    assert result["source_quality"]["historic_location_exact_duplicate_rows"] == 0
    assert result["source_quality"]["negative_or_fractional_transaction_counts"] == 0
    assert_no_precise_fields(result)


@pytest.mark.skipif(
    not WEATHER_DEFAULT.exists(),
    reason="optional NOAA daily extract is intentionally not tracked",
)
def test_real_count_day_weather_metrics_and_privacy() -> None:
    result = _count_day_weather(_read_csv(WEATHER_DEFAULT))
    assert result["dates"] == [
        {
            "date": "2024-01-25",
            "precipitation_inches": 0.0,
            "maximum_temperature_f": 62,
        },
        {
            "date": "2025-01-31",
            "precipitation_inches": 0.0,
            "maximum_temperature_f": 63,
        },
    ]
    assert result["source_quality"]["duplicate_station_dates"] == 0
    assert result["source_quality"]["selected_rows_complete"] is True
    assert result["source_quality"]["negative_precipitation_rows"] == 0
    assert result["source_quality"]["tmax_below_tmin_rows"] == 0
    assert_no_precise_fields(result)
