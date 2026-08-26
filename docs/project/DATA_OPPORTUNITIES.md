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

## 4. The loaded hourly rate — answered by reading, not by assuming

The reference profile ships `loaded_hourly_rate: 45`, labelled
`operator_set_assumption` and "not a measured or derived rate."

**The prior negative result is confirmed, and now by direct examination rather
than inference.** The PRA documents are publicly retrievable — the ledger's
"manual authenticated download" overstated it, and two pinned files were
re-fetched on 2026-08-24 and reproduced their SHA-256 byte for byte. Their text
was extracted and searched:

- **FY23 DSDP Family Reunification agreement** (doc `22974587`): the budget
  exhibit is three lines — Personnel $582,079, Non-Personnel $367,921, Total
  $950,000. Zero occurrences of `FTE`, "full-time equivalent", "caseload" or
  "salary"; one of "hours", in a records-access clause. **There is no
  denominator in this document.**
- **PATH Coordinated Street Outreach contract** (doc `22974590`): staffing is
  specified — "two outreach staff (2 people in total per shift; 4 people in
  total per day) plus a team leader", "Staff two shifts per day", Rapid Response
  available seven days a week. That confirms the ledger's "4 outreach staff/day"
  as a **contract requirement**, which is not observed fielded staffing and
  cannot be divided into a rate.

### The trap, which is the useful part

The PATH document *does* contain an hourly figure, and it must not be used:

> Scenario A: ((10.0 direct service FTE × $25/hours × 2080 hours/year) /
> $1,000,000 total budget costs) × 5 maximum points

That is a **worked example inside the RFP's pricing-evaluation section**,
written to explain how bids are scored. `$25/hour` is not PATH's rate, not the
City's rate, and not anyone's rate. Anyone grepping these contracts for
"hourly" will land on it first. Do not cite it, and do not let it become the
replacement for the $45 placeholder — swapping one unsourced number for a
number that means something else is worse than leaving the placeholder honest.

The one genuinely citable convention in there is **2080 hours/year**, which is
the City's own stated FTE-hours basis. That is a denominator for converting an
FTE to hours; it is not a cost.

### The image-only exhibit, read — and why the answer is structural

The ledger noted that some releases are image-only and had therefore never been
read. `Revised Signed Copy FY22 Scope and Budget HRC (carryforward).pdf` (doc
`25768210`) is one: it carries no text layer at all. It is also, by title, the
likeliest place in the corpus for a staffing denominator.

It has now been read — nine pages, ~13,800 characters, via `tools/ocr/ocr.swift`,
which uses macOS PDFKit and Vision and needs nothing installed. Result: **zero
`FTE`, zero "full-time", zero hours figures, zero positions, zero "hourly".**

What it does contain is the reason the denominator is missing everywhere else:

> LINE ITEM Consultant Services … **PATH Supportive Services Contract. This
> represents the total costs (both personnel and non-personnel expenses) of the
> contract with PATH** to provide HRC system navigation services.

The budget has `SALARIES & WAGES` and `FRINGE BENEFITS` lines, and the outreach
money does not run through them. It is booked as **Consultant Services**, a
single figure that collapses personnel and non-personnel together by
construction.

**That is structural, not an omission.** Outreach staffing is *purchased as a
contracted service*, so the buyer's books carry a contract value and never carry
hours or an FTE count. The hours exist in the contractor's payroll, which is not
a public record. This is why the search kept failing, and why more searching
will not fix it.

### The whole corpus, surveyed

Reading documents one at a time was the wrong method for thirty-six of them.
`scripts/survey_pra.py` walks the pinned list: locates each on the portal,
downloads it, compares its SHA-256 to the pin, decides typed or scanned, OCRs
the scans, and scans the text for staffing and cost denominators.

Full run, 2026-08-25, after the matcher was widened:

| | first pass | after |
| --- | --- | --- |
| pinned documents | 36 | 36 |
| located | 18 | **33** |
| hashes reproduced exactly | 18 | **33** |
| hash mismatches | 0 | **0** |
| not found by title | 15 | **0** |
| typed / scanned | 12 / 6 | 22 / 11 |
| read, including OCR | 18 | **33** |

**Every PDF in the pinned corpus was located and every hash reproduced byte for
byte.** The three not reproduced are the `.xlsx` files, which this survey skips.
That converts the PRA provenance from a record into a reproducible fact.

The first pass missed fifteen because it searched on the whole filename stem,
which is often too specific to hit anything — the executed PATH contract is not
returned by a search for its own filename and is returned by a search for
`10089902`. `search_terms` now falls back from the stem to a truncation to the
embedded RFP or PRA number, and matching tolerates punctuation and a clerk's
appended suffix while still requiring a long shared opening, because a hash
attached to the wrong document is worse than no hash.

