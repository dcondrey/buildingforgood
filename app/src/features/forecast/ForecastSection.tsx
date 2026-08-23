import { CheckIcon } from "../../components/Icons";
import { ForecastChart } from "../../features/forecast/ForecastChart";
import { useShell } from "../../features/shell/ShellContext";
import { formatNumber } from "../../lib/format";

export function ForecastSection() {
  const { data } = useShell();
  return (
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
            grades itself against its own past errors. The plan uses the high end of that error
            range, so uncertainty buys extra coverage.
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
            A candidate is promoted only if it improves held-out error on the 2023 promotion window
            — the scorecard rows below. The audit figures above them come from the separate,
            untouched 2025 walk-forward, which is why the two error levels differ. Lower MAE and
            WAPE are better; interval coverage is audited separately.
          </p>
          <div className="model-audit" aria-label="Final 2025 walk-forward audit">
            <span>
              <small>2025 audit MAE</small>
              <strong>{formatNumber(data.forecast.mae, 1)}</strong>
            </span>
            <span>
              <small>2025 audit WAPE</small>
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
                  <th>2023 MAE</th>
                  <th>2023 WAPE</th>
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
                    <td>{model.coverage === null ? "—" : `${formatNumber(model.coverage)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="model-validation">
            <CheckIcon />
            <span>
              <strong>No black-box promotion.</strong> Seasonal baseline remains unless a candidate
              wins out of sample.
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
          <strong>Training:</strong> {data.forecast.trainingWindow}. Rolling-origin evaluation; no
          interpolation across missing targets. Data are frozen at December 2025; the historical
          scenario’s upper bound feeds only this demonstration allocation. The residual band
          achieved {formatNumber(data.forecast.coverage)}% empirical coverage across{" "}
          {data.forecast.intervalPoints} folds; it is not a guaranteed 80% probability statement.
        </p>
      </details>
    </section>
  );
}
