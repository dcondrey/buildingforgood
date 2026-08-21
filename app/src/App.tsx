import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./App.css";
import { EMBEDDED_DEMO, loadDemoData, type DemoData, type HistoryPoint } from "./lib/demo";
import { allocateHours, type PlanResult } from "./lib/planner";

const DEFAULT_COVERAGE_FLOOR = 8;
const MAX_BUDGET_HOURS = 400;

const GUIDE_STEPS = [
  "The headline estimate fell, but that hides what changed: outreach workers saw more people, on more blocks. What dropped was tents.",
  "Next, a forecast rehearsal. Using only data through December 2025, the tool predicts January 2026 and shows how far off similar forecasts have been.",
  "Then the plan: an assumed 80 staff-hours split across six neighborhoods. Every area keeps a guaranteed minimum you choose; the rest goes where more people are expected.",
  "Finally, a human takes over. The coordinator can lock or change any line, and the written brief carries every caveat along with the numbers.",
];

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  }
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

function titleCase(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg aria-hidden="true" className="icon" viewBox="0 0 24 24" width={size} height={size}>
      {children}
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <Icon>
      <path d="M12 4v15m0 0 6-6m-6 6-6-6" />
    </Icon>
  );
}

function SparkIcon() {
  return (
    <Icon>
      <path d="M12 2 14.3 8.7 21 11l-6.7 2.3L12 20l-2.3-6.7L3 11l6.7-2.3L12 2Z" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  );
}

// Simplified relative positions of the six downtown neighborhoods (harbor to the
// west/left, I-5 to the east). Deliberately schematic: aggregate area values only,
// no block geometry or precise locations ship with the app.
const AREA_MAP_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  columbia: { x: 10, y: 16, w: 53, h: 54 },
  cortez: { x: 65, y: 2, w: 53, h: 36 },
  city_center: { x: 65, y: 40, w: 53, h: 45 },
  east_village: { x: 120, y: 2, w: 78, h: 108 },
  marina: { x: 10, y: 72, w: 53, h: 76 },
  gaslamp: { x: 65, y: 87, w: 53, h: 61 },
};

