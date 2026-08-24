# Decisions

Choices that would otherwise look like accidents of implementation. Each is
dated, has a stated reason, and names what would change it.

## 2026-08-23 — `planning_load_derivation` defaults rather than failing

`pipeline/src/stillhere_pipeline/contracts.py` treats a missing
`planning_load_derivation` on a `planner.allocations[]` row as
`forecast_upper_bound` rather than refusing the artifact.

That makes the strongest refusal guard in the project opt-out by omission: a
writer that has never heard of the field produces an artifact that validates.

**Kept for one release, deliberately.** Every artifact written before this
change lacks the field, and a hard failure would refuse the shipped
`demo.v1.json` and every pinned monitoring artifact at once, with no migration
path for an adopter mid-refresh.

**What changes it.** Once the refresh path has written a full artifact carrying
the field at least once — that is, after one complete monthly cycle on the new
contract — omission becomes a hard failure. The default is removed, not
loosened further.

**Why this is written down.** An adversarial review found the default and asked
whether it was intended. It was, but nothing said so, and a compatibility
shim that nobody records becomes a permanent hole that everybody assumes is
load-bearing.

## 2026-08-23 — the refusal claim is stated narrowly

The product previously claimed that complaint volume cannot influence planning.
An independent review showed that claim was false as stated: complaint counts
written into `planning_load` reached the shipped allocator and materially
re-ranked the plan, because the guards matched field *names* and a number
carries no name.

The artifact boundary now checks a declared derivation by arithmetic against a
value already in the same document, which closes that route. It does not close
the route where an attacker also rewrites `forecast.areas[].upper` so the two
reconcile — but that means smuggling a number through the pipeline past pinned
checksums, which is a different and much harder problem.

**The claim the project makes, and will defend:**

> Complaint volume cannot reach allocation without also corrupting the
> published forecast interval, which is derived from checksummed inputs.

**Not:** "complaint volume cannot influence planning."

The narrower claim is true, verifiable, and survives an adversary. The broader
one did not.

## 2026-08-23 — cost per person is refused by allowlist, not denylist

The first version of the cost guard was a denylist of words meaning "human
being". A review defeated it with this project's own vocabulary:
`cost_per_sleeper` passed, because `SleeperType` is a real exported type in
`normalize.py`, as did `cost_per_household`, which appears on the actuals
schema's own never-compute list.

A cost figure must now name a denominator from an enumerated set — hour,
staff-hour, area, plan, shift — and anything else is refused. An allowlist has
a bounded, checkable definition. A list of words for "person" does not.

**Known limit, stated rather than hidden.** Dividing a permitted cost by a
permitted engagement count produces a per-person figure that never gets a name,
and no field-level guard can see an expression. What the allowlist guarantees
is that no such figure can be **stored, exported, or displayed** by the system.
That is the claim; nothing broader is made.

## 2026-08-23 — an invented organization, and the geography rule that follows

A previous session added a second example profile,
`config/profiles/coldwater-valley-rural.v1.json`, describing a place that does
not exist. It is worth writing down in full, because the reasoning that
produced it was careful and the result was still a fabrication in a repository
about real homelessness in a real city.

**What was invented.** A "Coldwater Valley Continuum of Care," described as a
fictional three-county river valley with one small city of roughly 30,000
people, a highway corridor, and dispersed settlements. Nine named areas —
Coldwater City Core, Mill Flats, North Bench, Riverside Corridor, Junction
Yards, Eastgate Township, Pine Hollow, South Valley, and a Federal Forest
Margin listed out of scope — carrying an area-list version string
`coldwater-valley-illustrative/2026-08-23`. A ten-pair adjacency table the
profile said the organization had drawn itself, carrying its own version
string. A 132 staff-hour budget over a fourteen-day cycle, a ten-hour coverage
floor, two-hour allocation blocks, two teams. A loaded rate of $39.75 per
staff-hour attributed to a finance director, with a basis explaining that it
divided personnel plus vehicle and mileage by budgeted field hours rather than
paid hours "since roughly a fifth of a rural team's paid time is spent driving
between areas rather than in them." None of that was a fact about anywhere.

