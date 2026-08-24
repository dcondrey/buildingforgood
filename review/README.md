# The review track

**Everything in this directory is a dated record, not a current claim.**

These are the working notes of an independent verification track that ran
against the build in parallel: adversarial reads, escalations, attack harnesses,
and point-in-time verdicts. They are published because the project's whole
argument is that its claims are checkable, and a review track nobody can read is
an assertion rather than evidence. But they were written to a moving target, and
several describe defects that have since been fixed.

**How to read a file here.** Take its date and its verdict as of that date.
Where a finding has since been closed, the file carries a **RESOLVED** stamp at
the top naming what closed it; the body below the stamp is left as it was
written, including any "Status: OPEN" line, because editing the body would
destroy the record of what was actually found. If a file has no stamp, do not
infer it is current — infer only that nobody has revisited it.

**The one file written to be read as current** is `RISK-REGISTER.md`. It is
ordered by severity, each item carries a status, and it has a section listing
what was closed. If you read one thing here, read that.

**What this directory is not.** It is not a security audit, not an accessibility
audit, and not an independent third party. It is the same author running an
adversarial process against their own work, in a separate worktree, with a rule
that the review track may not edit the product. That rule held, and it is
checkable rather than asserted: `git merge-base --is-ancestor review/parallel
main` fails, so no commit from the track is an ancestor of `main` — the nine
commits that exist on it have never been merged. What it buys is that findings
were written
down before they were fixed, and stayed written down afterwards — including the
ones that were embarrassing.

**Known gaps in the track itself**, stated here rather than left to be found:

- `attacks/` holds executable harnesses that `scripts/verify.sh` does **not**
  run — vitest's root is `app/`, and these sit outside it, so nothing collects
  them. They were written to falsify specific claims at specific commits, and
  several will not run against the current tree without adjustment. Treat them
  as evidence of what was attempted, not as a live suite.
- The track's own portability finding was void: it was measured by running an
  invented profile for an organization that does not exist. See
  `docs/project/DECISIONS.md`, 2026-08-23. No file here should be read as
  demonstrating portability to a non-San-Diego geography, because nothing has.
- `STATUS.md` describes the track as of build-session commit `6beb8de` and is
  not current.
