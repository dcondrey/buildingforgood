# `stillhere-audit` — the digitization audit CLI

Drop in a scanned PDF, get an auditable table.

Public count programs publish tidy tables. Behind those tables are scanned,
hand-annotated field sheets whose handwritten totals were typed in by a person.
That typing step is normally invisible and unchecked. This tool makes it
checkable: it recovers text from each page of the published PDF, reports what it
found per page, and — when you run two configurations — reports where the two
readings disagree.

**Recovered values are candidates for human verification, never counts.** The
tool does not correct a published number, does not replace a number, and does
not feed a model. Its only product is a list of places a human should look. A
value that appears in a card is a hypothesis about what a scan says; a value the
two runs disagree on is a hypothesis worth checking first.

## Install and invoke

The CLI ships with the `stillhere-pipeline` package:

```sh
uv pip install -e pipeline        # or: .venv/bin/pip install -e pipeline
stillhere-audit --help
```

`python -m stillhere_pipeline.eyepop_audit` is the same entry point with the
same flags, and keeps working unchanged if you would rather not install the
console script.

Rasterizing needs `pdftoppm` (poppler) on `PATH`.

## The four things you can do

**1. Audit one PDF with one engine, at one resolution.**

```sh
stillhere-audit --pdf report.pdf --out card.json
stillhere-audit --pdf report.pdf --dpi 300 --engine local --format table
```

`--out` writes the JSON card. Without `--out` nothing is written and the table
goes to stdout, so an exploratory run cannot clobber a file.

**2. Print a human-readable table instead of JSON.**

`--format table` renders per page: integer tokens found, how many were reported,
how many were withheld below the threshold, and the reported values.
`--format json` prints the card itself. `--format summary` (the default when
`--out` is given) prints a one-line receipt. Long value lists are truncated in
the table — the JSON card is always complete.

**3. Run two configurations and compare them.**

```sh
stillhere-audit --pdf report.pdf --also-run @300 --out agreement.json
stillhere-audit --pdf report.pdf --engine local --also-run eyepop --out agreement.json
```

`--also-run ENGINE@DPI` runs a second pass over the same PDF and emits the
agreement card instead of a single audit card. Either half may be omitted:
`@300` reuses `--engine` at a different resolution, `eyepop` reuses `--dpi` with
a different engine. Add `--card-dir DIR` to keep both individual cards
alongside the comparison.

**4. Compare or re-read cards you already have — no OCR rerun.**

```sh
stillhere-audit --compare card_a.json card_b.json --out agreement.json
stillhere-audit --show data/monitoring/digitization_audit.json
```

`--show` renders any existing audit or agreement card as a table and writes
nothing.

## Engines

| `--engine` | What it is | Network |
| --- | --- | --- |
| `local` (default) | Apple Vision handwriting recognition | none; fully offline, macOS only |
| `eyepop` | EyePop.ai hosted detect-then-recognize OCR | hosted; needs `EYEPOP_API_KEY` |
| `eyepop-vlm` | EyePop.ai hosted image-contents VLM | hosted; needs `EYEPOP_API_KEY` |

Both hosted engines are fail-closed: without `EYEPOP_API_KEY` the run exits with
an error before any page is rasterized and before any network call. `local`
never leaves the machine.

`--dpi` matters and is recorded in every card the tool writes. Handwriting
recognition is not stable across raster resolutions, which is a finding rather
than a nuisance — it is the main thing the agreement card is for.

## Reading the agreement card

The agreement card compares two already-filtered audit cards. Per page it
reports `shared` (values both runs recovered, with multiplicity),
`only_in_first`, `only_in_second`, and the shared values themselves. Its summary
carries an `agreement_share`: `2 × shared / (first_total + second_total)`, so
1.0 means the two runs recovered exactly the same multiset and 0.0 means they
overlapped nowhere.

A high agreement share is not a claim that the readings are correct — two runs
can agree on the same misreading. **A low share, or a page with nonzero
`only_in_first` and `only_in_second`, is the useful signal: those are the pages a
human should re-read against the scan.**

The shipped example: at 200 dpi the City Center field sheet reads `157` where
the same engine at 300 dpi reads `152`. The published City Center total is 177,
and 152 + 14 tents × 1.75 = 176.5 ≈ 177 — so the 300-dpi reading reconciles and
the 200-dpi one does not. The agreement card surfaced that disagreement on page
4 without anyone knowing in advance which page to check. That is the whole
product.

The committed cards in `data/monitoring/` are evidence quoted by the app and the
product docs, including the 157 misread. Write new runs to new paths; do not
regenerate them.

## What a card may contain

Every card obeys the same boundary, and the CLI cannot widen it:

- Page-level only. No block identifiers, no geometry, no bounding boxes.
- Integer tokens only, above a confidence floor.
- Values are written only at or above the area-total threshold (12). Values
  below it are counted in `withheld_below_threshold` and never written, so a
  block-scale digit cannot enter a card or a table.
- The confidence band (`qualifying_by_confidence`) reports counts at looser
  floors, never the values those floors would admit.
- The agreement card is derived from two already-filtered cards, so it can only
  ever restate values one of them already carried.

The input is an already-published aggregate document. The output is a reference
card for auditing a digitization lineage — never a model input, and never a
correction to a published count.

## Adapting it to another document

Nothing in the CLI is specific to San Diego. The knobs worth revisiting for a
different report are `VALUE_THRESHOLD` (what scale of number is a plausible
area total rather than a block mark — the privacy floor), `MIN_CONFIDENCE`, and
`CONFIDENCE_FLOORS` in `pipeline/src/stillhere_pipeline/eyepop_audit.py`. Adding
an engine is a function of `Path -> list[{"text", "confidence"}]` registered in
`ENGINES`; everything downstream is engine-independent.
