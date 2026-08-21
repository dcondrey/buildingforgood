#!/usr/bin/env bash
# Reproducible raw-data retrieval for Still Here SD (issue #5, A-02).
# Downloads every ledger source into data/raw/ and verifies checksums against
# data/cards/checksums.sha256. Raw files are never committed and never deployed;
# provenance lives in data/cards/source_ledger.yaml.
set -euo pipefail
cd "$(dirname "$0")/.."

SDRDL_SOURCE=https://library.metatab.org/sandiegodata.org-downtown_homeless-source-7.2.3
SDRDL_ANALYSIS=https://library.metatab.org/sandiegodata.org-dowtown_homeless-2.1.1

fetch() {
  local out=$1 url=$2
  mkdir -p "$(dirname "$out")"
  echo "fetching $out"
  curl -fSL --retry 3 --silent --show-error -o "$out" "$url"
}

# SDRDL source package 7.2.3 (primary; static archival package)
fetch data/raw/sdrdl_source/metadata.csv "${SDRDL_SOURCE}.csv"
fetch data/raw/sdrdl_source/counts.csv "${SDRDL_SOURCE}/data/counts.csv"
fetch data/raw/sdrdl_source/files.csv "${SDRDL_SOURCE}/data/files.csv"

# SDRDL analysis package 2.1.1 (official published totals; static)
fetch data/raw/sdrdl_analysis/monthly_totals.csv "${SDRDL_ANALYSIS}/data/monthly_totals.csv"
fetch data/raw/sdrdl_analysis/neighborhood_totals.csv "${SDRDL_ANALYSIS}/data/neighborhood_totals.csv"

# RTFH Point-in-Time Count 2025, unsheltered by census tract (annual)
fetch data/raw/rtfh_pitc/unsheltered_census_tract_2025.xlsx \
  "https://www.rtfhsd.org/wp-content/uploads/2025/08/Unsheltered-Clients-Census-Tract-Count-2025-PITC.xlsx"

# San Diego 311 Get It Done, closed 2025 (bias diagnostic; ~128 MB, DAILY updated)
fetch data/raw/sd311/get_it_done_requests_closed_2025.csv \
  "https://seshat.datasd.org/get_it_done_reports/get_it_done_requests_closed_2025_datasd.csv"

echo ""
echo "verifying checksums (stable archival files must match exactly)"
grep -v "sd311" data/cards/checksums.sha256 | sha256sum -c -

# The 311 file is updated daily upstream: a mismatch after a later re-fetch is
# EXPECTED and means "re-pin the checksum and retrieval time in the ledger",
# not corruption. Warn instead of failing.
if ! grep "sd311" data/cards/checksums.sha256 | sha256sum -c - 2>/dev/null; then
  echo "WARNING: sd311 checksum differs from the pinned 2026-08-21 retrieval."
  echo "         Upstream updates daily; re-pin checksums.sha256 and the"
  echo "         retrieved_at fields in data/cards/source_ledger.yaml."
fi

echo ""
echo "FETCH COMPLETE"
