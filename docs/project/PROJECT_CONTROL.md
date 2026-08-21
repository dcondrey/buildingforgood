# Still Here SD Project Control

Last updated: 2026-08-20

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

| Track | Owner | Tracker | Branch | Primary handoff |
|---|---|---|---|---|
| A — Data & Forecasting | Unassigned | [#28](https://github.com/dcondrey/buildingforgood/issues/28) | `track/a-data-forecasting` | Privacy-safe decision artifact to B, C, and D |
| B — Product Experience | Unassigned | [#29](https://github.com/dcondrey/buildingforgood/issues/29) | `track/b-product-experience` | App shell and evidence/forecast experience to C and D |
| C — Planning & Safeguards | Unassigned | [#30](https://github.com/dcondrey/buildingforgood/issues/30) | `track/c-planning-safeguards` | Privacy gate, planner, and safeguard evidence to D |
| D — Integration & Release | Unassigned | [#31](https://github.com/dcondrey/buildingforgood/issues/31) | `track/d-integration-release` | Shared contracts, integration, and final release to `main` |

The first coordination action is to replace every `Unassigned` entry with a
GitHub username or teammate name. A person may contribute research or review
without Git, but the implementation owner for that track remains responsible
for transferring accepted work into the branch.

## Current status

| Workstream | State | Current issue | Next checkpoint |
|---|---|---|---|
| Project coordination | In progress | [D-01 / #26](https://github.com/dcondrey/buildingforgood/issues/26) | Assign all four track owners |
| Prepared scenario | Next | [D-02 / #19](https://github.com/dcondrey/buildingforgood/issues/19) | Scenario card reviewed and handed to D-03/C-03 |
| Decision contract | Waiting on scenario | [D-03 / #2](https://github.com/dcondrey/buildingforgood/issues/2) | Versioned configuration consumable by analytics and UI |
| App bootstrap | Ready after decision contract | [B-02 / #3](https://github.com/dcondrey/buildingforgood/issues/3) | Static app and verification command |
| Data and forecasting | Research can start | [A-00 / #28](https://github.com/dcondrey/buildingforgood/issues/28) | Source review and safe aggregate sample |
| Planning and safeguards | Review can start | [C-00 / #30](https://github.com/dcondrey/buildingforgood/issues/30) | Claims red-team and privacy rules |
| Release | Not started | [D-07 / #17](https://github.com/dcondrey/buildingforgood/issues/17) | All upstream quality gates pass |

## Decision log

| ID | Date | Decision | Rationale | Affected issues | Status |
|---|---|---|---|---|---|
| DEC-001 | 2026-08-20 | Use four long-lived work tracks with D as the integration branch. | Separates primary file ownership while giving the team one controlled merge path. | #1, #28–#31 | Accepted |
| DEC-002 | 2026-08-20 | Deploy a static application generated from versioned aggregate artifacts. | Keeps the demo reproducible, offline-capable, and independent of fragile live APIs. | #3, #4, #11, #17 | Accepted |
| DEC-003 | 2026-08-20 | Keep generative AI out of classification, forecasting, and allocation. | Consequential results must remain deterministic, testable, and inspectable. | #8–#10, #14, #16 | Accepted |
| DEC-004 | 2026-08-20 | Use complaint data only as a disagreement/bias diagnostic. | Reporting volume is not a count of people or a defensible demand target. | #5, #8, #14, #16 | Accepted |
| DEC-005 | 2026-08-20 | Prefer the seasonal-naive forecast unless a candidate wins on held-out evaluation. | Prevents unnecessary model complexity and optimistic in-sample selection. | #9, #10 | Accepted |

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