### What the survey found about the rate

**The first genuine FTE-with-dollars pairing in the corpus**, in
`Proposal_Alpha Project.pdf` (doc `43532436`) — a *Pricing and Fee Schedule*:

> PERSONNEL & FRINGE · POSITION TITLE · **NUMBER OF FTEs TO BE BILLED TO THIS
> PROJECT** · **Average Annual Salary** · Total — Program Director 1.00
> $90,000 · Program Manager 1.00 $75,000 · Services Coordinator 1.00 $62,000 …

It is the right *shape* of document and the wrong program twice over: it prices
a **non-congregate family shelter**, not street outreach, and it is a
**proposal** — what a provider bid, not what was paid. Using it for outreach
hours would repeat the category error the ledger already warns about with the
1:15 and 1:12.5 shelter case-management ratios.

**The FY24 Adopted Budget pairs FTE with personnel dollars, but only citywide.**
`fy24ab_v1cbo.pdf` gives 13,030.17 FTE against $2.02bn of personnel expense by
fund type and labor group. There is no departmental breakdown in this volume —
it is the Citywide Budget Overview, and the departmental volumes are not pinned.
Dividing the citywide figure would average police, fire and utilities into an
outreach rate.

**Both executed street-outreach agreements are now read in full, scans
included, and neither carries a denominator.** The CityNet agreement OCR'd to
106,930 characters; its only hours figure is a 24-hour incident-reporting
deadline. PATH's is the scoring-example trap above. That is the structural
finding confirmed across the corpus rather than inferred from two documents:
outreach is bought as a service, so the buyer's records carry a contract value
and the hours stay in the provider's payroll.

So the answer stands, and is now sharp about what would change it: **a pricing
and fee schedule from a street-outreach bid**. The corpus proves that document
type exists — the Alpha Project proposal is one, for a shelter — and does not
contain one for outreach. The executed agreements are pinned; the responses that
priced them are not.

## 4c. The sweep, run: 466 documents, and why the yield is low

`scripts/discover_pra.py` sweeps the portal by title across homelessness terms,
paginating, deduplicating, and writing an inventory. It downloads nothing:
choosing what to open should be a decision somebody makes rather than a side
effect of a sweep. Titles suggesting rosters, intake, case files or complaints
are flagged and left alone, because a bulk pull of unreviewed public-records
releases into a project whose whole claim is that no person-level data exists
here is exactly how person-level data would arrive.

Run on 2026-08-25: **466 distinct documents**, against 36 pinned. Sixteen
candidates after filtering. Two flagged and not opened.

### Municipal vocabulary is the problem, and it is worse than it sounds

The first filter asked only whether a title looked like data, and returned
**sixty-eight "CSD P6 Monthly Report" documents** — underground utility
undergrounding, Rule 20A, project numbers in La Jolla and Clairemont Mesa. The
sweep term was "monthly report", which matches most of a city's paperwork.

Tightening it to require a homelessness word *and* a data word cut 102
candidates to 16. Then the two most promising of those were opened and both were
false positives of the same kind:

- **"24-DG-11052021-228 Jan 2026 Report - Outreach"** is Urban Forestry's
  street-tree programme. In City vocabulary "outreach" is community outreach.
- The inventory also surfaced a link to the City's own
  `homelessness-strategies-and-solutions/data-reports` page. It carries three
  strategy PDFs and no data series.

"Shelter" also matches animal shelter, and "bridge" matches literal bridges.
Title-only search over a municipal corpus has a high false-positive rate that no
regex fixes, because the words genuinely mean other things.

### What is actually there

Real homelessness documents, in quantity, and of one shape: executed scopes and
budgets, contracts and amendments, close-out reports. A Family Center close-out
report gives "Total Served 3,670" and outcome indicators — genuine data, at
programme grain, about shelter. Nothing found is area-and-month, and nothing is
outreach observation.

**That is structural rather than unlucky.** This portal holds the *buyer's*
contracting records. The observations this product runs on are the publisher's,
and they come from DSDP and SDRDL — already pinned, and now corroborated three
ways in section 4b. Sweeping the City's contract files for observation data is
looking in the wrong filing cabinet, and the sweep is worth keeping mainly
because it establishes that.

### A correction: hours records do exist, and I had said they did not

An earlier version of this document said the buyer's records "never carry hours".
That was too strong, and searching for the document types that carry hours —
which the first sweep did not do — found them.

