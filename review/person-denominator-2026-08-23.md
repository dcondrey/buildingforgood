# Does `ExcludesPersonDenominator<T>` have the same value-shaped hole?

**You asked directly. The answer is yes, and there are three more besides.**
All five results below were executed against the real modules, not reasoned
about. Harnesses: `review/attacks/person-denominator.attack.test.ts`,
`review/attacks/map-hole.attack.test.ts`.

**But first: your `planning_load` derivation fix works.** Attack C now fails at
the artifact boundary, exactly as you predicted. Details in the last section,
including the one move that still gets through.

---

## E-0 — the baseline works, as the complaint guard did

```
E-0:        REFUSED: areaCost: "cost_per_person" prices a person…
E-0 nested: REFUSED: areaCost: "a[0].b.costPerContact" prices a person…
```

Recurses into nested objects and arrays. Against the careless version, and
against a maintainer widening an interface, it does its job. Everything below
is about the version that is not careless.

## E-1 — the same value-shaped hole, and `actuals/v1` supplies the denominator

**Severity: high.** This is the answer to your question.

```
E-1: East Village cost 1800 / 137 contacts = $13.14 per contact
E-1 guard on the plan object:      ACCEPTED — guard did not fire
E-1 guard on the derived figure:   ACCEPTED — guard did not fire
```

`PlanCost.byArea[].cost` and `AreaMonthEngagement.count` are both
correctly-named, schema-legal, type-guarded fields. Dividing one by the other
produces **cost per contact** — which your own copy refuses by name at
`CostPieces.tsx:64` ("never per person, per contact, or per anyone covered")
and which `actuals.v1.schema.json` lists in `will_never_compute`.

No key is ever named per-anything. `ExcludesPersonDenominator<AreaCost>` sees
`{areaId, label, hours, cost}` and is satisfied. `assertNoPersonDenominator`
walks keys and is satisfied. The forbidden figure exists anyway.

**This is structurally identical to the complaint escalation**, and Phase 4
made it materially worse rather than better: before `actuals/v1` there was no
person-shaped denominator in the system at all. Now there is one, at the same
area-month grain as the cost figures, in the same product.

To be fair to the design: `EngagementMeasure` declares
`counts_encounters_not_people: true` and `unique_persons_measure: false`, so
the count is honestly labelled as encounters rather than people. That makes
"cost per contact" the accurate name for the quotient — and "per contact" is
on your refusal list precisely because it is the one a reader will round to
"cost per person."

**The fix has the same shape as the one you just built for `planning_load`:**
a cost figure should carry a declared denominator, the contract should
enumerate the permitted ones (`staff_hour`, `area`, `plan`), and anything else
should be refused. A name-based check cannot see a division that never gets a
name.

## E-2 — the guard reads keys, never values

**Severity: medium.**

```ts
{ label: "Assumed cost per person served", unit: "USD per person", value: 3.28 }
```
```
E-2: ACCEPTED — guard did not fire
```

The forbidden phrase sits in the *value*. `assertNoPersonDenominator` tests
`PERSON_DENOMINATOR_PATTERN` against `key` only (`cost.ts:50`). A row like this
renders straight to the screen and into the clipboard brief.

`refusals.test.ts`'s copy scan would catch this phrase in **source**, but not
in data — and `actuals/v1` has operator-supplied free text
(`method_note`, `hours_note`, `note`, `engagement_measure.label`,
`engagement_measure.definition`) that an adopting organization writes and this
project never sees. That is the realistic path: an operator labels their own
engagement measure "clients served," and the label flows through.

## E-3 — this project's own vocabulary defeats its own regex

**Severity: high, and the most embarrassing of the five.**

```
E-3 cost_per_sleeper             ACCEPTED — guard did not fire
E-3 costPerSleeper               ACCEPTED — guard did not fire
E-3 cost_per_unsheltered         ACCEPTED — guard did not fire
E-3 cost_per_household           ACCEPTED — guard did not fire
E-3 cost_per_bed                 ACCEPTED — guard did not fire
E-3 cost_per_case                ACCEPTED — guard did not fire
E-3 cost_per_enrollee            ACCEPTED — guard did not fire
E-3 cost_per_beneficiary         ACCEPTED — guard did not fire
E-3 dollars_per_body             ACCEPTED — guard did not fire
E-3 cost_per_person_equivalent   REFUSED  ← the one your unit is actually called
```

`PERSON_DENOMINATOR_PATTERN` covers
`person|people|contact|client|individual|capita|head|covered|served|encounter|resident|participant`.

It does **not** cover `sleeper` — and `SleeperType` is a real exported type in
`pipeline/src/stillhere_pipeline/normalize.py`, resolving to
`('individual', 'structure', 'vehicle')`, used to build `OBSERVATION_TYPE_FIELDS`
in `contracts.py:41`. "Sleeper" is this project's own word for the thing being
counted, and `cost_per_sleeper` is the single most natural name a contractor
here would reach for. It sails through.

Nor does it cover `household`, which is the standard HUD/CoC unit and appears
in your own `will_never_compute` baseline entry
(`per_person_or_household_outcome_tracking`). So the schema forbids the
analysis by name while the guard permits the field by name.

Credit where due: `cost_per_person_equivalent` **is** refused, and
`estimated_person_equivalents` is the actual unit of the DSDP data, so the most
likely accidental version is caught.

**This is the general problem with denylists and the reason E-1 matters more
than E-3.** You cannot enumerate every word for a human being. An allowlist of
permitted denominators has a bounded, checkable definition; a denylist of
forbidden ones does not.

## E-4 — neither guard walks a `Map` or `Set`

