# Accessibility — WCAG 2.1 AA

Two passes are recorded here.

- **Pass 1**, the in-house axe sweep plus a measured contrast table, below
  under "Pass 1".
- **Pass 2**, the independent review track's audit
  (`review/accessibility-audit.md`, findings A-1 … A-11), below under
  "Pass 2". Its numbering is the review's, not pass 1's; the two schemes
  collide and are kept apart deliberately.

---

## Pass 2 — the independent audit, A-1 … A-11

Audited against `f8dd100`, before the view layer was decomposed. Five findings
were anchored to `App.tsx` line numbers that no longer exist; they are
re-anchored below to the files that now hold them.

### A-1 — the interactive map was not reliably keyboard-reachable — **fixed**

`app/src/features/spatial/AreaMap.tsx`.

The map used `<g role="button" tabIndex={0}>` inside the SVG. `tabindex` on a
non-`<a>` SVG child is not honoured consistently by WebKit, so the map was
reachable in Chromium and Firefox and possibly not in Safari — and the test
that said otherwise passes because jsdom has no focus model, not because the
element is reachable.

Keyboard reach no longer depends on that attribute at all:

- The `<svg>` is `aria-hidden="true" focusable="false"` when interactive. It
  paints; it is not in the accessibility tree and holds nothing focusable.
- A sibling layer of **real HTML `<button>` elements** — one per area,
  absolutely positioned over that area's label from the same viewBox
  coordinates the SVG draws with — carries the accessible name
  (`{area}: {value}`), `aria-pressed`, `onClick`, and the Enter/Space handler.
  Real buttons are focusable in every browser without a `tabindex` at all.
- The button layer is `pointer-events: none`, so a mouse click still lands on
  the polygon the reader can see; the `<g>` keeps its `onClick`. Keyboard and
  pointer reach the same `onSelect`, by different routes.
- Focus is visible **on the map**: the button takes the global focus ring, and
  its `onFocus`/`onBlur` set a `map-focused` class on the matching `<g>`, which
  restyles the polygon outline. Previously that highlight came from
  `:focus-visible` on the `<g>` itself, which is exactly the mechanism that was
  not firing.
- The container is `role="group"` with the map's `aria-label`, so the buttons
  are announced as a named set.

The tabular equivalent (`MapValueTable`) is untouched and still renders for
every map, with the state word carrying the meaning.

### A-2 — scrollable table regions were not keyboard focusable — **fixed**

All four `.table-scroll` containers now carry `tabIndex={0}`, `role="region"`
and an `aria-label` (the table's own caption text, so the name is not a second
wording of what is on screen):
`features/spatial/MapValueTable.tsx`, `features/forecast/ForecastSection.tsx`,
`features/cost/CostPieces.tsx`, `features/currency/CurrencyPanel.tsx`.

Axe's `scrollable-region-focusable` cannot fire under jsdom, which reports zero
dimensions for everything, so nothing ever appears to overflow.

### A-3 — the budget input's accessible name was not its visible label — **fixed**

`features/shell/TopBar.tsx`. The visible label read "Available capacity" while
`aria-label` made the accessible name "Available staff-hours", so a voice-control
user saying what they could read got no match (WCAG 2.5.3).

The visible text is now "Available staff-hours" and the input is named by
`aria-labelledby="budget-label"` pointing at that exact span — not by an
`aria-label` and not by the whole `<label>`, whose text also contains the unit
and the help sentence. `aria-describedby="#budget-help"` is unchanged.

### A-4 — the guide panel was a dialog and a live region at once — **fixed**

`features/guide/GuidePanel.tsx`, `app/src/App.tsx`.

`aria-live="polite"` is removed from the `role="dialog"` container. The panel
still takes focus, which is what announces it. A single visually-hidden
`role="status"` lives in `App.tsx`, outside the dialog and **always mounted**
(so the live region exists before its text arrives), and says only
`Step {n} of {total}: {title}`.

The absence of `aria-modal` and of a focus trap is deliberate and was left
alone: this is a coach-mark that tells the reader to operate the controls
behind it.

### A-5 — the skip link did not skip to main — **fixed, with one constraint**

