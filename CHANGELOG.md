# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file was reconstructed from the commit history on 2026-08-23, when the
repository carried no tags at all, so everything built between 2026-08-20 and
2026-08-23 is collected under a single `1.0.0` heading rather than back-dated
into versions that never existed. `v1.0.0` is now tagged at the end of the
truth pass below. It marks the point where every adopter-facing claim is
backed by code or by a declared limitation and CI fails if one is not; it does
not mean the limitations are gone. They are listed, in severity order, in
`review/RISK-REGISTER.md`.

## 1.1.0 - 2026-08-24

### Added

- **Contracted capacity as context.** The City's executed street-outreach
  contract requires four outreach staff a day across two shifts, seven days a
  week. It is quoted beside the plan and it is **not a target and not an
  input** — it states what a contract requires rather than what was fielded,
  and it covers a different program. Nothing divides one into the other,
  because the result would read as a coverage ratio and would not be one.
- **A portability lint** (`stillhere_pipeline.portability`), stage 1 of
  `verify.sh`. Eleven constructs that mean different things on BSD and GNU, each
  with a known-bad line in the test file. Its first fixture is not invented: it
  is the literal `mktemp -t` line that shipped and broke CI. Run against the
  commit CI rejected, it finds all three real occurrences — two more than the CI
  run did, because CI stopped at the first.
- **`stillhere_pipeline.sdrdl`**, the reconciliation between the public SDRDL
  package and the official published series, with fourteen tests on
  hand-computed values.
- **`docs/project/DATA_OPPORTUNITIES.md`**, an investigation executed against
  the real files. Seventeen sources are pinned; four feed the artifact and
  eleven feed no computation.

### Changed

- **San Diego is the scope, not a first instance.** Portability moves from a
  high-severity risk to a declared non-goal. The declaration and its build check
  stay, because under a San-Diego-only scope they cost nothing and are what stops
  the promise reappearing in a document by accident.
- **`scripts/` is covered by ruff and mypy**, which it never was. mypy found a
  real defect the moment the code was in scope: floats accumulating into an
  int-typed `Counter`, where the multiplied values are fractional.

### Fixed

- **Deploy could be reached by a fork's pull request.** `verify` runs on pull
  requests, and a `workflow_run` branch filter matches the *triggering* run's
  head branch — so a fork PR opened from a branch named `main` satisfied the
  gate and would have had its own commit published. The job now also requires
  the triggering event to be a push from this repository.
- **`verify.sh` and `refresh.sh` could not run on Linux at all.** `mktemp -t
  NAME` is a prefix on BSD and a malformed template on GNU. Every local run was
  a Mac; the first CI run failed.
- Two defects in the SDRDL reconciliation, both found by writing its tests: a
  gap at the end of the package could never be reported, and the
  within-tolerance figure decided its own boundary by floating point.

### Findings that did not survive execution

- Extending the observation history to 2014 from the public package **fails**.
  2014 and 2015 record 100% individuals and 2016 records 99.8%, against 11-36%
  structures from 2017 on. That is an annotation change, not tents appearing
  downtown in 2017, so multipliers have nothing to act on and the level is not
  comparable across the break.
- What replaced it is worth more: across 70 overlapping months the independent
  digitization reproduces the official total at a **median ratio of 0.991**,
  with yearly medians of 0.995 to 0.984 and no drift. Nothing else in this
  repository corroborates the evidence base from outside itself.

## 1.0.0 - 2026-08-24

### Truth pass — every adopter-facing claim backed, or declared

A session spent making the artifact's claims and the artifact's behaviour the
same thing, and putting a machine in the way of them diverging again.

**Gates that passed without earning it.** `mutation_check.sh` graded a mutation
as caught when the suite failed, with no check that the suite was green first —
so a suite already failing caught everything and the gate printed PASSED having
proved nothing. Two agents reported ten of ten over a red suite before it was
found. It now refuses to run unless the baseline is green. The claim inventory's
`--pytest-summary` returned "unreconciled" when its input was missing, so a
broken `mktemp` would have left the skip ledger asserting nothing behind a green
stage. A Python test returned early when its input was absent and reported
*passed*: its cross-check against the publisher's own totals had never once
executed, sitting first behind that return and then behind an undeclared
dependency. It now reads the workbook with stdlib `zipfile` and skips honestly
when it is absent.

