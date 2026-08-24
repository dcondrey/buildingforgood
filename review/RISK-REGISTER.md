# Risk register

**For:** an organization deciding whether to adopt this, and the person who
would have to answer for it afterwards.

**Ordered by severity** — what it costs if it goes wrong for an adopting
organization — not by what an evaluator is likely to notice. The previous
version of this document was explicitly ordered the other way, for a meeting.
That ordering is a real thing the author needed, but it is not a risk register,
and keeping the two jobs in one document meant the most dangerous item on the
list was whichever one looked worst rather than whichever one was worst. The
meeting ordering is preserved at the end.

Each item: what it is, in one sentence a non-engineer understands · what it
costs if it goes wrong · its status today · the honest framing, where saying it
first is the whole mitigation.

**The rule this document encodes:** everything here is survivable if you say it
first. Nothing here is survivable if they find it and you look surprised.

**Status legend.** `OPEN` — live, no mitigation beyond disclosure. `BOUNDED` —
live, with a stated ceiling on what it can cost. `DISCLOSED` — a permanent
limitation, written down where the reader meets it. `CLOSED` — fixed and
enforced by something that fails if it regresses.

---

## 1. The privacy control may fail in a way nobody has found yet

**Severity: highest.** Consequence is harm to unhoused people, which is not
recoverable and not compensable. Everything else on this list costs money,
credibility, or time.

**Status: BOUNDED.**

**What it is.** The check that decides which numbers are too small to publish
infers, from the shape of the file, which numbers are counts of people. That
inference has been reviewed six times and every review found a real flaw. The
documents say to assume a seventh exists.

**What it costs if it goes wrong.** A small cell reaches the deployed artifact
and a person in a named area in a named month becomes identifiable.

**Why it is bounded rather than open.** The ceiling is now written down and it
is narrow: nothing below the suppression threshold is published today; the
published grain is area-by-month totals with no person records anywhere in the
pipeline that reaches deployment; and the upstream source is already public at
individual point precision, so the worst realistic case is republishing, more
coarsely, something already obtainable more precisely from the publisher. The
deploy job independently re-scans the exact bundle it is about to publish.

**Three things that would flip the bound**, and they are the ones to watch: a
non-public source, a finer published grain, or a person-level record entering
the pipeline. Any of those and the ceiling in `SECURITY.md` section 3 stops
holding and an adopting organization must draw the boundary itself.

**Honest framing:** *"The control is imperfect and we say so. Here is the most
it could cost — and here is the sentence that stops being true if you feed it
different data."*

**Do not soften the admission.** Bound it. "Assume a seventh exists, here is
the ceiling" is defensible; the admission alone is a documented notice problem
with no stated limit, which is what a general counsel actually reacts to.

---

## 2. One maintainer

**Severity: high**, and unlike most of this list it is certain rather than
probable. An organization that builds a monthly routine on this is exposed to
one person's continued interest.

**Status: DISCLOSED.**

**What it costs if it goes wrong.** The monthly refresh stops working after an
upstream change and nobody can fix it. The plan an organization is making
staffing decisions from silently becomes the last plan that worked.

**Why disclosure is the honest mitigation.** The security policy commits only
to what one person can honour: five business days to acknowledge, fifteen to
assess, no fix deadline except a confirmed live data leak, which is taken down
first and diagnosed second. Everything needed to run or to leave is in the
repository — the monthly routine, the governance document, the configuration
schema, and a written account of what it costs to walk away.

**Honest framing:** *"One maintainer, and the commitments are scoped to what
one person can keep. The exit path is written down because the succession risk
is real."* The brief has a section titled "What it costs to walk away." Point
at it before they ask.

---

## 3. Nothing has demonstrated this works on another organization's geography

**Severity: not a risk — a declared non-goal, as of 2026-08-24.** This tool is
for San Diego. Running it on another geography may be a future effort and is not
one now, so there is no adoption decision resting on a premise that could fail.
It stays on this list only so that nobody re-derives it as a gap and starts
building for it.

