/**
 * Delivered-actuals loader and validator.
 *
 * Validates a file against `config/schema/actuals.v1.schema.json` without a
 * schema-runtime dependency, matching the organization-profile loader next
 * door: this is a static site, and shipping a validator library to check a
 * file an operator writes by hand once a month is the wrong trade.
 *
 * The suppression rule here is not a new rule. It is the first branch of
 * `docs/policy/small-cell-suppression.md` — whole-row suppression when
 * `0 < total < SMALL_CELL_THRESHOLD` — applied to an engagement count,
 * because an engagement count of one is a person exactly as an observation
 * count of one is. The threshold was read from
 * `pipeline/src/stillhere_pipeline/suppress.py` (`SMALL_CELL_THRESHOLD = 5`),
 * which the policy document and the scanner's `min_cell` both pin. Branches
 * 2 to 4 of the policy govern a `by_type` breakdown; this file has none, and
 * the schema cannot express one, which is why they do not appear here.
 *
 * A file that the pipeline's privacy scanner would block must not enter
 * through this door either, so the scanner's rule families are mirrored:
 * forbidden field names, address and coordinate shapes hiding in free text,
 * coordinate-shaped numbers, and unsuppressed small counts. Over-blocking is
 * the accepted error direction, as it is there.
 *
 * Failure is loud and names the field. Nothing here is wired into the
 * interface; `App.tsx` and the shell are owned elsewhere and do the wiring.
 */

import type {
  ActualsDocument,
  ActualsIssue,
  ActualsValidation,
  AreaMonthActual,
  AreaMonthEngagement,
} from "./types.ts";

export const ACTUALS_SCHEMA_VERSION = "actuals/v1";

/**
 * Mirrors `SMALL_CELL_THRESHOLD` in `pipeline/src/stillhere_pipeline/suppress.py`
 * and the privacy scanner's `min_cell`. All three, plus
 * `docs/policy/small-cell-suppression.md`, change together or not at all.
 */
export const SMALL_CELL_THRESHOLD = 5;

/** The one count-bearing path in a row. Declared, not inferred. */
export const ACTUALS_COUNT_FIELDS = ["engagement.count"] as const;

export const ENGAGEMENT_KINDS = ["contacts", "engagements"] as const;

/**
 * Exclusions every file must carry. An adopting organization may add to this
 * list. The validator stops it subtracting.
 */
export const BASELINE_WILL_NEVER_COMPUTE = [
  "per_person_or_household_outcome_tracking",
  "service_eligibility_or_entitlement_determination",
  "enforcement_abatement_or_removal_prioritization",
  "staff_or_team_performance_ranking",
  "causal_attribution_of_area_change_to_delivered_hours",
  "published_rollup_totals_across_areas_or_months",
  "complaint_or_311_derived_demand_estimates",
] as const;

const COMPLAINT_REASON =
  "Complaint, 311, and service-request volume are not representable in an actuals file. " +
  "They measure who reports, not who is present or who was served, and an actuals field is " +
  "precisely the seam through which they would re-enter the system as a measured outcome.";

const PERSON_LEVEL_REASON =
  "Person-level, identifier, and precise-location fields are not representable in an actuals " +
  "file. The grain is fixed at area-month aggregate and the only person-bearing value is a count.";

