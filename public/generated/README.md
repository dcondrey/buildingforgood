# public/generated

Deployment-safe aggregate JSON artifacts, the only data the app ships. Written by
the pipeline together with a manifest (schema version, build time, input
checksums). Must never contain precise locations, addresses, record identifiers,
or anything else on the privacy deny-list (issue #7).

The pipeline outputs (`observations.v0.json`, `quality_report.v0.json`,
`manifest.v0.json`) are BUILD PRODUCTS, never committed: run
`./scripts/build_artifacts.sh` (verify.sh does this automatically). A committed
generated artifact is a second, permanent copy that no scan can retract (C-02
boundary ruling; pre-decommit copies remain in git history as a documented
limitation, mirroring the already-public upstream source).

`prepared_scenario.v0.json` is a hand-written placeholder pending the issue #2
scenario lock; it carries no observation data and stays committed.
