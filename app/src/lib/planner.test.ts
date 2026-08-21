import { describe, expect, it } from "vitest";
import { EMBEDDED_DEMO } from "./demo";
import { allocateHours } from "./planner";

describe("allocateHours", () => {
  it("preserves the budget and the coverage floor", () => {
    const result = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    expect(result.feasible).toBe(true);
    expect(result.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(80);
    expect(result.allocations.every((row) => row.hours >= 8)).toBe(true);
  });

  it("preserves a human lock and recomputes unlocked hours", () => {
    const result = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true, new Map([["east_village", 26]]));
    expect(result.feasible).toBe(true);
    expect(result.allocations.find((row) => row.areaId === "east_village")?.hours).toBe(26);
    expect(result.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(80);
  });

  it("returns an explicit infeasible result", () => {
    const result = allocateHours(EMBEDDED_DEMO.areas, 40, 8, true);
    expect(result.feasible).toBe(false);
    expect(result.allocations).toEqual([]);
    expect(result.message).toMatch(/require 48 hours/);
  });

  it("makes the no-guard audit materially visible", () => {
    const result = allocateHours(EMBEDDED_DEMO.areas, 80, 8, false);
    expect(result.feasible).toBe(true);
    expect(result.allocations.some((row) => row.hours < 8)).toBe(true);
  });

  it("supports the user-set four-hour continuity sensitivity", () => {
    const result = allocateHours(EMBEDDED_DEMO.areas, 80, 4, true);
    expect(result.feasible).toBe(true);
    expect(result.allocations.reduce((sum, row) => sum + row.hours, 0)).toBe(80);
    expect(result.allocations.every((row) => row.hours >= 4)).toBe(true);
    expect(result.allocations.map((row) => row.hours)).not.toEqual(
      allocateHours(EMBEDDED_DEMO.areas, 80, 8, true).allocations.map((row) => row.hours),
    );
  });
});
