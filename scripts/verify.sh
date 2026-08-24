#!/usr/bin/env bash
# Single top-level verification command (issue #3).
# Runs formatting checks, lint, types, tests, and the production build for
# both the Python pipeline and the TypeScript app.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== [1/6] pipeline: format, lint, types, tests =="
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
# (finding F-2), and a bare "N passed" hides that cost. No count is quoted here
# on purpose: a number in a comment goes stale the next time anyone adds a test,
# and the ledger in the claim inventory is the thing that actually holds it.
# `mktemp -t NAME` means "prefix" to BSD/macOS and "template needing trailing
# X's" to GNU coreutils, so the bare form works locally and fails on Linux
# CI with "too few X's in template". Spell the path out instead.
SKIP_SUMMARY="$(mktemp "${TMPDIR:-/tmp}/stillhere-skips.XXXXXX")"
trap 'rm -f "$SKIP_SUMMARY"' EXIT
.venv/bin/pytest tests -q -rs | tee "$SKIP_SUMMARY"

echo "== [2/6] app: format, lint, tests, production build =="
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
echo "== [3/6] app: refusal suite (README 'What it will not say'; C-01 R-02/R-03/R-09) =="
npm --prefix app exec -- vitest run src/refusals.test.ts

# The adversarial harnesses in review/attacks/. These were written to falsify a
# specific claim at a specific commit, and nothing ran them: vitest's root is
# app/ and they sit outside it, so the repository shipped attack tests CI never
# executed — an assertion with nothing behind it.
#
# They are not a second refusal suite. Each one reproduces an attack that once
# WORKED, and asserts it no longer does, naming the mechanism that stops it. A
# failure here means an old hole has reopened, which the product suite would not
# necessarily notice, because these attacks were built from outside it.
echo "== [4/6] app: adversarial harnesses (review/attacks) =="
( cd app && npm exec -- vitest run --config vitest.attacks.config.ts )

# The privacy scan runs LAST, after the production build exists, because it
# scans app/dist and its source maps as well as public/generated. Running it
# before the build meant the bundle half of issue #7 never executed in a
# normal verify: the directory was simply absent and the check degraded to a
# warning. --require-bundle turns that absence into a failure so the gate
# cannot pass by never having built.
echo "== [5/6] privacy: deployable-data boundary (issue #7) =="
.venv/bin/python -m stillhere_pipeline.privacy --root . --require-bundle

# Every adopter-facing claim, tied to the code that enforces it or the
# limitation that bounds it. A claim backed by neither fails here. It also
# refuses a withdrawn claim that has crept back onto a surface, and reconciles
# the skipped-test ledger against the run above, so the coverage a green suite
# does not buy stays on screen instead of being absorbed by it.
echo "== [6/6] claims: every adopter-facing claim is backed or disclosed =="
PYTHONPATH=pipeline/src .venv/bin/python -m stillhere_pipeline.claims \
  --check --quiet --pytest-summary "$SKIP_SUMMARY"

echo ""
echo "VERIFY PASSED"
