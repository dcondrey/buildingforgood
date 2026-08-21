/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adaptDemoV1 } from "./demo";
import { allocateHours } from "./planner";

const artifact = JSON.parse(
  readFileSync(new URL("../../../public/generated/demo.v1.json", import.meta.url), "utf8"),
);

describe("generated demo adapter", () => {
  it("surfaces the stable-panel two-rulers evidence without fallback values", () => {
    const demo = adaptDemoV1(artifact);
    expect(demo?.origin).toBe("generated");
    expect(demo?.signal).toMatchObject({
      fromValue: 778,
      toValue: 670,
      changePct: -13.9,
      activeFrom: 121,
      activeTo: 141,
      activeChangePct: 16.5,
      panelSize: 261,
      classification: "wider_footprint",
    });
  });

  it("adapts the held-out forecast scorecard and uncertainty-aware planning loads", () => {
    const demo = adaptDemoV1(artifact);
    expect(demo?.forecast).toMatchObject({
      point: 882.5,
      lower: 769,
      upper: 996.1,
      mae: 62.8,
      wape: 8.6,
      coverage: 75,
    });
    expect(demo?.forecast.scorecard.find((model) => model.selected)?.model).toMatch(/Local Linear/);

    const plan = allocateHours(demo?.areas ?? [], 80, 8, true);
    expect(plan.allocations.map((row) => row.hours)).toEqual([14, 9, 11, 27, 10, 9]);
  });

  it("keeps the external reporting-bias diagnostic separate from planning load", () => {
    const demo = adaptDemoV1(artifact);
    expect(demo?.reportingBias).toMatchObject({
      rawChangePct: 50.7,
      uniqueParentChangePct: 54.8,
      allReportsChangePct: 9.2,
      shareChangePoints: 15.6,
      placeboChangePct: -27.3,
    });
    expect(demo?.reportingBias?.checkpoints.map((row) => row.rawPerPublishedUnit)).toEqual([
      1.24, 3.24, 1.18,
    ]);
    expect(demo?.areas.find((area) => area.id === "east_village")?.planningLoad).toBe(591);
  });
});
