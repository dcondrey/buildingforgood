# Phase 0 findings: baseline and safety net

Recorded before any refactor or behavior change. Nothing here was "fixed" in
this phase; surprises are written down, not corrected, per the working
agreement.

Baseline commit: `a23de76`. `./scripts/verify.sh` exits 0.

## Coverage inventory (honest)

The premise that coverage might be zero is wrong. It is substantial:

| Suite | Result |
| --- | --- |
| Python (`pytest tests -q`) | 222 passed, 15 skipped |
| TypeScript (`vitest run`) | 156 passed across 10 files |
| Privacy scan (`--require-bundle`) | passes against the built bundle |
| Production build | passes |

Per-file TypeScript test counts:

| File | Tests |
| --- | ---: |
| `domain/planner/planner.test.ts` | 57 |
| `App.test.tsx` | 31 |
| `lib/contracts.test.ts` | 22 |
| `features/planner/PlannerPanel.test.tsx` | 13 |
| `domain/planner/contract.test.ts` | 9 |
| `features/cards/ResponsibleDataCards.test.tsx` | 8 |
| `lib/planner.test.ts` | 8 |
| `lib/demo.test.ts` | 6 |
| `lib/intervention.test.ts` | 6 |
| `features/planner/PlannerPanel.a11y.test.tsx` | 3 |

CI already exists and already does what Phase 0 asked for. `.github/workflows/verify.yml`
runs `scripts/verify.sh` (format, lint, types, Python tests, TS tests, production
build, privacy scan) on pushes to `main` and `track/**` and on every pull
request. `.github/workflows/deploy-pages.yml` independently privacy-scans the
exact bundle it is about to publish. The Phase 0 CI item was already done.

## Finding F-1 (severe): the guarded planner does not ship

**The allocation code the tests guard is not the allocation code the app runs.**

There are two planners:

| | `app/src/domain/planner/planner.ts` | `app/src/lib/planner.ts` |
| --- | --- | --- |
| Entry point | `buildPlan` | `allocateHours` |
| Lines | 439 | 109 |
| Tests | 66 (`planner.test.ts` + `contract.test.ts`) | 8 |
| `assertNoComplaintSignal` guard | yes | **no** |
| Continuity reserve for `possible_displacement` | yes | no |
| Per-area `reasons[]` | yes | no |
| Per-area `unmet_hours` | yes | no (App.tsx recomputes a floor-0 reference plan) |
| Declares infeasibility with a named shortfall | yes | partial |
| **Imported by `App.tsx`** | **no** | **yes** |

`buildPlan` is imported only by `features/planner/PlannerPanel.tsx`, which is
imported only by its own tests. `features/cards/ResponsibleDataCards.tsx` is
likewise imported only by its own test. Neither component is reachable from
`main.tsx`.

Verified against the built artifact, not just by reading imports: none of the
`domain/planner` reason strings ("Only the unlocked remainder was
recalculated", "minimum-coverage floor, applied to every included area",
"continuity reserve because the drop test returned") appear anywhere in
`app/dist`. Vite tree-shakes the whole module out. It is not in the deployed
site.

### Why this matters

Invariant 2 says `assertNoComplaintSignal` and the enumerated refusals hold.
As a *tested property* that is true only of code that does not execute. The
shipped decision path — `App.tsx` → `allocateHours` — has no complaint guard
at all. It is not currently *violating* the invariant: no complaint field
reaches it, because `PlanningArea` (`lib/demo.ts`) has seven scalar fields and
none is complaint-shaped, and the only complaint-shaped key in
`public/generated/demo.v1.json` is `complaint_data_used`, which the planner
never reads. The invariant holds today by the same authorial discipline the
goal document says it wants to stop relying on.

**Correction.** The first version of this finding said "42% of the TypeScript
suite (66 of 156 tests)". That was wrong, and it understated the problem. It
counted only `domain/planner`. Counting every module unreachable from
`main.tsx` — adding `lib/contracts.test.ts` (28), `PlannerPanel.test.tsx` (10),
`PlannerPanel.a11y.test.tsx` (3), and `ResponsibleDataCards.test.tsx` (8) — the
real figure at the Phase 0 baseline is **109 of 181 tests, 60%**. Measured from
`vitest --reporter=json`, not estimated.

### What this changes downstream

- Phase 1 cannot simply "wire the existing guard into CI." The guard has to
  reach the shipped path first, or the refusal suite will be as unshipped as
  the code it tests.
