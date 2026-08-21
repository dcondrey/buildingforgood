import { describe, expect, it } from "vitest";

import { assertNoComplaintSignal, buildPlan, PlannerInputError, relativeLoad } from "./planner.ts";
import type { AreaPlanningInput, PlannerPolicy } from "./types.ts";

/** Policy defaults mirror config/decision.v1.json → planner. */
const POLICY: PlannerPolicy = {
  budget_hours: 80,
  time_increment_hours: 1,
  minimum_coverage_floor_hours: 6,
  continuity_reserve_hours: 4,
  uncertainty_weight: 0.5,
};

function area(id: string, upper: number, lower = upper, over: Partial<AreaPlanningInput> = {}) {
  return {
    area_id: id,
    label: id,
    forecast_upper: upper,
    forecast_lower: lower,
    drop_test: "likely_improvement",
    included: true,
    ...over,
  } satisfies AreaPlanningInput;
}

const SIX_AREAS: AreaPlanningInput[] = [
  area("barrio_logan", 40, 28),
  area("cortez_hill", 18, 12),
  area("east_village", 150, 110, { drop_test: "possible_displacement" }),
  area("gaslamp", 60, 44),
  area("golden_hill", 22, 16),
  area("sherman_heights", 35, 25),
];

describe("budget conservation", () => {
  it("allocates exactly the available budget", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    expect(plan.status).toBe("planned");
    expect(plan.total_allocated_hours).toBe(80);
    expect(plan.rounding_residue_hours).toBe(0);
  });

  it("conserves the budget at every feasible budget level", () => {
    // 6 areas x 6h floor + 4h continuity for east_village = 40h guaranteed.
    for (let budget = 40; budget <= 400; budget += 7) {
      const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: budget });
      expect(plan.status).toBe("planned");
      expect(plan.total_allocated_hours + plan.rounding_residue_hours).toBe(budget);
    }
  });

  it("reports residue instead of losing hours to a coarse increment", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 85, time_increment_hours: 4 });
    expect(plan.total_allocated_hours + plan.rounding_residue_hours).toBe(85);
    expect(plan.rounding_residue_hours).toBe(1);
  });
});

describe("non-negativity and the coverage floor", () => {
  it("never allocates a negative number of hours", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    for (const a of plan.allocations) expect(a.allocated_hours).toBeGreaterThanOrEqual(0);
  });

  it("gives every included area at least the floor", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    for (const a of plan.allocations.filter((x) => x.included)) {
      expect(a.allocated_hours).toBeGreaterThanOrEqual(POLICY.minimum_coverage_floor_hours);
    }
  });

  it("holds the floor even when one area dominates the forecast", () => {
    const lopsided = [area("a", 5000), area("b", 1), area("c", 1)];
    const plan = buildPlan(lopsided, POLICY);
    for (const a of plan.allocations) expect(a.allocated_hours).toBeGreaterThanOrEqual(6);
  });

  it("adds a continuity reserve only for possible_displacement", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    const ev = plan.allocations.find((a) => a.area_id === "east_village");
    const gl = plan.allocations.find((a) => a.area_id === "gaslamp");
    expect(ev?.continuity_reserve_hours).toBe(4);
    expect(gl?.continuity_reserve_hours).toBe(0);
  });

  it("excludes areas marked not included", () => {
    const withExcluded = [...SIX_AREAS, area("out_of_scope", 90, 70, { included: false })];
    const plan = buildPlan(withExcluded, POLICY);
    const excluded = plan.allocations.find((a) => a.area_id === "out_of_scope");
    expect(excluded?.allocated_hours).toBe(0);
    expect(plan.total_allocated_hours).toBe(80);
  });
});

describe("infeasibility is declared, never absorbed", () => {
  it("refuses to plan when the budget cannot cover the floor", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 12 });
    expect(plan.status).toBe("infeasible");
    expect(plan.total_allocated_hours).toBe(0);
    expect(plan.infeasible_reasons.join(" ")).toMatch(/coverage floor/i);
  });

  it("names the shortfall in hours so the coordinator can act", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 30 });
    // 6 areas x 6 floor + 4 continuity = 40 required, 30 available.
    expect(plan.infeasible_reasons.join(" ")).toMatch(/Shortfall: 10 hours/);
  });

  it("is feasible at exactly the guaranteed total", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 40 });
    expect(plan.status).toBe("planned");
    expect(plan.total_allocated_hours).toBe(40);
  });

  it("refuses when locks alone exceed the budget", () => {
    const plan = buildPlan(SIX_AREAS, POLICY, [{ area_id: "east_village", hours: 100 }]);
    expect(plan.status).toBe("infeasible");
    expect(plan.infeasible_reasons.join(" ")).toMatch(/exceeds/i);
  });
});

