from stillhere_pipeline.aggregate import aggregate_observations
from stillhere_pipeline.normalize import normalize_records
from stillhere_pipeline.quality import (
    COMPARABILITY_EVENTS,
    build_quality_report,
    cross_check_file_totals,
)
from tests.pipeline.test_normalize import raw_row


class TestComparabilityEvents:
    def test_events_are_machine_readable(self) -> None:
        ids = {e["id"] for e in COMPARABILITY_EVENTS}
        assert "occupancy_multiplier_break" in ids
        assert "type_code_switch" in ids
        assert "city_center_label_transition" in ids
        assert "east_village_south_split" in ids
        assert "coverage_expansion_2021" in ids
        for event in COMPARABILITY_EVENTS:
            assert set(event) >= {"id", "month", "kind", "description"}

    def test_assumptions_are_labeled(self) -> None:
        assumed = [e for e in COMPARABILITY_EVENTS if e.get("assumption")]
        assert {"type_code_switch", "city_center_label_transition"} <= {e["id"] for e in assumed}


class TestCrossCheckFileTotals:
    def test_detects_arithmetic_mismatch(self) -> None:
        result = normalize_records([raw_row(count="5"), raw_row(count="4", x="1.0")])
        mismatches = cross_check_file_totals(
            result.records, [{"file_id": "f1", "total_count": "10"}]
        )
        assert mismatches == [{"file_id": "f1", "computed": 9, "reported": 10, "delta": -1}]

    def test_agreement_produces_no_mismatch(self) -> None:
        result = normalize_records([raw_row(count="5")])
        assert (
            cross_check_file_totals(result.records, [{"file_id": "f1", "total_count": "5"}]) == []
        )

    def test_unparseable_reported_total_is_skipped(self) -> None:
        result = normalize_records([raw_row()])
        assert cross_check_file_totals(result.records, [{"file_id": "f1", "total_count": ""}]) == []

    def test_fractional_reported_total_is_skipped_not_truncated(self) -> None:
        result = normalize_records([raw_row(count="145")])
        rows = [{"file_id": "f1", "total_count": "884.6"}]
        assert cross_check_file_totals(result.records, rows) == []

    def test_integral_float_reported_total_still_compares(self) -> None:
        result = normalize_records([raw_row(count="5")])
        rows = [{"file_id": "f1", "total_count": "9.0"}]
        assert cross_check_file_totals(result.records, rows) == [
            {"file_id": "f1", "computed": 5, "reported": 9, "delta": -4}
        ]


class TestBuildQualityReport:
    def test_report_carries_all_sections(self) -> None:
        result = normalize_records([raw_row(), raw_row(), raw_row(neighborhood="atlantis")])
        series = aggregate_observations(result.records)
        report = build_quality_report(
            normalization=result,
            series=series,
            file_total_mismatches=[],
            source_maps_without_counts=["f9"],
            source_id="sdrdl_source",
            retrieved_at="2026-08-21T01:06:45Z",
        )
        assert report["schema"] == "quality_report.v0"
        assert report["source"] == {
            "source_id": "sdrdl_source",
            "retrieved_at": "2026-08-21T01:06:45Z",
        }
        assert report["duplicates_dropped"] == 1
        assert report["invalid_rows"] == [
            {"row_number": 3, "reason": "neighborhood label not in explicit alias map: 'atlantis'"}
        ]
        assert report["comparability_events"] == COMPARABILITY_EVENTS
        assert "missing_months_global" in report
        assert report["source_maps_without_counts"] == ["f9"]
        assert report["day_of_month_reliable"] is False
