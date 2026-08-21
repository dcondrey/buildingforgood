# C-01 — Red-team review: claims, harms, and misuse risks

**Issue:** [#23](https://github.com/dcondrey/buildingforgood/issues/23) · **Track:** [C — Planning & Safeguards](https://github.com/dcondrey/buildingforgood/issues/30)
**Status:** First pass complete. A short second pass is required after the integrated interface exists (per #23 dependencies).
**Reviewer:** Lucas Cooper-Bey · **Date:** 2026-08-20
**Method:** Adversarial reading of `README.md` and `DEVELOPMENT_PLAN.md` against the perspective of people who could be harmed by the product, not of people who want it to succeed.

---

## 0. Why this review exists

Still Here SD publishes place-level statements about where unsheltered people were observed, and then converts those statements into where staff get sent. That is a *targeting* artifact whether or not it is designed as one. Every mitigation below exists because the same output that helps a coordinator preserve outreach continuity also helps someone else decide where to send enforcement.

The product's defense is not that it is well-intentioned. It is that its published data is too coarse to act on individually, its claims are too limited to launder into causation, and its recommendations are visibly human-owned.

---

## 1. Misuse and harm checklist

Each row is a class of harm the product must be tested against, not a feature.

| # | Harm class | The specific risk here | Primary control | Owner issue |
|---|---|---|---|---|
| H1 | **Privacy / re-identification** | Neighborhood counts small enough to identify a specific person or camp; precise coordinates surviving into the static bundle | Deny-list scan + small-cell suppression | #7 |
| H2 | **Stigmatization of geography** | A neighborhood is rendered as a permanent "problem area", affecting property, policing, and services | Language boundary + observation-vs-condition framing | #16 |
| H3 | **Surveillance repurposing** | Output used to monitor where people relocate over time | Aggregate-only publication; no trajectory or movement modeling | #7, #8 |
| H4 | **Enforcement targeting** | Plan used as a sweep schedule instead of an outreach schedule | Explicit non-goal + no enforcement-usable precision | #16, #7 |
| H5 | **Complaint bias laundering** | 311 volume treated as need, so housed complainants steer outreach hours | Hard exclusion of 311 from planning load, proven by test | #14 |
| H6 | **False precision** | Hour allocations to the decimal implying knowledge the data does not support | Rounding policy + visible uncertainty reserve + unmet load | #14, #15 |
| H7 | **Automation bias** | Coordinator defers to the number because it came from a model | Locks/overrides, "Why this amount?", disclosed human changes | #15 |
| H8 | **Causal overclaim** | "Outreach caused the decline" / "the ordinance worked" | Three limited labels only; no causal vocabulary anywhere | #8, #16 |
| H9 | **Live-capacity overclaim** | Read as "there are beds in X tonight" | No shelter-capacity data ships; explicit disclaimer | #16 |
| H10 | **Fairness washing** | The word "fairness" implies the allocation is just, when it only enforces a coverage floor | Name the constraint literally, not morally | #14, #15, #16 |
| H11 | **Provenance decay** | Screenshot circulates without dates, sources, or limitations | Assumptions travel with every export and card | #16 |
| H12 | **Comparability break misread** | Pre/post-March-2017 occupancy-multiplier change read as a real trend change | Comparability status is product data and blocks classification | #8 |

---

## 2. Red-team scenarios

Twelve scenarios that attempt to push the product past its stated purpose. Each has a finding of **PROTECTED** (the design already refuses), **MITIGATION NEEDED** (must be implemented), or **NON-GOAL** (explicitly out of scope and must be stated as such).

Severity is the harm if the scenario succeeds: **S1** catastrophic/irreversible to a person, **S2** serious, **S3** reputational or interpretive.

---

### R-01 — "Where did the people from East Village go?"
**Attempt:** A user reads a decline in one neighborhood plus an increase in an adjacent one as tracking a group of identifiable people who moved.
**Finding:** MITIGATION NEEDED · **Severity: S1**
**Rationale:** `possible_displacement` is a statement about two aggregate observations coinciding. It is one preposition away from a movement claim, and the demo narrative is the most likely place that slip happens. The classification label itself is the attack surface.
**Mitigation:** The evidence panel must state, adjacent to the label, that no individual or group is tracked and that the two observations are not linked to the same people. Demo script is bound by the launch-blocking list in §4.
**Owner:** Lucas · **Handoff:** #8 (evidence text), #16 (card + disclosure)

---

### R-02 — "Give me the plan as a sweep schedule."
**Attempt:** A user with enforcement authority exports the allocation and uses ranked neighborhood hours as a prioritized enforcement route.
**Finding:** NON-GOAL, partially PROTECTED · **Severity: S1**
**Rationale:** The product cannot technically prevent a screenshot being repurposed. What it can do is refuse to ship the resolution that makes enforcement efficient (no points, no camps, no sites) and refuse to rank neighborhoods by "need" in a way that reads as a target list. Ranking by *allocated staff hours* under a coverage floor is materially less enforcement-usable than ranking by *estimated people*, because the floor deliberately flattens the ordering.
**Mitigation:** Publish an explicit non-goal statement in the allocation card: this plan is not an enforcement instrument, contains no site-level location, and its ordering is shaped by a coverage floor rather than by severity. Do not add a "priority rank" column.
**Owner:** Lucas · **Handoff:** #16 (allocation card), #7 (resolution ceiling), #14 (no severity rank in output)

---

### R-03 — "Sort neighborhoods by complaints so we go where people are upset."
**Attempt:** 311 volume is surfaced as a demand signal, or a stakeholder asks for it to be weighted in.
**Finding:** PROTECTED by design, needs a proving test · **Severity: S2**
**Rationale:** 311 measures who reports — a function of housing status, smartphone access, language, and enforcement attention. Weighting it routes outreach toward complainants and away from less-visible need. This is the single most likely well-meaning request to break the product.
**Mitigation:** #14 must carry a test that fails if 311 volume can influence planning load through any path, including indirectly via travel burden or a tiebreak. Not a code comment — an assertion.
**Owner:** Lucas · **Handoff:** #14 (exclusion test), #16 (state the exclusion and why)

---

### R-04 — "The count dropped 40% — outreach is working."
**Attempt:** A decline is read as programmatic success, in the demo or by a judge.
**Finding:** MITIGATION NEEDED · **Severity: S3 (interpretive), escalates to S2 if it drives funding)**
**Rationale:** The product's whole thesis is that a lower count is an observation, not an outcome. `likely_improvement` is nonetheless the label most likely to be quoted without its qualifier.
**Mitigation:** Every classification renders with its counter-evidence in the same visual block, never behind a disclosure. `likely_improvement` copy must name what it does *not* establish. No causal verbs — see §4.
**Owner:** Lucas · **Handoff:** #8 (reasons-against always populated), #16 (copy audit)

---

### R-05 — "Show me the exact locations so the team knows where to park."
**Attempt:** An operationally reasonable request for point-level detail — the most sympathetic path to the worst outcome.
**Finding:** NON-GOAL, PROTECTED by #7 · **Severity: S1**
**Rationale:** Point locations of unsheltered people are the highest-harm field in this domain. The request is legitimate for outreach and catastrophic if the artifact leaves the room. The boundary must be structural, not editorial.
**Mitigation:** Deny-list scan blocks coordinates, addresses, and point identifiers in every deployable file *and* the production bundle and source maps. Aggregate boundary polygons are the only permitted geometry. Answer in-product: this tool plans coverage, not stops.
**Owner:** Lucas · **Handoff:** #7 (scan + fixtures)

---

### R-06 — Small-cell re-identification
**Attempt:** A neighborhood reports a count of 1–3 in a month. Combined with local knowledge, that identifies a specific person or encampment.
**Finding:** MITIGATION NEEDED — **gap found in the current plan** · **Severity: S1**
**Rationale:** The plan's privacy control is a deny-list for precise-location *fields*. A deny-list does not catch a legitimately-shaped aggregate whose value is small enough to be a person. Aggregation is not anonymization.
**Mitigation:** Add small-cell suppression to #7: counts below a documented threshold are published as suppressed, not as a number, and the suppression is visible in the UI as a data-quality state rather than hidden as a zero. Suppressed cells must not be recoverable by subtraction from a published total.
**Owner:** Lucas · **Handoff:** #7 (rule + fixtures), #16 (suppression is disclosed, not silent)

---

### R-07 — "Round the hours to the minute so the schedule is exact."
**Attempt:** Precision is requested for operational convenience, implying the underlying estimate supports it.
**Finding:** MITIGATION NEEDED · **Severity: S3**
**Rationale:** Hour allocations derive from the *upper* bound of a forecast interval plus reserves. Sub-hour precision misrepresents that chain. The number's format is itself a claim about certainty.
**Mitigation:** Documented time increment (recommend 0.5h) applied as policy, with the increment named in the allocation card. Unmet planning load displayed alongside every plan so a full budget never reads as full coverage.
**Owner:** Lucas · **Handoff:** #14 (rounding policy), #15 (unmet load always visible)

---

### R-08 — "The model decided, so we followed it."
**Attempt:** Automation bias — the coordinator defers, and accountability evaporates into the tool.
**Finding:** MITIGATION NEEDED · **Severity: S2**
**Rationale:** A confident allocation table is more authoritative than the evidence behind it. If human changes are silently absorbed on recompute, no one owns the decision.
**Mitigation:** Locks and overrides survive recomputation; human changes are preserved *and disclosed* in the decision result ("2 of 6 assignments set by coordinator"). Per-neighborhood "Why this amount?" is adjacent, not remote. The decision brief names a decision owner.
**Owner:** Lucas · **Handoff:** #15 (locks, disclosure), #16 (AI-disclosure card)

---

### R-09 — "Which shelters have beds tonight?"
**Attempt:** The forecast is read as live capacity or availability.
**Finding:** NON-GOAL, PROTECTED · **Severity: S2**
**Rationale:** No capacity data enters the system. The harm is a person being sent somewhere on the strength of a number this product never made.
**Mitigation:** Limitations card states plainly that the product carries no shelter-capacity, service-availability, or real-time data, and that forecasts describe aggregate observation ranges, not people served or beds open.
**Owner:** Lucas · **Handoff:** #16 (limitations card)

---

### R-10 — "Is this generative AI? What did the AI conclude?"
**Attempt:** A judge or user attributes classification/forecast/allocation to an LLM, or a teammate quietly adds one for copy generation.
**Finding:** MITIGATION NEEDED · **Severity: S3**
**Rationale:** Classification, forecasting, and allocation are deterministic rules. If that is not stated, the outputs inherit an unearned aura and an unearned suspicion at the same time.
**Mitigation:** AI-disclosure card states that no generative model determines classification, forecasting, or allocation, and names anything a model *did* touch (e.g. drafted prose reviewed by a human), if applicable. Determinism is testable: repeated runs on the frozen scenario produce identical output.
**Owner:** Lucas · **Handoff:** #16 (AI disclosure), #11 (frozen scenario determinism)

---

### R-11 — "This neighborhood is always the worst."
**Attempt:** Repeated high allocations render a place as permanently degraded; the map becomes the stigma.
**Finding:** MITIGATION NEEDED · **Severity: S2**
**Rationale:** Choropleth intensity reads as a property of the place, not of the observation process. Areas with better data collection look worse, which inverts the truth.
**Mitigation:** Spatial view encodes *observation and its uncertainty*, not severity; wide-interval and low-completeness areas render as an explicit uncertainty state rather than as a low value. Meaning never carried by color alone. Copy says "observed", never "has".
**Owner:** Lucas · **Handoff:** #13 (uncertainty states — Track B), #16 (copy audit)

---

### R-12 — Comparability break read as a trend
**Attempt:** The post-March-2017 occupancy-multiplier change produces an apparent step change that reads as a real decline or increase.
**Finding:** MITIGATION NEEDED · **Severity: S2**
**Rationale:** A methodology change that looks like an outcome is the highest-credibility failure available to this product, and the one a knowledgeable judge will probe first.
**Mitigation:** Comparability status is carried as product data, not a footnote. A comparison window spanning the break must force `insufficient_evidence` rather than classify. The UI must say the periods are not comparable, in the result panel.
**Owner:** Lucas · **Handoff:** #8 (classification guard), #16 (warning surface)

---

## 3. Summary of findings

| ID | Finding | Severity | Handoff | Resolved? |
|---|---|---|---|---|
| R-01 | MITIGATION NEEDED | S1 | #8, #16 | Open |
| R-02 | NON-GOAL / partial | S1 | #16, #7, #14 | Open |
| R-03 | PROTECTED, needs test | S2 | #14, #16 | Open |
| R-04 | MITIGATION NEEDED | S3→S2 | #8, #16 | Open |
| R-05 | NON-GOAL / PROTECTED | S1 | #7 | Spec'd in C-02 |
| R-06 | **MITIGATION NEEDED — new gap** | S1 | #7, #16 | Spec'd in C-02 |
| R-07 | MITIGATION NEEDED | S3 | #14, #15 | Spec'd in C-03 |
| R-08 | MITIGATION NEEDED | S2 | #15, #16 | Open |
| R-09 | NON-GOAL / PROTECTED | S2 | #16 | Open |
| R-10 | MITIGATION NEEDED | S3 | #16, #11 | Open |
| R-11 | MITIGATION NEEDED | S2 | #13, #16 | Open |
| R-12 | MITIGATION NEEDED | S2 | #8, #16 | Open |

**Unresolved high-severity (S1) findings blocking release:** R-01, R-02, R-06. R-05 is spec'd and implemented in `scripts/privacy_scan.py`; it closes when the scan runs in CI against real generated artifacts.

**New gap this review surfaced:** R-06 small-cell re-identification. The development plan's privacy control was field-based only. Aggregation alone does not anonymize a count of one. This has been added to the C-02 boundary spec as a blocking rule.

---

## 4. Launch-blocking claim checklist

These must not appear in the interface, exports, README, or the spoken demo. Any one of them is a release blocker.

**Individual claims**
- [ ] Any phrasing that a person, group, or camp *moved*, *relocated*, *was displaced to*, or *ended up in* a place
- [ ] Any count described as "people we can find" or otherwise implying a locatable roster
- [ ] Any point, address, site, or camp-level location

**Causal claims**
- [ ] "caused", "because of", "due to", "resulted in", "drove", "worked", "reduced homelessness"
- [ ] Attributing a change to outreach, policy, enforcement, weather, or any intervention
- [ ] "proves", "shows that", "confirms" applied to a classification

**Enforcement claims**
- [ ] Any framing of the plan as a priority, target, hotspot, or sweep list
- [ ] "clear", "cleanup", "remove", "abatement" applied to places or people

**Capacity and service claims**
- [ ] Any statement about beds, shelter availability, service capacity, or real-time status
- [ ] "will need N beds" or any conversion of a forecast into required resources beyond staff hours

**Precision and demand claims**
- [ ] Complaint volume described as need, demand, severity, or a proxy for either
- [ ] Point estimates presented without their interval
- [ ] A full budget presented as full coverage (unmet load must be visible)
- [ ] Probability or confidence percentages the method does not produce

**Framing**
- [ ] "fair" or "equitable" used to describe the allocation as a moral property — say "minimum-coverage floor"
- [ ] Any number shown without its date, source, or comparability status reachable in one step

---

## 5. Second pass — 2026-08-21, Lucas Cooper-Bey

Ran the §4 launch-blocking checklist against every product-facing file that exists now: `README.md`, `docs/product/UI_STORYBOARD.md`, `docs/product/PREPARED_SCENARIO.md`, the C-05 card copy, `config/decision.v1.json`, and the planner panel strings.

**Clean:** causal claims, enforcement framing, capacity and service claims, complaint-as-demand, probability language the method does not produce, and fairness used as a moral property. No hits in any of those categories.

**Two hits, both R-01, both fixed.** The README's own Language boundaries section forbids movement claims, and two lines in the same file broke it by applying "displaced" to a *decline* rather than to people:

| Where | Was | Now |
|---|---|---|
| Comparison table | "supported, displaced, or uncertain" | "supported, coincides with nearby aggregate increases, or is unresolved" |
| **Working pitch** | "an apparent improvement is supported, displaced, or simply uncertain" | "supported by comparable evidence, coincides with nearby aggregate increases, or is simply uncertain" |

The second one is the finding that matters. R-01 predicted that the slip would happen in the demo narrative, because `possible_displacement` is one preposition away from a movement claim and the pitch is where compression is strongest. It was already sitting in the working pitch, which is the sentence most likely to be spoken aloud to judges. A grammatical reading says the *improvement* was displaced; a listener hears that people were.

The same line also said the plan "refuses to hide who could be left behind." That reads as a claim about people the product cannot make, and it is now "refuses to hide what it cannot cover," which is what unmet load actually measures.

**Note on method:** the banned-word grep found nothing in the categories where the risk is a *word*. Both real hits were in categories where the risk is a *construction*, and they were only visible by reading every displacement-adjacent sentence in full. A checklist run as a grep would have passed this file.

**Still owed:** a third short pass once #12 and #13 render real interface copy, and once #24's demo narrative is written down rather than improvised.

## 6. Second-pass trigger

Repeat a short pass (§4 audit + R-01, R-04, R-11 re-test against real copy) once #12 and #13 land and the demo narrative in #24 exists. Log the result in this file with a new date and reviewer line.
