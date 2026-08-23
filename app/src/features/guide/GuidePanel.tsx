import { CheckIcon } from "../../components/Icons";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function GuidePanel() {
  const {
    advanceGuide,
    guideAuto,
    guideIndex,
    guidePanel,
    guideSteps,
    retreatGuide,
    setGuideAuto,
    stepComplete,
    stopGuide,
  } = useShell();
  const { t } = useTranslation();
  if (guideIndex === null) return null;
  return (
    <div
      className="guide-panel"
      role="dialog"
      aria-labelledby="guide-title"
      aria-live="polite"
      ref={guidePanel}
      tabIndex={-1}
    >
      <div className="guide-progress">
        <span style={{ width: `${((guideIndex + 1) / guideSteps.length) * 100}%` }} />
      </div>
      <p className="eyebrow guide-step-count">
        {t("guide.stepCount", { step: guideIndex + 1, total: guideSteps.length })}
      </p>
      <h2 id="guide-title">{guideSteps[guideIndex].title}</h2>
      <p>{guideSteps[guideIndex].body}</p>
      {guideSteps[guideIndex].task && (
        <p className="guide-task">
          {stepComplete(guideIndex) ? (
            <>
              <CheckIcon /> {t("guide.done")}
            </>
          ) : (
            <>
              <strong>{t("guide.yourTurn")}</strong> {guideSteps[guideIndex].task}
            </>
          )}
        </p>
      )}
      <div className="guide-actions">
        <button className="button button-quiet" onClick={stopGuide} type="button">
          {t("guide.stop")}
        </button>
        <button
          aria-pressed={guideAuto}
          className="button button-quiet"
          onClick={() => setGuideAuto((auto) => !auto)}
          type="button"
        >
          {guideAuto ? t("guide.pause") : t("guide.play")}
        </button>
        <button
          className="button button-quiet"
          disabled={guideIndex === 0}
          onClick={() => {
            setGuideAuto(false);
            retreatGuide();
          }}
          type="button"
        >
          {t("guide.back")}
        </button>
        <button
          className="button button-primary"
          onClick={() => {
            setGuideAuto(false);
            advanceGuide();
          }}
          type="button"
        >
          {guideIndex === guideSteps.length - 1
            ? t("guide.finish")
            : guideSteps[guideIndex].task && !stepComplete(guideIndex)
              ? t("guide.doItForMe")
              : t("guide.next")}
        </button>
      </div>
    </div>
  );
}
