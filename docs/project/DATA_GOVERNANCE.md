# Data governance

This document is for the person who has to sign off on running this tool
inside an organization: what data it takes in, what it puts out, what it
structurally cannot put out, and what obligations transfer to you when you
adopt it. It is deliberately specific. Where a rule is enforced by code, the
file and the constant are named so you can read the enforcement rather than
trust the description.

Two companion documents cover adjacent ground and are not repeated here:
[`SECURITY.md`](../../SECURITY.md) for what a vulnerability means in a system
with no backend, and
[`docs/policy/small-cell-suppression.md`](../policy/small-cell-suppression.md)
for the suppression policy itself, which this document summarizes but does not
supersede. The policy document is the authority.

## 1. The shape of the system

Still Here SD has two halves that never run at the same time.

**The pipeline** (`pipeline/`, Python) runs offline, on a maintainer's
machine, against source files in `data/raw/`. It reads block-level and
record-level source data. It produces exactly one deployable artifact,
`public/generated/demo.v1.json` (schema `stillhere.demo.v1`).

**The product** (`app/`, React, static) is a compiled bundle plus that one
artifact. It has no backend, no server process, no database, no login, no
accounts, no sessions, and no application-set cookies. Its only network
request at runtime is a `fetch` for the artifact at its own base URL
(`app/src/lib/demo.ts`). It calls no external API and sends nothing anywhere.
Once loaded it works offline via a service worker that caches those same
same-origin assets.

The privacy boundary is the line between those two halves. Everything the
pipeline reads is restricted. Everything past the boundary is aggregate,
scanned, and public.

## 2. What enters the system

### 2.1 The shipped demo lineage

`data/cards/source_ledger.yaml` declares the `demo_v1` lineage. It requires
one source and admits three optional diagnostics.

| Source ledger id | Publisher | Grain as received |
| --- | --- | --- |
| `hackathon_organizer_bundle` (required) | Hackathon organizer; observations collected by Downtown San Diego Partnership Clean & Safe | Monthly published area totals **and** block-level digitized observations on a fixed 261-block panel, with a block/area crosswalk and a methodology-period table. Five CSVs. |
| `get_it_done_cd3` (optional diagnostic) | City of San Diego Performance & Analytics | Individual service-request rows with request timestamps, community-plan name, service type, and parent-request links |
| `parking_meter_activity` (optional diagnostic) | City of San Diego City Treasurer | Monthly transactions by meter pole, plus a meter location history |
| `noaa_count_day_weather` (optional diagnostic) | NOAA National Centers for Environmental Information | Daily summaries for San Diego International Airport station USW00023188, 2017–2025 |

The block-level grain is the point of the whole exercise, and it is also the
part that must never leave. The source bundle carries block identifiers, the
four bounding streets of each block, a source neighborhood label, and 382
block polygons. Any one of those locates a block as precisely as a coordinate
does; joined to a block-keyed count table, a block-month count of one is a
person.

### 2.2 The retained legacy lineage

`legacy_v0` reads `sdrdl_source` and `sdrdl_analysis` (San Diego Regional Data
Library, monthly neighborhood-grain 2014–2022), `sd311` (City of San Diego
open data portal, individual report timestamps from May 2016), and
`rtfh_pitc` (Regional Task Force on Homelessness, unsheltered by census tract,
annual single-night snapshot). It produces the `observations.v0` artifact
family. This lineage is retained for provenance and is not the shipped
decision path.

### 2.3 The monitoring lane

`data/monitoring/` holds small aggregate tables that postdate the frozen
`demo.v1` snapshot: DSDP April and June 2026 neighborhood totals transcribed
from a pinned publisher PDF, and RTFH 2025/2026 PITC and monthly HMIS
reference rows. These are transcribed from published aggregates only. No
tract-level values, maps, routes, block-level observations, or precise
locations are copied out.

**Every monitoring row is `model_eligible=false`** and is excluded from
`demo_v1_training`, `demo_v1_forecast_selection`, and `demo_v1_planner`.
Rule 5 of the monitoring update protocol makes promotion into training or
planning require a separate, documented model-version decision. Finding F-3
in [`PHASE0_FINDINGS.md`](PHASE0_FINDINGS.md) records why these specific rows
stay excluded: a cadence break, dual paper/app collection, at least one 2026
count redone with differing results, contested count months, and provenance
that its own source describes as partial and from memory.

