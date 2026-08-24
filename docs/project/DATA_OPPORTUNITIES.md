# Data opportunities — San Diego

**Scope.** San Diego only. Running this tool on another geography is not a goal
and is not a claim; see `DECISIONS.md`, 2026-08-24. Everything below is about
making the San Diego deployment more useful, better sourced, or better checked.

**Method.** Every figure here was executed against the real files, not taken
from the ledger's description of them. Where something was checked and found
*not* to work, it is recorded as such, because a ruled-out idea is worth more
than an unexplored one.

**Every number in section 1 is regenerable**, by
`python scripts/sdrdl_feasibility.py`. The arithmetic behind it lives in
`stillhere_pipeline.sdrdl` with fourteen tests on hand-computed values, because
a figure a document cites is a claim and this repository does not ship claims
with nothing behind them. The first draft of this document reported
those figures from a throwaway script in a temp directory, which made them
exactly what this repository refuses to ship — a number in a document with
nothing behind it. The script is deliberately outside `verify.sh`: it needs the
network and answers a question asked once, not on every commit.

---

## The shape of what we have

Seventeen sources are pinned in `data/cards/source_ledger.yaml`. Four feed the
shipped artifact:

| Source | Role |
| --- | --- |
| `hackathon_organizer_bundle` | the trend, the panel, the allocation basis |
| `get_it_done_cd3` | reporting-bias diagnostic |
| `parking_meter_activity` | exposure sensitivity |
| `noaa_count_day_weather` | weather sensitivity |

Two more drive the currency badge (`dsdp_public_monthly_reports`,
`rtfh_public_monitoring`). **The remaining eleven are pinned as context and feed
no computation.** That is not waste — several are there to let a reader check a
claim — but it is where the unused value is.

The shipped history is **108 months, 2017-01 through 2025-12**.

---

## 1. SDRDL corroborates the series — it does not extend it

**This section was rewritten on 2026-08-24 after executing the feasibility work
it originally proposed. Two of its claims were wrong and the conclusion
reversed.** What follows is what the data actually says.

`sdrdl_source` is a public archival package of the *same* DSP Clean & Safe
observations, digitized independently by San Diego Regional Data Library
volunteers. Verified live: both URLs return 200, `counts.csv` is 2.8 MB,
**25,891 records, 2014-01 → 2022-12, 103 months, 11 neighborhood labels.**

### What it is genuinely worth: independent corroboration

Aggregated to the six-area core and multiplied by the documented schedule, SDRDL
reproduces the official published monthly total across **70 overlapping months**:

| measure | value |
| --- | --- |
| median ratio (SDRDL ÷ official) | **0.991** |
| p10 – p90 | 0.924 – 1.049 |
| months within 5% | 74% |
| months within 10% | 89% |
| median ratio by year, 2017→2022 | 0.995, 0.991, 0.988, 0.990, 0.984, 0.990 |

Two independently digitized readings of the same paper maps agree to about **one
percent at the median, with no drift across six years**. Nothing else in this
repository corroborates the evidence base from outside itself. That is the prize
here, and it is larger than the thing originally proposed.

The disagreements are **structured, not noise**, which makes them fixable:

- **2022-02 (0.48) and 2022-03 (1.48)** are near-inverses — the signature of a
  survey attributed to the wrong side of a month boundary. Combined, the pair is
  close to par.
- **2018-03, -04, -05 all sit near 0.57** — a sustained three-month depression,
  consistent with an incomplete digitization stretch rather than a coding fault.
- **2018-11 and 2019-12** are in the official series and absent from SDRDL.

### What does not work: extending the history to 2014

The original proposal here was to gain 33 pre-2017 months and about 31% more
training data. **Executed, it fails.** Unmultiplied six-area composition:

| year | individuals | structures | vehicles |
| --- | --- | --- | --- |
| 2014 | 100.0% | 0.0% | 0.0% |
| 2015 | 100.0% | 0.0% | 0.0% |
| 2016 | 99.8% | 0.2% | 0.0% |
| 2017 | 83.4% | 15.3% | 1.3% |
| 2022 | 61.7% | 35.7% | 2.6% |

Tents did not appear downtown in 2017. This is an annotation change: before 2017
the digitization captured individuals only. So the pre-2017 months carry nothing
for a multiplier to act on, understate the total by whatever tents and vehicles
existed, and the 2016→2017 jump from 0.2% to 15.3% is an artifact boundary that
a forecaster would read as trend. **Do not splice them in.**

### The type-code question, and a correction

An earlier draft of this document claimed 2018 was an internal control because
it "carries both encodings." **That is false.** 2018 is a clean switchover:
text through June, numeric from July, with **no month and no file containing
both**. The year-level totals looked similar because they are different halves
of one year, not the same records coded twice.

The mapping matters, because `2` and `3` select multipliers that differ (1.75
tent vs 2.03 vehicle). The package cannot settle it: its schema documents `type`
as `"Individual", "Structure" or "Vehicle"` and **never mentions the numeric
codes** that ~60% of records use — and its two description lines list the
categories in *different orders*, so order-based inference is ambiguous between
exactly the two that matter.

The 70-month overlap settles it empirically instead. Scored against the official
series:

| mapping | median ratio | mean abs. difference |
| --- | --- | --- |
| **2=Structure, 3=Vehicle** | **0.991** | **57.1** |
| 2=Vehicle, 3=Structure | 1.020 | 69.0 |

The documented listing order wins on both measures. That is evidence, not proof;
the upstream project repo (MIT, `sandiegodata-projects/downtown-partnership`) or
SDRDL could confirm it outright.

### Other hazards that stand