const FORBIDDEN_NAME_RULES: Array<{ token: string; exact: boolean; reason: string }> = [
  { token: "complaint", exact: false, reason: COMPLAINT_REASON },
  { token: "311", exact: false, reason: COMPLAINT_REASON },
  { token: "getitdone", exact: false, reason: COMPLAINT_REASON },
  { token: "servicerequest", exact: false, reason: COMPLAINT_REASON },
  { token: "citizenreport", exact: false, reason: COMPLAINT_REASON },
  { token: "callvolume", exact: false, reason: COMPLAINT_REASON },
  { token: "reportsreceived", exact: false, reason: COMPLAINT_REASON },
  { token: "nuisance", exact: false, reason: COMPLAINT_REASON },
  { token: "hotline", exact: false, reason: COMPLAINT_REASON },
  { token: "hmis", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "personlevel", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "perperson", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "latitude", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "longitude", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "streetaddress", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "geohash", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "pluscode", exact: false, reason: PERSON_LEVEL_REASON },
  { token: "lat", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "lon", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "lng", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "coords", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "coordinate", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "coordinates", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "geometry", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "blockid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "parcelid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "apn", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "address", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "crossstreet", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "crossstreets", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "siteid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "campid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "encampmentid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "email", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "phone", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "ssn", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "dob", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "dateofbirth", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "firstname", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "lastname", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "fullname", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "personname", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "clientname", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "personid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "clientid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "caseid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "householdid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "encounterid", exact: true, reason: PERSON_LEVEL_REASON },
];

// Value shapes the privacy scanner refuses inside otherwise innocent strings
// (`_scan_string` in pipeline/src/stillhere_pipeline/privacy.py).
const STREET_ADDRESS_RE =
  /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z][\w.'-]*(?:\s+[A-Za-z][\w.'-]*){0,3}\s+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Pl|Place|Way|Ter|Terrace|Pkwy|Parkway|Hwy|Highway|Cir|Circle)\b\.?/i;
const COORD_PAIR_RE = /-?\d{1,3}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;
const PLUS_CODE_RE = /\b[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\b/;

// The scanner's San Diego numeric heuristic. A decimal with at least three
// decimal places inside the longitude span is very nearly unambiguous; the
// latitude span overlaps plausible metrics, so latitude alone only warns.
const COORDINATE_DECIMALS = 3;
const SD_LON_RANGE: [number, number] = [-117.7, -116.5];
const SD_LAT_RANGE: [number, number] = [32.4, 33.6];

const AREA_ID = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const PROFILE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

interface Ctx {
  errors: ActualsIssue[];
  warnings: ActualsIssue[];
}

export interface ActualsValidationOptions {
  /**
   * Area ids from the deployment's organization profile. When supplied, a
   * row naming an area the profile does not define is an error rather than a
   * silently orphaned row.
   */
  knownAreaIds?: Iterable<string>;
  /** The profile's `profile_id`, when the caller wants the pairing checked. */
  expectedProfileId?: string;
}

/** Thrown by `parseActuals`. Carries every finding, not just the first. */
export class ActualsError extends Error {
  readonly issues: ActualsIssue[];

  constructor(issues: ActualsIssue[]) {
    super(formatIssues(issues));
    this.name = "ActualsError";
    this.issues = issues;
  }
}

function formatIssues(issues: ActualsIssue[]): string {
  if (issues.length === 0) return "Invalid actuals file.";
  const [first, ...rest] = issues;
  const tail = rest.length === 0 ? "" : ` (and ${rest.length} more field problem(s))`;
  return `Invalid actuals file at \`${first.field}\`: ${first.message}${tail}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function join(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

function fail(ctx: Ctx, field: string, message: string): void {
  ctx.errors.push({ field, message });
}

function warn(ctx: Ctx, field: string, message: string): void {
  ctx.warnings.push({ field, message });
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function forbiddenReason(name: string): string | null {
  const normalized = normalizeKey(name);
  for (const rule of FORBIDDEN_NAME_RULES) {
    const hit = rule.exact ? normalized === rule.token : normalized.includes(rule.token);
    if (hit) return rule.reason;
  }
  return null;
}

function complaintShapedText(text: string): boolean {
  const normalized = normalizeKey(text);
  return FORBIDDEN_NAME_RULES.some(
    (rule) => rule.reason === COMPLAINT_REASON && normalized.includes(rule.token),
  );
}

function decimalPlaces(value: number): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

function locationShapeInString(text: string): string | null {
  if (STREET_ADDRESS_RE.test(text)) return "a street address";
  if (COORD_PAIR_RE.test(text)) return "a coordinate pair";
  if (PLUS_CODE_RE.test(text)) return "an Open Location plus code";
  return null;
}

/**
 * Deep scan of every property name, string, and number in the document,
 * before any structural check. Mirrors the privacy scanner's first three
 * rule families so a file that would fail the build fails at import instead.
 */
function scanForbiddenShapes(value: unknown, path: string, ctx: Ctx): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenShapes(item, `${path}[${index}]`, ctx));
    return;
  }
  if (typeof value === "string") {
    const shape = locationShapeInString(value);
    if (shape !== null) {
      fail(
        ctx,
        path,
        `This text contains ${shape}. A precise location is not publishable, including inside a ` +
          "free-text note. Describe the area, never the place.",
      );
    }
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (decimalPlaces(value) >= COORDINATE_DECIMALS) {
      if (value >= SD_LON_RANGE[0] && value <= SD_LON_RANGE[1]) {
        fail(
          ctx,
          path,
          `The value ${value} is coordinate-shaped: a longitude in this deployment's span. ` +
            "No coordinate may enter or leave the system.",
        );
      } else if (value >= SD_LAT_RANGE[0] && value <= SD_LAT_RANGE[1]) {
        warn(
          ctx,
          path,
          `The value ${value} is latitude-shaped. It is allowed because the latitude span ` +
            "overlaps plausible hour figures, but check that it is a measurement, not a place.",
        );
      }
    }
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = join(path, key);
    const reason = forbiddenReason(key);
    if (reason !== null) fail(ctx, childPath, reason);
    scanForbiddenShapes(child, childPath, ctx);
  }
}

