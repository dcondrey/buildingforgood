from stillhere_pipeline.aggregate import aggregate_observations, month_range, monthly_gaps
from stillhere_pipeline.normalize import NormalizedRecord


def rec(
    neighborhood: str = "east_village",
    month: str = "2018-01",
    type_: str = "individual",
    count: int = 3,
    source_label: str | None = None,
) -> NormalizedRecord:
    return NormalizedRecord(
        neighborhood=neighborhood,
        month=month,
        type=type_,  # type: ignore[arg-type]
        count=count,
        file_id="f1",
        source_label=source_label if source_label is not None else neighborhood,
        source_date=f"{month}-01",
        source_type=type_,
    )


class TestMonthRange:
    def test_spans_inclusive(self) -> None:
        assert month_range("2018-11", "2019-02") == ["2018-11", "2018-12", "2019-01", "2019-02"]


class TestMonthlyGaps:
    def test_finds_missing_months_within_span(self) -> None:
        assert monthly_gaps(["2018-01", "2018-03"]) == ["2018-02"]

    def test_no_gaps(self) -> None:
        assert monthly_gaps(["2018-01", "2018-02"]) == []


class TestAggregateObservations:
    def test_sums_by_neighborhood_month_and_type(self) -> None:
        series = aggregate_observations(
            [
                rec(count=2),
                rec(count=3),
                rec(count=1, type_="structure"),
                rec(neighborhood="gaslamp", count=7),
            ]
        )
        by_id = {s.neighborhood: s for s in series}
        ev = by_id["east_village"].observations[0]
        assert ev.total == 6
        assert ev.by_type == {"individual": 5, "structure": 1, "vehicle": 0}
        assert by_id["gaslamp"].observations[0].total == 7

    def test_output_is_sorted_and_deterministic(self) -> None:
        shuffled = [rec(month="2018-02"), rec(month="2018-01"), rec(neighborhood="cortez")]
        series = aggregate_observations(shuffled)
        assert [s.neighborhood for s in series] == ["cortez", "east_village"]
        ev = next(s for s in series if s.neighborhood == "east_village")
        assert [o.month for o in ev.observations] == ["2018-01", "2018-02"]

    def test_coverage_and_label_variants(self) -> None:
        series = aggregate_observations(
            [
                rec(neighborhood="city_center", month="2019-11", source_label="core"),
                rec(neighborhood="city_center", month="2020-01", source_label="City Center"),
            ]
        )
        cc = series[0]
        assert (cc.coverage_start, cc.coverage_end) == ("2019-11", "2020-01")
        assert cc.label_variants == ["City Center", "core"]
        assert cc.observed_gap_months == ["2019-12"]
