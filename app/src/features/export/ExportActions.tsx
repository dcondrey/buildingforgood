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
import "./handoff.css";

export function ExportActions() {
  const { budget, coverageFloor, guardEnabled, planExportRows, planReady } = useShell();
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
    setStatus(
      printed
        ? "Print dialog opened. Choose Save as PDF to keep the plan, its reasons, and the brief in one file."
        : "This browser blocked printing. Use the spreadsheet, or copy the decision brief instead.",
    );
    window.addEventListener("afterprint", finish);
    const timer = window.setTimeout(finish, 2000);
    return () => {
      window.removeEventListener("afterprint", finish);
      window.clearTimeout(timer);
    };
  }, [printing]);

  function saveCsv() {
    const csv = buildPlanCsv(planExportRows, { budget, coverageFloor, guardEnabled });
    const saved = downloadTextFile(exportFilename("plan", budget, "csv"), "text/csv", csv);
    setStatus(
      saved
        ? "Spreadsheet saved. Every row carries the reason for its hours and the limits of this plan."
        : "This browser blocked the download. Use Print, or copy the decision brief instead.",
    );
  }

  return (
    <div className="handoff">
      <div>
        <span className="eyebrow">Take it with you</span>
        <p>
          The spreadsheet and the printed plan both carry the reason for every hour, word for word.
          The shift sheet is the pocket version: neighborhoods, hours, reasons, and what this is
          not.
        </p>
      </div>
      <div className="handoff-actions">
        <button
          className="button button-quiet"
          disabled={!planReady}
          onClick={saveCsv}
          type="button"
        >
          Download spreadsheet (CSV)
        </button>
        <button
          className="button button-quiet"
          disabled={!planReady || printing}
          onClick={() => setPrinting(true)}
          type="button"
        >
          Print plan / save as PDF
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
