/**
 * Organization profile loader and validator.
 *
 * Validates against `config/schema/organization-profile.v1.schema.json`
 * without a schema-runtime dependency: this is a static site, and adding a
 * validator library to the shipped bundle to check a file that is authored by
 * hand once per deployment is the wrong trade.
 *
 * Failure is loud and names the field. A profile that is wrong in a way the
 * interface could paper over — a missing provenance source, a coverage floor
 * that cannot be met, a field that smells like complaint volume — stops here
 * rather than reaching a screen an evaluator will read as evidence.
 */

import type { OrganizationProfile, ProfileArea, ProfileIssue, ProfileValidation } from "./types.ts";

export const PROFILE_SCHEMA_VERSION = "organization-profile/v1";

/**
 * Prohibited claim types every profile must carry. An adopting organization
 * may add to this list. The validator stops it subtracting.
 */
export const BASELINE_PROHIBITED_CLAIM_TYPES = [
  "identified_people_moved_between_areas",
  "policy_caused_observed_decline",
  "area_needs_enforcement",
  "live_shelter_capacity_or_eligibility",
  "automatic_operational_authorization",
] as const;

export const DEFAULT_FLOOR_DOMINANCE_THRESHOLD = 0.25;

const COMPLAINT_REASON =
  "Complaint, 311, and service-request volume are not representable in an organization profile. " +
  "They measure who reports, not who is present, and a profile field is precisely the seam through " +
  "which they would become an allocation weight.";

const PERSON_LEVEL_REASON =
  "Person-level and precise-location fields are not representable in an organization profile. " +
  "The observation grain is fixed at area-month aggregate.";

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
  { token: "lat", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "lon", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "lng", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "latitude", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "longitude", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "coords", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "coordinates", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "geometry", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "blockid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "parcelid", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "address", exact: true, reason: PERSON_LEVEL_REASON },
  { token: "streetaddress", exact: true, reason: PERSON_LEVEL_REASON },
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
];

const AREA_ID = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const PROFILE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;

const PROFILE_STATUSES = ["draft", "illustrative_example", "reference_deployment", "adopted"];
const RESOLUTION_STATUSES = ["resolved", "provisional", "unresolved", "illustrative"];

// The area list is the field an invented geography arrives through, so it alone
// must name a real published source. Boundaries and adjacency may be undrawn or
// unsourced provided they say so; `illustrative` is reachable for neither.
const CITED_OR_DISCLOSED = ["resolved", "provisional", "unresolved"];

interface Ctx {
  errors: ProfileIssue[];
  warnings: ProfileIssue[];
}

/** Thrown by `parseOrganizationProfile`. Carries every finding, not just the first. */
export class OrganizationProfileError extends Error {
  readonly issues: ProfileIssue[];

  constructor(issues: ProfileIssue[]) {
    super(formatIssues(issues));
    this.name = "OrganizationProfileError";
    this.issues = issues;
  }
}

function formatIssues(issues: ProfileIssue[]): string {
  if (issues.length === 0) return "Invalid organization profile.";
  const [first, ...rest] = issues;
  const tail = rest.length === 0 ? "" : ` (and ${rest.length} more field problem(s))`;
  return `Invalid organization profile at \`${first.field}\`: ${first.message}${tail}`;
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

/** Deep scan of every property name in the document, before any structural check. */
function scanForbiddenNames(value: unknown, path: string, ctx: Ctx): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenNames(item, `${path}[${index}]`, ctx));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = join(path, key);
    const reason = forbiddenReason(key);
    if (reason !== null) fail(ctx, childPath, reason);
    scanForbiddenNames(child, childPath, ctx);
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
        "Unknown field. The profile schema is closed: a field it does not define cannot be added " +
          "without a schema version change, so that no new input can reach a decision unreviewed.",
      );
    }
  }
}

function readObject(ctx: Ctx, value: unknown, field: string): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (value === undefined) return null;
  fail(ctx, field, "Expected an object.");
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

function readBoolean(ctx: Ctx, value: unknown, field: string): boolean | null {
  if (value === undefined) return null;
  if (typeof value !== "boolean") {
    fail(ctx, field, "Expected true or false.");
    return null;
  }
  return value;
}

