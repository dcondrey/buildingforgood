import type { ExcludesComplaintSignal, PlanningLoadDerivation } from "../domain/planner/types.ts";

export type EvidenceClassification =
  "wider_footprint" | "possible_displacement" | "likely_improvement" | "insufficient_evidence";

export interface HistoryPoint {
  period: string;
  value: number | null;
}

/**
 * One planning area as the shipped planner sees it.
 *
 * Complaint volume is not representable here, and that is enforced rather
 * than asserted: `PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL` below fails to
 * typecheck if any complaint-shaped field is added, and `allocateHours`
 * runs `assertNoComplaintSignal` over the values it is actually handed.
 * See config/decision.v1.json -> observations.complaint_volume_excluded_uses
 * and the C-01 red-team review, finding R-03.
 */
export interface PlanningArea {
  id: string;
  name: string;
  latest: number | null;
  delta: number;
  planningLoad: number;
  /**
   * Where `planningLoad` came from. Not decoration: `allocateHours` refuses
   * an area whose derivation is not permitted, which is what stops complaint
   * volume from arriving as an unnamed number.
   */
  loadDerivation: PlanningLoadDerivation;
  auditWape: number | null;
  reason: string;
}

export const PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<PlanningArea> = true;

export interface ModelScore {
  model: string;
  mae: number;
  wape: number;
  coverage: number | null;
  selected: boolean;
}

/** One row a publisher reported after the freeze that no model may consume. */
export interface ExcludedObservationRow {
  month: string;
  geography: string;
  series: string;
  value: number;
  unit: string;
  valueStatus: string;
}

/**
 * Observations that exist and are deliberately not model inputs.
 *
 * Every string here is the artifact's own. Nothing in this shape may be
 * rewritten in the interface: the exclusion has to read the way the people
 * who made it wrote it.
 */
export interface ExcludedObservations {
  headline: string;
  summary: string;
  grounds: string[];
  promotionRule: string;
  source: string;
  months: string[];
  unit: string;
  excludedFrom: string[];
  rows: ExcludedObservationRow[];
}

/**
 * How current the artifact is, and what has been observed since it froze.
 *
 * `null` on `DemoData` means the artifact predates this block — the embedded
 * offline snapshot does — and the interface says "currency unknown" rather
 * than implying freshness it cannot check.
 */
export interface ArtifactCurrency {
  sourceDataThrough: string;
  asOf: string;
  status: "current" | "stale";
  stalenessReason: string;
  nextPublication: {
    month: string;
    basis: string;
    scheduled: boolean;
    note: string;
  } | null;
  excluded: ExcludedObservations | null;
}

export interface DemoData {
  origin: "generated" | "embedded";
  /** Null when the artifact carries no currency block. Never inferred. */
  currency: ArtifactCurrency | null;
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
    components: {
      individuals: { from: number; to: number; change: number; changePct: number };
      structures: { from: number; to: number; change: number; changePct: number };
      vehicles: { from: number; to: number; change: number; changePct: number };
    };
    componentDistribution?: {
      components: Array<{
        id: "individuals" | "structures" | "vehicles";
        label: string;
        thresholds: Array<{
          minimumUnits: number;
          fromBlocks: number;
          toBlocks: number;
          change: number;
        }>;
        hhiFrom: number;
        hhiTo: number;
        hhiChangePct: number;
        effectiveBlocksFrom: number;
        effectiveBlocksTo: number;
      }>;
      derivedEstimate?: {
        from: number;
        to: number;
        change: number;
        changePct: number;
        individualsContribution: number;
        structuresContribution: number;
        vehiclesContribution: number;
        formula: string;
        interpretation: string;
      };
      interpretation: string;
    };
    distributionSensitivity?: {
      thresholds: Array<{
        minimumUnits: number;
        fromBlocks: number;
        toBlocks: number;
        change: number;
        entered: number;
        exited: number;
      }>;
      singleUnitFrom: number;
      singleUnitTo: number;
      singleUnitChange: number;
      hhiFrom: number;
      hhiTo: number;
      hhiChangePct: number;
      effectiveBlocksFrom: number;
      effectiveBlocksTo: number;
      effectiveBlocksChangePct: number;
      interpretation: string;
    };
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
    evaluatedPoints: number;
    intervalPoints: number;
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
    matchedCalendar?: {
      rawChangePct: number;
      uniqueParentChangePct: number;
      allReportsChangePct: number;
      sharePrePct: number;
      sharePostPct: number;
      shareChangePoints: number;
      interpretation: string;
    };
    checkpoints: Array<{
      month: string;
      publishedTotal: number;
      rawReports: number;
      uniqueParents: number;
      rawPerPublishedUnit: number;
    }>;
    interpretation: string;
  };
  robustness?: {
    parking: {
      verifiedPoles: number;
      preMonthlyMean: number;
      postMonthlyMean: number;
      changePct: number;
      prePerMeter: number;
      postPerMeter: number;
      allMeterChangePct: number;
      interpretation: string;
      matchedCalendar?: {
        verifiedPoles: number;
        preMonthlyMean: number;
        postMonthlyMean: number;
        changePct: number;
        allMeterChangePct: number;
        interpretation: string;
      };
    };
    weather: {
      station: string;
      dates: Array<{
        date: string;
        precipitation: number;
        maximumTemperature: number;
      }>;
      interpretation: string;
    };
  };
  limitations: string[];
}

