"""Seasonal-naive baseline forecast with rolling-origin backtests (issue #9).

The baseline predicts each month with the observed value from
``seasonal_periods`` months earlier. Backtesting walks the history in
chronological order (no temporal leakage: every prediction uses only months
strictly before its target), reports mean absolute error, and measures
empirical interval coverage walk-forward — the interval at each evaluated
point is built only from residuals of earlier points. Candidate models beyond
the baseline arrive with issue #10 and may only replace it under the
held-out-improvement rule.
"""

from __future__ import annotations

from dataclasses import dataclass, field

INSUFFICIENT_FORECAST_EVIDENCE = "insufficient_forecast_evidence"
OK = "ok"

# Interval residuals below this count are too few to estimate quantiles.
MIN_RESIDUALS_FOR_INTERVAL = 12


@dataclass(frozen=True)
class ForecastConfig:
    horizon_periods: int = 1
    seasonal_periods: int = 12
    minimum_training_periods: int = 24
    interval_level: float = 0.8


@dataclass(frozen=True)
class BacktestResult:
    evaluated_points: int
    mean_absolute_error: float | None
    interval_points: int
    empirical_coverage: float | None
    residuals: list[float] = field(default_factory=list)


@dataclass(frozen=True)
class ForecastResult:
    area: str
    status: str  # "ok" | "insufficient_forecast_evidence"
    model: str
    target_month: str | None
    point: float | None
    lower: float | None
    upper: float | None
    interval_level: float
    backtest: BacktestResult
    limitations: list[str] = field(default_factory=list)


def shift_month(month: str, delta: int) -> str:
    year, mon = int(month[:4]), int(month[5:7])
    mon += delta
    while mon < 1:
        mon += 12
        year -= 1
    while mon > 12:
        mon -= 12
        year += 1
    return f"{year:04d}-{mon:02d}"


def quantile(sorted_values: list[float], q: float) -> float:
    """Linear-interpolated empirical quantile over a pre-sorted list."""
    if not sorted_values:
        raise ValueError("quantile of empty list")
    if len(sorted_values) == 1:
        return sorted_values[0]
    position = q * (len(sorted_values) - 1)
    low = int(position)
    high = min(low + 1, len(sorted_values) - 1)
    weight = position - low
    return sorted_values[low] * (1 - weight) + sorted_values[high] * weight


def rolling_backtest(totals: dict[str, int], config: ForecastConfig) -> BacktestResult:
    months = sorted(totals)
    residuals: list[float] = []
    interval_points = 0
    covered = 0
    lo_q = (1 - config.interval_level) / 2
    hi_q = 1 - lo_q
    for index, month in enumerate(months):
        if index < config.minimum_training_periods:
            continue
        reference = shift_month(month, -config.seasonal_periods)
        if reference not in totals:
            continue
        prediction = float(totals[reference])
        actual = float(totals[month])
        if len(residuals) >= MIN_RESIDUALS_FOR_INTERVAL:
            prior = sorted(residuals)
            lower = prediction + quantile(prior, lo_q)
            upper = prediction + quantile(prior, hi_q)
            interval_points += 1
            if lower <= actual <= upper:
                covered += 1
        residuals.append(actual - prediction)
    mae = sum(abs(r) for r in residuals) / len(residuals) if residuals else None
    coverage = covered / interval_points if interval_points else None
    return BacktestResult(
        evaluated_points=len(residuals),
        mean_absolute_error=round(mae, 2) if mae is not None else None,
        interval_points=interval_points,
        empirical_coverage=round(coverage, 4) if coverage is not None else None,
        residuals=residuals,
    )


def forecast_area(area: str, totals: dict[str, int], config: ForecastConfig) -> ForecastResult:
    months = sorted(totals)
    limitations: list[str] = []

    def insufficient(reason: str, backtest: BacktestResult | None = None) -> ForecastResult:
        limitations.append(reason)
        return ForecastResult(
            area=area,
            status=INSUFFICIENT_FORECAST_EVIDENCE,
            model="seasonal_naive",
            target_month=None,
            point=None,
            lower=None,
            upper=None,
            interval_level=config.interval_level,
            backtest=backtest or BacktestResult(0, None, 0, None),
            limitations=limitations,
        )

    if len(months) < config.minimum_training_periods:
        return insufficient(
            f"Only {len(months)} observed months are published; the baseline requires "
            f"{config.minimum_training_periods}."
        )

    target = shift_month(months[-1], config.horizon_periods)
    reference = shift_month(target, -config.seasonal_periods)
    backtest = rolling_backtest(totals, config)
    if backtest.evaluated_points == 0:
        return insufficient("No backtest point could be evaluated on the published history.")
    if reference not in totals:
        return insufficient(
            f"The seasonal reference month {reference} for target {target} is unpublished.",
            backtest,
        )

    point = float(totals[reference])
    lower: float | None = None
    upper: float | None = None
    if len(backtest.residuals) >= MIN_RESIDUALS_FOR_INTERVAL:
        ordered = sorted(backtest.residuals)
        lo_q = (1 - config.interval_level) / 2
        lower = point + quantile(ordered, lo_q)
        upper = point + quantile(ordered, 1 - lo_q)
        # Aggregate observations are nonnegative counts; keep the interval
        # ordered around the point after flooring.
        lower = max(0.0, min(lower, point))
        upper = max(upper, point)
    else:
        limitations.append(
            f"Fewer than {MIN_RESIDUALS_FOR_INTERVAL} backtest residuals exist; no "
            "prediction interval is published."
        )

    gap_months = [m for m in backtest_window_gaps(totals)]
    if gap_months:
        limitations.append(
            f"{len(gap_months)} months inside the published history are missing; the "
            "backtest skips targets whose seasonal reference is unpublished."
        )
    limitations.append(
        "Seasonal-naive baseline: the forecast is the observation from "
        f"{config.seasonal_periods} months before the target. It describes an aggregate "
        "planning signal, not people or service demand."
    )

    return ForecastResult(
        area=area,
        status=OK,
        model="seasonal_naive",
        target_month=target,
        point=point,
        lower=round(lower, 1) if lower is not None else None,
        upper=round(upper, 1) if upper is not None else None,
        interval_level=config.interval_level,
        backtest=backtest,
        limitations=limitations,
    )


def backtest_window_gaps(totals: dict[str, int]) -> list[str]:
    """Months missing between the first and last published month."""
    months = sorted(totals)
    if not months:
        return []
    gaps: list[str] = []
    cursor = months[0]
    while cursor < months[-1]:
        if cursor not in totals:
            gaps.append(cursor)
        cursor = shift_month(cursor, 1)
    return gaps
