import type { Translator } from "./context";

/**
 * Why a shared link was refused, in the reader's language.
 *
 * `features/share/planShareState.ts` is a validator: its messages are pinned
 * by its own suite and read by callers that have no translator. So, exactly
 * as with the planner's sentences, each shape is recognised here and rebuilt
 * from the catalogue at the one place a person reads it. An unrecognised
 * detail is passed through rather than guessed at — a reader deciding whether
 * to ask for the link again needs the real reason, not an approximation.
 */

interface DetailRule {
  pattern: RegExp;
  key: string;
  params?: (match: RegExpExecArray) => Record<string, string>;
}

const RULES: DetailRule[] = [
  {
    pattern: /^must be a whole number from 0 to (\d+)$/,
    key: "shareError.wholeNumberMax",
    params: (m) => ({ max: m[1] ?? "" }),
  },
  { pattern: /^must be an area id$/, key: "shareError.areaId" },
  {
    pattern: /^must be 1 to (\d+) characters$/,
    key: "shareError.areaIdLength",
    params: (m) => ({ max: m[1] ?? "" }),
  },
  {
    pattern: /^must be a lowercase area id such as east_village$/,
    key: "shareError.areaIdLowercase",
  },
  { pattern: /^reads as report volume,/, key: "shareError.reportVolume" },
  { pattern: /^reads as a person-level or point-location field;/, key: "shareError.personOrPoint" },
  { pattern: /^must be an object$/, key: "shareError.object" },
  { pattern: /^is not on the shareable allowlist;/, key: "shareError.notAllowlisted" },
  { pattern: /^must be true or false$/, key: "shareError.boolean" },
  { pattern: /^must be a list$/, key: "shareError.list" },
  {
    pattern: /^must hold at most (\d+) areas$/,
    key: "shareError.tooManyLocks",
    params: (m) => ({ max: m[1] ?? "" }),
  },
  { pattern: /^must be an area id and a whole hour count$/, key: "shareError.lockPair" },
  { pattern: /^repeats an area$/, key: "shareError.repeatsArea" },
  { pattern: /^must be a fraction from 0 to 1$/, key: "shareError.fraction" },
  {
    pattern: /^must be a number from 0 to (\d+)$/,
    key: "shareError.numberMax",
    params: (m) => ({ max: m[1] ?? "" }),
  },
  { pattern: /^must be a versioned area-list identifier$/, key: "shareError.geographyIdentifier" },
  {
    pattern: /^names area list (\S+); this deployment plans against (\S+)$/,
    key: "shareError.geographyMismatch",
    params: (m) => ({ theirs: m[1] ?? "", ours: m[2] ?? "" }),
  },
  { pattern: /^is not a shareable parameter$/, key: "shareError.notShareable" },
  {
    pattern: /^would need escaping, so it is not a shareable value$/,
    key: "shareError.needsEscaping",
  },
  { pattern: /^appears more than once$/, key: "shareError.repeated" },
  { pattern: /^is missing from the link$/, key: "shareError.missing" },
  { pattern: /^must be a whole number$/, key: "shareError.wholeNumber" },
  {
    pattern: /^is version (\S+); this build reads version 1 links$/,
    key: "shareError.version",
    params: (m) => ({ version: m[1] ?? "" }),
  },
  { pattern: /^must be on or off$/, key: "shareError.onOrOff" },
  { pattern: /^must read as area_id:hours pairs$/, key: "shareError.lockPairs" },
  { pattern: /^must be a percentage from 0 to 100$/, key: "shareError.percent" },
  { pattern: /^must be a number$/, key: "shareError.number" },
];

export function shareRefusalDetail(t: Translator["t"], detail: string): string {
  for (const rule of RULES) {
    const match = rule.pattern.exec(detail);
    if (match) return t(rule.key, rule.params?.(match));
  }
  return detail;
}
