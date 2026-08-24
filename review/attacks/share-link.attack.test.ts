// Adversarial pass on the only path that emits state into a URL a coordinator
// pastes into email. NOT part of the product suite.
import { describe, expect, it } from "vitest";
import {
  assertShareable, decodePlanShare, encodePlanShare, planShareUrl, readPlanShareFromSearch,
  type PlanShareState,
} from "../../app/src/features/share/planShareState";
import { allocateHours } from "../../app/src/lib/planner";
import { EMBEDDED_DEMO } from "../../app/src/lib/demo";

const SENT: PlanShareState = {
  budget: 120, floor: 8, guard: true,
  locks: [["east_village", 40]], share: 0.25, assume: "gaslamp", rate: 62.5,
};
const AREAS = EMBEDDED_DEMO.areas;

const plan = (s: PlanShareState) =>
  allocateHours(AREAS, s.budget, s.floor, s.guard, new Map(s.locks));
const hours = (s: PlanShareState) =>
  JSON.stringify(Object.fromEntries(plan(s).allocations.map((a) => [a.areaId, a.hours])));
const read = (q: string) => {
  try { return { ok: true as const, v: decodePlanShare(q) }; }
  catch (e) { return { ok: false as const, e: (e as Error).message }; }
};

describe("ATTACK S: the share link", () => {
  it("S-0 round-trips faithfully (baseline)", () => {
    const q = encodePlanShare(SENT);
    console.log("S-0 link:", planShareUrl(SENT, "https://x.org/app"));
    expect(decodePlanShare(q)).toEqual(SENT);
  });

  it("S-1 email mangling: what a wrapped or decorated URL does", () => {
    const q = encodePlanShare(SENT);
    const cases: Array<[string, string]> = [
      ["truncated at 60 chars (line wrap)", q.slice(0, 60)],
      ["truncated mid-locks", q.slice(0, q.indexOf("locks") + 12)],
      ["HTML-entity &amp; (rich-text email)", q.replace(/&/g, "&amp;")],
      ["trailing period from a sentence", q + "."],
      ["trailing >  from a quoted reply", q + ">"],
      ["unicode non-breaking hyphen", q.replace("east_village", "east‑village")],
    ];
    for (const [label, mangled] of cases) {
      const r = read(mangled);
      const silent = readPlanShareFromSearch(mangled);
      console.log(
        `S-1 ${label.padEnd(36)} decode=${r.ok ? "OK" : "THROWS"}  readPlanShareFromSearch=${silent === null ? "null -> SILENT DEFAULT PLAN" : "plan"}`,
      );
    }
    expect(readPlanShareFromSearch(q.slice(0, 60))).toBeNull();
  });

  it("S-2 a stripped parameter silently changes the plan and the cost", () => {
    const q = encodePlanShare(SENT);
    const drop = (k: string) =>
      q.split("&").filter((p) => !p.startsWith(k + "=")).join("&");

    const sentHours = hours(SENT);
    const sentCost = SENT.rate;
    for (const key of ["rate", "share", "locks", "budget", "floor", "guard"]) {
      const r = read(drop(key));
      if (!r.ok) { console.log(`S-2 drop ${key.padEnd(7)} -> REFUSED: ${r.e.slice(0, 60)}`); continue; }
      const got = r.v!;
      const changed: string[] = [];
      if (got.rate !== sentCost) changed.push(`rate ${sentCost} -> ${got.rate}`);
      if (got.share !== SENT.share) changed.push(`share ${SENT.share} -> ${got.share}`);
      if (hours(got) !== sentHours) changed.push(`HOURS CHANGED`);
      console.log(
        `S-2 drop ${key.padEnd(7)} -> ACCEPTED SILENTLY${changed.length ? ": " + changed.join(", ") : " (no visible change)"}`,
      );
    }
  });

  it("S-3 quantifies the divergence a stripped rate/share produces", () => {
    const q = encodePlanShare(SENT);
    const noRate = decodePlanShare(q.split("&").filter((p) => !p.startsWith("rate=")).join("&"))!;
    const noShare = decodePlanShare(q.split("&").filter((p) => !p.startsWith("share=")).join("&"))!;
    const senderCost = SENT.budget * SENT.rate;
    const readerCost = noRate.budget * noRate.rate;
    console.log(`S-3 sender saw $${senderCost.toFixed(2)} for the plan; reader of the same link sees $${readerCost.toFixed(2)} (rate ${SENT.rate} -> ${noRate.rate})`);
    console.log(`S-3 sender's clearance assumption ${SENT.share * 100}%; reader's ${noShare.share * 100}%`);
    expect(readerCost).not.toBe(senderCost);
  });

  it("S-4 prototype pollution and key smuggling", () => {
    for (const [label, payload] of [
      ["__proto__ own key", JSON.parse('{"__proto__":{"polluted":1},"budget":80,"floor":8,"guard":true,"locks":[],"share":0,"assume":null,"rate":45}')],
      ["constructor key", JSON.parse('{"constructor":1,"budget":80,"floor":8,"guard":true,"locks":[],"share":0,"assume":null,"rate":45}')],
      ["extra field", { ...SENT, complaint_rank: 9 }],
    ] as Array<[string, unknown]>) {
      let out = "ACCEPTED";
      try { assertShareable(payload); } catch (e) { out = `REFUSED: ${(e as Error).message.slice(0, 55)}`; }
      console.log(`S-4 ${label.padEnd(18)} ${out}`);
    }
    console.log("S-4 Object.prototype polluted?", ({} as Record<string, unknown>).polluted !== undefined);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("S-5 duplicate and unknown parameters", () => {
    const q = encodePlanShare(SENT);
    for (const [label, s] of [
      ["duplicate budget", q + "&budget=400"],
      ["unknown tracking param", q + "&utm_source=email&fbclid=abc"],
      ["unknown param that shadows intent", q + "&complaints=on&sort=complaints"],
    ] as Array<[string, string]>) {
      const r = read(s);
      console.log(`S-5 ${label.padEnd(34)} ${r.ok ? `ACCEPTED budget=${r.v!.budget}` : `REFUSED: ${r.e.slice(0, 50)}`}`);
    }
  });
});
