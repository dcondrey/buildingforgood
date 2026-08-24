// Re-run of attacks C and D against the build session's WIRED-IN guard
// (working tree after `assertNoComplaintSignal` was added to allocateHours).
import { describe, expect, it } from "vitest";
import { allocateHours } from "../../app/src/lib/planner";
import type { PlanningArea } from "../../app/src/lib/demo";

const COMPLAINTS: Record<string, number> = {
  "East Village": 4120, "City Center": 980, "Gaslamp": 2600,
  Cortez: 310, Columbia: 145, Marina: 60,
};
const areas: PlanningArea[] = Object.entries(COMPLAINTS).map(([name, v]) => ({
  id: name.toLowerCase().replace(/ /g, "_"), name, latest: null, delta: 0,
  planningLoad: v, auditWape: null, reason: "complaint density",
}));

describe("post-fix verification", () => {
  it("A: an honestly-named complaint field is now refused ON THE SHIPPED PATH", () => {
    const dirty = areas.map((a) => ({ ...a, complaint_count: 900 })) as PlanningArea[];
    let msg = "NOT REFUSED";
    try { allocateHours(dirty, 600, 20, true); } catch (e) { msg = `REFUSED: ${(e as Error).message}`; }
    console.log("POSTFIX A:", msg);
    expect(msg).toMatch(/REFUSED/);
  });

  it("C/D: complaint volume carried in planningLoad is still accepted", () => {
    let threw: unknown = null;
    let plan: ReturnType<typeof allocateHours> | null = null;
    try { plan = allocateHours(areas, 600, 20, true); } catch (e) { threw = e; }
    console.log("POSTFIX C/D:", threw ? `REFUSED: ${(threw as Error).message}` : "ACCEPTED — guard did not fire");
    if (plan) console.log("POSTFIX C/D hours:", JSON.stringify(Object.fromEntries(plan.allocations.map((a) => [a.areaId, a.hours]))));
    expect(threw).toBeNull(); // documenting reality
  });
});