### 2.4 Context sources that never touch a number

The ledger also pins City of San Diego public-records releases (shelter
capacity and funding, street-outreach and Homelessness Response Center
contracts, encampment reporting and abatement), an SDHC/City programs
overview, HUD CoC System Performance Measures and case-management-ratio
guidance, HUD CA-601 system reports, and SDHEART research material. These
inform documentation and framing. None of them feeds the drop test, the
forecast, or the planner.

### 2.5 What is not in the repository

`data/raw/` and `data/processed/` are gitignored and are never committed.
The five organizer CSVs the `demo.v1` lineage requires are not
redistributable and are not publicly fetchable; `scripts/fetch_raw.sh` exits
rather than substituting a similarly named public dataset. The consequence,
recorded as finding F-2, is that the shipped artifact is **verifiable by
pinned SHA-256 checksum but not reproducible by an adopter**. Fifteen Python
raw-data tests skip in a clean checkout for exactly this reason.

## 3. What leaves the system

### 3.0 The four export paths

Four things leave, and all four carry the same grain. Nothing else does; there
is no backend, no telemetry, and no analytics.

1. **`public/generated/demo.v1.json`**, the published artifact. Described in
   detail below.
2. **The clipboard decision brief**, assembled in the browser from that
   artifact plus the coordinator's own settings.
3. **CSV and print/PDF export**, from the same values. The CSV carries the
   disclosure as a column rather than a footer, so a row pasted into an email
   carries its own limits.
4. **The share link.** A pasted URL is an export path, and it is the one an
   adopter is most likely to overlook, because it does not feel like a file.

The share link carries seven named parameters — budget, coverage floor,
guard on/off, locks as `area_id:hours` pairs, the displaced-share assumption,
the area that assumption applies to, and the loaded hourly rate — and nothing
else. It is enforced in both directions by an allowlist in
`app/src/features/share/planShareState.ts`: any key outside the seven is
refused by name, area ids must match a strict pattern and are refused if any
segment reads person-level or point-location, and every value must be
alphanumeric before it is emitted. An independent adversarial pass confirmed
that no person-level, point-location, complaint-shaped, or per-person value is
representable in a link, and that prototype-pollution keys and duplicate
parameters are refused.

That the link is human-readable is deliberate: a coordinator can read the whole
plan out of it before deciding to send it.

### 3.1 The published artifact

One file: `public/generated/demo.v1.json`. Its published grain is:

- **Time grain: calendar month.** No day, no timestamp, no count date. The
  organizer bundle's day-of-month values are documented as unreliable and are
  not used.
- **Geographic grain: named planning area.** Six areas — City Center,
  Columbia, Cortez, East Village, Gaslamp, Marina. No block, no census tract,
  no coordinate, no address, no bounding street.
- **Subject: aggregate observations of places.** Visual street-sweep
  observations, not a census of unique people, not verified service needs, not
  program outcomes.

Derived spatial evidence publishes at area grain as summaries *about* blocks —
how many panel blocks in an area were active, how many rose, how many fell,
and the aggregate units involved — never as per-block rows. `block identifiers
and geometry are omitted` is asserted inside the artifact itself and enforced
by the scan.

The map is not a coordinate layer. `AREA_MAP_GEOMETRY` in
`app/src/features/spatial/areaGeometry.ts` holds six simplified area outlines expressed in SVG viewBox units, derived by
dissolving the organizer block grid to area level. There is no latitude or
longitude anywhere in the shipped product.

The 311/Get It Done lane publishes only monthly aggregate comparisons and
their diagnostic interpretation. Request ids, descriptions, and locations are
consumed in memory during aggregation and are not retained in the artifact.

## 4. Suppression: the actual rule

Governing document:
[`docs/policy/small-cell-suppression.md`](../policy/small-cell-suppression.md).
Emitter: `pipeline/src/stillhere_pipeline/suppress.py`. Scanner:
`analyze_recoverability` in `pipeline/src/stillhere_pipeline/privacy.py`. All
three must change together; changing one alone is a policy violation, not a
refactor.

**Threshold: `SMALL_CELL_THRESHOLD = 5`.** A published integer cell value `v`
with `0 < v < 5` identifies people and never ships. **Zero is publishable** —
it identifies nobody.

