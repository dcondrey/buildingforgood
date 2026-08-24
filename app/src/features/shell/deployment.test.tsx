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
const SEVEN_AREA = loadDeployment("san-diego-dsdp-seven");

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
    expect(SEVEN_AREA.areaCount).toBe(7);
    expect(SEVEN_AREA.areaCountWord).toBe("seven");
    expect(SEVEN_AREA.areaNounPlural).toBe("neighborhoods");
    expect(SEVEN_AREA.defaultBudget).toBe(96);
    expect(SEVEN_AREA.coverageFloor).toBe(6);
    expect(SEVEN_AREA.floorOptions).toEqual([0, 3, 6]);
    expect(SEVEN_AREA.allocationIncrement).toBe(2);
    expect(SEVEN_AREA.maxBudget).toBe(400);
    expect(SEVEN_AREA.loadedHourlyRate).toBe(52);
    // The out-of-scope federal area is listed in the profile and planned
    // against nowhere.
    expect(SEVEN_AREA.areaIds).not.toContain("east_village_north_east");
  });

  it("produces a feasible plan that conserves its own budget", () => {
    const scoped = applyDeployment(EMBEDDED_DEMO, SEVEN_AREA);
    const plan = allocateHours(
      scoped.areas,
      SEVEN_AREA.defaultBudget,
      SEVEN_AREA.coverageFloor,
      true,
    );
    expect(plan.feasible).toBe(true);
    expect(plan.allocations).toHaveLength(7);
    expect(plan.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(96);
    expect(plan.allocations.every((row) => row.hours >= SEVEN_AREA.coverageFloor)).toBe(true);
  });

  it("invents no observation for an area the artifact does not carry", () => {
    // Six of these seven areas ARE in the shipped artifact, so this profile is
    // a sharper test than one sharing no ids: the six carry real observations
    // and only Outside Perimeter, which the six-area artifact has no row for,
    // must come back empty rather than estimated.
    const scoped = applyDeployment(EMBEDDED_DEMO, SEVEN_AREA);
    const carried = scoped.areas.filter((area) => area.latest !== null);
    expect(carried.map((area) => area.id).sort()).toEqual([
      "city_center",
      "columbia",
      "cortez",
      "east_village",
      "gaslamp",
      "marina",
    ]);
    const missing = scoped.areas.filter((area) => area.latest === null);
    expect(missing.map((area) => area.id)).toEqual(["outside_perimeter"]);
    for (const area of missing) {
      expect(area.planningLoad).toBe(0);
      expect(area.loadDerivation).toBe("coverage_floor_only");
    }
  });

  it("is selected by the URL, and an unknown id falls back rather than blanking", () => {
    expect(resolveProfileId("?profile=san-diego-dsdp-seven")).toBe("san-diego-dsdp-seven");
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
    window.history.replaceState({}, "", "/?profile=san-diego-dsdp-seven");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("opens on the sevenArea geography with its own budget and floor", async () => {
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    expect(await screen.findByText(/96\/96 hours allocated\./)).toBeDefined();
    expect(screen.getByRole("heading", { name: "Plan 96 staff-hours" })).toBeDefined();
    expect(screen.getByText(/ON · 6h per area/)).toBeDefined();
    expect(screen.getByText(/Split the hours across the seven neighborhoods/)).toBeDefined();
    expect(
      screen.getByText(/Every one of the 7 neighborhoods keeps at least 6 hours\./),
    ).toBeDefined();
    expect(screen.getByLabelText("Hours for Outside Perimeter")).toBeDefined();
    expect(screen.getByLabelText("Hours for East Village")).toBeDefined();
  });

  it("states that the artifact carries no observation for these areas", async () => {
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    await screen.findByText(/96\/96 hours allocated\./);
    expect(screen.getByText(/How these neighborhoods are defined/)).toBeDefined();
    expect(
      screen.getByText(/The loaded artifact carries no observation for Outside Perimeter/),
    ).toBeDefined();
  });
});
