# Phase 1 adversarial pass: attacking the refusals

The refusals are only worth what an attacker cannot get past. This is the
record of trying, in the role the C-01 red-team review names as the most
likely one to break the product (finding R-03): a contractor told by a
stakeholder to "just add a complaints sort so we go where people are upset."

Every route below was written and executed. Nothing here is theorised. Where a
route succeeded, it says so and names what was changed in response.

## Summary

| # | Route | Result | Stopped by |
| --- | --- | --- | --- |
| 1 | Add `complaintVolume: number` to `PlanningArea` | refused | `app/src/lib/demo.ts:32` — `PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL` fails to typecheck |
| 1b | Same, made optional to dodge the "missing property" errors | refused | same line; `ComplaintShapedKeysOf` strips optionality with `-?` |
| 1c | Delete the compile-time proof, then populate and weight the field | refused | `app/src/domain/planner/planner.ts:61` at runtime, via `allocateHours` |
| 2 | Rename-laundering: `residentReportIndex`, populated in `EMBEDDED_DEMO` | refused | the runtime key-set assertion in `refusals.test.ts`, and the characterization suite |
| **2b** | **Rename-laundering, optional, artifact-only** | **SUCCEEDED** | **nothing** |
| 3 | Launder 311 into `planningLoad` itself inside `adaptDemoV1` | refused (after 2b) | the `reporting_bias`-deletion provenance test |
| 4 | New module `features/triage/pressureRank.ts` reordering the plan | refused | the identifier scan on `lib/planner.ts` |
| 4c | Same with fully neutral names and a real reordering | refused | "orders allocations by area identity, never by load" |
| **C** | **311 counts written into `planner.allocations[].planning_load`** | **SUCCEEDED** | **nothing** |
| **D** | **The same payload through `assertNoComplaintSignal`** | **SUCCEEDED** | **nothing** |

Attacks C and D were not found by this pass. They were found by the
independent verification track and raised in `review/ESCALATION.md`, executed
against the working tree *after* the first Phase 1 fix had landed. They are
the important part of this document.

## Route 2b — the one that got through first

A field named for what a stakeholder wants rather than for what it is,
declared optional, populated only from the artifact so the embedded snapshot's
key set never changes, and added to the share weight with `?? 0` so the
characterization outputs stay identical:

```ts
// demo.ts
residentReportIndex?: number;
residentReportIndex: number(row?.complaint_reports, 0),

// planner.ts
(sum, area) => sum + Math.max(0, area.planningLoad + (area.residentReportIndex ?? 0))
```

`tsc`, `oxlint`, the refusal suite, and both planner characterization suites
all passed. The lesson is the one the escalation states in general form: a
name-based guard is beaten by a name.

Three checks were added in response, all in `app/src/refusals.test.ts`:

- **`allocates from area identity and planning load alone`** — the plan for
  areas projected down to their declared fields must equal the plan for the
  areas as adapted. Any new field that influences allocation fails this,
  whatever it is called.
- **`produces the same plan when the artifact's 311 diagnostic is deleted
  outright`** — `reporting_bias` is the only 311-derived block in the
  artifact. If any planning value ever draws on it, this fails.
- The identifier scan's scope became behavioural rather than folder-based:
  any module that names a planner entry point, computes planning load, or
  handles a planner input type is allocation code. That put `lib/demo.ts` in
  scope, which is where route 2b's laundering lived.

## Attacks C and D — the name-based guard's real limit

From `review/ESCALATION.md`, reproduced here before responding to it
(`python3 review/attacks/attack_c.py`, and the vitest harness in
`review/attacks/`):

- **Attack C.** Rewrite `planner.allocations[].planning_load` in
  `public/generated/demo.v1.json` to 311 complaint volume. Change nothing
  else. `validate_demo_v1` accepted it — `contracts.py` required only that
  `planning_load` be a non-negative number, and complaint counts are
  non-negative numbers. `adaptDemoV1` accepted it. `allocateHours` accepted
  it and re-ranked the plan: Gaslamp moved from 5th of 6 to 2nd, at 172 of
  600 hours. The artifact still declared `complaint_data_used: false` and
  still passed its own contract.
- **Attack D.** The same payload — `planning_load: 4120` — handed straight to
  `assertNoComplaintSignal`. The guard did not fire.

Both reproduced exactly as reported. The cause is that
`COMPLAINT_FIELD_PATTERN` and `ExcludesComplaintSignal<T>` are the same check
at two different times: both match field *names*, and `planning_load` is not
a complaint-shaped name. Wiring the guard onto the shipped path — the remedy
Phase 0's finding F-1 proposed, and the first thing this phase did — closed
attack A and left C and D exactly where they were.

### What was changed

The gap is a value-provenance gap, and it lives at the artifact boundary. The
number that decides the plan now has to say where it came from, and the claim
is checked by arithmetic against a value already published elsewhere in the
same document rather than taken on the writer's word.

`pipeline/src/stillhere_pipeline/contracts.py` gains
`PLANNING_LOAD_DERIVATIONS`, an allowlist in which every entry names something
recomputable:

| Derivation | Must equal |
| --- | --- |
| `forecast_upper_bound` | `forecast.areas[].upper` for that area |
| `latest_observed_total` | `observations.latest_by_area[].total` for that area |
| `coverage_floor_only` | `0` — the area takes the floor and no discretionary share |

The rules around it matter as much as the list:

- An area whose forecast **published an interval** must plan against
  `forecast_upper_bound`, and the value must reconcile. The label is optional
  there, deliberately: arithmetic settles it, and a label is the one thing an
  attacker gets to write. Declaring a fallback instead is refused, so nobody
  can pick whichever number suits them.
