// @vitest-environment jsdom
/**
 * The loop, rendered.
 *
 * A header bug in this repository was found by rendering and missed by
 * reading, so the assertions here are on the DOM a person would actually see:
 * the empty state before anything is loaded, the two columns and the plan's
 * error after a file goes in, and the three things that must never appear as a
 * zero — a withheld count, a month with no plan, and an area that reported
 * nothing.
 *
 * The complaint-signal check is the one test in this file that is an
 * enforcement mechanism rather than evidence. An ingest path is how a
 * forbidden field would arrive, and it is checked in both shipped languages
 * because an English-only guard on an import path is a defect this project has
 * already paid for once.
 */

import axe from "axe-core";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BASELINE_WILL_NEVER_COMPUTE, NOT_SCORABLE_FROM_ACTUALS } from "../../domain/actuals";
import { ingestParsedActuals } from "../../domain/actuals";
import { REFUSED_CORPUS } from "../../domain/vocabulary/refusedTerms";
import { LocaleProvider } from "../../i18n/context";
import { type Locale } from "../../i18n/locale";
import { loadDeployment } from "../shell/deployment";
import { ShellProvider, type Shell } from "../shell/ShellContext";
import { ActualsSection } from "./ActualsSection";
import { ActualsPanel } from "./ActualsPanel";
import { CATALOGUES } from "../../i18n/translate.ts";
import { ACTUALS_STORE_KEY } from "./actualsStore";

const DEPLOYMENT = loadDeployment("san-diego-downtown");

// This jsdom environment ships no localStorage, and the store treats that as
// "nothing held" via try/catch. A stub is needed to check that the held copy
// is text that gets re-validated rather than a parsed document handed back.
let store: Map<string, string>;

