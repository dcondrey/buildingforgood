# Still Here SD Project Control

Last updated: 2026-08-21

This document is the working control surface for ownership, decisions, risks,
scope, and release readiness. GitHub issue
[#1](https://github.com/dcondrey/buildingforgood/issues/1) remains the canonical
work tracker. Update this document when a material decision or risk changes; do
not use it as a substitute for closing or updating the owning issue.

## Working cadence

- At the start of a work session, claim an issue in its track tracker and note
  the intended handoff.
- When blocked, record the blocker, owner, next action, and decision deadline in
  the risk register below.
- Reference issue numbers in commits and pull requests.
- At each integration checkpoint, update the status table and merge the latest
  `track/d-integration-release` into active track branches.
- No issue is complete until its acceptance criteria and required evidence are
  recorded on GitHub.

## Ownership and handoffs

Issue [#1](https://github.com/dcondrey/buildingforgood/issues/1) (the master
tracker, authored by the repository owner) is the canonical naming and
ownership system: **four** tracks, one prefix letter each. An earlier version
of this document described a five-owner "managed agent" model with a Track E;
that did not match #1 and has been removed (see DEC-009).

| Track | Tracker | Branch | Primary handoff | Observed activity |
|---|---|---|---|---|
| A — Data & Forecasting | [#28](https://github.com/dcondrey/buildingforgood/issues/28) | `track/a-data-forecasting` | Privacy-safe decision artifact to B, C, and D | PRs #38, #39, #41, #45 merged (OrionArchitekton) |
| B — Product Experience | [#29](https://github.com/dcondrey/buildingforgood/issues/29) | `track/b-product-experience` | App shell and evidence/forecast experience to D | PRs #38, #43 merged (OrionArchitekton) |
| C — Planning & Safeguards | [#30](https://github.com/dcondrey/buildingforgood/issues/30) | `track/c-planning-safeguards` | Privacy gate, planner, and safeguard evidence to D | PR #44 merged (Lucface) |
| D — Integration & Release | [#31](https://github.com/dcondrey/buildingforgood/issues/31) | `track/d-integration-release` | Shared contracts, integration, and final release to `main` | No dedicated owner had picked up D-01–D-07 as of this update; starting with D-01 (this document) |

GitHub API access is restored (`gh` authenticated). Contributors are pushing
`pr/*` branches and opening PRs directly against `dcondrey/buildingforgood`;
review and merge happens there. A contributor without direct push access can
fork the repository and open a PR from the fork instead — GitHub review works
the same way regardless of which side the branch lives on.

## Current status

| Workstream | State | Current issue | Next checkpoint |
|---|---|---|---|
| Project coordination | In progress | [D-01 / #26](https://github.com/dcondrey/buildingforgood/issues/26) | This refresh; keep pace with the current merge rate |
| Prepared scenario | Provisional; cross-track review required | [D-02 / #19](https://github.com/dcondrey/buildingforgood/issues/19) | Track A confirms period/geography; Track C confirms planner assumptions |
| Decision contract | Provisional; geography/period still unresolved | [D-03 / #2](https://github.com/dcondrey/buildingforgood/issues/2) | Track A confirmation of canonical area set (see DEC-010) before D-03 commits it |
| Artifact contracts | In progress | [D-04 / #4](https://github.com/dcondrey/buildingforgood/issues/4) | Count-field/suppression-marker slice merged (#46); planner-input and TS-side contract pieces remain |
| App bootstrap | Merged | [B-02 / #3](https://github.com/dcondrey/buildingforgood/issues/3) | Done via #38 |
| Data and forecasting | Active | [A-00 / #28](https://github.com/dcondrey/buildingforgood/issues/28) | Validation/normalization/aggregation merged (#41); suppression merged (#45) |
| Planning and safeguards | Active | [C-00 / #30](https://github.com/dcondrey/buildingforgood/issues/30) | Red-team, privacy boundary, and planner merged together (#44) |
| Demo narrative | Not started | [D-05 / #24](https://github.com/dcondrey/buildingforgood/issues/24) | Blocked on #19 settling |
| Usability rehearsal | Not started | [D-06 / #25](https://github.com/dcondrey/buildingforgood/issues/25) | Blocked on #12, #13, #15 |
| Release | Not started | [D-07 / #17](https://github.com/dcondrey/buildingforgood/issues/17) | All upstream quality gates pass |

## Decision log

| ID | Date | Decision | Rationale | Affected issues | Status |
|---|---|---|---|---|---|
| DEC-001 | 2026-08-20 | Use four long-lived work tracks with D as the integration branch. | Separates primary file ownership while giving the team one controlled merge path. | #1, #28–#31 | Accepted |
| DEC-002 | 2026-08-20 | Deploy a static application generated from versioned aggregate artifacts. | Keeps the demo reproducible, offline-capable, and independent of fragile live APIs. | #3, #4, #11, #17 | Accepted |
| DEC-003 | 2026-08-20 | Keep generative AI out of classification, forecasting, and allocation. | Consequential results must remain deterministic, testable, and inspectable. | #8–#10, #14, #16 | Accepted |
| DEC-004 | 2026-08-20 | Use complaint data only as a disagreement/bias diagnostic. | Reporting volume is not a count of people or a defensible demand target. | #5, #8, #14, #16 | Accepted |
| DEC-005 | 2026-08-20 | Prefer the seasonal-naive forecast unless a candidate wins on held-out evaluation. | Prevents unnecessary model complexity and optimistic in-sample selection. | #9, #10 | Accepted |
| DEC-006 | 2026-08-20 | Prepare an editable 80-hour plan for a shift within seven days, informed by a one-month aggregate forecast. | Separates the operational decision horizon from the observation/forecast cadence while keeping both visible. | #2, #14, #19 | Provisional pending cross-track review |
| DEC-007 | 2026-08-20 | Treat the exact demonstration month, area list, and adjacency as unresolved release blockers. | The source and boundary audit must determine them; the integration track will not invent comparability. | #2, #6, #11, #18, #34 | Accepted |
| DEC-008 | 2026-08-20 | Assign five managed agent owners and add Track E (quality and accessibility) alongside the four DEC-001 tracks. | Enables parallel per-track ownership with a dedicated quality pass; the DEC-001 integration path through Track D is unchanged. | #28–#31 | Superseded by DEC-009 |
| DEC-009 | 2026-08-21 | Revert to the four-track ownership model (A/B/C/D) defined in the master tracker #1; drop the Track E / five-managed-agent model from DEC-008. | Issue #1, authored by the repository owner, is the canonical naming and work-order system and defines only four track prefixes; no Track E tracker or work items exist in the repository. Keeping DEC-008's model in this document caused it to diverge from the actual tracker. | #1, #26 | Accepted |
| DEC-010 | 2026-08-21 | Do not commit a planning-area set or exact observation period to `config/decision.v1.json` yet. | A detailed candidate area list and adjacency approach were proposed in the #2 discussion (canonical monthly areas: East Village, City Center, Columbia, Cortez, Gaslamp, Marina, Outside Perimeter from April 2021), but the comment itself asks for Track A confirmation before D-03 locks it, and the 2023→2024 discontinuity is still unreviewed. Locking it prematurely risks an ungrounded release blocker. | #2, #6, #11 | Proposed pending Track A confirmation |

Use the next sequential decision ID. A decision entry must include the rationale
and affected issue links. Superseded decisions remain in the table with a
status explaining what replaced them.

## Risk and blocker register

| ID | Severity | Risk or blocker | Owner | Next action | Decision deadline | State |
|---|---|---|---|---|---|---|
| RISK-001 | High | Primary source files may be unavailable or slow to integrate. | Track A owner | Confirm SDHEART access; document SDRDL fallback and checksums. | Before A-06 begins | Open |
| RISK-002 | High | Missing months and the 2017 method break may make the prepared scenario incomparable. | Track A owner | Audit completeness and comparability before selecting the final period. | Before A-08/A-09 | Open |
| RISK-003 | Critical | Precise coordinates or raw records could enter deployable artifacts. | Track C owner | Define deny-list fixtures and make the production build fail on leaks. | Before A-11 merges | Open |
| RISK-004 | Medium | Forecast candidates may not improve on the baseline. | Track A owner | Ship the baseline and document the candidate fallback result. | At A-10 completion | Open |
| RISK-005 | High | Long-lived branches may create cross-track merge conflicts. | Track D owner | Enforce file ownership, checkpoint merges, and integration-first syncing. | Every checkpoint | Open |
| RISK-006 | High | A polished historical dashboard could obscure the actual next-shift decision. | Track B owner | Lead with the decision, horizon, budget, and recommendation in the storyboard. | Before B-05 | Open |
| RISK-007 | High | The demo may overstate displacement, causality, or operational impact. | Track C owner | Complete claims red-team and language audit; treat high-severity findings as release blockers. | Before C-05 | Open |
| RISK-008 | Medium | Optional visual features could displace verification and rehearsal time. | Track D owner | Enforce the scope ledger and feature-freeze criteria below. | Before final integration | Open |
| RISK-009 | Medium | A complaint-volume guard on planner input only checked an area object's top-level keys, so a nested field (e.g. `diagnostics.complaint_count`) could have reached the allocation objective undetected, contradicting DEC-004. | Track C owner | Guard now recurses through objects and arrays and names the offending path on rejection; found and fixed during the #4 contract review. | N/A | Resolved |

## Scope ledger

### Must ship

- One privacy-safe aggregate history and prepared scenario.
- Evidence-based drop testing with three limited conclusions.
- A baseline-tested forecast with visible uncertainty.
- A fairness-constrained outreach-hours plan with infeasibility behavior.
- Evidence, forecast, spatial, allocation, and explanation views.
- Data, model, limitation, allocation, privacy, and AI-disclosure cards.
- Focused privacy, model, planner, accessibility, offline, and release checks.

### Conditional after the complete flow is stable

- Guarded-versus-unguarded scenario comparison.
- Human locks and overrides beyond the single prepared demo case.
- Printable next-shift brief.
- Additional independent data sources.
- Presentation mode and restrained motion.

### Cut first

- Animated aggregate flows.
- Broad geography or multiple demo stories.
- Additional model families beyond the documented candidates.
- Live API dependencies.
- Decorative transitions or visual effects without decision value.

### Explicitly out of scope

- Individual risk or movement modeling.
- A public map of precise sleeping locations.
- Enforcement, citation, or encampment-clearing decisions.
- Live shelter capacity, eligibility, or service availability.
- Causal policy-effect claims.
- Autonomous decision-making.

## Feature-freeze and release readiness

Feature freeze begins when the complete prepared scenario works in the
production build. After freeze, changes require a linked release blocker or a
failed quality gate.

- [ ] All track owners are assigned and all blockers have a next action.
- [ ] The frozen scenario is generated without manual edits.
- [ ] Deployable artifacts pass schema and privacy validation.
- [ ] Drop-test language stays within the approved claim boundaries.
- [ ] The selected forecast is the baseline or beats it on held-out data.
- [ ] Prediction intervals and evaluation evidence are visible.
- [ ] Planner budget, floor, infeasibility, lock, and exclusion invariants pass.
- [ ] Essential interactions pass automated accessibility and keyboard checks.
- [ ] Deployed and offline builds produce the same scenario and recommendation.
- [ ] High-severity red-team and usability findings are resolved or block release.
- [ ] The three-minute script and fallback media are verified on the presentation device.
- [ ] Deferred work has an owner, rationale, and follow-up issue.

## Status update template

Copy this section for a project update in issue #26.

```markdown
### Status — YYYY-MM-DD

- Completed:
- In progress:
- Blocked:
- Decisions needed:
- Next handoffs:
- Scope changes:
- Release-gate changes:
```
