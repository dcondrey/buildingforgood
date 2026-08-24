// Does the "a guard reading only English stops guarding" lesson hold everywhere?
import { describe, expect, it } from "vitest";
import { assertNoPersonDenominator } from "../../app/src/domain/cost/cost";
import { assertNoComplaintSignal } from "../../app/src/domain/planner/planner";
import { assertShareable } from "../../app/src/features/share/planShareState";
import { validateActuals } from "../../app/src/domain/actuals/actuals";

const probe = (fn: (v: unknown, w: string) => void, v: unknown) => {
  try { fn(v, "x"); return "ACCEPTED"; } catch { return "REFUSED"; }
};
const shareArea = (id: string) => {
  try {
    assertShareable({ budget: 8, floor: 8, guard: true, locks: [[id, 8]], share: 0, assume: null,
      rate: 45, geography: "downtown-sd-dsdp-six-area/2026-08-21" });
    return "ACCEPTED";
  } catch { return "REFUSED"; }
};

describe("SPANISH GUARDS", () => {
  it("G1 person-denominator guard, key and value", () => {
    const rows: Array<[string, unknown]> = [
      ["EN key  cost_per_person", { cost_per_person: 1 }],
      ["EN key  cost_per_sleeper", { cost_per_sleeper: 1 }],
      ["ES key  coste_por_persona", { coste_por_persona: 1 }],
      ["ES key  costo_por_contacto", { costo_por_contacto: 1 }],
      ["ES key  costePorPersona", { costePorPersona: 1 }],
      ["EN val  'per person served'", { label: "cost per person served", v: 1 }],
      ["ES val  'por persona atendida'", { label: "coste por persona atendida", v: 1 }],
    ];
    for (const [l, v] of rows) console.log(`G1 ${l.padEnd(34)} ${probe(assertNoPersonDenominator, v)}`);
    expect(probe(assertNoPersonDenominator, { cost_per_person: 1 })).toBe("REFUSED");
  });

  it("G2 complaint guard on the planner", () => {
    for (const [l, v] of [
      ["EN complaint_count", { complaint_count: 1 }],
      ["EN 311_calls", { "311_calls": 1 }],
      ["ES quejas_recibidas", { quejas_recibidas: 1 }],
      ["ES denuncias", { denuncias: 1 }],
      ["ES reportes_recibidos", { reportes_recibidos: 1 }],
      ["ES linea_de_atencion", { linea_de_atencion: 1 }],
    ] as Array<[string, unknown]>) console.log(`G2 ${l.padEnd(34)} ${probe(assertNoComplaintSignal, v)}`);
  });

  it("G3 share-link area ids", () => {
    for (const id of ["complaint_ward", "hotline_zone", "quejas_centro", "denuncias_norte",
                      "reportes_recibidos_sur", "linea_de_atencion_este"])
      console.log(`G3 area id ${id.padEnd(28)} ${shareArea(id)}`);
  });

  it("G4 actuals free text and keys", () => {
    const base = () => JSON.parse(JSON.stringify(DOC));
    const cases: Array<[string, (d: Record<string, any>) => void]> = [
      ["EN key complaint_counts", (d) => { d.complaint_counts = []; }],
      ["ES key quejas_por_area", (d) => { d.quejas_por_area = []; }],
      ["EN label 'reports received'", (d) => { d.engagement_measure.label = "Reports received"; }],
      ["ES label 'quejas recibidas'", (d) => { d.engagement_measure.label = "Quejas recibidas"; }],
      ["ES definition 'denuncias'", (d) => { d.engagement_measure.definition = "Conteo de denuncias por area."; }],
    ];
    for (const [l, mut] of cases) {
      const d = base(); mut(d);
      const errs = validateActuals(d).errors;
      console.log(`G4 ${l.padEnd(34)} ${errs.length ? "REFUSED" : "ACCEPTED"}`);
    }
  });
});

const DOC: Record<string, any> = {
  schema_version: "actuals/v1", profile_id: "san-diego-downtown",
  geography_version: "downtown-sd-dsdp-six-area/2026-08-21",
  reporting: { organization_name: "X", reported_by_role: "Program Manager",
    method_note: "Shift logs.", last_updated: "2026-08-01" },
  engagement_measure: { kind: "contacts", label: "Street contacts",
    definition: "A conversation initiated by an outreach worker.",
    collection_method: "Shift log tally.", counts_encounters_not_people: true,
    unique_persons_measure: false },
  contract: { grain: "area_month_aggregate", count_fields: ["engagement.count"],
    small_cell_threshold: 5, suppression_marker: { field: "suppressed", affirmative_values: [true] } },
  area_months: [{ area_id: "east_village", month: "2026-07",
    hours: { allocated_hours: 40, delivered_hours: 38 }, engagement: { count: 61, suppressed: false } }],
  intended_analysis: { status: "documented_not_implemented",
    preconditions: ["six months"], planned_when_data_exists: ["planned vs delivered"],
    will_never_compute: [], rationale: "Out of scope." },
};
