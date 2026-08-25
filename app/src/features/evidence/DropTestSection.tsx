import { ArrowDownIcon, CheckIcon, SparkIcon } from "../../components/Icons";
import { Metric } from "../../components/Metric";
import { DIGITIZATION_AGREEMENT, DIGITIZATION_AUDIT } from "../../data/digitizationAudit";
import { SOURCE_AGREEMENT } from "../../data/sourceAgreement";

/** Whether two YYYY-MM strings are consecutive calendar months. */
function monthsAdjacent(a: string, b: string): boolean {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am) === 1;
}

import { useShell } from "../../features/shell/ShellContext";
import { AreaDetailPanel } from "../../features/spatial/AreaDetailPanel";
import { AreaMap } from "../../features/spatial/AreaMap";
import { MapValueTable } from "../../features/spatial/MapValueTable";
import { useTranslation } from "../../i18n/context";
import { type CSSProperties } from "react";

export function DropTestSection() {
  const {
    classificationLabel,
    data,
    dropRevealed,
    individualOne,
    individualSpatial,
    individualTwo,
    placeText,
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
  const { t, tx, number, signed, date, list } = useTranslation();

  // The named defects are read out of the artifact rather than hardcoded, so a
  // re-run that finds different months describes those instead of these.
  const yearRatios = Object.values(SOURCE_AGREEMENT.median_ratio_by_year);
  const defects = [...SOURCE_AGREEMENT.known_defect_months].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  // A pair of adjacent months straddling parity is the month-boundary
  // signature: what one month lost, the next gained.
  const pairIndex = defects.findIndex(
    (d, i) =>
      i + 1 < defects.length &&
      d.ratio < 1 &&
      defects[i + 1].ratio > 1 &&
      monthsAdjacent(d.month, defects[i + 1].month),
  );
  const defectPair =
    pairIndex === -1 ? null : ([defects[pairIndex], defects[pairIndex + 1]] as const);
  const paired = new Set(defectPair ? [defectPair[0].month, defectPair[1].month] : []);
  const defectRun = defects.filter((d) => !paired.has(d.month) && d.ratio < 1);
  return (
    <section className="decision-section" id="drop-test" aria-labelledby="drop-title" tabIndex={-1}>
      <div aria-hidden="true" className="section-number">
        01
      </div>
      <div className="section-intro">
        <p className="eyebrow">{t("drop.eyebrow")}</p>
        <h2 id="drop-title">{t("drop.title")}</h2>
        <p>{t("drop.intro", { panel: signal.panelSize })}</p>
      </div>

      <div className="metric-grid composition-metrics">
        <Metric
          label={t("drop.metricPeople")}
          value={`${signal.components.individuals.from} → ${signal.components.individuals.to}`}
          detail={`+${number(signal.components.individuals.changePct, 1)}%`}
          tone="teal"
        />
        <Metric
          label={t("drop.metricTents")}
          value={`${signal.components.structures.from} → ${signal.components.structures.to}`}
          detail={`${number(signal.components.structures.changePct, 1)}%`}
          tone="amber"
        />
        <Metric
          label={t("drop.metricVehicles")}
          value={`${signal.components.vehicles.from} → ${signal.components.vehicles.to}`}
          detail={`${number(signal.components.vehicles.changePct, 1)}%`}
        />
        <Metric
          label={individualOne ? t("drop.metricBlocksOnePerson") : t("drop.metricActiveFootprint")}
          value={`${number(individualOne?.fromBlocks ?? signal.activeFrom)} → ${number(individualOne?.toBlocks ?? signal.activeTo)}`}
          detail={
            individualOne
              ? t("drop.blocksLikeForLike", { blocks: individualOne.change })
              : t("drop.activeBlocksPct", { pct: number(signal.activeChangePct, 1) })
          }
          tone="teal"
        />
      </div>
      <details className="context-details">
        <summary>
          <span>{t("drop.howToRead")}</span>
          <small>{t("drop.howToReadSub")}</small>
        </summary>
        <p className="mixed-index-note">
          {tx("drop.mixedIndexNote", {
            activeFrom: signal.activeFrom,
            activeTo: signal.activeTo,
            activePct: number(signal.activeChangePct, 1),
            fromValue: signal.fromValue,
            toValue: signal.toValue,
            changePct: number(signal.changePct, 1),
            panel: signal.panelSize,
          })}
        </p>
        <p className="comparison-defense">
          <CheckIcon /> {t("drop.comparisonDefense", { panel: signal.panelSize })}
        </p>
      </details>

      {!dropRevealed ? (
        <div className="reveal-action">
          <button
            className="button button-primary button-large"
            onClick={() => revealDrop()}
            type="button"
          >
            <SparkIcon /> {t("drop.revealButton")}
          </button>
          <span>{t("drop.revealNote")}</span>
        </div>
      ) : (
        <div aria-live="polite" className="evidence-result reveal" id="evidence-result">
          <div className="result-header">
            <div className="result-symbol">
              <ArrowDownIcon />
            </div>
            <div>
              <p className="eyebrow">{t("drop.resultEyebrow")}</p>
              <h3 ref={resultHeading} tabIndex={-1}>
                {classificationLabel}
              </h3>
              <p>
                {individualSpatial ? t("drop.resultWithSpatial") : t("drop.resultWithoutSpatial")}
              </p>
            </div>
            <span className="confidence-chip">{t("drop.humanReviewRequired")}</span>
          </div>

          {individualSpatial && individualOne && individualTwo && structureOne && structureTwo && (
            <div className="component-proof" aria-label={t("drop.componentProofAria")} role="group">
              <div className="distribution-heading">
                <div>
                  <span className="eyebrow">{t("drop.keyCheckEyebrow")}</span>
                  <strong>{t("drop.keyCheckTitle")}</strong>
                </div>
                <span>{t("drop.sameBlocksBothYears")}</span>
              </div>
              <div className="component-thresholds">
                {[
                  { label: t("drop.thresholdOnePerson"), value: individualOne, tone: "up" },
                  { label: t("drop.thresholdTwoPeople"), value: individualTwo, tone: "up" },
                  { label: t("drop.thresholdOneTent"), value: structureOne, tone: "down" },
                  { label: t("drop.thresholdTwoTents"), value: structureTwo, tone: "down" },
                ].map((item) => (
                  <div className={`component-threshold component-${item.tone}`} key={item.label}>
                    <small>{item.label}</small>
                    <strong>
                      {item.value.fromBlocks} → {item.value.toBlocks}
                    </strong>
                    <span>{t("drop.blocksDelta", { delta: signed(item.value.change) })}</span>
                  </div>
                ))}
              </div>
              {structureSpatial && (
                <div className="component-concentration">
                  <span>
                    <strong>{t("drop.individualsConcentration")}</strong>
                    {t("drop.hhiWithEffectiveBlocks", {
                      hhiFrom: individualSpatial.hhiFrom.toFixed(6),
                      hhiTo: individualSpatial.hhiTo.toFixed(6),
                      blocksFrom: number(individualSpatial.effectiveBlocksFrom, 1),
                      blocksTo: number(individualSpatial.effectiveBlocksTo, 1),
                    })}
                  </span>
                  <span>
                    <strong>{t("drop.tentsConcentration")}</strong>
                    {t("drop.hhiWithEffectiveBlocks", {
                      hhiFrom: structureSpatial.hhiFrom.toFixed(6),
                      hhiTo: structureSpatial.hhiTo.toFixed(6),
                      blocksFrom: number(structureSpatial.effectiveBlocksFrom, 1),
                      blocksTo: number(structureSpatial.effectiveBlocksTo, 1),
                    })}
                  </span>
                </div>
              )}
              {signal.componentDistribution?.derivedEstimate && (
                <div className="derived-bridge">
                  <div>
                    <span className="eyebrow">{t("drop.derivedEyebrow")}</span>
                    <strong>
                      {number(signal.componentDistribution.derivedEstimate.from, 1)} →{" "}
                      {number(signal.componentDistribution.derivedEstimate.to, 1)}{" "}
                      <em>
                        ({number(signal.componentDistribution.derivedEstimate.changePct, 1)}
                        %)
                      </em>
                    </strong>
                    <small>{t("drop.derivedNote")}</small>
                  </div>
                  <div className="decomposition-values">
                    <span>
                      {t("drop.individuals")}{" "}
                      <strong>
                        +
                        {number(
                          signal.componentDistribution.derivedEstimate.individualsContribution,
                          1,
                        )}
                      </strong>
                    </span>
                    <span>
                      {t("drop.structures")}{" "}
                      <strong>
                        {number(
                          signal.componentDistribution.derivedEstimate.structuresContribution,
                          1,
                        )}
                      </strong>
                    </span>
                    <span>
                      {t("drop.vehicles")}{" "}
                      <strong>
                        {number(
                          signal.componentDistribution.derivedEstimate.vehiclesContribution,
                          1,
                        )}
                      </strong>
                    </span>
                  </div>
                  <p>{t("drop.derivedExplain")}</p>
                </div>
              )}
              {/* The artifact's own interpretation sentence, rendered unedited. */}
              <p lang="en">{signal.componentDistribution?.interpretation}</p>
            </div>
          )}

          <details className="evidence-details">
            <summary>
              <span>{t("drop.exploreEvidence")}</span>
              <small>{t("drop.exploreEvidenceSub")}</small>
            </summary>

            {signal.distributionSensitivity && (
              <div
                className="distribution-proof distribution-secondary"
                aria-label={t("drop.distributionAria")}
                role="group"
              >
                <div className="distribution-heading">
                  <div>
                    <span className="eyebrow">{t("drop.secondaryEyebrow")}</span>
                    <strong>{t("drop.secondaryTitle")}</strong>
                  </div>
                  <span>{t("drop.notAPersonCount")}</span>
                </div>
                <div className="threshold-row">
                  {signal.distributionSensitivity.thresholds.map((threshold) => (
                    <div key={threshold.minimumUnits}>
                      <small>
                        {t("drop.activeBlocksAtLeast", { count: threshold.minimumUnits })}
                      </small>
                      <strong>
                        {threshold.fromBlocks} → {threshold.toBlocks}
                      </strong>
                      <span className={threshold.change > 0 ? "delta-up" : "threshold-flat"}>
                        {t("drop.thresholdChurn", {
                          delta: signed(threshold.change),
                          entered: threshold.entered,
                          exited: threshold.exited,
                        })}
                      </span>
                    </div>
                  ))}
                  <div className="concentration-result">
                    <small>{t("drop.intensityConcentration")}</small>
                    <strong>
                      {t("drop.hhiPct", {
                        pct: number(signal.distributionSensitivity.hhiChangePct, 1),
                      })}
                    </strong>
                    <span>
                      {t("drop.effectiveBlocks", {
                        from: number(signal.distributionSensitivity.effectiveBlocksFrom, 1),
                        to: number(signal.distributionSensitivity.effectiveBlocksTo, 1),
                      })}
                    </span>
                  </div>
                </div>
                <p>
                  {t("drop.singleUnitNote", {
                    from: signal.distributionSensitivity.singleUnitFrom,
                    to: signal.distributionSensitivity.singleUnitTo,
                    change: signal.distributionSensitivity.singleUnitChange,
                    activeChange: signal.activeChange,
                    hhiFrom: signal.distributionSensitivity.hhiFrom.toFixed(6),
                    hhiTo: signal.distributionSensitivity.hhiTo.toFixed(6),
                  })}
                </p>
              </div>
            )}

            <div className="evidence-grid">
              <div className="churn-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">{t("drop.churnEyebrow")}</span>
                    <h4>{t("drop.churnTitle")}</h4>
                  </div>
                  <span className="formula">
                    +{signal.grossIncreases} − {signal.grossDecreases} = {signal.change}
                  </span>
                </div>
                <div
                  className="churn-visual"
                  aria-label={t("drop.churnAria", {
                    increases: signal.grossIncreases,
                    decreases: signal.grossDecreases,
                    net: signal.change,
                  })}
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
                    <span>{t("drop.grossIncreases")}</span>
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
                    <span>{t("drop.grossDecreases")}</span>
                    <strong>−{signal.grossDecreases}</strong>
                  </div>
                </div>
                <p className="method-note">
                  <CheckIcon /> {t("drop.churnMethodNote", { panel: signal.panelSize })}
                </p>
              </div>

              <div className="area-view-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">{t("drop.aggregateContext")}</span>
                    <h4>{t("drop.whereSignalChanged")}</h4>
                  </div>
                  <span className="formula positive">
                    {t("drop.activeBlocksFormula", { change: signal.activeChange })}
                  </span>
                </div>
                <div className="map-detail-row">
                  <div>
                    <AreaMap
                      areas={data.areas}
                      ariaLabel={t("map.ariaChange", placeText)}
                      onSelect={toggleAreaSelection}
                      selectedId={selectedAreaId}
                      valueFor={(area) => {
                        if (area.latest === null) return { text: t("map.noData"), tone: "missing" };
                        const maxDelta = Math.max(
                          1,
                          ...data.areas.map((row) => Math.abs(row.delta)),
                        );
                        return {
                          text: signed(area.delta),
                          tone: area.delta > 0 ? "up" : "down",
                          intensity: Math.abs(area.delta) / maxDelta,
                        };
                      }}
                    />
                    <div className="map-legend" aria-label={t("map.legendAria")} role="group">
                      <span>
                        <i className="map-legend-up" /> {t("map.legendMore")}
                      </span>
                      <span>
                        <i className="map-legend-down" /> {t("map.legendFewer")}
                      </span>
                      {data.areas.some((area) => area.latest === null) && (
                        <span>
                          <i className="map-legend-missing" /> {t("map.legendMissing")}
                        </span>
                      )}
                    </div>
                    <p className="map-caption">{t("map.captionChange")}</p>
                  </div>
                  <AreaDetailPanel
                    area={selectedArea}
                    empty={t("detail.emptyChange")}
                    kicker={t("detail.kickerNeighborhood")}
                    note={t("detail.noteChange")}
                    rows={
                      selectedArea
                        ? [
                            {
                              label: t("detail.observedChange"),
                              value: t("detail.unitsDelta", { delta: signed(selectedArea.delta) }),
                              hint: t("detail.hintSameBlocks"),
                            },
                            {
                              label: t("detail.latestObservations"),
                              value:
                                selectedArea.latest === null
                                  ? t("map.noData")
                                  : number(selectedArea.latest),
                              hint: t("detail.hintMonthlyStreetCount"),
                            },
                            {
                              label: t("detail.planningLoad"),
                              value: number(selectedArea.planningLoad),
                              hint: t("detail.hintUpperForecastBound"),
                            },
                            {
                              label: t("detail.heldOutWape"),
                              value:
                                selectedArea.auditWape === null
                                  ? t("detail.notAudited")
                                  : t("detail.wapeValue", {
                                      wape: number(selectedArea.auditWape, 1),
                                    }),
                              hint:
                                selectedArea.auditWape !== null && selectedArea.auditWape > 30
                                  ? t("detail.hintNoisyCaution")
                                  : t("detail.hint2025Audit"),
                              flagged:
                                selectedArea.auditWape !== null && selectedArea.auditWape > 30,
                            },
                          ]
                        : []
                    }
                  />
                </div>
                <MapValueTable
                  caption={t("table.captionChange")}
                  rows={data.areas.map((area) => ({
                    name: area.name,
                    value: area.latest === null ? t("map.noData") : signed(area.delta),
                    state:
                      area.latest === null
                        ? t("state.noRecentObservation")
                        : area.delta > 0
                          ? t("state.moreObservedUnits")
                          : t("state.fewerObservedUnits"),
                  }))}
                />
              </div>
            </div>

            <div className="evidence-balance">
              <div>
                <span className="evidence-icon evidence-for">+</span>
                <p>
                  <strong>{t("drop.evidenceFor")}</strong>
                  {t("drop.evidenceForText")}
                </p>
              </div>
              <div>
                <span className="evidence-icon evidence-against">!</span>
                <p>
                  <strong>{t("drop.evidenceBoundary")}</strong>
                  {t("drop.evidenceBoundaryText")}
                </p>
              </div>
              <div>
                <span className="evidence-icon evidence-check">✓</span>
                <p>
                  <strong>{t("drop.validityCheck")}</strong>
                  {t("drop.validityCheckText")}
                </p>
              </div>
            </div>

            <aside aria-labelledby="challenge-title" className="challenge-card">
              <div className="challenge-heading">
                <div>
                  <span className="eyebrow">{t("drop.challengeEyebrow")}</span>
                  <h4 id="challenge-title">{t("drop.challengeTitle")}</h4>
                </div>
                <span className="challenge-badge">{t("drop.challengeBadge")}</span>
              </div>
              <p>{t("drop.challengeLede")}</p>
              <ul>
                <li>{t("drop.challengeMonths")}</li>
                <li>{t("drop.challengeBoundary")}</li>
                <li>{t("drop.challengeDiscontinuity")}</li>
                <li>{t("drop.challengeHeldOut")}</li>
                <li>
                  {t("drop.challengeDigitization", {
                    pct: (
                      100 -
                      (DIGITIZATION_AGREEMENT.summary.agreement_share ?? 0) * 100
                    ).toFixed(1),
                  })}
                </li>
              </ul>
            </aside>
          </details>

          {data.reportingBias ? (
            <details className="bias-diagnostic">
              <summary>
                <span>
                  <small>{t("bias.summaryLabel")}</small>
                  {t("bias.summaryText", {
                    points: number(
                      data.reportingBias.matchedCalendar?.shareChangePoints ??
                        data.reportingBias.shareChangePoints,
                      1,
                    ),
                  })}
                </span>
                <strong>{t("bias.excludedChip")}</strong>
              </summary>
              <div className="bias-body">
                <div className="bias-heading">
                  <div>
                    <span className="eyebrow">{t("bias.eyebrow")}</span>
                    <h4>{t("bias.title")}</h4>
                  </div>
                  <span className="diagnostic-only">{t("bias.diagnosticOnly")}</span>
                </div>

                {data.reportingBias.matchedCalendar && (
                  <div className="matched-calendar">
                    <div>
                      <span className="eyebrow">{t("bias.matchedEyebrow")}</span>
                      <strong>{t("bias.matchedTitle")}</strong>
                    </div>
                    <div className="bias-metrics">
                      <div>
                        <span>{t("bias.encampmentRows")}</span>
                        <strong>
                          +{number(data.reportingBias.matchedCalendar.rawChangePct, 1)}%
                        </strong>
                      </div>
                      <div>
                        <span>{t("bias.topLevelRequests")}</span>
                        <strong>
                          +{number(data.reportingBias.matchedCalendar.uniqueParentChangePct, 1)}%
                        </strong>
                      </div>
                      <div>
                        <span>{t("bias.allGidRows")}</span>
                        <strong>
                          +{number(data.reportingBias.matchedCalendar.allReportsChangePct, 1)}%
                        </strong>
                      </div>
                      <div>
                        <span>{t("bias.encampmentShare")}</span>
                        <strong>
                          {number(data.reportingBias.matchedCalendar.sharePrePct, 1)} →{" "}
                          {number(data.reportingBias.matchedCalendar.sharePostPct, 1)}%
                        </strong>
                      </div>
                    </div>
                    <p lang="en">{data.reportingBias.matchedCalendar.interpretation}</p>
                  </div>
                )}

                <span className="eyebrow diagnostic-subhead">{t("bias.preparedWindows")}</span>
                <div className="bias-metrics">
                  <div>
                    <span>{t("bias.encampmentRows")}</span>
                    <strong>+{number(data.reportingBias.rawChangePct, 1)}%</strong>
                  </div>
                  <div>
                    <span>{t("bias.uniqueParents")}</span>
                    <strong>+{number(data.reportingBias.uniqueParentChangePct, 1)}%</strong>
                  </div>
                  <div>
                    <span>{t("bias.allGidRows")}</span>
                    <strong>+{number(data.reportingBias.allReportsChangePct, 1)}%</strong>
                  </div>
                  <div>
                    <span>{t("bias.encampmentShare")}</span>
                    <strong>
                      {number(data.reportingBias.sharePrePct, 1)} →{" "}
                      {number(data.reportingBias.sharePostPct, 1)}%
                    </strong>
                  </div>
                  <div>
                    <span>{t("bias.placeboBasket")}</span>
                    <strong>{number(data.reportingBias.placeboChangePct, 1)}%</strong>
                  </div>
                </div>

                <div className="checkpoint-block">
                  <div>
                    <span className="eyebrow">{t("bias.checkpointsEyebrow")}</span>
                    <p>{t("bias.checkpointsNote")}</p>
                  </div>
                  <div className="checkpoint-list">
                    {data.reportingBias.checkpoints.map((checkpoint) => (
                      <div key={checkpoint.month}>
                        <span>{checkpoint.month}</span>
                        <strong>{number(checkpoint.rawPerPublishedUnit, 2)}×</strong>
                        <small>
                          {t("bias.checkpointDetail", {
                            raw: number(checkpoint.rawReports),
                            published: number(checkpoint.publishedTotal),
                          })}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>

                {data.robustness ? (
                  <section className="robustness-section" aria-labelledby="robustness-title">
                    <div className="robustness-section-title">
                      <span className="eyebrow" id="robustness-title">
                        {t("robust.eyebrow")}
                      </span>
                      <strong>{t("robust.title")}</strong>
                    </div>
                    <div className="robustness-grid">
                      <article className="robustness-card">
                        <div className="robustness-title">
                          <span className="eyebrow">{t("robust.footfallEyebrow")}</span>
                          <strong>{t("robust.parkingTitle")}</strong>
                          <small>
                            {data.robustness.parking.matchedCalendar
                              ? t("robust.parkingMatched")
                              : t("robust.parkingAligned")}
                          </small>
                        </div>
                        <div className="parking-result">
                          <span>
                            <small>
                              {t("robust.verifiedPoles", {
                                poles: number(
                                  data.robustness.parking.matchedCalendar?.verifiedPoles ??
                                    data.robustness.parking.verifiedPoles,
                                ),
                              })}
                            </small>
                            <strong>
                              {number(
                                data.robustness.parking.matchedCalendar?.preMonthlyMean ??
                                  data.robustness.parking.preMonthlyMean,
                              )}{" "}
                              →{" "}
                              {number(
                                data.robustness.parking.matchedCalendar?.postMonthlyMean ??
                                  data.robustness.parking.postMonthlyMean,
                              )}
                            </strong>
                            <small>
                              {t("robust.transactionsPerMonth", {
                                pct: number(
                                  data.robustness.parking.matchedCalendar?.changePct ??
                                    data.robustness.parking.changePct,
                                  1,
                                ),
                              })}
                            </small>
                          </span>
                          <span>
                            <small>
                              {data.robustness.parking.matchedCalendar
                                ? t("robust.allDowntownMeters")
                                : t("robust.perMeterMonth")}
                            </small>
                            <strong>
                              {data.robustness.parking.matchedCalendar
                                ? `${number(data.robustness.parking.matchedCalendar.allMeterChangePct, 1)}%`
                                : `${number(data.robustness.parking.prePerMeter, 1)} → ${number(data.robustness.parking.postPerMeter, 1)}`}
                            </strong>
                            <small>
                              {data.robustness.parking.matchedCalendar
                                ? t("robust.matchedCalendarSensitivity")
                                : t("robust.allObservedMeters", {
                                    pct: number(data.robustness.parking.allMeterChangePct, 1),
                                  })}
                            </small>
                          </span>
                        </div>
                        <p lang="en">
                          {data.robustness.parking.matchedCalendar?.interpretation ??
                            data.robustness.parking.interpretation}
                        </p>
                        <small className="robustness-caveat">{t("robust.parkingCaveat")}</small>
                      </article>

                      <article className="robustness-card">
                        <div className="robustness-title">
                          <span className="eyebrow">{t("robust.countDayEyebrow")}</span>
                          <strong>{t("robust.weatherTitle")}</strong>
                        </div>
                        <div className="weather-dates">
                          {data.robustness.weather.dates.map((point) => (
                            <span key={point.date}>
                              <small>{date(point.date)}</small>
                              <strong>
                                {t("robust.tempF", { value: number(point.maximumTemperature) })}
                              </strong>
                              <small>
                                {t("robust.rainIn", { value: number(point.precipitation, 2) })}
                              </small>
                            </span>
                          ))}
                        </div>
                        <p lang="en">{data.robustness.weather.interpretation}</p>
                        <small className="robustness-caveat">
                          {t("robust.weatherCaveat", {
                            station: data.robustness.weather.station,
                          })}
                        </small>
                      </article>
                    </div>
                  </section>
                ) : (
                  <p className="diagnostic-unavailable" role="note">
                    {t("robust.unavailable")}
                  </p>
                )}

                <p className="bias-interpretation" lang="en">
                  {data.reportingBias.interpretation}
                </p>
                <div className="sensitivity-row">
                  <span>
                    {t("bias.duplicateShare", {
                      from: number(data.reportingBias.duplicatePrePct, 1),
                      to: number(data.reportingBias.duplicatePostPct, 1),
                    })}
                  </span>
                  <span>
                    {t("bias.mobileShare", {
                      from: number(data.reportingBias.mobilePrePct, 1),
                      to: number(data.reportingBias.mobilePostPct, 1),
                    })}
                  </span>
                  <span>{tx("bias.queryNote")}</span>
                </div>
                <p className="bias-exclusion">{tx("bias.neverUsedFor")}</p>
              </div>
            </details>
          ) : (
            <div className="diagnostic-unavailable" role="note">
              {tx("bias.unavailable")}
            </div>
          )}
        </div>
      )}

      <div className="digitization-audit" id="source-agreement">
        <div className="digitization-audit-head">
          <div>
            <span className="eyebrow">{t("sourceAgreement.eyebrow")}</span>
            <strong>{t("sourceAgreement.title")}</strong>
          </div>
          <span className="selected-chip">{number(SOURCE_AGREEMENT.median_ratio, 3)}</span>
        </div>
        <p>{t("sourceAgreement.intro")}</p>
        <p className="digitization-audit-finding">
          {tx("sourceAgreement.headline", {
            months: SOURCE_AGREEMENT.overlap_months,
            median: number(SOURCE_AGREEMENT.median_ratio, 3),
            low: number(Math.min(...yearRatios), 3),
            high: number(Math.max(...yearRatios), 3),
          })}
        </p>
        <p>
          {t("sourceAgreement.spread", {
            within5: number(SOURCE_AGREEMENT.within_5pct, 0),
            within10: number(SOURCE_AGREEMENT.within_10pct, 0),
          })}
        </p>
        <p className="digitization-audit-finding">{tx("sourceAgreement.notWhat")}</p>
        <details className="digitization-audit-pages">
          <summary>{t("sourceAgreement.defectsTitle")}</summary>
          <p>{t("sourceAgreement.defectsIntro")}</p>
          <ul>
            {defectPair && (
              <li>
                {t("sourceAgreement.defectPair", {
                  a: defectPair[0].month,
                  b: defectPair[1].month,
                  ratioA: number(defectPair[0].ratio, 2),
                  ratioB: number(defectPair[1].ratio, 2),
                })}
              </li>
            )}
            {defectRun.length > 0 && (
              <li>
                {t("sourceAgreement.defectRun", {
                  months: list(defectRun.map((d) => d.month)),
                  ratio: number(defectRun[0].ratio, 2),
                })}
              </li>
            )}
            {SOURCE_AGREEMENT.months_absent_from_package.length > 0 && (
              <li>
                {t("sourceAgreement.absent", {
                  months: list(SOURCE_AGREEMENT.months_absent_from_package),
                })}
              </li>
            )}
          </ul>
          <p className="currency-frozen">
            {t("sourceAgreement.provenance", {
              version: SOURCE_AGREEMENT.package_version,
              retrieved: date(SOURCE_AGREEMENT.retrieved_at),
              attribution: SOURCE_AGREEMENT.attribution,
            })}
          </p>
        </details>
      </div>

      <div className="digitization-audit" id="digitization-audit">
        <div className="digitization-audit-head">
          <div>
            <span className="eyebrow">{t("digit.eyebrow")}</span>
            <strong>{t("digit.title")}</strong>
          </div>
          <span className="selected-chip">
            {DIGITIZATION_AUDIT.engine === "local"
              ? t("digit.engineLocal")
              : DIGITIZATION_AUDIT.engine === "eyepop-vlm"
                ? t("digit.engineVlm")
                : t("digit.engineOcr")}
          </span>
        </div>
        <p>{t("digit.intro")}</p>
        <p className="digitization-audit-finding">{tx("digit.finding")}</p>
        <details className="digitization-audit-pages">
          <summary>{t("digit.perPage", { pages: DIGITIZATION_AUDIT.pages.length })}</summary>
          <table>
            <caption>
              {t("digit.tableCaption", { threshold: DIGITIZATION_AUDIT.value_threshold })}
            </caption>
            <thead>
              <tr>
                <th scope="col">{t("digit.thPage")}</th>
                <th scope="col">{t("digit.thIntegerTokens")}</th>
                <th scope="col">{t("digit.thAreaScaleValues")}</th>
                <th scope="col">{t("digit.thWithheld")}</th>
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
                        ? t("digit.valuesTruncated", {
                            values: page.values.slice(0, 6).join(", "),
                            more: page.values.length - 6,
                          })
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
            <span className="eyebrow">{t("digit.agreementEyebrow")}</span>
            <strong>{t("digit.agreementTitle")}</strong>
          </div>
          <span className="selected-chip">
            {DIGITIZATION_AGREEMENT.runs
              .map((run) =>
                t("digit.runLabel", {
                  engine: run.engine === "local" ? t("digit.engineAppleVision") : run.engine,
                  dpi: run.dpi,
                }),
              )
              .join(" vs ")}
          </span>
        </div>
        <p className="digitization-audit-finding">
          {t("digit.agreementFinding", {
            shared: DIGITIZATION_AGREEMENT.summary.shared_total,
            first: DIGITIZATION_AGREEMENT.summary.first_total,
            second: DIGITIZATION_AGREEMENT.summary.second_total,
            pct: ((DIGITIZATION_AGREEMENT.summary.agreement_share ?? 0) * 100).toFixed(1),
          })}
        </p>
        <details className="digitization-audit-pages">
          <summary>
            {t("digit.agreementPerPage", {
              pages: DIGITIZATION_AGREEMENT.summary.pages_compared,
            })}
          </summary>
          <table>
            <caption>{t("digit.agreementTableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("digit.thPage")}</th>
                <th scope="col">{t("digit.thShared")}</th>
                <th scope="col">{t("digit.thOnlyFirst")}</th>
                <th scope="col">{t("digit.thOnlySecond")}</th>
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
          {t("digit.auditBoundary")} {t("digit.swappable")} {t("digit.agreementBoundary")}
        </p>
      </div>
    </section>
  );
}
