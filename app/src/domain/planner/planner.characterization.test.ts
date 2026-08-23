/**
 * Characterization tests for `domain/planner`: what `buildPlan` produces
 * today, field for field, so a later refactor is provably non-breaking.
 * A failure here is the file working — read the diff before touching a literal.
 *
 * `buildPlan` is not on the shipped path; see PHASE0_FINDINGS.md F-1.
 */

import { describe, expect, it } from "vitest";

import { buildPlan } from "./planner.ts";
import type { AreaPlanningInput, PlannerPolicy } from "./types.ts";

/** Fixed inputs. Mirrors `planner.test.ts` so the two files agree on a world. */
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

// ---- base ----
const BASE_EXPECTED = {
  status: "planned",
  allocations: [
    {
      area_id: "barrio_logan",
      label: "barrio_logan",
      allocated_hours: 11,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 46,
      unguarded_hours: 10,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "5 hours from the discretionary remainder, in proportion to a relative load of 46.0 built from the upper prediction bound (40) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "cortez_hill",
      label: "cortez_hill",
      allocated_hours: 8,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 21,
      unguarded_hours: 4,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "2 hours from the discretionary remainder, in proportion to a relative load of 21.0 built from the upper prediction bound (18) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "east_village",
      label: "east_village",
      allocated_hours: 29,
      floor_hours: 6,
      continuity_reserve_hours: 4,
      relative_load: 170,
      unguarded_hours: 37,
      unmet_hours: 8,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours of continuity reserve because the drop test returned possible_displacement, which preserves outreach continuity where a local decline coincides with nearby aggregate increases.",
        "19 hours from the discretionary remainder, in proportion to a relative load of 170.0 built from the upper prediction bound (150) and its interval width.",
        "8 fewer hours than a plan without the coverage floor would have given this area.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "gaslamp",
      label: "gaslamp",
      allocated_hours: 13,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 68,
      unguarded_hours: 15,
      unmet_hours: 2,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "7 hours from the discretionary remainder, in proportion to a relative load of 68.0 built from the upper prediction bound (60) and its interval width.",
        "2 fewer hours than a plan without the coverage floor would have given this area.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "golden_hill",
      label: "golden_hill",
      allocated_hours: 9,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 25,
      unguarded_hours: 5,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "3 hours from the discretionary remainder, in proportion to a relative load of 25.0 built from the upper prediction bound (22) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "sherman_heights",
      label: "sherman_heights",
      allocated_hours: 10,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 40,
      unguarded_hours: 9,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 40.0 built from the upper prediction bound (35) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
  ],
  budget_hours: 80,
  total_allocated_hours: 80,
  rounding_residue_hours: 0,
  unmet_hours_total: 10,
  locked_area_count: 0,
  constraint_notes: [
    "Every included area received at least 6 hours.",
    "The budget sets how many hours exist. Allocating every hour still leaves load uncovered.",
  ],
  infeasible_reasons: [],
} as const;

// ---- locked ----
const LOCKED_EXPECTED = {
  status: "planned",
  allocations: [
    {
      area_id: "barrio_logan",
      label: "barrio_logan",
      allocated_hours: 10,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 46,
      unguarded_hours: 9,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 46.0 built from the upper prediction bound (40) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "cortez_hill",
      label: "cortez_hill",
      allocated_hours: 8,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 21,
      unguarded_hours: 4,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "2 hours from the discretionary remainder, in proportion to a relative load of 21.0 built from the upper prediction bound (18) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "east_village",
      label: "east_village",
      allocated_hours: 25,
      floor_hours: 6,
      continuity_reserve_hours: 4,
      relative_load: 170,
      unguarded_hours: 34,
      unmet_hours: 9,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours of continuity reserve because the drop test returned possible_displacement, which preserves outreach continuity where a local decline coincides with nearby aggregate increases.",
        "15 hours from the discretionary remainder, in proportion to a relative load of 170.0 built from the upper prediction bound (150) and its interval width.",
        "9 fewer hours than a plan without the coverage floor would have given this area.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "gaslamp",
      label: "gaslamp",
      allocated_hours: 20,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 68,
      unguarded_hours: 20,
      unmet_hours: 0,
      locked: true,
      included: true,
      reasons: [
        "20 hours set by the coordinator and preserved through recomputation.",
        "Only the unlocked remainder was recalculated.",
      ],
    },
    {
      area_id: "golden_hill",
      label: "golden_hill",
      allocated_hours: 8,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 25,
      unguarded_hours: 5,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "2 hours from the discretionary remainder, in proportion to a relative load of 25.0 built from the upper prediction bound (22) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "sherman_heights",
      label: "sherman_heights",
      allocated_hours: 9,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 40,
      unguarded_hours: 8,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "3 hours from the discretionary remainder, in proportion to a relative load of 40.0 built from the upper prediction bound (35) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
  ],
  budget_hours: 80,
  total_allocated_hours: 80,
  rounding_residue_hours: 0,
  unmet_hours_total: 9,
  locked_area_count: 1,
  constraint_notes: [
    "Every included area received at least 6 hours.",
    "1 of 6 assignments were set by the coordinator.",
    "The budget sets how many hours exist. Allocating every hour still leaves load uncovered.",
  ],
  infeasible_reasons: [],
} as const;

// ---- coarse ----
const COARSE_EXPECTED = {
  status: "planned",
  allocations: [
    {
      area_id: "barrio_logan",
      label: "barrio_logan",
      allocated_hours: 12,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 46,
      unguarded_hours: 12,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 46.0 built from the upper prediction bound (40) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "cortez_hill",
      label: "cortez_hill",
      allocated_hours: 8,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 21,
      unguarded_hours: 4,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "east_village",
      label: "east_village",
      allocated_hours: 28,
      floor_hours: 6,
      continuity_reserve_hours: 4,
      relative_load: 170,
      unguarded_hours: 40,
      unmet_hours: 12,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours of continuity reserve because the drop test returned possible_displacement, which preserves outreach continuity where a local decline coincides with nearby aggregate increases.",
        "16 hours from the discretionary remainder, in proportion to a relative load of 170.0 built from the upper prediction bound (150) and its interval width.",
        "12 fewer hours than a plan without the coverage floor would have given this area.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "gaslamp",
      label: "gaslamp",
      allocated_hours: 12,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 68,
      unguarded_hours: 16,
      unmet_hours: 4,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 68.0 built from the upper prediction bound (60) and its interval width.",
        "4 fewer hours than a plan without the coverage floor would have given this area.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "golden_hill",
      label: "golden_hill",
      allocated_hours: 12,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 25,
      unguarded_hours: 4,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 25.0 built from the upper prediction bound (22) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
    {
      area_id: "sherman_heights",
      label: "sherman_heights",
      allocated_hours: 12,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 40,
      unguarded_hours: 8,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: [
        "6 hours from the minimum-coverage floor, applied to every included area so lower-visibility places are not left uncovered.",
        "4 hours from the discretionary remainder, in proportion to a relative load of 40.0 built from the upper prediction bound (35) and its interval width.",
        "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
      ],
    },
  ],
  budget_hours: 85,
  total_allocated_hours: 84,
  rounding_residue_hours: 1,
  unmet_hours_total: 16,
  locked_area_count: 0,
  constraint_notes: [
    "1 hour(s) could not be split into whole 4-hour increments and are unallocated.",
    "Every included area received at least 6 hours.",
    "The budget sets how many hours exist. Allocating every hour still leaves load uncovered.",
  ],
  infeasible_reasons: [],
} as const;

// ---- infeasible ----
const INFEASIBLE_EXPECTED = {
  status: "infeasible",
  allocations: [
    {
      area_id: "barrio_logan",
      label: "barrio_logan",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 46,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
    {
      area_id: "cortez_hill",
      label: "cortez_hill",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 21,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
    {
      area_id: "east_village",
      label: "east_village",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 4,
      relative_load: 170,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
    {
      area_id: "gaslamp",
      label: "gaslamp",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 68,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
    {
      area_id: "golden_hill",
      label: "golden_hill",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 25,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
    {
      area_id: "sherman_heights",
      label: "sherman_heights",
      allocated_hours: 0,
      floor_hours: 6,
      continuity_reserve_hours: 0,
      relative_load: 40,
      unguarded_hours: 0,
      unmet_hours: 0,
      locked: false,
      included: true,
      reasons: ["No plan was produced: the budget cannot satisfy the coverage floor."],
    },
  ],
  budget_hours: 12,
  total_allocated_hours: 0,
  rounding_residue_hours: 0,
  unmet_hours_total: 0,
  locked_area_count: 0,
  constraint_notes: [],
  infeasible_reasons: [
    "The 6 unlocked areas require 40 allocatable hours to meet the 6-hour coverage floor and continuity reserves, but only 12 hours remain. Shortfall: 28 hours. Raise the budget or exclude an area. The planner does not lower the floor by itself.",
  ],
} as const;

describe("characterization: the default 80-hour plan", () => {
  it("reproduces every field, including each reason string", () => {
    expect(buildPlan(SIX_AREAS, POLICY)).toEqual(BASE_EXPECTED);
  });
});

describe("characterization: a coordinator lock", () => {
  it("reproduces every field with gaslamp locked at 20 hours", () => {
    expect(buildPlan(SIX_AREAS, POLICY, [{ area_id: "gaslamp", hours: 20 }])).toEqual(
      LOCKED_EXPECTED,
    );
  });
});

describe("characterization: a coarse time increment", () => {
  it("reproduces the 85-hour, 4-hour-increment plan including its residue note", () => {
    expect(buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 85, time_increment_hours: 4 })).toEqual(
      COARSE_EXPECTED,
    );
  });
});

describe("characterization: an infeasible budget", () => {
  it("reproduces the refusal, its shortfall arithmetic, and the empty allocation rows", () => {
    expect(buildPlan(SIX_AREAS, { ...POLICY, budget_hours: 12 })).toEqual(INFEASIBLE_EXPECTED);
  });
});
