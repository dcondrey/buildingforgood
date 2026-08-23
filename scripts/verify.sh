#!/usr/bin/env bash
# Single top-level verification command (issue #3).
# Runs formatting checks, lint, types, tests, and the production build for
# both the Python pipeline and the TypeScript app.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/4] pipeline: format, lint, types, tests =="
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet -e "pipeline[dev]"
.venv/bin/ruff format --check pipeline/src tests
.venv/bin/ruff check pipeline/src tests
.venv/bin/mypy --config-file pipeline/pyproject.toml pipeline/src
.venv/bin/pytest tests -q

echo "== [2/4] app: format, lint, tests, production build =="
if [ ! -d app/node_modules ]; then
  npm ci --prefix app
fi
npm --prefix app run format:check
npm --prefix app run lint
npm --prefix app run test
npm --prefix app run build

# The refusal suite runs again, by name, after the whole app suite. It is
# already inside `npm run test`, but naming it here means the gate cannot be
# lost by a change to the default test glob, and a failure reads as what it
# is rather than as one red line among two hundred. It carries the checks
# that keep 311 volume, enforcement framing, causal claims, movement claims,
# and capacity claims out of the shipped path, plus the source-scanning guard
# that oxlint cannot express (see app/src/refusals.test.ts).
echo "== [3/4] app: refusal suite (README 'What it will not say'; C-01 R-02/R-03/R-09) =="
npm --prefix app exec -- vitest run src/refusals.test.ts

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
