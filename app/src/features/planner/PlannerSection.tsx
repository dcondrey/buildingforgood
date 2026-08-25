import {
  InterventionControl,
  PlanRows,
  PlannerControls,
  PlannerStart,
  ScenarioBench,
} from "../../features/planner/PlannerPieces";
import { CONTRACTED_CAPACITY } from "../../data/capacityContext";
import { GeographyProvenance } from "../../features/shell/GeographyProvenance";
import { useShell } from "../../features/shell/ShellContext";
import { AreaDetailPanel } from "../../features/spatial/AreaDetailPanel";
import { AreaMap } from "../../features/spatial/AreaMap";
import { MapValueTable } from "../../features/spatial/MapValueTable";
import { useTranslation } from "../../i18n/context";
import { planReason } from "../../i18n/plannerText";

export function PlannerSection() {
  const {
    allocationById,
    budget,
    budgetValid,
    coverageFloor,
    data,
    guardEnabled,
    intervention,
    interventionResult,
    lockedIds,
    maxHours,
    placeText,
    places,
    plan,
    planCost,
    planDirty,
    planSentence,
    planTotal,
    planningAreas,
    runPlan,
    selectedArea,
    selectedAreaId,
    toggleAreaSelection,
    unmetTotal,
  } = useShell();
  const { t, tx, number, money } = useTranslation();
  const assumedAreaName = intervention
    ? (data.areas.find((area) => area.id === intervention.areaId)?.name ?? "")
    : "";
  return (
    <section className="decision-section" id="planner" aria-labelledby="planner-title">
      <div aria-hidden="true" className="section-number">
        03
      </div>
      <div className="section-intro split-intro planner-intro">
        <div>
          <p className="eyebrow">{t("planner.eyebrow")}</p>
          <h2 id="planner-title">{t("planner.title", { hours: budget })}</h2>
          <p>{t("planner.intro", placeText)}</p>
        </div>
        <div className={`guard-status ${guardEnabled ? "guard-on" : "guard-off"}`}>
          <span>{guardEnabled ? "✓" : "!"}</span>
          <div>
            <small>{t("planner.guaranteedMinimum")}</small>
            <strong>
              {guardEnabled
                ? t("planner.guardOn", { floor: coverageFloor })
                : t("planner.guardOff")}
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
            <h3>{t("planner.infeasibleTitle")}</h3>
            <p>{planSentence}</p>
            <p>{t("planner.infeasibleAdvice")}</p>
          </div>
        </div>
      ) : (
        <div aria-live="polite" className="plan-result reveal">
          <PlanRows />

          <div className="plan-map">
            <div className="plan-map-heading">
              <span className="eyebrow">{t("planner.mapHeading")}</span>
              <p>{t("planner.mapLede", { areaNoun: places.noun })}</p>
            </div>
            <div className="map-detail-row">
              <div>
                <AreaMap
                  areas={planningAreas}
                  ariaLabel={t("map.ariaHours", placeText)}
                  onSelect={toggleAreaSelection}
                  selectedId={selectedAreaId}
                  valueFor={(area) => {
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
                  {t("map.captionPlanned")}
                  {guardEnabled ? t("map.captionBelowMinimum") : ""}
                  {intervention ? t("map.captionAssumption", { area: assumedAreaName }) : ""}
                </p>
              </div>
              <AreaDetailPanel
                area={selectedArea}
                empty={t("detail.emptyPlan")}
                kicker={t("detail.kickerAllocation")}
                note={selectedArea ? planReason(t, selectedArea.reason) : undefined}
                rows={
                  selectedArea
                    ? [
                        {
                          label: t("detail.plannedHours"),
                          value: t("map.hoursValue", {
                            hours: allocationById.get(selectedArea.id) ?? 0,
                          }),
                          hint: lockedIds.has(selectedArea.id)
                            ? t("detail.hintHumanLockEditAbove")
                            : t("detail.hintRecomputeUpdates"),
                        },
                        {
                          label: t("detail.coverageFloor"),
                          value: guardEnabled
                            ? t("detail.floorValue", { floor: coverageFloor })
                            : t("detail.floorOff"),
                          hint: guardEnabled
                            ? t("detail.hintUserSetFloor")
                            : t("detail.hintNoMinimumEnforced"),
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
                      ]
                    : []
                }
              />
            </div>
            <InterventionControl />
            <GeographyProvenance />
            <MapValueTable
              caption={t("table.captionPlanned")}
              rows={planningAreas.map((area) => {
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
          </div>

          <div className="plan-footer">
            <div>
              <span className="eyebrow">{t("planner.constraintCheck")}</span>
              <strong>
                {planTotal === budget ? t("planner.budgetConserved") : t("planner.budgetMismatch")}
              </strong>
            </div>
            <div>
              <span className="eyebrow">{t("planner.unmetPlanningLoad")}</span>
              <strong>
                {unmetTotal > 0
                  ? t("planner.unmetMoved", { hours: unmetTotal })
                  : t("planner.unmetNone")}
              </strong>
            </div>
            <div>
              <span className="eyebrow">{t("planner.floorCostEyebrow")}</span>
              <strong>
                {t("planner.floorCostValue", {
                  cost: money(planCost.floor.cost, planCost.currency),
                  rate: t("cost.perStaffHour", {
                    money: money(planCost.rate, planCost.currency),
                  }),
                })}
              </strong>
            </div>
            <div>
              <span className="eyebrow">{t("planner.humanChanges")}</span>
              <strong>
                {lockedIds.size
                  ? t("planner.lockedAssignments", { count: lockedIds.size })
                  : t("planner.noneYet")}
              </strong>
            </div>
            {planDirty && (
              <button
                className="button button-primary"
                disabled={!budgetValid}
                onClick={() => runPlan()}
                type="button"
              >
                {t("planner.recompute")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="capacity-context" id="capacity-context">
        <span className="eyebrow">{t("capacity.eyebrow")}</span>
        <strong>{t("capacity.title")}</strong>
        <p>
          {tx("capacity.body", {
            staff: CONTRACTED_CAPACITY.outreachStaffPerDay,
            shifts: CONTRACTED_CAPACITY.shiftsPerDay,
            days: CONTRACTED_CAPACITY.daysPerWeek,
          })}
        </p>
        <p className="digitization-audit-finding">{tx("capacity.notComparable")}</p>
        <details>
          <summary>{t("capacity.quoteLead")}</summary>
          <ul>
            {CONTRACTED_CAPACITY.quotes.map((quote) => (
              <li key={quote}>
                <q>{quote}</q>
              </li>
            ))}
          </ul>
          <p className="currency-frozen">
            {tx("capacity.sourceNote", {
              title: CONTRACTED_CAPACITY.source.title,
              request: CONTRACTED_CAPACITY.source.request,
              doc: CONTRACTED_CAPACITY.source.documentId,
            })}
          </p>
        </details>
      </div>
    </section>
  );
}
