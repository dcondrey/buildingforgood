/**
 * TypeScript mirror of `pipeline/src/stillhere_pipeline/contracts.py`.
 *
 * Both files enforce the same observations.v0 and quality_report.v0
 * artifact contracts (issue #4) so an invalid artifact fails the same way
 * regardless of which language reads it first. Keep them in sync by hand:
 * a rule added to one validator without its mirror is a contract that only
 * holds in one language, which is exactly the gap #4 exists to close. See
 * docs/project/ARTIFACT_CONTRACTS.md for the paired-file list and the rule
 * for what belongs in the contract block versus the schema shape.
 */

// Field names that must never appear in deployment-safe artifacts (issue #7
// hardens this further; the build refuses to emit them from day one).
const PRECISE_FIELD_DENY_LIST = new Set([
  "x",
  "y",
  "lat",
  "latitude",
  "lng",
  "lon",
  "longitude",
  "address",
  "street_address",
]);

export class ContractViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractViolation";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively reject any deny-listed key anywhere in the artifact.
 *
 * Key matching is case-insensitive ("Lat" and "X" are as precise as "lat"
 * and "x"), mirroring the Python guard's case-folding.
 */
export function assertNoPreciseFields(node: unknown, path = "$"): void {
  if (isPlainObject(node)) {
    for (const [key, value] of Object.entries(node)) {
      if (PRECISE_FIELD_DENY_LIST.has(key.toLowerCase())) {
        throw new ContractViolation(`precise-location field "${key}" at ${path}`);
      }
      assertNoPreciseFields(value, `${path}.${key}`);
    }
  } else if (Array.isArray(node)) {
    node.forEach((item, index) => assertNoPreciseFields(item, `${path}[${index}]`));
  }
}

// The count-bearing paths in an observation row. The artifact DECLARES these
// (issue #4 slice) so the privacy scanner's small-cell rule is a lookup, not
// shape-inference; this constant is the single source the validator checks
// against, mirroring OBSERVATION_COUNT_FIELDS in the Python contract.
const OBSERVATION_TYPE_FIELDS = ["individual", "structure", "vehicle"] as const;
const OBSERVATION_COUNT_FIELDS = [
  "total",
  ...OBSERVATION_TYPE_FIELDS.map((name) => `by_type.${name}`),
];
const OBSERVATION_SUPPRESSION_FIELD = "suppressed";

function requireField(
  doc: Record<string, unknown>,
  field: string,
  check: (value: unknown) => boolean,
  kindLabel: string,
): unknown {
  if (!(field in doc)) {
    throw new ContractViolation(`missing required field: ${field}`);
  }
  const value = doc[field];
  if (!check(value)) {
    throw new ContractViolation(`field ${field} has wrong type: expected ${kindLabel}`);
  }
  return value;
}

const requireString = (doc: Record<string, unknown>, field: string): string =>
  requireField(doc, field, (v) => typeof v === "string", "string") as string;

const requireDict = (doc: Record<string, unknown>, field: string): Record<string, unknown> =>
  requireField(doc, field, isPlainObject, "object") as Record<string, unknown>;

const requireList = (doc: Record<string, unknown>, field: string): unknown[] =>
  requireField(doc, field, Array.isArray, "array") as unknown[];

// `total` must be an int, and (as in Python, where bool is an int subclass)
// a boolean total is a contract violation, not a 1.
const requireInt = (doc: Record<string, unknown>, field: string): number =>
  requireField(doc, field, (v) => typeof v === "number" && Number.isInteger(v), "int") as number;

function validateContractBlock(doc: Record<string, unknown>, smallCellThreshold: number): void {
  const contract = requireDict(doc, "contract");
  const countFields = requireList(contract, "count_fields");
  if (countFields.some((field) => typeof field !== "string")) {
    throw new ContractViolation("contract count_fields must contain only strings");
  }
  const sortedActual = [...(countFields as string[])].sort();
  const sortedExpected = [...OBSERVATION_COUNT_FIELDS].sort();
  if (JSON.stringify(sortedActual) !== JSON.stringify(sortedExpected)) {
    throw new ContractViolation(
      "contract count_fields must declare exactly the count-bearing paths: " +
        `expected ${JSON.stringify(sortedExpected)}, got ${JSON.stringify(sortedActual)}`,
    );
  }
  const threshold = requireInt(contract, "small_cell_threshold");
  if (threshold !== smallCellThreshold) {
    throw new ContractViolation(
      `contract small_cell_threshold ${threshold} does not match the policy threshold ${smallCellThreshold}`,
    );
  }
  const marker = requireDict(contract, "suppression_marker");
  const markerField = requireString(marker, "field");
  if (markerField !== OBSERVATION_SUPPRESSION_FIELD) {
    throw new ContractViolation(
      `suppression_marker field must be "${OBSERVATION_SUPPRESSION_FIELD}", got "${markerField}"`,
    );
  }
  const affirmative = marker["affirmative"];
  if (!Array.isArray(affirmative) || affirmative.length !== 1 || affirmative[0] !== true) {
    throw new ContractViolation("suppression_marker affirmative encoding must be exactly [true]");
  }
}

