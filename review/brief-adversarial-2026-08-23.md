# Adversarial read: `docs/adoption/BRIEF.md`

**Point-in-time, 2026-08-23. Both overstatements below were fixed.** The
accessibility claim now reads as self-assessed against WCAG 2.1 AA with the
open findings named, and the privacy residual now carries a stated ceiling
that agrees with `SECURITY.md`. Read this as the record of the read, not as
a list of live defects.

**Role taken:** a skeptical board member with an hour and internet access, who
will check anything that sounds too good. Every claim below was attempted
against the repository.

**Overall: substantiated, with two overstatements and one omission.** This is a
more honest document than the genre usually produces — the "What is not
finished" section discloses staleness, unresolved boundaries, the unpinned map
input, the non-reproducible artifact, the privacy-scanner residual, and the
limits of the accessibility audit, without being asked. I went looking for the
gap between what shipped and what is claimed and it is narrow.

---

## Claims I attempted to falsify and could not — **substantiated**

**The headline numbers are exact and traceable.** The brief says the estimate
"fell 22.3% in a year, but on the same fixed set of blocks, direct observations
of individuals rose 7.5% and appeared on 25 more blocks." In
`public/generated/demo.v1.json`:

```
post2020_multiplier_decomposition.change_pct = -22.3
individuals_change_pct = 7.5,  individual_active_blocks_change = 25,
  selected = true,  to_month = "2025-01"
observed_units: { change: 38, change_pct: 7.5, from: 510, to: 548 }
```

All three, exactly, in the selected contrast. I expected rounding drift and
found none.

**"No person is ever in it."** Verified structurally: no person-level type
exists in `domain/actuals/types.ts` (its header says so and the type set bears
it out), `observations.grain` is fixed at `area_month_aggregate` in the profile
schema with `additionalProperties: false`, and the deny-lists refuse
person-shaped field names at four boundaries.

**"The refresh fails if someone flips that flag."** Substantiated by
`tests/pipeline/test_monitoring_data.py:32,63` plus
`contracts.py::_validate_currency`, which refuses any
`observed_not_model_eligible` row where `model_eligible` is not `False`.

**"If locks and floors exceed the budget the tool produces no plan and says
so."** Verified by execution in the original share-link and planner work.

**"An area given nothing produces no observations, looks quieter, and earns
nothing again."** This is the equity-floor rationale and it is the best
paragraph in the document. Substantiated by the code and, more importantly,
correctly reasoned.

**"There is no button" for the refresh.** Disclosed as an honest caveat rather
than buried. Verified: `scripts/refresh.sh` is a shell script.

---

## Overstatement 1 — "Accessibility is audited, not fully verified"

**Severity: medium. The wording is defensible; the omission is not.**

The literal claims check out. "Zero automated WCAG 2.1 AA violations across six
screens" is true — axe runs with the full `wcag2a/2aa/21a/21aa` tag set and
passes. "Contrast measured directly" is true.

What the sentence does not say is that **an independent audit produced eleven
findings and at least seven are still open.** Verified at `56d9e94`:

| Finding | Status |
| --- | --- |
| A-1 SVG `<g role="button" tabIndex={0}>` may not be focusable in Safari | **open** — `AreaMap.tsx:83` unchanged |
| A-2 four `table-scroll` regions not keyboard focusable | **open** — no `tabIndex` on any of the four |
| A-3 `aria-label` overrides the visible label (WCAG 2.5.3) | **open** — `TopBar.tsx:42-46`, now in two languages |
| A-7 map-table `<th>` without `scope` | open |
| A-8 inspector tabs without `aria-controls` | open |
| A-9/A-10 error signalling | open |

`91a3bf7` fixed the build session's *own* audit findings (eight silent
aria-labels, one contrast failure). Those were real and the fix is good. But
"audited" invites a reader to conclude the audit's findings were addressed, and
a board member who asks "what did the audit find?" gets a different answer than
the sentence implies.

**A-1 and A-2 are both WCAG 2.1.1 Level A** — keyboard operation — and both are
structurally invisible to axe under jsdom, which is exactly why "zero automated
violations" and "there are open Level A findings" are both true at once. That
is a subtle point and the brief should make it, because a funder with an
accessibility requirement will ask.

**Honest replacement:** "Zero automated WCAG 2.1 AA violations across six
screens; contrast measured directly. An independent audit raised eleven
findings, of which N remain open, including two Level A keyboard issues that
automated tooling cannot detect. Manual keyboard and screen-reader protocols
have not been run."

## Overstatement 2 — "No cost figure divides by a human being"

**Severity: low as written, medium as read.**

As a claim about what the system *produces*, this is **true and I could not
falsify it**: no cost function accepts a population argument, the output shape
is `{rate, currency, byArea, totalHours, totalCost, floor}`, the by-area table
has no count column beside a cost column, and `assertNoPersonDenominator` runs
on every summary.

