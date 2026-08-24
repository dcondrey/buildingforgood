# Geography provenance: the 261-block panel and the six neighborhood definitions

**Queue item 2.2.** What I could establish from the repository, what I could
not, and what would have to be obtained.

**Bottom line: partially establishable.** The six *area names* have a real,
citable source. The *boundaries* do not, and the *261-block panel membership*
cannot be verified from anything in this repository at all — the file that
defines it is untracked, unfetchable, and its checksum pins a file no adopter
can obtain. The build session has independently reached most of this conclusion
in `config/README.md`; two things below are not in their account.

---

## 1. The six area names — **establishable**

`City Center, Columbia, Cortez, East Village, Gaslamp, Marina`, hardcoded as
`CORE_AREAS` at `pipeline/src/stillhere_pipeline/demo.py:35-42`.

Two independent citable sources hold these names:

- Downtown San Diego Partnership's published Unsheltered Sleep Count reports.
  The June 2026 PDF is pinned at
  `data/raw/dsdp_public_reports/June-2026-Unsheltered-Sleep-Count.pdf`
  with SHA-256 `bfa71981b1e37ba1…` in `data/cards/checksums.sha256`, and its
  April/June area totals are transcribed in
  `data/monitoring/dsdp_public_checkpoints.csv`.
- SDRDL downtown-homeless analysis package 2.1.1, whose `neighborhood_totals`
  file covers "six neighborhoods" per the ledger
  (`data/cards/source_ledger.yaml:120`), pinned at
  `c61f36bcf64aadc4…`.

**Vintage:** the names are stable across the SDRDL package (last modified
2022-04-20) and the June 2026 DSDP report, so at minimum 2022–2026.

**Boundary authority:** none. DSDP is the *naming* authority. It is not a
boundary authority and publishes no boundary file. This distinction is the
whole of the problem below.

One wrinkle worth recording: DSDP publishes **seven** areas, not six. The
seventh is "Outside Perimeter," excluded from the shipped geography, and the
project-derived `six_area_core_total` rows exist precisely to make that
exclusion explicit and checkable. Separately, `scripts/gen_area_outlines.py:20-28`
shows the block grid carries a *"South East Village"* label that is folded into
`east_village`. So the six-area geography is DSDP's seven-area published
geography minus one area and with one label merged — both defensible, both
project decisions rather than publisher facts.

## 2. The boundaries — **not establishable**, and the shipped map is worse-sourced than the docs say

`app/src/features/spatial/areaGeometry.ts` ships `AREA_MAP_GEOMETRY`: six SVG
outline paths in viewBox units. Its header says they were "derived by
dissolving the organizer block grid to area level … (scripts/gen_area_outlines.py)".

That script reads:

```python
# scripts/gen_area_outlines.py:20
GEOJSON = "/Volumes/A/stillhere/data/raw/hackathon_provided/Downtown_BlockGrid.geojson"
```

**`Downtown_BlockGrid.geojson` appears nowhere in the repository's provenance
machinery.** I checked all three places it would have to appear:

| Place it should be | Present? |
| --- | --- |
| `data/cards/checksums.sha256` | **no** |
| `data/cards/source_ledger.yaml` → `hackathon_organizer_bundle.files` (5 CSVs listed) | **no** |
| `scripts/fetch_raw.sh` required-file list | **no** |

So the only geometry the product ships is derived from an unledgered file, read
from a hardcoded absolute path on a removable volume (`/Volumes/A/`) belonging
to one developer's machine. It has no recorded publisher, no vintage, no
retrieval date, and no checksum. The outlines cannot be regenerated or verified
by anyone else — not by an adopter, not by a reviewer, not by the build session
on a different machine.

The docstring says "rerun only if the block grid changes," which cannot be
done, and would silently produce different outlines if the file were ever
replaced.

**This is the sharpest finding in this document**, and it is not in
`config/README.md`'s account. That README says the boundaries are `unresolved`
and explains why no *published* boundary exists — correct — but it does not
disclose that a real, unversioned geometry file was nonetheless used to draw
the map that ships.

Two smaller corrections to the same passage:

- `config/README.md:93` and
  `config/profiles/san-diego-downtown.v1.json:48` both describe the private
  geometry as a "block-**centroid** grid." It is not. `gen_area_outlines.py`
  iterates `f["geometry"]["coordinates"]` as rings and computes per-block
  bounding-box width and height — these are **polygons**.
  `pipeline/src/stillhere_pipeline/privacy.py:209,605` independently calls them
  "382 block polygons." The profile's provenance note is the document an
  adopter reads; it should say polygons.
- 382 block polygons versus a 261-block analytical panel: those are two
  different block sets, and the relationship between them is not stated in the
  provenance note.

**Effect on the product, in fairness:** the boundaries are honestly labeled
"simplified neighborhood boundaries" in the UI (`App.tsx:1338, 2011, 2759`) and
snapped to a coarse block-pitch cell grid, so no block geometry is recoverable
from them. The privacy posture holds. What does not hold is the *provenance*
claim: a reader cannot trace the shipped outlines to any source.

## 3. The adjacency table — **genuinely absent, and correctly so**

`config/decision.v1.json` → `geography.adjacency_version: null`.

No adjacency table exists in the repository, and none was derived. The stated
reason is that deriving one would rest on the same deny-listed coordinates,
which is sound.

