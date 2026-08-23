import { BriefCluster } from "../../features/planner/PlannerPieces";
import { useShell } from "../../features/shell/ShellContext";
import { formatNumber } from "../../lib/format";

export function ReviewSection() {
  const {
    budget,
    coverageFloor,
    data,
    guardEnabled,
    lockedIds,
    plan,
    planDirty,
    planReady,
    planTotal,
    signal,
  } = useShell();
  return (
    <section className="decision-section review-section" id="review" aria-labelledby="review-title">
      <div aria-hidden="true" className="section-number">
        04
      </div>
      <div className="section-intro split-intro">
        <div>
          <p className="eyebrow">You decide</p>
          <h2 id="review-title">Review before the next shift</h2>
          <p>
            The tool writes the plan up with its caveats attached. A coordinator decides what local
            context changes.
          </p>
        </div>
        <span className={`review-status ${planReady ? "review-ready" : ""}`}>
          {planReady
            ? "Ready for coordinator review"
            : plan?.feasible && !guardEnabled
              ? "Comparison view · restore a minimum to continue"
              : plan?.feasible && planTotal !== budget
                ? "Budget mismatch · cannot copy"
                : planDirty
                  ? "Recompute human changes"
                  : "Waiting for a feasible plan"}
        </span>
      </div>

      <div className="brief-grid">
        <div className="brief-summary">
          <div>
            <span>What changed</span>
            <strong>
              Individuals +{formatNumber(signal.components.individuals.changePct, 1)}% · structures{" "}
              {formatNumber(signal.components.structures.changePct, 1)}%
            </strong>
          </div>
          <div>
            <span>What may be hidden</span>
            <strong>
              Active blocks +{signal.activeChange}
              {signal.distributionSensitivity
                ? ` · HHI +${formatNumber(signal.distributionSensitivity.hhiChangePct, 1)}%`
                : ""}
            </strong>
          </div>
          <div>
            <span>Historical Jan 2026 range</span>
            <strong>
              {formatNumber(data.forecast.lower)}–{formatNumber(data.forecast.upper)}
            </strong>
          </div>
          <div>
            <span>Illustrative capacity</span>
            <strong>{plan?.feasible ? `${planTotal} staff-hours` : "Run planner"}</strong>
          </div>
          <div>
            <span>Coverage-continuity policy</span>
            <strong>
              {guardEnabled
                ? `${coverageFloor}h demo-policy minimum`
                : "No minimum · comparison only"}
            </strong>
          </div>
          <div>
            <span>Human overrides</span>
            <strong>{lockedIds.size || "None"}</strong>
          </div>
        </div>

        <div className="review-triggers">
          <span className="eyebrow">Review again when</span>
          <div className="trigger-list">
            <span>New month</span>
            <span>Budget changes</span>
            <span>Boundary changes</span>
            <span>Interval widens</span>
            <span>Floor infeasible</span>
            <span>Local knowledge conflicts</span>
          </div>
          <p>
            <strong>Never authorized:</strong> person tracking, causal claims, enforcement,
            eligibility decisions, or automatic dispatch.
          </p>
        </div>
      </div>

      <div className="limitations-row">
        {data.limitations.slice(0, 3).map((limitation, index) => (
          <details key={limitation}>
            <summary>
              {["Boundary card", "Model card", "Claim limits"][index] ?? "Limitation"}
            </summary>
            <p>{limitation}</p>
          </details>
        ))}
      </div>

      <BriefCluster />
    </section>
  );
}
