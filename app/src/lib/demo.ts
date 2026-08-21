export type EvidenceClassification =
  "wider_footprint" | "possible_displacement" | "likely_improvement" | "insufficient_evidence";

export interface HistoryPoint {
  period: string;
  value: number | null;
}

export interface PlanningArea {
  id: string;
  name: string;
  latest: number | null;
  delta: number;
  planningLoad: number;
  reason: string;
}

export interface ModelScore {
  model: string;
  mae: number;
  wape: number;
  coverage: number | null;
  selected: boolean;
}

export interface DemoData {
  origin: "generated" | "embedded";
  source: { label: string; retrievedAt: string; artifact: string };
  scenario: {
    id: string;
    focusArea: string;
    period: string;
    decisionHorizon: string;
    defaultBudget: number;
    status: "ready" | "provisional";
  };
  signal: {
    fromPeriod: string;
    toPeriod: string;
    fromValue: number;
    toValue: number;
    change: number;
    changePct: number;
    adjacentChange: number;
    coverage: number;
    classification: EvidenceClassification;
    panelSize: number;
    grossIncreases: number;
    grossDecreases: number;
    activeFrom: number;
    activeTo: number;
    activeChange: number;
    activeChangePct: number;
  };
  history: HistoryPoint[];
  forecast: {
    targetPeriod: string;
    model: string;
    point: number;
    lower: number;
    upper: number;
    mae: number;
    coverage: number;
    wape: number;
    trainingWindow: string;
    scorecard: ModelScore[];
  };
  areas: PlanningArea[];
  reportingBias?: {
    status: string;
    rawChangePct: number;
    uniqueParentChangePct: number;
    allReportsChangePct: number;
    sharePrePct: number;
    sharePostPct: number;
    shareChangePoints: number;
    duplicatePrePct: number;
    duplicatePostPct: number;
    mobilePrePct: number;
    mobilePostPct: number;
    placeboChangePct: number;
    checkpoints: Array<{
      month: string;
      publishedTotal: number;
      rawReports: number;
      uniqueParents: number;
      rawPerPublishedUnit: number;
    }>;
    interpretation: string;
  };
  limitations: string[];
}

type UnknownRecord = Record<string, unknown>;

export const EMBEDDED_DEMO: DemoData = {
  origin: "embedded",
  source: {
    label: "SD Downtown Homelessness hackathon-provided curated data",
    retrievedAt: "2025-12",
    artifact: "embedded, generated-artifact-compatible demo snapshot",
  },
  scenario: {
    id: "wider-footprint-next-shift",
    focusArea: "Six-area downtown core",
    period: "Jan 2024 → Jan 2025",
    decisionHorizon: "next outreach shift · within 7 days",
    defaultBudget: 80,
    status: "provisional",
  },
  signal: {
    fromPeriod: "Jan 2024",
    toPeriod: "Jan 2025",
    fromValue: 778,
    toValue: 670,
    change: -108,
    changePct: -13.9,
    adjacentChange: 20,
    coverage: 100,
    classification: "wider_footprint",
    panelSize: 261,
    grossIncreases: 274,
    grossDecreases: 382,
    activeFrom: 121,
    activeTo: 141,
    activeChange: 20,
    activeChangePct: 16.5,
  },
  history: [
    { period: "Jan 2025", value: 759 },
    { period: "Feb 2025", value: 731 },
    { period: "Mar 2025", value: 670 },
    { period: "Apr 2025", value: 708 },
    { period: "May 2025", value: 691 },
    { period: "Jun 2025", value: 653 },
    { period: "Jul 2025", value: null },
    { period: "Aug 2025", value: null },
    { period: "Sep 2025", value: 722 },
    { period: "Oct 2025", value: null },
    { period: "Nov 2025", value: null },
    { period: "Dec 2025", value: 918 },
  ],
  forecast: {
    targetPeriod: "Jan 2026",
    model: "local linear · 6 observed months",
    point: 882.5,
    lower: 769,
    upper: 996.1,
    mae: 62.8,
    coverage: 75,
    wape: 8.6,
    trainingWindow: "Jan 2021 – Dec 2025",
    scorecard: [
      { model: "Local linear · 6 observed", mae: 119.8, wape: 9.7, coverage: null, selected: true },
      { model: "Recent 3-month mean", mae: 121.2, wape: 9.9, coverage: null, selected: false },
      { model: "Seasonal naive · 12m", mae: 191.3, wape: 15.6, coverage: null, selected: false },
    ],
  },
  areas: [
    {
      id: "city_center",
      name: "City Center",
      latest: 195,
      delta: 9,
      planningLoad: 193,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "columbia",
      name: "Columbia",
      latest: 32,
      delta: 5,
      planningLoad: 34.7,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "cortez",
      name: "Cortez",
      latest: 83,
      delta: -63,
      planningLoad: 113.3,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "east_village",
      name: "East Village",
      latest: 555,
      delta: -54,
      planningLoad: 591,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "gaslamp",
      name: "Gaslamp",
      latest: 42,
      delta: -6,
      planningLoad: 61.7,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "marina",
      name: "Marina",
      latest: 11,
      delta: 1,
      planningLoad: 24,
      reason: "upper forecast bound + 8h coverage floor",
    },
  ],
  limitations: [
    "The monthly figures are visual street-sweep observations, not a census of unique people.",
    "Four 2025 reports are absent and remain null; no missing month is zero-filled.",
    "Balanced-panel redistribution is an aggregate pattern, not evidence of person movement or causality.",
  ],
};