**Which commits, and when.** Introduced in `84327bf`, "Phase 4: organization
profiles, actuals ingest, and a cost layer," 2026-08-23 14:07. It reached the
profile file, `config/README.md`, `docs/project/ORGANIZATION_PROFILE.md`, and
two test files that asserted against its invented area ids. A review-track
document, `a124984` at 14:02, was already describing it five minutes before it
landed on `main`. Removed in `0113a1f`, "Replace the invented organization with
a real published geography," 2026-08-23 17:36. It was on `main` for about three
and a half hours.

**Labelling it did not make it acceptable.** It was labelled at every level
this schema offers, and every label was accurate. The organization name ended
"(illustrative example — not a real organization)". The scope statement opened
"ILLUSTRATIVE EXAMPLE ONLY. This profile describes a place that does not
exist." `profile_status` was `illustrative_example`. All three geography
components carried `resolution_status: "illustrative"`, and the area list's
`resolution_rule` read "This entry never resolves. It is replaced, not
upgraded." A complete and honest set of disclaimers on invented area names,
an invented adjacency table, and an invented cost basis, sitting in the same
repository as real Downtown San Diego Partnership counts and a real public
records request. The disclaimers were not the problem and could not have been
the fix.

**It was also unnecessary.** The stated reason for inventing a place was that
inventing area boundaries for a real jurisdiction would fabricate exactly the
unsourced geography this project's provenance markers exist to flag — so the
session avoided a small fabrication about a real place by committing a larger
one about a place it made up. The repository already held a second real
geography: the publisher's own seven areas, transcribed with their reported
totals in `data/monitoring/dsdp_public_checkpoints.csv` and cited to the same
pinned June 2026 report the reference profile already used. That is what
`config/profiles/san-diego-dsdp-seven.v1.json` now is.

**The cleanup did its own damage.** `0113a1f` removed the profile and, in the
same pass, substituted `rural` for `sevenArea` through two documents without
reading the sentences it was changing. Three passages then described the real
San Diego seven-area profile as fictional, one described a "sevenArea county,"
and one offered `riverside-county-outreach` and `north_bench` as example
identifiers — places that do not exist, reintroduced by the commit that
removed them. Repaired in `7e7a0db`, checked field by field against the
profile. Two fabrications in this repository have now come out of mechanical
text substitution rather than out of anyone deciding anything.

**Where it is, stated precisely.** It has not reached `origin`. A pickaxe
search across the full history of every remote ref returns nothing, and none
of the commits carrying it are ancestors of `origin/main`. That is not because
it was cleaned up before publishing. It is because nothing recent was
published at all: `origin/main` is thirty-one commits behind local `main`, and
the whole episode — the fabrication, its removal, and this record — sits in
unpushed local history.

It is in local `main`. `config/profiles/coldwater-valley-rural.v1.json` is in
the tree of fifteen commits there, from `84327bf` (which added it) to
`28dfcf8`, and `0113a1f` deleted it. `6327124` and `42e8a95` are two of the
fifteen and both touch documents that name it. `a124984` also carries the name
but is not on `main`; it is on the local, never-pushed `review/parallel`
branch, which holds the fabrication across sixteen files at tip `1e89be0` and
is checked out as a separate worktree. GitHub Pages deploys only from
`origin/main` (`.github/workflows/deploy-pages.yml`), so no deployed page has
ever carried it.

**It is being published anyway, and that is a decision.** The repository owner
chose to push the history as it stands, `84327bf` included, rather than squash
it, filter it, or rewrite the branch. Erasing it was available — nothing had
been pushed, so no rewrite would have broken anyone's clone — and it was
declined. The reasons: the evidence and its record should ship together, and
a history that has been cleaned cannot afterwards be shown not to have been.
Once pushed, the fabricated profile is permanently retrievable from the public
repository by SHA and visible in GitHub's commit list.

