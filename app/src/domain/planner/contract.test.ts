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
    // The policy object is what the planner reads, so read it back rather
    // than naming four of its fields: a policy field the contract stops
    // supplying arrives here as `undefined` instead of passing unnoticed.
    const policy = policyFromContract();
    const keys = Object.keys(policy) as Array<keyof PlannerPolicy>;
    expect(keys.length).toBeGreaterThanOrEqual(5);
    for (const key of keys) {
      expect(Number.isFinite(policy[key]), key).toBe(true);
      expect(policy[key], key).toBeGreaterThanOrEqual(0);
    }
    expect(policy.minimum_coverage_floor_hours).toBeGreaterThan(0);
    expect(policy.time_increment_hours).toBeGreaterThan(0);
  });

  it("carries no unresolved planner field", () => {
    // Every `status` anywhere under `planner`, found by walking the block —
    // three named fields left the other three unchecked.
    const statuses: Array<[string, unknown]> = [];
    const walk = (node: unknown, path: string): void => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (typeof node !== "object" || node === null) return;
      for (const [key, value] of Object.entries(node)) {
        if (key === "status") statuses.push([`${path}.status`, value]);
        else walk(value, `${path}.${key}`);
      }
    };
    walk(planner, "planner");
    expect(statuses.length).toBeGreaterThanOrEqual(3);
    for (const [where, status] of statuses) expect(status, where).toBe("fixed");
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
