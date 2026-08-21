# Repo facts: dcondrey/buildingforgood
Discovered 2026-08-21T01:50Z (cycle 0)

- Default branch: `main`, public, no branch protection (no required checks enforced; merges are gated only by convention).
- CI: single workflow `verify` (`.github/workflows/verify.yml`), triggers on `pull_request` (observed). Runs ~30s.
- Fork PRs: workflow runs land as `action_required` (need maintainer approval to run). Seen on PR #44 (Lucface fork). Approve runs via `gh api repos/.../actions/runs/<id>/approve` or the UI.
- Labels: default GitHub set only (bug, enhancement, documentation, accessibility, duplicate, good first issue, help wanted, invalid, question, wontfix). No triage/status labels (no "needs-review", "blocked", etc.).
- Collaborators API returns only `dcondrey`. Contributors Lucface (Lucas Cooper-Bey) and OrionArchitekton (Dan Mercede) contribute via forks/branches; not listed as collaborators.
- Open PRs at discovery:
  - #41 A-07 deterministic validation (+8484/-1) OrionArchitekton, verify SUCCESS, mergeable, unreviewed
  - #43 B-04 usability/accessibility test protocol (+349/-0) OrionArchitekton, verify SUCCESS, mergeable, unreviewed
  - #44 Track C red-team/privacy/fairness (+1831/-2) Lucface, DRAFT, checks blocked on action_required
