# Review: the cost layer, once it surfaced

**Supersedes the cost section of `review/config-abstraction-2026-08-23.md`.**
That review said the hourly rate "surfaces nowhere yet" and the invariant held
vacuously. It has since surfaced: `app/src/features/cost/CostPieces.tsx` and
`app/src/domain/cost/` landed, and the clipboard decision brief now carries a
cost paragraph (`features/shell/useShellState.ts:340`).

**Verdict: PASS on framing. FAIL on enforcement.** The framing is genuinely
careful — better than I expected. But there is not a single test anywhere in
the repository that touches the cost layer, so the strongest refusal in it is
prose.

---

## The framing: verified, and good

Checking the brief's two questions against the shipped component:

**"Is the hourly rate presented as an operator assumption everywhere it
surfaces, never as a fact?"** — **Yes, at all three surfaces**, and the
labelling is repeated rather than stated once:

| Surface | Framing |
| --- | --- |
| The control (`CostPieces.tsx:20`) | "You set this · an assumption, not a measured rate" |
| The control's help text (`:41-45`) | "This project does not measure, publish, or derive this rate; the starting value is a placeholder your finance lead must replace before any figure below is shown to a decision-maker." |
| The plan summary (`:62-65`) | "The rate is an operator-set assumption, not a measured or published figure, and it enters no allocation: the same plan is produced at every rate." |
| The clipboard brief (`useShellState.ts:340`) | "Cost view — operator-set assumption, not a measured or published figure…" |
| The by-area table caption (`:70-72`) | "Hours × the assumed rate, nothing else." |

The clipboard case is the one that matters most, because that text leaves the
building. It carries the full framing, not an abbreviation.

Two further things done right that I did not ask for:

- **`excludes` is stated, not just `includes`.** "It leaves out client
  assistance funds, capital, and organization-wide indirect administration."
  A loaded rate that does not say what it excludes is how cost comparisons go
  wrong between organizations.
- **The guard-off case is handled honestly** (`:59`): with the floor switched
  off, the summary says the minimum "moves nothing and costs nothing" rather
  than printing a zero that reads like a finding.

**"Was a per-person cost metric introduced, directly or indirectly?"** —
**No.** Verified three ways:

1. No `cost_per_person` / `per_person` / `perPerson` identifier exists in
   `app/src`, `pipeline/src`, or the schema.
2. The by-area table (`:73-92`) has exactly three columns — Neighborhood,
   Planned hours, Assumed cost. **No observation count sits beside a cost
   figure**, which was the specific adjacency I flagged as an implied
   per-person metric in the earlier review. That risk did not materialize.
3. The refusal is stated explicitly at three points, including in the
   exported brief: "Costs are stated per staff-hour, per area, and per plan
   only — never per person, per contact, or per anyone covered."

The module docstring (`CostPieces.tsx:8-10`) says it plainly: "There is no cost
per person, per contact, or per anyone covered, and no control that could
produce one." Reading the code, that is accurate.

---

## D-1 — the cost layer has zero test coverage

**Severity: high.**

```
$ find app/src -name "*.test.ts*" | xargs grep -ln "planCost|formatCurrency|loadedHourlyRate|domain/cost"
(no matches)

$ ls app/src/domain/cost/
cost.ts  index.ts  types.ts        # no cost.test.ts
```

And in `app/src/refusals.test.ts`, the file whose entire purpose is to assert
the things this product must never do:

| Search term | Occurrences |
| --- | ---: |
| `cost` | **0** |
| `per person` | **0** |
| `per-person` | **0** |
| `loaded_hourly` | **0** |
| `domain/cost` | **0** |

So `computePlanCost`, the rate validation at `cost.ts:62`
(`rate >= 0 && rate <= MAX_LOADED_HOURLY_RATE`), the currency formatting, the
floor-cost line, and the by-area breakdown are all untested, and the
per-person refusal is defended by a comment.

**This is the same pattern as finding F-1 and my escalation**, in a new module:
a refusal that reads as a guarantee but is upheld by authorial discipline. The
project has spent Phase 1 converting exactly this pattern into enforcement, and
then shipped a new instance of it.

**What the refusal suite would need**, offered as scope rather than a patch:

- The existing copy scan *does* cover `CostPieces.tsx` strings, since it walks
  every non-test `.ts`/`.tsx` under `app/src`. So a forbidden *claim* in the
  cost copy would be caught. Good — but that is not the same as asserting the
  cost model cannot produce a per-person figure.
- Add to `refusals.test.ts`: no cost function accepts a population or count
  argument; `computePlanCost`'s output shape contains only `rate`, `currency`,
  `byArea` (hours, cost), `totalHours`, `totalCost`, `floor` — and a test that
  fails if a new field appears, so a future `costPerPerson` cannot be added
  silently. The `ExcludesComplaintSignal<T>` pattern already in the codebase is
  the model: a compile-time proof over the output type.
- Add `app/src/domain/cost/cost.test.ts`: rate bounds, the `rate * hours`
  identity per area, `sum(byArea.cost) === totalCost`, and — the one that
  actually matters — **that the plan is byte-identical at every rate**, which
  is the claim the UI makes in prose at `CostPieces.tsx:63-64`.

That last one is the cost layer's equivalent of the budget-conservation
invariant, and it is currently asserted to the user but never checked.

## D-2 — the default rate does not look like a placeholder

**Severity: medium.**

`app/src/domain/cost/cost.ts:17` — `DEFAULT_LOADED_HOURLY_RATE = 45`.

The help text correctly calls it "a placeholder your finance lead must replace
before any figure below is shown to a decision-maker." But the rendered output
is `$45.00` and a total plan cost in dollars, and neither *looks* provisional.
A board member seeing "$45.00 per staff-hour · the whole plan costs $3,600"
in a screenshot or a pasted brief has no visual signal that 45 is arbitrary,
and the clipboard brief carries the number into an email where the surrounding
UI copy does not follow.

The clipboard text *does* carry the "operator-set assumption" framing, so this
is not a failure — it is a gap between how carefully the prose is written and
how confidently the number reads.

**Options:** render the figure in a distinct "unset" state until the operator
moves the slider once; or make the default visibly artificial; or suppress the
cost surface entirely until a rate is set, which is what the help text's
"before any figure below is shown to a decision-maker" arguably already
promises. The third is the most consistent with the promise being made.

## D-3 — locale is hardcoded (i18n)

`app/src/domain/cost/cost.ts:126` — `new Intl.NumberFormat("en-US", …)`, plus
`formatRate` at `:133`. Two more sites for the sweep in
`review/i18n-readiness.md` W-4. Currency formatting is more locale-sensitive
than plain numbers (symbol position, decimal separator, and non-breaking-space
conventions all move), so this one is worth doing in the same change as the
`toFixed` sweep.

---

## Summary

| Check | Verdict |
| --- | --- |
| Rate framed as an operator assumption at every surface | **pass**, including the exported brief |
| `includes` and `excludes` both stated | **pass** |
| No per-person cost metric | **pass** |
| No implied per-person metric via adjacency | **pass** — no count column beside a cost column |
| Plan is independent of rate | **claimed in the UI, never tested** (D-1) |
| Cost layer has any test coverage at all | **fail** (D-1) |
| Default rate reads as provisional | **no** (D-2) |
| Locale handling | **hardcoded** (D-3) |