The emitter takes four branches, in this evaluation order:

1. **Whole-row suppression on small totals.** If a row's total satisfies
   `0 < total < 5`, the row publishes as
   `{"month": …, "total": null, "suppressed": true}` with no `by_type`
   breakdown at all.
2. **Cell suppression.** Every `by_type` value with `0 < v < 5` becomes null.
3. **Complementary partner.** If branch 2 suppressed exactly one cell, the
   next-smallest nonzero cell is suppressed with it. A lone suppressed cell is
   exactly `total − sum(published)`, so suppressing it alone hides nothing. If
   no nonzero partner exists, the whole row suppresses.
4. **Feasibility escalation.** After branches 2 and 3, the emitter enumerates
   every value assignment consistent with the published policy and the
   published numbers. If any cell's value is the same across every feasible
   assignment, or the value *multiset* is unique even when the assignment is
   not, the whole row suppresses.

Branch 4 exists because the first three were not enough, and the way that was
found is worth stating to a reviewer. A recovery attack was run over all 708
published rows of the first emitter artifact, found zero recoverable rows, and
certified the artifact. That attack tested only the lone-null vector. An
adversarial pass afterwards found **7 rows exactly recoverable** — including
`cortez 2018-02 structure=1 vehicle=1`, a single-person cell fully
reconstructed by subtraction — and 20 more that leaked their value multiset.
The check passed; the check was weaker than the claim it was used to support.
`analyze_recoverability` now blocks on three conditions: `recovery.exact`,
`recovery.pinned_cell`, and `recovery.unique_multiset`, and a row it declines
to certify emits `recovery.not_certified` rather than passing quietly.

**Suppression is disclosed, never silent.** Published rows list their withheld
types in `by_type_suppressed`, and the quality report carries a
`small_cell_suppression` block naming the threshold, the row and cell counts,
and the policy line. Per red-team finding R-06 the suppressed state must
surface in the interface as a data-quality state and must never render as a
zero.

**No rollup totals are published.** No neighborhood, downtown, or annual
total ships, because a rollup reopens subtraction recovery across its members.
A guard test pins the artifact's exact key surface so that adding one fails
the suite. Extending to rollups requires extending branch 4 and the policy
document first.

## 5. The fail-closed privacy scan

`pipeline/src/stillhere_pipeline/privacy.py` is the structural enforcement of
the promise that nothing which could locate or identify a person reaches the
deployment. It runs as the last step of `./scripts/verify.sh`, after the
production build so it can see the real bundle, and again in
`.github/workflows/deploy-pages.yml` against the exact bundle being published.
A `BLOCK` finding exits non-zero and fails the build. `--require-bundle` turns
a missing `app/dist` into a failure rather than a skipped check. Over-blocking
is the accepted error direction.

It scans three surfaces: publication layout, `public/generated/`, and
`app/dist` including source maps.

### 5.1 What it rejects

Each rejection class below has a negative fixture in
`tests/privacy/fixtures/fail/` that must produce at least one blocking
finding, so a rule that silently stops working fails loudly.

| Rejection class | Fixture | Rule |
| --- | --- | --- |
| Raw block features — block id, bounding streets, source neighborhood, block polygon | `raw_block_feature.json`, `source_grain_382_blocks.json` | Polygon type alone is not proof of aggregation. A geometry-carrying file must name an approved, versioned geography, and more than `MAX_AGGREGATE_FEATURES = 60` polygon features means source-grain geography whatever it declares. |
| Record identifiers — `hmis_id`, `person_id`, `case_id`, `ssn`, `dob`, names, phone, email | `record_identifier.json` | Forbidden field names, matched on a normalized key so `Latitude`, `geo-lat`, `geoLat` and `LAT_DEG` all resolve to one rule. |
| Bare coordinates | `bare_coordinates.json`, `unlabelled_longitude.json` | Forbidden coordinate keys, plus a San Diego numeric heuristic: a decimal with ≥3 decimal places inside longitude −117.7…−116.5 is a BLOCK; the latitude span 32.4…33.6 overlaps plausible counts, so latitude alone is a WARN. The asymmetry is deliberate. |
| Street addresses hidden in free-text fields | `street_address.json` | Forbidden value patterns — street addresses, `lat, lon` pairs, and Open Location plus codes found inside an otherwise innocent `note` or `label`. |
| Point geometry | `point_geometry.json` | Coordinates are permitted only inside a `geometry` whose type is `Polygon` or `MultiPolygon`. `Point`, `MultiPoint`, and `LineString` are refused outright — those are the shapes that locate a person. |
| Block-keyed counts with no geometry at all | `block_keyed_counts.json` | Splitting geometry and counts across files does not de-identify them. The join key does the work. |
| Small cells | `small_cell.json`, `small_cell_nested_by_type.json` | Any object carrying an area and/or period key is a cell, and every integer inside it and its children is a published cell value. `0 < v < 5` is a BLOCK unless an affirmative sibling suppression marker is present. |

