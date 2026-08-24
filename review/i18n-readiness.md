# Localization readiness — a work order

**Queue item 2.6.** Inventory of what makes Spanish hard here, written as a
work order the build session can execute against rather than as an audit.

**Assessment: not ready, and the blocker is not string extraction.** The
blocker is that a large share of this product's user-facing text is *generated
sentences*, not labels — the planner's `reasons[]`, the evidence narration, the
copy-to-clipboard brief. Those are English sentences assembled from fragments
at runtime. Extracting them to a catalogue does not localize them; it produces
a catalogue of English grammar with holes in it.

Do the ordering below. Item W-1 is the one that decides whether this is a
two-week job or a two-month one.

---

## W-1 — Decide what "Spanish" means here, before touching code

**This is a scope decision, not an engineering task, and it comes first.**

There are three products in this repo, and they do not need the same treatment:

| Surface | Audience | Localization need |
| --- | --- | --- |
| Interface chrome (labels, buttons, headings, help text) | operator | **full** |
| Generated reasoning (planner `reasons[]`, evidence narration, decision brief) | operator, and anyone they forward it to | **full, and hardest** |
| Provenance and methodology disclosures (source ledger notes, exclusion grounds, limitations) | counsel, funder, evaluator | **decide deliberately** |

The third row is a real question. A source-provenance note that says
"multiplier-adjusted visual observations, not unique people" is a technical
claim of record. Translating it creates a second authoritative text that can
drift from the English one and from the underlying source documents, which are
themselves in English. Options are (a) translate and version both, (b) keep the
canonical English and render a translated summary marked as non-authoritative,
or (c) translate everything and accept the drift risk.

I would pick (b), but it is not my call. **Nothing else on this list should
start until this is answered**, because it determines whether the string
extraction covers 100% of the corpus or roughly 60% of it.

---

## W-2 — Concatenated sentences in the planner reasons (hardest, do second)

**`app/src/domain/planner/planner.ts:375-397`.**

```ts
reasons.push(
  `${continuity} hours of continuity reserve because the drop test returned ` +
    `possible_displacement, which preserves outreach continuity where a local decline ` +
    `coincides with nearby aggregate increases.`,
);
…
reasons.push(
  `${discretionaryHours} hours from the discretionary remainder, in proportion to a relative ` +
    `load of ${relativeLoad(area, policy).toFixed(1)} built from the upper prediction bound ` +
    `(${area.forecast_upper}) and its interval width.`,
);
…
reasons.push(
  `${unmet} fewer hours than a plan without the coverage floor would have given this area.`,
);
```

Four separate English-grammar assumptions in these three strings:

1. **Number-first sentence order.** "`${n}` hours of continuity reserve
   because…" Spanish would want "Se reservan `${n}` horas…" — the verb moves,
   and in some phrasings the number moves too. A catalogue entry with
   `{count}` at the front bakes in the English order unless the translator is
   free to move the placeholder, which means the entry must be a whole sentence
   template, not a prefix.
2. **`${unmet} fewer hours than…`** is a comparative construction. Spanish
   ("`${unmet}` horas menos de las que…") restructures the clause. This one
   cannot survive as a fragment at all.
3. **`possible_displacement` is interpolated as a raw enum value into prose.**
   It reads as a machine token mid-sentence in English already; in Spanish it
   would be an untranslated English identifier inside a Spanish sentence.
   Needs its own display-name catalogue keyed by the enum.
4. **Multi-line string concatenation with `+`** means these are not
   greppable as single units, and a naive extraction tool will produce three
   catalogue entries per sentence.

**Work:** convert each `reasons.push` to a message-format template with named
parameters (`{hours}`, `{load}`, `{upperBound}`) and an ICU `plural` category,
where the *entire sentence* is one catalogue entry and the translator controls
placeholder order.

