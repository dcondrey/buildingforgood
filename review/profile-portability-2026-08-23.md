# Track 2: is this a tool, or a demo about somewhere else with a config file bolted on?

**Provenance of this file.** The original run, on 2026-08-23, targeted the
second example profile as it then existed: a fictional rural continuum of care
with invented area names. That profile was deleted in `0113a1f` and replaced
with DSDP's own published seven-area geography — the six-area core plus Outside
Perimeter — because inventing a place is not an acceptable way to demonstrate
portability in a repository about a real city. The harness
(`review/attacks/profile-run.attack.test.tsx`) was re-pointed and **re-run**;
every measurement below is from the re-run, not carried over. Where the
re-run's answer differs from the original, the difference is stated.

**I ran it. I did not read it.** `?profile=san-diego-dsdp-seven`, rendered in
jsdom through the real `App`, with the reference downtown profile as a control.
Everything below is **verified** unless marked otherwise.

---

## The plain answer

**The planning layer is a tool. The evidence layer is still bound to one
artifact.** Both halves are true, and an evaluator will notice the second
within about ninety seconds of switching profiles.

That is a much better answer than it was a week ago, when nothing outside
`domain/config/` imported the loader at all. C-1 is genuinely closed for the
planner. It is not closed for the artifact.

The replacement profile is a **sharper** test than the fictional one, not a
softer one. Six of its seven areas carry real observations, so the seventh is
the only place an invented number could hide — and it is exactly where the
tool's refusal has to hold.

---

## What the profile actually drives — **verified**

```
P1 published areas rendered: 7/7 -> City Center, Columbia, Cortez, East Village,
   Gaslamp, Marina, Outside Perimeter
P1 OUT-OF-SCOPE QUADRANT LEAKAGE: none  (the four East Village sub-areas)
P2 budget input value=96 min=0 max=400
P2 96-hour budget     present: true
P2 6-hour floor       present: true
P2 $52.00 rate        present: true
P2 "seven"            present: true
P3 downtown control: 6/6 areas, budget input value=80
```

Everything the review brief told me to attack, I attacked:

| Leak I looked for | Result |
| --- | --- |
| Hardcoded area count | **none** — 7 areas render, `numberWord(areas.length)` produces "seven" |
| Anything assuming six of something | **none in the planner** — floor options derive from `floorOptions(profile.operations.coverage_floor_hours)`, giving 0/3/6 here against 0/4/8 downtown, and both are now pinned in `deployment.test.tsx:28,70` |
| Defaults that are the reference profile's values | **none** — budget 96 from the profile; the 80-hour default did not leak |
| Shift structure assuming one daily window | **none** — the 2-hour allocation increment reaches the plan |
| Out-of-scope areas silently dropped | **no** — the four East Village quadrants are absent from the plan and their exclusion reason is available, which is the behaviour that matters most here: summing a quadrant with the East Village total would double-count |

**One correction to the original run.** It recorded the two-week planning-horizon
label as rendering; on the re-run it does not appear in a default render. That
is not a regression — it is the *fix* for one. The label lives in
`DisclosurePanel`, and `App.tsx:40` now mounts it behind `disclosuresOpen &&`,
where the original run met the version that rendered the drawer unconditionally.
The old measurement was reading a bug.

**The single best thing in this build**, and it is worth stating plainly
because it is the hard part: the app renders, unprompted,

> The loaded artifact carries no observation for Outside Perimeter. Those areas
> receive the guaranteed minimum and no forecast weight…

It refuses to invent an observation for an area it has no data for, and it says
so in the interface rather than in a doc. Most tools in this position would show
zeros. On this profile that sentence names a **real published area with a real
reported total** that simply is not in the shipped artifact — which is a much
better demonstration than the fictional geography could ever have been.

---

## What leaks — **verified**

