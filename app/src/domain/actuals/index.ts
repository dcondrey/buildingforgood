/**
 * Delivered actuals — public surface for other modules.
 *
 * An operator supplies actuals; the tool validates them, and `compare.ts`
 * subtracts delivered hours from planned ones, one area-month at a time. That
 * subtraction is the whole of the analysis and is meant to stay that way: what
 * this module will never compute is listed in `NOT_SCORABLE_FROM_ACTUALS` and
 * in every file's own `intended_analysis.will_never_compute`.
 */

export type {
  ActualsContract,
  ActualsDocument,
  ActualsIssue,
  ActualsReporting,
  ActualsValidation,
  AreaMonthActual,
  AreaMonthEngagement,
  AreaMonthHours,
  EngagementKind,
  EngagementMeasure,
  IntendedAnalysis,
  IsoDate,
  IsoMonth,
  SuppressionMarker,
} from "./types.ts";

export type { ActualsValidationOptions } from "./actuals.ts";

export type { AreaMonthComparison, MonthComparison } from "./compare.ts";

export type { ActualsIngestResult } from "./ingest.ts";

export { ingestActuals, ingestParsedActuals } from "./ingest.ts";

export { NOT_SCORABLE_FROM_ACTUALS, compareMonth, latestMonth, monthsReported } from "./compare.ts";

export {
  ACTUALS_COUNT_FIELDS,
  ACTUALS_SCHEMA_VERSION,
  ActualsError,
  BASELINE_WILL_NEVER_COMPUTE,
  ENGAGEMENT_KINDS,
  SMALL_CELL_THRESHOLD,
  hasRecordedActuals,
  loadActuals,
  parseActuals,
  suppressEngagementCount,
  validateActuals,
} from "./actuals.ts";
