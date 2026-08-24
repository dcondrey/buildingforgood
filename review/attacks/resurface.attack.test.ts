// 3.2 — the contractor returns. Five surfaces that did not exist when the
// refusal guards were written.
import { describe, expect, it } from "vitest";
import { validateActuals } from "../../app/src/domain/actuals/actuals";
import { validateOrganizationProfile } from "../../app/src/domain/config/profile";
import { summarizePlanCost, assertNoPersonDenominator } from "../../app/src/domain/cost/cost";
import { encodePlanShare, type PlanShareState } from "../../app/src/features/share/planShareState";
import sd from "../../config/profiles/san-diego-downtown.v1.json";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const report = (label: string, errs: Array<{ field: string; message: string }>) =>
  console.log(`${label.padEnd(56)} ${errs.length === 0 ? "ACCEPTED — no error" : `REFUSED (${errs[0].field}: ${errs[0].message.slice(0, 48)})`}`);

describe("RESURFACE: complaint volume through the new inbound paths", () => {
  it("A1 actuals — honestly named", () => {
    const doc = clone(ACTUALS());
    (doc as Record<string, unknown>).complaint_counts = [];
    report("A1 actuals: extra key `complaint_counts`", validateActuals(doc).errors);
  });

  it("A2 actuals — complaint volume as the engagement count, labelled honestly", () => {
    const doc = clone(ACTUALS());
    doc.engagement_measure.label = "311 complaints received";
    doc.engagement_measure.definition = "Count of 311 encampment complaints closed in the month.";
    doc.engagement_measure.collection_method = "Get It Done export, filtered to Encampment.";
    doc.area_months.forEach((m: Record<string, Record<string, unknown>>, i: number) => {
      m.engagement.count = [4120, 980, 2600][i % 3];
    });
    const r = validateActuals(doc);
    report("A2 actuals: complaint volume AS engagement.count (labelled)", r.errors);
    console.log(`A2 warnings: ${r.warnings.length}${r.warnings.length ? " -> " + r.warnings[0].message.slice(0, 60) : ""}`);
  });

  it("A3 actuals — same, with the label sanitised", () => {
    const doc = clone(ACTUALS());
    doc.engagement_measure.label = "Reports received from residents";
    doc.engagement_measure.definition = "Resident-initiated reports about encampments, per area-month.";
    doc.area_months.forEach((m: Record<string, Record<string, unknown>>, i: number) => {
      m.engagement.count = [4120, 980, 2600][i % 3];
    });
    report("A3 actuals: complaint volume, euphemised label", validateActuals(doc).errors);
  });

  it("A4 actuals — the coordinate guard outside San Diego", () => {
    const sdCoord = clone(ACTUALS());
    sdCoord.area_months[0].note = "Team staged near 32.7157, -117.1611.";
    report("A4 actuals: San Diego coordinates in a note", validateActuals(sdCoord).errors);
    const elsewhere = clone(ACTUALS());
    elsewhere.area_months[0].note = "Team staged near 44.0582, -121.3153.";
    report("A4 actuals: Oregon coordinates in a note", validateActuals(elsewhere).errors);
    const numeric = clone(ACTUALS());
    (numeric.area_months[0] as Record<string, unknown>).hours = { allocated_hours: null, delivered_hours: 44.0582 };
    report("A4 actuals: Oregon latitude as a numeric value", validateActuals(numeric).errors);
  });

  it("B1 config profile — complaint weighting via a permitted field", () => {
    const p = clone(sd) as Record<string, Record<string, unknown>>;
    (p.operations as Record<string, unknown>).complaint_weighting = 0.5;
    report("B1 profile: extra key `complaint_weighting`", validateOrganizationProfile(p).errors);
    const p2 = clone(sd) as Record<string, Record<string, Record<string, unknown>>>;
    p2.organization.scope_statement = "Prioritise areas by 311 complaint volume.";
    report("B1 profile: complaint intent in scope_statement text", validateOrganizationProfile(p2).errors);
  });

  it("C1 cost — a person denominator through the new value paths", () => {
    const summary = summarizePlanCost({
      areas: [{ id: "a", label: "A", planningLoad: 1 }],
      hoursByArea: new Map([["a", 10]]), unmetHoursByArea: new Map(), rate: 45,
    });
    let out = "ACCEPTED";
    try { assertNoPersonDenominator({ label: "Coste por persona atendida", value: 3.2 }, "x"); }
    catch (e) { out = `REFUSED: ${(e as Error).message.slice(0, 46)}`; }
    console.log(`C1 cost: Spanish 'per person' in a VALUE            ${out}`);
    let out2 = "ACCEPTED";
    try { assertNoPersonDenominator({ coste_por_persona: 3.2 }, "x"); }
    catch (e) { out2 = `REFUSED: ${(e as Error).message.slice(0, 46)}`; }
    console.log(`C1 cost: Spanish 'per person' as a KEY              ${out2}`);
    expect(summary.totalCost).toBe(450);
  });

  it("D1 share link — complaint payload in a permitted field", () => {
    const base: PlanShareState = {
      budget: 120, floor: 8, guard: true, locks: [["east_village", 40]],
      share: 0.25, assume: "gaslamp", rate: 62.5,
      geography: "downtown-sd-dsdp-six-area/2026-08-21",
    };
    for (const [label, st] of [
      ["area id reading as complaints", { ...base, locks: [["complaint_ward", 40]] as Array<[string, number]> }],
      ["Spanish complaint area id", { ...base, locks: [["quejas_centro", 40]] as Array<[string, number]> }],
      ["rate carrying a per-person figure", { ...base, rate: 3.28 }],
    ] as Array<[string, PlanShareState]>) {
      let out = "ACCEPTED";
      try { encodePlanShare(st); } catch (e) { out = `REFUSED: ${(e as Error).message.slice(0, 46)}`; }
      console.log(`D1 share: ${label.padEnd(38)} ${out}`);
    }
  });
});

