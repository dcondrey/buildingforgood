<!-- repo-header:start -->
<img src="https://github.com/dcondrey.png?size=160" alt="The review track logo" width="120" align="left">

<h1>The review track</h1>

<p><strong>Documentation for The review track in Buildingforgood.</strong></p>

<br clear="left">

[![CI](https://img.shields.io/github/actions/workflow/status/dcondrey/buildingforgood/verify.yml?style=flat-square&labelColor=20232a&branch=main&label=CI)](https://github.com/dcondrey/buildingforgood/actions/workflows/verify.yml) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14402/badge)](https://www.bestpractices.dev/projects/14402) [![License](https://img.shields.io/github/license/dcondrey/buildingforgood?style=flat-square&labelColor=20232a&color=007ec6&label=license)](https://github.com/dcondrey/buildingforgood/blob/main/LICENSE) [![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-Sponsor-EA4AAA?style=flat-square&labelColor=20232a)](https://github.com/sponsors/dcondrey)
<!-- repo-header:end -->

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

**`attacks/` is now a live suite, and that changed after this README was first
written.** It used to be true that nothing ran these: vitest's root is `app/`
and they sit outside it, so shipping them meant shipping adversarial tests CI
never executed — a claim with nothing behind it. They now run as stage 4 of
`scripts/verify.sh`.

Making them run meant confronting what they assert. Thirteen of the forty-six
were failing, and **none of them was a live regression**: five were fixtures
that predated a hardening (a share link that now requires all eight fields; a
planning load that must now declare a permitted derivation), and eight asserted
that an attack *succeeded* — they were characterisations of holes, several
carrying the comment "documenting reality, not endorsing it". Every one of those
holes has since been closed, so each now asserts the refusal instead, naming the
mechanism. The shipped error for two of them cites this file's own attacks C and
D by name: the product was hardened in response to these harnesses and nobody
came back to update them.

A failure in stage 4 means an old hole has reopened. The product suite would not
necessarily notice, because these attacks were built from outside it.
- The track's own portability finding was void: it was measured by running an
  invented profile for an organization that does not exist. See
  `docs/project/DECISIONS.md`, 2026-08-23. No file here should be read as
  demonstrating portability to a non-San-Diego geography, because nothing has.
- `STATUS.md` describes the track as of build-session commit `6beb8de` and is
  not current.
- `patches/` was a directory in the working tree and is **not** in the
  repository, because it is empty and git does not record empty directories.
  Nothing was removed to make it so and nothing is hidden by it; it is named
  here because a reader who saw it referenced elsewhere would otherwise be left
  wondering what was dropped.
- `accessibility-audit.md` is titled "audit" and is a self-assessment. The
  distinction matters and is stated at the top of that file.
