// Adversarial review harness. NOT part of the product suite.
// Four attempts to make outreach hours follow 311 complaint volume.
import { describe, expect, it } from "vitest";
import { allocateHours } from "../../app/src/lib/planner";
import { buildPlan, assertNoComplaintSignal } from "../../app/src/domain/planner/planner";
import { adaptDemoV1 } from "../../app/src/lib/demo";
import demoArtifact from "../../public/generated/demo.v1.json";

const COMPLAINTS: Record<string, number> = {
  "East Village": 4120, "City Center": 980, "Gaslamp": 2600,
  Cortez: 310, Columbia: 145, Marina: 60,
};

describe("ATTACK A: name the field honestly, go through the guarded planner", () => {
  it("is refused", () => {
    expect(() =>
      assertNoComplaintSignal({ area_id: "east_village", complaint_count: 4120 }, "area east_village"),
    ).toThrow(/complaint volume may never influence planning load/);
  });
});

describe("ATTACK B: shipped path, complaint numbers passed as planningLoad", () => {
  it("is NOT refused", () => {
    const areas = Object.entries(COMPLAINTS).map(([name, v]) => ({
      id: name.toLowerCase().replace(/ /g, "_"), name, latest: null, delta: 0,
      planningLoad: v, auditWape: null, reason: "complaint density",
    }));
    const plan = allocateHours(areas, 600, 20, true);
    expect(plan.feasible).toBe(true);
    const byArea = Object.fromEntries(plan.allocations.map((a) => [a.areaId, a.hours]));
    console.log("ATTACK B hours:", JSON.stringify(byArea));
    // Hours now rank by complaints, not by observed need.
    expect(byArea.east_village).toBeGreaterThan(byArea.city_center);
    expect(byArea.gaslamp).toBeGreaterThan(byArea.city_center);
  });
});

describe("ATTACK C: data-shaped, complaint volume written into demo.v1.json planning_load", () => {
  it("survives the shipped adapter and reaches the shipped allocator", () => {
    const hacked = JSON.parse(JSON.stringify(demoArtifact));
    for (const row of hacked.planner.allocations) row.planning_load = COMPLAINTS[row.area];
    expect(hacked.planner.constraints.complaint_data_used).toBe(false); // the lie stands
    const data = adaptDemoV1(hacked);
    expect(data).not.toBeNull();
    const loads = Object.fromEntries(data!.areas.map((a) => [a.name, a.planningLoad]));
    console.log("ATTACK C planningLoad after adapter:", JSON.stringify(loads));
    expect(loads["East Village"]).toBe(4120);
    const plan = allocateHours(data!.areas, 600, 20, true);
    const byArea = Object.fromEntries(plan.allocations.map((a) => [a.areaId, a.hours]));
    console.log("ATTACK C hours:", JSON.stringify(byArea));
    expect(plan.feasible).toBe(true);
  });
});

describe("ATTACK D: same data-shaped payload through the GUARDED planner", () => {
  it("shows whether the guard catches unnamed complaint volume", () => {
    const areas = Object.entries(COMPLAINTS).map(([name, v]) => ({
      area_id: name.toLowerCase().replace(/ /g, "_"),
      planning_load: v,
      drop_test: "insufficient_evidence" as const,
    }));
    let threw: unknown = null;
    try { areas.forEach((a) => assertNoComplaintSignal(a, `area ${a.area_id}`)); }
    catch (e) { threw = e; }
    console.log("ATTACK D guard verdict:", threw ? `REFUSED: ${(threw as Error).message}` : "ACCEPTED — guard did not fire");
    expect(threw).toBeNull(); // documenting reality, not endorsing it
  });
});
