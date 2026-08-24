// @vitest-environment jsdom
/**
 * The three currency states, and the one framing that must not slip.
 *
 * The badge has to distinguish current, stale, and "this artifact says
 * nothing" — the third being the state the shipped offline snapshot is
 * actually in. And the observed-but-excluded rows have to read as excluded
 * observations rather than as a forecast, a correction, or fresher data,
 * because that misreading is worse than not shipping them at all.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { adaptDemoV1, EMBEDDED_DEMO, type DemoData } from "../../lib/demo";
import { ShellProvider, type Shell } from "../shell/ShellContext";
import { CurrencyBadge } from "./CurrencyBadge";
import { CurrencyPanel } from "./CurrencyPanel";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const ARTIFACT = JSON.parse(
  readFileSync(join(REPO, "public/generated/demo.v1.json"), "utf8"),
) as Record<string, unknown>;
// The pipeline's own committed output is the source for the currency shape,
// so this test cannot drift from what the refresh actually writes.
const REFRESHED = JSON.parse(
  readFileSync(join(REPO, "tests/pipeline/fixtures/refresh/expected/demo.v1.json"), "utf8"),
) as Record<string, unknown>;

function withCurrency(currency: unknown): DemoData {
  const adapted = adaptDemoV1({ ...ARTIFACT, currency });
  if (!adapted) throw new Error("the artifact under test no longer adapts");
  return adapted;
}

function mount(data: DemoData, node: React.ReactNode) {
  render(<ShellProvider value={{ data } as unknown as Shell}>{node}</ShellProvider>);
}

afterEach(cleanup);

describe("the currency badge", () => {
  // `status` is elapsed months against the threshold the artifact states, and
  // nothing else (`build_currency` in refresh.py). The badge used to render it
  // as "publication overdue" / "publication on cadence" — statements about a
  // publisher whose own block says it schedules nothing. Both sides now name
  // the threshold, which is the only thing the boolean knows.
  it("distinguishes the two threshold states without claiming a publication schedule", () => {
    const stale = withCurrency(REFRESHED.currency);
    expect(stale.currency?.status).toBe("stale");
    mount(stale, <CurrencyBadge />);
    const badge = screen.getByText(/Data through/);
    expect(badge.textContent).toContain("past the freshness threshold");
    expect(badge.textContent).not.toContain("publication");
    expect(badge.className).toContain("currency-stale");
    cleanup();

    const current = withCurrency({
      ...(REFRESHED.currency as Record<string, unknown>),
      status: "current",
      is_stale: false,
    });
    mount(current, <CurrencyBadge />);
    const fresh = screen.getByText(/Data through/);
    expect(fresh.textContent).toContain("within the freshness threshold");
    expect(fresh.textContent).not.toContain("publication");
    expect(fresh.className).toContain("currency-current");
  });

  it("says currency is unknown rather than inferring one", () => {
    // The property is that an artifact WITHOUT a currency key degrades rather
    // than crashing or guessing. An earlier version asserted this against the
    // shipped artifact, which happened to lack the key at the time; that made
    // the test fail the moment the refresh added one, without anything being
    // wrong. Build the absence explicitly instead.
    const { currency: _omitted, ...withoutCurrency } = ARTIFACT as Record<string, unknown>;
    expect(adaptDemoV1(withoutCurrency)?.currency).toBeNull();
    mount({ ...EMBEDDED_DEMO, currency: null }, <CurrencyBadge />);
    expect(screen.getByText(/Currency unknown/)).toBeDefined();
  });

  it("degrades a malformed or partial currency block to unknown", () => {
    for (const broken of [null, {}, { status: "fresh" }, { status: "stale" }, "stale", 7]) {
      expect(withCurrency(broken).currency).toBeNull();
    }
  });
});

describe("a stale artifact that the publisher has not overtaken", () => {
  // The state this deployment is actually in: every source the project pins
  // is the newest one the publisher has released, and the modelled window is
  // still months behind the calendar. The failure to guard against is a
  // surface that shows those numbers with nothing said about when the next
  // one is due, or that dresses this project's own refresh cadence up as a
  // publisher commitment.
  it("names the expected publication and refuses to call it a publisher promise", () => {
    const data = withCurrency(REFRESHED.currency);
    const next = data.currency?.nextPublication;
    expect(next?.month).toBe("Sep 2026");
    expect(next?.scheduled).toBe(false);

    mount(data, <CurrencyPanel />);
    const line = screen.getByText(/Next refresh expected/);
    expect(line.textContent).toContain("Sep 2026");
    expect(line.textContent).toContain("not a publisher commitment");
  });

  // A badge that is accurate and inert still leaves a program director
  // guessing. This is the half that makes it actionable, and the last clause
  // is a claim with a guard behind it rather than a reassurance.
  it("tells a reader what to do while the publisher is late, and not to force it", () => {
    mount(withCurrency(REFRESHED.currency), <CurrencyPanel />);
    // The lead-in is bold, so match the paragraph rather than the <b> inside it.
    const guidance = screen.getByText(/What to do meanwhile/).closest("p");
    expect(guidance?.textContent).toMatch(/Keep planning from this window/);
    expect(guidance?.textContent).toMatch(/refuses that/);
  });

  it("says nothing about a next publication when the artifact names none", () => {
    const { next_publication_expected: _dropped, ...rest } = REFRESHED.currency as Record<
      string,
      unknown
    >;
    const data = withCurrency(rest);
    expect(data.currency?.nextPublication).toBeNull();
    mount(data, <CurrencyPanel />);
    expect(screen.queryByText(/Next refresh expected/)).toBeNull();
  });
});

describe("the observed-but-not-model-eligible rows", () => {
  it("frames them as excluded observations, never as newer data", () => {
    mount(withCurrency(REFRESHED.currency), <CurrencyPanel />);
    const guard = screen.getByText(/These are excluded observations/);
    expect(guard.textContent).toContain("not a forecast");
    expect(guard.textContent).toContain("not a correction");
    expect(guard.textContent).toContain("not newer data that supersedes the replay above");
    expect(guard.textContent).toContain("multiplier-adjusted");
    expect(guard.textContent).toContain("cadence broke");
  });

  it("renders the artifact's own exclusion reason rather than a rewrite of it", () => {
    const data = withCurrency(REFRESHED.currency);
    const excluded = data.currency?.excluded;
    expect(excluded?.grounds).toHaveLength(5);
    mount(data, <CurrencyPanel />);
    expect(screen.getByText(excluded?.summary ?? "")).toBeDefined();
    for (const ground of excluded?.grounds ?? []) {
      expect(screen.getByText(ground)).toBeDefined();
    }
    expect(screen.getByText(new RegExp(excluded?.promotionRule.slice(0, 40) ?? ""))).toBeDefined();
  });

  it("keeps the frozen replay labelled as the permanent methods exhibit", () => {
    mount(withCurrency(REFRESHED.currency), <CurrencyPanel />);
    expect(screen.getByText(/The January 2026 replay stays frozen, permanently\./)).toBeDefined();
    expect(screen.getByText(/methods exhibit/)).toBeDefined();
  });

  it("shows every row as excluded, and drops any row claiming model eligibility", () => {
    const lane = (REFRESHED.currency as Record<string, Record<string, unknown>>)
      .observed_not_model_eligible;
    const rows = lane.rows as Array<Record<string, unknown>>;
    const smuggled = {
      ...(REFRESHED.currency as Record<string, unknown>),
      observed_not_model_eligible: {
        ...lane,
        rows: [...rows, { ...rows[0], model_eligible: true, geography: "Smuggled Area" }],
      },
    };
    const data = withCurrency(smuggled);
    expect(data.currency?.excluded?.rows).toHaveLength(rows.length);
    mount(data, <CurrencyPanel />);
    expect(screen.queryByText("Smuggled Area")).toBeNull();
    expect(screen.getAllByText("Excluded")).toHaveLength(rows.length);
  });
});
