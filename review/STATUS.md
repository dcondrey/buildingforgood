# Independent review track — status

**Branch:** `review/parallel`, in a separate git worktree at
`/Users/davidcondrey/Documents/stillhere-review`. The main checkout is
untouched — no source changes anywhere, at any point. `review/` and
`docs/adoption/` are mirrored into the main checkout as untracked files so this
file is readable from there; the worktree copy is authoritative.

**Last updated:** 2026-08-23, against build-session commit `6beb8de` plus its
uncommitted working tree.

---

## Escalation 3 — RESOLVED (raised and closed 2026-08-23)

Three of five refusal guards read only English while the app shipped Spanish.
`assertNoComplaintSignal` accepted `quejas_recibidas`, `denuncias`,
`reportes_recibidos`, `linea_de_atencion`; the cost guard accepted
`coste_por_persona` and `por persona atendida`; the share link accepted Spanish
complaint area ids. Closed in `280cabf` with one shared vocabulary module behind
all five guards and the compile-time chain generated from the same array.
**Verified closed on all 24 original vectors, with zero over-refusals on 11
legitimate keys.** Five residuals recorded in
`review/verify-escalation3-2026-08-23.md` — none escalation-grade; V-1
(`per-person` hyphenated, English) and V-4 (prose path is a denylist where the
key path is an allowlist) are the two worth acting on.

---

## Escalation 2 — RESOLVED

`main` was red at `6beb8de` (tsc 8 errors, 31 tests failing, shell crashed on
render, `ExcludesComplaintSignal` unexported so two compile-time guards proved
nothing). Fixed by the build session in `5924ed6`, verified green. Original
report kept at `review/ESCALATION-2-main-is-red.md` for the record.

<details><summary>original</summary>

### 🚨 ESCALATION 2 — `main` does not compile (raised 2026-08-23, after your ack)

**`review/ESCALATION-2-main-is-red.md`. Read this before anything else in here.**

At a pristine detached checkout of `6beb8de`: `tsc -b` fails with 8 errors and
**31 App tests fail — the shell crashes on render** at `CostPieces.tsx:36`,
because `useShellState.ts` has no `planCost` (grep count: 0). Introduced by
`84327bf`, carried through `4096910` and `6beb8de`. `scripts/verify.sh` cannot
have passed on any of the three.

Second consequence: `ExcludesComplaintSignal` is not exported from
`planner/types.ts` at `6beb8de`, so the compile-time complaint guards in
`domain/actuals/types.ts:18` and `domain/config/types.ts:17` **do not compile
and prove nothing** in the committed state.

**Your working tree already fixes both** — `tsc -b` from `app/` is clean there.
Commit it (or revert the cost wiring) before doing anything with my findings.

</details>

---

## Escalation 1 — ACKNOWLEDGED, and the fix is landing

**`review/ESCALATION.md`.** Acknowledged as F-7. Your `PLANNING_LOAD_DERIVATIONS`
work in the working tree **blocks Attack C** — verified by re-running it:

> `ContractViolation: planner allocation for 'City Center' declares planning_load
> 980.0 derived from forecast.areas[].upper, but that value is 193.0.`

Right fix, right error message. **Attack C2 still gets through** — write the
payload into `forecast.areas[].upper` as well and the two reconcile. I do not
think you should chase that the same way; see
`review/person-denominator-2026-08-23.md` for why, and for the claim I think
you can defensibly make instead.

---

## Reviews completed

| Date | Subject | Verdict |
| --- | --- | --- |
| 08-23 | Phase 0 — characterization net, mutation gate, baseline | **FAIL** → largely remediated, see follow-up |
| 08-23 | Mutation gate after the rewrite | **R-02 fixed. R-03 open.** Gate still exits 1 |
| 08-23 | Phase 5 decomposition (`431ea08`→`3e82f92`) | **PASS** — byte-identical rendered output |
| 08-23 | Organization-profile abstraction | **PASS with findings**; **FAIL** on "runs a different geography with no code change" |
| 08-23 | Cost layer, once it surfaced | **PASS** on framing, **FAIL** on enforcement |
| 08-23 | Accessibility, WCAG 2.1 AA | 11 findings; strong baseline |
| 08-23 | **`ExcludesPersonDenominator<T>`** (you asked) | **FAIL** — same value-shaped hole, plus three more |
| 08-23 | `main` at `6beb8de` | **FAIL** → fixed in `5924ed6` |
| 08-23 | **`features/share/planShareState.ts`** (you asked) | **PASS** on the allowlist, **FAIL** on silent degradation |

### Still open, in priority order

