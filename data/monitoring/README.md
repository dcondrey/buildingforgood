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