Raw and tabular file types (`.csv`, `.xlsx`, `.shp`, `.parquet`, `.sqlite`, …)
are a BLOCK anywhere under the generated directory or the production bundle,
whatever they contain, and `data/raw` or `data/processed` appearing inside
`public/` is a BLOCK. Source maps are scanned deliberately: they are the most
common way raw data survives a build unnoticed.

The suppression escape hatch requires an **affirmative** value. `true`, `yes`,
`1`, `"suppressed"`, and `"redacted"` clear the rule; `false`, `0`, and `"no"`
mean published, because a privacy gate must fail closed.

### 5.2 The known weak point, stated plainly

The small-cell rule infers whether an integer is a person count from the shape
of the document. That inference went through six rounds of review and **every
round found a real hole**, three of which were the same flaw — a scope flag
(cell scope, suppression, geometry approval) propagating past the node it was
approved for. The C-02 record names the durable fix: a declared count contract
in the artifact, which turns the rule from an inference into a lookup.

That fix is partially landed. `contracts.py` and its TypeScript mirror
validate a `contract` block carrying `count_fields`, `small_cell_threshold`,
and `suppression_marker` for the `observations.v0` artifact, and reject any
declaration that drifts from the policy. **The shipped `demo.v1.json` carries
no `contract` block**, so shape inference is what governs the deployed
artifact today. SECURITY.md invites reports of a leak shape the scanner does
not see, and says to assume a seventh hole exists. That is the honest posture,
and an adopter should treat it as one.

Also not enforced: recovery across files or across rollup levels. The scanner
does not reason across files.

### 5.3 What the residual exposure actually is, and what bounds it

§5.2 and `SECURITY.md` say to assume a seventh hole exists. That is the right
disclosure and it stays. It is not an unbounded one, and the size of it is
what a general counsel needs. Everything below names the code it comes from.

**The residual exposure is a small published count, not a record.**

The scanner's small-cell rule is the one rule that depends on inference. It
decides what is a person-count like this
(`pipeline/src/stillhere_pipeline/privacy.py`):

- An object enters *cell scope* if it, or anything above it on the path,
  carries one of `CELL_CONTEXT_KEYS` — `month`, `period`, `date`, `yearmonth`,
  `neighborhood`, `areaid`, `area`, `observations`. Scope then propagates to
  every descendant unconditionally.
- Inside cell scope, `_scan_counts` flags any integer `0 < v < min_cell`
  (default 5) as a `BLOCK`, whatever the field is named.
- Three things take a value back out of that reach. `CELL_NUMERIC_ALLOWLIST`
  exempts about twenty structural names (`index`, `rank`, `weight`,
  `version`, `year`, `revision`, `sortindex`, the temporal keys, and a few
  planner constants). `is_non_person_metric` turns cell scope **off** for an
  object carrying `activeblocks`, `rawobservationunits`, `grosschange`,
  `allocatedhours`, `basehours`, or `variablehours`. And an affirmative
  suppression marker (`is_suppressed`) exempts the cell and its nested
  breakdowns.
- Nothing on a path carrying no month/area/period key is in cell scope at all.

So the concrete failure mode is a real area-month count of 1 to 4 that ships
as a number because the object holding it names a resource metric, because its
own field name collides with a structural exemption, or because no cell-context
key sits above it. Two further limits, stated in §5.2 and repeated here because
they belong in the same paragraph: the shipped `demo.v1.json` carries no
`contract` block, so inference rather than a declared `count_fields` list
governs the deployed artifact; and the scanner does not reason across files or
across rollup levels, so a value withheld in one place and recoverable by
subtraction from a coarser published rollup is outside what it can see.

