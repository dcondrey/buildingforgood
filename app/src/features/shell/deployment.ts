/**
 * The deployment this shell is running.
 *
 * An organization profile — validated by `domain/config` — is the single
 * source for the geography and the operating numbers the shell used to
 * hardcode: which areas are in scope, the default budget, the coverage floor,
 * the continuity reserve, the allocation increment, the team count, and the
 * loaded hourly rate. Swapping profiles is a URL parameter, not an edit:
 * `?profile=san-diego-dsdp-seven` runs the same build on a different
 * geography.
 *
 * The San Diego profile is the reference deployment and reproduces exactly
 * what shipped before this file existed; `applyDeployment` keeps the loaded
 * artifact's own area rows when the profile asks for nothing different, so
 * the characterization tests pin the same behaviour they always did.
 */

import sevenArea from "../../../../config/profiles/san-diego-dsdp-seven.v1.json" with { type: "json" };
import sanDiego from "../../../../config/profiles/san-diego-downtown.v1.json" with { type: "json" };
import {
  inScopeAreas,
  parseOrganizationProfile,
  unresolvedGeographyComponents,
} from "../../domain/config/index.ts";
import type {
  OrganizationProfile,
  ProfileStatus,
  ResolutionStatus,
} from "../../domain/config/index.ts";
import { MAX_BUDGET_HOURS } from "../../lib/constants";
import type { DemoData, PlanningArea } from "../../lib/demo";

/** Profiles compiled into this build, by `profile_id`. */
const PROFILE_SOURCES: Record<string, unknown> = {
  "san-diego-downtown": sanDiego,
  "san-diego-dsdp-seven": sevenArea,
};

export const DEFAULT_PROFILE_ID = "san-diego-downtown";

export const AVAILABLE_PROFILE_IDS = Object.keys(PROFILE_SOURCES);

export interface GeographyDisclosure {
  component: "area_list" | "boundaries" | "adjacency";
  label: string;
  status: ResolutionStatus;
  note: string | null;
  rule: string;
  sourceName: string | null;
  retrievedAt: string | null;
}

export interface Deployment {
  profileId: string;
  profileStatus: ProfileStatus;
  organizationName: string;
  ownerRole: string;
  scopeStatement: string;
  jurisdictionNote: string | null;
  /** In-scope area ids, in the profile's own order. */
  areaIds: string[];
  areaLabels: Map<string, string>;
  areaCount: number;
  /** "six", "eight" — spelled for copy, digits past twelve. */
  areaCountWord: string;
  /** Singular place noun this organization uses for its areas. */
  areaNoun: string;
  areaNounPlural: string;
  /**
   * The geography the scenario header names, e.g. the profile's own place
   * followed by the count and noun of its in-scope areas. Derived here so a
   * header cannot go on describing the geography it was written for after a
   * different profile is loaded.
   */
  geographyLabel: string;
  areaListVersion: string;
  defaultBudget: number;
  minBudget: number;
  maxBudget: number;
  budgetEditable: boolean;
  coverageFloor: number;
  /** The three floors the sensitivity control offers, lowest first. */
  floorOptions: number[];
  continuityReserve: number;
  allocationIncrement: number;
  shiftLengthHours: number;
  teamCount: number;
  planningHorizonLabel: string;
  planningHorizonDays: number;
  loadedHourlyRate: number;
  rateCurrency: string;
  rateSetByRole: string;
  rateBasis: string;
  /** Geography components with no citable source. Rendered as a disclosure. */
  unresolvedGeography: GeographyDisclosure[];
}

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

/**
 * The place noun this organization uses, read out of its own scope statement.
 *
 * The schema has no noun field, and inventing one per profile in the app
 * would be exactly the code change a profile is meant to avoid. Longer names
 * are tested first so "service area" wins over "area".
 */
const PLACE_NOUNS = [
  "service area",
  "neighborhood",
  "township",
  "district",
  "borough",
  "precinct",
  "corridor",
  "area",
];

