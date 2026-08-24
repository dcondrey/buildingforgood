# Review: `features/share/planShareState.ts` — the link a coordinator emails

**Requested target.** Reviewed at `5f8a65a` + merge. All results below were
executed; harness at `review/attacks/share-link.attack.test.ts`.

**Verdict: PASS on the allowlist. FAIL on silent degradation.**

The allowlist does what it claims in both directions, and I could not get a
forbidden value through it. What I could do — trivially, and by accident rather
than by attack — is make a recipient open a **different plan than the sender
sent, with no indication anything was lost**. For a product whose whole posture
is "refuse rather than silently repair," this is the one place it silently
repairs, and it is the path that leaves the building.

---

## What held

I tried to break the allowlist and could not. Recording specifics so the
coverage is judgeable:

| Attack | Result |
| --- | --- |
| `__proto__` as an own key from `JSON.parse` | **REFUSED** — `Object.keys` sees it, allowlist rejects it |
| `constructor` as an own key | **REFUSED** |
| Extra field (`complaint_rank`) | **REFUSED** by name |
| `Object.prototype` polluted afterwards? | **no** |
| Duplicate `budget` param | **REFUSED** — "appears more than once" |
| Unknown tracking params (`utm_source`, `fbclid`) | ignored, state unaffected — correct and documented |
| Round-trip fidelity | exact |

The emitted link is genuinely readable, which was the stated goal:

```
https://x.org/app?v=1&budget=120&floor=8&guard=on&locks=east_village:40&share=25&assume=gaslamp&rate=62.5
```

`SAFE_PARAM_VALUE` proving every value alphanumeric *before* emitting
unescaped is the right order of operations. `assertAreaId`'s
`PERSON_OR_POINT_SEGMENT` and `REPORT_VOLUME_TOKEN` checks are the same
boundary as the planner's, applied at the export path, which is where it
belongs — and writing them as patterns "so neither ever renders as user-facing
copy" is a nice touch.

**This is a well-built module.** Everything below is about its integration.

---

## SH-1 — every realistic email mangling silently yields the default plan

**Severity: high.**

`useShellState.ts:655-656`:

```ts
const shared = readPlanShareFromSearch(window.location.search);
if (!shared) return;
```

`readPlanShareFromSearch` catches every `PlanShareError` and returns `null`.
The caller then returns, leaving the loader's own default budget and plan on
screen. **Nothing tells the user a link was present and rejected.**

Six mangling cases, all of them things mail systems and humans actually do:

```
truncated at 60 chars (line wrap)       decode=THROWS  -> SILENT DEFAULT PLAN
truncated mid-locks                     decode=THROWS  -> SILENT DEFAULT PLAN
HTML-entity &amp; (rich-text email)     decode=THROWS  -> SILENT DEFAULT PLAN
trailing period from a sentence         decode=THROWS  -> SILENT DEFAULT PLAN
trailing > from a quoted reply          decode=THROWS  -> SILENT DEFAULT PLAN
unicode non-breaking hyphen             decode=THROWS  -> SILENT DEFAULT PLAN
```

The `&amp;` case is the most likely of the six: rich-text mail composers
routinely HTML-escape a pasted URL, and the recipient's client renders it back
into a link whose query string contains `&amp;` literals.

The failure mode is the bad one. The recipient does not get an error, or a
blank screen, or an obviously wrong number. **They get a plausible, fully
rendered plan** — the default 80-hour scenario — and no reason to doubt it. Two
people then discuss "the plan in the link" while looking at different plans.

**The module is not at fault here; the integration is.** A function named
`read…FromSearch` returning `null` on garbage is a reasonable contract. What is
missing is that `useShellState` throws the distinction away. It cannot
currently tell "no link present" from "a link was present and I refused it,"
because both arrive as `null`.

**Suggested fix:** have the ingest path distinguish the two — e.g. call
`decodePlanShare` directly, catch, and set a shell state flag that renders a
banner: *"This link could not be read (`rate: must be a number`). You are
looking at the default plan, not the sender's."* The `PlanShareError.field` is
already carried for exactly this and nothing consumes it today. That banner is
also the cheapest possible fix and needs no change to the module.

## SH-2 — three of seven fields silently default; four refuse

**Severity: high. This is the substantive design bug.**

```
S-2 drop rate    -> ACCEPTED SILENTLY: rate 62.5 -> 45
S-2 drop share   -> ACCEPTED SILENTLY: share 0.25 -> 1
S-2 drop locks   -> ACCEPTED SILENTLY: HOURS CHANGED
S-2 drop budget  -> REFUSED: budget: is missing from the link
S-2 drop floor   -> REFUSED: floor: is missing from the link
S-2 drop guard   -> REFUSED: guard: must be on or off
```

`encodePlanShare` **always writes all seven fields** — `rate` and `share`
unconditionally, `locks` when non-empty. So a link missing any of them was not
produced by this system: it was truncated, hand-edited, or written by a
different version. Treating three of those as "use a default" and four as
"refuse" is an inconsistency with no stated rationale.

The consequences are not cosmetic:

```
S-3 sender saw $7500.00 for the plan; reader of the same link sees $5400.00
    (rate 62.5 -> 45)
S-3 sender's clearance assumption 25%; reader's 100%
```

**A 28% cost divergence** on the figure that goes into a board packet, from a
link that looks fine. `DEFAULT_LOADED_HOURLY_RATE` is the placeholder the cost
help text says a finance lead "must replace before any figure below is shown to
a decision-maker" — and a stripped `rate` param reinstates it silently, under a
plan the sender priced at their own rate.

