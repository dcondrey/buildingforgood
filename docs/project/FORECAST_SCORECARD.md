# Forecast Evaluation Scorecard

Last updated: 2026-08-21

This document transfers the review lane of GitHub issue
[#36](https://github.com/dcondrey/buildingforgood/issues/36) (Track A-05) into
the repository. Every number below is read from the shipped artifact
`public/generated/demo.v1.json` and produced by
`pipeline/src/stillhere_pipeline/demo.py`.

## Planning horizon and decision served

One month ahead. The forecast is the next-shift outreach planning baseline: the
upper bound of each area's interval feeds the 80-hour planner allocation. The
shipped scenario replays the decision available with data frozen through
2025-12 and targets 2026-01. It is a historical replay, not a live forecast.

## Evaluation questions

1. Is the selected model better than the registered seasonal-naive baseline on
   held-out data, not on in-sample fit or visual appearance?
2. Are the prediction intervals honest: does empirical held-out coverage match
   the nominal 80% level, and is any shortfall displayed?
3. Is the history sufficient: enough eligible folds, a stable measurement
   method, and no imputed evidence?

## Chronological evaluation design

Training uses only 2021-01 onward, the unchanged POST2020 multiplier era after
the final Fellowship-assisted count. Three fixed windows, in time order, each
with one role:

| Window         | Role                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| 2023-01..2023-12 | Promotion holdout: rolling-origin MAE decides challenger promotion       |
| 2024-01..2024-12 | Interval calibration: seeds the absolute-residual pool                   |
| 2025-01..2025-12 | Final audit: untouched accuracy and walk-forward coverage report         |

Every fold is rolling-origin: each origin predicts its target using only
observations strictly earlier than that target. There is no random split. A
fold is eligible only when both its training input and its held-out target
exist; the four missing 2025 core-total months (Jul, Aug, Oct, Nov) are skipped
and never imputed for scoring, so the 2025 audit evaluates 8 of 12 folds while
all 12 promotion folds in 2023 are eligible. Eligible-fold counts are reported
alongside every score as `evaluated_points`. The test
`test_future_audit_values_cannot_change_promotion` in
`tests/pipeline/test_demo.py` proves that perturbing 2025 values changes the
audit but cannot change the scorecard or the promotion decision;
`test_forecast_is_temporally_held_out_and_interpretable` pins the three window
boundaries.

## Accuracy and calibration, separately

Accuracy is MAE in count units, with WAPE as a scale-relative diagnostic.
Calibration is empirical interval coverage against the nominal 80% level, using
the symmetric finite-sample-corrected absolute-residual quantile
(`_conformal_radius`, rank `ceil((n + 1) * 0.8)` capped at n), seeded on 2024
residuals and updated walk-forward through 2025. On the 2025 audit the shipped
six-area aggregate scores 62.8 MAE and 8.6% WAPE over 8 eligible folds, and its
nominal 80% interval achieves 75.0% empirical coverage over 8 interval points.
That under-coverage is displayed, not hidden or rounded into confidence.
Per-area coverage: City Center 87.5, Columbia 87.5, Cortez 100.0, East Village
87.5, Gaslamp 87.5, Marina 75.0.

## Promotion rule

Seasonal naive (`seasonal_naive_12m`) is the registered baseline and always
appears in the scorecard. A challenger is promoted only for strictly lower
rolling-origin MAE on the 2023 promotion holdout; a tie or an unevaluable
challenger retains the baseline. WAPE never governs promotion. The rule is
enforced by `_promote_model` and pinned by
`test_promotion_requires_strict_holdout_improvement`.

## Comparison table template and shipped instance

Template columns: model, role, MAE, WAPE, evaluated points.

Shipped instance, six-area aggregate, 2023 promotion holdout:

| Model                   | Role                | MAE   | WAPE  | Evaluated points |
| ----------------------- | ------------------- | ----- | ----- | ---------------- |
| local_linear_6_observed | challenger          | 119.8 | 9.7%  | 12               |
| recent_3_observed_mean  | challenger          | 121.2 | 9.9%  | 12               |
| seasonal_naive_12m      | registered_baseline | 191.3 | 15.6% | 12               |

The aggregate promotes `local_linear_6_observed`. All six areas promote
`recent_3_observed_mean` on the same rule, each with 12 eligible promotion
folds.

## Warning criteria and the no-forecast state

Warnings, any of which triggers review before the forecast is used:

- Sparse history or ineligible folds: too few eligible rolling-origin folds in
  a window, or a missing same-month lag for the seasonal baseline.
- Wide intervals: an interval too wide to guide a staffing decision.
- Poor empirical coverage: held-out coverage well below the nominal 80% level.
- Instability across folds: errors dominated by a few folds or by level shifts
  such as the 2023 to 2024 changes flagged in the issue #36 evidence.
- Area-specific failure: an area whose scorecard diverges from the aggregate.

When the baseline cannot be scored on the promotion holdout, or the selected
model cannot produce the target, or no audit fold is eligible, the responsible
output is no forecast: `demo.py` returns
`status: insufficient_forecast_evidence` with no point or interval. In the
shipped artifact all six core areas and the aggregate pass with `status: ok`
and 8 eligible audit folds each. Outside Perimeter joined the program in 2021
and is excluded from the consistent core series rather than forecast. Missing
2025 months are never imputed for scoring.

## Lineage

The shipped numbers come from `pipeline/src/stillhere_pipeline/demo.py`
(`_forecast_series`, `_promote_model`, `_conformal_radius`, and the three
models including `_local_linear_six`). The generic
`pipeline/src/stillhere_pipeline/forecast.py` module, with its 24-period
minimum-history rule and its own insufficient-evidence path, belongs to the
retired v0 lineage from issues #9 and #10 and does not produce the artifact.
