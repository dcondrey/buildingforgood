# Drop-Test Evidence Rules

Dated 2026-08-21. This document transfers the issue #35 (A-04) review lane into
the repository. It is the decision table for the evidence-based drop test
implemented in `pipeline/src/stillhere_pipeline/drop_test.py` under the
contract in `config/decision.v1.json`. The code marks every threshold
provisional pending this review; this document is that review, and it confirms
or amends each threshold below. The test is deterministic, produces exactly one
of three approved conclusions, and publishes no pseudo-probability confidence
score.

The three approved conclusions (`drop_test.allowed_results` in the contract):

1. `likely_improvement`
2. `possible_displacement`
3. `insufficient_evidence`

## Evidence-component decision table

Each evaluation publishes inspectable components, each with a direction: `for`
(supports concluding on the apparent decline), `against` (weakens it), or
`uncertainty` (cannot be computed). Components are always published, even when
the classification is forced to insufficient evidence, so the interface can
show the case for and against the result.

| Component | Implemented id | What it measures | Direction rule | Threshold (implemented) | Review status |
| --- | --- | --- | --- | --- | --- |
| Sustained local change | `sustained_change` | Consecutive observed non-increasing month-over-month steps in the published neighborhood total, ending at the selected period | `for` if steps ≥ minimum and the window-end change is negative; otherwise `against` | `minimum_sustained_periods` = 2 steps within a `comparison_window_periods` = 3 window (4 calendar months) | Confirmed at 2 and 3. One noisy month can never qualify. |
| Apparent change | `apparent_change` | Published total at the selected period minus the published total at the window anchor month | `for` if negative, `against` if zero or positive, `uncertainty` if either endpoint month is unpublished | No magnitude threshold; sign only | Confirmed. No minimum-magnitude threshold is added; magnitude claims stay descriptive. |
| Adjacent change | `adjacent_matched_share` | The share of the local decline matched by aggregate increases in versioned adjacent areas | `for` (displacement) if share ≥ threshold, `against` if below | `possible_displacement_minimum_matched_share` = 0.5, inclusive at the boundary | Confirmed at 0.5 inclusive. Adjacency must come from versioned dissolved canonical areas, never source labels or bounding-street columns. |
| Adjacent change unavailable | `adjacent_evidence` | Placeholder when no versioned adjacency definition exists | Always `uncertainty` | None | Confirmed. Absent adjacency evidence can neither support nor rule out displacement. |
| Unmatched change | Complement of `adjacent_matched_share` | The portion of a local decline not matched by adjacent increases | Reported implicitly as 1 minus the matched share | None; the unmatched portion is left explicit | Confirmed as a rule, not a component: a local decline is never forced to reappear in another area. |
| Completeness | `window_completeness` | Published months in the comparison window divided by window length | `for` if ratio ≥ minimum, `against` otherwise | `minimum_recent_completeness_ratio` = 0.8 (a 4-month window tolerates zero missing months) | Confirmed at 0.8. A reporting gap is a gap, never zero and never bridged. |
| Comparability / method break | `method_break` | Documented methodology, effort, or boundary changes falling inside the window | `against` if any event is in the window, `for` if none | Any documented event in the window disqualifies the comparison | Confirmed. Events include method-period changes, fellowship-effort changes, the April 2021 Outside Perimeter inclusion, and the 2022 block-footprint expansion. |
| Source agreement | Not an implemented component | Agreement between published totals and secondary component digitizations | Documented constraint, not a signal | Published total is authoritative; 25 area-months disagree materially | Confirmed as a constraint: the drop test reads only published totals. Component and block sums come from the same paper maps, so agreement is a QA cross-check, not independent corroboration, and it never earns a `for` direction. |

## Classification rules

These are the `_classify` rules in `drop_test.py`, in evaluation order. Each
rule is decisive; the first that applies wins.

1. If any force-insufficient condition in the contract is active, the result is
   `insufficient_evidence` regardless of every other signal. The contract lists
   four such conditions: the selected period is incomplete, the comparison
   crosses an unreconciled method break, the geography version is unresolved,
   or the evidence is not deterministic under documented rules.
2. If the decline is not sustained (fewer than 2 consecutive non-increasing
   observed steps ending at the period, or the window-end change is not
   negative), or the window is not complete enough (below 80% published
   months), or a documented comparability event falls inside the window, the
   result is `insufficient_evidence`.
3. If adjacency evidence is unavailable, the result is
   `insufficient_evidence`. A sustained, comparable decline without adjacency
   evidence cannot rule displacement in or out.
4. If the adjacent matched share is at or above 0.5, the result is
   `possible_displacement`.