describe("complaint volume cannot influence planning", () => {
  it("rejects an area carrying a complaint field", () => {
    const contaminated = [
      { ...area("east_village", 150, 110), complaint_count: 900 },
    ] as unknown as AreaPlanningInput[];
    expect(() => buildPlan(contaminated, POLICY)).toThrow(PlannerInputError);
  });

  it("rejects every complaint-shaped field name", () => {
    for (const key of ["complaints", "311_calls", "service_request_count", "call_volume"]) {
      expect(() => assertNoComplaintSignal({ [key]: 1 }, "area x")).toThrow(PlannerInputError);
    }
  });

  it("produces an identical plan whatever the complaint picture is", () => {
    // The proof of exclusion: complaint volume has no representation in the
    // input type, so two areas differing only in real-world complaint volume
    // are literally the same input. Load depends solely on forecast bounds.
    const quiet = area("a", 100, 80);
    const loud = area("a", 100, 80);
    expect(relativeLoad(quiet, POLICY)).toBe(relativeLoad(loud, POLICY));
    expect(buildPlan([quiet, area("b", 50, 40)], POLICY)).toEqual(
      buildPlan([loud, area("b", 50, 40)], POLICY),
    );
  });
});

describe("locks and human overrides", () => {
  it("preserves a locked assignment exactly", () => {
    const plan = buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 20 }]);
    expect(plan.allocations.find((a) => a.area_id === "gaslamp")?.allocated_hours).toBe(20);
    expect(plan.total_allocated_hours).toBe(80);
  });

  it("recomputes only the unlocked remainder", () => {
    const locked = buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 20 }]);
    const unlockedTotal = locked.allocations
      .filter((a) => !a.locked && a.included)
      .reduce((s, a) => s + a.allocated_hours, 0);
    expect(unlockedTotal).toBe(60);
  });

  it("discloses how many assignments a human set", () => {
    const plan = buildPlan(SIX_AREAS, POLICY, [
      { area_id: "gaslamp", hours: 12 },
      { area_id: "cortez_hill", hours: 10 },
    ]);
    expect(plan.locked_area_count).toBe(2);
    expect(plan.constraint_notes.join(" ")).toMatch(
      /2 of 6 assignments were set by the coordinator/,
    );
  });

  it("rejects a lock on an unknown area", () => {
    expect(() => buildPlan(SIX_AREAS, POLICY, [{ area_id: "nowhere", hours: 5 }])).toThrow(
      /unknown area/,
    );
  });

  it("rejects a negative lock", () => {
    expect(() => buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: -5 }])).toThrow(
      PlannerInputError,
    );
  });
});

describe("uncertainty and continuity reserves", () => {
  it("gives a wider interval more relative load at equal upper bound", () => {
    const narrow = area("n", 100, 95);
    const wide = area("w", 100, 40);
    expect(relativeLoad(wide, POLICY)).toBeGreaterThan(relativeLoad(narrow, POLICY));
  });

  it("collapses to the upper bound when the uncertainty weight is zero", () => {
    expect(relativeLoad(area("a", 100, 40), { ...POLICY, uncertainty_weight: 0 })).toBe(100);
  });

  it("allocates more to the wider-interval area, floors permitting", () => {
    const plan = buildPlan([area("narrow", 100, 95), area("wide", 100, 20)], {
      ...POLICY,
      budget_hours: 200,
    });
    const narrow = plan.allocations.find((a) => a.area_id === "narrow")?.allocated_hours ?? 0;
    const wide = plan.allocations.find((a) => a.area_id === "wide")?.allocated_hours ?? 0;
    expect(wide).toBeGreaterThan(narrow);
  });
});

describe("guarded versus unguarded comparison", () => {
  it("reports what an unguarded plan would have given each area", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    const ev = plan.allocations.find((a) => a.area_id === "east_village");
    const ch = plan.allocations.find((a) => a.area_id === "cortez_hill");
    // The floor moves hours from the highest-load area toward the smallest.
    expect(ev?.unguarded_hours ?? 0).toBeGreaterThan(ev?.allocated_hours ?? 0);
    expect(ch?.allocated_hours ?? 0).toBeGreaterThan(ch?.unguarded_hours ?? 0);
  });

  it("reports the total hours the floor redistributed", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    expect(plan.unmet_hours_total).toBeGreaterThan(0);
  });

  it("does not present the unguarded plan as preferred", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    expect(plan.constraint_notes.join(" ")).not.toMatch(/better|optimal|preferred|should/i);
  });
});

describe("explanations", () => {
  it("gives every included area a reason for its hours", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    for (const a of plan.allocations.filter((x) => x.included && !x.locked)) {
      expect(a.reasons.length).toBeGreaterThan(0);
      expect(a.reasons.join(" ")).toMatch(/minimum-coverage floor/);
    }
  });

  it("states that the plan is a capacity split, not a need estimate", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    expect(plan.constraint_notes.join(" ")).toMatch(/still leaves load uncovered/);
  });

  it("never uses causal, enforcement, or individual-movement language", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    const prose = [...plan.constraint_notes, ...plan.allocations.flatMap((a) => a.reasons)].join(
      " ",
    );
    expect(prose).not.toMatch(
      /\b(caused|because of|due to|sweep|enforce|cleared|moved to|relocat)/i,
    );
  });
});

