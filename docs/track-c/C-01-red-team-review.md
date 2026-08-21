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

**Status as of 2026-08-21, after the second pass and the #45 merge.** Re-checked by running the evidence rather than by re-reading the row. Four rows had gone stale, all in the direction of showing resolved work as open, which makes a tracker something people stop reading.

| ID | Finding | Sev | Handoff | Status | Evidence |
|---|---|---|---|---|---|
| R-01 | MITIGATION NEEDED | S1 | #8, #16 | **Resolved (§7)** | The shipped shell renders the disclaimer beside every classification: "These are on-site observations: they cannot say who moved where, or why", and the copyable brief carries the same boundary. Demo script's only movement-adjacent spoken line is a negation |
| R-02 | NON-GOAL / partial | S1 | #16, #7, #14 | **Resolved (§7)** | The shipped shell renders "Never authorized: person tracking, causal claims, enforcement, eligibility decisions, or automatic dispatch" in the review step and in the brief; the allocation list has no priority-rank column; the no-minimum view is labeled comparison-only |
| R-03 | PROTECTED, needs test | S2 | #14, #16 | **Resolved** | Complaint volume unrepresentable in the planner input type; guard recurses objects and arrays; 5 tests |
| R-04 | MITIGATION NEEDED | S3→S2 | #8, #16 | **Resolved (§7)** | The shipped evidence panel decomposes the drop into components with no causal attribution; the script says the tool "cannot prove movement or policy impact" |
| R-05 | NON-GOAL / PROTECTED | S1 | #7 | **Resolved** | Deny-list, geometry-type rule, and grain rule implemented; 7 declared planning areas scan clean, 382 source blocks raise 1529 findings |
| R-06 | MITIGATION NEEDED (new gap) | S1 | #7, #6, #16 | **Resolved** | Suppression in the emitter (#45) plus small-cell and recoverability rules in the scan; 0 exact recoveries, 0 pinned cells, 0 unique multisets on the real artifact |
| R-07 | MITIGATION NEEDED | S3 | #14, #15 | **Resolved** | 1-hour increment fixed in the contract; unmet load on every allocation and rendered in the panel |
| R-08 | MITIGATION NEEDED | S2 | #15, #16 | **Resolved (§7)** | Locks survive recomputation and the coordinator-set count is disclosed, both under test; the shipped drawer renders "AI use: Development assistance only; no AI runs in the product or determines evidence, forecasts, or allocations" |
| R-09 | NON-GOAL / PROTECTED | S2 | #16 | **Resolved (§7)** | The shipped shell renders the limitation cards (Boundary card, Model card, Claim limits) and the never-authorized list; "Which shelters have beds tonight?" has no answering surface anywhere in the product |
| R-10 | MITIGATION NEEDED | S2 | #14, #15, #16 | **Resolved (§7)** | `floor_dominance_warning_threshold` fixed at 0.25 and the panel warns; the deployed shell contains zero occurrences of "fair" in any rendered string |
| R-11 | MITIGATION NEEDED | S2 | #13, #16 | **Resolved (§7)** | The shipped spatial view encodes change in observed units with neutral captions ("not a count of people"), no severity ranking, and now a tabular equivalent whose state words replace color |
| R-12 | MITIGATION NEEDED | S2 | #8, #16 | **Resolved (§7)** | The shipped comparison is same-month, same-method (POST2020 both sides) and says so beside the result; the module-level guard is documented and confirmed in docs/project/DROP_TEST_RULES.md |

**As of the third pass (§7): no unresolved finding remains at any severity.** The interface copy R-01 and R-02 were waiting on shipped in the released shell and holds the line. **R-06 is closed**, which matters because it was the gap this review added to the plan rather than inherited from it.

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

Repeat a short pass (§4 audit + R-01, R-04, R-11 re-test against real copy) once #12 and #13 land and the demo narrative in #24 exists. Log the result in this file with a new date and reviewer line. **This trigger fired when the release shipped; the resulting pass is §7.**

## 7. Third pass — 2026-08-21, run in the Track B working session (tool-assisted full read)

Scope: the surfaces the second pass could not reach because they did not exist yet. Every rendered string in the deployed shell `app/src/App.tsx` (read in full, all 2,200+ lines, not grepped), the spoken lines and stage directions of `docs/product/DEMO_SCRIPT.md`, `docs/product/JUDGE_QA.md`, and the new `docs/product/PRODUCT_COPY.md`. Method follows the §5 lesson: the banned-word grep ran first for navigation, then every displacement-, causality-, and location-adjacent sentence was read in full, because the risk is a construction, not a word.

**Clean categories, same as the second pass:** causal claims, enforcement framing, live-capacity claims, complaint-as-demand, probability language the method does not produce, and fairness as a moral property ("fair" does not occur in the shell at all).

**R-01 re-test.** The classification result renders with its disclaimer adjacent, not behind a control: "These are on-site observations: they cannot say who moved where, or why." The brief repeats the boundary in its final line. The demo script's only movement-adjacent spoken sentence is a negation ("this cannot prove movement or policy impact"). No sentence applies "displaced", "moved", or "went" to people. Resolved.