function placeNoun(profile: OrganizationProfile): string {
  const prose =
    `${profile.organization.scope_statement} ${profile.organization.jurisdiction_note ?? ""}`.toLowerCase();
  return PLACE_NOUNS.find((noun) => prose.includes(noun)) ?? "area";
}

/**
 * Where this deployment operates, in the profile's own words.
 *
 * The schema carries no geography-name field, so the name comes from the
 * first sentence of the jurisdiction note — the one field whose whole job is
 * to say where the organization works. A profile that states no jurisdiction
 * gets no place name rather than one this code made up.
 */
function jurisdictionPlace(profile: OrganizationProfile): string | null {
  const note = profile.organization.jurisdiction_note?.trim() ?? "";
  const first = note.split(". ")[0] ?? "";
  const place = first
    .replace(/\.$/, "")
    .replace(/\s+only$/i, "")
    .trim();
  return place.length > 0 ? place : null;
}

/**
 * The geography a scenario header names: the profile's own place, and the
 * count and noun of the areas that profile actually puts in scope.
 *
 * Both halves are read from the loaded profile. Nothing here may be written
 * by hand, because a hand-written label outlives the geography it describes —
 * a header reading "Six-area downtown core" survived a switch to a seven-area
 * profile and went on asserting a geography that was no longer loaded.
 */
function geographyLabel(place: string | null, countWord: string, nounPlural: string): string {
  const scope = `${countWord} ${nounPlural}`;
  if (place === null) return `${scope.charAt(0).toUpperCase()}${scope.slice(1)}`;
  return `${place} (${scope})`;
}

const COMPONENT_LABELS: Record<GeographyDisclosure["component"], string> = {
  area_list: "Area list",
  boundaries: "Boundaries",
  adjacency: "Adjacency",
};

function geographyDisclosures(profile: OrganizationProfile): GeographyDisclosure[] {
  const provenanceOf = {
    area_list: profile.geography.area_list.provenance,
    boundaries: profile.geography.boundaries.provenance,
    adjacency: profile.geography.adjacency.provenance,
  };
  return unresolvedGeographyComponents(profile).map((name) => {
    const component = name as GeographyDisclosure["component"];
    const provenance = provenanceOf[component];
    return {
      component,
      label: COMPONENT_LABELS[component],
      status: provenance.resolution_status,
      note: provenance.resolution_note,
      rule: provenance.resolution_rule,
      sourceName: provenance.source_name,
      retrievedAt: provenance.retrieved_at,
    };
  });
}

/** Three floors to compare: none, half the profile's floor, the profile's floor. */
function floorOptions(floor: number): number[] {
  const half = Math.round(floor / 2);
  return [...new Set([0, half, floor])].sort((a, b) => a - b);
}

export function deriveDeployment(profile: OrganizationProfile): Deployment {
  const areas = inScopeAreas(profile);
  const operations = profile.operations;
  const rate = profile.cost_assumptions.loaded_hourly_rate;
  const noun = placeNoun(profile);
  const countWord = numberWord(areas.length);
  return {
    profileId: profile.profile_id,
    profileStatus: profile.profile_status,
    organizationName: profile.organization.name,
    ownerRole: profile.organization.profile_owner_role,
    scopeStatement: profile.organization.scope_statement,
    jurisdictionNote: profile.organization.jurisdiction_note ?? null,
    areaIds: areas.map((area) => area.id),
    areaLabels: new Map(areas.map((area) => [area.id, area.label])),
    areaCount: areas.length,
    areaCountWord: countWord,
    areaNoun: noun,
    areaNounPlural: `${noun}s`,
    geographyLabel: geographyLabel(jurisdictionPlace(profile), countWord, `${noun}s`),
    areaListVersion: profile.geography.area_list.version,
    defaultBudget: operations.budget.value,
    minBudget: operations.budget.minimum,
    maxBudget: operations.budget.maximum ?? MAX_BUDGET_HOURS,
    budgetEditable: operations.budget.user_editable,
    coverageFloor: operations.coverage_floor_hours,
    floorOptions: floorOptions(operations.coverage_floor_hours),
    continuityReserve: operations.continuity_reserve_hours,
    allocationIncrement: operations.shift.allocation_increment_hours,
    shiftLengthHours: operations.shift.length_hours,
    teamCount: operations.team_count,
    planningHorizonLabel: operations.planning_horizon.label,
    planningHorizonDays: operations.planning_horizon.value,
    loadedHourlyRate: rate.value,
    rateCurrency: rate.currency,
    rateSetByRole: rate.assumption.set_by_role,
    rateBasis: rate.assumption.basis,
    unresolvedGeography: geographyDisclosures(profile),
  };
}

