/**
 * What the planned-against-delivered view is allowed to say.
 *
 * Sparse, like the loader's own suite. The arithmetic is one subtraction and
 * needs one test; the rest of these are the properties that would quietly turn
 * a description into something the file's own never-list forbids — an order
 * that ranks, a total that reopens subtraction recovery, or an absence
 * rendered as a zero.
 */

import { describe, expect, it } from "vitest";

import { NOT_SCORABLE_FROM_ACTUALS, compareMonth, latestMonth, monthsReported } from "./compare.ts";
import { parseActuals } from "./actuals.ts";
import { BASELINE_WILL_NEVER_COMPUTE } from "./actuals.ts";
import type { ActualsDocument } from "./types.ts";

const IN_SCOPE = ["city_center", "columbia", "cortez", "east_village", "gaslamp", "marina"];

/**
 * Test-only, and obviously so: the shape comes from the worked example in
 * `docs/project/ACTUALS.md`, the area ids from the reference profile's own
 * area list, and no figure in it is presented anywhere as a measurement.
 */
const FIXTURE: ActualsDocument = parseActuals({
  schema_version: "actuals/v1",
  profile_id: "san-diego-downtown",
  geography_version: "dsdp-core-six/2026-08-21",
  reporting: {
    organization_name: "Example Outreach Collaborative",
    reported_by_role: "Outreach Program Manager",
    method_note: "Shift leads tally at end of shift; hours come from the scheduling roster.",
    last_updated: "2026-08-01",
  },
  engagement_measure: {
    kind: "contacts",
    label: "street contacts",
    definition: "One conversation with one person on one shift, however brief.",
    collection_method: "Paper tally sheet, entered weekly.",
    counts_encounters_not_people: true,
    unique_persons_measure: false,
  },
  contract: {
    grain: "area_month_aggregate",
    count_fields: ["engagement.count"],
    small_cell_threshold: 5,
    suppression_marker: { field: "suppressed", affirmative_values: [true] },
  },
  area_months: [
    {
      area_id: "gaslamp",
      month: "2026-06",
      hours: { allocated_hours: 8, delivered_hours: 8 },
      engagement: { count: null, suppressed: true },
    },
    {
      area_id: "east_village",
      month: "2026-06",
      hours: { allocated_hours: 24, delivered_hours: 21.5 },
      engagement: { count: 63, suppressed: false },
    },
    {
      area_id: "cortez",
      month: "2026-06",
      hours: { allocated_hours: null, delivered_hours: 6 },
      engagement: { count: null, suppressed: false, not_recorded: true },
    },
    {
      area_id: "east_village",
      month: "2026-05",
      hours: { allocated_hours: 16, delivered_hours: 19 },
      engagement: { count: 40, suppressed: false },
    },
  ],
  intended_analysis: {
    status: "documented_not_implemented",
    preconditions: ["At least twelve area-months of delivered hours across at least three areas."],
    planned_when_data_exists: ["Descriptive planned-versus-delivered hours by area and month."],
    will_never_compute: [...BASELINE_WILL_NEVER_COMPUTE],
    rationale: "These numbers describe delivery, not people, and cannot carry the other weight.",
  },
});

describe("the months a file reports", () => {
  it("lists them most recent first, without repeating one", () => {
    expect(monthsReported(FIXTURE)).toEqual(["2026-06", "2026-05"]);
    expect(latestMonth(FIXTURE)).toBe("2026-06");
  });
});

describe("planned against delivered", () => {
  const comparison = compareMonth(FIXTURE, "2026-06", IN_SCOPE);

  it("subtracts delivered hours from planned ones, and nothing else", () => {
    const eastVillage = comparison.rows.find((row) => row.area_id === "east_village");
    expect(eastVillage?.planned_hours).toBe(24);
    expect(eastVillage?.delivered_hours).toBe(21.5);
    expect(eastVillage?.plan_error_hours).toBeCloseTo(2.5, 10);

    const gaslamp = comparison.rows.find((row) => row.area_id === "gaslamp");
    expect(gaslamp?.plan_error_hours).toBe(0);
  });

  it("orders rows by the deployment's area order, never by hours or by error", () => {
    // C-01 R-02 applies here as it does to allocation: a list ordered by who
    // fell furthest behind is a ranking of teams, and this file's own
    // `will_never_compute` names staff_or_team_performance_ranking.
    expect(comparison.rows.map((row) => row.area_id)).toEqual([
      "cortez",
      "east_village",
      "gaslamp",
    ]);
    const reversed = compareMonth(FIXTURE, "2026-06", [...IN_SCOPE].reverse());
    expect(reversed.rows.map((row) => row.area_id)).toEqual(["gaslamp", "east_village", "cortez"]);
  });

  it("leaves a month with no plan unresolved rather than calling the error zero", () => {
    const cortez = comparison.rows.find((row) => row.area_id === "cortez");
    expect(cortez?.planned_hours).toBeNull();
    expect(cortez?.plan_error_hours).toBeNull();
    expect(comparison.areas_without_a_plan).toEqual(["cortez"]);
  });

  it("names the in-scope areas that reported no row, rather than showing them at zero", () => {
    expect(comparison.areas_without_a_row).toEqual(["city_center", "columbia", "marina"]);
    expect(comparison.rows.map((row) => row.area_id)).not.toContain("city_center");
  });

  it("carries a suppressed count through as suppressed, never as a number", () => {
    const gaslamp = comparison.rows.find((row) => row.area_id === "gaslamp");
    expect(gaslamp?.engagement).toEqual({ count: null, suppressed: true });
  });

  it("publishes no total, across areas or across months", () => {
    // `published_rollup_totals_across_areas_or_months` is on every file's
    // baseline never-list because a sum lets a reader subtract their way back
    // to the suppressed count inside it. The absence is the enforcement.
    for (const key of Object.keys(comparison)) {
      expect(key).not.toMatch(/total|sum|rollup|aggregate/i);
    }
    for (const row of comparison.rows) {
      for (const key of Object.keys(row)) {
        expect(key).not.toMatch(/total|sum|rollup|rank|score/i);
      }
    }
  });

  it("keeps a month with no rows empty rather than inventing one", () => {
    const none = compareMonth(FIXTURE, "2026-01", IN_SCOPE);
    expect(none.rows).toEqual([]);
    expect(none.areas_without_a_row).toEqual(IN_SCOPE);
  });
});

describe("the limitations this comparison does not close", () => {
  it("still records every one of them", () => {
    // The declared-limitation pattern from `UNSHIPPED_CONNECTORS`. If someone
    // later implements forecast scoring against actuals, this entry has to be
    // deleted to make the claim, and deleting it fails here — which is the
    // point. `ActualsPanel.test.tsx` requires each entry to reach the screen.
    expect(Object.keys(NOT_SCORABLE_FROM_ACTUALS).sort()).toEqual([
      "area_change",
      "count_forecast",
      "engagement_response",
    ]);
    for (const [name, reason] of Object.entries(NOT_SCORABLE_FROM_ACTUALS)) {
      expect(reason.length, name).toBeGreaterThan(80);
    }
  });

  it("exposes no function that scores a forecast or attributes a change", async () => {
    const surface = await import("./index.ts");
    for (const name of Object.keys(surface)) {
      expect(name).not.toMatch(/forecastError|scoreForecast|attribut|effect|impact/i);
    }
  });
});
