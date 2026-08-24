"""The SDRDL reconciliation, on values worked out by hand.

`docs/project/DATA_OPPORTUNITIES.md` cites figures this code produces. The
fixture below is synthetic — the real package is third-party, carries point
coordinates on the deny-list, and has an unsettled licence, so none of it is
committed. What is pinned here is the arithmetic: the multiplier schedule, the
area mapping including the relabelling, the exclusions, and the code ordering
the overlap evidence chose.
"""

from __future__ import annotations

import pytest

from stillhere_pipeline.sdrdl import (
    CORE_AREAS,
    agreement,
    code_types,
    composition,
    monthly_totals,
    multiplier_for,
)

#: The four periods as the shipped artifact carries them.
PERIODS = [
    {
        "id": "PRE2017",
        "effective_from": "2012-01-01",
        "effective_to": "2017-04-26",
        "multipliers": {"individual": 1.0, "tent_structure": 2.0, "vehicle": 2.0},
    },
    {
        "id": "APR2017",
        "effective_from": "2017-04-27",
        "effective_to": "2018-05-30",
        "multipliers": {"individual": 1.0, "tent_structure": 1.75, "vehicle": 1.66},
    },
    {
        "id": "MAY2018",
        "effective_from": "2018-05-31",
        "effective_to": "2019-12-31",
        "multipliers": {"individual": 1.0, "tent_structure": 1.75, "vehicle": 2.03},
    },
    {
        "id": "POST2020",
        "effective_from": "2020-01-01",
        "effective_to": None,
        "multipliers": {"individual": 1.0, "tent_structure": 1.75, "vehicle": 2.03},
    },
]


def row(neighborhood: str, date: str, type_: str, count: int = 1) -> dict[str, str | int]:
    return {"neighborhood": neighborhood, "date": date, "type": type_, "count": count}


def test_the_multiplier_follows_the_period_the_month_falls_in() -> None:
    assert multiplier_for("2017-01", "tent_structure", PERIODS) == 2.0
    assert multiplier_for("2017-06", "tent_structure", PERIODS) == 1.75
    assert multiplier_for("2017-06", "vehicle", PERIODS) == 1.66
    assert multiplier_for("2019-03", "vehicle", PERIODS) == 2.03
    assert multiplier_for("2022-11", "vehicle", PERIODS) == 2.03
    # An individual is never multiplied, in any period.
    assert {multiplier_for(m, "individual", PERIODS) for m in ("2014-01", "2022-12")} == {1.0}


def test_a_month_on_a_period_boundary_takes_the_period_containing_its_middle() -> None:
    # APR2017 starts 2017-04-27, so April is probed at the 15th and stays PRE2017.
    assert multiplier_for("2017-04", "tent_structure", PERIODS) == 2.0
    assert multiplier_for("2017-05", "tent_structure", PERIODS) == 1.75


def test_core_and_city_center_are_one_area_under_two_names() -> None:
    assert CORE_AREAS["core"] == CORE_AREAS["City Center"] == "City Center"
    assert CORE_AREAS["east_village_south"] == CORE_AREAS["east_village"] == "East Village"


@pytest.mark.parametrize("outside", ["Barrio Logan", "Golden Hill", "Sherman Height"])
def test_areas_outside_the_six_area_core_are_excluded_by_name(outside: str) -> None:
    assert outside not in CORE_AREAS
    rows = [row("gaslamp", "2021-03-10", "1", 4), row(outside, "2021-03-10", "1", 99)]
    assert monthly_totals(rows, PERIODS) == {"2021-03": 4.0}


def test_a_multiplied_total_is_the_sum_of_its_typed_parts() -> None:
    rows = [
        row("core", "2017-06-15", "Individual", 10),
        row("core", "2017-06-15", "Structure", 2),
        row("marina", "2017-06-15", "Vehicle", 1),
    ]
    # 10 + (2 x 1.75) + (1 x 1.66) = 15.16, under APR2017.
    assert monthly_totals(rows, PERIODS)["2017-06"] == pytest.approx(15.16)


def test_the_two_readings_of_the_numeric_codes_are_both_available() -> None:
    assert code_types(swap=False)["2"] == "tent_structure"
    assert code_types(swap=True)["2"] == "vehicle"
    rows = [row("cortez", "2019-04-02", "2", 4)]
    # 4 tents x 1.75 = 7.0, against 4 vehicles x 2.03 = 8.12. The two orderings
    # differ, which is why the overlap had to adjudicate rather than assume.
    assert monthly_totals(rows, PERIODS)["2019-04"] == pytest.approx(7.0)
    assert monthly_totals(rows, PERIODS, swap=True)["2019-04"] == pytest.approx(8.12)


def test_an_unrecognised_type_is_dropped_rather_than_counted_as_an_individual() -> None:
    rows = [row("gaslamp", "2020-02-01", "Tent", 50), row("gaslamp", "2020-02-01", "1", 3)]
    assert monthly_totals(rows, PERIODS) == {"2020-02": 3.0}


def test_composition_is_unmultiplied_so_an_annotation_change_stays_visible() -> None:
    rows = [
        row("core", "2015-05-01", "Individual", 100),
        row("core", "2017-05-01", "Individual", 80),
        row("core", "2017-05-01", "Structure", 20),
    ]
    by_year = composition(rows)
    assert by_year["2015"] == {"individual": 100.0}
    assert "tent_structure" not in by_year["2015"], "a year with no structures must show none"
    assert by_year["2017"]["tent_structure"] == 20.0


def test_agreement_reports_the_overlap_and_what_is_missing_from_it() -> None:
    official = {"2020-01": 100, "2020-02": 100, "2020-03": 100, "2020-04": 100}
    totals = {"2020-01": 100.0, "2020-02": 90.0, "2020-04": 110.0}
    result = agreement(totals, official)
    assert result.months == 3
    assert result.median_ratio == pytest.approx(1.0)
    # 0.90 and 1.10 are both exactly 10% from parity; in binary floating point
    # they are not, so this pins that the boundary is inclusive on both sides.
    assert result.within_10pct == pytest.approx(100.0)
    assert result.mean_abs_diff == pytest.approx(20 / 3)
    # 2020-03 is inside the package's own span and it has no row for it.
    assert result.absent_from_package == ["2020-03"]


def test_a_gap_at_the_end_of_the_package_is_still_reported() -> None:
    # Spanning the overlap instead of the package would hide this: the last
    # shared month is present in both, so nothing after it could be named.
    official = {"2019-01": 100, "2019-02": 100, "2019-03": 100}
    totals = {"2019-01": 100.0, "2019-03": 100.0}
    assert agreement(totals, official).absent_from_package == ["2019-02"]


def test_the_worst_months_are_ranked_by_distance_from_parity_both_ways() -> None:
    official = {"2022-01": 100, "2022-02": 100, "2022-03": 100}
    totals = {"2022-01": 100.0, "2022-02": 48.0, "2022-03": 148.0}
    worst = dict(agreement(totals, official).worst)
    assert set(list(worst)[:2]) == {"2022-02", "2022-03"}, "an over-count is as wrong as an under"


def test_comparing_series_that_do_not_overlap_is_refused_rather_than_reported_as_zero() -> None:
    with pytest.raises(ValueError, match="no overlapping months"):
        agreement({"2014-01": 10.0}, {"2020-01": 10})
