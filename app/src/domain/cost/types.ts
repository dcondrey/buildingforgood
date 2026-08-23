/**
 * Cost layer — types.
 *
 * Two rules govern this file, and both are enforced by the type system rather
 * than by review.
 *
 * 1. **No denominator is a human being.** There is no cost per person, per
 *    person-equivalent-covered, per contact, per client, or per capita, and
 *    no field that could be repurposed as one. In this domain such a figure
 *    reads as pricing people, and the audiences this product needs would be
 *    right to walk away from it. Following the reasoning in
 *    `domain/planner/types.ts`: a runtime check can be deleted, a missing
 *    field cannot be divided by accident. `ExcludesPersonDenominator` turns a
 *    future widening into a compile error.
 *
 * 2. **Cost is a display and briefing concern.** Nothing here is imported by
 *    the allocator, and nothing here may become an allocation input. The
 *    denominator of every figure below is an hour or a plan, never a person.
 *
 * The rate itself is not measured, derived, or published by this project. It
 * is whatever the operating organization says it is — see
 * `config/schema/organization-profile.v1.schema.json` →
 * `cost_assumptions.loaded_hourly_rate`, whose shape this module reuses.
 */

import type { LoadedHourlyRate } from "../config/index.ts";

/** The rate as the cost layer consumes it, carrying its assumption metadata. */
export type LoadedRateAssumption = LoadedHourlyRate;

/** One area's share of the plan, priced. Hours in, hours out. */
export interface AreaCost {
  areaId: string;
  label: string;
  hours: number;
  /** `hours × rate`. Currency is carried on the enclosing `PlanCost`. */
  cost: number;
}

/**
 * What the guaranteed minimum costs on the margin.
 *
 * `hours` is the plan's existing unmet planning load — the hours the floor
 * moved away from higher-load areas — not a new quantity. `cost` is that
 * figure multiplied by the assumed rate, and nothing else.
 */
export interface FloorMarginalCost {
  hours: number;
  cost: number;
  /** The highest-load area in the plan, or null when there is no plan. */
  topLoadAreaId: string | null;
  topLoadAreaLabel: string | null;
  /** Hours the floor moved away from that one area. */
  topLoadAreaHours: number;
}

/** The whole priced plan. Every figure is per hour, per area, or per plan. */
export interface PlanCost {
  /** The assumed loaded cost of one staff hour. Never a measured figure. */
  rate: number;
  currency: string;
  byArea: AreaCost[];
  totalHours: number;
  totalCost: number;
  floor: FloorMarginalCost;
}

/**
 * Key names that price a human being, matched at the type level.
 *
 * Mirrors `PERSON_DENOMINATOR_PATTERN` in `./cost.ts`. That regex guards the
 * runtime boundary where an untyped object crosses in; this guards the
 * compile-time boundary where a maintainer widens an interface. Both exist
 * because either one alone is removable by a single edit.
 */
export type PersonDenominatorKey<K extends string> =
  Lowercase<K> extends `${string}per_person${string}`
    ? true
    : Lowercase<K> extends `${string}perperson${string}`
      ? true
      : Lowercase<K> extends `${string}per_contact${string}`
        ? true
        : Lowercase<K> extends `${string}percontact${string}`
          ? true
          : Lowercase<K> extends `${string}per_client${string}`
            ? true
            : Lowercase<K> extends `${string}perclient${string}`
              ? true
              : Lowercase<K> extends `${string}per_individual${string}`
                ? true
                : Lowercase<K> extends `${string}perindividual${string}`
                  ? true
                  : Lowercase<K> extends `${string}per_capita${string}`
                    ? true
                    : Lowercase<K> extends `${string}percapita${string}`
                      ? true
                      : Lowercase<K> extends `${string}per_head${string}`
                        ? true
                        : Lowercase<K> extends `${string}perhead${string}`
                          ? true
                          : Lowercase<K> extends `${string}per_covered${string}`
                            ? true
                            : Lowercase<K> extends `${string}percovered${string}`
                              ? true
                              : Lowercase<K> extends `${string}per_served${string}`
                                ? true
                                : Lowercase<K> extends `${string}perserved${string}`
                                  ? true
                                  : Lowercase<K> extends `${string}per_encounter${string}`
                                    ? true
                                    : Lowercase<K> extends `${string}perencounter${string}`
                                      ? true
                                      : false;

/** The person-denominator keys of `T`, or `never` when it has none. */
export type PersonDenominatorKeysOf<T> = {
  [K in keyof T]-?: PersonDenominatorKey<K & string> extends true ? K : never;
}[keyof T];

/**
 * `true` when `T` cannot price a human being, `never` when it can.
 *
 * Assign it to a `true` constant to turn "this type has no per-person cost"
 * into a compile error rather than a review comment.
 */
export type ExcludesPersonDenominator<T> = [PersonDenominatorKeysOf<T>] extends [never]
  ? true
  : never;

export const AREA_COST_EXCLUDES_PERSON_DENOMINATOR: ExcludesPersonDenominator<AreaCost> = true;
export const PLAN_COST_EXCLUDES_PERSON_DENOMINATOR: ExcludesPersonDenominator<PlanCost> = true;
export const FLOOR_MARGINAL_COST_EXCLUDES_PERSON_DENOMINATOR: ExcludesPersonDenominator<FloorMarginalCost> = true;
