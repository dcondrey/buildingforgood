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
import {
  AVAILABLE_PROFILE_IDS,
  applyDeployment,
  loadDeployment,
  resolveProfileId,
  scopeAreas,
} from "./deployment";

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

  it("leaves the loaded artifact's rows untouched, object identity included", () => {
    const scoped = applyDeployment(EMBEDDED_DEMO, SAN_DIEGO);
    expect(scoped.areas).toBe(EMBEDDED_DEMO.areas);
    expect(scopeAreas(EMBEDDED_DEMO.areas, SAN_DIEGO)).toEqual(EMBEDDED_DEMO.areas);
    // The scenario's geography is the one thing the deployment always writes,
    // so it is the one thing that differs. Nothing else may.
    expect({ ...scoped, scenario: EMBEDDED_DEMO.scenario }).toEqual(EMBEDDED_DEMO);
    expect({ ...scoped.scenario, focusArea: EMBEDDED_DEMO.scenario.focusArea }).toEqual(
      EMBEDDED_DEMO.scenario,
    );
  });

  it("still says which downtown geography it is, and how many areas", () => {
    // Specific, not vague: the six-area case names its place and its count,
    // both read from the profile. The noun is the profile's own word for its
    // places, which is why this reads "areas" and the seven-area profile,
    // whose prose says neighborhood, reads "neighborhoods".
    expect(applyDeployment(EMBEDDED_DEMO, SAN_DIEGO).scenario.focusArea).toBe(
      "Downtown San Diego (six areas)",
    );
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

/**
 * A scenario label may not assert a geography of its own.
 *
 * The header read "Prepared decision · Six-area downtown core" under the
 * seven-area profile, because the geography was a literal in the artifact
 * layer and nothing tied it to the profile that was loaded. These two tests
 * are the enforcement, and they bite on the class rather than on those two
 * strings: the first fails on any area count that is not the loaded
 * profile's, and the second fails if anything an artifact says about
 * geography reaches the header at all. Rewriting the old literals by hand
 * would have passed neither.
 */
describe("a scenario label states the loaded profile's geography and nothing else", () => {
  const COUNT_TOKEN =
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\b/gi;

  it("names its own profile's area count, and no other count", () => {
    for (const id of AVAILABLE_PROFILE_IDS) {
      const deployment = loadDeployment(id);
      const label = applyDeployment(EMBEDDED_DEMO, deployment).scenario.focusArea;
      const counts = [...label.matchAll(COUNT_TOKEN)].map((match) => match[1].toLowerCase());
      expect(counts).toContain(deployment.areaCountWord);
      for (const count of counts) {
        expect([deployment.areaCountWord, String(deployment.areaCount)]).toContain(count);
      }
    }
  });

  it("takes no geography from the artifact, whatever the artifact states", () => {
    const claiming = {
      ...EMBEDDED_DEMO,
      scenario: {
        ...EMBEDDED_DEMO.scenario,
        focusArea: "a geography stated by the artifact and not by any profile",
      },
    };
    for (const id of AVAILABLE_PROFILE_IDS) {
      const deployment = loadDeployment(id);
      const label = applyDeployment(claiming, deployment).scenario.focusArea;
      expect(label).toBe(deployment.geographyLabel);
      expect(label).not.toContain("stated by the artifact");
    }
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

  it("opens on the seven-area geography with its own budget and floor", async () => {
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

  it("names the loaded geography in the prepared-decision header", async () => {
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    await screen.findByText(/96\/96 hours allocated\./);
    const kicker = screen.getByText(/^Prepared decision ·/);
    expect(kicker.textContent).toBe(
      `Prepared decision · ${SEVEN_AREA.geographyLabel} · Jan 2024 → Jan 2025`,
    );
    expect(kicker.textContent).toMatch(/seven neighborhoods/);
    expect(kicker.textContent).not.toMatch(/\bsix\b/i);
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
