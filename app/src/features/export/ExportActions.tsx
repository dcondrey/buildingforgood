/**
 * Where the plan leaves the room: a link a colleague can open, a spreadsheet,
 * a printable plan, and the shift sheet.
 *
 * All four are produced in the browser. Nothing is uploaded, no service is
 * called, and the link carries only the fields on the allowlist in
 * `features/share/planShareState.ts`.
 */

import { useEffect, useState } from "react";

import { PrintablePlan } from "./PrintablePlan";
import { buildPlanCsv } from "./planCsv";
import { downloadTextFile, exportFilename, printWithBodyClass } from "./clientFile";
import { ShiftSheetLauncher } from "../shiftsheet/ShiftSheet";
import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import { planCsvText } from "./planCsv";
import "./handoff.css";

export function ExportActions() {
  const { budget, coverageFloor, guardEnabled, planExportRows, planReady } = useShell();
  const { t } = useTranslation();
  const [status, setStatus] = useState("");
  // The printed document exists only while it is being printed, so the rest
  // of the time it is not a second copy of the plan sitting in the page.
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const finish = () => setPrinting(false);
    const printed = printWithBodyClass("printing-plan");
    // The print dialog is the external system; this reports what it did.
    // oxlint-disable-next-line react/set-state-in-effect
    setStatus(printed ? t("export.printOpened") : t("export.printBlocked"));
    window.addEventListener("afterprint", finish);
    const timer = window.setTimeout(finish, 2000);
    return () => {
      window.removeEventListener("afterprint", finish);
      window.clearTimeout(timer);
    };
  }, [printing, t]);

  function saveCsv() {
    const csv = buildPlanCsv(
      planExportRows,
      { budget, coverageFloor, guardEnabled },
      planCsvText(t),
    );
    const saved = downloadTextFile(exportFilename("plan", budget, "csv"), "text/csv", csv);
    setStatus(saved ? t("export.csvSaved") : t("export.csvBlocked"));
  }

  return (
    <div className="handoff">
      <div>
        <span className="eyebrow">{t("export.eyebrow")}</span>
        <p>{t("export.lede")}</p>
      </div>
      <div className="handoff-actions">
        <button
          className="button button-quiet"
          disabled={!planReady}
          onClick={saveCsv}
          type="button"
        >
          {t("export.csv")}
        </button>
        <button
          className="button button-quiet"
          disabled={!planReady || printing}
          onClick={() => setPrinting(true)}
          type="button"
        >
          {t("export.print")}
        </button>
        <ShiftSheetLauncher />
      </div>
      {status && (
        <p className="handoff-status" role="status">
          {status}
        </p>
      )}
      {printing && <PrintablePlan />}
    </div>
  );
}