**A live mutation was found in the working tree** with the complaint-signal
guard disabled — `assertNoComplaintSignal` skipping every key — left by an
interrupted run whose restore never fired.

**The same guard defect, on a new path.** The actuals loader carried its own
English-only complaint list, and the free-text scan on the measure definition —
the documented laundering site — missed Spanish outright. That is Escalation 3
reintroduced on an import path that did not exist when Escalation 3 was fixed.

**Claims narrowed to what is true.** An unsourced geography no longer loads: an
area list must resolve to a real published source, and `illustrative` — a
status meaning "this place does not exist" — is gone from the schema, the
loader, the types and both catalogues. Scenario labels derive from the loaded
profile and cannot state another geography. Six currency strings stopped
asserting a publication schedule the artifact explicitly refuses to claim. The
hero lede now names the evidence as San Diego's methods exhibit before its first
numeral. Six test names stopped claiming more than their bodies establish.

**The portability evidence was void and is recorded as void.** It came from
running an invented profile. Nothing here has demonstrated portability to a
non-San-Diego geography, and `config/portability-demonstrated.v1.json` now
declares that, enforced by the claim inventory.

### Added

- **Plan against delivered.** An actuals file is read in the browser — nothing
  is uploaded, there is no server to upload to — and one screen shows planned
  against delivered hours per area with the plan error visible. No total is
  computed across areas or months, because a sum would let a reader subtract
  back to a count the file withholds. What the comparison is *not* is declared
  and pinned: it does not score the published count forecast, and cannot.
- **The claim inventory gained a seventh check**, binding a claim to a
  machine-readable declaration so a claim and its bound cannot drift apart.
- **A prerequisite stage in `refresh.sh`**, so a non-developer's first failure
  names what to install rather than pip. Every failure path was triggered and
  observed, not reasoned about.
- **What to do while the publisher is late**, on the page where a stale badge is
  read rather than only in the runbook.
- **The review track is published**, with closed findings stamped RESOLVED and
  their bodies left as written, and a risk register reordered by severity
  instead of by what an evaluator notices.
- **The adversarial harnesses run.** `review/attacks/` shipped for the first
  time and was wired into `verify.sh` as stage 4, 46 tests across 12 files.
  Thirteen were failing and none was a live regression: five fixtures that
  predated a hardening, and eight that asserted an attack *succeeded* and now
  assert it is refused. Two are refused by an error whose text cites those very
  attacks by name.

### Fixed

- **Deploy no longer runs without verify having passed** for that commit — and
  not on a fork's pull request either. `verify` runs on pull requests, and a
  `workflow_run` branch filter matches the *triggering* run's head branch, so a
  fork PR opened from a branch named `main` would otherwise have satisfied the
  gate and had its own commit published. The job now also requires the
  triggering event to be a push from this repository.

Everything below was built on 2026-08-23 to move the project from a hackathon
artifact to something a partner nonprofit can adopt, configure for its own
geography, and operate monthly.

### Added

- **Apache-2.0 `LICENSE`**, chosen for its explicit patent grant, plus
  `SECURITY.md`, `CONTRIBUTING.md`, this changelog, and
  `docs/project/DATA_GOVERNANCE.md` — the document a general counsel reads
  before a program director reaches the methodology.
- **Organization profiles.** `config/schema/organization-profile.v1.schema.json`
  plus two validating profiles, both San Diego and both sourced to the same
  pinned DSDP report. `?profile=san-diego-dsdp-seven` runs the tool on the
  publisher's full seven-area geography — the six-area core plus Outside
  Perimeter — with a different area count, budget, floor, and increment, and no
  code change. Provenance is a required structured field, so an adopter cannot
  leave it null by accident.
- **A monthly `refresh` command** a human runs: fetch, audit, contract-check,
  emit. `--dry-run` checks everything and writes nothing; `--source fixture`
  works from a clean checkout with no network; `--source published` re-derives
  currency for an artifact that already exists and refuses to change any
  analytical value.