**R-02 re-test.** "Never authorized: person tracking, causal claims, enforcement, eligibility decisions, or automatic dispatch" renders in the review step and travels in the copyable brief. The allocation list carries no priority ranking, and the no-minimum view is labeled "Comparison view, not a recommendation". Resolved.

**R-04 re-test.** The shell's framing decomposes the drop instead of celebrating it ("Fewer tents, or fewer people?"); nothing attributes the change to outreach or policy. Resolved.

**R-11 re-test.** The spatial view encodes change in observed units, captioned "schematic, not to scale · not a count of people", with no severity ordering. Each map now has a tabular equivalent whose state words (More observed units / Fewer observed units / Below minimum / Minimum met / Human lock / No recent observation) carry the meaning without color. Resolved.

**Adjudicated, previously flagged as unaudited:** the shell's "261 blocks" framing (hero, panel notes, threshold cards). These are aggregate statistics over a fixed panel; no specific block, address, coordinate, or geometry is named or drawn anywhere, the drawer states "No block records or geometry", and the bundle privacy scan reports 0 findings against `app/dist`. PROTECTED under the §4 location rule.

**One construction reviewed and kept:** the plan footer's "Nh moved to minimums and locks" applies "moved" to hours with hours as the explicit subject; no person-reading is available. Kept.

**Verdict:** the §4 launch-blocking checklist passes against every surface that ships. No open finding remains in §3. The standing rule stays: any new rendered copy, especially anything compressing `possible_displacement` into a headline, gets a full-sentence read before release, not a grep.

**2026-08-21 update (interactive neighborhood map).** The spatial view was upgraded from labeled rectangles to simplified real neighborhood boundaries, derived by dissolving the organizer block grid to the six-area level (cell-quantized outlines, viewBox units, no lat/lon values in the bundle). This changes two records above, neither adversely:

- **R-11:** the caption now reads "simplified neighborhood boundaries, aggregate values only · not a count of people". The tabular equivalents and non-color state words are unchanged; the map areas are additionally keyboard-selectable buttons feeding a text detail panel, which strengthens the non-color path. Still resolved.
- **The §4 location adjudication:** "no geometry is drawn anywhere" no longer holds as stated; neighborhood-level boundary polygons are now drawn. C-02 §3 explicitly permits aggregate boundary polygons ("boundary polygons are legitimate coordinates"); block-level geometry and precise observation locations still do not ship, the in-app disclosure copy was tightened to say exactly that, and the bundle privacy scan reports 0 findings against the rebuilt `app/dist`. Still PROTECTED.

**2026-08-21 update (scenario workbench and intervention assumption explorer).** Two new working surfaces added rendered strings; every one received the full-sentence read. The workbench strings are procedural (save/load/compare/delete of policy settings; "saved only in this browser"; per-area "±Nh vs saved" with hours as the explicit subject). The assumption explorer is the sensitive surface, reviewed against §4's causal, displacement, and enforcement rules: it names the action under audit ("What if <Area> were cleared?") without endorsing it; every displacement-adjacent sentence has "planning load" or "assumption" as its subject, never people; the epistemic boundary is adjacent in each surface, not behind a control ("the counts cannot show who moves where or why", "assumed, not observed", "not a prediction and does not endorse the action"), and the same disclosure travels in the copyable brief with the City Auditor citation; "Clearing an area adds no shelter capacity" is an evidence-grounded negative, not a prediction. One guide draft construction ("the politically easy answer is a clearance") was rewritten to "the most reached-for action" before release — editorial claims about politics are outside what the data carries. The explorer removes modeled load only via the user's explicit slider value, so no rendered number implies an observed reduction. PROTECTED, with the standing condition that the assumption disclaimer must remain adjacent to every surface that shows assumption-adjusted numbers (banner, map caption, detail hint, brief) — a future edit that separates them reopens R-01.

**2026-08-21 update (hands-on guide rework).** The Guide demo was rebuilt from four narrated captions into eight titled steps with tasks and artifact-interpolated narration; per the standing rule, every new rendered string received a full-sentence read in this pass, not a grep. The copy reuses already-adjudicated constructions ("People were seen in more places, not fewer"; hours as the explicit subject of every allocation sentence; "an audit … never a recommendation"; the closing boundary line "nothing here tracks people, infers movement, or dispatches staff automatically"). One draft construction — "some neighborhoods drop to almost nothing" — was rewritten before it ever rendered to "some neighborhoods are left with almost nothing", matching the approved policy-lens phrasing and closing the available person-reading. The new chrome strings (Your turn, Do it for me, Play/Pause, "Done — press Next to continue.") are procedural and carry no population claim. One rule moved from prose into code: stopping the guide while the 0h comparison view is showing now restores the coverage minimum programmatically, enforcing the demo script's "never leave the unguarded view on screen" instruction. No new finding.
