# C-02 — Deployable-data privacy boundary

**Issue:** [#7](https://github.com/dcondrey/buildingforgood/issues/7) · **Track:** [C](https://github.com/dcondrey/buildingforgood/issues/30) · **Milestone:** M1
**Implementation:** `pipeline/src/stillhere_pipeline/privacy.py`
**Tests:** `tests/privacy/test_privacy.py`, fixtures in `tests/privacy/fixtures/{pass,fail}/`
**Runs as:** `python -m stillhere_pipeline.privacy --root .` — wired into `scripts/verify.sh` step 2 of 3, so it runs locally and in CI via `.github/workflows/verify.yml`.

## The promise

Nothing that could locate or identify a person reaches the static deployment. This is enforced structurally — a failing scan exits non-zero and fails the build — rather than by reviewer attention.

## Rules

### 1. Forbidden field names
Keys are normalized to lowercase alphanumerics before matching, so `Latitude`, `geo-lat`, `geoLat` and `LAT_DEG` all resolve to the same rule. Four groups: coordinates (`lat`, `lon`, `geohash`, `easting`, `pluscode`, …), addresses and parcels (`address`, `street`, `housenumber`, `apn`, `parcel_id`, …), person and record identifiers (`person_id`, `hmis_id`, `case_id`, `ssn`, `dob`, `phone`, `email`, …), and site identifiers (`point_id`, `camp_id`, `encampment_id`, …). Severity **BLOCK**.

### 2. Forbidden value patterns
Street addresses, `lat, lon` pairs, and Open Location plus codes found inside otherwise innocent string fields — the leak that survives a key-only deny-list because it hides in a `note` or `label`. Severity **BLOCK**.

### 3. Coordinate geometry — the hard case
The product ships an aggregate spatial view, so boundary polygons are legitimate coordinates. A naive deny-list either blocks the map or is theatre. The rule:

- Coordinates are permitted **only** inside a `geometry` object whose `type` is `Polygon` or `MultiPolygon`.
- `Point`, `MultiPoint` and `LineString` geometries are refused outright — those are the shapes that locate a person. Severity **BLOCK**.
- Any coordinate-shaped number **outside** an approved geometry is caught by the numeric heuristic below.
- Boundary vertices carrying more than 6 decimal places raise a **WARN**: not a leak, but beyond what an aggregate boundary needs.

### 4. Numeric heuristic (San Diego bounding box)
A decimal number with ≥3 decimal places inside longitude `-117.7 … -116.5` is treated as a longitude leak (**BLOCK**) — the span is negative and narrow, so a count or metric essentially cannot land there. The latitude span `32.4 … 33.6` overlaps plausible counts, so latitude alone is a **WARN** asking for confirmation. This asymmetry is deliberate: one side is unambiguous, the other is not, and pretending otherwise would either miss leaks or drown the build in false positives.

### 5. Small-cell suppression — added by the red-team review
**Aggregation is not anonymization.** A neighbourhood-month count of one is a person, and combined with local knowledge it identifies them. This rule came out of C-01 finding **R-06**; the original plan's control was field-based only and would have passed a count of 1.

Any count-shaped key (`observed_count`, `persons`, `unsheltered`, `tally`, …) whose published integer value is `0 < v < min_cell` is a **BLOCK**. Default threshold is 5, configurable via `--min-cell`. Zero is permitted. The escape hatch is to publish the cell as suppressed — a sibling `suppressed`/`redacted` marker clears the rule — and per R-06 the suppression must be visible in the UI as a data-quality state, never rendered as a zero.

**Open follow-up:** suppressed cells must not be recoverable by subtraction from a published total. That is a pipeline aggregation concern (Track A, #6) as much as a scan concern, and is not yet enforced.

### 6. Publication layout
Raw and tabular file types (`.csv`, `.xlsx`, `.shp`, `.parquet`, `.sqlite`, …) are **BLOCK** anywhere under the generated directory or the production bundle, whatever they contain. `data/raw` and `data/processed` appearing inside `public/` is **BLOCK**. A data directory with no `.gitignore` is a **WARN**.

### 7. Production bundle and source maps
`app/dist` is scanned as text — `.js`, `.mjs`, `.css`, `.html`, and `.map` — for embedded coordinate pairs, street addresses, and deny-listed field names appearing as object keys. Source maps are included deliberately: they are the most common way raw data survives a build unnoticed. A missing bundle is a **WARN** during development and can be promoted to a failure for release verification with `--require-bundle`.

## Test design

`fixtures/pass/` must scan clean; `fixtures/fail/` must each produce at least one blocking finding. Adding a newly-imagined leak shape is a one-file change, and a rule that silently stops working fails loudly. `test_repository_generated_artifacts_are_clean` scans the real `public/generated/` on every run, so this is a live gate and not only a fixture exercise.

The fixture set found a real bug on first run: the key deny-list fired on `coordinates` inside an approved polygon, which would have blocked the aggregate map. Fixed by exempting that key only while inside an already-approved geometry.

## Acceptance criteria status

- [x] Deployable artifacts contain aggregate geography only — enforced by rules 1–4, live-gated by `test_repository_generated_artifacts_are_clean`.
- [x] Known coordinate, address, and identifier leak fixtures fail the check — 6 negative fixtures, 21 tests passing.
- [x] The privacy scan runs in local verification and CI — `scripts/verify.sh` step 2/3, which CI invokes.
- [x] The production bundle and source maps do not embed raw records — rule 7. Becomes a hard gate at release with `--require-bundle`.

**Not yet closable.** The criteria are met against the placeholder artifact. #7 declares dependencies on #4 (artifact contracts) and #6 (aggregation), and the scan has only ever seen a hand-written placeholder. Re-verify against real pipeline output before closing, and add fixtures for any field shape the real source introduces.

## Handoffs

- **Track A (#6):** counts below the threshold must be emitted as suppressed at aggregation time; the scan is the backstop, not the mechanism. Subtraction-recovery of suppressed cells is unsolved.
- **Track A (#8) / Track C (#16):** suppression must surface in the UI as a data-quality state, per R-06.
- **Track D:** `scripts/verify.sh` gained one additive block. Flagged for the Track D owner as a cross-track touch — it is the only way to satisfy the "runs in local verification and CI" criterion.