`app/src/App.tsx`, `features/shell/TopBar.tsx`,
`features/workspace/WorkspaceView.tsx`, `features/evidence/DropTestSection.tsx`.

- `id="main-content"` is off the `<header>`, where nothing linked to it.
- `<main id="main-content" tabIndex={-1}>` in story view. The workspace root is
  now a `<main>` too — it was a bare `<div>`, so that view had no main landmark
  at all — carrying the same id and `tabIndex={-1}`.
- Both skip targets take focus: `#drop-test` and `#main-content` are
  `tabIndex={-1}`, so the fragment jump moves focus rather than only scrolling.
  Without that, the next Tab in WebKit returns to the top of the document.
- There are now two skip links: "Skip to decision" (the decision the reader
  came for) and "Skip to main content" (the whole landmark, for a reader who
  does not want to be skipped past the hero).

**Constraint worth naming.** `App.test.tsx:466-472` pins the *first* tab stop to
the text "Skip to decision" with `href="#drop-test"`. Making `#main-content` the
first or only skip target would fail that assertion, and this pass does not own
the test suite. The main-content link is therefore second rather than first,
which is the reverse of the usual convention. If the test is revised, swap the
order.

### A-6 — `--faint` below 4.5:1 on panel backgrounds — **fixed in pass 1**

See pass 1 below. `#837d73` → `#8a847a`. Not redone here.

### A-7 — map-table headers had no `scope` — **fixed**

`scope="col"` on every `<thead>` header cell and `scope="row"` on every row
header, in `MapValueTable`, `ForecastSection`, `CostPieces` and
`CurrencyPanel`. The digitization-audit and print tables already had it.

### A-8 — the inspector "tabs" had no `aria-controls` — **fixed**

Not converted to a `tablist`: a toggle-button group is a legitimate pattern and
the roving-tabindex obligations would buy nothing here. The relationship is now
programmatically determinable instead.

- Inspector buttons → `aria-controls="ws-panel"` on `.ws-body`
  (`features/workspace/WorkspaceView.tsx`).
- Map-layer buttons → `aria-controls="ws-map"`, a new wrapper around the map
  and its caption.
- View buttons → `aria-controls="main-content"` (`features/shell/TopBar.tsx`),
  which now exists in both views.

### A-9 — invalid-budget message used `role="status"` — **fixed**

`features/planner/PlannerPieces.tsx`: `role="status"` → `role="alert"`, matching
the two infeasible-plan messages that were already correct.

### A-10 — no `aria-invalid` on the numeric input that can be invalid — **fixed**

`features/shell/TopBar.tsx`: `aria-invalid={!budgetValid}` on the budget input.
The per-area hours inputs are not validated and are left alone.

### A-11 — the print path — **reproduced, and fixed**

The audit flagged this as unverified. Read against `app/src/print.css` and
`app/src/features/export/PrintablePlan.tsx`, three losses reproduce and one
does not.

**Reproduces — a closed `<details>` printed as nothing.** `print.css` forced
open exactly three classes (`.data-table-disclosure`, `.limitations-row
details`, `.brief-preview`). Every other `<details>` printed as a summary line
with its contents dropped, and paper has no disclosure triangle to open them
with: `.context-details` (including the geography provenance),
`.evidence-details`, `.bias-diagnostic`, `.digitization-audit-pages`, the
currency excluded rows, and `.ws-table`. Fixed with a general
`details > :not(summary) { display: block !important }`.

**Reproduces — scroll containers clip on paper.** `.table-scroll` is
`max-height: 20rem; overflow: auto` and had no print override, so every table
longer than 20rem printed truncated with no indication that rows were missing —
including the forecast values table, the one that exists to be the chart's
accessible equivalent. Fixed with `max-height: none; overflow: visible`.

**Reproduces — the chart printed without its key.** `.chart-legend` was in the
`display: none` list. It is `aria-hidden` and so has an equivalent for screen
reader users, but a *printed* chart with three line styles and no key is not
readable by anyone. Removed from the hidden list. Also removed:
`.disclosure-drawer`, which is in the DOM only because the reader opened it,
and is now given flow layout for print instead of being dropped (it is
`position: fixed` on screen, which cannot print).

