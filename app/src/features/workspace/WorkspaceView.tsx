import {
  BriefCluster,
  InterventionControl,
  PlanRows,
  PlanState,
  PlannerControls,
  PlannerStart,
  ScenarioBench,
} from "../../features/planner/PlannerPieces";
import { useShell } from "../../features/shell/ShellContext";
import { AreaDetailPanel } from "../../features/spatial/AreaDetailPanel";
import { AreaMap } from "../../features/spatial/AreaMap";
import { MapValueTable } from "../../features/spatial/MapValueTable";
import { formatNumber } from "../../lib/format";

export function WorkspaceView() {
  const {
    allocationById,
    budgetValid,
    compareById,
    coverageFloor,
    data,
    guardEnabled,
    intervention,
    interventionResult,
    lockedIds,
    mapLayer,
    maxHours,
    plan,
    planDirty,
    planningAreas,
    runPlan,
    selectedArea,
    selectedAreaId,
    setMapLayer,
    setWsTab,
    toggleAreaSelection,
    unmetByArea,
    wsTab,
  } = useShell();
  return (
    <div className="workspace" id="workspace">
      <section aria-label="Plan map stage" className="ws-stage">
        <div className="ws-stage-head">
          <div aria-label="Map layer" className="ws-layers" role="group">
            {(
              [
                ["hours", "Planned hours"],
                ["change", "Observed change"],
                ["unmet", "Unmet load"],
              ] as const
            ).map(([layer, label]) => (
              <button
                aria-pressed={mapLayer === layer}
                className={mapLayer === layer ? "active" : ""}
                key={layer}
                onClick={() => setMapLayer(layer)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {plan?.feasible && <PlanState />}
        </div>
        <AreaMap
          areas={mapLayer === "change" ? data.areas : planningAreas}
          ariaLabel={
            mapLayer === "hours"
              ? "Map of the six downtown neighborhoods showing planned staff-hours; select a neighborhood for detail"
              : mapLayer === "change"
                ? "Map of the six downtown neighborhoods showing the change in raw field observations; select a neighborhood for detail"
                : "Map of the six downtown neighborhoods showing unmet planning load in hours; select a neighborhood for detail"
          }
          onSelect={(areaId) => {
            toggleAreaSelection(areaId);
            setWsTab("area");
          }}
          selectedId={selectedAreaId}
          valueFor={(area) => {
            if (mapLayer === "change") {
              if (area.latest === null) return { text: "no data", tone: "missing" };
              const maxDelta = Math.max(1, ...data.areas.map((row) => Math.abs(row.delta)));
              return {
                text: `${area.delta > 0 ? "+" : ""}${area.delta}`,
                tone: area.delta > 0 ? "up" : "down",
                intensity: Math.abs(area.delta) / maxDelta,
              };
            }
            if (mapLayer === "unmet") {
              const unmet = unmetByArea.get(area.id) ?? 0;
              const maxUnmet = Math.max(1, ...Array.from(unmetByArea.values()));
              return {
                text: `${unmet}h`,
                tone: unmet > 0 ? "down" : "neutral",
                intensity: unmet / maxUnmet,
              };
            }
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
          {mapLayer === "hours"
            ? "Planned staff-hours by neighborhood"
            : mapLayer === "change"
              ? "Change in raw field observations, latest same-month comparison"
              : "Hours the minimums moved away from the forecast split"}
          {" · simplified neighborhood boundaries · not a count of people"}
          {intervention
            ? ` · ${data.areas.find((area) => area.id === intervention.areaId)?.name ?? ""} modeled as cleared (assumption)`
            : ""}
        </p>
        <details className="ws-table">
          <summary>View map values as a table</summary>
          <MapValueTable
            caption={
              mapLayer === "hours"
                ? "Planned staff-hours by neighborhood"
                : mapLayer === "change"
                  ? "Observed change by neighborhood"
                  : "Unmet planning load by neighborhood"
            }
            rows={(mapLayer === "change" ? data.areas : planningAreas).map((area) => {
              if (mapLayer === "change") {
                return {
                  name: area.name,
                  value: area.latest === null ? "—" : `${area.delta > 0 ? "+" : ""}${area.delta}`,
                  state:
                    area.latest === null
                      ? "No recent observation"
                      : area.delta > 0
                        ? "More observed units"
                        : "Fewer observed units",
                };
              }
              if (mapLayer === "unmet") {
                const unmet = unmetByArea.get(area.id) ?? 0;
                return {
                  name: area.name,
                  value: `${unmet}h`,
                  state: unmet > 0 ? "Load moved by minimums" : "Follows forecast",
                };
              }
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
        </details>
      </section>
      <aside aria-label="Inspector" className="ws-inspector">
        <div aria-label="Inspector sections" className="ws-tabs" role="group">
          {(
            [
              ["plan", "Plan"],
              ["area", "Area"],
              ["scenarios", "Scenarios"],
              ["brief", "Brief"],
            ] as const
          ).map(([tab, label]) => (
            <button
              aria-pressed={wsTab === tab}
              className={wsTab === tab ? "active" : ""}
              key={tab}
              onClick={() => setWsTab(tab)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ws-body">
          {wsTab === "plan" && (
            <>
              <PlannerControls />
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
                <>
                  <PlanRows />
                  {planDirty && (
                    <button
                      className="button button-primary ws-recompute"
                      disabled={!budgetValid}
                      onClick={() => runPlan()}
                      type="button"
                    >
                      Recompute unlocked hours
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {wsTab === "area" && (
            <>
              <AreaDetailPanel
                area={selectedArea}
                empty="Select a neighborhood on the map to open its dossier."
                kicker="Area dossier"
                note={selectedArea?.reason}
                rows={
                  selectedArea
                    ? [
                        {
                          label: "Observed change",
                          value:
                            selectedArea.latest === null
                              ? "no recent observation"
                              : `${selectedArea.delta > 0 ? "+" : ""}${selectedArea.delta} units`,
                          hint: "raw field observations, same month",
                        },
                        {
                          label: "Latest count",
                          value:
                            selectedArea.latest === null ? "—" : formatNumber(selectedArea.latest),
                          hint: "latest monthly observation",
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
                          label: "Planned hours",
                          value: `${allocationById.get(selectedArea.id) ?? 0}h`,
                          hint: lockedIds.has(selectedArea.id)
                            ? "human lock"
                            : guardEnabled
                              ? `${coverageFloor}h minimum guaranteed`
                              : "no minimum enforced",
                        },
                        {
                          label: "Unmet load",
                          value: `${unmetByArea.get(selectedArea.id) ?? 0}h`,
                          hint: "hours moved by minimums and locks",
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
                        ...(compareById
                          ? [
                              {
                                label: "Vs saved scenario",
                                value: (() => {
                                  const delta =
                                    (allocationById.get(selectedArea.id) ?? 0) -
                                    (compareById.get(selectedArea.id) ?? 0);
                                  return delta === 0 ? "same" : `${delta > 0 ? "+" : ""}${delta}h`;
                                })(),
                                hint: "current plan minus pinned scenario",
                              },
                            ]
                          : []),
                      ]
                    : []
                }
              />
              <InterventionControl />
            </>
          )}
          {wsTab === "scenarios" && <ScenarioBench />}
          {wsTab === "brief" && (
            <div className="ws-brief">
              <BriefCluster />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
