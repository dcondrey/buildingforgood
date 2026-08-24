# Configuration

This directory holds the configuration an organization writes to run this
tool. There is more than one kind of file here, and they are not the same
thing.

| Path | What it is | Consumed by |
| --- | --- | --- |
| `schema/organization-profile.v1.schema.json` | The organization profile schema. The current configuration contract. | `app/src/domain/config/` |
| `profiles/*.v1.json` | One profile per deployment. Two are shipped as examples. | `app/src/domain/config/` |
| `portability-demonstrated.v1.json` | What running somewhere else has and has not been shown to work. A declaration, checked by a test. | `app/src/domain/config/portability.test.ts` |
| `decision.v1.json` | A superseded design record from the project's first scenario. Kept, unchanged, because it is history and because a test still reads it. | `app/src/domain/planner/contract.test.ts` |

## The organization profile

An adopting organization instantiates a profile. It does not fork the
application.

Before this schema existed, the entire scenario — six downtown San Diego
areas, an 80-hour budget, an 8-hour coverage floor — was distributed across
the pipeline, the artifact generator, and the interface. An evaluator looking
at the tool was looking at one city's demo. A profile moves every one of those
values into a single file an organization can fill in for its own geography.

A profile covers:

- **Areas in scope** — a versioned list of planning areas, each marked in or
  out of scope, so exclusions are visible rather than silent.
- **Geography reference** — three separately-sourced components, each carrying
  its own structured provenance: the area **name list**, the **boundary**
  definition behind those names, and the **adjacency** table.
- **Budget, shift shape, and team count** — the staff time available, the
  length of a shift, the smallest block the planner may assign, and how many
  teams can be in the field.
- **Fairness constraints** — the coverage floor every in-scope area receives
  before any forecast-driven distribution, and the continuity reserve for an
  area whose drop test returned `possible_displacement`.
- **Language boundaries** — what the interface may and may not say in this
  deployment. An organization may add prohibitions; the validator refuses to
  let it remove the five baseline ones.
- **Cost assumptions** — a loaded hourly rate, carried explicitly as an
  operator-set assumption with its basis, effective date, and what it does and
  does not include. The cost arithmetic itself lives elsewhere; this file
  defines the input and the metadata that must travel with it.

### What a profile cannot express

Two absences are deliberate and enforced, not conventions:

- **No complaint, 311, or service-request volume.** There is no field for it,
  and the schema is closed (`additionalProperties: false` at every level), so
  one cannot be added without a schema version change. The loader also scans
  every property name in the document and rejects complaint-shaped names by
  name, and `app/src/domain/config/types.ts` carries a compile-time proof
  reusing the planner's own `ExcludesComplaintSignal` guard. Complaint volume
  measures who reports, not who is present; a configuration field is exactly
  the seam through which it would become an allocation weight.
- **No person-level or precise-location field.** `observations.grain` is fixed
  at `area_month_aggregate` and both publishability flags are fixed `false`. A
  profile may restate the privacy posture. It cannot relax it.

Nothing in a profile authorizes enforcement framing or a service-eligibility
claim: `area_needs_enforcement` and `live_shelter_capacity_or_eligibility` are
mandatory entries in every profile's prohibited-claim list.

### Provenance is required and structured

Every geography component carries a `provenance` object with a
`resolution_status` and a `resolution_rule` saying what would change it.

- **The area list must be pinned.** Its status can only be `resolved`, and
  `source_name`, `publisher`, `source_url`, `source_version`, and
  `retrieved_at` must all be filled in. A profile whose area list does not
  name a real published source is refused by the schema and fails the build:
  `app/src/domain/config/geographyProvenance.test.ts` checks every file in
  `profiles/`. The hand-written loader does not yet refuse it at runtime — it
  does not read the schema, and `validateProvenance` accepts any status the
  enum lists — and a failing test in that same file declares the gap rather
  than leaving it to be discovered. The area names *are* the
  geography as far as this tool is concerned — hours are allocated to them,
  the interface prints them, a saved plan is traced by them — so an area list
  nobody can cite is a place nobody can check. This rule exists because a
  profile in this repository once invented nine area names, disclosed at every
  level that they were invented, and was a fabrication anyway;
  `docs/project/DECISIONS.md` (2026-08-23) records it.
- **Boundaries and adjacency may be `resolved`, `provisional`, or
  `unresolved`,** and every status other than `resolved` requires a non-empty
  `resolution_note` written for a reader outside the organization. That note is
  what the interface renders as an unresolved-provenance disclosure. They are
  not pinned, deliberately: a publisher routinely names its areas without
  publishing their geometry, and demanding a boundary citation would push an
  adopter toward inventing one.
- **`illustrative` is unreachable.** No geography component accepts it, because
  the area list is pinned and the place is therefore real. The value remains in
  the loader's `RESOLUTION_STATUSES` list and in the `ResolutionStatus` type
  only because removing it there is a separate change.

There is deliberately no way to record a source as a bare version string. An
adopter either cites something or discloses that they cannot.

### What that produced for San Diego

The six area names **are** resolvable, and the reference profile marks them
`resolved`: they are the Downtown San Diego Partnership's own published names,
cited to the pinned June 2026 Unsheltered Sleep Count report (retrieved
2026-08-21), and the same six appear independently in the San Diego Regional
Data Library downtown-homeless analysis package 2.1.1.

The **boundaries** and the **adjacency table** are `unresolved`, and the
profile says so in full sentences rather than papering over it:

- The publisher names these areas and reports totals for them but publishes no
  boundary file. The only geometry this project holds is a privately supplied
  grid of 382 block polygons, and those coordinates are on the deployment deny-list,
  so they cannot be turned into a published boundary either.
