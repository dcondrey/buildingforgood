/**
 * Section 3 of the decision flow: plan the next shift (issue #15).
 *
 * Renders the deterministic allocation from `domain/planner` and keeps the
 * coordinator in control of it. Three rules from the C-01 red-team review
 * shape this component more than the storyboard does:
 *
 * - **R-07/R-10.** A full budget is not full coverage, and a coverage floor
 *   is not fairness. Unmet load is always visible, and when the floor is
 *   deciding most of the plan the panel says so, because a floor-driven plan
 *   and a forecast-driven plan look identical otherwise.
 * - **R-08.** Human changes are preserved *and disclosed*. The header states
 *   how many assignments a person set.
 * - **R-02.** No priority rank column, and no ordering by estimated people.
 *   Rows are ordered by area, so the table cannot be read as a target list.
 *
 * Meaning is never carried by color alone: every state has a text label and
 * a symbol. Every control is reachable and operable from the keyboard.
 */

import { useCallback, useMemo, useState } from "react";

import { buildPlan } from "../../domain/planner/planner.ts";
import type {
  AreaAllocation,
  AreaLock,
  AreaPlanningInput,
  PlannerPolicy,
} from "../../domain/planner/types.ts";

export interface PlannerPanelProps {
  areas: AreaPlanningInput[];
  policy: PlannerPolicy;
  /** Discretionary share below which the floor, not the forecast, decides. */
  floorDominanceThreshold?: number;
}

function formatHours(hours: number): string {
  return `${hours} h`;
}