type UnknownRecord = Record<string, unknown>;

export const EMBEDDED_DEMO: DemoData = {
  origin: "embedded",
  // The embedded snapshot is compiled in and never refreshed, so it can make
  // no currency claim at all. That is the honest value, not a placeholder.
  currency: null,
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
    components: {
      individuals: { from: 510, to: 548, change: 38, changePct: 7.5 },
      structures: { from: 258, to: 117, change: -141, changePct: -54.7 },
      vehicles: { from: 10, to: 5, change: -5, changePct: -50 },
    },
    componentDistribution: {
      components: [
        {
          id: "individuals",
          label: "Individuals observed",
          thresholds: [
            { minimumUnits: 1, fromBlocks: 111, toBlocks: 136, change: 25 },
            { minimumUnits: 2, fromBlocks: 78, toBlocks: 94, change: 16 },
          ],
          hhiFrom: 0.028466,
          hhiTo: 0.028231,
          hhiChangePct: -0.8,
          effectiveBlocksFrom: 35.1,
          effectiveBlocksTo: 35.4,
        },
        {
          id: "structures",
          label: "Tents or structures observed",
          thresholds: [
            { minimumUnits: 1, fromBlocks: 47, toBlocks: 29, change: -18 },
            { minimumUnits: 2, fromBlocks: 35, toBlocks: 19, change: -16 },
          ],
          hhiFrom: 0.041584,
          hhiTo: 0.096501,
          hhiChangePct: 132,
          effectiveBlocksFrom: 24,
          effectiveBlocksTo: 10.4,
        },
      ],
      derivedEstimate: {
        from: 981.8,
        to: 762.9,
        change: -218.9,
        changePct: -22.3,
        individualsContribution: 38,
        structuresContribution: -246.8,
        vehiclesContribution: -10.2,
        formula: "individuals + 1.75*tents_structures + 2.03*vehicles",
        interpretation:
          "The derived decline is structure-driven and partly offset by more visually observed individuals. It is based on secondary component digitization and must not be equated with unique people or the published total series.",
      },
      interpretation:
        "The like-for-like individual footprint widened at both thresholds while individual concentration was nearly unchanged. Tent observations contracted into fewer blocks and became more concentrated. These are aggregate visual observations, not unique people or linked movements.",
    },
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
    evaluatedPoints: 8,
    intervalPoints: 8,
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
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 12.9,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "columbia",
      name: "Columbia",
      latest: 32,
      delta: 5,
      planningLoad: 34.7,
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 19.9,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "cortez",
      name: "Cortez",
      latest: 83,
      delta: -63,
      planningLoad: 113.3,
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 34.2,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "east_village",
      name: "East Village",
      latest: 555,
      delta: -54,
      planningLoad: 591,
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 7.8,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "gaslamp",
      name: "Gaslamp",
      latest: 42,
      delta: -6,
      planningLoad: 61.7,
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 22.6,
      reason: "upper forecast bound + 8h coverage floor",
    },
    {
      id: "marina",
      name: "Marina",
      latest: 11,
      delta: 1,
      planningLoad: 24,
      loadDerivation: "embedded_demo_snapshot",
      auditWape: 32.7,
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

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

/**
 * Read the artifact's currency block, or report that there is none.
 *
 * Absence is a first-class answer: the embedded offline snapshot has no
 * currency block, and an artifact written before the monthly refresh existed
 * has none either. Both degrade to `null`, which the interface renders as
 * "currency unknown". Nothing here is inferred from a retrieval date — an
 * inferred freshness claim is the failure this block exists to prevent.
 */
function parseCurrency(raw: UnknownRecord | null): ArtifactCurrency | null {
  if (!raw) return null;
  const status = raw.status;
  if (status !== "current" && status !== "stale") return null;
  const sourceDataThrough = text(raw.source_data_through, "");
  if (!sourceDataThrough) return null;

  const staleness = record(raw.staleness) ?? {};
  const expected = record(raw.next_publication_expected);
  const nextMonth = expected ? text(expected.month, "") : "";

  return {
    sourceDataThrough: displayMonth(sourceDataThrough),
    asOf: displayMonth(text(raw.as_of, "").slice(0, 7)),
    status,
    stalenessReason: text(staleness.reason, ""),
    nextPublication:
      expected && nextMonth
        ? {
            month: displayMonth(nextMonth),
            basis: text(expected.basis, ""),
            scheduled: expected.source_publication_scheduled === true,
            note: text(expected.source_publication_note, ""),
          }
        : null,
    excluded: parseExcludedObservations(record(raw.observed_not_model_eligible)),
  };
}

/**
 * The observed-but-excluded lane.
 *
 * Fail-closed in one specific way: a row is displayed only when it declares
 * `model_eligible: false`. A row that claims eligibility has no place in a
 * lane whose entire meaning is exclusion, so it is dropped rather than shown
 * under an exclusion heading it contradicts.
 */
function parseExcludedObservations(raw: UnknownRecord | null): ExcludedObservations | null {
  if (!raw || raw.status !== "observed_not_model_eligible") return null;
  const reason = record(raw.exclusion_reason) ?? {};
  const rows = array(raw.rows)
    .map((item): ExcludedObservationRow | null => {
      const row = record(item);
      if (!row || row.model_eligible !== false) return null;
      const month = text(row.month, "");
      if (!month || !finite(row.value)) return null;
      return {
        month: displayMonth(month),
        geography: text(row.geography, ""),
        series: text(row.series, ""),
        value: row.value,
        unit: text(row.unit, text(raw.unit, "")),
        valueStatus: text(row.value_status, ""),
      };
    })
    .filter((row): row is ExcludedObservationRow => row !== null);
  if (rows.length === 0) return null;

  return {
    headline: text(raw.headline, ""),
    summary: text(reason.summary, ""),
    grounds: array(reason.grounds).filter((item): item is string => typeof item === "string"),
    promotionRule: text(reason.promotion_rule, ""),
    source: text(reason.source, ""),
    months: array(raw.months)
      .filter((item): item is string => typeof item === "string")
      .map(displayMonth),
    unit: text(raw.unit, ""),
    excludedFrom: array(raw.excluded_from).filter(
      (item): item is string => typeof item === "string",
    ),
    rows,
  };
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
  const components = record(panel.components) ?? {};
  const individuals = record(components.individuals) ?? {};
  const structures = record(components.tents_structures) ?? {};
  const vehicles = record(components.vehicles) ?? {};
  const distributionRoot = record(panel.distribution_sensitivity);
  const componentDistributionRoot = record(panel.component_distribution_sensitivity);
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

  const forecastByArea = new Map<string, UnknownRecord>();
  for (const item of array(forecast.areas)) {
    const row = record(item);
    const area = text(row?.area, "");
    if (area && row) forecastByArea.set(normalizeAreaId(area), row);
  }

  // Planning-load provenance is checked here, at the one place untyped
  // artifact JSON becomes planner input. A value whose declared derivation is
  // not permitted, or which does not reconcile with the forecast bound it
  // claims to come from, refuses the whole artifact rather than being
  // silently corrected: see docs/project/PHASE1_ADVERSARIAL.md attack C,
  // where complaint volume was written into `planning_load` and every layer
  // accepted it. Refusing returns null, so `loadDemoData` falls back to the
  // embedded snapshot and the interface reports its origin as the offline
  // fallback rather than as generated analysis.
  let planningLoadRefused = false;
  const areas = array(planner.allocations)
    .map((item): PlanningArea | null => {
      const row = record(item);
      const name = text(row?.area, "");
      if (!name) return null;
      const id = normalizeAreaId(name);
      const areaEvidence = evidenceByArea.get(id);
      const areaRaw = record(areaEvidence?.raw_observation_units) ?? {};
      const areaForecast = forecastByArea.get(id);
      const areaBacktest = record(areaForecast?.backtest) ?? {};

      // Every planning load is checked by arithmetic against a value already
      // published in this artifact. Mirrors PLANNING_LOAD_DERIVATIONS in
      // pipeline/src/stillhere_pipeline/contracts.py; keep the two in step.
      const load = row?.planning_load;
      const upper = areaForecast?.upper;
      const declared = row?.planning_load_derivation;
      let derivation: PlanningLoadDerivation;
      let expected: number;
      if (finite(upper)) {
        // The forecast settles it, so the label is optional here and cannot
        // be used to choose a more convenient basis.
        if (declared !== undefined && declared !== "forecast_upper_bound") {
          planningLoadRefused = true;
          return null;
        }
        derivation = "forecast_upper_bound";
        expected = upper;
      } else if (declared === "latest_observed_total") {
        const latest = latestByArea.get(id);
        if (latest === undefined) {
          planningLoadRefused = true;
          return null;
        }
        derivation = declared;
        expected = latest;
      } else if (declared === "coverage_floor_only") {
        derivation = declared;
        expected = 0;
      } else {
        // No forecast bound and no permitted fallback declared. An
        // unexplained planning load is exactly the shape complaint volume
        // arrives in, so the artifact is refused rather than adapted.
        planningLoadRefused = true;
        return null;
      }
      if (!finite(load) || Math.abs(load - expected) > 1e-6) {
        planningLoadRefused = true;
        return null;
      }

      return {
        id,
        name,
        latest: latestByArea.get(id) ?? null,
        delta: number(areaRaw.change, 0),
        planningLoad: load,
        loadDerivation: derivation,
        auditWape: typeof areaBacktest.wape_pct === "number" ? areaBacktest.wape_pct : null,
        reason: text(row?.reason, "upper forecast bound + coverage floor"),
      };
    })
    .filter((item): item is PlanningArea => item !== null);
  if (planningLoadRefused) return null;

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
    const matchedRoot = record(biasComparison.matched_calendar_sensitivity);
    const checkpointBlock = record(reportingBiasRoot.cross_source_checkpoints) ?? {};
    const checkpointInputs = array(checkpointBlock.checkpoints);
    const checkpoints = checkpointInputs
      .map((item) => {
        const row = record(item);
        const month = text(row?.month, "");
        if (
          !month ||
          !finite(row?.dsdp_all_neighborhood_published_total) ||
          !finite(row?.gid_encampment_raw) ||
          !finite(row?.gid_encampment_unique_parent) ||
          !finite(row?.raw_reports_per_published_total_unit)
        ) {
          return null;
        }
        return {
          month: displayMonth(month),
          publishedTotal: row.dsdp_all_neighborhood_published_total,
          rawReports: row.gid_encampment_raw,
          uniqueParents: row.gid_encampment_unique_parent,
          rawPerPublishedUnit: row.raw_reports_per_published_total_unit,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const requiredValues = [
      rawReports.percent_change,
      uniqueParents.percent_change,
      allReports.percent_change,
      share.pre_pct,
      share.post_pct,
      share.change_percentage_points,
      duplicateSensitivity.pre_duplicate_child_share_pct,
      duplicateSensitivity.post_duplicate_child_share_pct,
      originSensitivity.pre_share_pct,
      originSensitivity.post_share_pct,
      placebo.percent_change,
    ];
    let matchedCalendar: NonNullable<DemoData["reportingBias"]>["matchedCalendar"];
    if (matchedRoot) {
      const matchedRaw = record(matchedRoot.encampment_raw) ?? {};
      const matchedParents = record(matchedRoot.encampment_unique_parent) ?? {};
      const matchedAll = record(matchedRoot.all_reports) ?? {};
      const matchedShare = record(matchedRoot.encampment_share) ?? {};
      const matchedValues = [
        matchedRaw.percent_change,
        matchedParents.percent_change,
        matchedAll.percent_change,
        matchedShare.pre_pct,
        matchedShare.post_pct,
        matchedShare.change_percentage_points,
      ];
      if (matchedValues.every(finite)) {
        matchedCalendar = {
          rawChangePct: number(matchedRaw.percent_change, 0),
          uniqueParentChangePct: number(matchedParents.percent_change, 0),
          allReportsChangePct: number(matchedAll.percent_change, 0),
          sharePrePct: number(matchedShare.pre_pct, 0),
          sharePostPct: number(matchedShare.post_pct, 0),
          shareChangePoints: number(matchedShare.change_percentage_points, 0),
          interpretation: text(
            matchedRoot.interpretation,
            "Matched-calendar reporting sensitivity.",
          ),
        };
      }
    }
    if (
      requiredValues.every(finite) &&
      checkpointInputs.length > 0 &&
      checkpoints.length === checkpointInputs.length
    ) {
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
        matchedCalendar,
        checkpoints,
        interpretation: text(biasComparison.interpretation, "Descriptive reporting diagnostic.")
          .replaceAll("reporting-pattern discontinuity", "pre/post reporting-pattern shift")
          .replaceAll("reporting discontinuity", "pre/post reporting-pattern shift"),
      };
    }
  }

  let distributionSensitivity: DemoData["signal"]["distributionSensitivity"];
  if (distributionRoot) {
    const singleUnits = record(distributionRoot.single_unit_blocks) ?? {};
    const concentration = record(distributionRoot.concentration) ?? {};
    const concentrationFrom = record(concentration.from) ?? {};
    const concentrationTo = record(concentration.to) ?? {};
    const thresholds = array(distributionRoot.active_block_thresholds)
      .map((item) => {
        const row = record(item);
        const minimumUnits = number(row?.minimum_raw_units, 0);
        if (minimumUnits <= 0) return null;
        return {
          minimumUnits,
          fromBlocks: number(row?.from_active_blocks, 0),
          toBlocks: number(row?.to_active_blocks, 0),
          change: number(row?.change, 0),
          entered: number(row?.entered_threshold, 0),
          exited: number(row?.exited_threshold, 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    distributionSensitivity = {
      thresholds,
      singleUnitFrom: number(singleUnits.from, 0),
      singleUnitTo: number(singleUnits.to, 0),
      singleUnitChange: number(singleUnits.change, 0),
      hhiFrom: number(concentrationFrom.hhi, 0),
      hhiTo: number(concentrationTo.hhi, 0),
      hhiChangePct: number(concentration.hhi_change_pct, 0),
      effectiveBlocksFrom: number(concentrationFrom.effective_number_of_blocks, 0),
      effectiveBlocksTo: number(concentrationTo.effective_number_of_blocks, 0),
      effectiveBlocksChangePct: number(concentration.effective_blocks_change_pct, 0),
      interpretation: text(
        distributionRoot.interpretation,
        "Threshold and concentration sensitivity are descriptive only.",
      ),
    };
  }

  let componentDistribution: DemoData["signal"]["componentDistribution"];
  if (componentDistributionRoot) {
    const derived = record(componentDistributionRoot.post2020_multiplier_decomposition);
    const contributions = record(derived?.contributions_to_change) ?? {};
    const componentRows = array(componentDistributionRoot.components)
      .map((item) => {
        const row = record(item);
        const artifactId = text(row?.component, "");
        const id = artifactId === "tents_structures" ? "structures" : artifactId;
        if (id !== "individuals" && id !== "structures" && id !== "vehicles") {
          return null;
        }
        const concentration = record(row?.concentration) ?? {};
        const concentrationFrom = record(concentration.from) ?? {};
        const concentrationTo = record(concentration.to) ?? {};
        const thresholds = array(row?.active_block_thresholds)
          .map((thresholdItem) => {
            const threshold = record(thresholdItem);
            const minimumUnits = number(threshold?.minimum_component_units, 0);
            if (minimumUnits <= 0) return null;
            return {
              minimumUnits,
              fromBlocks: number(threshold?.from_active_blocks, 0),
              toBlocks: number(threshold?.to_active_blocks, 0),
              change: number(threshold?.change, 0),
            };
          })
          .filter((threshold): threshold is NonNullable<typeof threshold> => threshold !== null);
        return {
          id: id as "individuals" | "structures" | "vehicles",
          label: text(row?.label, displayModel(id)),
          thresholds,
          hhiFrom: number(concentrationFrom.hhi, 0),
          hhiTo: number(concentrationTo.hhi, 0),
          hhiChangePct: number(concentration.hhi_change_pct, 0),
          effectiveBlocksFrom: number(concentrationFrom.effective_number_of_blocks, 0),
          effectiveBlocksTo: number(concentrationTo.effective_number_of_blocks, 0),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (componentRows.length) {
      componentDistribution = {
        components: componentRows,
        derivedEstimate: derived
          ? {
              from: number(derived.from, 0),
              to: number(derived.to, 0),
              change: number(derived.change, 0),
              changePct: number(derived.change_pct, 0),
              individualsContribution: number(contributions.individuals, 0),
              structuresContribution: number(contributions.tents_structures, 0),
              vehiclesContribution: number(contributions.vehicles, 0),
              formula: text(derived.formula, "individuals + 1.75*tents_structures + 2.03*vehicles"),
              interpretation: text(
                derived.interpretation,
                "Secondary derived estimate; not unique people.",
              ),
            }
          : undefined,
        interpretation: text(
          componentDistributionRoot.interpretation,
          "Like-for-like component footprints are descriptive aggregate observations.",
        ),
      };
    }
  }

  let robustness: DemoData["robustness"];
  const robustnessRoot = record(evidence.robustness);
  const parkingRoot = record(robustnessRoot?.parking_exposure);
  const weatherRoot = record(robustnessRoot?.count_day_weather);
  if (parkingRoot && weatherRoot) {
    const parkingCohort = record(parkingRoot.cohort) ?? {};
    const parkingComparison = record(parkingRoot.comparison) ?? {};
    const fixedCohort = record(parkingComparison.fixed_cohort) ?? {};
    const allMeters = record(parkingComparison.all_observed_downtown_meters) ?? {};
    const parkingMatchedRoot = record(parkingComparison.matched_calendar_sensitivity);
    const weatherStation = record(weatherRoot.station) ?? {};
    const weatherComparison = record(weatherRoot.comparison) ?? {};
    const weatherInputs = array(weatherRoot.dates);
    const weatherDates = weatherInputs
      .map((item) => {
        const row = record(item);
        const date = text(row?.date, "");
        if (!date || !finite(row?.precipitation_inches) || !finite(row?.maximum_temperature_f)) {
          return null;
        }
        return {
          date,
          precipitation: row.precipitation_inches,
          maximumTemperature: row.maximum_temperature_f,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const parkingValues = [
      parkingCohort.historically_verified_poles,
      fixedCohort.pre_monthly_mean,
      fixedCohort.post_monthly_mean,
      fixedCohort.percent_change,
      fixedCohort.pre_transactions_per_meter_month,
      fixedCohort.post_transactions_per_meter_month,
      allMeters.percent_change,
    ];
    let matchedCalendar: NonNullable<DemoData["robustness"]>["parking"]["matchedCalendar"];
    if (parkingMatchedRoot) {
      const matchedFixed = record(parkingMatchedRoot.fixed_cohort) ?? {};
      const matchedAll = record(parkingMatchedRoot.all_observed_downtown_meters) ?? {};
      const matchedValues = [
        parkingMatchedRoot.historically_verified_poles,
        matchedFixed.pre_monthly_mean,
        matchedFixed.post_monthly_mean,
        matchedFixed.percent_change,
        matchedAll.percent_change,
      ];
      if (matchedValues.every(finite)) {
        matchedCalendar = {
          verifiedPoles: number(parkingMatchedRoot.historically_verified_poles, 0),
          preMonthlyMean: number(matchedFixed.pre_monthly_mean, 0),
          postMonthlyMean: number(matchedFixed.post_monthly_mean, 0),
          changePct: number(matchedFixed.percent_change, 0),
          allMeterChangePct: number(matchedAll.percent_change, 0),
          interpretation: text(
            parkingMatchedRoot.interpretation,
            "Matched-calendar paid-parking sensitivity.",
          ),
        };
      }
    }
    if (
      parkingValues.every(finite) &&
      weatherInputs.length > 0 &&
      weatherDates.length === weatherInputs.length
    ) {
      robustness = {
        parking: {
          verifiedPoles: number(parkingCohort.historically_verified_poles, 0),
          preMonthlyMean: number(fixedCohort.pre_monthly_mean, 0),
          postMonthlyMean: number(fixedCohort.post_monthly_mean, 0),
          changePct: number(fixedCohort.percent_change, 0),
          prePerMeter: number(fixedCohort.pre_transactions_per_meter_month, 0),
          postPerMeter: number(fixedCohort.post_transactions_per_meter_month, 0),
          allMeterChangePct: number(allMeters.percent_change, 0),
          interpretation: text(
            parkingComparison.interpretation,
            "Paid-parking exposure is a descriptive sensitivity only.",
          ),
          matchedCalendar,
        },
        weather: {
          station: `${text(weatherStation.label, "Weather station")} · ${text(weatherStation.id, "")}`,
          dates: weatherDates,
          interpretation: text(
            weatherComparison.interpretation,
            "Same-day weather is a descriptive sensitivity only.",
          ),
        },
      };
    }
  }

  return {
    origin: "generated",
    currency: parseCurrency(record(root.currency)),
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
      components: {
        individuals: {
          from: number(individuals.from, EMBEDDED_DEMO.signal.components.individuals.from),
          to: number(individuals.to, EMBEDDED_DEMO.signal.components.individuals.to),
          change: number(individuals.change, EMBEDDED_DEMO.signal.components.individuals.change),
          changePct:
            (number(individuals.change, EMBEDDED_DEMO.signal.components.individuals.change) /
              number(individuals.from, EMBEDDED_DEMO.signal.components.individuals.from)) *
            100,
        },
        structures: {
          from: number(structures.from, EMBEDDED_DEMO.signal.components.structures.from),
          to: number(structures.to, EMBEDDED_DEMO.signal.components.structures.to),
          change: number(structures.change, EMBEDDED_DEMO.signal.components.structures.change),
          changePct:
            (number(structures.change, EMBEDDED_DEMO.signal.components.structures.change) /
              number(structures.from, EMBEDDED_DEMO.signal.components.structures.from)) *
            100,
        },
        vehicles: {
          from: number(vehicles.from, EMBEDDED_DEMO.signal.components.vehicles.from),
          to: number(vehicles.to, EMBEDDED_DEMO.signal.components.vehicles.to),
          change: number(vehicles.change, EMBEDDED_DEMO.signal.components.vehicles.change),
          changePct:
            (number(vehicles.change, EMBEDDED_DEMO.signal.components.vehicles.change) /
              number(vehicles.from, EMBEDDED_DEMO.signal.components.vehicles.from)) *
            100,
        },
      },
      componentDistribution,
      distributionSensitivity,
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
      evaluatedPoints: number(backtest.evaluated_points, EMBEDDED_DEMO.forecast.evaluatedPoints),
      intervalPoints: number(backtest.interval_points, EMBEDDED_DEMO.forecast.intervalPoints),
      trainingWindow: `${displayMonth(text(training.start_month, "2021-01"))} – ${displayMonth(text(training.end_month, "2025-12"))}`,
      scorecard: scorecard.length ? scorecard : EMBEDDED_DEMO.forecast.scorecard,
    },
    areas: areas.length ? areas : EMBEDDED_DEMO.areas,
    reportingBias,
    robustness,
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
