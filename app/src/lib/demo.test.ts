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
      components: {
        individuals: { from: 510, to: 548, change: 38 },
        structures: { from: 258, to: 117, change: -141 },
        vehicles: { from: 10, to: 5, change: -5 },
      },
    });
    expect(demo?.signal.distributionSensitivity).toMatchObject({
      singleUnitFrom: 30,
      singleUnitTo: 40,
      hhiFrom: 0.023794,
      hhiTo: 0.027423,
      hhiChangePct: 15.3,
      effectiveBlocksFrom: 42,
      effectiveBlocksTo: 36.5,
      effectiveBlocksChangePct: -13.2,
    });
    expect(
      demo?.signal.distributionSensitivity?.thresholds.map((row) => [
        row.minimumUnits,
        row.fromBlocks,
        row.toBlocks,
        row.change,
      ]),
    ).toEqual([
      [1, 121, 141, 20],
      [2, 91, 101, 10],
      [3, 70, 70, 0],
    ]);
    expect(
      demo?.signal.componentDistribution?.components.map((component) => [
        component.id,
        component.thresholds.map((row) => [row.minimumUnits, row.fromBlocks, row.toBlocks]),
        component.hhiFrom,
        component.hhiTo,
      ]),
    ).toEqual([
      [
        "individuals",
        [
          [1, 111, 136],
          [2, 78, 94],
        ],
        0.028466,
        0.028231,
      ],
      [
        "structures",
        [
          [1, 47, 29],
          [2, 35, 19],
        ],
        0.041584,
        0.096501,
      ],
      [
        "vehicles",
        [
          [1, 7, 5],
          [2, 1, 0],
        ],
        0.22,
        0.2,
      ],
    ]);
    expect(demo?.signal.componentDistribution?.derivedEstimate).toMatchObject({
      from: 981.8,
      to: 762.9,
      changePct: -22.3,
      individualsContribution: 38,
      structuresContribution: -246.75,
      vehiclesContribution: -10.15,
    });
  });

  it("adapts like-for-like component footprint and concentration sensitivity", () => {
    const withComponents = structuredClone(artifact);
    withComponents.evidence.balanced_panel.component_distribution_sensitivity = {
      interpretation: "Like-for-like component interpretation.",
      post2020_multiplier_decomposition: {
        formula: "individuals + 1.75*tents_structures + 2.03*vehicles",
        from: 981.8,
        to: 762.9,
        change: -218.9,
        change_pct: -22.3,
        contributions_to_change: {
          individuals: 38,
          tents_structures: -246.8,
          vehicles: -10.2,
        },
        interpretation: "Derived secondary estimate.",
      },
      components: [
        {
          component: "individuals",
          label: "Individuals observed",
          active_block_thresholds: [
            {
              minimum_component_units: 1,
              from_active_blocks: 111,
              to_active_blocks: 136,
              change: 25,
            },
            {
              minimum_component_units: 2,
              from_active_blocks: 78,
              to_active_blocks: 94,
              change: 16,
            },
          ],
          concentration: {
            from: { hhi: 0.028466, effective_number_of_blocks: 35.1 },
            to: { hhi: 0.028231, effective_number_of_blocks: 35.4 },
            hhi_change_pct: -0.8,
          },
        },
        {
          component: "tents_structures",
          label: "Tents or structures observed",
          active_block_thresholds: [
            {
              minimum_component_units: 1,
              from_active_blocks: 47,
              to_active_blocks: 29,
              change: -18,
            },
            {
              minimum_component_units: 2,
              from_active_blocks: 35,
              to_active_blocks: 19,
              change: -16,
            },
          ],
          concentration: {
            from: { hhi: 0.041584, effective_number_of_blocks: 24 },
            to: { hhi: 0.096501, effective_number_of_blocks: 10.4 },
            hhi_change_pct: 132,
          },
        },
      ],
    };

    const demo = adaptDemoV1(withComponents);
    expect(demo?.signal.componentDistribution).toMatchObject({
      derivedEstimate: {
        from: 981.8,
        to: 762.9,
        changePct: -22.3,
        individualsContribution: 38,
        structuresContribution: -246.8,
        vehiclesContribution: -10.2,
      },
      components: [
        {
          id: "individuals",
          thresholds: [
            { minimumUnits: 1, fromBlocks: 111, toBlocks: 136, change: 25 },
            { minimumUnits: 2, fromBlocks: 78, toBlocks: 94, change: 16 },
          ],
          hhiFrom: 0.028466,
          hhiTo: 0.028231,
          effectiveBlocksFrom: 35.1,
          effectiveBlocksTo: 35.4,
        },
        {
          id: "structures",
          thresholds: [
            { minimumUnits: 1, fromBlocks: 47, toBlocks: 29, change: -18 },
            { minimumUnits: 2, fromBlocks: 35, toBlocks: 19, change: -16 },
          ],
          hhiFrom: 0.041584,
          hhiTo: 0.096501,
          effectiveBlocksFrom: 24,
          effectiveBlocksTo: 10.4,
        },
      ],
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
      evaluatedPoints: 8,
      intervalPoints: 8,
    });
    expect(demo?.forecast.scorecard.find((model) => model.selected)?.model).toMatch(/Local Linear/);
    expect(demo?.areas.map((area) => [area.id, area.auditWape])).toEqual([
      ["city_center", 12.9],
      ["columbia", 19.9],
      ["cortez", 34.2],
      ["east_village", 7.8],
      ["gaslamp", 22.6],
      ["marina", 32.7],
    ]);

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
    expect(demo?.reportingBias?.interpretation).toContain("pre/post reporting-pattern shift");
    expect(demo?.reportingBias?.interpretation).not.toContain("discontinuity");
    expect(demo?.reportingBias?.checkpoints.map((row) => row.rawPerPublishedUnit)).toEqual([
      1.24, 3.24, 1.18,
    ]);
    expect(demo?.areas.find((area) => area.id === "east_village")?.planningLoad).toBe(591);
  });

  it("adapts descriptive parking and weather robustness checks", () => {
    const demo = adaptDemoV1(artifact);
    expect(demo?.robustness?.parking).toMatchObject({
      verifiedPoles: 2035,
      preMonthlyMean: 291623.7,
      postMonthlyMean: 286531.2,
      changePct: -1.7,
      allMeterChangePct: -2.9,
    });
    expect(demo?.robustness?.weather.dates).toEqual([
      { date: "2024-01-25", precipitation: 0, maximumTemperature: 62 },
      { date: "2025-01-31", precipitation: 0, maximumTemperature: 63 },
    ]);
  });
});