**What a reader who checks out `84327bf` will find.** An organization profile
for a rural multi-county Continuum of Care that does not exist: eight in-scope
areas with invented names, an invented scope statement describing an invented
three-county river valley, a self-drawn adjacency table, a 132 staff-hour
budget, and a $39.75 loaded hourly rate with an invented basis. None of it
corresponds to any real place, organization, or figure. This entry is the
explanation attached to it, and it is the reason that commit is legible rather
than only damning.

**The portability evidence is void.** The demonstration that this tool is
portable to another organization's geography came from running the invented
profile. It proved that the loader accepts a file somebody wrote, which is not
the claim anyone cared about. Nothing in this repository has demonstrated
portability to a non-San-Diego geography. The two profiles that exist are both
San Diego and both sourced to the same pinned Downtown San Diego Partnership
report. That is now declared, with the boundary of what it does not cover, in
`config/portability-demonstrated.v1.json`.

**What changes going forward.** A profile's area list must resolve to a pinned
published source — `resolution_status: "resolved"` with a named publisher,
source, version, and retrieval date — and no geography component may be marked
`illustrative`. The schema states it at `geography.area_list.provenance`
through a `pinnedProvenance` definition, and
`app/src/domain/config/geographyProvenance.test.ts` enforces it against every
file in `config/profiles/`, so an unpinned profile cannot ship. The loader
enforces it too: `validateProvenance` now takes the set of statuses each
geography component may use — `resolved` alone for the area list,
`resolved | provisional | unresolved` for boundaries and adjacency — so a
profile whose geography resolves to no published source fails to load instead
of rendering confidently. That gap was written into this entry as an open
failing test before it was closed; it is recorded here because the sequence
matters, not because it is still true. Operating parameters — a floor, a
shift length, a horizon, a team count — remain an adopter's own choices and may
still vary between example profiles, because varying them is configuration
rather than fabrication. The line is between a fact about the world and a choice about how
to work, and only the first has to be sourced.

**What would change this decision.** A published area definition for a
non-San-Diego geography, cited and retrievable, would let a third profile
demonstrate portability for real. Nothing short of that does.

## 2026-08-23 — the evidence layer is a methods exhibit, the planning layer is the portable part

**The decision.** Switching organization profiles changes the area list, budget,
coverage floor, allocation increment, shift length, team count, planning horizon
and loaded rate, and changes the plan that follows from them. It changes nothing
in the evidence layer. The observations, the balanced panel, the forecast, the
digitization audit, the reporting-bias check and the robustness sensitivities
come from one artifact built from one pinned Downtown San Diego Partnership
report, fetched from one fixed path with no profile in it. That is now the
declared architecture rather than an accident nobody had written down.

**Why it was a defect to leave implicit.** An adopter loading their own profile
could not tell whether they were getting a working evidence layer or an empty
one. `applyDeployment` rewrites the scoped areas and the scenario and passes
every evidence field through untouched — `currency`, `source`, `signal`,
`forecast`, `evidence`, `qualityAudit`, `reportingBias`, `robustness`,
`limitations`. Rendered side by side, both profiles produce a byte-identical
hero lede, composition strip and 261-block panel line. That was true before this
entry; the only thing that has changed is that it is now pinned by a test and
stated out loud.

**Why not make evidence profile-scoped.** It is not reachable from here.
Per-profile evidence requires the Python pipeline to run on another publisher's
data, and `config/portability-demonstrated.v1.json` declares that
undemonstrated. What building it anyway would produce is an evidence layer
shaped like a capability and empty of one — a worse failure than the one being
fixed, and the same failure as the invented profile: a thing that looks like
proof and is not.

**Two consequences, both accepted.** Per area, the refusal already works: an
area the artifact carries no observation for renders as carrying none, takes the
guaranteed minimum and no forecast weight, and says so. In aggregate the
evidence keeps San Diego's own labels, so under the seven-area profile the
header names seven areas while the currency panel names the six-area downtown
core. Both statements are true of different things. Fixing the header made that
seam visible rather than hidden, which is the right direction; it now has to be
disclosed on screen rather than left for the reader to reconcile.

