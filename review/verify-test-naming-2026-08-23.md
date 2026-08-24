# Audit: do test names make true coverage claims?

**Scope note first, because it changes how to read this.** The dedicated
test-naming pass had not landed at `56d9e94`, and there is no commit or
document listing which tests were flagged. So **this is not a measurement of
that pass's miss rate.** It is an independent baseline taken before the pass,
against which the pass can be measured afterwards. If the pass has since
landed, re-run the method below and compare.

---

## Method

1. Extracted all 433 test names across `app/src` and `tests/` (TS, TSX, Python).
2. Filtered to names making an **absolute or universal claim** — containing
   `never`, `every`, `all`, `always`, `cannot`, `any`, `no`, `none`, `only`,
   `exactly`, `whatever`, `each`. **103 of 433 (24%)** qualify.
3. Sampled 23 of those 103, chosen to span nine files and both languages.
4. For each: read the body, deleted it mentally, and asked whether the name
   remains a true statement about what is covered.

A crude first pass ("does it loop or make ≥4 assertions?") flagged 8 of 23.
**I read all 8 and withdrew one**, so the heuristic over-flagged by 12%. That
matters: a mechanical rename pass driven by a regex would produce the same
false positive.

---

## Result: **7 of 23 sampled names overclaim (30%)**

### Genuine overclaims

| Test | Name claims | Body covers |
| --- | --- | --- |
| `intervention.test.ts` **"never mutates its inputs"** | all inputs | one call, one area, one share value |
| `PlannerPanel.test.tsx` **"always shows unmet planning load next to the total"** | all states | one render of the default panel |
| `profile.test.ts` **"rejects any field the schema does not define"** | any field, any depth | one top-level field (`person_records`) |
| `actuals.test.ts` **"rejects any field the schema does not define"** | same | one top-level field (`encounters`) |
| `planner.test.ts` **"adds a continuity reserve only for possible_displacement"** | all four drop-test classifications | two areas, two classifications |
| `planner.test.ts` **"never uses causal, enforcement, or individual-movement language"** | all reason strings | one `buildPlan` call, one policy |
| `planner.test.ts` **"gives a zero-forecast area the floor and no more, however large the budget"** | any budget | one budget (100,000) |

### The one I withdrew

`currency.test.tsx` **"shows every row as excluded, and drops any row claiming
model eligibility"** — flagged by the heuristic for having no loop. Reading it,
it asserts `getAllByText("Excluded")).toHaveLength(rows.length)`, which *is* a
universal check over the rendered rows, and it smuggles a `model_eligible: true`
row and asserts the row is dropped and its area name absent. **The name is
earned.** Good test.

### The one that is arguable

`cost.test.ts` **"makes a person denominator unrepresentable in every cost
type"** — three `expect(CONST).toBe(true)` on `ExcludesPersonDenominator<T>`
constants. The compile-time guard genuinely is universal over each named
type's fields, so the "unrepresentable" half is earned. "Every cost type" is
not: it is three named types, and a fourth added later would not be covered.
Enumerating exported interfaces structurally would earn it. I counted this as
half, and it is not in the 7.

---

## The two that matter most

Ranked by consequence rather than by how wrong the name is.

**1. `never uses causal, enforcement, or individual-movement language`.** This
is a *refusal* claim, and refusal claims are the ones quoted in the brief. One
`buildPlan(SIX_AREAS, POLICY)` call exercises the continuity-reserve,
discretionary-remainder, and unmet-hours branches — but not the infeasible
path, not the zero-forecast path, and not any non-default policy. The regex is
good; the corpus is one plan.

**In fairness, the property itself is well covered elsewhere.**
`refusals.test.ts` has "emits no user-facing string carrying a forbidden claim,"
which walks every non-test source file and scans every extractable string
against reworded forbidden-claim patterns. That test earns its name. So this
is a naming defect, not a coverage hole — but it is the naming defect most
likely to be cited as evidence.

**2. `rejects any field the schema does not define`, in both `profile.test.ts`
and `actuals.test.ts`.** Both probe exactly one top-level key. The mechanism
being claimed is `additionalProperties: false` **at every level**, and neither
test checks a nested object, an array element, or `__proto__`. Two identical
names, two identical single probes, in the two loaders an adopting organization
feeds untrusted JSON to. Five cases each would earn the name and take ten
minutes.

---

## What this says about the pass, when it lands

**Do not grade it on whether the flagged names were fixed.** Grade it on the
rate at which it found instances. If a pass reports fixing, say, four names and
this sample says 30% of 103 universal-claim names overclaim — roughly 31
instances — then the pass found an eighth of what is there and the rest of the
suite still promises more than it delivers.

The mechanically checkable rule, offered because it is what I would have wanted
before sampling by hand: **a name containing `every`, `all`, `any`, `never`,
`always`, or `only` must be backed by iteration, a structural enumeration, or a
corpus scan — not by a single example.** That rule is a lint, not a judgement
call, and it catches all 7 above while correctly passing the `currency.test.tsx`
one (`toHaveLength(rows.length)` is a structural enumeration).

## Limits of this audit

- **Verified:** the 23 bodies I read, and the 103/433 count.
- **Inferred:** the ~31-instance extrapolation. It assumes the sample is
  representative of the 103; I chose the sample to span files, not randomly,
  and I deliberately picked names that looked strong, so **the true rate is
  probably lower than 30%.** Treat 30% as an upper bound on the sampled stratum,
  not a population estimate.
- **Could not determine:** whether the Python suite has the same rate. My
  sample was TS/TSX only. `tests/privacy/test_privacy.py` has several
  universal names (`test a root declaration covers every feature`,
  `test source grain cannot self approve with an arbitrary version`) that look
  well-earned on their face but I did not read the bodies.
