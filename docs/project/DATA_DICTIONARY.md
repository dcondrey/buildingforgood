# Data Dictionary

2026-08-21. This transfers the #33 (A-02) review lane into the repository.
Every row below is grounded in the repository itself: the organizer CSV files
in `data/raw/hackathon_provided/`, the shipped artifact
`public/generated/demo.v1.json`, the generator
`pipeline/src/stillhere_pipeline/demo.py`, the provenance ledger
`data/cards/source_ledger.yaml`, and the release gate
`docs/project/DATA_QUALITY_AUDIT.md`. Numbers quoted here were re-verified
against those files; anything that could not be verified is listed as an open
ambiguity rather than stated as fact.

Three definitions carried forward from the supplied dictionary review are
binding everywhere in this project:

1. `total` is the published methodology-adjusted neighborhood observation. It
   is not additive with the `individual`, `tent`, or `vehicle` component rows.
2. `report_month` is the monthly analytical join key for block observations.
   `count_date` preserves the actual sweep date and is never a join key.
3. `area` is the canonical analytical area. Source labels, East Village
   quadrants, and block-grid neighborhood labels are not interchangeable
   geography.

## Source fields

One row per field across the six organizer CSV files. Row counts verified:
`DowntownCounts_Monthly.csv` 2,880 rows; `BlockLevel_Counts.csv` 3,737 rows
over 382 blocks; `BlockLevel_Counts_Panel261.csv` 3,132 rows over 261 blocks;
`Area_Crosswalk.csv` 24 rows; `Downtown_BlockGrid.csv` 382 rows;
`Methodology_Periods.csv` 4 rows.

