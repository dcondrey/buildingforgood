#!/usr/bin/env bash
# Single top-level verification command (issue #3).
# Runs formatting checks, lint, types, tests, and the production build for
# both the Python pipeline and the TypeScript app.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/5] pipeline: format, lint, types, tests =="
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet -e "pipeline[dev]"
.venv/bin/ruff format --check pipeline/src tests
.venv/bin/ruff check pipeline/src tests
.venv/bin/mypy --config-file pipeline/pyproject.toml pipeline/src
# -rs so the skipped-test summary is captured. The claim inventory in step 5
# reconciles those skips against its ledger: 15 tests skip on every clean
# checkout because the artifact's five source files are not redistributable
# (finding F-2), and a suite reporting only "249 passed" hides that cost.
SKIP_SUMMARY="$(mktemp -t stillhere-skips)"
trap 'rm -f "$SKIP_SUMMARY"' EXIT
.venv/bin/pytest tests -q -rs | tee "$SKIP_SUMMARY"

echo "== [2/5] app: format, lint, tests, production build =="
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
echo "== [3/5] app: refusal suite (README 'What it will not say'; C-01 R-02/R-03/R-09) =="
npm --prefix app exec -- vitest run src/refusals.test.ts

# The privacy scan runs LAST, after the production build exists, because it
# scans app/dist and its source maps as well as public/generated. Running it
# before the build meant the bundle half of issue #7 never executed in a
# normal verify: the directory was simply absent and the check degraded to a
# warning. --require-bundle turns that absence into a failure so the gate
# cannot pass by never having built.
echo "== [4/5] privacy: deployable-data boundary (issue #7) =="
.venv/bin/python -m stillhere_pipeline.privacy --root . --require-bundle

# Every adopter-facing claim, tied to the code that enforces it or the
# limitation that bounds it. A claim backed by neither fails here. It also
# refuses a withdrawn claim that has crept back onto a surface, and reconciles
# the skipped-test ledger against the run above, so the coverage a green suite
# does not buy stays on screen instead of being absorbed by it.
echo "== [5/5] claims: every adopter-facing claim is backed or disclosed =="
PYTHONPATH=pipeline/src .venv/bin/python -m stillhere_pipeline.claims \
  --check --quiet --pytest-summary "$SKIP_SUMMARY"

echo ""
echo "VERIFY PASSED"
