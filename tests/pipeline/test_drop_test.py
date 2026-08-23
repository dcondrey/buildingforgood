from stillhere_pipeline.drop_test import (
    INSUFFICIENT_EVIDENCE,
    LIKELY_IMPROVEMENT,
    POSSIBLE_DISPLACEMENT,
    DropEvidence,
    DropTestConfig,
    evaluate_drop,
)

CONFIG = DropTestConfig(
    comparison_window_periods=3,
    minimum_sustained_periods=2,
    minimum_recent_completeness_ratio=0.8,
    possible_displacement_minimum_matched_share=0.5,
)

DECLINE = {"2022-09": 100, "2022-10": 90, "2022-11": 80, "2022-12": 70}


def evaluate(
    totals: dict[str, int],
    config: DropTestConfig = CONFIG,
    method_break_months: dict[str, str] | None = None,
    adjacency_available: bool = False,
    adjacent_matched_share: float | None = None,
) -> DropEvidence:
    return evaluate_drop(
        area="east_village",
        period="2022-12",
        totals=totals,
        config=config,
        method_break_months=method_break_months or {},
        adjacency_available=adjacency_available,
        adjacent_matched_share=adjacent_matched_share,
    )


class TestClassification:
    def test_sustained_decline_with_matched_adjacent_increase_is_displacement(self) -> None:
        result = evaluate(DECLINE, adjacency_available=True, adjacent_matched_share=0.7)
        assert result.classification == POSSIBLE_DISPLACEMENT

    def test_sustained_decline_with_low_matched_share_is_improvement(self) -> None:
        result = evaluate(DECLINE, adjacency_available=True, adjacent_matched_share=0.1)
        assert result.classification == LIKELY_IMPROVEMENT

    def test_without_adjacency_evidence_is_insufficient(self) -> None:
        result = evaluate(DECLINE)
        assert result.classification == INSUFFICIENT_EVIDENCE
        assert any(c.id == "adjacent_evidence" for c in result.components)

    def test_forced_condition_overrides_everything(self) -> None:
        forced = DropTestConfig(
            comparison_window_periods=3,
            minimum_sustained_periods=2,
            minimum_recent_completeness_ratio=0.8,
            possible_displacement_minimum_matched_share=0.5,
            active_forced_conditions=("geography_version_is_unresolved",),
        )
        result = evaluate(
            DECLINE, config=forced, adjacency_available=True, adjacent_matched_share=0.9
        )
        assert result.classification == INSUFFICIENT_EVIDENCE
        assert result.forced_reasons == ["geography_version_is_unresolved"]

    def test_single_month_dip_is_not_sustained(self) -> None:
        totals = {"2022-09": 100, "2022-10": 100, "2022-11": 110, "2022-12": 70}
        result = evaluate(totals, adjacency_available=True, adjacent_matched_share=0.9)
        assert result.classification == INSUFFICIENT_EVIDENCE

    def test_missing_window_month_fails_completeness(self) -> None:
        totals = {"2022-09": 100, "2022-11": 80, "2022-12": 70}
        result = evaluate(totals, adjacency_available=True, adjacent_matched_share=0.9)
        assert result.classification == INSUFFICIENT_EVIDENCE
        completeness = next(c for c in result.components if c.id == "window_completeness")
        assert completeness.direction == "against"

    def test_method_break_inside_window_is_insufficient(self) -> None:
        result = evaluate(
            DECLINE,
            method_break_months={"2022-10": "occupancy_multiplier_break"},
            adjacency_available=True,
            adjacent_matched_share=0.9,
        )
        assert result.classification == INSUFFICIENT_EVIDENCE
        break_component = next(c for c in result.components if c.id == "method_break")
        assert "occupancy_multiplier_break" in break_component.statement

    def test_increase_is_not_classified_as_improvement(self) -> None:
        totals = {"2022-09": 70, "2022-10": 80, "2022-11": 90, "2022-12": 100}
        result = evaluate(totals, adjacency_available=True, adjacent_matched_share=0.0)
        assert result.classification == INSUFFICIENT_EVIDENCE


class TestEvidenceComponents:
    def test_every_result_publishes_components(self) -> None:
        """Every classification the module can return, not only one of them."""
        increase = {"2022-09": 70, "2022-10": 80, "2022-11": 90, "2022-12": 100}
        gap = {"2022-09": 100, "2022-11": 80, "2022-12": 70}
        results = [
            evaluate(DECLINE),
            evaluate(DECLINE, adjacency_available=True, adjacent_matched_share=0.7),
            evaluate(DECLINE, adjacency_available=True, adjacent_matched_share=0.1),
            evaluate(increase, adjacency_available=True, adjacent_matched_share=0.0),
            evaluate(gap, adjacency_available=True, adjacent_matched_share=0.9),
            evaluate(
                DECLINE,
                method_break_months={"2022-10": "occupancy_multiplier_break"},
                adjacency_available=True,
                adjacent_matched_share=0.9,
            ),
        ]
        assert {r.classification for r in results} == {
            POSSIBLE_DISPLACEMENT,
            LIKELY_IMPROVEMENT,
            INSUFFICIENT_EVIDENCE,
        }
        for result in results:
            directions = {c.direction for c in result.components}
            assert directions <= {"for", "against", "uncertainty"}, result.classification
            assert len(result.components) >= 4, result.classification

    def test_deterministic_repeat_runs(self) -> None:
        assert evaluate(DECLINE) == evaluate(DECLINE)

    def test_window_is_calendar_months_ending_at_period(self) -> None:
        result = evaluate(DECLINE)
        assert result.window_months == ["2022-09", "2022-10", "2022-11", "2022-12"]
