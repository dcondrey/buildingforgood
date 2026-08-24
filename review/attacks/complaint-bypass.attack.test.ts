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

// WAS: "is NOT refused". When this harness was written, complaint volume passed
// as `planningLoad` ranked the areas and the plan came back feasible. It is now
// refused — not by recognising the number as complaints, which is impossible,
// but by requiring every planning load to declare a derivation from a permitted
// list. Complaint volume has no permitted derivation, so it is refused as an
// unstated basis. The shipped error names attacks C and D of this file.
describe("ATTACK B: shipped path, complaint numbers passed as planningLoad", () => {
  it("is refused: a planning load with no permitted derivation cannot allocate", () => {
    const areas = Object.entries(COMPLAINTS).map(([name, v]) => ({
      id: name.toLowerCase().replace(/ /g, "_"), name, latest: null, delta: 0,
      planningLoad: v, auditWape: null, reason: "complaint density",
    }));
    expect(() => allocateHours(areas, 600, 20, true)).toThrow(
      /not one of forecast_upper_bound, latest_observed_total, coverage_floor_only, embedded_demo_snapshot/,
    );
    expect(() => allocateHours(areas, 600, 20, true)).toThrow(
      /may never become allocation weight/,
    );
  });
});

// WAS: "survives the shipped adapter and reaches the shipped allocator". The
// tampered artifact used to pass straight through. The adapter now rejects it
// outright and returns null, so this payload never reaches the allocator at
// all — a second, earlier refusal than the one ATTACK B meets.
describe("ATTACK C: data-shaped, complaint volume written into demo.v1.json planning_load", () => {
  it("is refused by the adapter, before it can reach the allocator", () => {
    const hacked = JSON.parse(JSON.stringify(demoArtifact));
    for (const row of hacked.planner.allocations) row.planning_load = COMPLAINTS[row.area];
    // The artifact still carries the lie in its own constraints block; that is
    // the point of the attack, and it no longer buys anything.
    expect(hacked.planner.constraints.complaint_data_used).toBe(false);
    expect(adaptDemoV1(hacked)).toBeNull();
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
