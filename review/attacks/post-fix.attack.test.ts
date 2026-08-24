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

  // WAS: "is still accepted", asserting `threw` was null. That was the honest
  // result at the time and it was the gap this harness existed to show: naming
  // the field innocently got complaint volume through, because a name-based
  // guard can only catch names. The fix was not a better name list. Every
  // planning load must now declare a derivation from a permitted set, and
  // complaint volume has none, so it is refused as an unstated basis.
  it("C/D: complaint volume carried in planningLoad is now refused too", () => {
    expect(() => allocateHours(areas, 600, 20, true)).toThrow(
      /may never become allocation weight/,
    );
  });
});
