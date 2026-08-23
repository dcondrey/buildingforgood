// Scenario workbench: a saved scenario is only the policy settings — budget,
// floor, guard, locks. Allocations are recomputed deterministically from the
// frozen artifact on load, so nothing derived (and nothing sensitive) is
// stored, and storage stays in this browser.
export type SavedScenario = {
  id: string;
  name: string;
  budget: number;
  floor: number;
  guard: boolean;
  locks: Array<[string, number]>;
};

export const SCENARIO_STORE_KEY = "stillhere-scenarios-v1";
export const MAX_SAVED_SCENARIOS = 8;

export function readSavedScenarios(): SavedScenario[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCENARIO_STORE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SavedScenario =>
        Boolean(entry) &&
        typeof (entry as SavedScenario).id === "string" &&
        typeof (entry as SavedScenario).name === "string" &&
        typeof (entry as SavedScenario).budget === "number" &&
        typeof (entry as SavedScenario).floor === "number" &&
        typeof (entry as SavedScenario).guard === "boolean" &&
        Array.isArray((entry as SavedScenario).locks),
    );
  } catch {
    return [];
  }
}

export function writeSavedScenarios(list: SavedScenario[]): void {
  try {
    localStorage.setItem(SCENARIO_STORE_KEY, JSON.stringify(list));
  } catch {
    // Without storage the workbench still works for the session.
  }
}
