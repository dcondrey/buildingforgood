import { SparkIcon } from "../../components/Icons";
import { CostAssumptionControl, PlanCostSummary } from "../../features/cost/CostPieces";
import { ExportActions } from "../../features/export/ExportActions";
import { ShareLink } from "../../features/share/ShareLink";
import { useShell } from "../../features/shell/ShellContext";
import { DEFAULT_COVERAGE_FLOOR, MAX_BUDGET_HOURS } from "../../lib/constants";
import { formatNumber } from "../../lib/format";

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
  return (
    <div aria-label="Live plan state" className="plan-state" role="status">
      <span>
        {planTotal}/{budget}h allocated
      </span>
      <span>{guardEnabled ? `${coverageFloor}h floor` : "no minimum"}</span>
      <span>{unmetTotal > 0 ? `${unmetTotal}h unmet load` : "0h unmet"}</span>
      {lockedIds.size > 0 && (
        <span>
          {lockedIds.size} lock{lockedIds.size > 1 ? "s" : ""}
        </span>
      )}
      {intervention && (
        <span className="plan-state-assumption">
          assumption: {data.areas.find((area) => area.id === intervention.areaId)?.name ?? ""}{" "}
          cleared
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
    guardEnabled,
    plan,
    setBudgetHours,
    setCoveragePolicy,
  } = useShell();
  return (
    <>
      <div
        className="coverage-policy"
        aria-label="Coverage-continuity floor sensitivity"
        role="group"
      >
        <div>
          <span className="eyebrow">You set this · the tool never picks it</span>
          <strong>Guaranteed minimum hours for every neighborhood</strong>
        </div>
        <div className="floor-options">
          {[0, 4, 8].map((floor) => (
            <button
              aria-pressed={floor === 0 ? !guardEnabled : guardEnabled && coverageFloor === floor}
              className={`floor-option ${floor === 0 ? (!guardEnabled ? "active" : "") : guardEnabled && coverageFloor === floor ? "active" : ""}`}
              key={floor}
              onClick={() => setCoveragePolicy(floor)}
              type="button"
            >
              <strong>{floor}h</strong>
              <span>{floor === 0 ? "no minimum" : floor === 8 ? "default" : "compare"}</span>
            </button>
          ))}
        </div>
      </div>
      <p aria-live="polite" className="policy-lens">
        <strong>Policy lens:</strong>{" "}
        {coverageFloor === 0
          ? "with no minimum, hours follow the forecast alone. Use this to see which neighborhoods would be left with almost nothing; it is a comparison view, not a recommendation."
          : `${data.areas.length * coverageFloor} of ${budget} hours are set aside first (${coverageFloor} per neighborhood); the rest follows the forecast.`}
      </p>

      {plan && (
        <div className="whatif-control">
          <label htmlFor="whatif-budget">
            <span className="eyebrow">What-if · drag to stress-test the budget</span>
          </label>
          <div className="whatif-row">
            <input
              aria-describedby="whatif-help"
              id="whatif-budget"
              max={MAX_BUDGET_HOURS}
              min="0"
              onChange={(event) => setBudgetHours(Number(event.target.value))}
              step="1"
              type="range"
              value={budgetValid ? budget : 0}
            />
            <output aria-live="off" htmlFor="whatif-budget">
              {budget}h
            </output>
          </div>
          <p id="whatif-help">
            Recomputes live under the same floors and locks. Watch the map and bars; when the budget
            cannot cover the floors and locks, the tool says so instead of silently repairing the
            plan.
          </p>
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
  return (
    <div className="scenario-bench">
      <div className="scenario-bench-head">
        <span className="eyebrow">Scenario workbench · saved only in this browser</span>
        <button
          className="button button-quiet"
          disabled={!planReady}
          onClick={saveScenario}
          type="button"
        >
          Save scenario
        </button>
      </div>
      {scenarios.length === 0 ? (
        <p className="scenario-empty">
          Save this plan, change the policy, then compare the two side by side.
        </p>
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
                {compareId === scenario.id ? "Comparing" : "Compare"}
              </button>
              <button
                aria-label={`Delete scenario ${scenario.name}`}
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
          {compareById ? (
            <>
              Comparing with <strong>{compareScenario.name}</strong> — each area shows how many
              hours the current plan shifts against it.
            </>
          ) : (
            <>
              <strong>{compareScenario.name}</strong> is infeasible against the current data, so no
              comparison is shown.
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function PlannerStart() {
  const { budget, budgetValid, coverageFloor, data, runPlan } = useShell();
  return (
    <div className="planner-start">
      <div className="constraint-equation">
        <span>
          {budget}
          <small>available</small>
        </span>
        <b>=</b>
        <span>
          {data.areas.length * coverageFloor}
          <small>guaranteed minimums</small>
        </span>
        <b>+</b>
        <span>
          {Math.max(0, budget - data.areas.length * coverageFloor)}
          <small>follow the forecast</small>
        </span>
      </div>
      <button
        className="button button-primary button-large"
        disabled={!budgetValid}
        onClick={() => runPlan()}
        type="button"
      >
        <SparkIcon /> Generate coverage scenario
      </button>
      {!budgetValid && (
        <p className="budget-invalid" role="status">
          Enter a whole number of hours between 0 and {MAX_BUDGET_HOURS} to generate a plan.
        </p>
      )}
    </div>
  );
}

export function PlanRows() {
  const {
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
    plan,
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
  if (!plan?.feasible) return null;
  return (
    <>
      <div className="plan-toolbar">
        <p>
          <strong>
            {planTotal}/{budget} hours allocated.
          </strong>{" "}
          {plan.message}
        </p>
        <div>
          <button
            className={`button ${guardEnabled ? "button-audit" : "button-primary"}`}
            onClick={() => setGuard(!guardEnabled)}
            type="button"
          >
            {guardEnabled
              ? "Compare with no minimum"
              : `Restore the ${coverageFloor || DEFAULT_COVERAGE_FLOOR}h minimum`}
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
            Reset locks
          </button>
        </div>
      </div>

      {!guardEnabled && (
        <div className="audit-banner" role="status">
          <strong>Comparison view, not a recommendation.</strong>{" "}
          {coverageFloor > 0
            ? `With no minimum enforced, areas below ${coverageFloor}h would lose their guaranteed visit.`
            : "This shows what happens with no guaranteed minimum: some neighborhoods get almost nothing."}
        </div>
      )}

      {intervention && interventionResult && (
        <div className="intervention-banner" role="status">
          <div>
            <strong>
              Assumption explorer:{" "}
              {data.areas.find((area) => area.id === intervention.areaId)?.name ??
                intervention.areaId}{" "}
              modeled as cleared.
            </strong>{" "}
            Under your assumption, {formatNumber(intervention.share * 100)}% of its planning load (
            {formatNumber(interventionResult.shifted, 1)}) shifts to adjacent areas and{" "}
            {formatNumber(interventionResult.assumedResolved, 1)} is assumed resolved — assumed, not
            observed.
            {interventionHourChurn !== null
              ? ` The plan reallocates ${formatNumber(interventionHourChurn, 1)} staff-hours in response.`
              : ""}{" "}
            The counts cannot show who moves where or why, so this explores your stated assumption;
            it is not a prediction and does not endorse the action.
          </div>
          <button
            className="button button-quiet"
            onClick={() => setInterventionScenario(null)}
            type="button"
          >
            Clear assumption
          </button>
        </div>
      )}

      <div className="area-accuracy-warning" role="note">
        <strong>Illustrative and human-review-only.</strong> Aggregate audit WAPE is{" "}
        {formatNumber(data.forecast.wape, 1)}%.{" "}
        {auditedAreas.length
          ? `Area-level held-out WAPE ranges ${formatNumber(Math.min(...auditedAreaWapes), 1)}%–${formatNumber(Math.max(...auditedAreaWapes), 1)}%; small areas are noisier.`
          : "Area-level held-out WAPE is unavailable in this artifact."}{" "}
        The aggregate score does not imply equal area accuracy; a coordinator must review every
        assignment.
      </div>

      <div
        className={`allocation-list ${compareById ? "with-compare" : ""}`}
        role="list"
        aria-label="Illustrative staff-hour allocation"
      >
        {planningAreas.map((area) => {
          const hours = allocationById.get(area.id) ?? 0;
          const locked = lockedIds.has(area.id);
          const belowFloor = hours < coverageFloor;
          return (
            <article
              className={`allocation-row ${belowFloor ? "below-floor" : ""} ${selectedAreaId === area.id ? "is-selected" : ""}`}
              key={area.id}
              role="listitem"
            >
              <div className="area-name">
                <strong>{area.name}</strong>
                <span>
                  Planning for up to {formatNumber(area.planningLoad, 1)} observations ·{" "}
                  {locked
                    ? `human lock at ${hours}h`
                    : guardEnabled
                      ? `${Math.min(hours, coverageFloor)}h minimum + ${Math.max(0, hours - coverageFloor)}h forecast share`
                      : `${hours}h forecast share, no minimum`}
                  {(unmetByArea.get(area.id) ?? 0) > 0
                    ? ` · ${unmetByArea.get(area.id)}h moved away by the floor`
                    : ""}
                </span>
              </div>
              <div aria-hidden="true" className="allocation-bar-track">
                <i style={{ width: `${(hours / maxHours) * 100}%` }} />
              </div>
              <label className="hours-input">
                <span className="sr-only">Hours for {area.name}</span>
                <input
                  aria-label={`Hours for ${area.name}`}
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
                <span>h</span>
              </label>
              <label className="lock-control">
                <input
                  aria-label={`Lock ${area.name} at ${hours} hours`}
                  checked={locked}
                  onChange={() => toggleLock(area.id)}
                  type="checkbox"
                />
                <span>{locked ? "Locked" : "Lock"}</span>
              </label>
              <span
                className={`constraint-chip ${belowFloor ? "constraint-fail" : "constraint-pass"}`}
              >
                {!guardEnabled
                  ? "No minimum"
                  : belowFloor
                    ? "Below minimum"
                    : `${coverageFloor}h minimum met`}
              </span>
              {compareById && (
                <span
                  className={`compare-delta ${
                    hours - (compareById.get(area.id) ?? 0) > 0
                      ? "delta-up"
                      : hours - (compareById.get(area.id) ?? 0) < 0
                        ? "delta-down"
                        : "delta-same"
                  }`}
                >
                  {hours - (compareById.get(area.id) ?? 0) > 0
                    ? `+${hours - (compareById.get(area.id) ?? 0)}h vs saved`
                    : hours - (compareById.get(area.id) ?? 0) < 0
                      ? `${hours - (compareById.get(area.id) ?? 0)}h vs saved`
                      : "same as saved"}
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
  return (
    selectedArea && (
      <div className="intervention-control">
        <div>
          <span className="eyebrow">Stress-test an action · assumption explorer</span>
          <p>
            What if {selectedArea.name} were cleared? The counts cannot show who moves where or why,
            so you state the assumption and the plan shows its consequences. Clearing an area adds
            no shelter capacity.
          </p>
        </div>
        <label htmlFor="displaced-share">
          Assumed share of its planning load that shifts to adjacent areas instead of being resolved
        </label>
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
              Clear assumption
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
              Explore this assumption
            </button>
          )}
        </div>
      </div>
    )
  );
}

export function BriefCluster() {
  const { budget, copyBrief, copyStatus, decisionBrief, planReady } = useShell();
  return (
    <>
      <details className="data-table-disclosure capacity-context">
        <summary>Capacity context: staff-hours in staffing terms</summary>
        <p>
          The assumed {formatNumber(budget)}-hour budget equals {formatNumber(budget / 40, 1)}{" "}
          forty-hour staff-weeks. The budget, and the forty-hour week used to restate it, are stated
          assumptions, not staffing data.
        </p>
        <p>
          For scale only: HUD case-management guidance suggests roughly 20 to 30 clients per case
          manager for housing-focused navigation and 10 to 12 for intensive support (HUD, Homeless
          System Response: Case Management Ratios, HUD Exchange). That guidance describes
          community-based case management, not street outreach; no street-outreach caseload standard
          appears in the primary federal guidance we reviewed, and HUD publishes these ratios as
          planning help, not binding rules.
        </p>
        <p>
          Locally: a City of San Diego public-records release includes a 2023-era Alpha Project
          shelter proposal that contracts case management at one worker per 15 single adults and one
          per 12.5 families. Those are proposed shelter staffing ratios, not street outreach and not
          observed practice (City PRA release, pinned in the source ledger).
        </p>
        <p>
          These benchmarks are context for a capacity conversation only. No benchmark number enters
          the allocation, and nothing here estimates any person&apos;s service need, eligibility, or
          availability.
        </p>
      </details>
      <div className="brief-action">
        <div>
          <span className="eyebrow">Portable output</span>
          <p>
            Copies the allocation with source, model, constraints, caveats, and human changes
            attached.
          </p>
        </div>
        <button
          className="button button-primary button-large"
          disabled={!planReady}
          onClick={copyBrief}
          type="button"
        >
          Copy decision brief
        </button>
      </div>
      {copyStatus && (
        <p className="copy-status" role="status">
          {copyStatus}
        </p>
      )}
      {copyStatus && (
        <details className="brief-preview" open>
          <summary>Full decision brief</summary>
          <pre>{decisionBrief}</pre>
        </details>
      )}

      <ShareLink />

      <ExportActions />
    </>
  );
}
