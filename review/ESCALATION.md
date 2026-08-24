# ESCALATION — refusal guard is bypassable

**RESOLVED 2026-08-23.** The broad claim this document falsified was
withdrawn rather than defended, and the narrow claim that replaced it is
pinned in `docs/project/DECISIONS.md` and enforced by the refusal suite.
Kept as the record of the falsification that forced the narrowing.

**Raised:** 2026-08-23
**Raised by:** independent verification track (review/parallel)
**Condition met:** "Any refusal guard bypassable"
**Reviewed against:** `f8dd100` (Phase 0), then re-verified against the build
session's uncommitted working tree at 13:40 on 2026-08-23, after it wired
`assertNoComplaintSignal` into `allocateHours`.
**Status:** OPEN — **still reproduces after the Phase 1 guard wiring.** See
"Post-fix re-verification" at the bottom before responding.

---

## The claim under test

`app/src/domain/planner/types.ts:4-12` states the guarantee:

> One design decision dominates this file: **311 complaint volume is not
> representable here.** ... and `assertNoComplaintSignal` guards the boundary
> where untyped artifact JSON becomes typed planner input.

`config/decision.v1.json` carries `observations.complaint_volume_excluded_uses`.
`public/generated/demo.v1.json` asserts `planner.constraints.complaint_data_used: false`,
and `pipeline/src/stillhere_pipeline/contracts.py:299-303` refuses to validate an
artifact where that flag is anything other than `false`.

**The guarantee is false as stated.** Complaint volume is representable, in the
one field the shipped planner actually weights on, and every layer accepts it.

---

## What I did

I took the role in the brief: a contractor told to make outreach hours follow
311 complaints. I attempted it four ways and ran each one. Harness:
`review/attacks/complaint-bypass.attack.test.ts` and
`review/attacks/attack_c.py` (reproduced below).

### Attack A — name the field honestly, call the guarded planner

```ts
assertNoComplaintSignal({ area_id: "east_village", complaint_count: 4120 }, "area east_village")
```

**REFUSED.** `PlannerInputError: area east_village carries "complaint_count";
complaint volume may never influence planning load or allocation`.
Guard at `app/src/domain/planner/planner.ts:52-72`. It recurses into nested
objects and arrays. Against the careless version of this change, it works.

### Attack B — the shipped code path

`app/src/App.tsx:6` imports `allocateHours` from `app/src/lib/planner.ts`.
That function has no guard of any kind. It weights purely on
`area.planningLoad` (`app/src/lib/planner.ts:71`).

Passing complaint counts as `planningLoad`, budget 600, floor 20:

```
east_village 261 · gaslamp 172 · city_center 77 · cortez 38 · columbia 28 · marina 24
```

**ACCEPTED.** For reference, the real artifact's `planning_load` puts Gaslamp
5th of 6 (61.7). Under complaint volume it is 2nd, at 172 hours. The plan is
materially re-ranked and nothing anywhere says so.

### Attack C — data-shaped, never touching the guarded type

Rewrite `planner.allocations[].planning_load` in `public/generated/demo.v1.json`
to complaint volume. Change nothing else. `complaint_data_used` stays `false`.

- `stillhere_pipeline.contracts.validate_demo_v1` → **ACCEPTED.**
  `contracts.py:290` requires only `_require_nonnegative_number(row, "planning_load")`.
  Complaint counts are nonnegative numbers.
- `adaptDemoV1` (`app/src/lib/demo.ts:496`) → **ACCEPTED.** It reads
  `number(row?.planning_load, 1)` with no validation of meaning.
- `allocateHours` → **ACCEPTED.** Same re-ranked plan as Attack B.

The artifact now declares `complaint_data_used: false` while allocating on
complaint data, and passes its own contract.

### Attack D — unnamed complaint volume through the *guarded* planner

The same payload, `planning_load: 4120`, fed to `assertNoComplaintSignal`:

**ACCEPTED — the guard did not fire.**

This is the finding that matters. `COMPLAINT_FIELD_PATTERN`
(`planner.ts:36`) matches *field names*: `/complaint|311|service_request|call_volume|report_volume/i`.
It cannot see what a number means. Complaint volume placed in `planning_load`
is invisible to it by construction.

---

## Why this is not already covered by finding F-1

`docs/project/PHASE0_FINDINGS.md` F-1 honestly reports that the guarded planner
does not ship, and concludes the invariant "holds today by the same authorial
discipline the goal document says it wants to stop relying on."