**Does not reproduce — link URLs.** `a[href^="http"]::after { content: " ("
attr(href) ")" }` already prints them.

**Does not reproduce — the deliberate plan document.**
`PrintablePlan.tsx` under `body.printing-plan` is a self-contained document:
budget, floor, allocated total, source label and retrieval date, the disclosure
line, a full `scope`-d table, and the decision brief. Nothing in it is hidden by
the rules above.

**Still not equivalent, and left as-is:** the decision horizon
(`data.scenario.decisionHorizon`) appears only in the topbar, which print hides.
It is a scenario label rather than a number a reader traces, and unhiding a
`position: sticky` topbar costs more than it returns.

### F-8 — the map now states its own provenance

`PHASE0_FINDINGS.md` F-8: the outlines derive from a GeoJSON that appears in no
checksum file, and the organization profile marks `geography.boundaries`
`unresolved` for two independent reasons. That was visible only in the adoption
brief and in the `GeographyProvenance` disclosure, which sits under the planner
map and nowhere else.

Every schematic map now carries a caption of its own, in the quiet register the
rest of the page uses (mono, `--faint`, inside the map frame):

> These are schematic outlines, not surveyed boundaries. The publisher names
> its areas but publishes no boundary file; these shapes were derived from a
> private grid this project cannot pin to a checksum or re-obtain, and the
> deployment marks its boundary and adjacency sources unresolved. Read them as a
> diagram of which area is which, and never as where one area stops.

The earlier wording said "simplified neighborhood boundaries", which implied a
real boundary that had been simplified. `i18n.test.tsx` now requires every map
caption in every shipped locale to carry that locale's registered
`map.outlinePhrase`, and fails if the retracted wording returns.

Keys `map.provenance`, `app.skipToMain` and `guide.stepAnnounce` are in both
`en.ts` and `es.ts`; the Spanish follows the glossary in `docs/project/I18N.md`
and is scanned by both rule sets in `refusals.test.ts`.

### Verification for pass 2

- `./scripts/verify.sh` green; the 385-test suite passes unmodified.
- Axe (`wcag2a, wcag2aa, wcag21a, wcag21aa`) re-run over `document.body` in the
  states this pass restructured — map workspace, guide panel open, disclosure
  drawer open with the drop revealed — with zero violations, alongside the two
  runs already in `App.test.tsx`.
- Still not verified here, and still owed to a person: **a real screen reader,
  and Safari itself.** Everything a machine can settle about the other items has
  now been settled; what remains needs somebody's eyes and ears.

- **Safari's engine is checked; Safari is not.** Stage 7 runs five of the twelve
  viewports in WebKit as well as Chromium. On a phone that is not a
  nice-to-have: every iOS browser is WebKit underneath, so a layout checked only
  in Chromium is unchecked for most of the phones this will be opened on. Both
  properties hold there. This is the same engine, not the same browser — Safari
  adds its own chrome, its own zoom behaviour and VoiceOver — so the audit still
  owes a person the real thing.

- **The print render was checked and needs no change.** In print media the
  chrome is `display: none`, no near-white text survives onto white paper (0
  nodes), `.decision-section` drops its 42rem minimum height, and each section
  carries `page-break-before: always`. The large gap visible in a continuous
  render is a page boundary, not wasted paper.

- **Reflow (1.4.10) and text spacing (1.4.12) are no longer on that list.** They
  were, for the right reason: both need real layout and jsdom computes none. A
  browser now runs in `verify.sh` stage 7, so both are checked rather than
  gestured at.

  Reflow is checked at twelve viewports in both locales, 320px included — which
  is 400% zoom of a 1280px window, the width the criterion is written about.
  Nothing renders past the right edge at any of them. It found a real failure on
  its first run: the page did scroll sideways at 320px, because two chips were
  declared in the reflow allowlist as "a one-word chip" and are 47 and 45
  characters. The justification had never been checked against the rendering.

  Text spacing is checked by forcing the criterion's own four values — line
  height 1.5, letter spacing 0.12em, word spacing 0.16em, paragraph spacing 2em
  — at 320px, 768px and 1440px, then asserting no content is lost and nothing
  runs past the right edge. Character counts are identical before and after.

  What this still does not establish: both criteria are about loss of content or
  function, and a machine comparing character counts and bounding boxes cannot
  see a caption that has drifted away from its figure or a control that now
  overlaps another. It rules out the mechanical failures. A person looking at it
  remains worth more.