- Phase 5's decomposition must resolve the two planners rather than preserve
  both. `features/planner/` is not an empty directory waiting to be filled; it
  holds a parallel implementation that diverged from what ships.
- Characterization tests written only against `domain/planner` would lock in
  behavior no user can observe. This phase therefore characterizes both.

No fix applied in Phase 0. Recorded only.

## Finding F-2: the demo artifact cannot be regenerated from a clean checkout

`data/raw/` and `data/processed/` are gitignored and contain only a README and
a `.gitignore`. `scripts/fetch_raw.sh` requires five organizer-supplied files
in `data/raw/hackathon_provided/` (`Area_Crosswalk.csv`,
`BlockLevel_Counts.csv`, `BlockLevel_Counts_Panel261.csv`,
`DowntownCounts_Monthly.csv`, `Methodology_Periods.csv`) and exits 1 without
them, with the message that public reports do not substitute for the
block-level panel.

Those files are not in the repository and are not publicly fetchable. Eleven of
the fifteen skipped Python tests skip for exactly this reason; three more skip
on other untracked extracts (Get It Done, the parking-meter files, the optional
NOAA daily), and the fifteenth on the pinned RTFH workbook. All fifteen are
registered with their reasons in the claim inventory's skip ledger, so the
count cannot drift without someone saying why.

So `demo.v1.json` is verifiable (checksums are pinned in
`data/cards/checksums.sha256`) but not reproducible by an adopter. This is a
direct problem for the Phase 3 acceptance criterion "reproducible from a clean
checkout" and for Phase 4's claim that an adopting organization can run the
tool on its own geography. It is a fixture problem, not a methodology problem,
and Phase 0's golden-output test is built on a committed synthetic fixture
precisely so the pipeline stays testable without the bundle.

## Finding F-3: Apr/Jun 2026 DSDP figures are correctly excluded — do not unpin

Phase 3 asked for this to be investigated before acting. The exclusion is
genuine and documented in `data/monitoring/README.md`:

- DSDP moved to an irregular quarterly cadence in late 2025 — a cadence break
  against the monthly series the model was fit on.
- 2026 counts were run dually on paper and a piloted application.
- At least one 2026 count was redone with differing results.
- The count months themselves are contested: the DSDP dashboard labels 1,092
  "Q1 2026" while the source PDF places it in April and supplies no
  January–March observation.
- The values are multiplier-adjusted visual observations — estimated
  person-equivalents, not people.
- The README's update protocol, rule 5, states every row stays
  `model_eligible=false` and that promotion requires a separate documented
  model-version decision.

The provenance is attributed to a personal communication described by its own
source as partial and from memory. That is a reason for more caution, not
less.

**Conclusion: these stay pinned `false`.** Phase 3 answers the currency
question by displaying them as observed-but-not-model-eligible with the
exclusion reason inline, which is what the goal document anticipated. Currency
is not bought by relaxing the standard.

## Finding F-4: `config/decision.v1.json` is already marked superseded

`config/README.md` states plainly that `decision.v1.json` "is not consumed by
the released interface" and is retained only as a design-history record; the
authoritative runtime contract is `public/generated/demo.v1.json`
(`stillhere.demo.v1`).

But `domain/planner/contract.test.ts` reads `decision.v1.json` and asserts
against it — including "carries no unresolved planner field" and "no longer
lists a Track C release blocker". So a file documented as superseded is still
a build-gating input, and the unresolved `geography.version:
downtown-demo/pending-source-audit` that Phase 2 must resolve lives in it.

Phase 4A's organization-profile schema has to decide whether it supersedes
this file or replaces it. Promoting a file the repo describes as superseded
would be the wrong direction.

## Finding F-5: no LICENSE, no release tag

`git tag` returns nothing. There is no `LICENSE`, `SECURITY.md`,
`CONTRIBUTING.md`, or `CHANGELOG`. Confirmed as stated in Phase 2; no
surprises.

## Non-findings checked and cleared

- No complaint-shaped field reaches any allocation path today (F-1 explains
  why this holds without a guard).
- The privacy scan does fail closed: `--require-bundle` turns a missing
  `app/dist` into an error rather than a skipped check, and `verify.sh` orders
  the scan after the build for that reason.
- `App.tsx` contains no `311` or `complaint` string at all.


## Finding F-6: the mutation gate had a bug that made it report a false pass

Self-reported. `scripts/mutation_check.sh` as first committed at `f8dd100`
claimed "10 of 10 mutations caught". At least one of those was not tested at
all.

