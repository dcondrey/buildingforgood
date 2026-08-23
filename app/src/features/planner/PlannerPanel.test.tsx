// @vitest-environment jsdom
/**
 * Accessibility and behaviour evidence for the planner panel (#15).
 *
 * #15 requires that a user can complete the budget, compare, override, and
 * explain steps with a keyboard, and that invalid or infeasible input
 * produces actionable feedback. Those are DOM properties, so asserting them
 * needs a rendered component rather than a unit test on the domain function.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderPanel() {
  return render(<PlannerPanel areas={AREAS} policy={POLICY} />);
}

describe("the plan is readable without the historical chart", () => {
  it("shows every included area with its hours", () => {
    renderPanel();
    for (const area of AREAS) {
      const header = screen.getByRole("rowheader", { name: area.label });
      // The hours were the half of this name the body never read: a row
      // that rendered its label and nothing else used to pass.
      const row = header.closest("tr");
      expect(row, area.label).not.toBeNull();
      expect(row?.textContent ?? "", area.label).toMatch(/\d/);
    }
  });

  it("always shows unmet planning load next to the total", async () => {
    // "Always" means every state that shows a total, not only the default
    // one: an unmet figure that vanished when the floor dominated the plan,
    // or in the unguarded comparison, would have passed. An infeasible plan
    // shows no total and is covered by its own test below.
    for (const budget of [80, 24]) {
      cleanup();
      render(<PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: budget }} />);
      expect(screen.getByText(/Unmet planning load/i), `budget ${budget}`).toBeDefined();
    }
    cleanup();
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /Compare without the coverage guard/i }));
    expect(screen.getByText(/Unmet planning load/i)).toBeDefined();
  });

  it("labels the unguarded view as an audit view rather than a recommendation", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: /Compare without the coverage guard/i }));
    // "audit view" appears in the column header and in the note below it.
    expect(screen.getAllByText(/audit view/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/comparison only/i)).toBeDefined();
  });
});

describe("keyboard operation end to end", () => {
  it("reaches the budget, a lock, an explanation, and the compare control by Tab alone", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/Available staff-hours/i));

    const reached = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      await user.tab();
      const active = document.activeElement as HTMLElement | null;
      if (!active) continue;
      const label = active.textContent ?? active.getAttribute("aria-label") ?? "";
      if (active.getAttribute("type") === "checkbox") reached.add("lock");
      if (/Why this amount/i.test(label)) reached.add("explain");
      if (/Compare without/i.test(label)) reached.add("compare");
      if (/^Reset$/i.test(label.trim())) reached.add("reset");
    }
    expect([...reached].sort()).toEqual(["compare", "explain", "lock", "reset"]);
  });

  it("opens an explanation with the keyboard and reports its state to assistive tech", async () => {
    const user = userEvent.setup();
    renderPanel();
    const button = screen.getAllByRole("button", { name: /Why this amount/i })[0]!;
    expect(button.getAttribute("aria-expanded")).toBe("false");
    button.focus();
    await user.keyboard("{Enter}");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/minimum-coverage floor/i)).toBeDefined();
  });
});

describe("locks and overrides", () => {
  it("preserves a locked assignment and discloses that a human set it", async () => {
    const user = userEvent.setup();
    renderPanel();
    const row = screen.getByRole("rowheader", { name: "Gaslamp" }).closest("tr")!;
    await user.click(within(row).getByRole("checkbox"));
    // Stated exactly once: the disclosure line, not also in the notes list.
    expect(screen.getAllByText(/1 of 3 assignments were set by the coordinator/i)).toHaveLength(1);
  });
});

describe("invalid and infeasible input produce actionable feedback", () => {
  it("refuses a non-numeric budget and says what to do", async () => {
    const user = userEvent.setup();
    renderPanel();
    const budget = screen.getByLabelText(/Available staff-hours/i);
    await user.clear(budget);
    expect(screen.getByRole("alert").textContent).toMatch(/Enter the number of staff-hours/i);
    expect(budget.getAttribute("aria-invalid")).toBe("true");
  });

  it("explains an infeasible budget instead of rendering an empty plan", async () => {
    render(<PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: 10 }} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/No plan was produced/i);
    expect(alert.textContent).toMatch(/coverage floor/i);
  });
});

describe("meaning never depends on colour", () => {
  it("gives the infeasible state a symbol and words, not just styling", () => {
    render(<PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: 10 }} />);
    expect(screen.getByRole("alert").textContent).toContain("✕");
  });

  it("gives the floor-dominance warning a symbol and words", () => {
    render(<PlannerPanel areas={AREAS} policy={{ ...POLICY, budget_hours: 24 }} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("⚠");
    expect(status.textContent).toMatch(/coverage floor is deciding most of this plan/i);
  });
});
