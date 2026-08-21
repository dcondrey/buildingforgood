# C-05 — Responsible-data cards (draft copy)

**Issue:** [#16](https://github.com/dcondrey/buildingforgood/issues/16) · **Track:** [C](https://github.com/dcondrey/buildingforgood/issues/30) · **Milestone:** M5
**Status:** Copy drafted ahead of the UI. #16 is blocked on #13 (spatial view) and #12 (decision shell) for rendering, but the language is not blocked and the demo needs it settled.
**Rule for every card below:** it sits adjacent to the result it describes, never behind a help link. A limitation reachable only by clicking is a limitation nobody reads.

---

## 1. Data card

**What this shows.** Monthly counts of people observed unsheltered in downtown San Diego planning areas, 2014-01 to 2022-12.

**Where it comes from.** San Diego Regional Data Library, package 7.2.3. The underlying counts are collected by Downtown San Diego Partnership Clean & Safe enumerators, who hand-mark paper maps monthly; SDRDL volunteers georeferenced and digitized those scans. Retrieved 2026-08-21. Attribution: SDRDL and DSP.

**What the numbers are not.** They are observations made by people walking routes on particular days. They are not a census, not a registry, and not a count of people who need help. Someone not seen was not counted.

**Known gaps.** Five months are missing entirely: 2014-08, 2014-09, 2015-06, 2018-11, 2019-12. Four source maps were never digitized into counts. Seventy-six maps have a hand-written total that disagrees with the sum of their digitized records, which the source documents as arithmetic error in manual summing. Day-of-month values are unreliable; only year and month are trusted.

---

## 2. Comparability card

**Read this before comparing across April 2017.** DSP began applying occupancy multipliers on 2017-04-27, counting 1.75 people per tent or structure and 1.66 per vehicle, with the vehicle factor revised to 2.03 on 2018-05-31. Before that it used 2 and 2.

This series deliberately omits those multipliers, which keeps it internally comparable across the break but means it diverges from officially published DSP totals after March 2017. **Never mix the two across that boundary.** A comparison window that spans it forces the evidence result to `insufficient_evidence` rather than producing a classification.

Three other boundary changes are carried as data, not footnotes: East Village split in 2017-04, a neighborhood rename in 2020-01, and three areas entering coverage in 2021-05.

---

## 3. Suppression card

**Small counts are withheld, and that is deliberate.** Aggregating to neighborhood and month is not anonymization. A count of one in one area in one month is a person, and local knowledge is enough to identify them.

Any published value below five is withheld and marked as suppressed. A withheld cell is **not** a zero, and the interface says so rather than drawing an empty bar.

Withholding a number is not enough on its own. If a published total and its published components leave only one possible value for the withheld cell, the suppression is decorative. The pipeline therefore withholds a second value when one alone would be recoverable, and both the pipeline and an independent check enumerate every possibility a reader could work through, escalating to withholding the whole row when the answer is still forced.

---

## 4. Model card

**Nothing here is a generative model.** Classification, forecasting, and allocation are deterministic rules. The same inputs produce the same output every run, and that is tested rather than asserted. No large language model chooses a classification, a forecast, or an hour.

**Forecast.** Seasonal-naive baseline over a 12-month season, evaluated by rolling-origin backtesting on mean absolute error and interval coverage. A candidate model replaces the baseline only when it beats it on held-out data. When no model qualifies, the product says `insufficient_forecast_evidence` rather than showing a line.

**The three evidence results are the only conclusions available:** likely improvement, possible displacement, insufficient evidence. There is no fourth, more confident option, and no probability score, because the method does not produce one.

---

## 5. Allocation card

**What the plan is.** A split of the hours you entered across the areas in scope.

**What the plan is not.** It is not an estimate of need. Allocating every available hour does not mean the need is covered; it means the hours ran out. Unmet load is shown next to the plan for that reason.

**The coverage floor.** Every included area receives a minimum number of hours before anything is distributed by forecast. This is a minimum-coverage rule, not a claim that the result is fair or just. When the floor is consuming most of the budget, the interface says so, because a floor-driven plan and a forecast-driven plan look identical otherwise.

**Complaint volume is not used.** 311 reports measure who reports: housing status, phone access, language, and enforcement attention. Routing outreach by complaint volume routes it toward complainants and away from less visible need. Complaint data cannot reach the planner, and that is enforced in the type system rather than by a check someone could delete.

**A human owns this plan.** Assignments can be locked and overridden, changes survive recomputation, and the number of assignments set by a person is disclosed on the result.

---

## 6. Limitations card

**This tool describes places and observations. It does not describe people.**

- It cannot tell you that anyone moved. When a decline in one area coincides with an increase nearby, that is two aggregate observations occurring together. No individual or group is tracked, and the two observations are not linked to the same people.
- It cannot tell you why anything changed. No causal claim is available from this data, including whether outreach, policy, weather, or enforcement had any effect.
- It carries no shelter capacity, service availability, or real-time information of any kind.
- It is not an enforcement tool. It publishes no site, address, or point location, and the plan is ordered by staff hours under a coverage floor rather than by severity.
- Counts reflect who was visible to enumerators on a route, on a day, in whatever weather.

**A disclosure about this repository.** Earlier commits contain a generated artifact published before small-cell suppression was added, and that history is public. We are naming it rather than leaving it to be found. Two things are true about it: suppression protects what the product deploys, and it does not retract what was already committed. In this case the exposure is not novel, because the upstream source package is publicly downloadable and contains point-level coordinates for every record, which is far more precise than anything we published. On non-public source data the same mistake would be a genuine breach, and the durable fix is to stop committing generated artifacts and build them at deploy time.

We are stating the boundary we chose: **suppression protects the deployed product surface, not the repository.** That call is specific to a dataset whose source is already public. It would be the wrong call for anything else.
