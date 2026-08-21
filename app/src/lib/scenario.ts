/**
 * Prepared-scenario artifact contract (v0, placeholder era).
 *
 * The real decision contract is locked in issue #2 and versioned schemas
 * arrive with issue #4. Until then this module defines the minimal shape the
 * app shell renders, and rejects anything that does not match it, so invalid
 * fixtures fail in TypeScript exactly as they do in Python.
 */

export type ScenarioStatus = "placeholder" | "locked";

export interface PreparedScenario {
  schema_version: string;
  status: ScenarioStatus;
  generated_at: string | null;
  note: string;
  scenario: {
    name: string;
    decision_owner: string;
    planning_horizon: string;
    observation_grain: string;
    geography_version: string;
    available_hours: number | null;
  };
}

export class ScenarioParseError extends Error {
  constructor(field: string, detail: string) {
    super(`prepared scenario invalid at "${field}": ${detail}`);
    this.name = "ScenarioParseError";
  }
}

function requireString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new ScenarioParseError(field, "expected a non-empty string");
  }
  return value;
}

export function parsePreparedScenario(input: unknown): PreparedScenario {
  if (typeof input !== "object" || input === null) {
    throw new ScenarioParseError("$", "expected an object");
  }
  const root = input as Record<string, unknown>;

  const schema_version = requireString(root, "schema_version");
  const status = requireString(root, "status");
  if (status !== "placeholder" && status !== "locked") {
    throw new ScenarioParseError("status", `unknown status "${status}"`);
  }

  const generated_at = root["generated_at"];
  if (generated_at !== null && typeof generated_at !== "string") {
    throw new ScenarioParseError("generated_at", "expected a string or null");
  }

  const note = typeof root["note"] === "string" ? (root["note"] as string) : "";

  if (typeof root["scenario"] !== "object" || root["scenario"] === null) {
    throw new ScenarioParseError("scenario", "expected an object");
  }
  const s = root["scenario"] as Record<string, unknown>;

  const available_hours = s["available_hours"];
  if (available_hours !== null && typeof available_hours !== "number") {
    throw new ScenarioParseError("scenario.available_hours", "expected a number or null");
  }

  return {
    schema_version,
    status,
    generated_at: generated_at as string | null,
    note,
    scenario: {
      name: requireString(s, "name"),
      decision_owner: requireString(s, "decision_owner"),
      planning_horizon: requireString(s, "planning_horizon"),
      observation_grain: requireString(s, "observation_grain"),
      geography_version: requireString(s, "geography_version"),
      available_hours: available_hours as number | null,
    },
  };
}
