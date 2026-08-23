import { BriefCluster } from "../../features/planner/PlannerPieces";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

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
  const { t, tx, number } = useTranslation();
  const limitationLabels = [
    t("review.boundaryCard"),
    t("review.modelCard"),
    t("review.claimLimits"),
  ];
  return (
    <section className="decision-section review-section" id="review" aria-labelledby="review-title">
      <div aria-hidden="true" className="section-number">
        04
      </div>
      <div className="section-intro split-intro">
        <div>
          <p className="eyebrow">{t("review.eyebrow")}</p>
          <h2 id="review-title">{t("review.title")}</h2>
          <p>{t("review.intro")}</p>
        </div>
        <span className={`review-status ${planReady ? "review-ready" : ""}`}>
          {planReady
            ? t("review.statusReady")
            : plan?.feasible && !guardEnabled
              ? t("review.statusComparison")
              : plan?.feasible && planTotal !== budget
                ? t("review.statusMismatch")
                : planDirty
                  ? t("review.statusDirty")
                  : t("review.statusWaiting")}
        </span>
      </div>

      <div className="brief-grid">
        <div className="brief-summary">
          <div>
            <span>{t("review.whatChanged")}</span>
            <strong>
              {t("review.whatChangedValue", {
                individuals: number(signal.components.individuals.changePct, 1),
                structures: number(signal.components.structures.changePct, 1),
              })}
            </strong>
          </div>
          <div>
            <span>{t("review.whatMayBeHidden")}</span>
            <strong>
              {signal.distributionSensitivity
                ? t("review.activeBlocksWithHhi", {
                    change: signal.activeChange,
                    hhi: number(signal.distributionSensitivity.hhiChangePct, 1),
                  })
                : t("review.activeBlocks", { change: signal.activeChange })}
            </strong>
          </div>
          <div>
            <span>{t("review.historicalRange")}</span>
            <strong>
              {t("review.rangeValue", {
                lower: number(data.forecast.lower),
                upper: number(data.forecast.upper),
              })}
            </strong>
          </div>
          <div>
            <span>{t("review.illustrativeCapacity")}</span>
            <strong>
              {plan?.feasible
                ? t("review.capacityValue", { hours: planTotal })
                : t("review.runPlanner")}
            </strong>
          </div>
          <div>
            <span>{t("review.coveragePolicy")}</span>
            <strong>
              {guardEnabled
                ? t("review.floorValue", { floor: coverageFloor })
                : t("review.noFloorValue")}
            </strong>
          </div>
          <div>
            <span>{t("review.humanOverrides")}</span>
            <strong>{lockedIds.size || t("review.none")}</strong>
          </div>
        </div>

        <div className="review-triggers">
          <span className="eyebrow">{t("review.triggersEyebrow")}</span>
          <div className="trigger-list">
            <span>{t("review.triggerNewMonth")}</span>
            <span>{t("review.triggerBudget")}</span>
            <span>{t("review.triggerBoundary")}</span>
            <span>{t("review.triggerInterval")}</span>
            <span>{t("review.triggerFloor")}</span>
            <span>{t("review.triggerLocal")}</span>
          </div>
          <p>{tx("review.neverAuthorized")}</p>
        </div>
      </div>

      {/* The artifact's own limitation sentences, rendered unedited. */}
      <div className="limitations-row">
        {data.limitations.slice(0, 3).map((limitation, index) => (
          <details key={limitation}>
            <summary>{limitationLabels[index] ?? t("review.limitation")}</summary>
            <p lang="en">{limitation}</p>
          </details>
        ))}
      </div>

      <BriefCluster />
    </section>
  );
}
