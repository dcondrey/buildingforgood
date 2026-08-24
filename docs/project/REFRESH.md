# The monthly refresh

A person runs this once a month. There is no scheduler, no cron, no workflow
trigger, and adding one is out of scope until the manual path has been run by
hand several times and its failure modes are boring.

The refresh does five things, in order, and stops at the first one that fails:

0. **Check its prerequisites** before doing any work: a writable checkout, a
   Python new enough for the pipeline, a usable `.venv`, the pipeline
   importable, and — when fetching — `curl` and `sha256sum`.
1. **Fetch** the allowlisted public monitoring sources and verify their pinned
   hashes (`scripts/fetch_raw.sh monitoring`).
2. **Audit** the monitoring table: every row model-ineligible, every month
   reconciling to the publisher's total.
3. **Contract-check** the assembled artifact against `stillhere.demo.v1` and
   the deployable-data privacy gate.
4. **Emit** `public/generated/demo.v1.json`.

Nothing is written unless all of them pass. There is no degraded output.

Stage 0 exists because the person running this is not a developer. Before it
was added, the first thing a program director saw on a cold machine was a
`pip` or `venv` traceback — a failure naming a tool they had never heard of,
from a command they were told was routine. Every way `scripts/refresh.sh` can
now stop prints `REFRESH FAILED:` and a sentence naming what is missing, what
to install, and who to ask. `docs/adoption/RUNBOOK.md` § 11 is the
operator-facing table of those messages.

Stage 0 also skips the `pip install` when the environment already matches
`pipeline/pyproject.toml`, recorded in `.venv/.stillhere-pipeline-install`.
That is not a speed optimization: without it, a monthly `--fixture` refresh on
a machine that is fully set up but offline failed at `pip` for tools it
already had.

## What you run

```sh
./scripts/refresh.sh --dry-run     # first, always
./scripts/refresh.sh               # then, if the dry run reads correctly
./scripts/verify.sh                # then, before publishing anything
```

`--dry-run` runs every check and writes nothing. Treat it as the real run and
read its summary line; the only difference in the real run is the file.

Other modes:

| Command | What it does |
| --- | --- |
| `./scripts/refresh.sh --no-fetch` | Skips the network step; audits and rebuilds from the raw files already on disk. |
| `./scripts/refresh.sh --fixture` | Runs the whole pipeline against the committed synthetic fixture. No network, no organizer bundle. This is what CI exercises. |
| `./scripts/refresh.sh --as-of 2026-09-01` | Pins the currency clock. Use only to reproduce a past run. |

Underneath, the wrapper calls `python -m stillhere_pipeline.refresh`, which
never touches the network itself. Every flag it accepts is listed by
`--help`.

## What you check, before accepting the output

The summary line prints the fields that matter:

```
REFRESH OK: {"generated_at": ..., "mode": "bundle", "next_publication_expected": "2026-09",
             "observed_not_model_eligible_months": ["2026-04", "2026-06"],
             "source_data_through": "2025-12", "status": "stale", "written": true}
```

Read it as four questions:

- **`source_data_through`** — did the modelled window actually move? If it is
  the same month as last time, the refresh found no new model-eligible data.
  That is a normal outcome, not a failure, and the honest artifact says so.
- **`status`** — `stale` or `current`. `stale` means the modelled window is
  further behind the calendar than the freshness threshold allows. Today the
  site is `stale`, and that is the correct label.
- **`observed_not_model_eligible_months`** — the months observed since the
  freeze that are deliberately excluded. These render in the UI as
  observed-but-not-model-eligible, with the exclusion reason inline.
- **`written`** — `false` on a dry run, `true` on a real one.

Then run `./scripts/verify.sh`. The refresh gates the artifact; verify gates
the whole repository including the built bundle.

## What failure looks like

Every failure prints `REFRESH FAILED:` followed by a specific reason, exits
non-zero, and leaves the previous artifact untouched.

| Message | What happened | What to do |
| --- | --- | --- |
| `checksum mismatch for …` | A pinned input changed underneath you. | Audit the change first. Only then re-pin deliberately and re-run. Never re-pin to silence this. |
| `missing input …` | A required raw file is not on disk. | For the organizer bundle, see "What is not reproducible" below. |
| `model_eligible is 'true', expected 'false'` | Someone edited the monitoring table's eligibility flag. | Revert it. See "What you must not do." |
| `monitoring reconciliation failed` | Derived core totals no longer reconcile to the publisher's total plus Outside Perimeter. | Re-read the source PDF. The transcription is wrong, or the publisher revised. |
| `model-ineligible months … reached …` | A monitoring month leaked into an observation, forecast, or planner lane. | This is the boundary the whole design exists to hold. Fix the leak; do not relax the check. |
| `contract violation: …` | The artifact does not satisfy `stillhere.demo.v1`. | Fix the producing code. |
| `privacy scan blocked …` | A published cell is below the small-cell threshold, or a precise-location field appeared. | Suppress the cell. Do not publish it. |

Those come from the Python side. The wrapper adds its own, all raised before
any data is touched:

| Message | What happened | What to do |
| --- | --- | --- |
| `this computer does not have Python installed …` | No `python3` on `PATH`. | The message names the install per platform. |
| `the Python on this computer is too old …` | `python3` predates the pipeline's `requires-python`. | Install a newer interpreter alongside; nothing has to be removed. |
| `the project's private Python folder (.venv) is damaged …` | `.venv` exists but its interpreter will not run — usually an interrupted setup or a moved system Python. | `rm -rf .venv` and re-run. A partial `.venv` the wrapper itself created is removed automatically so the failure stays reproducible. |
| `the refresh could not create its private Python folder (.venv) …` | `python3 -m venv` failed. The interpreter's own first six lines are quoted. | On Debian/Ubuntu usually `python3-venv`; otherwise disk or permissions. |
| `the refresh could not download the tools it needs …` | `pip` failed with network-shaped output. | Connectivity, proxy, or firewall. Not a data problem. |
| `the refresh could not install the tools it needs …` | `pip` failed for some other reason; its output is quoted. | Read the quoted lines. |
| `this copy of the project is read-only …` | The checkout is not writable. | Move it, or get write permission on the folder. |
| `the download step needs the … command …` | `curl` or `sha256sum` is missing and a fetch was requested. | `--no-fetch` still runs every check against what is on disk. |
| `the published source files could not be downloaded or did not match …` | `scripts/fetch_raw.sh monitoring` failed. | Two very different cases, and the message distinguishes them: a transfer failure, or a fingerprint mismatch. Never re-pin to clear the second. |
| `the refresh stopped unexpectedly …` | The Python side exited non-zero without a `REFRESH FAILED:` of its own. | A bug. The traceback above it is the report. |

A failing `tests/pipeline/test_pipeline_golden.py` is a different signal: the
pipeline's output changed. If the change is intended, regenerate the
expectation deliberately — run the fixture refresh with `--out
tests/pipeline/fixtures/refresh/expected/demo.v1.json --as-of 2026-08-23`,
read the resulting diff line by line, and say in the commit message why the
output moved. Regenerating it to clear a red test, without reading the diff,
defeats the only end-to-end guard the pipeline has.

## What you must not do

**Do not unpin an exclusion to make a badge green.** The April and June 2026
DSDP figures are pinned `model_eligible=false` for reasons recorded in
`data/monitoring/README.md` and confirmed in `docs/project/PHASE0_FINDINGS.md`
(finding F-3): a cadence break to irregular quarterly, dual paper/app
piloting, at least one count redone with differing results, contested count
months, and values that are multiplier-adjusted person-equivalents rather than
people. The update protocol's rule 5 is explicit — promotion into training or
planning requires a separate, documented model-version decision, not a
refresh run.

The refresh enforces this structurally. Flipping the flag in the CSV makes the
command fail, not succeed. That is deliberate: the temptation the failure
protects against is real, because unpinning those two rows would make the site
look eight months more current than it is.

Also, do not:

- Interpolate or zero-fill a missing month. Missing stays null.
- Relabel a quarterly dashboard value as a monthly observation.
- Re-pin a checksum without auditing what changed.
- Widen the small-cell threshold to publish a suppressed number.
- Edit `public/generated/demo.v1.json` by hand.

## The currency block

The refresh writes one new top-level key, `currency`. It is the only part of
the artifact that changes when the underlying analysis has not. It carries the
month the source data runs through, when the artifact was generated, when the
next refresh is expected, whether the artifact is stale, and the
observed-but-not-model-eligible rows with their exclusion reason.

Those rows live under `currency.observed_not_model_eligible` and nowhere else.
`assert_monitoring_isolated` re-reads the assembled document and refuses the
run if any of their months appears in the observation, forecast, or planner
lanes, so the separation is checked rather than merely intended.

`next_publication_expected` is **this project's own refresh cadence and not a
publisher commitment**, and the block says so in its own `basis` and
`source_publication_note` fields with `source_publication_scheduled: false`.
Nothing here infers when DSDP will publish, because DSDP does not announce it.

### Where the source actually stood, last time anyone checked

**2026-08-23.** `./scripts/fetch_raw.sh monitoring` fetched all three pinned
publisher documents and every one matched its recorded hash, so no publisher
had revised what this project transcribes. DSDP's own media index showed its
most recent unsheltered sleep count to be the **June 2026** report, uploaded
2026-08-11 — the one already transcribed in
`data/monitoring/dsdp_public_checkpoints.csv`. There was no July or August 2026
count report. The site being `stale` on that date was therefore a fact about
the publisher, not a missed refresh.

Re-check this rather than trusting it: the whole point of the block is that
nobody has to take a freshness claim on faith.

## What is not reproducible from a clean checkout

Honest answer, unchanged by this work: **`--source bundle` cannot run from a
clean checkout.** The five organizer-supplied files it rebuilds from
(`Area_Crosswalk.csv`, `BlockLevel_Counts.csv`,
`BlockLevel_Counts_Panel261.csv`, `DowntownCounts_Monthly.csv`,
`Methodology_Periods.csv`) are not in the repository, are gitignored, and are
not publicly fetchable. That is finding F-2, and it is a data-availability
problem, not something a refresh command can solve.

What *is* reproducible from a clean checkout, with no network and no bundle:

- `./scripts/refresh.sh --fixture` — the full audit, contract, privacy and
  emit path, against the committed synthetic fixture.
- `tests/pipeline/test_pipeline_golden.py` — the same path, asserted field for
  field.

So the pipeline's *behavior* is now reproducible and pinned; the shipped
artifact's *inputs* still are not.
