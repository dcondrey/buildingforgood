/**
 * Fairness-constrained outreach-hour planner (issue #14).
 *
 * Turns forecast uncertainty into a deterministic allocation of a fixed
 * staff-hour budget. Same inputs always produce the same plan: every tie is
 * broken by `area_id`, and no floating-point sum decides an outcome.
 *
 * The allocation runs in four stages:
 *
 * 1. **Guarantee** — every included area receives the coverage floor, plus a
 *    continuity reserve if its drop test returned `possible_displacement`.
 *    This is the fairness constraint. It is a *minimum-coverage floor*, not a
 *    claim that the result is just; see the C-01 review, finding R-10.
 * 2. **Distribute** — the discretionary remainder is split in proportion to
 *    relative load, derived from the upper prediction bound plus a weighted
 *    interval width.
 * 3. **Round** — largest-remainder over whole increments, applied to the
 *    discretionary portion only, so rounding can never push an area below
 *    its guaranteed minimum.
 * 4. **Explain** — each area carries its reasons, what an unguarded plan
 *    would have given it, and the hours the floor redistributed away.
 *
 * When the budget cannot cover the guarantees, the planner returns no plan
 * and says why. It never silently weakens a constraint to produce a number.
 */

import type {
  AreaAllocation,
  AreaLock,
  AreaPlanningInput,
  PlanResult,
  PlannerPolicy,
} from "./types.ts";

/** Field names that must never reach the planner (C-01 finding R-03). */
const COMPLAINT_FIELD_PATTERN = /complaint|311|service_request|call_volume|report_volume/i;

export class PlannerInputError extends Error {
  constructor(detail: string) {
    super(`planner input invalid: ${detail}`);
    this.name = "PlannerInputError";
  }
}

/**
 * Reject any object carrying a complaint-volume signal.
 *
 * The planner types cannot express complaint volume, but artifact JSON is
 * untyped at the boundary. This is the check that keeps an extra field in a
 * generated file from becoming an allocation input by way of a spread.
 */
export function assertNoComplaintSignal(record: Record<string, unknown>, where: string): void {
  for (const key of Object.keys(record)) {
    if (COMPLAINT_FIELD_PATTERN.test(key)) {
      throw new PlannerInputError(
        `${where} carries "${key}"; complaint volume may never influence planning load ` +
          `or allocation (config/decision.v1.json → observations.complaint_volume_excluded_uses)`,
      );
    }
  }
}

function requireFinite(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new PlannerInputError(`${name} must be a finite number`);
  }
  return value;
}

function validate(areas: AreaPlanningInput[], policy: PlannerPolicy, locks: AreaLock[]): void {
  requireFinite(policy.budget_hours, "budget_hours");
  requireFinite(policy.minimum_coverage_floor_hours, "minimum_coverage_floor_hours");
  requireFinite(policy.continuity_reserve_hours, "continuity_reserve_hours");
  requireFinite(policy.uncertainty_weight, "uncertainty_weight");

  if (policy.budget_hours < 0) throw new PlannerInputError("budget_hours must not be negative");
  if (!(policy.time_increment_hours > 0)) {
    throw new PlannerInputError("time_increment_hours must be greater than zero");
  }
  if (policy.minimum_coverage_floor_hours < 0 || policy.continuity_reserve_hours < 0) {
    throw new PlannerInputError("coverage floor and continuity reserve must not be negative");
  }
  if (policy.uncertainty_weight < 0) {
    throw new PlannerInputError("uncertainty_weight must not be negative");
  }

  const seen = new Set<string>();
  for (const area of areas) {
    if (!area.area_id) throw new PlannerInputError("every area needs a non-empty area_id");
    if (seen.has(area.area_id)) throw new PlannerInputError(`duplicate area_id ${area.area_id}`);
    seen.add(area.area_id);
    assertNoComplaintSignal(area as unknown as Record<string, unknown>, `area ${area.area_id}`);
    requireFinite(area.forecast_upper, `${area.area_id}.forecast_upper`);
    requireFinite(area.forecast_lower, `${area.area_id}.forecast_lower`);
    if (area.forecast_lower < 0 || area.forecast_upper < 0) {
      throw new PlannerInputError(`${area.area_id} has a negative forecast bound`);
    }
    if (area.forecast_upper < area.forecast_lower) {
      throw new PlannerInputError(`${area.area_id} has an inverted prediction interval`);
    }
  }

  for (const lock of locks) {
    requireFinite(lock.hours, `lock ${lock.area_id}`);
    if (lock.hours < 0) throw new PlannerInputError(`lock ${lock.area_id} must not be negative`);
    if (!seen.has(lock.area_id)) {
      throw new PlannerInputError(`lock references unknown area ${lock.area_id}`);
    }
  }
}

/**
 * Relative planning load. Unitless — a share basis, never a people estimate.
 *
 * Plans against the upper prediction bound and adds a weighted interval
 * width, so a wide, poorly-understood interval earns more preparation rather
 * than less. Complaint volume is absent by construction.
 */