5. Otherwise the result is `likely_improvement`.

In plain language: `likely_improvement` requires a sustained decline in a
complete, comparable window plus adjacency evidence showing the decline is
mostly not reappearing next door. `possible_displacement` requires the same
sustained comparable decline plus adjacency evidence that half or more of it is
matched by adjacent increases. Everything else, including every case where the
evidence is missing, broken, or ambiguous, is `insufficient_evidence`.

## Hypothetical neighborhood-period examples

Monthly figures are published neighborhood totals across the 4-month
comparison window ending at the stated period. "Matched" is the adjacent
matched share where adjacency evidence exists. Each example has been traced
through the implemented `_classify` logic, and the first eight correspond
directly to the classification tests in `tests/pipeline/test_drop_test.py`.

| # | Neighborhood | Period | Evidence pattern | Classification | Rationale |
| --- | --- | --- | --- | --- | --- |
| 1 | East Village | 2022-12 | Sustained decline 100 → 90 → 80 → 70, window complete, no break, matched 70% | `possible_displacement` | Three non-increasing steps and a matched share above 0.5: most of the decline reappears in adjacent areas. |
| 2 | Cortez | 2022-12 | Sustained decline 100 → 90 → 80 → 70, window complete, no break, matched 10% | `likely_improvement` | Same sustained comparable decline, but only 10% is matched by adjacent increases; displacement is not supported. |
| 3 | Core Columbia | 2022-12 | Sustained decline 100 → 90 → 80 → 70, no adjacency evidence | `insufficient_evidence` | Without a versioned adjacency definition, displacement can be neither supported nor ruled out; the `adjacent_evidence` component records the uncertainty. |
| 4 | Gaslamp Quarter | 2022-12 | Sustained decline, matched 90%, but the geography version is unresolved | `insufficient_evidence` | An active force-insufficient condition overrides every other signal; the forced reason is published alongside the components. |
| 5 | Little Italy | 2022-12 | Single-month dip 100 → 100 → 110 → 70, matched 90% | `insufficient_evidence` | Only one non-increasing step ends at the period (the prior step rose). One noisy month is never sufficient. |
| 6 | Marina | 2022-12 | 2022-10 unpublished: 100 → gap → 80 → 70, matched 90% | `insufficient_evidence` | Completeness is 3 of 4 months (75%), below the 80% minimum. The gap is not treated as zero and is not bridged. |
| 7 | East Village | 2022-12 | Sustained decline 100 → 90 → 80 → 70, but an occupancy-multiplier change is documented at 2022-10, matched 90% | `insufficient_evidence` | The window crosses a documented comparability event, so the two sides of the window are not directly comparable, whatever the adjacency signal says. |
| 8 | Cortez | 2022-12 | Increase 70 → 80 → 90 → 100, matched 0% | `insufficient_evidence` | The apparent change is positive. An increase is never classified as improvement, and the sustained-decline requirement fails. |
| 9 | Core Columbia | 2023-03 | Plateau then decline 90 → 90 → 80 → 70, window complete, no break, matched exactly 50% | `possible_displacement` | Flat steps count as non-increasing, so the decline is sustained, and the matched-share threshold is inclusive: exactly 0.5 classifies as possible displacement. |
| 10 | Little Italy | 2023-03 | Sustained decline 120 → 110 → 100 → 90, window complete, no break, matched 49% | `likely_improvement` | Just below the 0.5 boundary. Slightly less than half the decline reappearing nearby does not meet the displacement threshold; the 51% unmatched portion stays explicit and is not forced into another area. |
| 11 | Marina | 2021-06 | Sustained decline across a window containing April 2021 | `insufficient_evidence` | April 2021 is when Outside Perimeter entered the count. Any window containing it crosses a documented boundary event, so the comparison is reduced to insufficient evidence unless an explicit comparable view exists. |
| 12 | East Village | 2024-01 | Large year-boundary drop coinciding with the 2023 to 2024 East Village and Outside Perimeter shift, matched share high | `insufficient_evidence` | Until source review explains the discontinuity, it is registered as an unreconciled comparability event inside the window. A large decline at a documented discontinuity is never read as likely improvement. |
| 13 | Core Columbia | 2025-09 | Window spans June through September 2025; July and August 2025 totals are unpublished | `insufficient_evidence` | Completeness is 2 of 4 months (50%). A selected 2025 window containing unreported months forces insufficient evidence; the change between published endpoints alone is not a substitute for the window. |

## Evidence for and against each conclusion