| Field | Source file | Type | Unit | Time grain | Geography | Allowed values | Missing-value meaning | Transformation applied | Intended use | Prohibited interpretation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `date` | DowntownCounts_Monthly.csv | ISO date | calendar date | monthly (first of month) | n/a | 2017-01-01 through 2025-12-01 | never missing | truncated to `YYYY-MM` month key by the pipeline | monthly join key for published observations | not the sweep date; day component carries no information |
| `year`, `month_num`, `month` | DowntownCounts_Monthly.csv | int, int, string | calendar parts | monthly | n/a | 2017-2025; 1-12; Jan-Dec | never missing | ignored; redundant with `date` | human readability only | none beyond `date` |
| `area` | DowntownCounts_Monthly.csv | string | label | n/a | canonical analytical area | 12 values: City Center, Columbia, Cortez, East Village, East Village - North East/North West/South East/South West, Gaslamp, Marina, Outreach Area (legacy), Outside Perimeter | never missing | demo restricts to the six core neighborhoods (City Center, Columbia, Cortez, East Village, Gaslamp, Marina) | canonical geography for all monthly aggregation | EV quadrants overlap the East Village neighborhood total; never sum quadrants with the parent. Outside Perimeter and Outreach Area (legacy) are outside the consistent core |
| `area_source_label` | DowntownCounts_Monthly.csv | string | label | n/a | source-document label | as published in the source | never missing | not used analytically | provenance trace back to the source document | never a join key; `area` is canonical |
| `area_type` | DowntownCounts_Monthly.csv | string | category | n/a | n/a | `neighborhood`, `ev_subarea`, `supplemental` | never missing | demo filters to `neighborhood` | separates additive neighborhoods from overlapping and supplemental rows | `ev_subarea` and `supplemental` rows must not enter the downtown total |
| `parent_area` | DowntownCounts_Monthly.csv | string | label | n/a | canonical area | empty or `East Village` | empty means top-level area | none | marks EV quadrants as children of East Village | none |
| `component` | DowntownCounts_Monthly.csv | string | category | n/a | n/a | `total`, `individual`, `tent`, `vehicle` | never missing | demo trend and forecast use `total` only | `total` is the published adjusted observation; the other three are digitized raw components | `total` is not the sum of the components; components are a secondary digitization with disclosed mismatches |
| `count` | DowntownCounts_Monthly.csv | number (blank allowed) | `total`: estimated person-equivalents; components: observed units | monthly | area | non-negative; 0 mismatches with negative, fractional, or non-finite values | 143 blank cells; meaning given by `flag` (`not_reported` 140, `not_in_program` 3); retained as null, never zero-filled or interpolated | six core-area `total` rows summed per month; a month with any unreported core area becomes a null total (2025-07, 2025-08, 2025-10, 2025-11) | monthly level, trend, and forecast target | not unique people, not a census, not service need |
| `method` | DowntownCounts_Monthly.csv | string | category | monthly | n/a | `PRE2017`, `APR2017`, `MAY2018`, `POST2020` | never missing | joined to Methodology_Periods.csv; carried into `observations.history[].method` | marks comparability regimes | months under different methods are not directly comparable levels |
| `tent_multiplier`, `vehicle_multiplier` | DowntownCounts_Monthly.csv | number | persons per tent / per vehicle | monthly | n/a | tent: 1.75 or 2.0; vehicle: 1.66, 2.0, or 2.03 | never missing | echo of the period factors; not reapplied by the pipeline | documents the adjustment already inside `total` | never multiply components again; `total` already includes the factors |
| `fellowship_month` | DowntownCounts_Monthly.csv | boolean | flag | monthly | n/a | `True`, `False` | never missing | forecast training window starts 2021-01, after the final Fellowship-assisted count | marks counts assisted by the Fellowship program | not a data-quality verdict by itself |
| `flag` | DowntownCounts_Monthly.csv | string | category | monthly | area | empty, `added_2017_outreach`, `added_2017_subarea`, `component_total_mismatch`, `corrected_2019_subarea`, `corrected_from_blocklevel`, `not_in_program`, `not_reported` | empty means no flag | `component_total_mismatch` areas surface in `observations.history[].component_quality_warning_areas` | disclosure of source-flagged anomalies | a flagged row is disclosed, not deleted or corrected |
| `block_id` | BlockLevel_Counts.csv, BlockLevel_Counts_Panel261.csv, Downtown_BlockGrid.csv | string | identifier | n/a | one city block | 382 unique ids (261 in the panel file) | never missing | join key between block counts, grid, and GeoJSON; never deployed | block-level joins inside the pipeline only | privacy deny-list: block ids never enter the browser artifact |
| `neighborhood_source` | BlockLevel_Counts.csv, Panel261, Downtown_BlockGrid.csv | string | label | n/a | block-grid neighborhood label | 10 values incl. `South East Village`, `Barrio Logan`, `Golden Hill`, `Sherman Heights` | never missing | mapped to canonical `area` via Area_Crosswalk.csv | provenance of the block's source label | never analytical geography; use `area` |
| `area` | BlockLevel_Counts.csv, Panel261, Downtown_BlockGrid.csv | string | label | n/a | canonical analytical area | City Center, Columbia, Cortez, East Village, Gaslamp, Marina, Outside Perimeter | never missing | panel evidence filters to the six core areas | canonical geography for spatial evidence | not the same partition as the monthly EV quadrants |
| `count_date` | BlockLevel_Counts.csv, Panel261 | ISO date | calendar date | per sweep | n/a | 12 dates, 2018-01-24 through 2025-01-31 | never missing | audit only; the 2022-02 report month was collected 2022-03-01 | preserves the actual sweep date | never a join key and never used to assign months |
| `report_month` | BlockLevel_Counts.csv, Panel261 | ISO date (first of month) | month key | monthly | n/a | 12 months: 2018-01, 2018-02, 2019-01, 2020-01, 2020-02, 2021-01, 2021-02, 2022-01, 2022-02, 2023-01, 2024-01, 2025-01 | never missing | canonical monthly join key for block observations | aligns block sweeps with the monthly table | not evidence of monthly block coverage outside these 12 months |
| `individuals`, `tents_structures`, `vehicles` | BlockLevel_Counts.csv, Panel261 | integer (blank allowed) | observed units (people seen, tents or structures, vehicles) | per report month | block | non-negative integers; 0 negative or fractional cells | exactly 1 blank cell (a January 2020 tent value); retained as null, both annual pairs touching it excluded from the mixed-unit lane | summed to raw observation units; POST2020 factors applied only in the clearly labeled secondary decomposition | fixed-panel spatial evidence components | raw units are not people; unmultiplied levels must not be compared with published adjusted totals |
| `in_panel_261` | BlockLevel_Counts.csv | boolean | flag | n/a | block | `True`, `False` | never missing | membership verified against the Panel261 file (`panel_membership_matches_full_file_flag` true) | selects the fixed 261-block common-support panel | blocks outside the panel are coverage expansion, not longitudinal change |
| all fields | BlockLevel_Counts_Panel261.csv | same as BlockLevel_Counts.csv minus `in_panel_261` | | | | | | strict subset: the 261 panel blocks only | authoritative panel membership list | same guards as the full block file |
| `source_file` | Area_Crosswalk.csv | string | label | n/a | n/a | `RawCounts_AllYears.csv`, `Downtown_BlockGrid / BlockLevel_Counts`, `BlockMap_Coverage.csv` | never missing | none | says which source family a label mapping applies to | none |
| `source_label` | Area_Crosswalk.csv | string | label | n/a | source label | 24 mappings; 0 duplicate keys, 0 unmapped labels in either input | never missing | lookup key | maps every raw label to a canonical area | an unmapped label must fail the build, never be fuzzy-joined |
| `canonical_area` | Area_Crosswalk.csv | string | label | n/a | canonical area | the 12 canonical values listed above | never missing | target of all label normalization | the single source of truth for area naming | none |
| `parent_area`, `level` | Area_Crosswalk.csv | string | label, category | n/a | n/a | level: `neighborhood`, `ev_subarea`, `supplemental`, `block_neighborhood` | empty parent means top level | none | records the label hierarchy | levels are label provenance classes, not nesting you may sum across |
| `lon`, `lat` | Downtown_BlockGrid.csv | number | decimal degrees | static | block centroid | downtown San Diego extent | never missing | pipeline-internal only | block geometry for internal joins | privacy deny-list: coordinates never deploy |
| `st_north`, `st_east`, `st_south`, `st_west` | Downtown_BlockGrid.csv | string | street name | static | block | street identifiers; 0 blanks | n/a | not used | human-readable block bounds | never published; identifies precise locations |
| `method`, `effective_from`, `effective_to`, `individual_multiplier`, `tent_multiplier`, `vehicle_multiplier`, `note` | Methodology_Periods.csv | string, dates, numbers, text | persons per unit | period | n/a | PRE2017 (1.0/2.0/2.0), APR2017 (1.0/1.75/1.66), MAY2018 (1.0/1.75/2.03), POST2020 (1.0/1.75/2.03) | empty `effective_to` on POST2020 means open-ended | surfaced as `observations.methodology_periods` | documents the comparability regimes | POST2020 is a divergence in practice, not a factor change; do not treat 2020 as a numeric break in the multipliers |

