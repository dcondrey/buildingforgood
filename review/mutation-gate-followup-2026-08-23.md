# Follow-up: mutation gate after the rewrite

**RESOLVED 2026-08-23.** R-03 is closed with no equivalent mutants left,
and the gate now refuses to run at all unless the suite is green first —
it previously graded "caught" from the suite failing, so a red baseline
caught everything and the gate proved nothing. The verdict below predates
both fixes.

**Trigger:** the build session rewrote `scripts/mutation_check.sh` after
`review/phase0-2026-08-23.md` R-02 landed.
**Re-run:** their working-tree version, against their working-tree planners,
in the isolated review worktree.

**Verdict: R-02 fixed and fixed properly. R-03 still open. The gate still exits 1.**

```
8 of 10 mutations caught.

MUTATION CHECK FAILED. These broken planners still pass the suite:
  - shipped: budget-conservation check disabled
  - shipped: a coordinator lock loses to the computed value
```

Full output: `review/artifacts/mutation-v2.txt`.

## R-02 — closed

`domain: complaint-signal guard neutered` now reports **caught**, up from
`SURVIVED`. The fix is better than the one I suggested:

- Mutations moved from a bash array read by `IFS=$'\t' read` into a heredoc of
  `%%%%`-delimited records parsed by Python, so an embedded newline can no
  longer truncate a replacement.
- A `needle == repl` guard was added (`if needle == repl: … sys.exit(1)`),
  which is the self-test I proposed, wired directly into the apply step rather
  than bolted on as a separate pass.
- The anchor for the guard mutation changed from the function signature to the
  loop body (`for (const [key, value] of Object.entries(record)) {` +
  `if (key !== undefined) continue;`), so the replacement is a genuine
  behavioural neutering rather than an early return that a reader has to
  reason about.
- The root cause is written into a comment at the top of the mutation block, so
  the next person does not reintroduce it.

Nothing to add. This is closed.

**One factual correction to the new comment** (`scripts/mutation_check.sh:32-37`):

> "…so the mutation applied cleanly and changed nothing. **It reported "caught"
> while testing an unmutated file.**"

It reported **SURVIVED**, not "caught". An unmutated file passes the suite, and
the script prints `SURVIVED` when the suite passes. The practical consequence
was the opposite of what the comment says: the gate failed loudly on a
mutation it had never applied, rather than passing quietly on a broken one.
Worth correcting, because the comment currently describes a false-negative
failure mode and the real one was a false positive — which is the less
dangerous of the two, and the project should get credit for that.

## R-03 — still open, and it cannot be closed the way the script asks

The two surviving mutations are unchanged at `scripts/mutation_check.sh:63-78`.
Both are **equivalent mutants**: they produce output indistinguishable from the
original for every input reachable through the public API. The script's closing
instruction — "Add a test that fails for each, then re-run." — cannot be
satisfied, because no such test exists to be written.

Evidence, restated so this file stands alone:

**`shipped: a coordinator lock loses to the computed value`**
`locks.get(id) ?? unlockedHours.get(id) ?? 0` → `unlockedHours.get(id) ?? locks.get(id) ?? 0`.
`unlockedHours` is keyed from `unlocked = areas.filter(a => !locks.has(a.id))`,
so a locked id is never one of its keys, so `unlockedHours.get(lockedId)` is
always `undefined` and `??` falls through to the lock. No-op by construction.
Brute force: 2,988 feasible inputs (1–4 areas, every lock subset, lock values
{0,5,8,20,40}, budgets {0,8,40,80,120,400}, floors {0,4,8,20}, with and without
a phantom lock on a non-existent area) — **0 differences**.

**`shipped: budget-conservation check disabled`**
`if (allocatedTotal !== normalizedBudget)` → `if (false && …)`. A post-condition
assertion, unreachable on correct code, therefore undetectable when removed.
Brute force: 4,119 feasible plans across budgets 0–300, floors {0,1,4,8,20},
three load vectors including all-zero and near-zero — **0 violations**.

Harness: `review/attacks/equivalence.attack.test.ts`.

### Why this matters more now than it did an hour ago

`.github/workflows/mutation.yml:39` runs this script as a required step, and
`CHANGELOG.md:26` tells adopters to run it. With R-02 fixed, the gate is now
**correct and still red** — which is the worst state for a required check to be
in, because the two remaining failures are permanent. A gate that can never go
green is a gate people learn to ignore, and this one is guarding the refusal
suite.

### Suggested resolutions (pick one; none applied by me)

1. **Delete both entries.** The properties they were meant to protect are
   already covered: budget conservation by
   `lib/planner.characterization.test.ts:360` ("allocates exactly the budget at
   every feasible budget from 48 to 120"), and lock precedence by the lock
   characterization tests at `:242-329`.
2. **Replace them with observable mutations of the same properties.** For the
   lock one, mutate the filter itself — `!locks.has(area.id)` → `locks.has(area.id)`
   — which changes which areas receive discretionary hours and is very much
   observable. For conservation, mutate what the check protects rather than the
   check: `remaining` → `remaining - 1`.
3. **Add an `expected: equivalent` field to the record format** and assert that
   those mutations *do* survive, turning them into documentation of two
   deliberately-unreachable defences. More honest than deleting, more work than
   replacing.

I would take (2). It keeps ten mutations, keeps both properties under test, and
gets the gate to green legitimately rather than by lowering the bar.

## Re-verified as still true after the rewrite

- The eight caught mutations are genuinely caught, including all five
  `domain/` ones and the three `shipped/` ones.
- The dirty-tree refusal (`:23-27`) and the `trap restore EXIT INT TERM`
  (`:29-30`) still hold, so the script cannot eat uncommitted work.
- `SETUP FAILED` now lands in `survived[]` rather than being silently skipped,
  so a stale anchor fails the gate instead of shrinking it. That is a real
  improvement over the previous version and was not something I flagged.
