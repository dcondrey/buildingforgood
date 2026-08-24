// Does ExcludesPersonDenominator<T> have the same value-shaped hole the
// complaint guard had? Four attempts to produce a cost-per-person figure.
import { describe, expect, it } from "vitest";
import { assertNoPersonDenominator, summarizePlanCost } from "../../app/src/domain/cost/cost";
import type { PlanCost } from "../../app/src/domain/cost/types";

const AREAS = [
  { id: "east_village", label: "East Village", planningLoad: 591 },
  { id: "city_center", label: "City Center", planningLoad: 193 },
];
const HOURS = new Map([["east_village", 40], ["city_center", 20]]);
const UNMET = new Map([["east_village", 12], ["city_center", 0]]);
const RATE = 45;

function tryGuard(payload: unknown, where: string): string {
  try { assertNoPersonDenominator(payload, where); return "ACCEPTED — guard did not fire"; }
  catch (e) { return `REFUSED: ${(e as Error).message.slice(0, 90)}`; }
}

describe("ATTACK E: per-person cost without a per-person-named field", () => {
  it("E-0 baseline: an honestly-named field IS refused", () => {
    console.log("E-0:", tryGuard({ cost_per_person: 12.5 }, "areaCost"));
    console.log("E-0 nested:", tryGuard({ a: [{ b: { costPerContact: 1 } }] }, "areaCost"));
    expect(() => assertNoPersonDenominator({ cost_per_person: 1 }, "x")).toThrow();
  });

  it("E-1 divides a permitted cost by a permitted engagement count", () => {
    // Both operands are correctly-named, schema-legal fields:
    //   PlanCost.byArea[].cost   and   AreaMonthEngagement.count
    const plan: PlanCost = summarizePlanCost({ areas: AREAS, hoursByArea: HOURS, unmetHoursByArea: UNMET, rate: RATE });
    const engagementCount = 137; // actuals/v1 AreaMonthEngagement.count
    const ev = plan.byArea[0];
    const costPerContact = ev.cost / engagementCount;
    console.log(`E-1: ${ev.label} cost ${ev.cost} / ${engagementCount} contacts = $${costPerContact.toFixed(2)} per contact`);
    console.log("E-1 guard on the plan object:", tryGuard(plan, "planCost"));
    console.log("E-1 guard on the derived figure:", tryGuard({ label: ev.label, value: costPerContact }, "derived"));
    expect(Number.isFinite(costPerContact)).toBe(true);
  });

  it("E-2 puts the forbidden phrase in a VALUE, not a key", () => {
    const payload = { label: "Assumed cost per person served", unit: "USD per person", value: 3.28 };
    console.log("E-2:", tryGuard(payload, "displayRow"));
    expect(() => assertNoPersonDenominator(payload, "displayRow")).not.toThrow();
  });

  it("E-3 uses this project's OWN vocabulary as the denominator", () => {
    // SleeperType is ('individual','structure','vehicle'); the artifact and the
    // README talk about sleepers, unsheltered, and households throughout.
    for (const key of [
      "cost_per_sleeper", "costPerSleeper", "cost_per_unsheltered",
      "cost_per_household", "cost_per_bed", "cost_per_case",
      "cost_per_enrollee", "cost_per_beneficiary", "dollars_per_body",
      "cost_per_person_equivalent",
    ]) {
      console.log(`E-3 ${key.padEnd(28)} ${tryGuard({ [key]: 1 }, "areaCost")}`);
    }
    expect(() => assertNoPersonDenominator({ cost_per_sleeper: 1 }, "x")).not.toThrow();
  });

  it("E-4 hides the payload in a container the walk does not enter", () => {
    console.log("E-4 Map:  ", tryGuard(new Map([["cost_per_person", 12]]), "areaCost"));
    console.log("E-4 Set:  ", tryGuard(new Set([{ cost_per_person: 12 }]), "areaCost"));
    console.log("E-4 class:", tryGuard(Object.assign(Object.create(null), { cost_per_person: 12 }), "areaCost"));
  });
});