export interface ObservationsV0 {
  schema: "observations.v0";
  contract: {
    count_fields: string[];
    small_cell_threshold: number;
    suppression_marker: { field: string; affirmative: [true] };
  };
  source: { source_id: string; retrieved_at: string };
  months_observed: string[];
  missing_months_global: string[];
  neighborhoods: Array<{
    neighborhood: string;
    label_variants: string[];
    coverage_start: string;
    coverage_end: string;
    observed_gap_months: string[];
    observations: unknown[];
  }>;
  comparability_events: unknown[];
}

/**
 * Validate an observations.v0 artifact. Mirrors
 * `validate_observations_v0` in the Python contract exactly, including the
 * small-cell suppression threshold, which the caller must supply (it lives
 * in `stillhere_pipeline.suppress.SMALL_CELL_THRESHOLD` on the Python side;
 * pass the same value here rather than hardcoding it twice).
 */
export function parseObservationsV0(input: unknown, smallCellThreshold: number): ObservationsV0 {
  if (!isPlainObject(input)) {
    throw new ContractViolation("field $ has wrong type: expected object");
  }
  const doc = input;
  if (requireString(doc, "schema") !== "observations.v0") {
    throw new ContractViolation("schema must be observations.v0");
  }
  validateContractBlock(doc, smallCellThreshold);
  const source = requireDict(doc, "source");
  requireString(source, "source_id");
  requireString(source, "retrieved_at");
  const neighborhoods = requireList(doc, "neighborhoods");
  if (neighborhoods.length === 0) {
    throw new ContractViolation("neighborhoods must be non-empty");
  }
  for (const entry of neighborhoods) {
    if (!isPlainObject(entry)) {
      throw new ContractViolation("neighborhood entries must be objects");
    }
    requireString(entry, "neighborhood");
    requireList(entry, "label_variants");
    requireString(entry, "coverage_start");
    requireString(entry, "coverage_end");
    const observations = requireList(entry, "observations");
    for (const observation of observations) {
      if (!isPlainObject(observation)) {
        throw new ContractViolation("observations must be objects");
      }
      requireString(observation, "month");
      if (observation["suppressed"] === true) {
        // Whole-row small-cell suppression: total is null and no per-type
        // breakdown is published.
        if (observation["total"] !== null) {
          throw new ContractViolation("suppressed rows must have total null");
        }
        if ("by_type" in observation) {
          throw new ContractViolation("suppressed rows must not publish by_type");
        }
        continue;
      }
      requireInt(observation, "total");
      const byType = requireDict(observation, "by_type");
      const byTypeKeys = [...Object.keys(byType)].sort();
      const expectedKeys = [...OBSERVATION_TYPE_FIELDS].sort();
      if (JSON.stringify(byTypeKeys) !== JSON.stringify(expectedKeys)) {
        throw new ContractViolation(
          "by_type fields must match the declared count paths exactly: " +
            `expected ${JSON.stringify(expectedKeys)}, got ${JSON.stringify(byTypeKeys)}`,
        );
      }
      for (const [typeName, value] of Object.entries(byType)) {
        if (value !== null && (typeof value !== "number" || !Number.isInteger(value))) {
          throw new ContractViolation(`by_type value for ${typeName} must be an int or null`);
        }
      }
    }
  }
  requireList(doc, "comparability_events");
  assertNoPreciseFields(doc);
  return doc as unknown as ObservationsV0;
}

export interface QualityReportV0 {
  schema: "quality_report.v0";
  source: Record<string, unknown>;
  row_counts: Record<string, unknown>;
  duplicates_dropped: number;
  invalid_rows: unknown[];
  missing_months_global: unknown[];
  file_total_mismatches: unknown[];
  comparability_events: unknown[];
}

/** Validate a quality_report.v0 artifact. Mirrors `validate_quality_report_v0`. */
export function parseQualityReportV0(input: unknown): QualityReportV0 {
  if (!isPlainObject(input)) {
    throw new ContractViolation("field $ has wrong type: expected object");
  }
  const doc = input;
  if (requireString(doc, "schema") !== "quality_report.v0") {
    throw new ContractViolation("schema must be quality_report.v0");
  }
  requireDict(doc, "source");
  requireDict(doc, "row_counts");
  requireInt(doc, "duplicates_dropped");
  requireList(doc, "invalid_rows");
  requireList(doc, "missing_months_global");
  requireList(doc, "file_total_mismatches");
  requireList(doc, "comparability_events");
  assertNoPreciseFields(doc);
  return doc as unknown as QualityReportV0;
}
