# Public monitoring checkpoints

This directory holds small, aggregate monitoring tables that postdate the
frozen `demo.v1` analytical snapshot. They are not model inputs and do not
change the historical January 2026 forecast replay or planner.

## DSDP public checkpoints

`dsdp_public_checkpoints.csv` transcribes the April and June 2026 neighborhood
totals in Downtown San Diego Partnership's [June 2026 Unsheltered Sleep Count
report](https://downtownsandiego.org/wp-content/uploads/2026/08/June-2026-Unsheltered-Sleep-Count.1.pdf).
The publisher reports a seven-area total including Outside Perimeter. The two
`six_area_core_total` rows are project-derived sums over City Center, Columbia,
Cortez, East Village, Gaslamp, and Marina so that the geography matches the
shipped demo:

| Report month | Six-area core | Outside Perimeter | Published seven-area total |
| --- | ---: | ---: | ---: |
| 2026-04 | 959 | 133 | 1,092 |
| 2026-06 | 841 | 114 | 955 |

The values are multiplier-adjusted visual observations—estimated
person-equivalents, not unique people, verified service needs, or program
outcomes. Exact count dates are not available in the report summary, so the
table records report months only.

The DSDP dashboard labels 1,092 as “Q1 2026,” while the source PDF places that
value in April and supplies no January–March observation. The table follows the
PDF and therefore cannot validate the demo's January 2026 forecast scenario.

Provenance behind that confusion (personal communication, J. Nations, SDRDL,
2026-08-21 — partial and from memory by her own description): DSDP moved to an
irregular quarterly cadence in late 2025; 2026 counts were run dually on paper
and a piloted application; at least one 2026 count was redone with differing
results; and methodology discussions are ongoing. The 2026 count months
themselves are contested (March vs the PDF's April label). These checkpoints
record what DSDP published, not settled count dates; expect revisions when
DSDP/SDRDL publish a reconciliation, and re-pin rather than overwrite.

## RTFH annual checkpoints

`rtfh_annual_checkpoints.csv` transcribes the publisher-computed City of San
Diego and countywide unsheltered totals from RTFH's PITC census-tract
workbooks (2025 is the already-pinned demo agreement input; 2026 is pinned as
a post-freeze monitoring source):

| Count year | City of San Diego | Countywide |
| --- | ---: | ---: |
| 2025 | 3,354 | 5,714 |
| 2026 | 3,132 | 5,108 |

The 2026 decline (−6.6% city, −10.6% county) is directionally consistent with
the 2026 DSDP downtown checkpoints above, but these are different universes,
methods, and clocks: a single January night citywide versus monthly downtown
visual sweeps. Direction agreement is context, never validation of a specific
downtown figure. Tract-level detail stays raw-only behind the ledger's
tract-to-neighborhood crosswalk gate. RTFH's monthly countywide HMIS data
reports (July 2026 pinned) are cadence references only; HMIS activity measures
service engagement, not street population.

## Digitization audit (experimental)

`digitization_audit.json` is produced by `stillhere_pipeline.eyepop_audit`
from the pinned June 2026 report: OCR over the scanned, hand-annotated field
sheets, reporting per page only integer-token counts and values at or above
an area-total threshold (sub-threshold values are counted but withheld, so no
block-scale digit can enter this file). The module has a swappable engine —
`--engine local` is Apple Vision handwriting recognition, fully offline;
`--engine eyepop` is the EyePop.ai drop-in, fail-closed without a key.

One recovered example of the lineage reconciling: the City Center field sheet
shows handwritten totals of 152 individuals and 14 tents, and
152 + 14 × 1.75 = 176.5 ≈ 177, the published City Center June total. OCR of
the handwritten "152" is unstable across raster resolutions: the committed
200-dpi card reads 157, while `digitization_audit_300dpi.json` — the same
engine re-run at 300 dpi via the module's `--dpi` flag, which is recorded in
every card — reads 152. `digitization_audit_agreement.json` compares the two
runs (each identified by engine and dpi in its `runs` list) and reports a
97.5% agreement share over the recovered area-scale values. That surfaced
disagreement is exactly the uncertainty the audit exists to expose; treat
recovered values as candidates for human verification, never as counts. The
original 200-dpi card is quoted by the app and the product docs as the
shipped misread-and-caught example, so do not regenerate it casually — a
rerun that silently "fixes" the 157 would erase the evidence the docs cite.

## Update protocol

1. Use `./scripts/fetch_raw.sh monitoring` to fetch the allowlisted publisher
   PDF and verify its reviewed SHA-256 hash.
2. Inspect the PDF—not scraped archive-page text—and record only published
   aggregate area totals. The live DSDP archive and Unhoused Care HTML included
   unrelated injected content when reviewed on 2026-08-21.
3. Keep missing months absent; never interpolate them or relabel a quarterly
   dashboard value as a monthly observation.
4. Add a new pinned source document before adding rows. Reconcile each derived
   six-area core total to the publisher's seven-area total plus Outside
   Perimeter.
5. Keep every row `model_eligible=false`. Promotion into training or planning
   requires a separate, documented model-version decision.
