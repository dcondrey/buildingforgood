# Small-cell suppression policy (v1)

The single written source for the suppression branches the emitter may take.
Both enforcement points cite THIS list and must change when it changes:

- Emitter: `pipeline/src/stillhere_pipeline/suppress.py` (produces artifacts)
- Scanner: `pipeline/src/stillhere_pipeline/privacy.py`,
  `analyze_recoverability` (verifies artifacts; its feasible set MIRRORS the
  branches below and must be updated with them. An attacker knows the
  policy, so a feasible set WIDER than this policy models a weaker attacker
  and produces false negatives, not false positives: extra stories create
  ambiguity a real reader does not have. Proven by the remainder-10 case
  with published minimum 6, where the policy-feasible set is exactly {4, 6}
  and a broader enumeration wrongly reads it as ambiguous. A row no branch
  could have produced raises `recovery.policy_inconsistent` rather than
  passing as ambiguous.)

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

## Contract declaration (issue #4 slice)

The observations artifact DECLARES its count semantics so no consumer infers
them from shape: a top-level `contract` block carries `count_fields` (the
exact count-bearing paths), `small_cell_threshold`, and `suppression_marker`
(field name plus affirmative encodings). The validator rejects an artifact
whose declaration drifts from this policy in ANY field, marker included; the
scanner may consume the declaration as a lookup and keep shape-inference only
as a backstop. Applicability: the declared count paths exist on published
rows (null when suppressed); whole-row-suppressed rows carry the declared
marker instead of the paths.

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
