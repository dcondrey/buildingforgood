# Security policy

## What this system is

Still Here SD is a static site. There is no backend, no server process, no
database, no login, no accounts, no sessions, no cookies set by the
application, no server-side storage, and no personal data anywhere in the
deployed product.

The whole deployed surface is: a compiled JavaScript/CSS/HTML bundle built
from `app/`, one generated analysis artifact
(`public/generated/demo.v1.json`), a small set of static images, and a
service worker (`public/sw.js`) that caches those same-origin assets. The
only network request the running application makes is a `fetch` for the
analysis artifact at its own base URL (`app/src/lib/demo.ts`). It calls no
external API at runtime and sends nothing anywhere. Once loaded, it works
offline.

The analysis that produces the artifact runs offline, ahead of time, in the
Python pipeline. No LLM is in the decision path.

Because of that shape, the usual web vulnerability classes mostly do not
apply. There is no authentication to bypass, no authorization boundary
between users, no query to inject into, no upload endpoint, no server to
gain a shell on, and no stored user data to exfiltrate. Reports of those
classes against this repository will generally be closed as not applicable.

## What a vulnerability actually means here

Four categories are real, and all four are about the integrity of what gets
published rather than the confidentiality of a running service.

### 1. Supply chain

The published bundle is built by CI from `app/package-lock.json` and the
Python package in `pipeline/`. A compromised or typosquatted dependency, or
a dependency update that adds a network call or a telemetry beacon to the
built bundle, would put code on a page that program staff are asked to trust
with planning decisions. Relevant reports include: a malicious or
compromised package in the app or pipeline dependency trees; a build-time
plugin that injects code; a lockfile change that resolves to an unexpected
registry or source.

### 2. Build and deploy pipeline

Three GitHub Actions workflows exist: `verify.yml` (format, lint, types,
Python tests, TypeScript tests, production build, the adversarial harnesses in
`review/attacks/`, the privacy scan, and the claim inventory) on pushes to
`main` and `track/**` and on every pull request; `mutation.yml` (the planner
mutation gate); and `deploy-pages.yml`, which builds the bundle,
independently privacy-scans the exact artifact it is about to publish with
`--require-bundle`, and then deploys it to GitHub Pages. All third-party
actions are pinned by commit SHA and workflow permissions are scoped.

**Deploy is gated on verify.** `deploy-pages.yml` runs on `verify` completing
for `main` and refuses unless that run's conclusion was success, its triggering
event was a `push`, and its head repository is this one. The last two matter
because `verify` also runs on pull requests, including from forks, and a
`workflow_run` branch filter matches the triggering run's head branch — so a
fork PR opened from a branch named `main` would otherwise satisfy it and get
its own commit published. `workflow_dispatch` remains an ungated manual path
and is deliberately privileged.

Relevant reports include: a way to reach the deploy job without passing
`verify.sh`; a way to make `deploy-pages.yml` publish a bundle other than
the one it scanned; a workflow-permission or `pull_request_target`-style
escalation; an unpinned or mutable action reference; a cache-poisoning path
into the build.

### 3. Bypassing the privacy scan

`pipeline/src/stillhere_pipeline/privacy.py` is the structural enforcement
of the promise that nothing which could locate or identify a person reaches
the static deployment. It fails closed: a `BLOCK` finding exits non-zero and
fails the build, and `--require-bundle` turns a missing `app/dist` into an
error rather than a skipped check.

A report that the scan can be made to pass while a leak ships is the highest
severity in this repository. The rule families and their known limits are
documented in [`docs/track-c/C-02-privacy-boundary.md`](docs/track-c/C-02-privacy-boundary.md),
which also names the recurring failure mode: an exemption flag (cell scope,
suppression, geometry approval) propagating past the node it was approved
for. Six rounds of review each found a real hole of that shape. Assume a
seventh exists.

**What a seventh hole is bounded to.** That sentence stays because it is true,
but on its own it states an unknown mechanism with no ceiling, which is not
what a reader needs in order to act. The mechanism is unknown; the consequence
is not. The worst case is **one number, not one record**: a published
area-month count between 1 and 4 shipping as an integer instead of as
`suppressed`. It cannot be worse than that, and the reason is architectural
rather than procedural — the pipeline aggregates before it writes, no
person-level type exists anywhere in the lineage that reaches deployment, and
the published grain is one named area and one calendar month with no day, no
block, no tract, no coordinate, and no address. A completely unsuppressed file
still says how many and never who, where within the area, or which day. The
upstream SDRDL source package, meanwhile, is public at point precision, so the
ceiling on a scanner failure is republishing more coarsely something already
obtainable more precisely from the original publisher. This bound holds only
while the input rule holds: it is void for an adopter who supplies
person-level records, coordinates, addresses, or block-scale counts. The same
bound, written for a non-technical reader, is in
[`docs/adoption/BRIEF.md`](docs/adoption/BRIEF.md) under "What the seventh
scanner hole could actually cost you"; the two must not drift apart.

