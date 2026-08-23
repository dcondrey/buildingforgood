/**
 * Delivered actuals — public surface for other modules.
 *
 * An operator supplies actuals; the tool validates them and, for now, does
 * nothing else with them. Nothing here is wired into the interface: `App.tsx`
 * and the shell are owned elsewhere and do the wiring.
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
