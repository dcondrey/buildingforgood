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
| Project coordination | In progress | [D-01 / #26](https://github.com/dcondrey/buildingforgood/issues/26) | Reconcile and close shipped-but-open issues with explicit evidence (independent-review blocker 5) |
| Prepared scenario | Shipped as the demo.v1 replay (DEC-011) | [D-02 / #19](https://github.com/dcondrey/buildingforgood/issues/19) | Original East Village card retained as a superseded design record |
| Decision contract | demo.v1.json is authoritative (DEC-011); config retained as design history | [D-03 / #2](https://github.com/dcondrey/buildingforgood/issues/2) | Record the supersession on the issue and close |
| Artifact contracts | Merged | [D-04 / #4](https://github.com/dcondrey/buildingforgood/issues/4) | Done; `stillhere.demo.v1` is the runtime contract |
| App bootstrap | Merged | [B-02 / #3](https://github.com/dcondrey/buildingforgood/issues/3) | Done via #38 |
| Data and forecasting | Shipped in demo.v1; review-lane docs transferred to the repo | [A-00 / #28](https://github.com/dcondrey/buildingforgood/issues/28) | DATA_DICTIONARY, FORECAST_SCORECARD, DROP_TEST_RULES landed 2026-08-21 |
| Planning and safeguards | Shipped; red-team third pass clean (C-01 §7) | [C-00 / #30](https://github.com/dcondrey/buildingforgood/issues/30) | Cross-file join check deferred with a follow-up issue |
| Demo narrative | Written | [D-05 / #24](https://github.com/dcondrey/buildingforgood/issues/24) | DEMO_SCRIPT.md and JUDGE_QA.md; timed read-through still owed by a human |
| Usability rehearsal | Instruments ready; human runs still owed | [D-06 / #25](https://github.com/dcondrey/buildingforgood/issues/25) | Two observed walkthroughs plus device offline check remain open release gates |
| Release | Deployed to GitHub Pages; rehearsal gates open | [D-07 / #17](https://github.com/dcondrey/buildingforgood/issues/17) | Deployed, dist, and rebuilt artifacts hash-identical (`1da6777a…`); human rehearsal pending |

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
| DEC-010 | 2026-08-21 | Do not commit a planning-area set or exact observation period to `config/decision.v1.json` yet. | A detailed candidate area list and adjacency approach were proposed in the #2 discussion (canonical monthly areas: East Village, City Center, Columbia, Cortez, Gaslamp, Marina, Outside Perimeter from April 2021), but the comment itself asks for Track A confirmation before D-03 locks it, and the 2023→2024 discontinuity is still unreviewed. Locking it prematurely risks an ungrounded release blocker. | #2, #6, #11 | Superseded by DEC-011 |
| DEC-011 | 2026-08-21 | The released product is the six-area component-first historical replay frozen in `public/generated/demo.v1.json` (`wider-footprint-next-shift`, observation month 2025-12, forecast target 2026-01); that artifact is the authoritative runtime contract. The East Village/displacement design in `docs/product/PREPARED_SCENARIO.md` and `config/decision.v1.json` is retained as a design-history record only. | The organizer bundle made the component decomposition the strongest defensible story; the displacement design depended on a versioned adjacency definition that never landed, so its drop-test path could only return insufficient evidence. Both superseded files already carry supersession banners; this entry makes the scope change a recorded decision instead of an implication. | #2, #19, #8, #11 | Accepted |
| DEC-012 | 2026-08-21 | The release shipped through direct PRs from `track/b-product-experience` to `main` (#54–#57); the `track/d-integration-release` staging path defined in DEC-001 was retired after #52, and the routing PRs (#50, #53) were closed unmerged. | With a single maintainer doing the integration work, the staging branch added a merge hop without adding review; CI runs the full verify gate (including the privacy scan) on `main`, `track/**`, and every PR, so the protection DEC-001 sought lives in the gate, not the branch topology. | #31, #17, #1 | Accepted |
| DEC-013 | 2026-08-21 | The shipped coverage floor is 8 staff-hours per area over the six-area scenario (artifact default and app default); the 6-hour value fixed in `config/decision.v1.json` belongs to the superseded seven-area design and is not the shipped policy. | The 6h rationale (8h across 7 candidate areas committed 56 of 80 hours) dissolved when the shipped scenario dropped to six areas: 6×8h commits 48 of 80, leaving 40% discretionary and feasible. Under DEC-011 the artifact is authoritative, and the floor is user-editable in the interface (0/4/8h options) with the 8h default labeled as such. | #14, #12, #2 | Accepted |

Use the next sequential decision ID. A decision entry must include the rationale
and affected issue links. Superseded decisions remain in the table with a
status explaining what replaced them.

## Risk and blocker register

| ID | Severity | Risk or blocker | Owner | Next action | Decision deadline | State |
|---|---|---|---|---|---|---|
| RISK-001 | High | Primary source files may be unavailable or slow to integrate. | Track A owner | Organizer hackathon bundle acquired; every input pinned by SHA-256 in the source ledger and embedded in the artifact's `generated_from.input_sha256`. | N/A | Resolved |
| RISK-002 | High | Missing months and the 2017 method break may make the prepared scenario incomparable. | Track A owner | Quality audit completed (DATA_QUALITY_AUDIT.md); shipped comparison is same-month, same-method (POST2020 both sides); missing 2025 months stay null and are never imputed. | N/A | Resolved |
| RISK-003 | Critical | Precise coordinates or raw records could enter deployable artifacts. | Track C owner | Privacy scan with deny-list, geometry, grain, small-cell, and recoverability rules runs last in `verify.sh` with `--require-bundle`, in CI on `main`, `track/**`, and every PR; 10 leak fixtures fail it, and the shipped artifact and bundle scan clean. | N/A | Resolved |
| RISK-004 | Medium | Forecast candidates may not improve on the baseline. | Track A owner | A challenger won on strict held-out MAE and the baseline stays in every scorecard; a tie provably retains the baseline (test_promotion_requires_strict_holdout_improvement). | N/A | Resolved |
| RISK-005 | High | Long-lived branches may create cross-track merge conflicts. | Track D owner | Release shipped; merge topology recorded as DEC-012. | N/A | Closed |
| RISK-006 | High | A polished historical dashboard could obscure the actual next-shift decision. | Track B owner | Shipped shell leads with the decision, horizon, and editable budget; the four-step flow ends in the coordinator's brief. | N/A | Resolved |
| RISK-007 | High | The demo may overstate displacement, causality, or operational impact. | Track C owner | Three red-team passes logged in C-01; the third pass (§7) covered every rendered string in the deployed shell plus the demo script and found no open finding at any severity. | N/A | Resolved |
| RISK-008 | Medium | Optional visual features could displace verification and rehearsal time. | Track D owner | Release shipped inside scope; remaining open work is verification and rehearsal, not features. | N/A | Closed |
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
- [x] The frozen scenario is generated without manual edits (byte-identical rebuild verified 2026-08-21, SHA-256 `1da6777a…`).
- [x] Deployable artifacts pass schema and privacy validation (verify.sh step 3, 0 blocking, 0 warning).
- [x] Drop-test language stays within the approved claim boundaries (C-01 §7).
- [x] The selected forecast is the baseline or beats it on held-out data (FORECAST_SCORECARD.md).
- [x] Prediction intervals and evaluation evidence are visible (shell forecast panel and scorecard table).
- [x] Planner budget, floor, infeasibility, lock, and exclusion invariants pass (domain planner tests plus shipped-path tests).
- [x] Essential interactions pass automated accessibility and keyboard checks (App.test.tsx axe passes over the deployed shell; manual smoke test still owed by a person).
- [x] Deployed and offline builds produce the same scenario and recommendation (hash-identical artifact across public/generated, app/dist, and the deployed site).
- [x] High-severity red-team and usability findings are resolved or block release (C-01 §3: none open).
- [ ] The five-minute script and fallback media are verified on the presentation device.
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
