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

import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import "./handoff.css";

export function PrintablePlan() {
  const { budget, coverageFloor, data, decisionBrief, guardEnabled, planExportRows, planTotal } =
    useShell();
  const { t, date } = useTranslation();
  return createPortal(
    <div aria-hidden="true" className="plan-print-doc">
      <h1>{t("print.title")}</h1>
      <p className="plan-print-meta">
        {t(guardEnabled ? "print.metaFloor" : "print.metaNoFloor", {
          budget,
          floor: coverageFloor,
          allocated: planTotal,
        })}
      </p>
      <p className="plan-print-meta">
        {t("print.source", {
          label: data.source.label,
          artifact: data.source.artifact,
          date: date(data.source.retrievedAt),
        })}
      </p>
      <p className="plan-print-disclosure">{t("export.disclosureLine")}</p>
      <table>
        <caption>{t("print.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("print.thNeighborhood")}</th>
            <th scope="col">{t("print.thPlannedHours")}</th>
            <th scope="col">{t("print.thWhy")}</th>
            <th scope="col">{t("print.thSetByPerson")}</th>
            <th scope="col">{t("print.thMovedByMinimum")}</th>
          </tr>
        </thead>
        <tbody>
          {planExportRows.map((row) => (
            <tr key={row.areaId}>
              <th scope="row">{row.areaName}</th>
              <td>{t("map.hoursValue", { hours: row.hours })}</td>
              <td>{row.reason}</td>
              <td>{row.locked ? t("print.yes") : t("print.no")}</td>
              <td>{t("map.hoursValue", { hours: row.unmetHours })}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{t("print.allNeighborhoods")}</th>
            <td>{t("map.hoursValue", { hours: planTotal })}</td>
            <td>{t("print.totalReason", { budget })}</td>
            <td>{t("print.no")}</td>
            <td>
              {t("map.hoursValue", {
                hours: planExportRows.reduce((sum, row) => sum + row.unmetHours, 0),
              })}
            </td>
          </tr>
        </tbody>
      </table>
      <h2>{t("print.briefHeading")}</h2>
      <pre className="plan-print-brief">{decisionBrief}</pre>
    </div>,
    document.body,
  );
}
