/**
 * The shift sheet: the plan as a thing you carry.
 *
 * Everything else in this product is built for a room with a projector. This
 * is built for the sidewalk — a coordinator on a phone in daylight, or a
 * printed page folded into a jacket. It shows four things and no more:
 * which neighborhoods, how many hours each, the artifact's own "why this
 * amount" sentence for each, and the one line that says what the sheet is
 * not. The reason strings are printed verbatim; they are the disclosure that
 * makes an hour count reviewable, and a shortened one is a different claim.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { printWithBodyClass } from "../export/clientFile";
import { PLAN_DISCLOSURE_LINE } from "../export/disclosure";
import { useShell } from "../shell/ShellContext";
import { formatDate, formatNumber } from "../../lib/format";
import "./shift-sheet.css";

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  });
}

export function ShiftSheet({ onClose }: { onClose: () => void }) {
  const {
    budget,
    coverageFloor,
    data,
    guardEnabled,
    intervention,
    interventionResult,
    planExportRows,
    planTotal,
  } = useShell();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("shift-sheet-open");
    panel.current?.focus();
    return () => document.body.classList.remove("shift-sheet-open");
  }, []);

  const assumedArea = intervention
    ? (data.areas.find((area) => area.id === intervention.areaId)?.name ?? intervention.areaId)
    : null;

  return createPortal(
    <div
      aria-labelledby="shift-sheet-title"
      aria-modal="true"
      className="shift-sheet-overlay"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      ref={panel}
      role="dialog"
      tabIndex={-1}
    >
      <div className="shift-sheet">
        <div className="shift-sheet-bar">
          <button onClick={onClose} type="button">
            Close
          </button>
          <button
            className="is-primary"
            onClick={() => printWithBodyClass("shift-sheet-open")}
            type="button"
          >
            Print / save as PDF
          </button>
        </div>

        <h2 id="shift-sheet-title">Shift sheet</h2>
        <p className="shift-sheet-meta">
          <span>{today()}</span>
          <span>
            {budget} staff-hours ·{" "}
            {guardEnabled
              ? `${coverageFloor}h guaranteed minimum per neighborhood`
              : "no guaranteed minimum — comparison view"}
          </span>
          <span className="quiet">Draft for coordinator review. Nobody is dispatched by it.</span>
        </p>

        <ul className="shift-sheet-areas">
          {planExportRows.map((row) => {
            const belowFloor = guardEnabled && row.hours < coverageFloor;
            return (
              <li className="shift-sheet-area" key={row.areaId}>
                <div className="shift-sheet-area-head">
                  <span className="shift-sheet-area-name">{row.areaName}</span>
                  <span className="shift-sheet-hours">{row.hours} h</span>
                </div>
                <p className="shift-sheet-why">
                  <b>Why this amount:</b> {row.reason}
                </p>
                <div className="shift-sheet-tags">
                  {row.locked && <span className="shift-sheet-tag is-strong">Set by a person</span>}
                  {guardEnabled && (
                    <span className={`shift-sheet-tag ${belowFloor ? "is-strong" : ""}`}>
                      {belowFloor ? "Below the minimum" : `${coverageFloor}h minimum met`}
                    </span>
                  )}
                  {row.unmetHours > 0 && (
                    <span className="shift-sheet-tag">
                      {row.unmetHours}h moved away by the minimum
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="shift-sheet-total">
          <span>All neighborhoods</span>
          <span>
            {planTotal} / {budget} h
          </span>
        </p>

        {intervention && interventionResult && assumedArea && (
          <p className="shift-sheet-disclosure">
            These hours include an assumption you stated: {assumedArea} modeled as cleared, with{" "}
            {formatNumber(intervention.share * 100)}% of its planning load assumed to shift to
            adjacent areas. Assumed, not observed.
          </p>
        )}

        <p className="shift-sheet-disclosure">{PLAN_DISCLOSURE_LINE}</p>

        <p className="shift-sheet-source">
          {data.source.label} · {data.source.artifact} · source data through{" "}
          {formatDate(data.source.retrievedAt)}. Aggregate place-level evidence only: no block
          records, no block-level geometry, no person-level data.
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function ShiftSheetLauncher() {
  const { planReady } = useShell();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="button button-quiet"
        disabled={!planReady}
        onClick={() => setOpen(true)}
        type="button"
      >
        Open shift sheet
      </button>
      {open && <ShiftSheet onClose={() => setOpen(false)} />}
    </>
  );
}
