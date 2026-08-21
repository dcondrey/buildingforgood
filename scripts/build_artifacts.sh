#!/usr/bin/env bash
# Fetch the pinned build inputs and rebuild the deployment-safe artifacts.
#
# Generated artifacts are NOT committed (C-02 boundary follow-up, PR #45
# thread): a committed artifact is a second, permanent copy no scan can
# retract. This script makes the artifacts a reproducible build product
# instead: it fetches ONLY the two pipeline build inputs (about 3 MB;
# checksum-verified against the source-ledger pins before use) and runs the
# deterministic build. The full acquisition tool for every ledger source
# remains scripts/fetch_raw.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

SDRDL=https://library.metatab.org/sandiegodata.org-downtown_homeless-source-7.2.3

fetch_if_missing() {
  local out=$1 url=$2
  if [ ! -f "$out" ]; then
    echo "fetching $out"
    mkdir -p "$(dirname "$out")"
    curl -fSL --retry 3 --silent --show-error -o "$out" "$url"
  fi
}

fetch_if_missing data/raw/sdrdl_source/counts.csv "${SDRDL}/data/counts.csv"
fetch_if_missing data/raw/sdrdl_source/files.csv "${SDRDL}/data/files.csv"

# The build re-verifies these against data/cards/checksums.sha256 before
# reading them (fail-closed), so a drifted download cannot slip through, but
# checking here too gives a clearer error at the fetch boundary.
grep -E "counts\.csv|files\.csv" data/cards/checksums.sha256 | sha256sum -c -

.venv/bin/python -m stillhere_pipeline.build

echo "ARTIFACTS BUILT"
