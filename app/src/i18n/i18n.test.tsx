// @vitest-environment jsdom
/**
 * What a second language has to be true for.
 *
 * Not "does the string change" — that is obvious from reading the catalogue.
 * These are the four things that go wrong quietly:
 *
 * 1. **A message loses a number in translation.** Placeholder parity is
 *    checked per key, because a Spanish sentence missing `{floor}` reads
 *    fluently and states nothing.
 * 2. **A sentence gets assembled from pieces.** Plural forms are selected,
 *    never suffixed, and the check is that both locales actually change shape.
 * 3. **A duplicated formatter drifts.** Three strings in this app exist in
 *    both a domain module and the catalogue; they are pinned equal at `en`.
 * 4. **Numbers get "translated".** `es-US` must format identically to
 *    `en-US`, so switching language never re-renders a figure a reader is
 *    checking against the artifact.
 *
 * Completeness of the key set, and the refusal scan over every locale, live
 * in `src/refusals.test.ts` next to the rules they defend.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App.tsx";
import { DIGITIZATION_AGREEMENT, DIGITIZATION_AUDIT } from "../data/digitizationAudit";
import { floorCostSentence, formatCurrency } from "../domain/cost/index.ts";
import type { PlanCost } from "../domain/cost/index.ts";
import { PLAN_DISCLOSURE_LINE } from "../features/export/disclosure";
import { allocateHours } from "../lib/planner.ts";
import { EMBEDDED_DEMO } from "../lib/demo.ts";
import { formatMoney, formatNumber } from "../lib/format";
import { createTranslator } from "./context";
import { LOCALES, type Locale } from "./locale";
import { placeWords } from "./places";
import { planMessage, planReason } from "./plannerText";
import { CATALOGUES, translate } from "./translate";

const t = (locale: Locale) => createTranslator(locale, () => undefined).t;

const PLACEHOLDER = /\{(\w+)\}/g;

function holes(message: string): string[] {
  return [...message.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "").sort();
}

describe("the catalogue carries every number into every language", () => {
  for (const locale of LOCALES.filter((one) => one !== "en")) {
    it(`keeps the placeholders of every English message in ${locale}`, () => {
      const mismatched: string[] = [];
      for (const [key, english] of Object.entries(CATALOGUES.en)) {
        const translated = CATALOGUES[locale][key as keyof (typeof CATALOGUES)["en"]];
        const expected = holes(english);
        const actual = holes(translated);
        // A translation may drop a place-noun form it does not need, but it
        // may never drop a value: anything that is not a place word has to
        // survive, or the sentence states a number it no longer shows.
        const lost = expected.filter(
          (name) =>
            !actual.includes(name) &&
            !["areaNoun", "areaNounPlural", "countWord", "countedAreas", "count"].includes(name),
        );
        if (lost.length > 0) mismatched.push(`${key}: lost ${lost.join(", ")}`);
      }
      expect(mismatched).toEqual([]);
    });
  }

  it("never emits an unresolved placeholder for a message it was given values for", () => {
    // Every message in every catalogue, not one sample key: an unresolved
    // hole reads as `{hours}` on screen and there is nothing in the type
    // system that stops one being introduced.
    const unresolved: string[] = [];
    for (const locale of LOCALES) {
      const catalogue = CATALOGUES[locale] as Record<string, string>;
      for (const [key, message] of Object.entries(catalogue)) {
        const params: Record<string, string | number> = {};
        for (const name of holes(message)) {
          params[name] = name === "count" || name === "countedAreas" ? 4 : `<${name}>`;
        }
        const rendered = translate(locale, key as keyof (typeof CATALOGUES)["en"], params);
        if (new RegExp(PLACEHOLDER.source).test(rendered)) {
          unresolved.push(`${locale}/${key}: ${rendered}`);
        }
      }
    }
    expect(unresolved).toEqual([]);

    for (const locale of LOCALES) {
      const rendered = translate(locale, "planner.title", { hours: 80 });
      expect(rendered, locale).toContain("80");
    }
  });
});

describe("plurals are selected, never suffixed", () => {
  for (const locale of LOCALES) {
    it(`changes the shape of a counted message in ${locale}`, () => {
      const one = translate(locale, "state.locks", { count: 1 });
      const many = translate(locale, "state.locks", { count: 4 });
      expect(one, locale).not.toBe(many);
      expect(one).toContain("1");
      expect(many).toContain("4");
      // Both forms are authored keys the locale selects between; nothing in
      // the code appends a letter to make the plural.
      const catalogue = CATALOGUES[locale] as Record<string, string | undefined>;
      expect(catalogue["state.locks.one"], locale).toBeDefined();
      expect(catalogue["state.locks.other"], locale).toBeDefined();
      expect(catalogue["state.locks"], locale).toBeUndefined();
    });
  }
});

describe("numerals are formatted, never translated", () => {
  it("writes the same digits, grouping, and decimal point in every locale", () => {
    for (const locale of LOCALES) {
      expect(formatNumber(1234.56, 1, locale), locale).toBe("1,234.6");
      expect(formatMoney(45, "USD", locale), locale).toBe("$45");
    }
  });
});

describe("the display formatters reproduce the domain's, exactly, at en", () => {
  it("prices money the same way", () => {
    for (const value of [0, 45, 1234, 98765]) {
      expect(formatMoney(value, "USD", "en")).toBe(formatCurrency(value, "USD"));
    }
  });

  it("writes the same equity-floor sentence", () => {
    const base: PlanCost = {
      rate: 45,
      currency: "USD",
      byArea: [],
      totalHours: 80,
      totalCost: 3600,
      floor: {
        hours: 12,
        cost: 540,
        topLoadAreaId: "east_village",
        topLoadAreaLabel: "East Village",
        topLoadAreaHours: 9,
      },
    };
    const english = t("en");
    expect(
      english("cost.floorSentenceHours", {
        money: formatMoney(base.floor.cost, base.currency, "en"),
        hours: base.floor.topLoadAreaHours,
        area: base.floor.topLoadAreaLabel ?? "",
      }),
    ).toBe(floorCostSentence(base));

    const noHours: PlanCost = { ...base, floor: { ...base.floor, hours: 0, cost: 0 } };
    expect(
      english("cost.floorSentenceNoHours", {
        money: formatMoney(0, "USD", "en"),
        area: "East Village",
      }),
    ).toBe(floorCostSentence(noHours));
  });

  it("keeps the one export disclosure line identical to its constant", () => {
    expect(CATALOGUES.en["export.disclosureLine"]).toBe(PLAN_DISCLOSURE_LINE);
  });

  it("keeps the digitization boundary cards identical to their data module", () => {
    expect(CATALOGUES.en["digit.auditBoundary"]).toBe(DIGITIZATION_AUDIT.boundary);
    expect(CATALOGUES.en["digit.agreementBoundary"]).toBe(DIGITIZATION_AGREEMENT.boundary);
  });
});

describe("the planner's own sentences are translated where they are shown", () => {
  const places = (locale: Locale) => placeWords(t(locale), "neighborhood", 6);

  it("reproduces the planner's English sentence unchanged at en", () => {
    const plan = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    expect(plan.feasible).toBe(true);
    expect(planMessage(t("en"), places("en"), plan.message)).toBe(plan.message);
  });

  it("carries the planner's numbers into Spanish without restating them", () => {
    const plan = allocateHours(EMBEDDED_DEMO.areas, 80, 8, true);
    const spanish = planMessage(t("es"), places("es"), plan.message);
    expect(spanish).not.toBe(plan.message);
    expect(spanish).toContain("6");
    expect(spanish).toContain("8");
    expect(spanish).toContain("barrios");
  });

  it("translates an infeasible message and its numbers", () => {
    const plan = allocateHours(EMBEDDED_DEMO.areas, 40, 8, true);
    expect(plan.feasible).toBe(false);
    const spanish = planMessage(t("es"), places("es"), plan.message);
    expect(spanish).toContain("48");
    expect(spanish).toContain("40");
    expect(spanish).not.toContain("No feasible plan");
  });

  it("translates the artifact's own reason sentence, keeping its hours", () => {
    const reason = EMBEDDED_DEMO.areas[0]?.reason ?? "";
    expect(planReason(t("en"), reason)).toBe(reason);
    expect(planReason(t("es"), reason)).toContain("8");
    expect(planReason(t("es"), reason)).not.toBe(reason);
  });

  it("passes through a sentence it does not recognise rather than guessing", () => {
    const unknown = "Some future planner sentence nobody has written a rule for.";
    expect(planMessage(t("es"), places("es"), unknown)).toBe(unknown);
    expect(planReason(t("es"), unknown)).toBe(unknown);
  });
});

describe("choosing a language in the running shell", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network disabled"))),
    );
    Element.prototype.scrollIntoView = () => undefined;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.documentElement.lang = "en";
  });

  it("switches the interface, sets the document language, and remembers it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Offline demo snapshot", {}, { timeout: 10000 });
    expect(document.documentElement.lang).toBe("en");

    await user.click(screen.getByRole("button", { name: "Español" }));

    expect(document.documentElement.lang).toBe("es");
    expect(localStorage.getItem("stillhere-locale")).toBe("es");
    expect(screen.getByText("Instantánea de demostración sin conexión")).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 2, name: "Poner a prueba la caída" }),
    ).toBeDefined();
    expect(screen.getByLabelText("Horas de personal disponibles")).toBeDefined();
    // The numbers on screen are the same numbers, not re-rounded or re-grouped.
    expect(await screen.findByText(/80\/80 horas asignadas\./)).toBeDefined();
    expect(screen.queryByText("Offline demo snapshot")).toBeNull();

    // A fresh mount reads the stored preference back.
    cleanup();
    render(<App />);
    await screen.findByText("Instantánea de demostración sin conexión", {}, { timeout: 10000 });
    expect(document.documentElement.lang).toBe("es");
  }, 30000);

  it("translates the decision brief a coordinator pastes into an email", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText("Offline demo snapshot", {}, { timeout: 10000 });
    await user.click(screen.getByRole("button", { name: "Español" }));
    await user.click(screen.getByRole("button", { name: "Copiar el resumen de decisión" }));

    // jsdom exposes no clipboard, so the shell takes its documented fallback
    // and renders the whole brief for manual copying. That is the same text.
    const preview = await screen.findByText(/RESUMEN DE DECISIÓN/);
    const brief = preview.textContent ?? "";
    expect(brief).toContain("RESUMEN DE DECISIÓN");
    expect(brief).toContain("Límite de privacidad y de autorización");
    expect(brief).not.toMatch(/Review triggers|Privacy and authorization/);
    // Every displayed number still traces to the artifact.
    expect(brief).toContain("80 horas de personal");
    expect(brief).toContain("261");
  }, 30000);
});
