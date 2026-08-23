import type { ReactNode } from "react";
import type { DemoData } from "../../lib/demo";

// Keyboard- and screen-reader-accessible equivalent for each schematic map.
// The SVG is exposed as a single labelled image, so per-area values need a
// real table; state words carry the meaning without relying on color.
export function AreaDetailPanel({
  area,
  kicker,
  rows,
  note,
  empty,
}: {
  area: DemoData["areas"][number] | null;
  kicker: string;
  rows: Array<{ label: string; value: string; hint?: string; flagged?: boolean }>;
  note?: ReactNode;
  empty: string;
}) {
  return (
    <aside aria-live="polite" className="map-detail">
      {area === null ? (
        <p className="map-detail-empty">{empty}</p>
      ) : (
        <>
          <span className="map-detail-kicker">{kicker}</span>
          <h5>{area.name}</h5>
          <dl>
            {rows.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd className={row.flagged ? "map-detail-flag" : undefined}>
                  {row.value}
                  {row.hint ? <small>{row.hint}</small> : null}
                </dd>
              </div>
            ))}
          </dl>
          {note ? <p className="map-detail-note">{note}</p> : null}
        </>
      )}
    </aside>
  );
}