export function relativeLoad(area: AreaPlanningInput, policy: PlannerPolicy): number {
  const width = Math.max(0, area.forecast_upper - area.forecast_lower);
  return area.forecast_upper + policy.uncertainty_weight * width;
}

/**
 * Largest-remainder apportionment of `totalUnits` across `weights`.
 *
 * Ties on the fractional remainder are broken by ascending index, and the
 * caller supplies weights in `area_id` order, so the result is deterministic.
 */
function largestRemainder(weights: number[], totalUnits: number): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const count = weights.length;
  if (count === 0 || totalUnits <= 0) return new Array<number>(count).fill(0);

  const shares =
    weightSum > 0
      ? weights.map((w) => (w / weightSum) * totalUnits)
      : weights.map(() => totalUnits / count);

  const base = shares.map((s) => Math.floor(s));
  let assigned = base.reduce((sum, b) => sum + b, 0);
  const order = shares
    .map((share, index) => ({ index, remainder: share - Math.floor(share) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  let cursor = 0;
  while (assigned < totalUnits && order.length > 0) {
    const target = order[cursor % order.length];
    if (target !== undefined) {
      base[target.index] = (base[target.index] ?? 0) + 1;
      assigned += 1;
    }
    cursor += 1;
  }
  return base;
}

function unguardedPlan(
  areas: AreaPlanningInput[],
  policy: PlannerPolicy,
  totalUnits: number,
): Map<string, number> {
  const weights = areas.map((a) => relativeLoad(a, policy));
  const units = largestRemainder(weights, totalUnits);
  const result = new Map<string, number>();
  areas.forEach((area, index) => {
    result.set(area.area_id, (units[index] ?? 0) * policy.time_increment_hours);
  });
  return result;
}

/**
 * Build a deterministic outreach-hour plan.
 *
 * Returns `status: "infeasible"` with reasons when the budget cannot satisfy
 * the coverage floor and continuity reserves, rather than producing a plan
 * that quietly violates them.
 */
export function buildPlan(
  areasInput: AreaPlanningInput[],
  policy: PlannerPolicy,
  locksInput: AreaLock[] = [],
): PlanResult {
  const areas = [...areasInput].sort((a, b) => a.area_id.localeCompare(b.area_id));
  const locks = [...locksInput].sort((a, b) => a.area_id.localeCompare(b.area_id));
  validate(areas, policy, locks);

  const increment = policy.time_increment_hours;
  const lockByArea = new Map(locks.map((l) => [l.area_id, l.hours]));
  const constraintNotes: string[] = [];
  const infeasibleReasons: string[] = [];

  const included = areas.filter((a) => a.included);
  const excluded = areas.filter((a) => !a.included);
  const lockedIncluded = included.filter((a) => lockByArea.has(a.area_id));
  const openIncluded = included.filter((a) => !lockByArea.has(a.area_id));

  const lockedHours = lockedIncluded.reduce((sum, a) => sum + (lockByArea.get(a.area_id) ?? 0), 0);
  const remainingHours = policy.budget_hours - lockedHours;

  if (remainingHours < 0) {
    infeasibleReasons.push(
      `Locked assignments total ${lockedHours} hours, which exceeds the ${policy.budget_hours}-hour budget. ` +
        `Release a lock or raise the budget.`,
    );
  }

  const minimumHours = new Map<string, { floor: number; continuity: number }>();
  for (const area of openIncluded) {
    const continuity =
      area.drop_test === "possible_displacement" ? policy.continuity_reserve_hours : 0;
    minimumHours.set(area.area_id, { floor: policy.minimum_coverage_floor_hours, continuity });
  }
  const guaranteedHours = [...minimumHours.values()].reduce(
    (s, m) => s + m.floor + m.continuity,
    0,
  );

  if (remainingHours >= 0 && guaranteedHours > remainingHours) {
    const shortfall = guaranteedHours - remainingHours;
    infeasibleReasons.push(
      `The ${openIncluded.length} unlocked areas require ${guaranteedHours} hours to meet the ` +
        `${policy.minimum_coverage_floor_hours}-hour coverage floor and continuity reserves, but only ` +
        `${remainingHours} hours remain. Shortfall: ${shortfall} hours. ` +
        `Raise the budget, exclude an area, or lower the floor — the planner will not weaken it silently.`,
    );
  }

  if (infeasibleReasons.length > 0) {
    return {
      status: "infeasible",
      allocations: areas.map((area) => ({
        area_id: area.area_id,
        label: area.label,
        allocated_hours: 0,
        floor_hours: minimumHours.get(area.area_id)?.floor ?? 0,
        continuity_reserve_hours: minimumHours.get(area.area_id)?.continuity ?? 0,
        relative_load: area.included ? relativeLoad(area, policy) : 0,
        unguarded_hours: 0,
        unmet_hours: 0,
        locked: lockByArea.has(area.area_id),
        included: area.included,
        reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
      })),
      budget_hours: policy.budget_hours,
      total_allocated_hours: 0,
      rounding_residue_hours: 0,
      unmet_hours_total: 0,
      locked_area_count: lockedIncluded.length,
      constraint_notes: constraintNotes,
      infeasible_reasons: infeasibleReasons,
    };
  }

  const totalUnits = Math.floor(remainingHours / increment + 1e-9);
  const residue = remainingHours - totalUnits * increment;
  if (residue > 0) {
    constraintNotes.push(
      `${residue} hour(s) could not be split into whole ${increment}-hour increments and are unallocated.`,
    );
  }

  const guaranteedUnits = openIncluded.map((a) => {
    const m = minimumHours.get(a.area_id);
    return Math.ceil(((m?.floor ?? 0) + (m?.continuity ?? 0)) / increment - 1e-9);
  });
  const guaranteedUnitTotal = guaranteedUnits.reduce((s, u) => s + u, 0);
  const discretionaryUnits = Math.max(0, totalUnits - guaranteedUnitTotal);

  const weights = openIncluded.map((a) => relativeLoad(a, policy));
  const discretionary = largestRemainder(weights, discretionaryUnits);
  const unguarded = unguardedPlan(openIncluded, policy, totalUnits);

  const allocations: AreaAllocation[] = [];
  let allocatedTotal = 0;
  let unmetTotal = 0;

  for (const area of excluded) {
    allocations.push({
      area_id: area.area_id,
      label: area.label,
      allocated_hours: 0,
      floor_hours: 0,
      continuity_reserve_hours: 0,
      relative_load: 0,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: false,
      reasons: ["Excluded from this shift, so no hours were allocated."],
    });
  }

  for (const area of lockedIncluded) {
    const hours = lockByArea.get(area.area_id) ?? 0;
    allocatedTotal += hours;
    allocations.push({
      area_id: area.area_id,
      label: area.label,
      allocated_hours: hours,
      floor_hours: 0,
      continuity_reserve_hours: 0,
      relative_load: relativeLoad(area, policy),
      unguarded_hours: hours,
      unmet_hours: 0,
      locked: true,
      included: true,
      reasons: [
        `${hours} hours set by the coordinator and preserved through recomputation.`,
        "Only the unlocked remainder was recalculated.",
      ],
    });
  }

  openIncluded.forEach((area, index) => {
    const m = minimumHours.get(area.area_id);
    const floor = m?.floor ?? 0;
    const continuity = m?.continuity ?? 0;
    const hours =
      (guaranteedUnits[index] ?? 0) * increment + (discretionary[index] ?? 0) * increment;
    const unguardedHours = unguarded.get(area.area_id) ?? 0;
    const unmet = Math.max(0, unguardedHours - hours);
    allocatedTotal += hours;
    unmetTotal += unmet;

    const reasons: string[] = [];
    reasons.push(
      `${floor} hours from the minimum-coverage floor, applied to every included area so ` +
        `lower-visibility places are not left uncovered.`,
    );
    if (continuity > 0) {
      reasons.push(
        `${continuity} hours of continuity reserve because the drop test returned ` +
          `possible_displacement, which preserves outreach continuity where a local decline ` +
          `coincides with nearby aggregate increases.`,
      );
    }
    const discretionaryHours = (discretionary[index] ?? 0) * increment;
    if (discretionaryHours > 0) {
      reasons.push(
        `${discretionaryHours} hours from the discretionary remainder, in proportion to a relative ` +
          `load of ${relativeLoad(area, policy).toFixed(1)} built from the upper prediction bound ` +
          `(${area.forecast_upper}) and its interval width.`,
      );
    }
    if (unmet > 0) {
      reasons.push(
        `${unmet} fewer hours than a plan without the coverage floor would have given this area.`,
      );
    }
    reasons.push(
      "Complaint volume was not used. These hours are a capacity split, not a need estimate.",
    );

    allocations.push({
      area_id: area.area_id,
      label: area.label,
      allocated_hours: hours,
      floor_hours: floor,
      continuity_reserve_hours: continuity,
      relative_load: relativeLoad(area, policy),
      unguarded_hours: unguardedHours,
      unmet_hours: unmet,
      locked: false,
      included: true,
      reasons,
    });
  });

  allocations.sort((a, b) => a.area_id.localeCompare(b.area_id));

  constraintNotes.push(
    `Every included area received at least ${policy.minimum_coverage_floor_hours} hours.`,
  );
  if (lockedIncluded.length > 0) {
    constraintNotes.push(
      `${lockedIncluded.length} of ${included.length} assignments were set by the coordinator.`,
    );
  }
  constraintNotes.push(
    "The budget is a capacity constraint. Allocating all available hours does not mean all need is met.",
  );

  return {
    status: "planned",
    allocations,
    budget_hours: policy.budget_hours,
    total_allocated_hours: allocatedTotal,
    rounding_residue_hours: residue,
    unmet_hours_total: unmetTotal,
    locked_area_count: lockedIncluded.length,
    constraint_notes: constraintNotes,
    infeasible_reasons: [],
  };
}