But the sentence sits in a section titled "What it refuses to do," where a
reader takes it as a guarantee about what the system *permits*. As of
Escalation 3, the guard enforcing it accepts `coste_por_persona` and "por
persona atendida" — and the product now ships Spanish. The claim is true of
today's outputs and weaker than implied about tomorrow's.

Not a falsification. A dependency the reader cannot see.

## Omission — the privacy residual is stated but not bounded

**This is the item I was asked to judge specifically, and my answer differs
from the build session's reading.**

`BRIEF.md:176-178` and `SECURITY.md:74` both end at:

> Six rounds of review each found a real hole, and the security policy says to
> assume a seventh exists.

**The build session reads this as an argument for adoption. A general counsel
will not.** Engineers read "assume a seventh exists" as epistemic hygiene — the
mark of a team that knows its controls are imperfect. Counsel reads it as the
vendor stating, in writing, that its privacy control may fail in an unknown way,
with no stated ceiling on the consequence. Unbounded admissions do not reassure
lawyers; they create a documented notice problem. The sentence as written is
the most quotable liability in the packet, and it was volunteered.

**But the residual is boundable, and the material to bound it is already in
`SECURITY.md` — filed under "Known and accepted limits" rather than stated as a
bound.** Assembled and verified:

1. **Nothing below the threshold is published today.** I counted every integer
   in the deployed artifact's `observations` block: **220 integers, zero of
   them between 1 and 4.** The finest published number is an area-month total in
   the tens-to-hundreds. The scanner's shape inference is a backstop for a
   condition that does not currently occur.
2. **The published grain is area-month aggregate**, fixed by schema with
   `additionalProperties: false`, and no person-level type exists anywhere in
   the lineage that reaches deployment.
3. **The worst realistic case is bounded by what is already public.** The
   upstream SDRDL source package is public at *point precision* — `sdrdl_source`
   in the ledger records `geo_grain: "Point locations in EPSG:2230 state-plane
   x/y"` behind a public package page. A seventh hole in the small-cell rule
   would, at worst, republish at coarser grain something already obtainable at
   finer grain from the original publisher. **This is the sentence that answers
   counsel**, and it is currently framed as a limitation ("those two facts are
   why the boundary was drawn at the deployment") rather than as the ceiling on
   exposure.
4. **The exposure is not person-level under any failure of this control**,
   because the control governs cell suppression in aggregate tables, not the
   presence of person records. There are no person records to leak.

**Is the residual genuinely not boundable?** No — it is boundable, and the bound
is strong. What is *not* boundable is the class of "unknown structural hole in a
shape-inference rule," which is why the honest formulation is: the *mechanism*
of a seventh hole is unknown; the *consequence* is bounded by (1)–(4).

**Is the bounding section they are adding sufficient?** It will be, if it states
all four points and — critically — if it moves point 3 out of the limits section
and into the bound. If the section only restates "assume a seventh exists" with
more words, it makes the problem worse by drawing attention without resolving
it.

**One thing to resist:** do not soften "assume a seventh exists." It is true and
removing it would be the first dishonest edit in this document. Bound it
instead. "Assume a seventh exists; here is the most it could cost" is a
defensible position. "Assume a seventh exists" alone is not.

---

## Smaller notes

- **"roughly 20 minutes a month for the operator"** — unfalsifiable estimate.
  Not a problem, but it sits next to verifiable claims and inherits their
  authority. Say it is an estimate.
- **"in the shipped configuration, 80 hours across six"** — correctly scoped to
  the shipped configuration rather than claimed generally. Good.
- **Geography portability**: the brief does not overclaim it. It says boundaries
  are unresolved and tells adopters to resolve their own. It does *not* claim
  the second profile runs the whole product, which is the claim
  `config/README.md` makes and which
  `review/profile-portability-2026-08-23.md` shows is only half true. The brief
  is safer than the README here — worth aligning the README down to the brief,
  not the brief up to the README.
- **Reproducibility** is disclosed precisely and without euphemism: "The shipped
  data file cannot be regenerated from a clean copy of the repository." That is
  F-2 stated in the harshest available terms in a board document. Credit.

---

## Verdict by section

| Claim area | Verdict |
| --- | --- |
| Headline evidence numbers | **substantiated**, exact |
| Refusals (person, enforcement, LLM) | **substantiated** |
| Cost — no per-person figure | **substantiated as written**; guard weaker than implied |
| Equity floor and its cost | **substantiated**, best-argued section |
| Reproducibility | **substantiated** — disclosed, not claimed |
| Geography portability | **substantiated** — brief does not overclaim; README does |
| Operability ("no button") | **substantiated**, volunteered |
| Accessibility | **overstated by omission** — 7+ independent findings open, 2 at Level A |
| Privacy residual | **unbounded where it could be bounded** — the material exists, filed as a limit |
