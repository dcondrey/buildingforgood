/**
 * Delivered actuals — types for `config/schema/actuals.v1.schema.json`.
 *
 * Actuals are what an operator already knows after a month of outreach:
 * hours planned, hours delivered, and one engagement aggregate. They enter
 * at the same grain everything else in this system publishes at, one area
 * for one calendar month, and under the same suppression policy.
 *
 * Three absences in this file are load-bearing and must survive every future
 * edit. There is no person-level or per-encounter type, so no row can ever
 * describe an individual. There is no field for complaint, 311, or
 * service-request volume, and no field repurposable as one — the type-level
 * guard at the bottom fails to compile if that changes. And there is no
 * breakdown of the engagement count, which is what keeps the suppression
 * rule reducible to the policy's first branch.
 */

import type { ExcludesComplaintSignal } from "../planner/types.ts";

/** Calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** Calendar month, `YYYY-MM`. The finest time grain this system accepts. */
export type IsoMonth = string;

/** Which aggregate the operator already reports. Closed by design. */
export type EngagementKind = "contacts" | "engagements";

/** Who reported these actuals and how. Roles only, never individuals. */
export interface ActualsReporting {
  organization_name: string;
  /** A role title. Never a person's name or contact details. */
  reported_by_role: string;
  method_note: string;
  last_updated: IsoDate;
  completeness_note?: string;
}

/** What the engagement number is, declared once for the whole file. */
export interface EngagementMeasure {
  kind: EngagementKind;
  label: string;
  definition: string;
  collection_method: string;
  counts_encounters_not_people: true;
  unique_persons_measure: false;
}

export interface SuppressionMarker {
  field: "suppressed";
  affirmative_values: [true];
}

/** The privacy contract the file declares. Every value is fixed. */
export interface ActualsContract {
  grain: "area_month_aggregate";
  count_fields: ["engagement.count"];
  small_cell_threshold: 5;
  suppression_marker: SuppressionMarker;
}

/** Staff time for one area-month. A resource metric, not a person count. */
export interface AreaMonthHours {
  /** Planned hours. Null when no plan existed for this month. */
  allocated_hours: number | null;
  delivered_hours: number;
  hours_note?: string;
}

/**
 * The engagement aggregate for one area-month, in exactly one of three
 * states: reported, suppressed, or not recorded. A count, never identities.
 */
export interface AreaMonthEngagement {
  count: number | null;
  suppressed: boolean;
  not_recorded?: boolean;
}

/** One area, one month. */
export interface AreaMonthActual {
  area_id: string;
  month: IsoMonth;
  hours: AreaMonthHours;
  engagement: AreaMonthEngagement;
  note?: string;
}

/** What the tool will and will not later compute from this file. */
export interface IntendedAnalysis {
  status: "documented_not_implemented";
  preconditions: string[];
  planned_when_data_exists: string[];
  will_never_compute: string[];
  rationale: string;
}

export interface ActualsDocument {
  schema_version: "actuals/v1";
  profile_id: string;
  geography_version: string;
  reporting: ActualsReporting;
  engagement_measure: EngagementMeasure;
  contract: ActualsContract;
  /** May be empty: "no actuals recorded yet" is a legitimate state. */
  area_months: AreaMonthActual[];
  intended_analysis: IntendedAnalysis;
  notes?: string[];
}

/** One validation finding, always naming the field it came from. */
export interface ActualsIssue {
  /** Dotted path, e.g. `area_months[3].engagement.count`. */
  field: string;
  message: string;
}

export interface ActualsValidation {
  ok: boolean;
  /** Populated only when `ok` is true. */
  document: ActualsDocument | null;
  errors: ActualsIssue[];
  /** Valid, but operationally questionable. Never blocks loading. */
  warnings: ActualsIssue[];
}

/**
 * Compile-time proof that an actuals row cannot carry a complaint signal.
 *
 * Reuses the planner's own type-level guard, so a complaint-shaped field
 * added to an actuals row fails to typecheck rather than fails a review.
 * `validateActuals` covers the runtime boundary where untyped JSON crosses
 * in; either guard alone is removable by a single edit.
 */
export const AREA_MONTH_ACTUAL_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<AreaMonthActual> = true;

export const ENGAGEMENT_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<AreaMonthEngagement> = true;

export const MEASURE_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<EngagementMeasure> = true;