- **Label eras.** `core` (2014-2019) and `City Center` (2020-2022) are disjoint
  in time — one area relabelled, not two areas. `east_village_south` appears
  only from 2017. `Barrio Logan`, `Golden Hill` and `Sherman Height` (sic)
  appear only from 2021 and are outside the core; they must be excluded by name.
- **Licensing was over-weighted in the first draft of this document.** The
  package is public and unauthenticated, the observations are facts, the project
  repo is MIT, and what ships here is a median and a set of percentages — not
  the counts. Attribution to SDRDL and DSP is the real obligation and it is
  discharged inside the artifact. The ledger's old instruction to "confirm reuse
  beyond a hackathon demo" was written when this was a hackathon project; it has
  been discharged and is not a standing gate on public factual data."
- **Point coordinates never deploy.** The package carries EPSG:2230 x/y on the
  deny-list. Aggregation happens inside the pipeline, as it already does.

## 2. Ship the agreement check as a product surface

Section 1 ran this analysis once, by hand, in a scratch directory. The result is
strong enough to be worth building properly, and this is the concrete piece of
work that follows from the feasibility study.

The repo already treats digitization disagreement as a first-class subject —
`digitization_audit.json`, `digitization_audit_agreement.json`, and the whole
`eyepop_audit` CLI — but only compares one pipeline against itself at different
resolutions. An independent second digitization is a strictly stronger check and
it exists for 70 months.

What shipping it means, in the order it should be done:

1. A pipeline step that fetches the package, aggregates inside the boundary
   (points never leave), applies the multiplier schedule, and emits **only the
   agreement statistics** — never the counts. That keeps the licensing ask small
   and the privacy posture unchanged.
2. A surface that answers "how much of this trend is the phenomenon and how much
   is the transcription?" with a number rather than a caveat. Today the product
   discloses that digitization is imperfect; it could instead show that two
   independent digitizations agree to about a percent.
3. The three localized defects from section 1 as named exclusions with reasons,
   not as silent drops.

**Sequencing note.** Do 1 and 3 before 2. An agreement figure on screen is a
claim, and the claim inventory will want it bound to the code that computes it.

---

## 3. What this does and does not do for F-2

F-2 says the artifact cannot be rebuilt from a clean checkout, because five
organizer files are not redistributable. Fifteen tests skip for it.

An earlier draft of this section claimed the SDRDL package makes "the 2014-2022
evidence base reproducible from public sources." **That was too strong, on two
counts.** The pre-2017 months are not usable at all (section 1), and for
2017-2022 the package corroborates the official series to about a percent rather
than reproducing it — a 0.991 median ratio is agreement, not reconstruction.

What is honestly available is narrower and still worth having: **the shape of
the series can be independently checked from public data even though the series
itself cannot be rebuilt.** That is a better sentence for an evaluator than
today's, and it does not require overstating anything. F-2 does not close, and
the skip ledger does not move.

---

## 4. The loaded hourly rate — what was already ruled out, and what is left

The reference profile ships `loaded_hourly_rate: 45` explicitly labelled
`operator_set_assumption` and "not a measured or derived rate."

**This was already investigated properly and the negative result is correct.**
The pinned City PRA contract releases publish outreach personnel totals — the
ledger cites the FY23 Family Reunification agreement's $582,079 personnel line —
but **no fielded-FTE or field-hour denominator**, so no honest hourly rate can
be divided out. Do not re-propose deriving a rate from the text records; that
ground is covered.

**What is genuinely unchecked** is the ledger's own note that the *image-only*
executed agreements "may carry FTE exhibits." Those have not been read, because
they are scans. This repo already has handwriting/OCR capability built for
exactly this kind of document (`pipeline/src/stillhere_pipeline/eyepop_audit.py`,
Apple Vision locally or EyePop by flag).

So the concrete move is: OCR the image-only PRA exhibits and look for an FTE or
field-hour denominator. If one exists, the placeholder becomes a sourced number
and the cost layer stops being the weakest surface in the product. If none
exists, that is a citable negative result and the placeholder stays honest.
Either outcome is worth having; today the question is simply unanswered.

---

## 5. Capacity context the planner could be compared against

`city_pra_outreach_contracts` documents contracted street-outreach staffing —
the ledger cites PATH's four outreach staff per day. The reference profile sets
`team_count: 2` and `coverage_floor_hours: 8` as operator judgment with nothing
beside them.

The honest use is **comparison, not input**: show the operator what the City has
contracted for, next to what they are planning. The ledger is explicit that
contracted staffing is a requirement rather than observed fielded staffing, and
that it must never become a forecast feature or allocation weight. A side-by-side
panel respects that and still tells a program director something they cannot
currently see.

Same shape for `hud_case_management_ratios`, with the same care the ledger
already takes: the shipped 1:15 and 1:12.5 figures are *shelter case-management*
ratios from a proposal, not street-outreach caseload, and must stay labelled as
such.

---

## 6. Data quality, in the order it costs us

1. **The `type` vocabulary split** (above) — the only one that can silently
   corrupt a number, because it feeds multiplier selection.
2. **Neighborhood label normalization** — two casings, two naming conventions,
   one probable typo (`Sherman Height`), and three out-of-core areas that must
   be excluded by name rather than by assumption.
3. **Four missing 2025 months** are retained as missing and never zero-filled,
   which is correct and should stay correct. Worth a regression test if one does
   not exist, since zero-filling is the kind of thing a future convenience edit
   introduces.

---

## What this does not propose

- Any new geography. Out of scope.
- Any use of 311 or Get It Done volume as allocation weight. Refused by type,
  and that refusal is the product's spine.
- Any person-level or point-precision data reaching the deployed artifact. The
  SDRDL package carries EPSG:2230 point coordinates and sits on the deny-list;
  it must aggregate inside the pipeline exactly as the current primary does.
