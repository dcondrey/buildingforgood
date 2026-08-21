# Judge Q&A

Short answers for the questions most likely to follow the three-minute demo.
Lead with the first sentence; add technical detail only when invited.

## Product and impact

### What problem are you solving?

Most dashboards stop at "the count fell." Still Here SD tests what produced
that headline, replays an aggregate forecast with honest historical error, and
turns it into an inspectable coverage-policy scenario.

### Who uses this, and what decision does it make?

An outreach or community-services coordinator stress-tests how a fixed
staff-hour budget could be distributed across aggregate downtown planning
areas. The system illustrates; the coordinator can edit, lock, or reject. It
does not dispatch or claim to estimate service need.

### What is the surprising insight?

On the common 261-block footprint, visually observed individuals rise from 510
to 548 (+7.5%) from January 2024 to January 2025 and appear on 111 to 136 blocks;
the result survives a two-individual threshold (78 to 94 blocks). Tents and
structures fall from 258 to 117 (−54.7%) and vehicles from 10 to 5. Under the
unchanged POST2020 multipliers, the component-derived estimate falls 22.3%:
the apparent decline is structure-driven and partly offset by more direct
observations. That challenges a simple success narrative without inferring
movement, unique people, or cause.

### Why is this better than a conventional dashboard?

It connects measurement validity to an operational consequence. Missingness,
method changes, spatial comparability, forecast error, uncertainty, policy
floors, and human overrides visibly change—or stop—the scenario.

### What would success look like in the real world?

A coordinator notices fragile evidence before reducing coverage, can explain
why each area received time, and revisits the plan when the budget, data, or
local knowledge changes. We do not claim this prototype proves service impact.

## Data and analytical method

### Is this real data?

Yes. The hackathon bundle is derived from Downtown San Diego Partnership Clean
& Safe monthly reports: 2,880 monthly area/component rows from 2017–2025 and
3,737 digitized block/date rows, including a balanced 261-block panel. The
source bundle says nothing was modeled or imputed; Still Here SD retains nulls
as missing.

### Why use the 261-block panel?

The block footprint expands from 261 to 382 blocks in 2022 when Barrio Logan,
Golden Hill, and Sherman Heights enter. Comparing raw totals across that change
would mix real change with a 46% larger observation footprint. The bundle makes
the bias visible: February 2021 to January 2023 is +191.2% on the expanded
footprint versus +95.8% on the balanced panel, a 95.4-percentage-point
overstatement. The balanced panel keeps the denominator fixed.

### Are `total`, `individual`, `tent`, and `vehicle` additive?

No. `total` is the published adjusted estimate—approximately individuals plus
1.75 times tents plus 2.03 times vehicles in the later eras. Adding total to
the components would roughly double count. We treat the verified total as
primary and components as a secondary digitization.

### Why do the spatial evidence and forecast use different measures?

They answer different questions from the strongest available lane. Spatial
component change uses separately digitized individuals, tents, and vehicles on
the balanced block panel; the time series uses verified,
multiplier-adjusted published totals for a stable six-area core. The product
labels every definition and never presents the mixed-unit sum as a population.

### How do you handle methodology changes?

We retain the period labels and multipliers, keep PRE2017 out of component
analysis, use the stable POST2020 method era for forecasting, and do not compare
post-2020 DSDP adjusted totals directly with unadjusted RTFH/PIT counts. Method
or footprint breaks are evidence limitations, not annotations we ignore.

### How do you handle missing months?

Missing stays null. It is never converted to zero or linearly imputed. Training
and backtesting skip targets without the required history, and the interface
shows gaps and can return insufficient evidence.

### Can you prove displacement?

No. We can show how component totals and block thresholds change on a stable
set of blocks. That cannot distinguish movement, housing exits, new arrivals,
changing visibility, or measurement error—and it never tracks people.

### Why not use a more sophisticated ML model?

The sample is small, seasonal, and method-sensitive. A registered seasonal-
naive baseline competes with a recent-three-observation mean and a six-
observation local linear trend under rolling-origin evaluation. A challenger
must strictly improve 2023 MAE; ties keep the baseline. Complexity that cannot
earn promotion on held-out data would be model theater.

On the 2023 promotion window, local linear scores 119.8 MAE/9.7% WAPE, the
recent-three mean 121.2/9.9%, and seasonal naive 191.3/15.6%; local linear earns
promotion by MAE, while WAPE remains a diagnostic.

### How is the forecast evaluated?