function record(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAreaId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_|_$/g, "");
}

function displayMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function displayModel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Observed", "observed")
    .replace("Months", "months");
}

export function adaptDemoV1(input: unknown): DemoData | null {
  const root = record(input);
  if (!root || root.schema !== "stillhere.demo.v1") return null;

  const generatedFrom = record(root.generated_from) ?? {};
  const scenario = record(root.scenario) ?? {};
  const observations = record(root.observations) ?? {};
  const evidence = record(root.evidence) ?? {};
  const panel = record(evidence.balanced_panel);
  const forecast = record(root.forecast) ?? {};
  const aggregate = record(forecast.aggregate);
  const planner = record(root.planner) ?? {};
  const reportingBiasRoot = record(root.reporting_bias);
  if (!panel || !aggregate) return null;

  const raw = record(panel.raw_observation_units) ?? {};
  const active = record(panel.active_blocks) ?? {};
  const comparison = record(panel.comparison) ?? {};
  const gross = record(panel.gross_change) ?? {};
  const validity = record(panel.validity_checks) ?? {};
  const backtest = record(aggregate.backtest) ?? {};
  const promotion = record(aggregate.promotion) ?? {};
  const training = record(forecast.training_window) ?? {};

  const history = array(observations.history)
    .map((item): HistoryPoint | null => {
      const row = record(item);
      const month = text(row?.month, "");
      if (!month) return null;
      return {
        period: displayMonth(month),
        value: typeof row?.total === "number" ? row.total : null,
      };
    })
    .filter((item): item is HistoryPoint => item !== null)
    .slice(-12);

  const latestByArea = new Map<string, number>();
  for (const item of array(observations.latest_by_area)) {
    const row = record(item);
    const area = text(row?.area, "");
    if (area && typeof row?.total === "number") latestByArea.set(normalizeAreaId(area), row.total);
  }

  const evidenceByArea = new Map<string, UnknownRecord>();
  for (const item of array(panel.areas)) {
    const row = record(item);
    const area = text(row?.area, "");
    if (area && row) evidenceByArea.set(normalizeAreaId(area), row);
  }

  const areas = array(planner.allocations)
    .map((item): PlanningArea | null => {
      const row = record(item);
      const name = text(row?.area, "");
      if (!name) return null;
      const id = normalizeAreaId(name);
      const areaEvidence = evidenceByArea.get(id);
      const areaRaw = record(areaEvidence?.raw_observation_units) ?? {};
      return {
        id,
        name,
        latest: latestByArea.get(id) ?? null,
        delta: number(areaRaw.change, 0),
        planningLoad: number(row?.planning_load, 1),
        reason: text(row?.reason, "upper forecast bound + coverage floor"),
      };
    })
    .filter((item): item is PlanningArea => item !== null);

  const selectedModel = text(promotion.selected_model ?? aggregate.model, "");
  const scorecard = array(aggregate.model_scorecard ?? aggregate.candidate_scores)
    .map((item): ModelScore | null => {
      const row = record(item);
      const model = text(row?.model, "");
      if (!model) return null;
      return {
        model: displayModel(model),
        mae: number(row?.mae, 0),
        wape: number(row?.wape_pct, 0),
        coverage:
          typeof row?.empirical_coverage_pct === "number" ? row.empirical_coverage_pct : null,
        selected: model === selectedModel,
      };
    })
    .filter((item): item is ModelScore => item !== null);

  const fromValue = number(raw.from, EMBEDDED_DEMO.signal.fromValue);
  const toValue = number(raw.to, EMBEDDED_DEMO.signal.toValue);
  const activeChange = number(active.change, EMBEDDED_DEMO.signal.activeChange);
  const rawChange = number(raw.change, toValue - fromValue);
  const limitations = array(root.limitations).filter(
    (item): item is string => typeof item === "string",
  );

  let reportingBias: DemoData["reportingBias"];
  if (reportingBiasRoot) {
    const biasComparison = record(reportingBiasRoot.comparison) ?? {};
    const rawReports = record(biasComparison.encampment_raw) ?? {};
    const uniqueParents = record(biasComparison.encampment_unique_parent) ?? {};
    const allReports = record(biasComparison.all_reports) ?? {};
    const share = record(biasComparison.encampment_share) ?? {};
    const duplicateSensitivity = record(biasComparison.raw_vs_parent_sensitivity) ?? {};
    const originSensitivity = record(biasComparison.case_origin_sensitivity) ?? {};
    const placebo = record(biasComparison.placebo_combined_raw) ?? {};
    const checkpointBlock = record(reportingBiasRoot.cross_source_checkpoints) ?? {};
    const checkpoints = array(checkpointBlock.checkpoints)
      .map((item) => {
        const row = record(item);
        const month = text(row?.month, "");
        if (!month) return null;
        return {
          month: displayMonth(month),
          publishedTotal: number(row?.dsdp_all_neighborhood_published_total, 0),
          rawReports: number(row?.gid_encampment_raw, 0),
          uniqueParents: number(row?.gid_encampment_unique_parent, 0),
          rawPerPublishedUnit: number(row?.raw_reports_per_published_total_unit, 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    reportingBias = {
      status: text(reportingBiasRoot.status, "descriptive_diagnostic"),
      rawChangePct: number(rawReports.percent_change, 0),
      uniqueParentChangePct: number(uniqueParents.percent_change, 0),
      allReportsChangePct: number(allReports.percent_change, 0),
      sharePrePct: number(share.pre_pct, 0),
      sharePostPct: number(share.post_pct, 0),
      shareChangePoints: number(share.change_percentage_points, 0),
      duplicatePrePct: number(duplicateSensitivity.pre_duplicate_child_share_pct, 0),
      duplicatePostPct: number(duplicateSensitivity.post_duplicate_child_share_pct, 0),
      mobilePrePct: number(originSensitivity.pre_share_pct, 0),
      mobilePostPct: number(originSensitivity.post_share_pct, 0),
      placeboChangePct: number(placebo.percent_change, 0),
      checkpoints,
      interpretation: text(biasComparison.interpretation, "Descriptive reporting diagnostic."),
    };
  }

  return {
    origin: "generated",
    source: {
      label: text(generatedFrom.bundle, EMBEDDED_DEMO.source.label),
      retrievedAt: text(generatedFrom.source_data_through, EMBEDDED_DEMO.source.retrievedAt),
      artifact: "generated/demo.v1.json",
    },
    scenario: {
      id: text(scenario.id, EMBEDDED_DEMO.scenario.id),
      focusArea: text(aggregate.area, "Six-area downtown core"),
      period: `${displayMonth(text(comparison.from_month, "2024-01"))} → ${displayMonth(text(comparison.to_month, "2025-01"))}`,
      decisionHorizon: "next outreach shift · within 7 days",
      defaultBudget: number(planner.budget_hours, EMBEDDED_DEMO.scenario.defaultBudget),
      status: "ready",
    },
    signal: {
      fromPeriod: displayMonth(text(comparison.from_month, "2024-01")),
      toPeriod: displayMonth(text(comparison.to_month, "2025-01")),
      fromValue,
      toValue,
      change: rawChange,
      changePct: number(raw.change_pct, (rawChange / fromValue) * 100),
      adjacentChange: activeChange,
      coverage: validity.complete_selected_panel === true ? 100 : 0,
      classification:
        rawChange < 0 && activeChange > 0 ? "wider_footprint" : "insufficient_evidence",
      panelSize: number(panel.panel_size, EMBEDDED_DEMO.signal.panelSize),
      grossIncreases: number(
        gross.increase_units_on_blocks_with_growth,
        EMBEDDED_DEMO.signal.grossIncreases,
      ),
      grossDecreases: number(
        gross.decrease_units_on_blocks_with_decline,
        EMBEDDED_DEMO.signal.grossDecreases,
      ),
      activeFrom: number(active.from, EMBEDDED_DEMO.signal.activeFrom),
      activeTo: number(active.to, EMBEDDED_DEMO.signal.activeTo),
      activeChange,
      activeChangePct: number(active.change_pct, EMBEDDED_DEMO.signal.activeChangePct),
    },
    history: history.length >= 3 ? history : EMBEDDED_DEMO.history,
    forecast: {
      targetPeriod: displayMonth(text(forecast.target_month, EMBEDDED_DEMO.forecast.targetPeriod)),
      model: displayModel(text(aggregate.model, EMBEDDED_DEMO.forecast.model)),
      point: number(aggregate.point, EMBEDDED_DEMO.forecast.point),
      lower: number(aggregate.lower, EMBEDDED_DEMO.forecast.lower),
      upper: number(aggregate.upper, EMBEDDED_DEMO.forecast.upper),
      mae: number(backtest.mae, EMBEDDED_DEMO.forecast.mae),
      coverage: number(backtest.empirical_coverage_pct, EMBEDDED_DEMO.forecast.coverage),
      wape: number(backtest.wape_pct, EMBEDDED_DEMO.forecast.wape),
      trainingWindow: `${displayMonth(text(training.start_month, "2021-01"))} – ${displayMonth(text(training.end_month, "2025-12"))}`,
      scorecard: scorecard.length ? scorecard : EMBEDDED_DEMO.forecast.scorecard,
    },
    areas: areas.length ? areas : EMBEDDED_DEMO.areas,
    reportingBias,
    limitations: limitations.length ? limitations : EMBEDDED_DEMO.limitations,
  };
}

async function fetchJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

export async function loadDemoData(signal: AbortSignal): Promise<DemoData> {
  try {
    const generated = adaptDemoV1(await fetchJson("generated/demo.v1.json", signal));
    if (generated) return generated;
  } catch (error) {
    if (signal.aborted) throw error;
  }
  return EMBEDDED_DEMO;
}
