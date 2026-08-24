# Dry run: executing `docs/adoption/RUNBOOK.md` literally

**I wrote this runbook, which makes this the least independent thing in the
review folder.** I have tried to compensate by executing the documented
commands rather than recalling what they do, and by checking every UI string
the runbook names against `app/src/i18n/en.ts` rather than against memory.
Where the runbook is wrong, it is wrong because I wrote it from the code
instead of from the product.

**Verdict: usable, with one step that will stop a non-developer cold and four
places where the product has moved past the document.**

---

## R-1 — §2 will look broken on the first run

**Severity: high. This is the one that stops someone at 7am.**

The runbook says:

```sh
./scripts/refresh.sh --dry-run     # always first
```

What it does not say is what `scripts/refresh.sh:25-28` actually does the first
time:

```sh
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
.venv/bin/pip install --quiet -e "pipeline[dev]"
```

A first run creates a Python virtual environment and installs a package tree.
On a cold machine that is minutes of apparent silence, and if it fails — no
`python3`, no network, no write permission — it fails with a **pip** error, not
a refresh error, and nothing in the runbook mentions pip.

The runbook's failure table covers `REFRESH FAILED:` messages. It has no row for
"it printed something about pip and stopped," which is the most likely first
failure a non-developer will ever see.

**Fix:** add a §2 preamble — "the first run installs its own tools and may take
several minutes with no output; this is normal. If you see an error mentioning
`pip`, `venv`, or `python3`, stop and call your technical contact: the tool has
not run yet and nothing has changed."

**What did work.** I ran the underlying command directly and the documented
summary line is accurate:

```
REFRESH OK: {"generated_at": "...", "mode": "fixture", "next_publication_expected": "2026-09",
             "observed_not_model_eligible_months": ["2026-03", "2026-06"],
             "source_data_through": "2025-12", "status": "stale", "written": false}
```

All four fields the runbook tells the operator to read are present and mean what
it says they mean. `--help` self-describes. That part of §2 is sound.

## R-2 — §10 names a button that does not exist, and omits why it is greyed out

**Severity: medium. Both halves matter.**

The runbook says **"Copy the decision brief."** The button says
**"Copy decision brief"** (`i18n/en.ts:569`). A literal follower scanning for
the runbook's phrase does not find it. Small, and exactly the kind of thing a
dry run exists to catch.

Worse: `PlannerPieces.tsx:524-529` renders it `disabled={!planReady}`. **The
button is greyed out until a plan has been generated**, and the runbook does not
say so. Someone following §10 before §6/§7 finds a dead button and no
explanation. Add: "this stays greyed out until you have a plan on screen."

## R-3 — §6 presents the floor options as fixed; they are now profile-derived

**Severity: medium, and it will become high for the second adopter.**

The runbook gives a table of "three settings you can pick — 0h, 4h, 8h."

That is correct **for the San Diego profile only**. `deployment.ts:162-165`
computes `floorOptions(profile.operations.coverage_floor_hours)` as
`{0, round(floor/2), floor}`. Verified: the reference profile's 8-hour floor
yields `[0, 4, 8]`; the published seven-area profile's 6-hour floor yields
`[0, 3, 6]`. Both are pinned in `deployment.test.tsx:28,70`.

An operator at any organization other than the reference one opens the runbook,
sees "0h, 4h, 8h," sees different buttons, and reasonably concludes the runbook
is for a different tool.

**Fix:** describe the three settings as *none / half / your organization's
minimum*, and say the numbers come from the configuration profile.

## R-4 — the runbook predates two shipped features an operator will meet

**Severity: medium.**

**The share link.** A coordinator emailing a plan to a colleague is a core
workflow, and it shipped after I wrote this. The runbook says nothing about it.
It especially needs to cover the refusal notice, because that is the one moment
the tool tells the operator something surprising: if a link was mangled in
transit, the recipient now sees an explicit "this link could not be read"
message naming the field. An operator who has not been told that exists will
read it as an error in the tool rather than as protection.

Needed: a §10b covering how to share a plan, that a link only opens against the
same area list it was built for, and that a refusal notice means *do not use
this plan* rather than *the tool is broken*.

**The language toggle.** English/Español is in the top bar. Not mentioned.

**The profile switch.** `?profile=<id>` changes the whole deployment. Not
mentioned — arguably correct for a single-organization operator, but the
evaluation checklist points at it, so an operator may be asked about it.

## R-5 — §11's contact table is blank by design, with no instruction for when it stays blank

**Severity: medium, and this is the 7am case the brief asked about.**

The runbook ends with a table of four roles to fill in and says "write the four
names in here." If nobody filled it in — which is the realistic state on the
first monthly run — the operator at 7am has a table of blanks and no next step.

**Fix:** add a line above the table: "If this table is still blank, do not
publish anything. Stop and contact whoever gave you this tool. An unfilled
table means nobody has agreed to own a failure yet."

## R-6 — §2's `verify.sh` step is heavier than described

**Severity: low.**

The runbook says "`./scripts/verify.sh` — before publishing anything," in the
same register as the two commands above it. `verify.sh` runs format checks,
lint, typecheck, the Python suite, the TypeScript suite, a production build, and
the privacy scan. On a cold machine that is a long, noisy run that will also
attempt `npm` work.

For the audience this runbook names — "not a developer" — this step is not
theirs. Either mark it explicitly as the technical contact's step, or drop it
from the operator path and keep it in `REFRESH.md` where the developer-facing
version already lives.

---

## What held up

Checked against the shipped code and correct:

- **§1 staleness.** `CurrencyBadge` renders in the top bar (`TopBar.tsx:41`),
  and `stale` is the current, correct state for the reference deployment. The
  runbook's insistence that stale is not a fault is right and is the single most
  useful paragraph in the document.
- **§2 summary-line reading.** All four fields present, correctly named,
  correctly interpreted.
- **§2 failure table.** Every `REFRESH FAILED:` message it lists exists in
  `REFRESH.md` and in the code paths.
- **§5 "insufficient evidence" is an answer.** Matches `drop_test.py`'s forced
  classification and the reason it is forced.
- **§6 the equity-floor explanation.** Matches `PlannerPieces.tsx` and the
  unmet-hours display. The "an area given nothing looks quieter and earns
  nothing again" reasoning is the same argument the brief makes.
- **§7 locks and their cost.** Matches `allocateHours` behaviour, including the
  refusal when locks plus floors exceed the budget and the refusal when
  everything is locked below the budget.
- **§8 what not to do.** Matches the enforced refusals; the "the refresh command
  fails if you flip the flag" claim is enforced in `_validate_currency`.
- **§9 scenarios.** `MAX_SAVED_SCENARIOS = 8` — verified, still 8. Stored
  settings only, browser-local — verified in `scenarioStore.ts`.
- **§11 "no server to be down."** Verified: one same-origin `fetch`, no
  analytics, no accounts.

## What I could not test

- **Whether a real operator can follow it.** I know the code; that is exactly
  the bias this exercise cannot remove. The findings above are the ones a
  literal reading surfaces, not the ones a confused reader would.
- **The print path.** Still unverified, as in the accessibility audit.
- **The refresh against the real bundle** (`--source bundle`), because the
  organizer files are not in the repository. I ran `--source fixture`.
