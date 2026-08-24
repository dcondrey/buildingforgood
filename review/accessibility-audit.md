# Accessibility audit — WCAG 2.1 AA

**This is a self-assessment, not a third-party audit, and the word "audit" in
this title should not be read as one.** `docs/adoption/BRIEF.md` states that no
independent accessibility audit has been commissioned, and that remains true:
this file is the same author testing their own work. It is the source of the
findings the brief counts, and its two Level A items have since been fixed.

**"the state that is deployed" below is stale.** It was written when `f8dd100`
was the deployed commit. Nothing has been deployed since; at the time of the
v1.0.0 tag the public site was many commits behind this repository.

**Queue item 2.5.** Audited against `f8dd100` (the state that is deployed).
**Marked urgent** because the build session is mid-decomposition (`431ea08`
plus ~12 untracked feature components): findings anchored to `App.tsx` line
numbers get harder to apply once the view layer is split. Per-finding
"decomposition risk" is noted below.

**Overall: this is well above average for a hackathon project, and better than
most production React apps I would expect to audit.** Colour contrast is
deliberate and nearly all passing, `prefers-reduced-motion` and
`forced-colors` are both handled, the focus indicator is strong, every
schematic map has a tabular equivalent with non-colour state words, and axe
runs over the *shipped shell* in four states with the full
`wcag2a/wcag2aa/wcag21a/wcag21aa` tag set (`App.test.tsx:61-62`).

Consequently, almost nothing below is an axe finding. These are the ones axe
under jsdom structurally cannot catch — which `App.test.tsx:12-14` and
`PlannerPanel.a11y.test.tsx:11` both say plainly in their own scope notes.
That honesty is why this audit could go straight to the hard cases.

---

## Findings, ranked by severity × effort

| # | Finding | WCAG | Severity | Effort | Decomposition risk |
| --- | --- | --- | --- | --- | --- |
| A-1 | SVG `<g role="button" tabIndex={0}>` is not reliably focusable in Safari | 2.1.1 A | **high** | medium | **moves** |
| A-2 | Scrollable table regions are not keyboard focusable | 2.1.1 A | **high** | low | **moves** |
| A-3 | `aria-label` on the budget input overrides its visible label | 2.5.3 A | medium | low | moves |
| A-4 | Guide panel is both `role="dialog"` and `aria-live="polite"` and receives focus | 4.1.2 A / 1.3.1 A | medium | low | **moves** |
| A-5 | Skip link targets a section, not `<main>`; `id="main-content"` sits on `<header>` | 2.4.1 A | medium | low | **moves** |
| A-6 | `--faint` on panel backgrounds is 4.13–4.38:1 | 1.4.3 AA | medium | low | stable (CSS) |
| A-7 | Map-table `<th>` elements carry no `scope` | 1.3.1 A | low | low | moves |
| A-8 | Inspector "tabs" are a button group with no `aria-controls` to their panel | 1.3.1 A | low | medium | **moves** |
| A-9 | Invalid-budget message uses `role="status"`, not `role="alert"` | 4.1.3 AA | low | trivial | moves |
| A-10 | No `aria-invalid` on the numeric inputs that can be invalid | 3.3.1 A (advisory) | low | trivial | moves |
| A-11 | Print path drops content with no equivalent | 1.3.2 A | **unverified** | — | stable |

---

### A-1 — the interactive map may not be keyboard-reachable in Safari

**`app/src/App.tsx:304-334`.** Severity high, and the reason it is high is that
a passing test says otherwise.

```tsx
<g role="button" tabIndex={interactive ? 0 : undefined} onKeyDown={...} aria-pressed={selected}>
```

`tabIndex` on an SVG `<g>` element is not honoured consistently. WebKit in
particular has long-standing gaps in making non-`<a>` SVG child elements
focusable via `tabindex`. In Chromium and Firefox this works; in Safari it may
not, and Safari is not a niche browser for a public-facing civic tool.

