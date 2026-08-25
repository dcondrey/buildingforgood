// @vitest-environment jsdom
/**
 * The corroboration has to reach a reader.
 *
 * `data/monitoring/source_agreement.json` was committed before this surface
 * existed, which meant the strongest evidence in the repository — two
 * independent digitizations of the same maps agreeing to about a percent —
 * lived in a file no adopter would ever open. These assertions are about it
 * being on the page and being framed as what it is.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App.tsx";
import { SOURCE_AGREEMENT } from "../../data/sourceAgreement";

function panel(): HTMLElement | null {
  return document.getElementById("source-agreement");
}

async function open() {
  render(<App />);
  await screen.findByText("Offline demo snapshot");
}

describe("the independent source-agreement surface", () => {
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

  it("states the agreement a reader would otherwise never see", async () => {
    await open();
    expect(panel(), "the corroboration must reach the page, not just the repo").toBeTruthy();
    expect(panel()?.textContent).toContain(String(SOURCE_AGREEMENT.overlap_months));
  });

  it("says what the number is not, beside the number", async () => {
    await open();
    expect(panel()?.textContent).toMatch(/not a second count/i);
    expect(panel()?.textContent).toMatch(/never enters the forecast/i);
  });

  it("shows the publisher check, which is the stronger of the two", async () => {
    // Two independent transcriptions agreeing is good; matching the numbers the
    // publisher itself issued is better, and it was sitting in the artifact
    // unrendered.
    await open();
    const check = SOURCE_AGREEMENT.publisher_check!;
    expect(panel()?.textContent).toContain(String(check.exactly_equal));
    expect(panel()?.textContent).toMatch(/publisher/i);
  });

  it("says the unexplained difference is unexplained", async () => {
    // The temptation is a tidy story. Rounding was tested and does not fit, so
    // the page must not imply it has been accounted for.
    await open();
    expect(panel()?.textContent).toMatch(/why is not known/i);
  });

  it("names the months that disagree rather than reporting only the headline", async () => {
    await open();
    for (const defect of SOURCE_AGREEMENT.known_defect_months.slice(0, 2)) {
      expect(panel()?.textContent).toContain(defect.month);
    }
  });
});
