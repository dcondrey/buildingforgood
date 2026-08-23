/**
 * The allocation path the deployed app runs
 * (`features/shell/useShellState.ts` -> `allocateHours`).
 *
 * `assertNoComplaintSignal` is imported from `domain/planner`, never
 * reimplemented: a second copy of a safety check drifts into the weaker of
 * the two. See docs/project/PHASE0_FINDINGS.md finding F-1 for why this
 * import exists at all, and app/src/refusals.test.ts for what it must hold.
 *
 * The two checks below are not the same claim. The name check refuses a
 * complaint-shaped field. The derivation check refuses a number whose stated
 * origin does not reconcile with the artifact it claims to come from, which
 * is the only one of the two that a complaint count under an innocent name
 * fails. Together they support this and nothing wider: complaint volume
 * cannot reach allocation without also corrupting the published forecast
 * interval, which is derived from checksummed inputs
 * (docs/project/DECISIONS.md).
 */

import { assertDeclaredPlanningLoad, assertNoComplaintSignal } from "../domain/planner/planner.ts";

import type { PlanningArea } from "./demo";

export interface Allocation {
  areaId: string;
  hours: number;
}

export interface PlanResult {
  allocations: Allocation[];
  feasible: boolean;
  message: string;
}

export function allocateHours(
  areas: PlanningArea[],
  budget: number,
  floor: number,
  guardEnabled: boolean,
  locks: ReadonlyMap<string, number> = new Map(),
): PlanResult {
  // Boundary check first: a complaint signal is rejected outright rather
  // than validated into a friendly message, because a caller that can
  // recover from it can also ignore it.
  assertNoComplaintSignal(areas, "planner areas");
  assertNoComplaintSignal(Object.fromEntries(locks), "planner locks");
  // A complaint field is rejected by name above. This rejects a complaint
  // NUMBER arriving under an innocent name, which is the bypass that got
  // through the first version of this guard.
  assertDeclaredPlanningLoad(areas, "planner areas");

  if (!Number.isFinite(budget) || budget < 0 || !Number.isInteger(budget)) {
    return {
      allocations: [],
      feasible: false,
      message: "The staff-hour budget must be a nonnegative whole number.",
    };
  }
  if (guardEnabled && (!Number.isFinite(floor) || floor < 0 || !Number.isInteger(floor))) {
    return {
      allocations: [],
      feasible: false,
      message: "The coverage-continuity floor must be a nonnegative whole number.",
    };
  }

  const normalizedBudget = budget;
  const effectiveFloor = guardEnabled ? floor : 0;
  const unlocked = areas.filter((area) => !locks.has(area.id));
  const lockedTotal = areas.reduce((sum, area) => sum + (locks.get(area.id) ?? 0), 0);

  for (const [areaId, value] of locks) {
    if (!areas.some((area) => area.id === areaId)) continue;
    if (!Number.isFinite(value) || value < effectiveFloor || Math.round(value) !== value) {
      return {
        allocations: [],
        feasible: false,
        message: guardEnabled
          ? `Locked hours must be whole numbers at or above the ${effectiveFloor}-hour floor.`
          : "Locked hours must be nonnegative whole numbers.",
      };
    }
  }

  const minimumRequired = lockedTotal + unlocked.length * effectiveFloor;
  if (minimumRequired > normalizedBudget) {
    return {
      allocations: [],
      feasible: false,
      message: `No feasible plan: locks and coverage floors require ${minimumRequired} hours, but the budget is ${normalizedBudget}.`,
    };
  }

  const remaining = normalizedBudget - minimumRequired;
  if (unlocked.length === 0 && remaining > 0) {
    return {
      allocations: [],
      feasible: false,
      message: `No feasible plan: every area is locked, leaving ${remaining} unassigned hour${remaining === 1 ? "" : "s"}. Unlock an area or make the locks sum to the budget.`,
    };
  }
  const weightTotal = unlocked.reduce((sum, area) => sum + Math.max(0, area.planningLoad), 0);
  const shares = unlocked.map((area, index) => {
    const exact =
      weightTotal > 0
        ? (remaining * Math.max(0, area.planningLoad)) / weightTotal
        : remaining / Math.max(1, unlocked.length);
    return { area, index, whole: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = remaining - shares.reduce((sum, share) => sum + share.whole, 0);
  for (const share of [...shares].sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
    if (remainder <= 0) break;
    share.whole += 1;
    remainder -= 1;
  }

  const unlockedHours = new Map(
    shares.map((share) => [share.area.id, effectiveFloor + share.whole] as const),
  );
  const allocations = areas.map((area) => ({
    areaId: area.id,
    hours: locks.get(area.id) ?? unlockedHours.get(area.id) ?? 0,
  }));
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.hours, 0);
  if (allocatedTotal !== normalizedBudget) {
    return {
      allocations: [],
      feasible: false,
      message: `No feasible plan: ${allocatedTotal} of ${normalizedBudget} hours were assigned.`,
    };
  }

  return {
    allocations,
    feasible: true,
    message: guardEnabled
      ? `Every one of the ${areas.length} neighborhoods keeps at least ${effectiveFloor} hours.`
      : "No minimum applied: hours follow the forecast alone.",
  };
}
