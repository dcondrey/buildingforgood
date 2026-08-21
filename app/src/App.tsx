import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./App.css";
import { EMBEDDED_DEMO, loadDemoData, type DemoData, type HistoryPoint } from "./lib/demo";
import { allocateHours, type PlanResult } from "./lib/planner";

const COVERAGE_FLOOR = 8;

const GUIDE_STEPS = [
  "Two rulers: raw units fell while the footprint spread across the exact same 261 blocks.",
  "Rolling-origin evaluation earns the forecast; the calibrated interval—not only the point—feeds planning.",
  "A fixed 80-hour budget meets a hard 8-hour floor. Use the audit button to see who loses coverage without it.",
  "The final brief carries evidence, uncertainty, constraints, and a human lock into coordinator review.",
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
        aria-label={`Observed aggregate values followed by a ${data.targetPeriod} forecast of ${formatNumber(data.point)}, with an ${formatNumber(data.lower)} to ${formatNumber(data.upper)} interval.`}
        className="forecast-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>Observed aggregate signal and next-month forecast interval</title>
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
          {data.targetPeriod.replace(/\s\d{4}$/, "")} forecast
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
          Forecast
        </span>
        <span>
          <i className="legend-range" />
          80% interval
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

function App() {
  const [data, setData] = useState<DemoData>(EMBEDDED_DEMO);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(EMBEDDED_DEMO.scenario.defaultBudget);
  const [dropRevealed, setDropRevealed] = useState(false);
  const [disclosuresOpen, setDisclosuresOpen] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [guardEnabled, setGuardEnabled] = useState(true);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [lockValues, setLockValues] = useState<Record<string, number>>({});
  const [planDirty, setPlanDirty] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [guideIndex, setGuideIndex] = useState<number | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const guidePanel = useRef<HTMLDivElement>(null);
  const signal = data.signal;

  useEffect(() => {
    const controller = new AbortController();
    loadDemoData(controller.signal)
      .then((loaded) => {
        setData(loaded);
        setBudget(loaded.scenario.defaultBudget);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGuideIndex(null);
        return;
      }
      const target = event.target as HTMLElement;
      const isControl = ["BUTTON", "INPUT", "SUMMARY"].includes(target.tagName);
      if (
        guideIndex !== null &&
        !isControl &&
        (event.key === "ArrowRight" || event.key === "Enter")
      ) {
        advanceGuide();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const allocationById = useMemo(
    () => new Map(plan?.allocations.map((item) => [item.areaId, item.hours]) ?? []),
    [plan],
  );

  const planTotal = plan?.allocations.reduce((sum, row) => sum + row.hours, 0) ?? 0;
  const maxHours = Math.max(1, ...Array.from(allocationById.values()));

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

  function runPlan(nextGuard = guardEnabled, locks = currentLocks()) {
    const next = allocateHours(data.areas, budget, COVERAGE_FLOOR, nextGuard, locks);
    setPlan(next);
    setPlanDirty(false);
    return next;
  }

  function setGuard(nextGuard: boolean) {
    setGuardEnabled(nextGuard);
    runPlan(nextGuard);
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
      `Status: READY FOR COORDINATOR REVIEW — not automatic dispatch`,
      `Evidence: ${titleCase(signal.classification)}. ${signal.fromPeriod} to ${signal.toPeriod}: ${signal.fromValue} → ${signal.toValue} (${formatNumber(signal.changePct, 1)}%).`,
      `Forecast: ${data.forecast.targetPeriod} ${formatNumber(data.forecast.point)}; 80% interval ${formatNumber(data.forecast.lower)}–${formatNumber(data.forecast.upper)}. ${data.forecast.model}; rolling-origin MAE ${formatNumber(data.forecast.mae)}.`,
      `Plan: ${budget} staff-hours; coverage guard ${guardEnabled ? `on (${COVERAGE_FLOOR}h minimum)` : "off — audit only"}. ${rows}.`,
      `Review triggers: new month, budget or boundary change, wider interval, infeasible floor, or local knowledge conflict.`,
      `Boundary: aggregate place-level evidence only. This does not track people, establish causality, or authorize enforcement.`,
    ].join("\n");
  }, [allocationById, budget, data, guardEnabled, lockedIds, signal]);

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
    scrollTo("drop-test");
    window.setTimeout(() => guidePanel.current?.focus(), 50);
  }

  function advanceGuide() {
    if (guideIndex === null) return;
    const next = guideIndex + 1;
    if (guideIndex === 0) {
      revealDrop(false);
      window.setTimeout(() => scrollTo("forecast"), 650);
    } else if (guideIndex === 1) {
      runPlan(true, new Map());
      setGuardEnabled(true);
      scrollTo("planner");
    } else if (guideIndex === 2) {
      const restored = runPlan(true, new Map());
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

  const classificationLabel = titleCase(signal.classification);

  return (
    <>
      <a className="skip-link" href="#drop-test">
        Skip to decision
      </a>

      <header className="topbar">
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
          <label className="budget-control">
            <span className="eyebrow">Available capacity</span>
            <span className="budget-input-wrap">
              <input
                aria-label="Available staff-hours"
                inputMode="numeric"
                max="400"
                min="0"
                onChange={(event) => {
                  setBudget(Number(event.target.value));
                  setPlan(null);
                  setPlanDirty(false);
                }}
                type="number"
                value={budget}
              />
              <span>hours</span>
            </span>
          </label>
          <button className="button button-quiet guide-button" onClick={beginGuide} type="button">
            <SparkIcon /> Guide demo
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
              <dd>Interface generation only; no AI determines the allocation.</dd>
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
              Two rulers.
              <br />
              <em>One decision.</em>
            </h1>
            <p className="hero-lede">
              The count went down. The footprint spread. Which result should change tomorrow’s
              outreach plan?
            </p>
            <div
              className="two-rulers"
              aria-label={`Raw observation units fell ${Math.abs(signal.changePct)} percent while active blocks rose ${signal.activeChangePct} percent`}
            >
              <div>
                <span>Raw observation units</span>
                <strong>{formatNumber(signal.changePct, 1)}%</strong>
                <small>
                  {signal.fromValue} → {signal.toValue}
                </small>
              </div>
              <div>
                <span>Active blocks</span>
                <strong>+{formatNumber(signal.activeChangePct, 1)}%</strong>
                <small>
                  {signal.activeFrom} → {signal.activeTo}
                </small>
              </div>
              <p>Same month. Same method. Same {signal.panelSize} blocks.</p>
            </div>
          </div>
          <div aria-label="Prepared scenario summary" className="hero-decision">
            <span className="eyebrow">Question for the coordinator</span>
            <p>
              Given the evidence and <strong>{budget} staff-hours</strong>, where should outreach
              continuity be reviewed next?
            </p>
            <div className="provisional-note">
              <span>{data.scenario.status === "ready" ? "✓ Prepared" : "◇ Provisional"}</span>{" "}
              Evidence limits and review triggers travel with the result.
            </div>
          </div>
        </section>

        <nav aria-label="Decision steps" className="step-nav">
          <a href="#drop-test">
            <span>01</span> Test the drop
          </a>
          <a href="#forecast">
            <span>02</span> Forecast range
          </a>
          <a href="#planner">
            <span>03</span> Plan the shift
          </a>
          <a href="#review">
            <span>04</span> Human review
          </a>
        </nav>

        <section className="decision-section" id="drop-test" aria-labelledby="drop-title">
          <div className="section-number">01</div>
          <div className="section-intro">
            <p className="eyebrow">Evidence gate</p>
            <h2 id="drop-title">Test the drop</h2>
            <p>
              Is the apparent decline supported by comparable evidence—or does the aggregate need
              appear to shift?
            </p>
          </div>

          <div className="metric-grid initial-metrics">
            <Metric
              label="Apparent change"
              value={`${formatNumber(signal.fromValue)} → ${formatNumber(signal.toValue)}`}
              detail={`${formatNumber(signal.changePct, 1)}% in ${signal.toPeriod}`}
              tone="amber"
            />
            <Metric
              label="Active footprint"
              value={`${formatNumber(signal.activeFrom)} → ${formatNumber(signal.activeTo)}`}
              detail={`+${formatNumber(signal.activeChangePct, 1)}% active blocks`}
              tone="teal"
            />
            <Metric
              label="Stable panel"
              value={`${formatNumber(signal.panelSize)} blocks`}
              detail="identical footprint before and after"
            />
          </div>

          {!dropRevealed ? (
            <div className="reveal-action">
              <button
                className="button button-primary button-large"
                onClick={() => revealDrop()}
                type="button"
              >
                <SparkIcon /> Test the drop
              </button>
              <span>Runs deterministic checks on the local generated artifact</span>
            </div>
          ) : (
            <div aria-live="polite" className="evidence-result reveal" id="evidence-result">
              <div className="result-header">
                <div className="result-symbol">
                  <ArrowDownIcon />
                </div>
                <div>
                  <p className="eyebrow">Balanced-panel conclusion</p>
                  <h3 ref={resultHeading} tabIndex={-1}>
                    {classificationLabel}
                  </h3>
                  <p>
                    The fixed-footprint total fell while observations appeared on more blocks.
                    Preserve broad coverage and ask a human to review.
                  </p>
                </div>
                <span className="confidence-chip">Human review required</span>
              </div>

              <div className="evidence-grid">
                <div className="churn-card">
                  <div className="card-heading">
                    <div>
                      <span className="eyebrow">What net change hides</span>
                      <h4>Churn inside the stable panel</h4>
                    </div>
                    <span className="formula">
                      +{signal.grossIncreases} − {signal.grossDecreases} = {signal.change}
                    </span>
                  </div>
                  <div
                    className="churn-visual"
                    aria-label={`${signal.grossIncreases} increases, ${signal.grossDecreases} decreases, net ${signal.change}`}
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
                    <CheckIcon /> The footprint is fixed at {signal.panelSize} blocks, preventing
                    boundary churn from impersonating improvement.
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
                  <div className="area-map" aria-label="Relative area view, not to scale">
                    {data.areas.map((area) => (
                      <div className={`area-cell area-${area.id}`} key={area.id}>
                        <span>{area.name}</span>
                        <strong className={area.delta > 0 ? "delta-up" : "delta-down"}>
                          {area.delta > 0 ? "+" : ""}
                          {area.delta}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <p className="map-caption">
                    Raw-unit change by area · not a person map · not to scale
                  </p>
                </div>
              </div>

              <div className="evidence-balance">
                <div>
                  <span className="evidence-icon evidence-for">+</span>
                  <p>
                    <strong>Evidence for</strong>Raw units declined while active blocks increased on
                    the exact same fixed panel.
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

              {data.reportingBias && (
                <details className="bias-diagnostic">
                  <summary>
                    <span>
                      <small>Optional attention-bias check</small>
                      Encampment report share rose{" "}
                      {formatNumber(data.reportingBias.shareChangePoints, 1)} points
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

                    {data.robustness && (
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
                              <small>Aligned six-month means · July 2023 excluded</small>
                            </div>
                            <div className="parking-result">
                              <span>
                                <small>
                                  {formatNumber(data.robustness.parking.verifiedPoles)} historically
                                  verified poles
                                </small>
                                <strong>
                                  {formatNumber(data.robustness.parking.preMonthlyMean)} →{" "}
                                  {formatNumber(data.robustness.parking.postMonthlyMean)}
                                </strong>
                                <small>
                                  transactions / month ·{" "}
                                  {formatNumber(data.robustness.parking.changePct, 1)}%
                                </small>
                              </span>
                              <span>
                                <small>Per meter-month</small>
                                <strong>
                                  {formatNumber(data.robustness.parking.prePerMeter, 1)} →{" "}
                                  {formatNumber(data.robustness.parking.postPerMeter, 1)}
                                </strong>
                                <small>
                                  all observed meters{" "}
                                  {formatNumber(data.robustness.parking.allMeterChangePct, 1)}%
                                </small>
                              </span>
                            </div>
                            <p>{data.robustness.parking.interpretation}</p>
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
              )}
            </div>
          )}
        </section>

        <section className="decision-section" id="forecast" aria-labelledby="forecast-title">
          <div className="section-number">02</div>
          <div className="section-intro split-intro">
            <div>
              <p className="eyebrow">One-month planning signal</p>
              <h2 id="forecast-title">Forecast the range, not certainty</h2>
              <p>
                The upper interval becomes the planner’s conservative reference. It never predicts a
                person or live service demand.
              </p>
            </div>
            <span className="wide-warning">Wide interval · reserve continuity</span>
          </div>

          <div className="forecast-layout">
            <div className="chart-card">
              <div className="chart-summary">
                <div>
                  <span className="eyebrow">{data.forecast.targetPeriod}</span>
                  <strong>{formatNumber(data.forecast.point)}</strong>
                  <small>point forecast</small>
                </div>
                <div>
                  <span className="eyebrow">80% interval</span>
                  <strong>
                    {formatNumber(data.forecast.lower)}–{formatNumber(data.forecast.upper)}
                  </strong>
                  <small>planning range</small>
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
            <summary>View accessible forecast values & method</summary>
            <div className="table-scroll">
              <table>
                <caption>Observed history and forecast values shown in the chart</caption>
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
                    <td>Forecast</td>
                    <td>{formatNumber(data.forecast.point)}</td>
                    <td>{formatNumber(data.forecast.lower)}</td>
                    <td>{formatNumber(data.forecast.upper)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Training:</strong> {data.forecast.trainingWindow}. Rolling-origin evaluation;
              no interpolation across missing targets. The selected forecast’s upper bound feeds
              planning load.
            </p>
          </details>
        </section>

        <section className="decision-section" id="planner" aria-labelledby="planner-title">
          <div className="section-number">03</div>
          <div className="section-intro split-intro planner-intro">
            <div>
              <p className="eyebrow">Constrained allocation</p>
              <h2 id="planner-title">Plan {budget} staff-hours</h2>
              <p>
                Distribute a fixed budget using upper-range planning load, then make the fairness
                constraint visible.
              </p>
            </div>
            <div className={`guard-status ${guardEnabled ? "guard-on" : "guard-off"}`}>
              <span>{guardEnabled ? "✓" : "!"}</span>
              <div>
                <small>Coverage guard</small>
                <strong>
                  {guardEnabled ? `ON · ${COVERAGE_FLOOR}h floor` : "OFF · AUDIT ONLY"}
                </strong>
              </div>
            </div>
          </div>

          {!plan ? (
            <div className="planner-start">
              <div className="constraint-equation">
                <span>
                  {budget}
                  <small>available</small>
                </span>
                <b>=</b>
                <span>
                  {data.areas.length * COVERAGE_FLOOR}
                  <small>fairness floors</small>
                </span>
                <b>+</b>
                <span>
                  {Math.max(0, budget - data.areas.length * COVERAGE_FLOOR)}
                  <small>signal-weighted</small>
                </span>
              </div>
              <button
                className="button button-primary button-large"
                onClick={() => runPlan()}
                type="button"
              >
                <SparkIcon /> Generate fair plan
              </button>
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
                    {guardEnabled ? "Audit without coverage guard" : "Restore recommended guard"}
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
                  <strong>Audit view—not a recommendation.</strong> Areas below {COVERAGE_FLOOR}{" "}
                  hours are at risk of losing continuity.
                </div>
              )}

              <div
                className="allocation-list"
                role="list"
                aria-label="Suggested staff-hour allocation"
              >
                {data.areas.map((area) => {
                  const hours = allocationById.get(area.id) ?? 0;
                  const locked = lockedIds.has(area.id);
                  const belowFloor = hours < COVERAGE_FLOOR;
                  return (
                    <article
                      className={`allocation-row ${belowFloor ? "below-floor" : ""}`}
                      key={area.id}
                      role="listitem"
                    >
                      <div className="area-name">
                        <strong>{area.name}</strong>
                        <span>{area.reason}</span>
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
                        {belowFloor ? "Below floor" : `${COVERAGE_FLOOR}h floor met`}
                      </span>
                    </article>
                  );
                })}
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
                  <button className="button button-primary" onClick={() => runPlan()} type="button">
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
          <div className="section-number">04</div>
          <div className="section-intro split-intro">
            <div>
              <p className="eyebrow">Human accountability</p>
              <h2 id="review-title">Review before the next shift</h2>
              <p>
                The system prepares a brief. A coordinator—not the model—decides what local context
                changes.
              </p>
            </div>
            <span className={`review-status ${plan?.feasible && !planDirty ? "review-ready" : ""}`}>
              {plan?.feasible && !planDirty
                ? "Ready for coordinator review"
                : planDirty
                  ? "Recompute human changes"
                  : "Waiting for a feasible plan"}
            </span>
          </div>

          <div className="brief-grid">
            <div className="brief-summary">
              <div>
                <span>What changed</span>
                <strong>{formatNumber(signal.changePct, 1)}% apparent decline</strong>
              </div>
              <div>
                <span>What may be hidden</span>
                <strong>Active blocks +{signal.activeChange}</strong>
              </div>
              <div>
                <span>Forecast range</span>
                <strong>
                  {formatNumber(data.forecast.lower)}–{formatNumber(data.forecast.upper)}
                </strong>
              </div>
              <div>
                <span>Suggested capacity</span>
                <strong>{plan?.feasible ? `${planTotal} staff-hours` : "Run planner"}</strong>
              </div>
              <div>
                <span>Fairness rule</span>
                <strong>
                  {guardEnabled ? `${COVERAGE_FLOOR}h minimum retained` : "Guard off · audit only"}
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
              disabled={!plan?.feasible || planDirty}
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
          aria-label="Guided demo"
          aria-live="polite"
          ref={guidePanel}
          tabIndex={-1}
        >
          <div className="guide-progress">
            <span style={{ width: `${((guideIndex + 1) / GUIDE_STEPS.length) * 100}%` }} />
          </div>
          <span className="eyebrow">
            Decision beat {guideIndex + 1}/{GUIDE_STEPS.length} · Arrow right to advance
          </span>
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
    </>
  );
}

export default App;
