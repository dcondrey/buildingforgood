// @vitest-environment jsdom
/**
 * Contracted staffing is context, and the danger is that it stops being that.
 *
 * The source ledger is explicit that a contracted shift requirement is not
 * observed fielded staffing and must never become a forecast feature or an
 * allocation weight. The figure also covers a different program from the plan
 * on this page. So the thing worth testing is not that the number renders — it
 * is that nothing divides it into the plan, and that the page says so.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App.tsx";
import { CONTRACTED_CAPACITY } from "../../data/capacityContext";

function panel(): HTMLElement | null {
  return document.getElementById("capacity-context");
}

async function open() {
  render(<App />);
  await screen.findByText("Offline demo snapshot");
}

describe("the contracted-capacity context", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network disabled"))),
    );
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", "/");
  });

  it("states the contracted requirement", async () => {
    await open();
    expect(panel()).toBeTruthy();
    expect(panel()?.textContent).toContain(String(CONTRACTED_CAPACITY.outreachStaffPerDay));
  });

  it("says it is neither a target nor an input, beside the figure", async () => {
    await open();
    expect(panel()?.textContent).toMatch(/not a target and not an input/i);
    expect(panel()?.textContent).toMatch(/different program/i);
  });

  it("quotes the contract rather than paraphrasing it", async () => {
    await open();
    for (const quote of CONTRACTED_CAPACITY.quotes) {
      expect(panel()?.textContent).toContain(quote.slice(0, 40));
    }
  });

  it("does not divide contracted staffing into the plan", async () => {
    // The category error this panel exists to avoid. Contracted staff-days and
    // planned staff-hours describe different programs; a ratio between them
    // would read as coverage and mean nothing. If a percentage ever appears in
    // this panel, someone has done the arithmetic the source forbids.
    await open();
    expect(panel()?.textContent ?? "").not.toMatch(/\d+\s?%/);
  });
});