function checkKeys(
  ctx: Ctx,
  obj: Record<string, unknown>,
  path: string,
  required: string[],
  optional: string[],
): void {
  for (const key of required) {
    if (!(key in obj) || obj[key] === undefined) {
      fail(ctx, join(path, key), "Required field is missing.");
    }
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      fail(
        ctx,
        join(path, key),
        "Unknown field. The actuals schema is closed: a field it does not define cannot be added " +
          "without a schema version change, so that no new input can reach a decision unreviewed.",
      );
    }
  }
}

function readObject(ctx: Ctx, value: unknown, field: string): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  // Absence is reported once, by the `checkKeys` call that owns the parent.
  if (value !== undefined) fail(ctx, field, "Expected an object.");
  return null;
}

function readString(ctx: Ctx, value: unknown, field: string): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.trim() === "") {
    fail(ctx, field, "Expected a non-empty string.");
    return null;
  }
  return value;
}

function readPattern(ctx: Ctx, value: unknown, field: string, re: RegExp, shape: string): void {
  const text = readString(ctx, value, field);
  if (text === null) return;
  if (!re.test(text)) fail(ctx, field, `Expected ${shape}; found ${JSON.stringify(text)}.`);
}

function readLiteral(ctx: Ctx, value: unknown, field: string, expected: unknown): void {
  if (value === undefined) return;
  if (value !== expected) {
    fail(
      ctx,
      field,
      `Expected the fixed value ${JSON.stringify(expected)}; found ${JSON.stringify(value)}.`,
    );
  }
}

function readEnum(ctx: Ctx, value: unknown, field: string, allowed: readonly string[]): void {
  if (value === undefined) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    fail(ctx, field, `Expected one of ${allowed.join(", ")}; found ${JSON.stringify(value)}.`);
  }
}

function readStringArray(
  ctx: Ctx,
  value: unknown,
  field: string,
  minItems: number,
): string[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value)) {
    fail(ctx, field, "Expected an array of strings.");
    return null;
  }
  if (value.length < minItems) {
    fail(ctx, field, `Expected at least ${minItems} entr(y|ies); found ${value.length}.`);
    return null;
  }
  const out: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") {
      fail(ctx, `${field}[${index}]`, "Expected a non-empty string.");
      continue;
    }
    out.push(item);
  }
  return out;
}