- **A currency badge** distinguishing current, publication-overdue, and "this
  artifact states no currency", and a display path for observed-but-not-
  model-eligible months carrying the artifact's own exclusion reason verbatim.
- **A thin cost layer**: a loaded hourly rate surfaced as an operator-set
  assumption, cost per area, total plan cost, and the marginal cost of the
  continuity floor. Cost per person, per contact, and per person-equivalent are
  unrepresentable by construction.
- **An actuals ingest contract** at area-month grain under the existing
  suppression policy. The schema and loader only; the analysis is documented
  and deliberately not implemented, because there is no operator data yet.
- **Field use**: plan state encoded in a readable share link behind an
  allowlist, CSV and print/PDF export, and a printable phone-sized shift sheet.
- **A first-class CLI for the digitization audit** (`stillhere-audit`).
- **The adoption packet**: `docs/adoption/BRIEF.md` for a board and
  `docs/adoption/EVALUATION_CHECKLIST.md` for due diligence.
- **Spanish**, with locale scaffolding and a `lang` declaration that changes.
- `docs/project/DECISIONS.md`, `ACCESSIBILITY.md`, `REFRESH.md`,
  `ORGANIZATION_PROFILE.md`, `ACTUALS.md`, `DIGITIZATION_AUDIT_CLI.md`,
  and `docs/adoption/RUNBOOK.md`.

### Changed

- **`App.tsx` went from 3,799 lines to 53.** Shell state lifted into a store
  read through context; every JSX region moved into the feature directory it
  belongs to, filling three directories that held only `.gitkeep`. Verified by
  rendered-output diff across an eight-step scripted interaction against
  identical library code: zero semantic difference.
- **`planning_load` must now declare where it came from**, and the claim is
  checked by arithmetic against a value already in the same document.
  `complaint_data_used` is derived from those declarations rather than asserted
  by the writer.
- **Cost denominators are an allowlist**, not a denylist of words meaning
  "human being".
- **Both refusal guards now walk `Map` and `Set`.** `Object.entries()` returns
  `[]` for either, so every field inside one passed in silence.
- Share links require all seven — now eight — fields rather than substituting
  defaults for three of them.
- **The second example profile is a real published geography.** It was
  briefly a fictional rural Continuum of Care with invented area names, an
  invented scope statement, and an invented adjacency table. Labelling it
  illustrative did not make it acceptable in a repository about real
  homelessness in a real city, and it was unnecessary: the publisher's own
  seven-area geography was already transcribed in
  `data/monitoring/dsdp_public_checkpoints.csv`. Every area this project
  names is now a real San Diego area with a real source.

### Fixed

- **A regression the test suite did not catch**: the disclosure drawer rendered
  unconditionally instead of behind its toggle. Found by the rendered-output
  diff.
- **Eight `aria-label`s on roleless `<div>`s** — prohibited by ARIA, so screen
  readers ignored them — and one real contrast failure, `--faint` at 4.13:1 on
  panel backgrounds across 17 body-text rules. Both were classified *incomplete*
  rather than *violation*, so a pass/fail summary called the shell compliant.
- **`scripts/mutation_check.sh` reported a false pass.** `IFS=$'\t' read` stops
  at the first newline, so a two-line replacement was truncated back to its own
  search string and the script graded an unmutated file. Two further mutations
  were proven equivalent mutants and replaced with killable ones.
- **`main` did not compile for three commits**, because the cost layer's
  consumer was committed without the shell producer it reads from. While that
  stood, `ExcludesComplaintSignal` was unexported and the compile-time complaint
  guards in two modules proved nothing.
- `gen_area_outlines.py` read its input from an absolute path on one machine.

### Security

- The enumerated refusals are build-breaking rather than upheld by discipline.
  An adversarial pass ran ten routes; two got through and were closed.
- **The refusal claim is now stated narrowly and the narrow form is recorded**
  in `docs/project/DECISIONS.md`: complaint volume cannot reach allocation
  without also corrupting the published forecast interval, which is derived
  from checksummed inputs. The former claim — that complaint volume cannot
  influence planning — was false as stated, and an independent review proved it
  by executing the attack.

