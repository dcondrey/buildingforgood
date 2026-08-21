# Analytical Methods

The planned approach for preparation, drop testing, forecasting, and planning.
Milestone gates and the test strategy live in
[`DEVELOPMENT_PLAN.md`](../../DEVELOPMENT_PLAN.md); resolved thresholds live in
[`config/decision.v1.json`](../../config/decision.v1.json).

## Reproducible preparation

1. Preserve raw public files with source URLs and retrieval timestamps.
2. Validate dates, nonnegative counts, duplicates, and neighborhood labels.
3. Reconcile documented naming variants without silently changing boundaries.
4. Aggregate source points to the minimum geography needed for analysis.
5. Generate a machine-readable quality report.
6. Publish only aggregate analysis artifacts to the web application.

## Drop testing

Keep the first implementation interpretable:

- detect sustained local changes rather than reacting to one noisy month;
- compare decreases with nearby increases;
- use a small minimum-cost flow model to describe aggregate redistribution;
- allow unmatched mass so a decline is never forced to appear elsewhere;
- reduce confidence when coverage is missing or methods are incomparable; and
- show evidence components rather than fabricating a precise probability.

If the flow model is unstable, fall back to transparent adjacency deltas and
label the result insufficient rather than dressing uncertainty as
sophistication.

## Forecasting

Candidates: seasonal-naive baseline, exponential smoothing, regularized
lag-based regression.

Evaluation: rolling-origin time splits; mean absolute error and interval
coverage; comparison by neighborhood and overall; no random train/test split
for time-series data; no claim of improvement unless held-out results beat the
baseline. Intervals may use conformal residuals or a residual bootstrap,
depending on data volume and calibration.

If no candidate beats the baseline, the baseline ships.

## Outreach planning

Minimize undercoverage and avoidable travel subject to a fixed outreach-hour
budget, a minimum coverage floor, nonnegative allocations, optional
human-locked assignments, and a deterministic, inspectable objective. Planning
load uses the upper forecast range and an uncertainty reserve so uncertainty
affects the decision rather than appearing as decorative shading.

## Fallback playbook

| Risk | Response |
|---|---|
| SDHEART files are slow or inaccessible | Use the documented SDRDL CSV package |
| Neighborhood history is too sparse | Reduce geography or forecast the aggregate total honestly |
| Complex model does not beat baseline | Ship the seasonal baseline |
| Spatial flow is unstable | Use adjacent aggregate deltas and return **insufficient evidence** |
| Shelter data lacks capacity | Allocate outreach hours only |
| Map implementation consumes too much time | Use a simplified SVG spatial view |
| Animation threatens accessibility or reliability | Disable it; preserve the evidence table |
| A claim cannot be supported | Remove or narrow the claim |