function validateReporting(ctx: Ctx, value: unknown): void {
  const obj = readObject(ctx, value, "reporting");
  if (obj === null) return;
  checkKeys(
    ctx,
    obj,
    "reporting",
    ["organization_name", "reported_by_role", "method_note", "last_updated"],
    ["completeness_note"],
  );
  readString(ctx, obj.organization_name, "reporting.organization_name");
  readString(ctx, obj.reported_by_role, "reporting.reported_by_role");
  readString(ctx, obj.method_note, "reporting.method_note");
  readPattern(ctx, obj.last_updated, "reporting.last_updated", ISO_DATE, "a YYYY-MM-DD date");
  if (obj.completeness_note !== undefined) {
    readString(ctx, obj.completeness_note, "reporting.completeness_note");
  }
}

function validateMeasure(ctx: Ctx, value: unknown): void {
  const obj = readObject(ctx, value, "engagement_measure");
  if (obj === null) return;
  checkKeys(
    ctx,
    obj,
    "engagement_measure",
    [
      "kind",
      "label",
      "definition",
      "collection_method",
      "counts_encounters_not_people",
      "unique_persons_measure",
    ],
    [],
  );
  readEnum(ctx, obj.kind, "engagement_measure.kind", ENGAGEMENT_KINDS);
  readLiteral(
    ctx,
    obj.counts_encounters_not_people,
    "engagement_measure.counts_encounters_not_people",
    true,
  );
  readLiteral(ctx, obj.unique_persons_measure, "engagement_measure.unique_persons_measure", false);

  // The declared measure is where a complaint count would be laundered into
  // an engagement count, so the words that DEFINE the number are scanned, not
  // only the field names. Only the complaint family is scanned here: a
  // collection method that honestly names the case-management system it came
  // out of must stay sayable. A narrative caveat mentioning complaint data
  // belongs in `notes`, which is not scanned this way.
  for (const key of ["kind", "label", "definition", "collection_method"]) {
    const text = readString(ctx, obj[key], `engagement_measure.${key}`);
    if (text === null) continue;
    if (complaintShapedText(text)) fail(ctx, `engagement_measure.${key}`, COMPLAINT_REASON);
  }
}

function validateContract(ctx: Ctx, value: unknown): void {
  const obj = readObject(ctx, value, "contract");
  if (obj === null) return;
  checkKeys(
    ctx,
    obj,
    "contract",
    ["grain", "count_fields", "small_cell_threshold", "suppression_marker"],
    [],
  );
  readLiteral(ctx, obj.grain, "contract.grain", "area_month_aggregate");

  const declared = obj.count_fields;
  if (declared !== undefined) {
    const expected = JSON.stringify([...ACTUALS_COUNT_FIELDS]);
    if (!Array.isArray(declared) || JSON.stringify(declared) !== expected) {
      fail(
        ctx,
        "contract.count_fields",
        `Must declare exactly ${expected}. The declaration is what makes the small-cell rule a ` +
          "lookup rather than a guess about field names; a file whose declaration drifts from " +
          "the policy is rejected rather than scanned by inference.",
      );
    }
  }

  if (obj.small_cell_threshold !== undefined && obj.small_cell_threshold !== SMALL_CELL_THRESHOLD) {
    fail(
      ctx,
      "contract.small_cell_threshold",
      `Must be ${SMALL_CELL_THRESHOLD}, matching SMALL_CELL_THRESHOLD in ` +
        "pipeline/src/stillhere_pipeline/suppress.py and the privacy scanner's min_cell. " +
        `Found ${JSON.stringify(obj.small_cell_threshold)}. A file cannot declare a weaker ` +
        "policy than the one enforced.",
    );
  }

  const marker = readObject(ctx, obj.suppression_marker, "contract.suppression_marker");
  if (marker === null) return;
  checkKeys(ctx, marker, "contract.suppression_marker", ["field", "affirmative_values"], []);
  readLiteral(ctx, marker.field, "contract.suppression_marker.field", "suppressed");
  if (marker.affirmative_values !== undefined) {
    const values = marker.affirmative_values;
    if (!Array.isArray(values) || values.length !== 1 || values[0] !== true) {
      fail(
        ctx,
        "contract.suppression_marker.affirmative_values",
        'Must be exactly [true]. Only boolean true suppresses: false, 0, null and "no" mean ' +
          "PUBLISHED, because a privacy gate fails closed.",
      );
    }
  }
}

