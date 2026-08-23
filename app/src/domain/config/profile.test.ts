/**
 * Guards for the organization-profile loader.
 *
 * Sparse on purpose: the shipped profiles must validate, every required field
 * must fail loudly by name when it is removed, and the two invariants that
 * would quietly change what this product is — a complaint-shaped field and an
 * unresolved provenance dressed up as a source — must be refused.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import schema from "../../../../config/schema/organization-profile.v1.schema.json" with { type: "json" };
import rural from "../../../../config/profiles/coldwater-valley-rural.v1.json" with { type: "json" };
import sanDiego from "../../../../config/profiles/san-diego-downtown.v1.json" with { type: "json" };
import {
  OrganizationProfileError,
  inScopeAreas,
  parseOrganizationProfile,
  unresolvedGeographyComponents,
  validateOrganizationProfile,
} from "./profile.ts";

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(sanDiego)) as Record<string, unknown>;
}

const PROFILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../config/profiles");

/** Read from the directory, so a profile added later cannot ship unvalidated. */
const SHIPPED_PROFILES = readdirSync(PROFILE_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({
    name,
    document: JSON.parse(readFileSync(join(PROFILE_DIR, name), "utf8")) as unknown,
  }));

describe("the shipped example profiles", () => {
  it("every profile in config/profiles validates with no errors", () => {
    expect(SHIPPED_PROFILES.length).toBeGreaterThanOrEqual(2);
    for (const { name, document } of SHIPPED_PROFILES) {
      const result = validateOrganizationProfile(document);
      expect(result.errors, name).toEqual([]);
      expect(result.ok, name).toBe(true);
    }
  });

  it("reproduces the shipped San Diego scenario exactly", () => {
    const profile = parseOrganizationProfile(sanDiego);
    expect(inScopeAreas(profile).map((area) => area.label)).toEqual([
      "City Center",
      "Columbia",
      "Cortez",
      "East Village",
      "Gaslamp",
      "Marina",
    ]);
    expect(profile.operations.budget.value).toBe(80);
    expect(profile.operations.coverage_floor_hours).toBe(8);
  });

  it("describes a genuinely different second geography", () => {
    const profile = parseOrganizationProfile(rural);
    expect(profile.profile_status).toBe("illustrative_example");
    expect(inScopeAreas(profile)).toHaveLength(8);
    expect(profile.operations.budget.value).not.toBe(80);
    expect(profile.operations.coverage_floor_hours).not.toBe(8);
    expect(profile.operations.shift.allocation_increment_hours).toBe(2);
  });

  it("surfaces San Diego's unresolved boundary and adjacency provenance", () => {
    const profile = parseOrganizationProfile(sanDiego);
    expect(unresolvedGeographyComponents(profile)).toEqual(["boundaries", "adjacency"]);
    expect(profile.geography.area_list.provenance.resolution_status).toBe("resolved");
    expect(profile.geography.adjacency.provenance.resolution_note).toBeTruthy();
  });
});

describe("a missing required field fails loudly and by name", () => {
  // Read from the schema rather than hand-listed: a field added to
  // `required` there is covered here the day it lands, and a hand-listed
  // set silently stops covering new members.
  const topLevel = schema.required;

  it("takes its field list from the schema, not from a copy of it", () => {
    expect(topLevel.length).toBeGreaterThan(0);
    expect(topLevel.every((field) => field in sanDiego)).toBe(true);
  });

  it.each(topLevel)("names `%s` when it is missing", (field) => {
    const document = clone();
    delete document[field];
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(result.errors.some((issue) => issue.field.startsWith(field))).toBe(true);
  });

  it("names the exact nested field, not just its parent", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    delete geography.adjacency.provenance;
    try {
      parseOrganizationProfile(document);
      expect.unreachable("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(OrganizationProfileError);
      expect((error as Error).message).toContain("geography.adjacency.provenance");
    }
  });
});

