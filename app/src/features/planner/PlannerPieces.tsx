import { SparkIcon } from "../../components/Icons";
import { CostAssumptionControl, PlanCostSummary } from "../../features/cost/CostPieces";
import { ExportActions } from "../../features/export/ExportActions";
import { ShareLink } from "../../features/share/ShareLink";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function PlanState() {
  const {
    budget,
    coverageFloor,
    data,
    guardEnabled,
    intervention,
    lockedIds,
    planTotal,
    unmetTotal,
  } = useShell();
  const { t } = useTranslation();
  return (
    <div aria-label={t("state.liveAria")} className="plan-state" role="status">
      <span>{t("state.allocated", { allocated: planTotal, budget })}</span>
      <span>
        {guardEnabled ? t("state.floor", { floor: coverageFloor }) : t("state.noMinimumShort")}
      </span>
      <span>{unmetTotal > 0 ? t("state.unmet", { hours: unmetTotal }) : t("state.noUnmet")}</span>
      {lockedIds.size > 0 && <span>{t("state.locks", { count: lockedIds.size })}</span>}
      {intervention && (
        <span className="plan-state-assumption">
          {t("state.assumption", {
            area: data.areas.find((area) => area.id === intervention.areaId)?.name ?? "",
          })}
        </span>
      )}
    </div>
  );
}

