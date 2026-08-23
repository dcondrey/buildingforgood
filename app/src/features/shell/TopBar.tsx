import { SparkIcon } from "../../components/Icons";
import { CurrencyBadge } from "../currency/CurrencyBadge";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import { LOCALES, LOCALE_LABEL } from "../../i18n/locale";

export function TopBar() {
  const {
    beginGuide,
    budget,
    budgetValid,
    data,
    deployment,
    disclosuresOpen,
    guideUsed,
    projectorMode,
    setBudgetHours,
    setDisclosuresOpen,
    setProjectorMode,
    switchView,
    view,
  } = useShell();
  const { t, locale, setLocale } = useTranslation();
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div aria-hidden="true" className="brand-mark">
          SH
        </div>
        <div>
          <strong>
            Still Here <span>SD</span>
          </strong>
          <small>{t("topbar.tagline")}</small>
        </div>
      </div>
      <div className="decision-controls">
        <div className="header-context">
          <span className="eyebrow">{t("topbar.decisionHorizon")}</span>
          <strong>{data.scenario.decisionHorizon}</strong>
        </div>
        <CurrencyBadge />
        {/* The accessible name is the visible label, not a second wording of
            it (WCAG 2.5.3): aria-labelledby points at the text on screen so a
            voice-control user can say what they can read. */}
        <label className="budget-control" htmlFor="budget-hours">
          <span className="eyebrow" id="budget-label">
            {t("topbar.availableStaffHours")}
          </span>
          <span className="budget-input-wrap">
            <input
              aria-describedby="budget-help"
              aria-invalid={!budgetValid}
              aria-labelledby="budget-label"
              id="budget-hours"
              inputMode="numeric"
              max={deployment.maxBudget}
              min={deployment.minBudget}
              step={deployment.allocationIncrement}
              onChange={(event) => setBudgetHours(Number(event.target.value))}
              type="number"
              value={budget}
            />
            <span>{t("topbar.hours")}</span>
          </span>
          <span className="sr-only" id="budget-help">
            {t("topbar.budgetHelp", { min: deployment.minBudget, max: deployment.maxBudget })}
          </span>
        </label>
        <div aria-label={t("topbar.view")} className="view-toggle" role="group">
          <button
            aria-controls="main-content"
            aria-pressed={view === "story"}
            className={view === "story" ? "active" : ""}
            onClick={() => switchView("story")}
            type="button"
          >
            {t("topbar.viewStory")}
          </button>
          <button
            aria-controls="main-content"
            aria-pressed={view === "workspace"}
            className={view === "workspace" ? "active" : ""}
            onClick={() => switchView("workspace")}
            type="button"
          >
            {t("topbar.viewWorkspace")}
          </button>
        </div>
        {/* Each language names itself, because a reader who cannot read the
            current language cannot read a translated name for their own. */}
        <div aria-label={t("topbar.language")} className="view-toggle locale-toggle" role="group">
          {LOCALES.map((option) => (
            <button
              aria-pressed={locale === option}
              className={locale === option ? "active" : ""}
              key={option}
              lang={option}
              onClick={() => setLocale(option)}
              type="button"
            >
              {LOCALE_LABEL[option]}
            </button>
          ))}
        </div>
        <button
          className={`button button-quiet guide-button ${guideUsed ? "" : "guide-button-new"}`}
          onClick={beginGuide}
          type="button"
        >
          <SparkIcon /> {t("topbar.guide")}
        </button>
        <button
          aria-pressed={projectorMode}
          className={`button button-quiet projector-toggle ${projectorMode ? "is-active" : ""}`}
          onClick={() => setProjectorMode((mode) => !mode)}
          type="button"
        >
          {projectorMode ? t("topbar.exitProjector") : t("topbar.projectorMode")}
        </button>
        <button
          aria-expanded={disclosuresOpen}
          aria-controls="disclosures"
          className="button button-quiet"
          onClick={() => setDisclosuresOpen((open) => !open)}
          type="button"
        >
          {t("topbar.dataAndLimits")}
        </button>
      </div>
    </header>
  );
}
