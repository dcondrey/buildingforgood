# Data Quality and Augmentation Audit

This is Still Here SD's pre-demo release gate. Raw inputs remain immutable;
cleaning is deterministic, every analytical input is hashed in the generated
artifact, and retained anomalies are disclosed instead of hand-corrected.

## Release verdict

`audited_with_retained_source_values`

The prepared claims pass structural checks. None of the retained anomalies is
silently imputed, deleted, or used to manufacture a more favorable result.

| Check                                            |                  Result | Treatment                                                                  |
| ------------------------------------------------ | ----------------------: | -------------------------------------------------------------------------- |
| Organizer archive/file hash comparison           |             Exact match | Use organizer files unchanged                                              |
| Monthly duplicate `(date, area, component)` keys |                       0 | Build fails on any duplicate                                               |
| Monthly invalid counts                           |                       0 | Reject negative, fractional, or non-finite values                          |
| Monthly missing component cells                  |                     143 | Retain as null; never zero-fill or interpolate                             |
| Core-total missing months                        | Jul, Aug, Oct, Nov 2025 | Skip unavailable forecast targets                                          |
| Balanced-panel duplicate block/month keys        |                       0 | Build fails on any duplicate                                               |
| Balanced-panel area/source-label drift           |                   0 / 0 | Require stable membership                                                  |
| Common spatial support                           |   261 blocks × 12 dates | Components lead every spatial claim                                        |
| Crosswalk duplicate or unmapped labels           |                   0 / 0 | No inferred fuzzy joins                                                    |
| Artifact rebuild                                 |          Byte-identical | SHA-256 `a0e2c3db5cd642dcae72af9ea80016657931a75f51df643e0d663f5569d56741` |

## Material anomaly ledger

| Finding                                      |                           Count | Claim impact and treatment                                                                 |
| -------------------------------------------- | ------------------------------: | ------------------------------------------------------------------------------------------ |
| Monthly component/published-total mismatches |                  25 area-months | Published total remains authoritative; components are secondary                            |
| Robust monthly high-tail flags               |                               6 | Retained; none changes the core-total lead                                                 |
| Missing panel component                      |                1 cell, Jan 2020 | Exclude both annual pairs touching it; no imputation                                       |
| Separate digitizations disagree              | 20 of 72 comparable area-months | Maximum deltas: 13 individuals, 9 tents, 4 vehicles; same maps, not independent validation |
| Report-month/count-date offset               |        Feb 2022 collected Mar 1 | Documentation verifies February; join on `report_month`                                    |
| Get It Done duplicate request rows           |          3 globally; 0 retained | Prepared Downtown Encampment slice unaffected                                              |
| Get It Done orphan parent references         |    2,114 globally; 362 retained | Do not repair graph; show raw and no-parent-root counts                                    |
| Get It Done parent cycles                    |                              24 | Empty parent ID only; no incident or person claim                                          |
| NOAA missing temperature rows                |                3 in full series | Both selected count-date rows are complete                                                 |

The monthly table has 397 small, unflagged component-formula residuals, with a
maximum of 1.01 units. Published totals are integers while tent/vehicle
components use decimal multipliers, so these are expected rounding, distinct
from the 25 source-flagged material mismatches.

## Annual-comparison selection

The artifact enumerates every nominal same-month year-over-year pair. Seven are
eligible without imputation. Two pairs touching January 2020 are ineligible
because one tent cell is blank. January 2024 to January 2025 is selected because
it is the latest available pair, both dates use POST2020, and January 2025 is
the final panel date. It is also the strongest component divergence among the
seven eligible pairs; that fact is disclosed, not used as a hidden rule.

## Separate measurement lanes

1. **Published monthly totals** support the trend and historical forecast
   replay. Missing months remain null.
2. **Fixed-panel components** support like-for-like descriptive change.
   Individuals, tents, and vehicles are shown separately; their mixed-unit sum
   is secondary and never called a population.