That is true and well-found, but it understates the problem in one specific
way, and the understatement changes what Phase 1 has to do:

> F-1: "no complaint field reaches it, because `PlanningArea` has seven scalar
> fields and none is complaint-shaped"

The reasoning is *field-shape* reasoning, and so is the guard. **Wiring
`buildPlan` into the shipped path — F-1's stated remedy — does not close
Attacks C or D.** After that fix, a contractor still routes complaint volume
through `planning_load` and every guard still passes. The refusal survives the
rename but not the intent.

---

## Two additional layers with no guard at all

1. **`app/src/lib/contracts.ts` is unreachable from `main.tsx`.** It is
   imported only by `app/src/lib/contracts.test.ts`. Its `ContractViolation`
   throws, `assertNoPreciseFields`, and small-cell checks never execute in the
   product. 28 of 181 TS tests grade it. F-1 does not mention this file.
2. **`complaint_data_used: false` is a self-declaration, not a check.** The
   builder writes it; the validator confirms the builder wrote it. Nothing
   verifies the claim. Same for `precise_location_data_used` and
   `reporting_bias_diagnostic_used` (`contracts.py:299-303`).

---

## What would actually close this

Not my call to implement, and I have not. Sketching the shape so the
disagreement, if there is one, is concrete:

- A name-based denylist cannot carry this guarantee. It needs a *provenance*
  claim on the value: `planning_load` arrives with a declared derivation, the
  contract enumerates which derivations are permitted, and anything else is
  refused. That makes Attack C fail at the artifact boundary where it belongs.
- The guard has to run on the shipped path, not beside it.
- `complaint_data_used` should be computed from the lineage the builder
  actually consumed, not asserted.

Until something along those lines exists, the honest public claim is "the
planner does not read a complaint field," not "complaint volume cannot
influence planning."

---

## Reproduction

```
git worktree add -b review/parallel <path> f8dd100
cp -a app/node_modules <path>/app/node_modules
cd <path>
python3 review/attacks/attack_c.py
npx --prefix app vitest run --root . --config app/vite.config.ts \
  --disable-console-intercept review/attacks/complaint-bypass.attack.test.ts
```

The attack harness lives in `review/attacks/` and is deliberately outside the
product suite. I have not modified any source file. No patch is proposed here;
the design decision is the build session's to make.

---

## Post-fix re-verification — 2026-08-23 13:40

While this escalation was being written, the build session wired the guard into
the shipped path, exactly as F-1 proposed:

```ts
// app/src/lib/planner.ts (working tree, uncommitted)
import { assertNoComplaintSignal } from "../domain/planner/planner.ts";

export function allocateHours(...) {
  assertNoComplaintSignal(areas, "planner areas");
  assertNoComplaintSignal(Object.fromEntries(locks), "planner locks");
```

plus a compile-time check in `app/src/lib/demo.ts`:

```ts
export const PLANNING_AREA_EXCLUDES_COMPLAINT_SIGNAL: ExcludesComplaintSignal<PlanningArea> = true;
```

I copied those files into the review worktree and re-ran the attacks.
Harness: `review/attacks/post-fix.attack.test.ts`.

**Attack A is now closed on the shipped path.** Genuinely good, and worth
saying plainly:

```
POSTFIX A: REFUSED: planner input invalid: planner areas[0] carries "complaint_count";
complaint volume may never influence planning load or allocation
(config/decision.v1.json → observations.complaint_volume_excluded_uses)
```

**Attacks C and D are unchanged.**

```
POSTFIX C/D: ACCEPTED — guard did not fire
POSTFIX C/D hours: {"east_village":261,"city_center":77,"gaslamp":172,
                    "cortez":38,"columbia":28,"marina":24}
```

Byte-identical to the pre-fix allocation. Complaint volume carried in
`planningLoad` still reaches the shipped allocator and still re-ranks the plan.

`ExcludesComplaintSignal<T>` is a `ComplaintShapedKeysOf<T>` check
(`app/src/domain/planner/types.ts:137`) — it proves no complaint-*named* key
exists on the type. `planningLoad` is not complaint-named. The type-level guard
and the runtime guard are the same name-based check at two different times, so
they fail together against the same input.

Both layers are worth keeping. Neither is the guarantee the docs claim.

The remaining gap is a value-provenance gap, not a naming gap, and it lives at
the artifact boundary (`contracts.py:290`, `demo.ts:496`) rather than in the
planner. Suggested direction is in "What would actually close this" above.