- No adjacency table has been published by any citable source, and none was
  derived, because deriving one would rest on the same coordinates. The
  pipeline therefore runs its drop test with adjacency unavailable, and a
  sustained decline with no adjacent evidence returns `insufficient_evidence`
  instead of `possible_displacement`. An unresolved adjacency makes the product
  say less, which is the correct direction.

This replaces the old blanket `geography.version:
"downtown-demo/pending-source-audit"` with something an evaluator can act on:
one component genuinely sourced, two genuinely open, each with the rule that
would close it.

## The two example profiles

`profiles/san-diego-downtown.v1.json` reproduces the scenario the released
interface already ships — six in-scope areas, an 80 staff-hour budget, an
8-hour coverage floor, matching `public/generated/demo.v1.json`.

`profiles/san-diego-dsdp-seven.v1.json` configures the same tool for the
**full seven-area geography the Downtown San Diego Partnership publishes** —
the six-area core plus Outside Perimeter — rather than the core the reference
deployment uses. It exists so the abstraction is exercised against a second
real geography: seven in-scope areas plus the four East Village quadrants
listed out of scope (they overlap the East Village total and must never be
summed with it), a 96-hour budget over a fourteen-day cycle, a 6-hour coverage
floor, two-hour allocation blocks, and three teams.

**The geography is real and sourced** to the same pinned June 2026 DSDP report
the reference profile cites, and already transcribed in
`data/monitoring/dsdp_public_checkpoints.csv`. **The operating parameters are
illustrative** — a floor, a shift length, a horizon, and a team count are an
adopting organization's choices, not facts about the world — and the profile's
own `notes` say which is which. Its `profile_status` is
`illustrative_example`: cite the area names, not the operating numbers.

Six of its seven areas carry observations in the shipped artifact and Outside
Perimeter does not, which is the behaviour worth seeing — the interface says
"the loaded artifact carries no observation for Outside Perimeter" rather than
inventing one.

## What portability has been shown to mean

Portability is demonstrated on two real published San Diego area definitions
with no code change, and nowhere else.

Both profiles are Downtown San Diego and both cite the same pinned June 2026
Downtown San Diego Partnership report. No area definition published by anyone
else, in any other place, has been run through this tool. A third example
profile once did claim more than that, and it did it by inventing the
organization and the geography it was porting to; that evidence is withdrawn,
and `docs/project/DECISIONS.md` (2026-08-23) says why.

`portability-demonstrated.v1.json` is the machine-readable version of the two
paragraphs above: what the demonstration covers, the five things it does not,
and the phrases that would state a portability nobody here has shown.
`app/src/domain/config/portability.test.ts` reads it and fails the build if a
profile is added that is not declared there, if a declared profile stops
resolving to its published source, if this section stops carrying the claim
sentence word for word, or if one of those phrases appears anywhere it scans.

## Loading and validating

`app/src/domain/config/` parses and validates a profile with no runtime schema
dependency. `validateOrganizationProfile(input)` returns every finding at once;
`parseOrganizationProfile(input)` throws an `OrganizationProfileError` whose
message names the offending field, e.g.

```
Invalid organization profile at `geography.adjacency.provenance.source_url`:
Required and non-null when resolution_status is `resolved`. …
```

Errors block loading. Warnings do not: a coverage floor that leaves too little
discretionary budget, a budget that is not a whole number of allocation blocks
or team-shifts, are reported but valid. A coverage floor larger than the budget
can pay for is an error, because every plan the profile could produce would be
infeasible.

The loader is wired into the interface: `app/src/features/shell/deployment.ts`
imports both profiles, parses them through this loader, and derives the areas,
budget, floor options, shift shape and rate the shell runs on. Which one loads
is a URL parameter — `?profile=san-diego-dsdp-seven` — not an edit.

## What happened to `decision.v1.json`

`decision.v1.json` was the shared scenario configuration for the project's
first concept: East Village and a displacement question, with seven candidate
areas and a 6-hour coverage floor. It was already documented as superseded
before this schema existed — its own README said it "is not consumed by the
released interface" — and the released interface had in fact moved to a
different scenario: six areas and an 8-hour floor, frozen in
`public/generated/demo.v1.json`.

Two things follow, and both are stated rather than tidied away:

1. **The organization profile supersedes it, and does not promote it.**
   Promoting a file the repository already describes as superseded would have
   been the wrong direction. The profile schema was written against what
   actually ships.
2. **The numbers differ, and the profile follows the shipped ones.** The
   San Diego profile carries six areas and an 8-hour floor because that is
   what the released interface does. `decision.v1.json` still records seven
   candidate areas and a 6-hour floor from the period when the area list was an
   open question. That divergence is noted in the profile's own `notes` array.

`decision.v1.json` stays in place, unchanged, for two reasons: it is an honest
record of how the decision contract evolved, and
`app/src/domain/planner/contract.test.ts` reads it and asserts against it. That
test is unmodified. Do not edit `decision.v1.json` without updating that test
in the same change.

Its remaining live role is the planner-policy history and the drop-test and
forecast thresholds that the Python pipeline still reads. Those are not yet
part of the profile schema; a `v2` that absorbs them is the obvious next step,
and it should retire `decision.v1.json` rather than leave two contracts
running.

## Change process

1. Link the change to its owning issue.
2. Bump `last_updated`, and bump the relevant `version` string whenever an area
   is added, removed, or renamed.
3. Record material changes in `docs/project/PROJECT_CONTROL.md`.
4. Run `cd app && npx vitest run src/domain/config` — the example profiles are
   validated by the test suite, so a profile that stops validating fails CI.
5. Notify dependent workstreams when a field other workstreams read changes.

Field-by-field instructions for a program director filling in a profile are in
`docs/project/ORGANIZATION_PROFILE.md`.