**What would change this decision.** A published dataset for a non-San-Diego
geography that the pipeline could actually derive from, which is the same
condition that would make the portability claim real. Until then an adopter gets
a working planner over their own geography and San Diego's methods exhibit
beside it, and is entitled to be told which is which before they look.

## 2026-08-24 — a gate nobody has watched fail is not a gate

**The decision.** Every gate in `verify.sh` must have a known-bad input it has
been observed failing on, and that input lives in the repository as a test. A
gate without one is treated as unproven regardless of what it prints.

**Why, four times over.** The same defect appeared in four unrelated places in
two days, and in every case the symptom was a green check:

- `mutation_check.sh` graded a mutation as caught when the suite failed, with no
  check that the suite was green first. A suite already red caught everything.
  Two agents reported ten of ten over a red suite before anyone noticed.
- The claim inventory's `--pytest-summary` returned "unreconciled" when the file
  it was handed did not exist, so a broken `mktemp` would have left the skip
  ledger asserting nothing behind a passing stage.
- `tests/pipeline/test_monitoring_data.py` returned early when its input was
  absent and pytest reported it **passed**. Its cross-check against the
  publisher's totals had never once executed.
- `verify.sh` itself could not run on Linux at all — `mktemp -t NAME` is a
  prefix on BSD and a malformed template on GNU — so every green run had been
  on the one platform CI does not use.

None of these was a bug in what the gate checked. Each was a bug in whether the
gate ran, and no amount of testing the *logic* would have found them.

**What this rules out.** Adding a check and observing it pass. Passing is not
evidence; a check wired to nothing passes too. The evidence is watching it fail
on an input it should reject, and keeping that input.

**Where it stands today.** The mutation gate has ten mutants and now refuses to
run over a red baseline. The claim inventory has fourteen negative cases,
including the three added when check 7 landed — one of which initially passed
for the wrong reason, its fixture being YAML where the checker reads JSON, and
was caught only by a positive control. The privacy scanner has its leak
fixtures. The portability lint added here has one known-bad line per rule, and
its first fixture is not invented: it is the literal line that shipped and broke
CI, verified against `50498bb` where the linter finds all three real
occurrences — two more than the CI run did, because CI stopped at the first.

**What is still unproven, and named rather than left.** The refusal suite and
the adversarial harnesses have no injected-failure fixture of their own; they
are covered indirectly, by the mutation gate's complaint-signal mutant and by
having been watched failing during the session that wired them in. That is
weaker than a fixture and should become one.

**What would change this decision.** Nothing about it is cheap to hold — every
new gate costs a fixture. The alternative is what the four cases above cost,
which was more.

## 2026-08-24 — San Diego is the scope, not a first instance

**The decision.** This tool is for San Diego. Running it on another
organization's geography may be a future effort; it is not a goal now, and the
project will not carry it as an open gap, a risk, or a direction of travel.

**What changes.** The risk register listed "nothing has demonstrated this works
on another geography" as a high-severity risk, on the reasoning that it was the
claim most likely to drive an adoption decision that then fails. That reasoning
only holds if portability is being offered. It is not, so the entry becomes a
declared non-goal. The evidence layer being San Diego's stops being a seam to
disclose apologetically and becomes simply what the product is.

**What does not change, deliberately.** The portability declaration in
`config/portability-demonstrated.v1.json`, the claim it bounds, and the build
check that fails when a broader claim appears — all stay. Under a San-Diego-only
scope they cost nothing to keep and they are exactly what stops a portability
promise reappearing in a document by accident. The configuration layer also
stays configurable: that is how the two profiles express the publisher's
six-area core and its full seven-area geography, both of which are San Diego.

**What the effort goes into instead.** More and better San Diego data, and
features that make the plan more useful to a San Diego program director. The
investigated options, with what was executed to check each, are in
`DATA_OPPORTUNITIES.md`.

**What would change this decision.** A real San Diego organization asking to run
it on their own geography — which is a conversation, not a backlog item.
