// Do BOTH name-based guards skip Map/Set containers?
import { describe, expect, it } from "vitest";
import { assertNoComplaintSignal } from "../../app/src/domain/planner/planner";
import { assertNoPersonDenominator } from "../../app/src/domain/cost/cost";

const probe = (fn: (v: unknown, w: string) => void, v: unknown) => {
  try { fn(v, "x"); return "ACCEPTED — guard did not fire"; } catch { return "REFUSED"; }
};

describe("ATTACK F: container shapes the guards do not walk", () => {
  it("reports what each guard does with each container", () => {
    const cases: Array<[string, unknown]> = [
      ["plain object", { complaint_count: 9, cost_per_person: 9 }],
      ["array", [{ complaint_count: 9, cost_per_person: 9 }]],
      ["Map", new Map<string, unknown>([["complaint_count", 9], ["cost_per_person", 9]])],
      ["Set", new Set([{ complaint_count: 9, cost_per_person: 9 }])],
      ["object with Map inside", { diagnostics: new Map([["complaint_count", 9]]) }],
    ];
    for (const [label, value] of cases) {
      console.log(
        `F ${label.padEnd(24)} complaint=${probe(assertNoComplaintSignal, value).padEnd(28)} person=${probe(assertNoPersonDenominator, value)}`,
      );
    }
    expect(probe(assertNoComplaintSignal, new Map([["complaint_count", 9]]))).toMatch(/ACCEPTED/);
  });
});