**Careful — this file is under refusal test.** `refusals.test.ts` asserts on
the literal string
`"Complaint volume was not used. These hours describe available capacity. They do not estimate need."`
and `scripts/mutation_check.sh` uses the same string as a mutation anchor.
Both break the moment that sentence becomes a catalogue lookup. That is not a
reason to avoid the change; it is a reason to update the refusal test to assert
on the *catalogue key and every locale's value*, which is a strictly better
test. Do not let it silently become an English-only assertion.

## W-3 — Pluralization

Only one hand-rolled plural found, which is better than expected:

**`app/src/lib/planner.ts:85`**
```ts
`… leaving ${remaining} unassigned hour${remaining === 1 ? "" : "s"}. …`
```

English binary plural. Spanish is also binary here, so this specific string
survives translation, but the *pattern* does not generalize (Polish and Russian
have three and four categories) and it should go through ICU `plural` anyway
for consistency.

Sweep for more: the corpus is small enough that `grep -rn '? "" : "s"'` over
`app/src` is a complete check today. Add a lint rule so it stays complete.

## W-4 — Number and date formatting — mostly good, one systemic problem

**Good news first.** `app/src/lib/format.ts` already centralizes this:

```ts
new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)
new Intl.DateTimeFormat("en-US", { … })
```

Using `Intl` at all puts this ahead of most codebases. The work is small:
**the locale is hardcoded as `"en-US"` at three sites** —
`lib/format.ts:2, 8, 17` — plus a fourth at `lib/demo.ts:416`. Thread a locale
through, or read it from a single module-level constant.

`lib/demo.ts:415-416` is a duplicate of the month-formatting logic already in
`format.ts:8-12`. Collapse it while you are there; two formatters is two
places to forget the locale.

**The systemic problem is `toFixed`.** Twelve sites bypass `Intl` entirely:

| File | Lines |
| --- | --- |
| `features/evidence/DropTestSection.tsx` | 161, 162, 168, 280, 281, 486, 826 |
| `features/shell/useShellState.ts` | 303 (twice, inside the clipboard brief) |
| `domain/planner/planner.ts` | 386 |

`toFixed` always emits a `.` decimal separator and never a group separator.
Spanish (es-ES) uses `,` as the decimal separator. So `HHI 0.038194` renders
correctly in English and **wrongly** in Spanish while every `Intl`-formatted
number on the same screen renders correctly — mixed separators in one view,
which is worse than being uniformly wrong.

**Work:** route every `toFixed` through `formatNumber(value, digits)`. Add a
lint rule banning bare `toFixed` in `app/src`. This one is mechanical and can
be done independently of W-1.

## W-5 — The clipboard decision brief is a single 900-character sentence factory

**`app/src/features/shell/useShellState.ts:303`.**

One template literal containing: three nested ternaries, eight interpolated
numbers, two `formatNumber` calls, two `toFixed` calls, an arrow character
(`→`) used as a grammatical connective, a `≥` used mid-sentence, and a
conditional clause that switches between two entirely different sentence
structures depending on whether `individualOne && individualTwo` is set.

This is the single hardest string in the product to localize, and it is also
the one most likely to be forwarded outside the organization — it is what the
operator pastes into an email.

**Work:** decompose into a small set of whole-sentence templates selected by a
`switch`, not by nested ternaries in a template literal. Treat the arrow and
`≥` as content that may need translating to "a" and "al menos" in prose
context.

## W-6 — Hardcoded strings in error and empty states

Not centralized. Confirmed sites:

- `app/src/lib/planner.ts:24-100` — six refusal messages returned as
  `message:` strings from `allocateHours` ("The staff-hour budget must be a
  nonnegative whole number.", "No feasible plan: locks and coverage floors
  require `${n}` hours, but the budget is `${b}`.", etc.). These are
  **error messages returned from domain logic**, which means the domain layer
  currently owns presentation. That is the structural fix: return a
  discriminated error code plus parameters, and let the view render the
  sentence.
- `role="note"` empty states at `App.tsx:3106, 3136`
  (`diagnostic-unavailable`).
- `app/src/features/spatial/AreaMap.tsx` — the four `aria-label` strings, which
  are *accessible names* and must be localized or screen reader users get
  English in a Spanish interface.

**Accessible names are the easy thing to miss.** There are 35 `aria-label`
occurrences in the pre-decomposition `App.tsx` alone. Every one is user-facing
text that no visual QA pass will catch.

## W-7 — Text baked into SVG and images

- **SVG `<text>` in the map:** `App.tsx:342` renders
  `<text className="map-name">{area.name}</text>` inside the SVG. Area names
  come from data, so they localize with the data, not the catalogue — correct
  by accident, but worth knowing. **The layout does not:** label anchors are
  hand-nudged fixed coordinates in `features/spatial/areaGeometry.ts`, and
  longer Spanish names will overflow their cells. There is no text-length
  handling.
- **`<title>` elements** inside the SVGs (`App.tsx:310`) are accessible names
  and need the catalogue.
- **`public/social-preview.png`, `title-card.png`, `social-square.png`** all
  contain rendered English text and are referenced from
  `app/index.html` Open Graph tags. A Spanish deployment needs Spanish cards
  or it shares an English image.
- **`docs/img/*.png` and `docs/testing/media/*`** — screenshots of an English
  UI, used in the README and adoption material.

## W-8 — Document language attributes

`app/index.html:2` is `<html lang="en">`, and there are **zero** `lang=`
attributes in `App.tsx`. Two consequences:

1. The root `lang` must become dynamic, or screen readers read Spanish content
   with an English speech synthesizer.
2. Any text that stays English inside a Spanish page (see W-1 option (b) —
   canonical provenance notes, source titles like "Unsheltered Sleep Count
   report", publisher names) needs `lang="en"` on its own element. This is a
   WCAG 3.1.2 (Language of Parts, AA) requirement, so it is an accessibility
   obligation and not merely a nicety. See `review/accessibility-audit.md`.

---

## Suggested order of work

1. **W-1** — scope decision. Blocks everything else.
2. **W-4** (`toFixed` sweep) and **W-8** (`lang`) — mechanical, independent,
   safe to do immediately regardless of how W-1 resolves.
3. **W-6** — move error strings out of the domain layer. This is good design
   independent of localization and makes W-2 easier.
4. **W-2** and **W-5** — the sentence factories. Budget most of the effort
   here. Update `refusals.test.ts` and `scripts/mutation_check.sh` anchors in
   the same change.
5. **W-3**, **W-7** — cleanup and assets.

## Rough effort

Assuming W-1 resolves to option (b) (chrome and reasoning localized, canonical
provenance stays English with `lang="en"` and a translated summary):

| Item | Effort |
| --- | --- |
| W-4, W-8 | half a day |
| W-6 | 1–2 days (touches domain/view boundary) |
| W-2, W-5 | 3–5 days, plus review time from a Spanish-speaking domain reader |
| W-3, W-7 | 1 day, plus asset production |
| Catalogue infrastructure and locale switching | 1–2 days |

**The item that is not on this list and should be budgeted: review by a
Spanish-speaking person who understands homelessness services.** The
vocabulary here — "unsheltered", "encampment", "outreach", "continuity
reserve", "person-equivalents" — carries policy meaning, and a general
translator will produce text that is fluent and wrong. Given how carefully this
project polices its English language boundaries (five baseline prohibited
claims, a semantic copy scan in `refusals.test.ts`), shipping unreviewed
Spanish would undo that work in the other language.

## One thing that will make this much easier than it looks

`app/src/refusals.test.ts` already builds a **source corpus** — it walks every
non-test `.ts`/`.tsx` file under `app/src` and extracts user-facing strings, in
order to scan them for forbidden claims. That machinery is most of a string
extractor. Reuse it as the basis for catalogue extraction and for a coverage
test asserting that every extracted string has a catalogue key. It also means
the forbidden-claim scan can be run against **each locale's catalogue**, so the
refusals survive translation — which is the thing that would otherwise quietly
break.