function readNumber(
  ctx: Ctx,
  value: unknown,
  field: string,
  bounds: { min?: number; max?: number; exclusiveMin?: number; integer?: boolean } = {},
): number | null {
  if (value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(ctx, field, "Expected a finite number.");
    return null;
  }
  if (bounds.integer === true && !Number.isInteger(value)) {
    fail(ctx, field, "Expected a whole number.");
    return null;
  }
  if (bounds.min !== undefined && value < bounds.min) {
    fail(ctx, field, `Expected a value of at least ${bounds.min}; found ${value}.`);
    return null;
  }
  if (bounds.exclusiveMin !== undefined && value <= bounds.exclusiveMin) {
    fail(ctx, field, `Expected a value greater than ${bounds.exclusiveMin}; found ${value}.`);
    return null;
  }
  if (bounds.max !== undefined && value > bounds.max) {
    fail(ctx, field, `Expected a value of at most ${bounds.max}; found ${value}.`);
    return null;
  }
  return value;
}

function readLiteral(ctx: Ctx, value: unknown, field: string, expected: string): void {
  if (value === undefined) return;
  if (value !== expected) {
    fail(ctx, field, `Expected the fixed value \`${expected}\`; found ${JSON.stringify(value)}.`);
  }
}

function readEnum(ctx: Ctx, value: unknown, field: string, allowed: string[]): string | null {
  if (value === undefined) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    fail(ctx, field, `Expected one of ${allowed.join(", ")}; found ${JSON.stringify(value)}.`);
    return null;
  }
  return value;
}

function readPattern(ctx: Ctx, value: unknown, field: string, re: RegExp, shape: string): void {
  const text = readString(ctx, value, field);
  if (text === null) return;
  if (!re.test(text)) fail(ctx, field, `Expected ${shape}; found ${JSON.stringify(text)}.`);
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

function validateProvenance(
  ctx: Ctx,
  value: unknown,
  path: string,
  permitted: readonly string[] = RESOLUTION_STATUSES,
): string | null {
  const obj = readObject(ctx, value, path);
  if (obj === null) {
    fail(ctx, path, "Required field is missing. Provenance is never optional.");
    return null;
  }
  checkKeys(
    ctx,
    obj,
    path,
    ["resolution_status", "resolution_rule"],
    ["source_name", "publisher", "source_url", "source_version", "retrieved_at", "resolution_note"],
  );
  const status = readEnum(
    ctx,
    obj.resolution_status,
    join(path, "resolution_status"),
    RESOLUTION_STATUSES,
  );
  if (status !== null && !permitted.includes(status)) {
    fail(
      ctx,
      join(path, "resolution_status"),
      `Expected one of ${permitted.join(", ")}; found \`${status}\`. The area list must name a ` +
        "real published source. A geography nobody can cite is a place nobody can check.",
    );
  }
  readString(ctx, obj.resolution_rule, join(path, "resolution_rule"));

  const sourceFields = ["source_name", "publisher", "source_url", "source_version", "retrieved_at"];
  if (status === "resolved") {
    for (const key of sourceFields) {
      const field = join(path, key);
      const raw = obj[key];
      if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
        fail(
          ctx,
          field,
          "Required and non-null when resolution_status is `resolved`. A source that cannot be " +
            "named, versioned, and dated is not resolved; set the status to `provisional` or " +
            "`unresolved` and write the reason in resolution_note instead.",
        );
        continue;
      }
      readString(ctx, raw, field);
    }
    if (typeof obj.retrieved_at === "string") {
      readPattern(ctx, obj.retrieved_at, join(path, "retrieved_at"), ISO_DATE, "a YYYY-MM-DD date");
    }
  } else if (status !== null) {
    const note = obj.resolution_note;
    if (typeof note !== "string" || note.trim() === "") {
      fail(
        ctx,
        join(path, "resolution_note"),
        `Required and non-empty when resolution_status is \`${status}\`. This is the text the ` +
          "interface renders as an unresolved-provenance disclosure. Say what is missing and why.",
      );
    }
    for (const key of sourceFields) {
      const raw = obj[key];
      if (raw !== undefined && raw !== null && typeof raw !== "string") {
        fail(ctx, join(path, key), "Expected a string or null.");
      }
    }
  }
  return status;
}

