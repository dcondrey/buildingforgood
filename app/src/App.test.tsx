// @vitest-environment jsdom
/**
 * Behaviour, offline-fallback, and accessibility evidence for the deployed
 * decision shell (#12, #13, #16).
 *
 * Every test here runs with fetch rejecting, so the shell exercises the same
 * path it takes with the network disabled: the embedded snapshot renders and
 * is visibly labeled as the offline fallback (#12 acceptance criterion 4 at
 * the jsdom level; the hash-identity of public/generated, app/dist, and the
 * deployed artifact is verified separately in release evidence).
 *
 * The axe checks mirror PlannerPanel.a11y.test.tsx but target the shell the
 * user actually reaches. Scope note: axe under jsdom cannot execute its
 * color-contrast rule; the manual keyboard smoke test in
 * docs/track-c/C-05-keyboard-smoke-test.md still has to be run by a person.
 */

import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("network disabled"))),
  );
  // jsdom implements neither smooth scrolling nor scrollIntoView.
  Element.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderOffline() {
  render(<App />);
  await screen.findByText("Offline demo snapshot");
}

async function violationsFor(element: HTMLElement): Promise<string[]> {
  const results = await axe.run(element, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}

describe("decision shell offline fallback (#12)", () => {
  it("completes the load with the network disabled and labels the fallback", async () => {
    await renderOffline();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Fewer tents");
    expect(screen.getByText("Offline demo snapshot")).toBeDefined();
  });

  it("keeps observations, forecast, planning load, and allocation distinct", async () => {
    await renderOffline();
    expect(screen.getByText("Test the drop", { selector: "h2" })).toBeDefined();
    expect(screen.getByText("Could we have predicted January 2026?")).toBeDefined();
    expect(screen.getByRole("heading", { name: /Plan \d+ staff-hours/ })).toBeDefined();
    expect(screen.getByText("Review before the next shift")).toBeDefined();
  });
});

describe("decision flow (#12)", () => {
  it("reveals the evidence result and moves focus to its heading", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const heading = await screen.findByRole("heading", {
      level: 3,
      name: /People were seen|Field activity/,
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("generates a plan, conserves the budget, and always shows unmet planning load", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Generate coverage scenario/ }));
    expect(await screen.findByText(/\/\d+ hours allocated\./)).toBeDefined();
    expect(screen.getByText("Unmet planning load")).toBeDefined();
    expect(
      screen.getByText(/^(\d+h moved to minimums and locks|0h · hours follow the forecast)$/),
    ).toBeDefined();
  });
});

describe("aggregate spatial view (#13)", () => {
  it("gives each schematic map a tabular equivalent with non-color state words", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    await user.click(screen.getByRole("button", { name: /Generate coverage scenario/ }));
    const disclosures = screen.getAllByText("View map values as a table");
    expect(disclosures.length).toBe(2);
    const tables = screen.getAllByRole("table").filter((table) => {
      const caption = table.querySelector("caption");
      return caption?.textContent?.includes("by neighborhood") ?? false;
    });
    expect(tables.length).toBe(2);
    const planTable = tables.find((table) =>
      table.querySelector("caption")?.textContent?.includes("staff-hours"),
    );
    expect(planTable).toBeDefined();
    const states = within(planTable as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    for (const state of states) {
      expect(state).toMatch(/Human lock|No minimum|Below minimum|Minimum met|\d+h/);
    }
  });

  it("selects a neighborhood on the map, shows its detail panel, and toggles off", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const areaButton = screen.getAllByRole("button", { name: /East Village:/ })[0];
    await user.click(areaButton);
    expect(areaButton.getAttribute("aria-pressed")).toBe("true");
    const detailHeadings = await screen.findAllByRole("heading", {
      level: 5,
      name: "East Village",
    });
    expect(detailHeadings.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Held-out WAPE").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /East Village:/ })[0]);
    expect(screen.queryAllByRole("heading", { level: 5, name: "East Village" }).length).toBe(0);
  });

  it("selects a map area with the keyboard", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const areaButton = screen.getAllByRole("button", { name: /Marina:/ })[0];
    fireEvent.keyDown(areaButton, { key: "Enter" });
    expect(areaButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(areaButton, { key: " " });
    expect(areaButton.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("keyboard access (#12, #16)", () => {
  it("offers a skip link as the first tab stop and a labeled budget input", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.tab();
    const skip = screen.getByText("Skip to decision");
    expect(document.activeElement).toBe(skip);
    expect(skip.getAttribute("href")).toBe("#drop-test");
    expect(screen.getByLabelText("Available staff-hours")).toBeDefined();
  });
});

describe("automated accessibility over the deployed shell (#16)", () => {
  it("has no axe violations in the initial state", async () => {
    await renderOffline();
    expect(await violationsFor(document.body)).toEqual([]);
  });

  it("has no axe violations after the full decision flow", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    await user.click(screen.getByRole("button", { name: /Generate coverage scenario/ }));
    expect(await violationsFor(document.body)).toEqual([]);
  }, 30000);
});
