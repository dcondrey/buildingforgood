# Contributing

Thank you for looking at this. Read this file before opening a pull request;
most of it is about what this project will not accept, and that part is not
negotiable.

## The invariants

Seven properties define what this tool is. **A contribution that weakens any
one of them is a defect, regardless of what else it improves.** A faster
planner that drops the complaint guard is a regression. A prettier map that
publishes a point geometry is a regression. A better forecast that reads its
own target month is a regression. There is no performance, usability, or
elegance argument that outranks these.

### 1. 311 volume is excluded from allocation by type, not by convention

Complaint volume measures reporting behavior, not need. Its only permitted
uses are the two named in `config/decision.v1.json`:
`source_disagreement_diagnostic` and `reporting_bias_diagnostic`. Its
excluded uses are `person_count`, `service_need`, `planning_load`, and
`allocation_target`.

"By type, not by convention" means the exclusion must be structural. The
planner's input type must not carry a complaint-shaped field, and
`assertNoComplaintSignal` (`app/src/domain/planner/planner.ts`) throws at the
boundary where untyped artifact data becomes planner input. It runs on the
shipped path, `App.tsx` → `app/src/lib/planner.ts`. Adding a complaint-shaped
field to a planner input type is the change to refuse, even if nothing reads
it yet. Work that adds a second ungated allocation path is refused too.

**State this invariant no wider than it holds.** Both the type check and the
guard match field _names_, and a number carries no name. An independent review
wrote 311 counts into `planner.allocations[].planning_load` — a legally named,
correctly typed field — and the shipped allocator re-ranked the plan. What
holds the line now is `assertDeclaredPlanningLoad` and the artifact validator
in `pipeline/src/stillhere_pipeline/contracts.py`: every `planning_load` must
declare a derivation from an enumerated set, and the validator recomputes it
against a value already published elsewhere in the same artifact. So the claim
to make in a pull request, a README, or a demo is:

> Complaint volume cannot reach allocation without also corrupting the
> published forecast interval, which is derived from checksummed inputs.

Not "complaint volume cannot influence planning." That version was tested,
falsified, and withdrawn; see
[`docs/project/DECISIONS.md`](docs/project/DECISIONS.md) and
[`docs/project/PHASE1_ADVERSARIAL.md`](docs/project/PHASE1_ADVERSARIAL.md).
Restoring the broad wording anywhere is a defect on the same footing as
weakening the guard.

### 2. The four refusals hold

From `README.md`, the four sentences this product is designed to refuse:

- "These people moved from one block or neighborhood to another."
- "A policy caused the decline."
- "This area needs enforcement."
- "A shelter has capacity or someone is eligible for a service."

Concretely, this rules out: sorting or ranking areas by complaints or by any
nuisance proxy; any enforcement framing in copy, labels, tooltips, or
variable names; causal language about observed declines; and any claim about
live shelter capacity, bed availability, or service eligibility. The planner
declares `not_in_scope`: live routing, shelter capacity or eligibility,
person-level prioritization, enforcement recommendations.

Copy is part of the product here. A pull request that changes only wording
can violate this invariant.

### 3. No PII; area-month aggregates only; the privacy scan keeps passing

The deployed product publishes aggregate observations at planning-area grain
and monthly time grain. No person-level record, no coordinate, no address, no
block identifier, and no bounding-street label may reach a generated artifact
or the production bundle.

`pipeline/src/stillhere_pipeline/privacy.py` enforces this and fails closed.
It runs as step 3 of 3 in `./scripts/verify.sh`, after the production build
so it can scan `app/dist` and its source maps, and again in
`deploy-pages.yml` against the exact bundle being published. A `BLOCK`
finding fails the build.

Do not add allow-list entries to silence a finding. The documented way to
handle noise is to name a genuinely structural key, never to narrow what gets
scanned — see the round-5 discussion in
[`docs/track-c/C-02-privacy-boundary.md`](docs/track-c/C-02-privacy-boundary.md).
Over-blocking is the acceptable error direction.

### 4. No LLM in the decision path

No language model determines a drop classification, a forecast, or an
outreach allocation. The pipeline is deterministic and the artifact is
byte-reproducible. AI assistance during development is disclosed in the
README; that is a statement about how code was written, not about what runs.

A pull request that adds a model call anywhere between source data and a
displayed number will be closed. Optional, clearly-labeled, off-the-decision-
path tooling (for example the digitization audit's OCR engines, whose output
is explicitly labeled as candidates for human verification and never as
counts) is a different thing and is scoped as such.

### 5. Leakage control in the forecast replay is preserved exactly

The January 2026 replay is honest only because of how it is fenced. From
`pipeline/src/stillhere_pipeline/forecast.py` and the `leakage_control`
declaration the pipeline emits:

- Backtesting walks the history in chronological order. Every prediction uses
  only months strictly before its target.