function validateAreas(ctx: Ctx, value: unknown, path: string): ProfileArea[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) fail(ctx, path, "Expected an array of areas.");
    return [];
  }
  if (value.length === 0) {
    fail(ctx, path, "Expected at least one area.");
    return [];
  }
  const areas: ProfileArea[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    const obj = readObject(ctx, raw, itemPath);
    if (obj === null) continue;
    checkKeys(ctx, obj, itemPath, ["id", "label", "in_scope"], ["note"]);
    const id = readString(ctx, obj.id, join(itemPath, "id"));
    const label = readString(ctx, obj.label, join(itemPath, "label"));
    const inScope = readBoolean(ctx, obj.in_scope, join(itemPath, "in_scope"));
    if (obj.note !== undefined) readString(ctx, obj.note, join(itemPath, "note"));
    if (id === null || label === null || inScope === null) continue;
    if (!AREA_ID.test(id)) {
      fail(ctx, join(itemPath, "id"), "Expected a lowercase snake_case identifier.");
      continue;
    }
    if (seen.has(id)) {
      fail(ctx, join(itemPath, "id"), `Duplicate area id \`${id}\`. Area ids must be unique.`);
      continue;
    }
    seen.add(id);
    areas.push({
      id,
      label,
      in_scope: inScope,
      ...(typeof obj.note === "string" ? { note: obj.note } : {}),
    });
  }
  return areas;
}

function validateAdjacency(ctx: Ctx, value: unknown, path: string, areaIds: Set<string>): void {
  const obj = readObject(ctx, value, path);
  if (obj === null) {
    fail(ctx, path, "Required field is missing.");
    return;
  }
  checkKeys(ctx, obj, path, ["version", "pairs", "provenance"], []);
  const status = validateProvenance(
    ctx,
    obj.provenance,
    join(path, "provenance"),
    CITED_OR_DISCLOSED,
  );

  if (obj.version !== null && obj.version !== undefined && typeof obj.version !== "string") {
    fail(ctx, join(path, "version"), "Expected a string or null.");
  }

  const pairs = obj.pairs;
  if (!Array.isArray(pairs)) {
    if (pairs !== undefined) fail(ctx, join(path, "pairs"), "Expected an array of area-id pairs.");
    return;
  }

  if (status === "unresolved") {
    if (pairs.length > 0) {
      fail(
        ctx,
        join(path, "pairs"),
        "Must be empty when adjacency provenance is `unresolved`. An adjacency table nobody can " +
          "cite would let the interface claim displacement evidence it does not have.",
      );
    }
    if (typeof obj.version === "string") {
      fail(
        ctx,
        join(path, "version"),
        "Must be null when adjacency provenance is `unresolved`. Versioning an adjacency table " +
          "that has no source is exactly the fake version string this schema exists to prevent.",
      );
    }
  } else if (pairs.length > 0 && typeof obj.version !== "string") {
    fail(ctx, join(path, "version"), "Required when the adjacency table has entries.");
  }

  const seen = new Set<string>();
  for (const [index, pair] of pairs.entries()) {
    const pairPath = `${join(path, "pairs")}[${index}]`;
    if (!Array.isArray(pair) || pair.length !== 2) {
      fail(ctx, pairPath, "Expected exactly two area ids.");
      continue;
    }
    const [a, b] = pair as unknown[];
    if (typeof a !== "string" || typeof b !== "string") {
      fail(ctx, pairPath, "Expected exactly two area ids.");
      continue;
    }
    for (const id of [a, b]) {
      if (!areaIds.has(id)) {
        fail(ctx, pairPath, `Area id \`${id}\` is not in geography.area_list.areas.`);
      }
    }
    if (a === b) {
      fail(ctx, pairPath, `An area cannot be adjacent to itself (\`${a}\`).`);
      continue;
    }
    const key = [a, b].sort().join("|");
    if (seen.has(key)) {
      fail(ctx, pairPath, `Duplicate adjacency pair. List each pair once; pairs are symmetric.`);
      continue;
    }
    seen.add(key);
  }
}

