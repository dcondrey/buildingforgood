# ESCALATION 2 — `main` does not compile and the app crashes on render

**RESOLVED 2026-08-23.** `main` compiles and the suite is green: 510 app
tests, 100 refusal tests, 249 Python passed / 15 skipped, production build
clean. The fix this document called uncommitted was committed. Kept as the
record of the finding; its "Status: OPEN" below is historical and is no
longer true of any commit on `main`.

**Raised:** 2026-08-23, immediately on finding it
**Condition met:** not one of the four listed halt conditions — raising it here
because it is more urgent than any of them
**Status:** OPEN. **Your working tree already fixes this. The fix is
uncommitted.**

---

## The finding

At a **pristine detached checkout of `6beb8de`** (current `main`), with a
clean copy of `node_modules` and nothing of mine in the tree:

```
Test Files  1 failed | 14 passed (15)
     Tests  31 failed | 215 passed (246)
```

```
TypeError: Cannot read properties of undefined (reading 'currency')
 ❯ CostAssumptionControl src/features/cost/CostPieces.tsx:36:50
     36|  {formatRate(loadedHourlyRate, planCost.currency)}
```

The whole decision shell fails to render. And `tsc -b` from `app/`:

```
src/domain/actuals/types.ts(18,15):   TS2305: Module '"../planner/types.ts"' has no exported member 'ExcludesComplaintSignal'.
src/domain/config/types.ts(17,15):    TS2305: Module '"../planner/types.ts"' has no exported member 'ExcludesComplaintSignal'.
src/features/cost/CostPieces.tsx(17,11): TS2339: Property 'loadedHourlyRate' does not exist on type '{ ... 92 more ... }'.
src/features/cost/CostPieces.tsx(17,29): TS2339: Property 'planCost' does not exist ...
src/features/cost/CostPieces.tsx(17,39): TS2339: Property 'setLoadedHourlyRate' does not exist ...
src/features/cost/CostPieces.tsx(51,11): TS2339: Property 'floorCostLine' does not exist ...
src/features/cost/CostPieces.tsx(51,46): TS2339: Property 'planCost' does not exist ...
src/features/cost/CostPieces.tsx(80,39): TS7006: Parameter 'row' implicitly has an 'any' type.
```

`grep -c planCost app/src/features/shell/useShellState.ts` → **0** at
`6beb8de`. `CostPieces.tsx` destructures five properties the shell store does
not have, and `PlannerPieces.tsx:112,436` renders both cost components
unconditionally, so every render path hits it.

## Scope

Introduced by **`84327bf`** (Phase 4: profiles, actuals, cost layer) and
carried through **`4096910`** (Phase 2 docs) and **`6beb8de`** (Phase 6 CLI).
Three commits on `main`, none of which compile.

`scripts/verify.sh` runs typecheck, tests, and build. It cannot have passed on
any of the three. Whatever gate was consulted before committing, it was not
that one.

## Two consequences beyond the crash

1. **`ExcludesComplaintSignal` is not exported from `planner/types.ts` at
   `6beb8de`.** So the compile-time complaint guards in
   `domain/actuals/types.ts:18` and `domain/config/types.ts:17` — the ones the
   config README describes as "a compile-time proof reusing the planner's own
   guard" — **do not compile, and therefore prove nothing** in the committed
   state. That is a refusal guarantee silently offline on `main`.
2. **Anyone cloning `main` right now gets a tool that shows a blank error.**
   Including an evaluator.

## Your working tree is fine

I checked, so this is scoped rather than alarming:

- `app/src/domain/planner/types.ts:137` exports `ExcludesComplaintSignal` ✓
- `useShellState.ts` has `planCost` (5 occurrences) ✓
- `npx tsc -b` from `app/` → **clean** ✓

So the fix exists, uncommitted, alongside the `PLANNING_LOAD_DERIVATIONS` work.
**Commit it, or commit a revert of the cost wiring, before anything else.** I
would not spend another minute on my findings below until `main` is green.

## What would have caught it

`verify.sh` run before commit. That is the whole answer, and it is the same
shape as Phase 0's finding about the mutation gate: the tool existed and was
not consulted. Worth considering a pre-commit hook or a CI branch protection
rule, given this is now twice.
