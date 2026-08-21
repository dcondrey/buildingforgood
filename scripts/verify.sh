#!/usr/bin/env bash
# Single top-level verification command (issue #3).
# Runs formatting checks, lint, types, tests, and the production build for
# both the Python pipeline and the TypeScript app.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/3] pipeline: format, lint, types, tests =="
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet -e "pipeline[dev]"
.venv/bin/ruff format --check pipeline/src tests
.venv/bin/ruff check pipeline/src tests
.venv/bin/mypy --config-file pipeline/pyproject.toml pipeline/src
.venv/bin/pytest tests -q

# Artifacts are a build product, never committed (C-02 boundary follow-up):
# fetch the pinned inputs and rebuild deterministically BEFORE the app build,
# so the bundle ships real artifacts and the privacy scan has real content to
# judge. A verify run that scanned an empty generated directory would be
# green with nothing to catch.
echo "== [2/4] artifacts: fetch pinned inputs, deterministic rebuild =="
./scripts/build_artifacts.sh

echo "== [3/4] app: format, lint, tests, production build =="
if [ ! -d app/node_modules ]; then
  npm ci --prefix app
fi
npm --prefix app run format:check
npm --prefix app run lint
npm --prefix app run test
npm --prefix app run build

# The privacy scan runs LAST, after the production build exists, because it
# scans app/dist and its source maps as well as public/generated. Running it
# before the build meant the bundle half of issue #7 never executed in a
# normal verify: the directory was simply absent and the check degraded to a
# warning. --require-bundle turns that absence into a failure so the gate
# cannot pass by never having built.
echo "== [4/4] privacy: deployable-data boundary (issue #7) =="
.venv/bin/python -m stillhere_pipeline.privacy --root . --require-bundle

echo ""
echo "VERIFY PASSED"