`OHS Timesheets_1-Released_Redacted.pdf` (doc `13632098`, request 20-5647) is a
257 MB scan of SAP *Approve Working Times* screens: named employees, daily hours
booked against cost objects. The Office of Homeless Solutions is the predecessor
of today's Homelessness Strategies & Solutions department. **Hours are there.**

They do not answer this question, for three reasons stated rather than implied.
The records are from 2013. They are *City staff* hours, not the contracted
street-outreach workers a plan on this page allocates. And they are person-level
employment records — names against daily hours — which this project will not
pin, whatever their public-records status, because the one thing it claims is
that no person-level data lives here.

The contractor side was checked too. `FY20 Cortez Hill SDHC July 2019 Payroll
Bank Statement` sounds like payroll detail and is a **bank statement**: it proves
money moved and itemises no hours, no positions, no rates.

So the boundary is narrower and better evidenced than the earlier claim. The
City records its *own* employees' hours. What does not cross is the
**contractor's** hours, and that is exactly the gap the empty Schedule 2 above
describes: when the City buys the service, personnel is zero on its books and
the hours stay with the provider.

### Following it further: there are no hours because the accounting has none

The provider's own records do cross, in reimbursement backup. PATH's FY20
Connections claims include per-employee *salary and fringe worksheets* — the
most promising document in the entire search, and the place an hourly rate would
live if one existed anywhere in these files.

**Check where they came from before reading anything into them.** They are in
request 21-1196, which is a **Police** department request for bank statements
and general ledger detail. Not a homelessness request. The reimbursement backup
surfaced inside a financial-records disclosure, and the programmes it covers are
Connections, Rapid Re-Housing, Interim Housing and Cortez Hill — **housing, not
street outreach**. An earlier draft of this section carried the outreach framing
across from the rest of the search, which was wrong.

**A naming trap worth stating, because this repository is about exactly this.**
An earlier draft called the last of those "the Cortez Hill shelter". No such
thing was established. The cost object reads `534001- Cortez Hills CDBG- Admin`,
and the FY19 close-out report names the programme: the **Cortez Hill Family
Center**, providing "interim housing and supportive services to homeless
families with children", delivered under an agreement with the **YWCA of San
Diego County**. Interim housing for families is not a shelter in the sense the
shortened name suggests, and the documents speak only to FY19 and FY20 — they
say nothing about whether it operates today.

The compression mattered for a second reason. **`Cortez` is one of the six
planning areas in this product's geography.** "Cortez Hill" is a programme name.
Letting a programme label read as an area label is the same class of error as
the invented profile, arriving by abbreviation rather than by invention.

**It allocates by percentage of effort, not by hours.** One person's gross pay is
split across five funding sources at fixed rates — 16.50%, 22.40%, 21.10%,
20.00%, 20.00%, summing to exactly 100% — with no hours figure anywhere on the
form.

Percentage of effort is the share of someone's paid time attributed to each
funding source: a certified estimate of how the time divides, not a measurement
of what was worked. Splitting an analyst across five grant-funded programmes
this way is ordinary and permitted — CDBG and ESG both allow administrative
cost, capped, and a compliance role supporting five programmes is a real cost of
each.

It also explains the search. **There are no hours to find because the method
substitutes a percentage for hour tracking**, which is a stronger answer than
"not released" and closes the question rather than deferring it.

### What is there instead, and it is worth having

The worksheets itemise everything above gross wages: Pension, 457 Plan,
Medicare, SUI, Worker's Compensation, Life and LTD insurance, plus a Flex
Credit. That is precisely the "loaded" in `loaded_hourly_rate`, which the profile
defines as wages, payroll taxes, benefits, supervision and vehicle cost.

Total compensation against gross wages, across three staff and three pay
periods:

| | ratio |
| --- | --- |
| staff member A | 1.353 |
| staff member B | 1.338 |
| staff member C | 1.318 |
| **median** | **1.338** |

**A San Diego homeless-services provider's fully loaded cost was about 1.34 times
gross wages in FY20**, from the provider's own reimbursement filings. It is not
an hourly rate and cannot become one — no hours exist to divide by. It is the
other half of the calculation: an operator who knows what they pay can check
their loaded figure against a local, sourced multiplier instead of guessing at
one.

**Read it narrowly, and note which staff it describes.** Every cost object on
these worksheets is an administrative line — `Path GF Admin`, `ESG RRH-Admin`,
`Path CDBG-Admin`, `Cortez Hills CDBG-Admin`, `SVDP IH GF-Admin`. So this is an
**administrative** loading factor, from three staff at one provider in one fiscal
year. Whether field staff load the same way is not established here and should
not be assumed: benefit design, overtime exposure and workers' compensation
classification all differ between an office role and a street role, and
workers' compensation in particular is rated by occupation.

