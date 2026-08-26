import { useState } from "react";

import { AREA_MAP_GEOMETRY } from "./areaGeometry";
import type { DemoData } from "../../lib/demo";
import { useTranslation } from "../../i18n/context";

const VIEW_W = 160;
const VIEW_H = 150;

/**
 * A schematic map of the deployment's areas.
 *
 * Keyboard reach deliberately does not depend on `tabindex` on an SVG `<g>`:
 * WebKit has long-standing gaps there, so a `<g role="button" tabIndex={0}>`
 * is reachable in Chromium and Firefox and may not be in Safari. The SVG only
 * paints. A layer of real HTML `<button>` elements, positioned over each
 * area's label, carries the accessible name, the pressed state, and every
 * keyboard interaction; pointer events fall through it to the polygon so a
 * mouse user still clicks the shape they see.
 *
 * The outlines are a derived illustration and the caption says so: the source
 * geometry carries no pinned checksum and the organization profile marks
 * `geography.boundaries` unresolved (PHASE0_FINDINGS F-8).
 */
export function AreaMap({
  areas,
  ariaLabel,
  valueFor,
  selectedId,
  onSelect,
}: {
  areas: DemoData["areas"];
  ariaLabel: string;
  valueFor: (area: DemoData["areas"][number]) => {
    text: string;
    tone: "up" | "down" | "neutral" | "missing";
    intensity?: number;
  };
  selectedId?: string | null;
  onSelect?: (areaId: string) => void;
}) {
  const { t } = useTranslation();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  if (!areas.every((area) => AREA_MAP_GEOMETRY[area.id])) {
    return (
      <div aria-label={ariaLabel} className="area-map" role="img">
        {areas.map((area) => {
          const value = valueFor(area);
          return (
            <div className="area-cell" key={area.id}>
              <span>{area.name}</span>
              <strong
                className={
                  value.tone === "up"
                    ? "delta-up"
                    : value.tone === "down"
                      ? "delta-down"
                      : value.tone === "missing"
                        ? "delta-missing"
                        : ""
                }
              >
                {value.text}
              </strong>
            </div>
          );
        })}
      </div>
    );
  }
  const interactive = typeof onSelect === "function";
  return (
    <div
      aria-label={interactive ? ariaLabel : undefined}
      className="area-map-frame"
      role={interactive ? "group" : undefined}
    >
      {/* The plot keeps the width its labels were drawn for and scrolls inside
          this box rather than shrinking below legibility, so it is a scroll
          region and needs a tab stop — a region only a mouse can scroll is A-2
          in the audit. The caption stays outside it and reflows normally. */}
      <div aria-label={t("map.scrollRegion")} className="area-map-plot" role="region" tabIndex={0}>
        <svg
          aria-hidden={interactive ? true : undefined}
          aria-label={interactive ? undefined : ariaLabel}
          className={`area-map-svg ${interactive ? "area-map-interactive" : ""}`}
          focusable="false"
          role={interactive ? undefined : "img"}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        >
          {!interactive && <title>{ariaLabel}</title>}
          {areas.map((area) => {
            const cell = AREA_MAP_GEOMETRY[area.id];
            const value = valueFor(area);
            const selected = selectedId === area.id;
            return (
              <g
                className={`map-area map-${value.tone} ${selected ? "map-selected" : ""} ${
                  focusedId === area.id ? "map-focused" : ""
                }`}
                key={area.id}
                onClick={interactive ? () => onSelect(area.id) : undefined}
              >
                <path
                  d={cell.outline}
                  style={
                    value.intensity === undefined || value.tone === "missing"
                      ? undefined
                      : { fillOpacity: 0.08 + Math.min(1, Math.max(0, value.intensity)) * 0.34 }
                  }
                />
                <text className="map-name" textAnchor="middle" x={cell.label.x} y={cell.label.y}>
                  {area.name}
                </text>
                <text
                  className="map-value"
                  textAnchor="middle"
                  x={cell.label.x}
                  y={cell.label.y + 13}
                >
                  {value.text}
                </text>
                <title>{t("map.areaValue", { area: area.name, value: value.text })}</title>
              </g>
            );
          })}
          <text
            className="map-edge"
            textAnchor="middle"
            transform="rotate(-42 22 122)"
            x="22"
            y="122"
          >
            {t("map.bay")}
          </text>
          <text
            className="map-edge"
            textAnchor="middle"
            transform="rotate(90 155 100)"
            x="155"
            y="100"
          >
            {t("map.freeway")}
          </text>
        </svg>
        {interactive && (
          <div className="area-map-controls">
            {areas.map((area) => {
              const cell = AREA_MAP_GEOMETRY[area.id];
              const value = valueFor(area);
              return (
                <button
                  aria-pressed={selectedId === area.id}
                  className="area-map-control"
                  key={area.id}
                  onBlur={() => setFocusedId((current) => (current === area.id ? null : current))}
                  onClick={() => onSelect(area.id)}
                  onFocus={() => setFocusedId(area.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(area.id);
                    }
                  }}
                  style={{
                    left: `${(cell.label.x / VIEW_W) * 100}%`,
                    top: `${((cell.label.y + 4.5) / VIEW_H) * 100}%`,
                  }}
                  type="button"
                >
                  <span className="sr-only">
                    {t("map.areaValue", { area: area.name, value: value.text })}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="area-map-provenance">{t("map.provenance")}</p>
    </div>
  );
}
