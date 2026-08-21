# data/raw

Ignored source snapshots exactly as analyzed. They are never deployed and are
not committed unless a source license and the project's privacy policy both
permit redistribution. Provenance, permitted use, limitations, and exact
SHA-256 pins live in `data/cards/source_ledger.yaml` and
`data/cards/checksums.sha256`.

The shipped `demo.v1` lineage requires the five organizer-supplied CSVs listed
in the ledger under `data/raw/hackathon_provided/`. Public DSDP reports provide
aggregate checkpoints but do not substitute for that bundle's block-level
fixed panel, crosswalk, and method files. Optional reporting-bias, paid-parking,
and weather diagnostics use mutable City/NOAA exports; their URLs and snapshot
limitations are also recorded in the ledger.

Verify an already staged snapshot without network access:

```bash
./scripts/fetch_raw.sh verify-demo
```

Fetch the current public diagnostic inputs and then compare them with the
pinned snapshot:

```bash
./scripts/fetch_raw.sh demo
```

The second command intentionally fails if an upstream daily export changed.
Audit the change before deliberately re-pinning and regenerating the artifact;
never silently combine snapshots. Request records, descriptions, block IDs,
addresses, coordinates, and meter locations remain raw-only. Only aggregate,
contract-validated output may enter `public/generated/`.

Fetch and verify the allowlisted DSDP monitoring report separately:

```bash
./scripts/fetch_raw.sh monitoring
```

Its transcribed aggregate values live in `data/monitoring/` and remain
explicitly excluded from `demo.v1` training, forecasting, and planning.
