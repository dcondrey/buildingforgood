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
import { useShell } from "../shell/ShellContext";
import { useTranslation } from "../../i18n/context";
import { INTL_LOCALE, type Locale } from "../../i18n/locale";
import "./shift-sheet.css";

function today(locale: Locale): string {
  return new Date().toLocaleDateString(INTL_LOCALE[locale], {
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
  const { t, locale, number, date } = useTranslation();
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
            {t("sheet.close")}
          </button>
          <button
            className="is-primary"
            onClick={() => printWithBodyClass("shift-sheet-open")}
            type="button"
          >
            {t("sheet.print")}
          </button>
        </div>

        <h2 id="shift-sheet-title">{t("sheet.title")}</h2>
        <p className="shift-sheet-meta">
          <span>{today(locale)}</span>
          <span>
            {t(guardEnabled ? "sheet.metaFloor" : "sheet.metaNoFloor", {
              budget,
              floor: coverageFloor,
            })}
          </span>
          <span className="quiet">{t("sheet.draftNote")}</span>
        </p>

        <ul className="shift-sheet-areas">
          {planExportRows.map((row) => {
            const belowFloor = guardEnabled && row.hours < coverageFloor;
            return (
              <li className="shift-sheet-area" key={row.areaId}>
                <div className="shift-sheet-area-head">
                  <span className="shift-sheet-area-name">{row.areaName}</span>
                  <span className="shift-sheet-hours">
                    {t("sheet.hours", { hours: row.hours })}
                  </span>
                </div>
                <p className="shift-sheet-why">
                  <b>{t("sheet.whyLabel")}</b> {row.reason}
                </p>
                <div className="shift-sheet-tags">
                  {row.locked && (
                    <span className="shift-sheet-tag is-strong">{t("sheet.setByPerson")}</span>
                  )}
                  {guardEnabled && (
                    <span className={`shift-sheet-tag ${belowFloor ? "is-strong" : ""}`}>
                      {belowFloor
                        ? t("sheet.belowMinimum")
                        : t("sheet.minimumMet", { floor: coverageFloor })}
                    </span>
                  )}
                  {row.unmetHours > 0 && (
                    <span className="shift-sheet-tag">
                      {t("sheet.movedAway", { hours: row.unmetHours })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="shift-sheet-total">
          <span>{t("sheet.allNeighborhoods")}</span>
          <span>{t("sheet.total", { allocated: planTotal, budget })}</span>
        </p>

        {intervention && interventionResult && assumedArea && (
          <p className="shift-sheet-disclosure">
            {t("sheet.assumption", {
              area: assumedArea,
              pct: number(intervention.share * 100),
            })}
          </p>
        )}

        <p className="shift-sheet-disclosure">{t("export.disclosureLine")}</p>

        <p className="shift-sheet-source">
          {t("sheet.source", {
            label: data.source.label,
            artifact: data.source.artifact,
            date: date(data.source.retrievedAt),
          })}
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function ShiftSheetLauncher() {
  const { planReady } = useShell();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="button button-quiet"
        disabled={!planReady}
        onClick={() => setOpen(true)}
        type="button"
      >
        {t("sheet.open")}
      </button>
      {open && <ShiftSheet onClose={() => setOpen(false)} />}
    </>
  );
}
