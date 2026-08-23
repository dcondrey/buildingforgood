import type { Translator } from "./context";
import type { PlaceWords } from "./places";

/**
 * The planner's own sentences, translated where they are displayed.
 *
 * `lib/planner.ts` and `domain/planner/planner.ts` write English, and their
 * exact text is pinned by characterization tests — so neither is translated
 * at the source. Instead each shape is recognised here, the numbers the
 * planner produced are carried across untouched, and the sentence is rebuilt
 * from the catalogue. A shape this function does not recognise is returned
 * verbatim: an untranslated planner sentence is a gap a reader can see, and a
 * guessed one is a number that no longer means what the planner said.
 */

interface PlanMessageRule {
  pattern: RegExp;
  key: string;
  params: (match: RegExpExecArray, places: PlaceWords) => Record<string, string | number>;
}

const PLAN_MESSAGE_RULES: PlanMessageRule[] = [
  {
    pattern: /^Every one of the (\d+) [\w\s]+ keeps at least (\d+) hours\.$/,
    key: "planText.everyAreaKeeps",
    params: (m, places) => ({ everyOneOf: places.everyOneOf, floor: m[2] ?? "" }),
  },
  {
    pattern: /^No minimum applied: hours follow the forecast alone\.$/,
    key: "planText.noMinimum",
    params: () => ({}),
  },
  {
    pattern: /^The staff-hour budget must be a nonnegative whole number\.$/,
    key: "planText.budgetNotWhole",
    params: () => ({}),
  },
  {
    pattern: /^The coverage-continuity floor must be a nonnegative whole number\.$/,
    key: "planText.floorNotWhole",
    params: () => ({}),
  },
  {
    pattern: /^Locked hours must be whole numbers at or above the (\d+)-hour floor\.$/,
    key: "planText.lockBelowFloor",
    params: (m) => ({ floor: m[1] ?? "" }),
  },
  {
    pattern: /^Locked hours must be nonnegative whole numbers\.$/,
    key: "planText.lockNotWhole",
    params: () => ({}),
  },
  {
    pattern:
      /^No feasible plan: locks and coverage floors require (\d+) hours, but the budget is (\d+)\.$/,
    key: "planText.infeasibleFloors",
    params: (m) => ({ required: m[1] ?? "", budget: m[2] ?? "" }),
  },
  {
    pattern: /^No feasible plan: every area is locked, leaving (\d+) unassigned hours?\./,
    key: "planText.infeasibleAllLocked",
    params: (m) => ({ count: Number(m[1] ?? 0) }),
  },
  {
    pattern: /^No feasible plan: (\d+) of (\d+) hours were assigned\.$/,
    key: "planText.infeasibleShort",
    params: (m) => ({ allocated: m[1] ?? "", budget: m[2] ?? "" }),
  },
];

export function planMessage(t: Translator["t"], places: PlaceWords, message: string): string {
  for (const rule of PLAN_MESSAGE_RULES) {
    const match = rule.pattern.exec(message);
    if (match) return t(rule.key, rule.params(match, places));
  }
  // Unrecognised: the planner's own words, with this deployment's noun.
  return message.replace(" neighborhoods ", ` ${places.nounPlural} `);
}

interface ReasonRule {
  pattern: RegExp;
  key: string;
  params: (match: RegExpExecArray) => Record<string, string | number>;
}

const REASON_RULES: ReasonRule[] = [
  {
    pattern:
      /^(\d+)h user-set coverage-continuity floor plus a proportional share of the remaining hours using the uncertainty-aware planning load\.$/,
    key: "reason.floorPlusShare",
    params: (m) => ({ floor: m[1] ?? "" }),
  },
  {
    pattern: /^upper forecast bound \+ (\d+)h coverage floor$/,
    key: "reason.upperBoundPlusFloor",
    params: (m) => ({ floor: m[1] ?? "" }),
  },
  {
    pattern: /^upper forecast bound \+ coverage floor$/,
    key: "reason.upperBoundPlusFloorUnstated",
    params: () => ({}),
  },
  {
    pattern:
      /^The loaded artifact carries no observation for this area\. It receives the guaranteed minimum and no forecast weight\.$/,
    key: "reason.coverageFloorOnly",
    params: () => ({}),
  },
];

/** One area's "why this amount" sentence, in the reader's language. */
export function planReason(t: Translator["t"], reason: string): string {
  for (const rule of REASON_RULES) {
    const match = rule.pattern.exec(reason);
    if (match) return t(rule.key, rule.params(match));
  }
  return reason;
}

/** An artifact token such as `estimated_person_equivalents`, made readable. */
export function readableToken(t: Translator["t"], token: string): string {
  const translated = t(`token.${token}`);
  return translated === `token.${token}` ? token.replaceAll("_", " ") : translated;
}