function validateOperations(ctx: Ctx, value: unknown, path: string, inScopeCount: number): void {
  const obj = readObject(ctx, value, path);
  if (obj === null) {
    fail(ctx, path, "Required field is missing.");
    return;
  }
  checkKeys(
    ctx,
    obj,
    path,
    [
      "planning_horizon",
      "budget",
      "shift",
      "team_count",
      "coverage_floor_hours",
      "continuity_reserve_hours",
      "uncertainty_weight",
    ],
    ["floor_dominance_warning_threshold"],
  );

  const horizon = readObject(ctx, obj.planning_horizon, join(path, "planning_horizon"));
  if (horizon !== null) {
    const hp = join(path, "planning_horizon");
    checkKeys(ctx, horizon, hp, ["value", "unit", "label"], []);
    readNumber(ctx, horizon.value, join(hp, "value"), { min: 1, integer: true });
    readLiteral(ctx, horizon.unit, join(hp, "unit"), "day");
    readString(ctx, horizon.label, join(hp, "label"));
  }

  let budgetValue: number | null = null;
  const budget = readObject(ctx, obj.budget, join(path, "budget"));
  if (budget !== null) {
    const bp = join(path, "budget");
    checkKeys(ctx, budget, bp, ["value", "unit", "user_editable", "minimum"], ["maximum"]);
    budgetValue = readNumber(ctx, budget.value, join(bp, "value"), { min: 0 });
    readLiteral(ctx, budget.unit, join(bp, "unit"), "staff_hour");
    readBoolean(ctx, budget.user_editable, join(bp, "user_editable"));
    const minimum = readNumber(ctx, budget.minimum, join(bp, "minimum"), { min: 0 });
    const maximum =
      budget.maximum === undefined
        ? null
        : readNumber(ctx, budget.maximum, join(bp, "maximum"), { min: 0 });
    if (minimum !== null && maximum !== null && maximum < minimum) {
      fail(ctx, join(bp, "maximum"), "Must not be below budget.minimum.");
    }
    if (budgetValue !== null && minimum !== null && budgetValue < minimum) {
      fail(ctx, join(bp, "value"), "The default budget is below budget.minimum.");
    }
  }

  let shiftLength: number | null = null;
  let increment: number | null = null;
  const shift = readObject(ctx, obj.shift, join(path, "shift"));
  if (shift !== null) {
    const sp = join(path, "shift");
    checkKeys(ctx, shift, sp, ["length_hours", "allocation_increment_hours"], []);
    shiftLength = readNumber(ctx, shift.length_hours, join(sp, "length_hours"), {
      exclusiveMin: 0,
    });
    increment = readNumber(
      ctx,
      shift.allocation_increment_hours,
      join(sp, "allocation_increment_hours"),
      {
        exclusiveMin: 0,
      },
    );
  }

  const teamCount = readNumber(ctx, obj.team_count, join(path, "team_count"), {
    min: 1,
    integer: true,
  });
  const floor = readNumber(ctx, obj.coverage_floor_hours, join(path, "coverage_floor_hours"), {
    min: 0,
  });
  const reserve = readNumber(
    ctx,
    obj.continuity_reserve_hours,
    join(path, "continuity_reserve_hours"),
    {
      min: 0,
    },
  );
  readNumber(ctx, obj.uncertainty_weight, join(path, "uncertainty_weight"), { min: 0, max: 5 });
  const threshold =
    obj.floor_dominance_warning_threshold === undefined
      ? DEFAULT_FLOOR_DOMINANCE_THRESHOLD
      : (readNumber(
          ctx,
          obj.floor_dominance_warning_threshold,
          join(path, "floor_dominance_warning_threshold"),
          {
            min: 0,
            max: 1,
          },
        ) ?? DEFAULT_FLOOR_DOMINANCE_THRESHOLD);

  if (budgetValue === null || floor === null) return;

  const committed = floor * inScopeCount;
  if (committed > budgetValue) {
    fail(
      ctx,
      join(path, "coverage_floor_hours"),
      `The coverage floor commits ${committed} staff-hours across ${inScopeCount} in-scope area(s), ` +
        `more than the ${budgetValue}-hour budget. Every plan this profile can produce is infeasible.`,
    );
  } else if ((budgetValue - committed) / budgetValue < threshold) {
    warn(
      ctx,
      join(path, "coverage_floor_hours"),
      `The coverage floor leaves only ${budgetValue - committed} of ${budgetValue} hours discretionary. ` +
        "Below the floor-dominance threshold the floor, not the forecast, is deciding the plan, and the " +
        "interface must say so rather than present it as forecast-driven.",
    );
  }

  if (increment !== null) {
    for (const [label, hours] of [
      ["budget.value", budgetValue],
      ["coverage_floor_hours", floor],
      ["continuity_reserve_hours", reserve],
    ] as Array<[string, number | null]>) {
      if (hours === null) continue;
      if (Math.abs(hours / increment - Math.round(hours / increment)) > 1e-9) {
        warn(
          ctx,
          join(path, label),
          `${hours} hours is not a whole number of ${increment}-hour allocation blocks, so the planner ` +
            "will leave a rounding residue it cannot assign.",
        );
      }
    }
  }

  if (teamCount !== null && shiftLength !== null) {
    const perShift = teamCount * shiftLength;
    if (
      perShift > 0 &&
      Math.abs(budgetValue / perShift - Math.round(budgetValue / perShift)) > 1e-9
    ) {
      warn(
        ctx,
        join(path, "budget.value"),
        `The ${budgetValue}-hour budget is not a whole number of team-shifts ` +
          `(${teamCount} team(s) x ${shiftLength}h = ${perShift}h per shift). Check that it is what was intended.`,
      );
    }
  }
}