**The `share` default is worse than arbitrary — it is the maximum.**
`readWhole(params, "share", 100)` yields `share = 1.0`, a 100% displaced-share
clearance assumption. Not neutral, not the shell's own default: the most
aggressive value the slider permits. Combined with a surviving `assume`
parameter, `useShellState:671` then sets a full intervention scenario the
sender never configured.

**Suggested fix:** make all seven required, since the encoder always writes
them. `rate` and `share` become `readWhole(params, key, null)`, matching
`budget` and `floor`. If backward compatibility with older links matters, bump
`PLAN_SHARE_VERSION` rather than keeping a silent default — the version check
already exists and already refuses unknown versions loudly.

## SH-3 — the test that asserts this property only tests the cases where it holds

**Severity: medium, and worth its own entry because the test is green.**

`planShareState.test.ts` has:

```ts
it("refuses a hand-edited link rather than restoring part of it", () => {
```

Nine cases. Every one either supplies a malformed *value*
(`budget=notanumber`, `guard=maybe`, `assume=<script>`, `rate=1e9`,
`locks=../../etc/passwd:4`) or omits `budget` — one of the four fields that
already refuses. **Not one case omits `rate`, `share`, or `locks`.**

So the test's name states a property of all seven fields, and its body checks
it on the four where it is true. This is the same shape as Phase 0's mutation
gate: a green check whose name promises more than its body delivers.

The `../../etc/passwd:4` and `<script>` cases are good — I would keep them and
add the three omission cases.

Also worth noting: the test asserts `readPlanShareFromSearch(...)` is `null`
for every rejected link. That pins the silent behaviour in SH-1 as intended,
which is why I have framed SH-1 as a disagreement about the integration rather
than a bug in the module. If you think the silent default is right, record that
and I will drop it — but the comment three lines above the ingest call says
"a colleague opening a link must end up with the sender's plan, not that
default," and today it can end up with exactly that default.

## SH-4 — a stale link degrades silently across geographies

**Severity: medium now, high once C-1 lands.** Read from code, not executed.

`useShellState.ts:659-662`:

```ts
const known = new Set(data.areas.map((area) => area.id));
// An id the link names but this artifact does not have is dropped, not
// invented: a stale link degrades to the plan it can still describe.
const locks = new Map(shared.locks.filter(([areaId]) => known.has(areaId)));
const assumed = shared.assume !== null && known.has(shared.assume) ? shared.assume : null;
```

Dropping rather than inventing is the right call. **Doing it silently is not.**
A link locking `east_village` at 40 hours, opened against an artifact without
that area, produces a plan with 40 hours redistributed and no mention that a
lock was discarded. Same for the clearance assumption vanishing.

Right now every deployment shares one six-area geography, so this is latent.
The moment C-1 lands and a second profile runs, "I sent you my plan" and "I
opened your plan" stop meaning the same thing across organizations — and the
link contains no geography identifier to detect the mismatch with.

**Suggested fix:** carry `geography.version` (or the profile's `area_list.version`)
in the link and refuse a mismatch outright, the way `v` is refused. Failing
that, surface the dropped ids: *"2 locks in this link name areas this
deployment does not have and were not applied."* This is cheap to add now and
awkward to retrofit after links are in circulation.

## SH-5 — small notes

- **`decodePlanShare` ignores unknown params** (documented, tested, and I agree
  with it — `utm_*` and `fbclid` should not break a link). Worth being explicit
  in the module docstring that this is also why a *misspelled* known param
  (`budgett=120`) is invisible: it is ignored, `budget` is then missing, and the
  whole link is refused. That is the correct outcome, arrived at indirectly.
- **`assume` is not required to appear in `locks` or in any known area at
  decode time** — only its *shape* is validated. That is right for the module
  (it cannot know the geography) and is exactly what SH-4 asks the caller to
  handle.
- **`MAX_SHARED_LOCKS = 24` with `MAX_AREA_ID_LENGTH = 40`** bounds the URL at
  roughly 1.1 KB of locks. Fine for mail, and worth a comment saying that is
  why the bound exists.
- **No PII, no precise location, no complaint signal, no per-person figure can
  travel in a link.** I tried; the allowlist plus `assertAreaId` holds. Since a
  pasted URL *is* an export path, this satisfies the governance document's
  "what leaves the system" section, and the governance doc should probably say
  so explicitly — it currently names the clipboard brief as the only export.

---

## Summary

| Check | Verdict |
| --- | --- |
| Allowlist holds in both directions | **pass** |
| Prototype pollution | **pass** — refused, prototype clean |
| Duplicate parameters | **pass** — refused |
| Unknown parameters inert | **pass** — deliberate |
| Forbidden data (person, location, complaint) representable | **no** — pass |
| Round-trip fidelity | **pass** |
| A mangled link fails loudly | **fail** (SH-1) — six realistic manglings, all silent |
| All fields the encoder writes are required to read | **fail** (SH-2) — 3 of 7 silently default |
| The `share` default is neutral | **fail** (SH-2) — it is the maximum, 100% |
| A cross-geography link fails loudly | **fail** (SH-4) — drops locks silently |
| The test suite covers the above | **fail** (SH-3) — green test, partial cases |

**The one-sentence version:** nothing dangerous can get *into* a link, and
nothing tells the recipient when something has fallen *out* of one.