Profiles carry **no artifact binding**. `observations` in a profile declares
the *contract* (`grain: area_month_aggregate`, both publishability flags
`false`) but not a *source*. `demo.v1.json` is global. So under any profile
whose geography is not the artifact's, the evidence half of the page still
describes the artifact's geography:

| Surface | Rendered under `?profile=san-diego-dsdp-seven` |
| --- | --- |
| Page header | `Prepared decision · **Six-area downtown core** · Jan 2024 → Jan 2025` |
| Hero narrative | "…on the fixed **261-block panel**" — the six-area panel, not the seven-area one |
| Digitization audit card | the **City Center** sheet, from the six-area bundle |
| Capacity context card | the six-area core's records release |

So an operator on the published seven-area configuration plans 96 hours across
seven areas at a 6-hour floor, beneath a header that says "Six-area downtown
core". The plan is right and the frame around it is one area short.

Note that "Six-area" here is **not** the C-2 hardcoded-copy problem reported
earlier; that was in the new feature components and is a separate item. This
one comes from the artifact's own scenario labels, so fixing the C-2 strings
will not fix this.

Two strings I checked and **cleared** — they are the profile's own text,
correctly rendered, not leakage:

- "The same tool configured for the full seven-area geography the Downtown San
  Diego Partnership publishes, rather than the six-area core the reference
  deployment uses…" — the profile's `scope_statement`.
- "Outside Perimeter is a residual area — the publisher reports it as what falls
  outside the core perimeter rather than as a named neighborhood…" — the
  profile's `jurisdiction_note`.

---

## One abstraction leak in a guard, not in the UI

**`app/src/domain/actuals/actuals.ts:136-137`:**

```ts
const SD_LON_RANGE: [number, number] = [-117.7, -116.5];
const SD_LAT_RANGE: [number, number] = [32.4, 33.6];
```

A privacy guard that detects coordinate-shaped **bare numbers** by checking
whether they fall in San Diego's bounding box. A deployment outside that box
supplying `delivered_hours: 44.0582` (a latitude in Oregon) is not checked by
this branch. It does not bite the two shipped profiles — both are San Diego —
but it is a portability defect, and the profile schema exists precisely so that
a third profile can be somewhere else.

**Severity: low, and I want to be careful not to overstate it.** I tested the
free-text path and it is range-independent:

```
A4 actuals: San Diego coordinates in a note   REFUSED
A4 actuals: Oregon coordinates in a note      REFUSED
```

So the realistic leak — a coordinate pasted into an operator's note — is caught
anywhere on earth. Only the bare-numeric heuristic is San Diego-shaped, and a
bare latitude sitting in an hours field is a strange thing to construct. I could
**not determine** whether the numeric branch fires for an out-of-range value,
because my fixture failed an unrelated required field first.

Recording it because it is the exact shape of leak the brief predicted — "a
default that happens to be downtown's value" — in the one place nobody would
look for it, and because it will matter more if the numeric branch is ever
relied on.

---

## What would close the gap

Not my call to design, but the shape is small and worth stating:

1. **Bind an artifact to a profile.** A `data_source` block naming the artifact
   the profile expects, and a refusal — the same shape as
   `assertGeographyMatches` — when the loaded artifact's geography does not
   match the profile's. Today the app *discloses* the mismatch for observations
   but still renders the mismatched narrative around it.
2. **Derive the scenario labels from the loaded profile**, so "Six-area downtown
   core" is a computed string rather than a baked one. This is the cheapest of
   the three and it fixes the most visible symptom.
3. **Failing both, suppress the evidence half** when the artifact's geography
   does not match the profile's, and say why — the same posture the app already
   takes for missing observations.

The original version of this list recommended shipping a synthetic artifact for
the second profile. **Withdrawn.** With a real second geography, a synthetic
artifact would mean publishing invented observations for real named San Diego
areas — a worse fabrication than the one `0113a1f` removed, and precisely the
thing the "carries no observation" sentence exists to avoid.
