/**
 * Characterization tests for the **shipped** allocation path. `App.tsx`
 * imports `allocateHours` from here, not from `domain/planner`
 * (PHASE0_FINDINGS.md F-1), so this is the file that pins observable behavior.
 *
 * A failure here is the file working. Two recorded surprises are asserted
 * as-is rather than fixed; see the SURPRISE comments.
 */

import { describe, expect, it } from "vitest";

import { EMBEDDED_DEMO } from "./demo.ts";
import { allocateHours } from "./planner.ts";

const A = EMBEDDED_DEMO.areas;

interface Case {
  feasible: boolean;
  message: string;
  hours: Record<string, number>;
}

function actual(result: ReturnType<typeof allocateHours>): Case {
  return {
    feasible: result.feasible,
    message: result.message,
    hours: Object.fromEntries(result.allocations.map((row) => [row.areaId, row.hours])),
  };
}

const EXPECTED: Record<string, Case> = {
  "guarded 80/8": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 14,
      columbia: 9,
      cortez: 11,
      east_village: 27,
      gaslamp: 10,
      marina: 9,
    },
  },
  "unguarded 80": {
    feasible: true,
    message: "No minimum applied: hours follow the forecast alone.",
    hours: {
      city_center: 15,
      columbia: 3,
      cortez: 9,
      east_village: 46,
      gaslamp: 5,
      marina: 2,
    },
  },
  "guarded 80/4": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 4 hours.",
    hours: {
      city_center: 15,
      columbia: 6,
      cortez: 10,
      east_village: 37,
      gaslamp: 7,
      marina: 5,
    },
  },
  "guarded 80/0": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 0 hours.",
    hours: {
      city_center: 15,
      columbia: 3,
      cortez: 9,
      east_village: 46,
      gaslamp: 5,
      marina: 2,
    },
  },
  "guarded 48/8 exact floor": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 8,
      columbia: 8,
      cortez: 8,
      east_village: 8,
      gaslamp: 8,
      marina: 8,
    },
  },
  "guarded 47/8 short": {
    feasible: false,
    message: "No feasible plan: locks and coverage floors require 48 hours, but the budget is 47.",
    hours: {},
  },
  "guarded 400/8": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 75,
      columbia: 20,
      cortez: 47,
      east_village: 213,
      gaslamp: 29,
      marina: 16,
    },
  },
  "guarded 0/0": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 0 hours.",
    hours: {
      city_center: 0,
      columbia: 0,
      cortez: 0,
      east_village: 0,
      gaslamp: 0,
      marina: 0,
    },
  },
  "lock ev26": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 14,
      columbia: 9,
      cortez: 12,
      east_village: 26,
      gaslamp: 10,
      marina: 9,
    },
  },
  "lock ev26+gl12": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 13,
      columbia: 9,
      cortez: 11,
      east_village: 26,
      gaslamp: 12,
      marina: 9,
    },
  },
  "lock below floor": {
    feasible: false,
    message: "Locked hours must be whole numbers at or above the 8-hour floor.",
    hours: {},
  },
  "lock all to budget": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 14,
      columbia: 9,
      cortez: 11,
      east_village: 27,
      gaslamp: 10,
      marina: 9,
    },
  },
  "lock all under budget": {
    feasible: false,
    message:
      "No feasible plan: every area is locked, leaving 20 unassigned hours. Unlock an area or make the locks sum to the budget.",
    hours: {},
  },
  "lock unknown area": {
    feasible: true,
    message: "Every one of the 6 neighborhoods keeps at least 8 hours.",
    hours: {
      city_center: 14,
      columbia: 9,
      cortez: 11,
      east_village: 27,
      gaslamp: 10,
      marina: 9,
    },
  },
  "fractional budget": {
    feasible: false,
    message: "The staff-hour budget must be a nonnegative whole number.",
    hours: {},
  },
  "negative budget": {
    feasible: false,
    message: "The staff-hour budget must be a nonnegative whole number.",
    hours: {},
  },
  "fractional floor guarded": {
    feasible: false,
    message: "The coverage-continuity floor must be a nonnegative whole number.",
    hours: {},
  },
  "empty areas": {
    feasible: false,
    message:
      "No feasible plan: every area is locked, leaving 80 unassigned hours. Unlock an area or make the locks sum to the budget.",
    hours: {},
  },
  "empty areas zero budget": {
    feasible: true,
    message: "Every one of the 0 neighborhoods keeps at least 8 hours.",
    hours: {},
  },
};