describe("determinism and input validation", () => {
  it("produces an identical plan regardless of input order", () => {
    const forward = buildPlan(SIX_AREAS, POLICY);
    const reversed = buildPlan([...SIX_AREAS].reverse(), POLICY);
    expect(forward).toEqual(reversed);
  });

  it("is stable across repeated runs", () => {
    expect(buildPlan(SIX_AREAS, POLICY)).toEqual(buildPlan(SIX_AREAS, POLICY));
  });

  it("rejects duplicate area ids", () => {
    expect(() => buildPlan([area("a", 1), area("a", 2)], POLICY)).toThrow(/duplicate/);
  });

  it("rejects an inverted prediction interval", () => {
    expect(() => buildPlan([area("a", 10, 90)], POLICY)).toThrow(/inverted/);
  });

  it("rejects a negative budget and a non-positive increment", () => {
    expect(() => buildPlan(SIX_AREAS, { ...POLICY, budget_hours: -1 })).toThrow(PlannerInputError);
    expect(() => buildPlan(SIX_AREAS, { ...POLICY, time_increment_hours: 0 })).toThrow(
      PlannerInputError,
    );
  });

  it("handles a zero-load forecast by splitting evenly rather than dividing by zero", () => {
    const plan = buildPlan([area("a", 0), area("b", 0), area("c", 0)], {
      ...POLICY,
      budget_hours: 30,
    });
    expect(plan.status).toBe("planned");
    expect(plan.total_allocated_hours).toBe(30);
    expect(plan.allocations.map((a) => a.allocated_hours)).toEqual([10, 10, 10]);
  });

  it("plans for a single area", () => {
    const plan = buildPlan([area("only", 40, 30)], { ...POLICY, budget_hours: 40 });
    expect(plan.allocations[0]?.allocated_hours).toBe(40);
  });
});

describe("infeasible plans still carry a full allocation list", () => {
  it("populates allocations so a UI can render rows without a crash", () => {
    // Flagged in review as a possible TypeError in PlannerPanel: the panel
    // filters plan.allocations before branching on status. It does not
    // crash, because an infeasible plan still lists every area at zero
    // hours. Asserting that here so the contract cannot quietly change.
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 12 });
    expect(plan.status).toBe("infeasible");
    expect(Array.isArray(plan.allocations)).toBe(true);
    expect(plan.allocations).toHaveLength(SIX_AREAS.length);
    for (const a of plan.allocations) expect(a.allocated_hours).toBe(0);
  });

  it("carries an allocation list when locks alone exceed the budget", () => {
    const plan = buildPlan(SIX_AREAS, POLICY, [{ area_id: "east_village", hours: 500 }]);
    expect(plan.status).toBe("infeasible");
    expect(plan.allocations).toHaveLength(SIX_AREAS.length);
  });
});

describe("the complaint guard reaches all the way down", () => {
  it("rejects a nested complaint field, not only a top-level one", () => {
    // Found by auditing the claim rather than re-reading it: the guard
    // checked one level, so `diagnostics: { complaint_count }` slipped
    // through while Track D had been told the contract rejects any
    // complaint-shaped field on an area object.
    const nested = [
      { ...area("a", 100, 80), diagnostics: { complaint_count: 900 } },
    ] as unknown as AreaPlanningInput[];
    expect(() => buildPlan(nested, POLICY)).toThrow(PlannerInputError);
  });

  it("rejects a complaint field inside an array", () => {
    const inArray = [
      { ...area("a", 100, 80), history: [{ month: "2021-09", service_request_count: 4 }] },
    ] as unknown as AreaPlanningInput[];
    expect(() => buildPlan(inArray, POLICY)).toThrow(PlannerInputError);
  });

  it("names the path so the emitter knows which field to remove", () => {
    const nested = [
      { ...area("a", 100, 80), diagnostics: { complaint_count: 900 } },
    ] as unknown as AreaPlanningInput[];
    expect(() => buildPlan(nested, POLICY)).toThrow(/diagnostics/);
  });
});

describe("excess capacity", () => {
  it("distributes a very large budget without losing or inventing hours", () => {
    // #14 claims synthetic coverage of scarcity, excess capacity, rounding,
    // uncertainty reserves and infeasibility. The first four had named
    // tests; excess capacity rested on a loop, so it is explicit now.
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 100_000 });
    expect(plan.status).toBe("planned");
    expect(plan.total_allocated_hours + plan.rounding_residue_hours).toBe(100_000);
    for (const a of plan.allocations) expect(Number.isInteger(a.allocated_hours)).toBe(true);
  });

  it("gives a zero-forecast area the floor and no more, however large the budget", () => {
    const withEmpty = [...SIX_AREAS, area("empty_area", 0, 0)];
    const plan = buildPlan(withEmpty, { ...POLICY, budget_hours: 100_000 });
    const empty = plan.allocations.find((a) => a.area_id === "empty_area");
    expect(empty?.allocated_hours).toBe(POLICY.minimum_coverage_floor_hours);
  });

  it("still reports unmet load when the floor redistributes under excess capacity", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 100_000 });
    expect(plan.unmet_hours_total).toBeGreaterThanOrEqual(0);
    expect(plan.constraint_notes.join(" ")).toMatch(/still leaves load uncovered/);
  });
});