**Worst realistic case, named.**

A published cell reads, for one of the six named areas and one calendar month,
a value of 1, 2, 3, or 4 rather than `{"total": null, "suppressed": true}`. A
reader learns that in that named neighborhood, in that named month, exactly
that many people were observed on the street. Someone with local knowledge —
an outreach worker, a property manager, a neighbor — may be able to attach
that number to people they already know are there. The disclosure is
confirmatory, not revelatory: it does not name anyone, place anyone on a
block, put anyone on a date, or connect any two observations to the same
person, because none of those things exist in the file to be leaked.

**Why the aggregate-only architecture bounds it.**

1. **There are no person-level rows to leak.** The pipeline aggregates before
   it writes; the artifact has no concept of a person as an entity, and §7
   forbids an adopter from supplying one. The largest thing that can escape is
   a count.
2. **The grain is area-month.** Six named areas, calendar month, no day, no
   count date, no block, no tract, no coordinate, no address, no bounding
   street (§3.1). Even a completely unsuppressed artifact answers "how many",
   never "who", never "where within the area", never "which day".
3. **Small cells are suppressed at a stated threshold.**
   `SMALL_CELL_THRESHOLD = 5` in `pipeline/src/stillhere_pipeline/suppress.py`,
   with the four branches in §4 — whole-row suppression on a small total, cell
   suppression, a complementary partner so a lone suppressed cell is not
   recoverable by arithmetic, and a feasibility escalation that suppresses the
   whole row when the published numbers would pin a withheld value or its
   multiset. The emitter, the scanner's `analyze_recoverability`, and
   `docs/policy/small-cell-suppression.md` all derive from the same written
   policy and must change together.
4. **The scan runs fail-closed over the exact deployed bundle.** Step 4 of 4
   in `./scripts/verify.sh`, after the production build so `app/dist` and its
   source maps exist, with `--require-bundle` so a missing build is a failure
   rather than a skipped check; and again in
   `.github/workflows/deploy-pages.yml` against the exact bundle being
   published. A `BLOCK` finding exits non-zero. Over-blocking is the accepted
   error direction, and each rejection class has a negative fixture under
   `tests/privacy/fixtures/fail/` — `small_cell.json`,
   `small_cell_nested_by_type.json`, `record_identifier.json`,
   `bare_coordinates.json`, `unlabelled_longitude.json`, `street_address.json`,
   `point_geometry.json`, `raw_block_feature.json`,
   `source_grain_382_blocks.json`, `block_keyed_counts.json` — that must keep
   producing a blocking finding, so a rule that silently stops working fails
   the build.

The residual risk is therefore the difference between a suppressed small cell
and a published one, at area-month grain, in a file that contains nothing
finer. That is a real disclosure and it is a bounded one.

**What an adopter should do about it.**

1. **Keep the input rule.** The bound above holds because nothing person-level
   is ever supplied (§7). A scanner hole matters in proportion to what was fed
   in; that is the control an adopter holds directly and the only one that
   changes the size of the exposure.
2. **Publish counts where the scanner can see them.** Keep every count inside
   an object that carries its own `month` and `area` keys, and publish
   identifiers as strings — `"neighborhood": "barrio_logan"`, not an integer —
   so an identifier is never mistaken for a count and a count is never missed
   for lack of context.
3. **Do not name a real count with a structural word.** `index`, `rank`,
   `weight`, `revision`, `sort_index` and the temporal keys are exemptions. A
   count named one of those is exempt by construction.
4. **Treat a `BLOCK` as a stop.** Run `./scripts/verify.sh` on every deploy.
   Never clear a finding by widening `CELL_NUMERIC_ALLOWLIST` or by adding a
   suppression marker to a cell that is in fact published; a suppression
   marker propagates to the whole cell including its breakdowns.
5. **Read the artifact once by eye before the first publication.** Six areas
   times the months you publish is small enough for a person to check, and a
   person is the one reviewer no inference rule can fool.
6. **Know the takedown path.** There is no backend: withdrawing a published
   file means removing it from the host and rebuilding. `SECURITY.md` commits
   to taking a confirmed live data leak down first and diagnosing second; an
   adopter running their own deployment owns that step for their own site.

## 6. What an adopting organization must supply

To run this tool on your own geography you need all of the following. There is
no configuration that makes any of them optional.