`Downtown_BlockGrid.geojson` mirrors the grid CSV but its feature properties
are `block_id`, `lat`, `lon`, `neighborhood`, and the four street fields only.
It does not carry the canonical `area` field; canonical area always requires a
`block_id` join to `Downtown_BlockGrid.csv` or the crosswalk. Verified against
the file (382 polygon features).

## Generated metrics

One row per metric group in `public/generated/demo.v1.json`, using the
artifact's real keys. Owner letters: A Data & Forecasting, B Product
Experience, C Planning & Safeguards, D Integration & Release. Source-field
stewardship (previous table) belongs to Track A.

| Metric (artifact key) | Owner | Type | Unit | Time grain | Geography | Allowed values | Missing-value meaning | Transformation applied | Intended use | Prohibited interpretation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `observations.history[].total` | A | integer or null | estimated person-equivalents | monthly | six-area core | non-negative or null | null months (2025-07, 2025-08, 2025-10, 2025-11) mean at least one core area unreported; a partial geography is never aggregated | sum of the six verified published neighborhood `total` rows | the headline trend series and forecast target | not unique people; levels across method regimes need the `method` field |
| `observations.history[].status`, `reported_area_count`, `method`, `fellowship_month`, `component_quality_warning_areas` | A | enum, int, enum, bool, list | metadata | monthly | six-area core | status: `reported_verified_total`, `not_reported` (code also allows `partial_not_aggregated`; not present in the shipped artifact) | n/a | derived during aggregation | per-month disclosure of completeness, regime, and source flags | a warning area does not invalidate the published total |
| `observations.coverage.*` (`calendar_months` 108, `reported_months` 104, `completeness_pct` 96.3, `start_month`, `end_month`, `latest_reported_month`) | A | ints, percent, months | counts and percent | series-level | six-area core | fixed by the input span 2017-01..2025-12 | n/a | counted over the history | orientation summary | completeness percent is about months, not data quality |
| `observations.missing_months[]`, `observations.latest_by_area[]`, `observations.scope`, `observations.methodology_periods[]` | A | lists and objects | mixed | monthly / static | area | see source tables | n/a | direct restatements of verified inputs | disclosure and scope statement | none beyond source guards |
| `panel_change_pct` (build log only) | A | percent | percent | annual pair | 261-block panel | equals `evidence.balanced_panel.raw_observation_units.change_pct` (-13.9) | n/a | alias printed by `demo.py main()`; not a separate artifact key | build verification line | not a distinct metric |
| `evidence.balanced_panel.active_blocks` (`from` 121, `to` 141, `change`, `change_pct`) | A | ints, percent | blocks | 2024-01 vs 2025-01 | 261-block panel | 0..261 | n/a | count of panel blocks with at least one raw observed unit at each endpoint | extensive-margin footprint change | not person movement; not population size |
| `evidence.balanced_panel.components.{individuals,tents_structures,vehicles}` (`from`, `to`, `change`) | A | ints | observed units per component | 2024-01 vs 2025-01 | 261-block panel | non-negative | the one blank 2020 tent cell affects only excluded annual pairs | per-component sums on the fixed panel | like-for-like component change | components are unmultiplied; never compare with published totals |
| `evidence.balanced_panel.raw_observation_units` (`from` 778, `to` 670, `change`, `change_pct`) | A | ints, percent | mixed observed units (individuals + tents + vehicles) | 2024-01 vs 2025-01 | 261-block panel | non-negative | n/a | unweighted sum of the three components | secondary composite index only | not an estimated person total; occupancy multipliers are deliberately absent |
| `evidence.balanced_panel.gross_change` (`blocks_with_increase`, `blocks_with_decrease`, `blocks_unchanged`, `increase_units_on_blocks_with_growth`, `decrease_units_on_blocks_with_decline`) | A | ints | blocks; observed units | 2024-01 vs 2025-01 | 261-block panel (also per area) | non-negative | n/a | arithmetic per-block endpoint differences | shows growth and decline are simultaneous | does not link observations across time; cannot establish that anyone moved |
| `evidence.balanced_panel.areas[]` (`panel_blocks`, `active_blocks`, `gross_change`, `raw_observation_units`) | A | objects | as above | 2024-01 vs 2025-01 | six core areas | panel_blocks sum to 261 | n/a | same measures split by canonical area | area-level spatial evidence | same guards as the panel-level measures |
| `evidence.balanced_panel` sensitivities (`annual_contrast_sensitivity`, `distribution_sensitivity`, `component_distribution_sensitivity`, `footprint_sensitivity`, `validity_checks`) | A | objects | blocks, units, HHI index, percent | annual pairs | 261-block panel (382 for footprint) | HHI in (0,1]; effective blocks positive | ineligible pairs listed, not silently dropped | threshold, concentration, and coverage-expansion checks; POST2020 decomposition is labeled `secondary_derived_estimate` | robustness of the headline spatial claim | the 95.4 point expansion overstatement shows why 382-block growth is not longitudinal change; HHI is a score, not a count |
| `forecast.aggregate.point` 882.5, `lower` 769.0, `upper` 996.1, `interval_level` 0.8; same fields per `forecast.areas[]` | A | numbers | estimated person-equivalents; level is a probability | target month 2026-01 | six-area core and per area | lower <= point <= upper | `status` other than `ok` would mean no usable forecast | promoted model on observed totals 2021-01..2025-12; missing months skipped, never imputed | historical one-step-ahead planning scenario | not a prediction of service need, not an operational target, not live (data frozen through 2025-12) |
| `forecast.*.backtest` (`mae`, `wape_pct`, `evaluated_points` 8, `interval_points` 8, `empirical_coverage_pct`) | A | numbers | mae in person-equivalents; wape and coverage in percent; points are counts | 2025 audit window | per series | coverage 0..100 | four missing 2025 months reduce evaluated points from 12 to 8 | walk-forward one-step errors against observed 2025 targets | honesty check on the promoted model | 75 percent coverage on 8 points is small-sample; not a calibration guarantee |
| `forecast.*.model_scorecard[]` and `promotion` | A | objects | mae, wape, counts | 2023 promotion holdout | per series | models: `seasonal_naive_12m`, `recent_3_observed_mean`, `local_linear_6_observed` | n/a | challenger promoted only on strictly lower rolling-origin MAE | model selection audit trail | WAPE is diagnostic only and never governs promotion |
| `planner.budget_hours` 80, `planner.minimum_hours_per_area` 8 | C | integers | staff-hours | one planning cycle | six core areas | budget >= 6 x minimum or the build fails | n/a | user-set inputs to `_planner` | scenario budget and coverage-continuity floor | hours are effort capacity, not people served |
| `planner.allocations[]` (`planning_load`, `load_share_pct`, `base_hours`, `variable_hours`, `allocated_hours`) | C | numbers | load in forecast person-equivalent units; share in percent; hours in staff-hours | one planning cycle | per core area | allocated = base + variable; totals equal the budget | n/a | planning_load = forecast upper bound; base = floor; variable = proportional share with deterministic largest-remainder rounding | explainable decision-support allocation | planning load is an uncertainty-aware sizing signal, never a person count or guaranteed service need |
| `planner.constraints` and `planner.not_in_scope` | C | booleans, list | flags | one planning cycle | n/a | `complaint_data_used`, `reporting_bias_diagnostic_used`, `precise_location_data_used` must be false; `human_review_required` true | n/a | asserted at build time | safeguard disclosure | absence of a violation is not authorization for operational use |
| `reporting_bias.comparison` (`all_reports`, `encampment_raw`, `encampment_unique_parent` with `pre_monthly_mean`, `post_monthly_mean`, `absolute_change`, `percent_change`; `encampment_share` in percentage points; `placebos[]`; `matched_calendar_sensitivity`; `case_origin_sensitivity`; `raw_vs_parent_sensitivity`; `design`) | C | numbers | reports per month; percent; percentage points | six-month pre/post windows (2023-01..2023-06 vs 2023-08..2024-01; 2023-07 excluded) | Get It Done `comm_plan_name` DOWNTOWN | non-negative | right-censoring and workflow caveats disclosed in `source_quality` | monthly counts of requests by `date_requested`; exact-label filters only | descriptive reporting-process diagnostic (`status` = `descriptive_diagnostic_only`) | reports are not people, need, or verified abatements; `design.causal_identification` is false; excluded from forecast and allocation by construction |
| `reporting_bias.monthly[]` (`all_reports`, `encampment_raw`, `encampment_unique_parent`, `encampment_share_pct`, `encampment_mobile_origin`, `placebos.*`) | C | integers, percent | reports per month; percent | monthly 2022-01..2025-12 | DOWNTOWN community plan | non-negative | n/a | monthly aggregation of the CD3 extract | the visible series behind the comparison | same guards as above |
| `quality_audit.monthly_table` (`rows` 2880, `missing_component_cells` 143, `material_component_total_mismatch_area_months` 25, `maximum_material_mismatch_units` 57.4, `unflagged_formula_differences` 397, `maximum_unflagged_formula_difference` 1.01, `robust_high_tail_flags_gt_5_mad`, `core_total_missing_months`) | A | counts and units | rows, cells, area-months, units | table-level | monthly table | non-negative | n/a | deterministic validation from the #6 lane | anomaly ledger for the monthly table | the 397 sub-1.01-unit residuals are integer-rounding artifacts, distinct from the 25 source-flagged material mismatches |
| `quality_audit.balanced_panel` and `quality_audit.expanded_block_file` (`rows`, `blocks`, `duplicate_block_month_keys` 0, `missing_component_cells` 1, drift counts 0, `report_months_with_count_date_offset` [2022-02]) | A | counts | rows, blocks, cells | panel-level | 261 and 382 blocks | non-negative | n/a | structural checks; build fails on duplicates | panel integrity evidence | none |
| `quality_audit.cross_digitization_consistency` (`comparable_core_area_months` 72, `area_months_with_any_difference` 20, `maximum_absolute_delta` individual 13 / tent 9 / vehicle 4, `prepared_months[]`) | A | counts | area-months; observed units | monthly overlap | six core areas | non-negative | n/a | compares the monthly-table component digitization with the block-map digitization | quantifies disagreement between two digitizations of the same maps | not independent validation; same underlying map images |
| `quality_audit.area_crosswalk`, `quality_audit.ledger[]`, `quality_audit.claim_treatments[]`, `quality_audit.policy`, `quality_audit.status` | A | objects | counts and text | build-level | n/a | ledger has 11 entries; status `audited_with_retained_source_values` | n/a | assembled at build time | machine-readable release gate consumed by Track D | a retained anomaly is disclosed, never repaired or imputed |
| `evidence.robustness.count_day_weather` and `evidence.robustness.parking_exposure` | A | objects | degrees F, inches, transactions, meters, percent | daily / monthly | one airport station; Downtown parking zone | see artifact | fixed-cohort series null outside comparison months by design | NOAA same-day check; fixed-cohort and all-meter parking sensitivities | two alternative-explanation checks | descriptive sensitivities, not causal controls; a transaction is not a visitor |
| `schema` (`stillhere.demo.v1`), `generated_from`, `limitations`, `scenario`, `technical_summary` | D | strings, hashes, text | metadata | artifact-level | n/a | 13 pinned input SHA-256 hashes; deterministic build | n/a | recorded at generation | reproducibility and framing | the limitations list is normative; UI surfaces (Track B) must not drop it |

