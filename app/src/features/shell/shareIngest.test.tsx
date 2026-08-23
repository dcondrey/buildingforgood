// @vitest-environment jsdom
/**
 * What happens to a shared link the app will not read.
 *
 * The failure being pinned: every refusal used to be swallowed into `null`,
 * which the ingest site treated the same way it treated "there was no link".
 * A recipient whose link was mangled in transit was shown a fully rendered,
 * plausible default plan with nothing to tell them it was not the sender's.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App.tsx";

const GEO = "dsdp-core-six/2026-08-21";
const INTACT = `?v=1&budget=120&floor=8&guard=on&locks=&share=40&assume=&rate=45&geography=${GEO}`;

function openWith(search: string) {
  window.history.replaceState({}, "", `/${search}`);
  render(<App />);
  return screen.findByText("Offline demo snapshot", {}, { timeout: 10000 });
}

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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("a shared link the shell refuses", () => {
  it("applies an intact link without a notice", async () => {
    await openWith(INTACT);
    expect(await screen.findByText(/120\/120 hours allocated\./)).toBeDefined();
    expect(screen.queryByLabelText("Shared link")).toBeNull();
  });

  it("says nothing when there is no link at all", async () => {
    await openWith("");
    expect(await screen.findByText(/80\/80 hours allocated\./)).toBeDefined();
    expect(screen.queryByLabelText("Shared link")).toBeNull();
  });

  it("names the field and disowns the plan when the link was mangled", async () => {
    // The likeliest mangling: a rich-text mail composer entity-escapes every
    // separator, so only the first parameter survives as itself.
    await openWith(INTACT.replaceAll("&", "&amp;"));
    const notice = await screen.findByLabelText("Shared link");
    expect(notice.textContent).toContain("This link could not be read");
    expect(notice.textContent).toContain("budget");
    expect(notice.textContent).toContain("You are looking at the default plan");
    // And the default plan is what is actually on screen.
    expect(await screen.findByText(/80\/80 hours allocated\./)).toBeDefined();
  });

  it("refuses a link built against another organization's area list", async () => {
    await openWith(INTACT.replace(GEO, "coldwater-valley-illustrative/2026-08-23"));
    const notice = await screen.findByLabelText("Shared link");
    expect(notice.textContent).toContain("built against a different list of areas");
    expect(notice.textContent).toContain("coldwater-valley-illustrative/2026-08-23");
    expect(await screen.findByText(/80\/80 hours allocated\./)).toBeDefined();
  });

  it("refuses each realistic mangling rather than substituting a value", async () => {
    const withLocks = INTACT.replace("locks=", "locks=east_village:16");
    const mangled = [
      // Truncated at a line wrap, and truncated mid-locks.
      INTACT.slice(0, INTACT.indexOf("&rate")),
      withLocks.slice(0, withLocks.indexOf(":16")),
      // A sentence's trailing period, and a quoted reply's angle bracket.
      `${INTACT}.`,
      `${INTACT}>`,
      // A value emptied in transit, and a unicode non-breaking hyphen.
      INTACT.replace("rate=45", "rate="),
      withLocks.replace("east_village", "east\u2011village"),
    ];
    for (const search of mangled) {
      await openWith(search);
      const notice = await screen.findByLabelText("Shared link");
      expect(notice.textContent, search).toContain("You are looking at the default plan");
      cleanup();
    }
  });
});
