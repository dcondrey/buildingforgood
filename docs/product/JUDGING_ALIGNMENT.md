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
If no key materializes, the honest presentation line is: "the integration is
built, tested, and fail-closed; sponsor signup was pay-walled on the day."

1. Sign up at dashboard.eyepop.ai (event code **DSA2026**; questions:
   andy@eyepop.ai). Hamburger menu → API Keys → Create API Key.
2. `export EYEPOP_API_KEY=eyp_...` (and `EYEPOP_POP_ID` if the dashboard
   assigns one), then `uv pip install eyepop`.
3. Run:

   ```bash
   .venv/bin/python -m stillhere_pipeline.eyepop_audit \
     --pdf data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf \
     --out data/monitoring/eyepop_digitization_audit.json
   ```

4. Show the JSON card next to the transcribed monitoring totals. The claim to
   make: "computer vision audits the measurement instrument — the printed
   symbols the counts were digitized from — never people." The module is
   fail-closed without a key, unit-tested offline, and its output is a
   reference card, never a model input.

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
