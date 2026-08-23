# Still Here SD — adoption brief

For a board deciding whether to take this on, written for someone who will
never open the repository. The [operator runbook](RUNBOOK.md) is the
month-to-month detail; the [evaluation checklist](EVALUATION_CHECKLIST.md) is
what your program director and your counsel should verify before signing.

## What it does

Your outreach team has a fixed number of staff-hours next week and more places
than it can cover. This tool proposes how to split those hours across a named
list of areas — in the shipped configuration, 80 hours across six — shows the
evidence behind the proposal, and hands the decision back to a person.

It first audits the count you would otherwise take at face value. In the
reference deployment the published downtown estimate fell 22.3% in a year, but
on the same fixed set of blocks, direct observations of individuals rose 7.5%
and appeared on 25 more blocks: the drop came from tents, not from people. It
then states what it does not know, by replaying a past forecast against its own
past errors, so the uncertainty on screen is measured rather than asserted. The
observations behind all of it are visual street counts of what is present on a
block, adjusted by a multiplier — estimated person-equivalents, not a census of
people, not verified service needs, not program outcomes.

One design choice deserves the board's attention. Every area in scope is
guaranteed a minimum first, 8 hours by default; only the remainder follows the
forecast. An area given nothing produces no observations, looks quieter, and
earns nothing again — the floor stops the tool from writing off a neighborhood
and then citing its own silence as evidence. The screen always shows what that
cost in hours. A coordinator can lock any area to a number they know better,
and if locks and floors exceed the budget the tool produces no plan and says
so rather than quietly shaving hours to fit.

## What it refuses to do

The refusals are the reason to adopt this rather than a dashboard, and they are
enforced by code and build gates rather than by policy language.

**No person is ever in it.** The system has no concept of a person as an
entity, publishes at one grain — named area, calendar month — and fails its
build if a person identifier, coordinate, street address, block identifier, or
point geometry reaches the published files. Any published count between 1 and 4
is withheld, because it could identify someone.

**No enforcement framing, and no claim it cannot support.** The published data
file declares live routing, shelter capacity or eligibility, person-level
prioritization, and enforcement recommendations out of scope. It will not say
people moved between areas or that a policy caused a decline; where it cannot
tell whether a decline means departure or displacement, it returns
"insufficient evidence" — an answer, not a gap. Wording counts here: a change
to copy alone can violate the rule.

**No language model between the data and any displayed number**, and **no
automatic dispatch**: the data file declares `decision_support_only: true` and
`human_review_required: true`, and produces a scenario for a named human to
accept, edit, or reject.

**No cost figure divides by a human being.** Cost may be stated per staff-hour,
per area, per plan, or per shift; every other denominator is refused. A person
can do that division themselves, so the guarantee is narrow and exact: no
per-person figure can be stored, exported, or displayed by the system.

**On 311 complaints, the claim is deliberately narrow.** An independent review
defeated the broader version, and it was withdrawn rather than defended. The
claim the project makes and will defend:

> Complaint volume cannot reach allocation without also corrupting the
> published forecast interval, which is derived from checksummed inputs.

Not "complaint volume cannot influence planning." The narrow claim survives an
attacker; the broad one did not. Complaint counts are still displayed as a
diagnostic, precisely so their exclusion can be audited.

## What the seventh scanner hole could actually cost you

"What is not finished" below says that six rounds of review each found a real
hole in the privacy scanner and that the security policy says to assume a
seventh exists. That is the disclosure, and it should be read as evidence that
the scanner is reviewed adversarially rather than as an open-ended liability.
Counsel is owed the size of the thing, so here it is.

**The residual exposure is one number, not one record.** The scanner decides
whether an integer is a person-count from the shape of the document: an object
counts as a cell if something on its path names a month, period, date, area,
or neighborhood, and then every integer inside it is checked against the
threshold. Three things can put a real count outside that reach — a count in
an object with no month or area key anywhere above it, a count whose field
name lands on the narrow list of structural exemptions (`index`, `rank`,
`weight`, `version` and about a dozen others), and a count sitting beside a
declared resource metric such as `allocated_hours`, which turns cell scope off
for that object. The scanner also does not reason across files or across
rollup levels, so a value withheld in one place and derivable by subtraction
from another is not something it can see.

**The worst realistic case, named.** A published area-month count between 1
and 4 ships as a number instead of as `suppressed`. A reader learns that in
one named neighborhood, in one named calendar month, exactly one, two, three,
or four people were observed on the street. Someone with local knowledge may
be able to attach that number to people they already know are there. It
confirms; it does not reveal. That is the whole of it.

**What bounds it is the architecture, not the scanner.** There are no
person-level rows in the artifact to leak, because the pipeline aggregates
before it writes and the system has no concept of a person as an entity. The
published grain is one named area and one calendar month — no day, no block,
no census tract, no coordinate, no address, no bounding street — so even a
completely unsuppressed file says how many, never who, never where within the
area, never which day. Counts from 1 to 4 are withheld at a stated threshold
of 5, by an emitter that also suppresses a complementary partner cell and
escalates to withholding the whole row when the published numbers would pin a
withheld value. The scan runs fail-closed over the exact bundle that gets
deployed — after the production build in `./scripts/verify.sh`, and again in
the deploy job against the files being published, source maps included — and
any blocking finding stops the build. Over-blocking is the chosen error
direction, and every rejection class has a negative fixture that must keep
producing a blocking finding, so a rule that quietly stops working fails
loudly.

