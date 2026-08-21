# Judging Alignment — Building for Good 2026

Track: **Homelessness downtown SD** (max 12 points). Secondary entry:
**EyePop.ai Abilities** (max 11 points). Format: 1 min setup · 5 min
presentation · 3 min Q&A · 1 min teardown. Fresh-code rule: everything was
built in the hacking window; the README carries the disclosure.

## Point map (main track)

| Criterion | Max | Where we earn it | Say it aloud |
| --- | ---: | --- | --- |
| Analysis and presentation | 2 | Measurement decomposition (individuals vs tents on the fixed 261-block panel), coverage counterfactual, honest backtest with a published 75% coverage miss | "We audit the ruler, not just the measurement" |
| Working model | 3 | Rolling-origin model competition with promotion rules; deterministic planner; drop-test classification; byte-reproducible artifact | "Frozen at December 2025 — could we have predicted January?" |
| Visualization / actionable insights | 2 | Layered map workspace (hours / observed change / unmet load), area dossiers, allocation with reasons, the copyable decision brief | "One geography: where people were seen versus where hours go" |
| Bonus: other data sources | 1 | 14 carded sources; the 311 diagnostic excluded by design is itself the unique insight | The 4:35 close names them |
| Bonus: product packaging | 2 | Deployed PWA, offline fallback, keyboard + axe accessibility, guide demo, scenario workbench | "Working product, deployed, offline-capable" |
| Bonus: EyePop integration | 2 | `stillhere_pipeline.eyepop_audit` — zero-shot detection of printed map symbols on the published count PDFs, auditing the digitization lineage | Run it live (below), or state it as built-and-gated |

Realistic: 10/12 without EyePop live, 11–12/12 with it.

## EyePop runbook (do this at the venue, ~10 minutes)

Known snag (2026-08-21): self-serve signup demanded the $200/mo Production
plan despite the DSA2026 code. Do not enter payment — get credentials from
the EyePop rep at the venue or andy@eyepop.ai, or borrow a teammate's key.

The audit no longer waits on the key: the module has a swappable OCR engine,
and `--engine local` (Apple Vision handwriting recognition, fully offline)
already ran against the pinned report — the committed card is
`data/monitoring/digitization_audit.json`, including the recovered City
Center field-sheet totals whose multiplier lineage reconciles to the
published 177 (152 + 14 × 1.75 = 176.5). EyePop is a drop-in:
`--engine eyepop` on the same command, same card shape, engine recorded in
the output. The presentation line without a key: "we built the ability and
ran it locally; EyePop is one flag away — same interface, hosted engine."
With a key, run both engines and show the cards side by side.

1. Sign up at dashboard.eyepop.ai (event code **DSA2026**; questions:
   andy@eyepop.ai). Hamburger menu → API Keys → Create API Key.
2. `export EYEPOP_API_KEY=eyp_...` and leave `EYEPOP_POP_ID` **unset** —
   API-key auth works only with the SDK's default transient pop (the module
   refuses to run otherwise; a named pop needs `EYEPOP_SECRET_KEY` instead).
   Then `uv pip install eyepop` (needs Python 3.12+; the repo venv is 3.14).
3. Run (the `--engine eyepop` flag is required; the default engine is local):

   ```bash
   .venv/bin/python -m stillhere_pipeline.eyepop_audit \
     --pdf data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf \
     --out data/monitoring/eyepop_digitization_audit.json --engine eyepop
   ```

4. Cross-validate the two engines — one command, no OCR rerun:

   ```bash
   .venv/bin/python -m stillhere_pipeline.eyepop_audit \
     --compare data/monitoring/digitization_audit.json \
       data/monitoring/eyepop_digitization_audit.json \
     --out data/monitoring/digitization_audit_agreement.json
   ```

   The agreement card reports, per page, the values both engines recovered
   and each engine's exclusive count, plus an overall agreement share. Two
   independent vision systems agreeing on the recovered totals is a stronger
   audit claim than either engine alone.

5. Show the cards next to the transcribed monitoring totals. The claim to
   make: "computer vision audits the measurement instrument — the handwritten
   field-sheet totals the published counts were digitized from — never
   people." The module is fail-closed without a key, unit-tested offline, and
   its output is a reference card, never a model input.

## EyePop Abilities track framing (secondary entry)

- **The Ability:** "Map-Symbol Auditor" — a reusable workflow that turns any
  published map document into digitization-QA counts via zero-shot prompts.
- **Technical execution:** pinned public input, deterministic rasterization,
  confidence-floored summarization, JSON card output; offline parts tested.
- **Creativity:** CV aimed at the measurement instrument rather than the
  world — auditing how counts were made, not counting people.
- **Practical value:** any agency that digitizes legacy map/chart documents
  (counts, inspections, utilities) gets an independent QA check.
- **VLM bonus:** pair `eyepop.image-contents` (VLM) to read the report's
  printed table numbers and cross-check them against symbol detections —
  document-vs-itself consistency without any training.

## Deliberate non-uses (if asked)

- **Snowflake credits:** unused on purpose. The product's guarantee is a
  static, offline-verifiable artifact with no live backend; adding a cloud
  warehouse would weaken the claim that judges can verify everything locally.
- **EyePop on imagery of people or places:** refused by design; the privacy
  boundary (aggregate places, no person-level data) is a scored strength.
