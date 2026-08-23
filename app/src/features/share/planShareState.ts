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

import { MAX_LOADED_HOURLY_RATE } from "../../domain/cost/index.ts";
import { COMPLAINT_SIGNAL } from "../../domain/vocabulary/refusedTerms.ts";
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
  /**
   * The organization profile's `geography.area_list.version`. A plan is only
   * a plan against a named list of areas, so the list travels with it.
   */
  geography: string;
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
  "geography",
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
const REPORT_VOLUME_TOKEN = COMPLAINT_SIGNAL;
const PERSON_OR_POINT_SEGMENT =
  /^(id|lat|lon|lng|latitude|longitude|coord|coords|coordinates|geometry|block|blockid|parcel|parcelid|address|street|streetaddress|email|phone|ssn|dob|dateofbirth|name|firstname|lastname|fullname|person|personid|personname|client|clientid|clientname|patient|case|caseid|household|householdid|user|userid|uuid|guid)$/;

/** Every character legal in a value this module writes, unescaped. */
const SAFE_PARAM_VALUE = /^[A-Za-z0-9_.:,/-]+$/;
/** An area-list version string, e.g. `dsdp-core-six/2026-08-21`. */
// Must both start and END alphanumeric. `geography` is the last parameter, so
// it absorbs anything appended to the link: a sentence's trailing period, or
// the `>` a quoted email reply adds. Allowing trailing punctuation let those
// two manglings decode successfully and be caught later as a geography
// mismatch, which tells the reader the wrong thing about why their link failed.
const AREA_LIST_VERSION_SHAPE = /^[A-Za-z0-9](?:[A-Za-z0-9_.:/-]{0,62}[A-Za-z0-9])?$/;
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

  if (
    typeof candidate.geography !== "string" ||
    !AREA_LIST_VERSION_SHAPE.test(candidate.geography)
  ) {
    throw new PlanShareError("geography", "must be a versioned area-list identifier");
  }
  const geography = candidate.geography;

  return {
    budget,
    floor,
    guard: candidate.guard,
    locks: locks.sort((a, b) => a[0].localeCompare(b[0])),
    share,
    assume,
    rate,
    geography,
  };
}

/**
 * Refuse a link built against a different list of areas.
 *
 * Hour counts and area ids mean nothing on their own: `east_village: 40` is a
 * different instruction against a different geography, and a deployment that
 * has no `east_village` would otherwise redistribute those forty hours and
 * say nothing. Refused the same way a version mismatch is, and for the same
 * reason — the reader must not be shown a plan the sender did not build.
 */
export function assertGeographyMatches(
  state: PlanShareState,
  areaListVersion: string,
): PlanShareState {
  if (state.geography !== areaListVersion) {
    throw new PlanShareError(
      "geography",
      `names area list ${state.geography}; this deployment plans against ${areaListVersion}`,
    );
  }
  return state;
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
  // All eight are always written, empty ones included, so that a parameter
  // missing on arrival means the link was truncated or mangled rather than
  // meaning "the sender had none". The decoder refuses on absence.
  pairs.push(["locks", safe.locks.map(([areaId, hours]) => `${areaId}:${hours}`).join(",")]);
  pairs.push(["share", String(Math.round(safe.share * 100))]);
  pairs.push(["assume", safe.assume ?? ""]);
  pairs.push(["rate", String(safe.rate)]);
  pairs.push(["geography", safe.geography]);

  for (const [key, value] of pairs) {
    if (!ALLOWED_PARAM_KEYS.has(key)) throw new PlanShareError(key, "is not a shareable parameter");
    if (value !== "" && !SAFE_PARAM_VALUE.test(value)) {
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
  // Mail clients wrap a bare URL in angle brackets (RFC 3986 appendix C) and
  // leave whitespace around a pasted one. Both damaged the `v` parameter
  // specifically, so the link decoded as "no link at all" and the reader was
  // handed a default plan in silence — the exact failure the refusal notice
  // exists to prevent.
  let raw = search.trim();
  if (raw.startsWith("<") && raw.endsWith(">")) raw = raw.slice(1, -1).trim();
  const params = new URLSearchParams(raw.startsWith("?") ? raw.slice(1) : raw);
  const version = single(params, "v");
  if (version === null) {
    // Absence of `v` means "this is not a share link". But if any other
    // share parameter is present, the link was meant to carry a plan and
    // arrived damaged, and saying nothing is what SH-1 was about.
    const stray = SHARE_STATE_KEYS.filter((key) => params.has(key));
    if (stray.length > 0) {
      throw new PlanShareError(
        "v",
        `is missing, but the link still carries ${stray.join(", ")}. It looks like a shared ` +
          "plan that was truncated or reformatted in transit",
      );
    }
    return null;
  }
  if (version !== PLAN_SHARE_VERSION) {
    throw new PlanShareError("v", `is version ${version}; this build reads version 1 links`);
  }

  const budget = readWhole(params, "budget", null);
  const floor = readWhole(params, "floor", null);

  const rawGuard = single(params, "guard");
  if (rawGuard !== "on" && rawGuard !== "off") {
    throw new PlanShareError("guard", "must be on or off");
  }

  // Every one of the eight fields is required. encodePlanShare always writes
  // all eight, so a link missing one was not produced by this system, and
  // defaulting the absent ones diverges the reader's plan from the sender's
  // without saying so: a dropped `rate` silently reinstates the placeholder
  // rate the cost copy tells a finance lead to replace, and a dropped `share`
  // used to decode as a 100% displaced-share assumption — the maximum the
  // slider allows, not a neutral value.
  const rawLocks = single(params, "locks");
  if (rawLocks === null) throw new PlanShareError("locks", "is missing from the link");
  const locks: Array<[string, number]> = [];
  if (rawLocks !== "") {
    for (const entry of rawLocks.split(",")) {
      const [areaId, hours, ...rest] = entry.split(":");
      if (rest.length > 0 || hours === undefined || !WHOLE_NUMBER.test(hours)) {
        throw new PlanShareError("locks", "must read as area_id:hours pairs");
      }
      locks.push([assertAreaId("locks", areaId), Number(hours)]);
    }
  }

  const sharePercent = readWhole(params, "share", null);
  if (sharePercent > 100) throw new PlanShareError("share", "must be a percentage from 0 to 100");

  const rawAssume = single(params, "assume");
  if (rawAssume === null) throw new PlanShareError("assume", "is missing from the link");
  const assume = rawAssume === "" ? null : rawAssume;

  const rawRate = single(params, "rate");
  if (rawRate === null) throw new PlanShareError("rate", "is missing from the link");
  if (!DECIMAL_NUMBER.test(rawRate)) {
    throw new PlanShareError("rate", "must be a number");
  }

  const rawGeography = single(params, "geography");
  if (rawGeography === null) throw new PlanShareError("geography", "is missing from the link");

  // The same gate the encoder passed through, applied to values a stranger
  // may have typed by hand.
  return assertShareable({
    budget,
    floor,
    guard: rawGuard === "on",
    locks,
    share: sharePercent / 100,
    assume,
    rate: Number(rawRate),
    geography: rawGeography,
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
