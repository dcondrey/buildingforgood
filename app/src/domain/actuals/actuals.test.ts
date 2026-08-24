/**
 * Guards for the actuals loader.
 *
 * Sparse on purpose: a well-formed file must pass, every required field must
 * fail loudly by name when it is removed, and the invariants that would
 * quietly change what this file is — a published small cell, a person-level
 * or complaint-shaped field, a contract that declares a weaker policy than
 * the one enforced — must be refused.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import schema from "../../../../config/schema/actuals.v1.schema.json" with { type: "json" };
import {
  ActualsError,
  BASELINE_WILL_NEVER_COMPUTE,
  hasRecordedActuals,
  parseActuals,
  SMALL_CELL_THRESHOLD,
  suppressEngagementCount,
  validateActuals,
} from "./actuals.ts";

const VALID = {
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
      area_id: "east_village",
      month: "2026-05",
      hours: { allocated_hours: 24, delivered_hours: 21.5 },
      engagement: { count: 63, suppressed: false },
    },
    {
      area_id: "gaslamp",
      month: "2026-05",
      hours: { allocated_hours: 8, delivered_hours: 8 },
      engagement: { count: null, suppressed: true },
    },
    {
      area_id: "cortez",
      month: "2026-05",
      hours: { allocated_hours: 8, delivered_hours: 0 },
      engagement: { count: null, suppressed: false, not_recorded: true },
    },
  ],
  intended_analysis: {
    status: "documented_not_implemented",
    preconditions: ["At least twelve area-months of delivered hours across at least three areas."],
    planned_when_data_exists: ["Descriptive planned-versus-delivered hours by area and month."],
    will_never_compute: [...BASELINE_WILL_NEVER_COMPUTE],
    rationale: "These numbers describe delivery, not people, and cannot carry the other weight.",
  },
};

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(VALID)) as Record<string, unknown>;
}

function rows(document: Record<string, unknown>): Array<Record<string, Record<string, unknown>>> {
  return document.area_months as Array<Record<string, Record<string, unknown>>>;
}

describe("a well-formed actuals file", () => {
  it("validates with no errors", () => {
    const result = validateActuals(VALID);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(hasRecordedActuals(parseActuals(VALID))).toBe(true);
  });

  it("treats an empty file as valid and empty, not as an error", () => {
    const document = clone();
    document.area_months = [];
    const result = validateActuals(document);
    expect(result.ok).toBe(true);
    expect(hasRecordedActuals(result.document!)).toBe(false);
  });

  it("checks the file against the deployment it claims to belong to", () => {
    const result = validateActuals(VALID, {
      expectedProfileId: "san-diego-dsdp-seven",
      knownAreaIds: ["north_ridge"],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.field === "profile_id")).toBe(true);
    expect(result.errors.some((issue) => issue.field === "area_months[0].area_id")).toBe(true);
  });
});

describe("a missing required field fails loudly and by name", () => {
  // Read from the schema rather than hand-listed: a field added to
  // `required` there is covered here the day it lands, and a hand-listed
  // set silently stops covering new members.
  const topLevel = schema.required;

  it("takes its field list from the schema, not from a copy of it", () => {
    expect(topLevel.length).toBeGreaterThan(0);
    expect(topLevel.every((field) => field in VALID)).toBe(true);
  });

  it.each(topLevel)("names `%s` when it is missing", (field) => {
    const document = clone();
    delete document[field];
    const result = validateActuals(document);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.field.startsWith(field))).toBe(true);
  });

  it("names the exact nested field, not just its parent", () => {
    const document = clone();
    delete rows(document)[0].hours.delivered_hours;
    try {
      parseActuals(document);
      expect.unreachable("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ActualsError);
      expect((error as Error).message).toContain("area_months[0].hours.delivered_hours");
    }
  });
});

describe("the suppression policy applies exactly as it does to observations", () => {
  it("uses the same threshold the pipeline's suppressor uses", () => {
    // The name of this block claims equivalence with the observations policy,
    // and until this test existed nothing checked it: SMALL_CELL_THRESHOLD in
    // actuals.ts is a hand-copied mirror of the one in suppress.py, so raising
    // the pipeline's threshold to 10 would leave every test below green while
    // the two policies silently diverged. Read the Python rather than trust the
    // comment that says they match.
    const suppressor = readFileSync(
      fileURLToPath(
        new URL("../../../../pipeline/src/stillhere_pipeline/suppress.py", import.meta.url),
      ),
      "utf8",
    );
    const declared = /^SMALL_CELL_THRESHOLD\s*=\s*(\d+)/m.exec(suppressor);
    expect(declared?.[1], "suppress.py no longer declares SMALL_CELL_THRESHOLD").toBeDefined();
    expect(Number(declared?.[1])).toBe(SMALL_CELL_THRESHOLD);
  });

  it("rejects a published engagement count below the threshold", () => {
    const document = clone();
    rows(document)[0].engagement = { count: 3, suppressed: false };
    const result = validateActuals(document);
    expect(result.ok).toBe(false);
    const issue = result.errors.find((e) => e.field === "area_months[0].engagement.count");
    expect(issue?.message).toContain("below the small-cell threshold of 5");
  });

  it("publishes zero, which identifies nobody", () => {
    const document = clone();
    rows(document)[0].engagement = { count: 0, suppressed: false };
    expect(validateActuals(document).ok).toBe(true);
  });

  it("refuses a suppressed row that ships the number anyway", () => {
    const document = clone();
    rows(document)[1].engagement = { count: 2, suppressed: true };
    const result = validateActuals(document);
    expect(result.errors.some((e) => e.field === "area_months[1].engagement.count")).toBe(true);
  });

  it("refuses a bare null that a reader would take for zero", () => {
    const document = clone();
    rows(document)[1].engagement = { count: null, suppressed: false };
    expect(validateActuals(document).ok).toBe(false);
  });

  it("produces the accepted form from a raw count", () => {
    expect(suppressEngagementCount(3)).toEqual({ count: null, suppressed: true });
    expect(suppressEngagementCount(0)).toEqual({ count: 0, suppressed: false });
    expect(suppressEngagementCount(41)).toEqual({ count: 41, suppressed: false });
  });

  it("refuses a file that declares a weaker policy than the one enforced", () => {
    const document = clone();
    (document.contract as Record<string, unknown>).small_cell_threshold = 3;
    const result = validateActuals(document);
    expect(result.ok).toBe(false);
    expect(result.errors[0].field).toBe("contract.small_cell_threshold");
  });
});

describe("the invariants an actuals file cannot weaken", () => {
  it("rejects a person-level identifier anywhere in the document", () => {
    // "Anywhere" means every depth the walker reaches: the root, a nested
    // block, an array element, and a block inside an array element.
    const placements: Array<[string, (document: Record<string, unknown>) => void]> = [
      ["client_id", (d) => void (d.client_id = "44913")],
      [
        "reporting.client_name",
        (d) => void ((d.reporting as Record<string, unknown>).client_name = "x"),
      ],
      ["area_months[0].client_id", (d) => void (rows(d)[0].client_id = "44913" as never)],
      ["area_months[0].hours.person_id", (d) => void (rows(d)[0].hours.person_id = "x")],
    ];
    for (const [field, place] of placements) {
      const document = clone();
      place(document);
      const result = validateActuals(document);
      expect(result.ok, field).toBe(false);
      const issue = result.errors.find((e) => e.field === field);
      expect(issue?.message, field).toContain("not representable");
    }
  });

  it("rejects a street address hidden in a free-text note", () => {
    const document = clone();
    rows(document)[0].note = "Team relocated to 1401 Imperial Avenue for the month" as never;
    const result = validateActuals(document);
    expect(result.errors.some((e) => e.field === "area_months[0].note")).toBe(true);
  });

  it("rejects a complaint-shaped field, and a complaint measure in disguise", () => {
    for (const place of [
      (d: Record<string, unknown>) => void (d.complaint_count = 12),
      (d: Record<string, unknown>) => void (rows(d)[0].complaint_count = 12 as never),
      (d: Record<string, unknown>) => void (rows(d)[0].hours.calls_311 = 12),
    ]) {
      const withField = clone();
      place(withField);
      expect(validateActuals(withField).ok).toBe(false);
    }

    const withMeasure = clone();
    (withMeasure.engagement_measure as Record<string, unknown>).definition =
      "One 311 service request closed by the team.";
    const result = validateActuals(withMeasure);
    expect(result.errors.some((e) => e.field === "engagement_measure.definition")).toBe(true);
  });

  it("rejects any field the schema does not define", () => {
    // "Any field" includes the nested ones. A closed schema checked only at
    // the root is a schema with an open interior.
    const placements: Array<[string, (document: Record<string, unknown>) => void]> = [
      ["encounters", (d) => void (d.encounters = [])],
      ["reporting.mystery", (d) => void ((d.reporting as Record<string, unknown>).mystery = 1)],
      ["area_months[0].hours.mystery", (d) => void (rows(d)[0].hours.mystery = 1)],
    ];
    for (const [field, place] of placements) {
      const document = clone();
      place(document);
      expect(
        validateActuals(document).errors.some((e) => e.field === field),
        field,
      ).toBe(true);
    }
  });

  it("refuses to let an adopter delete a baseline exclusion", () => {
    const document = clone();
    const analysis = document.intended_analysis as Record<string, string[]>;
    analysis.will_never_compute = analysis.will_never_compute.filter(
      (entry) => entry !== "enforcement_abatement_or_removal_prioritization",
    );
    const result = validateActuals(document);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("enforcement_abatement_or_removal_prioritization");
  });

  it("refuses a deduplicated unique-persons measure", () => {
    const document = clone();
    (document.engagement_measure as Record<string, unknown>).unique_persons_measure = true;
    expect(validateActuals(document).ok).toBe(false);
  });

  it("refuses a second row for the same area-month", () => {
    const document = clone();
    rows(document).push(JSON.parse(JSON.stringify(rows(document)[0])));
    expect(validateActuals(document).ok).toBe(false);
  });
});
