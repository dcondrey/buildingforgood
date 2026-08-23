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

import { MAX_LOADED_HOURLY_RATE, formatCurrency, formatRate } from "../../domain/cost/index.ts";
import { useShell } from "../shell/ShellContext";

export function CostAssumptionControl() {
  const { loadedHourlyRate, planCost, setLoadedHourlyRate } = useShell();
  return (
    <div className="whatif-control" aria-label="Loaded hourly rate assumption" role="group">
      <span className="eyebrow">You set this · an assumption, not a measured rate</span>
      <label htmlFor="loaded-hourly-rate">
        Assumed fully loaded cost of one outreach staff-hour
      </label>
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
          {formatRate(loadedHourlyRate, planCost.currency)}
        </output>
      </div>
      <p id="loaded-rate-basis">
        Wages, payroll taxes, benefits, field supervision, and vehicle cost, as your organization
        budgets them. This project does not measure, publish, or derive this rate; the starting
        value is a placeholder your finance lead must replace before any figure below is shown to a
        decision-maker. It leaves out client assistance funds, capital, and organization-wide
        indirect administration. Moving this slider changes every cost figure and no plan.
      </p>
    </div>
  );
}

export function PlanCostSummary() {
  const { floorCostLine, guardEnabled, plan, planCost } = useShell();
  if (!plan?.feasible || floorCostLine === null) return null;
  return (
    <div className="intervention-banner" role="status">
      <div>
        <strong>{floorCostLine}</strong>{" "}
        {guardEnabled
          ? `That is ${planCost.floor.hours} hours moved plan-wide by the guaranteed minimum, priced at your assumed ${formatRate(planCost.rate, planCost.currency)}.`
          : `The minimum is switched off in this comparison view, so it moves nothing and costs nothing.`}{" "}
        The whole plan of {planCost.totalHours} staff-hours costs{" "}
        {formatCurrency(planCost.totalCost, planCost.currency)} at that same assumed rate. The rate
        is an operator-set assumption, not a measured or published figure, and it enters no
        allocation: the same plan is produced at every rate. Costs are stated per staff-hour, per
        area, and per plan only — never per person, per contact, or per anyone covered.
        <details className="data-table-disclosure">
          <summary>Cost by neighborhood, at the assumed rate</summary>
          <div className="table-scroll">
            <table>
              <caption>
                Assumed cost of the planned staff-hours. Hours × the assumed rate, nothing else.
              </caption>
              <thead>
                <tr>
                  <th>Neighborhood</th>
                  <th>Planned hours</th>
                  <th>Assumed cost</th>
                </tr>
              </thead>
              <tbody>
                {planCost.byArea.map((row) => (
                  <tr key={row.areaId}>
                    <th>{row.label}</th>
                    <td>{row.hours}h</td>
                    <td>{formatCurrency(row.cost, planCost.currency)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Whole plan</th>
                  <td>{planCost.totalHours}h</td>
                  <td>{formatCurrency(planCost.totalCost, planCost.currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