### Known limits

Recorded in `docs/project/PHASE0_FINDINGS.md` and repeated in the adoption
brief rather than left for an adopter to discover:

- The shipped artifact is verifiable against pinned checksums but **not
  regenerable from a clean checkout**, because its five source files are not
  redistributable (F-2).
- Geography boundaries and adjacency are **unresolved**, with documented
  reasons, and the map outlines derive from an input carrying no pinned
  checksum (F-8).
- The privacy scanner still **infers** which numbers are people-counts from
  document shape for the shipped artifact.
- A cost divided by an engagement count yields a per-person figure no
  field-level guard can see. The guarantee is that no such figure can be
  stored, exported, or displayed.

## Pre-release history - 2026-08-20 to 2026-08-23 (never tagged)

> This entry describes the state of `main` across the build days before any
> release existed. It was written when `git tag` returned nothing, which was
> finding F-5. That is no longer true: `v1.0.0` was cut and pushed on
> 2026-08-24, and the work below sits underneath it rather than being it.

First versioned state. Built for the Building for Good Hackathon; before the
hacking window the repository held only empty infrastructure and planning
documentation.

### Added

- **Analysis pipeline** (`pipeline/`, Python): deterministic ingestion,
  validation, normalization, aggregation, and a quality report; a
  seasonal-naive baseline forecast with rolling-origin backtests; the drop
  test; and a byte-reproducible export of the single deployment artifact
  `public/generated/demo.v1.json`.
- **Decision experience** (`app/`, React + Vite + TypeScript, static): the
  component-evidence story view, the historical January 2026 forecast replay,
  the staff-hour planner with a user-set continuity floor and live what-if
  replanning, the intervention assumption explorer, saved scenarios, and a
  copyable decision brief that carries evidence, uncertainty, and every human
  change.
- **Map workspace**: one map with switchable layers (planned hours, observed
  change, unmet load), real neighborhood boundaries, and a tabbed inspector
  holding plan controls, a per-area dossier, scenarios, and the brief. The
  story view and the workspace share one state.
- **Guided demo**: a ten-step hands-on tour that asks the operator to work the
  real controls and detects when they have.
- **Source ledger** (`data/cards/source_ledger.yaml`) with pinned SHA-256
  snapshots (`data/cards/checksums.sha256`) and a reproducible retrieval
  script (`scripts/fetch_raw.sh`).
- **Small-cell suppression** in the observations emitter
  (`pipeline/src/stillhere_pipeline/suppress.py`), with complementary
  partners and an explicit attacker-model escalation, governed by
  `docs/policy/small-cell-suppression.md`.
- **Deployable-data privacy boundary**
  (`pipeline/src/stillhere_pipeline/privacy.py`): forbidden field names,
  forbidden value patterns, aggregate-geometry-only coordinates, a San Diego
  numeric heuristic, small-cell detection by document context rather than
  field name, publication-layout rules, and a production-bundle and
  source-map scan. Fails closed.
- **Fairness-constrained planner**: a 6-hour minimum coverage floor, a
  continuity reserve for `possible_displacement` areas, an
  upper-prediction-bound uncertainty policy, deterministic largest-remainder
  rounding, preserved human locks, and a declared infeasible result with
  named reasons.
- **Contract declaration** in the observations artifact — count fields,
  threshold, and suppression marker — plus a TypeScript mirror of the
  observations and quality-report contracts.
- **Monitoring lane** (`data/monitoring/`): DSDP April and June 2026
  publisher checkpoints, RTFH 2026 PITC and monthly HMIS references, and
  SDHC/HUD system-context source records. Every row is
  `model_eligible=false`.
- **Digitization audit** (experimental): OCR over the scanned, hand-annotated
  field sheets with a swappable engine — local Apple Vision offline, or the
  EyePop.ai VLM by flag and fail-closed without a key — reporting only
  area-scale integer values, plus a cross-resolution agreement card.
- **Public-records lane**: a vetted PRA download batch (street outreach,
  Homelessness Response Center, encampment operations) pinned and ledgered,
  with pending requests disclosed.
