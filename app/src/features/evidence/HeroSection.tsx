import { EvidenceChain } from "../../features/evidence/EvidenceChain";
import { PlanState } from "../../features/planner/PlannerPieces";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function HeroSection() {
  const { budget, data, individualOne, loading, plan, signal } = useShell();
  const { t, tx, number } = useTranslation();
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="status-line">
            <i className="status-dot" />{" "}
            {loading
              ? t("hero.verifying")
              : data.origin === "generated"
                ? t("hero.generated")
                : t("hero.offline")}
          </span>
          <p className="kicker">
            {t("hero.kicker", {
              focusArea: data.scenario.focusArea,
              period: data.scenario.period,
            })}
          </p>
          <h1 id="hero-title">{tx("hero.title")}</h1>
          <p className="hero-lede">{t("hero.lede")}</p>
          <div className="composition-lead" aria-label={t("hero.compositionAria")} role="group">
            <div>
              <span>{t("hero.peopleSeen")}</span>
              <strong>+{number(signal.components.individuals.changePct, 1)}%</strong>
              <small>
                {signal.components.individuals.from} → {signal.components.individuals.to}
              </small>
            </div>
            <div>
              <span>{t("hero.tents")}</span>
              <strong>{number(signal.components.structures.changePct, 1)}%</strong>
              <small>
                {signal.components.structures.from} → {signal.components.structures.to}
              </small>
            </div>
            <div>
              <span>{t("hero.vehicles")}</span>
              <strong>{number(signal.components.vehicles.changePct, 1)}%</strong>
              <small>
                {signal.components.vehicles.from} → {signal.components.vehicles.to}
              </small>
            </div>
            <div>
              <span>
                {individualOne ? t("hero.blocksWherePeopleSeen") : t("hero.activeBlocks")}
              </span>
              <strong>
                +
                {individualOne
                  ? number((individualOne.change / individualOne.fromBlocks) * 100, 1)
                  : number(signal.activeChangePct, 1)}
                %
              </strong>
              <small>
                {individualOne?.fromBlocks ?? signal.activeFrom} →{" "}
                {individualOne?.toBlocks ?? signal.activeTo}
              </small>
            </div>
            <p>{t("hero.samePanel", { panel: signal.panelSize })}</p>
          </div>
        </div>
        <div aria-label={t("hero.decisionAria")} className="hero-decision" role="group">
          <span className="eyebrow">{t("hero.decisionEyebrow")}</span>
          <p>{tx("hero.decisionQuestion", { hours: budget })}</p>
          <p className="capacity-note">{t("hero.capacityNote")}</p>
          <div className="provisional-note">
            <span>
              {data.scenario.status === "ready" ? t("hero.prepared") : t("hero.provisional")}
            </span>{" "}
            {t("hero.travels")}
          </div>
          <EvidenceChain data={data} />
        </div>
      </section>

      <nav aria-label={t("nav.aria")} className="step-nav">
        <a href="#drop-test">
          <span>01</span> {t("nav.testTheDrop")}
        </a>
        <a href="#forecast">
          <span>02</span> {t("nav.checkTheForecast")}
        </a>
        <a href="#planner">
          <span>03</span> {t("nav.planTheShift")}
        </a>
        <a href="#review">
          <span>04</span> {t("nav.humanReview")}
        </a>
        {plan?.feasible && <PlanState />}
      </nav>
    </>
  );
}
