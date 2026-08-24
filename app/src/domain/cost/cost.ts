/**
 * Cost layer — arithmetic.
 *
 * Deliberately thin. Cost is a display and briefing concern: it prices a plan
 * that has already been made, and it may never make one. This module does not
 * import the allocator, and the allocator does not import it.
 *
 * Every figure produced here divides by an hour, an area, or a plan. None
 * divides by a human being; `assertNoPersonDenominator` and
 * `ExcludesPersonDenominator` in `./types.ts` keep it that way at both the
 * runtime and the compile-time boundary.
 */

import type { AreaCost, FloorMarginalCost, PlanCost } from "./types.ts";
import {
  declaredDenominator,
  PERMITTED_DENOMINATORS,
  prosePersonDenominators,
} from "../vocabulary/refusedTerms.ts";

/** Fallback rate for the reference deployment, in `DEFAULT_RATE_CURRENCY`. */
export const DEFAULT_LOADED_HOURLY_RATE = 45;
export const MAX_LOADED_HOURLY_RATE = 250;
export const DEFAULT_RATE_CURRENCY = "USD";

/**
 * Denominators a cost figure is allowed to have. An allowlist has a bounded,
 * checkable definition; a denylist of words meaning "human being" does not.
 *
 * The first version of this guard was a denylist, and an independent review
 * defeated it with this project's own vocabulary: `cost_per_sleeper` (SleeperType
 * is a real exported type in normalize.py) and `cost_per_household` (which is
 * on the actuals schema's own will-never-compute list) both passed, along with
 * `cost_per_bed`, `cost_per_case`, and `dollars_per_body`.
 */

/**
 * Keys shaped like a rate. Two forms, each requiring a real boundary before
 * "per" so ordinary words containing those letters — "hyperlink", "supervisor"
 * — are not read as rates.
 */

/** Prose that prices a person, for string values rather than key names. */

export class CostDenominatorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostDenominatorError";
  }
}

/**
 * Reject any object carrying a per-person cost field, at any depth.
 *
 * A cost figure whose denominator is a person is not a rounding-error problem
 * to be softened with a caveat; it is refused outright, the way the planner
 * refuses a complaint signal.
 */
export function assertNoPersonDenominator(value: unknown, where: string): void {
  const check = (key: string, path: string): void => {
    const denominator = declaredDenominator(key);
    if (denominator === null || PERMITTED_DENOMINATORS.has(denominator)) return;
    throw new CostDenominatorError(
      `${where}: "${path}${path ? "." : ""}${key}" declares a denominator of ` +
        `"${denominator}", which is not permitted. Cost figures are stated per staff-hour, ` +
        `per area, or per plan only; nothing here divides by a human being.`,
    );
  };
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    // Object.entries() returns [] for a Map or a Set, so an unguarded walk
    // accepts either in silence.
    if (node instanceof Map) {
      for (const [key, child] of node) {
        if (typeof key === "string") check(key, path);
        walk(key, `${path}<key>`);
        walk(child, `${path}[${String(key)}]`);
      }
      return;
    }
    if (node instanceof Set) {
      let index = 0;
      for (const child of node) walk(child, `${path}{${index++}}`);
      return;
    }
    if (typeof node === "string") {
      // The prose path asks the same question the key path does. It used to
      // ask a different one -- "is this word on a list of words meaning
      // person?" -- so `coste_por_usuario` was refused as a key and "gasto por
      // usuario" was accepted as a value, and free text is the side facing
      // operator-supplied input.
      const [denominator] = prosePersonDenominators(node);
      if (denominator !== undefined) {
        throw new CostDenominatorError(
          `${where}: text at "${path}" reads "${node.slice(0, 60)}", which states a cost ` +
            `per "${denominator}". Cost figures are stated per staff-hour, per area, per plan, ` +
            `or per shift only; nothing here divides by a human being.`,
        );
      }
      return;
    }
    if (typeof node !== "object" || node === null) return;
    for (const [key, child] of Object.entries(node)) {
      check(key, path);
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(value, "");
}

export function isValidRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 0 && rate <= MAX_LOADED_HOURLY_RATE;
}

/** Cents, so a plan total and the sum of its areas agree exactly. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The single multiplication the whole layer rests on. */
export function costOfHours(hours: number, rate: number): number {
  if (!isValidRate(rate) || !Number.isFinite(hours) || hours < 0) return 0;
  return roundCents(hours * rate);
}

export interface PlanCostAreaInput {
  id: string;
  label: string;
  /** Unitless share basis. Used only to name the highest-load area. */
  planningLoad: number;
}

export interface PlanCostInput {
  areas: readonly PlanCostAreaInput[];
  /** Allocated hours by area id, from the plan already on screen. */
  hoursByArea: ReadonlyMap<string, number>;
  /** Unmet planning load by area id — the hours the floor moved away. */
  unmetHoursByArea: ReadonlyMap<string, number>;
  rate: number;
  currency?: string;
}

export function summarizePlanCost(input: PlanCostInput): PlanCost {
  const rate = isValidRate(input.rate) ? input.rate : 0;
  const currency = input.currency ?? DEFAULT_RATE_CURRENCY;

  const byArea: AreaCost[] = input.areas.map((area) => {
    const hours = input.hoursByArea.get(area.id) ?? 0;
    return { areaId: area.id, label: area.label, hours, cost: costOfHours(hours, rate) };
  });
  const totalHours = byArea.reduce((sum, row) => sum + row.hours, 0);
  const totalCost = roundCents(byArea.reduce((sum, row) => sum + row.cost, 0));

  const floorHours = Array.from(input.unmetHoursByArea.values()).reduce(
    (sum, value) => sum + value,
    0,
  );
  const topLoad = input.areas.reduce<PlanCostAreaInput | null>(
    (best, area) => (best === null || area.planningLoad > best.planningLoad ? area : best),
    null,
  );
  const floor: FloorMarginalCost = {
    hours: floorHours,
    cost: costOfHours(floorHours, rate),
    topLoadAreaId: topLoad?.id ?? null,
    topLoadAreaLabel: topLoad?.label ?? null,
    topLoadAreaHours: topLoad ? (input.unmetHoursByArea.get(topLoad.id) ?? 0) : 0,
  };

  const summary: PlanCost = { rate, currency, byArea, totalHours, totalCost, floor };
  assertNoPersonDenominator(summary, "plan cost summary");
  return summary;
}

export function formatCurrency(value: number, currency = DEFAULT_RATE_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatRate(rate: number, currency = DEFAULT_RATE_CURRENCY): string {
  return `${formatCurrency(rate, currency)} per staff-hour`;
}

/**
 * The one sentence this layer exists to produce.
 *
 * Returns null when there is no plan to price. The dollar figure is the
 * assumed rate multiplied by hours the plan already reports as unmet; it is
 * not a new measurement and does not become one by being rendered.
 */
export function floorCostSentence(planCost: PlanCost): string | null {
  const { floor } = planCost;
  if (floor.topLoadAreaLabel === null) return null;
  const money = formatCurrency(floor.cost, planCost.currency);
  if (floor.hours <= 0) {
    return `The equity floor costs ${money} and moved no hours away from the highest-load area (${floor.topLoadAreaLabel}).`;
  }
  return `The equity floor costs ${money} and moved ${floor.topLoadAreaHours} hours from the highest-load area (${floor.topLoadAreaLabel}).`;
}
