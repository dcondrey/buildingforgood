# SDHEART evaluation and fallback decision (issue #5)

Evaluated 2026-08-20; all URLs fetched live that day.

## What SDHEART actually is

SDHEART is the **San Diego Homeless and health EquAlity Research Team**, an
NSF-funded research consortium at San Diego State University (NSF Build and
Broaden award #2417568, PI Ming-Hsiang Tsou), applying GeoAI, big-data fusion,
and surveys to homelessness in San Diego County.

- Site: https://sdheart.sdsu.edu/ and https://sdheart.sdsu.edu/research/
- Public surfaces are visualizations only: a "Homeless Population Story Map",
  a survey dashboard, and an ArcGIS story map ("Mapping Downtown San Diego's
  Unsheltered Population") whose description states the underlying data was
  counted by Downtown San Diego Partnership enumerators between January 2014
  and May 2024.

## Decision: excluded as a data source; SDRDL fallback adopted

SDHEART offers **no downloadable datasets, no API, and no stated license or
terms**. Its underlying downtown series is the same DSP monthly count that the
San Diego Regional Data Library digitized and publishes in machine-readable
form. The documented fallback (SDRDL packages) is therefore not a degradation:
it is the same observation lane, actually retrievable and reproducible.

## What SDHEART is still useful for

- Context and validation narrative (their story map corroborates the DSP
  count lane and its coverage window).
- A possible 2023 to May 2024 series extension: the SDRDL machine-readable
  series ends 2022-12, while SDSU reports digitizing DSP maps through May
  2024. Extending coverage would mean contacting the PI (mtsou@sdsu.edu) or
  DSP directly; out of scope for the hackathon MVP and tracked as a known gap.
