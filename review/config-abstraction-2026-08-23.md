# Review: the organization-profile abstraction and the cost layer

**Reviewed:** working tree at 2026-08-23 ~13:50 (uncommitted; `431ea08` + in-flight).
Files: `config/schema/organization-profile.v1.schema.json`,
`config/profiles/*.v1.json`, `app/src/domain/config/`, `config/README.md`,
and the newly-extracted `app/src/features/**`.

**Verdict: PASS WITH FINDINGS** on the schema and loader.
**FAIL** on the claim an evaluator will actually test — "verify the second
example config genuinely runs a different geography with **no code change**."
It does not, because nothing runs it.

---

## C-1 — the profile loader is not connected to anything

**Severity: high (as a claim), low (as a defect).**

```
$ grep -rn "parseOrganizationProfile|validateOrganizationProfile|domain/config" \
    app/src --include="*.ts" --include="*.tsx" | grep -v "domain/config/"
(no output)
```

Nothing outside `app/src/domain/config/` imports the loader. The app still
boots from `public/generated/demo.v1.json` via `adaptDemoV1`, and the pipeline
still builds that artifact from `CORE_AREAS`, a hardcoded six-tuple at
`pipeline/src/stillhere_pipeline/demo.py:35-42`.

So the second profile is **validated**, not **run**. It proves the schema can
express a different geography. It does not demonstrate that the product can
operate one.

**In fairness, the build session says this itself.** `config/README.md`:
"The loader is not wired into the interface here; that wiring is a separate
workstream." That disclosure is exactly right and I am not accusing anyone of
overstating it *in the README*.

**The risk is downstream, and it is the reason this is severity-high.** The
adoption brief goes to a board. "An adopting organization instantiates a
profile. It does not fork the application." (`config/README.md`) is true of the
*schema* and false of the *product* today. If that sentence reaches the brief
unqualified, it is the kind of overstatement the brief-review standard
explicitly rules out. **Flagging pre-emptively so it does not get there.**

The defensible claim today: *"the configuration surface an adopter would fill
in is defined, validated, and exercised by two worked examples; wiring it to
the runtime is the next step."*

## C-2 — the decomposition carried "six" into the new components

**Severity: medium. This is the leak the review brief predicted, and it landed
in files written in the last hour.**

| File | Line | Text |
| --- | --- | --- |
| `features/guide/guideSteps.ts` | 70 | "already split across **the six neighborhoods**" |
| `features/planner/PlannerSection.tsx` | 46 | "Split the hours across **the six neighborhoods**" |
| `features/planner/PlannerSection.tsx` | 93 | `ariaLabel="Map of the six downtown neighborhoods…"` |
| `features/workspace/WorkspaceView.tsx` | 70, 72, 73 | `"Map of the six downtown neighborhoods…"` ×3 |

Every one of these is user-facing copy, three of them are accessible names, and
all six were written *during* the extraction that was supposed to create the
seam. A deployment on any other area count — the published seven-area
configuration, for one — would say "six" out loud, including to screen reader
users.

`data.scenario.defaultBudget` is already interpolated on the same line in
`guideSteps.ts:70`, so the pattern for doing this correctly is present in the
same string — the area count just was not treated as configuration.

**Suggested fix:** `${areas.length} neighborhoods`, sourced from the same place
the map is. Cheap now, and much more annoying after these files acquire tests.

## C-3 — where else "six" is load-bearing

For completeness, the non-copy sites an adopter would hit:

- `pipeline/src/stillhere_pipeline/demo.py:35-42` — `CORE_AREAS` hardcoded, used
  as a membership filter (`:155`, `:1453`, `:1462`), an exhaustiveness check
  (`:176-177`, `:2426`), a series initialiser (`:172`), and a divisor in the
  planner budget split (`:2739`).
- `261` as a literal at `demo.py:1595, 1964, 1993, 2074-2075, 2095, 2101, 2124,
  2661, 2702`, plus `in_panel_261` as a column name (`:1440`).
- `app/src/features/spatial/areaGeometry.ts` — `AREA_MAP_GEOMETRY` keyed to the
  six San Diego area ids.
- `app/src/lib/demo.ts` — `EMBEDDED_DEMO` carries the six areas as the offline
  fallback.

**`AreaMap.tsx:21` deserves credit and is the model for the rest:**

```tsx
if (!areas.every((area) => AREA_MAP_GEOMETRY[area.id])) {
  return (<div aria-label={ariaLabel} className="area-map" role="img"> …text cells… )
}
```

An unknown geography degrades to a labelled text-cell grid instead of
crashing or rendering a San Diego map with foreign labels on it. That is the
correct failure mode and it was clearly deliberate.

## C-4 — schema strengths worth recording

I tried to find a way to smuggle a forbidden input through the profile and
could not:

- `additionalProperties: false` at every level, so the schema is closed.
- The loader additionally scans **every property name** in the document and
  rejects complaint-shaped names, and `app/src/domain/config/types.ts` carries a
  compile-time `ExcludesComplaintSignal` proof reusing the planner's guard.
  Three independent layers on the same boundary.
- `observations.grain` fixed at `area_month_aggregate`; both publishability
  flags fixed `false`. A profile can restate the privacy posture, not relax it.
- `area_needs_enforcement` and `live_shelter_capacity_or_eligibility` are
  **mandatory** entries in every profile's prohibited-claim list, and the
  validator refuses removal of the five baseline language boundaries.