function validateIntendedAnalysis(ctx: Ctx, value: unknown): void {
  const obj = readObject(ctx, value, "intended_analysis");
  if (obj === null) return;
  checkKeys(
    ctx,
    obj,
    "intended_analysis",
    ["status", "preconditions", "planned_when_data_exists", "will_never_compute", "rationale"],
    [],
  );
  readLiteral(ctx, obj.status, "intended_analysis.status", "documented_not_implemented");
  readStringArray(ctx, obj.preconditions, "intended_analysis.preconditions", 1);
  readStringArray(
    ctx,
    obj.planned_when_data_exists,
    "intended_analysis.planned_when_data_exists",
    1,
  );
  readString(ctx, obj.rationale, "intended_analysis.rationale");

  const excluded = readStringArray(
    ctx,
    obj.will_never_compute,
    "intended_analysis.will_never_compute",
    1,
  );
  if (excluded === null) return;
  const present = new Set(excluded);
  const missing = BASELINE_WILL_NEVER_COMPUTE.filter((entry) => !present.has(entry));
  if (missing.length > 0) {
    fail(
      ctx,
      "intended_analysis.will_never_compute",
      `Missing baseline exclusion(s): ${missing.join(", ")}. An adopting organization may add to ` +
        "this list and may not subtract from it; deleting an entry does not change what the tool " +
        "does, it only removes the disclosure that it will not do it.",
    );
  }
}

function validateEngagement(ctx: Ctx, value: unknown, path: string): void {
  const obj = readObject(ctx, value, path);
  if (obj === null) return;
  checkKeys(ctx, obj, path, ["count", "suppressed"], ["not_recorded"]);

  const countField = join(path, "count");
  const rawCount = obj.count;
  let count: number | null = null;
  if (rawCount === null) {
    count = null;
  } else if (typeof rawCount === "number" && Number.isInteger(rawCount) && rawCount >= 0) {
    count = rawCount;
  } else if (rawCount !== undefined) {
    fail(ctx, countField, "Expected a whole number of 0 or more, or null.");
    return;
  }

  const suppressed = obj.suppressed;
  if (suppressed !== undefined && typeof suppressed !== "boolean") {
    fail(ctx, join(path, "suppressed"), "Expected true or false.");
    return;
  }
  const notRecorded = obj.not_recorded;
  if (notRecorded !== undefined && typeof notRecorded !== "boolean") {
    fail(ctx, join(path, "not_recorded"), "Expected true or false.");
    return;
  }

  if (suppressed === true) {
    if (count !== null) {
      fail(
        ctx,
        countField,
        "A suppressed count must be null. Publishing the number alongside the suppression marker " +
          "discloses exactly what suppression exists to withhold.",
      );
    }
    if (notRecorded === true) {
      fail(
        ctx,
        join(path, "not_recorded"),
        "A row cannot be both suppressed and not recorded. Suppressed means the number exists and " +
          "is withheld; not recorded means it was never captured. Say which.",
      );
    }
    return;
  }

  if (notRecorded === true) {
    if (count !== null) {
      fail(ctx, countField, "A not-recorded count must be null.");
    }
    return;
  }

  if (count === null) {
    fail(
      ctx,
      countField,
      "A null count must declare why: set `suppressed` to true if it is withheld under the " +
        "small-cell policy, or `not_recorded` to true if no count was captured. A bare null is " +
        "ambiguous, and the ambiguity would be read as zero.",
    );
    return;
  }

  // Branch 1 of docs/policy/small-cell-suppression.md, applied to the single
  // count this schema carries. Zero is publishable; it identifies nobody.
  if (count > 0 && count < SMALL_CELL_THRESHOLD) {
    fail(
      ctx,
      countField,
      `The value ${count} is below the small-cell threshold of ${SMALL_CELL_THRESHOLD} and ` +
        'identifies people. Supply it as {"count": null, "suppressed": true}. This is the same ' +
        "rule that governs published observation cells (docs/policy/small-cell-suppression.md); " +
        "an engagement count of one is a person exactly as an observation of one is.",
    );
  }
}

