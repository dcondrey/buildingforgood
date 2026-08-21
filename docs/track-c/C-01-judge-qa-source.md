# Track C source material for the judge Q&A (#24)

**Not the deliverable.** #24 owns the three-minute narrative and the Q&A; this is the Track C half handed over, so nobody has to reconstruct the numbers at 1pm. Every figure here is reproducible with the command shown.

The audience is a responsible-data-science nonprofit. Assume the privacy and fairness questions are the hard ones and that vague answers cost more than admissions.

---

## "How do you protect the people in this data?"

Three layers, and the honest framing is that the first one is not enough on its own.

1. **Nothing precise ships.** Coordinates, addresses, parcel and record identifiers, block ids, and bounding streets are on a deny-list enforced on every build. The source carries point-level state-plane `x`/`y` for every record; none of it reaches the deployment.
2. **Aggregation is not anonymization, so counts are suppressed too.** A neighbourhood-month count of one is a person. Any published value below five is withheld.
3. **Withholding a number does not hide it if arithmetic puts it back.** If the total and the published siblings leave only one possible value, the suppression is decorative. Both the pipeline and an independent scan enumerate every value assignment the policy could have produced and escalate to withholding the whole row when the answer is still forced.

**Numbers:** 306 cells were below threshold in the first real artifact. The published artifact now suppresses 15 whole rows, and an independent attack returns 0 exact recoveries, 0 pinned cells, 0 unique multisets across 708 rows.

```
python -m stillhere_pipeline.privacy --root .
```

## "What did you get wrong?"

Answer it directly; the recovery is the interesting part.

- **The deny-list passed a count of one.** Field-based privacy checks do not see a legitimately-shaped aggregate whose *value* identifies someone. Found in a red-team pass, not by the scan.
- **The first suppression fix was recoverable by subtraction.** A lone withheld cell equals total minus the published siblings.
- **The second fix still leaked.** With two withheld cells, a remainder of 2 pins both at exactly 1. Three rows in a real artifact were fully reconstructable.
- **A verification said "clean" when it was not.** The attack that certified the second fix tested only the one-withheld-cell case. It reported zero while seven rows were recoverable.

**The pattern worth naming:** every one of those was a check that ran, reported something, and was trusted to mean more than it did. That is why the emitter and the scan now enforce the same written policy independently, and why they cite one shared document.

## "Isn't this just a map of where homeless people are?"

No, and the design refuses that on purpose.

- Only aggregate planning-area geometry is publishable. Point, MultiPoint and LineString geometries are refused outright, and a boundary file has to declare an approved versioned geography. A 382-polygon block file raises 1,529 findings; the 7 planning areas scan clean.
- The output is **staff hours**, not estimated people, and rows are ordered by area name. Ranking by hours under a coverage floor is deliberately flatter than ranking by severity, which makes it materially less usable as a target list.
- Enforcement use is a stated non-goal in the product, not only in the README.

## "How do you know the plan is fair?"

Do not accept the word. The honest answer is that it is not a fairness claim.

- The constraint is a **minimum-coverage floor**: every included area receives at least 6 hours before anything is distributed by forecast. That is a coverage rule, and calling it fairness would be overclaiming.
- The plan shows what an unguarded proportional split would have given each area, and how many hours the floor moved away from it, so the trade is visible rather than asserted.
- When the floor is deciding most of the plan, the interface says so. Below a 25% discretionary share a floor-driven plan is indistinguishable from a forecast-driven one, and that is exactly when a coverage rule starts doing the work people think the model is doing.

## "You used 311 complaints, so aren't you just following the loudest neighbourhoods?"

311 measures who reports: housing status, phone access, language, and enforcement attention. Routing outreach by complaint volume sends staff toward complainants and away from less visible need.

**It cannot reach the planner.** Complaint volume has no representation in the planner's input type, so it cannot be weighted by accident, and a guard recursively rejects any complaint-shaped field anywhere in artifact JSON. 311 is used only as a disagreement diagnostic. Five tests cover this.

## "Can you tell where people went?"

No. The product supports three limited conclusions and displacement is a statement about two aggregate observations coinciding, not about people moving. No individual or group is tracked, and the two observations are never linked to the same people.

This is the answer most likely to slip under time pressure. A movement claim was found sitting in our own working pitch during a second red-team pass and removed.

## "Is this AI? What did the model decide?"

No generative model determines classification, forecasting, or allocation. All three are deterministic rules, and repeated runs on the frozen scenario produce identical output, which is tested rather than asserted.

## "What are the limitations?"

Lead with the one nobody asked about.

- Counts are what enumerators saw walking routes on particular days. Someone not seen was not counted.
- Five months are missing entirely; four source maps were never digitized; 76 maps have a hand-written total disagreeing with their digitized records.
- A methodology break in April 2017 makes comparisons across it invalid; a window spanning it forces `insufficient_evidence` rather than a classification.
- No shelter capacity, service availability, or real-time data of any kind.
- **Volunteer the git-history disclosure.** An artifact published before suppression is still readable in this repository's history. It is not a new exposure, because the upstream source package is public at point-level precision, but suppression protects what the product deploys and does not retract what was already committed. On non-public data that would be a real breach, and the durable fix is to stop committing generated artifacts.

## What must not be said

The full launch-blocking checklist is §4 of `C-01-red-team-review.md`. The four that matter most when speaking:

1. Never that people, groups, or camps **moved**, **relocated**, or **were displaced to** anywhere.
2. Never that anything **caused** a change, including outreach, policy, or enforcement.
3. Never **priority**, **hotspot**, **target**, or **sweep** about the plan.
4. Never **beds**, **capacity**, or anything implying real-time service availability.

A grep will not catch these. Both real violations found so far were constructions rather than banned words, and the checklist passed the file mechanically. Read the script aloud and ask what a listener hears.
