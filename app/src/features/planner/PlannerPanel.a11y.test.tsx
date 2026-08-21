// @vitest-environment jsdom
/**
 * Automated accessibility checks for the planner panel (#16).
 *
 * #16 requires automated accessibility checks alongside a documented
 * keyboard-only smoke test. The keyboard path is covered by behaviour tests
 * in PlannerPanel.test.tsx; this file runs axe over the rendered panel in
 * each state that matters, so a regression in labelling, roles, or contrast
 * fails the build instead of surviving to the demo.
 *
 * Scope note, stated rather than implied: axe catches machine-checkable
 * violations only. It cannot tell whether the copy is comprehensible or
 * whether the reading order makes sense, which is why the manual smoke test
 * in docs/track-c/C-05-keyboard-smoke-test.md still has to be run by a
 * person before release.
 */

import axe from "axe-core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlannerPanel } from "./PlannerPanel.tsx";
import type { AreaPlanningInput, PlannerPolicy } from "../../domain/planner/types.ts";

afterEach(cleanup);

const POLICY: PlannerPolicy = {
  budget_hours: 80,
  time_increment_hours: 1,
  minimum_coverage_floor_hours: 6,
  continuity_reserve_hours: 4,
  uncertainty_weight: 0.5,
};

const AREAS: AreaPlanningInput[] = [
  {
    area_id: "cortez_hill",
    label: "Cortez Hill",
    forecast_upper: 18,
    forecast_lower: 12,
    drop_test: "likely_improvement",
    included: true,
  },
  {
    area_id: "east_village",
    label: "East Village",
    forecast_upper: 150,
    forecast_lower: 110,
    drop_test: "possible_displacement",
    included: true,
  },
  {
    area_id: "gaslamp",
    label: "Gaslamp",
    forecast_upper: 60,
    forecast_lower: 44,
    drop_test: "likely_improvement",
    included: true,
  },
];

async function violationsFor(element: HTMLElement): Promise<string[]> {
  const results = await axe.run(element, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}

describe("automated accessibility", () => {
  it("has no violations in the normal planned state", async () => {
    const { container } = render(<PlannerPanel areas={AREAS} policy={POLICY} />);
    expect(await violationsFor(container)).toEqual([]);
  });

  it("has no violations when the plan is infeasible", async () => {
    const { container } = render(
      <PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: 10 }} />,
    );
    expect(await violationsFor(container)).toEqual([]);
  });

  it("has no violations when the coverage floor dominates", async () => {
    const { container } = render(
      <PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: 24 }} />,
    );
    expect(await violationsFor(container)).toEqual([]);
  });
});