3. **Get It Done** supports a reporting-process diagnostic only. Raw/root,
   channel, platform-wide, placebo, and matched-calendar checks are visible
   and excluded from forecasting and allocation.
4. **Parking and NOAA** test two simple alternative explanations. They are
   descriptive sensitivities, not causal controls.

## Augmentation decisions

| Candidate                                       | Decision                      | Reason                                                                                                                         |
| ----------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| City Get It Done                                | Ship as diagnostic only       | Reporting is not people or service need                                                                                        |
| Downtown parking                                | Ship fixed-cohort sensitivity | Matched transactions fall 2.4% across 1,997 continuous poles while all GID rises 40.9%; incomplete foot-traffic proxy          |
| NOAA airport weather                            | Ship count-date sensitivity   | Both dates have zero precipitation and similar highs; one station and same-day-only                                            |
| City Auditor                                    | Cite as prior finding         | It identifies divergence; Still Here adds the audit and robustness suite                                                       |
| HCAI homeless-patient hospital encounters       | Context only                  | Strong county burden snapshot; pooled 2023–2024 encounters are not unique patients and the earlier identification rule differs |
| HCAI clinic utilization                         | Context only                  | Exact-facility service load, but patients are not necessarily unhoused and service mix may change                              |
| SDHC dashboard                                  | Future outcomes lane          | Citywide program outcomes are not downtown population or need                                                                  |
| SSA disability-applicant study                  | Method precedent only         | Shows structured flags can miss the construct; national 2007–2017 applicant data are not local validation                      |
| UCSF CASPEH and 2026 Latino/a qualitative study | Ethics/design context         | Statewide 2021–2022 cross-section documents sampling and service-access barriers; no downtown time series                      |
| Kidsdata homeless students and youth PIT        | Cite/defer                    | School-year and annual county/CoC measures cover different populations and definitions                                         |
| San Francisco HIV mortality study               | Reject for analysis           | Different city, selected clinical population, 2002–2016 deaths, and protected nonpublic data                                   |
| IEEE Xplore article 11456520                    | Unverified/defer              | Public endpoint returned HTTP 418 and no indexed title or abstract; do not infer or cite content                               |
| SDPD RIPA stops                                 | Defer                         | Person-level source, officer perception, beat geography, schema break, and ethics require dedicated review                     |
| CDC homelessness and health                     | Context only                  | Supports public-health motivation and multi-system collection, not a downtown series                                           |
| News and public social posts                    | Context only                  | Measure attention and discourse, not movement or need                                                                          |
| Zippia profile                                  | Reject                        | Wrong organization, proprietary estimates, no relevant outcome                                                                 |
| Precise ArcGIS 311 points                       | Reject                        | Duplicate GID lineage with higher location/privacy risk                                                                        |
| sandiegodata-projects GitHub repositories       | Provenance only               | Public DSDP digitization/update lineage, not an independent observation stream                                                 |
| Unverified indexes or exposed servers           | Reject                        | Weak provenance, unclear authorization, no reproducibility advantage                                                           |

## Cleaning and privacy rules

1. Never edit or overwrite raw files.
2. Fail closed on duplicate analytical keys or invalid counts.
3. Keep missing values null; do not interpolate evidence or audit targets.
4. Keep adjusted totals separate from digitized components.
5. Use the 261-block common-support panel for longitudinal spatial claims.
6. Treat parent links and channels as workflow metadata, never identity.
7. Exclude `case_age_days`; it is workflow time, not verified abatement.
8. Ship aggregates only. Coordinates, street text, descriptions, block IDs,
   geometry, and record-level rows never enter the browser artifact.

## Reproducibility

`public/generated/demo.v1.json` records source hashes and the full anomaly
ledger. `./scripts/verify.sh` enforces Python formatting, lint, strict types,
and tests; frontend formatting, lint, tests, and a production build. The final
gate passes 123 pipeline tests and 15 application tests.
