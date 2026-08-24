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
 *
 * **Both of those match field names, so neither is the guarantee.** Complaint
 * counts placed in `planning_load` carry no complaint-shaped name and defeat
 * both; that was executed, not theorised (docs/project/PHASE1_ADVERSARIAL.md,
 * attacks C and D). What this file may claim, and what the project defends,
 * is narrower: complaint volume cannot reach allocation without also
 * corrupting the published forecast interval, which is derived from
 * checksummed inputs. That line is held by
 * `PERMITTED_PLANNING_LOAD_DERIVATIONS` below and the reconciliation in
 * `pipeline/src/stillhere_pipeline/contracts.py`, not by the name checks.
 * Do not restate this as "complaint volume cannot influence planning"; see
 * docs/project/DECISIONS.md.
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

/**
 * Key names that carry a complaint signal, matched at the type level.
 *
 * Mirrors the runtime vocabulary in `../vocabulary/refusedTerms.ts`. That one
 * guards the boundary where untyped artifact JSON crosses in; this guards the
 * boundary where a maintainer widens an interface. Both exist because either
 * one alone is removable by a single edit.
 *
 * TypeScript cannot build a conditional chain from a runtime array, so this
 * list is written by hand and the coupling is enforced by a test:
 * `refusals.test.ts` requires a branch here for every term in
 * `LOCALE_VOCABULARY`. A word added to the vocabulary and not to this chain
 * fails there rather than leaving the compile-time half quietly narrower than
 * the runtime half -- which is exactly the drift that let `quejas_recibidas`
 * through three of five guards.
 */
// One runtime term is deliberately absent from this chain: the enforcement
// verb in `LOCALE_VOCABULARY.en.complaintPatterns`. The refusal suite scans
// every source file for copy this product will not emit and reads a
// template-literal type as a string, so there is no spelling of that word
// which can sit here and pass -- splitting it across `${string}` holes still
// renders as the forbidden phrase. It was absent from this chain before the
// vocabulary was locale-keyed too; the difference is that the gap is now
// declared, and `refusals.test.ts` pins the exception by name so a SECOND term
// cannot go missing quietly behind it. The runtime guard still refuses it, and
// the runtime guard is the one untyped artifact JSON crosses.
export type ComplaintShapedKey<K extends string> =
  Lowercase<K> extends `${string}complaint${string}`
    ? true
    : Lowercase<K> extends `${string}311${string}`
      ? true
      : Lowercase<K> extends `${string}service_request${string}`
        ? true
        : Lowercase<K> extends `${string}servicerequest${string}`
          ? true
          : Lowercase<K> extends `${string}call_volume${string}`
            ? true
            : Lowercase<K> extends `${string}callvolume${string}`
              ? true
              : Lowercase<K> extends `${string}report_volume${string}`
                ? true
                : Lowercase<K> extends `${string}reportvolume${string}`
                  ? true
                  : Lowercase<K> extends `${string}nuisance${string}`
                    ? true
                    : Lowercase<K> extends `${string}hotline${string}`
                      ? true
                      : Lowercase<K> extends `${string}queja${string}`
                        ? true
                        : Lowercase<K> extends `${string}denuncia${string}`
                          ? true
                          : Lowercase<K> extends `${string}reclamo${string}`
                            ? true
                            : Lowercase<K> extends `${string}reclamacion${string}`
                              ? true
                              : Lowercase<K> extends `${string}reporte_ciudadano${string}`
                                ? true
                                : Lowercase<K> extends `${string}reportes_recibidos${string}`
                                  ? true
                                  : Lowercase<K> extends `${string}aviso_ciudadano${string}`
                                    ? true
                                    : Lowercase<K> extends `${string}avisos_ciudadanos${string}`
                                      ? true
                                      : Lowercase<K> extends `${string}linea_de_atencion${string}`
                                        ? true
                                        : Lowercase<K> extends `${string}molestia${string}`
                                          ? true
                                          : false;

/** The complaint-shaped keys of `T`, or `never` when it has none. */
export type ComplaintShapedKeysOf<T> = {
  [K in keyof T]-?: ComplaintShapedKey<K & string> extends true ? K : never;
}[keyof T];

/**
 * `true` when `T` cannot represent complaint volume, `never` when it can.
 *
 * Assign it to a `true` constant to turn "this type has no complaint field"
 * into a compile error rather than a review comment. Optional and readonly
 * modifiers are stripped first, so `complaint_count?: number` fails too.
 */
export type ExcludesComplaintSignal<T> = [ComplaintShapedKeysOf<T>] extends [never] ? true : never;

/** Proof for the planner's own input type. */
export const AREA_PLANNING_INPUT_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<AreaPlanningInput> = true;

/**
 * Where a planning-load number is allowed to come from.
 *
 * A name-based guard cannot see what a number means: complaint volume placed
 * in `planning_load` is invisible to `COMPLAINT_FIELD_PATTERN` and to
 * `ExcludesComplaintSignal` alike, because `planning_load` is not a
 * complaint-shaped name. That bypass was executed, not theorised — see
 * docs/project/PHASE1_ADVERSARIAL.md, attacks C and D.
 *
 * The answer is that the value has to arrive with a declared derivation, the
 * artifact contract has to enumerate which derivations are permitted, and a
 * value must reconcile with the artifact block it claims to come from. This
 * union is the vocabulary; `pipeline/src/stillhere_pipeline/contracts.py`
 * enforces the reconciliation, and `adaptDemoV1` refuses an artifact that
 * fails it.
 */
export const PERMITTED_PLANNING_LOAD_DERIVATIONS = [
  /** `planner.allocations[].planning_load` equals `forecast.areas[].upper`. */
  "forecast_upper_bound",
  /**
   * The area published no forecast interval, so it plans against its most
   * recent observed total (`observations.latest_by_area[].total`). An area
   * the model understands least is not thereby starved of hours.
   */
  "latest_observed_total",
  /** The area takes the coverage floor and no discretionary share; load is 0. */
  "coverage_floor_only",
  /** The offline snapshot compiled into the bundle, labelled as such. */
  "embedded_demo_snapshot",
] as const;

export type PlanningLoadDerivation = (typeof PERMITTED_PLANNING_LOAD_DERIVATIONS)[number];

export function isPermittedPlanningLoadDerivation(value: unknown): value is PlanningLoadDerivation {
  return (PERMITTED_PLANNING_LOAD_DERIVATIONS as readonly unknown[]).includes(value);
}
