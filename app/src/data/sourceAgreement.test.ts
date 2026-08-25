import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOURCE_AGREEMENT } from "./sourceAgreement";

// The repo's other generated data module carries a "do not edit by hand" header
// and nothing enforcing it, so it can drift from its source silently. This one
// cannot: the module and the artifact it was copied from are compared here.
const ARTIFACT = JSON.parse(
  readFileSync(new URL("../../../data/monitoring/source_agreement.json", import.meta.url), "utf8"),
);

describe("the bundled source-agreement figures", () => {
  it("are the artifact's, field for field", () => {
    expect(SOURCE_AGREEMENT).toEqual(ARTIFACT);
  });

  it("carry the boundary that says what the number is not", () => {
    for (const phrase of ["never a model input", "never an allocation weight"]) {
      expect(SOURCE_AGREEMENT.boundary).toContain(phrase);
    }
  });

  it("withhold the per-month ratio series they could be inverted from", () => {
    // The official monthly totals ship in this same bundle. A full ratio series
    // would multiply back into SDRDL's own monthly figures; only the named
    // defect months invert, and they are declared as defects.
    const named = new Set(SOURCE_AGREEMENT.known_defect_months.map((m) => m.month));
    expect(named.size).toBeLessThanOrEqual(5);
    const blob = JSON.stringify(SOURCE_AGREEMENT);
    for (const year of Object.keys(SOURCE_AGREEMENT.median_ratio_by_year)) {
      for (let m = 1; m <= 12; m += 1) {
        const month = `${year}-${String(m).padStart(2, "0")}`;
        if (named.has(month) || SOURCE_AGREEMENT.months_absent_from_package.includes(month)) {
          continue;
        }
        expect(blob, `${month} is an ordinary month`).not.toContain(month);
      }
    }
  });
});
