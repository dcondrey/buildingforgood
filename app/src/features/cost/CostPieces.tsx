/**
 * The cost surface: one operator-set assumption and what it implies.
 *
 * Modeled on the assumption explorer's displaced share, deliberately: the
 * operator states the number, the interface labels it as stated, and no plan
 * is computed from it. Cost is rendered after the plan, never before it.
 *
 * Every figure here is per staff-hour, per area, or per plan. There is no
 * cost per person, per contact, or per anyone covered, and no control that
 * could produce one.
 */

import { MAX_LOADED_HOURLY_RATE } from "../../domain/cost/index.ts";
import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";

export function CostAssumptionControl() {
  const { loadedHourlyRate, planCost, setLoadedHourlyRate } = useShell();
  const { t, money } = useTranslation();
  return (
    <div className="whatif-control" aria-label={t("cost.rateAria")} role="group">
      <span className="eyebrow">{t("cost.rateEyebrow")}</span>
      <label htmlFor="loaded-hourly-rate">{t("cost.rateLabel")}</label>
      <div className="whatif-row">
        <input
          aria-describedby="loaded-rate-basis"
          id="loaded-hourly-rate"
          max={MAX_LOADED_HOURLY_RATE}
          min="0"
          onChange={(event) => setLoadedHourlyRate(Number(event.target.value))}
          step="5"
          type="range"
          value={loadedHourlyRate}
        />
        <output htmlFor="loaded-hourly-rate">
          {t("cost.perStaffHour", { money: money(loadedHourlyRate, planCost.currency) })}
        </output>
      </div>
      <p id="loaded-rate-basis">{t("cost.rateBasis")}</p>
    </div>
  );
}

export function PlanCostSummary() {
  const { floorCostLine, guardEnabled, plan, planCost } = useShell();
  const { t, money } = useTranslation();
  if (!plan?.feasible || floorCostLine === null) return null;
  return (
    <div className="intervention-banner" role="status">
      <div>
        <strong>{floorCostLine}</strong>{" "}
        {guardEnabled
          ? t("cost.summaryGuarded", {
              hours: planCost.floor.hours,
              rate: t("cost.perStaffHour", { money: money(planCost.rate, planCost.currency) }),
            })
          : t("cost.summaryUnguarded")}{" "}
        {t("cost.summaryTail", {
          hours: planCost.totalHours,
          total: money(planCost.totalCost, planCost.currency),
        })}
        <details className="data-table-disclosure">
          <summary>{t("cost.tableSummary")}</summary>
          <div
            aria-label={t("cost.tableCaption")}
            className="table-scroll"
            role="region"
            tabIndex={0}
          >
            <table>
              <caption>{t("cost.tableCaption")}</caption>
              <thead>
                <tr>
                  <th scope="col">{t("cost.thNeighborhood")}</th>
                  <th scope="col">{t("cost.thPlannedHours")}</th>
                  <th scope="col">{t("cost.thAssumedCost")}</th>
                </tr>
              </thead>
              <tbody>
                {planCost.byArea.map((row) => (
                  <tr key={row.areaId}>
                    <th scope="row">{row.label}</th>
                    <td>{t("cost.hoursValue", { hours: row.hours })}</td>
                    <td>{money(row.cost, planCost.currency)}</td>
                  </tr>
                ))}
                <tr>
                  <th>{t("cost.wholePlan")}</th>
                  <td>{t("cost.hoursValue", { hours: planCost.totalHours })}</td>
                  <td>{money(planCost.totalCost, planCost.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
