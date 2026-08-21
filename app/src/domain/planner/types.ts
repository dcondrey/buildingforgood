/**
 * Fairness-constrained outreach-hour planner — types (issue #14).
 *
 * One design decision dominates this file: **311 complaint volume is not
 * representable here.** The decision contract forbids complaint volume from
 * influencing planning load or allocation, and the C-01 red-team review
 * (finding R-03) identified "sort by complaints so we go where people are
 * upset" as the most likely well-meaning request to break the product.
 *
 * A runtime check could be removed by a future edit. A missing field cannot
 * be weighted by accident. The exclusion is therefore enforced by the type,
 * and `assertNoComplaintSignal` guards the boundary where untyped artifact
 * JSON crosses into the planner.
 */

/** The three limited conclusions the drop test is allowed to reach. */
export type DropTestResult =
  "likely_improvement" | "possible_displacement" | "insufficient_evidence";

/**
 * One planning area's forecast inputs.
 *
 * `forecast_upper` is the planning reference per
 * `config/decision.v1.json → planner.uncertainty_policy`: planning against
 * the upper prediction bound means a wider interval prepares for more, which
 * is the correct direction when the product knows less.
 */
export interface AreaPlanningInput {
  area_id: string;
  label: string;
  /** Upper prediction bound of the aggregate observation forecast. */
  forecast_upper: number;
  /** Lower prediction bound. Used only to size the uncertainty reserve. */
  forecast_lower: number;
  /** Drop-test result; `possible_displacement` earns a continuity reserve. */
  drop_test: DropTestResult;
  /** False when the area is excluded from this shift (no data, out of scope). */
  included: boolean;
}

/** Planner policy, mirroring `config/decision.v1.json → planner`. */
export interface PlannerPolicy {
  /** Total staff hours available for the shift. */
  budget_hours: number;
  /** Smallest allocatable unit. Contract: 1 staff hour, fixed. */
  time_increment_hours: number;
  /** Minimum hours each included area receives, or the plan is infeasible. */
  minimum_coverage_floor_hours: number;
  /** Extra hours for an area classified `possible_displacement`. */
  continuity_reserve_hours: number;
  /**
   * Weight on interval width when sizing relative load. 0 plans purely
   * against the upper bound; higher values give wider-interval areas more
   * share, so the least-understood places are not the ones starved.
   */
  uncertainty_weight: number;
}

/** A coordinator's manual assignment, preserved across recomputation. */
export interface AreaLock {
  area_id: string;
  hours: number;
}

/** Per-area result, carrying its own "Why this amount?" explanation. */
export interface AreaAllocation {
  area_id: string;
  label: string;
  allocated_hours: number;
  /** Coverage floor applied to this area, in hours. */
  floor_hours: number;
  /** Continuity reserve applied, in hours. */
  continuity_reserve_hours: number;
  /** Unitless share basis. Not people, not hours. */
  relative_load: number;
  /** What a purely proportional plan with no coverage floor would give. */
  unguarded_hours: number;
  /** Hours the coverage floor redistributed away from this area. */
  unmet_hours: number;
  locked: boolean;
  included: boolean;
  /** Plain-language reasons, ordered most to least significant. */
  reasons: string[];
}

export interface PlanResult {
  status: "planned" | "infeasible";
  allocations: AreaAllocation[];
  budget_hours: number;
  total_allocated_hours: number;
  /** Budget that could not be split into whole increments. */
  rounding_residue_hours: number;
  /** Sum of hours the coverage floor moved away from higher-load areas. */
  unmet_hours_total: number;
  locked_area_count: number;
  /** Constraints and assumptions that shaped the plan, for disclosure. */
  constraint_notes: string[];
  /** Populated only when `status` is `infeasible`. */
  infeasible_reasons: string[];
}