function validateCostAssumptions(ctx: Ctx, value: unknown, path: string): void {
  const obj = readObject(ctx, value, path);
  if (obj === null) {
    fail(ctx, path, "Required field is missing.");
    return;
  }
  checkKeys(ctx, obj, path, ["loaded_hourly_rate"], []);
  const rate = readObject(ctx, obj.loaded_hourly_rate, join(path, "loaded_hourly_rate"));
  if (rate === null) return;
  const rp = join(path, "loaded_hourly_rate");
  checkKeys(ctx, rate, rp, ["value", "currency", "unit", "assumption"], []);
  readNumber(ctx, rate.value, join(rp, "value"), { min: 0 });
  readPattern(ctx, rate.currency, join(rp, "currency"), CURRENCY, "a three-letter ISO 4217 code");
  readLiteral(ctx, rate.unit, join(rp, "unit"), "cost_per_staff_hour");

  const assumption = readObject(ctx, rate.assumption, join(rp, "assumption"));
  if (assumption === null) {
    fail(
      ctx,
      join(rp, "assumption"),
      "Required field is missing. A loaded hourly rate without its assumption metadata cannot be " +
        "rendered honestly: any figure derived from it would read as measured.",
    );
    return;
  }
  const ap = join(rp, "assumption");
  checkKeys(
    ctx,
    assumption,
    ap,
    ["status", "set_by_role", "basis", "effective_date", "includes", "excludes"],
    ["review_by"],
  );
  readLiteral(ctx, assumption.status, join(ap, "status"), "operator_set_assumption");
  readString(ctx, assumption.set_by_role, join(ap, "set_by_role"));
  readString(ctx, assumption.basis, join(ap, "basis"));
  readPattern(
    ctx,
    assumption.effective_date,
    join(ap, "effective_date"),
    ISO_DATE,
    "a YYYY-MM-DD date",
  );
  if (assumption.review_by !== undefined) {
    readPattern(ctx, assumption.review_by, join(ap, "review_by"), ISO_DATE, "a YYYY-MM-DD date");
  }
  readStringArray(ctx, assumption.includes, join(ap, "includes"), 1);
  readStringArray(ctx, assumption.excludes, join(ap, "excludes"), 1);
}

