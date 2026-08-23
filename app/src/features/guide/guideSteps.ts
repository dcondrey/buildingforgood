import type { DemoData } from "../../lib/demo";
import { formatNumber } from "../../lib/format";

// The guide is hands-on onboarding, not a slideshow: each step asks the
// viewer to work the real control, watches the app state to see that they
// did, and only performs the action itself if they ask ("Do it for me") or
// hands-free playback is on. Copy interpolates the loaded artifact so the
// numbers on the panel always match the numbers on screen, including in the
// embedded offline fallback.
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
 * What the loaded organization profile calls its places, and the floor it
 * ships. Passed in rather than imported so the guide narrates whichever
 * geography is running instead of a hardcoded six.
 */
export interface GuidePlaces {
  countWord: string;
  noun: string;
  nounPlural: string;
  coverageFloor: number;
}

export function buildGuideSteps(data: DemoData, places: GuidePlaces): GuideStep[] {
  const individuals = data.signal.components.individuals;
  const structures = data.signal.components.structures;
  const individualSpatial = data.signal.componentDistribution?.components.find(
    (component) => component.id === "individuals",
  );
  const individualOne = individualSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 1,
  );
  const forecast = data.forecast;
  const firstArea = data.areas[0]?.name ?? "the first area";
  return [
    {
      id: "reveal",
      title: "Start with the question",
      targetId: "drop-test",
      task: "Press “Test the drop”.",
      body: "A coordinator's real question: the headline estimate fell, so is that good news? Open the evidence behind the drop before treating it as an answer.",
    },
    {
      id: "evidence",
      title: "Read what actually moved",
      targetId: "evidence-result",
      body:
        `The parts moved in opposite directions: observed individuals rose from ${formatNumber(individuals.from)} to ${formatNumber(individuals.to)} (+${formatNumber(individuals.changePct, 1)}%) while tents and structures fell from ${formatNumber(structures.from)} to ${formatNumber(structures.to)}.` +
        (individualOne
          ? ` People were seen in more places, not fewer: blocks with at least one observed individual went from ${formatNumber(individualOne.fromBlocks)} to ${formatNumber(individualOne.toBlocks)}.`
          : "") +
        " What dropped was tents. A conventional dashboard reports where a count rose or fell; this tool tests whether the ruler itself changed before anyone acts on it.",
    },
    {
      id: "forecast",
      title: "A forecast rehearsal, not a prophecy",
      targetId: "forecast",
      body: `Everything here is frozen at December 2025. Three simple models compete on rolling held-out months, and the winner projects ${formatNumber(forecast.point, 1)} for ${forecast.targetPeriod} with a historical 80% residual band of ${formatNumber(forecast.lower)}–${formatNumber(forecast.upper, 1)}. That band covered only ${formatNumber(forecast.coverage)}% of past checks — the miss stays on screen instead of becoming false confidence.`,
    },
    {
      id: "generate",
      title: "The plan is already on the table",
      targetId: "planner",
      body: `The tool opened mid-work: ${data.scenario.defaultBudget} assumed staff-hours are already split across the ${places.countWord} ${places.nounPlural} — every area keeps the guaranteed minimum you set, and the rest follows where more people are expected. Change the budget or the floor and it recomputes instantly. It proposes; it never dispatches.`,
    },
    {
      id: "compare",
      title: "See what the minimum protects",
      targetId: "planner",
      task: "Select the “0h · no minimum” floor.",
      body: `With no minimum, hours follow the forecast alone and some ${places.nounPlural} are left with almost nothing. That view is an audit of the tradeoff, never a recommendation.`,
    },
    {
      id: "restore",
      title: "Never leave the audit view on",
      targetId: "planner",
      task: `Select the “${places.coverageFloor}h · default” floor to restore the minimum.`,
      body: `Restoring the minimum guarantees every ${places.noun} keeps a visit. The floor is a visible policy you chose, not something the model learned.`,
    },
    {
      id: "lock",
      title: "Override it like a coordinator",
      targetId: "planner",
      task: `Lock ${places.noun === "area" ? "an" : "a"} ${places.noun} (try ${firstArea}), then press “Recompute unlocked hours”.`,
      body: "Local knowledge outranks the model. A locked line is preserved exactly and disclosed in the brief; recomputing rebalances only the unlocked hours and never silently repairs your choice.",
    },
    {
      id: "explore",
      title: "Stress-test the obvious action",
      targetId: "planner",
      task: `Select ${places.noun === "area" ? "an" : "a"} ${places.noun} on the plan map, then press “Explore this assumption”.`,
      body: "The most reached-for action is a clearance. Here you audit one honestly: you state how much of that area's load shifts next door instead of being resolved, and the plan reacts. No setting makes the need smaller without assuming it away in the open — the data cannot show who moves where, and this tool refuses to pretend otherwise.",
    },
    {
      id: "audit",
      title: "The ruler gets audited too",
      targetId: "digitization-audit",
      body: "Even the measuring instrument gets checked: computer vision reads the scanned field sheets behind the published counts — fully offline — and it catches its own mistakes. Read at one scan resolution, the City Center handwritten total comes back 157; read at another, 152, which is what the sheet shows, and 152 plus 14 tents times 1.75 is 176.5, published 177. Two full readings agree on 97.5 percent of recovered values; the gap is the instrument's own error bar, surfaced instead of hidden. The OCR engine is swappable, so EyePop's hosted abilities drop in with one flag. Vision that audits the instrument, never the people.",
    },
    {
      id: "brief",
      title: "Leave with the brief",
      targetId: "review",
      task: "Press “Copy decision brief”.",
      body: "The brief carries the evidence, the uncertainty, the policy settings, your overrides, and any assumption you explored. No login, no live API, no person-level model, and no LLM behind any number. Aggregate places only: nothing here tracks people, infers movement, or dispatches staff automatically. You decide which ruler governs the next shift.",
    },
  ];
}
