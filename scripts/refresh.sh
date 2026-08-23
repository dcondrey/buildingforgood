#!/usr/bin/env bash
# Monthly refresh, run by a person. Not scheduled, not automated.
#
#   ./scripts/refresh.sh                 # fetch, audit, contract-check, write
#   ./scripts/refresh.sh --dry-run       # every check, nothing written
#   ./scripts/refresh.sh --no-fetch      # use the raw files already on disk
#   ./scripts/refresh.sh --fixture       # committed synthetic fixture, no network
#
# Any other flags are passed straight through to stillhere_pipeline.refresh.
# Read docs/project/REFRESH.md before the first run.
set -euo pipefail
cd "$(dirname "$0")/.."

FETCH=1
SOURCE=bundle
PASSTHROUGH=()
for arg in "$@"; do
  case "$arg" in
    --no-fetch) FETCH=0 ;;
    --fixture) SOURCE=fixture; FETCH=0 ;;
    *) PASSTHROUGH+=("$arg") ;;
  esac
done

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet -e "pipeline[dev]"

if [ "$FETCH" -eq 1 ]; then
  echo "== [1/2] fetch and verify public monitoring sources =="
  ./scripts/fetch_raw.sh monitoring
else
  echo "== [1/2] fetch skipped =="
fi

echo "== [2/2] audit, contract-check, emit =="
# The Python side never touches the network. It verifies pins, audits the
# monitoring table, revalidates the full demo contract and the privacy gate,
# and writes only if all of that passes.
.venv/bin/python -m stillhere_pipeline.refresh --source "$SOURCE" ${PASSTHROUGH[@]+"${PASSTHROUGH[@]}"}

echo ""
echo "REFRESH COMPLETE — now run ./scripts/verify.sh before publishing."