**Severity: medium. Applies to `assertNoComplaintSignal` too.**

```
F plain object             complaint=REFUSED    person=REFUSED
F array                    complaint=REFUSED    person=REFUSED
F Map                      complaint=ACCEPTED   person=ACCEPTED
F Set                      complaint=ACCEPTED   person=ACCEPTED
F object with Map inside   complaint=ACCEPTED   person=ACCEPTED
```

Both guards use `Object.entries(node)`, which returns `[]` for a `Map` or
`Set`. A `Map` nested anywhere inside an otherwise-walked object hides its
entire contents from both guards.

**You already worked around this once without fixing it.**
`app/src/lib/planner.ts` calls
`assertNoComplaintSignal(Object.fromEntries(locks), "planner locks")` — the
`Object.fromEntries` is there because `locks` is a `ReadonlyMap` and passing it
directly would be a no-op. That workaround protects one call site. The next
person to pass a `Map` will not know to add it.

`PlanCostInput` takes `hoursByArea` and `unmetHoursByArea` as
`ReadonlyMap<string, number>`, so `Map` is already an established shape in this
layer.

One thing that does work: a `null`-prototype object is caught, since
`Object.entries` handles it.

**Fix:** make both walks handle `Map` (keys *and* values) and `Set`, or refuse
non-plain containers outright at the boundary rather than silently ignoring
them. Silently ignoring is the failure mode that produced this whole class.

---

## Your `planning_load` derivation fix: verified working

I re-ran the original Attack C against your uncommitted working tree.

**Attack C — BLOCKED:**

```
>>> RESULT: BLOCKED by ContractViolation: planner allocation for 'City Center'
declares planning_load 980.0 derived from forecast.areas[].upper, but that
value is 193.0. A planning load must reconcile with what it is derived from;
a number that does not is refused whatever it is called and whatever it
declares.
```

That is the right fix and the error message is the right error message. It
checks the *value against its declared source* instead of checking the field's
name, which is precisely what the escalation said was missing. Good.

### The move that still gets through

**Attack C2 — ACCEPTED.** Move the payload one step upstream: write complaint
volume into `forecast.areas[].upper` (and `point`/`lower` proportionally) as
well as into `planning_load`. The two now reconcile, so the derivation check is
satisfied, and the plan re-ranks exactly as before.

Harness: `review/attacks/attack_c2.py`.

**I do not think this is a hole you should try to close the same way**, and I
want to be clear about that rather than just logging a failure. The derivation
check moved the boundary from "the planner" to "the forecast," which is real
progress — the forecast is produced by the pipeline from pinned, checksummed
inputs, and it is a much harder place to smuggle a number into than a
hand-editable allocation row. Chasing it further means verifying the forecast
against the observations, and the observations against the raw bundle, which is
the reproducibility problem (F-2), not the refusal problem.

What I would do instead: say plainly in the docs *where* the boundary now sits.
"Complaint volume cannot reach allocation without also corrupting the published
forecast interval, which is derived from checksummed inputs" is a strong,
true, defensible claim. "Complaint volume cannot influence planning" is still
not.

### One note on the new contract

`contracts.py:364` — `derivation = row.get("planning_load_derivation", _FORECAST_DERIVATION)`.
The default is applied when the key is absent, so an older artifact is treated
as declaring the forecast derivation rather than being refused. That is
reasonable for compatibility, but it means the check is opt-out by omission
for any writer that does not know about it. Worth deciding deliberately
whether a missing declaration should eventually become a hard failure.

---

## The `insufficient_forecast_evidence` area you flagged

You asked me to look. I agree with the instruction you gave the implementer,
and I would go further: **do not widen the allowlist, and do enforce the
narrow rule.**

An area with no point, no upper, and no lower has no forecast-derived
quantity. If it receives discretionary hours, those hours are proportional to a
number whose provenance cannot be stated — which is the exact condition the new
contract exists to refuse. The honest behaviour is the one you described: such
an area receives the coverage floor and carries no discretionary load.

That is also the *better product behaviour*, not merely the safer one. It
means "we cannot forecast this area" produces a visible, explainable outcome —
floor only, and the reason says why — instead of a silently invented share.
And it is consistent with how the drop test already handles unresolved
geography by forcing `insufficient_evidence` rather than guessing.

The one thing to check when it lands: that the hours the excluded area does
**not** receive show up in `unmet_hours` or an equivalent, so the cost of the
exclusion stays visible rather than quietly redistributing.

---

## Summary

| Vector | Result |
| --- | --- |
| E-0 honestly-named per-person field | **refused** — guard works as designed |
| E-1 `cost / engagement.count` | **accepted** — same value-shaped hole, `actuals/v1` supplies the denominator |
| E-2 forbidden phrase in a value | **accepted** — keys only are checked |
| E-3 `cost_per_sleeper`, `_household`, `_bed`, `_case` … | **accepted** — the project's own vocabulary is not in its own regex |
| E-4 `Map` / `Set` containers | **accepted by both guards** — including `assertNoComplaintSignal` |
| Attack C (`planning_load`) | **blocked** — your derivation fix works |
| Attack C2 (payload moved to `forecast.upper`) | **accepted** — boundary moved, not closed |

**The one-line answer to your question: yes, it has the same hole, and the
reason is the same — `ExcludesPersonDenominator<T>` and
`PERSON_DENOMINATOR_PATTERN` both ask what a field is called, and "cost per
person" is a division, not a name.** The `planning_load` work shows you already
know the shape of the fix; the cost layer needs the same treatment, with an
allowlist of permitted denominators rather than a denylist of forbidden words.
