/**
 * Cost layer — public surface.
 *
 * Nothing exported here may be imported by `lib/planner.ts` or
 * `domain/planner/**`. Cost prices a plan; it never makes one. The guard for
 * that rule lives in `./cost.test.ts`.
 */

export type {
  AreaCost,
  ExcludesPersonDenominator,
  FloorMarginalCost,
  LoadedRateAssumption,
  PersonDenominatorKey,
  PersonDenominatorKeysOf,
  PlanCost,
} from "./types.ts";

export {
  AREA_COST_EXCLUDES_PERSON_DENOMINATOR,
  FLOOR_MARGINAL_COST_EXCLUDES_PERSON_DENOMINATOR,
  PLAN_COST_EXCLUDES_PERSON_DENOMINATOR,
} from "./types.ts";

export type { PlanCostAreaInput, PlanCostInput } from "./cost.ts";

export {
  CostDenominatorError,
  DEFAULT_LOADED_HOURLY_RATE,
  DEFAULT_RATE_CURRENCY,
  MAX_LOADED_HOURLY_RATE,
  assertNoPersonDenominator,
  costOfHours,
  floorCostSentence,
  formatCurrency,
  formatRate,
  isValidRate,
  summarizePlanCost,
} from "./cost.ts";
