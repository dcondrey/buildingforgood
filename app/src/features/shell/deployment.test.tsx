// @vitest-environment jsdom
/**
 * The profile actually runs the tool.
 *
 * Two properties, and only two. The reference deployment must reproduce what
 * shipped before profiles were wired in — asserted against the same numbers
 * `lib/planner.characterization.test.ts` pins, from the profile rather than
 * from a constant. And a second organization's profile must produce a working
 * plan on a different geography, with a different area count, budget and
 * floor, with no code change beyond the URL that names it.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App.tsx";
import { EMBEDDED_DEMO } from "../../lib/demo";
import { allocateHours } from "../../lib/planner";
import { applyDeployment, loadDeployment, resolveProfileId, scopeAreas } from "./deployment";

const SAN_DIEGO = loadDeployment("san-diego-downtown");
const RURAL = loadDeployment("coldwater-valley-rural");

describe("the reference deployment reproduces what shipped", () => {
  it("supplies the operating numbers that were module constants", () => {
    expect(SAN_DIEGO.defaultBudget).toBe(80);
    expect(SAN_DIEGO.coverageFloor).toBe(8);
    expect(SAN_DIEGO.floorOptions).toEqual([0, 4, 8]);
    expect(SAN_DIEGO.continuityReserve).toBe(4);
    expect(SAN_DIEGO.allocationIncrement).toBe(1);
    expect(SAN_DIEGO.teamCount).toBe(2);
    expect(SAN_DIEGO.loadedHourlyRate).toBe(45);
    expect(SAN_DIEGO.maxBudget).toBe(400);
    expect(SAN_DIEGO.areaCount).toBe(6);
    expect(SAN_DIEGO.areaCountWord).toBe("six");
  });

  it("leaves the loaded artifact untouched, object identity included", () => {
    expect(applyDeployment(EMBEDDED_DEMO, SAN_DIEGO)).toBe(EMBEDDED_DEMO);
    expect(scopeAreas(EMBEDDED_DEMO.areas, SAN_DIEGO)).toEqual(EMBEDDED_DEMO.areas);
  });

  it("allocates exactly the hours the characterization test pins", () => {
    const plan = allocateHours(
      applyDeployment(EMBEDDED_DEMO, SAN_DIEGO).areas,
      SAN_DIEGO.defaultBudget,
      SAN_DIEGO.coverageFloor,
      true,
    );
    expect(plan.feasible).toBe(true);
    expect(plan.message).toBe("Every one of the 6 neighborhoods keeps at least 8 hours.");
    expect(Object.fromEntries(plan.allocations.map((row) => [row.areaId, row.hours]))).toEqual({
      city_center: 14,
      columbia: 9,
      cortez: 11,
      east_village: 27,
      gaslamp: 10,
      marina: 9,
    });
  });
});

describe("a second organization's profile runs the tool", () => {
  it("carries a different geography and different operating numbers", () => {
    expect(RURAL.areaCount).toBe(8);
    expect(RURAL.areaCountWord).toBe("eight");
    expect(RURAL.areaNounPlural).toBe("service areas");
    expect(RURAL.defaultBudget).toBe(132);
    expect(RURAL.coverageFloor).toBe(10);
    expect(RURAL.floorOptions).toEqual([0, 5, 10]);
    expect(RURAL.allocationIncrement).toBe(2);
    expect(RURAL.maxBudget).toBe(240);
    expect(RURAL.loadedHourlyRate).toBe(39.75);
    // The out-of-scope federal area is listed in the profile and planned
    // against nowhere.
    expect(RURAL.areaIds).not.toContain("federal_forest_margin");
  });

  it("produces a feasible plan that conserves its own budget", () => {
    const scoped = applyDeployment(EMBEDDED_DEMO, RURAL);
    const plan = allocateHours(scoped.areas, RURAL.defaultBudget, RURAL.coverageFloor, true);
    expect(plan.feasible).toBe(true);
    expect(plan.allocations).toHaveLength(8);
    expect(plan.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(132);
    expect(plan.allocations.every((row) => row.hours >= RURAL.coverageFloor)).toBe(true);
  });

  it("invents no observation for an area the artifact does not carry", () => {
    const scoped = applyDeployment(EMBEDDED_DEMO, RURAL);
    for (const area of scoped.areas) {
      expect(area.latest).toBeNull();
      expect(area.planningLoad).toBe(0);
      expect(area.loadDerivation).toBe("coverage_floor_only");
    }
  });

  it("is selected by the URL, and an unknown id falls back rather than blanking", () => {
    expect(resolveProfileId("?profile=coldwater-valley-rural")).toBe("coldwater-valley-rural");
    expect(resolveProfileId("?profile=not-a-profile")).toBe("san-diego-downtown");
    expect(resolveProfileId("")).toBe("san-diego-downtown");
  });
});

describe("the rendered shell on the second profile", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network disabled"))),
    );
    Element.prototype.scrollIntoView = () => undefined;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    window.history.replaceState({}, "", "/?profile=coldwater-valley-rural");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("opens on the rural geography with its own budget and floor", async () => {
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    expect(await screen.findByText(/132\/132 hours allocated\./)).toBeDefined();
    expect(screen.getByRole("heading", { name: "Plan 132 staff-hours" })).toBeDefined();
    expect(screen.getByText(/ON · 10h per area/)).toBeDefined();
    expect(screen.getByText(/Split the hours across the eight service areas/)).toBeDefined();
    expect(
      screen.getByText(/Every one of the 8 service areas keeps at least 10 hours\./),
    ).toBeDefined();
    expect(screen.getByLabelText("Hours for Pine Hollow")).toBeDefined();
    expect(screen.queryByLabelText("Hours for East Village")).toBeNull();
  });

  it("states that the artifact carries no observation for these areas", async () => {
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    await screen.findByText(/132\/132 hours allocated\./);
    expect(screen.getByText(/How these service areas are defined/)).toBeDefined();
    expect(
      screen.getByText(/The loaded artifact carries no observation for Coldwater City Core/),
    ).toBeDefined();
  });
});
