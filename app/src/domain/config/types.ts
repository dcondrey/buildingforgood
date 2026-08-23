/**
 * Organization profile — types for `config/schema/organization-profile.v1.schema.json`.
 *
 * A profile is how an organization other than this project's own reference
 * deployment runs the tool: it instantiates a profile, it does not fork the
 * application.
 *
 * Two absences in this file are load-bearing and must survive every future
 * edit. There is no field for complaint, 311, or service-request volume, and
 * no field that could be repurposed as one — the same reasoning as
 * `domain/planner/types.ts`: a runtime check can be deleted, a missing field
 * cannot be weighted by accident. And there is no person-level or
 * precise-location field; the observation grain is fixed at area-month
 * aggregate by a literal type, so no profile can widen it.
 */

import type { ExcludesComplaintSignal } from "../planner/types.ts";

/** Calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** How much weight a profile carries. */
export type ProfileStatus = "draft" | "illustrative_example" | "reference_deployment" | "adopted";

/**
 * Whether a geography component is backed by a citable source.
 *
 * `unresolved` is a legitimate, publishable outcome: it carries a
 * `resolution_note` the interface renders as a disclosure. It is not a
 * placeholder to be quietly replaced with a version string.
 */
export type ResolutionStatus = "resolved" | "provisional" | "unresolved" | "illustrative";

/** Structured provenance for one geography component. */
export interface Provenance {
  resolution_status: ResolutionStatus;
  /** Non-null and required when `resolution_status` is `resolved`. */
  source_name: string | null;
  publisher: string | null;
  source_url: string | null;
  source_version: string | null;
  retrieved_at: IsoDate | null;
  /** Non-empty and required for every status except `resolved`. */
  resolution_note: string | null;
  /** What would change the status. Required in every case. */
  resolution_rule: string;
}

/** One planning area. Aggregate place only — no population, need, or report count. */
export interface ProfileArea {
  id: string;
  label: string;
  in_scope: boolean;
  note?: string;
}

export interface AreaList {
  version: string;
  areas: ProfileArea[];
  provenance: Provenance;
}

export interface BoundaryReference {
  provenance: Provenance;
}

export interface AdjacencyTable {
  /** Null when adjacency is unresolved. */
  version: string | null;
  /** Unordered pairs of area ids. Empty when adjacency is unresolved. */
  pairs: Array<[string, string]>;
  provenance: Provenance;
}

export interface ProfileGeography {
  area_list: AreaList;
  boundaries: BoundaryReference;
  adjacency: AdjacencyTable;
}

export interface ProfileObservations {
  grain: "area_month_aggregate";
  precise_locations_publishable: false;
  individual_records_publishable: false;
}

export interface ProfileOrganization {
  name: string;
  /** A role title. Never a person's name or contact details. */
  profile_owner_role: string;
  scope_statement: string;
  jurisdiction_note?: string;
}

export interface PlanningHorizon {
  value: number;
  unit: "day";
  label: string;
}

export interface ProfileBudget {
  value: number;
  unit: "staff_hour";
  user_editable: boolean;
  minimum: number;
  maximum?: number;
}

export interface ShiftShape {
  length_hours: number;
  allocation_increment_hours: number;
}

export interface ProfileOperations {
  planning_horizon: PlanningHorizon;
  budget: ProfileBudget;
  shift: ShiftShape;
  team_count: number;
  coverage_floor_hours: number;
  continuity_reserve_hours: number;
  uncertainty_weight: number;
  /** Defaults to 0.25 when absent. */
  floor_dominance_warning_threshold?: number;
}

export interface RateAssumption {
  status: "operator_set_assumption";
  set_by_role: string;
  basis: string;
  effective_date: IsoDate;
  review_by?: IsoDate;
  includes: string[];
  excludes: string[];
}

export interface LoadedHourlyRate {
  value: number;
  currency: string;
  unit: "cost_per_staff_hour";
  assumption: RateAssumption;
}

export interface ProfileCostAssumptions {
  loaded_hourly_rate: LoadedHourlyRate;
}

export interface ProfileLanguageBoundaries {
  permitted_examples: string[];
  prohibited_claim_types: string[];
}

export interface OrganizationProfile {
  schema_version: "organization-profile/v1";
  profile_id: string;
  profile_status: ProfileStatus;
  last_updated: IsoDate;
  organization: ProfileOrganization;
  observations: ProfileObservations;
  geography: ProfileGeography;
  operations: ProfileOperations;
  cost_assumptions: ProfileCostAssumptions;
  language_boundaries: ProfileLanguageBoundaries;
  review_triggers?: string[];
  notes?: string[];
}

/** One validation finding, always naming the field it came from. */
export interface ProfileIssue {
  /** Dotted path, e.g. `geography.area_list.provenance.retrieved_at`. */
  field: string;
  message: string;
}

export interface ProfileValidation {
  ok: boolean;
  /** Populated only when `ok` is true. */
  profile: OrganizationProfile | null;
  errors: ProfileIssue[];
  /** Valid, but operationally questionable. Never blocks loading. */
  warnings: ProfileIssue[];
}

/**
 * Compile-time proof that a profile area cannot carry a complaint signal.
 *
 * Reuses the planner's own type-level guard so both boundaries — the shipped
 * allocation input and the configuration an adopting organization writes —
 * fail to typecheck rather than fail a review, if a complaint-shaped field is
 * ever added. `validateOrganizationProfile` covers the runtime boundary where
 * untyped profile JSON crosses in.
 */
export const PROFILE_AREA_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<ProfileArea> = true;

export const PROFILE_OPERATIONS_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<ProfileOperations> = true;