It is a reference point, not a rate, and not a substitute for an organisation's
own budgeted figure.

**On handling.** These worksheets name individuals and state their pay. They were
read to compute the ratio and deleted; no per-person document identifier appears
in this repository, and nothing person-level is pinned or deployed. That is the
same posture the pipeline already takes with SDRDL's point coordinates, which it
reads and aggregates and never ships.

### Where this search stops, and why it is a decision rather than a dead end

Following the invoice thread further did find provider records. `FY20
Connections Oct RFR PATH CONN CDBG OCT 2019 LIST OF EXPENDITURES` (doc
`11367718`) is PATH's own reimbursement backup, and it contains **named
employees with per-employee amounts claimed** — pension, Medicare, workers'
compensation, line by line.

So the contract boundary is not absolute after all: a provider's compensation
detail does reach the City's files, through reimbursement backup. What that
particular form carries is fringe *dollars* per employee, not hours, and it
covers a housing programme rather than street outreach.

**The search stops here on purpose.** The next step down this path is opening
more per-employee compensation records looking for a Personnel line item that
lists hours — and that means accumulating named people's pay data inside a
project whose single loudest claim is that no person-level data lives in it.
The public-records status of those documents does not change what they are.

That is a different answer from "nothing was found". Something was found, it is
recorded, the files were deleted from scratch rather than kept, and the reason
for not going further is a commitment rather than an absence. If the loaded rate
ever needs a source badly enough to reopen this, the route is to ask a provider
for an aggregate — hours and cost, no names — not to reassemble one from other
people's payroll.

## 4d. Would scraping more find the rate? No, and here is the proof

The pinned corpus is 36 documents against 166,105 public ones, so the question
is fair. Measured rather than guessed:

| title search | documents |
| --- | --- |
| shelter | 228 |
| outreach | 100 |
| homeless | 76 |
| HHAP | 46 |
| scope and budget | 25 |
| fee schedule | 15 |
| encampment | 13 |

So a homelessness-relevant sweep is a few hundred documents, not 166,105. It is
tractable. Three things bound what it could return.

**The search is title-only.** `"Pricing and Fee Schedule"` returns nothing,
because that phrase sits in the body of the Alpha Project proposal and not in
its title. Content is not discoverable without downloading, and titles mislead:
`16b. Compensation & Fee Schedule.pdf` is an Arcadis sewer-and-water
construction contract.

**There is no per-request enumeration.** `/client/requests/<id>/documents` and
`/events` are both 404. A request's documents can only be reached by guessing
titles, which is how the first survey missed fifteen of thirty-six.

**And a bulk pull would be the wrong thing to do anyway.** PRA releases carry
personal information; the ledger records that every pinned document was reviewed
for client-level content before pinning. Downloading hundreds of unreviewed
releases into a project whose spine is that no person-level data exists here is
precisely how person-level data would arrive. Any expansion is screened first,
one document at a time, or it does not happen.

### The decisive part: the form exists and is empty

Executed FY24 Interim Housing scope and budget (doc `62159139`, request 26-352),
OCR'd from a scan:

```
SALARIES & WAGES (Schedule 2)      —
FRINGE BENEFITS  (Schedule 3)      —
TOTAL PERSONNEL                    —
ADMINISTRATIVE COSTS          16,503
CONSULTANT SERVICES (Sch 5)  228,974
TOTAL CDBG PROJECT BUDGET    245,477
```

followed by: *"SCHEDULE 2 — PERSONNEL SCHEDULE: GROSS PAY. The purpose of this
form is to list the positions being claimed…"*

**The form for the denominator is there, and it is blank.** The absence is not
an oversight in what was released, and it is not something a wider sweep would
fix: SDHC buys these services, so personnel is zero and the money lands in
Consultant Services. That is now confirmed across five documents and three
programs — DSDP Family Reunification, the Homelessness Response Center, and
Interim Housing — plus both executed street-outreach agreements.

Scraping more of this portal would find more budgets shaped exactly like these.
The denominator is on the provider's side of a contract boundary, and no volume
of the buyer's records crosses it.

## 4b. A third source, and the strongest corroboration yet

`sdrdl_analysis` was pinned and fed nothing. It is DSP's **officially published**
monthly downtown totals — the multiplied series, as the publisher issued it —
covering 2012-01 to 2019-04. That makes a three-way check possible, and it is a
better one than section 1 because it compares the shipped artifact against the
publisher's own arithmetic rather than against another transcription.

