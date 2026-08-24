# Delivered actuals

This document is for the person at an operating organization who would be
asked to supply outreach numbers to this tool: what you would send, in what
format, at what grain, what gets withheld and why, what must never leave your
building, and what the tool will and will not do with any of it.

Read it before agreeing to send anything.

**Current status: no actuals have been recorded.** Nothing in this repository
holds a delivered hour or an engagement count from a real operator. The
schema, the loader, and the empty state exist; the analysis does not, and
that is deliberate — see [§7](#7-what-the-tool-will-and-will-not-compute).

Companion documents, not repeated here:
[`DATA_GOVERNANCE.md`](DATA_GOVERNANCE.md) for the system-wide data posture,
[`docs/policy/small-cell-suppression.md`](../policy/small-cell-suppression.md)
for the suppression policy itself (that document is the authority; this one
summarizes it), and [`ORGANIZATION_PROFILE.md`](ORGANIZATION_PROFILE.md) for
the deployment configuration these actuals attach to.

## 1. What actuals are

Three facts about one planning area in one calendar month:

| Fact | Field | What it is |
| --- | --- | --- |
| Planned hours | `hours.allocated_hours` | The staff hours a plan called for. Null if there was no plan that month. |
| Delivered hours | `hours.delivered_hours` | The staff hours actually worked there. Zero is a real answer. |
| Engagement aggregate | `engagement.count` | One count of encounters, in whatever your organization already counts. |

That is the whole payload. Everything else in the file describes where those
numbers came from, what they mean, and what may be done with them.

The engagement measure is whatever you already report — `contacts` or
`engagements` — with your own written definition attached. The tool does not
define the measure for you and does not rename it. It also does not accept a
third kind: if you report neither, you send hours and leave the counts marked
not recorded. That is a supported, honest state.

## 2. The grain, and why it is not finer

**One area, one calendar month.** No day, no shift, no team, no site, no
block, no route.

This is not a limitation waiting to be lifted. A shift-level delivery record
locates a team on a night; a day-level engagement count is small enough to be
one person; a site-level row is an address by another name. The grain is what
makes the privacy promise enforceable, so it is fixed by a constant in the
schema (`contract.grain`) that no file can change.

A month absent from the file is **unknown**, not zero. Use
`reporting.completeness_note` to say which months are missing and why.

## 3. What you supply, in what format

One JSON file per deployment, validated against
[`config/schema/actuals.v1.schema.json`](../../config/schema/actuals.v1.schema.json).
Every field in that schema is documented in the schema itself, including
which are required. A short but complete example:

```json
{
  "schema_version": "actuals/v1",
  "profile_id": "san-diego-downtown",
  "geography_version": "dsdp-core-six/2026-08-21",
  "reporting": {
    "organization_name": "Example Outreach Collaborative",
    "reported_by_role": "Outreach Program Manager",
    "method_note": "Shift leads tally contacts at end of shift; hours come from the scheduling roster. April is under-counted: two shift leads were new.",
    "last_updated": "2026-08-01",
    "completeness_note": "No rows before 2026-03; the tally sheet started then."
  },
  "engagement_measure": {
    "kind": "contacts",
    "label": "street contacts",
    "definition": "One conversation with one person on one shift, however brief.",
    "collection_method": "Paper tally sheet, entered weekly.",
    "counts_encounters_not_people": true,
    "unique_persons_measure": false
  },
  "contract": {
    "grain": "area_month_aggregate",
    "count_fields": ["engagement.count"],
    "small_cell_threshold": 5,
    "suppression_marker": { "field": "suppressed", "affirmative_values": [true] }
  },
  "area_months": [
    {
      "area_id": "east_village",
      "month": "2026-05",
      "hours": { "allocated_hours": 24, "delivered_hours": 21.5 },
      "engagement": { "count": 63, "suppressed": false }
    },
    {
      "area_id": "gaslamp",
      "month": "2026-05",
      "hours": { "allocated_hours": 8, "delivered_hours": 8 },
      "engagement": { "count": null, "suppressed": true }
    },
    {
      "area_id": "cortez",
      "month": "2026-05",
      "hours": { "allocated_hours": 8, "delivered_hours": 0 },
      "engagement": { "count": null, "suppressed": false, "not_recorded": true },
      "note": "Team redeployed for the month; no outreach delivered here."
    }
  ],
  "intended_analysis": {
    "status": "documented_not_implemented",
    "preconditions": [
      "At least twelve area-months of delivered hours across at least three areas.",
      "One written engagement definition, unchanged across the whole span."
    ],
    "planned_when_data_exists": [
      "Descriptive planned-versus-delivered hours by area and month.",
      "Coverage continuity: which in-scope areas received no hours in a month."
    ],
    "will_never_compute": [
      "per_person_or_household_outcome_tracking",
      "service_eligibility_or_entitlement_determination",
      "enforcement_abatement_or_removal_prioritization",
      "staff_or_team_performance_ranking",
      "causal_attribution_of_area_change_to_delivered_hours",
      "published_rollup_totals_across_areas_or_months",
      "complaint_or_311_derived_demand_estimates"
    ],
    "rationale": "These numbers describe delivery, not people, and cannot carry the other weight."
  }
}
```

`profile_id` and `geography_version` must match the organization profile this
deployment runs. Actuals recorded under one geography must never be read
under another; areas get renamed and merged, and a stale row would attach
silently to the wrong place.

### The three states of an engagement count

Exactly one of these holds per row. Anything else is rejected rather than
guessed at:

| State | Encoding | Means |
| --- | --- | --- |
| Reported | `{"count": 63, "suppressed": false}` | The number, as counted. `0` is a valid reported count. |
| Suppressed | `{"count": null, "suppressed": true}` | People were engaged, too few to say how many. **Never render as zero.** |
| Not recorded | `{"count": null, "suppressed": false, "not_recorded": true}` | No count was captured. Not a privacy withholding, and not a zero. |

Keeping "we don't have this number" distinct from "we're withholding this
number" matters in both directions: collapsing them into suppression
overstates how much data the deployment holds, and collapsing either into
zero understates the work that was done.

## 4. What is suppressed

The rule is not new for actuals. It is the same policy that governs every
published observation, applied to the engagement count:

- **Threshold 5.** Read from `SMALL_CELL_THRESHOLD` in
  [`pipeline/src/stillhere_pipeline/suppress.py`](../../pipeline/src/stillhere_pipeline/suppress.py),
  which the policy document and the privacy scanner's `min_cell` both pin.
  A count `v` with `0 < v < 5` identifies people and is refused at import.
- **Zero is publishable.** It identifies nobody.
- **Suppression is disclosed, never silent.** A withheld month carries the
  marker and shows as withheld.

Concretely: an area-month with 3 contacts is supplied as
`{"count": null, "suppressed": true}`. Supplying `{"count": 3}` fails the
import, naming `area_months[i].engagement.count` and quoting the remedy. The
loader refuses rather than silently suppressing for you, because a file that
was quietly rewritten is a file whose author never learned the rule.

Only the policy's **first branch** — whole-row suppression on a small total —
applies here. Branches 2 to 4 (cell suppression, complementary partner,
feasibility escalation) exist to stop subtraction recovery inside a
breakdown, and this schema has no breakdown to recover: one count per row, no
by-type, by-demographic, or by-outcome split, and no rollup across areas or
months. That absence is the reason the rule stays simple, and it is why
adding a breakdown later is a policy change requiring
[`docs/policy/small-cell-suppression.md`](../policy/small-cell-suppression.md)
and both pipeline enforcement points to change first — not a schema tweak.

**Hours are not suppressed.** `delivered_hours: 3` publishes. Staff hours
measure your team's time, not a person's presence, and the privacy scanner
already recognizes an `allocated_hours` block as a declared resource metric
rather than a person cell (`is_non_person_metric` in
[`privacy.py`](../../pipeline/src/stillhere_pipeline/privacy.py)). That is
also why hours sit in their own nested block: so the exemption covers the
resource numbers and never reaches the count beside them.

## 5. What must never be included

Not discouraged — **refused**. The loader rejects the file, naming the
offending field, and the pipeline's privacy scanner would block the same
content independently.

- **Names.** First, last, full, client, staff, or "the guy in the blue tent."
- **Dates of birth**, ages of specific individuals, any date more precise
  than a month.
- **Client, case, household, person, encounter, or record identifiers**,
  including hashed or pseudonymous ones. A pseudonym is a join key.
- **HMIS extracts** or any per-row export from a case-management system.
  An aggregate count derived from one is fine; the rows are not.
- **Addresses, cross streets, block identifiers, parcel numbers**, or site,
  camp, or encampment identifiers — including inside a free-text note. Notes
  are scanned for address, coordinate-pair, and plus-code shapes.
- **Coordinates** of any kind: latitude/longitude, eastings/northings,
  geohashes, plus codes, UTM, MGRS, what3words, or an `x`/`y` pair.
- **Per-person or per-encounter rows.** The system has no concept of a person
  as an entity, and this file is not the place to introduce one.
- **Demographics of any kind**, at any grain. There is no field for them.
- **Complaint, 311, or service-request volume**, and no measure repurposed as
  one. The schema cannot express it, the loader rejects a field named like
  it, and it rejects an engagement measure whose written definition describes
  it. This is the one place free text is checked for meaning, because the
  definition of the measure is where a complaint count would be laundered
  into an engagement count.
- **Deduplicated unique-persons counts.** Not a privacy refusal so much as an
  honesty one: deduplication across a month requires linking encounters to
  identities, and this system holds no identities and has no basis to assert
  the linkage was done correctly. `unique_persons_measure` is fixed `false`.

If you cannot supply a number without one of the above, do not supply the
number. A missing month is a supported state; a leaked identity is not
recoverable.

## 6. How the file is imported

`app/src/domain/actuals/` holds the loader and the comparison;
`app/src/features/actuals/` holds the screen, mounted after the planner.
The loader never runs against a
server, because there isn't one.

```ts
import { loadActuals, validateActuals, hasRecordedActuals } from "./domain/actuals";

const actuals = loadActuals(fileText, {
  expectedProfileId: profile.profile_id,
  knownAreaIds: profile.geography.area_list.areas.map((a) => a.id),
});
```

- `validateActuals(input, options?)` never throws and returns every finding,
  each naming a dotted field path (`area_months[3].engagement.count`), plus
  warnings that do not block.
- `parseActuals` / `loadActuals` throw `ActualsError`, whose message names the
  first offending field and counts the rest.
- `suppressEngagementCount(count)` applies the threshold rule to one raw
  count, for an export script preparing a file. It does not weaken the
  loader: a small published count is rejected whether or not it was used.
- `hasRecordedActuals(document)` distinguishes a valid empty file from one
  with rows.

Warnings, which do not block: hours delivered with no planned figure to
compare against, and engagements reported for a month with zero delivered
hours.

## 7. What the tool will and will not compute

**Today: planned against delivered, per area and month, and nothing else.**
The plan error is planned hours minus delivered hours for one area in one
month. That is the first item in the sanctioned list below, and it needs no
causal claim: the plan predicted a number of hours, and a different number
was worked.

There is still no forecast scoring, no delivery scorecard, and no chart. In
particular the comparison **does not score the published count forecast**,
and cannot: that forecast predicts an observed point-in-time count, and no
field in an actuals file observes a quantity of that kind. That limitation
and two neighbours are recorded in `NOT_SCORABLE_FROM_ACTUALS`, rendered on
the screen, and pinned by tests that fail if the record is emptied or if an
entry stops reaching the reader — so the gap cannot be closed by deleting
the disclosure.

No total is computed across areas or across months. A sum would let a reader
subtract their way back to a count the file withholds, so the area-month row
stays the published grain.

**Later, if the preconditions in that block are met** — descriptive,
retrospective, area-level, and stated up front so the bar cannot be lowered
to fit whatever data arrives:

- Planned versus delivered hours by area and month.
- Coverage continuity: which in-scope areas received no hours in a month.
- Whether the engagement count moves with delivered hours in an area, as a
  described pattern with its caveats attached, never as an effect size.

**Never**, and this list is enforced: the loader requires all seven baseline
entries in `intended_analysis.will_never_compute` and refuses a file that
deletes one. An adopting organization may add to the list; it cannot subtract.

- `per_person_or_household_outcome_tracking`
- `service_eligibility_or_entitlement_determination`
- `enforcement_abatement_or_removal_prioritization`
- `staff_or_team_performance_ranking`
- `causal_attribution_of_area_change_to_delivered_hours`
- `published_rollup_totals_across_areas_or_months` — a rollup reopens
  subtraction recovery of the suppressed months it spans
- `complaint_or_311_derived_demand_estimates`

Deleting an entry from that list would not change what the tool does. It
would only remove the disclosure that it will not do it, which is why the
list is validated rather than documented.

## 8. The empty state

`app/src/features/actuals/ActualsEmptyState.tsx` renders "no actuals recorded
yet" with a short account of what an operator would supply and how. It is
presentational, holds no state, and takes what it says as props, so the
workstream that owns the shell can place it without untangling it.

It exists because the alternatives are worse. A blank panel reads as broken;
an empty table reads as a system that lost the data; a zero reads as a month
with no outreach. The honest rendering of "nobody has reported anything yet"
is that sentence, on the screen.

## 9. Change control

The threshold and the suppression branches are owned by
[`docs/policy/small-cell-suppression.md`](../policy/small-cell-suppression.md)
and enforced by `suppress.py` and `privacy.py`. `SMALL_CELL_THRESHOLD` in
`app/src/domain/actuals/actuals.ts` and `contract.small_cell_threshold` in
every actuals file mirror it; a file declaring a different value is rejected
rather than honoured. Changing any one of these alone is a policy violation,
not a refactor.
