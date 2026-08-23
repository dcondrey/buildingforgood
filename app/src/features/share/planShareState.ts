/**
 * Shareable plan state: what may travel in a link, and nothing else.
 *
 * A coordinator hands a plan to a colleague by sending a URL. There is no
 * login, no backend, and no server-side data, and this module exists so that
 * stays true: the link *is* the transport, so the link has to be as
 * inspectable as a sentence and as narrow as a form.
 *
 * Two rules hold the boundary:
 *
 * 1. **Allowlist, not denylist.** `SHARE_STATE_KEYS` is the complete set of
 *    fields that can be encoded. A field added to the shell later cannot ride
 *    along into a shared URL by accident: it is refused by name until someone
 *    deliberately adds it here and argues for it.
 * 2. **The same gate in both directions.** `decodePlanShare` runs the values
 *    it parses back through `assertShareable`, so a hand-edited URL cannot
 *    inject a value the encoder would have refused to write.
 *
 * Area identifiers and hour counts are the only identifiers here. Both are
 * place-level and public. Nothing person-level, nothing location-precise, and
 * nothing complaint-derived is representable: `assertAreaId` refuses those
 * shapes outright rather than trusting that no caller will supply one.
 */

import { DEFAULT_LOADED_HOURLY_RATE, MAX_LOADED_HOURLY_RATE } from "../../domain/cost/index.ts";
import { MAX_BUDGET_HOURS } from "../../lib/constants";

export const PLAN_SHARE_VERSION = "1";

/** Upper bound on locks in one link. Six areas ship; this is slack, not a target. */
export const MAX_SHARED_LOCKS = 24;

export interface PlanShareState {
  /** Staff-hours the coordinator chose to plan. */
  budget: number;
  /** Guaranteed minimum hours per area. */
  floor: number;
  /** Whether the guaranteed minimum is enforced. */
  guard: boolean;
  /** Human locks, as `[areaId, hours]`, sorted by area id. */
  locks: Array<[string, number]>;
  /** Displaced-share assumption, 0..1. */
  share: number;
  /** Area the clearance assumption is applied to, or null when none is. */
  assume: string | null;
  /** Operator-set loaded cost of one staff-hour. */
  rate: number;
}

/** The complete set of fields a link may carry. Adding one is a deliberate act. */
export const SHARE_STATE_KEYS = [
  "budget",
  "floor",
  "guard",
  "locks",
  "share",
  "assume",
  "rate",
] as const;

/** The complete set of query parameters a link may use. */
export const SHARE_PARAM_KEYS = ["v", ...SHARE_STATE_KEYS] as const;

export class PlanShareError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = "PlanShareError";
    this.field = field;
  }
}

const ALLOWED_STATE_KEYS = new Set<string>(SHARE_STATE_KEYS);
const ALLOWED_PARAM_KEYS = new Set<string>(SHARE_PARAM_KEYS);

const AREA_ID_SHAPE = /^[a-z0-9]+(_[a-z0-9]+)*$/;
const MAX_AREA_ID_LENGTH = 40;
/* The two shapes that must never become an area identifier. Written as
 * patterns, not lists, so neither ever renders as user-facing copy. */
const REPORT_VOLUME_TOKEN =
  /(complaint|311|servicerequest|service_request|getitdone|callvolume|call_volume|reportsreceived|nuisance|hotline)/;
const PERSON_OR_POINT_SEGMENT =
  /^(id|lat|lon|lng|latitude|longitude|coord|coords|coordinates|geometry|block|blockid|parcel|parcelid|address|street|streetaddress|email|phone|ssn|dob|dateofbirth|name|firstname|lastname|fullname|person|personid|personname|client|clientid|clientname|patient|case|caseid|household|householdid|user|userid|uuid|guid)$/;

/** Every character legal in a value this module writes, unescaped. */
const SAFE_PARAM_VALUE = /^[A-Za-z0-9_.:,-]+$/;
const WHOLE_NUMBER = /^\d{1,6}$/;
const DECIMAL_NUMBER = /^\d{1,6}(\.\d{1,2})?$/;

