import { useEffect, useMemo, useRef, useState } from "react";

import { EMBEDDED_DEMO, loadDemoData, type DemoData } from "../../lib/demo";
import { summarizePlanCost } from "../../domain/cost/index.ts";
import { createTranslator } from "../../i18n/context";
import { readStoredLocale, writeStoredLocale, type Locale } from "../../i18n/locale";
import { placeParams, placeWords } from "../../i18n/places";
import { planMessage, planReason } from "../../i18n/plannerText";
import { titleCase } from "../../lib/format";
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
  PlanShareError,
  assertGeographyMatches,
  decodePlanShare,
  planShareUrl,
  type PlanShareState,
} from "../share/planShareState";
import {
  applyDeployment,
  loadDeployment,
  resolveProfileId,
  unobservedAreas,
  type Deployment,
} from "./deployment";

/**
 * Every piece of shell state, lifted out of App.tsx unchanged. Sections read
 * it through ShellContext rather than through a prop chain.
 */
export function useShellState() {
  // The deployment is resolved once, from the profile this build was opened
  // with. Every operating number below that used to be a module constant now
  // comes from it.
  const [deployment] = useState<Deployment>(() =>
    loadDeployment(resolveProfileId(window.location.search)),
  );
  const [artifact, setArtifact] = useState<DemoData>(EMBEDDED_DEMO);
  // The artifact as this deployment plans against it: the profile's in-scope
  // areas, in the profile's order. Identity-stable, and identical to the
  // artifact itself for the reference deployment.
  const data = useMemo(() => applyDeployment(artifact, deployment), [artifact, deployment]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(deployment.defaultBudget);
  const [dropRevealed, setDropRevealed] = useState(false);
  const [disclosuresOpen, setDisclosuresOpen] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [guardEnabled, setGuardEnabled] = useState(true);
  const [coverageFloor, setCoverageFloor] = useState(deployment.coverageFloor);
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
  // The reader's language, persisted exactly like the view preference and
  // mirrored onto <html lang> so assistive technology switches voice with it.
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const setLocale = useMemo(
    () => (next: Locale) => {
      setLocaleState(next);
      writeStoredLocale(next);
    },
    [],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const i18n = useMemo(() => createTranslator(locale, setLocale), [locale, setLocale]);
  const { t, number: formatNumber, date: formatDate, money } = i18n;
  // The deployment's own word for its places, in the reader's language and in
  // every grammatical form the copy needs.
  const places = useMemo(
    () => placeWords(t, deployment.areaNoun, deployment.areaCount),
    [t, deployment],
  );
  const placeText = useMemo(() => placeParams(places), [places]);
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
  const [loadedHourlyRate, setLoadedHourlyRate] = useState(deployment.loadedHourlyRate);
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
      const scoped = applyDeployment(source, deployment);
      setPlan(
        allocateHours(scoped.areas, deployment.defaultBudget, deployment.coverageFloor, true),
      );
    };
    loadDemoData(controller.signal)
      .then((loaded) => {
        setArtifact(loaded);
        setBudget(deployment.defaultBudget);
        openWithPlan(loaded);
      })
      .catch(() => {
        // Fetch failed or aborted; the embedded snapshot already set renders.
        if (!controller.signal.aborted) openWithPlan(EMBEDDED_DEMO);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [deployment]);

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
  // The domain's `floorCostSentence` is fixed at en-US and is not this
  // workstream's to change; this is the same sentence, from the same numbers,
  // in the reader's language. `i18n.test.tsx` pins the two together at `en`.
  const floorCostLine = useMemo(() => {
    const floor = planCost.floor;
    if (floor.topLoadAreaLabel === null) return null;
    const cost = money(floor.cost, planCost.currency);
    return floor.hours <= 0
      ? t("cost.floorSentenceNoHours", { money: cost, area: floor.topLoadAreaLabel })
      : t("cost.floorSentenceHours", {
          money: cost,
          hours: floor.topLoadAreaHours,
          area: floor.topLoadAreaLabel,
        });
  }, [planCost, money, t]);
  const budgetValid =
    Number.isInteger(budget) && budget >= deployment.minBudget && budget <= deployment.maxBudget;
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
    const valid =
      Number.isInteger(next) && next >= deployment.minBudget && next <= deployment.maxBudget;
    if (plan && valid) {
      runPlan(guardEnabled, currentLocks(), coverageFloor, next);
    } else {
      setPlan(null);
      setPlanDirty(false);
    }
  }

  function setGuard(nextGuard: boolean) {
    const nextFloor = nextGuard && coverageFloor === 0 ? deployment.coverageFloor : coverageFloor;
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
    // Every line is one whole message with named holes. The numbers are the
    // planner's and the artifact's, carried across untouched.
    const rows = data.areas
      .map((area) => {
        const hours = allocationById.get(area.id);
        const locked = lockedIds.has(area.id);
        const key =
          hours === undefined
            ? locked
              ? "decision.scenarioRowNoHoursLocked"
              : "decision.scenarioRowNoHours"
            : locked
              ? "decision.scenarioRowLocked"
              : "decision.scenarioRow";
        return t(key, { area: area.name, hours: hours ?? 0 });
      })
      .join("; ");
    const thresholds =
      individualOne && individualTwo
        ? t("decision.evidenceThresholds", {
            oneFrom: individualOne.fromBlocks,
            oneTo: individualOne.toBlocks,
            twoFrom: individualTwo.fromBlocks,
            twoTo: individualTwo.toBlocks,
          })
        : t("decision.evidenceActiveBlocks", {
            from: signal.activeFrom,
            to: signal.activeTo,
            pct: formatNumber(signal.activeChangePct, 1),
          });
    const audit = auditedAreaWapes.length
      ? t("decision.auditRange", {
          min: formatNumber(Math.min(...auditedAreaWapes), 1),
          max: formatNumber(Math.max(...auditedAreaWapes), 1),
        })
      : t("decision.auditUnavailable");
    const rate = t("cost.perStaffHour", { money: money(planCost.rate, planCost.currency) });
    return [
      t("decision.heading"),
      data.scenario.status === "ready"
        ? t("decision.statusReady")
        : t("decision.statusProvisional"),
      t(data.origin === "generated" ? "decision.sourceGenerated" : "decision.sourceEmbedded", {
        label: data.source.label,
        artifact: data.source.artifact,
        date: formatDate(data.source.retrievedAt),
      }),
      t("decision.method", { panel: signal.panelSize }),
      t("decision.evidence", {
        classification:
          signal.classification === "wider_footprint"
            ? t("decision.classificationWiderFootprint")
            : titleCase(signal.classification),
        fromPeriod: signal.fromPeriod,
        toPeriod: signal.toPeriod,
        indFrom: signal.components.individuals.from,
        indTo: signal.components.individuals.to,
        indPct: formatNumber(signal.components.individuals.changePct, 1),
        strFrom: signal.components.structures.from,
        strTo: signal.components.structures.to,
        strPct: formatNumber(signal.components.structures.changePct, 1),
        thresholds,
        hhi: individualSpatial
          ? t("decision.evidenceHhi", {
              from: individualSpatial.hhiFrom.toFixed(6),
              to: individualSpatial.hhiTo.toFixed(6),
            })
          : "",
      }),
      t("decision.forecast", {
        period: data.forecast.targetPeriod,
        point: formatNumber(data.forecast.point),
        lower: formatNumber(data.forecast.lower),
        upper: formatNumber(data.forecast.upper),
        model: data.forecast.model,
        mae: formatNumber(data.forecast.mae),
        coverage: formatNumber(data.forecast.coverage),
        folds: data.forecast.intervalPoints,
      }),
      t(guardEnabled ? "decision.scenarioGuardOn" : "decision.scenarioGuardOff", {
        budget,
        floor: coverageFloor,
        rows,
        audit,
      }),
      ...(intervention && interventionResult
        ? [
            t("decision.assumption", {
              area:
                data.areas.find((area) => area.id === intervention.areaId)?.name ??
                intervention.areaId,
              pct: formatNumber(intervention.share * 100),
              shifted: formatNumber(interventionResult.shifted, 1),
              resolved: formatNumber(interventionResult.assumedResolved, 1),
            }),
          ]
        : []),
      t("decision.cost", {
        rate,
        hours: planCost.totalHours,
        total: money(planCost.totalCost, planCost.currency),
        floorLine: floorCostLine
          ? t("decision.costFloor", { sentence: floorCostLine, hours: planCost.floor.hours })
          : "",
      }),
      t("decision.triggers"),
      t("decision.privacy"),
    ].join("\n");
  }, [
    allocationById,
    auditedAreaWapes,
    budget,
    coverageFloor,
    data,
    floorCostLine,
    formatDate,
    formatNumber,
    guardEnabled,
    individualOne,
    individualSpatial,
    individualTwo,
    intervention,
    interventionResult,
    lockedIds,
    money,
    planCost,
    signal,
    t,
  ]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(decisionBrief);
      setCopyStatus(t("brief.copied"));
    } catch {
      setCopyStatus(t("brief.copyFailed"));
    }
  }

  function saveScenario() {
    if (!planReady) return;
    const lockCount = lockedIds.size;
    const entry: SavedScenario = {
      id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: lockCount
        ? t("bench.scenarioNameWithLocks", { budget, floor: coverageFloor, count: lockCount })
        : t("bench.scenarioName", { budget, floor: coverageFloor }),
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

  const guideSteps = useMemo(
    () =>
      buildGuideSteps(data, {
        t,
        number: formatNumber,
        places: placeText,
        coverageFloor: deployment.coverageFloor,
      }),
    [data, deployment, formatNumber, placeText, t],
  );

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
    const floor = guardEnabled && coverageFloor > 0 ? coverageFloor : deployment.coverageFloor;
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
        setCoveragePolicy(deployment.coverageFloor);
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
    if (plan && !guardEnabled) setCoveragePolicy(deployment.coverageFloor);
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
  // A link this build refuses. Distinct from "no link at all", which is the
  // whole point: a recipient whose link was mangled used to be shown a
  // plausible default plan with nothing to tell them it was not the sender's.
  const [shareRefusal, setShareRefusal] = useState<{ field: string; detail: string } | null>(null);
  useEffect(() => {
    if (loading || sharedPlanApplied.current) return;
    sharedPlanApplied.current = true;
    let shared: PlanShareState | null;
    try {
      shared = decodePlanShare(window.location.search);
      // A plan is only a plan against a named list of areas. A link built on
      // another organization's geography is refused rather than partly
      // applied: dropping unknown ids silently would hand the reader a
      // different plan under the sender's name.
      if (shared) assertGeographyMatches(shared, deployment.areaListVersion);
    } catch (error) {
      if (!(error instanceof PlanShareError)) throw error;
      const prefix = `${error.field}: `;
      // The URL is the external system this effect synchronizes with.
      // oxlint-disable-next-line react/set-state-in-effect
      setShareRefusal({
        field: error.field,
        detail: error.message.startsWith(prefix)
          ? error.message.slice(prefix.length)
          : error.message,
      });
      return;
    }
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
  }, [data, deployment, loading]);

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
      geography: deployment.areaListVersion,
    }),
    [
      allocationById,
      budget,
      coverageFloor,
      deployment,
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
        reason: planReason(t, area.reason),
        locked: lockedIds.has(area.id),
        floorHours: guardEnabled ? coverageFloor : 0,
        unmetHours: unmetByArea.get(area.id) ?? 0,
      })),
    [allocationById, coverageFloor, guardEnabled, lockedIds, planningAreas, t, unmetByArea],
  );

  // In-scope areas this artifact carries no row for. Empty for the reference
  // deployment; non-empty is a fact the planner section has to state.
  const unobservedAreaNames = useMemo(
    () => unobservedAreas(artifact.areas, deployment),
    [artifact, deployment],
  );

  const classificationLabel =
    signal.classification === "wider_footprint"
      ? individualSpatial
        ? t("classification.widerFootprintPeople")
        : t("classification.widerFootprintActivity")
      : titleCase(signal.classification);
  return {
    advanceGuide,
    i18n,
    locale,
    places,
    placeText,
    planSentence: planMessage(t, places, plan?.message ?? ""),
    setLocale,
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
    deployment,
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
    setArtifact,
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
    shareRefusal,
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
    unobservedAreaNames,
    view,
    wsTab,
  };
}