- Provenance is structured, not free text: `resolution_status` ∈
  {resolved, provisional, unresolved, illustrative}; `resolved` requires all
  five of `source_name`, `publisher`, `source_url`, `source_version`,
  `retrieved_at`; every other status requires a non-empty `resolution_note`.
  **There is no way to record a source as a bare version string.** That single
  design choice is what turns the geography problem from a hidden gap into a
  disclosed one.
- Both example profiles are validated by `app/src/domain/config/profile.test.ts`
  (15 tests, both files imported at `:12-13`), so a profile that stops
  validating fails CI.

The second example is genuinely different rather than a recolour: 7 in-scope
areas plus 4 explicitly out of scope, 96 hours over a 14-day cycle, a 6-hour
floor, **2-hour allocation increments**, and 3 teams. The four out-of-scope
entries are the East Village quadrants, excluded with the reason the data
dictionary gives — they overlap the East Village total and must never be summed
with it — which is a better test of the `in_scope` mechanism than an invented
exclusion, because getting it wrong double-counts a real number. Its
`profile_status: illustrative_example` is correctly set, and the geography it
names is real and sourced to the pinned June 2026 DSDP report while the
operating parameters are marked illustrative in the profile's own notes.

**Reviewed again after `0113a1f`.** This section originally assessed a fictional
rural profile, which was deleted for inventing a place. The assessment above is
of its replacement and was re-read against the file, not carried over.

## C-5 — the caveat that is missing from the abstraction claim

**Severity: medium, and `0113a1f` changed its shape.** The original finding was
that the only profile carrying an adjacency table was the fictional one, so the
only profile that could reach `possible_displacement` was the one about a place
that did not exist. Deleting it removed that specific embarrassment and left the
underlying gap in a cleaner state: **neither shipped profile supplies adjacency**,
both declare it `unresolved` with a reason, and `drop_test.py:1-9` therefore
forces `insufficient_evidence` for both.

The caveat that remains is smaller but real. The schema can express adjacency;
nothing shipped exercises it, so the displacement branch of the drop test is
unreachable in any configuration a reader can run. The adoption brief should not
imply that branch has been exercised end-to-end. The replacement profile states
this itself: "An unresolved adjacency makes the product say less, which is the
correct direction." That is the right posture, and it is also an admission that
the branch is untested in production configuration.

---

## The cost layer

**Verdict: PASS, with the caveat that the invariant is currently vacuous.**

Checks from the review brief:

**"Confirm the hourly rate is presented as an operator assumption everywhere it
surfaces, never as a fact."** — It surfaces nowhere yet. There is no cost
arithmetic in `app/src` or `pipeline/src`; the only matches for
`loaded_hourly_rate` outside the schema are the type definition
(`domain/config/types.ts:139,144`) and the validator
(`domain/config/profile.ts:612-619`). So the invariant holds vacuously. The
specification is right, and the risk arrives the moment a number is rendered.

The specification itself is strong:

- `unit: {"const": "cost_per_staff_hour"}` — fixed by schema, with the rationale
  written into the description: "so a downstream cost display cannot silently
  reinterpret it."
- `assumption.status: {"const": "operator_set_assumption"}` — also fixed, with
  "Any figure computed from it must be labeled as resting on this assumption"
  in the schema text.
- `assumption` requires `set_by_role`, `basis`, `effective_date`, `includes`,
  and `excludes`. `set_by_role` is documented as "A role, never a person" —
  correct PII posture in a field that would otherwise attract a name.
- The second profile's `basis` string is a model of the genre, in a different
  way than the string it replaced: it states outright that the rate is a
  placeholder, that San Diego's published contract releases carry personnel
  totals but no fielded-FTE or field-hour denominator, and that no hourly rate
  can therefore be honestly derived from them. A `basis` field that says "this
  cannot be derived from what is public, replace it before showing a decision-
  maker a cost" is doing exactly the work the field exists for.

**"Confirm no per-person cost metric was introduced."** — Confirmed. No
`cost_per_person`, `per_person`, `perPerson`, or equivalent exists anywhere in
`app/src`, `pipeline/src`, or the schema. The only "per person" strings in the
codebase are **refusals** of the concept:

- `features/evidence/DropTestSection.tsx:593` — "Raw reports per published total
  unit—not reports per person."
- `pipeline/src/stillhere_pipeline/demo.py:883` — "be called reports per person."
  (in a passage explaining why it must not be).

**"Check whether any derived figure implies one indirectly."** — None found
today, because no derived cost figure exists. Two combinations to watch when
one does, offered as a pre-emptive note rather than a finding:

1. `loaded_hourly_rate × allocated_hours` per area, shown next to an area's
   `latest` observation count, invites the reader to divide. Even without a
   division in the code, placing the two adjacent produces a per-person cost in
   the reader's head. If cost is shown per area, the observation count should
   not be in the same visual unit.
2. A total-cost figure against a `six_area_core_total` implies cost-per-
   person-equivalent, and `estimated_person_equivalents` are explicitly not
   people. Any total-cost display needs the same "not unique people" framing
   the count itself carries.

---

## Summary

| Item | Verdict |
| --- | --- |
| Schema closes the forbidden inputs | **pass**, three independent layers |
| Provenance is structured and cannot be faked with a version string | **pass**, best single design choice here |
| Second profile is genuinely a different shape | **pass** |
| Second profile *runs* a different geography with no code change | **fail** — loader unwired (C-1) |
| Decomposition removed the six-area assumption | **fail** — six new hardcoded sites (C-2) |
| Both profiles exercise the same code path | **no** — adjacency divergence (C-5) |
| Hourly rate always framed as an operator assumption | **pass, vacuously** — never surfaces |
| No per-person cost metric, direct or implied | **pass** |
