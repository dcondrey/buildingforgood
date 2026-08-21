# Prepared Scenario: Next-Shift Outreach Continuity

> **Superseded design record.** This provisional East Village/displacement
> scenario is preserved for audit history but is not the released demo. The
> authoritative scenario is the component-first six-area historical replay in
> [`public/generated/demo.v1.json`](../../public/generated/demo.v1.json), with
> the current narrative in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

Scenario ID: `stillhere-demo-001`

Status: Provisional pending Track A source and comparability review

Decision owner: Outreach or community-services coordinator

Last updated: 2026-08-20

## Scenario in one sentence

An outreach coordinator sees an apparent decline in an East Village aggregate
monthly observation and must decide how to distribute 80 staff-hours across the
prepared downtown geography for the next outreach shift without assuming that
the decline proves improvement or abandoning adjacent lower-visibility areas.

## Who decides what, when, and where

| Element              | Prepared scenario                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision owner       | A human outreach or community-services coordinator                                                                                                   |
| Decision             | Allocate a fixed pool of outreach staff-hours across aggregate downtown planning areas                                                               |
| Available capacity   | 80 staff-hours, entered and visibly editable in the interface                                                                                        |
| Decision horizon     | The next scheduled outreach shift, no more than seven days after the planning review                                                                 |
| Forecast horizon     | The next monthly aggregate observation period                                                                                                        |
| Observation grain    | Monthly aggregate observations by published downtown area                                                                                            |
| Candidate focus area | East Village; source-era naming and split-area records remain distinct until the boundary audit is complete                                          |
| Comparison area      | Versioned adjacent downtown areas supported by the final source geography                                                                            |
| Output               | A next-shift decision brief with evidence classification, forecast range, suggested hours, uncovered planning load, assumptions, and review triggers |

The monthly forecast supplies a relative continuity signal for the next shift.
It is not a prediction of who will be present during that shift, a service-demand
count, or a promise of operational impact.

## Why this scenario is plausible

The City of San Diego describes a monthly downtown count covering areas such as
Gaslamp, East Village, Sherman Heights, Barrio Logan, Golden Hill, and Cortez
Hill. The fallback San Diego Regional Data Library package contains monthly
geographic observations from digitized Downtown San Diego Partnership maps and
warns that source neighborhood naming can vary, including split East Village
labels.

Sources:

- [City of San Diego homelessness data and reports](https://www.sandiego.gov/homelessness-strategies-and-solutions/data-reports)
- [SDRDL Downtown Homelessness Source Package](https://data.sandiegodata.org/dataset/sandiegodata-org-downtown-homeless-source/)

These sources establish a credible study area and cadence. Track A must still
select the exact data-backed demonstration month and publish the final versioned
adjacency definition before the scenario can be frozen.

## User journey

1. The coordinator opens the prepared scenario and sees the decision horizon,
   the 80-hour budget, and the apparent decline.
2. They run **Test the drop** and inspect evidence for and against the limited
   conclusion.
3. They review the next-month forecast range, baseline comparison, missingness,
   and model limitations.
4. They generate an 80-hour plan with the minimum-coverage guard enabled.
5. They compare the guarded result with an unguarded scenario to see who would
   lose coverage.
6. They lock or override one assignment, recompute the remaining hours, and
   review unmet planning load.
7. They open the decision brief and confirm the assumptions and review triggers
   before using the recommendation in human planning.

## Limited evidence conclusions

### Likely improvement

Multiple comparable aggregate signals support a sustained decline. This label
does not prove why the decline occurred, that any person obtained housing, or
that outreach continuity can safely stop.

### Possible displacement

The selected area's aggregate decline coincides with nearby aggregate increases
strongly enough to preserve outreach continuity. This label describes a pattern
between areas; it does not claim that identified people moved from one area to
another.

### Insufficient evidence

Missing coverage, incompatible methods, unstable geography, conflicting
signals, or inadequate history prevent a responsible conclusion. The product
must show which evidence is missing or incompatible.

## Operational assumptions

| Assumption                                              | Status                                                | Owner             | Resolution path                                                                                                                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The prepared budget is 80 staff-hours.                  | Fixed for the demo; editable by the user              | Track D           | Encode in D-03 configuration; planner must accept other nonnegative budgets. A real deployment replaces it with provider scheduling records; HMIS street outreach data and CoC APRs/SPMs track encounters, not staff-hours |
| A planning shift occurs within seven days of review.    | Fixed for the demo                                    | Track D           | Encode as decision-horizon metadata, not as a forecast claim                                                                                                                                                               |
| Forecasts use the next monthly observation period.      | Fixed unless A-05 finds the history cannot support it | Track A           | Confirm in the forecast evaluation scorecard and backtest                                                                                                                                                                  |
| East Village is the candidate focus area.               | Provisional                                           | Track A           | Confirm source coverage, naming, and a defensible apparent-decline period in A-01 through A-03                                                                                                                             |
| Split East Village labels can be combined.              | Not assumed                                           | Track A           | Combine only with documented boundary equivalence; otherwise retain separate areas                                                                                                                                         |
| Adjacent areas are known.                               | Unresolved                                            | Track A / Track D | Publish a versioned adjacency file after the source and boundary audit                                                                                                                                                     |
| Eight hours is an appropriate neighborhood floor.       | Provisional planner scenario                          | Track C           | Test feasibility and document the final floor in C-03; never weaken it silently                                                                                                                                            |
| Outreach time can be allocated in whole hours.          | Fixed for the MVP                                     | Track C           | Preserve the budget after deterministic rounding                                                                                                                                                                           |
| Travel burden can be approximated without live routing. | Provisional                                           | Track C           | Use documented aggregate travel bands or equal burden if defensible inputs are unavailable                                                                                                                                 |
| Complaint volume is not a demand input.                 | Fixed                                                 | All tracks        | Tests must prove 311 values cannot change planning load or allocation                                                                                                                                                      |

## Review triggers

The coordinator must reconsider the recommendation when:

- a new monthly observation arrives;
- the available staff-hour budget changes;
- an area becomes missing or methodologically incomparable;
- the forecast interval widens beyond the configured warning rule;
- the fairness floor becomes infeasible;
- local operational knowledge contradicts the generated assumptions; or
- a source, boundary, or collection-method revision changes the evidence.

## What the recommendation authorizes

- A human discussion about relative outreach continuity for the next shift.
- Review of evidence, uncertainty, fairness constraints, and uncovered planning
  load.
- A coordinator-controlled lock or override followed by deterministic
  recomputation.

## What the recommendation does not authorize

- Tracking or inferring the movement, identity, condition, or eligibility of a
  person.
- Enforcement, citation, clearing, surveillance, or service-denial decisions.
- A causal claim about a policy, program, or observed decline.
- A statement about live shelter capacity or availability.
- An automatic operational decision without coordinator review.

## Handoffs and review state

- D-03 / issue #2 consumes the fixed scenario fields and represents every
  provisional or unresolved field explicitly.
- C-03 / issue #14 consumes the budget, time increment, provisional floor,
  travel-burden rule, and review-trigger requirements.
- A-01 through A-03 confirm the exact source coverage, neighborhood naming,
  demonstration month, and adjacency version.
- B-01 uses this card as the source for the storyboard and content hierarchy.

Required reviews before this scenario is marked final:

- [ ] Track A confirms source coverage, exact period, naming, and adjacency.
- [ ] Track C confirms planner feasibility and explanation requirements.
- [ ] Track B confirms the complete journey can be represented without hidden
      assumptions.
- [ ] Track D records the final decisions in the versioned contract.
