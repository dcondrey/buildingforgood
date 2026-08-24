/**
 * Two guards, not a coverage suite.
 *
 * 1. The marginal-floor-cost arithmetic is exactly one multiplication on the
 *    plan's existing unmet hours, and the board-ready sentence reads off it.
 * 2. No cost value can reach the allocator — structurally, by module graph and
 *    call-site inspection, and behaviorally, by planning at wildly different
 *    rates and getting identical plans.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { EMBEDDED_DEMO } from "../../lib/demo.ts";
import { allocateHours } from "../../lib/planner.ts";

import {
  CostDenominatorError,
  assertNoPersonDenominator,
  costOfHours,
  floorCostSentence,
  summarizePlanCost,
} from "./index.ts";
import * as costTypes from "./types.ts";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const AREAS = EMBEDDED_DEMO.areas.map((area) => ({
  id: area.id,
  label: area.name,
  planningLoad: area.planningLoad,
}));

/** The shell's own unmet-hours definition, reproduced once for the fixture. */
function unmetByArea(budget: number, floor: number) {
  const guarded = allocateHours(EMBEDDED_DEMO.areas, budget, floor, true);
  const reference = allocateHours(EMBEDDED_DEMO.areas, budget, 0, false);
  const allocated = new Map(guarded.allocations.map((row) => [row.areaId, row.hours]));
  return new Map(
    reference.allocations.map((row) => [
      row.areaId,
      Math.max(0, row.hours - (allocated.get(row.areaId) ?? 0)),
    ]),
  );
}

describe("marginal cost of the continuity floor", () => {
  it("is the plan's own unmet hours multiplied by the assumed rate, and nothing else", () => {
    const unmet = unmetByArea(80, 8);
    const plan = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    const unmetTotal = Array.from(unmet.values()).reduce((sum, value) => sum + value, 0);
    expect(unmetTotal).toBeGreaterThan(0);

    const cost = summarizePlanCost({
      areas: AREAS,
      hoursByArea: new Map(plan.allocations.map((row) => [row.areaId, row.hours])),
      unmetHoursByArea: unmet,
      rate: 45,
    });

    expect(cost.floor.hours).toBe(unmetTotal);
    expect(cost.floor.cost).toBe(unmetTotal * 45);
    expect(cost.floor.cost).toBe(costOfHours(unmetTotal, 45));
    // East Village carries the largest planning load, so it is the area the
    // floor takes hours from.
    expect(cost.floor.topLoadAreaLabel).toBe("East Village");
    expect(cost.floor.topLoadAreaHours).toBe(unmet.get("east_village"));
    // Per-area costs sum to the plan total; the plan total prices the budget.
    expect(cost.totalHours).toBe(80);
    expect(cost.totalCost).toBe(80 * 45);
    expect(cost.byArea.reduce((sum, row) => sum + row.cost, 0)).toBe(cost.totalCost);
  });

  it("renders the board-ready sentence off those same numbers", () => {
    const unmet = unmetByArea(80, 8);
    const plan = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    const cost = summarizePlanCost({
      areas: AREAS,
      hoursByArea: new Map(plan.allocations.map((row) => [row.areaId, row.hours])),
      unmetHoursByArea: unmet,
      rate: 45,
    });
    expect(floorCostSentence(cost)).toBe(
      `The equity floor costs $${(cost.floor.hours * 45).toLocaleString("en-US")} and moved ${cost.floor.topLoadAreaHours} hours from the highest-load area (East Village).`,
    );
  });

  it("costs nothing and moves nothing when no minimum is enforced", () => {
    const plan = allocateHours(EMBEDDED_DEMO.areas, 80, 0, false);
    const cost = summarizePlanCost({
      areas: AREAS,
      hoursByArea: new Map(plan.allocations.map((row) => [row.areaId, row.hours])),
      unmetHoursByArea: new Map(),
      rate: 45,
    });
    expect(cost.floor.cost).toBe(0);
    expect(floorCostSentence(cost)).toContain("moved no hours");
  });
});