Concretely, we want to hear about: a leak shape the scanner does not see; an
allow-list entry that exempts more than it should; a suppression marker or
geography declaration that clears the rule for a sibling or descendant it
should not cover; an artifact shape that makes the small-cell rule fail to
recognize a published count.

### 4. Data-boundary regression

Distinct from a scanner bypass: a change that puts something across the
boundary in the first place. Examples that would be accepted as security
reports:

- A raw or tabular file (`.csv`, `.xlsx`, `.shp`, `.parquet`, `.sqlite`, …)
  reaching `public/` or `app/dist`.
- A coordinate pair, street address, plus code, block identifier, or
  bounding-street label reaching a generated artifact or the bundle,
  including through a source map.
- `Point`, `MultiPoint`, or `LineString` geometry in a published file.
- A published integer cell value `v` with `0 < v < 5` that is not marked
  suppressed, per
  [`docs/policy/small-cell-suppression.md`](docs/policy/small-cell-suppression.md).
- A suppressed value that is arithmetically recoverable from the values
  published beside it — including a value multiset that is pinned even when
  the assignment is not. This attack has been executed against this project
  successfully once already, and the first defense against it was weaker
  than the claim it was used to support.
- A published rollup total (neighborhood, downtown, annual) that reopens
  subtraction recovery across its members.

## Known and accepted limits

Stated plainly so nobody has to discover them in a report:

- **The enforced boundary is the deployed product surface**, per the C-02
  ruling recorded in `docs/policy/small-cell-suppression.md`. Pre-suppression
  artifacts exist in this repository's git history, and the upstream SDRDL
  source is public at point precision. Those two facts are why the boundary
  was drawn at the deployment rather than at the repository, and the second of
  them is also the ceiling on a scanner failure, stated under section 3. On
  non-public source data both facts would flip, the bound in section 3 would
  not hold, and an adopting organization must draw the boundary differently —
  see
  [`docs/project/DATA_GOVERNANCE.md`](docs/project/DATA_GOVERNANCE.md).
- **Recovery across files or across rollup levels is not enforced.** The
  artifact key surface is pinned by a test so that adding a rollup fails the
  suite, but the scanner does not reason across files.
- **The small-cell rule infers which integers are counts from document
  shape** where the artifact does not declare them. The durable fix is a
  declared count contract, partially landed; the inference remains a
  backstop.
- **`data/raw/` is gitignored and never committed.** Source snapshots stay
  local. If you find raw source data committed anywhere in this repository,
  that is a report.
- **`EYEPOP_API_KEY` is read from the environment** by the optional
  digitization audit and is fail-closed without it. It is never committed
  and never reaches the bundle. A key in git history or in a built asset is
  a report.

## How to report

Email **davidcondrey@gmail.com** with `SECURITY` in the subject line.

Include what you found, the file or URL where you found it, and the smallest
reproduction you have. For a privacy-scan bypass, a fixture that scans clean
while carrying the leak is the most useful possible report; the test layout
in `tests/privacy/fixtures/{pass,fail}/` takes one new file.

Do not open a public issue for a data-boundary or privacy-scan finding until
it has been addressed.

## What you can expect

This project has one maintainer. The commitments below are what one person
can actually honor, and are deliberately not enterprise service levels.

- **Acknowledgement within 5 business days.** If you have not heard back in
  that window, resend — assume the mail was lost, not ignored.
- **An initial assessment within 15 calendar days**, saying whether the
  report is accepted, and at what severity.
- **No fix deadline is promised.** A confirmed data-boundary leak in the
  deployed site is the one exception: the offending artifact or deployment
  will be removed first and diagnosed second.
- **Public credit if you want it**, in `CHANGELOG.md`. There is no bug
  bounty and no payment.
- **No coordinated-disclosure embargo is imposed on you.** A 90-day window
  before public write-up is appreciated for anything that would expose
  identifying data while it is still live.

## Verifying a build yourself

```bash
./scripts/verify.sh
```

Step 3 of 3 is the privacy scan, run after the production build so it sees
the real bundle. The scan can also be run alone against a checkout:

```bash
python -m stillhere_pipeline.privacy --root . --require-bundle
```