1. **A monthly observation series at a defined area grain**, with the areas
   named and stable over the period you intend to analyze. Month is the
   finest time grain the system publishes; supply nothing finer than you are
   willing to have aggregated to it.
2. **A written methodology-period record** — every break in how the counts
   were collected, dated. The drop test forces `insufficient_evidence` when a
   comparison crosses an unreconciled method break, and it can only do that if
   the breaks are declared.
3. **A source-ledger entry per source**, following the structure in
   `data/cards/source_ledger.yaml`: publisher, analytical question,
   availability, retrieval method, collection method, time grain, geographic
   grain, intended use, license terms, and known limitations. Invariant 6 in
   [`CONTRIBUTING.md`](../../CONTRIBUTING.md) is that every displayed number
   traces to a ledger card. A number without a card does not ship.
4. **Pinned SHA-256 snapshots** of each input, in the pattern of
   `data/cards/checksums.sha256`, so the artifact's `generated_from.input_sha256`
   can be checked against them.
5. **A resolved, versioned geography.** The area list and its version must be
   declared and marked `fixed`. The privacy scanner reads
   `config/decision.v1.json` and treats a geography as approved **only** when
   its status is `fixed`; an `unresolved` status approves nothing. In this
   repository that field still reads
   `downtown-demo/pending-source-audit` with status `unresolved` — finding
   F-4. Do not copy that state forward.
6. **A named accountable human.** The artifact declares
   `decision_owner`, `decision_support_only: true`, and
   `human_review_required: true`. The tool produces a scenario for a person to
   accept, edit, or reject. If no one is named, the tool has no output it is
   entitled to produce.
7. **Your own legal review of your inputs.** See §9.

## 7. What an adopting organization must never supply

These are not discouraged. They are outside the system's design, and several
of them will fail the build if you attempt them.

- **Person-level records of any kind.** One row per person, per contact, per
  encounter, per service episode. The system aggregates places, and it has no
  concept of a person as an entity.
- **Coordinates.** Latitude/longitude, eastings/northings, geohashes, plus
  codes, UTM, MGRS, what3words, or any `x`/`y` pair carrying real-world
  precision.
- **Street addresses**, cross streets, bounding-street labels, house numbers,
  parcel numbers, or APNs — including inside free-text notes.
- **Block-scale counts**, or block, point, site, camp, encampment, tent, or
  structure identifiers. A block-keyed count table with no geometry attached
  is still block-scale data; the join key does the work.
- **Service-eligibility data.** Eligibility determinations, program
  enrollment, bed assignments, shelter capacity, waitlist position.
- **Names**, aliases, dates of birth, Social Security numbers, phone numbers,
  or email addresses.
- **HMIS extracts.** Not a de-identified one, not a client-key-only one, not a
  "just the counts" export that retains a client key. HMIS measures service
  engagement, not street population, and it carries obligations this tool is
  not built to hold. The forbidden-key list rejects `hmis_id` and
  `client_key` by name; that rejection is a backstop, not a permission
  structure.

If you have a use case that seems to require one of these, the answer is that
this is the wrong tool for it, not that the boundary should move.

## 8. What the tool refuses to do with what it holds

Four sentences the product is designed to be unable to say, from
[`README.md`](../../README.md):

- "These people moved from one block or neighborhood to another."
- "A policy caused the decline."
- "This area needs enforcement."
- "A shelter has capacity or someone is eligible for a service."

Each refusal is load-bearing in a specific way.

**No movement claims.** Balanced-panel redistribution is an aggregate pattern
over a fixed block set. The artifact's `claim_guard` states that gross
increases and decreases are arithmetic changes on blocks, and
`individual_movement_claims_permitted` is `false` in the decision contract.
Nothing in the system tracks an entity across time or space, because nothing
in the system represents an entity.

**No causal claims.** `causal_claims_permitted` is `false`. The 311 reporting
diagnostic explicitly declares `causal_identification: false` and
`randomization: false`, and reports a difference in period means as exactly
that. The intervention explorer models a hypothetical clearance under a
**stated displaced-share assumption** and labels it assumed, never predicted.

**No enforcement framing.** The planner declares `not_in_scope`: live routing,
shelter capacity or eligibility, person-level prioritization, enforcement
recommendations. This rules out sorting or ranking areas by complaints or any
nuisance proxy, and rules out enforcement language in copy, labels, tooltips,
and variable names. Copy is part of the product here; a pull request changing
only wording can violate this.

