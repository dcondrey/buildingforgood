# Decisions

Choices that would otherwise look like accidents of implementation. Each is
dated, has a stated reason, and names what would change it.

## 2026-08-23 — `planning_load_derivation` defaults rather than failing

`pipeline/src/stillhere_pipeline/contracts.py` treats a missing
`planning_load_derivation` on a `planner.allocations[]` row as
`forecast_upper_bound` rather than refusing the artifact.

That makes the strongest refusal guard in the project opt-out by omission: a
writer that has never heard of the field produces an artifact that validates.

**Kept for one release, deliberately.** Every artifact written before this
change lacks the field, and a hard failure would refuse the shipped
`demo.v1.json` and every pinned monitoring artifact at once, with no migration
path for an adopter mid-refresh.

**What changes it.** Once the refresh path has written a full artifact carrying
the field at least once — that is, after one complete monthly cycle on the new
contract — omission becomes a hard failure. The default is removed, not
loosened further.

**Why this is written down.** An adversarial review found the default and asked
whether it was intended. It was, but nothing said so, and a compatibility
shim that nobody records becomes a permanent hole that everybody assumes is
load-bearing.

## 2026-08-23 — the refusal claim is stated narrowly

The product previously claimed that complaint volume cannot influence planning.
An independent review showed that claim was false as stated: complaint counts
written into `planning_load` reached the shipped allocator and materially
re-ranked the plan, because the guards matched field *names* and a number
carries no name.

The artifact boundary now checks a declared derivation by arithmetic against a
value already in the same document, which closes that route. It does not close
the route where an attacker also rewrites `forecast.areas[].upper` so the two
reconcile — but that means smuggling a number through the pipeline past pinned
checksums, which is a different and much harder problem.

**The claim the project makes, and will defend:**

> Complaint volume cannot reach allocation without also corrupting the
> published forecast interval, which is derived from checksummed inputs.

**Not:** "complaint volume cannot influence planning."

The narrower claim is true, verifiable, and survives an adversary. The broader
one did not.

## 2026-08-23 — cost per person is refused by allowlist, not denylist

The first version of the cost guard was a denylist of words meaning "human
being". A review defeated it with this project's own vocabulary:
`cost_per_sleeper` passed, because `SleeperType` is a real exported type in
`normalize.py`, as did `cost_per_household`, which appears on the actuals
schema's own never-compute list.

A cost figure must now name a denominator from an enumerated set — hour,
staff-hour, area, plan, shift — and anything else is refused. An allowlist has
a bounded, checkable definition. A list of words for "person" does not.

**Known limit, stated rather than hidden.** Dividing a permitted cost by a
permitted engagement count produces a per-person figure that never gets a name,
and no field-level guard can see an expression. What the allowlist guarantees
is that no such figure can be **stored, exported, or displayed** by the system.
That is the claim; nothing broader is made.
