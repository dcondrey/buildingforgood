# Independent Prepared-Scenario Review

Review date: 2026-08-20

Reviewer: separate judge-readiness/data-science review sessions, independent of
the implementation pass

Scope: `public/generated/demo.v1.json`, the generator, analytical tests, live
interface adapter, demo narrative, and release documentation

## Verdict

`conditional_release_blocked`

The component-first result is reproducible and materially more defensible than
the original displacement story, but the review found release-blocking
discrepancies. A green test suite alone was not sufficient evidence of release
readiness.

## What changed

On the identical 261-block panel from January 2024 to January 2025:

- observed individuals increase from 510 to 548 (+7.5%);
- blocks with at least one individual mark increase from 111 to 136, and the
  increase survives a two-mark threshold (78 to 94);
- tents/structures decrease from 258 to 117 (-54.7%);
- the secondary POST2020 multiplier-derived estimate decreases 22.3% because
  the structure contribution falls more than the individual contribution
  rises.

These are digitized observation marks, not deduplicated people or tracked
movements.

## Independent cross-check

The initial anti-cherry-pick audit used a secondary mixed-unit index. That made
two annual pairs ineligible because a January 2020 tent cell is blank and
incorrectly described the selected pair as rank 1 of 7. For the primary
observed-individual estimand, all nine same-month pairs are complete; the
selected pair ranks 3 of 9 on the gap between individual-block-footprint change
and observed-individual count change. The generator, test, artifact, audit, and
Q&A were corrected together. This finding is evidence that the independent
review changed the release rather than rubber-stamping it.

## Forecast review

The historical January 2026 replay uses information frozen at December 2025.
Local linear over six observations is promoted only after lower chronological
2023 MAE than the seasonal baseline. Its separate 2025 point-forecast audit is
62.8 MAE and 8.6% WAPE over eight eligible targets. The displayed residual
interval is 769.0-996.1 and achieved 75% empirical walk-forward coverage against
an 80% nominal target. It is not a live forecast, person count, or guaranteed
probability interval.

## Results that required narrower language

- The multiplier-derived decline is secondary; direct component observations
  lead.
- Get It Done rows measure reporting and workflow, not population or demand.
- Empty-parent rows are no-parent root requests, not verified unique incidents.
- Parking is a paid-parking activity proxy, not footfall.
- City Auditor agreement is contextual corroboration, not external outcome
  validation.
- The coverage floor is a user-set continuity policy, not learned fairness or
  an optimal allocation.

## Remaining release blockers

1. Integrate the production-bundle privacy scanner already merged on the
   integration track and verify the exact final branch.
2. Complete a human-driven keyboard/usability walkthrough and timed rehearsal;
   automated and agent review do not substitute for observed use.
3. Deploy the exact verified commit and compare its artifact hash with the
   offline production build.
4. Capture presentation-device fallback media.
5. Reconcile or close superseded GitHub issues with explicit evidence rather
   than implying that changed scope satisfied their original criteria.

## Evidence that could change the conclusion

New independent street-count validation, documented enumeration-effort data,
prospective forecast outcomes, outreach severity/capacity information, and
review by people with lived experience could change the interpretation or the
appropriate coverage policy. None is inferred from the current bundle.
