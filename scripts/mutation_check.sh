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

# Mutations live in a heredoc, one per record, fields separated by a line of
# four percent signs. An earlier version packed them into a bash array read by
# `IFS=$'\t' read`, which stops at the first newline: any replacement spanning
# two lines was silently truncated back to its own search string, so the
# mutation applied cleanly and changed nothing. It reported "caught" while
# testing an unmutated file. Records are parsed by python here for that reason.
#
# Two mutations were removed rather than kept as permanent failures, because
# they are EQUIVALENT MUTANTS — no input can distinguish them, so no test can
# ever kill them and demanding one is unsatisfiable.
#
#   `hours: locks.get(id) ?? unlockedHours.get(id) ?? 0` with the operands
#   swapped. `unlocked` is filtered on `!locks.has(id)` and `unlockedHours` is
#   built only from `unlocked`, so the two maps have disjoint key sets and
#   `a ?? b` equals `b ?? a` for every key. Equivalent by construction.
#
#   `if (allocatedTotal !== normalizedBudget)` disabled. That branch is a
#   defensive assertion over arithmetic performed directly above it; it can
#   only fire if the allocation is already wrong for some other reason. It is
#   worth keeping in the source and impossible to kill in isolation.
#
# Both were found by an independent review track, first by brute force (4,119
# and 2,988 inputs, zero differing outputs) and then confirmed structurally.
# The originally claimed "10 of 10 caught" was wrong twice over: these two were
# unkillable, and a third was never applied at all (see the parsing note above).
MUTATIONS=$(cat <<'RECORDS'
shipped: coverage floor short by one hour
%%%%
app/src/lib/planner.ts
%%%%
shares.map((share) => [share.area.id, effectiveFloor + share.whole] as const),
%%%%
shares.map((share) => [share.area.id, Math.max(0, effectiveFloor - 1) + share.whole] as const),
%%%%%%%%
shipped: guard flag ignored, floor always applied
%%%%
app/src/lib/planner.ts
%%%%
const effectiveFloor = guardEnabled ? floor : 0;
%%%%
const effectiveFloor = floor;
%%%%%%%%
shipped: largest-remainder order reversed
%%%%
app/src/lib/planner.ts
%%%%
.sort((a, b) => b.fraction - a.fraction || a.index - b.index)
%%%%
.sort((a, b) => a.fraction - b.fraction || a.index - b.index)
%%%%%%%%
shipped: floor infeasibility tolerated by eight hours
%%%%
app/src/lib/planner.ts
%%%%
  if (minimumRequired > normalizedBudget) {
%%%%
  if (minimumRequired > normalizedBudget + 8) {
%%%%%%%%
shipped: the largest-remainder pass never runs
%%%%
app/src/lib/planner.ts
%%%%
    if (remainder <= 0) break;
%%%%
    if (remainder <= 999) break;
%%%%%%%%
domain: complaint-signal guard neutered
%%%%
app/src/domain/planner/planner.ts
%%%%
  for (const [key, value] of Object.entries(record)) {
%%%%
  for (const [key, value] of Object.entries(record)) {
    if (key !== undefined) continue;
%%%%%%%%
domain: continuity reserve never granted
%%%%
app/src/domain/planner/planner.ts
%%%%
      area.drop_test === "possible_displacement" ? policy.continuity_reserve_hours : 0;
%%%%
      area.drop_test === "never_matches_anything" ? policy.continuity_reserve_hours : 0;
%%%%%%%%
domain: guaranteed hours rounded down instead of up
%%%%
app/src/domain/planner/planner.ts
%%%%
    return Math.ceil(((m?.floor ?? 0) + (m?.continuity ?? 0)) / increment - 1e-9);
%%%%
    return Math.floor(((m?.floor ?? 0) + (m?.continuity ?? 0)) / increment - 1e-9);
%%%%%%%%
domain: the "not a need estimate" disclosure dropped
%%%%
app/src/domain/planner/planner.ts
%%%%
      "Complaint volume was not used. These hours describe available capacity. They do not estimate need.",
%%%%
      "Hours allocated.",
%%%%%%%%
domain: infeasible plan reported as planned
%%%%
app/src/domain/planner/planner.ts
%%%%
      status: "infeasible",
%%%%
      status: "planned",
RECORDS
)

COUNT=$(printf '%s' "$MUTATIONS" | grep -c '^%%%%%%%%$')
COUNT=$((COUNT + 1))

pass=0
survived=()

for index in $(seq 0 $((COUNT - 1))); do
  record=$(printf '%s' "$MUTATIONS" | MUT_INDEX="$index" python3 -c '
import os, sys
records = sys.stdin.read().split("\n%%%%%%%%\n")
sys.stdout.write(records[int(os.environ["MUT_INDEX"])])
')
  name=$(printf '%s' "$record" | python3 -c 'import sys; print(sys.stdin.read().split("\n%%%%\n")[0])')

  if ! printf '%s' "$record" | python3 -c '
import sys
name, path, needle, repl = sys.stdin.read().split("\n%%%%\n")
text = open(path, encoding="utf-8").read()
if needle == repl:
    sys.stderr.write("mutation is a no-op: replacement equals search string\n"); sys.exit(1)
if text.count(needle) != 1:
    sys.stderr.write(f"anchor appears {text.count(needle)} times in {path}, need exactly 1\n"); sys.exit(1)
open(path, "w", encoding="utf-8").write(text.replace(needle, repl))
'; then
    echo "SETUP FAILED  $name"
    survived+=("$name (could not apply)")
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
echo "$pass of $COUNT mutations caught."

if ((${#survived[@]} > 0)); then
  echo ""
  echo "MUTATION CHECK FAILED. These broken planners still pass the suite:" >&2
  for name in "${survived[@]}"; do echo "  - $name" >&2; done
  echo "" >&2
  echo "Add a test that fails for each, then re-run." >&2
  exit 1
fi

echo "MUTATION CHECK PASSED"
