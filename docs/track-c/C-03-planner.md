# C-03 — Fairness-constrained outreach-hour planner

**Issue:** [#14](https://github.com/dcondrey/buildingforgood/issues/14) · **Track:** [C](https://github.com/dcondrey/buildingforgood/issues/30) · **Milestone:** M4
**Implementation:** `app/src/domain/planner/{types.ts,planner.ts}` · **Tests:** `planner.test.ts` (36 tests)
**Also resolves:** the `planner.*.provisional` release blocker in `config/decision.v1.json`, assigned to Track C.

## How a plan is built

Four stages, all deterministic — every tie breaks on `area_id`, and no floating-point sum decides an outcome.

1. **Guarantee.** Every included area receives the minimum-coverage floor, plus a continuity reserve when its drop test returned `possible_displacement`.
2. **Distribute.** The discretionary remainder splits in proportion to relative load: `forecast_upper + uncertainty_weight × (forecast_upper − forecast_lower)`. Planning against the upper bound means a wider interval prepares for more, and the weighted width means the least-understood areas are not the ones starved.
3. **Round.** Largest-remainder over whole increments, applied to the *discretionary portion only*, so rounding can never push an area below its guarantee.
4. **Explain.** Each area carries its reasons, what an unguarded plan would have given it, and the hours the floor redistributed away.

Relative load is **unitless** — a share basis, never a people estimate. There is no people-to-hours conversion in this product.

## How 311 exclusion is enforced

The contract forbids complaint volume from touching planning load, and C-01 finding R-03 identified "sort by complaints" as the most likely well-meaning request to break the product.

**Complaint volume is not representable in the planner input type.** A runtime guard can be deleted by a later edit; a missing field cannot be weighted by accident. `assertNoComplaintSignal` then guards the boundary where untyped artifact JSON crosses in, rejecting any key matching `complaint | 311 | service_request | call_volume | report_volume`. Three tests cover it, including one asserting that two areas differing only in real-world complaint volume are literally the same input.

## Infeasibility

When the budget cannot cover the guarantees, the planner returns `status: "infeasible"`, allocates nothing, and names the shortfall in hours with the three ways out (raise the budget, exclude an area, lower the floor). It never weakens a constraint to produce a number.

## Feasibility review of the contract defaults — **finding**

Sweeping the contract defaults (budget 80h, floor 8h, continuity 4h) across the 7 `candidate_area_labels`:

| `possible_displacement` areas | Guaranteed | Status | Discretionary |
|---|---|---|---|
| 0 | 56h | planned | 24h (30%) |
| 3 | 68h | planned | 12h (15%) |
| 5 | 76h | planned | 4h (5%) |
| 6 | 80h | planned | **0h** |
| 7 | 84h | **infeasible** | — |

**The defaults are fragile.** With all 7 areas included, 56 of 80 hours are committed before the forecast is consulted at all. Worse, the failure mode is perverse: every `possible_displacement` result — the product's headline finding — shrinks the discretionary pool further, so **the more the product detects what it was built to detect, the less the forecast influences the plan.** At six displacement areas the forecast stops mattering entirely, and at seven there is no plan.

### Recommended resolution of `planner.*.provisional`

| Field | Contract value | Recommended | Why |
|---|---|---|---|
| `minimum_coverage_floor` | 8h | **6h** | 42h guaranteed across 7 areas leaves 38h (48%) discretionary, and stays feasible at 7 displacement areas (70h ≤ 80h) |
| `continuity_reserve` | 4h | **4h** (keep) | Meaningful without dominating once the floor drops |
| `time_increment` | 1h | **1h** (keep) | Already fixed; sub-hour precision would misrepresent an upper-bound-derived estimate (C-01 finding R-07) |
| `uncertainty_policy` | `upper_prediction_bound` | **keep**, with `uncertainty_weight = 0.5` | The weight is currently unspecified in the contract and needs a value; 0.5 makes interval width matter without letting it dominate the bound |
| `travel_burden_policy` | equal until validated bands exist | **keep** | Any non-equal travel term needs an aggregate, auditable basis. Route data would reintroduce precise geography (C-01 finding R-05) |

**Additional safeguard, recommended for #15:** warn in the UI when the discretionary share falls below 25% — "the coverage floor is determining most of this plan, not the forecast." Without it, a floor-dominated plan is indistinguishable from a forecast-driven one, which is the fairness-washing risk in C-01 finding R-10.

**Second option if the floor stays at 8h:** cap the prepared scenario at 5 included areas. That is a Track A/D scenario decision, not a planner one.

## Acceptance criteria status

- [x] Allocations sum to the budget within the documented tolerance — tolerance is one increment, reported explicitly as `rounding_residue_hours`; tested across every feasible budget from 52h to 400h.
- [x] No allocation is negative and the floor is met or the plan is marked infeasible.
- [x] Tests demonstrate that 311 volume cannot affect planning load — three tests, plus type-level unrepresentability.
- [x] Synthetic tests cover scarcity, excess capacity, rounding, uncertainty reserves, and infeasibility.

Also delivered ahead of #15, because the planner computes them anyway: `unguarded_hours` per area (the guarded-versus-unguarded comparison), `unmet_hours` (what the floor redistributed away), and per-area `reasons` (the "Why this amount?" content). #15 becomes a rendering task rather than a second calculation.

**Not closable yet.** #14 depends on #8, #9, #10 and #4. The planner is verified against synthetic fixtures; it has never consumed a real forecast. Re-verify once Track A emits forecast bounds and Track D versions the artifact contract, and confirm the field names above match what the contract actually carries.

## Handoffs

- **Track D (#4):** the artifact contract must carry, per area: `area_id`, `label`, `forecast_upper`, `forecast_lower`, `drop_test`, `included`. It must **not** carry any complaint-volume field — the planner rejects the whole input if it does.
- **Track A (#9, #10):** `forecast_lower` and `forecast_upper` must be finite, ordered, and non-negative. The planner throws on an inverted interval rather than guessing.
- **Track C (#15):** render `unguarded_hours`, `unmet_hours`, `reasons`, `constraint_notes`, and the discretionary-share warning above.
- **Track D / scenario owner:** the floor recommendation above needs a decision before the demo. It changes numbers on screen.