function assertWholeNumber(field: string, value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) {
    throw new PlanShareError(field, `must be a whole number from 0 to ${max}`);
  }
  return value;
}

function assertAreaId(field: string, value: unknown): string {
  if (typeof value !== "string") throw new PlanShareError(field, "must be an area id");
  if (value.length === 0 || value.length > MAX_AREA_ID_LENGTH) {
    throw new PlanShareError(field, `must be 1 to ${MAX_AREA_ID_LENGTH} characters`);
  }
  if (!AREA_ID_SHAPE.test(value)) {
    throw new PlanShareError(field, "must be a lowercase area id such as east_village");
  }
  if (REPORT_VOLUME_TOKEN.test(value)) {
    throw new PlanShareError(
      field,
      "reads as report volume, which measures who reports rather than who is present and never enters a plan",
    );
  }
  for (const segment of value.split("_")) {
    if (PERSON_OR_POINT_SEGMENT.test(segment)) {
      throw new PlanShareError(
        field,
        "reads as a person-level or point-location field; a link carries area identifiers and hours only",
      );
    }
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The one gate. Both directions go through it, so what cannot be written
 * cannot be read back either.
 */
export function assertShareable(candidate: unknown): PlanShareState {
  if (!isPlainObject(candidate)) throw new PlanShareError("state", "must be an object");

  for (const key of Object.keys(candidate)) {
    if (!ALLOWED_STATE_KEYS.has(key)) {
      throw new PlanShareError(
        key,
        "is not on the shareable allowlist; a link carries budget, floor, guard, locks, and the two stated assumptions only",
      );
    }
  }

  const budget = assertWholeNumber("budget", candidate.budget, MAX_BUDGET_HOURS);
  const floor = assertWholeNumber("floor", candidate.floor, MAX_BUDGET_HOURS);
  if (typeof candidate.guard !== "boolean") {
    throw new PlanShareError("guard", "must be true or false");
  }
  if (!Array.isArray(candidate.locks)) throw new PlanShareError("locks", "must be a list");
  if (candidate.locks.length > MAX_SHARED_LOCKS) {
    throw new PlanShareError("locks", `must hold at most ${MAX_SHARED_LOCKS} areas`);
  }

  const seen = new Set<string>();
  const locks: Array<[string, number]> = candidate.locks.map((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new PlanShareError(`locks[${index}]`, "must be an area id and a whole hour count");
    }
    const areaId = assertAreaId(`locks[${index}]`, entry[0]);
    if (seen.has(areaId)) throw new PlanShareError(`locks[${index}]`, "repeats an area");
    seen.add(areaId);
    return [areaId, assertWholeNumber(`locks[${index}]`, entry[1], MAX_BUDGET_HOURS)];
  });

  if (
    typeof candidate.share !== "number" ||
    !Number.isFinite(candidate.share) ||
    candidate.share < 0 ||
    candidate.share > 1
  ) {
    throw new PlanShareError("share", "must be a fraction from 0 to 1");
  }
  const share = Math.round(candidate.share * 100) / 100;

  const assume = candidate.assume === null ? null : assertAreaId("assume", candidate.assume);

  if (
    typeof candidate.rate !== "number" ||
    !Number.isFinite(candidate.rate) ||
    candidate.rate < 0 ||
    candidate.rate > MAX_LOADED_HOURLY_RATE
  ) {
    throw new PlanShareError("rate", `must be a number from 0 to ${MAX_LOADED_HOURLY_RATE}`);
  }
  const rate = Math.round(candidate.rate * 100) / 100;

  return {
    budget,
    floor,
    guard: candidate.guard,
    locks: locks.sort((a, b) => a[0].localeCompare(b[0])),
    share,
    assume,
    rate,
  };
}

/**
 * The query string, without a leading `?`. Values are emitted unescaped
 * because every one of them is proven to be alphanumeric first: the link a
 * coordinator pastes into an email reads as `budget=120&floor=8&guard=on`,
 * not as a base64 blob they have to take on trust.
 */
export function encodePlanShare(state: PlanShareState): string {
  const safe = assertShareable(state);
  const pairs: Array<[string, string]> = [
    ["v", PLAN_SHARE_VERSION],
    ["budget", String(safe.budget)],
    ["floor", String(safe.floor)],
    ["guard", safe.guard ? "on" : "off"],
  ];
  if (safe.locks.length > 0) {
    pairs.push(["locks", safe.locks.map(([areaId, hours]) => `${areaId}:${hours}`).join(",")]);
  }
  pairs.push(["share", String(Math.round(safe.share * 100))]);
  if (safe.assume !== null) pairs.push(["assume", safe.assume]);
  pairs.push(["rate", String(safe.rate)]);

  for (const [key, value] of pairs) {
    if (!ALLOWED_PARAM_KEYS.has(key)) throw new PlanShareError(key, "is not a shareable parameter");
    if (!SAFE_PARAM_VALUE.test(value)) {
      throw new PlanShareError(key, "would need escaping, so it is not a shareable value");
    }
  }
  return pairs.map(([key, value]) => `${key}=${value}`).join("&");
}

/** An absolute link to `base` carrying this plan. */
export function planShareUrl(state: PlanShareState, base: string): string {
  const path = base.split("?")[0].split("#")[0];
  return `${path}?${encodePlanShare(state)}`;
}

function single(params: URLSearchParams, key: string): string | null {
  const all = params.getAll(key);
  if (all.length === 0) return null;
  if (all.length > 1) throw new PlanShareError(key, "appears more than once");
  return all[0];
}

function readWhole(params: URLSearchParams, key: string, fallback: number | null): number {
  const raw = single(params, key);
  if (raw === null) {
    if (fallback === null) throw new PlanShareError(key, "is missing from the link");
    return fallback;
  }
  if (!WHOLE_NUMBER.test(raw)) throw new PlanShareError(key, "must be a whole number");
  return Number(raw);
}

/**
 * Read a plan out of a query string. Returns null when the string carries no
 * plan at all; throws when it carries one this module would not have written.
 * Unknown parameters are never consulted, so an analytics tag on the end of
 * the link is harmless and a smuggled field is inert.
 */
export function decodePlanShare(search: string): PlanShareState | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const version = single(params, "v");
  if (version === null) return null;
  if (version !== PLAN_SHARE_VERSION) {
    throw new PlanShareError("v", `is version ${version}; this build reads version 1 links`);
  }

  const budget = readWhole(params, "budget", null);
  const floor = readWhole(params, "floor", null);

  const rawGuard = single(params, "guard");
  if (rawGuard !== "on" && rawGuard !== "off") {
    throw new PlanShareError("guard", "must be on or off");
  }

  const rawLocks = single(params, "locks");
  const locks: Array<[string, number]> = [];
  if (rawLocks !== null && rawLocks !== "") {
    for (const entry of rawLocks.split(",")) {
      const [areaId, hours, ...rest] = entry.split(":");
      if (rest.length > 0 || hours === undefined || !WHOLE_NUMBER.test(hours)) {
        throw new PlanShareError("locks", "must read as area_id:hours pairs");
      }
      locks.push([assertAreaId("locks", areaId), Number(hours)]);
    }
  }

  const sharePercent = readWhole(params, "share", 100);
  if (sharePercent > 100) throw new PlanShareError("share", "must be a percentage from 0 to 100");

  const rawAssume = single(params, "assume");
  const assume = rawAssume === null || rawAssume === "" ? null : rawAssume;

  const rawRate = single(params, "rate");
  if (rawRate !== null && !DECIMAL_NUMBER.test(rawRate)) {
    throw new PlanShareError("rate", "must be a number");
  }

  // The same gate the encoder passed through, applied to values a stranger
  // may have typed by hand.
  return assertShareable({
    budget,
    floor,
    guard: rawGuard === "on",
    locks,
    share: sharePercent / 100,
    assume,
    rate: rawRate === null ? DEFAULT_LOADED_HOURLY_RATE : Number(rawRate),
  });
}

/** Decode, treating any refusal as "this link carries no plan". */
export function readPlanShareFromSearch(search: string): PlanShareState | null {
  try {
    return decodePlanShare(search);
  } catch {
    return null;
  }
}
