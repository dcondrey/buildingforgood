// Are the two surviving shipped mutations killable at all, or equivalent mutants?
// Brute-force the public API for ANY input where mutant output differs from original.
import { describe, expect, it } from "vitest";
import { allocateHours } from "../../app/src/lib/planner";
import type { PlanningArea } from "../../app/src/lib/demo";

const mk = (id: string, load: number): PlanningArea => ({
  id, name: id, latest: null, delta: 0, planningLoad: load, auditWape: null, reason: "",
});

// Mutant M2: `hours: unlockedHours.get(id) ?? locks.get(id) ?? 0` (order swapped).
// Reimplemented ONLY for the final mapping step; everything else calls the real fn.
function originalVsSwapped(areas: PlanningArea[], budget: number, floor: number, locks: Map<string, number>) {
  const real = allocateHours(areas, budget, floor, true, locks);
  if (!real.feasible) return null;
  // Reconstruct unlockedHours exactly as the real function does.
  const unlocked = areas.filter((a) => !locks.has(a.id));
  const lockedTotal = areas.reduce((s, a) => s + (locks.get(a.id) ?? 0), 0);
  const minimumRequired = lockedTotal + unlocked.length * floor;
  const remaining = budget - minimumRequired;
  const weightTotal = unlocked.reduce((s, a) => s + Math.max(0, a.planningLoad), 0);
  const shares = unlocked.map((a, i) => {
    const exact = weightTotal > 0 ? (remaining * Math.max(0, a.planningLoad)) / weightTotal
                                  : remaining / Math.max(1, unlocked.length);
    return { a, i, whole: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let rem = remaining - shares.reduce((s, x) => s + x.whole, 0);
  for (const s of [...shares].sort((x, y) => y.fraction - x.fraction || x.i - y.i)) {
    if (rem <= 0) break; s.whole += 1; rem -= 1;
  }
  const unlockedHours = new Map(shares.map((s) => [s.a.id, floor + s.whole] as const));
  const swapped = areas.map((a) => ({ areaId: a.id, hours: unlockedHours.get(a.id) ?? locks.get(a.id) ?? 0 }));
  return { real: real.allocations, swapped };
}

describe("mutation equivalence", () => {
  it("M2 (lock order swapped): searches for ANY distinguishing input", () => {
    const ids = ["a", "b", "c", "d"];
    let checked = 0, differing = 0;
    for (const n of [1, 2, 3, 4]) {
      const areas = ids.slice(0, n).map((id, i) => mk(id, [193, 34.7, 113.3, 591][i]));
      for (let mask = 0; mask < 1 << n; mask++) {
        for (const lockVal of [0, 5, 8, 20, 40]) {
          const locks = new Map<string, number>();
          areas.forEach((a, i) => { if (mask & (1 << i)) locks.set(a.id, lockVal); });
          // a phantom lock too
          for (const phantom of [false, true]) {
            const L = new Map(locks); if (phantom) L.set("ghost", 12);
            for (const budget of [0, 8, 40, 80, 120, 400]) {
              for (const floor of [0, 4, 8, 20]) {
                const r = originalVsSwapped(areas, budget, floor, L);
                if (!r) continue;
                checked++;
                if (JSON.stringify(r.real) !== JSON.stringify(r.swapped)) differing++;
              }
            }
          }
        }
      }
    }
    console.log(`M2: ${checked} feasible inputs compared, ${differing} produced different output`);
    expect(differing).toBe(0);
  });

  it("M1 (budget-conservation check): is the guarded branch ever reachable?", () => {
    // The check fires only if allocations do not sum to the budget. Search for it.
    let feasibleChecked = 0, mismatches = 0;
    for (let budget = 0; budget <= 300; budget++) {
      for (const floor of [0, 1, 4, 8, 20]) {
        for (const loads of [[193, 34.7, 113.3, 591, 61.7, 24], [0, 0, 0], [1e-9, 1, 2]]) {
          const areas = loads.map((l, i) => mk(`a${i}`, l));
          const r = allocateHours(areas, budget, floor, true);
          if (!r.feasible) continue;
          feasibleChecked++;
          const sum = r.allocations.reduce((s, a) => s + a.hours, 0);
          if (sum !== budget) mismatches++;
        }
      }
    }
    console.log(`M1: ${feasibleChecked} feasible plans, ${mismatches} failed budget conservation`);
    expect(mismatches).toBe(0);
  });
});