/**
 * The profile named by `?profile=`, or the reference deployment. An unknown
 * id falls back rather than throwing: a mistyped link must not blank the tool.
 */
export function resolveProfileId(search: string): string {
  try {
    const requested = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(
      "profile",
    );
    if (requested && Object.hasOwn(PROFILE_SOURCES, requested)) return requested;
  } catch {
    // A malformed query string is treated as no request at all.
  }
  return DEFAULT_PROFILE_ID;
}

export function loadDeployment(profileId: string): Deployment {
  const source = PROFILE_SOURCES[profileId] ?? PROFILE_SOURCES[DEFAULT_PROFILE_ID];
  return deriveDeployment(parseOrganizationProfile(source));
}

/**
 * An in-scope area the loaded artifact carries no observation for.
 *
 * `coverage_floor_only` is the artifact contract's own name for this case:
 * the area takes the guaranteed minimum and no forecast-weighted share. No
 * number is invented for it, which is the point — a profile can name a place
 * the data does not cover, and the plan says so instead of guessing.
 */
function unobservedArea(id: string, name: string): PlanningArea {
  return {
    id,
    name,
    latest: null,
    delta: 0,
    planningLoad: 0,
    loadDerivation: "coverage_floor_only",
    auditWape: null,
    // English here, translated at the display boundary by `i18n/plannerText`,
    // for the same reason the planner's own sentences are: this string is a
    // planning-input value the export and the characterization suites read,
    // not a piece of interface copy.
    reason:
      "The loaded artifact carries no observation for this area. It receives the guaranteed minimum and no forecast weight.",
  };
}

/** The profile's in-scope areas, matched against the artifact's own rows. */
export function scopeAreas(areas: PlanningArea[], deployment: Deployment): PlanningArea[] {
  const byId = new Map(areas.map((area) => [area.id, area]));
  return deployment.areaIds.map(
    (id) => byId.get(id) ?? unobservedArea(id, deployment.areaLabels.get(id) ?? id),
  );
}

/**
 * The artifact as this deployment plans against it.
 *
 * The area rows keep their object identity when the profile asks for nothing
 * the artifact does not already carry, so the reference deployment plans over
 * exactly the rows it always did. The scenario's geography is always this
 * deployment's, never the artifact's: an artifact describes the rows it
 * carries, and only the loaded profile knows what geography is being planned.
 */
export function applyDeployment(data: DemoData, deployment: Deployment): DemoData {
  const areas = scopeAreas(data.areas, deployment);
  const sameAreas =
    areas.length === data.areas.length && areas.every((area, index) => area === data.areas[index]);
  if (
    sameAreas &&
    data.scenario.defaultBudget === deployment.defaultBudget &&
    data.scenario.focusArea === deployment.geographyLabel
  ) {
    return data;
  }
  return {
    ...data,
    // The artifact's own array when the profile changed nothing about it, so
    // the reference deployment plans over the identical rows it always did.
    areas: sameAreas ? data.areas : areas,
    scenario: {
      ...data.scenario,
      focusArea: deployment.geographyLabel,
      defaultBudget: deployment.defaultBudget,
    },
  };
}

/**
 * In-scope areas the loaded artifact has no row for. Empty is the good case,
 * and the reference deployment is always empty.
 */
export function unobservedAreas(artifactAreas: PlanningArea[], deployment: Deployment): string[] {
  const known = new Set(artifactAreas.map((area) => area.id));
  return deployment.areaIds
    .filter((id) => !known.has(id))
    .map((id) => deployment.areaLabels.get(id) ?? id);
}
