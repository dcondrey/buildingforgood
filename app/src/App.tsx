import "./App.css";
import { ActualsSection } from "./features/actuals/ActualsSection";
import { DropTestSection } from "./features/evidence/DropTestSection";
import { HeroSection } from "./features/evidence/HeroSection";
import { ReviewSection } from "./features/evidence/ReviewSection";
import { ForecastSection } from "./features/forecast/ForecastSection";
import { GuidePanel } from "./features/guide/GuidePanel";
import { DisclosurePanel } from "./features/shell/DisclosurePanel";
import { PlannerSection } from "./features/planner/PlannerSection";
import { ShareRefusalNotice } from "./features/shell/ShareRefusalNotice";
import { ShellProvider } from "./features/shell/ShellContext";
import { SiteFooter } from "./features/shell/SiteFooter";
import { TopBar } from "./features/shell/TopBar";
import { useShellState } from "./features/shell/useShellState";
import { translate } from "./i18n/translate";
import { WorkspaceView } from "./features/workspace/WorkspaceView";

function App() {
  const shell = useShellState();
  const { disclosuresOpen, guideIndex, guideSteps, locale, projectorMode, view } = shell;
  return (
    <ShellProvider value={shell}>
      <div className={`app-shell ${projectorMode ? "projector-mode" : ""}`}>
        {/* Two bypasses, both landing on an element that takes focus: the
            decision the reader came for, and the whole main landmark for a
            reader who does not want to be skipped past what precedes it. */}
        <a className="skip-link" href={view === "workspace" ? "#main-content" : "#drop-test"}>
          {translate(locale, "app.skipToDecision")}
        </a>

        {view === "story" && (
          <a className="skip-link" href="#main-content">
            {translate(locale, "app.skipToMain")}
          </a>
        )}

        <TopBar />

        <ShareRefusalNotice />

        {disclosuresOpen && <DisclosurePanel />}

        {view === "workspace" && <WorkspaceView />}

        {view === "story" && (
          <main id="main-content" tabIndex={-1}>
            <HeroSection />

            <DropTestSection />

            <ForecastSection />

            <PlannerSection />

            <ActualsSection />

            <ReviewSection />

            <SiteFooter />
          </main>
        )}

        {guideIndex !== null && <GuidePanel />}

        {/* The guide panel takes focus, which announces it. It is deliberately
            not also a live region: that announced it twice and re-read the
            whole panel on every step. This says only what changed, and it
            stays mounted so the region exists before the text arrives. */}
        <p className="sr-only" role="status">
          {guideIndex === null
            ? ""
            : translate(locale, "guide.stepAnnounce", {
                step: guideIndex + 1,
                total: guideSteps.length,
                title: guideSteps[guideIndex].title,
              })}
        </p>
      </div>
    </ShellProvider>
  );
}

export default App;
