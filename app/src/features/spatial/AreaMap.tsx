import { AREA_MAP_GEOMETRY } from "./areaGeometry";
import type { DemoData } from "../../lib/demo";

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
    <svg
      aria-label={ariaLabel}
      className={`area-map-svg ${interactive ? "area-map-interactive" : ""}`}
      role={interactive ? "group" : "img"}
      viewBox="0 0 160 150"
    >
      <title>{ariaLabel}</title>
      {areas.map((area) => {
        const cell = AREA_MAP_GEOMETRY[area.id];
        const value = valueFor(area);
        const selected = selectedId === area.id;
        return (
          <g
            aria-label={interactive ? `${area.name}: ${value.text}` : undefined}
            aria-pressed={interactive ? selected : undefined}
            className={`map-area map-${value.tone} ${selected ? "map-selected" : ""}`}
            key={area.id}
            onClick={interactive ? () => onSelect(area.id) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(area.id);
                    }
                  }
                : undefined
            }
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
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
            <text className="map-value" textAnchor="middle" x={cell.label.x} y={cell.label.y + 13}>
              {value.text}
            </text>
            <title>{`${area.name}: ${value.text}`}</title>
          </g>
        );
      })}
      <text className="map-edge" textAnchor="middle" transform="rotate(-42 22 122)" x="22" y="122">
        San Diego Bay
      </text>
      <text className="map-edge" textAnchor="middle" transform="rotate(90 155 100)" x="155" y="100">
        I-5
      </text>
    </svg>
  );
}