function validateHours(ctx: Ctx, value: unknown, path: string): { delivered: number | null } {
  const obj = readObject(ctx, value, path);
  if (obj === null) return { delivered: null };
  checkKeys(ctx, obj, path, ["allocated_hours", "delivered_hours"], ["hours_note"]);

  const allocated = obj.allocated_hours;
  if (allocated !== null && allocated !== undefined) {
    if (typeof allocated !== "number" || !Number.isFinite(allocated) || allocated < 0) {
      fail(ctx, join(path, "allocated_hours"), "Expected a number of 0 or more, or null.");
    }
  }

  let delivered: number | null = null;
  const rawDelivered = obj.delivered_hours;
  if (rawDelivered !== undefined) {
    if (typeof rawDelivered !== "number" || !Number.isFinite(rawDelivered) || rawDelivered < 0) {
      fail(ctx, join(path, "delivered_hours"), "Expected a number of 0 or more.");
    } else {
      delivered = rawDelivered;
    }
  }
  if (obj.hours_note !== undefined) readString(ctx, obj.hours_note, join(path, "hours_note"));

  if (allocated === null && delivered !== null && delivered > 0) {
    warn(
      ctx,
      join(path, "allocated_hours"),
      "Hours were delivered with no planned figure recorded, so this month has nothing to compare " +
        "against. That is a legitimate state for months predating adoption; it is not zero.",
    );
  }
  return { delivered };
}

function validateAreaMonths(
  ctx: Ctx,
  value: unknown,
  knownAreaIds: Set<string> | null,
): AreaMonthActual[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) fail(ctx, "area_months", "Expected an array of area-month rows.");
    return [];
  }
  const rows: AreaMonthActual[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const path = `area_months[${index}]`;
    const obj = readObject(ctx, raw, path);
    if (obj === null) continue;
    checkKeys(ctx, obj, path, ["area_id", "month", "hours", "engagement"], ["note"]);

    const areaId = readString(ctx, obj.area_id, join(path, "area_id"));
    if (areaId !== null && !AREA_ID.test(areaId)) {
      fail(ctx, join(path, "area_id"), "Expected a lowercase snake_case area identifier.");
    } else if (areaId !== null && knownAreaIds !== null && !knownAreaIds.has(areaId)) {
      fail(
        ctx,
        join(path, "area_id"),
        `No area \`${areaId}\` exists in this deployment's profile. Actuals recorded against one ` +
          "geography must never be read under another.",
      );
    }
    readPattern(ctx, obj.month, join(path, "month"), ISO_MONTH, "a YYYY-MM month");

    const { delivered } = validateHours(ctx, obj.hours, join(path, "hours"));
    validateEngagement(ctx, obj.engagement, join(path, "engagement"));
    if (obj.note !== undefined) readString(ctx, obj.note, join(path, "note"));

    const engagementCount = isRecord(obj.engagement) ? obj.engagement.count : undefined;
    if (delivered === 0 && typeof engagementCount === "number" && engagementCount > 0) {
      warn(
        ctx,
        join(path, "hours.delivered_hours"),
        "Engagements are reported for a month with zero delivered hours. One of the two figures " +
          "is probably wrong, or they come from different systems on different calendars.",
      );
    }

    if (areaId !== null && typeof obj.month === "string") {
      const key = `${areaId}|${obj.month}`;
      if (seen.has(key)) {
        fail(
          ctx,
          path,
          `Duplicate row for \`${areaId}\` in ${obj.month}. One area-month is one row; two rows ` +
            "would be silently summed or silently dropped depending on the reader.",
        );
        continue;
      }
      seen.add(key);
    }
    rows.push(obj as unknown as AreaMonthActual);
  }
  return rows;
}

