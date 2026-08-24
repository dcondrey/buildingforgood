# Data opportunities — San Diego

**Scope.** San Diego only. Running this tool on another geography is not a goal
and is not a claim; see `DECISIONS.md`, 2026-08-24. Everything below is about
making the San Diego deployment more useful, better sourced, or better checked.

**Method.** Every figure here was executed against the real files, not taken
from the ledger's description of them. Where something was checked and found
*not* to work, it is recorded as such, because a ruled-out idea is worth more
than an unexplored one.

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

## 1. Extend the history to 2014 from a public package — highest value

`sdrdl_source` is a public archival package of the *same* DSP Clean & Safe
observations, digitized independently by San Diego Regional Data Library
volunteers. Verified live on 2026-08-24: both URLs return 200, `counts.csv` is
2.8 MB.

Executed against the real file:

- **25,891 records, 2014-01 → 2022-12, 103 distinct months, 11 neighborhood labels.**
- **33 of those months predate the current history start.** Adding them takes
  training history from 108 to roughly 141 months — about **31% more data** for
  the forecast, the backtest, and the interval calibration window.
- **72 months overlap** the current series (2017-01 → 2022-12), which is what
  makes opportunity 2 possible.

**Why it is tractable.** SDRDL counts are deliberately *unmultiplied*, so they
diverge from official DSP totals after 2017-04-27. The conversion is not
guesswork: the multiplier schedule already ships in the artifact as
`observations.methodology_periods`, with `PRE2017` carrying tent 2.0 / vehicle
2.0 exactly as the ledger describes. The machinery to apply it exists.

**Four hazards, all real, none blocking:**

1. **The `type` column uses two vocabularies.** `Individual/Structure/Vehicle`
   through 2017, `1/2/3` from 2019, and **both in 2018**. Since multipliers
   differ by type, a wrong mapping corrupts the series. It does not have to be
   guessed: 2018 is a natural control, and the two encodings agree closely there
   (text 1202/193/62 vs numeric 1137/210/52), which supports
   `1→Individual, 2→Structure, 3→Vehicle`. Confirm against SDRDL's `metadata.csv`
   before relying on it.
2. **Pre-2017 is almost entirely individuals** — 2014 records one vehicle and no
   structures; 2015 none; 2016 two. So multipliers are near no-ops before 2017
   and the pre-2017 level is effectively a raw individual count. It is not
   level-comparable with the multiplied era, and the existing limitation about
   cross-break comparison would need extending rather than reusing.
3. **Neighborhood labels differ** — `City Center` and `core` alongside
   `east_village`, `east_village_south`, `gaslamp`, `cortez`, `marina`,
   `columbia`, plus `Barrio Logan`, `Sherman Height` (sic) and `Golden Hill`,
   which are outside the six-area core. `Area_Crosswalk.csv` is the obvious
   place to resolve this; the out-of-core labels should be excluded by name, the
   way the East Village quadrants already are.
4. **Licensing is an open question, not a formality.** The ledger records no
   explicit data license and says to confirm reuse beyond a hackathon demo with
   SDRDL (`eric@sandiegodata.org`). The counts belong to DSP. **This should be
   settled before the data ships, not after** — it is the same class of mistake
   as the invented profile, in the opposite direction.

---

## 2. A source-level digitization agreement check

The 72-month overlap is two **independent digitizations of the same paper
maps**: SDRDL volunteers with VGG VIA annotation, and the organizer bundle's
separate digitization. The repo already treats digitization disagreement as a
first-class subject — `digitization_audit.json`, `digitization_audit_agreement.json`,
and a whole `eyepop_audit` CLI — but currently only *within* one digitization
pipeline at different resolutions.

Comparing two independent digitizations of the same source is a strictly
stronger check, and it is available for 72 months at no new data cost. It would
give a defensible answer to "how much of the trend is the phenomenon and how
much is the transcription?" — which is the question the audit exists to ask.

---

## 3. Most of the series becomes publicly reproducible

F-2 says the artifact cannot be rebuilt from a clean checkout, because five
organizer files are not redistributable. Fifteen tests skip for this.

The SDRDL package is public and fetchable. It does not cover 2023-2025, so F-2
does not close — but it changes from "none of this is reproducible" to "the
2014-2022 evidence base is reproducible from public sources; 2023-2025 is not."
That is a materially better sentence for an evaluator, and it should reduce the
skip ledger rather than leaving all fifteen attributed to one cause.

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