---

## Pass 1 — the in-house axe sweep

Audited 2026-08-23 against the shipped decision shell after the Phase 5
decomposition. Both findings below are fixed.

### Method

`axe-core` restricted to `wcag2a, wcag2aa, wcag21a, wcag21aa`, run over
`document.body` in six reachable states: story view initial, story view with
the drop revealed, disclosure drawer open, guide panel open, map workspace, and
projector mode.

Colour contrast was **not** taken from axe. axe cannot execute its
`color-contrast` rule under jsdom — it has no layout or computed style — and
reports the check as incomplete rather than as a pass. Ratios were computed
directly from the palette in `app/src/index.css` instead, so the result is a
measurement rather than an untested assumption.

### Result

Zero violations in all six states, after two fixes.

#### Pass-1 finding 1 — `aria-label` on elements with no role (WCAG 4.1.2)

Eight `<div>` elements carried an `aria-label` with no `role`. A plain `<div>`
has no implicit role, so an `aria-label` on it is prohibited by ARIA and is
ignored by screen readers: the label was written, shipped, and never announced.

Affected: `.composition-lead`, `.hero-decision`, `.component-proof`,
`.distribution-proof`, `.map-legend`, `.model-audit`, `.coverage-policy`, and
`.whatif-control`.

Fixed by adding `role="group"` to each, which is the correct role for a labelled
set of related content and makes the existing label valid. No label text
changed, so no copy decision was reinterpreted.

axe classified these as *incomplete*, not as violations. They would not have
appeared in a pass/fail summary.

#### Pass-1 finding 2 — `--faint` below 4.5:1 on panel backgrounds (WCAG 1.4.3)

This is the same defect the independent audit filed as **A-6**.

Measured contrast of every palette foreground against every opaque background:

| foreground | `--bg` | `--bg-raised` | `--panel-solid` | `--panel-soft` |
| --- | ---: | ---: | ---: | ---: |
| `--ink` | 17.00 | 16.13 | 15.31 | 14.44 |
| `--ink-soft` | 12.09 | 11.47 | 10.89 | 10.27 |
| `--muted` | 7.13 | 6.77 | 6.42 | 6.06 |
| `--faint` (was `#837d73`) | 4.86 | 4.61 | **4.38** | **4.13** |
| `--amber` | 10.20 | 9.68 | 9.18 | 8.67 |
| `--amber-bright` | 14.00 | 13.29 | 12.61 | 11.90 |
| `--teal` | 9.75 | 9.26 | 8.78 | 8.29 |
| `--teal-bright` | 13.65 | 12.95 | 12.29 | 11.60 |
| `--green` | 10.91 | 10.35 | 9.82 | 9.27 |
| `--red` | 7.84 | 7.44 | 7.06 | 6.67 |

`--faint` is used in 17 rules, all normal-size body text inside panels —
`.data-table-disclosure thead th`, `.map-caption`, `.robustness-caveat`,
`.capacity-note`, and `.digitization-audit-pages caption` among them. Normal
text requires 4.5:1, so those combinations failed.

Fixed by `#837d73` → `#8a847a`: hue and saturation unchanged, HSL lightness
0.482 → 0.510. The smallest change that clears 4.5:1 on every background
(worst case now 4.55). Every other pair already passed and none was touched.

### Not covered by pass 1

- Contrast of colours composited over `--panel` (`rgba(19, 24, 28, 0.94)`) and
  the `-dim` accent fills depends on what sits behind them at render time. The
  opaque backgrounds bound the realistic cases and all pass.
- Keyboard operation and focus order are covered by a manual protocol, not by
  axe: `docs/track-c/C-05-keyboard-smoke-test.md`. It still has to be run by a
  person.
- Screen-reader announcement of the live plan region was not verified with a
  real screen reader.