**No service-capacity or eligibility claims.** The system holds no capacity
data and no eligibility data, and §7 forbids supplying any.

**311 complaint volume is not a forecasting or planning input.** It measures
reporting behavior, not need. Its only permitted uses are
`source_disagreement_diagnostic` and `reporting_bias_diagnostic`; its excluded
uses are `person_count`, `service_need`, `planning_load`, and
`allocation_target`. The artifact publishes `complaint_data_used: false` and
`reporting_bias_diagnostic_used: false` in the planner constraints. The
diagnostic is shown precisely so the exclusion can be audited.

**How far that refusal actually reaches, stated exactly.** The claim this
project makes and will defend is narrower than the one it used to make:

> Complaint volume cannot reach allocation without also corrupting the
> published forecast interval, which is derived from checksummed inputs.

**Not** "complaint volume cannot influence planning." An independent review
executed that broader claim's counterexample: 311 counts written into
`planner.allocations[].planning_load` reached the shipped allocator and
materially re-ranked the plan, because every guard matched field *names* and a
number carries no name. The claim was withdrawn rather than defended;
`docs/project/DECISIONS.md` records the withdrawal and
`docs/project/PHASE1_ADVERSARIAL.md` records the attacks.

Three things are true today, and none of them is the broad claim. The planner
input types cannot express a complaint-shaped field
(`ExcludesComplaintSignal<T>`). `assertNoComplaintSignal` runs on the shipped
path, `App.tsx` → `app/src/lib/planner.ts`, and rejects a complaint-shaped
key anywhere in objects, arrays, `Map`s, and `Set`s. And every
`planning_load` must declare a derivation from
`PLANNING_LOAD_DERIVATIONS` (`pipeline/src/stillhere_pipeline/contracts.py`)
that the validator recomputes arithmetically against a value already published
elsewhere in the same artifact, so a load that does not reconcile is refused
whatever it is called.

What remains open, and an adopter should read it as open: rewriting
`forecast.areas[].upper` to match a forged `planning_load` satisfies the
reconciliation. That is the boundary the claim names — it moves the attack out
of a hand-editable allocation row and into the forecast, which is produced by
the pipeline from pinned, checksummed inputs. It is a harder place to smuggle
a number into. It is not a place nothing can be smuggled into.

## 9. Retention

**There is none, because there is nothing to retain.**

The deployed product has no backend, no server process, no database, no login,
no accounts, no sessions, no application-set cookies, no analytics, no
telemetry, and no server-side storage of any kind. It never receives data from
a user, so there is no user data to keep, expire, or delete. There is no
retention schedule because there is no store.

Two precise qualifications, because "no storage" is a claim that deserves
pedantry.

**Browser local storage.** The workspace keeps a small amount of state in the
viewer's own browser under `localStorage`: up to eight saved planning
scenarios (`stillhere-scenarios-v1`), plus a view preference and a
guided-demo-seen flag. A saved scenario holds a budget number, a coverage-floor
number, a boolean guard flag, per-area hour locks keyed by area name, and an
auto-generated label built from those values — there is no free-text field.
None of it is transmitted anywhere; it lives in that browser and nowhere else,
and clearing site data removes it. It contains nothing about any person.

**The source data on your own machine.** The pipeline reads `data/raw/`, which
is where the identifying data actually lives. That directory is gitignored and
never committed, and its contents never reach the deployment. But it exists on
whatever machine you run the pipeline on, and **this tool imposes no controls
on it whatsoever.** Encryption at rest, access control, backup handling,
retention, and destruction of your source files are entirely your
organization's responsibility and are governed by whatever data-use agreement
you obtained them under. The absence of retention in the product is not an
absence of retention in your operation.

Related, and stated in SECURITY.md as an accepted limit: **the enforced
boundary here is the deployed product surface, not the repository.** That
choice was made because the upstream SDRDL source is public at point
precision and pre-suppression artifacts exist in this repository's git
history. On non-public source data both of those facts flip, and an adopting
organization must draw the boundary at the repository instead — which means
pre-suppression intermediate artifacts must never be committed, and the git
history is itself in scope.

## 10. What changes at adoption