describe("characterization: the shipped planner without locks", () => {
  it("reproduces the guarded 80-hour / 8-hour-floor plan the README quotes", () => {
    expect(actual(allocateHours(A, 80, 8, true))).toEqual(EXPECTED["guarded 80/8"]);
  });

  it("reproduces the unguarded comparison plan", () => {
    expect(actual(allocateHours(A, 80, 8, false))).toEqual(EXPECTED["unguarded 80"]);
  });

  it("reproduces a 4-hour floor", () => {
    expect(actual(allocateHours(A, 80, 4, true))).toEqual(EXPECTED["guarded 80/4"]);
  });

  it("reproduces a 0-hour floor, which matches the unguarded split but not its message", () => {
    expect(actual(allocateHours(A, 80, 0, true))).toEqual(EXPECTED["guarded 80/0"]);
  });

  it("reproduces the budget exactly equal to the floor total", () => {
    expect(actual(allocateHours(A, 48, 8, true))).toEqual(EXPECTED["guarded 48/8 exact floor"]);
  });

  it("reproduces the refusal one hour below the floor total", () => {
    expect(actual(allocateHours(A, 47, 8, true))).toEqual(EXPECTED["guarded 47/8 short"]);
  });

  it("reproduces the plan at the 400-hour budget cap", () => {
    expect(actual(allocateHours(A, 400, 8, true))).toEqual(EXPECTED["guarded 400/8"]);
  });

  it("reproduces the all-zero plan at a zero budget and zero floor", () => {
    expect(actual(allocateHours(A, 0, 0, true))).toEqual(EXPECTED["guarded 0/0"]);
  });
});

describe("characterization: the shipped planner with locks", () => {
  it("reproduces one lock", () => {
    expect(actual(allocateHours(A, 80, 8, true, new Map([["east_village", 26]])))).toEqual(
      EXPECTED["lock ev26"],
    );
  });

  it("reproduces two locks", () => {
    expect(
      actual(
        allocateHours(
          A,
          80,
          8,
          true,
          new Map([
            ["east_village", 26],
            ["gaslamp", 12],
          ]),
        ),
      ),
    ).toEqual(EXPECTED["lock ev26+gl12"]);
  });

  it("reproduces the refusal when a lock sits below the floor", () => {
    expect(actual(allocateHours(A, 80, 8, true, new Map([["marina", 3]])))).toEqual(
      EXPECTED["lock below floor"],
    );
  });

  it("reproduces a fully locked plan that sums to the budget", () => {
    expect(
      actual(
        allocateHours(
          A,
          80,
          8,
          true,
          new Map([
            ["city_center", 14],
            ["columbia", 9],
            ["cortez", 11],
            ["east_village", 27],
            ["gaslamp", 10],
            ["marina", 9],
          ]),
        ),
      ),
    ).toEqual(EXPECTED["lock all to budget"]);
  });

  it("reproduces the refusal when every area is locked below the budget", () => {
    expect(
      actual(
        allocateHours(
          A,
          80,
          8,
          true,
          new Map([
            ["city_center", 10],
            ["columbia", 10],
            ["cortez", 10],
            ["east_village", 10],
            ["gaslamp", 10],
            ["marina", 10],
          ]),
        ),
      ),
    ).toEqual(EXPECTED["lock all under budget"]);
  });

  // SURPRISE S-1 (recorded, not fixed in Phase 0). A lock naming an area that
  // does not exist is silently discarded: the result is identical to passing
  // no locks at all. `domain/planner` throws PlannerInputError for the same
  // input ("lock references unknown area"). A mistyped area id therefore
  // vanishes without a message on the shipped path. Asserted as-is so the
  // current behavior is pinned; changing it is a deliberate later decision.
  it("SURPRISE: silently ignores a lock on an area that does not exist", () => {
    expect(actual(allocateHours(A, 80, 8, true, new Map([["nowhere", 10]])))).toEqual(
      EXPECTED["lock unknown area"],
    );
    expect(actual(allocateHours(A, 80, 8, true, new Map([["nowhere", 10]])))).toEqual(
      actual(allocateHours(A, 80, 8, true)),
    );
  });
});

describe("characterization: input validation on the shipped path", () => {
  it("reproduces the refusal for a fractional budget", () => {
    expect(actual(allocateHours(A, 80.5, 8, true))).toEqual(EXPECTED["fractional budget"]);
  });

  it("reproduces the refusal for a negative budget", () => {
    expect(actual(allocateHours(A, -1, 8, true))).toEqual(EXPECTED["negative budget"]);
  });

  it("reproduces the refusal for a fractional floor while guarded", () => {
    expect(actual(allocateHours(A, 80, 8.5, true))).toEqual(EXPECTED["fractional floor guarded"]);
  });

  // SURPRISE S-2 (recorded, not fixed in Phase 0). With no areas at all, the
  // refusal blames locks — "every area is locked, leaving 80 unassigned
  // hours. Unlock an area" — when nothing is locked and there is no area to
  // unlock. `domain/planner` says "No areas are included, so there is nowhere
  // to allocate the budget." The message is user-facing.
  it("SURPRISE: blames locks when the real problem is that there are no areas", () => {
    const result = actual(allocateHours([], 80, 8, true));
    expect(result).toEqual(EXPECTED["empty areas"]);
    expect(result.message).toContain("every area is locked");
  });

  it("reproduces the empty-area, zero-budget case as feasible with an empty plan", () => {
    expect(actual(allocateHours([], 0, 8, true))).toEqual(EXPECTED["empty areas zero budget"]);
  });
});

describe("characterization: the plan conserves and stays deterministic", () => {
  it("allocates exactly the budget at every feasible budget from 48 to 120", () => {
    for (let budget = 48; budget <= 120; budget += 1) {
      const result = allocateHours(A, budget, 8, true);
      expect(result.feasible).toBe(true);
      expect(result.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(budget);
    }
  });

  it("returns the same plan on repeated calls", () => {
    expect(actual(allocateHours(A, 80, 8, true))).toEqual(actual(allocateHours(A, 80, 8, true)));
  });
});
