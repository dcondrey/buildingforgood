import { describe, expect, it } from "vitest";
import { ScenarioParseError, parsePreparedScenario } from "./scenario";

const validFixture = {
  schema_version: "0.0.1",
  status: "placeholder",
  generated_at: null,
  note: "Placeholder pending the issue #2 scenario lock.",
  scenario: {
    name: "Downtown San Diego next-shift outreach (placeholder)",
    decision_owner: "TBD (#2)",
    planning_horizon: "TBD (#2)",
    observation_grain: "TBD (#2)",
    geography_version: "TBD (#2)",
    available_hours: null,
  },
};

describe("parsePreparedScenario", () => {
  it("accepts the placeholder fixture", () => {
    const parsed = parsePreparedScenario(validFixture);
    expect(parsed.status).toBe("placeholder");
    expect(parsed.scenario.name).toContain("Downtown San Diego");
    expect(parsed.scenario.available_hours).toBeNull();
  });

  it("rejects a fixture missing schema_version", () => {
    const { schema_version: _dropped, ...invalid } = validFixture;
    expect(() => parsePreparedScenario(invalid)).toThrow(ScenarioParseError);
    expect(() => parsePreparedScenario(invalid)).toThrow(/schema_version/);
  });

  it("rejects an unknown status", () => {
    expect(() => parsePreparedScenario({ ...validFixture, status: "final" })).toThrow(/status/);
  });

  it("rejects non-numeric available hours", () => {
    const invalid = {
      ...validFixture,
      scenario: { ...validFixture.scenario, available_hours: "40" },
    };
    expect(() => parsePreparedScenario(invalid)).toThrow(/available_hours/);
  });

  it("rejects non-object input", () => {
    expect(() => parsePreparedScenario("nope")).toThrow(ScenarioParseError);
  });
});