Each origin predicts using only earlier observations. The split roles are fixed:
2023 decides challenger promotion by MAE, 2024 calibrates the interval, and 2025
is the final untouched audit. We also report WAPE. For the six-area aggregate,
the selected local-linear model scores 62.8 MAE and 8.6% WAPE across eight
eligible 2025 targets; its nominal 80% interval achieves 75% empirical coverage.
That under-coverage is displayed rather than rounded into confidence. There is
no random split or future-error leakage.

### What does the prediction interval mean?

It is a range calibrated from historical out-of-sample residuals around the
next aggregate observation. It is not a probability about any individual and
not a service-demand count. Its upper bound deliberately increases planning
load when uncertainty is wider.

For the historical January 2026 replay, using information frozen at December
2025, the local-linear point is 882.5 and the finite-sample-corrected 80%
historical residual band is 769.0–996.1. It is not a live future forecast.

## Planning scenario and policy guard

### How does the planner work?

It starts with each area's historical upper bound, applies a visible user-set
0-, 4-, or 8-hour coverage-continuity floor, distributes the remaining 80-hour
budget proportionally, and uses deterministic largest-remainder rounding to
conserve whole hours exactly. The result is illustrative and human-review-only.

### Why an 8-hour minimum?

It is a transparent, configurable continuity policy for the demo—not a
scientifically optimal or universal number. Its purpose is to make the ethical
tradeoff inspectable. A real deployment must set it with outreach teams and
community stakeholders.

### Are you claiming the 8-hour scenario is fair?

No. Eight hours is a prepared demo-policy guard, not a learned, optimal, or
ethically sufficient threshold. The app exposes 0-, 4-, and 8-hour sensitivity
so continuity is an explicit policy choice. It does not claim equal outcomes,
equal need, or that geography substitutes for protected-group analysis.

### What if the floor is infeasible?

The planner returns no valid plan with reasons; it does not silently relax the
floor or exceed the budget. A human must change the budget, included areas, or
policy explicitly.

### Why show a plan without the guard?

Only as an audit. It makes the consequence of the continuity choice concrete
by showing which areas would lose coverage. The unguarded result is clearly
labeled as an audit, not a recommendation.

### Can the coordinator override the plan?

Yes. They can edit and lock an assignment, then deterministically rebalance
unlocked hours. The decision brief records the human change and keeps budget,
floor, and infeasibility visible.

### Why exclude 311 complaints from forecasting and planning?

Complaint volume measures who reports, app access, and neighborhood reporting
propensity—not the number or needs of unhoused people. Using it as demand would
encode visibility and reporting bias into the allocation. We do use it in a
separate diagnostic lane: all downtown Get It Done rows rose 9.2%, versus 50.7%
for Encampment rows and 54.8% for top-level parent requests; Encampment share
rose from 41.0% to 56.6%. The diagnostic is visible and explicitly excluded from
the forecast and planner. A matched-calendar August–January check is stronger:
all rows rise 40.9%, Encampment rows 88.1%, top-level requests 96.0%, and
Encampment share 14.2 percentage points.

### Did duplicate reports or a switch to the Mobile channel create the spike?

Not in these six-month windows. Parent filtering preserves the direction and
slightly increases the change estimate: raw Encampment rows rise 50.7%, while
top-level parent requests rise 54.8%. Parent-linked child share moves from 58.6%
to 57.5%, and Mobile share moves from 93.0% to 91.4%. Those fields do not identify
people or verified incidents, but neither sensitivity explains away the break.

### Could foot traffic or weather explain the comparison?

Neither simple check does, though neither is causal. In matched August–January
windows, paid parking transactions fall 2.4% on a fixed 1,997-pole cohort while
all downtown Get It Done reports rise 40.9%. The two January count dates both
have zero precipitation at the NOAA airport station, with highs of 62°F and
63°F. Paid curb parking is an incomplete activity proxy and same-day airport
weather misses microclimate and prior conditions, so these only weaken two
simple alternatives.

### Are 1.24, 3.24, and 1.18 “reports per person”?

No. They are raw reports per published total unit at three descriptive
checkpoints. The DSDP denominator is multiplier-adjusted visual observation in
seven published areas, including Outside Perimeter; Get It Done uses the
`DOWNTOWN` community-plan boundary. The ratio is a cross-source bias diagnostic,
not an incidence rate, population estimate, or causal result.

### Didn't the City Auditor already find this divergence?

Yes, and we cite that independent validation rather than claiming first
discovery. The audit reports the aggregate divergence and says movement cannot
be determined. Our addition is a reproducible diagnostic that tests parent-
linked children, intake-channel mix, all-platform activity, and prespecified
non-homelessness categories before carrying the measurement boundary into an
interactive, uncertainty-aware planner.

### Did you find an independent service-demand signal?

