import { CheckIcon } from "../../components/Icons";
import { useShell } from "../../features/shell/ShellContext";

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
        Step {guideIndex + 1} of {guideSteps.length} · ← → keys · Esc stops
      </p>
      <h2 id="guide-title">{guideSteps[guideIndex].title}</h2>
      <p>{guideSteps[guideIndex].body}</p>
      {guideSteps[guideIndex].task && (
        <p className="guide-task">
          {stepComplete(guideIndex) ? (
            <>
              <CheckIcon /> Done — press Next to continue.
            </>
          ) : (
            <>
              <strong>Your turn:</strong> {guideSteps[guideIndex].task}
            </>
          )}
        </p>
      )}
      <div className="guide-actions">
        <button className="button button-quiet" onClick={stopGuide} type="button">
          Stop
        </button>
        <button
          aria-pressed={guideAuto}
          className="button button-quiet"
          onClick={() => setGuideAuto((auto) => !auto)}
          type="button"
        >
          {guideAuto ? "Pause" : "Play"}
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
          Back
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
            ? "Finish"
            : guideSteps[guideIndex].task && !stepComplete(guideIndex)
              ? "Do it for me"
              : "Next"}
        </button>
      </div>
    </div>
  );
}