function AreaMap({
  areas,
  ariaLabel,
  valueFor,
}: {
  areas: DemoData["areas"];
  ariaLabel: string;
  valueFor: (area: DemoData["areas"][number]) => {
    text: string;
    tone: "up" | "down" | "neutral";
  };
}) {
  if (!areas.every((area) => AREA_MAP_LAYOUT[area.id])) {
    return (
      <div aria-label={ariaLabel} className="area-map" role="img">
        {areas.map((area) => {
          const value = valueFor(area);
          return (
            <div className="area-cell" key={area.id}>
              <span>{area.name}</span>
              <strong
                className={
                  value.tone === "up" ? "delta-up" : value.tone === "down" ? "delta-down" : ""
                }
              >
                {value.text}
              </strong>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <svg aria-label={ariaLabel} className="area-map-svg" role="img" viewBox="0 0 200 150">
      <title>{ariaLabel}</title>
      {areas.map((area) => {
        const cell = AREA_MAP_LAYOUT[area.id];
        const value = valueFor(area);
        return (
          <g className={`map-area map-${value.tone}`} key={area.id}>
            <rect height={cell.h} rx="7" width={cell.w} x={cell.x} y={cell.y} />
            <text
              className="map-name"
              textAnchor="middle"
              x={cell.x + cell.w / 2}
              y={cell.y + cell.h / 2 - 3}
            >
              {area.name}
            </text>
            <text
              className="map-value"
              textAnchor="middle"
              x={cell.x + cell.w / 2}
              y={cell.y + cell.h / 2 + 12}
            >
              {value.text}
            </text>
            <title>{`${area.name}: ${value.text}`}</title>
          </g>
        );
      })}
      <text className="map-edge" textAnchor="middle" transform="rotate(-90 4 112)" x="4" y="112">
        San Diego Bay
      </text>
    </svg>
  );
}

function ForecastChart({ history, data }: { history: HistoryPoint[]; data: DemoData["forecast"] }) {
  const width = 760;
  const height = 300;
  const margin = { top: 24, right: 46, bottom: 54, left: 52 };
  const values = [
    ...history.flatMap((point) => (point.value === null ? [] : [point.value])),
    data.lower,
    data.upper,
    data.point,
  ];
  const maxValue = Math.max(10, Math.ceil(Math.max(...values) / 50) * 50);
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const totalPoints = history.length + 1;
  const x = (index: number) => margin.left + (index * chartWidth) / Math.max(1, totalPoints - 1);
  const y = (value: number) => margin.top + chartHeight - (value / maxValue) * chartHeight;

  const segments: Array<Array<{ index: number; value: number }>> = [];
  let current: Array<{ index: number; value: number }> = [];
  history.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push({ index, value: point.value });
    }
  });
  if (current.length) segments.push(current);
  const lastObservedIndex = history.findLastIndex((point) => point.value !== null);
  const lastObserved = history[lastObservedIndex]?.value;
  const forecastX = x(history.length);

  return (
    <div className="chart-wrap">
      <svg
        aria-label={`Historical one-step-ahead planning scenario for ${data.targetPeriod}, using data frozen December 2025: point ${formatNumber(data.point)}, with a ${formatNumber(data.lower)} to ${formatNumber(data.upper)} residual interval.`}
        className="forecast-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Historical one-step-ahead planning scenario and residual interval</title>
        <desc>
          Observed monthly history with missing periods shown as gaps, followed by a historical
          scenario point and its residual interval.
        </desc>
        {[0, maxValue / 2, maxValue].map((tick) => (
          <g key={tick}>
            <line
              className="chart-grid"
              x1={margin.left}
              x2={width - margin.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="chart-axis" x={margin.left - 12} y={y(tick) + 4} textAnchor="end">
              {formatNumber(tick)}
            </text>
          </g>
        ))}

        <rect
          className="forecast-band"
          height={Math.max(2, y(data.lower) - y(data.upper))}
          rx="8"
          width="54"
          x={forecastX - 27}
          y={y(data.upper)}
        />
        <line
          className="interval-boundary"
          x1={forecastX - 28}
          x2={forecastX + 28}
          y1={y(data.upper)}
          y2={y(data.upper)}
        />
        <line
          className="interval-boundary"
          x1={forecastX - 28}
          x2={forecastX + 28}
          y1={y(data.lower)}
          y2={y(data.lower)}
        />

        {segments.map((segment, segmentIndex) => (
          <path
            className="observed-line"
            d={segment
              .map(
                (point, pointIndex) =>
                  `${pointIndex === 0 ? "M" : "L"}${x(point.index)},${y(point.value)}`,
              )
              .join(" ")}
            key={segmentIndex}
          />
        ))}
        {typeof lastObserved === "number" && (
          <path
            className="forecast-line"
            d={`M${x(lastObservedIndex)},${y(lastObserved)} L${forecastX},${y(data.point)}`}
          />
        )}
        {history.map((point, index) =>
          point.value === null ? (
            <g key={point.period}>
              <circle className="missing-point" cx={x(index)} cy={y(0)} r="5" />
              <title>{point.period}: missing</title>
            </g>
          ) : (
            <circle
              className="observed-point"
              cx={x(index)}
              cy={y(point.value)}
              key={point.period}
              r="4"
            >
              <title>
                {point.period}: {point.value}
              </title>
            </circle>
          ),
        )}
        <circle className="forecast-point" cx={forecastX} cy={y(data.point)} r="6" />

        {history.map((point, index) => (
          <text
            className="chart-axis x-axis"
            key={point.period}
            x={x(index)}
            y={height - 22}
            textAnchor="middle"
          >
            {point.period.replace(/\s\d{4}$/, "")}
          </text>
        ))}
        <text
          className="chart-axis forecast-label"
          x={forecastX}
          y={height - 22}
          textAnchor="middle"
        >
          {data.targetPeriod.replace(/\s\d{4}$/, "")} scenario
        </text>
        <text
          className="interval-label"
          x={forecastX - 36}
          y={Math.max(14, y(data.upper) - 8)}
          textAnchor="end"
        >
          {formatNumber(data.lower)}–{formatNumber(data.upper)} range
        </text>
      </svg>
      <div aria-hidden="true" className="chart-legend">
        <span>
          <i className="legend-observed" />
          Observed
        </span>
        <span>
          <i className="legend-forecast" />
          Forecast (rehearsal)
        </span>
        <span>
          <i className="legend-range" />
          Likely range, from past errors
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className={`metric ${tone ? `metric-${tone}` : ""}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function EvidenceChain({ data }: { data: DemoData }) {
  const steps = [
    {
      label: "Verified source",
      detail: data.source.artifact.split("/").pop() ?? data.source.artifact,
      tone: "teal",
    },
    {
      label: "Comparable panel",
      detail: `${data.signal.panelSize} fixed blocks · same method`,
      tone: "teal",
    },
    {
      label: "Audited scenario",
      detail: `${data.forecast.intervalPoints} held-out folds · ${formatNumber(data.forecast.coverage)}% coverage`,
      tone: "amber",
    },
    {
      label: "Human review",
      detail: "Coordinator decides",
      tone: "amber",
    },
  ];

  return (
    <ol aria-label="Evidence and decision chain" className="evidence-chain">
      {steps.map((step, index) => (
        <li className={`evidence-chain-step chain-${step.tone}`} key={step.label}>
          <span aria-hidden="true" className="chain-node">
            {index + 1}
          </span>
          <span className="chain-copy">
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </span>
          {index < steps.length - 1 && <span aria-hidden="true" className="chain-connector" />}
        </li>
      ))}
    </ol>
  );
}

function App() {
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
  const [projectorMode, setProjectorMode] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const guidePanel = useRef<HTMLDivElement>(null);
  const guideIndexRef = useRef<number | null>(null);
  const advanceGuideRef = useRef<() => void>(() => undefined);

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
    loadDemoData(controller.signal)
      .then((loaded) => {
        setData(loaded);
        setBudget(loaded.scenario.defaultBudget);
      })
      .catch(() => {
        // Aborted fetches (e.g. unmount) fall back to the embedded snapshot already set.
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Escape") {
        setGuideIndex(null);
        return;
      }
      const target = event.target as HTMLElement;
      const isControl = ["BUTTON", "INPUT", "SUMMARY"].includes(target.tagName);
      if (!isControl && event.key.toLowerCase() === "p") {
        setProjectorMode((mode) => !mode);
        return;
      }
      if (
        guideIndexRef.current !== null &&
        !isControl &&
        (event.key === "ArrowRight" || event.key === "Enter")
      ) {
        advanceGuideRef.current();
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

  function runPlan(nextGuard = guardEnabled, locks = currentLocks(), nextFloor = coverageFloor) {
    const next = allocateHours(data.areas, budget, nextFloor, nextGuard, locks);
    setPlan(next);
    setPlanDirty(false);
    setCopyStatus("");
    return next;
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
      `Review triggers: new month, budget or boundary change, wider interval, infeasible floor, or local knowledge conflict.`,
      `Privacy and authorization boundary: aggregate place-level evidence only; no block records or geometry ship. This does not track people, establish causality, authorize enforcement, or dispatch staff automatically.`,
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
  ]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(decisionBrief);
      setCopyStatus("Decision brief copied with assumptions and review triggers.");
    } catch {
      setCopyStatus("Clipboard unavailable. The full brief is open below for manual copy.");
    }
  }

  function beginGuide() {
    setGuideIndex(0);
    if (budget !== data.scenario.defaultBudget) {
      setBudget(data.scenario.defaultBudget);
      setPlan(null);
      setPlanDirty(false);
      setCopyStatus("");
    }
    revealDrop(false);
    window.setTimeout(() => {
      scrollTo("evidence-result");
      guidePanel.current?.focus();
    }, 80);
  }

  function advanceGuide() {
    if (guideIndex === null) return;
    const next = guideIndex + 1;
    if (guideIndex === 0) {
      scrollTo("forecast");
    } else if (guideIndex === 1) {
      setCoverageFloor(DEFAULT_COVERAGE_FLOOR);
      setLockedIds(new Set());
      setLockValues({});
      runPlan(true, new Map(), DEFAULT_COVERAGE_FLOOR);
      setGuardEnabled(true);
      scrollTo("planner");
    } else if (guideIndex === 2) {
      setCoverageFloor(DEFAULT_COVERAGE_FLOOR);
      const restored = runPlan(true, new Map(), DEFAULT_COVERAGE_FLOOR);
      setGuardEnabled(true);
      const first = data.areas[0];
      const firstHours = restored.allocations.find((row) => row.areaId === first.id)?.hours ?? 0;
      setLockedIds(new Set([first.id]));
      setLockValues({ [first.id]: firstHours });
      scrollTo("review");
    } else {
      setGuideIndex(null);
      return;
    }
    setGuideIndex(next);
    window.setTimeout(() => guidePanel.current?.focus(), 50);
  }

  useEffect(() => {
    advanceGuideRef.current = advanceGuide;
    // The ref intentionally tracks the latest callback; the keyboard listener remains stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanceGuide]);

  const classificationLabel =
    signal.classification === "wider_footprint"
      ? individualSpatial
        ? "People were seen in more places, not fewer"
        : "Field activity spread across more blocks"
      : titleCase(signal.classification);

  return (
    <div className={`app-shell ${projectorMode ? "projector-mode" : ""}`}>
      <a className="skip-link" href="#drop-test">
        Skip to decision
      </a>

      <header className="topbar" id="main-content">
        <div className="brand-lockup">
          <div aria-hidden="true" className="brand-mark">
            SH
          </div>
          <div>
            <strong>
              Still Here <span>SD</span>
            </strong>
            <small>Outreach continuity planner</small>
          </div>
        </div>
        <div className="decision-controls">
          <div className="header-context">
            <span className="eyebrow">Decision horizon</span>
            <strong>{data.scenario.decisionHorizon}</strong>
          </div>
          <label className="budget-control" htmlFor="budget-hours">
            <span className="eyebrow">Available capacity</span>
            <span className="budget-input-wrap">
              <input
                aria-label="Available staff-hours"
                aria-describedby="budget-help"
                id="budget-hours"
                inputMode="numeric"
                max={MAX_BUDGET_HOURS}
                min="0"
                step="1"
                onChange={(event) => {
                  setBudget(Number(event.target.value));
                  setPlan(null);
                  setPlanDirty(false);
                  setCopyStatus("");
                }}
                type="number"
                value={budget}
              />
              <span>hours</span>
            </span>
            <span className="sr-only" id="budget-help">
              Enter a whole number from 0 to 400. This is a demonstration scenario, not staffing
              capacity data.
            </span>
          </label>
          <button className="button button-quiet guide-button" onClick={beginGuide} type="button">
            <SparkIcon /> Guide demo
          </button>
          <button
            aria-pressed={projectorMode}
            className={`button button-quiet projector-toggle ${projectorMode ? "is-active" : ""}`}
            onClick={() => setProjectorMode((mode) => !mode)}
            type="button"
          >
            {projectorMode ? "Exit projector" : "Projector mode"}
          </button>
          <button
            aria-expanded={disclosuresOpen}
            aria-controls="disclosures"
            className="button button-quiet"
            onClick={() => setDisclosuresOpen((open) => !open)}
            type="button"
          >
            Data & limits
          </button>
        </div>
      </header>

      {disclosuresOpen && (
        <aside
          aria-label="Data and limitation disclosures"
          className="disclosure-drawer"
          id="disclosures"
        >
          <div>
            <span className="eyebrow">Local artifact</span>
            <h2>Traceable by design</h2>
          </div>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>{data.source.label}</dd>
            </div>
            <div>
              <dt>Coverage through</dt>
              <dd>{formatDate(data.source.retrievedAt)}</dd>
            </div>
            <div>
              <dt>Loaded from</dt>
              <dd>
                <code>{data.source.artifact}</code>
              </dd>
            </div>
            <div>
              <dt>Privacy</dt>
              <dd>No block records or geometry; small per-area component cells are omitted.</dd>
            </div>
            <div>
              <dt>AI use</dt>
              <dd>
                Development assistance only; no AI runs in the product or determines evidence,
                forecasts, or allocations.
              </dd>
            </div>
            <div>
              <dt>Non-goal</dt>
              <dd>No tracking, enforcement, eligibility, or automatic dispatch.</dd>
            </div>
          </dl>
          <button
            aria-label="Close data and limits"
            className="drawer-close"
            onClick={() => setDisclosuresOpen(false)}
            type="button"
          >
            ×
          </button>
        </aside>
      )}

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="status-line">
              <i className="status-dot" />{" "}
              {loading
                ? "Verifying local artifacts…"
                : data.origin === "generated"
                  ? "Generated analysis loaded"
                  : "Offline demo snapshot"}
            </span>
            <p className="kicker">
              Prepared decision · {data.scenario.focusArea} · {data.scenario.period}
            </p>
            <h1 id="hero-title">
              Fewer tents,
              <br />
              <em>or fewer people?</em>
            </h1>
            <p className="hero-lede">
              Downtown San Diego’s unsheltered estimate fell 22% in a year, but the drop came from
              tents, not people. On the exact same 261 blocks, outreach workers actually saw more
              people than the year before. This tool shows what really changed, how much is
              uncertain, and helps plan where the next outreach shift should go.
            </p>
            <div
              className="composition-lead"
              aria-label="Observed composition and active-block footprint comparison"
            >
              <div>
                <span>People seen in the field</span>
                <strong>+{formatNumber(signal.components.individuals.changePct, 1)}%</strong>
                <small>
                  {signal.components.individuals.from} → {signal.components.individuals.to}
                </small>
              </div>
              <div>
                <span>Tents & structures</span>
                <strong>{formatNumber(signal.components.structures.changePct, 1)}%</strong>
                <small>
                  {signal.components.structures.from} → {signal.components.structures.to}
                </small>
              </div>
              <div>
                <span>Vehicles</span>
                <strong>{formatNumber(signal.components.vehicles.changePct, 1)}%</strong>
                <small>
                  {signal.components.vehicles.from} → {signal.components.vehicles.to}
                </small>
              </div>
              <div>
                <span>{individualOne ? "Blocks where people were seen" : "Active blocks"}</span>
                <strong>
                  +
                  {individualOne
                    ? formatNumber((individualOne.change / individualOne.fromBlocks) * 100, 1)
                    : formatNumber(signal.activeChangePct, 1)}
                  %
                </strong>
                <small>
                  {individualOne?.fromBlocks ?? signal.activeFrom} →{" "}
                  {individualOne?.toBlocks ?? signal.activeTo}
                </small>
              </div>
              <p>Same month · same method · same {signal.panelSize} blocks</p>
            </div>
          </div>
          <div aria-label="Prepared scenario summary" className="hero-decision">
            <span className="eyebrow">The decision at hand</span>
            <p>
              Suppose <strong>{budget} staff-hours</strong> are available for next week’s outreach
              shifts. Which neighborhoods should get them?
            </p>
            <p className="capacity-note">
              The hours are an editable assumption, not staffing data. A real deployment would use
              the provider’s own schedule.
            </p>
            <div className="provisional-note">
              <span>{data.scenario.status === "ready" ? "✓ Prepared" : "◇ Provisional"}</span>{" "}
              Evidence limits and review triggers travel with the result.
            </div>
            <EvidenceChain data={data} />
          </div>
        </section>

        <nav aria-label="Decision steps" className="step-nav">
          <a href="#drop-test">
            <span>01</span> Test the drop
          </a>
          <a href="#forecast">
            <span>02</span> Check the forecast
          </a>
          <a href="#planner">
            <span>03</span> Plan the shift
          </a>
          <a href="#review">
            <span>04</span> Human review
          </a>
        </nav>

        <section className="decision-section" id="drop-test" aria-labelledby="drop-title">
          <div aria-hidden="true" className="section-number">
            01
          </div>
          <div className="section-intro">
            <p className="eyebrow">What actually changed</p>
            <h2 id="drop-title">Test the drop</h2>
            <p>
              The falling estimate is built from three things counted in the field: people, tents,
              and vehicles. Compare each one on the same {signal.panelSize} blocks, one January to
              the next, and see which of them actually dropped.
            </p>
          </div>

          <div className="metric-grid composition-metrics">
            <Metric
              label="People seen in the field"
              value={`${signal.components.individuals.from} → ${signal.components.individuals.to}`}
              detail={`+${formatNumber(signal.components.individuals.changePct, 1)}%`}
              tone="teal"
            />
            <Metric
              label="Tents & structures"
              value={`${signal.components.structures.from} → ${signal.components.structures.to}`}
              detail={`${formatNumber(signal.components.structures.changePct, 1)}%`}
              tone="amber"
            />
            <Metric
              label="Vehicles"
              value={`${signal.components.vehicles.from} → ${signal.components.vehicles.to}`}
              detail={`${formatNumber(signal.components.vehicles.changePct, 1)}%`}
            />
            <Metric
              label={individualOne ? "Blocks with at least one person" : "Active footprint"}
              value={`${formatNumber(individualOne?.fromBlocks ?? signal.activeFrom)} → ${formatNumber(individualOne?.toBlocks ?? signal.activeTo)}`}
              detail={
                individualOne
                  ? `+${individualOne.change} blocks · like-for-like`
                  : `+${formatNumber(signal.activeChangePct, 1)}% active blocks`
              }
              tone="teal"
            />
          </div>
          <details className="context-details">
            <summary>
              <span>How to read this comparison</span>
              <small>Panel, units, and date checks</small>
            </summary>
            <p className="mixed-index-note">
              <strong>Secondary mixed-component context:</strong> all active blocks{" "}
              {signal.activeFrom}
              {" → "}
              {signal.activeTo} (+{formatNumber(signal.activeChangePct, 1)}%); mixed-unit index{" "}
              {signal.fromValue} → {signal.toValue} ({formatNumber(signal.changePct, 1)}%). The
              index arithmetically sums unlike observation units—individuals, structures, and
              vehicles—and is not a count of unique people or an estimated person total. Panel fixed
              at {signal.panelSize} blocks.
            </p>
            <p className="comparison-defense">
              <CheckIcon /> This is the latest available same-month year-over-year pair in the
              supplied panel: January 2025 is its final date, both months use the POST2020 method,
              and the exact same {signal.panelSize} blocks are compared.
            </p>
          </details>

          {!dropRevealed ? (
            <div className="reveal-action">
              <button
                className="button button-primary button-large"
                onClick={() => revealDrop()}
                type="button"
              >
                <SparkIcon /> Test the drop
              </button>
              <span>Same result every run · bundled local data · no AI in the loop</span>
            </div>
          ) : (
            <div aria-live="polite" className="evidence-result reveal" id="evidence-result">
              <div className="result-header">
                <div className="result-symbol">
                  <ArrowDownIcon />
                </div>
                <div>
                  <p className="eyebrow">What the same-blocks comparison shows</p>
                  <h3 ref={resultHeading} tabIndex={-1}>
                    {classificationLabel}
                  </h3>
                  <p>
                    {individualSpatial
                      ? "People were seen on more blocks than last year, spread about as evenly as before. Tents disappeared from many blocks and bunched up in fewer."
                      : "Field activity reached more blocks while becoming more concentrated where it remained."}{" "}
                    These are on-site observations: they cannot say who moved where, or why.
                  </p>
                </div>
                <span className="confidence-chip">Human review required</span>
              </div>

              {individualSpatial &&
                individualOne &&
                individualTwo &&
                structureOne &&
                structureTwo && (
                  <div
                    className="component-proof"
                    aria-label="Like-for-like observed individual and tent footprint sensitivity"
                  >
                    <div className="distribution-heading">
                      <div>
                        <span className="eyebrow">The key check · same blocks, one year apart</span>
                        <strong>People were seen on more blocks, however strictly you count</strong>
                      </div>
                      <span>Same 261 blocks both years</span>
                    </div>
                    <div className="component-thresholds">
                      {[
                        { label: "Blocks with ≥1 person seen", value: individualOne, tone: "up" },
                        { label: "Blocks with ≥2 people seen", value: individualTwo, tone: "up" },
                        { label: "Blocks with ≥1 tent", value: structureOne, tone: "down" },
                        { label: "Blocks with ≥2 tents", value: structureTwo, tone: "down" },
                      ].map((item) => (
                        <div
                          className={`component-threshold component-${item.tone}`}
                          key={item.label}
                        >
                          <small>{item.label}</small>
                          <strong>
                            {item.value.fromBlocks} → {item.value.toBlocks}
                          </strong>
                          <span>
                            {item.value.change > 0 ? "+" : ""}
                            {item.value.change} blocks
                          </span>
                        </div>
                      ))}
                    </div>
                    {structureSpatial && (
                      <div className="component-concentration">
                        <span>
                          <strong>Individuals: similar concentration</strong>
                          HHI {individualSpatial.hhiFrom.toFixed(6)} →{" "}
                          {individualSpatial.hhiTo.toFixed(6)} · effective blocks{" "}
                          {formatNumber(individualSpatial.effectiveBlocksFrom, 1)} →{" "}
                          {formatNumber(individualSpatial.effectiveBlocksTo, 1)}
                        </span>
                        <span>
                          <strong>Tents: sharper concentration</strong>
                          HHI {structureSpatial.hhiFrom.toFixed(6)} →{" "}
                          {structureSpatial.hhiTo.toFixed(6)} · effective blocks{" "}
                          {formatNumber(structureSpatial.effectiveBlocksFrom, 1)} →{" "}
                          {formatNumber(structureSpatial.effectiveBlocksTo, 1)}
                        </span>
                      </div>
                    )}
                    {signal.componentDistribution?.derivedEstimate && (
                      <div className="derived-bridge">
                        <div>
                          <span className="eyebrow">Why the adjusted estimate can fall</span>
                          <strong>
                            {formatNumber(signal.componentDistribution.derivedEstimate.from, 1)} →{" "}
                            {formatNumber(signal.componentDistribution.derivedEstimate.to, 1)}{" "}
                            <em>
                              (
                              {formatNumber(
                                signal.componentDistribution.derivedEstimate.changePct,
                                1,
                              )}
                              %)
                            </em>
                          </strong>
                          <small>Secondary POST2020 multiplier-derived estimate</small>
                        </div>
                        <div className="decomposition-values">
                          <span>
                            Individuals{" "}
                            <strong>
                              +
                              {formatNumber(
                                signal.componentDistribution.derivedEstimate
                                  .individualsContribution,
                                1,
                              )}
                            </strong>
                          </span>
                          <span>
                            Structures{" "}
                            <strong>
                              {formatNumber(
                                signal.componentDistribution.derivedEstimate.structuresContribution,
                                1,
                              )}
                            </strong>
                          </span>
                          <span>
                            Vehicles{" "}
                            <strong>
                              {formatNumber(
                                signal.componentDistribution.derivedEstimate.vehiclesContribution,
                                1,
                              )}
                            </strong>
                          </span>
                        </div>
                        <p>
                          The derived decline is structure-driven and partly offset by more observed
                          individuals. Components were digitized from maps; this is not a
                          unique-person count or the published total series.
                        </p>
                      </div>
                    )}
                    <p>{signal.componentDistribution?.interpretation}</p>
                  </div>
                )}

              <details className="evidence-details">
                <summary>
                  <span>Explore supporting evidence</span>
                  <small>Thresholds, geography, limits, and review triggers</small>
                </summary>

                {signal.distributionSensitivity && (
                  <div
                    className="distribution-proof distribution-secondary"
                    aria-label="Secondary mixed-unit active-block threshold and concentration sensitivity"
                  >
                    <div className="distribution-heading">
                      <div>
                        <span className="eyebrow">Secondary mixed-unit sensitivity</span>
                        <strong>Mixed threshold dependence and composition-driven HHI</strong>
                      </div>
                      <span>Not a person count</span>
                    </div>
                    <div className="threshold-row">
                      {signal.distributionSensitivity.thresholds.map((threshold) => (
                        <div key={threshold.minimumUnits}>
                          <small>
                            Active blocks ≥{threshold.minimumUnits} unit
                            {threshold.minimumUnits > 1 ? "s" : ""}
                          </small>
                          <strong>
                            {threshold.fromBlocks} → {threshold.toBlocks}
                          </strong>
                          <span className={threshold.change > 0 ? "delta-up" : "threshold-flat"}>
                            {threshold.change > 0 ? "+" : ""}
                            {threshold.change} · {threshold.entered} entered / {threshold.exited}{" "}
                            exited
                          </span>
                        </div>
                      ))}
                      <div className="concentration-result">
                        <small>Intensity concentration</small>
                        <strong>
                          HHI +{formatNumber(signal.distributionSensitivity.hhiChangePct, 1)}%
                        </strong>
                        <span>
                          effective blocks{" "}
                          {formatNumber(signal.distributionSensitivity.effectiveBlocksFrom, 1)} →{" "}
                          {formatNumber(signal.distributionSensitivity.effectiveBlocksTo, 1)}
                        </span>
                      </div>
                    </div>
                    <p>
                      Single-unit blocks grew {signal.distributionSensitivity.singleUnitFrom} →{" "}
                      {signal.distributionSensitivity.singleUnitTo} (+
                      {signal.distributionSensitivity.singleUnitChange}), but do not alone explain
                      the +{signal.activeChange} at ≥1 because ≥2 still rises. HHI{" "}
                      {signal.distributionSensitivity.hhiFrom.toFixed(6)} →{" "}
                      {signal.distributionSensitivity.hhiTo.toFixed(6)} is composition-driven; this
                      secondary mixed index does not establish uniform spread or track movement.
                    </p>
                  </div>
                )}

                <div className="evidence-grid">
                  <div className="churn-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">Secondary mixed-unit index</span>
                        <h4>Index churn inside the stable panel</h4>
                      </div>
                      <span className="formula">
                        +{signal.grossIncreases} − {signal.grossDecreases} = {signal.change}
                      </span>
                    </div>
                    <div
                      className="churn-visual"
                      aria-label={`${signal.grossIncreases} increases, ${signal.grossDecreases} decreases, net ${signal.change}`}
                      role="img"
                    >
                      <div
                        className="churn-up"
                        style={
                          {
                            "--bar": `${(signal.grossIncreases / Math.max(signal.grossIncreases, signal.grossDecreases)) * 100}%`,
                          } as CSSProperties
                        }
                      >
                        <span>Gross increases</span>
                        <strong>+{signal.grossIncreases}</strong>
                      </div>
                      <div
                        className="churn-down"
                        style={
                          {
                            "--bar": `${(signal.grossDecreases / Math.max(signal.grossIncreases, signal.grossDecreases)) * 100}%`,
                          } as CSSProperties
                        }
                      >
                        <span>Gross decreases</span>
                        <strong>−{signal.grossDecreases}</strong>
                      </div>
                    </div>
                    <p className="method-note">
                      <CheckIcon /> Individuals, tents/structures, and vehicles each count as one
                      raw unit here. This is not a person estimate; the footprint is fixed at{" "}
                      {signal.panelSize} blocks.
                    </p>
                  </div>

                  <div className="area-view-card">
                    <div className="card-heading">
                      <div>
                        <span className="eyebrow">Aggregate context</span>
                        <h4>Where the signal changed</h4>
                      </div>
                      <span className="formula positive">Active blocks +{signal.activeChange}</span>
                    </div>
                    <AreaMap
                      areas={data.areas}
                      ariaLabel="Schematic map of the six downtown neighborhoods showing the change in raw field observations"
                      valueFor={(area) => ({
                        text: `${area.delta > 0 ? "+" : ""}${area.delta}`,
                        tone: area.delta > 0 ? "up" : "down",
                      })}
                    />
                    <div className="map-legend" aria-label="Map legend">
                      <span>
                        <i className="map-legend-up" /> More observed units
                      </span>
                      <span>
                        <i className="map-legend-down" /> Fewer observed units
                      </span>
                    </div>
                    <p className="map-caption">
                      Change in raw field observations by neighborhood · schematic, not to scale ·
                      not a count of people
                    </p>
                  </div>
                </div>

                <div className="evidence-balance">
                  <div>
                    <span className="evidence-icon evidence-for">+</span>
                    <p>
                      <strong>Evidence for</strong>Observed individuals increased while structures
                      fell; individual observations reached more fixed-panel blocks at both tested
                      thresholds.
                    </p>
                  </div>
                  <div>
                    <span className="evidence-icon evidence-against">!</span>
                    <p>
                      <strong>Evidence boundary</strong>No identities, movement paths, or causal
                      explanation are observed.
                    </p>
                  </div>
                  <div>
                    <span className="evidence-icon evidence-check">✓</span>
                    <p>
                      <strong>Validity check</strong>Stable panel, explicit missingness, source-era
                      labels kept separate.
                    </p>
                  </div>
                </div>

                <aside aria-labelledby="challenge-title" className="challenge-card">
                  <div className="challenge-heading">
                    <div>
                      <span className="eyebrow">Adversarial checkpoint</span>
                      <h4 id="challenge-title">What would change our mind?</h4>
                    </div>
                    <span className="challenge-badge">Open to revision</span>
                  </div>
                  <p>
                    This result is useful because its failure conditions are explicit. Any one of
                    these findings would downgrade the conclusion or trigger a new review.
                  </p>
                  <ul>
                    <li>
                      One of the matched months is later found to be incomplete or misclassified.
                    </li>
                    <li>
                      A boundary or method change makes the 261-block comparison non-comparable.
                    </li>
                    <li>
                      Source review explains the 2023–2024 discontinuity as collection change.
                    </li>
                    <li>
                      New held-out data materially weakens forecast error or interval coverage.
                    </li>
                  </ul>
                </aside>
              </details>

              {data.reportingBias ? (
                <details className="bias-diagnostic">
                  <summary>
                    <span>
                      <small>Optional attention-bias check</small>
                      Encampment report share rose{" "}
                      {formatNumber(
                        data.reportingBias.matchedCalendar?.shareChangePoints ??
                          data.reportingBias.shareChangePoints,
                        1,
                      )}{" "}
                      points
                    </span>
                    <strong>Excluded from planner</strong>
                  </summary>
                  <div className="bias-body">
                    <div className="bias-heading">
                      <div>
                        <span className="eyebrow">Get It Done · descriptive diagnostic</span>
                        <h4>Did public reporting attention change?</h4>
                      </div>
                      <span className="diagnostic-only">Diagnostic only · no causal claim</span>
                    </div>

                    {data.reportingBias.matchedCalendar && (
                      <div className="matched-calendar">
                        <div>
                          <span className="eyebrow">
                            Matched calendar · same Aug–Jan months YoY
                          </span>
                          <strong>Seasonality check strengthens the reporting-pattern shift</strong>
                        </div>
                        <div className="bias-metrics">
                          <div>
                            <span>Encampment rows</span>
                            <strong>
                              +{formatNumber(data.reportingBias.matchedCalendar.rawChangePct, 1)}%
                            </strong>
                          </div>
                          <div>
                            <span>Top-level requests</span>
                            <strong>
                              +
                              {formatNumber(
                                data.reportingBias.matchedCalendar.uniqueParentChangePct,
                                1,
                              )}
                              %
                            </strong>
                          </div>
                          <div>
                            <span>All GID rows</span>
                            <strong>
                              +
                              {formatNumber(
                                data.reportingBias.matchedCalendar.allReportsChangePct,
                                1,
                              )}
                              %
                            </strong>
                          </div>
                          <div>
                            <span>Encampment share</span>
                            <strong>
                              {formatNumber(data.reportingBias.matchedCalendar.sharePrePct, 1)} →{" "}
                              {formatNumber(data.reportingBias.matchedCalendar.sharePostPct, 1)}%
                            </strong>
                          </div>
                        </div>
                        <p>{data.reportingBias.matchedCalendar.interpretation}</p>
                      </div>
                    )}

                    <span className="eyebrow diagnostic-subhead">
                      Prepared pre/post windows · July 2023 excluded
                    </span>
                    <div className="bias-metrics">
                      <div>
                        <span>Encampment rows</span>
                        <strong>+{formatNumber(data.reportingBias.rawChangePct, 1)}%</strong>
                      </div>
                      <div>
                        <span>Unique parents</span>
                        <strong>
                          +{formatNumber(data.reportingBias.uniqueParentChangePct, 1)}%
                        </strong>
                      </div>
                      <div>
                        <span>All GID rows</span>
                        <strong>+{formatNumber(data.reportingBias.allReportsChangePct, 1)}%</strong>
                      </div>
                      <div>
                        <span>Encampment share</span>
                        <strong>
                          {formatNumber(data.reportingBias.sharePrePct, 1)} →{" "}
                          {formatNumber(data.reportingBias.sharePostPct, 1)}%
                        </strong>
                      </div>
                      <div>
                        <span>Placebo basket</span>
                        <strong>{formatNumber(data.reportingBias.placeboChangePct, 1)}%</strong>
                      </div>
                    </div>

                    <div className="checkpoint-block">
                      <div>
                        <span className="eyebrow">Cross-source checkpoints</span>
                        <p>Raw reports per published total unit—not reports per person.</p>
                      </div>
                      <div className="checkpoint-list">
                        {data.reportingBias.checkpoints.map((checkpoint) => (
                          <div key={checkpoint.month}>
                            <span>{checkpoint.month}</span>
                            <strong>{formatNumber(checkpoint.rawPerPublishedUnit, 2)}×</strong>
                            <small>
                              {formatNumber(checkpoint.rawReports)} raw reports /{" "}
                              {formatNumber(checkpoint.publishedTotal)} published units
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>

                    {data.robustness ? (
                      <section className="robustness-section" aria-labelledby="robustness-title">
                        <div className="robustness-section-title">
                          <span className="eyebrow" id="robustness-title">
                            Alternative explanations tested
                          </span>
                          <strong>Two descriptive sensitivity checks</strong>
                        </div>
                        <div className="robustness-grid">
                          <article className="robustness-card">
                            <div className="robustness-title">
                              <span className="eyebrow">Footfall sensitivity</span>
                              <strong>Paid-parking proxy</strong>
                              <small>
                                {data.robustness.parking.matchedCalendar
                                  ? "Same six calendar months one year apart"
                                  : "Aligned six-month means · July 2023 excluded"}
                              </small>
                            </div>
                            <div className="parking-result">
                              <span>
                                <small>
                                  {formatNumber(
                                    data.robustness.parking.matchedCalendar?.verifiedPoles ??
                                      data.robustness.parking.verifiedPoles,
                                  )}{" "}
                                  historically verified poles
                                </small>
                                <strong>
                                  {formatNumber(
                                    data.robustness.parking.matchedCalendar?.preMonthlyMean ??
                                      data.robustness.parking.preMonthlyMean,
                                  )}{" "}
                                  →{" "}
                                  {formatNumber(
                                    data.robustness.parking.matchedCalendar?.postMonthlyMean ??
                                      data.robustness.parking.postMonthlyMean,
                                  )}
                                </strong>
                                <small>
                                  transactions / month ·{" "}
                                  {formatNumber(
                                    data.robustness.parking.matchedCalendar?.changePct ??
                                      data.robustness.parking.changePct,
                                    1,
                                  )}
                                  %
                                </small>
                              </span>
                              <span>
                                <small>
                                  {data.robustness.parking.matchedCalendar
                                    ? "All observed Downtown meters"
                                    : "Per meter-month"}
                                </small>
                                <strong>
                                  {data.robustness.parking.matchedCalendar
                                    ? `${formatNumber(data.robustness.parking.matchedCalendar.allMeterChangePct, 1)}%`
                                    : `${formatNumber(data.robustness.parking.prePerMeter, 1)} → ${formatNumber(data.robustness.parking.postPerMeter, 1)}`}
                                </strong>
                                <small>
                                  {data.robustness.parking.matchedCalendar
                                    ? "matched-calendar sensitivity"
                                    : `all observed meters ${formatNumber(data.robustness.parking.allMeterChangePct, 1)}%`}
                                </small>
                              </span>
                            </div>
                            <p>
                              {data.robustness.parking.matchedCalendar?.interpretation ??
                                data.robustness.parking.interpretation}
                            </p>
                            <small className="robustness-caveat">
                              Transactions ≠ people or visits. Rates, hours, inventory, payment
                              substitution, free parking, events, transit, economy, and seasonality
                              remain possible; the parking zone is not a proven GID-boundary match.
                            </small>
                          </article>

                          <article className="robustness-card">
                            <div className="robustness-title">
                              <span className="eyebrow">Count-day sensitivity</span>
                              <strong>NOAA weather was nearly matched</strong>
                            </div>
                            <div className="weather-dates">
                              {data.robustness.weather.dates.map((date) => (
                                <span key={date.date}>
                                  <small>{formatDate(date.date)}</small>
                                  <strong>{formatNumber(date.maximumTemperature)}°F</strong>
                                  <small>{formatNumber(date.precipitation, 2)} in rain</small>
                                </span>
                              ))}
                            </div>
                            <p>{data.robustness.weather.interpretation}</p>
                            <small className="robustness-caveat">
                              {data.robustness.weather.station}. This rules out only an obvious
                              same-day rain/TMAX contrast; airport conditions and prior weather may
                              differ.
                            </small>
                          </article>
                        </div>
                      </section>
                    ) : (
                      <p className="diagnostic-unavailable" role="note">
                        Alternative-explanation checks are unavailable in this artifact. They remain
                        excluded from forecasting and allocation.
                      </p>
                    )}

                    <p className="bias-interpretation">{data.reportingBias.interpretation}</p>
                    <div className="sensitivity-row">
                      <span>
                        Duplicate-child share {formatNumber(data.reportingBias.duplicatePrePct, 1)}{" "}
                        → {formatNumber(data.reportingBias.duplicatePostPct, 1)}%
                      </span>
                      <span>
                        Mobile-origin share {formatNumber(data.reportingBias.mobilePrePct, 1)} →{" "}
                        {formatNumber(data.reportingBias.mobilePostPct, 1)}%
                      </span>
                      <span>
                        <code>comm_plan_name=DOWNTOWN</code> · <code>date_requested</code> · July
                        2023 excluded
                      </span>
                    </div>
                    <p className="bias-exclusion">
                      <strong>Never used for:</strong> planning load, outreach allocation, people or
                      movement, abatement, case response, intervention effects, or the forecast.
                    </p>
                  </div>
                </details>
              ) : (
                <div className="diagnostic-unavailable" role="note">
                  <strong>Optional reporting diagnostic unavailable.</strong> The loaded artifact
                  did not contain a complete validated diagnostic, so no partial values are shown.
                  This lane remains excluded from forecasting and allocation.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="decision-section" id="forecast" aria-labelledby="forecast-title">
          <div aria-hidden="true" className="section-number">
            02
          </div>
          <div className="section-intro split-intro">
            <div>
              <p className="eyebrow">Forecast rehearsal · only past data used</p>
              <h2 id="forecast-title">Could we have predicted January 2026?</h2>
              <p>
                Using only data available in December 2025, the tool forecasts the next month, then
                grades itself: how far off were forecasts like this in the past? The plan below uses
                the high end of that error range, so uncertainty buys extra coverage instead of
                being ignored.
              </p>
            </div>
            <span className="wide-warning">A rehearsal on past data · not a live forecast</span>
          </div>

          <div className="forecast-layout">
            <div className="chart-card">
              <div className="chart-summary">
                <div>
                  <span className="eyebrow">{data.forecast.targetPeriod}</span>
                  <strong>{formatNumber(data.forecast.point)}</strong>
                  <small>best single guess</small>
                </div>
                <div>
                  <span className="eyebrow">Likely range, from past errors</span>
                  <strong>
                    {formatNumber(data.forecast.lower)}–{formatNumber(data.forecast.upper)}
                  </strong>
                  <small>the plan uses the high end</small>
                </div>
              </div>
              <ForecastChart data={data.forecast} history={data.history} />
            </div>

            <div className="model-card">
              <div className="card-heading">
                <div>
                  <span className="eyebrow">Rolling-origin backtest</span>
                  <h3>Model scorecard</h3>
                </div>
                <span className="selected-chip">
                  {data.forecast.scorecard
                    .find((model) => model.selected)
                    ?.model.toLowerCase()
                    .includes("seasonal naive")
                    ? "Baseline retained"
                    : "Challenger promoted"}
                </span>
              </div>
              <p className="model-rule">
                A candidate is promoted only if it improves held-out error. Lower MAE and WAPE are
                better; interval coverage is audited separately.
              </p>
              <div className="model-audit" aria-label="Final 2025 walk-forward audit">
                <span>
                  <small>Audit MAE</small>
                  <strong>{formatNumber(data.forecast.mae, 1)}</strong>
                </span>
                <span>
                  <small>Audit WAPE</small>
                  <strong>{formatNumber(data.forecast.wape, 1)}%</strong>
                </span>
                <span>
                  <small>Interval coverage</small>
                  <strong>{formatNumber(data.forecast.coverage)}%</strong>
                  <small>{data.forecast.intervalPoints} held-out folds</small>
                </span>
              </div>
              <div className="scorecard-table-wrap">
                <table className="scorecard-table">
                  <caption className="sr-only">Rolling-origin forecast model comparison</caption>
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>MAE</th>
                      <th>WAPE</th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.forecast.scorecard.map((model) => (
                      <tr className={model.selected ? "selected-model" : ""} key={model.model}>
                        <th>
                          {model.model}
                          {model.selected && <span>Selected</span>}
                        </th>
                        <td>{formatNumber(model.mae)}</td>
                        <td>{formatNumber(model.wape, 1)}%</td>
                        <td>
                          {model.coverage === null ? "—" : `${formatNumber(model.coverage)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="model-validation">
                <CheckIcon />
                <span>
                  <strong>No black-box promotion.</strong> Seasonal baseline remains unless a
                  candidate wins out of sample.
                </span>
              </div>
            </div>
          </div>

          <details className="data-table-disclosure">
            <summary>View accessible scenario values & method</summary>
            <div className="table-scroll">
              <table>
                <caption>
                  Observed history and historical one-step-ahead scenario shown in the chart
                </caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Lower</th>
                    <th>Upper</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((point) => (
                    <tr key={point.period}>
                      <th>{point.period}</th>
                      <td>{point.value === null ? "Missing" : "Observed"}</td>
                      <td>{point.value ?? "—"}</td>
                      <td>—</td>
                      <td>—</td>
                    </tr>
                  ))}
                  <tr>
                    <th>{data.forecast.targetPeriod}</th>
                    <td>Historical scenario</td>
                    <td>{formatNumber(data.forecast.point)}</td>
                    <td>{formatNumber(data.forecast.lower)}</td>
                    <td>{formatNumber(data.forecast.upper)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Training:</strong> {data.forecast.trainingWindow}. Rolling-origin evaluation;
              no interpolation across missing targets. Data are frozen at December 2025; the
              historical scenario’s upper bound feeds only this demonstration allocation. The
              residual band achieved {formatNumber(data.forecast.coverage)}% empirical coverage
              across {data.forecast.intervalPoints} folds; it is not a guaranteed 80% probability
              statement.
            </p>
          </details>
        </section>

        <section className="decision-section" id="planner" aria-labelledby="planner-title">
          <div aria-hidden="true" className="section-number">
            03
          </div>
          <div className="section-intro split-intro planner-intro">
            <div>
              <p className="eyebrow">The staffing plan</p>
              <h2 id="planner-title">Plan {budget} staff-hours</h2>
              <p>
                Split the hours across the six neighborhoods. First, every area gets a minimum you
                choose, so no place goes unvisited. Whatever remains goes where the forecast expects
                the most people.
              </p>
            </div>
            <div className={`guard-status ${guardEnabled ? "guard-on" : "guard-off"}`}>
              <span>{guardEnabled ? "✓" : "!"}</span>
              <div>
                <small>Guaranteed minimum</small>
                <strong>
                  {guardEnabled ? `ON · ${coverageFloor}h per area` : "OFF · COMPARISON ONLY"}
                </strong>
              </div>
            </div>
          </div>

          <div className="coverage-policy" aria-label="Coverage-continuity floor sensitivity">
            <div>
              <span className="eyebrow">You set this · the tool never picks it</span>
              <strong>Guaranteed minimum hours for every neighborhood</strong>
            </div>
            <div className="floor-options">
              {[0, 4, 8].map((floor) => (
                <button
                  aria-pressed={
                    floor === 0 ? !guardEnabled : guardEnabled && coverageFloor === floor
                  }
                  className={`floor-option ${floor === 0 ? (!guardEnabled ? "active" : "") : guardEnabled && coverageFloor === floor ? "active" : ""}`}
                  key={floor}
                  onClick={() => setCoveragePolicy(floor)}
                  type="button"
                >
                  <strong>{floor}h</strong>
                  <span>{floor === 0 ? "no minimum" : floor === 8 ? "default" : "compare"}</span>
                </button>
              ))}
            </div>
          </div>
          <p aria-live="polite" className="policy-lens">
            <strong>Policy lens:</strong>{" "}
            {coverageFloor === 0
              ? "with no minimum, hours follow the forecast alone. Use this to see which neighborhoods would be left with almost nothing; it is a comparison view, not a recommendation."
              : `${data.areas.length * coverageFloor} of ${budget} hours are set aside first (${coverageFloor} per neighborhood); the rest follows the forecast.`}
          </p>

          {!plan ? (
            <div className="planner-start">
              <div className="constraint-equation">
                <span>
                  {budget}
                  <small>available</small>
                </span>
                <b>=</b>
                <span>
                  {data.areas.length * coverageFloor}
                  <small>guaranteed minimums</small>
                </span>
                <b>+</b>
                <span>
                  {Math.max(0, budget - data.areas.length * coverageFloor)}
                  <small>follow the forecast</small>
                </span>
              </div>
              <button
                className="button button-primary button-large"
                disabled={!budgetValid}
                onClick={() => runPlan()}
                type="button"
              >
                <SparkIcon /> Generate coverage scenario
              </button>
              {!budgetValid && (
                <p className="budget-invalid" role="status">
                  Enter a whole number of hours between 0 and {MAX_BUDGET_HOURS} to generate a plan.
                </p>
              )}
            </div>
          ) : !plan.feasible ? (
            <div className="infeasible" role="alert">
              <span>!</span>
              <div>
                <h3>No feasible plan</h3>
                <p>{plan.message}</p>
                <p>Increase the budget, remove a lock, or explicitly revise the floor.</p>
              </div>
            </div>
          ) : (
            <div aria-live="polite" className="plan-result reveal">
              <div className="plan-toolbar">
                <p>
                  <strong>
                    {planTotal}/{budget} hours allocated.
                  </strong>{" "}
                  {plan.message}
                </p>
                <div>
                  <button
                    className={`button ${guardEnabled ? "button-audit" : "button-primary"}`}
                    onClick={() => setGuard(!guardEnabled)}
                    type="button"
                  >
                    {guardEnabled
                      ? "Compare with no minimum"
                      : `Restore the ${coverageFloor || DEFAULT_COVERAGE_FLOOR}h minimum`}
                  </button>
                  <button
                    className="button button-quiet"
                    onClick={() => {
                      setLockedIds(new Set());
                      setLockValues({});
                      runPlan(guardEnabled, new Map());
                    }}
                    type="button"
                  >
                    Reset locks
                  </button>
                </div>
              </div>

              {!guardEnabled && (
                <div className="audit-banner" role="status">
                  <strong>Comparison view, not a recommendation.</strong>{" "}
                  {coverageFloor > 0
                    ? `With no minimum enforced, areas below ${coverageFloor}h would lose their guaranteed visit.`
                    : "This shows what happens with no guaranteed minimum: some neighborhoods get almost nothing."}
                </div>
              )}

              <div className="area-accuracy-warning" role="note">
                <strong>Illustrative and human-review-only.</strong> Aggregate audit WAPE is{" "}
                {formatNumber(data.forecast.wape, 1)}%.{" "}
                {auditedAreas.length
                  ? `Area-level held-out WAPE ranges ${formatNumber(Math.min(...auditedAreaWapes), 1)}%–${formatNumber(Math.max(...auditedAreaWapes), 1)}%; small areas are noisier.`
                  : "Area-level held-out WAPE is unavailable in this artifact."}{" "}
                The aggregate score does not imply equal area accuracy; a coordinator must review
                every assignment.
              </div>

              <div
                className="allocation-list"
                role="list"
                aria-label="Illustrative staff-hour allocation"
              >
                {data.areas.map((area) => {
                  const hours = allocationById.get(area.id) ?? 0;
                  const locked = lockedIds.has(area.id);
                  const belowFloor = hours < coverageFloor;
                  return (
                    <article
                      className={`allocation-row ${belowFloor ? "below-floor" : ""}`}
                      key={area.id}
                      role="listitem"
                    >
                      <div className="area-name">
                        <strong>{area.name}</strong>
                        <span>
                          Planning for up to {formatNumber(area.planningLoad, 1)} observations ·
                          minimum hours plus a share of the rest
                        </span>
                      </div>
                      <div aria-hidden="true" className="allocation-bar-track">
                        <i style={{ width: `${(hours / maxHours) * 100}%` }} />
                      </div>
                      <label className="hours-input">
                        <span className="sr-only">Hours for {area.name}</span>
                        <input
                          aria-label={`Hours for ${area.name}`}
                          disabled={!locked}
                          min="0"
                          onChange={(event) => {
                            setLockValues((values) => ({
                              ...values,
                              [area.id]: Number(event.target.value),
                            }));
                            setPlanDirty(true);
                          }}
                          type="number"
                          value={locked ? (lockValues[area.id] ?? hours) : hours}
                        />
                        <span>h</span>
                      </label>
                      <label className="lock-control">
                        <input
                          aria-label={`Lock ${area.name} at ${hours} hours`}
                          checked={locked}
                          onChange={() => toggleLock(area.id)}
                          type="checkbox"
                        />
                        <span>{locked ? "Locked" : "Lock"}</span>
                      </label>
                      <span
                        className={`constraint-chip ${belowFloor ? "constraint-fail" : "constraint-pass"}`}
                      >
                        {!guardEnabled
                          ? "No minimum"
                          : belowFloor
                            ? "Below minimum"
                            : `${coverageFloor}h minimum met`}
                      </span>
                    </article>
                  );
                })}
              </div>

              <div className="plan-map">
                <div className="plan-map-heading">
                  <span className="eyebrow">The plan on the map</span>
                  <p>
                    Every neighborhood keeps its guaranteed minimum; the extra hours go where the
                    forecast expects the most people.
                  </p>
                </div>
                <AreaMap
                  areas={data.areas}
                  ariaLabel="Schematic map of the six downtown neighborhoods showing planned staff-hours"
                  valueFor={(area) => {
                    const hours = allocationById.get(area.id) ?? 0;
                    return {
                      text: `${hours}h`,
                      tone: guardEnabled && hours < coverageFloor ? "down" : "neutral",
                    };
                  }}
                />
                <p className="map-caption">
                  Planned staff-hours by neighborhood · schematic, not to scale
                </p>
              </div>

              <div className="plan-footer">
                <div>
                  <span className="eyebrow">Constraint check</span>
                  <strong>
                    {planTotal === budget ? "Budget conserved exactly" : "Budget mismatch"}
                  </strong>
                </div>
                <div>
                  <span className="eyebrow">Human changes</span>
                  <strong>
                    {lockedIds.size
                      ? `${lockedIds.size} locked assignment${lockedIds.size > 1 ? "s" : ""}`
                      : "None yet"}
                  </strong>
                </div>
                {planDirty && (
                  <button
                    className="button button-primary"
                    disabled={!budgetValid}
                    onClick={() => runPlan()}
                    type="button"
                  >
                    Recompute unlocked hours
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        <section
          className="decision-section review-section"
          id="review"
          aria-labelledby="review-title"
        >
          <div aria-hidden="true" className="section-number">
            04
          </div>
          <div className="section-intro split-intro">
            <div>
              <p className="eyebrow">You decide</p>
              <h2 id="review-title">Review before the next shift</h2>
              <p>
                The tool writes the plan up with its caveats attached. A coordinator decides what
                local context changes.
              </p>
            </div>
            <span className={`review-status ${planReady ? "review-ready" : ""}`}>
              {planReady
                ? "Ready for coordinator review"
                : plan?.feasible && !guardEnabled
                  ? "Comparison view · restore a minimum to continue"
                  : plan?.feasible && planTotal !== budget
                    ? "Budget mismatch · cannot copy"
                    : planDirty
                      ? "Recompute human changes"
                      : "Waiting for a feasible plan"}
            </span>
          </div>

          <div className="brief-grid">
            <div className="brief-summary">
              <div>
                <span>What changed</span>
                <strong>
                  Individuals +{formatNumber(signal.components.individuals.changePct, 1)}% ·
                  structures {formatNumber(signal.components.structures.changePct, 1)}%
                </strong>
              </div>
              <div>
                <span>What may be hidden</span>
                <strong>
                  Active blocks +{signal.activeChange}
                  {signal.distributionSensitivity
                    ? ` · HHI +${formatNumber(signal.distributionSensitivity.hhiChangePct, 1)}%`
                    : ""}
                </strong>
              </div>
              <div>
                <span>Historical Jan 2026 range</span>
                <strong>
                  {formatNumber(data.forecast.lower)}–{formatNumber(data.forecast.upper)}
                </strong>
              </div>
              <div>
                <span>Illustrative capacity</span>
                <strong>{plan?.feasible ? `${planTotal} staff-hours` : "Run planner"}</strong>
              </div>
              <div>
                <span>Coverage-continuity policy</span>
                <strong>
                  {guardEnabled
                    ? `${coverageFloor}h demo-policy minimum`
                    : "No minimum · comparison only"}
                </strong>
              </div>
              <div>
                <span>Human overrides</span>
                <strong>{lockedIds.size || "None"}</strong>
              </div>
            </div>

            <div className="review-triggers">
              <span className="eyebrow">Review again when</span>
              <div className="trigger-list">
                <span>New month</span>
                <span>Budget changes</span>
                <span>Boundary changes</span>
                <span>Interval widens</span>
                <span>Floor infeasible</span>
                <span>Local knowledge conflicts</span>
              </div>
              <p>
                <strong>Never authorized:</strong> person tracking, causal claims, enforcement,
                eligibility decisions, or automatic dispatch.
              </p>
            </div>
          </div>

          <div className="limitations-row">
            {data.limitations.slice(0, 3).map((limitation, index) => (
              <details key={limitation}>
                <summary>
                  {["Boundary card", "Model card", "Claim limits"][index] ?? "Limitation"}
                </summary>
                <p>{limitation}</p>
              </details>
            ))}
          </div>

          <div className="brief-action">
            <div>
              <span className="eyebrow">Portable output</span>
              <p>
                Copies the allocation with source, model, constraints, caveats, and human changes
                attached.
              </p>
            </div>
            <button
              className="button button-primary button-large"
              disabled={!planReady}
              onClick={copyBrief}
              type="button"
            >
              Copy decision brief
            </button>
          </div>
          {copyStatus && (
            <p className="copy-status" role="status">
              {copyStatus}
            </p>
          )}
          {copyStatus && (
            <details className="brief-preview" open>
              <summary>Full decision brief</summary>
              <pre>{decisionBrief}</pre>
            </details>
          )}
        </section>

        <footer className="footer">
          <div>
            <strong>Still Here SD</strong>
            <span>See beyond the count. Plan the next shift.</span>
          </div>
          <p>Aggregate places. Explicit uncertainty. Human decisions.</p>
        </footer>
      </main>

      {guideIndex !== null && (
        <div
          className="guide-panel"
          role="dialog"
          aria-labelledby="guide-title"
          aria-live="polite"
          ref={guidePanel}
          tabIndex={-1}
        >
          <div className="guide-progress">
            <span style={{ width: `${((guideIndex + 1) / GUIDE_STEPS.length) * 100}%` }} />
          </div>
          <h2 className="eyebrow" id="guide-title">
            Step {guideIndex + 1} of {GUIDE_STEPS.length} · press → to continue
          </h2>
          <p>{GUIDE_STEPS[guideIndex]}</p>
          <div>
            <button
              className="button button-quiet"
              onClick={() => setGuideIndex(null)}
              type="button"
            >
              Stop
            </button>
            <button className="button button-primary" onClick={advanceGuide} type="button">
              {guideIndex === GUIDE_STEPS.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
