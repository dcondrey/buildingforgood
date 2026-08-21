// @vitest-environment jsdom
/**
 * Behaviour, offline-fallback, and accessibility evidence for the deployed
 * decision shell (#12, #13, #16).
 *
 * Every test here runs with fetch rejecting, so the shell exercises the same
 * path it takes with the network disabled: the embedded snapshot renders and
 * is visibly labeled as the offline fallback (#12 acceptance criterion 4 at
 * the jsdom level; the hash-identity of public/generated, app/dist, and the
 * deployed artifact is verified separately in release evidence).
 *
 * The axe checks mirror PlannerPanel.a11y.test.tsx but target the shell the
 * user actually reaches. Scope note: axe under jsdom cannot execute its
 * color-contrast rule; the manual keyboard smoke test in
 * docs/track-c/C-05-keyboard-smoke-test.md still has to be run by a person.
 */

import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("network disabled"))),
  );
  // jsdom implements neither smooth scrolling nor scrollIntoView.
  Element.prototype.scrollIntoView = () => undefined;
  // jsdom has no matchMedia; the shell only reads prefers-reduced-motion.
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
});

async function renderOffline() {
  render(<App />);
  await screen.findByText("Offline demo snapshot");
}

async function violationsFor(element: HTMLElement): Promise<string[]> {
  const results = await axe.run(element, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`);
}

describe("decision shell offline fallback (#12)", () => {
  it("completes the load with the network disabled and labels the fallback", async () => {
    await renderOffline();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Fewer tents");
    expect(screen.getByText("Offline demo snapshot")).toBeDefined();
  });

  it("keeps observations, forecast, planning load, and allocation distinct", async () => {
    await renderOffline();
    expect(screen.getByText("Test the drop", { selector: "h2" })).toBeDefined();
    expect(screen.getByText("Could we have predicted January 2026?")).toBeDefined();
    expect(screen.getByRole("heading", { name: /Plan \d+ staff-hours/ })).toBeDefined();
    expect(screen.getByText("Review before the next shift")).toBeDefined();
  });
});

describe("decision flow (#12)", () => {
  it("opens mid-work with a live default plan and persistent status chrome", async () => {
    await renderOffline();
    expect(await screen.findByText(/80\/80 hours allocated\./)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Generate coverage scenario/ })).toBeNull();
    const status = screen.getByRole("status", { name: "Live plan state" });
    expect(status.textContent).toContain("80/80h allocated");
    expect(status.textContent).toContain("8h floor");
    expect(status.textContent).toContain("unmet");
  });

  it("reveals the evidence result and moves focus to its heading", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const heading = await screen.findByRole("heading", {
      level: 3,
      name: /People were seen|Field activity/,
    });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it("generates a plan, conserves the budget, and always shows unmet planning load", async () => {
    await renderOffline();
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    expect(await screen.findByText(/\/\d+ hours allocated\./)).toBeDefined();
    expect(screen.getByText("Unmet planning load")).toBeDefined();
    expect(
      screen.getByText(/^(\d+h moved to minimums and locks|0h · hours follow the forecast)$/),
    ).toBeDefined();
  });
});

describe("aggregate spatial view (#13)", () => {
  it("gives each schematic map a tabular equivalent with non-color state words", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    const disclosures = screen.getAllByText("View map values as a table");
    expect(disclosures.length).toBe(2);
    const tables = screen.getAllByRole("table").filter((table) => {
      const caption = table.querySelector("caption");
      return caption?.textContent?.includes("by neighborhood") ?? false;
    });
    expect(tables.length).toBe(2);
    const planTable = tables.find((table) =>
      table.querySelector("caption")?.textContent?.includes("staff-hours"),
    );
    expect(planTable).toBeDefined();
    const states = within(planTable as HTMLElement)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    for (const state of states) {
      expect(state).toMatch(/Human lock|No minimum|Below minimum|Minimum met|\d+h/);
    }
  });

  it("selects a neighborhood on the map, shows its detail panel, and toggles off", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const areaButton = screen.getAllByRole("button", { name: /East Village:/ })[0];
    await user.click(areaButton);
    expect(areaButton.getAttribute("aria-pressed")).toBe("true");
    const detailHeadings = await screen.findAllByRole("heading", {
      level: 5,
      name: "East Village",
    });
    expect(detailHeadings.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Held-out WAPE").length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /East Village:/ })[0]);
    expect(screen.queryAllByRole("heading", { level: 5, name: "East Village" }).length).toBe(0);
  });

  it("live-replans on budget change while a plan is on screen, and reports infeasibility", async () => {
    await renderOffline();
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    await screen.findByText(/80\/80 hours allocated\./);
    const slider = screen.getByLabelText(/What-if · drag to stress-test the budget/);
    fireEvent.change(slider, { target: { value: "100" } });
    expect(await screen.findByText(/100\/100 hours allocated\./)).toBeDefined();
    fireEvent.change(slider, { target: { value: "40" } });
    expect(await screen.findByRole("heading", { name: "No feasible plan" })).toBeDefined();
    expect(screen.getByLabelText(/What-if · drag to stress-test the budget/)).toBeDefined();
    fireEvent.change(slider, { target: { value: "80" } });
    expect(await screen.findByText(/80\/80 hours allocated\./)).toBeDefined();
  });

  it("selects a map area with the keyboard", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    const areaButton = screen.getAllByRole("button", { name: /Marina:/ })[0];
    fireEvent.keyDown(areaButton, { key: "Enter" });
    expect(areaButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(areaButton, { key: " " });
    expect(areaButton.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("guided onboarding", () => {
  async function beginGuide(user: ReturnType<typeof userEvent.setup>) {
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Guide demo/ }));
    return screen.getByRole("dialog");
  }

  it("asks for the real control, detects completion, and advances on its own", async () => {
    const user = userEvent.setup();
    const panel = await beginGuide(user);
    expect(within(panel).getByText(/Step 1 of 9/)).toBeDefined();
    expect(panel.textContent).toContain("Your turn:");
    expect(panel.textContent).toContain("Test the drop");
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    await waitFor(
      () => expect(screen.getByRole("dialog").textContent).toContain("Read what actually moved"),
      { timeout: 2500 },
    );
    expect(screen.getByRole("dialog").textContent).toContain("510");
    expect(screen.getByRole("dialog").textContent).toContain("548");
  });

  it("performs the task itself on Do it for me, and Back does not bounce forward", async () => {
    const user = userEvent.setup();
    const panel = await beginGuide(user);
    await user.click(within(panel).getByRole("button", { name: "Do it for me" }));
    expect(screen.getByRole("dialog").textContent).toContain("Read what actually moved");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Back" }));
    const revisited = screen.getByRole("dialog");
    expect(revisited.textContent).toContain("Step 1 of 9");
    expect(revisited.textContent).toContain("Done — press Next to continue.");
    // The completed task must wait for an explicit Next instead of auto-advancing.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(screen.getByRole("dialog").textContent).toContain("Step 1 of 9");
  });

  it("advances with the arrow keys", async () => {
    const user = userEvent.setup();
    await beginGuide(user);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByRole("dialog").textContent).toContain("Step 2 of 9");
    fireEvent.keyDown(document.body, { key: "ArrowLeft" });
    expect(screen.getByRole("dialog").textContent).toContain("Step 1 of 9");
  });

  it("never strands the guard-off comparison view when stopped", async () => {
    const user = userEvent.setup();
    await beginGuide(user);
    const next = () =>
      user.click(
        within(screen.getByRole("dialog")).getByRole("button", { name: /Next|Do it for me/ }),
      );
    await next(); // reveal the drop test
    await next(); // evidence (read-only)
    await next(); // forecast (read-only)
    await next(); // generate the plan
    await next(); // switch to the 0h comparison floor
    expect(screen.getByText("OFF · COMPARISON ONLY")).toBeDefined();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText(/ON · 8h per area/)).toBeDefined();
  });

  it("advertises itself until first use, then remembers", async () => {
    // This jsdom environment ships no localStorage; the shell treats that as
    // "never used" via try/catch. Stub one to check both cue states.
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
    const user = userEvent.setup();
    await renderOffline();
    const button = screen.getByRole("button", { name: /Guide demo/ });
    expect(button.className).toContain("guide-button-new");
    await user.click(button);
    expect(button.className).not.toContain("guide-button-new");
    expect(store.get("stillhere-guide-used")).toBe("1");
  });

  it("has no axe violations with the guide panel open", async () => {
    const user = userEvent.setup();
    await beginGuide(user);
    expect(await violationsFor(document.body)).toEqual([]);
  }, 30000);
});

describe("scenario workbench", () => {
  function stubStorage() {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    });
    return store;
  }

  async function generateAndSave(user: ReturnType<typeof userEvent.setup>) {
    await renderOffline();
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    await screen.findByText(/80\/80 hours allocated\./);
    await user.click(screen.getByRole("button", { name: "Save scenario" }));
    return screen.getByRole("button", { name: "80h · 8h floor" });
  }

  it("saves settings only, loads them back, and survives a reload", async () => {
    const store = stubStorage();
    const user = userEvent.setup();
    await generateAndSave(user);
    expect(store.get("stillhere-scenarios-v1")).toContain("80h · 8h floor");
    expect(store.get("stillhere-scenarios-v1")).not.toContain("allocations");
    // Change the policy, then load the saved scenario back.
    const floorGroup = screen.getByLabelText("Coverage-continuity floor sensitivity");
    await user.click(within(floorGroup).getAllByRole("button")[1]); // 0h, 4h, 8h
    await screen.findByText(/24 of 80 hours are set aside/);
    await user.click(screen.getByRole("button", { name: "80h · 8h floor" }));
    expect(await screen.findByText(/48 of 80 hours are set aside/)).toBeDefined();
    // A fresh mount reads the same store.
    cleanup();
    render(<App />);
    await screen.findByText("Offline demo snapshot");
    expect(screen.getByRole("button", { name: "80h · 8h floor" })).toBeDefined();
  });

  it("shows per-area hour differences against a pinned saved scenario", async () => {
    stubStorage();
    const user = userEvent.setup();
    await generateAndSave(user);
    const floorGroup = screen.getByLabelText("Coverage-continuity floor sensitivity");
    await user.click(within(floorGroup).getAllByRole("button")[0]); // 0h, 4h, 8h
    await screen.findByText("OFF · COMPARISON ONLY");
    await user.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByText(/Comparing with/).textContent).toContain("80h · 8h floor");
    const deltas = screen.getAllByText(/vs saved|same as saved/);
    expect(deltas.length).toBe(6);
    expect(screen.getAllByText(/[+-]\d+h vs saved/).length).toBeGreaterThan(0);
  });

  it("deletes a saved scenario", async () => {
    stubStorage();
    const user = userEvent.setup();
    await generateAndSave(user);
    await user.click(screen.getByRole("button", { name: "Delete scenario 80h · 8h floor" }));
    expect(screen.queryByRole("button", { name: "80h · 8h floor" })).toBeNull();
    expect(screen.getByText(/Save this plan, change the policy/)).toBeDefined();
  });
});

describe("intervention assumption explorer", () => {
  it("explores a clearance assumption, reallocates hours, discloses it, and clears cleanly", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    await screen.findByText(/80\/80 hours allocated\./);
    expect(screen.getByLabelText("Hours for East Village").getAttribute("value")).toBe("27");
    await user.click(screen.getAllByRole("button", { name: /East Village:/ })[0]);
    expect(screen.getByText(/What if East Village were cleared\?/)).toBeDefined();
    // Apply at the default 100% displaced share: need moves, it does not shrink.
    await user.click(screen.getByRole("button", { name: "Explore this assumption" }));
    const banner = await screen.findByText(/Assumption explorer:/);
    expect(banner.parentElement?.textContent).toContain("assumed, not observed");
    expect(banner.parentElement?.textContent).toContain("not a prediction");
    // With its load moved off, East Village keeps only the guaranteed minimum.
    expect(screen.getByLabelText("Hours for East Village").getAttribute("value")).toBe("8");
    // The brief carries the assumption disclosure.
    await user.click(screen.getByRole("button", { name: "Copy decision brief" }));
    expect(await screen.findByText(/Stress-test assumption active: East Village/)).toBeDefined();
    // Clearing the assumption restores the observed-load plan.
    await user.click(screen.getAllByRole("button", { name: "Clear assumption" })[0]);
    expect(screen.queryByText(/Assumption explorer:/)).toBeNull();
    expect(screen.getByLabelText("Hours for East Village").getAttribute("value")).toBe("27");
  });
});

describe("keyboard access (#12, #16)", () => {
  it("offers a skip link as the first tab stop and a labeled budget input", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.tab();
    const skip = screen.getByText("Skip to decision");
    expect(document.activeElement).toBe(skip);
    expect(skip.getAttribute("href")).toBe("#drop-test");
    expect(screen.getByLabelText("Available staff-hours")).toBeDefined();
  });
});

describe("automated accessibility over the deployed shell (#16)", () => {
  it("has no axe violations in the initial state", async () => {
    await renderOffline();
    expect(await violationsFor(document.body)).toEqual([]);
  });

  it("has no axe violations after the full decision flow", async () => {
    const user = userEvent.setup();
    await renderOffline();
    await user.click(screen.getByRole("button", { name: /Test the drop/ }));
    await screen.findByText(/\d+\/\d+ hours allocated\./); // the shell opens with a live plan
    expect(await violationsFor(document.body)).toEqual([]);
  }, 30000);
});