**Status: OUT OF SCOPE.** What must remain true is narrow: no document may
*promise* portability. The declaration that bounds the claim, and the build
check behind it, stay exactly as they are — under a San-Diego-only scope they
are cheaper to keep than to unwind, and they are what stops the promise
reappearing by accident.

**What it is.** The tool can be configured for a different set of areas, and
that genuinely works — areas, budget, floor, shift length, increment, team
count and the resulting plan all change with no code change. But it has only
ever been demonstrated on two profiles, and **both are San Diego, sourced to
the same publisher's report.**

**Why the earlier evidence is void.** Portability was previously demonstrated by
running an invented profile for a Continuum of Care that does not exist. That
demonstrated the loader accepts a file somebody wrote, which is not the claim
anyone cared about. See item 10 and `docs/project/DECISIONS.md`.

**What now enforces the boundary.** `config/portability-demonstrated.v1.json`
states the claim, names the two profiles it rests on, lists five things it does
not cover, and fails the build if a broader claim appears on any surface. An
area list must now resolve to a real published source or the profile does not
load.

**What would close it.** A published area definition for a non-San-Diego
geography, cited and retrievable. Nothing short of that.

**Honest framing:** *"The planning layer is configuration, and I can show you
that. What I cannot show you is that it works on your geography, because nobody
has run it on one. Here is exactly what has been demonstrated and where it
stops."*

---

## 4. The evidence on the page is San Diego's, under every profile

**Severity: low, and correct by design.** Under a San-Diego-only scope the
evidence layer being San Diego's is not a seam, it is the product. This entry
stays because the *page* must still say which layer is which — an operator
reading a plan should know the analysis above it is a methods exhibit — but
there is nothing here to fix.

**Status: DISCLOSED, and intended.**

**What it is.** Switching profiles changes the plan. It changes nothing in the
evidence layer — the observations, the panel, the forecast, the digitization
audit and the robustness checks come from one artifact built from one pinned
report, fetched from one fixed path with no profile in it.

**What it costs if it goes wrong.** An adopter believes the analysis describes
their city. It describes San Diego.

**Why it is declared rather than fixed.** Per-profile evidence needs the
pipeline to run on another publisher's data, which item 3 declares
undemonstrated. Building it anyway would produce an evidence layer shaped like
a capability and empty of one — the same failure as the invented profile.

**What now says so.** The page's own lede names the evidence as San Diego's
methods exhibit before the first numeral, in both languages, enforced by a
test. Per area the refusal already worked: an area the artifact carries no
observation for renders as carrying none and takes the guaranteed minimum with
no forecast weight.

**The visible seam, accepted.** Under the seven-area profile the header names
seven areas while the currency panel names the six-area downtown core. Both are
true of different things. Fixing the header made the seam visible rather than
hidden, which is the right direction.

**Honest framing:** *"Switch the profile and watch the planner change
completely. Now watch the top of the page: it still tells San Diego's story,
and it says so. The planning layer is portable; the analysis layer is a methods
exhibit. I would rather show you the seam than have you find it."* Do it in the
first five minutes.

---

## 5. A push can deploy without the checks having passed

**Severity: medium-high**, and it is the only item on this list that can put a
regression of any *other* item onto the public site.

**Status: CLOSED, and observed in both directions.**

**What it was.** The deploy workflow ran on push to `main` with no dependency on
the verify workflow, so a push that broke the refusal suite, the claim
inventory, the mutation gate or the test suite still deployed. `SECURITY.md`
invites reports of "a way to reach the deploy job without passing `verify.sh`" —
the document anticipated this; it simply was not closed.

**What closed it.** Deploy now triggers on `verify` completing for `main` and
refuses to run unless that run's conclusion was success — a finished workflow is
not a passing one. Checkout pins the commit verify actually graded rather than
whatever `main` points at when the job starts. `workflow_dispatch` stays ungated
as the deliberate manual path.

