import type { PlanningArea } from "./demo";

/**
 * Assumption explorer for area-level actions such as encampment clearances
 * ("sweeps"). The underlying counts cannot show who moves where or why (the
 * April 2026 City Auditor performance audit states the available data cannot
 * determine geographic movement), so nothing here predicts displacement.
 * Instead the facilitator states an assumption — what share of the cleared
 * area's planning load shifts to adjacent areas rather than being resolved —
 * and the tool works out that assumption's consequences for load and staffing.
 *
 * Area-level adjacency only; consistent with the dissolved neighborhood
 * outlines the app draws. No block geometry is encoded here.
 */
export const AREA_ADJACENCY: Record<string, readonly string[]> = {
  city_center: ["columbia", "cortez", "east_village", "gaslamp", "marina"],
  columbia: ["city_center", "cortez", "marina"],
  cortez: ["city_center", "columbia"],
  east_village: ["city_center", "gaslamp"],
  gaslamp: ["city_center", "east_village", "marina"],
  marina: ["city_center", "columbia", "gaslamp"],
};

export interface InterventionScenario {
  targetAreaId: string;
  /** 0..1 — assumed share of the target's load that shifts to adjacent areas. */
  displacedShare: number;
}

export interface InterventionResult {
  /** Adjusted copy of the areas for the planner; inputs are never mutated. */
  areas: PlanningArea[];
  /** Load moved onto adjacent areas under the assumption. */
  shifted: number;
  /** Load removed from the model purely by assumption, not observation. */
  assumedResolved: number;
  /** Per-area change in planning load (target negative, neighbors positive). */
  loadDelta: Map<string, number>;
}

export function applyIntervention(
  areas: PlanningArea[],
  scenario: InterventionScenario,
): InterventionResult | null {
  const target = areas.find((area) => area.id === scenario.targetAreaId);
  if (!target || !(target.planningLoad > 0)) return null;
  const share = Math.min(1, Math.max(0, scenario.displacedShare));
  const neighborIds = (AREA_ADJACENCY[target.id] ?? []).filter((id) =>
    areas.some((area) => area.id === id),
  );
  if (neighborIds.length === 0) return null;

  const shifted = target.planningLoad * share;
  const assumedResolved = target.planningLoad - shifted;
  const weightTotal = neighborIds.reduce(
    (sum, id) => sum + Math.max(0, areas.find((area) => area.id === id)?.planningLoad ?? 0),
    0,
  );

  const loadDelta = new Map<string, number>([[target.id, -target.planningLoad]]);
  for (const id of neighborIds) {
    const load = Math.max(0, areas.find((area) => area.id === id)?.planningLoad ?? 0);
    const weight = weightTotal > 0 ? load / weightTotal : 1 / neighborIds.length;
    loadDelta.set(id, shifted * weight);
  }

  return {
    areas: areas.map((area) =>
      loadDelta.has(area.id)
        ? { ...area, planningLoad: Math.max(0, area.planningLoad + (loadDelta.get(area.id) ?? 0)) }
        : area,
    ),
    shifted,
    assumedResolved,
    loadDelta,
  };
}