The mutation records were packed into a bash array and split with
`IFS=$'\t' read -r name file needle replacement`. `read` stops at the first
newline. The complaint-guard mutation's replacement spans two lines, so
`replacement` was truncated back to its own first line — which is exactly the
search string. The script then replaced the anchor with itself, ran the suite
against a completely unmutated file, and recorded a result.

Verified directly rather than reasoned about:

```
needle=[export function assertNoComplaintSignal(record: unknown, where: string): void {]
repl  =[export function assertNoComplaintSignal(record: unknown, where: string): void {]
>>> CONFIRMED BUG: mutation is a no-op
```

This is the precise failure mode the mutation gate exists to prevent, in the
mutation gate itself: a green result that proves nothing. It was found by an
independent review track, not by me.

Fixed by parsing records with an explicit record/field separator instead of
`read`, and by making the runner refuse a mutation whose replacement equals its
search string rather than silently applying a no-op.

## Finding F-7: the refusal guarantee is bypassable, and naming is why

Raised by the independent review track as an open escalation
(`review/ESCALATION.md`), executed rather than theorized, and re-verified after
the Phase 1 guard was wired into the shipped path.

Wiring `assertNoComplaintSignal` into `allocateHours` closes the case where a
contractor names the field honestly. It does not close the case where the same
numbers arrive in `planning_load`:

- `pipeline/src/stillhere_pipeline/contracts.py` requires only that
  `planning_load` be a nonnegative number.
- `adaptDemoV1` reads it with no validation of meaning.
- `allocateHours` weights on it directly.

The plan is materially re-ranked and nothing anywhere says so, while the
artifact continues to declare `planner.constraints.complaint_data_used: false`
and pass its own contract.

Both existing guards — the runtime `COMPLAINT_FIELD_PATTERN` and the
compile-time `ExcludesComplaintSignal<T>` — match field *names*. They are the
same check at two different times, so they fail together against the same
input. Neither can see what a number means.

This does not contradict invariant 1 as literally worded — complaint volume is
not *representable as a field* — but it does falsify the guarantee the code
comments and README state, which is that complaint volume cannot influence
planning. The honest claim, until this is closed, is "the planner does not read
a complaint field."

Closing it needs a value-provenance claim at the artifact boundary rather than
another name check: `planning_load` arrives with a declared derivation, the
contract enumerates permitted derivations, and anything else is refused.
Assigned to the Phase 1 workstream.

**Status: closed as far as it closes, 2026-08-23.** The derivation check
landed in `pipeline/src/stillhere_pipeline/contracts.py` and
`assertDeclaredPlanningLoad`; the review re-ran the attack and it is refused.
Moving the same payload one step upstream — rewriting `forecast.areas[].upper`
so the two reconcile — is still accepted, so the boundary moved rather than
disappeared. The claim was rewritten to match where the boundary actually
sits, and the narrow form is recorded in `docs/project/DECISIONS.md`:
complaint volume cannot reach allocation without also corrupting the published
forecast interval, which is derived from checksummed inputs. Anything wider
than that is a regression in prose.


## Finding F-8: the shipped map's geometry has no verifiable provenance

Raised by the independent review track.

`scripts/gen_area_outlines.py` produces `AREA_MAP_GEOMETRY`, the six
neighborhood outlines the app draws. It read
`Downtown_BlockGrid.geojson` from `/Volumes/A/stillhere/...` — an absolute path
on one machine — so nobody else could rerun it at all.

Worse than the path: that GeoJSON appears in **neither**
`data/cards/checksums.sha256` **nor** any file list in `scripts/fetch_raw.sh`.
Every other demo input is pinned and verified; this one is not. So the geometry
the deployed map derives from cannot be checked against a pin, and a changed or
substituted grid would not be detected.

Nothing here leaks: the outlines are dissolved to area level in viewBox units,
no block geometry or coordinate ships, and the privacy scan confirms it. The
problem is provenance, not privacy.

Partially fixed. The path is now an argument defaulting to the repository-
relative bundle location, and the script fails with a usable message rather
than a traceback. Pinning the file requires the organizer bundle, so the gap
stays open (see F-2).

**What it bounds.** The organization profile already marks
`geography.boundaries` as `unresolved`, which was the right call for a
different reason — the only geometry the project holds is on the deployment
deny-list. This adds a second reason: that geometry is itself unverified. The
map is a derived illustration, and the provenance disclosure should not imply
otherwise.
