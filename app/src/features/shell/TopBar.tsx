import { SparkIcon } from "../../components/Icons";
import { useShell } from "../../features/shell/ShellContext";
import { MAX_BUDGET_HOURS } from "../../lib/constants";

export function TopBar() {
  const {
    beginGuide,
    budget,
    data,
    disclosuresOpen,
    guideUsed,
    projectorMode,
    setBudgetHours,
    setDisclosuresOpen,
    setProjectorMode,
    switchView,
    view,
  } = useShell();
  return (
    <header className="topbar" id="main-content">
      <div className="brand-lockup">
        <div aria-hidden="true" className="brand-mark">
          SH
        </div>
        <div>
          <strong>
            Still Here <span>SD</span>
          </strong>
          <small>Outreach continuity planner</small>
        </div>
      </div>
      <div className="decision-controls">
        <div className="header-context">
          <span className="eyebrow">Decision horizon</span>
          <strong>{data.scenario.decisionHorizon}</strong>
        </div>
        <label className="budget-control" htmlFor="budget-hours">
          <span className="eyebrow">Available capacity</span>
          <span className="budget-input-wrap">
            <input
              aria-label="Available staff-hours"
              aria-describedby="budget-help"
              id="budget-hours"
              inputMode="numeric"
              max={MAX_BUDGET_HOURS}
              min="0"
              step="1"
              onChange={(event) => setBudgetHours(Number(event.target.value))}
              type="number"
              value={budget}
            />
            <span>hours</span>
          </span>
          <span className="sr-only" id="budget-help">
            Enter a whole number from 0 to 400. This is a demonstration scenario, not staffing
            capacity data.
          </span>
        </label>
        <div aria-label="View" className="view-toggle" role="group">
          <button
            aria-pressed={view === "story"}
            className={view === "story" ? "active" : ""}
            onClick={() => switchView("story")}
            type="button"
          >
            Story
          </button>
          <button
            aria-pressed={view === "workspace"}
            className={view === "workspace" ? "active" : ""}
            onClick={() => switchView("workspace")}
            type="button"
          >
            Map workspace
          </button>
        </div>
        <button
          className={`button button-quiet guide-button ${guideUsed ? "" : "guide-button-new"}`}
          onClick={beginGuide}
          type="button"
        >
          <SparkIcon /> Guide demo
        </button>
        <button
          aria-pressed={projectorMode}
          className={`button button-quiet projector-toggle ${projectorMode ? "is-active" : ""}`}
          onClick={() => setProjectorMode((mode) => !mode)}
          type="button"
        >
          {projectorMode ? "Exit projector" : "Projector mode"}
        </button>
        <button
          aria-expanded={disclosuresOpen}
          aria-controls="disclosures"
          className="button button-quiet"
          onClick={() => setDisclosuresOpen((open) => !open)}
          type="button"
        >
          Data & limits
        </button>
      </div>
    </header>
  );
}
