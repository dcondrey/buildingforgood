import { useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_COVERAGE_FLOOR, MAX_BUDGET_HOURS } from "../../lib/constants";
import { EMBEDDED_DEMO, loadDemoData, type DemoData } from "../../lib/demo";
import {
  DEFAULT_LOADED_HOURLY_RATE,
  floorCostSentence,
  formatCurrency,
  formatRate,
  summarizePlanCost,
} from "../../domain/cost/index.ts";
import { formatDate, formatNumber, titleCase } from "../../lib/format";
import { applyIntervention } from "../../lib/intervention";
import { allocateHours, type PlanResult } from "../../lib/planner";
import { buildGuideSteps } from "../guide/guideSteps";
import {
  MAX_SAVED_SCENARIOS,
  readSavedScenarios,
  writeSavedScenarios,
  type SavedScenario,
} from "../planner/scenarioStore";
import type { PlanExportRow } from "../export/planCsv";
import {
  planShareUrl,
  readPlanShareFromSearch,
  type PlanShareState,
} from "../share/planShareState";

/**
 * Every piece of shell state, lifted out of App.tsx unchanged. Sections read
 * it through ShellContext rather than through a prop chain.
 */
export function useShellState() {
  const [data, setData] = useState<DemoData>(EMBEDDED_DEMO);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(EMBEDDED_DEMO.scenario.defaultBudget);
  const [dropRevealed, setDropRevealed] = useState(false);
  const [disclosuresOpen, setDisclosuresOpen] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [guardEnabled, setGuardEnabled] = useState(true);
  const [coverageFloor, setCoverageFloor] = useState(DEFAULT_COVERAGE_FLOOR);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [lockValues, setLockValues] = useState<Record<string, number>>({});
  const [planDirty, setPlanDirty] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const [guideAuto, setGuideAuto] = useState(false);
  const [scenarios, setScenarios] = useState<SavedScenario[]>(readSavedScenarios);
  const [compareId, setCompareId] = useState<string | null>(null);
  // Active clearance assumption (assumption explorer) and the slider's draft
  // share while no assumption is applied. Never persisted: exploratory only.
  const [intervention, setIntervention] = useState<{ areaId: string; share: number } | null>(null);
  const [shareDraft, setShareDraft] = useState(1);
  // First-visit cue on the Guide button: with no presenter in the room, the
  // tour has to advertise itself. Storage failures err toward showing it.
  // Story is the narrative argument; the map workspace is the alternative
  // operations view (one layered map + inspector). The choice persists.
  const [view, setView] = useState<"story" | "workspace">(() => {
    try {
      return localStorage.getItem("stillhere-view") === "workspace" ? "workspace" : "story";
    } catch {
      return "story";
    }
  });
  const [mapLayer, setMapLayer] = useState<"hours" | "change" | "unmet">("hours");
  const [wsTab, setWsTab] = useState<"area" | "plan" | "scenarios" | "brief">("plan");
  const [guideUsed, setGuideUsed] = useState(() => {
    try {
      return localStorage.getItem("stillhere-guide-used") === "1";
    } catch {
      return false;
    }
  });
  // Loaded cost of one staff hour. An operator-set assumption in exactly the
  // sense the displaced share is: the operator states it, the interface labels
  // it, and no plan is computed from it.
  const [loadedHourlyRate, setLoadedHourlyRate] = useState(DEFAULT_LOADED_HOURLY_RATE);
  const [projectorMode, setProjectorMode] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const guidePanel = useRef<HTMLDivElement>(null);
  const guideIndexRef = useRef<number | null>(null);
  // Latest guide handlers for the stable document-level keyboard listener.
  const guideControlsRef = useRef({
    advance: () => undefined as void,
    retreat: () => undefined as void,
    stop: () => undefined as void,
  });
  // Whether the current step's task was already satisfied when the step was
  // entered, so revisiting a finished step (Back) does not instantly bounce
  // forward again.
  const guideEntryCompleteRef = useRef(false);

  useEffect(() => {
    guideIndexRef.current = guideIndex;
  }, [guideIndex]);
  const signal = data.signal;
  const individualSpatial = signal.componentDistribution?.components.find(
    (component) => component.id === "individuals",
  );
  const structureSpatial = signal.componentDistribution?.components.find(
    (component) => component.id === "structures",
  );
  const individualOne = individualSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 1,
  );
  const individualTwo = individualSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 2,
  );
  const structureOne = structureSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 1,
  );
  const structureTwo = structureSpatial?.thresholds.find(
    (threshold) => threshold.minimumUnits === 2,
  );

  useEffect(() => {
    const controller = new AbortController();
    // The shell opens mid-work: a live default plan is on the table from the
    // first paint, and the controls adjust it rather than reveal it.
    const openWithPlan = (source: DemoData) => {
      setPlan(
        allocateHours(source.areas, source.scenario.defaultBudget, DEFAULT_COVERAGE_FLOOR, true),
      );
    };
    loadDemoData(controller.signal)
      .then((loaded) => {
        setData(loaded);
        setBudget(loaded.scenario.defaultBudget);
        openWithPlan(loaded);
      })
      .catch(() => {
        // Fetch failed or aborted; the embedded snapshot already set renders.
        if (!controller.signal.aborted) openWithPlan(EMBEDDED_DEMO);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        if (guideIndexRef.current !== null) guideControlsRef.current.stop();
        return;
      }
      const target = event.target as HTMLElement;
      const isControl = ["BUTTON", "INPUT", "SUMMARY"].includes(target.tagName);
      if (!isControl && event.key.toLowerCase() === "p") {
        setProjectorMode((mode) => !mode);
        return;
      }
      if (guideIndexRef.current !== null && !isControl) {
        if (event.key === "ArrowRight" || event.key === "Enter") {
          guideControlsRef.current.advance();
        } else if (event.key === "ArrowLeft") {
          guideControlsRef.current.retreat();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const allocationById = useMemo(
    () => new Map(plan?.allocations.map((item) => [item.areaId, item.hours]) ?? []),
    [plan],
  );

  const planTotal = plan?.allocations.reduce((sum, row) => sum + row.hours, 0) ?? 0;
  const maxHours = Math.max(1, ...Array.from(allocationById.values()));
  const selectedArea = data.areas.find((area) => area.id === selectedAreaId) ?? null;
  const toggleAreaSelection = (areaId: string) =>
    setSelectedAreaId((current) => (current === areaId ? null : areaId));
  const interventionResult = useMemo(
    () =>
      intervention
        ? applyIntervention(data.areas, {
            targetAreaId: intervention.areaId,
            displacedShare: intervention.share,
          })
        : null,
    [intervention, data.areas],
  );
  // The planner runs on the assumption-adjusted loads while an intervention is
  // being explored; observed loads are untouched underneath.
  const planningAreas = interventionResult?.areas ?? data.areas;
  // Unmet planning load: hours the forecast-proportional split would have
  // assigned an area but the guaranteed minimums moved elsewhere. Mirrors the
  // domain planner's unmet_hours definition (app/src/domain/planner/planner.ts).
  const unmetByArea = useMemo(() => {
    if (!plan?.feasible) return new Map<string, number>();
    // Locks are read from the computed plan so the unmet figure always
    // describes the plan on screen, not a lock edit awaiting recompute.
    const locks = new Map(
      Array.from(lockedIds).map((id) => [
        id,
        plan.allocations.find((row) => row.areaId === id)?.hours ?? 0,
      ]),
    );
    const reference = allocateHours(planningAreas, budget, 0, false, locks);
    if (!reference.feasible) return new Map<string, number>();
    return new Map(
      reference.allocations.map((row) => {
        const allocated = plan.allocations.find((item) => item.areaId === row.areaId)?.hours ?? 0;
        return [row.areaId, Math.max(0, row.hours - allocated)] as const;
      }),
    );
  }, [plan, planningAreas, budget, lockedIds]);
  const unmetTotal = Array.from(unmetByArea.values()).reduce((sum, value) => sum + value, 0);
  // Cost is priced off the plan that already exists; the rate is never an
  // input to it. The floor's marginal cost is one multiplication on the same
  // unmet hours reported above, not a second calculation.
  const planCost = useMemo(
    () =>
      summarizePlanCost({
        areas: planningAreas.map((area) => ({
          id: area.id,
          label: area.name,
          planningLoad: area.planningLoad,
        })),
        hoursByArea: allocationById,
        unmetHoursByArea: unmetByArea,
        rate: loadedHourlyRate,
      }),
    [planningAreas, allocationById, unmetByArea, loadedHourlyRate],
  );
  const floorCostLine = floorCostSentence(planCost);
  const budgetValid = Number.isInteger(budget) && budget >= 0 && budget <= MAX_BUDGET_HOURS;
  const planReady = Boolean(
    plan?.feasible && !planDirty && guardEnabled && budgetValid && planTotal === budget,
  );
  const auditedAreas = useMemo(
    () => data.areas.filter((area) => area.auditWape !== null),
    [data.areas],
  );
  const auditedAreaWapes = useMemo(
    () => auditedAreas.map((area) => area.auditWape as number),
    [auditedAreas],
  );

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  function revealDrop(moveFocus = true) {
    setDropRevealed(true);
    if (moveFocus) window.setTimeout(() => resultHeading.current?.focus(), 80);
  }

  function currentLocks(): Map<string, number> {
    return new Map(
      Array.from(lockedIds).map((id) => [id, lockValues[id] ?? allocationById.get(id) ?? 0]),
    );
  }

  function runPlan(
    nextGuard = guardEnabled,
    locks = currentLocks(),
    nextFloor = coverageFloor,
    nextBudget = budget,
    areasArg: DemoData["areas"] = planningAreas,
  ) {
    const next = allocateHours(areasArg, nextBudget, nextFloor, nextGuard, locks);
    setPlan(next);
    setPlanDirty(false);
    setCopyStatus("");
    return next;
  }

  function setInterventionScenario(next: { areaId: string; share: number } | null) {
    setIntervention(next);
    const adjusted = next
      ? (applyIntervention(data.areas, {
          targetAreaId: next.areaId,
          displacedShare: next.share,
        })?.areas ?? data.areas)
      : data.areas;
    if (plan) runPlan(guardEnabled, currentLocks(), coverageFloor, budget, adjusted);
  }

  // Live what-if: while a plan is on screen, a budget change recomputes it in
  // place under the same floors and locks instead of blanking it.
  function setBudgetHours(next: number) {
    setBudget(next);
    setCopyStatus("");
    const valid = Number.isInteger(next) && next >= 0 && next <= MAX_BUDGET_HOURS;
    if (plan && valid) {
      runPlan(guardEnabled, currentLocks(), coverageFloor, next);
    } else {
      setPlan(null);
      setPlanDirty(false);
    }
  }

  function setGuard(nextGuard: boolean) {
    const nextFloor = nextGuard && coverageFloor === 0 ? DEFAULT_COVERAGE_FLOOR : coverageFloor;
    if (nextFloor !== coverageFloor) setCoverageFloor(nextFloor);
    setGuardEnabled(nextGuard);
    runPlan(nextGuard, currentLocks(), nextFloor);
  }

  function setCoveragePolicy(nextFloor: number) {
    setCoverageFloor(nextFloor);
    const enabled = nextFloor > 0;
    setGuardEnabled(enabled);
    runPlan(enabled, currentLocks(), nextFloor);
  }

  function toggleLock(areaId: string) {
    const next = new Set(lockedIds);
    if (next.has(areaId)) {
      next.delete(areaId);
    } else {
      next.add(areaId);
      setLockValues((values) => ({ ...values, [areaId]: allocationById.get(areaId) ?? 0 }));
    }
    setLockedIds(next);
    setPlanDirty(true);
    setCopyStatus("");
  }

  const decisionBrief = useMemo(() => {
    const rows = data.areas
      .map(
        (area) =>
          `${area.name}: ${allocationById.get(area.id) ?? "—"}h${lockedIds.has(area.id) ? " (human lock)" : ""}`,
      )
      .join("; ");
    return [
      `STILL HERE SD · NEXT-SHIFT DECISION BRIEF`,
      `Status: ${data.scenario.status === "ready" ? "READY FOR COORDINATOR REVIEW" : "PROVISIONAL OFFLINE SNAPSHOT"} — not automatic dispatch`,
      `Source: ${data.source.label}. Artifact: ${data.source.artifact}; source data through ${formatDate(data.source.retrievedAt)}; ${data.origin === "generated" ? "generated analysis" : "embedded offline fallback"}.`,
      `Method: same-month comparison on the fixed ${signal.panelSize}-block panel under the POST2020 method; block-map components are separately digitized observations, not unique people.`,
      `Evidence: ${signal.classification === "wider_footprint" ? "Wider observed-individual footprint" : titleCase(signal.classification)}. ${signal.fromPeriod} to ${signal.toPeriod}: observed individuals ${signal.components.individuals.from} → ${signal.components.individuals.to} (+${formatNumber(signal.components.individuals.changePct, 1)}%); tents/structures ${signal.components.structures.from} → ${signal.components.structures.to} (${formatNumber(signal.components.structures.changePct, 1)}%).${individualOne && individualTwo ? ` Blocks with ≥1 observed individual ${individualOne.fromBlocks} → ${individualOne.toBlocks}; blocks with ≥2 ${individualTwo.fromBlocks} → ${individualTwo.toBlocks}.` : ` Active mixed-component blocks ${signal.activeFrom} → ${signal.activeTo} (+${formatNumber(signal.activeChangePct, 1)}%).`} The mixed-unit index is secondary, not a person count.${individualSpatial ? ` Individual HHI was nearly unchanged (${individualSpatial.hhiFrom.toFixed(6)} → ${individualSpatial.hhiTo.toFixed(6)}).` : ""}`,
      `Historical one-step-ahead planning scenario (data frozen Dec 2025): ${data.forecast.targetPeriod} ${formatNumber(data.forecast.point)}; historical 80% residual interval ${formatNumber(data.forecast.lower)}–${formatNumber(data.forecast.upper)}. ${data.forecast.model}; rolling-origin MAE ${formatNumber(data.forecast.mae)}; empirical coverage ${formatNumber(data.forecast.coverage)}% across ${data.forecast.intervalPoints} folds. Not a live future forecast or a guaranteed probability interval.`,
      `Illustrative coverage-continuity scenario for human review: ${budget} staff-hours; user-set guard ${guardEnabled ? `on (${coverageFloor}h demo-policy minimum)` : "off — audit only"}. ${rows}.${auditedAreaWapes.length ? ` Area forecasts are noisier than the aggregate (held-out WAPE ranges ${formatNumber(Math.min(...auditedAreaWapes), 1)}%–${formatNumber(Math.max(...auditedAreaWapes), 1)}%).` : " Area-level audit WAPE is unavailable in this artifact; do not infer equal accuracy."}`,
      ...(intervention && interventionResult
        ? [
            `Stress-test assumption active: ${data.areas.find((area) => area.id === intervention.areaId)?.name ?? intervention.areaId} modeled as cleared, with ${formatNumber(intervention.share * 100)}% of its planning load assumed to shift to adjacent areas (${formatNumber(interventionResult.shifted, 1)} shifted, ${formatNumber(interventionResult.assumedResolved, 1)} assumed resolved). An explored assumption for review, not a prediction: the source data cannot verify displacement (April 2026 City Auditor).`,
          ]
        : []),
      `Cost view — operator-set assumption, not a measured or published figure: at an assumed ${formatRate(planCost.rate, planCost.currency)}, the plan's ${planCost.totalHours} staff-hours cost ${formatCurrency(planCost.totalCost, planCost.currency)}.${floorCostLine ? ` ${floorCostLine} That is ${planCost.floor.hours} hours moved plan-wide by the guaranteed minimum, priced at the same assumed rate.` : ""} The rate is set by the operating organization, is derived from no source in this artifact, and enters no allocation: identical plans are produced at every rate. Costs are stated per staff-hour, per area, and per plan only; nothing here is a cost per person, per contact, or per anyone covered.`,
      `Review triggers: new month, budget or boundary change, wider interval, infeasible floor, or local knowledge conflict.`,
      `Privacy and authorization boundary: aggregate place-level evidence only; no block records or block-level geometry ship (the map draws simplified neighborhood boundaries only). This does not track people, establish causality, authorize enforcement, or dispatch staff automatically.`,
    ].join("\n");
  }, [
    allocationById,
    budget,
    coverageFloor,
    data,
    guardEnabled,
    individualOne,
    individualSpatial,
    individualTwo,
    lockedIds,
    signal,
    auditedAreaWapes,
    intervention,
    interventionResult,
    planCost,
    floorCostLine,
  ]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(decisionBrief);
      setCopyStatus("Decision brief copied with assumptions and review triggers.");
    } catch {
      setCopyStatus("Clipboard unavailable. The full brief is open below for manual copy.");
    }
  }

  function saveScenario() {
    if (!planReady) return;
    const lockCount = lockedIds.size;
    const entry: SavedScenario = {
      id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${budget}h · ${coverageFloor}h floor${lockCount ? ` · ${lockCount} lock${lockCount > 1 ? "s" : ""}` : ""}`,
      budget,
      floor: coverageFloor,
      guard: guardEnabled,
      locks: Array.from(currentLocks().entries()),
    };
    const next = [...scenarios, entry].slice(-MAX_SAVED_SCENARIOS);
    setScenarios(next);
    writeSavedScenarios(next);
  }

  function loadScenario(scenario: SavedScenario) {
    const locks = new Map(scenario.locks);
    setBudget(scenario.budget);
    setCoverageFloor(scenario.floor);
    setGuardEnabled(scenario.guard);
    setLockedIds(new Set(locks.keys()));
    setLockValues(Object.fromEntries(locks));
    runPlan(scenario.guard, locks, scenario.floor, scenario.budget);
  }

  function deleteScenario(id: string) {
    const next = scenarios.filter((scenario) => scenario.id !== id);
    setScenarios(next);
    writeSavedScenarios(next);
    if (compareId === id) setCompareId(null);
  }

  const compareScenario = scenarios.find((scenario) => scenario.id === compareId) ?? null;
  // The baseline plan is recomputed from settings, never stored, so it always
  // reflects the same frozen artifact as the current plan.
  const compareById = useMemo(() => {
    if (!compareScenario) return null;
    const baseline = allocateHours(
      data.areas,
      compareScenario.budget,
      compareScenario.floor,
      compareScenario.guard,
      new Map(compareScenario.locks),
    );
    if (!baseline.feasible) return null;
    return new Map(baseline.allocations.map((row) => [row.areaId, row.hours]));
  }, [compareScenario, data.areas]);

  // Staff-hours the active clearance assumption reallocates, measured against
  // the same policy settings on the observed loads.
  const interventionHourChurn = useMemo(() => {
    if (!interventionResult || !plan?.feasible) return null;
    const locks = new Map(Array.from(lockedIds).map((id) => [id, lockValues[id] ?? 0] as const));
    const baseline = allocateHours(
      data.areas,
      budget,
      guardEnabled ? coverageFloor : 0,
      guardEnabled,
      locks,
    );
    if (!baseline.feasible) return null;
    const base = new Map(baseline.allocations.map((row) => [row.areaId, row.hours]));
    return (
      plan.allocations.reduce(
        (sum, row) => sum + Math.abs(row.hours - (base.get(row.areaId) ?? 0)),
        0,
      ) / 2
    );
  }, [
    interventionResult,
    plan,
    data.areas,
    budget,
    guardEnabled,
    coverageFloor,
    lockedIds,
    lockValues,
  ]);

  const guideSteps = useMemo(() => buildGuideSteps(data), [data]);

  // Whether the viewer has completed the step's task with the app's own
  // controls. Read-only steps never self-complete; they advance on Next.
  function stepComplete(index: number): boolean {
    switch (guideSteps[index]?.id) {
      case "reveal":
        return dropRevealed;
      case "generate":
        return Boolean(plan?.feasible);
      case "compare":
        return plan !== null && !guardEnabled;
      case "restore":
        return Boolean(plan) && guardEnabled && coverageFloor > 0;
      case "lock":
        return Boolean(plan) && lockedIds.size > 0 && !planDirty;
      case "explore":
        return intervention !== null;
      case "brief":
        return copyStatus !== "";
      default:
        return false;
    }
  }

  // "Do it for me": perform the step's task exactly as the on-screen control
  // would, so watching the guide never diverges from using the tool.
  function performStep(index: number) {
    const floor = guardEnabled && coverageFloor > 0 ? coverageFloor : DEFAULT_COVERAGE_FLOOR;
    switch (guideSteps[index]?.id) {
      case "reveal":
        revealDrop(false);
        break;
      case "generate":
        setCoverageFloor(floor);
        setGuardEnabled(true);
        runPlan(true, currentLocks(), floor);
        break;
      case "compare":
        setCoveragePolicy(0);
        break;
      case "restore":
        setCoveragePolicy(DEFAULT_COVERAGE_FLOOR);
        break;
      case "lock": {
        setCoverageFloor(floor);
        setGuardEnabled(true);
        const base = runPlan(true, new Map(), floor);
        const first = data.areas[0];
        if (first && base.feasible) {
          const hours = base.allocations.find((row) => row.areaId === first.id)?.hours ?? 0;
          setLockedIds(new Set([first.id]));
          setLockValues({ [first.id]: hours });
          runPlan(true, new Map([[first.id, hours]]), floor);
        }
        break;
      }
      case "explore": {
        const target = data.areas.find((area) => area.id === "east_village") ?? data.areas[0];
        if (target) {
          setSelectedAreaId(target.id);
          setInterventionScenario({ areaId: target.id, share: shareDraft });
        }
        break;
      }
      case "brief":
        void copyBrief();
        break;
      default:
        break;
    }
  }

  function goToStep(index: number, focusPanel = true) {
    const step = guideSteps[index];
    if (!step) return;
    guideEntryCompleteRef.current = stepComplete(index);
    setGuideIndex(index);
    window.setTimeout(() => {
      scrollTo(step.targetId);
      if (focusPanel) guidePanel.current?.focus();
    }, 80);
  }

  function switchView(next: "story" | "workspace") {
    if (next === "workspace" && guideIndex !== null) stopGuide();
    setView(next);
    try {
      localStorage.setItem("stillhere-view", next);
    } catch {
      // The choice simply resets next visit.
    }
  }

  function beginGuide() {
    setGuideUsed(true);
    try {
      localStorage.setItem("stillhere-guide-used", "1");
    } catch {
      // Private windows without storage still get the tour; only the
      // first-visit cue repeats.
    }
    // The guide narrates the story sections, so it always runs there.
    switchView("story");
    goToStep(0);
  }

  // Next doubles as "Do it for me" on an unfinished task step, so hands-off
  // viewers can still see every beat of the flow.
  function advanceGuide() {
    if (guideIndex === null) return;
    const step = guideSteps[guideIndex];
    if (step.task && !stepComplete(guideIndex)) performStep(guideIndex);
    if (guideIndex >= guideSteps.length - 1) {
      stopGuide();
      return;
    }
    goToStep(guideIndex + 1);
  }

  function retreatGuide() {
    if (guideIndex === null || guideIndex === 0) return;
    goToStep(guideIndex - 1);
  }

  // Stopping never strands the comparison (guard-off) view as the final plan;
  // the demo script's rule is enforced here rather than remembered.
  function stopGuide() {
    setGuideAuto(false);
    setGuideIndex(null);
    if (plan && !guardEnabled) setCoveragePolicy(DEFAULT_COVERAGE_FLOOR);
  }

  useEffect(() => {
    guideControlsRef.current = { advance: advanceGuide, retreat: retreatGuide, stop: stopGuide };
  });

  // Auto-advance shortly after the viewer completes the current task
  // themselves. Steps that were already complete on entry (e.g. revisited via
  // Back) wait for an explicit Next instead of bouncing forward.
  useEffect(() => {
    if (guideIndex === null || guideIndex >= guideSteps.length - 1) return;
    const step = guideSteps[guideIndex];
    if (!step.task || guideEntryCompleteRef.current || !stepComplete(guideIndex)) return;
    const timer = window.setTimeout(() => goToStep(guideIndex + 1, false), 900);
    return () => window.clearTimeout(timer);
  });

  // Hands-free playback for an unattended screen: each step lingers long
  // enough to read, performs its own task, and stops on the final step. Any
  // click outside the panel or manual navigation pauses it.
  useEffect(() => {
    if (!guideAuto || guideIndex === null) return;
    const step = guideSteps[guideIndex];
    const duration = Math.min(5000 + step.body.length * 45, 24000);
    const timer = window.setTimeout(() => {
      if (step.task && !stepComplete(guideIndex)) performStep(guideIndex);
      if (guideIndex >= guideSteps.length - 1) {
        setGuideAuto(false);
      } else {
        goToStep(guideIndex + 1, false);
      }
    }, duration);
    return () => window.clearTimeout(timer);
  });

  useEffect(() => {
    if (!guideAuto) return;
    const onPointerDown = (event: PointerEvent) => {
      if (guidePanel.current?.contains(event.target as Node)) return;
      setGuideAuto(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [guideAuto]);

  // Spotlight the section the current step talks about.
  useEffect(() => {
    if (guideIndex === null) return;
    const element = document.getElementById(guideSteps[guideIndex].targetId);
    if (!element) return;
    element.classList.add("guide-spotlight");
    return () => element.classList.remove("guide-spotlight");
  }, [guideIndex, guideSteps]);
  /* ---------------------------------------------------------------- *
   * Phase 6: the plan leaves the room — link, exports, shift sheet.
   *
   * Additive only. Nothing above this comment changed, and nothing here
   * feeds an allocation: these read the plan that already exists.
   * ---------------------------------------------------------------- */

  // A shared link is applied once, after the artifact settles: the loader
  // sets its own default budget and plan when it resolves, and a colleague
  // opening a link must end up with the sender's plan, not that default.
  const sharedPlanApplied = useRef(false);
  useEffect(() => {
    if (loading || sharedPlanApplied.current) return;
    sharedPlanApplied.current = true;
    const shared = readPlanShareFromSearch(window.location.search);
    if (!shared) return;
    const known = new Set(data.areas.map((area) => area.id));
    // An id the link names but this artifact does not have is dropped, not
    // invented: a stale link degrades to the plan it can still describe.
    const locks = new Map(shared.locks.filter(([areaId]) => known.has(areaId)));
    const assumed = shared.assume !== null && known.has(shared.assume) ? shared.assume : null;
    // The URL is the external system this effect synchronizes with.
    // oxlint-disable-next-line react/set-state-in-effect
    setBudget(shared.budget);
    setCoverageFloor(shared.floor);
    setGuardEnabled(shared.guard);
    setLockedIds(new Set(locks.keys()));
    setLockValues(Object.fromEntries(locks));
    setLoadedHourlyRate(shared.rate);
    setShareDraft(shared.share);
    setIntervention(assumed ? { areaId: assumed, share: shared.share } : null);
    const areasForPlan = assumed
      ? (applyIntervention(data.areas, {
          targetAreaId: assumed,
          displacedShare: shared.share,
        })?.areas ?? data.areas)
      : data.areas;
    runPlan(shared.guard, locks, shared.floor, shared.budget, areasForPlan);
  }, [data, loading]);

  const planShareState: PlanShareState = useMemo(
    () => ({
      budget,
      floor: coverageFloor,
      guard: guardEnabled,
      locks: Array.from(lockedIds)
        .map((areaId): [string, number] => [
          areaId,
          lockValues[areaId] ?? allocationById.get(areaId) ?? 0,
        ])
        .sort((a, b) => a[0].localeCompare(b[0])),
      share: intervention ? intervention.share : shareDraft,
      assume: intervention?.areaId ?? null,
      rate: loadedHourlyRate,
    }),
    [
      allocationById,
      budget,
      coverageFloor,
      guardEnabled,
      intervention,
      loadedHourlyRate,
      lockValues,
      lockedIds,
      shareDraft,
    ],
  );

  // Empty when the state on screen is not shareable, which is the honest
  // answer: the button that offers the link is disabled instead of handing
  // over one that does not describe this plan.
  const shareUrl = useMemo(() => {
    try {
      return planShareUrl(planShareState, `${window.location.origin}${window.location.pathname}`);
    } catch {
      return "";
    }
  }, [planShareState]);

  // The plan as rows an export can render. `reason` is the artifact's own
  // sentence, passed through untouched.
  const planExportRows: PlanExportRow[] = useMemo(
    () =>
      planningAreas.map((area) => ({
        areaId: area.id,
        areaName: area.name,
        hours: allocationById.get(area.id) ?? 0,
        reason: area.reason,
        locked: lockedIds.has(area.id),
        floorHours: guardEnabled ? coverageFloor : 0,
        unmetHours: unmetByArea.get(area.id) ?? 0,
      })),
    [allocationById, coverageFloor, guardEnabled, lockedIds, planningAreas, unmetByArea],
  );

  const classificationLabel =
    signal.classification === "wider_footprint"
      ? individualSpatial
        ? "People were seen in more places, not fewer"
        : "Field activity spread across more blocks"
      : titleCase(signal.classification);
  return {
    advanceGuide,
    allocationById,
    auditedAreaWapes,
    auditedAreas,
    beginGuide,
    budget,
    budgetValid,
    classificationLabel,
    compareById,
    compareId,
    compareScenario,
    copyBrief,
    copyStatus,
    coverageFloor,
    currentLocks,
    data,
    decisionBrief,
    deleteScenario,
    disclosuresOpen,
    dropRevealed,
    floorCostLine,
    goToStep,
    guardEnabled,
    guideAuto,
    guideControlsRef,
    guideEntryCompleteRef,
    guideIndex,
    guideIndexRef,
    guidePanel,
    guideSteps,
    guideUsed,
    individualOne,
    individualSpatial,
    individualTwo,
    intervention,
    interventionHourChurn,
    interventionResult,
    loadScenario,
    loadedHourlyRate,
    loading,
    lockValues,
    lockedIds,
    mapLayer,
    maxHours,
    performStep,
    plan,
    planCost,
    planDirty,
    planExportRows,
    planReady,
    planShareState,
    planTotal,
    planningAreas,
    projectorMode,
    resultHeading,
    retreatGuide,
    revealDrop,
    runPlan,
    saveScenario,
    scenarios,
    scrollTo,
    selectedArea,
    selectedAreaId,
    setBudget,
    setBudgetHours,
    setCompareId,
    setCopyStatus,
    setCoverageFloor,
    setCoveragePolicy,
    setData,
    setDisclosuresOpen,
    setDropRevealed,
    setGuard,
    setGuardEnabled,
    setGuideAuto,
    setGuideIndex,
    setGuideUsed,
    setIntervention,
    setInterventionScenario,
    setLoadedHourlyRate,
    setLoading,
    setLockValues,
    setLockedIds,
    setMapLayer,
    setPlan,
    setPlanDirty,
    setProjectorMode,
    setScenarios,
    setSelectedAreaId,
    setShareDraft,
    setView,
    setWsTab,
    shareDraft,
    shareUrl,
    signal,
    stepComplete,
    stopGuide,
    structureOne,
    structureSpatial,
    structureTwo,
    switchView,
    toggleAreaSelection,
    toggleLock,
    unmetByArea,
    unmetTotal,
    view,
    wsTab,
  };
}
