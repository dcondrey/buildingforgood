import { ArrowDownIcon, CheckIcon, SparkIcon } from "../../components/Icons";
import { Metric } from "../../components/Metric";
import { DIGITIZATION_AGREEMENT, DIGITIZATION_AUDIT } from "../../data/digitizationAudit";
import { useShell } from "../../features/shell/ShellContext";
import { AreaDetailPanel } from "../../features/spatial/AreaDetailPanel";
import { AreaMap } from "../../features/spatial/AreaMap";
import { MapValueTable } from "../../features/spatial/MapValueTable";
import { formatDate, formatNumber } from "../../lib/format";
import { type CSSProperties } from "react";

export function DropTestSection() {
  const {
    classificationLabel,
    data,
    dropRevealed,
    individualOne,
    individualSpatial,
    individualTwo,
    resultHeading,
    revealDrop,
    selectedArea,
    selectedAreaId,
    signal,
    structureOne,
    structureSpatial,
    structureTwo,
    toggleAreaSelection,
  } = useShell();
  return (
    <section className="decision-section" id="drop-test" aria-labelledby="drop-title">
      <div aria-hidden="true" className="section-number">
        01
      </div>
      <div className="section-intro">
        <p className="eyebrow">What actually changed</p>
        <h2 id="drop-title">Test the drop</h2>
        <p>
          The falling estimate is built from three things counted in the field: people, tents, and
          vehicles. Compare each on the same {signal.panelSize} blocks, one January to the next, and
          see which actually dropped.
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
          <strong>Secondary mixed-component context:</strong> all active blocks {signal.activeFrom}
          {" → "}
          {signal.activeTo} (+{formatNumber(signal.activeChangePct, 1)}%); mixed-unit index{" "}
          {signal.fromValue} → {signal.toValue} ({formatNumber(signal.changePct, 1)}%). The index
          arithmetically sums unlike observation units—individuals, structures, and vehicles—and is
          not a count of unique people or an estimated person total. Panel fixed at{" "}
          {signal.panelSize} blocks.
        </p>
        <p className="comparison-defense">
          <CheckIcon /> This is the latest available same-month year-over-year pair in the supplied
          panel: January 2025 is its final date, both months use the POST2020 method, and the exact
          same {signal.panelSize} blocks are compared.
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

          {individualSpatial && individualOne && individualTwo && structureOne && structureTwo && (
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
                  <div className={`component-threshold component-${item.tone}`} key={item.label}>
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
                    HHI {structureSpatial.hhiFrom.toFixed(6)} → {structureSpatial.hhiTo.toFixed(6)}{" "}
                    · effective blocks {formatNumber(structureSpatial.effectiveBlocksFrom, 1)} →{" "}
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
                        ({formatNumber(signal.componentDistribution.derivedEstimate.changePct, 1)}
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
                          signal.componentDistribution.derivedEstimate.individualsContribution,
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
                    individuals. Components were digitized from maps; this is not a unique-person
                    count or the published total series.
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
                        {threshold.change} · {threshold.entered} entered / {threshold.exited} exited
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
                  {signal.distributionSensitivity.singleUnitChange}), but do not alone explain the +
                  {signal.activeChange} at ≥1 because ≥2 still rises. HHI{" "}
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
                  <CheckIcon /> Individuals, tents/structures, and vehicles each count as one raw
                  unit here. This is not a person estimate; the footprint is fixed at{" "}
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
                <div className="map-detail-row">
                  <div>
                    <AreaMap
                      areas={data.areas}
                      ariaLabel="Map of the six downtown neighborhoods showing the change in raw field observations; select a neighborhood for detail"
                      onSelect={toggleAreaSelection}
                      selectedId={selectedAreaId}
                      valueFor={(area) => {
                        if (area.latest === null) return { text: "no data", tone: "missing" };
                        const maxDelta = Math.max(
                          1,
                          ...data.areas.map((row) => Math.abs(row.delta)),
                        );
                        return {
                          text: `${area.delta > 0 ? "+" : ""}${area.delta}`,
                          tone: area.delta > 0 ? "up" : "down",
                          intensity: Math.abs(area.delta) / maxDelta,
                        };
                      }}
                    />
                    <div className="map-legend" aria-label="Map legend">
                      <span>
                        <i className="map-legend-up" /> More observed units
                      </span>
                      <span>
                        <i className="map-legend-down" /> Fewer observed units
                      </span>
                      {data.areas.some((area) => area.latest === null) && (
                        <span>
                          <i className="map-legend-missing" /> No recent observation
                        </span>
                      )}
                    </div>
                    <p className="map-caption">
                      Change in raw field observations by neighborhood · simplified neighborhood
                      boundaries, aggregate values only · not a count of people
                    </p>
                  </div>
                  <AreaDetailPanel
                    area={selectedArea}
                    empty="Select a neighborhood — click, or Tab and Enter — to see what changed there."
                    kicker="Neighborhood detail"
                    note="Raw observed units on the fixed like-for-like panel. Aggregate area values, not unique people; components are digitized from the same maps."
                    rows={
                      selectedArea
                        ? [
                            {
                              label: "Observed change",
                              value: `${selectedArea.delta > 0 ? "+" : ""}${selectedArea.delta} units`,
                              hint: "Jan 2024 → Jan 2025, same blocks",
                            },
                            {
                              label: "Latest observations",
                              value:
                                selectedArea.latest === null
                                  ? "no data"
                                  : formatNumber(selectedArea.latest),
                              hint: "most recent monthly street count",
                            },
                            {
                              label: "Planning load",
                              value: formatNumber(selectedArea.planningLoad),
                              hint: "upper forecast bound",
                            },
                            {
                              label: "Held-out WAPE",
                              value:
                                selectedArea.auditWape === null
                                  ? "not audited"
                                  : `${formatNumber(selectedArea.auditWape, 1)}%`,
                              hint:
                                selectedArea.auditWape !== null && selectedArea.auditWape > 30
                                  ? "noisy — treat with caution"
                                  : "2025 held-out audit",
                              flagged:
                                selectedArea.auditWape !== null && selectedArea.auditWape > 30,
                            },
                          ]
                        : []
                    }
                  />
                </div>
                <MapValueTable
                  caption="Change in raw field observations by neighborhood"
                  rows={data.areas.map((area) => ({
                    name: area.name,
                    value:
                      area.latest === null
                        ? "no data"
                        : `${area.delta > 0 ? "+" : ""}${area.delta}`,
                    state:
                      area.latest === null
                        ? "No recent observation"
                        : area.delta > 0
                          ? "More observed units"
                          : "Fewer observed units",
                  }))}
                />
              </div>
            </div>

            <div className="evidence-balance">
              <div>
                <span className="evidence-icon evidence-for">+</span>
                <p>
                  <strong>Evidence for</strong>Observed individuals increased while structures fell;
                  individual observations reached more fixed-panel blocks at both tested thresholds.
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
                This result is useful because its failure conditions are explicit. Any one of these
                findings would downgrade the conclusion or trigger a new review.
              </p>
              <ul>
                <li>One of the matched months is later found to be incomplete or misclassified.</li>
                <li>A boundary or method change makes the 261-block comparison non-comparable.</li>
                <li>Source review explains the 2023–2024 discontinuity as collection change.</li>
                <li>New held-out data materially weakens forecast error or interval coverage.</li>
                <li>
                  Digitization error measured by the field-sheet audit (two readings currently
                  disagree on{" "}
                  {(100 - (DIGITIZATION_AGREEMENT.summary.agreement_share ?? 0) * 100).toFixed(1)}%
                  of recovered values) grows large enough to account for the downtown change being
                  interpreted.
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
                      <span className="eyebrow">Matched calendar · same Aug–Jan months YoY</span>
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
                          +{formatNumber(data.reportingBias.matchedCalendar.allReportsChangePct, 1)}
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
                    <strong>+{formatNumber(data.reportingBias.uniqueParentChangePct, 1)}%</strong>
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
                          {data.robustness.weather.station}. This rules out only an obvious same-day
                          rain/TMAX contrast; airport conditions and prior weather may differ.
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
                    Duplicate-child share {formatNumber(data.reportingBias.duplicatePrePct, 1)} →{" "}
                    {formatNumber(data.reportingBias.duplicatePostPct, 1)}%
                  </span>
                  <span>
                    Mobile-origin share {formatNumber(data.reportingBias.mobilePrePct, 1)} →{" "}
                    {formatNumber(data.reportingBias.mobilePostPct, 1)}%
                  </span>
                  <span>
                    <code>comm_plan_name=DOWNTOWN</code> · <code>date_requested</code> · July 2023
                    excluded
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
              <strong>Optional reporting diagnostic unavailable.</strong> The loaded artifact did
              not contain a complete validated diagnostic, so no partial values are shown. This lane
              remains excluded from forecasting and allocation.
            </div>
          )}
        </div>
      )}

      <div className="digitization-audit" id="digitization-audit">
        <div className="digitization-audit-head">
          <div>
            <span className="eyebrow">The ruler gets audited too · computer vision</span>
            <strong>Field-sheet digitization audit</strong>
          </div>
          <span className="selected-chip">
            {DIGITIZATION_AUDIT.engine === "local"
              ? "Engine: Apple Vision · offline"
              : DIGITIZATION_AUDIT.engine === "eyepop-vlm"
                ? "Engine: EyePop.ai VLM · hosted"
                : "Engine: EyePop.ai OCR · hosted"}
          </span>
        </div>
        <p>
          The published counts are digitized by hand from scanned, hand-annotated field sheets. This
          audit recovers the sheets&apos; own written totals from the pinned public June 2026 report
          — per page, area-scale values only; anything block-scale is counted but withheld.
        </p>
        <p className="digitization-audit-finding">
          <strong>Recovered, misread, and caught:</strong> the shipped 200-DPI pass reads the City
          Center sheet&apos;s handwritten total as 157 (page 4 below); the same engine re-rastered
          at 300 DPI reads 152, which is what the sheet shows. The sheet reconciles through the
          published multipliers to the published area total: 152 + 14 × 1.75 = 176.5 ≈ 177.
          Handwriting recognition is unstable across scan resolutions — surfacing that instability
          is the audit&apos;s job, and it is why recovered values are candidates for human
          verification, never counts.
        </p>
        <details className="digitization-audit-pages">
          <summary>Per-page recovery across {DIGITIZATION_AUDIT.pages.length} pages</summary>
          <table>
            <caption>
              Recovered integer tokens and area-scale values (≥
              {DIGITIZATION_AUDIT.value_threshold}) by page
            </caption>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Integer tokens</th>
                <th scope="col">Area-scale values</th>
                <th scope="col">Withheld</th>
              </tr>
            </thead>
            <tbody>
              {DIGITIZATION_AUDIT.pages.map((page) => (
                <tr key={page.page}>
                  <td>{page.page}</td>
                  <td>{page.integer_tokens}</td>
                  <td>
                    {page.values.length === 0
                      ? "—"
                      : page.values.length > 6
                        ? `${page.values.slice(0, 6).join(", ")} … +${page.values.length - 6} more`
                        : page.values.join(", ")}
                  </td>
                  <td>{page.withheld_below_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <div className="digitization-audit-head">
          <div>
            <span className="eyebrow">Do two readings agree? · cross-check</span>
            <strong>Reading-vs-reading agreement</strong>
          </div>
          <span className="selected-chip">
            {DIGITIZATION_AGREEMENT.runs
              .map(
                (run) => `${run.engine === "local" ? "Apple Vision" : run.engine} · ${run.dpi} DPI`,
              )
              .join(" vs ")}
          </span>
        </div>
        <p className="digitization-audit-finding">
          Two full readings of the same pinned report — the shipped 200-DPI pass and a 300-DPI
          re-raster — agree on {DIGITIZATION_AGREEMENT.summary.shared_total} of the{" "}
          {DIGITIZATION_AGREEMENT.summary.first_total} and{" "}
          {DIGITIZATION_AGREEMENT.summary.second_total} area-scale values they each recovered (
          {((DIGITIZATION_AGREEMENT.summary.agreement_share ?? 0) * 100).toFixed(1)}%). The
          disagreements are the City Center misread above plus a handful of single-token
          differences. Same engine read twice is a floor on digitization instability, not an
          independent second opinion; the engine-vs-engine version of this card — Apple Vision
          against EyePop&apos;s hosted OCR or its image-contents VLM reading — is one comparison run
          away once a key lands.
        </p>
        <details className="digitization-audit-pages">
          <summary>
            Per-page agreement across {DIGITIZATION_AGREEMENT.summary.pages_compared} pages
          </summary>
          <table>
            <caption>Values recovered by both readings, and by only one, per page</caption>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Shared</th>
                <th scope="col">Only 200 DPI</th>
                <th scope="col">Only 300 DPI</th>
              </tr>
            </thead>
            <tbody>
              {DIGITIZATION_AGREEMENT.pages.map((page) => (
                <tr key={page.page}>
                  <td>{page.page}</td>
                  <td>{page.shared}</td>
                  <td>{page.only_in_first}</td>
                  <td>{page.only_in_second}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <p className="digitization-audit-boundary">
          {DIGITIZATION_AUDIT.boundary} The OCR engine is swappable; EyePop.ai&apos;s hosted
          abilities are a drop-in replacement. {DIGITIZATION_AGREEMENT.boundary}
        </p>
      </div>
    </section>
  );
}
