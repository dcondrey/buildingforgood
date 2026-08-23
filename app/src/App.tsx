import "./App.css";
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
  const { disclosuresOpen, guideIndex, locale, projectorMode, view } = shell;
  return (
    <ShellProvider value={shell}>
      <div className={`app-shell ${projectorMode ? "projector-mode" : ""}`}>
        <a className="skip-link" href={view === "workspace" ? "#workspace" : "#drop-test"}>
          {translate(locale, "app.skipToDecision")}
        </a>

        <TopBar />

        <ShareRefusalNotice />

        {disclosuresOpen && <DisclosurePanel />}

        {view === "workspace" && <WorkspaceView />}

        {view === "story" && (
          <main>
            <HeroSection />

            <DropTestSection />

            <ForecastSection />

            <PlannerSection />

            <ReviewSection />

            <SiteFooter />
          </main>
        )}

        {guideIndex !== null && <GuidePanel />}
      </div>
    </ShellProvider>
  );
}

export default App;