function validateLanguageBoundaries(ctx: Ctx, value: unknown, path: string): void {
  const obj = readObject(ctx, value, path);
  if (obj === null) {
    fail(ctx, path, "Required field is missing.");
    return;
  }
  checkKeys(ctx, obj, path, ["permitted_examples", "prohibited_claim_types"], []);
  readStringArray(ctx, obj.permitted_examples, join(path, "permitted_examples"), 1);
  // Length is checked through the baseline below, so a short list reports the
  // claim type that went missing rather than an item count.
  const prohibited = readStringArray(
    ctx,
    obj.prohibited_claim_types,
    join(path, "prohibited_claim_types"),
    1,
  );
  if (prohibited === null) return;
  const present = new Set(prohibited);
  const missing = BASELINE_PROHIBITED_CLAIM_TYPES.filter((claim) => !present.has(claim));
  if (missing.length > 0) {
    fail(
      ctx,
      join(path, "prohibited_claim_types"),
      `Missing mandatory baseline claim type(s): ${missing.join(", ")}. An adopting organization may ` +
        "add prohibitions. It may not remove these.",
    );
  }
}

/**
 * Validate an already-parsed profile document.
 *
 * Never throws. Returns every finding so an adopter can fix a profile in one
 * pass instead of one field at a time.
 */
export function validateOrganizationProfile(input: unknown): ProfileValidation {
  const ctx: Ctx = { errors: [], warnings: [] };
  const root = readObject(ctx, input, "");
  if (root === null) {
    return {
      ok: false,
      profile: null,
      errors: [{ field: "(root)", message: "Expected an organization profile object." }],
      warnings: [],
    };
  }

  scanForbiddenNames(root, "", ctx);

  checkKeys(
    ctx,
    root,
    "",
    [
      "schema_version",
      "profile_id",
      "profile_status",
      "last_updated",
      "organization",
      "observations",
      "geography",
      "operations",
      "cost_assumptions",
      "language_boundaries",
    ],
    ["$schema", "review_triggers", "notes"],
  );

  if (root.schema_version !== undefined && root.schema_version !== PROFILE_SCHEMA_VERSION) {
    fail(
      ctx,
      "schema_version",
      `Expected \`${PROFILE_SCHEMA_VERSION}\`; found ${JSON.stringify(root.schema_version)}. ` +
        "This loader refuses an unknown profile version rather than guessing at a migration.",
    );
  }
  readPattern(ctx, root.profile_id, "profile_id", PROFILE_ID, "a lowercase kebab-case slug");
  readEnum(ctx, root.profile_status, "profile_status", PROFILE_STATUSES);
  readPattern(ctx, root.last_updated, "last_updated", ISO_DATE, "a YYYY-MM-DD date");

  const organization = readObject(ctx, root.organization, "organization");
  if (organization === null) {
    fail(ctx, "organization", "Required field is missing.");
  } else {
    checkKeys(
      ctx,
      organization,
      "organization",
      ["name", "profile_owner_role", "scope_statement"],
      ["jurisdiction_note"],
    );
    readString(ctx, organization.name, "organization.name");
    readString(ctx, organization.profile_owner_role, "organization.profile_owner_role");
    readString(ctx, organization.scope_statement, "organization.scope_statement");
    if (organization.jurisdiction_note !== undefined) {
      readString(ctx, organization.jurisdiction_note, "organization.jurisdiction_note");
    }
  }

  const observations = readObject(ctx, root.observations, "observations");
  if (observations === null) {
    fail(ctx, "observations", "Required field is missing.");
  } else {
    checkKeys(
      ctx,
      observations,
      "observations",
      ["grain", "precise_locations_publishable", "individual_records_publishable"],
      [],
    );
    readLiteral(ctx, observations.grain, "observations.grain", "area_month_aggregate");
    for (const key of ["precise_locations_publishable", "individual_records_publishable"]) {
      if (observations[key] !== undefined && observations[key] !== false) {
        fail(
          ctx,
          `observations.${key}`,
          "Must be false. A profile can restate the privacy posture; it cannot relax it.",
        );
      }
    }
  }

  let inScopeCount = 0;
  const geography = readObject(ctx, root.geography, "geography");
  if (geography === null) {
    fail(ctx, "geography", "Required field is missing.");
  } else {
    checkKeys(ctx, geography, "geography", ["area_list", "boundaries", "adjacency"], []);

    let areaIds = new Set<string>();
    const areaList = readObject(ctx, geography.area_list, "geography.area_list");
    if (areaList === null) {
      fail(ctx, "geography.area_list", "Required field is missing.");
    } else {
      checkKeys(ctx, areaList, "geography.area_list", ["version", "areas", "provenance"], []);
      readString(ctx, areaList.version, "geography.area_list.version");
      const areas = validateAreas(ctx, areaList.areas, "geography.area_list.areas");
      areaIds = new Set(areas.map((area) => area.id));
      inScopeCount = areas.filter((area) => area.in_scope).length;
      if (areas.length > 0 && inScopeCount === 0) {
        fail(
          ctx,
          "geography.area_list.areas",
          "No area is in scope, so no plan can allocate anything. Set in_scope on at least one area.",
        );
      }
      for (const area of areas) {
        const reason = forbiddenReason(area.id);
        if (reason !== null) fail(ctx, `geography.area_list.areas (id \`${area.id}\`)`, reason);
      }
      validateProvenance(ctx, areaList.provenance, "geography.area_list.provenance", ["resolved"]);
    }

    const boundaries = readObject(ctx, geography.boundaries, "geography.boundaries");
    if (boundaries === null) {
      fail(ctx, "geography.boundaries", "Required field is missing.");
    } else {
      checkKeys(ctx, boundaries, "geography.boundaries", ["provenance"], []);
      validateProvenance(
        ctx,
        boundaries.provenance,
        "geography.boundaries.provenance",
        CITED_OR_DISCLOSED,
      );
    }

    validateAdjacency(ctx, geography.adjacency, "geography.adjacency", areaIds);
  }

  validateOperations(ctx, root.operations, "operations", inScopeCount);
  validateCostAssumptions(ctx, root.cost_assumptions, "cost_assumptions");
  validateLanguageBoundaries(ctx, root.language_boundaries, "language_boundaries");

  if (root.review_triggers !== undefined) {
    const triggers = readStringArray(ctx, root.review_triggers, "review_triggers", 0);
    for (const trigger of triggers ?? []) {
      const reason = forbiddenReason(trigger);
      if (reason !== null) fail(ctx, `review_triggers (\`${trigger}\`)`, reason);
    }
  }
  if (root.notes !== undefined) readStringArray(ctx, root.notes, "notes", 0);

  const ok = ctx.errors.length === 0;
  return {
    ok,
    profile: ok ? (root as unknown as OrganizationProfile) : null,
    errors: ctx.errors,
    warnings: ctx.warnings,
  };
}