**Why the suite does not catch this:** `App.test.tsx` has "selects a map area
with the keyboard" and it passes — but jsdom has no layout and no real focus
model, so `tabIndex` on any element is honoured unconditionally. The test
proves the *handler* is wired, not that the element is *reachable*. This is a
green test over a possibly-broken feature, which is exactly the class of thing
this review exists to find.

**Reproduction:** open the deployed site in Safari, Tab through the map. I have
not been able to run this — no browser automation in this environment — so
this is stated as **high-confidence but unverified in a real browser**, not as
a confirmed defect. Verify before fixing.

**Suggested fix:** wrap each area in an SVG `<a>` or, better, render an
absolutely-positioned real `<button>` overlay per area; or keep the `<g>` for
paint and put the interaction on a visually-hidden `<button>` list that the
map's `aria-label` points at.

**Decomposition risk: moves.** This code is heading for
`features/spatial/AreaMap.tsx`, which already exists in the working tree.

### A-2 — scrollable table regions are not keyboard focusable

**`app/src/App.tsx:415` and one other `table-scroll` site.**

```tsx
<div className="table-scroll">
  <table>…</table>
</div>
```

A region that scrolls because its content overflows must be reachable by
keyboard, or a keyboard-only user cannot scroll it. The fix is
`tabIndex={0}` plus `role="region"` and an accessible name.

Axe has a rule for exactly this (`scrollable-region-focusable`) and it did not
fire, because jsdom reports zero dimensions for everything, so no element ever
appears to overflow. Another structural blind spot rather than an oversight.

**Effort: low.** Two sites, three attributes each.

### A-3 — the budget input's accessible name is not its visible label

**`app/src/App.tsx:1868-1882`.**

```tsx
<label className="budget-control" htmlFor="budget-hours">
  <span className="eyebrow">Available capacity</span>
  <input aria-label="Available staff-hours" id="budget-hours" … />
```

The visible label reads **"Available capacity"**. The `aria-label` overrides it,
so the accessible name is **"Available staff-hours"**. WCAG 2.5.3 (Label in
Name) requires the accessible name to *contain* the visible label text. A
voice-control user saying "click Available capacity" gets no match.

Axe cannot flag this: it has no way to know which visible text a `<label>`
wrapper was meant to name.

**Suggested fix:** drop the `aria-label` and let the `<label>` name it, or
change the visible text to "Available staff-hours". The `aria-describedby`
pointing at `#budget-help` is correct and should stay.

Worth sweeping the other 34 `aria-label` uses in the file for the same pattern;
I checked this one closely and spot-checked the rest.

### A-4 — the guide panel is a dialog and a live region at once

**`app/src/App.tsx:3724-3733`.**

```tsx
<div className="guide-panel" role="dialog" aria-labelledby="guide-title"
     aria-live="polite" ref={guidePanel} tabIndex={-1}>
```

Focus is moved into this element (`:1237`), *and* it is a polite live region,
*and* its entire contents are replaced on every step change. Screen reader
users get the panel announced by the focus move and again by the live region,
and on each step advance the whole panel re-announces rather than just what
changed.

**To be clear about what is right here:** the absence of `aria-modal` and of a
focus trap is **correct**, not a bug. This is a coach-mark that instructs the
user to operate the real controls behind it ("Your turn: …"), so trapping focus
would break the feature. Do not "fix" that. `Escape` is handled (`:864`) and
the step counter announces "← → keys · Esc stops", which is good practice.

**Suggested fix:** remove `aria-live` from the dialog container and put a
small visually-hidden `role="status"` elsewhere that announces only the step
change ("Step 3 of 9: <title>"). Keep the focus move.

### A-5 — the skip link does not skip to main

**`app/src/App.tsx:1847-1851`, `:2274`, `:2376`, `:2000`.**

```tsx
<a className="skip-link" href={view === "workspace" ? "#workspace" : "#drop-test"}>
<header className="topbar" id="main-content">
…
<main>                                   {/* no id */}
<section className="decision-section" id="drop-test" …>
```

Three problems in six lines:

1. `id="main-content"` is on the `<header>`, and nothing links to it. It reads
   like a vestige of an earlier skip target.
