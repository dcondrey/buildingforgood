import { describe, expect, it } from "vitest";

import { COMPLAINT_SIGNAL } from "../vocabulary/refusedTerms.ts";
import { assertNoComplaintSignal, buildPlan, PlannerInputError, relativeLoad } from "./planner.ts";
import type { AreaPlanningInput, DropTestResult, PlannerPolicy } from "./types.ts";

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
    // Every whole budget in the range, not every seventh: "every" in the
    // name should mean every.
    for (let budget = 40; budget <= 400; budget += 1) {
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
    // "Only" over the whole closed set of classifications, not the two the
    // default fixture happens to contain. DropTestResult has three members and
    // all three are placed here, so a fourth added to the union without a
    // decision about its reserve fails the exhaustiveness check below.
    const classifications: DropTestResult[] = [
      "likely_improvement",
      "possible_displacement",
      "insufficient_evidence",
    ];
    const plan = buildPlan(
      classifications.map((drop_test, index) => area(`a${index}`, 60, 44, { drop_test })),
      POLICY,
    );
    const reserveFor = (index: number) =>
      plan.allocations.find((a) => a.area_id === `a${index}`)?.continuity_reserve_hours;
    expect(classifications.map((_, index) => reserveFor(index))).toEqual([0, 4, 0]);
  });

  it("has exactly the three drop-test classifications this suite enumerates", () => {
    // The guard for the test above: it can only claim "only" while it covers
    // every member of the union.
    const enumerated: Record<DropTestResult, true> = {
      likely_improvement: true,
      possible_displacement: true,
      insufficient_evidence: true,
    };
    expect(Object.keys(enumerated)).toHaveLength(3);
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

// The name of this block is the narrow claim, not the wide one. "Complaint
// volume cannot influence planning" was tested, falsified, and withdrawn:
// 311 counts written into `planning_load` are a legally named, correctly
// typed number and no name-based guard can see them. See
// `docs/project/DECISIONS.md`. What is asserted here is that a
// complaint-SHAPED FIELD is refused.
describe("a complaint-shaped field is refused on the domain planner", () => {
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
    // "Every" is checked against the shared refusal vocabulary rather than a
    // hand-listed four: a term added to COMPLAINT_SIGNAL but never wired into
    // the walk shows up here instead of shipping unchecked, and a term added
    // in a new language is covered the day it lands.
    const tokens = COMPLAINT_SIGNAL.source.split("|").map((term) => term.replace(/\?/g, ""));
    expect(tokens.length).toBeGreaterThanOrEqual(5);
    for (const token of tokens) {
      expect(() => assertNoComplaintSignal({ [token]: 1 }, "area x"), token).toThrow(
        PlannerInputError,
      );
      expect(
        () => assertNoComplaintSignal({ [`area_${token}_total`]: 1 }, "area x"),
        token,
      ).toThrow(PlannerInputError);
    }
  });

  it("refuses an undeclared complaint-shaped field and ignores an undeclared neutral one", () => {
    // Complaint volume has no representation in the input type, so two areas
    // differing only in real-world complaint volume are literally the same
    // input. That is a statement about the type, not about what a number in
    // `planning_load` can do — see the block comment above.
    const quiet = area("a", 100, 80);
    const loud = area("a", 100, 80);
    expect(relativeLoad(quiet, POLICY)).toBe(relativeLoad(loud, POLICY));
    expect(buildPlan([quiet, area("b", 50, 40)], POLICY)).toEqual(
      buildPlan([loud, area("b", 50, 40)], POLICY),
    );

    // Identical inputs proving each other equal would pass with the guard
    // deleted, so assert the two halves that actually carry the claim: a
    // complaint-shaped field is refused outright, and an undeclared field
    // that is not complaint-shaped changes nothing about the plan.
    const baseline = buildPlan(SIX_AREAS, POLICY);
    const withComplaints = SIX_AREAS.map(
      (input) => ({ ...input, complaint_count: 900 }) as unknown as AreaPlanningInput,
    );
    expect(() => buildPlan(withComplaints, POLICY)).toThrow(PlannerInputError);
    const withNeutralExtras = SIX_AREAS.map(
      (input) =>
        ({
          ...input,
          operator_note: "called in by a neighbor",
          shift_index: 3,
        }) as AreaPlanningInput,
    );
    expect(buildPlan(withNeutralExtras, POLICY)).toEqual(baseline);
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

  it("declares a lock below the coverage guarantee infeasible", () => {
    const plan = buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 0 }]);
    expect(plan.status).toBe("infeasible");
    expect(plan.infeasible_reasons.join(" ")).toMatch(/lock.*below.*coverage guarantee/i);
    expect(plan.constraint_notes).not.toContain("Every included area received at least 6 hours.");
  });

  it("rejects duplicate, excluded, and off-increment locks", () => {
    expect(() =>
      buildPlan(SIX_AREAS, POLICY, [
        { area_id: "gaslamp", hours: 10 },
        { area_id: "gaslamp", hours: 12 },
      ]),
    ).toThrow(/duplicate lock/i);
    expect(() =>
      buildPlan([...SIX_AREAS, area("excluded", 10, 5, { included: false })], POLICY, [
        { area_id: "excluded", hours: 6 },
      ]),
    ).toThrow(/excluded area/i);
    expect(() => buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 6.5 }])).toThrow(
      /whole 1-hour increments/i,
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
  it("reports what an unguarded plan would have given the highest-load and the smallest area", () => {
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
    // Locked areas were outside this check while the name covered them.
    // They carry a reason too; only the floor sentence is specific to the
    // areas the planner actually computed.
    for (const locks of [[], [{ area_id: "gaslamp", hours: 20 }]]) {
      const plan = buildPlan(SIX_AREAS, POLICY, locks);
      for (const a of plan.allocations.filter((x) => x.included)) {
        expect(a.reasons.length, a.area_id).toBeGreaterThan(0);
      }
      for (const a of plan.allocations.filter((x) => x.included && !x.locked)) {
        expect(a.reasons.join(" "), a.area_id).toMatch(/minimum-coverage floor/);
      }
    }
  });

  it("states that the plan is a capacity split, not a need estimate", () => {
    const plan = buildPlan(SIX_AREAS, POLICY);
    expect(plan.constraint_notes.join(" ")).toMatch(/still leaves load uncovered/);
  });

  it("never uses causal, enforcement, or individual-movement language", () => {
    // "Never" over every prose surface the planner emits — infeasible
    // reasons included, which the one-plan version never read — and over
    // every plan shape a coordinator can produce.
    const shapes: Array<[string, () => ReturnType<typeof buildPlan>]> = [
      ["default", () => buildPlan(SIX_AREAS, POLICY)],
      ["infeasible", () => buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 12 })],
      ["locked", () => buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 20 }])],
      ["lock below floor", () => buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 0 }])],
      ["excess capacity", () => buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 100_000 })],
      ["zero load", () => buildPlan([area("a", 0), area("b", 0)], { ...POLICY, budget_hours: 30 })],
    ];
    for (const [name, make] of shapes) {
      const plan = make();
      const prose = [
        ...plan.constraint_notes,
        ...plan.infeasible_reasons,
        ...plan.allocations.flatMap((a) => a.reasons),
      ].join(" ");
      expect(prose, name).not.toMatch(
        /\b(caused|because of|due to|sweep|enforce|cleared|moved to|relocat)/i,
      );
    }
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

  it("rejects a non-finite increment", () => {
    expect(() => buildPlan(SIX_AREAS, { ...POLICY, time_increment_hours: Infinity })).toThrow(
      /finite number/i,
    );
  });

  it("declares rounded guarantees infeasible before they can exceed the budget", () => {
    const plan = buildPlan([area("a", 10), area("b", 10)], {
      ...POLICY,
      budget_hours: 1.2,
      time_increment_hours: 1,
      minimum_coverage_floor_hours: 0.6,
      continuity_reserve_hours: 0,
    });
    expect(plan.status).toBe("infeasible");
    expect(plan.total_allocated_hours).toBe(0);
  });

  it("declares an empty included set infeasible", () => {
    const plan = buildPlan([area("excluded", 10, 5, { included: false })], POLICY);
    expect(plan.status).toBe("infeasible");
    expect(plan.infeasible_reasons.join(" ")).toMatch(/no areas are included/i);
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
    // "However large" over a range rather than one value: the discretionary
    // remainder grows with the budget, and the property being claimed is that
    // none of it reaches an area with no forecast, at any budget.
    const withEmpty = [...SIX_AREAS, area("empty_area", 0, 0)];
    for (const budget_hours of [80, 500, 5_000, 100_000, 1_000_000]) {
      const plan = buildPlan(withEmpty, { ...POLICY, budget_hours });
      const empty = plan.allocations.find((a) => a.area_id === "empty_area");
      expect(empty?.allocated_hours, `budget ${budget_hours}`).toBe(
        POLICY.minimum_coverage_floor_hours,
      );
    }
  });

  it("still reports unmet load when the floor redistributes under excess capacity", () => {
    const plan = buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 100_000 });
    expect(plan.unmet_hours_total).toBeGreaterThanOrEqual(0);
    expect(plan.constraint_notes.join(" ")).toMatch(/still leaves load uncovered/);
  });
});
