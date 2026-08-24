/**
 * Planned against delivered, for one area-month at a time.
 *
 * This is the first of the analytics `intended_analysis.planned_when_data_exists`
 * names — "descriptive planned-versus-delivered hours by area and month" — and
 * it is deliberately the whole of it. Every number here is a subtraction of two
 * figures the operator supplied; nothing is modelled, weighted, or attributed.
 *
 * Four rules shape what this module will and will not return.
 *
 * **Rows are ordered by area identity, never by magnitude.** A list sorted by
 * who fell furthest behind is a ranking of teams, and
 * `staff_or_team_performance_ranking` is on the never list. The order here is
 * the deployment's own area order when one is supplied, and lexical otherwise.
 *
 * **There is no total.** `published_rollup_totals_across_areas_or_months` is on
 * the never list too: a sum across rows lets a reader subtract their way back
 * to a suppressed count in one of them. A row is the published grain, and it
 * stays the published grain.
 *
 * **A missing plan is unresolved, not zero.** A month that predates adoption
 * has no planned figure, so it has no error either, and `null` travels all the
 * way to the screen rather than being softened into a number.
 *
 * **A missing row is unknown, not zero.** An in-scope area absent from a month
 * is listed as absent. It has not been shown to have received nothing.
 */

import type { ActualsDocument, AreaMonthEngagement, IsoMonth } from "./types.ts";

/**
 * What an actuals file cannot score, and will not be able to score with more
 * months of the same file.
 *
 * Written down rather than left to be discovered, on the model of
 * `UNSHIPPED_CONNECTORS` in the refusal vocabulary. The gap is not a missing
 * feature: an actuals file carries staff hours and one engagement aggregate,
 * and none of those is an observation of the quantity the published forecast
 * predicts. Closing any of these means acquiring a different measurement, and
 * `compare.test.ts` fails if this record is emptied to make it look closed.
 */
export const NOT_SCORABLE_FROM_ACTUALS: Readonly<Record<string, string>> = {
  count_forecast:
    "The published forecast predicts an observed count from the point-in-time methodology. " +
    "An actuals file records staff hours and one engagement aggregate, neither of which is a " +
    "count of that kind, so no row in it can confirm or contradict that forecast.",
  engagement_response:
    "Whether delivered hours change an engagement count is a question about effect, and " +
    "`causal_attribution_of_area_change_to_delivered_hours` is on the file's own never list. " +
    "Both figures being present in one row is not evidence that one produced the other.",
  area_change:
    "Nothing in an actuals file observes an area between plans, so a change in an area over the " +
    "month cannot be read off it at all, with or without an attribution.",
};

export interface AreaMonthComparison {
  area_id: string;
  month: IsoMonth;
  /** The hours the plan called for. Null when no plan was recorded. */
  planned_hours: number | null;
  delivered_hours: number;
  /**
   * Planned minus delivered, in hours: the error in what the plan said this
   * month would look like. Null when there was no plan to be wrong.
   */
  plan_error_hours: number | null;
  engagement: AreaMonthEngagement;
  hours_note?: string;
  note?: string;
}

export interface MonthComparison {
  month: IsoMonth;
  /** Ordered by area identity. Never by hours, and never by error. */
  rows: AreaMonthComparison[];
  /** In-scope areas with no row this month: unknown, not zero. */
  areas_without_a_row: string[];
  /** Areas whose plan figure is absent, so whose error is unresolved. */
  areas_without_a_plan: string[];
}

/** Every month the file reports, most recent first. */
export function monthsReported(document: ActualsDocument): IsoMonth[] {
  const months = new Set(document.area_months.map((row) => row.month));
  return [...months].sort((a, b) => b.localeCompare(a));
}

/** The most recent month the file reports, or null when it reports none. */
export function latestMonth(document: ActualsDocument): IsoMonth | null {
  return monthsReported(document)[0] ?? null;
}

/**
 * The planned-against-delivered view of one month.
 *
 * `inScopeAreaIds` is the deployment's own area list. Supplying it fixes the
 * row order and lets the result name the areas that reported nothing; omitting
 * it falls back to lexical order over the rows that exist, which is what a
 * caller with no profile to hand can honestly say.
 */
export function compareMonth(
  document: ActualsDocument,
  month: IsoMonth,
  inScopeAreaIds?: readonly string[],
): MonthComparison {
  const byArea = new Map<string, AreaMonthComparison>();

  for (const row of document.area_months) {
    if (row.month !== month) continue;
    const planned = row.hours.allocated_hours;
    const delivered = row.hours.delivered_hours;
    byArea.set(row.area_id, {
      area_id: row.area_id,
      month,
      planned_hours: planned,
      delivered_hours: delivered,
      plan_error_hours: planned === null ? null : planned - delivered,
      engagement: row.engagement,
      ...(row.hours.hours_note === undefined ? {} : { hours_note: row.hours.hours_note }),
      ...(row.note === undefined ? {} : { note: row.note }),
    });
  }

  const order =
    inScopeAreaIds === undefined
      ? [...byArea.keys()].sort((a, b) => a.localeCompare(b))
      : inScopeAreaIds;

  const rows: AreaMonthComparison[] = [];
  const areasWithoutARow: string[] = [];
  for (const areaId of order) {
    const row = byArea.get(areaId);
    if (row === undefined) areasWithoutARow.push(areaId);
    else rows.push(row);
  }
  // An area that reported a row this month but is not in scope for this
  // deployment is a mismatch the loader already refuses; if one arrives
  // anyway it is appended rather than dropped, so nothing goes missing.
  for (const [areaId, row] of byArea) {
    if (!rows.includes(row) && !order.includes(areaId)) rows.push(row);
  }

  return {
    month,
    rows,
    areas_without_a_row: areasWithoutARow,
    areas_without_a_plan: rows
      .filter((row) => row.planned_hours === null)
      .map((row) => row.area_id),
  };
}