Adopting this tool is not a deployment task. Six things change hands.

1. **The geography decision.** You resolve and version your own area list and
   mark it `fixed`. Until you do, the scanner approves no geometry and the
   drop test is designed to return `insufficient_evidence`.
2. **The boundary placement.** Deployment-surface enforcement is correct for
   public source data. If your sources are not public — and if they include
   anything in §7, they are not — the boundary moves to the repository, and
   pre-suppression artifacts and git history come into scope. This is the
   single most consequential difference between running this here and running
   it at your organization.
3. **The threshold.** `SMALL_CELL_THRESHOLD = 5` is the value argued for in
   the suppression policy against a specific attacker model: someone who knows
   the policy, sees the published row, and has local knowledge. Your
   population density, your area sizes, and your data-use agreement may
   require a higher threshold. Changing it is a policy change with a written
   argument, updated in the policy document and both enforcement points
   together — not a constant edit.
4. **Model eligibility.** Every new source arrives excluded. Promotion into
   training, forecast selection, or planning requires a separate, documented
   model-version decision. A ledger entry alone does not make a source
   eligible.
5. **The accountable human.** The planner is `decision_support_only` with
   `human_review_required`. Someone in your organization owns each plan it
   produces. The decision brief is built to carry the evidence, the
   uncertainty, and every human change precisely so that ownership is
   legible after the fact.
6. **The legal review of your inputs.** Whatever you feed the pipeline is
   yours: your data-use agreements, your HIPAA or 42 CFR Part 2 exposure if
   any source touches health or substance-use treatment records, your public-
   records obligations, your breach-notification duties. Nothing in this
   repository discharges any of that, and the Apache-2.0 license under which
   it is provided disclaims warranties and is not legal advice.

### Who owns the governance decision

Not the tool, and not the maintainer. Inside an adopting organization the
governance decision belongs to whoever can say no to a data source: in
practice, general counsel or a privacy officer together with the program
leader who owns the outreach decision. The engineer running the pipeline
implements that decision; they do not make it.

Concretely, the following require a named human sign-off recorded outside the
code, and each one is a governance question rather than an implementation
detail:

- Admitting a new source (§6, items 1–4).
- Promoting a source from `model_eligible=false` (§10, item 4).
- Changing `SMALL_CELL_THRESHOLD`, publishing a rollup total, or relaxing the
  recoverability escalation (§10, item 3).
- Fixing or changing the geography version (§10, item 1).
- Any change that would weaken one of the seven invariants in
  [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

Everything else in this document is enforced by code. Those five are enforced
by a person, which is why they are written down.

## 11. Where to check these claims

| Claim | Where it is enforced or recorded |
| --- | --- |
| Suppression rule and threshold | `docs/policy/small-cell-suppression.md`; `pipeline/src/stillhere_pipeline/suppress.py` |
| Fail-closed scan and rejection classes | `pipeline/src/stillhere_pipeline/privacy.py`; `tests/privacy/fixtures/{pass,fail}/`; `docs/track-c/C-02-privacy-boundary.md` |
| Provenance of every published number | `data/cards/source_ledger.yaml`; `data/cards/checksums.sha256`; `tests/pipeline/test_demo_provenance.py` |
| Monitoring-lane exclusion | `data/monitoring/README.md`, update protocol rule 5 |
| Refusals and scope | `public/generated/demo.v1.json` → `planner.not_in_scope`, `planner.constraints`, `scenario.claim_boundary`; `config/decision.v1.json` |
| Known limitations, unvarnished | `docs/project/PHASE0_FINDINGS.md` findings F-1 through F-5 |
| The gate itself | `./scripts/verify.sh`, final step; `.github/workflows/verify.yml`; `.github/workflows/deploy-pages.yml` |
| The complaint-volume refusal, in its actual narrow form | `docs/project/DECISIONS.md`; `pipeline/src/stillhere_pipeline/contracts.py` → `PLANNING_LOAD_DERIVATIONS`; `app/src/domain/planner/planner.ts` → `assertDeclaredPlanningLoad` |
| Residual privacy exposure and what bounds it | §5.3 above; `docs/adoption/BRIEF.md`, "What the seventh scanner hole could actually cost you" |

Run the boundary check yourself against any checkout:

```bash
python -m stillhere_pipeline.privacy --root . --require-bundle
```