/** Validate and return the profile, or throw an error naming the first bad field. */
export function parseOrganizationProfile(input: unknown): OrganizationProfile {
  const result = validateOrganizationProfile(input);
  if (!result.ok || result.profile === null) throw new OrganizationProfileError(result.errors);
  return result.profile;
}

/** Parse profile JSON text, then validate it. */
export function loadOrganizationProfile(json: string): OrganizationProfile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new OrganizationProfileError([
      { field: "(document)", message: `Not valid JSON: ${(cause as Error).message}` },
    ]);
  }
  return parseOrganizationProfile(parsed);
}

/** The areas this deployment plans against. Out-of-scope areas stay listed but get no hours. */
export function inScopeAreas(profile: OrganizationProfile): ProfileArea[] {
  return profile.geography.area_list.areas.filter((area) => area.in_scope);
}

/** True when the interface must render an unresolved-provenance disclosure for this profile. */
export function unresolvedGeographyComponents(profile: OrganizationProfile): string[] {
  const geography = profile.geography;
  const components: Array<[string, string]> = [
    ["area_list", geography.area_list.provenance.resolution_status],
    ["boundaries", geography.boundaries.provenance.resolution_status],
    ["adjacency", geography.adjacency.provenance.resolution_status],
  ];
  return components.filter(([, status]) => status !== "resolved").map(([name]) => name);
}