- No random split. Model promotion ends before the separately reported 2025
  audit window begins.
- The interval at each evaluated point is built only from residuals of
  earlier points — walk-forward empirical coverage, not in-sample.
- Seasonal naive stays the baseline unless a challenger has strictly lower
  rolling-origin MAE on the 2023 promotion holdout.

Changes that reduce evaluated points, widen a training window into the
target, reuse an audit target for promotion, or compute an interval from the
full residual pool are all leakage, and all of them make the numbers look
better. That is why they are called out by name.

### 6. Every displayed number traces to a source-ledger card

`data/cards/source_ledger.yaml` is the provenance record for everything the
product publishes, and `data/cards/checksums.sha256` pins the exact input
snapshots. The demo artifact embeds `generated_from.input_sha256`, and
`tests/pipeline/test_demo_provenance.py` asserts that every embedded input
hash has an exact pin and that the ledger's declared file surface matches.

A new displayed number needs a lineage: a ledger source entry with its
publisher, time grain, geographic grain, permitted uses, and limitations, and
a pinned snapshot. A ledger entry does not by itself make a source eligible
for the forecast or planner — each lineage declares its permitted and
excluded uses, and monitoring-lane rows stay `model_eligible=false` until a
separate documented model-version decision says otherwise.

Do not hard-code a figure in the UI. Do not re-derive one from a screenshot
or a press release.

### 7. The suppression policy is unchanged

[`docs/policy/small-cell-suppression.md`](docs/policy/small-cell-suppression.md)
is the single written source for the suppression branches the emitter may
take. Two enforcement points cite that list and must change with it:

- Emitter: `pipeline/src/stillhere_pipeline/suppress.py`
- Scanner: `analyze_recoverability` in
  `pipeline/src/stillhere_pipeline/privacy.py`

Adding, removing, or reordering a branch without updating the document and
both enforcement points is a policy violation, not a refactor. The scanner's
feasible set mirrors the policy deliberately: a set wider than the policy
models a weaker attacker and produces false negatives.

Changing `SMALL_CELL_THRESHOLD`, publishing a rollup total, or relaxing the
recoverability escalation are all policy changes and need to be argued as
such, not landed inside a refactor.

## Running the gates

Prerequisites: Node.js 20+ (CI uses 24) and Python 3.11+.

### `./scripts/verify.sh`

The single top-level gate. It is what CI runs, in the same order, and it
should exit 0 before you open a pull request.

```bash
./scripts/verify.sh
```

It creates `.venv` and installs `pipeline[dev]` if needed, then runs:

1. **Pipeline** — `ruff format --check`, `ruff check`, `mypy`, `pytest tests -q`.
2. **App** — `prettier --check`, `oxlint`, `vitest run`, production build.
3. **Privacy** — `python -m stillhere_pipeline.privacy --root . --require-bundle`.

Step 3 runs last on purpose. It scans `app/dist` and its source maps as well
as `public/generated/`, so running it before the build meant the bundle half
of the check silently degraded to a warning. `--require-bundle` turns a
missing bundle into a failure, so the gate cannot pass by never having built.

Raw-data tests skip in a clean checkout: `data/raw/` is gitignored and the
five organizer-supplied CSVs the `demo.v1` lineage needs are not
redistributable. Those skips are expected. See
[`docs/project/PHASE0_FINDINGS.md`](docs/project/PHASE0_FINDINGS.md) finding
F-2 for why, and treat it as a fixture problem rather than a reason to relax
a test.

If you changed the shipped artifact, regenerate it deterministically first:

```bash
PYTHONPATH=pipeline/src .venv/bin/python -m stillhere_pipeline.demo
```

### `./scripts/mutation_check.sh`

A test suite is worth what it catches. This script deliberately breaks both
planners in ways a careless refactor plausibly would, runs the TypeScript
suite against each break, and **fails if any mutation survives** — that is,
if the suite stays green while the planner is wrong.

```bash
npm ci --prefix app          # once, if app/node_modules is absent
./scripts/mutation_check.sh
```

Two rules to know before you run it:

- **It refuses to run against a dirty tree.** It rewrites
  `app/src/lib/planner.ts` and `app/src/domain/planner/planner.ts` in place
  and reverts them with `git checkout --`, including on interrupt. Commit or
  stash changes to those two files first; the refusal exists so a failed
  revert can never eat uncommitted work.
- **It mutates both planners on purpose**, because `lib/planner.ts` is what
  the deployed app runs and `domain/planner/planner.ts` is what carries the
  refusal guarantees (finding F-1 again).

The ten mutations cover: the coverage floor short by an hour, the guard flag
ignored, largest-remainder ordering reversed, the budget-conservation check
disabled, a coordinator lock losing to the computed value, the
complaint-signal guard neutered, the continuity reserve never granted,
guaranteed hours rounded the wrong way, the "not a need estimate" disclosure
dropped, and an infeasible plan reported as planned.

