// Post-fix probing beyond the vectors either of us has already run.
import { describe, expect, it } from "vitest";
import { assertNoPersonDenominator } from "../../app/src/domain/cost/cost";
import { assertNoComplaintSignal } from "../../app/src/domain/planner/planner";
import { assertShareable } from "../../app/src/features/share/planShareState";

const probe = (fn: (v: unknown, w: string) => void, v: unknown) => {
  try { fn(v, "x"); return "accepted"; } catch { return "REFUSED"; }
};
const shareArea = (id: string) => {
  try {
    assertShareable({ budget: 8, floor: 8, guard: true, locks: [[id, 8]], share: 0, assume: null,
      rate: 45, geography: "downtown-sd-dsdp-six-area/2026-08-21" });
    return "accepted";
  } catch { return "REFUSED"; }
};

describe("VOCAB FOLLOWUP", () => {
  it("H1 false positives must still pass (over-refusal is a bug too)", () => {
    const legit: Array<[string, unknown]> = [
      ["cost_per_hour", { cost_per_hour: 45 }],
      ["coste_por_hora", { coste_por_hora: 45 }],
      ["costPerArea", { costPerArea: 45 }],
      ["cost_per_plan", { cost_per_plan: 45 }],
      ["cost_per_shift", { cost_per_shift: 45 }],
      ["porcentaje (contains 'por')", { porcentaje: 45 }],
      ["supervisor (contains 'per')", { supervisor_hours: 4 }],
      ["hyperlink", { hyperlink: "x" }],
      ["temperature", { temperature: 20 }],
      ["personnel_hours (person-ish, not a denominator)", { personnel_hours: 4 }],
      ["operational_notes", { operational_notes: "per our discussion" }],
    ];
    const over = legit.filter(([, v]) => probe(assertNoPersonDenominator, v) === "REFUSED");
    for (const [l, v] of legit) console.log(`H1 ${l.padEnd(44)} ${probe(assertNoPersonDenominator, v)}`);
    console.log(`H1 over-refusals: ${over.length}`);
    expect(over.length).toBe(0);
  });

  it("H2 complaint vocabulary: accent, case, and third-language variants", () => {
    const rows = ["quejas", "QUEJAS_RECIBIDAS", "Quejas_Recibidas", "quejasRecibidas",
      "denúncias", "línea_de_atención", "reclamos", "reclamaciones", "plaintes",
      "beschwerden", "queixas", "llamadas_311", "avisos_ciudadanos"];
    for (const k of rows) console.log(`H2 ${k.padEnd(24)} ${probe(assertNoComplaintSignal, { [k]: 1 })}`);
  });

  it("H3 person denominators: accents and third language", () => {
    const rows = ["coste_por_persona", "coste_por_día", "costo_por_atendido",
      "coste_por_usuario", "cout_par_personne", "kosten_pro_person",
      "custo_por_pessoa", "cost_per_head"];
    for (const k of rows) console.log(`H3 ${k.padEnd(24)} ${probe(assertNoPersonDenominator, { [k]: 1 })}`);
  });

  it("H4 share-link area ids, accented", () => {
    for (const id of ["quejas_centro", "denuncias_norte", "reclamos_sur", "avisos_este"])
      console.log(`H4 ${id.padEnd(20)} ${shareArea(id)}`);
  });

  it("H5 prose values in both languages", () => {
    const rows = ["cost per person served", "coste por persona atendida",
      "costo por contacto realizado", "gasto por usuario",
      "per-person cost", "por persona", "cost per hour worked"];
    for (const s of rows) console.log(`H5 "${s}"`.padEnd(40) + ` ${probe(assertNoPersonDenominator, { label: s })}`);
  });
});
