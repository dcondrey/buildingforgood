/**
 * The plan as a printed document.
 *
 * PDF is produced by `window.print()` against `src/print.css`, not by a
 * bundled PDF library. Three reasons, in order: this app ships no backend and
 * no CDN, and a PDF engine is the largest dependency it would have ever
 * taken; the print stylesheet that would style the document already exists
 * and is already maintained; and every browser's print dialog already offers
 * "Save as PDF", including offline. What a library would add is control over
 * pagination, which is not worth a megabyte of runtime here.
 *
 * The document is assembled in the DOM and revealed only under
 * `body.printing-plan`, so the saved file is the same every time no matter
 * where the page is scrolled or which view is open.
 */

import { createPortal } from "react-dom";

import { PLAN_DISCLOSURE_LINE } from "./disclosure";
import { useShell } from "../shell/ShellContext";
import { formatDate } from "../../lib/format";
import "./handoff.css";

export function PrintablePlan() {
  const { budget, coverageFloor, data, decisionBrief, guardEnabled, planExportRows, planTotal } =
    useShell();
  return createPortal(
    <div aria-hidden="true" className="plan-print-doc">
      <h1>Still Here SD · coverage plan</h1>
      <p className="plan-print-meta">
        {budget} staff-hours ·{" "}
        {guardEnabled
          ? `${coverageFloor}h guaranteed minimum per neighborhood`
          : "no guaranteed minimum — comparison view"}{" "}
        · {planTotal} of {budget} hours allocated
      </p>
      <p className="plan-print-meta">
        {data.source.label} · {data.source.artifact} · source data through{" "}
        {formatDate(data.source.retrievedAt)}.
      </p>
      <p className="plan-print-disclosure">{PLAN_DISCLOSURE_LINE}</p>
      <table>
        <caption>Planned staff-hours by neighborhood, with the reason for each amount.</caption>
        <thead>
          <tr>
            <th scope="col">Neighborhood</th>
            <th scope="col">Planned staff-hours</th>
            <th scope="col">Why this amount</th>
            <th scope="col">Set by a person</th>
            <th scope="col">Hours moved away by the minimum</th>
          </tr>
        </thead>
        <tbody>
          {planExportRows.map((row) => (
            <tr key={row.areaId}>
              <th scope="row">{row.areaName}</th>
              <td>{row.hours}h</td>
              <td>{row.reason}</td>
              <td>{row.locked ? "yes" : "no"}</td>
              <td>{row.unmetHours}h</td>
            </tr>
          ))}
          <tr>
            <th scope="row">All neighborhoods</th>
            <td>{planTotal}h</td>
            <td>sum of the rows above, against the {budget} staff-hours you set</td>
            <td>no</td>
            <td>{planExportRows.reduce((sum, row) => sum + row.unmetHours, 0)}h</td>
          </tr>
        </tbody>
      </table>
      <h2>Decision brief</h2>
      <pre className="plan-print-brief">{decisionBrief}</pre>
    </div>,
    document.body,
  );
}
