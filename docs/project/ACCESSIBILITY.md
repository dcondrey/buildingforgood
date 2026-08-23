# Accessibility audit — WCAG 2.1 AA

Audited 2026-08-23 against the shipped decision shell after the Phase 5
decomposition. Both findings below are fixed.

## Method

`axe-core` restricted to `wcag2a, wcag2aa, wcag21a, wcag21aa`, run over
`document.body` in six reachable states: story view initial, story view with
the drop revealed, disclosure drawer open, guide panel open, map workspace, and
projector mode.

Colour contrast was **not** taken from axe. axe cannot execute its
`color-contrast` rule under jsdom — it has no layout or computed style — and
reports the check as incomplete rather than as a pass. Ratios were computed
directly from the palette in `app/src/index.css` instead, so the result is a
measurement rather than an untested assumption.

## Result

Zero violations in all six states, after two fixes.

### Finding A-1 — `aria-label` on elements with no role (WCAG 4.1.2)

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

### Finding A-2 — `--faint` below 4.5:1 on panel backgrounds (WCAG 1.4.3)

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

## Not covered here

- Contrast of colours composited over `--panel` (`rgba(19, 24, 28, 0.94)`) and
  the `-dim` accent fills depends on what sits behind them at render time. The
  opaque backgrounds bound the realistic cases and all pass.
- Keyboard operation and focus order are covered by a manual protocol, not by
  axe: `docs/track-c/C-05-keyboard-smoke-test.md`. It still has to be run by a
  person.
- Screen-reader announcement of the live plan region was not verified with a
  real screen reader.
