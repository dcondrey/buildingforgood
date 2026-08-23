/**
 * Two properties earn a test here, and only two.
 *
 * 1. A link round-trips: what a coordinator built is what their colleague
 *    opens. If this breaks, the share feature is worse than absent, because
 *    it silently hands over a different plan.
 * 2. The allowlist actually refuses. Every other safety claim in this
 *    codebase about the URL rests on that one gate holding in both
 *    directions, including against a URL a stranger typed by hand.
 */

import { describe, expect, it } from "vitest";

import {
  PlanShareError,
  assertShareable,
  decodePlanShare,
  encodePlanShare,
  planShareUrl,
  readPlanShareFromSearch,
  type PlanShareState,
} from "./planShareState.ts";

const PLAN: PlanShareState = {
  budget: 120,
  floor: 8,
  guard: true,
  locks: [
    ["east_village", 16],
    ["gaslamp", 12],
  ],
  share: 0.4,
  assume: "east_village",
  rate: 95,
};

describe("plan share links", () => {
  it("round-trips a plan through a readable query string", () => {
    const query = encodePlanShare(PLAN);
    expect(query).toBe(
      "v=1&budget=120&floor=8&guard=on&locks=east_village:16,gaslamp:12&share=40&assume=east_village&rate=95",
    );
    expect(decodePlanShare(query)).toEqual(PLAN);
    expect(decodePlanShare(`?${query}`)).toEqual(PLAN);
  });

  it("round-trips the plain case with no locks and no stated clearance assumption", () => {
    const plain: PlanShareState = {
      budget: 80,
      floor: 0,
      guard: false,
      locks: [],
      share: 1,
      assume: null,
      rate: 45,
    };
    expect(decodePlanShare(encodePlanShare(plain))).toEqual(plain);
  });

  it("builds an absolute link and drops any query the page already carried", () => {
    expect(planShareUrl(PLAN, "https://example.org/tool/?stale=1#top")).toBe(
      "https://example.org/tool/?v=1&budget=120&floor=8&guard=on&locks=east_village:16,gaslamp:12&share=40&assume=east_village&rate=95",
    );
  });

  it("reads no plan out of a link that carries none", () => {
    expect(decodePlanShare("")).toBeNull();
    expect(decodePlanShare("?utm_source=email")).toBeNull();
  });

  it("ignores unknown parameters rather than letting them become state", () => {
    const restored = decodePlanShare(`${encodePlanShare(PLAN)}&notes=call-jan&utm_source=email`);
    expect(restored).toEqual(PLAN);
  });
});

describe("the shareable allowlist", () => {
  it("refuses to encode a field that is not on the allowlist", () => {
    const smuggled = { ...PLAN, siteContactPhone: "619-555-0134" };
    expect(() => encodePlanShare(smuggled as unknown as PlanShareState)).toThrow(PlanShareError);
    expect(() => encodePlanShare(smuggled as unknown as PlanShareState)).toThrow(
      /not on the shareable allowlist/,
    );
  });

  it("refuses an area id that reads as person-level or point-location data", () => {
    for (const areaId of ["client_id", "latitude", "block_id", "east_village_address"]) {
      expect(() => encodePlanShare({ ...PLAN, assume: areaId })).toThrow(PlanShareError);
    }
  });

  it("refuses an area id that reads as report volume", () => {
    expect(() => encodePlanShare({ ...PLAN, assume: "complaint_rank" })).toThrow(PlanShareError);
    expect(() => encodePlanShare({ ...PLAN, assume: "calls_311" })).toThrow(PlanShareError);
  });

  it("refuses values outside the declared ranges, in either direction", () => {
    expect(() => encodePlanShare({ ...PLAN, budget: -1 })).toThrow(/whole number/);
    expect(() => encodePlanShare({ ...PLAN, budget: 12.5 })).toThrow(/whole number/);
    expect(() => encodePlanShare({ ...PLAN, budget: 100000 })).toThrow(/whole number/);
    expect(() => encodePlanShare({ ...PLAN, share: 4 })).toThrow(/fraction/);
    expect(() => encodePlanShare({ ...PLAN, rate: 100000 })).toThrow(/number from 0 to/);
    expect(() => assertShareable({ ...PLAN, guard: "yes" })).toThrow(/true or false/);
  });

  it("refuses a hand-edited link rather than restoring part of it", () => {
    const handEdited = [
      "v=1&budget=notanumber&floor=8&guard=on",
      "v=1&budget=120&floor=8&guard=maybe",
      "v=1&budget=120&floor=8&guard=on&locks=east_village",
      "v=1&budget=120&floor=8&guard=on&locks=../../etc/passwd:4",
      "v=1&budget=120&floor=8&guard=on&assume=<script>",
      "v=1&budget=120&floor=8&guard=on&rate=1e9",
      "v=1&budget=120&budget=400&floor=8&guard=on",
      "v=9&budget=120&floor=8&guard=on",
      "v=1&floor=8&guard=on",
    ];
    for (const search of handEdited) {
      expect(() => decodePlanShare(search), search).toThrow(PlanShareError);
      expect(readPlanShareFromSearch(search), search).toBeNull();
    }
  });
});