## Plain-language definitions

- **Observation.** One monthly visual street-sweep record: what enumerators
  saw in an area during that month's sweep. Not a census, not unique people,
  not service need. Shipped demo.v1 lineage.
- **Apparent decline.** The arithmetic drop between the anchor month and the
  selected month of a comparison window, before any evidence check. In
  `pipeline/src/stillhere_pipeline/drop_test.py` it is the `apparent_change`
  evidence component; "apparent" means unexplained, since a decline can be
  measurement change, missing data, displacement, or improvement. Drop-test
  lineage (issue #8, thresholds pending #35); the shipped demo.v1 artifact
  reports changes but performs no drop-test classification.
- **Adjacent increase.** A contemporaneous rise in areas adjacent to one
  showing a decline. A drop-test concept from `drop_test.py`
  (`adjacent_matched_share`), not a demo.v1 field. No versioned adjacency
  definition exists yet, so the drop test currently returns
  `insufficient_evidence` on this axis.
- **Unmatched change.** The portion of a local decline not matched by
  adjacent aggregate increases. Also a drop-test concept from `drop_test.py`.
  A high matched share suggests possible displacement; a low matched share is
  consistent with (never proof of) improvement.
- **Forecast range.** The interval from `lower` to `upper` around the
  forecast `point`, at `interval_level` 0.8: a symmetric residual-quantile
  interval meant to contain the next observation about 80 percent of the
  time under conditions like the recent past. Demo.v1 lineage.
- **Interval coverage.** `empirical_coverage_pct`: the share of walk-forward
  backtest targets that actually fell inside the stated interval (8 evaluated
  points per series in 2025). A check on honesty, not a guarantee.
- **Planning load.** The sizing signal the planner uses for an area, defined
  in the artifact as the upper bound of the area monthly baseline
  (`planning_load_definition`). It is an uncertainty-aware planning quantity
  in forecast units. It is not a person count, not measured demand, and not a
  guaranteed service need.
- **Reserve.** Extra staff-hours held for a specific concern in the app
  planner domain (`app/src/domain/planner/types.ts`):
  `continuity_reserve_hours` for a `possible_displacement` area and an
  uncertainty reserve sized by interval width. Retired v0/product-lineage
  concept (issue #14); the shipped demo.v1 planner has no reserve fields,
  only the base-hours floor.
- **Allocation.** Whole staff-hours assigned to an area for one planning
  cycle: `allocated_hours` = `base_hours` floor plus `variable_hours`
  distributed proportionally to planning load with deterministic
  largest-remainder rounding. Hours of outreach effort, nothing else.
- **Unmet load.** In the app planner domain, `unmet_hours` is the gap between
  an area's purely proportional share (`unguarded_hours`) and what it
  received after the coverage floor redistributed hours. Retired v0/product
  lineage; not present in demo.v1, whose allocation always sums exactly to
  the budget.

## Units discipline

Every number in this project belongs to exactly one unit class. State the
class whenever a number is shown.

| Unit class | Definition | Where it appears | Never confuse with |
| --- | --- | --- | --- |
| Observed units (counts) | Raw digitized tallies: individuals seen, tents or structures, vehicles, blocks, rows, reports | block components, `raw_observation_units`, `active_blocks`, `gross_change`, Get It Done monthly counts, all `quality_audit` tallies | person-equivalents; a mixed-unit sum (individuals + tents + vehicles) is an index, not a population |
| Estimated person-equivalents | Published totals with period occupancy multipliers applied | monthly `total`, `observations.history[].total`, forecast `point`/`lower`/`upper`, backtest `mae`, `planning_load` | raw observed units; never re-multiply and never equate levels across the two lanes |
| Percent | A ratio times 100 | `change_pct`, `completeness_pct`, `wape_pct`, `empirical_coverage_pct`, `load_share_pct`, `percent_change` | percentage points |
| Percentage points | Difference of two percents | `encampment_share.change_percentage_points`, `direction_divergence_percentage_points` | percent change |
| Scores and indexes | Dimensionless constructs | `hhi` (0 to 1], `effective_number_of_blocks`, `relative_load` (app planner), `robust_z` | counts or people; an HHI shift is composition, not population |
| Staff-hours | Whole hours of outreach effort | `budget_hours`, `minimum_hours_per_area`, `base_hours`, `variable_hours`, `allocated_hours`, reserve and unmet hours (app lineage) | people, cases, or need |
| Uncertainty ranges | An interval plus its nominal level | `lower`..`upper` with `interval_level` | a measurement; the width is part of the answer, not an error to hide |
| Probabilities and rates | `interval_level` (0.8); multipliers (persons per tent/vehicle) | forecast intervals; Methodology_Periods | percents in the tables above |

## Annual PIT context versus monthly observations

The RTFH Point-in-Time Count is an annual single-night snapshot collected by
a different organization with a different method (ledger id `rtfh_pitc`). It
is context for the retained v0 lineage only and is not an input to
`demo.v1.json`. The monthly series is a monthly visual sweep by DSDP Clean &
Safe enumerators. The two measure different phenomena on different clocks.
The standing guardrail from `docs/project/DATA_STRATEGY.md` applies verbatim:
do not interpolate an annual snapshot into invented monthly precision. PIT
values may sit next to the monthly series as annual context points; they may
never be resampled, blended, or used to fill monthly gaps.

## Ambiguities and their resolution status

Ambiguities recorded in the #33 review, with what this repository actually
shows. Issue #6 (A-07 deterministic validation, normalization, and
aggregation) is closed; #8 (A-08 drop testing) and #35 (A-04 evidence rules)
are open.

| Ambiguity | Repo finding | Status | Resolved by |
| --- | --- | --- | --- |
| Supplied dictionary docx says 10 `area` values but lists 12 | `DowntownCounts_Monthly.csv` contains exactly 12 distinct `area` values, matching the 12 canonical labels in `Area_Crosswalk.csv` | Resolved: 12 is correct; the docx count is wrong | Crosswalk canonical labels; #6 validation enforces zero unmapped labels and the demo restricts to the six core neighborhoods |
| Reviewer reproduction found 544 component-comparable area-months and 513 exact half-up reconciliations, not the documented 541/508 | Neither pair is computed or relied on anywhere in this repository; the shipped pipeline maintains its own mismatch ledger instead (25 material mismatch area-months, 397 sub-1.01-unit rounding residuals) | Open as a documentation discrepancy in the supplied docx; no shipped claim depends on it | Superseded by the #6 quality-audit ledger in `demo.v1.json`; correcting the docx is the organizer's to do |
| Documented 50/72 block/month agreement statistic did not reproduce | `quality_audit.cross_digitization_consistency` records 72 comparable core area-months with 20 showing any difference, that is 52 of 72 in exact agreement | Resolved for this project: the pipeline-computed 52/72 (20 differing) governs; the docx 50/72 is not reproduced | #6 (closed); verified in `demo.v1.json` |
| GeoJSON properties lack canonical `area` despite implied parity with the CSV | Confirmed: `Downtown_BlockGrid.geojson` properties are `block_id`, `lat`, `lon`, `neighborhood`, and four street fields only | Resolved by rule: canonical area always requires a `block_id` join to `Downtown_BlockGrid.csv` or the crosswalk; geometry is deny-listed and never deploys regardless | This dictionary plus the #6 crosswalk validation; privacy boundary per the deployment deny-list |
| No explicit reuse or license term for the organizer bundle | `source_ledger.yaml` records that no redistribution license exists; raw files are git-ignored and never published, only aggregate privacy-reviewed output ships | Open upstream; risk contained and documented | `data/cards/source_ledger.yaml` (#5, closed); any redistribution needs organizer permission |
| `report_month` versus `count_date` offset (Feb 2022 collected 2022-03-01) | Verified in the raw file and disclosed at `quality_audit.*.report_months_with_count_date_offset` | Resolved: join on `report_month`; `count_date` is provenance only | #6 (closed); binding definition 2 at the top of this document |
