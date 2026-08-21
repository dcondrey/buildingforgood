# Small-cell suppression policy (v1)

The single written source for the suppression branches the emitter may take.
Both enforcement points cite THIS list and must change when it changes:

- Emitter: `pipeline/src/stillhere_pipeline/suppress.py` (produces artifacts)
- Scanner: `pipeline/src/stillhere_pipeline/privacy.py`,
  `analyze_recoverability` (verifies artifacts; strictly conservative: it
  enumerates every composition of a suppressed remainder, so it permits
  anything this policy permits and gains only false positives, never false
  negatives, if this doc drifts)

The attacker model on both sides is derived from these branches. Adding,
removing, or reordering a branch without updating this document and both
enforcement points is a policy violation, not a refactor.

## Threshold

`SMALL_CELL_THRESHOLD = 5`. Published integer cell values v with 0 < v < 5
identify people and never ship. Zeros are publishable: they identify nobody.
(One shared constant after PR #44 and PR #45 merge; the pipeline package owns
it and the scanner imports it.)

## Branches, in evaluation order

1. **Whole-row suppression on small totals.** If a row's total satisfies
   0 < total < threshold, the row publishes as
   `{"month": ..., "total": null, "suppressed": true}` with no `by_type`.
2. **Cell suppression.** Every by_type value with 0 < v < threshold
   suppresses to null.
3. **Complementary partner.** If branch 2 suppressed exactly one cell, the
   NEXT-SMALLEST nonzero cell joins it (a lone suppressed cell is exactly
   `total - sum(published)`). If no nonzero partner exists, the whole row
   suppresses (branch 1 shape).
4. **Feasibility escalation.** After branches 2-3, enumerate every value
   assignment consistent with this policy for the suppressed cells (the
   all-small family, plus the one-small-with-partner family for k = 2,
   partner at least the threshold and no larger than the smallest published
   nonzero cell). If any cell's value, or the value multiset, is unique
   across the feasible set, the whole row suppresses (branch 1 shape).

## Disclosure

Suppression is disclosed, never silent: published rows list withheld types in
`by_type_suppressed`, and the quality report carries a
`small_cell_suppression` block (threshold, rows, cells, policy line).

## Known non-branches

- No rollup totals (neighborhood, downtown, annual) are published; a guard
  test pins the artifact's exact key surface. Publishing a rollup reopens
  subtraction recovery across its members and requires extending branch 4
  and this document first.
- The privacy boundary this policy protects is the DEPLOYED product surface
  (C-02 ruling, PR #45 thread, dataset-specific): the upstream SDRDL source
  is public at point precision, and pre-suppression artifacts exist in git
  history; on non-public source data both facts would flip.
