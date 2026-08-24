// VERIFICATION of my own SH-1..SH-4 findings. Checks the failure modes are
// refused, not that the happy path works.
import { describe, expect, it } from "vitest";
import {
  decodePlanShare, encodePlanShare, readPlanShareFromSearch, assertGeographyMatches,
  type PlanShareState,
} from "../../app/src/features/share/planShareState";

const SENT: PlanShareState = {
  budget: 120, floor: 8, guard: true, locks: [["east_village", 40]],
  share: 0.25, assume: "gaslamp", rate: 62.5,
  geography: "downtown-sd-dsdp-six-area/2026-08-21",
};
const Q = encodePlanShare(SENT);
const PARAMS = Q.split("&").map((p) => p.split("=")[0]);
const drop = (keys: string[]) =>
  Q.split("&").filter((p) => !keys.includes(p.split("=")[0])).join("&");
const read = (q: string) => {
  try { return { ok: true as const, v: decodePlanShare(q) }; }
  catch (e) { return { ok: false as const, e: (e as Error).message }; }
};

describe("VERIFY SH-2: every omission is refused, none is restored", () => {
  it("V1 single-field omission, all 9 params", () => {
    const survivors: string[] = [];
    for (const k of PARAMS) {
      const r = read(drop([k]));
      if (k === "v") { // absent v legitimately means "no plan here"
        console.log(`V1 drop ${k.padEnd(10)} -> ${r.ok && r.v === null ? "null (no plan) — correct" : "?"}`);
        continue;
      }
      const verdict = r.ok ? `ACCEPTED budget=${r.v?.budget} rate=${r.v?.rate} share=${r.v?.share}` : `REFUSED (${r.e.slice(0, 40)})`;
      if (r.ok) survivors.push(k);
      console.log(`V1 drop ${k.padEnd(10)} -> ${verdict}`);
    }
    expect(survivors).toEqual([]);
  });

  it("V2 every PAIR of omissions (C(8,2)=28)", () => {
    const keys = PARAMS.filter((k) => k !== "v");
    const survivors: string[] = [];
    let n = 0;
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        n++;
        const r = read(drop([keys[i], keys[j]]));
        if (r.ok) survivors.push(`${keys[i]}+${keys[j]}`);
      }
    console.log(`V2 ${n} pairs tested, ${survivors.length} accepted${survivors.length ? ": " + survivors.join(", ") : ""}`);
    expect(survivors).toEqual([]);
  });

  it("V3 present but malformed, per field", () => {
    const bad: Array<[string, string]> = [
      ["budget", "budget=-1"], ["budget", "budget=1e3"], ["budget", "budget=+5"],
      ["budget", "budget= 120"], ["budget", "budget=120.0"], ["budget", "budget=0x78"],
      ["floor", "floor=null"], ["guard", "guard=ON"], ["guard", "guard=1"], ["guard", "guard="],
      ["locks", "locks=east_village:"], ["locks", "locks=:40"], ["locks", "locks=east_village:40:8"],
      ["locks", "locks=east_village:40,east_village:8"], ["locks", "locks=EAST_VILLAGE:40"],
      ["share", "share=101"], ["share", "share=-5"], ["share", "share=25.5"],
      ["rate", "rate=1e9"], ["rate", "rate=-1"], ["rate", "rate=Infinity"], ["rate", "rate=NaN"],
      ["assume", "assume=<script>"], ["assume", "assume=../../etc"],
      ["geography", "geography=../../x"], ["geography", "geography=a b"],
    ];
    const survivors: string[] = [];
    for (const [field, replacement] of bad) {
      const q = Q.split("&").map((p) => (p.split("=")[0] === field ? replacement : p)).join("&");
      const r = read(q);
      if (r.ok) survivors.push(replacement);
      console.log(`V3 ${replacement.padEnd(34)} -> ${r.ok ? `ACCEPTED (${field}=${JSON.stringify((r.v as Record<string, unknown>)?.[field])})` : "REFUSED"}`);
    }
    console.log(`V3 ${bad.length} malformed values, ${survivors.length} accepted`);
  });

  it("V4 the two silent defaults are unreachable by omission", () => {
    // $45 placeholder and 100% clearance must never arrive from an ABSENT field.
    for (const k of ["rate", "share"]) {
      const r = read(drop([k]));
      console.log(`V4 omit ${k} -> ${r.ok ? "REACHED A DEFAULT: " + JSON.stringify(r.v) : "REFUSED"}`);
      expect(r.ok).toBe(false);
    }
    // Both remain expressible when the SENDER actually chose them.
    const explicit = encodePlanShare({ ...SENT, rate: 45, share: 1 });
    const back = decodePlanShare(explicit)!;
    console.log(`V4 explicit rate=45 share=1 round-trips: rate=${back.rate} share=${back.share}`);
    expect(back.rate).toBe(45);
    expect(back.share).toBe(1);
  });
});