beforeEach(() => {
  store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Test-only actuals, and obviously so: the shape is the worked example in
 * `docs/project/ACTUALS.md`, the area ids come from the reference profile's
 * own area list, and nothing here is presented anywhere as a measurement.
 */
function fixture(): Record<string, unknown> {
  return {
    schema_version: "actuals/v1",
    profile_id: "san-diego-downtown",
    geography_version: "dsdp-core-six/2026-08-21",
    reporting: {
      organization_name: "Example Outreach Collaborative",
      reported_by_role: "Outreach Program Manager",
      method_note: "Shift leads tally at end of shift; hours come from the scheduling roster.",
      last_updated: "2026-08-01",
    },
    engagement_measure: {
      kind: "contacts",
      label: "street contacts",
      definition: "One conversation with one person on one shift, however brief.",
      collection_method: "Paper tally sheet, entered weekly.",
      counts_encounters_not_people: true,
      unique_persons_measure: false,
    },
    contract: {
      grain: "area_month_aggregate",
      count_fields: ["engagement.count"],
      small_cell_threshold: 5,
      suppression_marker: { field: "suppressed", affirmative_values: [true] },
    },
    area_months: [
      {
        area_id: "east_village",
        month: "2026-06",
        hours: { allocated_hours: 24, delivered_hours: 21.5 },
        engagement: { count: 63, suppressed: false },
      },
      {
        area_id: "gaslamp",
        month: "2026-06",
        hours: { allocated_hours: 8, delivered_hours: 8 },
        engagement: { count: null, suppressed: true },
      },
      {
        area_id: "cortez",
        month: "2026-06",
        hours: { allocated_hours: null, delivered_hours: 6 },
        engagement: { count: null, suppressed: false, not_recorded: true },
      },
    ],
    intended_analysis: {
      status: "documented_not_implemented",
      preconditions: [
        "At least twelve area-months of delivered hours across at least three areas.",
      ],
      planned_when_data_exists: ["Descriptive planned-versus-delivered hours by area and month."],
      will_never_compute: [...BASELINE_WILL_NEVER_COMPUTE],
      rationale: "These numbers describe delivery, not people, and cannot carry the other weight.",
    },
  };
}

function panel(locale: Locale = "en") {
  return render(
    <LocaleProvider value={{ locale, setLocale: () => undefined }}>
      <ActualsPanel
        areaIds={DEPLOYMENT.areaIds}
        areaLabels={DEPLOYMENT.areaLabels}
        organizationName={DEPLOYMENT.organizationName}
        profileId={DEPLOYMENT.profileId}
      />
    </LocaleProvider>,
  );
}

async function upload(body: unknown = fixture(), locale: Locale = "en"): Promise<void> {
  const file = new File([JSON.stringify(body)], "actuals.json", { type: "application/json" });
  await userEvent.upload(
    screen.getByLabelText(CATALOGUES[locale]["actuals.compare.loadLabel"]),
    file,
  );
}

function row(areaLabel: string): HTMLElement {
  return screen.getByRole("row", { name: new RegExp(`^${areaLabel}\\b`) });
}

describe("before any actuals exist", () => {
  it("says what it needs instead of rendering a table of zeros", () => {
    panel();
    expect(screen.getByText("No actuals recorded yet")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("0")).toBeNull();
  });
});

describe("with last month's hours loaded", () => {
  it("shows the plan, what was delivered, and the plan's own error", async () => {
    panel();
    await upload();

    expect(screen.queryByText("No actuals recorded yet")).toBeNull();
    const table = screen.getByRole("table");
    expect(within(table).getByText(/Planned hours/)).toBeTruthy();
    expect(within(table).getByText(/Delivered hours/)).toBeTruthy();

    const eastVillage = row("East Village");
    expect(within(eastVillage).getByText("24")).toBeTruthy();
    expect(within(eastVillage).getByText("21.5")).toBeTruthy();
    // 24 planned, 21.5 delivered: the plan was 2.5 hours out, in this area.
    expect(within(eastVillage).getByText("2.5 h under plan")).toBeTruthy();

    expect(within(row("Gaslamp")).getByText("On plan")).toBeTruthy();
  });

  it("renders a withheld count as withheld, a missing plan as unresolved, and an absent area as absent", async () => {
    panel();
    await upload();

    expect(within(row("Gaslamp")).getByText(/Withheld/)).toBeTruthy();
    expect(within(row("Cortez")).getByText("No plan recorded")).toBeTruthy();
    expect(within(row("Cortez")).getByText(/Unresolved/)).toBeTruthy();
    expect(within(row("Cortez")).getByText("Not recorded")).toBeTruthy();

    // Three of the six in-scope areas reported nothing for this month. They
    // are named as absent, and they get no row: a row would have to hold a
    // number, and the honest number is that there is not one.
    const absent = document.querySelector('[data-state="actuals-absent"]');
    expect(absent?.textContent).toContain("City Center");
    expect(absent?.textContent).toContain("Marina");
    expect(absent?.textContent).toContain("unknown, not zero");
    expect(screen.queryByRole("row", { name: /^City Center/ })).toBeNull();
  });

  it("publishes no total row", async () => {
    panel();
    await upload();
    const table = screen.getByRole("table");
    expect(within(table).queryByRole("row", { name: /total/i })).toBeNull();
    expect(table.querySelector("tfoot")).toBeNull();
    expect(screen.getByText(/Why there is no total/)).toBeTruthy();
  });

  it("keeps every declared limitation on the screen, one line each", async () => {
    panel();
    await upload();
    const list = document.querySelector('[data-state="actuals-not-scorable"]');
    expect(list).toBeTruthy();
    const entries = [...(list?.querySelectorAll("li") ?? [])].map((item) =>
      item.getAttribute("data-entry"),
    );
    // Emptying `NOT_SCORABLE_FROM_ACTUALS` to make the loop look closed takes
    // the disclosure off the screen, and this is where that shows up.
    expect(entries.sort()).toEqual(Object.keys(NOT_SCORABLE_FROM_ACTUALS).sort());
    expect(entries.length).toBeGreaterThan(0);
    expect(list?.textContent).toContain("not a score of the published forecast");
  });

  it("reads the file in the browser and re-validates what it stored", async () => {
    panel();
    await upload();
    const stored = store.get(ACTUALS_STORE_KEY);
    expect(stored).toBeTruthy();
    // The text, not the parsed document: a hand-edited entry takes the same
    // door a hand-edited file does.
    expect(JSON.parse(stored ?? "{}").text).toContain("east_village");

    cleanup();
    panel();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("clears back to the honest empty state", async () => {
    panel();
    await upload();
    await userEvent.click(screen.getByRole("button", { name: "Remove these actuals" }));
    expect(screen.getByText("No actuals recorded yet")).toBeTruthy();
    expect(store.get(ACTUALS_STORE_KEY)).toBeUndefined();
  });
});

describe("the ingest path refuses a complaint signal, in every language", () => {
  it("refuses a complaint-shaped field on a row, and loads nothing", async () => {
    panel();
    const body = fixture();
    const rows = body.area_months as Array<Record<string, unknown>>;
    rows[0].complaint_count = 42;
    await upload(body);

    expect(screen.queryByRole("table")).toBeNull();
    const refused = screen.getByRole("alert");
    expect(refused.textContent).toContain("This file was refused");
    expect(screen.getByText("No actuals recorded yet")).toBeTruthy();
    expect(store.get(ACTUALS_STORE_KEY)).toBeUndefined();
  });

  for (const locale of Object.keys(REFUSED_CORPUS) as Array<keyof typeof REFUSED_CORPUS>) {
    for (const key of REFUSED_CORPUS[locale].complaintKeys) {
      it(`refuses \`${key}\` (${locale}) wherever it sits in the file`, () => {
        // Nested, because the first version of the planner's own guard checked
        // only an object's own keys. Every level of an actuals file is walked.
        const body = fixture();
        (body.area_months as Array<Record<string, unknown>>)[0].engagement = {
          count: 63,
          suppressed: false,
          diagnostics: { [key]: 7 },
        };
        const result = ingestParsedActuals(body, {
          expectedProfileId: DEPLOYMENT.profileId,
          knownAreaIds: DEPLOYMENT.areaIds,
        });
        expect(result.ok, key).toBe(false);
        expect(result.document).toBeNull();
        expect(result.refusedForComplaintSignal, key).toBe(true);
      });
    }
  }

  it("refuses a measure defined as report volume, in Spanish as well as English", () => {
    for (const definition of [
      "One count of complaints received from residents each month.",
      "Un conteo de las quejas recibidas de los vecinos cada mes.",
    ]) {
      const body = fixture();
      (body.engagement_measure as Record<string, unknown>).definition = definition;
      const result = ingestParsedActuals(body, { expectedProfileId: DEPLOYMENT.profileId });
      expect(result.ok, definition).toBe(false);
      expect(
        result.errors.some((issue) => issue.field === "engagement_measure.definition"),
        definition,
      ).toBe(true);
    }
  });

  it("still accepts an honest file that says nothing of the kind", () => {
    const result = ingestParsedActuals(fixture(), {
      expectedProfileId: DEPLOYMENT.profileId,
      knownAreaIds: DEPLOYMENT.areaIds,
    });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("the plan-against-delivered screen in Spanish", () => {
  it("renders the Spanish screen, not the English one with Spanish gaps", async () => {
    panel("es");
    await upload(fixture(), "es");
    expect(screen.getByText("El plan frente a lo entregado")).toBeTruthy();
    expect(within(row("Gaslamp")).getByText("Igual al plan")).toBeTruthy();
    expect(within(row("Cortez")).getByText(/Sin resolver/)).toBeTruthy();
    // Numbers are formatted, never translated: the figure a reader checks
    // against the file does not change when the language does.
    expect(within(row("East Village")).getByText("21.5")).toBeTruthy();
  });
});

describe("the section the shell mounts", () => {
  /**
   * The panel is verified above on its own props. This renders the wrapper the
   * shell will actually mount, through the real context, so the wiring the
   * lead applies to `App.tsx` is a mount point and not a debugging session.
   */
  function shell(): Shell {
    return { deployment: DEPLOYMENT, locale: "en", setLocale: () => undefined } as unknown as Shell;
  }

  it("reads its geography from the deployment on the shell", () => {
    render(
      <ShellProvider value={shell()}>
        <ActualsSection />
      </ShellProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "The plan against what was delivered" }),
    ).toBeTruthy();
    expect(screen.getByText("No actuals recorded yet")).toBeTruthy();
  });

  it("has no automated accessibility violations, empty or loaded", async () => {
    const { container } = render(
      <ShellProvider value={shell()}>
        <ActualsSection />
      </ShellProvider>,
    );
    const violations = async () => {
      const results = await axe.run(container, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
    };
    expect(await violations()).toEqual([]);
    await upload();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(await violations()).toEqual([]);
  }, 30000);
});
