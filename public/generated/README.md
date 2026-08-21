# public/generated

Deployment-safe aggregate JSON artifacts, the only data the app ships. Written by
the pipeline together with a manifest (schema version, build time, input
checksums). Must never contain precise locations, addresses, record identifiers,
or anything else on the privacy deny-list (issue #7).

`prepared_scenario.v0.json` is currently a hand-written placeholder pending the
issue #2 scenario lock; the pipeline replaces it in M2.