1. **SH-1 / SH-2 — a shared link degrades silently.** Six realistic email
   manglings (`&amp;`, line-wrap truncation, a trailing period) all yield the
   **default plan with no notice**. And 3 of 7 fields silently default while 4
   refuse: dropping `rate` moved a plan's cost from **$7,500 to $5,400**, and
   dropping `share` set the clearance assumption to **100% — the maximum, not a
   neutral value**. `review/share-link-2026-08-23.md`.
2. **E-1 — `cost / engagement.count` = cost per contact.** Both operands are
   correctly-named, schema-legal, type-guarded fields; neither guard fires.
   `actuals/v1` supplied the person-shaped denominator the system previously
   did not have. Also: E-3, the regex misses `cost_per_sleeper` — this
   project's own word — plus `_household`, `_bed`, `_case`, `_enrollee`. And
   E-4, **neither guard walks a `Map` or `Set`**, which applies to
   `assertNoComplaintSignal` too. `review/person-denominator-2026-08-23.md`.
3. **R-03 — RESOLVED.** Both equivalent mutants removed with the reasoning
   recorded, replaced with two that change behaviour. Ten of ten caught and the
   number now means something. Original analysis:
   `scripts/mutation_check.sh:63-78`. `budget-conservation check disabled` and
   `a coordinator lock loses to the computed value` are unkillable: verified
   structurally *and* by brute force (2,988 and 4,119 inputs, zero
   differences). "Add a test that fails for each" cannot be satisfied. A
   required CI check that can never go green is one people learn to ignore, and
   this one guards the refusal suite. **Recommended: replace both with
   observable mutations of the same properties** — mutate `!locks.has(area.id)`
   → `locks.has(area.id)`, and mutate `remaining` → `remaining - 1` instead of
   the assertion that catches it. Detail in
   `review/mutation-gate-followup-2026-08-23.md`.
4. **D-1 — cost-layer test coverage.** `cost.test.ts` now exists (thank you);
   `refusals.test.ts` still has zero occurrences of `cost`/`per person`. No `cost.test.ts`, and
   `refusals.test.ts` contains zero occurrences of `cost`, `per person`,
   `per-person`, `loaded_hourly`, or `domain/cost`. The "never per person"
   refusal and the "same plan at every rate" claim are both prose. Same pattern
   as F-1, in a brand-new module. `review/cost-layer-2026-08-23.md`.
5. **C-1 / C-2 — the config abstraction does not run yet, and the
   decomposition carried "six" forward.** Nothing outside `domain/config/`
   imports the profile loader. Six new files hardcode "the six neighborhoods"
   in user-facing copy, three as accessible names. The diff proves these were
   carried across verbatim, not introduced. `review/config-abstraction-2026-08-23.md`.
6. **Accessibility A-1 and A-2** (both WCAG 2.1.1 A, keyboard):
   SVG `<g role="button" tabIndex={0}>` may not be focusable in Safari, and
   scrollable table regions are not focusable at all. Both invisible to axe
   under jsdom for structural reasons. Anchors re-pointed to the new feature
   files in `review/decomposition-2026-08-23.md`.
7. **Geography** — `scripts/gen_area_outlines.py:20` reads
   `Downtown_BlockGrid.geojson` from a hardcoded `/Volumes/A/` path. Not in
   `checksums.sha256`, not in the ledger's file list, not in `fetch_raw.sh`.
   The shipped map derives from it. `review/geography-provenance.md`.

---

## Independent queue

| # | Item | Status |
| --- | --- | --- |
| 2.1 | `model_eligible` pin investigation | ✅ `review/model-eligibility-findings.md` |
| 2.2 | Geography provenance | ✅ `review/geography-provenance.md` |
| 2.3 | Data governance | ⏭️ **dropped deliberately — see below** |
| 2.4 | Operator runbook | ✅ `docs/adoption/RUNBOOK.md` |
| 2.5 | Accessibility audit | ✅ `review/accessibility-audit.md` |
| 2.6 | i18n readiness work order | ✅ `review/i18n-readiness.md` |
| 2.7 | RTFH tract-geography feasibility | ✅ `review/rtfh-transfer-feasibility.md` |

### 2.3 — dropped, and why

Your `docs/project/DATA_GOVERNANCE.md` already addresses my brief's audience
("the person who has to sign off on running this tool inside an organization")
and every item on my list, with file-and-constant citations. Writing a second
overlapping document would have been duplication, not independence. **I
verified yours instead**; results below. If you want a separate
`docs/adoption/` copy for a different audience, say so and I will write it.

**Claims I checked against code, all confirmed:**

- "No backend, no accounts." Exactly one `fetch` in the whole app
  (`lib/demo.ts:939`), same-origin via `BASE_URL`. Zero analytics, beacons, or
  third-party requests.
- Client-only storage. Four `localStorage` keys, all preference or policy
  settings. `scenarioStore.ts` stores **only** budget/floor/guard/locks — no
  derived values, no observations — and its header says so accurately.
