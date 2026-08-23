# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This file was reconstructed from the commit history on 2026-08-23. The
repository carries no tags at all, so everything built between 2026-08-20 and
2026-08-23 is collected under a single `1.0.0` heading rather than back-dated
into versions that never existed. That heading names the intended first
version; it is not a published release. See the note under it.

## Unreleased

### Added

- `LICENSE` — Apache-2.0, copyright David Condrey. Chosen for its explicit
  patent grant.
- `SECURITY.md` — what a vulnerability means in a system with no backend, no
  accounts, and no server-side data; the four report categories that are real
  here (supply chain, build and deploy pipeline, privacy-scan bypass,
  data-boundary regression); reporting address and a response window sized for
  one maintainer.
- `CONTRIBUTING.md` — the seven non-negotiable invariants, and how to run
  `./scripts/verify.sh` and `./scripts/mutation_check.sh`.
- `CHANGELOG.md` — this file.
- `docs/project/DATA_GOVERNANCE.md` — what data enters the system and at what
  grain, what an adopting organization must and must never supply, what the
  tool refuses to do with what it holds, and why retention is not a question
  that arises.
- A License section and links to the above from `README.md`.

This closes finding F-5 in `docs/project/PHASE0_FINDINGS.md` ("no LICENSE, no
release tag") on the license half. There is still no release tag.

## 1.0.0 - 2026-08-23 (not tagged)

> No `v1.0.0` git tag exists. `git tag` returns nothing, which is finding F-5
> below. This entry describes the state of `main` on 2026-08-23; it is not a
> published release, and there is no compare link or release page to point at
> until the tag is cut.

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
