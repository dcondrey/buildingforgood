#!/usr/bin/env bash
# Mutation check for the planner safety net (Phase 0 review gate).
#
# A characterization suite is only worth what it catches. This script
# deliberately breaks the planner in ways a careless refactor or a
# well-meaning contractor plausibly would, runs the TypeScript suite against
# each break, and fails if any mutation survives — that is, if the suite still
# passes while the planner is wrong.
#
# It mutates BOTH planners on purpose. `lib/planner.ts` is the code the
# deployed app runs; `domain/planner/planner.ts` is the code that carries the
# refusal guarantees. See docs/project/PHASE0_FINDINGS.md finding F-1.
#
# Every mutation is applied to a working-tree copy and reverted immediately,
# including on interrupt. The script refuses to run against a dirty tree so a
# failed revert can never eat uncommitted work.
set -uo pipefail
cd "$(dirname "$0")/.."

SHIPPED=app/src/lib/planner.ts
DOMAIN=app/src/domain/planner/planner.ts

if ! git diff --quiet -- "$SHIPPED" "$DOMAIN"; then
  echo "refusing to run: $SHIPPED or $DOMAIN has uncommitted changes." >&2
  echo "Commit or stash them first; this script rewrites those files in place." >&2
  exit 2
fi

restore() { git checkout -- "$SHIPPED" "$DOMAIN" 2>/dev/null || true; }
trap restore EXIT INT TERM

# name | file | literal search string | replacement
MUTATIONS=(
$'shipped: coverage floor short by one hour\t'"$SHIPPED"$'\tshares.map((share) => [share.area.id, effectiveFloor + share.whole] as const),\tshares.map((share) => [share.area.id, Math.max(0, effectiveFloor - 1) + share.whole] as const),'
$'shipped: guard flag ignored, floor always applied\t'"$SHIPPED"$'\tconst effectiveFloor = guardEnabled ? floor : 0;\tconst effectiveFloor = floor;'
$'shipped: largest-remainder order reversed\t'"$SHIPPED"$'\t.sort((a, b) => b.fraction - a.fraction || a.index - b.index)\t.sort((a, b) => a.fraction - b.fraction || a.index - b.index)'
$'shipped: budget-conservation check disabled\t'"$SHIPPED"$'\tif (allocatedTotal !== normalizedBudget) {\tif (false && allocatedTotal !== normalizedBudget) {'
$'shipped: a coordinator lock loses to the computed value\t'"$SHIPPED"$'\thours: locks.get(area.id) ?? unlockedHours.get(area.id) ?? 0,\thours: unlockedHours.get(area.id) ?? locks.get(area.id) ?? 0,'
$'domain: complaint-signal guard neutered\t'"$DOMAIN"$'\texport function assertNoComplaintSignal(record: unknown, where: string): void {\texport function assertNoComplaintSignal(record: unknown, where: string): void {\n  if (record !== undefined || where !== undefined) return;'
$'domain: continuity reserve never granted\t'"$DOMAIN"$'\t      area.drop_test === "possible_displacement" ? policy.continuity_reserve_hours : 0;\t      area.drop_test === "never_matches_anything" ? policy.continuity_reserve_hours : 0;'
$'domain: guaranteed hours rounded down instead of up\t'"$DOMAIN"$'\t    return Math.ceil(((m?.floor ?? 0) + (m?.continuity ?? 0)) / increment - 1e-9);\t    return Math.floor(((m?.floor ?? 0) + (m?.continuity ?? 0)) / increment - 1e-9);'
$'domain: the "not a need estimate" disclosure dropped\t'"$DOMAIN"$'\t      "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",\t      "Hours allocated.",'
$'domain: infeasible plan reported as planned\t'"$DOMAIN"$'\t      status: "infeasible",\t      status: "planned",'
)

pass=0
survived=()

for entry in "${MUTATIONS[@]}"; do
  IFS=$'\t' read -r name file needle replacement <<<"$entry"

  if ! MUT_FILE="$file" MUT_NEEDLE="$needle" MUT_REPL="$replacement" python3 - <<'PY'
import os, sys
path = os.environ["MUT_FILE"]
needle = os.environ["MUT_NEEDLE"]
repl = os.environ["MUT_REPL"].replace("\\n", "\n")
text = open(path, encoding="utf-8").read()
if text.count(needle) != 1:
    sys.stderr.write(f"anchor not found exactly once in {path}: {needle!r}\n")
    sys.exit(1)
open(path, "w", encoding="utf-8").write(text.replace(needle, repl))
PY
  then
    echo "SETUP FAILED  $name"
    echo "  the anchor text no longer exists; update scripts/mutation_check.sh" >&2
    survived+=("$name (anchor missing)")
    restore
    continue
  fi

  if npm --prefix app run test --silent >/dev/null 2>&1; then
    echo "SURVIVED      $name"
    survived+=("$name")
  else
    echo "caught        $name"
    pass=$((pass + 1))
  fi
  restore
done

echo ""
echo "$pass of ${#MUTATIONS[@]} mutations caught."

if ((${#survived[@]} > 0)); then
  echo ""
  echo "MUTATION CHECK FAILED. These broken planners still pass the suite:" >&2
  for name in "${survived[@]}"; do echo "  - $name" >&2; done
  echo "" >&2
  echo "Add a test that fails for each, then re-run." >&2
  exit 1
fi

echo "MUTATION CHECK PASSED"
