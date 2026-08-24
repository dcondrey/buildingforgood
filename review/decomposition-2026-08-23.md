# Review: Phase 5 decomposition (`431ea08` → `3e82f92`)

**Verdict: PASS.** Independently verified by rendered-output diff, not by
reading the code and not by trusting the suite.

`App.tsx` went from 3,065 lines to 53, moving ~24 `useState` hooks and a
1,950-line return into `features/shell/useShellState.ts` (711 lines) plus
twelve feature components, with state delivered through `ShellContext` instead
of a prop chain.

---

## What I did

The brief says: "Diff rendered output before and after. Any visual or
behavioural difference is a regression regardless of how the code reads now."

I built my own capture harness rather than reusing the build session's
(theirs was `app/src/__render_snapshot.test.tsx`, since deleted). Two detached
worktrees at `431ea08` and `3e82f92`, each with an **identical copy** of the
same `node_modules` tree so library versions cannot differ, and an identical
test file dropped into both.

The harness renders `<App />`, drives a scripted interaction, and after each
step serializes the container with:

- **every element's attributes re-sorted alphabetically**, so DOM
  attribute-set order cannot masquerade as a difference;
- React `useId` values (`:r3:` and friends) normalized in `id`,
  `aria-labelledby`, `aria-controls`, and `aria-describedby`, since those are
  allocation-order-dependent and not semantic;
- one tag per line, so a diff is readable.

Harness: `review/attacks/render-diff.test.tsx`.

## Result

```
$ diff before2.txt after2.txt ; echo $?
0

  8202 before2.txt
  8202 after2.txt
```

**Byte-identical across 8,202 lines and eight interaction states.**

| State captured | Serialized length |
| --- | ---: |
| 01 initial | 38,903 |
| 02 budget changed to 120 | 38,857 |
| 03 coverage floor → 0h (guard off) | 39,069 |
| 03 coverage floor → 4h | 38,868 |
| 03 coverage floor → 8h (default) | 38,859 |
| 04 disclosure drawer opened | 40,190 |
| 04 switched to map workspace | 14,761 |
| 04 switched back to story | 40,180 |

The lengths matter as much as the diff: they confirm the interaction actually
moved the app through genuinely different states rather than re-capturing one
screen eight times. All three coverage-floor settings produce visibly different
output (39,069 / 38,868 / 38,859), and the workspace view is a third the size
of the story view.

## The regression they caught, independently confirmed fixed

The commit message says the rendered diff caught "a real regression the test
suite did not: the disclosure drawer rendered unconditionally instead of behind
`disclosuresOpen`."

Confirmed at `3e82f92`:

| State | `id="disclosures"` present? |
| --- | --- |
| 01 initial | **no** |
| 02 budget 120 | **no** |
| 04 after clicking "Data & limits" | **yes** |

Correctly conditional. And the same is true at `431ea08`, which is why the diff
is clean — the fix landed before the commit, as stated.

**Worth dwelling on, because it is the strongest evidence in this whole review
that the process is working.** A 181-test suite, four axe runs, and a
characterization safety net all stayed green while the privacy-and-limitations
drawer rendered unconditionally. Only the rendered diff caught it. That is the
argument for keeping rendered diffs in the workflow rather than treating them
as a one-off Phase 5 tool.

## What this does and does not establish

**Establishes:** for these eight states, the decomposition is semantically
transparent. No text, attribute, ARIA relationship, role, or element ordering
changed. Accessibility properties in particular are preserved exactly, which
was my main worry going in — moving 1,950 lines of JSX across twelve files is
where `aria-labelledby` targets and heading order normally get quietly broken.

**Does not establish:**

- **CSS.** I diffed DOM, not paint. Class names are identical, so this is
  low-risk, but a changed stylesheet import order would not show up here.
  `App.css` is unchanged in the commit, so I am not worried.
- **The drop-test reveal path.** My harness looked for a reveal button by
  regex and found none, so no `03b` state was captured. The evidence-reveal
  and plan-generation flow is **not** covered by my diff. `App.test.tsx`
  covers it behaviourally, and the build session's own eight-step capture
  included "reveal drop" and "copy the brief", so between us it is covered —
  but not by me, and I am not going to claim it.
- **The guide flow, scenario workbench, intervention explorer, and print
  path.** Not exercised.
- **Anything after `3e82f92`.** `7cb4771` landed on top.

## One consequence for other review files

`review/accessibility-audit.md` anchors its findings to `App.tsx` line numbers
from `f8dd100`. Those are now dead — `App.tsx` is 53 lines. I flagged this
risk in `review/STATUS.md` before the commit landed, and it has now landed. The
findings are still valid; the anchors need re-pointing:

| Finding | Was | Now |
| --- | --- | --- |
| A-1 SVG focusability | `App.tsx:304-334` | `features/spatial/AreaMap.tsx` |
| A-2 scrollable regions | `App.tsx:415` | `features/spatial/MapValueTable.tsx` |
| A-3 label-in-name | `App.tsx:1868-1882` | `features/shell/TopBar.tsx` |
| A-4 dialog + live region | `App.tsx:3724-3733` | `features/guide/GuidePanel.tsx` |
| A-5 skip link | `App.tsx:1847-1851` | `features/shell/TopBar.tsx` |
| A-7 table `scope` | `App.tsx:416-434` | `features/spatial/MapValueTable.tsx` |
| A-8 tab semantics | `App.tsx:2126` | `features/workspace/WorkspaceView.tsx` |
| A-9/A-10 error signalling | `App.tsx:1524` | `features/planner/PlannerPieces.tsx` |

A-6 (contrast) is in `index.css` and unaffected.

## Note on the decomposition and the "six" problem

Separate finding, recorded in full at `review/config-abstraction-2026-08-23.md`
C-2 and repeated here because it is a property *of this commit*: six of the new
files hardcode "the six neighborhoods" in user-facing copy, three of them as
accessible names (`features/planner/PlannerSection.tsx:46,93`,
`features/workspace/WorkspaceView.tsx:70,72,73`,
`features/guide/guideSteps.ts:70`).

Since the diff is byte-identical, those strings were carried across verbatim
rather than introduced — the decomposition faithfully preserved an existing
problem, which is exactly what a behaviour-preserving refactor should do.
Flagging only so it is fixed deliberately in a later commit rather than
being read as new.

Counter-example from the same commit, showing the pattern is understood:
`features/planner/PlannerPieces.tsx:75` computes
`${data.areas.length * coverageFloor} of ${budget} hours are set aside first`
— parameterized on area count, not hardcoded. The seam exists; six strings
just did not get moved onto it.

## Cleanup

The two comparison worktrees (`/Users/davidcondrey/Documents/shr-before`,
`shr-after`) were removed after the diff. Neither the main checkout nor the
build session's tree was touched at any point.
