# Data Strategy

Candidate sources, permitted uses, and the limitations that must stay visible
in the product. Machine-readable provenance lives in
[`data/cards/source_ledger.yaml`](../../data/cards/source_ledger.yaml); the
SDHEART acquisition decision is recorded in
[`data/cards/sdheart-evaluation.md`](../../data/cards/sdheart-evaluation.md).

## Sources

Preferred: the [SDHEART OpenData collection](https://sdheart.sdsu.edu/),
cataloged by the [2025 Big Data Hackathon for San
Diego](https://bigdataforsandiego.github.io/#dataset). Fallback: the
[San Diego Regional Data Library Downtown Homelessness
package](https://data.sandiegodata.org/dataset/sandiegodata-org-downtown-homeless-source/).
Official context: [City of San Diego Homelessness Data &
Reports](https://www.sandiego.gov/homelessness-strategies-and-solutions/data-reports)
and the Regional Task Force on Homelessness.

| Candidate source | Intended use | Guardrail |
|---|---|---|
| Downtown monthly survey observations | Historical neighborhood aggregation, drop testing, forecasting | Remove exact coordinates from every published artifact |
| DSDP public monthly reports | Post-freeze public monitoring and publisher checkpoints | Keep separate from frozen training; never call same-publisher agreement independent validation |
| PIT Count density | Annual context and source comparison | Do not interpolate an annual snapshot into invented monthly precision |
| HUD CA-601 performance, PIT, and HIC reports | Annual CoC system context and official measurement definitions | Never blend countywide annual outcomes or inventory into downtown monthly observations |
| 311 encampment reports | Reporting-bias and disagreement diagnostic | Never treat complaints as people, need, or an allocation target |
| SDHC City-program dashboard | HMIS-based program-outcome context | Never imply downtown coverage, live capacity, eligibility, or availability |
| Shelter locations | Geographic context and travel estimates | Never imply live capacity, eligibility, or availability |
| Neighborhood ACS indicators | Aggregate context and fairness audit | Never infer an individual's identity, condition, or service need |
| San Diego/SANDAG geography | Neighborhood boundaries and travel approximation | Publish only the geography the interface requires |

A source is not added merely because it is available. Its collection method,
time scale, limitations, and permitted use must be explainable.

## Monitoring and system-context lanes

Post-freeze DSDP observations live in
[`data/monitoring/dsdp_public_checkpoints.csv`](../../data/monitoring/dsdp_public_checkpoints.csv),
not in the organizer bundle or generated demo artifact. The pinned June 2026
publisher report supplies April and June values. The six-area core totals are
derived only by excluding Outside Perimeter, and automated checks reconcile
both the six-area and published seven-area totals. Every monitoring row is
explicitly ineligible for modeling.

The DSDP dashboard's “Q1 2026” value of 1,092 conflicts with the PDF's April
placement of the same value. Because the PDF includes no January-March
observation, neither surface validates the demo's January 2026 historical
forecast replay. Missing months remain missing.

SDHC and HUD sources occupy a separate system-context lane. SDHC reports HMIS
outcomes for City/SDHC-funded programs. HUD reports annual CA-601 CoC system
performance, PIT, and HIC measures and publishes their governing definitions.
Those measures may support responsible-data cards and annual context, but they
cannot enter the downtown observation series, forecast, or planner. HIC beds
and program inventory never imply live availability or eligibility.

Source discovery pages are not analytical inputs. The former HUD Exchange
grantee-report and homelessness-data routes returned 404 on 2026-08-21, so the
ledger records current HUD USER discovery pages and direct official reports.
The live DSDP archive and Unhoused Care pages also contained unrelated injected
content on that review date. Acquisition is therefore restricted to allowlisted
publisher documents with reviewed hashes; whole-page HTML is never ingested.

## Known limitations that must remain visible

- Several historical months are missing or excluded.
- Day-of-month values are unreliable for many records.
- Handwritten totals sometimes disagree with the sum of map annotations.
- Neighborhood names and boundaries are not perfectly consistent over time.
- Occupancy-multiplier practices break comparability after March 2017 in the
  fallback package.
- Weather and temperature fields contain missing values.
- PIT, monthly counts, 311 reports, and shelter information measure different
  phenomena.
- An aggregate flow model cannot distinguish housing exits, movement, new
  arrivals, or measurement error without additional evidence.

## Shipped demo lineage and reproduction

The shipped `stillhere.demo.v1` artifact uses the five organizer-supplied CSVs
listed in the ledger as its primary source. The Get It Done Council District 3,
parking-meter, and NOAA snapshots are optional descriptive diagnostics and are
excluded from forecasting and allocation. The older SDRDL, closed-2025 311,
and PIT entries remain in the ledger for the retained v0 lineage; they are not
inputs to `demo.v1`.

Raw organizer, request, block, meter-location, and weather files are ignored
and never deploy. To verify an already staged copy of the exact analytical
snapshot without making a network request, run:

```bash
./scripts/fetch_raw.sh verify-demo
```

`./scripts/fetch_raw.sh demo` instead fetches the current public diagnostic
exports. Because those City/NOAA endpoints are mutable, it deliberately fails
when retrieved bytes no longer match the pinned snapshot. Audit the source
change before explicitly re-pinning and regenerating; never silently combine
snapshots. Public DSDP reports provide aggregate publisher checkpoints, but no
recorded public source substitutes for the organizer bundle's full block-level
fixed panel and supporting crosswalk/method files.

The generator invokes the authoritative `demo.v1` contract and precise-field
privacy gate before creating or replacing the deployment artifact. Raw-dependent
analytical tests skip in a clean checkout, while raw-independent contract tests
validate the committed artifact and decision-critical invariants in CI.
