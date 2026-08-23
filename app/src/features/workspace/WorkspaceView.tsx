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
import { useTranslation } from "../../i18n/context";
import { planReason } from "../../i18n/plannerText";

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
    placeText,
    plan,
    planDirty,
    planSentence,
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
  const { t, number, signed } = useTranslation();
  return (
    <div className="workspace" id="workspace">
      <section aria-label={t("workspace.stageAria")} className="ws-stage">
        <div className="ws-stage-head">
          <div aria-label={t("workspace.layerAria")} className="ws-layers" role="group">
            {(
              [
                ["hours", "workspace.layerHours"],
                ["change", "workspace.layerChange"],
                ["unmet", "workspace.layerUnmet"],
              ] as const
            ).map(([layer, label]) => (
              <button
                aria-pressed={mapLayer === layer}
                className={mapLayer === layer ? "active" : ""}
                key={layer}
                onClick={() => setMapLayer(layer)}
                type="button"
              >
                {t(label)}
              </button>
            ))}
          </div>
          {plan?.feasible && <PlanState />}
        </div>
        <AreaMap
          areas={mapLayer === "change" ? data.areas : planningAreas}
          ariaLabel={t(
            mapLayer === "hours"
              ? "map.ariaHours"
              : mapLayer === "change"
                ? "map.ariaChange"
                : "map.ariaUnmet",
            placeText,
          )}
          onSelect={(areaId) => {
            toggleAreaSelection(areaId);
            setWsTab("area");
          }}
          selectedId={selectedAreaId}
          valueFor={(area) => {
            if (mapLayer === "change") {
              if (area.latest === null) return { text: t("map.noData"), tone: "missing" };
              const maxDelta = Math.max(1, ...data.areas.map((row) => Math.abs(row.delta)));
              return {
                text: signed(area.delta),
                tone: area.delta > 0 ? "up" : "down",
                intensity: Math.abs(area.delta) / maxDelta,
              };
            }
            if (mapLayer === "unmet") {
              const unmet = unmetByArea.get(area.id) ?? 0;
              const maxUnmet = Math.max(1, ...Array.from(unmetByArea.values()));
              return {
                text: t("map.hoursValue", { hours: unmet }),
                tone: unmet > 0 ? "down" : "neutral",
                intensity: unmet / maxUnmet,
              };
            }
            const hours = allocationById.get(area.id) ?? 0;
            const belowFloor = guardEnabled && hours < coverageFloor;
            return {
              text: t(belowFloor ? "map.hoursBelowFloor" : "map.hoursValue", { hours }),
              tone: belowFloor ? "down" : "neutral",
              intensity: hours / maxHours,
            };
          }}
        />
        <p className="map-caption">
          {t(
            mapLayer === "hours"
              ? "workspace.captionHours"
              : mapLayer === "change"
                ? "workspace.captionChange"
                : "workspace.captionUnmet",
          )}
          {t("workspace.captionTail")}
          {intervention
            ? t("map.captionAssumption", {
                area: data.areas.find((area) => area.id === intervention.areaId)?.name ?? "",
              })
            : ""}
        </p>
        <details className="ws-table">
          <summary>{t("table.viewAsTable")}</summary>
          <MapValueTable
            caption={t(
              mapLayer === "hours"
                ? "table.captionPlanned"
                : mapLayer === "change"
                  ? "table.captionObservedChange"
                  : "table.captionUnmet",
            )}
            rows={(mapLayer === "change" ? data.areas : planningAreas).map((area) => {
              if (mapLayer === "change") {
                return {
                  name: area.name,
                  value: area.latest === null ? "—" : signed(area.delta),
                  state:
                    area.latest === null
                      ? t("state.noRecentObservation")
                      : area.delta > 0
                        ? t("state.moreObservedUnits")
                        : t("state.fewerObservedUnits"),
                };
              }
              if (mapLayer === "unmet") {
                const unmet = unmetByArea.get(area.id) ?? 0;
                return {
                  name: area.name,
                  value: t("map.hoursValue", { hours: unmet }),
                  state: unmet > 0 ? t("state.loadMovedByMinimums") : t("state.followsForecast"),
                };
              }
              const hours = allocationById.get(area.id) ?? 0;
              return {
                name: area.name,
                value: t("map.hoursValue", { hours }),
                state: lockedIds.has(area.id)
                  ? t("state.humanLock")
                  : !guardEnabled
                    ? t("state.noMinimum")
                    : hours < coverageFloor
                      ? t("state.belowMinimum")
                      : t("state.minimumMet"),
              };
            })}
          />
        </details>
      </section>
      <aside aria-label={t("workspace.inspectorAria")} className="ws-inspector">
        <div aria-label={t("workspace.tabsAria")} className="ws-tabs" role="group">
          {(
            [
              ["plan", "workspace.tabPlan"],
              ["area", "workspace.tabArea"],
              ["scenarios", "workspace.tabScenarios"],
              ["brief", "workspace.tabBrief"],
            ] as const
          ).map(([tab, label]) => (
            <button
              aria-pressed={wsTab === tab}
              className={wsTab === tab ? "active" : ""}
              key={tab}
              onClick={() => setWsTab(tab)}
              type="button"
            >
              {t(label)}
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
                    <h3>{t("planner.infeasibleTitle")}</h3>
                    <p>{planSentence}</p>
                    <p>{t("planner.infeasibleAdvice")}</p>
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
                      {t("planner.recompute")}
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
                empty={t("detail.emptyDossier")}
                kicker={t("detail.kickerDossier")}
                note={selectedArea ? planReason(t, selectedArea.reason) : undefined}
                rows={
                  selectedArea
                    ? [
                        {
                          label: t("detail.observedChange"),
                          value:
                            selectedArea.latest === null
                              ? t("detail.noRecentObservation")
                              : t("detail.unitsDelta", { delta: signed(selectedArea.delta) }),
                          hint: t("detail.hintRawSameMonth"),
                        },
                        {
                          label: t("detail.latestCount"),
                          value: selectedArea.latest === null ? "—" : number(selectedArea.latest),
                          hint: t("detail.hintLatestMonthly"),
                        },
                        {
                          label: t("detail.planningLoad"),
                          value: number(
                            planningAreas.find((area) => area.id === selectedArea.id)
                              ?.planningLoad ?? selectedArea.planningLoad,
                            1,
                          ),
                          hint:
                            intervention && interventionResult
                              ? t("detail.hintAdjustedByAssumption")
                              : t("detail.hintWeightsRemaining"),
                        },
                        {
                          label: t("detail.plannedHours"),
                          value: t("map.hoursValue", {
                            hours: allocationById.get(selectedArea.id) ?? 0,
                          }),
                          hint: lockedIds.has(selectedArea.id)
                            ? t("detail.hintHumanLock")
                            : guardEnabled
                              ? t("detail.hintMinimumGuaranteed", { floor: coverageFloor })
                              : t("detail.hintNoMinimumEnforced"),
                        },
                        {
                          label: t("detail.unmetLoad"),
                          value: t("map.hoursValue", {
                            hours: unmetByArea.get(selectedArea.id) ?? 0,
                          }),
                          hint: t("detail.hintMovedByMinimums"),
                        },
                        {
                          label: t("detail.heldOutWape"),
                          value:
                            selectedArea.auditWape === null
                              ? t("detail.notAudited")
                              : t("detail.wapeValue", {
                                  wape: number(selectedArea.auditWape, 1),
                                }),
                          hint:
                            selectedArea.auditWape !== null && selectedArea.auditWape > 30
                              ? t("detail.hintNoisyReview")
                              : t("detail.hint2025Audit"),
                          flagged: selectedArea.auditWape !== null && selectedArea.auditWape > 30,
                        },
                        ...(compareById
                          ? [
                              {
                                label: t("detail.vsSavedScenario"),
                                value: (() => {
                                  const delta =
                                    (allocationById.get(selectedArea.id) ?? 0) -
                                    (compareById.get(selectedArea.id) ?? 0);
                                  return delta === 0
                                    ? t("detail.same")
                                    : t("detail.deltaHours", { delta: signed(delta) });
                                })(),
                                hint: t("detail.hintVsPinned"),
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