| comparison | months | result |
| --- | --- | --- |
| shipped artifact vs DSP published | 28 | **median 1.000 — 22 of 28 exactly equal** |
| reconstruction from unmultiplied counts vs DSP published | 60 | median 0.996 |
| reconstruction vs shipped artifact (section 1) | 70 | median 0.991 |

**The middle row validates the method.** Applying the documented multiplier
schedule to SDRDL's deliberately unmultiplied counts reproduces the publisher's
own published figures to within 0.4% across sixty months. That is independent
support for both the multiplier arithmetic and the `2=Structure, 3=Vehicle` code
mapping the overlap chose.

**The top row is the strongest statement this project can make about its own
evidence.** For the twenty-eight months where the two series meet, the shipped
monthly totals are *exactly* the numbers the publisher published, in twenty-two
of them.

### The six that differ, and what is not known about them

The other six differ by **exactly one**, and the artifact is the higher value in
every case — 2017-09, 2017-10, 2017-12, 2018-08, 2019-03, 2019-04. Never lower.
A systematic direction like that is the signature of a convention rather than a
data disagreement: a rounding rule, or one record included on one side.

**The obvious explanation was tested and did not hold.** If it were rounding,
the months that differ should carry fractional parts on one side of a threshold
and the months that match on the other. They do not: the differing months sit at
0.93, 0.74, 0.68, 0.66, 0.80 and 0.33, while matching months include 0.61 and
0.49. The reconstruction is also not close enough to either series to act as a
tiebreaker, so it cannot adjudicate.

So the mechanism is **undetermined**, and is recorded that way rather than as the
tidy rounding story. It is six counts out of twenty-eight months, each off by
one, in a series where nothing downstream is sensitive to a unit — but an
unexplained systematic difference is worth naming, because the next person to
notice it should find it already known rather than think they have found a bug.

**Coverage limit.** The published series stops at 2019-04, so this check cannot
speak to 2019-05 onward, which is most of the shipped history.

## 4e. The same question asked of an aggregate source

Section 4d found a loading factor inside a provider's payroll worksheets, which
name individuals. Form 990 answers the same question from a source that is
aggregate by construction: organisation-level compensation and payroll taxes,
no individual anywhere in it. `scripts/nonprofit_loading.py` pulls it from
ProPublica's Nonprofit Explorer.

**Employer payroll tax runs about 8 to 9 per cent of compensation** across three
San Diego homeless-services organisations and thirteen years — Alpha Project
median 9.5%, Regional Task Force 8.5%, San Diego Rescue Mission 8.4%. That is
what FICA at 7.65% plus unemployment insurance should look like, which is a
reassuring sign the figures mean what they appear to.

### It cross-checks the worksheet, and that is the useful part

The payroll worksheets in section 4d showed total compensation at **1.34 times**
gross wages — 34 points of loading. These filings put **8 to 9 of those points on
payroll tax**, leaving roughly 25 for pension, health, life and disability
insurance, and workers' compensation.

Two independent sources, one person-level and deleted, one aggregate and public,
agreeing on the structure of the number. Neither is an hourly rate and neither
can become one.

### A hypothesis formed and refuted inside the same analysis

Looking at Alpha Project's four most recent filings — 16.0%, 17.2%, 18.7%,
20.5% — against the Regional Task Force's 7.5% to 8.3%, the obvious reading was
that a direct-service operator loads roughly double a coordinating body, which
would have supported the earlier point that field staff and office staff do not
load alike.

**The full thirteen-year series refutes it.** Alpha Project sits at 8.7% to
10.6% from 2011 through 2019 and steps up to 16–20% from 2020, where it stays.
It is a change over time within one organisation, not a difference between kinds
of organisation, and the earlier reading came from looking only at recent years.
What caused the step is not determinable from the summary fields; the same
period covers a near-doubling of the organisation's payroll and its Convention
Center operations, and a single-year spike to 23.7% in 2016 has no explanation
here either.

### Three filings rejected, loudly

San Diego Rescue Mission's 2021, 2022 and 2023 filings report **zero salaries**
against more than twenty million dollars of expenses, producing payroll-tax
loads of 147%, 161% and 199%. An organisation that size has staff; the field is
missing from the extract. The script rejects them by a plausibility bound and
prints why, because a median quietly taken over them lands near 16% and looks
entirely reasonable.

### What this does not give

ProPublica's summary omits Part IX lines 8 and 9 — pension contributions and
other employee benefits — so this is payroll tax only, never the full loading
factor. The full return would settle it, and the IRS bulk-XML bucket that used
to serve them no longer resolves.

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