function ACTUALS() {
  return {
    schema_version: "actuals/v1",
    profile_id: "san-diego-downtown",
    geography_version: (sd as Record<string, Record<string, Record<string, unknown>>>).geography.area_list.version,
    reporting: {
      organization_name: "Example Outreach", reported_by_role: "Program Manager",
      method_note: "Compiled from shift logs each month.", last_updated: "2026-08-01",
    },
    engagement_measure: {
      kind: "contacts", label: "Street contacts",
      definition: "A conversation initiated by an outreach worker.",
      collection_method: "Shift log tally.",
      counts_encounters_not_people: true, unique_persons_measure: false,
    },
    contract: {
      grain: "area_month_aggregate", count_fields: ["engagement.count"],
      small_cell_threshold: 5, suppression_marker: { field: "suppressed", affirmative_values: [true] },
    },
    area_months: [
      { area_id: "east_village", month: "2026-07", hours: { allocated_hours: 40, delivered_hours: 38 }, engagement: { count: 61, suppressed: false } },
      { area_id: "gaslamp", month: "2026-07", hours: { allocated_hours: 12, delivered_hours: 12 }, engagement: { count: 14, suppressed: false } },
      { area_id: "cortez", month: "2026-07", hours: { allocated_hours: 8, delivered_hours: 9 }, engagement: { count: 7, suppressed: false } },
    ],
    intended_analysis: {
      status: "documented_not_implemented",
      preconditions: ["at least six months of actuals"],
      planned_when_data_exists: ["planned versus delivered hours by area"],
      will_never_compute: [
        "per_person_or_household_outcome_tracking", "service_eligibility_or_entitlement_determination",
        "enforcement_abatement_or_removal_prioritization", "staff_or_team_performance_ranking",
        "causal_attribution_of_area_change_to_delivered_hours", "complaint_or_311_derived_demand_estimates",
        "individual_level_reidentification_of_any_kind",
      ],
      rationale: "These are out of scope permanently.",
    },
  } as Record<string, any>;
}