export function PlannerPanel({ areas, policy, floorDominanceThreshold = 0.25 }: PlannerPanelProps) {
  const [budget, setBudget] = useState(policy.budget_hours);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [locks, setLocks] = useState<AreaLock[]>([]);
  const [showUnguarded, setShowUnguarded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const effectivePolicy = useMemo<PlannerPolicy>(
    () => ({ ...policy, budget_hours: budget }),
    [policy, budget],
  );

  const plan = useMemo(() => {
    try {
      return buildPlan(areas, effectivePolicy, locks);
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) } as const;
    }
  }, [areas, effectivePolicy, locks]);

  const toggleLock = useCallback(
    (allocation: AreaAllocation) => {
      setLocks((current) => {
        const existing = current.find((l) => l.area_id === allocation.area_id);
        if (existing) return current.filter((l) => l.area_id !== allocation.area_id);
        return [...current, { area_id: allocation.area_id, hours: allocation.allocated_hours }];
      });
    },
    [setLocks],
  );

  const setLockHours = useCallback((areaId: string, hours: number) => {
    setLocks((current) => current.map((l) => (l.area_id === areaId ? { ...l, hours } : l)));
  }, []);

  const reset = useCallback(() => {
    setLocks([]);
    setBudget(policy.budget_hours);
    setShowUnguarded(false);
  }, [policy.budget_hours]);

  if ("error" in plan) {
    return (
      <section aria-labelledby="planner-heading">
        <h2 id="planner-heading">3. Plan the next shift</h2>
        <p role="alert">
          <strong>✕ This plan cannot be produced.</strong> {plan.error}
        </p>
      </section>
    );
  }

  // An infeasible plan still lists every area at zero hours (asserted in
  // domain/planner/planner.test.ts), but defaulting here keeps the panel
  // rendering rather than blanking if that contract ever changes.
  const included = (plan.allocations ?? []).filter((a) => a.included);
  const guaranteed = included.reduce(
    (sum, a) => sum + a.floor_hours + a.continuity_reserve_hours,
    0,
  );
  const discretionaryShare = budget > 0 ? Math.max(0, budget - guaranteed) / budget : 0;
  const floorDominant = plan.status === "planned" && discretionaryShare < floorDominanceThreshold;

  return (
    <section aria-labelledby="planner-heading">
      <h2 id="planner-heading">3. Plan {formatHours(budget)}</h2>

      <div>
        <label htmlFor="planner-budget">Available staff-hours</label>
        <input
          id="planner-budget"
          type="number"
          min={0}
          step={policy.time_increment_hours}
          value={budget}
          aria-invalid={budgetError !== null}
          aria-describedby={budgetError ? "planner-budget-error" : undefined}
          onChange={(e) => {
            // A blank or non-numeric field yields NaN, which would otherwise
            // flow into the plan and the discretionary-share division and
            // produce NaN hours on screen. A coordinator allocating real
            // staff time gets told the input is invalid instead.
            const next = Number(e.target.value);
            if (e.target.value.trim() === "" || !Number.isFinite(next)) {
              setBudgetError("Enter the number of staff-hours available.");
              return;
            }
            if (next < 0) {
              setBudgetError("Available hours cannot be negative.");
              return;
            }
            setBudgetError(null);
            setBudget(next);
          }}
        />
        {budgetError && (
          <p id="planner-budget-error" role="alert">
            <strong>✕ {budgetError}</strong> The plan below still reflects {formatHours(budget)}.
          </p>
        )}
        <p>
          Coverage guard: ON · Minimum {formatHours(policy.minimum_coverage_floor_hours)} per
          included area · {included.length} areas included
        </p>
      </div>

      {plan.status === "infeasible" ? (
        <div role="alert">
          <p>
            <strong>✕ No plan was produced.</strong> The coverage floor was not lowered to fit the
            budget.
          </p>
          <ul>
            {plan.infeasible_reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          {floorDominant && (
            <p role="status">
              <strong>⚠ The coverage floor is deciding most of this plan, not the forecast.</strong>{" "}
              Only {formatHours(budget - guaranteed)} of {formatHours(budget)} is distributed by
              relative load. Read the split as coverage, not as a ranking of need.
            </p>
          )}

          <table>
            <caption>
              Suggested hours per area. Ordered by area name, not by estimated need: this table is a
              coverage plan and is not an enforcement or priority list.
            </caption>
            <thead>
              <tr>
                <th scope="col">Area</th>
                <th scope="col">Suggested</th>
                <th scope="col">Set by coordinator</th>
                {showUnguarded && <th scope="col">Without the guard (audit view)</th>}
                <th scope="col">Why this amount?</th>
              </tr>
            </thead>
            <tbody>
              {included.map((allocation) => {
                const lock = locks.find((l) => l.area_id === allocation.area_id);
                const isOpen = expanded === allocation.area_id;
                return (
                  <tr key={allocation.area_id}>
                    <th scope="row">{allocation.label}</th>
                    <td>
                      {formatHours(allocation.allocated_hours)}
                      {allocation.unmet_hours > 0 && (
                        <span>
                          {" "}
                          ({formatHours(allocation.unmet_hours)} moved away by the floor)
                        </span>
                      )}
                    </td>
                    <td>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(lock)}
                          onChange={() => toggleLock(allocation)}
                        />
                        <span>
                          {lock ? "Locked" : "Lock"} {allocation.label}
                        </span>
                      </label>
                      {lock && (
                        <label>
                          <span>Hours for {allocation.label}</span>
                          <input
                            type="number"
                            min={0}
                            step={policy.time_increment_hours}
                            value={lock.hours}
                            onChange={(e) =>
                              setLockHours(allocation.area_id, Number(e.target.value))
                            }
                          />
                        </label>
                      )}
                    </td>
                    {showUnguarded && <td>{formatHours(allocation.unguarded_hours)}</td>}
                    <td>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : allocation.area_id)}
                      >
                        Why this amount?
                      </button>
                      {isOpen && (
                        <ul>
                          {allocation.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p>
            Allocated {formatHours(plan.total_allocated_hours)} of {formatHours(budget)} ·{" "}
            <strong>Unmet planning load {formatHours(plan.unmet_hours_total)}</strong>
            {plan.rounding_residue_hours > 0 &&
              ` · ${formatHours(plan.rounding_residue_hours)} unallocated by rounding`}
          </p>
          {plan.locked_area_count > 0 && (
            <p>
              ✎ {plan.locked_area_count} of {included.length} assignments were set by the
              coordinator and preserved through recomputation.
            </p>
          )}
          <ul>
            {plan.constraint_notes
              // The coordinator-set count is already stated above as its own
              // disclosure line; repeating it here printed the same sentence
              // twice on screen.
              .filter((note) => !/assignments were set by the coordinator/i.test(note))
              .map((note) => (
                <li key={note}>{note}</li>
              ))}
          </ul>
        </>
      )}

      <div>
        <button type="button" onClick={() => setShowUnguarded((v) => !v)}>
          {showUnguarded ? "Hide" : "Compare"} without the coverage guard
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      {showUnguarded && (
        <p>
          The unguarded column is an audit view showing what a purely proportional split would give.
          It is shown for comparison only.
        </p>
      )}
    </section>
  );
}