describe("the invariants a profile cannot weaken", () => {
  it("rejects a complaint-shaped field anywhere in the document", () => {
    // "Anywhere" means every depth the walker can reach: the root, a nested
    // block, a block two levels down, and an element of an array.
    const placements: Array<[string, (document: Record<string, unknown>) => void]> = [
      ["complaint_volume_weight", (d) => void (d.complaint_volume_weight = 0.3)],
      [
        "operations.complaint_volume_weight",
        (d) => void ((d.operations as Record<string, unknown>).complaint_volume_weight = 0.3),
      ],
      [
        "geography.adjacency.provenance.service_request_note",
        (d) =>
          void ((
            (d.geography as Record<string, Record<string, unknown>>).adjacency.provenance as Record<
              string,
              unknown
            >
          ).service_request_note = "x"),
      ],
      [
        "geography.area_list.areas[0].calls_311",
        (d) =>
          void ((
            (d.geography as Record<string, Record<string, unknown>>).area_list.areas as Array<
              Record<string, unknown>
            >
          )[0].calls_311 = 4),
      ],
    ];
    for (const [field, place] of placements) {
      const document = clone();
      place(document);
      const result = validateOrganizationProfile(document);
      expect(result.ok, field).toBe(false);
      const issue = result.errors.find((e) => e.field === field);
      expect(issue?.message, field).toContain("not representable");
    }
  });

  it("rejects a complaint field disguised as an area", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    const areas = geography.area_list.areas as Array<Record<string, unknown>>;
    areas.push({ id: "service_request_corridor", label: "Corridor", in_scope: true });
    expect(validateOrganizationProfile(document).ok).toBe(false);
  });

  it("rejects any field the schema does not define", () => {
    // "Any field" includes the nested ones. A closed schema checked only at
    // the root is a schema with an open interior.
    const placements: Array<[string, (document: Record<string, unknown>) => void]> = [
      ["person_records", (d) => void (d.person_records = [])],
      [
        "operations.mystery_knob",
        (d) => void ((d.operations as Record<string, unknown>).mystery_knob = 1),
      ],
      [
        "geography.area_list.mystery",
        (d) =>
          void ((d.geography as Record<string, Record<string, unknown>>).area_list.mystery = 1),
      ],
      [
        "geography.area_list.areas[0].mystery",
        (d) =>
          void ((
            (d.geography as Record<string, Record<string, unknown>>).area_list.areas as Array<
              Record<string, unknown>
            >
          )[0].mystery = 1),
      ],
    ];
    for (const [field, place] of placements) {
      const document = clone();
      place(document);
      const result = validateOrganizationProfile(document);
      expect(
        result.errors.some((e) => e.field === field),
        field,
      ).toBe(true);
    }
  });

  it("refuses to call provenance resolved without a named, versioned, dated source", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    const provenance = geography.adjacency.provenance as Record<string, unknown>;
    provenance.resolution_status = "resolved";
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.field === "geography.adjacency.provenance.source_url")).toBe(
      true,
    );
  });

  it("refuses an adjacency table that no source backs", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    geography.adjacency.pairs = [["gaslamp", "marina"]];
    const result = validateOrganizationProfile(document);
    expect(result.errors.some((e) => e.field === "geography.adjacency.pairs")).toBe(true);
  });

  it("refuses an unresolved provenance with no explanation for the reader", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    (geography.boundaries.provenance as Record<string, unknown>).resolution_note = null;
    const result = validateOrganizationProfile(document);
    expect(
      result.errors.some((e) => e.field === "geography.boundaries.provenance.resolution_note"),
    ).toBe(true);
  });

  it("refuses to let an adopter delete a baseline prohibited claim type", () => {
    const document = clone();
    const boundaries = document.language_boundaries as Record<string, string[]>;
    boundaries.prohibited_claim_types = boundaries.prohibited_claim_types.filter(
      (claim) => claim !== "area_needs_enforcement",
    );
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("area_needs_enforcement");
  });

  it("refuses to let an adopter publish precise locations", () => {
    const document = clone();
    (document.observations as Record<string, unknown>).precise_locations_publishable = true;
    expect(validateOrganizationProfile(document).ok).toBe(false);
  });
});

describe("operational sanity", () => {
  it("rejects a coverage floor no budget can pay for", () => {
    const document = clone();
    (document.operations as Record<string, unknown>).coverage_floor_hours = 20;
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toContain("infeasible");
  });

  it("warns, without blocking, when the floor is deciding the plan", () => {
    const document = clone();
    (document.operations as Record<string, unknown>).coverage_floor_hours = 12;
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.field === "operations.coverage_floor_hours")).toBe(true);
  });
});