describe("refusal: no cost figure is divided by a human being", () => {
  it("makes a person denominator unrepresentable in every cost type", () => {
    // Derived from the module rather than hand-listed: a cost type added
    // later without its compile-time proof fails here instead of shipping
    // unguarded. `ExcludesPersonDenominator<T>` is `never` when T can price
    // a person, so the constant does not compile at all in that case; this
    // asserts the constant exists for every interface the module declares.
    const source = readFileSync(join(SRC, "domain/cost/types.ts"), "utf8");
    const interfaces = [...source.matchAll(/^export interface (\w+)/gm)].map((m) => m[1] ?? "");
    expect(interfaces.length).toBeGreaterThanOrEqual(3);
    const guards = costTypes as unknown as Record<string, unknown>;
    for (const name of interfaces) {
      const constant = `${name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase()}_EXCLUDES_PERSON_DENOMINATOR`;
      expect(guards[constant], constant).toBe(true);
    }
  });

  for (const shape of [
    { cost_per_person: 12 },
    { costPerPerson: 12 },
    { cost_per_contact: 12 },
    { cost_per_person_equivalent_covered: 12 },
    { costPerClient: 12 },
    { nested: { cost_per_capita: 12 } },
  ]) {
    it(`rejects ${Object.keys(shape)[0]} at the runtime boundary`, () => {
      expect(() => assertNoPersonDenominator(shape, "cost input")).toThrow(CostDenominatorError);
    });
  }

  it("exposes no cost field whose denominator is a person", () => {
    const cost = summarizePlanCost({
      areas: AREAS,
      hoursByArea: new Map(AREAS.map((area) => [area.id, 10])),
      unmetHoursByArea: new Map(),
      rate: 45,
    });
    // The property, over the whole object at every depth, before the key
    // pins below — which are a snapshot of one level and cannot see a
    // per-person field added inside `byArea` or `floor`.
    expect(() => assertNoPersonDenominator(cost, "summarizePlanCost output")).not.toThrow();
    expect(Object.keys(cost.floor).sort()).toEqual([
      "cost",
      "hours",
      "topLoadAreaHours",
      "topLoadAreaId",
      "topLoadAreaLabel",
    ]);
    expect(Object.keys(cost).sort()).toEqual([
      "byArea",
      "currency",
      "floor",
      "rate",
      "totalCost",
      "totalHours",
    ]);
    expect(Object.keys(cost.byArea[0]).sort()).toEqual(["areaId", "cost", "hours", "label"]);
  });
});

describe("refusal: no cost value reaches the allocator", () => {
  /**
   * Derived, not hand-listed: everything under `domain/planner/`, plus any
   * module anywhere that exports an allocation entry point. A new allocator
   * is in scope the day it is written, which a fixed list of three paths
   * would not have been.
   */
  const PLANNER_FILES: string[] = (() => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
        const relative = path.slice(SRC.length + 1);
        if (
          relative.startsWith("domain/planner/") ||
          /export\s+function\s+(?:allocateHours|buildPlan)\b/.test(readFileSync(path, "utf8"))
        ) {
          found.push(relative);
        }
      }
    };
    walk(SRC);
    return found.sort();
  })();

  it("keeps the three known allocating modules in the list the walk derives", () => {
    expect(PLANNER_FILES).toContain("lib/planner.ts");
    expect(PLANNER_FILES).toContain("domain/planner/planner.ts");
    expect(PLANNER_FILES).toContain("domain/planner/types.ts");
  });

  it("keeps the cost layer out of every allocating module", () => {
    for (const file of PLANNER_FILES) {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source, file).not.toMatch(/from\s+"[^"]*\/cost[/"]/);
      expect(source, file).not.toMatch(/\b(?:rate|currency|dollar|usd)\b/i);
    }
  });

  it("keeps the allocator out of the cost layer", () => {
    const costFiles = readdirSync(join(SRC, "domain/cost"))
      .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
      .map((name) => join(SRC, "domain/cost", name));
    for (const file of costFiles) {
      expect(readFileSync(file, "utf8")).not.toMatch(/allocateHours|buildPlan/);
    }
  });

  it("passes no cost value at any allocateHours call site in the shipped app", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) files.push(path);
      }
    };
    walk(SRC);
    let callSites = 0;
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/allocateHours\(([^;]*?)\)\s*[;,)]/gs)) {
        callSites += 1;
        expect(match[1]).not.toMatch(/rate|cost|currency|price|dollar|budgetCost/i);
      }
    }
    // A regex that silently stops matching would pass vacuously.
    expect(callSites).toBeGreaterThan(3);
  });

  it("produces identical plans at every assumed rate", () => {
    const baseline = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    for (const rate of [0, 1, 45, 250]) {
      const cost = summarizePlanCost({
        areas: AREAS,
        hoursByArea: new Map(baseline.allocations.map((row) => [row.areaId, row.hours])),
        unmetHoursByArea: unmetByArea(80, 8),
        rate,
      });
      expect(cost.rate).toBe(rate);
      // The plan is recomputed after the cost summary exists, so an allocator
      // that had learned to read a rate would show it here.
      expect(allocateHours(EMBEDDED_DEMO.areas, 80, 8, true)).toEqual(baseline);
    }
  });
});