describe("VERIFY SH-1: manglings fail visibly", () => {
  it("V5 the original six, plus new ones", () => {
    const cases: Array<[string, string]> = [
      ["truncated at 60 chars", Q.slice(0, 60)],
      ["truncated mid-locks", Q.slice(0, Q.indexOf("locks") + 12)],
      ["HTML-entity &amp;", Q.replace(/&/g, "&amp;")],
      ["trailing period", Q + "."],
      ["trailing >", Q + ">"],
      ["unicode non-breaking hyphen", Q.replace("east_village", "east‑village")],
      // seventh-mangling hunt
      ["trailing comma", Q + ","],
      ["trailing )", Q + ")"],
      ["trailing ] from markdown", Q + "]"],
      ["wrapped in <>", "<" + Q + ">"],
      ["trailing newline+space", Q + "\n "],
      ["double-encoded %26", Q.replace(/&/g, "%26")],
      ["semicolon separators (legacy)", Q.replace(/&/g, ";")],
      ["leading whitespace", "  " + Q],
      ["smart quote appended", Q + "”"],
      ["zero-width space in middle", Q.replace("floor", "flo​or")],
      ["uppercase param names", Q.replace("budget=", "BUDGET=")],
      ["+ instead of space-safe", Q.replace("east_village", "east+village")],
    ];
    const silent: string[] = [];
    for (const [label, mangled] of cases) {
      const r = read(mangled);
      const viaSafe = readPlanShareFromSearch(mangled);
      const outcome = r.ok
        ? (r.v === null ? "DECODES AS null (silent, no plan)" : "DECODES AS A PLAN (silent, possibly wrong)")
        : "THROWS (visible)";
      if (r.ok) silent.push(label);
      console.log(`V5 ${label.padEnd(30)} ${outcome}${r.ok && r.v ? ` budget=${r.v.budget}` : ""}${viaSafe ? "" : ""}`);
    }
    console.log(`V5 ${cases.length} manglings, ${silent.length} silent: ${silent.join(" | ")}`);
  });
});

describe("VERIFY SH-4: the geography identifier", () => {
  it("V6 attempts to defeat it", () => {
    const HERE = "downtown-sd-dsdp-six-area/2026-08-21";
    const cases: Array<[string, string]> = [
      ["matching version", HERE],
      ["different profile", "dsdp-published-seven/2026-08-21"],
      ["same profile, older date", "downtown-sd-dsdp-six-area/2026-01-01"],
      ["same profile, newer date", "downtown-sd-dsdp-six-area/2099-01-01"],
      ["renamed profile, same areas", "downtown-sd-renamed/2026-08-21"],
      ["case variation", "Downtown-SD-DSDP-Six-Area/2026-08-21"],
      ["trailing space", HERE + " "],
      ["empty", ""],
    ];
    for (const [label, geo] of cases) {
      let out = "ACCEPTED — plan applies";
      try {
        const st = decodePlanShare(encodePlanShare({ ...SENT, geography: geo || HERE }).replace(
          /geography=[^&]*/, `geography=${geo}`));
        assertGeographyMatches(st!, HERE);
      } catch (e) { out = `REFUSED: ${(e as Error).message.slice(0, 62)}`; }
      console.log(`V6 ${label.padEnd(28)} ${out}`);
    }
  });
});