I verified this is load-bearing rather than decorative:
`pipeline/src/stillhere_pipeline/drop_test.py:1-9` forces the classification to
`insufficient_evidence` while any force-insufficient condition holds, and "the
geography version is unresolved today" is named as one of those conditions. So
an unresolved adjacency makes the product refuse to claim
`possible_displacement`. **The absence is wired to a refusal, not just
documented.** That is the right direction and worth crediting.

## 4. The 261-block panel — **not establishable from this repository**

`261` is a hardcoded literal at `pipeline/src/stillhere_pipeline/demo.py`
lines 1595, 1964, 1993, 2074-2075, 2095, 2101, 2124, 2661, 2702.

Panel membership comes from
`data/raw/hackathon_provided/BlockLevel_Counts_Panel261.csv` and the
`in_panel_261` column of `BlockLevel_Counts.csv` (`demo.py:1440`).

What I can establish:

- The file is **pinned**: SHA-256 `c45dfa15015b6683b798ade2dda9a23cb45050ccf5397a2abac8c6f56e4f2353`.
- It is **required**: `scripts/fetch_raw.sh:26` lists it and exits 1 without it.
- It is **ledgered**: `source_ledger.yaml:225`, under `hackathon_organizer_bundle`.

What I cannot establish, and neither can any adopter:

- **Who selected the 261 blocks, on what criterion.** The ledger's
  `analytical_question` says the panel answers a question about "a fixed
  261-block panel"; nothing says how the 261 were chosen from the 382, or by
  whom, or whether the criterion was balance, coverage, data completeness, or
  something else. `demo.py:1964` labels a `balanced_261_panel` flag, which
  implies a balance criterion, but the criterion itself is not recorded.
- **Its vintage.** `retrieved_at: "2026-08-20; exact local retrieval time was
  not recorded"`. The ledger states `package_page: null` and
  `availability: "Participant-supplied bundle with no public download URL
  recorded."`
- **Whether the checksum means anything to a third party.** A pin over a file
  nobody else can obtain proves the project did not change it. It does not let
  anyone else confirm what it contains. This is the same gap the build session
  recorded as finding F-2.

## 5. Why `geography.version` says `pending-source-audit`

`config/decision.v1.json` → `version: "downtown-demo/pending-source-audit"`,
`status: "unresolved"`, `blocking_issue_numbers: [18, 33, 34]`,
`resolution_rule: "Publish a versioned area list and adjacency table after
source naming, boundary, and coverage review."`

One thing to flag that I have not seen noted anywhere: **that block is not
about the shipped geography at all.** Its `candidate_area_labels` are

```
east_village, east_village_south, gaslamp, sherman_heights,
barrio_logan, golden_hill, cortez_hill
```

Only *East Village* and *Gaslamp* overlap the six areas that ship. Sherman
Heights, Barrio Logan, and Golden Hill are not DSDP downtown count areas.
This is the residue of the project's first scenario (East Village and a
displacement question), which `config/README.md` now documents as superseded.

So "geography is unresolved" is true, but the unresolved record describes a
seven-area geography the product abandoned. Anyone auditing
`decision.v1.json`'s geography block is auditing the wrong geography. The
organization-profile work supersedes this correctly; the residue is worth a
sentence in `decision.v1.json`'s own notes so a future reader does not
reconcile two area lists that were never meant to match.

---

## Summary table

| Component | Source | Vintage | Boundary authority | Status |
| --- | --- | --- | --- | --- |
| Six area **names** | DSDP Sleep Count reports; SDRDL package 2.1.1 | 2022–2026 | n/a (naming only) | **established** |
| Area **boundaries** (shipped map) | `Downtown_BlockGrid.geojson`, unledgered, `/Volumes/A/` | unknown | none | **not established** |
| **Adjacency** | none | n/a | none | **absent by design; wired to a refusal** |
| **261-block panel** membership | organizer bundle, pinned but unobtainable | 2026-08-20 retrieval | n/a | **not established** |

## What would have to be obtained

1. **From DSDP / Clean & Safe:** a boundary file or map for the six named count
   areas, with a version and a date. Without this the boundaries stay
   unresolved no matter what else is done.
2. **From the hackathon organizer:** the origin of `Downtown_BlockGrid.geojson`
   — who produced it, from what, when — and permission to ledger and pin it.
   Failing that, it should be removed from the pipeline that produces shipped
   artwork and the outlines redrawn from something citable, or the map's
   provenance disclosed as unresolved in the UI the way the profile does it.
3. **From the hackathon organizer or SDRDL:** the panel-selection criterion for
   the 261 blocks, and whether the selection is reproducible from
   `BlockLevel_Counts.csv` alone.
4. **From SDRDL:** whether the "South East Village" label merge and the
   Outside Perimeter exclusion match how DSDP itself aggregates.

Items 2 and 3 are the ones that block reproducibility. Item 1 blocks anything
that depends on where one area stops and the next begins — which today is
nothing, because adjacency is refused.

## What I could not determine

- Whether `Downtown_BlockGrid.geojson` was part of the organizer bundle at all
  or was assembled by the project. The filename sits under a
  `hackathon_provided/` path, which suggests the former, but the ledger's
  five-file list for that bundle does not include it, which suggests the
  latter. I found no commit message, note, or comment that settles it. **This
  is a question for the build session, not a finding against it.**
- Whether the 382-polygon set and the 261-block panel share block identifiers.
  Both files are untracked; I have no way to check.