- An area whose forecast is `insufficient_forecast_evidence` — a normal state
  in this product — **must** declare one of the two fallbacks, and that
  fallback must reconcile too. An unexplained planning load is refused
  outright, because an unexplained number is the shape complaint volume
  arrives in.
- `app/src/lib/demo.ts` applies the same rule at the point untyped artifact
  JSON becomes typed planner input, and refuses the whole artifact when it
  fails. The app then falls back to the embedded snapshot and reports its
  origin as the offline fallback rather than as generated analysis, so the
  refusal is visible rather than silent.
- `app/src/domain/planner/planner.ts` gains `assertDeclaredPlanningLoad`,
  which `allocateHours` runs alongside `assertNoComplaintSignal`. It refuses
  an area whose planning load carries no permitted derivation, which is what
  closes attack D's shape on the shipped path.

Attack C is now refused by the Python contract before the artifact can ship,
and by the adapter if it ships anyway:

```
BLOCKED by ContractViolation: planner allocation for 'City Center' declares
planning_load 980.0 derived from forecast.areas[].upper, but that value is
193.0. A planning load must reconcile with what it is derived from; a number
that does not is refused whatever it is called and whatever it declares.
```

Both attacks are pinned in `app/src/refusals.test.ts` so they cannot regress.

### The synthetic fixture this exposed

`tests/pipeline/fixtures/refresh/` has an `Area Charlie` with
`insufficient_forecast_evidence` and `planning_load: 33.0`. That number is
derived from nothing else in the artifact — its latest observed total is 28 —
so under the new contract it had no answer to "where did this come from?".
The allowlist was **not** widened to accommodate it. The fixture was corrected
to `28.0` with `planning_load_derivation: "latest_observed_total"`, which is
checkable, and the pins and golden expectation were regenerated.

That is the guard working on its first real input, and it is worth saying
plainly that the arbitrary number was in a test fixture rather than in the
shipped artifact only by luck.

## What remains open

Stated rather than papered over.

1. **`complaint_data_used` is still partly a self-declaration.** It is now
   checked against the value derived from the declared derivations, and no
   complaint-derived derivation is permitted, so a lie has to be told twice
   and in a named field. But rows contribute to that derivation only by
   declaring one, and nothing computes the flag from the lineage the builder
   actually consumed. Making it genuinely lineage-derived needs the builder,
   not the validator, and is larger than this pass. The thing that actually
   stops attack C is the reconciliation, not this flag.
2. **`applyIntervention` does not relabel.** The assumption explorer shifts
   planning load between areas but leaves `loadDerivation` reading
   `forecast_upper_bound`, which is then no longer true of the value. The
   honest fix is a fourth derivation, `assumption_adjusted`, set by
   `app/src/lib/intervention.ts` — a file outside this pass's ownership. No
   refusal depends on it: an intervention-adjusted load still cannot carry
   complaint volume, because the load it adjusts was reconciled first.
3. **A contractor who lies in source is not stopped by any of this.** Someone
   who hand-writes `loadDerivation: "forecast_upper_bound"` onto a
   hand-built area object in TypeScript passes the shipped guard. What they
   cannot do is get such an artifact past the contract, or name the field
   anything complaint-shaped, or reorder the plan by it. The remaining
   surface is a person deliberately mislabelling a value in a reviewed diff.
4. **An area with no published forecast is checked against its own
   observations, not against a forecast.** That is a weaker anchor than
   `forecast_upper_bound`, and it is the correct one available — the
   alternative is starving the area the model understands least, which
   inverts the coverage floor's whole purpose.
5. **`review/attacks/equivalence.attack.test.ts` (M1, M2) now fails.** It
   builds `PlanningArea` objects with no derivation, so the new guard refuses
   them. That harness is the review track's and outside this pass's
   ownership; the fix is to give its synthetic areas a declared derivation.

## The lint-level guard, and why it is a test

The task asked for a lint rule that fails the build when a complaint or 311
identifier appears in allocation code. **oxlint cannot express it.** It does
not implement `no-restricted-syntax`; the nearest rules it does implement are
`no-restricted-properties`, `no-restricted-imports`, `no-restricted-globals`,
`no-restricted-exports`, and `no-restricted-types`, and all of them match
exact names rather than patterns. `no-restricted-properties` catches
`area.complaintVolume`; it cannot see `const complaints = ...`, a function
named `sortByComplaints`, or any name not enumerated in advance.

Both layers exist rather than one pretending to be enough:

- `app/.oxlintrc.json` carries `no-restricted-properties` over an enumerated
  list of complaint property names, scoped by `overrides` to the planner
  modules. It is a fast first layer and is honestly partial.
- `app/src/refusals.test.ts` carries the guard that holds the line: it strips
  comments, string literals, and regular expressions from each allocation
  module and scans the remaining *code* for any identifier matching
  `/complaint|311|service_request|call_volume|report_volume|nuisance/i`,
  allowing only the names that exist to state the exclusion. Scope is
  behavioural, so a decomposition that moves the planner does not move it out
  of scope.

## Reproducing

```
cd app && npx vitest run src/refusals.test.ts     # the refusal suite
.venv/bin/pytest tests -q                          # the artifact contract
python3 review/attacks/attack_c.py                 # attack C, expect BLOCKED
```

`scripts/verify.sh` runs the refusal suite by name as step 3 of 4, so it
cannot be lost by a change to the default test glob.
