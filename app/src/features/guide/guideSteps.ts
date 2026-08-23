import type { Translator } from "../../i18n/context";
import type { DemoData } from "../../lib/demo";

// The guide is hands-on onboarding, not a slideshow: each step asks the
// viewer to work the real control, watches the app state to see that they
// did, and only performs the action itself if they ask ("Do it for me") or
// hands-free playback is on. Copy interpolates the loaded artifact so the
// numbers on the panel always match the numbers on screen, including in the
// embedded offline fallback — and it comes from the catalogue, so the tour
// narrates in whatever language the viewer is reading.
export type GuideStep = {
  id:
    | "reveal"
    | "evidence"
    | "forecast"
    | "generate"
    | "compare"
    | "restore"
    | "lock"
    | "explore"
    | "audit"
    | "brief";
  title: string;
  body: string;
  targetId: string;
  /** The action the viewer is asked to take; absent on read-only steps. */
  task?: string;
};

/**
 * The catalogue, the number formatter, and the place words of whichever
 * organization profile is running — passed in rather than imported so the
 * guide narrates the geography and the language actually on screen.
 */
export interface GuideContext {
  t: Translator["t"];
  number: Translator["number"];
  places: Record<string, string>;
  coverageFloor: number;
}

export function buildGuideSteps(data: DemoData, context: GuideContext): GuideStep[] {
  const { t, number, places } = context;
  const individuals = data.signal.components.individuals;
  const structures = data.signal.components.structures;
  const individualSpatial = data.signal.componentDistribution?.components.find(
    (component) => component.id === "individuals",
  );
  const individualOne = individualSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 1,
  );
  const forecast = data.forecast;
  const firstArea = data.areas[0]?.name ?? t("guide.firstArea");
  return [
    {
      id: "reveal",
      title: t("guide.revealTitle"),
      targetId: "drop-test",
      task: t("guide.revealTask"),
      body: t("guide.revealBody"),
    },
    {
      id: "evidence",
      title: t("guide.evidenceTitle"),
      targetId: "evidence-result",
      body:
        t("guide.evidenceBody", {
          indFrom: number(individuals.from),
          indTo: number(individuals.to),
          indPct: number(individuals.changePct, 1),
          strFrom: number(structures.from),
          strTo: number(structures.to),
        }) +
        (individualOne
          ? t("guide.evidenceBlocks", {
              from: number(individualOne.fromBlocks),
              to: number(individualOne.toBlocks),
            })
          : "") +
        t("guide.evidenceTail"),
    },
    {
      id: "forecast",
      title: t("guide.forecastTitle"),
      targetId: "forecast",
      body: t("guide.forecastBody", {
        point: number(forecast.point, 1),
        period: forecast.targetPeriod,
        lower: number(forecast.lower),
        upper: number(forecast.upper, 1),
        coverage: number(forecast.coverage),
      }),
    },
    {
      id: "generate",
      title: t("guide.generateTitle"),
      targetId: "planner",
      body: t("guide.generateBody", { ...places, budget: data.scenario.defaultBudget }),
    },
    {
      id: "compare",
      title: t("guide.compareTitle"),
      targetId: "planner",
      task: t("guide.compareTask"),
      body: t("guide.compareBody", places),
    },
    {
      id: "restore",
      title: t("guide.restoreTitle"),
      targetId: "planner",
      task: t("guide.restoreTask", { floor: context.coverageFloor }),
      body: t("guide.restoreBody", places),
    },
    {
      id: "lock",
      title: t("guide.lockTitle"),
      targetId: "planner",
      task: t("guide.lockTask", { ...places, area: firstArea }),
      body: t("guide.lockBody"),
    },
    {
      id: "explore",
      title: t("guide.exploreTitle"),
      targetId: "planner",
      task: t("guide.exploreTask", places),
      body: t("guide.exploreBody"),
    },
    {
      id: "audit",
      title: t("guide.auditTitle"),
      targetId: "digitization-audit",
      body: t("guide.auditBody"),
    },
    {
      id: "brief",
      title: t("guide.briefTitle"),
      targetId: "review",
      task: t("guide.briefTask"),
      body: t("guide.briefBody"),
    },
  ];
}
