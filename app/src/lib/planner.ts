import type { PlanningArea } from "./demo";

export interface Allocation {
  areaId: string;
  hours: number;
}

export interface PlanResult {
  allocations: Allocation[];
  feasible: boolean;
  message: string;
}

export function allocateHours(
  areas: PlanningArea[],
  budget: number,
  floor: number,
  guardEnabled: boolean,
  locks: ReadonlyMap<string, number> = new Map(),
): PlanResult {
  const normalizedBudget = Math.max(0, Math.round(budget));
  const effectiveFloor = guardEnabled ? Math.max(0, Math.round(floor)) : 0;
  const unlocked = areas.filter((area) => !locks.has(area.id));
  const lockedTotal = areas.reduce((sum, area) => sum + (locks.get(area.id) ?? 0), 0);

  for (const [areaId, value] of locks) {
    if (!areas.some((area) => area.id === areaId)) continue;
    if (!Number.isFinite(value) || value < effectiveFloor || Math.round(value) !== value) {
      return {
        allocations: [],
        feasible: false,
        message: guardEnabled
          ? `Locked hours must be whole numbers at or above the ${effectiveFloor}-hour floor.`
          : "Locked hours must be nonnegative whole numbers.",
      };
    }
  }

  const minimumRequired = lockedTotal + unlocked.length * effectiveFloor;
  if (minimumRequired > normalizedBudget) {
    return {
      allocations: [],
      feasible: false,
      message: `No feasible plan: locks and coverage floors require ${minimumRequired} hours, but the budget is ${normalizedBudget}.`,
    };
  }

  const remaining = normalizedBudget - minimumRequired;
  const weightTotal = unlocked.reduce((sum, area) => sum + Math.max(0, area.planningLoad), 0);
  const shares = unlocked.map((area, index) => {
    const exact =
      weightTotal > 0
        ? (remaining * Math.max(0, area.planningLoad)) / weightTotal
        : remaining / Math.max(1, unlocked.length);
    return { area, index, whole: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = remaining - shares.reduce((sum, share) => sum + share.whole, 0);
  for (const share of [...shares].sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
    if (remainder <= 0) break;
    share.whole += 1;
    remainder -= 1;
  }

  const unlockedHours = new Map(
    shares.map((share) => [share.area.id, effectiveFloor + share.whole] as const),
  );
  return {
    allocations: areas.map((area) => ({
      areaId: area.id,
      hours: locks.get(area.id) ?? unlockedHours.get(area.id) ?? 0,
    })),
    feasible: true,
    message: guardEnabled
      ? `All ${areas.length} areas retain at least ${effectiveFloor} hours.`
      : "Audit view: hours follow planning load without a minimum coverage floor.",
  };
}