/** Validate an actuals document. Never throws; collects every finding. */
export function validateActuals(
  input: unknown,
  options: ActualsValidationOptions = {},
): ActualsValidation {
  const ctx: Ctx = { errors: [], warnings: [] };

  if (!isRecord(input)) {
    fail(ctx, "(document)", "Expected an actuals object.");
    return { ok: false, document: null, errors: ctx.errors, warnings: ctx.warnings };
  }

  scanForbiddenShapes(input, "", ctx);

  checkKeys(
    ctx,
    input,
    "",
    [
      "schema_version",
      "profile_id",
      "geography_version",
      "reporting",
      "engagement_measure",
      "contract",
      "area_months",
      "intended_analysis",
    ],
    ["$schema", "notes"],
  );

  readLiteral(ctx, input.schema_version, "schema_version", ACTUALS_SCHEMA_VERSION);
  readPattern(ctx, input.profile_id, "profile_id", PROFILE_ID, "a lowercase kebab-case slug");
  readString(ctx, input.geography_version, "geography_version");

  if (options.expectedProfileId !== undefined && input.profile_id !== options.expectedProfileId) {
    fail(
      ctx,
      "profile_id",
      `These actuals belong to \`${String(input.profile_id)}\`, but this deployment runs ` +
        `\`${options.expectedProfileId}\`. Loading them would attach one organization's delivery ` +
        "to another's geography.",
    );
  }

  validateReporting(ctx, input.reporting);
  validateMeasure(ctx, input.engagement_measure);
  validateContract(ctx, input.contract);
  validateIntendedAnalysis(ctx, input.intended_analysis);
  validateAreaMonths(
    ctx,
    input.area_months,
    options.knownAreaIds === undefined ? null : new Set(options.knownAreaIds),
  );
  if (input.notes !== undefined) readStringArray(ctx, input.notes, "notes", 0);

  const ok = ctx.errors.length === 0;
  return {
    ok,
    document: ok ? (input as unknown as ActualsDocument) : null,
    errors: ctx.errors,
    warnings: ctx.warnings,
  };
}

/** Validate and return the document, or throw an error naming the first bad field. */
export function parseActuals(
  input: unknown,
  options: ActualsValidationOptions = {},
): ActualsDocument {
  const result = validateActuals(input, options);
  if (!result.ok || result.document === null) throw new ActualsError(result.errors);
  return result.document;
}

/** Parse actuals JSON text, then validate it. */
export function loadActuals(json: string, options: ActualsValidationOptions = {}): ActualsDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new ActualsError([
      { field: "(document)", message: `Not valid JSON: ${(cause as Error).message}` },
    ]);
  }
  return parseActuals(parsed, options);
}

/**
 * True when the file holds at least one recorded area-month.
 *
 * The interface needs this to choose between rendering actuals and rendering
 * the empty state; a valid file with no rows is the normal state before an
 * operator has reported anything, not an error.
 */
export function hasRecordedActuals(document: ActualsDocument): boolean {
  return document.area_months.length > 0;
}

/**
 * Apply the suppression policy to one engagement count before writing it.
 *
 * Mirrors branch 1 of `docs/policy/small-cell-suppression.md` as implemented
 * by `suppress_observation_row` in the pipeline: a count of zero publishes, a
 * count at or above the threshold publishes, and anything between is withheld
 * rather than rounded, banded, or nudged. Offered so an operator's own export
 * script can produce a file the loader accepts; it does not weaken the loader,
 * which still rejects a small published count whether or not this was used.
 */
export function suppressEngagementCount(count: number): AreaMonthEngagement {
  if (!Number.isInteger(count) || count < 0) {
    throw new ActualsError([
      { field: "engagement.count", message: "Expected a whole number of 0 or more." },
    ]);
  }
  if (count > 0 && count < SMALL_CELL_THRESHOLD) return { count: null, suppressed: true };
  return { count, suppressed: false };
}
