# Why the April and June 2026 DSDP figures are pinned `model_eligible: false`

**Queue item 2.1.** Independent investigation, written before reading the build
session's own conclusion so the two are genuinely separate reads.

**Recommendation: keep them pinned `false`. Do not unpin for currency.**
The exclusion is methodologically correct, thoroughly documented, and would be
wrong to relax. There is no undocumented gap here.

---

## What is pinned

`data/monitoring/dsdp_public_checkpoints.csv` — 18 rows, all
`model_eligible=false`, all `source_id=dsdp_public_monthly_reports`:

| Report month | Series | Value |
| --- | --- | ---: |
| 2026-04 | six area totals + Outside Perimeter | 571 / 209 / 38 / 17 / 77 / 47 / 133 |
| 2026-04 | `six_area_core_total` (project-derived) | 959 |
| 2026-04 | `seven_area_total` (publisher-reported) | 1,092 |
| 2026-06 | six area totals + Outside Perimeter | 514 / 177 / 19 / 8 / 75 / 48 / 114 |
| 2026-06 | `six_area_core_total` (project-derived) | 841 |
| 2026-06 | `seven_area_total` (publisher-reported) | 955 |

Arithmetic verified by hand: 959 + 133 = 1,092 and 841 + 114 = 955. The
project-derived six-area sums reconcile exactly to the publisher's seven-area
totals. `tests/pipeline/test_monitoring_data.py:102-125` asserts this
independently.

## Where the pin is enforced

Four places, which is why I am confident this was deliberate rather than
incidental:

1. `data/monitoring/README.md`, update protocol rule 5 — "Keep every row
   `model_eligible=false`. Promotion into training or planning requires a
   separate, documented model-version decision."
2. `tests/pipeline/test_monitoring_data.py:32,63` — asserts the set of
   `model_eligible` values is exactly `{"false"}` for both the DSDP and RTFH
   tables. Flipping one row turns CI red.
3. `data/cards/source_ledger.yaml` — the `public_monitoring` lineage carries
   `excluded_from: [demo_v1_training, demo_v1_forecast_selection, demo_v1_planner]`,
   and the test asserts `dsdp_public_monthly_reports` appears in neither
   `demo_v1.required_source_ids` nor `optional_diagnostic_source_ids`.
4. As of the build session's in-flight work, `contracts.py::_validate_currency`
   refuses any `observed_not_model_eligible` row where `model_eligible` is not
   `False`, at the artifact contract layer. That is the strongest of the four
   and it is new.

## Why they were excluded — five independent grounds

Every one of these is recorded in `data/monitoring/README.md` and/or the
`dsdp_public_monthly_reports` card in `data/cards/source_ledger.yaml:378-427`.
None of them is "we froze it for the hackathon."

**1. Cadence break.** DSDP moved from monthly to an irregular quarterly count
in late 2025. The demo's model was fitted on a monthly series. Two irregular
observations from a different sampling cadence are not drop-in continuations of
it. This alone is disqualifying for model input.

**2. The count dates are contested.** The DSDP dashboard labels 1,092 as
"Q1 2026." The source PDF places 1,092 in April and supplies no January–March
observation at all. SDRDL's account puts the counts in March and June. The
project follows the PDF and says so. **This is the sharpest point: the demo's
headline scenario is a January 2026 forecast replay, and there is no January
2026 observation in existence to validate it against.** Unpinning would not
make the site current — it would attach a differently-dated observation to a
January claim.

**3. Method instability within 2026.** Counts were run dually on paper and a
piloted application, and at least one 2026 count was redone with differing
results. SDRDL does not feel at liberty to release the application-entered
values. A series with two concurrent instruments and a known redo is not a
stable measurement.

**4. Unit mismatch with what "current" would imply.** These are
`estimated_person_equivalents`: visual observations with DSDP's 1.75-per-tent
and 2.03-per-vehicle occupancy multipliers applied. Not unique people, not
verified need. RTFH stopped applying those multipliers in 2020, so the figures
are not comparable to the RTFH lane either.

**5. Not independent.** Same publisher and same collection lineage as the
organizer bundle the demo is built on. Promoting them would not add
independent evidence; it would re-use the same instrument and present it as
corroboration.

## Provenance of the provenance

Grounds 1 and 3 rest on a personal communication (J. Nations, SDRDL,
2026-08-21) that the ledger explicitly records as "partial and from memory by
her own description."

I want to be precise about what that does and does not mean. It is **not** a
weak basis for exclusion — an unresolved question about whether a count
happened, when it happened, and which of two instruments produced it is a
reason for more caution, not less. But it would be a weak basis for *inclusion*
if someone later argues the concerns were overstated. The asymmetry runs one
way. Anyone proposing to unpin needs a published DSDP/SDRDL reconciliation, not
a second-hand assurance that the first account was pessimistic.

Grounds 2, 4, and 5 stand on the published PDF and the ledger alone and do not
depend on that communication at all. Even if the personal communication were
withdrawn entirely, the exclusion holds on grounds 2, 4, and 5.

## Did any exclusion decision change?

**No.** I checked for the failure mode the brief flags — buying currency by
relaxing a methodologically correct exclusion:

- `git log --follow` on `data/monitoring/dsdp_public_checkpoints.csv` returns a
  single commit, `7c184a6` (2026-08-21), the commit that created it. The values
  and the `model_eligible=false` column have never been edited.
- Same for `data/monitoring/rtfh_annual_checkpoints.csv`: one commit, `d252fec`.
- The build session's in-flight `contracts.py` change *strengthens* the pin
  rather than relaxing it, by moving `model_eligible=false` from a CSV column
  that tests assert into a contract the deployment artifact must satisfy.

Nothing has been relaxed. There is no escalation on this item.

## On the build session's F-3

`docs/project/PHASE0_FINDINGS.md` finding F-3 reaches the same conclusion —
"these stay pinned `false`" — on substantially the same evidence. I read the
underlying sources first and arrived at the same place, so this is
corroboration rather than agreement-by-reading. Two things I would add to F-3:

- F-3 lists the grounds but does not separate the ones that depend on the
  personal communication from the ones that do not. That separation matters if
  the communication is ever revised, and I have made it above.
- F-3 does not mention that the exclusion is *test-enforced*
  (`test_monitoring_data.py:32,63`), only that it is documented. It is stronger
  than F-3 claims.

## The right way to show currency

Already the build session's stated plan, and I agree with it: display April and
June 2026 as **observed but not model-eligible**, with the exclusion reason
inline, rather than admitting them to the model. The
`observed_not_model_eligible` lane now forming in
`contracts.py::_validate_currency` is the correct shape — it requires
`exclusion_reason.grounds` to be a non-empty list of strings, a
`promotion_rule`, and a `source`, so the reason travels with the number and
cannot be dropped silently.

One thing to watch, offered as a review note rather than a finding: the lane
requires `excluded_from` to be non-empty but does not constrain *what* is in
it. An artifact could declare `excluded_from: ["nothing_in_particular"]` and
pass. Pinning it against the ledger's
`artifact_lineages.public_monitoring.excluded_from` would close that.

## What would have to happen before unpinning

For the record, so a future contractor cannot treat this as a judgment call:

1. DSDP or SDRDL publishes a reconciliation fixing the 2026 count dates.
2. The paper-vs-application instrument question is resolved and the redone
   count is identified.
3. Enough post-break observations exist to refit on the quarterly cadence
   rather than splicing two points onto a monthly fit.
4. A documented model-version decision is recorded, per README rule 5 — a new
   model version, not an edit to the frozen `demo.v1`.

Until all four hold, `false` is the correct value and the site should say why.
