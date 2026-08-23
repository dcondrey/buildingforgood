/**
 * The per-area plan as a spreadsheet.
 *
 * Two decisions worth stating:
 *
 * 1. **The reason string is copied, never rewritten.** `why_this_amount` is
 *    the artifact's own derivation sentence, verbatim. It is the disclosure
 *    that makes an hour count reviewable, so a shortened version of it is a
 *    weaker claim wearing the same column name.
 * 2. **The disclosure is a column, not a footer.** A row pulled out of this
 *    file and pasted into an email carries its own limits with it. Repeating
 *    the sentence on every row is redundant on purpose.
 *
 * No column has a person as its denominator, and there is no cost column at
 * all: cost is priced per staff-hour, per area, and per plan in the app, and
 * nothing here needs to restate it. `assertReviewableColumns` fails the
 * export rather than emitting a header that prices a person.
 */

import { PLAN_DISCLOSURE_LINE } from "./disclosure.ts";

export interface PlanExportRow {
  areaId: string;
  areaName: string;
  hours: number;
  /** The artifact's own "why this amount" sentence. Carried verbatim. */
  reason: string;
  locked: boolean;
  floorHours: number;
  unmetHours: number;
}

export const PLAN_CSV_COLUMNS = [
  "neighborhood",
  "planned_staff_hours",
  "why_this_amount",
  "set_by_a_person",
  "guaranteed_minimum_hours",
  "planning_load_moved_by_the_minimum_hours",
  "limits",
] as const;

/* The denominators a column may never have, and the signal it may never
 * carry. Patterns rather than lists, so they never read as copy. */
const PERSON_DENOMINATOR_COLUMN =
  /per[_-]?(person|people|contact|client|individual|capita|head|covered|served|encounter|resident|participant)/i;
const REPORT_VOLUME_COLUMN =
  /(complaint|311|service_request|call_volume|report_volume|nuisance|hotline)/i;

export class PlanExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanExportError";
  }
}

/** Refuses a header a reviewer could not defend, before a file is written. */
export function assertReviewableColumns(columns: readonly string[]): void {
  for (const column of columns) {
    if (PERSON_DENOMINATOR_COLUMN.test(column)) {
      throw new PlanExportError(
        `"${column}" prices a person. Every figure in an export is per staff-hour, per area, or per plan.`,
      );
    }
    if (REPORT_VOLUME_COLUMN.test(column)) {
      throw new PlanExportError(
        `"${column}" reads as report volume, which measures who reports rather than who is present and never enters a plan.`,
      );
    }
  }
}

function csvField(value: string | number | boolean): string {
  const text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export interface PlanCsvContext {
  budget: number;
  guardEnabled: boolean;
  coverageFloor: number;
}

export function buildPlanCsv(rows: readonly PlanExportRow[], context: PlanCsvContext): string {
  assertReviewableColumns(PLAN_CSV_COLUMNS);
  const floorPerArea = context.guardEnabled ? context.coverageFloor : 0;
  const table: Array<Array<string | number | boolean>> = rows.map((row) => [
    row.areaName,
    row.hours,
    row.reason,
    row.locked,
    floorPerArea,
    row.unmetHours,
    PLAN_DISCLOSURE_LINE,
  ]);
  table.push([
    "All neighborhoods",
    rows.reduce((sum, row) => sum + row.hours, 0),
    `sum of the rows above, against the ${context.budget} staff-hours you set`,
    false,
    floorPerArea * rows.length,
    rows.reduce((sum, row) => sum + row.unmetHours, 0),
    PLAN_DISCLOSURE_LINE,
  ]);
  const lines = [PLAN_CSV_COLUMNS.join(","), ...table.map((row) => row.map(csvField).join(","))];
  return `${lines.join("\r\n")}\r\n`;
}
