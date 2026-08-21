# PR log — dcondrey/buildingforgood
Cycle 1, 2026-08-21T01:55Z. All PRs target track/d-integration-release, not main.

#41 | OrionArchitekton | MERGED | squash-merged 01:52Z after code review (fail-closed normalization, deterministic build, verify green) | nobody | closed
#43 | OrionArchitekton | MERGED | squash-merged 01:51Z (doc-only protocol, verify green, storyboard byte-identical to track/b) | nobody | closed
#44 | Lucface | CHANGES_REQUESTED | reviewed 01:54Z, REQUEST_CHANGES: R-06 small-cell gate does not match real artifact keys (total/individual/structure/vehicle); 306 real small cells pass the scan. CI run approved manually (fork PR), verify green. Draft. | Lucface: fix key matching, surface suppression policy question; lead: coverage-floor ruling (8h→6h) + small-cell suppression policy | 0.2h

## Stalls
none yet (cycle 1)

## Notes
- track/d-integration-release verify: green on both post-merge push runs.
- Fork PR CI runs need manual approval each push (Lucface is not a collaborator). Approve via `gh api -X POST repos/dcondrey/buildingforgood/actions/runs/<id>/approve`.
- Decisions parked for the lead: (1) planner coverage floor 8h→6h + uncertainty_weight 0.5 (PR #44 body, resolves `planner.*.provisional` release blocker); (2) small-cell suppression policy for the 306 real cells (5 totals, 301 by-type) in public/generated/observations.v0.json.
