import { describe, expect, it } from "vitest";
import {
  ContractViolation,
  SMALL_CELL_THRESHOLD,
  assertNoPreciseFields,
  parseObservationsV0,
  parseQualityReportV0,
} from "./contracts";

// Mirrors tests/pipeline/test_contracts.py case-for-case so the two
// validators are exercised against the same fixtures in both languages.

function validContractBlock() {
  return {
    count_fields: ["total", "by_type.individual", "by_type.structure", "by_type.vehicle"],
    small_cell_threshold: SMALL_CELL_THRESHOLD,
    suppression_marker: { field: "suppressed", affirmative: [true] },
  };
}

function validObservations(): Record<string, unknown> {
  return {
    schema: "observations.v0",
    contract: validContractBlock(),
    source: { source_id: "sdrdl_source", retrieved_at: "2026-08-21T01:06:45Z" },
    months_observed: ["2018-01"],
    missing_months_global: [],
    neighborhoods: [
      {
        neighborhood: "east_village",
        label_variants: ["east_village"],
        coverage_start: "2018-01",
        coverage_end: "2018-01",
        observed_gap_months: [],
        observations: [
          {
            month: "2018-01",
            total: 5,
            by_type: { individual: 5, structure: 0, vehicle: 0 },
          },
        ],
      },
    ],
    comparability_events: [],
  };
}

function parse(doc: unknown) {
  return parseObservationsV0(doc, SMALL_CELL_THRESHOLD);
}

describe("parseObservationsV0", () => {
  it("accepts a valid document", () => {
    expect(() => parse(validObservations())).not.toThrow();
  });

  it("rejects the wrong schema string", () => {
    const doc = { ...validObservations(), schema: "observations.v1" };
    expect(() => parse(doc)).toThrow(/schema/);
  });

  it("rejects a missing source", () => {
    const doc = validObservations();
    delete doc["source"];
    expect(() => parse(doc)).toThrow(/source/);
  });

  it("rejects empty neighborhoods", () => {
    const doc = { ...validObservations(), neighborhoods: [] };
    expect(() => parse(doc)).toThrow(/non-empty/);
  });

  it("rejects a non-string month", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations[0].month = 201801;
    expect(() => parse(doc)).toThrow(/month/);
  });

  it("rejects a boolean total", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations[0].total = true;
    expect(() => parse(doc)).toThrow(/total/);
  });

  it("rejects a non-object by_type", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations[0].by_type = "individual:5";
    expect(() => parse(doc)).toThrow(/by_type/);
  });

  it("accepts the suppressed-row shape", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations.push({
      month: "2018-02",
      total: null,
      suppressed: true,
    });
    expect(() => parse(doc)).not.toThrow();
  });

  it("rejects a suppressed row that still publishes by_type", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations.push({
      month: "2018-02",
      total: null,
      suppressed: true,
      by_type: { individual: 2 },
    });
    expect(() => parse(doc)).toThrow(/suppressed/);
  });

  it("accepts null by_type values", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations[0].by_type = {
      individual: 40,
      structure: null,
      vehicle: null,
    };
    expect(() => parse(doc)).not.toThrow();
  });

  it("rejects a string by_type value", () => {
    const doc = validObservations();
    (doc["neighborhoods"] as any)[0].observations[0].by_type.individual = "many";
    expect(() => parse(doc)).toThrow(/by_type value/);
  });

  describe("contract declaration (issue #4 slice)", () => {
    it("rejects a missing contract block", () => {
      const doc = validObservations();
      delete doc["contract"];
      expect(() => parse(doc)).toThrow(/contract/);
    });

    it("rejects count_fields that don't cover every count path", () => {
      const doc = validObservations();
      (doc["contract"] as any).count_fields = ["total"];
      expect(() => parse(doc)).toThrow(/count_fields/);
    });

    it("rejects a threshold that doesn't match the policy", () => {
      const doc = validObservations();
      (doc["contract"] as any).small_cell_threshold = 3;
      expect(() => parse(doc)).toThrow(/small_cell_threshold/);
    });

    it("rejects a suppression_marker missing the affirmative encoding", () => {
      const doc = validObservations();
      (doc["contract"] as any).suppression_marker = { field: "suppressed" };
      expect(() => parse(doc)).toThrow(/affirmative/);
    });

    it.each([
      { field: "anything", affirmative: [true] },
      { field: "suppressed", affirmative: [false] },
      { field: "suppressed", affirmative: [1] },
      { field: "suppressed", affirmative: [""] },
    ])(
      "rejects a suppression_marker that doesn't match the implemented encoding (%#)",
      (marker) => {
        const doc = validObservations();
        (doc["contract"] as any).suppression_marker = marker;
        expect(() => parse(doc)).toThrow(/suppression_marker/);
      },
    );

    it("rejects non-string count_fields items", () => {
      const doc = validObservations();
      (doc["contract"] as any).count_fields = ["total", 3];
      expect(() => parse(doc)).toThrow(/only strings/);
    });

    it.each(["extra", "missing"])(
      "rejects when declared count paths don't match the actual by_type surface (%s)",
      (mutation) => {
        const doc = validObservations();
        const byType = (doc["neighborhoods"] as any)[0].observations[0].by_type;
        if (mutation === "extra") {
          byType.family = 10;
        } else {
          delete byType.vehicle;
        }
        expect(() => parse(doc)).toThrow(/declared count paths/);
      },
    );
  });
});

describe("parseQualityReportV0", () => {
  it("rejects a missing required field", () => {
    expect(() => parseQualityReportV0({ schema: "quality_report.v0", source: {} })).toThrow(
      /row_counts/,
    );
  });
});

describe("assertNoPreciseFields", () => {
  it("rejects an uppercase key that is still precise", () => {
    expect(() => assertNoPreciseFields({ points: [{ X: 1.0 }] })).toThrow(/precise-location/);
  });

  it("rejects a mixed-case lat", () => {
    expect(() => assertNoPreciseFields({ Lat: 32.7 })).toThrow(/precise-location/);
  });

  it("walks array values", () => {
    expect(() => assertNoPreciseFields({ rows: [{ lng: -117.1 }] })).toThrow(/precise-location/);
  });

  it("does not throw on unrelated fields", () => {
    expect(() => assertNoPreciseFields({ fine: "value", nested: { also: "fine" } })).not.toThrow();
  });
});

describe("ContractViolation", () => {
  it("is a real Error subclass with a stable name", () => {
    const error = new ContractViolation("x");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ContractViolation");
  });
});
