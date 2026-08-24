// @vitest-environment jsdom
// Track 2: RUN the second profile, don't read it.
//
// Retargeted 2026-08-23 after `0113a1f` deleted the fictional rural profile
// this file was written against. The replacement is DSDP's own published
// seven-area geography — the six-area core plus Outside Perimeter — so the
// probes change shape but not intent: the old file asked whether a second
// geography reaches the screen at all, and this one asks the sharper version,
// because six of its seven areas are shared with the reference deployment and
// only the differences can be evidence.
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../app/src/App";

const clear = () => { try { localStorage.clear(); } catch { /* jsdom variant */ } };
function setUrl(search: string) {
  Object.defineProperty(window, "location", {
    writable: true, value: { ...window.location, search, href: "http://localhost/" + search },
  });
}
beforeEach(() => { clear(); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(clear);

async function boot(search: string) {
  setUrl(search);
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getAllByRole("heading").length).toBeGreaterThan(0), { timeout: 20000 });
  return container;
}

describe("PROFILE RUN", () => {
  it("P1 seven-area profile renders its own geography, not the reference six", async () => {
    const c = await boot("?profile=san-diego-dsdp-seven");
    const text = c.textContent ?? "";
    const SEVEN = ["City Center", "Columbia", "Cortez", "East Village", "Gaslamp", "Marina",
      "Outside Perimeter"];
    const present = SEVEN.filter((n) => text.includes(n));
    console.log(`P1 published areas rendered: ${present.length}/7 -> ${present.join(", ")}`);
    // The seventh area is the whole point: it is in the profile and absent from
    // the shipped artifact, so it is where a fabricated observation would show.
    console.log(`P1 Outside Perimeter present: ${text.includes("Outside Perimeter")}`);
    // Out of scope in the profile, and must never be summed with East Village.
    const QUADRANTS = ["East Village - North East", "East Village - North West",
      "East Village - South East", "East Village - South West"];
    const leaked = QUADRANTS.filter((n) => text.includes(n));
    console.log(`P1 OUT-OF-SCOPE QUADRANT LEAKAGE: ${leaked.length ? leaked.join(" | ") : "none"}`);
    // C-2: copy that hardcodes the reference geography's area count.
    const six = /\bsix\b/i.test(text);
    console.log(`P1 says "six" anywhere: ${six}`);
    if (six) {
      const m = text.match(/.{70}\bsix\b.{70}/i);
      console.log(`P1 context: ...${m?.[0]}...`);
    }
    for (const needle of ["Outside Perimeter", "Six-area", "six", "seven"]) {
      const re = new RegExp(".{0,90}" + needle + ".{0,90}", "g");
      const hits = [...(text.matchAll(re) as unknown as Iterable<RegExpMatchArray>)].slice(0, 3);
      for (const h of hits) console.log(`P1x [${needle}] ...${h[0].replace(/\s+/g, " ")}...`);
    }
    expect(present.length).toBeGreaterThan(0);
    expect(leaked).toEqual([]);
  }, 60000);

  it("P2 seven-area profile's operating numbers reach the UI", async () => {
    const c = await boot("?profile=san-diego-dsdp-seven");
    const text = c.textContent ?? "";
    for (const [label, needle] of [
      ["96-hour budget", "96"], ["6-hour floor", "6"], ["two-week cycle", "two-week"],
      ["$52.00 rate", "52"], ["7 areas", "seven"],
    ] as Array<[string, string]>) {
      console.log(`P2 ${label.padEnd(18)} present: ${text.includes(needle)}`);
    }
    const budget = c.querySelector<HTMLInputElement>("#budget-hours");
    console.log(`P2 budget input value=${budget?.value} min=${budget?.min} max=${budget?.max}`);
    expect(budget?.value).toBe("96");
  }, 60000);

  it("P3 downtown profile is unchanged (control)", async () => {
    const c = await boot("?profile=san-diego-downtown");
    const text = c.textContent ?? "";
    const DOWNTOWN = ["East Village", "Gaslamp", "City Center", "Columbia", "Cortez", "Marina"];
    console.log(`P3 downtown areas: ${DOWNTOWN.filter((n) => text.includes(n)).length}/6`);
    const budget = c.querySelector<HTMLInputElement>("#budget-hours");
    console.log(`P3 budget input value=${budget?.value}`);
    expect(budget?.value).toBe("80");
  }, 60000);
});
