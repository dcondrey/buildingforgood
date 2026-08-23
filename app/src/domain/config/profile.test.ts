/**
 * Guards for the organization-profile loader.
 *
 * Sparse on purpose: the shipped profiles must validate, every required field
 * must fail loudly by name when it is removed, and the two invariants that
 * would quietly change what this product is — a complaint-shaped field and an
 * unresolved provenance dressed up as a source — must be refused.
 */

import { describe, expect, it } from "vitest";

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

describe("the shipped example profiles", () => {
  it("both validate with no errors", () => {
    for (const profile of [sanDiego, rural]) {
      const result = validateOrganizationProfile(profile);
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
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
  const topLevel = [
    "schema_version",
    "profile_id",
    "profile_status",
    "last_updated",
    "organization",
    "observations",
    "geography",
    "operations",
    "cost_assumptions",
    "language_boundaries",
  ];

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
    const document = clone();
    const operations = document.operations as Record<string, unknown>;
    operations.complaint_volume_weight = 0.3;
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    const issue = result.errors.find((e) => e.field === "operations.complaint_volume_weight");
    expect(issue?.message).toContain("not representable");
  });

  it("rejects a complaint field disguised as an area", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    const areas = geography.area_list.areas as Array<Record<string, unknown>>;
    areas.push({ id: "service_request_corridor", label: "Corridor", in_scope: true });
    expect(validateOrganizationProfile(document).ok).toBe(false);
  });

  it("rejects any field the schema does not define", () => {
    const document = clone();
    document.person_records = [];
    const result = validateOrganizationProfile(document);
    expect(result.errors.some((e) => e.field === "person_records")).toBe(true);
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