**What has actually been seen, on 2026-08-24.** Two pushes had `verify` fail —
a portable-shell bug and a macOS-only assertion, both of which had never run on
Linux — and the deploy job was **skipped** both times. The third push had verify
pass and the deploy publish, and the live bundle carries that commit's strings.
So the gate has been watched refusing twice and permitting once.

**The residual limitation is that the failure mode is silent.** A gate that
refuses everything looks identical to a working one until somebody notices the
site has not changed in a month. If `verify` ever stops running on push to
`main` — a trigger edit, a rename, a path filter — deploy never fires and
nothing complains. Nothing monitors that, and nothing here proposes to; the
mitigation is that this paragraph exists and the deploy history is public.

**The mitigation that already existed** and is unchanged: the deploy job
independently privacy-scans the exact bundle it is about to publish, with
`--require-bundle`. That is why item 1, the highest-severity risk here, was
gated at deploy time even while the rest were not.

---

## 6. The published file can be checked but not rebuilt

**Severity: medium.** It does not cause harm; it caps how much independent
verification a third party can do.

**Status: DISCLOSED.**

**What it is.** Every input has a recorded fingerprint and anyone can prove the
published file matches them. But five of those inputs were supplied privately
and cannot be redistributed, so a third party can check the file and cannot
rebuild it.

**What it now costs, visibly.** Fifteen Python tests skip on every clean
checkout for exactly this reason. They are registered with their reasons in the
claim inventory's skip ledger, and the count cannot drift without someone
saying why — so the cost appears as a number rather than being absorbed into a
green suite.

**Honest framing:** *"Verifiable, not reproducible, and the difference matters.
You can confirm the published file matches its recorded inputs; you cannot
rebuild it, because the source files belong to the data owner. The pipeline is
fully reproducible against a synthetic fixture in the repository, so the
behaviour is auditable even where the data is not."*

This is stated in the brief in the harshest available terms. Take credit for
that in the room.

---

## 7. Accessibility findings are open, and it was never audited by a person

**Severity: medium.** Real exclusion of real users, and a hard failure against
grant conditions that require an audit.

**Status: OPEN, claim CLOSED.**

**What it is.** Automated testing reports zero violations across six screens and
contrast was measured directly. A self-assessment against WCAG 2.1 AA raised
eleven findings; several remain open. No third-party audit has been
commissioned.

**What changed.** The brief previously said "audited," which invites the
conclusion that the findings were addressed. It now says self-assessed, names
the open count, and points at `docs/project/ACCESSIBILITY.md`. The two Level A
findings were fixed.

**Honest framing:** *"Zero automated violations, and automated tools
structurally cannot see the two hardest problems. Manual keyboard and
screen-reader testing has not been done by a person, and I am not going to call
that verified until it has. If your grant conditions require an audit, this is
not one."*

---

## 8. The map's outlines have no verifiable source

**Severity: low-medium.** Nothing in the tool depends on where one area stops
and the next begins, so the operational harm is small; the credibility harm is
not, because provenance discipline is the project's whole pitch.

**Status: DISCLOSED (F-8).**

**What it is.** The publisher names its six areas and publishes no map of them.
The outlines were drawn from a file supplied privately, with no recorded source,
date, or checksum, that cannot be re-obtained.

**What changed.** The caption previously said "simplified neighborhood
boundaries," implying a real boundary that was simplified. Both locales now
derive one shared provenance phrase, so the caption states what it is and the
Spanish cannot drift from the English.

**Honest framing:** *"The map is an illustration, not a surveyed boundary, and
the interface says so. The areas are real and published; the outlines come from
an input I cannot pin, which is why nothing in the tool depends on them."*

---

## 9. The site says its data is out of date

**Severity: low.** It is a feature. It is on this list because it looks like a
defect to anyone who does not know why.

**Status: working as designed.**

