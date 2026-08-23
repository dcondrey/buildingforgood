# Evaluation checklist

One page of due diligence before signing, split by who should do it. Each item
names the file that answers it and what a bad answer looks like, because a
checklist that can only come back reassuring is not diligence. Read it
alongside the [adoption brief](BRIEF.md) and the [runbook](RUNBOOK.md).

## For the program director

| Verify | Where | A problem looks like |
| --- | --- | --- |
| Someone can actually run the monthly refresh | `docs/adoption/RUNBOOK.md` §2 | No named person can run a terminal command, and no partner has committed to a standing date. The tool then goes stale quietly. |
| You have a monthly observation series at a defined area grain, with names stable over the period you will analyze | `docs/project/DATA_GOVERNANCE.md` §6.1 | Names that changed mid-series, or a source finer than month that nobody has agreed to aggregate. |
| Every change in how counts were collected is written down and dated | `DATA_GOVERNANCE.md` §6.2 | No methodology record. The drop test can only refuse a comparison across a method break if the breaks are declared. |
| Your area list is resolved, versioned, and marked `fixed` | `docs/project/ORGANIZATION_PROFILE.md` §3; `DATA_GOVERNANCE.md` §6.5; `config/profiles/san-diego-downtown.v1.json` | Copying the reference profile forward. Its `boundaries` and `adjacency` both read `unresolved`, with reasons. Until yours is resolved, the scanner approves no geometry. |
| Your finance lead has set the loaded hourly rate | `config/schema/organization-profile.v1.schema.json` → `cost_assumptions.loaded_hourly_rate` | The shipped `$45`, whose own `basis` field says it is a placeholder. Any dollar figure exported before this is set is meaningless. |
| You accept what the coverage floor costs | `RUNBOOK.md` §6 | Run the plan at 8h, 4h, and 0h and read the unmet planning load. If the floor is deciding most of the plan, the budget is too small for the geography. |
| The runbook's four contact names are filled in | `RUNBOOK.md` §11 | It ships blank: technical contact, data owner, program lead, privacy sign-off. |
| Nobody in your organization is expecting an answer the tool refuses to give | `README.md`, "What it will not say" | A stakeholder who wants movement claims, causal claims, or a complaint-driven priority ranking. That expectation has to be resolved before adoption, not after. |
| You can live without delivered-versus-planned reporting | `docs/project/ACTUALS.md` §7 | A funder requirement for variance analytics. No operator data exists, so no such analytic exists — the schema and loader are there, the analysis is not, and the loader is not wired into the interface. |
| The keyboard accessibility protocol has been run by a person | `docs/project/ACCESSIBILITY.md`, "Not covered here"; `docs/track-c/C-05-keyboard-smoke-test.md` | Treating the zero automated violations as complete. Keyboard operation and screen-reader announcement of the live plan region were not verified. |

## For general counsel

| Verify | Where | A problem looks like |
| --- | --- | --- |
| What may and may not be supplied to the pipeline | `DATA_GOVERNANCE.md` §6 and §7 | Any plan that involves person-level rows, coordinates, addresses, block-scale counts, eligibility data, or an HMIS extract — including a de-identified one. These are outside the design, not discouraged. |
| Where the enforcement boundary sits **for you** | `DATA_GOVERNANCE.md` §9 and §10.2; `SECURITY.md`, "Known and accepted limits" | Assuming the reference posture transfers. It enforces at the deployed product surface because the upstream source is already public. If your sources are not public, the boundary moves to the repository, and git history and pre-suppression intermediates come into scope. This is the single most consequential difference. |
| Retention obligations | `DATA_GOVERNANCE.md` §9 | Reading "no retention" as covering your raw source directory. It does not. The tool imposes no controls on the machine your source files sit on; that is entirely yours, under whatever agreement you obtained them. |
| The suppression threshold suits your population | `docs/policy/small-cell-suppression.md`; `SMALL_CELL_THRESHOLD` in `pipeline/src/stillhere_pipeline/suppress.py` | Accepting 5 without asking. Your density, area sizes, or data-use agreement may require higher. Raising it is a policy change touching the policy document and both enforcement points together. |
| Every export path is known | `DATA_GOVERNANCE.md` §3.0 | Overlooking the share link. Four things leave: the published artifact, the clipboard brief, CSV/print, and a pasted URL carrying seven allowlisted parameters. The link is the one that does not feel like a file. |
| The license terms | `LICENSE` | Apache-2.0 with a patent grant and a warranty disclaimer. It covers the code and documentation only — not the source data, which stays under its publishers' terms — and it is not legal advice. |
| The security posture and its stated limits | `SECURITY.md` | One maintainer: acknowledgement in five business days, assessment in fifteen calendar days, no promised fix deadline. The policy also says to assume a seventh privacy-scan hole exists, because six rounds of review each found one. |
| The open defects you would be accepting | `docs/project/PHASE0_FINDINGS.md` (F-1 to F-8); `docs/project/PHASE1_ADVERSARIAL.md`, "What remains open" | Reading the refusals as absolute. Two attacks succeeded against them and are documented; the remaining surface is a person deliberately mislabelling a value in a reviewed diff, and `complaint_data_used` is still partly a self-declaration. The map's own geometry input carries no pinned checksum (F-8). |
| The refusal claim in its actual form | `docs/project/DECISIONS.md` | Anyone repeating "complaint volume cannot influence planning." That claim was tested, falsified, and withdrawn. The defensible claim is that complaint volume cannot reach allocation without also corrupting the published forecast interval, which is derived from checksummed inputs. |
| Who inside your organization owns the governance decisions | `DATA_GOVERNANCE.md` §10, "Who owns the governance decision" | No named signer. Five decisions — admitting a source, promoting one into the model, changing the threshold, fixing the geography, weakening an invariant — require a human sign-off recorded outside the code. |

## What both should do once

Ask your technical partner to run `./scripts/verify.sh` on a clean checkout and
show you the output. It runs formatting, linting, type checks, both test
suites, a production build, and the fail-closed privacy scan, and it is the
same gate CI runs. The raw-data tests will skip; that is expected and
explained by finding F-2 — the shipped data file's five source inputs are not
redistributable, so the published artifact is verifiable against pinned
checksums but not regenerable from a clean copy.

Then ask them to load your own draft profile. A profile carrying a
person-level, precise-location, or complaint-shaped field is refused by name
rather than ignored, and that refusal is worth watching happen once.
