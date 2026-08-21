# Development

Bootstrap for the Still Here SD workspace (issue #3). One command verifies
everything; the layout follows the [development plan](DEVELOPMENT_PLAN.md).

## Prerequisites

- Node.js 20+ (CI uses 24) and npm
- Python 3.11+

## Install and run

```bash
# UI (React + Vite + TypeScript)
npm ci --prefix app
npm --prefix app run dev        # dev server
npm --prefix app run build      # static production build (app/dist/)

# Pipeline (Python)
python3 -m venv .venv
.venv/bin/pip install -e "pipeline[dev]"
```

## Verify everything

```bash
./scripts/verify.sh
```

Runs, in order: ruff format check, ruff lint, mypy, pytest (pipeline), then
prettier check, oxlint, vitest, and the production build (app). CI
(`.github/workflows/verify.yml`) runs the same script on every push and PR.

## Layout

| Path | Purpose |
|---|---|
| `app/` | React/Vite/TypeScript UI; feature code under `app/src/features/` |
| `pipeline/` | Python ingestion, validation, analysis, export (`stillhere_pipeline`) |
| `data/raw/` | Immutable source files; never deployed, not committed |
| `data/processed/` | Normalized aggregate tables; generated, not committed |
| `data/cards/` | Source/quality/model metadata cards; committed |
| `data/processed/generated/` | Legacy normalized aggregate outputs from `stillhere_pipeline.build`; not deployed |
| `public/generated/demo.v1.json` | Single deployment artifact consumed by the app |
| `tests/` | Python test suite (UI unit tests are co-located in `app/src/`) |
| `scripts/` | Reproducible build and privacy checks |

## Generated-artifact boundary

The production build publishes only `public/generated/demo.v1.json`. The
earlier v0 normalization outputs remain supported for pipeline development but
default to `data/processed/generated/`; placeholder and legacy artifacts must
not be copied into the static application.