`SURVIVED` means your suite does not catch a broken planner. Add a test that
fails for that mutation, then re-run. `SETUP FAILED  … (anchor missing)`
means you legitimately moved the code the script anchors on; update the
anchor in the script in the same pull request.

CI runs this workflow (`.github/workflows/mutation.yml`) whenever either
planner, a planner test, or the script itself changes.

## Writing tests: the name is the claim

**A test's name is a claim about what is covered, and an over-broad name is
worse than no test at all.** Having no test leaves an obvious hole, and a
reader auditing coverage will go looking. A test named for a property its
body does not check fills that hole with a green tick, and the suspicion
that would have produced a real test never arrives. The name is the only
part of a test most people ever read.

Before you open a pull request, apply this to every test you touched:

> If I deleted the body and kept only the name, would the name still be a
> true description of what is covered?

Where the answer is no, **broaden the body rather than narrowing the name**.
A test named for the real property, made to actually check that property, is
worth more than an honest but narrow name. Narrow the name only when
broadening is genuinely out of scope, and say so in the pull request.

Four shapes to watch for, each of which has shipped here:

- **A name quantifying over a set, and a body enumerating a subset.**
  "every", "all", "each", "any", "never", "anywhere". Derive the enumeration
  from the set — the schema's `required` array, the module's own registry or
  deny-list, `readdirSync` over the directory. A hand-listed set silently
  stops covering new members, and nothing fails when one is added.
- **A name asserting a property, and a body asserting an incidental fact.**
  A fact that is true today and not guaranteed tomorrow passes now and
  breaks later for no reason, which teaches people to edit the test rather
  than read it.
- **A name asserting refusal, and a body checking only the easy refusals.**
  Refusal tests attract the cases that already work.
- **A test that would still pass if the feature it names were deleted.**
  Two identical inputs proving each other equal is the classic form.

### The three that got past us

Concrete history teaches this better than the principle does. All three were
found by an independent reviewer, because this is the class of defect an
author structurally cannot see in their own work.

1. **The share link.** `planShareState.test.ts` had a test named "refuses a
   hand-edited link rather than restoring part of it" with nine cases. Every
   one supplied a malformed _value_, or omitted one of the four fields that
   already refused. None omitted the three fields that were being silently
   defaulted — and a dropped `rate` moved a plan's cost from $7,500 to
   $5,400, while a dropped `share` set the clearance assumption to 100%, the
   maximum. Green test, name promising seven fields, body checking four.
2. **The mutation gate.** `scripts/mutation_check.sh` reported "10 of 10
   mutations caught" while at least one mutation was never applied: a shell
   parsing bug replaced the search string with itself, so the gate graded an
   unmutated file and recorded a result. Finding F-6 in
   [`docs/project/PHASE0_FINDINGS.md`](docs/project/PHASE0_FINDINGS.md).
3. **The currency block.** A test asserted the shipped artifact had no
   `currency` key. That was an incidental fact when it was written, not a
   property, so it failed the moment a refresh added one — with nothing
   wrong. The property it meant to assert was that an artifact _without_ a
   currency block degrades rather than guessing, which is now built
   explicitly instead of borrowed from the artifact.

### Two rules that follow from it

- **A table-driven test must fail when its table is empty.** If the probes,
  cases, or fixtures for one entry are missing, assert that before asserting
  what they prove — otherwise adding a new entry with no cases is a silent
  pass. `refusals.test.ts` checks that every refusal has probes before
  checking that the probes are caught.
- **Say what a derived set is derived from.** When a test reads a schema, a
  registry, or a directory to build its cases, a one-line comment saying so
  stops the next maintainer from "simplifying" it back into a literal list.

## Pull requests

- One concern per pull request. A copy change and a planner change should not
  travel together; the invariants above make copy a load-bearing surface.
- Say which invariants your change touches, and how you know it does not
  weaken them.
- If you changed the suppression policy, the privacy rules, or the artifact
  contract, update the governing document in the same pull request. The
  documents are the authority; the code cites them.
- Read every test name you added or touched as if the body were deleted, per
  "Writing tests: the name is the claim" above.
- Add a `CHANGELOG.md` entry under `[Unreleased]` for anything a user or an
  adopting organization would notice.
- Do not add empty stubs, placeholder values, or "temporarily disabled"
  comments to make something compile or pass. Diagnose why the symbol is
  missing instead.

## Adopting this in another geography

If you are evaluating this tool for your own organization rather than
contributing code, start with
[`docs/project/DATA_GOVERNANCE.md`](docs/project/DATA_GOVERNANCE.md). It
states what data enters the system and at what grain, what you must supply,
what you must never supply, and what the tool refuses to do with what it
holds.
