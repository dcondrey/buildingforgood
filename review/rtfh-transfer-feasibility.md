# RTFH census-tract transfer: can the coverage-composition audit run on tract geography?

**Queue item 2.7.** Deferred work, scoped now because an evaluator will ask
"does this generalize past downtown?" and the answer should not be improvised.

**Short answer: no, and not because of engineering effort.** The audit's
central method requires a *fixed panel of small units observed at two dates
with component detail*. The RTFH PITC workbooks supply an annual count by
census tract with no component breakdown and no fixed-panel guarantee. The
port is not hard; the thing you would port it onto cannot answer the question
it asks.

**A different, weaker audit is feasible on tract geography and is worth doing.
It should not be called the same thing.**

---

## What the audit actually requires

The coverage-composition audit is `_spatial_metrics`
(`pipeline/src/stillhere_pipeline/demo.py:1651-1704`) plus
`_spatial_distribution_sensitivity` (`:1709-1790`). Reading the code rather
than the description, it needs five things:

| # | Requirement | Enforced at |
| --- | --- | --- |
| 1 | **Identical unit set at both dates.** `if set(before) != set(after): raise` | `demo.py:1654-1655` |
| 2 | **No missing values.** `if left is None or right is None: raise` | `demo.py:1668-1669` |
| 3 | **Three components per unit** — `individuals`, `tents_structures`, `vehicles` | `demo.py:1662-1663, 1675-1677` |
| 4 | **Enough units for HHI to mean anything** — `1/HHI` as "effective number of blocks" | `demo.py:1744-1745` |
| 5 | **Two comparable dates on one method** — the prepared comparison asserts 261 blocks on both | `demo.py:2074-2075` |

The whole point of the audit is requirement 3. The finding it exists to
produce — "the estimate fell, direct observations rose" — is a *composition*
claim: the multiplier-weighted total moved one way while the individuals
component moved the other. Strip the components and there is nothing to
decompose.

## What the RTFH data supplies

From `data/cards/source_ledger.yaml` (`rtfh_pitc`, `rtfh_public_monitoring`) and
`tests/pipeline/test_monitoring_data.py:78-100`:

- `2026-PITC-Unsheltered-Census-Tract-per-City.xlsx`, pinned
  `807babdc1207…`, and the 2025 predecessor pinned `c0b71e711d20…`.
- Structure, per the test that reads it: rows keyed by a city/area name in
  column 1 with an integer in column 3, plus publisher-computed
  `"San Diego Total"` and `"Grand Total"` rows.
- Geography: **2020 census tract**.
- Time grain: **one January night per year**.
- Currently transcribed into the repo: **city and county totals only**.
  `rtfh_annual_checkpoints.csv` holds four numbers.

Requirement-by-requirement:

| # | Requirement | RTFH tract data |
| --- | --- | --- |
| 1 | Identical unit set | **probably not.** 2020 tracts are stable between 2025 and 2026, but RTFH publishes rows for tracts where it counted. Zero-count and not-surveyed tracts are not distinguishable from absent rows without checking. Unverifiable from here — the workbooks are gitignored. |
| 2 | No missing values | **unknown**, same reason |
| 3 | Components per unit | **NO.** RTFH's tract workbook reports unsheltered client counts. There is no tent/vehicle/individual split at tract level. **This is the blocker.** |
| 4 | Enough units | **yes** — San Diego County has ~630 tracts; the county's 2026 unsheltered total is 5,108, so roughly 8 per tract on average. HHI would be computable and meaningful. |
| 5 | Two dates, one method | **partly.** 2025 and 2026 exist. But RTFH's own multiplier methodology changed over the years (ledger, `rtfh_pitc.known_limitations`), and it stopped applying occupancy multipliers in 2020 — so 2025→2026 is likely method-stable, while anything reaching back further is not. |

Requirement 3 is fatal and cannot be engineered around. The component split
does not exist in the source.

## What breaks, concretely

If someone tried it anyway:

1. **`_spatial_metrics` raises immediately.** `demo.py:1662-1677` reads
   `before[key]["individuals"]`, `["tents_structures"]`, `["vehicles"]` by
   name. With RTFH rows those keys do not exist — a `KeyError`, not a graceful
   degradation.
2. **`_raw_units` / `_adjusted_units` (`demo.py:1642-1649`)** compute
   `individuals + 1.75×tents + 2.03×vehicles`. Meaningless on a count that
   already excludes multipliers. Applying DSDP's multipliers to RTFH data
   would be a methodology error, not a configuration change.
3. **`CORE_AREAS` (`demo.py:35-42`)** is a hardcoded six-tuple used as a
   membership filter (`:155`, `:1453`), an exhaustiveness assertion
   (`:176-177`, `:2426`), and a divisor (`:2739`). Every one needs replacing.
4. **`261` is a literal at nine sites** (`:1595, 1964, 1993, 2074-2075, 2095,
   2101, 2124, 2661, 2702`) plus the `in_panel_261` column name (`:1440`).
5. **Monthly cadence is assumed throughout.** `month_range` from
   `aggregate.py`, `_MONTH_RE` in `contracts.py`, `report_month` columns,
   `demo.py:2354` forecasting per area per month. An annual series has one
   observation per year; the rolling-origin backtest that selects the forecast
   model needs a history of monthly points and would have ~2 to work with.