2. `<main>` has no `id`, so the skip link cannot target the landmark.
3. The link jumps to `#drop-test`, which is *inside* main and after other
   content, so a keyboard user is silently skipped past whatever precedes it.
   In workspace view it targets `#workspace` (`:2000`), a `<div>`.

Neither target has `tabIndex={-1}`, so in Safari and older WebKit the fragment
jump scrolls but does not move focus — the next Tab returns to the top of the
document. This is the classic skip-link failure.

**Suggested fix:** put `id="main-content" tabIndex={-1}` on `<main>`, point the
skip link at it unconditionally, and remove the id from `<header>`.

### A-6 — `--faint` fails AA on panel backgrounds

Computed from the tokens in `app/src/index.css:37-56`:

| Foreground | on `--bg` | on `--bg-raised` | on `--panel-solid` | on `--panel-soft` |
| --- | ---: | ---: | ---: | ---: |
| `--ink` #f2ede2 | 17.00 | 16.13 | 15.31 | 14.44 |
| `--ink-soft` #d1c9bc | 12.09 | 11.47 | 10.89 | 10.27 |
| `--muted` #a29a8e | 7.13 | 6.77 | 6.42 | 6.06 |
| **`--faint` #837d73** | 4.86 | 4.61 | **4.38 ✗** | **4.13 ✗** |
| `--amber` #f0ad4e | 10.20 | 9.68 | 9.18 | 8.67 |
| `--teal` #6ec3ca | 9.75 | 9.26 | 8.78 | 8.29 |
| `--green` #72d3a0 | 10.91 | 10.35 | 9.82 | 9.27 |
| `--red` #ff7b6c | 7.84 | 7.44 | 7.06 | 6.67 |

Everything passes 4.5:1 except `--faint` on the two panel surfaces. `--faint`
is used at 17 sites in `App.css`; the ones that matter are the `color:`
declarations (lines 395, 826, 1276, 1349, 1413, 1471, 1786, 1827, 2074, 2281,
2863, 3743) that land on a `.panel`-class ancestor. The `fill:`/`stroke:` uses
(1269, 1309, 1408, 1936) are non-text and only need 3:1, which they meet.

**Suggested fix:** lighten `--faint` to roughly `#8f8879` (≈4.9:1 on
`--panel-soft`) — one token change fixes every site. Note the four passing
combinations sit at 4.86 and 4.61, i.e. close enough that a future palette
tweak could push them under; a contrast unit test over the token pairs would
be cheap insurance and is the kind of thing this project already does
elsewhere.

Axe did not catch these because jsdom does not resolve CSS custom properties
through a stylesheet the way a browser does, so axe's colour-contrast rule is
effectively inert in this suite. Do not read the passing axe runs as contrast
coverage.

### A-7 — map-table headers have no `scope`

**`app/src/App.tsx:416-434`.** `<th>Neighborhood</th>` etc. in `<thead>`, and
`<th>{row.name}</th>` as row headers in `<tbody>`, with no `scope` attribute.

The digitization-audit tables at `:3183-3186` and `:3241-3244` *do* use
`scope="col"` correctly, so this is an inconsistency rather than a habit.
Add `scope="col"` to the three header cells and `scope="row"` to the row
header. Axe treats simple two-dimensional tables as inferable and does not
flag it, which is why it passes.

### A-8 — the inspector "tabs" are not tabs

**`app/src/App.tsx:2126`.** `<div aria-label="Inspector sections" role="group">`
containing buttons with `aria-pressed`. There are zero `aria-selected`, zero
`role="tab"`, and exactly one `aria-controls` in the entire file (on the
disclosures toggle at `:3779`).

A toggle-button group is a legitimate pattern and I am **not** saying this must
become a `tablist` — that would add arrow-key roving-tabindex obligations for
little gain. But the buttons should carry `aria-controls` pointing at the panel
they switch, so the relationship is programmatically determinable. Same applies
to the "View" group at `:1890` and "Map layer" at `:2003`.

### A-9 / A-10 — error signalling on the numeric inputs