**`likely_improvement`.** For: a sustained multi-step decline in the published
total (example 2), a complete window (all four months published), no
comparability event in the window, and a low adjacent matched share showing
the decline is not reappearing nearby (examples 2 and 10). Against: a rising
or flat window-end change (example 8), a matched share at or above 0.5
(examples 1 and 9), a gap in the window (example 6), or any documented break
(examples 7, 11, 12).

**`possible_displacement`.** For: the same sustained, complete, comparable
decline plus an adjacent matched share at or above 0.5 (examples 1 and 9).
Against: a matched share below 0.5 (examples 2 and 10), or absent adjacency
evidence, which does not support displacement either; it yields insufficient
evidence instead (example 3).

**`insufficient_evidence`.** For: any active forced condition (example 4), a
non-sustained dip (example 5), an incomplete window (examples 6 and 13), a
comparability event inside the window (examples 7, 11, 12), or missing
adjacency evidence (example 3). Against: nothing argues for insufficient
evidence as such; it is the mandatory result whenever the evidence for either
substantive conclusion is missing, broken, or ambiguous. The components still
show the partial case in both directions.

## What the result may say and may never say

The result may say:

- The published neighborhood total declined across N consecutive observed
  months, from X to Y.
- The window was complete and no documented comparability event falls inside
  it, or exactly which event disqualified it.
- A stated share of the local decline is matched, or not matched, by adjacent
  aggregate increases under a versioned adjacency definition.
- The evidence is insufficient, and which components argue for and against.

The result may never say:

- That any individual moved, stayed, left, or returned. Aggregate totals carry
  no individual movement information (`individual_movement_claims_permitted`
  is false in the contract).
- What anyone intended, or why counts changed. Intent is not observable in
  these data.
- That any action caused the change (`causal_claims_permitted` is false in
  the contract).
- A precise probability or confidence score for any conclusion. No
  pseudo-probability is produced anywhere in the module.
- That a local decline reappeared in a specific other neighborhood. Unmatched
  decline stays unmatched; it is never forced to reappear elsewhere.

## Data-aware constraints

These constraints from the #35 review comment bind both the examples above and
any future threshold change.

- The apparent decline is computed from the published neighborhood `total`
  only. Component values are secondary digitizations, and 25 area-months
  materially disagree with the verified total.
- Comparisons require consecutive observed periods. A reporting gap is not
  zero and is not bridged as though it were a normal month.
- A comparison crossing a method-period change, a fellowship-effort change,
  Outside Perimeter's April 2021 inclusion, or the 2022 block-footprint
  expansion is reduced to insufficient evidence unless an explicit comparable
  view exists.
- Adjacency derives from versioned dissolved canonical areas, never from
  source labels or the imperfect bounding-street columns.
- East Village's four published quadrants are a different partition of one
  area, not four independent adjacent neighborhoods.
- Neighborhood components and block sums come from the same underlying paper
  maps. Their agreement is a QA cross-check, not independent-source
  corroboration.
- The balanced 261-block panel supports spatial redistribution evidence only
  on its 12 observed dates. It is never interpolated into monthly flow
  evidence.
- Unmatched decline stays explicit. Local decline is never forced into
  another area.
- The large 2023 to 2024 East Village and Outside Perimeter shift is
  insufficient evidence until source review explains the discontinuity
  (example 12).
- A selected 2025 window that includes an unreported month forces insufficient
  evidence (example 13).

## Implementation lineage

The shipped demo scenario does not run this module. `app/src/lib/demo.ts`
computes a simpler in-app classification from the raw change versus the
active-block change: `wider_footprint` when the raw total fell while active
blocks rose, otherwise `insufficient_evidence`. The three-conclusion module in
`drop_test.py` is exercised by the pipeline (`analyze.py`) and by
`tests/pipeline/test_drop_test.py`. In `analyze.py` the adjacency comparison
currently short-circuits: `evaluate_drop` is called with
`adjacency_available=False` because no versioned geography adjacency exists
yet, so every pipeline classification today is `insufficient_evidence` with
the computed components attached. `likely_improvement` and
`possible_displacement` become reachable in the pipeline only when a versioned
adjacency definition lands and the geography force-insufficient condition
clears.

## Sign-off

The implementation owner for #8 confirms this table is deterministic enough to
code, evidenced by the deterministic implementation in `drop_test.py` (pure
function of published totals, contract thresholds, and documented events; no
randomness, no clock, no confidence sampling) and by
`test_deterministic_repeat_runs` in `tests/pipeline/test_drop_test.py`, which
asserts byte-identical evidence across repeat runs. The four thresholds are
confirmed at their implemented values: `comparison_window_periods` 3,
`minimum_sustained_periods` 2, `minimum_recent_completeness_ratio` 0.8,
`possible_displacement_minimum_matched_share` 0.5 inclusive.
