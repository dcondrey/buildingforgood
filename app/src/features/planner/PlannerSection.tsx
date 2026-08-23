import {
  InterventionControl,
  PlanRows,
  PlannerControls,
  PlannerStart,
  ScenarioBench,
} from "../../features/planner/PlannerPieces";
import { GeographyProvenance } from "../../features/shell/GeographyProvenance";
import { useShell } from "../../features/shell/ShellContext";
import { AreaDetailPanel } from "../../features/spatial/AreaDetailPanel";
import { AreaMap } from "../../features/spatial/AreaMap";
import { MapValueTable } from "../../features/spatial/MapValueTable";
import { formatCurrency, formatRate } from "../../domain/cost/index.ts";
import { formatNumber } from "../../lib/format";

export function PlannerSection() {
  const {
    allocationById,
    budget,
    budgetValid,
    coverageFloor,
    data,
    deployment,
    guardEnabled,
    intervention,
    interventionResult,
    lockedIds,
    maxHours,
    plan,
    planCost,
    planDirty,
    planTotal,
    planningAreas,
    runPlan,
    selectedArea,
    selectedAreaId,
    toggleAreaSelection,
    unmetTotal,
  } = useShell();
  return (
    <section className="decision-section" id="planner" aria-labelledby="planner-title">
      <div aria-hidden="true" className="section-number">
        03
      </div>
      <div className="section-intro split-intro planner-intro">
        <div>
          <p className="eyebrow">The staffing plan</p>
          <h2 id="planner-title">Plan {budget} staff-hours</h2>
          <p>
            Split the hours across the {deployment.areaCountWord} {deployment.areaNounPlural}.
            First, every area gets a minimum you choose, so no place goes unvisited. Whatever
            remains goes where the forecast expects the most people.
          </p>
        </div>
        <div className={`guard-status ${guardEnabled ? "guard-on" : "guard-off"}`}>
          <span>{guardEnabled ? "✓" : "!"}</span>
          <div>
            <small>Guaranteed minimum</small>
            <strong>
              {guardEnabled ? `ON · ${coverageFloor}h per area` : "OFF · COMPARISON ONLY"}
            </strong>
          </div>
        </div>
      </div>

      <PlannerControls />

      <ScenarioBench />

      {!plan ? (
        <PlannerStart />
      ) : !plan.feasible ? (
        <div className="infeasible" role="alert">
          <span>!</span>
          <div>
            <h3>No feasible plan</h3>
            <p>{plan.message}</p>
            <p>Increase the budget, remove a lock, or explicitly revise the floor.</p>
          </div>
        </div>
      ) : (
        <div aria-live="polite" className="plan-result reveal">
          <PlanRows />

          <div className="plan-map">
            <div className="plan-map-heading">
              <span className="eyebrow">The plan on the map</span>
              <p>
                Every {deployment.areaNoun} keeps its guaranteed minimum; the extra hours go where
                the forecast expects the most people.
              </p>
            </div>
            <div className="map-detail-row">
              <div>
                <AreaMap
                  areas={planningAreas}
                  ariaLabel={`Map of the ${deployment.areaCountWord} ${deployment.areaNounPlural} showing planned staff-hours; select one for detail`}
                  onSelect={toggleAreaSelection}
                  selectedId={selectedAreaId}
                  valueFor={(area) => {
                    const hours = allocationById.get(area.id) ?? 0;
                    const belowFloor = guardEnabled && hours < coverageFloor;
                    return {
                      text: `${hours}h${belowFloor ? " !" : ""}`,
                      tone: belowFloor ? "down" : "neutral",
                      intensity: hours / maxHours,
                    };
                  }}
                />
                <p className="map-caption">
                  Planned staff-hours by neighborhood · simplified neighborhood boundaries
                  {guardEnabled ? " · ! marks hours below the minimum" : ""}
                  {intervention
                    ? ` · ${data.areas.find((area) => area.id === intervention.areaId)?.name ?? ""} modeled as cleared (assumption)`
                    : ""}
                </p>
              </div>
              <AreaDetailPanel
                area={selectedArea}
                empty="Select a neighborhood on the map — click, or Tab and press Enter — to inspect its share of the plan, or to stress-test an action there."
                kicker="Allocation detail"
                note={selectedArea?.reason}
                rows={
                  selectedArea
                    ? [
                        {
                          label: "Planned hours",
                          value: `${allocationById.get(selectedArea.id) ?? 0}h`,
                          hint: lockedIds.has(selectedArea.id)
                            ? "human lock — edit in the list above"
                            : "recompute updates this",
                        },
                        {
                          label: "Coverage floor",
                          value: guardEnabled ? `${coverageFloor}h minimum` : "off — audit only",
                          hint: guardEnabled ? "user-set continuity floor" : "no minimum enforced",
                        },
                        {
                          label: "Planning load",
                          value: formatNumber(
                            planningAreas.find((area) => area.id === selectedArea.id)
                              ?.planningLoad ?? selectedArea.planningLoad,
                            1,
                          ),
                          hint:
                            intervention && interventionResult
                              ? "adjusted by the active assumption"
                              : "weights the remaining hours",
                        },
                        {
                          label: "Held-out WAPE",
                          value:
                            selectedArea.auditWape === null
                              ? "not audited"
                              : `${formatNumber(selectedArea.auditWape, 1)}%`,
                          hint:
                            selectedArea.auditWape !== null && selectedArea.auditWape > 30
                              ? "noisy — human review required"
                              : "2025 held-out audit",
                          flagged: selectedArea.auditWape !== null && selectedArea.auditWape > 30,
                        },
                      ]
                    : []
                }
              />
            </div>
            <InterventionControl />
            <GeographyProvenance />
            <MapValueTable
              caption="Planned staff-hours by neighborhood"
              rows={planningAreas.map((area) => {
                const hours = allocationById.get(area.id) ?? 0;
                return {
                  name: area.name,
                  value: `${hours}h`,
                  state: lockedIds.has(area.id)
                    ? "Human lock"
                    : !guardEnabled
                      ? "No minimum"
                      : hours < coverageFloor
                        ? "Below minimum"
                        : "Minimum met",
                };
              })}
            />
          </div>

          <div className="plan-footer">
            <div>
              <span className="eyebrow">Constraint check</span>
              <strong>
                {planTotal === budget ? "Budget conserved exactly" : "Budget mismatch"}
              </strong>
            </div>
            <div>
              <span className="eyebrow">Unmet planning load</span>
              <strong>
                {unmetTotal > 0
                  ? `${unmetTotal}h moved to minimums and locks`
                  : "0h · hours follow the forecast"}
              </strong>
            </div>
            <div>
              <span className="eyebrow">Cost of the floor · assumed</span>
              <strong>
                {formatCurrency(planCost.floor.cost, planCost.currency)} at an assumed{" "}
                {formatRate(planCost.rate, planCost.currency)}
              </strong>
            </div>
            <div>
              <span className="eyebrow">Human changes</span>
              <strong>
                {lockedIds.size
                  ? `${lockedIds.size} locked assignment${lockedIds.size > 1 ? "s" : ""}`
                  : "None yet"}
              </strong>
            </div>
            {planDirty && (
              <button
                className="button button-primary"
                disabled={!budgetValid}
                onClick={() => runPlan()}
                type="button"
              >
                Recompute unlocked hours
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