`app/src/App.tsx:1524` renders the invalid-budget message with
`role="status"` (polite). An error should be `role="alert"` (assertive) so it
is not queued behind other announcements. The infeasible-plan messages at
`:2153` and `:3455` already use `role="alert"` correctly — again an
inconsistency, not a habit.

Neither numeric input sets `aria-invalid` when its value is rejected (0
occurrences of `aria-invalid` in the file). WCAG 3.3.1 is technically satisfied
by the visible text, so this is advisory rather than a failure, but it is two
attributes.

### A-11 — the print path is unverified

`app/src/print.css` (236 lines) hides content with `display: none !important`
at `:66` and `:117`. I could not verify what is dropped, whether any of it is
information with no printed equivalent (1.3.2), or whether link URLs and chart
content survive — that needs a real print render, which I cannot produce here.

**Flagging as an explicit gap in this audit rather than as a clean result.**
Someone should print the decision brief to PDF and read it.

---

## Non-visual equivalence for the spatial views — **passes**

Worth stating positively because it is the hardest thing on this list and it
was done properly:

- Every schematic map is paired with `MapTableDisclosure`
  (`App.tsx:412-437`), a real `<table>` with a `<caption>`, exposing
  neighborhood, value, and **state as a word** — not a colour name and not a
  colour swatch. The state words are what a screen reader user actually needs.
- Non-interactive maps use `role="img"` with an `aria-label` and a `<title>`
  (`:277`, `:304-310`, `:481`).
- Interactive map cells carry `aria-label={`${area.name}: ${value.text}`}`, so
  the value travels with the name.
- Colour is never the sole carrier of meaning in the map: fill opacity encodes
  intensity (`:336-341`) *and* the table carries the state word.

The gap is A-1 — reaching those cells by keyboard — not the equivalence itself.

## Also checked and clean

- **Focus indicator:** `outline: 2px solid var(--amber-bright)` at 3px offset
  (`index.css:129-132`). `#ffd287` on `--bg` is 14.00:1, far above the 3:1
  required by 1.4.11. Not suppressed anywhere except `App.css:1314`, which
  immediately substitutes a `:focus-visible path` treatment.
- **`prefers-reduced-motion: reduce`** honoured in both `index.css:140` and
  `App.css:1246`.
- **`forced-colors: active`** honoured at `index.css:151-157`, including a
  `Highlight`-based focus ring. This is rarer than it should be; credit due.
- **`<html lang="en">`** present (`app/index.html:2`).
- **Headings and landmarks:** `<main>`, `<header>`, `<footer>`, and
  `aria-labelledby` on sections (`:2376`).
- **Live regions:** six, used for genuine async updates, with `aria-live="off"`
  correctly set on the `<output>` at `:1411` that would otherwise chatter on
  every slider tick.
- **`role="alert"`** used for the two infeasible-plan states.

---

## What I could not determine

Stated so nobody reads this as a clean bill of health:

- **Nothing was tested in a real browser or with a real screen reader.** No
  browser automation available here. A-1 in particular needs Safari.
- **The print path (A-11).**
- **Zoom and reflow (1.4.10) at 400%**, and text spacing (1.4.12) — both need
  real layout.
- **Target size** — 2.5.5 is AAA in 2.1 so out of scope, but the map cells are
  irregular polygons and worth a look anyway.
- I audited the **deployed** `App.tsx`, not the ~12 in-flight feature
  components. Findings marked "moves" will need re-anchoring after
  decomposition; that is the reason this went ahead of items 2.3 and 2.4.

## Note on `PlannerPanel.a11y.test.tsx`

Its three axe assertions grade `features/planner/PlannerPanel.tsx`, which is
**not reachable from `main.tsx`** (see `review/phase0-2026-08-23.md` R-06/R-07).
That file's own header says it "mirrors" the shell checks, and `App.test.tsx`
does carry four real axe runs over the shipped shell — so shipped a11y coverage
is **not** zero, and I want to be clear I checked that rather than assumed it.
But if `PlannerPanel` is deleted during decomposition, three a11y tests go with
it and nothing is lost, because they were never testing the product.