**What an adopter should do about it.** Four things, in order of how much they
matter. Never supply person-level records, coordinates, addresses, or
block-scale counts — the bound above holds because the input rule holds, and
that rule is yours to keep. Keep every count inside an object that carries its
own month and area keys, and publish identifiers as strings rather than
integers, so the scanner sees your counts as cells. Run the verification
script on every deploy and treat a blocking finding as a stop, never as
something to clear by widening an exemption or adding a suppression marker.
And before your first publication, read the artifact once by eye: at area-month
grain it is a small enough file for a person to check, and that check is the
one thing no inference rule can be fooled about. `docs/project/DATA_GOVERNANCE.md`
§5.3 carries the same account with the file and constant names.

## What it costs to run

**There is no infrastructure to pay for.** The deployed product is a compiled
bundle of about 3 MB plus one 148 KB data file: static files, no server, no
database, no accounts, because nothing in it would need them. The only running
cost is hosting a directory, and any static file host serves it — the
reference deployment uses GitHub Pages, but nothing in the product depends on
that choice. What a given host charges for a 3 MB directory is that host's
question and changes without notice; this brief does not quote a price it
cannot verify. Apache-2.0 adds nothing: no seats, no tiers, no vendor.

**The real cost is staff time**, the only line worth budgeting: roughly 20
minutes a month for the operator once the data is refreshed, plus the decision
itself; a technical person for the refresh step; and a one-time setup of
filling in a configuration file, resolving where your area boundaries come
from, and having your finance lead set the loaded hourly rate. The shipped $45
rate is a labeled placeholder, and until yours is set the dollar figures in an
exported brief are meaningless and should be deleted from it.

## The monthly routine

Check the staleness label first — the tool says in plain language how old its
numbers are. Refresh the data: a dry run, read its one-line summary, then the
real run, then the verification script. Nothing is written unless every check
passes, and a failed refresh leaves last month's good numbers in place. Read
the audit findings — the tool's account of its own data-quality problems — and
ask only whether they change the decision. Then set the budget and floor,
review the plan, lock what you know better than the model does, and watch what
the floor and your locks cost the areas you did not lock. Copy the decision
brief into the board packet without trimming its limitations text.

## What your organization must supply

A monthly observation series at a defined area grain with stable names; a
written, dated record of every change in how counts were collected; a
provenance card and pinned checksum per source; a resolved, versioned area
list; a named accountable role; and your own legal review of your own inputs.
Nothing in the repository discharges that last one.

Equally binding is what you must never supply: person-level records of any
kind, coordinates, street addresses, block-scale counts, service-eligibility or
shelter-capacity data, and HMIS extracts — not even de-identified. If a use
case seems to need one of these, this is the wrong tool for it.

**One honest caveat about who can operate it.** The refresh runs from a command
line; there is no button. Either someone at your organization can run a
command, or a technical partner runs it on a standing date and hands you the
result. Everything else belongs to a program staff member with no technical
background.

## Who stewards it, and what if the steward leaves

The project has one maintainer, and its security policy states the commitments
one person can honor: acknowledgement of a report within five business days, an
assessment within fifteen calendar days, and no promised fix deadline except
for a confirmed live data leak, which is taken down first and diagnosed second.
No bug bounty. Read that as the service level it is.

If the maintainer disappears, nothing stops. Apache-2.0 lets you fork, modify,
and run it without asking anyone. There is no backend to keep alive, no account
to revoke, no API key to expire, no vendor to renegotiate with. The site keeps
serving because it is static files; the only thing that would stop is the
monthly refresh, a script in your own copy. The enforcement travels with the
fork: every pull request runs linting, type checks, both test suites, a
production build, and the privacy scan; the deploy job re-scans the exact
bundle it publishes; a third job deliberately breaks the planner and fails if
the tests stay green.

## What it costs to walk away

Nothing, because nothing accumulates. No backend, database, login, session,
analytics, or telemetry. The product never receives data from a user, so there
is no user data to keep, export, or delete, and no retention schedule because
there is no store. The only state anywhere is in each viewer's own browser: up
to eight saved sets of planning settings — budget, floor, locks, never results
— cleared with site data and concerning no person. Your source data was always
on your own machine under your own controls, and the tool never held a copy.
Stopping means stopping the refresh and taking the site down. No contract, no
notice period, no migration.

## What is not finished

- **The reference site is stale, and that is correct.** The modelled data runs
  through December 2025; two later observations are displayed but excluded on
  five documented grounds, and the refresh fails if someone flips that flag to
  make the site look current.
- **Boundaries and adjacency are unresolved in the reference deployment**: the
  publisher names its areas but publishes no boundary file, and no citable
  adjacency table exists. That is why the displacement question answers
  "insufficient evidence" rather than guessing. The outlines the map draws are
  themselves derived from an input that carries no pinned checksum, so the map
  is an illustration rather than a verified boundary. Resolve your own
  geography; do not copy the unresolved state forward.
- **No delivered-versus-planned analysis exists**, because no operator has
  recorded actuals yet. The schema and loader exist; the analysis is documented
  and not implemented, and the loader is not wired into the interface.
- **The shipped data file cannot be regenerated from a clean copy of the
  repository.** It is verifiable against pinned checksums, but its five source
  files are not redistributable. The pipeline's behavior is reproducible
  against a committed synthetic fixture; that file's inputs are not.
- **The privacy scanner still infers which numbers are people-counts from
  document shape** for the shipped file; the durable fix is partially landed.
  Six rounds of review each found a real hole, and the security policy says to
  assume a seventh exists. What that risk is bounded to is stated below.
- **Accessibility is audited, not fully verified.** Zero automated WCAG 2.1 AA
  violations across six screens, contrast measured directly. Keyboard operation
  is a manual protocol still to be run by a person, and screen-reader
  announcement of the live plan region was not verified.