Yes, but we keep it contextual. [HCAI's pooled 2023–2024 facility file](https://data.chhs.ca.gov/dataset/hospital-encounters-for-homeless-patients)
records 78,261 emergency visits and 28,024 inpatient hospitalizations tagged
for patients experiencing homelessness at San Diego County hospitals—4.04%
and 4.26% of those encounter totals. These are encounters, not unique patients,
and HCAI's homelessness identification rule changes before 2023. Separately,
the exact St. Vincent de Paul Village Family Health Center (`306374018`)
reports 2,916 to 3,409 patients from 2022 to 2024. These show health-system and
service load, not downtown prevalence, causality, or planner demand.

### Is there external evidence that operational flags miss people?

Yes, as methodological precedent rather than local validation. An
[SSA administrative-data study](https://www.ssa.gov/policy/docs/ssb/v81n2/v81n2p1.html)
identified 810,326 disability applicants experiencing homelessness from 2007
to 2017; 20.1% were found by text mining alone rather than the structured
homeless or transient indicators. Its national, historical applicant frame is
not our estimand, but it demonstrates why construct-validity audits matter.

## Privacy, ethics, and AI

### Does the app expose block locations?

No. Raw CSVs, block identifiers, polygons, coordinates, street labels, and
record-level rows stay outside the deployed app. The browser receives only a
versioned decision artifact with aggregate evidence needed for this scenario.

### Could this be used for enforcement or encampment clearing?

That is explicitly outside the authorization boundary. The output supports
outreach-continuity review only; it does not identify sleeping locations,
people, eligibility, shelter capacity, or enforcement targets.

### Did you use AI?

Generative AI assisted research, coding, testing, and documentation during the
hackathon, with human review. No LLM runs in the product or determines evidence,
forecast values, policy constraints, or allocations; those are deterministic
and testable.

### Are aggregate data automatically private?

No. A tiny aggregate can still disclose a person. That is why the broader
pipeline includes small-cell and complementary suppression plus a fail-closed
precise-location key scan. For the prepared demo, no block-level records or
geometry ship at all.

## Engineering and readiness

### Does the demo require the internet or a backend?

No. Python produces versioned static JSON; React consumes it locally. The demo
has no login, database, live routing, live shelter feed, or runtime API. The
production build is rehearsed with Wi-Fi disabled.

### How is the result reproducible?

The pipeline is deterministic, source transformations and thresholds are in
version control, and one command regenerates the demo artifact. The artifact
records SHA-256 hashes of every raw input; tests cover contracts, time splits,
allocation invariants, privacy, byte-identical rebuilds, and the production
build.

### What happens if the generated artifact is missing on stage?

The app falls back to a clearly labeled embedded snapshot rather than attempting
a live service, and it never labels that snapshot as a freshly generated
analysis. We also retain a local production build, screen recording, and key
result images; see
[`DEMO_SCRIPT.md`](DEMO_SCRIPT.md#offline-fallback-checklist).

### What are the largest limitations?

The counts are visual sweeps, not a census of unique people; collection effort
and geographic scope changed; the block panel has only 12 dates; component
digitization has known disagreements; the forecast is an aggregate monthly
signal used only in a historical planning replay; area-level errors are noisy;
and every continuity floor needs stakeholder validation. The product surfaces
these rather than converting them into false precision.

### What would you build next?

First, co-design the floor and review triggers with outreach teams and people
with lived experience. Then add new stable-panel observations, validate the
geography and forecast prospectively, audit whether allocations create unequal
burdens or benefits, and evaluate decisions and outcomes without introducing
person-level surveillance.

## Hostile expert questions

### Isn't the 261-block panel just a cherry-picked denominator?

No blocks are selected by their counts or direction of change. Membership is
fixed by common support: a block must appear on all 12 supplied count dates.
That creates a coverage counterfactual—what remains when the footprint is held
constant—against the naive 382-block comparison. It does not create a causal
counterfactual, and we do not call it one.

### Did you cherry-pick January 2024 to January 2025 because it tells a good story?

It is the latest available same-month year-over-year pair, both dates use the
same POST2020 method, and January 2025 is the final panel date. The artifact
enumerates all seven eligible annual contrasts and two ineligible pairs; the
latest pair is also the strongest divergence, which we disclose rather than
hide. The two ineligible pairs touch January 2020's blank tent cell and would
require imputation. We make no p-value, population effect, or claim that every
interval behaves this way.

### Could more blocks show individuals just because enumerators searched harder?

Yes. A block threshold is sensitive to collection effort, visibility, and
small values. We therefore report it as a descriptive extensive-margin change,
pair the one-observation threshold with a two-observation sensitivity, hold the
footprint fixed, disclose count-effort changes, and stop short of person
movement, redistribution, or cause.

### Are you treating blocks as independent samples despite spatial autocorrelation?

No inferential model assumes block independence. The block panel is used for a
descriptive comparison of component totals and block thresholds on common
support. We make no
standard-error, significance, or generalization claim from 261 independent
units.

### How do you know the forecast comparison has no temporal leakage?

Every rolling-origin prediction is constructed from observations strictly
earlier than its target. Model error is computed only after that target is
revealed, and the interval for a target uses residuals from earlier folds only.
The tests pin this chronology and the baseline promotion rule.

### Why MAE and WAPE? Where are the confidence tests for model superiority?

MAE stays interpretable in count units; WAPE adds scale-relative context without
the instability of per-period percentage error near zero. Promotion is a
deterministic held-out performance rule, not a hypothesis test, and we make no
statistical-significance claim about model superiority. A tie or unsupported
candidate stays with seasonal naive.

### Calling the interval conformal sounds too strong under nonstationarity. What is guaranteed?

No finite-sample conditional guarantee is claimed. It is a conformal-style,
walk-forward residual interval whose calibration respects time order. Its
radius uses the finite-sample rank `ceil((n + 1) × 0.8)`, capped at `n`, over
absolute calibration errors. Time-series exchangeability remains doubtful, so
we show nominal and empirical held-out coverage; sparse or poorly covered
histories produce a warning or insufficient state, not a stronger claim.

### Why didn't you fuse every source into one latent "true homelessness" estimate?

Because the lanes do not share an estimand. Published totals are multiplier-
adjusted, block maps contain separately digitized components, PIT is a
different annual method, and
311 reflects reporting behavior. A fused latent score would hide measurement
choices inside an impressive number. We keep the rulers separate and show
where they agree or conflict.

### Why not a Hawkes process or another spatial event model?

Twelve balanced-panel dates are not credible event-history data, and the block
snapshots do not observe person transitions. A self-exciting process would add
strong timing and movement assumptions the bundle cannot identify. The common-
support decomposition answers the defensible spatial question without that
fiction.

### Why not estimate the causal effect of an ordinance or intervention?

The bundle provides no validated intervention assignment, comparison group, or
parallel-trends design, while collection effort, methods, and footprint all
change. An interrupted trend would be confounded. We reject an ordinance-
causality story until a real identification strategy exists.

### Why not use complaint data as a high-frequency leading indicator?

Because frequency does not fix construct validity. 311 measures reporting
propensity, access, duplication, and taxonomy changes. It can audit disagreement
or bias—as our visible diagnostic does—but allowing it to drive forecasts or
hours would reward who is most reported, not estimate who needs outreach.

### Isn't using the upper prediction bound an arbitrary risk preference?

Yes—it is an explicit conservative planning policy, not an estimated truth.
Because the total budget remains fixed, it changes relative continuity rather
than inventing capacity. The policy is versioned, visible in every explanation,
and can be stress-tested; a real deployment must set risk tolerance with the
decision owner.

### The 8-hour floor is arbitrary and may divert hours from higher observed load. Why use it?

It is a user-set continuity guard, not a fairness or optimality result. The app
shows 0-, 4-, and 8-hour settings, guarded and unguarded allocations, and the
opportunity cost. Eight hours is a prepared demo policy requiring stakeholder
validation; a real decision also needs severity, travel time, caseload, and
capacity.

### Is deterministic proportional allocation really optimization?

We do not sell it as sophisticated optimization. It is a transparent
constrained allocation rule with exact invariants: non-negativity, budget
conservation, visible floors, preserved locks, and deterministic rounding. For
this consequential small-data setting, auditability is a feature; added
complexity must improve a declared objective without weakening explanations.

### Where is external validation?

There is none yet, and the prototype says so. The data have internal source
verification and the software has automated analytical invariants, but the
forecast has not been prospectively evaluated and the planning policy has not
been validated with outreach teams or people with lived experience. Those are
deployment gates, not post-hoc footnotes.

### Could an aggregate allocation still cause harm?

Yes. Geography can stigmatize areas, divert scarce staff time, or be repurposed
for enforcement. The mitigations are data minimization, no precise deployed
locations, narrow outreach-only authorization, visible uncertainty, human
override, and an explicit stop before operational deployment without community
governance. They reduce risk; they do not erase it.

### Did you reuse your earlier On Record project?

No code, data, assets, or schemas were reused. We carried forward only proven
presentation discipline: a self-contained offline demo, a claim traveling with
its evidence and limits, and a fallback that does not depend on a network. Still
Here SD's analytical and application code was written for this hackathon.
