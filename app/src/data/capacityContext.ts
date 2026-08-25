// Transcribed from the executed PATH Coordinated Street Outreach agreement,
// RFP 10089902-22-F, obtained through City of San Diego PRA request 24-3385.
// Re-fetch and verify with:
//
//   python scripts/fetch_pra.py --doc-id 22974590 --scan
//
// which reproduces the pinned SHA-256 below. The quoted language was read out
// of the document, not summarised from the ledger's description of it.

/** One fact a contract states, and where in it that fact is stated. */
export interface ContractedCapacity {
  /** The document, so a reader can go and check rather than take this on trust. */
  source: {
    title: string;
    request: string;
    documentId: number;
    sha256: string;
  };
  /** Verbatim, because a paraphrase of a contract is not a contract. */
  quotes: string[];
  outreachStaffPerDay: number;
  shiftsPerDay: number;
  daysPerWeek: number;
}

export const CONTRACTED_CAPACITY: ContractedCapacity = {
  source: {
    title: "Contract_RFP 10089902-22-F_PATH San Diego (executed)",
    request: "24-3385",
    documentId: 22974590,
    sha256: "232359092e98d67349401b6b166f62014e3dec455efc94506fcd43b92a7866f7",
  },
  quotes: [
    "one team per shift (day shift; afternoon shift) of two outreach staff " +
      "(2 people in total per shift; 4 people in total per day) plus a team leader",
    "The Rapid Response Team shall be available 7 days per week.",
  ],
  outreachStaffPerDay: 4,
  shiftsPerDay: 2,
  daysPerWeek: 7,
};

/**
 * What this figure is not, and why nothing here multiplies it out.
 *
 * The source ledger is explicit: contracted shift staffing is a contract
 * requirement, not observed fielded staffing, and it must never become a
 * forecast feature or an allocation weight. It also covers the City's Rapid
 * Response Team, which is a different program from the plan on this page.
 *
 * So this ships as context and not as arithmetic. Turning four staff a day into
 * staff-hours and setting them beside a budget would produce a comparison that
 * looks like a coverage ratio and is not one — the two numbers describe
 * different programs, one contracted and one planned. The temptation to do that
 * division is exactly why the boundary is stated in code rather than left to
 * whoever writes the next component.
 */
export const CAPACITY_NOT_COMPARABLE = [
  "contract_requirement_not_observed_staffing",
  "different_program_from_this_plan",
  "never_a_forecast_feature_or_allocation_weight",
] as const;
