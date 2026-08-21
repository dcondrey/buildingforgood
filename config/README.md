# Decision Configuration

`decision.v1.json` is the shared scenario configuration for pipeline, planner,
and interface work. It separates fixed demo decisions from provisional values
that require analytical or operational review.

## Status rules

- `fixed`: downstream work may rely on the value for the MVP.
- `provisional`: downstream work may implement the value but must preserve its
  warning and allow the owning issue to revise it.
- `unresolved`: downstream work must not invent a value. The named blocker must
  be completed or the product must return an insufficient/infeasible state.

The top-level scenario remains `provisional` until its `release_blockers` are
resolved. Code must read these values from the configuration or a generated
artifact; it must not duplicate them as unrelated constants.

## Stable invariants

- The user may edit the available outreach-hour budget, but the prepared demo
  starts at 80 hours.
- Published observations use aggregate monthly planning areas.
- Complaint volume cannot enter planning load or allocation.
- A method break or inadequate completeness can force `insufficient_evidence`.
- A forecast candidate cannot replace the seasonal baseline without held-out
  improvement.
- Planner output is nonnegative, conserves the budget, preserves locks, and
  satisfies the coverage floor or returns an infeasible result.
- No configuration value authorizes person-level, causal, enforcement, or live
  service-capacity claims.

## Change process

1. Link the change to its owning issue.
2. Update the configuration status and rationale together.
3. Record material changes in `docs/project/PROJECT_CONTROL.md`.
4. Run JSON parsing and, after D-04 lands, schema validation.
5. Notify dependent tracks when a fixed or provisional field changes.

The forthcoming D-04 artifact schema will validate the exact structure. Until
then, `python3 -m json.tool config/decision.v1.json` is the minimum syntax check.
