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

Verify fetches the two pinned pipeline inputs (about 3 MB, checksum-verified)
and rebuilds the generated artifacts deterministically before the app build,
so the deployed bundle and the privacy scan always see real, current
artifacts. Generated artifacts are never committed.

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
| `public/generated/` | Deployment-safe aggregate JSON the app ships |
| `tests/` | Python test suite (UI unit tests are co-located in `app/src/`) |
| `scripts/` | Reproducible build and privacy checks |

## Current placeholders

- `public/generated/prepared_scenario.v0.json` is a hand-written placeholder;
  the real decision contract lands with issue #2 and versioned schemas with
  issue #4. The TypeScript parser (`app/src/lib/scenario.ts`) and the Python
  manifest module (`pipeline/src/stillhere_pipeline/manifest.py`) are the seams
  those issues extend.
