import { describe, expect, it } from "vitest";

import { EMBEDDED_DEMO } from "./demo";
import { AREA_ADJACENCY, applyIntervention } from "./intervention";

const areas = EMBEDDED_DEMO.areas;
const load = (id: string) => areas.find((area) => area.id === id)?.planningLoad ?? Number.NaN;

describe("applyIntervention", () => {
  it("conserves total load at full displacement: clearing moves need, it does not shrink it", () => {
    const result = applyIntervention(areas, { targetAreaId: "east_village", displacedShare: 1 });
    expect(result).not.toBeNull();
    const before = areas.reduce((sum, area) => sum + area.planningLoad, 0);
    const after = (result?.areas ?? []).reduce((sum, area) => sum + area.planningLoad, 0);
    expect(after).toBeCloseTo(before, 6);
    expect(result?.assumedResolved ?? Number.NaN).toBeCloseTo(0, 6);
    expect(result?.areas.find((area) => area.id === "east_village")?.planningLoad).toBe(0);
  });

  it("removes load only by explicit assumption at partial displacement", () => {
    const result = applyIntervention(areas, { targetAreaId: "east_village", displacedShare: 0.5 });
    const target = load("east_village");
    expect(result?.shifted ?? Number.NaN).toBeCloseTo(target * 0.5, 6);
    expect(result?.assumedResolved ?? Number.NaN).toBeCloseTo(target * 0.5, 6);
    const before = areas.reduce((sum, area) => sum + area.planningLoad, 0);
    const after = (result?.areas ?? []).reduce((sum, area) => sum + area.planningLoad, 0);
    expect(before - after).toBeCloseTo(target * 0.5, 6);
  });

  it("distributes shifted load to adjacent areas proportional to their load", () => {
    // Every area in the adjacency table, not only East Village: the name is
    // a property of the distribution rule, not of one neighbourhood.
    for (const targetId of Object.keys(AREA_ADJACENCY)) {
      const result = applyIntervention(areas, { targetAreaId: targetId, displacedShare: 1 });
      const neighborIds = AREA_ADJACENCY[targetId];
      const weightTotal = neighborIds.reduce((sum, id) => sum + load(id), 0);
      for (const id of neighborIds) {
        expect(result?.loadDelta.get(id) ?? Number.NaN, `${targetId}->${id}`).toBeCloseTo(
          load(targetId) * (load(id) / weightTotal),
          6,
        );
      }
      // Non-adjacent areas are untouched.
      for (const area of areas) {
        if (area.id === targetId || neighborIds.includes(area.id)) continue;
        expect(
          result?.areas.find((entry) => entry.id === area.id)?.planningLoad,
          `${targetId}: ${area.id}`,
        ).toBe(area.planningLoad);
      }
    }
  });

  it("keeps the adjacency table symmetric and limited to known areas", () => {
    const known = new Set(areas.map((area) => area.id));
    for (const [id, neighbors] of Object.entries(AREA_ADJACENCY)) {
      expect(known.has(id)).toBe(true);
      for (const neighbor of neighbors) {
        expect(known.has(neighbor)).toBe(true);
        expect(AREA_ADJACENCY[neighbor]).toContain(id);
      }
    }
  });

  it("clamps the displaced share into 0..1 and rejects unknown targets", () => {
    const over = applyIntervention(areas, { targetAreaId: "marina", displacedShare: 1.7 });
    expect(over?.assumedResolved ?? Number.NaN).toBeCloseTo(0, 6);
    const under = applyIntervention(areas, { targetAreaId: "marina", displacedShare: -3 });
    expect(under?.shifted ?? Number.NaN).toBeCloseTo(0, 6);
    expect(applyIntervention(areas, { targetAreaId: "nowhere", displacedShare: 0.5 })).toBeNull();
  });

  it("never mutates its inputs", () => {
    // "Never" across every target and every share the slider can produce,
    // plus the unknown-target path that returns null.
    const snapshot = JSON.stringify(areas);
    for (const targetAreaId of [...Object.keys(AREA_ADJACENCY), "nowhere"]) {
      for (const displacedShare of [-3, 0, 0.25, 0.8, 1, 1.7]) {
        applyIntervention(areas, { targetAreaId, displacedShare });
        expect(JSON.stringify(areas), `${targetAreaId}@${displacedShare}`).toBe(snapshot);
      }
    }
  });
});
