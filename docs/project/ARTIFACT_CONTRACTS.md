# Pipeline-to-UI Artifact Contracts

Issue [#4](https://github.com/dcondrey/buildingforgood/issues/4) (D-04). The
Python pipeline and the TypeScript app validate the same generated JSON
artifacts independently, so an invalid artifact fails the same way no matter
which side reads it first. This document is the map between the paired
validators and the rule for keeping them in sync.

## Paired files

| Artifact                    | Python validator                                                           | TypeScript validator                                         | Fixtures                                                            |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `observations.v0`           | `pipeline/src/stillhere_pipeline/contracts.py::validate_observations_v0`   | `app/src/lib/contracts.ts::parseObservationsV0`              | `tests/pipeline/test_contracts.py`, `app/src/lib/contracts.test.ts` |
| `quality_report.v0`         | `pipeline/src/stillhere_pipeline/contracts.py::validate_quality_report_v0` | `app/src/lib/contracts.ts::parseQualityReportV0`             | same                                                                |
| `prepared_scenario`         | none yet (UI-only artifact)                                                | `app/src/lib/scenario.ts::parsePreparedScenario`             | `app/src/lib/scenario.test.ts`                                      |
| Generated-artifact manifest | `pipeline/src/stillhere_pipeline/manifest.py::build_manifest`              | no reader yet (add when the app consumes `manifest.v0.json`) | —                                                                   |

## The sync rule

Both validators enforce, field for field:

- the `schema` discriminator string;
- the `contract` block on `observations.v0` — `count_fields` (must equal the
  declared count-bearing paths exactly), `small_cell_threshold` (must equal
  the policy constant in `stillhere_pipeline.suppress.SMALL_CELL_THRESHOLD`,
  passed into `parseObservationsV0` by the caller rather than duplicated as a
  second literal), and `suppression_marker` (field name `suppressed`,
  affirmative encoding exactly `[true]`);
- every `neighborhoods[].observations[]` row: either the suppressed shape
  (`total: null`, no `by_type`) or a published row whose `by_type` keys match
  the declared type fields exactly (`individual`, `structure`, `vehicle`),
  each an int or null, never a boolean;
- the precise-location deny list (`x`, `y`, `lat`, `latitude`, `lng`, `lon`,
  `longitude`, `address`, `street_address`), matched case-insensitively and
  walked recursively through every object and array in the document.

When a rule changes in one validator, change it in the other in the same
pull request and extend both fixture files with the same case. A rule that
only exists in one language is a contract that only holds in one language —
exactly the gap issue #4 exists to close.

## Versioning

Each artifact's `schema` field is its version discriminator (`observations.v0`,
`quality_report.v0`); a breaking change ships as a new value (`observations.v1`)
with both validators updated together, not a silent shape change under the
same string. `manifest.v0.json` additionally pins a SHA-256 checksum per raw
input, so a consumer can verify exactly which inputs produced the artifacts it
is reading.