**What it is.** The modelled window ends before the newest observations,
because those observations are deliberately excluded from the model on five
documented grounds — the publisher moved from monthly to irregular quarterly
counting, count dates are contested between the publisher's own dashboard and
its own report, at least one count was redone with different results, the values
are multiplier-adjusted estimates rather than people, and they come from the
same collector as the training data, so they are not independent confirmation.

**What changed.** The badge previously read "Current through {month}" — which a
hurried operator reads as *this is current* — and described the publisher as
"on cadence" or "overdue," asserting a publication schedule the artifact
explicitly refuses to claim. It now reads "Data through {month}" and describes
the artifact's own freshness threshold rather than the publisher's intentions.
Verified this session: all three pinned source documents were fetched live and
matched their recorded hashes, and the publisher has released nothing newer.

**Honest framing:** *"That badge is a feature and I would be worried if it were
green. The refresh command fails if anyone tries to flip that flag to make the
site look current. Currency you buy by lowering the standard is not currency."*

**This is the strongest item on the list.** It is the one place the discipline
is visible, enforced in code, and costs something. Lead with it if the room is
skeptical.

---

## 10. A fabricated organization is in the published history

**Severity: low operationally, high reputationally**, and it is deliberate.

**Status: recorded by decision.**

**What it is.** A previous session invented a rural multi-county Continuum of
Care — eight in-scope areas with invented names, an invented three-county
valley, a self-drawn adjacency table, a 132-hour budget and a $39.75 rate with
an invented basis — and shipped it as an example profile. It was removed from
the product, but it is present in the tree of fifteen commits on `main`.

**The decision.** The repository owner chose to publish that history rather than
rewrite it, at a point when nothing had been pushed and erasure was still free.
The record in `docs/project/DECISIONS.md` names the commits so that a reader who
finds one has a path to the explanation.

**What it cost.** The portability evidence — see item 3.

**Honest framing:** *"It happened, it is in the history, and the history is
published on purpose with the explanation attached. Erasing it was available and
was declined."*

---

## Closed this session

Listed because a register that carries fixed items as open is the same defect it
exists to catch.

- **The scenario header asserted a geography independent of the profile.** Now
  derived from the loaded profile, enforced against the class: any hardcoded
  area count or place name fails a test on at least one profile.
- **A guard that read only English.** One shared bilingual vocabulary behind
  every guard; a locale without refusal vectors breaks the build.
- **The README carried a withdrawn broad refusal claim** while the brief carried
  the narrow one.
- **A shared plan link failed silently** when a mail client wrapped it in angle
  brackets.
- **The mutation gate reported ten of ten over a red suite.** It graded "caught"
  from the suite failing, with no baseline check, so a suite already failing
  caught everything. It now refuses to run unless the suite is green first.
- **A live mutation was sitting in the working tree** with the complaint-signal
  guard disabled, left by an interrupted run whose restore never fired.
- **A test that had never executed** reported passed while its cross-check sat
  behind an early return and then behind an undeclared dependency.
- **An unsourced geography could load.** The loader now requires the area list
  to resolve to a real published source.
- **The adversarial harnesses were shipped but never run.** They are stage 4 of
  `verify.sh` now. Thirteen of forty-six were failing; none was a live
  regression — five stale fixtures, and eight that asserted an attack succeeded
  and now assert it is refused.

---

## Appendix: ordered for the room

The previous ordering — by what an evaluator is most likely to notice — with
the three pre-meeting fixes it named. **All three are now done**, which is why
this is an appendix rather than the document.

1. ~~`README.md:80`, the superseded broad refusal claim~~ — fixed.
2. ~~The English-only guards~~ — fixed.
3. ~~The map caption implying a boundary source~~ — fixed.

For a conversation, the noticeability order is still the useful one: lead with
item 4 (the seam, demonstrated by you in the first five minutes), then item 9
(the stale badge, your strongest), then item 1 with its ceiling. Items 2 and 3
answer the two questions a program officer always asks last.

Everything here is a disclosed limit, and disclosed limits do not lose rooms.
Surprises do.
