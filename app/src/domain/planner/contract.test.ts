/**
 * End-to-end evidence for the resolved planner policy (#14).
 *
 * The unit suite uses a fixture that mirrors `config/decision.v1.json`. A
 * mirror can drift, and a policy change verified only against its own mirror
 * is verified against nothing. These tests load the real contract file and
 * run the real candidate area list through the planner, so lowering the
 * coverage floor from 8h to 6h is checked against what actually ships.
 */

import { describe, expect, it } from "vitest";

import contract from "../../../../config/decision.v1.json" with { type: "json" };
import { buildPlan } from "./planner.ts";
import type { AreaPlanningInput, DropTestResult, PlannerPolicy } from "./types.ts";

const planner = contract.planner;
const budget = contract.decision.default_budget.value;
const areaLabels = contract.geography.candidate_area_labels;

function policyFromContract(): PlannerPolicy {
  return {
    budget_hours: budget,
    time_increment_hours: planner.time_increment.value,
    minimum_coverage_floor_hours: planner.minimum_coverage_floor.value,
    continuity_reserve_hours: planner.possible_displacement_continuity_reserve.value,
    uncertainty_weight: planner.uncertainty_policy.uncertainty_weight,
  };
}

function areasFromContract(displacementCount: number): AreaPlanningInput[] {
  return areaLabels.map((id, index) => ({
    area_id: id,
    label: id,
    forecast_upper: 150 - index * 15,
    forecast_lower: 110 - index * 12,
    drop_test: (index < displacementCount
      ? "possible_displacement"
      : "likely_improvement") as DropTestResult,
    included: true,
  }));
}

describe("the shipped contract", () => {
  it("defines every value the planner reads", () => {
    expect(planner.minimum_coverage_floor.value).toBeGreaterThan(0);
    expect(planner.uncertainty_policy.uncertainty_weight).toBeGreaterThanOrEqual(0);
    expect(planner.time_increment.value).toBeGreaterThan(0);
    expect(planner.possible_displacement_continuity_reserve.value).toBeGreaterThanOrEqual(0);
  });

  it("carries no unresolved planner field", () => {
    expect(planner.minimum_coverage_floor.status).toBe("fixed");
    expect(planner.uncertainty_policy.status).toBe("fixed");
    expect(planner.travel_burden_policy.status).toBe("fixed");
  });

  it("no longer lists a Track C release blocker", () => {
    const mine = contract.release_blockers.filter((b) => b.owner_track === "C");
    expect(mine).toEqual([]);
  });
});

describe("the resolved floor against the real area list", () => {
  it("stays feasible even when every area returns possible_displacement", () => {
    const plan = buildPlan(areasFromContract(areaLabels.length), policyFromContract());
    expect(plan.status).toBe("planned");
    expect(plan.total_allocated_hours).toBe(budget);
  });

  it("leaves the forecast a real share of the budget at every displacement count", () => {
    for (let n = 0; n <= areaLabels.length; n += 1) {
      const policy = policyFromContract();
      const plan = buildPlan(areasFromContract(n), policy);
      expect(plan.status).toBe("planned");
      const guaranteed =
        areaLabels.length * policy.minimum_coverage_floor_hours +
        n * policy.continuity_reserve_hours;
      // The old 8h floor hit zero discretionary at 6 and infeasible at 7.
      expect(budget - guaranteed).toBeGreaterThan(0);
    }
  });

  it("still gives every area the floor and conserves the budget", () => {
    const policy = policyFromContract();
    const plan = buildPlan(areasFromContract(3), policy);
    expect(plan.total_allocated_hours + plan.rounding_residue_hours).toBe(budget);
    for (const a of plan.allocations) {
      expect(a.allocated_hours).toBeGreaterThanOrEqual(policy.minimum_coverage_floor_hours);
    }
  });

  it("would have been infeasible under the old 8h floor, which is why it changed", () => {
    const old = { ...policyFromContract(), minimum_coverage_floor_hours: 8 };
    const plan = buildPlan(areasFromContract(areaLabels.length), old);
    expect(plan.status).toBe("infeasible");
  });
});
