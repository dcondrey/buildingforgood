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

echo "== [2/3] privacy: deployable-data boundary (issue #7) =="
.venv/bin/python -m stillhere_pipeline.privacy --root .

echo "== [3/3] app: format, lint, tests, production build =="
if [ ! -d app/node_modules ]; then
  npm ci --prefix app
fi
npm --prefix app run format:check
npm --prefix app run lint
npm --prefix app run test
npm --prefix app run build

echo ""
echo "VERIFY PASSED"
