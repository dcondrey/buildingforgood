#!/usr/bin/env bash
# Retrieve or verify raw inputs for the shipped demo.v1, retained legacy v0,
# and public post-freeze monitoring lineages. Raw request-, meter-, block-,
# coordinate-, and publisher-document files are ignored by git and must never
# be copied into public/ or app/.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE=${1:-all}
case "$MODE" in
  all|demo|legacy|monitoring|verify-demo|verify-monitoring) ;;
  *)
    echo "usage: $0 [all|demo|legacy|monitoring|verify-demo|verify-monitoring]" >&2
    exit 2
    ;;
esac

SDRDL_SOURCE=https://library.metatab.org/sandiegodata.org-downtown_homeless-source-7.2.3
SDRDL_ANALYSIS=https://library.metatab.org/sandiegodata.org-dowtown_homeless-2.1.1
NCEI_DAILY='https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=USW00023188&startDate=2017-01-01&endDate=2025-12-31&format=csv&units=standard&includeAttributes=false'
DSDP_JUNE_2026='https://downtownsandiego.org/wp-content/uploads/2026/08/June-2026-Unsheltered-Sleep-Count.1.pdf'

DEMO_ORGANIZER_FILES=(
  data/raw/hackathon_provided/Area_Crosswalk.csv
  data/raw/hackathon_provided/BlockLevel_Counts.csv
  data/raw/hackathon_provided/BlockLevel_Counts_Panel261.csv
  data/raw/hackathon_provided/DowntownCounts_Monthly.csv
  data/raw/hackathon_provided/Methodology_Periods.csv
)
DEMO_PUBLIC_FILES=(
  data/raw/get_it_done/get_it_done_requests_CD3_datasd.csv
  data/raw/parking_meters/parking_meters_current.csv
  data/raw/parking_meters/treas_meters_2022_pole_by_month_datasd.csv
  data/raw/parking_meters/treas_meters_2023_pole_by_month_datasd.csv
  data/raw/parking_meters/treas_meters_2024_pole_by_month_datasd.csv
  data/raw/parking_meters/treas_meters_2025_pole_by_month_datasd.csv
  data/raw/parking_meters/treas_parking_meters_loc_datasd.csv
  data/raw/weather/san_diego_airport_daily_2017_2025.csv
)
LEGACY_STABLE_FILES=(
  data/raw/sdrdl_source/counts.csv
  data/raw/sdrdl_source/files.csv
  data/raw/sdrdl_source/metadata.csv
  data/raw/sdrdl_analysis/monthly_totals.csv
  data/raw/sdrdl_analysis/neighborhood_totals.csv
  data/raw/rtfh_pitc/unsheltered_census_tract_2025.xlsx
)
MONITORING_FILES=(
  data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf
)

fetch() {
  local out=$1 url=$2
  mkdir -p "$(dirname "$out")"
  echo "fetching $out"
  curl -fSL --retry 3 --silent --show-error -o "$out" "$url"
}

require_organizer_bundle() {
  local missing=0 path
  for path in "${DEMO_ORGANIZER_FILES[@]}"; do
    if [[ ! -f "$path" ]]; then
      echo "missing organizer-supplied input: $path" >&2
      missing=1
    fi
  done
  if ((missing)); then
    echo "Place the participant bundle in data/raw/hackathon_provided/; public reports do not substitute for its block-level panel." >&2
    exit 1
  fi
}

verify_paths() {
  local path pin
  for path in "$@"; do
    pin=$(awk -v wanted="$path" '$2 == wanted { print; found=1 } END { if (!found) exit 1 }' data/cards/checksums.sha256) || {
      echo "no pinned checksum for $path" >&2
      return 1
    }
    printf '%s\n' "$pin" | sha256sum -c -
  done
}

fetch_legacy() {
  fetch data/raw/sdrdl_source/metadata.csv "${SDRDL_SOURCE}.csv"
  fetch data/raw/sdrdl_source/counts.csv "${SDRDL_SOURCE}/data/counts.csv"
  fetch data/raw/sdrdl_source/files.csv "${SDRDL_SOURCE}/data/files.csv"
  fetch data/raw/sdrdl_analysis/monthly_totals.csv "${SDRDL_ANALYSIS}/data/monthly_totals.csv"
  fetch data/raw/sdrdl_analysis/neighborhood_totals.csv "${SDRDL_ANALYSIS}/data/neighborhood_totals.csv"
  fetch data/raw/rtfh_pitc/unsheltered_census_tract_2025.xlsx \
    "https://www.rtfhsd.org/wp-content/uploads/2025/08/Unsheltered-Clients-Census-Tract-Count-2025-PITC.xlsx"
  fetch data/raw/sd311/get_it_done_requests_closed_2025.csv \
    "https://seshat.datasd.org/get_it_done_reports/get_it_done_requests_closed_2025_datasd.csv"

  echo "verifying stable legacy snapshots"
  verify_paths "${LEGACY_STABLE_FILES[@]}"
  if ! verify_paths data/raw/sd311/get_it_done_requests_closed_2025.csv; then
    echo "WARNING: the unused legacy daily 311 export differs from its pinned snapshot." >&2
  fi
}

fetch_demo_public() {
  fetch data/raw/get_it_done/get_it_done_requests_CD3_datasd.csv \
    "https://seshat.datasd.org/get_it_done_reports/get_it_done_requests_CD3_datasd.csv"
  fetch data/raw/parking_meters/parking_meters_current.csv \
    "https://seshat.datasd.org/parking_meters_locations/parking_meters_current.csv"
  for year in 2022 2023 2024 2025; do
    fetch "data/raw/parking_meters/treas_meters_${year}_pole_by_month_datasd.csv" \
      "https://seshat.datasd.org/parking_meters_transactions_monthly/treas_meters_${year}_pole_by_month_datasd.csv"
  done
  fetch data/raw/parking_meters/treas_parking_meters_loc_datasd.csv \
    "https://seshat.datasd.org/parking_meters_locations/treas_parking_meters_loc_datasd.csv"
  fetch data/raw/weather/san_diego_airport_daily_2017_2025.csv "$NCEI_DAILY"
}

verify_monitoring() {
  echo "verifying public monitoring source snapshots"
  verify_paths "${MONITORING_FILES[@]}"
}

fetch_monitoring() {
  fetch "${MONITORING_FILES[0]}" "$DSDP_JUNE_2026"
  verify_monitoring
}

verify_demo() {
  require_organizer_bundle
  echo "verifying the exact demo.v1 input snapshot"
  if ! verify_paths "${DEMO_ORGANIZER_FILES[@]}" "${DEMO_PUBLIC_FILES[@]}"; then
    echo "DEMO SNAPSHOT MISMATCH: mutable public exports may have changed." >&2
    echo "Do not silently mix snapshots. Audit changes, then deliberately re-pin and regenerate demo.v1." >&2
    exit 1
  fi
}

if [[ "$MODE" == legacy || "$MODE" == all ]]; then
  fetch_legacy
fi
if [[ "$MODE" == demo || "$MODE" == all ]]; then
  require_organizer_bundle
  fetch_demo_public
  verify_demo
elif [[ "$MODE" == verify-demo ]]; then
  verify_demo
fi
if [[ "$MODE" == monitoring || "$MODE" == all ]]; then
  fetch_monitoring
elif [[ "$MODE" == verify-monitoring ]]; then
  verify_monitoring
fi

echo "RAW INPUT $MODE COMPLETE"