- **Verification and CI**: `scripts/verify.sh` as the single gate;
  `.github/workflows/verify.yml` on pushes to `main` and `track/**` and on
  every pull request; `.github/workflows/deploy-pages.yml`, which
  independently privacy-scans the exact bundle it is about to publish; all
  third-party actions pinned by commit SHA.
- **Characterization safety net and mutation gate** (Phase 0):
  `scripts/mutation_check.sh` breaks both planners ten ways and fails if any
  mutation survives the suite, wired into `.github/workflows/mutation.yml`.
- **Offline operation**: a service worker caching the static bundle, so the
  tool works offline once loaded.
- **Documentation**: technical overview, methods, data dictionary, data
  quality audit, data strategy, drop-test rules, forecast scorecard, artifact
  contracts, the C-02 privacy-boundary record, the suppression policy, and
  the product docs (demo script, five-minute presentation, judge Q&A,
  storyboard, usability and accessibility protocol).

### Changed

- `README.md` was restructured twice: first into linked focused documents,
  then into a short front door with the depth moved to
  `docs/project/TECHNICAL_OVERVIEW.md`, and finally re-led with the map
  workspace screenshot.
- The demo script was retimed to the real five-minute slot.
- Hero and scorecard labeling were revised after external review.
- `config/decision.v1.json` was marked superseded in `config/README.md`: it
  records the initial East Village/displacement concept and is not consumed
  by the released interface. The authoritative runtime contract is
  `public/generated/demo.v1.json` (`stillhere.demo.v1`).
- Planner and map copy went through a plain-language pass constrained to the
  privacy-safe vocabulary.

### Fixed

- The scenario artifact is fetched relative to the Vite base URL, so the
  project-path deployment resolves it correctly.
- The service worker revalidates past the HTTP cache, so a GitHub Pages
  `max-age=600` `index.html` can no longer pin a returning visitor to a
  previous deploy's hashed assets.
- Privacy checks are scoped to published observation cells rather than every
  integer in the document.
- The keyboard listener lifecycle was stabilized.

### Removed

- The obsolete scenario reader.
- Tracked Python bytecode caches and setuptools egg-info metadata.

### Security

- The privacy scan was moved to the end of `verify.sh` so it runs against a
  bundle that actually exists, and `--require-bundle` makes a missing bundle
  a failure rather than a skipped check.
- The deploy workflow gained its own privacy gate on the exact artifact being
  published, rather than trusting the scan of a bundle built earlier from the
  same commit.
- Suppression became recoverability-aware after an adversarial pass found 7
  exactly-recoverable rows that the first certification had missed, including
  a single-person cell fully reconstructed by subtraction. `analyze_recoverability`
  now blocks on exact recovery, pinned cells, and unique value multisets.
- The forbidden-key list was extended with source-grain identifiers and
  bounding-street labels from the real bundle, which locate a block as
  precisely as a coordinate would.

### Known limitations at this release

Recorded rather than papered over; see
`docs/project/PHASE0_FINDINGS.md` for the full statements.

- **F-1**: the guarded planner is not the shipped planner. `App.tsx` imports
  `lib/planner.ts`, which has no `assertNoComplaintSignal` guard;
  `domain/planner/planner.ts`, which does, is tree-shaken out of the bundle.
  No complaint-shaped field reaches the shipped path today, so the invariant
  holds by authorial discipline rather than by structure.
- **F-2**: the demo artifact cannot be regenerated from a clean checkout. The
  five organizer-supplied CSVs the `demo.v1` lineage requires are not in the
  repository and are not publicly fetchable, so 15 raw-data tests skip. The
  artifact is verifiable by pinned checksum but not reproducible by an
  adopter.
- **F-3**: the April and June 2026 DSDP figures stay `model_eligible=false`.
  The exclusion is genuine — cadence break, dual paper/app collection, at
  least one count redone with differing results, and contested count months.
- **F-4**: `config/decision.v1.json` is documented as superseded but is still
  read by `domain/planner/contract.test.ts`, and the unresolved
  `geography.version: downtown-demo/pending-source-audit` lives in it.
- **F-5**: no release tag exists. `git tag` returns nothing.
