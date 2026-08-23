import { CheckIcon } from "../../components/Icons";
import { CurrencyPanel } from "../currency/CurrencyPanel";
import { ForecastChart } from "../../features/forecast/ForecastChart";
import { useShell } from "../../features/shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function ForecastSection() {
  const { data } = useShell();
  const { t, tx, number } = useTranslation();
  return (
    <section className="decision-section" id="forecast" aria-labelledby="forecast-title">
      <div aria-hidden="true" className="section-number">
        02
      </div>
      <div className="section-intro split-intro">
        <div>
          <p className="eyebrow">{t("forecast.eyebrow")}</p>
          <h2 id="forecast-title">{t("forecast.title")}</h2>
          <p>{t("forecast.intro")}</p>
        </div>
        <span className="wide-warning">{t("forecast.rehearsalChip")}</span>
      </div>

      <div className="forecast-layout">
        <div className="chart-card">
          <div className="chart-summary">
            <div>
              <span className="eyebrow">{data.forecast.targetPeriod}</span>
              <strong>{number(data.forecast.point)}</strong>
              <small>{t("forecast.bestGuess")}</small>
            </div>
            <div>
              <span className="eyebrow">{t("forecast.likelyRange")}</span>
              <strong>
                {number(data.forecast.lower)}–{number(data.forecast.upper)}
              </strong>
              <small>{t("forecast.usesHighEnd")}</small>
            </div>
          </div>
          <ForecastChart data={data.forecast} history={data.history} />
        </div>

        <div className="model-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">{t("forecast.backtestEyebrow")}</span>
              <h3>{t("forecast.scorecardTitle")}</h3>
            </div>
            <span className="selected-chip">
              {data.forecast.scorecard
                .find((model) => model.selected)
                ?.model.toLowerCase()
                .includes("seasonal naive")
                ? t("forecast.baselineRetained")
                : t("forecast.challengerPromoted")}
            </span>
          </div>
          <p className="model-rule">{t("forecast.modelRule")}</p>
          <div className="model-audit" aria-label={t("forecast.auditAria")} role="group">
            <span>
              <small>{t("forecast.auditMae")}</small>
              <strong>{number(data.forecast.mae, 1)}</strong>
            </span>
            <span>
              <small>{t("forecast.auditWape")}</small>
              <strong>{number(data.forecast.wape, 1)}%</strong>
            </span>
            <span>
              <small>{t("forecast.intervalCoverage")}</small>
              <strong>{number(data.forecast.coverage)}%</strong>
              <small>{t("forecast.heldOutFolds", { folds: data.forecast.intervalPoints })}</small>
            </span>
          </div>
          <div className="scorecard-table-wrap">
            <table className="scorecard-table">
              <caption className="sr-only">{t("forecast.scorecardCaption")}</caption>
              <thead>
                <tr>
                  <th>{t("forecast.thModel")}</th>
                  <th>{t("forecast.thMae2023")}</th>
                  <th>{t("forecast.thWape2023")}</th>
                  <th>{t("forecast.thCoverage")}</th>
                </tr>
              </thead>
              <tbody>
                {data.forecast.scorecard.map((model) => (
                  <tr className={model.selected ? "selected-model" : ""} key={model.model}>
                    <th>
                      {model.model}
                      {model.selected && <span>{t("forecast.selected")}</span>}
                    </th>
                    <td>{number(model.mae)}</td>
                    <td>{number(model.wape, 1)}%</td>
                    <td>{model.coverage === null ? "—" : `${number(model.coverage)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="model-validation">
            <CheckIcon />
            <span>
              <strong>{t("forecast.noBlackBox")}</strong> {t("forecast.noBlackBoxDetail")}
            </span>
          </div>
        </div>
      </div>

      <details className="data-table-disclosure">
        <summary>{t("forecast.viewValues")}</summary>
        <div
          aria-label={t("forecast.tableCaption")}
          className="table-scroll"
          role="region"
          tabIndex={0}
        >
          <table>
            <caption>{t("forecast.tableCaption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("forecast.thPeriod")}</th>
                <th scope="col">{t("forecast.thStatus")}</th>
                <th scope="col">{t("forecast.thValue")}</th>
                <th scope="col">{t("forecast.thLower")}</th>
                <th scope="col">{t("forecast.thUpper")}</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((point) => (
                <tr key={point.period}>
                  <th>{point.period}</th>
                  <td>
                    {point.value === null
                      ? t("forecast.statusMissing")
                      : t("forecast.statusObserved")}
                  </td>
                  <td>{point.value ?? "—"}</td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              ))}
              <tr>
                <th>{data.forecast.targetPeriod}</th>
                <td>{t("forecast.statusScenario")}</td>
                <td>{number(data.forecast.point)}</td>
                <td>{number(data.forecast.lower)}</td>
                <td>{number(data.forecast.upper)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong>{t("forecast.trainingLabel")}</strong>{" "}
          {tx("forecast.trainingNote", {
            window: data.forecast.trainingWindow,
            coverage: number(data.forecast.coverage),
            folds: data.forecast.intervalPoints,
          })}
        </p>
      </details>

      <CurrencyPanel />
    </section>
  );
}
