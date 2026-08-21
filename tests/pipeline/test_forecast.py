from stillhere_pipeline.forecast import (
    INSUFFICIENT_FORECAST_EVIDENCE,
    OK,
    ForecastConfig,
    forecast_area,
    quantile,
    rolling_backtest,
    shift_month,
)

CONFIG = ForecastConfig(
    horizon_periods=1, seasonal_periods=12, minimum_training_periods=24, interval_level=0.8
)


def seasonal_series(months: int, start: str = "2014-01") -> dict[str, int]:
    """A deterministic 12-month-seasonal series with mild drift."""
    values: dict[str, int] = {}
    cursor = start
    for index in range(months):
        season = index % 12
        values[cursor] = 100 + season * 5 + index // 12
        cursor = shift_month(cursor, 1)
    return values


class TestShiftMonth:
    def test_forward_across_year(self) -> None:
        assert shift_month("2022-12", 1) == "2023-01"

    def test_backward_across_year(self) -> None:
        assert shift_month("2022-01", -12) == "2021-01"


class TestQuantile:
    def test_interpolates(self) -> None:
        assert quantile([0.0, 10.0], 0.5) == 5.0

    def test_endpoints(self) -> None:
        values = [1.0, 2.0, 3.0]
        assert quantile(values, 0.0) == 1.0
        assert quantile(values, 1.0) == 3.0


class TestRollingBacktest:
    def test_no_temporal_leakage_in_training_minimum(self) -> None:
        series = seasonal_series(30)
        result = rolling_backtest(series, CONFIG)
        # Only months after the 24-month training minimum are evaluated.
        assert result.evaluated_points == 6

    def test_perfectly_seasonal_series_has_low_error(self) -> None:
        series = seasonal_series(60)
        result = rolling_backtest(series, CONFIG)
        assert result.mean_absolute_error is not None
        # The only error is the +1 annual drift.
        assert result.mean_absolute_error == 1.0

    def test_skips_targets_without_seasonal_reference(self) -> None:
        series = seasonal_series(40)
        del series[shift_month("2014-01", 25 - 12)]  # break one reference month
        result = rolling_backtest(series, CONFIG)
        assert result.evaluated_points < 16


class TestForecastArea:
    def test_short_history_is_insufficient(self) -> None:
        result = forecast_area("gaslamp", seasonal_series(20), CONFIG)
        assert result.status == INSUFFICIENT_FORECAST_EVIDENCE
        assert result.point is None
        assert result.limitations

    def test_long_history_produces_ordered_finite_interval(self) -> None:
        result = forecast_area("east_village", seasonal_series(60), CONFIG)
        assert result.status == OK
        assert result.target_month == shift_month("2014-01", 60)
        assert result.point is not None
        assert result.lower is not None and result.upper is not None
        assert result.lower <= result.point <= result.upper
        assert result.lower >= 0

    def test_missing_seasonal_reference_is_insufficient(self) -> None:
        series = seasonal_series(60)
        target = shift_month("2014-01", 60)
        del series[shift_month(target, -12)]
        result = forecast_area("east_village", series, CONFIG)
        assert result.status == INSUFFICIENT_FORECAST_EVIDENCE

    def test_deterministic_repeat_runs(self) -> None:
        series = seasonal_series(60)
        assert forecast_area("east_village", series, CONFIG) == forecast_area(
            "east_village", series, CONFIG
        )

    def test_backtest_metrics_are_published(self) -> None:
        result = forecast_area("east_village", seasonal_series(60), CONFIG)
        assert result.backtest.evaluated_points > 0
        assert result.backtest.mean_absolute_error is not None
        assert result.backtest.interval_points > 0
        assert result.backtest.empirical_coverage is not None
