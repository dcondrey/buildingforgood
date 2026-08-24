import { describe, expect, it } from "vitest";
import { decodePlanShare, encodePlanShare, type PlanShareState } from "../../app/src/features/share/planShareState";
const SENT: PlanShareState = {
  budget: 120, floor: 8, guard: true, locks: [["east_village", 40]],
  share: 0.25, assume: "gaslamp", rate: 62.5,
  geography: "downtown-sd-dsdp-six-area/2026-08-21",
};
const Q = encodePlanShare(SENT);
describe("SH1 RECOVERY", () => {
  it("R1 do the three formerly-silent manglings recover the SENDER's plan exactly?", () => {
    for (const [label, m] of [
      ["wrapped in <>", "<" + Q + ">"],
      ["leading whitespace", "  " + Q],
      ["trailing newline+space", Q + "\n "],
      ["both: < + whitespace", " <" + Q + "> "],
      ["<> with ? prefix", "<?" + Q + ">"],
      ["mismatched < only", "<" + Q],
      ["mismatched > only", Q + ">"],
    ] as Array<[string, string]>) {
      let out: string;
      try {
        const got = decodePlanShare(m);
        out = got === null ? "null (no plan)"
          : JSON.stringify(got) === JSON.stringify(SENT) ? "RECOVERED sender's plan exactly"
          : `DECODED A DIFFERENT PLAN: ${JSON.stringify(got)}`;
      } catch (e) { out = `refused: ${(e as Error).message.slice(0, 40)}`; }
      console.log(`R1 ${label.padEnd(26)} ${out}`);
    }
    expect(JSON.stringify(decodePlanShare("<" + Q + ">"))).toBe(JSON.stringify(SENT));
  });
});