- Your §5.2 admission that **`demo.v1.json` carries no `contract` block** is
  correct; I confirmed the top-level keys. Shape inference does govern the
  deployed artifact, exactly as you state. Crediting this specifically: it is
  the least flattering fact in the document and it is stated in bold.
- One export path only: `navigator.clipboard.writeText(decisionBrief)`. No
  downloads, no file writes, no share targets.

The document is more honest than most governance documents I would expect to
review, and I could not find a claim in it that the code does not support.

### 2.1 — the answer, since currency work is live

**Keep April/June 2026 pinned `false`.** Five independent grounds. Three of
them — contested count dates, multiplier-adjusted units, same-publisher
non-independence — rest on the published PDF alone and do not depend on the
partial-from-memory personal communication. Sharpest point: the headline is a
**January 2026** forecast replay and no January 2026 observation exists.

Confirmed nothing was relaxed: `git log --follow` shows one commit each for
both monitoring CSVs, values never edited. Your `_validate_currency`
`observed_not_model_eligible` lane *strengthens* the pin.

**One review note on it:** `excluded_from` must be non-empty but its contents
are unconstrained, so `["nothing_in_particular"]` would pass. Pin it against
`source_ledger.yaml → artifact_lineages.public_monitoring.excluded_from`.

---

## Credit where it is due

Findings are the job, so the other half needs saying explicitly:

- **The rendered diff caught a real regression 181 tests missed** — the
  disclosure drawer rendering unconditionally. I confirmed it independently and
  confirmed it is fixed. That is the strongest evidence in this review that the
  process works, and it is an argument for keeping rendered diffs rather than
  retiring them with Phase 5.
- **The decomposition is byte-identical** across 8,202 lines and eight
  interaction states, including all three coverage-floor settings, with
  attributes sorted and React `useId` normalized. 3,065 lines of `App.tsx`
  moved with zero semantic drift.
- **`7cb4771` corrected Phase 0's own errors** rather than defending them, in a
  commit message that states them plainly. F-1's 42% became a measured 60%.
- **The mutation-script fix is better than what I suggested** — the `needle == repl`
  guard is wired into the apply step, and `SETUP FAILED` now fails the gate
  instead of silently shrinking it.
- **The structured-provenance design** (`resolution_status` + mandatory
  `resolution_note`, with no way to record a source as a bare version string)
  is the single best decision in the config work. It converts the geography
  problem from a hidden gap into a disclosed one.
- **The refusal suite** is far broader than the guard: a semantic copy scan for
  reworded forbidden claims, an allocation-module identifier scan, and a
  source-ledger orphan check. Its "semantics, not sentences" rule is right.

---

## Corrections to my own findings

Recording these so nobody works from a stale claim of mine:

- **I was wrong that shipped a11y coverage was zero.** I inferred it from
  `PlannerPanel.a11y.test.tsx` grading an unreachable component.
  `App.test.tsx` carries four axe runs over the shipped shell with the full
  `wcag2a/2aa/21a/21aa` tag set. Corrected in the audit.
- **My cost-layer finding is superseded.** The config review said the rate
  "surfaces nowhere yet." It surfaces now.
  `review/cost-layer-2026-08-23.md` replaces that section.
- **Accessibility line anchors are stale** after `3e82f92`. Re-pointed to the
  new feature files in `review/decomposition-2026-08-23.md`.

## Two small factual notes on your commit text

Neither changes a conclusion; both are quotable:

1. `7cb4771`'s message and `scripts/mutation_check.sh:32-37` both say the old
   gate "reported 10 of 10 caught" / "reported 'caught' while testing an
   unmutated file." It reported **SURVIVED** and exited 1 — I have the run in
   `review/artifacts/mutation-baseline.txt`. The old failure mode was a false
   *positive*, which is the safer of the two, and the project should get credit
   for that rather than describe itself as having had a false negative.
2. `config/README.md:93` and `config/profiles/san-diego-downtown.v1.json:48`
   describe the private geometry as a "block-**centroid** grid." It is
   polygons — `gen_area_outlines.py` iterates coordinate rings and computes
   per-block bounding boxes, and `privacy.py:209` calls them "382 block
   polygons." The profile string is adopter-facing.

---

## Working notes

- I run tests only in isolated worktrees with their own `node_modules` copies.
  I have never run `npm install`, never run the mutation script outside my own
  worktree, and never written to your tree.
- Attack and verification harnesses are in `review/attacks/`, outside the
  product suite: the four-path complaint bypass, the post-fix re-verification,
  the equivalent-mutant brute force, and the render-diff capture.
- No patches in `review/patches/`. Every finding names a suggested fix in
  prose; none was worth pre-writing as a diff, and the two that might be
  (R-03, D-1) are design calls that are yours.

## Disagreements on record

None. Every finding so far has been either accepted or is still being worked.
