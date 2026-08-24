/**
 * The area list must name a real published place, or the profile does not load.
 *
 * A profile once shipped here that invented nine area names, an adjacency
 * table and a cost basis for a continuum of care that does not exist. It was
 * labelled `illustrative` at every level the schema offers, every label was
 * accurate, and it was a fabrication about homelessness sitting beside real
 * counts. `docs/project/DECISIONS.md`, 2026-08-23, records it.
 *
 * The rule that follows is narrow on purpose. The area NAMES are the geography
 * as far as this tool is concerned — hours go to them, the interface prints
 * them, a saved plan is traced by them — so they must be pinned: `resolved`,
 * with a publisher, a source, a version and a retrieval date. Boundaries and
 * adjacency are deliberately NOT pinned, because a publisher routinely names
 * areas without publishing their geometry and requiring a citation there would
 * push an adopter toward inventing one. What they may not be is `illustrative`:
 * the place is real, so its boundaries cannot describe somewhere that is not.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import schema from "../../../../config/schema/organization-profile.v1.schema.json" with { type: "json" };
import sanDiego from "../../../../config/profiles/san-diego-downtown.v1.json" with { type: "json" };
import { validateOrganizationProfile } from "./profile.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const PROFILE_DIR = join(REPO_ROOT, "config/profiles");

type Provenance = Record<string, unknown>;

interface Shipped {
  name: string;
  geography: Record<string, { provenance: Provenance }>;
}

const SHIPPED: Shipped[] = readdirSync(PROFILE_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort()
  .map((name) => ({
    name,
    geography: (
      JSON.parse(readFileSync(join(PROFILE_DIR, name), "utf8")) as {
        geography: Record<string, { provenance: Provenance }>;
      }
    ).geography,
  }));

// Read from the schema rather than hand-listed, the way the required-field
// suite in profile.test.ts does: a field added to `pinnedProvenance.required`
// is covered here the day it lands.
const PINNED = schema.$defs.pinnedProvenance;
const PINNED_REQUIRED = PINNED.required;
const PINNED_STATUS = PINNED.properties.resolution_status.const;
const NON_ILLUSTRATIVE = schema.$defs.citedOrDisclosedProvenance.properties.resolution_status.enum;

function clone(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(sanDiego)) as Record<string, unknown>;
}

describe("a shipped profile's geography names a real published place", () => {
  it("takes its rule from the schema, not from a copy of it", () => {
    expect(SHIPPED.length).toBeGreaterThanOrEqual(2);
    expect(PINNED_STATUS).toBe("resolved");
    expect(PINNED_REQUIRED).toContain("publisher");
    expect(PINNED_REQUIRED).toContain("source_url");
    expect(PINNED_REQUIRED).toContain("retrieved_at");
    expect(NON_ILLUSTRATIVE).not.toContain("illustrative");
  });

  it("routes each geography component to the definition that bounds it", () => {
    const components = schema.properties.geography.properties;
    expect(components.area_list.properties.provenance.$ref).toBe("#/$defs/pinnedProvenance");
    expect(components.boundaries.properties.provenance.$ref).toBe(
      "#/$defs/citedOrDisclosedProvenance",
    );
    expect(components.adjacency.properties.provenance.$ref).toBe(
      "#/$defs/citedOrDisclosedProvenance",
    );
  });

  it("pins every area list to a named, versioned, dated source", () => {
    for (const { name, geography } of SHIPPED) {
      const provenance = geography.area_list.provenance;
      expect(provenance.resolution_status, name).toBe(PINNED_STATUS);
      for (const field of PINNED_REQUIRED) {
        const value = provenance[field];
        expect(typeof value, `${name}: ${field}`).toBe("string");
        expect((value as string).trim().length, `${name}: ${field}`).toBeGreaterThan(0);
      }
      expect(provenance.retrieved_at, name).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("marks no geography component illustrative", () => {
    for (const { name, geography } of SHIPPED) {
      for (const [component, value] of Object.entries(geography)) {
        expect(NON_ILLUSTRATIVE, `${name}: ${component}`).toContain(
          value.provenance.resolution_status,
        );
      }
    }
  });
});

describe("the loader refuses what the schema refuses", () => {
  // This is the check the fabricated profile would have failed, and the one
  // place the enforcement cannot live in `config/` or in this file: the loader
  // is hand-written and does not read the schema, so `geography.area_list`
  // still accepts `illustrative` at runtime. Until `validateProvenance` takes
  // a required status, this test is the declaration of that gap rather than a
  // guard against it.
  it("refuses an area list that resolves to no published source", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    geography.area_list.provenance = {
      resolution_status: "illustrative",
      source_name: null,
      publisher: null,
      source_url: null,
      source_version: null,
      retrieved_at: null,
      resolution_note: "These area names are invented for demonstration.",
      resolution_rule: "This entry never resolves. It is replaced, not upgraded.",
    };
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((issue) =>
        issue.field.startsWith("geography.area_list.provenance.resolution_status"),
      ),
    ).toBe(true);
  });

  it("refuses an area list cited to a source it cannot name", () => {
    const document = clone();
    const geography = document.geography as Record<string, Record<string, unknown>>;
    (geography.area_list.provenance as Record<string, unknown>).publisher = null;
    const result = validateOrganizationProfile(document);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some((issue) => issue.field === "geography.area_list.provenance.publisher"),
    ).toBe(true);
  });
});