export function PlannerControls() {
  const {
    budget,
    budgetValid,
    coverageFloor,
    data,
    deployment,
    guardEnabled,
    placeText,
    places,
    plan,
    setBudgetHours,
    setCoveragePolicy,
  } = useShell();
  const { t, tx } = useTranslation();
  return (
    <>
      <div className="coverage-policy" aria-label={t("controls.floorAria")} role="group">
        <div>
          <span className="eyebrow">{t("controls.youSetThis")}</span>
          <strong>{t("controls.floorTitle", { areaNoun: places.noun })}</strong>
        </div>
        <div className="floor-options">
          {deployment.floorOptions.map((floor) => (
            <button
              aria-pressed={floor === 0 ? !guardEnabled : guardEnabled && coverageFloor === floor}
              className={`floor-option ${floor === 0 ? (!guardEnabled ? "active" : "") : guardEnabled && coverageFloor === floor ? "active" : ""}`}
              key={floor}
              onClick={() => setCoveragePolicy(floor)}
              type="button"
            >
              <strong>{t("controls.floorHours", { floor })}</strong>
              <span>
                {floor === 0
                  ? t("controls.floorNone")
                  : floor === deployment.coverageFloor
                    ? t("controls.floorDefault")
                    : t("controls.floorCompare")}
              </span>
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="policy-lens">
        {coverageFloor === 0
          ? tx("controls.policyLensNoFloor", placeText)
          : tx("controls.policyLensWithFloor", {
              ...placeText,
              setAside: data.areas.length * coverageFloor,
              budget,
              floor: coverageFloor,
            })}
      </p>

      {plan && (
        <div className="whatif-control">
          <label htmlFor="whatif-budget">
            <span className="eyebrow">{t("controls.whatIfLabel")}</span>
          </label>
          <div className="whatif-row">
            <input
              aria-describedby="whatif-help"
              id="whatif-budget"
              max={deployment.maxBudget}
              min={deployment.minBudget}
              onChange={(event) => setBudgetHours(Number(event.target.value))}
              step={deployment.allocationIncrement}
              type="range"
              value={budgetValid ? budget : 0}
            />
            <output aria-live="off" htmlFor="whatif-budget">
              {t("controls.whatIfHours", { hours: budget })}
            </output>
          </div>
          <p id="whatif-help">{t("controls.whatIfHelp")}</p>
        </div>
      )}

      <CostAssumptionControl />
    </>
  );
}

export function ScenarioBench() {
  const {
    compareById,
    compareId,
    compareScenario,
    deleteScenario,
    loadScenario,
    planReady,
    saveScenario,
    scenarios,
    setCompareId,
  } = useShell();
  const { t, tx } = useTranslation();
  return (
    <div className="scenario-bench">
      <div className="scenario-bench-head">
        <span className="eyebrow">{t("bench.eyebrow")}</span>
        <button
          className="button button-quiet"
          disabled={!planReady}
          onClick={saveScenario}
          type="button"
        >
          {t("bench.save")}
        </button>
      </div>
      {scenarios.length === 0 ? (
        <p className="scenario-empty">{t("bench.empty")}</p>
      ) : (
        <ul className="scenario-list">
          {scenarios.map((scenario) => (
            <li className={compareId === scenario.id ? "is-compare" : ""} key={scenario.id}>
              <button
                className="scenario-load"
                onClick={() => loadScenario(scenario)}
                type="button"
              >
                {scenario.name}
              </button>
              <button
                aria-pressed={compareId === scenario.id}
                className="scenario-compare"
                onClick={() =>
                  setCompareId((current) => (current === scenario.id ? null : scenario.id))
                }
                type="button"
              >
                {compareId === scenario.id ? t("bench.comparing") : t("bench.compare")}
              </button>
              <button
                aria-label={t("bench.delete", { name: scenario.name })}
                className="scenario-delete"
                onClick={() => deleteScenario(scenario.id)}
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {compareScenario && (
        <p className="scenario-compare-note" role="status">
          {compareById
            ? tx("bench.comparingWith", { name: compareScenario.name })
            : tx("bench.infeasible", { name: compareScenario.name })}
        </p>
      )}
    </div>
  );
}

export function PlannerStart() {
  const { budget, budgetValid, coverageFloor, data, deployment, runPlan } = useShell();
  const { t } = useTranslation();
  return (
    <div className="planner-start">
      <div className="constraint-equation">
        <span>
          {budget}
          <small>{t("start.available")}</small>
        </span>
        <b>=</b>
        <span>
          {data.areas.length * coverageFloor}
          <small>{t("start.guaranteedMinimums")}</small>
        </span>
        <b>+</b>
        <span>
          {Math.max(0, budget - data.areas.length * coverageFloor)}
          <small>{t("start.followTheForecast")}</small>
        </span>
      </div>
      <button
        className="button button-primary button-large"
        disabled={!budgetValid}
        onClick={() => runPlan()}
        type="button"
      >
        <SparkIcon /> {t("start.generate")}
      </button>
      {!budgetValid && (
        <p className="budget-invalid" role="status">
          {t("start.budgetInvalid", { min: deployment.minBudget, max: deployment.maxBudget })}
        </p>
      )}
    </div>
  );
}

export function PlanRows() {
  const {
    deployment,
    allocationById,
    auditedAreaWapes,
    auditedAreas,
    budget,
    compareById,
    coverageFloor,
    data,
    guardEnabled,
    intervention,
    interventionHourChurn,
    interventionResult,
    lockValues,
    lockedIds,
    maxHours,
    placeText,
    plan,
    planSentence,
    planTotal,
    planningAreas,
    runPlan,
    selectedAreaId,
    setGuard,
    setInterventionScenario,
    setLockValues,
    setLockedIds,
    setPlanDirty,
    toggleLock,
    unmetByArea,
  } = useShell();
  const { t, tx, number } = useTranslation();
  if (!plan?.feasible) return null;
  return (
    <>
      <div className="plan-toolbar">
        <p>
          <strong>{t("rows.allocated", { allocated: planTotal, budget })}</strong> {planSentence}
        </p>
        <div>
          <button
            className={`button ${guardEnabled ? "button-audit" : "button-primary"}`}
            onClick={() => setGuard(!guardEnabled)}
            type="button"
          >
            {guardEnabled
              ? t("rows.compareNoMinimum")
              : t("rows.restoreMinimum", {
                  floor: coverageFloor || deployment.coverageFloor,
                })}
          </button>
          <button
            className="button button-quiet"
            onClick={() => {
              setLockedIds(new Set());
              setLockValues({});
              runPlan(guardEnabled, new Map());
            }}
            type="button"
          >
            {t("rows.resetLocks")}
          </button>
        </div>
      </div>

      {!guardEnabled && (
        <div className="audit-banner" role="status">
          {coverageFloor > 0
            ? tx("rows.auditBannerFloor", { floor: coverageFloor })
            : tx("rows.auditBannerNoFloor", placeText)}
        </div>
      )}

      {intervention && interventionResult && (
        <div className="intervention-banner" role="status">
          <div>
            {tx("rows.assumptionBanner", {
              area:
                data.areas.find((area) => area.id === intervention.areaId)?.name ??
                intervention.areaId,
              pct: number(intervention.share * 100),
              shifted: number(interventionResult.shifted, 1),
              resolved: number(interventionResult.assumedResolved, 1),
              churn:
                interventionHourChurn !== null
                  ? t("rows.assumptionChurn", { hours: number(interventionHourChurn, 1) })
                  : "",
            })}
          </div>
          <button
            className="button button-quiet"
            onClick={() => setInterventionScenario(null)}
            type="button"
          >
            {t("rows.clearAssumption")}
          </button>
        </div>
      )}

      <div className="area-accuracy-warning" role="note">
        {auditedAreas.length
          ? tx("rows.accuracyWarningWithAreas", {
              wape: number(data.forecast.wape, 1),
              min: number(Math.min(...auditedAreaWapes), 1),
              max: number(Math.max(...auditedAreaWapes), 1),
            })
          : tx("rows.accuracyWarningNoAreas", { wape: number(data.forecast.wape, 1) })}
      </div>

      <div
        className={`allocation-list ${compareById ? "with-compare" : ""}`}
        role="list"
        aria-label={t("rows.listAria")}
      >
        {planningAreas.map((area) => {
          const hours = allocationById.get(area.id) ?? 0;
          const locked = lockedIds.has(area.id);
          const belowFloor = hours < coverageFloor;
          const unmet = unmetByArea.get(area.id) ?? 0;
          const compareDelta = compareById ? hours - (compareById.get(area.id) ?? 0) : 0;
          return (
            <article
              className={`allocation-row ${belowFloor ? "below-floor" : ""} ${selectedAreaId === area.id ? "is-selected" : ""}`}
              key={area.id}
              role="listitem"
            >
              <div className="area-name">
                <strong>{area.name}</strong>
                <span>
                  {t("rows.planningFor", {
                    load: number(area.planningLoad, 1),
                    split: locked
                      ? t("rows.splitLocked", { hours })
                      : guardEnabled
                        ? t("rows.splitGuarded", {
                            floorHours: Math.min(hours, coverageFloor),
                            extraHours: Math.max(0, hours - coverageFloor),
                          })
                        : t("rows.splitUnguarded", { hours }),
                  })}
                  {unmet > 0 ? t("rows.movedAway", { hours: unmet }) : ""}
                </span>
              </div>
              <div aria-hidden="true" className="allocation-bar-track">
                <i style={{ width: `${(hours / maxHours) * 100}%` }} />
              </div>
              <label className="hours-input">
                <span className="sr-only">{t("rows.hoursFor", { area: area.name })}</span>
                <input
                  aria-label={t("rows.hoursFor", { area: area.name })}
                  disabled={!locked}
                  min="0"
                  onChange={(event) => {
                    setLockValues((values) => ({
                      ...values,
                      [area.id]: Number(event.target.value),
                    }));
                    setPlanDirty(true);
                  }}
                  type="number"
                  value={locked ? (lockValues[area.id] ?? hours) : hours}
                />
                <span>{t("rows.hourUnit")}</span>
              </label>
              <label className="lock-control">
                <input
                  aria-label={t("rows.lockAt", { area: area.name, hours })}
                  checked={locked}
                  onChange={() => toggleLock(area.id)}
                  type="checkbox"
                />
                <span>{locked ? t("rows.locked") : t("rows.lock")}</span>
              </label>
              <span
                className={`constraint-chip ${belowFloor ? "constraint-fail" : "constraint-pass"}`}
              >
                {!guardEnabled
                  ? t("rows.chipNoMinimum")
                  : belowFloor
                    ? t("rows.chipBelowMinimum")
                    : t("rows.chipMinimumMet", { floor: coverageFloor })}
              </span>
              {compareById && (
                <span
                  className={`compare-delta ${
                    compareDelta > 0 ? "delta-up" : compareDelta < 0 ? "delta-down" : "delta-same"
                  }`}
                >
                  {compareDelta > 0
                    ? t("rows.deltaUp", { hours: compareDelta })
                    : compareDelta < 0
                      ? t("rows.deltaDown", { hours: compareDelta })
                      : t("rows.deltaSame")}
                </span>
              )}
            </article>
          );
        })}
      </div>

      <PlanCostSummary />
    </>
  );
}

export function InterventionControl() {
  const { intervention, selectedArea, setInterventionScenario, setShareDraft, shareDraft } =
    useShell();
  const { t } = useTranslation();
  return (
    selectedArea && (
      <div className="intervention-control">
        <div>
          <span className="eyebrow">{t("intervention.eyebrow")}</span>
          <p>{t("intervention.lede", { area: selectedArea.name })}</p>
        </div>
        <label htmlFor="displaced-share">{t("intervention.shareLabel")}</label>
        <div className="intervention-row">
          <input
            id="displaced-share"
            max="100"
            min="0"
            onChange={(event) => {
              const share = Number(event.target.value) / 100;
              setShareDraft(share);
              if (intervention?.areaId === selectedArea.id) {
                setInterventionScenario({ areaId: selectedArea.id, share });
              }
            }}
            step="5"
            type="range"
            value={Math.round(
              (intervention?.areaId === selectedArea.id ? intervention.share : shareDraft) * 100,
            )}
          />
          <output htmlFor="displaced-share">
            {Math.round(
              (intervention?.areaId === selectedArea.id ? intervention.share : shareDraft) * 100,
            )}
            %
          </output>
          {intervention?.areaId === selectedArea.id ? (
            <button
              className="button button-quiet"
              onClick={() => setInterventionScenario(null)}
              type="button"
            >
              {t("intervention.clear")}
            </button>
          ) : (
            <button
              className="button button-primary"
              onClick={() =>
                setInterventionScenario({
                  areaId: selectedArea.id,
                  share: shareDraft,
                })
              }
              type="button"
            >
              {t("intervention.explore")}
            </button>
          )}
        </div>
      </div>
    )
  );
}

export function BriefCluster() {
  const { budget, copyBrief, copyStatus, decisionBrief, planReady } = useShell();
  const { t, number } = useTranslation();
  return (
    <>
      <details className="data-table-disclosure capacity-context">
        <summary>{t("brief.capacitySummary")}</summary>
        <p>
          {t("brief.capacityWeeks", {
            hours: number(budget),
            weeks: number(budget / 40, 1),
          })}
        </p>
        <p>{t("brief.capacityHud")}</p>
        <p>{t("brief.capacityLocal")}</p>
        <p>{t("brief.capacityBoundary")}</p>
      </details>
      <div className="brief-action">
        <div>
          <span className="eyebrow">{t("brief.portableEyebrow")}</span>
          <p>{t("brief.portableLede")}</p>
        </div>
        <button
          className="button button-primary button-large"
          disabled={!planReady}
          onClick={copyBrief}
          type="button"
        >
          {t("brief.copy")}
        </button>
      </div>
      {copyStatus && (
        <p className="copy-status" role="status">
          {copyStatus}
        </p>
      )}
      {copyStatus && (
        <details className="brief-preview" open>
          <summary>{t("brief.full")}</summary>
          <pre>{decisionBrief}</pre>
        </details>
      )}

      <ShareLink />

      <ExportActions />
    </>
  );
}