6. **The tract-to-neighborhood crosswalk gate.** `source_ledger.yaml`
   (`rtfh_pitc.geo_grain`): "Tracts do not map 1:1 to DSP downtown
   neighborhoods; an explicit tract-to-neighborhood crosswalk (versioned with
   the geography definition from issue #2) is required before use." That
   crosswalk does not exist, and per `review/geography-provenance.md` the
   boundary information needed to build one does not exist either.
7. **The privacy floor changes meaning.** Small-cell suppression is fixed at 5
   (`contracts.ts:161`, `contracts.py`). At neighborhood-month grain with
   values in the hundreds, suppression almost never fires. At tract grain with
   a mean around 8 and a long tail of 1s and 2s, **a large share of tracts
   would suppress**. `privacy.py:209` already flags that a 382-polygon
   geography "sits far below the approved aggregate geography" — tract grain
   is finer still and closer to identifying where a small number of people
   sleep. This is the finding that should give the most pause: it is a privacy
   question, not an engineering one.

## What is downtown-specific in the method (as opposed to the code)

Worth separating, because these do not go away with a refactor:

- **Multiplier-adjusted person-equivalents.** The entire "estimate fell,
  observations rose" story exists because DSDP applies 1.75/2.03 occupancy
  multipliers and the components moved differently. RTFH does not apply
  multipliers at all. **There is no composition shift to find in RTFH data,
  because RTFH publishes one number per tract.**
- **Monthly sweeps.** The drop test compares windows of months
  (`drop_test.py:56`, `_window(period, periods)`). An annual single-night count
  has no window.
- **A fixed panel.** DSDP re-walks the same blocks. PITC coverage varies year
  to year with volunteer availability; that is a documented PITC limitation, not
  a data-quality accident.
- **A dense, walkable geography.** "Effective number of blocks" is a meaningful
  concentration measure across 261 contiguous downtown blocks. Across county
  tracts spanning urban cores, suburbs, and desert, HHI would be dominated by
  the urban/rural gradient, not by anything about outreach.

## What *is* feasible on tract geography

A weaker but genuine audit, and I think worth building:

**A year-over-year tract-level concentration and coverage check.** For 2025 vs
2026: the set of tracts reported in both years, the count of tracts gaining and
losing, gross increase and decrease, and HHI / effective-number-of-tracts on
the total counts. That is `_spatial_metrics` minus the `components` block and
minus `_raw_units` — roughly 40 of its 55 lines survive unchanged.

What it would establish: **whether the countywide 10.6% decline is a broad
decline or a concentrated one.** That is a real, publishable, defensible
finding, and it is exactly the kind of thing that distinguishes a headline from
a measurement artifact — the project's whole thesis, applied at a scale that
answers "does this generalize."

What it would **not** establish: anything about composition. It cannot
reproduce the downtown finding, and the write-up must say so in the first
sentence, not a footnote.

## Effort estimate

Assuming the goal is the weaker tract-level audit described above, not a port
of the existing one:

| Task | Effort | Notes |
| --- | --- | --- |
| Transcribe tract rows from both pinned workbooks | 1 day | `openpyxl` is already a test dependency; `test_monitoring_data.py:86-99` has a working reader |
| **Resolve whether tract sets are comparable 2025↔2026** | 1–2 days | Must be done first. If they are not, stop. |
| **Privacy review of tract-grain publication** | 2–3 days, plus sign-off | Not engineering. See point 7. Likely conclusion: publish only suppressed/binned tract values, or only the aggregate concentration statistics and no per-tract numbers. |
| Generalize `_spatial_metrics` to component-free units | 1 day | Extract the component block behind a flag; keep the existing path byte-identical so the shipped finding does not move |
| New contract + artifact lane for an annual tract audit | 2 days | Do **not** extend `demo.v1`; it is frozen |
| Write-up, limitations, ledger entries | 1–2 days | The limitations section is most of the value |
| **Total** | **8–11 working days** | Of which ~3 are not code |

**Explicitly excluded from that estimate**, because they are not feasible:
porting the drop test (no windows), porting the forecast (no monthly history),
porting the planner (no adjacency, no crosswalk), and reproducing the
composition finding (no components).

## Recommendation

Do not describe this as "running the audit on tract geography." Describe it as
what it is: *the method's coverage-and-concentration half generalizes to any
geography with repeated small-unit counts; the composition half requires a
publisher that reports components, which most do not.*

That is a more honest generalization claim and, I think, a more persuasive one
to an evaluator — it names the precondition another city would have to meet,
which is more useful than an assurance that it "works anywhere."

**The one thing to check before promising even the weaker version** is whether
the 2025 and 2026 tract sets are comparable. Both workbooks are pinned and
gitignored, so I could not check. If RTFH reports only surveyed tracts and
coverage varied between years, then requirement 1 fails too and the honest
answer becomes "no, not without the tract-coverage metadata RTFH does not
publish." **Check that first; it is an hour of work and it decides the rest.**

## What I could not verify

- The internal structure of either PITC workbook beyond what
  `tests/pipeline/test_monitoring_data.py:86-99` reads (columns 1 and 3, and
  two named total rows). Both files are gitignored.
- Whether tract rows are present-with-zero or absent when a tract has no
  unsheltered count.
- Whether RTFH publishes any component or subpopulation breakdown at tract
  level in a companion file. The ledger's `package_page`
  (https://www.rtfhsd.org/reports-data/) may host one; I did not fetch it.
  **This is the single assumption that, if wrong, changes the conclusion** —
  if a tract-level component breakdown exists somewhere, the full audit becomes
  feasible and the estimate roughly doubles rather than being impossible.
