// Generated from data/monitoring/source_agreement.json. Do not edit by hand:
// `tests/pipeline` has no reach into app/, so `sourceAgreement.test.ts` pins
// this module against that file and fails if the two drift. Re-emit the JSON
// with `python scripts/sdrdl_feasibility.py --emit ... --retrieved ...` and
// copy the values across.

export interface SourceAgreement {
  kind: string;
  boundary: string;
  attribution: string;
  package_version: string;
  retrieved_at: string;
  overlap_months: number;
  median_ratio: number;
  p10_ratio: number;
  p90_ratio: number;
  within_5pct: number;
  within_10pct: number;
  median_ratio_by_year: Record<string, number>;
  months_absent_from_package: string[];
  known_defect_months: { month: string; ratio: number }[];
}

export const SOURCE_AGREEMENT: SourceAgreement = {
  attribution:
    "Observations collected by the Downtown San Diego Partnership Clean & Safe program. Digitized and published by the San Diego Regional Data Library. Both are attributed here because the source ledger requires it of any use of this package.",
  boundary:
    "Agreement between two independent digitizations of the same DSP Clean & Safe paper maps: the shipped artifact's series, and the public SDRDL package. It is evidence about transcription, never a model input, never an allocation weight, and not an independent count of anything. Summary statistics only; the per-month ratio series is withheld because it would invert to SDRDL's own monthly figures against the official totals already published here.",
  kind: "source_agreement",
  known_defect_months: [
    {
      month: "2022-02",
      ratio: 0.484,
    },
    {
      month: "2022-03",
      ratio: 1.478,
    },
    {
      month: "2018-03",
      ratio: 0.562,
    },
    {
      month: "2018-04",
      ratio: 0.564,
    },
    {
      month: "2018-05",
      ratio: 0.588,
    },
  ],
  median_ratio: 0.9912,
  median_ratio_by_year: {
    "2017": 0.995,
    "2018": 0.9906,
    "2019": 0.9878,
    "2020": 0.9897,
    "2021": 0.9841,
    "2022": 0.9896,
  },
  months_absent_from_package: ["2018-11", "2019-12"],
  overlap_months: 70,
  p10_ratio: 0.924,
  p90_ratio: 1.0488,
  package_version: "sandiegodata.org-downtown_homeless-source-7.2.3",
  retrieved_at: "2026-08-24",
  within_10pct: 88.6,
  within_5pct: 74.3,
};
