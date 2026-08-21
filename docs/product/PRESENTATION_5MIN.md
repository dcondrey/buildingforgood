# Five-Minute Presentation Script (paired with the Guide demo)

Format: 1 min setup · 5 min presentation · 3 min Q&A · 1 min teardown.
This script drives the app's own ten-step Guide demo, so the screen and the
narration can never drift apart. Every scored rubric item is said out loud —
judges award points for what they hear, not what the repo contains.

This is the on-stage script. If the Guide or the deployed site is unavailable,
fall back to the manual walkthrough in [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md),
which also owns the offline fallback checklist and the time-slip cut order.

## Setup minute

- Open https://dcondrey.github.io/buildingforgood/ and hard-refresh once.
- Confirm the topbar shows **Story | Map workspace** and the plan-state chips
  (80/80h allocated · 8h floor) — that proves the current build.
- Disconnect Wi-Fi after load if you want the no-live-API proof ready.
- Press **Guide demo** so Step 1 is on screen when the clock starts.

## The five minutes

### 0:00–0:30 · Hook (Guide step 1: press "Test the drop")

> "Downtown San Diego's unsheltered estimate fell 22% in a year. Good news?
> This tool exists because that question deserves a better answer than a
> dashboard headline. Let's test the drop."

Press the real **Test the drop** button — the guide notices and advances.

### 0:30–1:10 · What actually moved (Guide step 2)

> "The parts moved in opposite directions. People directly observed rose from
> 510 to 548 — up 7.5% — and appeared on 25 more blocks, from 111 to 136. What
> fell was tents: 258 down to 117. Same 261 blocks, same month, same method.
> A conventional dashboard reports where a count went down; we audit whether
> the ruler changed before anyone builds policy on it."

**Rubric said aloud (Analysis):** "That decomposition is the analysis: the
measurement instrument, not just the measurement."

### 1:10–1:45 · Forecast without model theater (Guide step 3)

> "Could we have predicted January 2026? Everything here is frozen at December
> 2025. Three simple models compete on rolling held-out months; the winner
> projects 882.5 with a historical 80% band of 769 to 996. That band covered
> only 75% of past checks — we show the miss instead of converting it into
> confidence. No random splits, no leakage, and no LLM anywhere in the
> decision path."

### 1:45–2:20 · A plan, not a reveal (Guide steps 4–6)

> "The tool opens mid-work: 80 assumed staff-hours already split across six
> neighborhoods, every area guaranteed a floor you set. Watch the tradeoff —"

Select **0h · no minimum**, then **8h · default** (the guide tracks you).

> "— with no minimum, hours follow the forecast alone and some neighborhoods
> are left with almost nothing. That view is an audit, never a recommendation,
> and the tool won't let you leave it on by accident."

Drag the **What-if** slider a few steps: "every recompute is the same
deterministic rule, live."

### 2:20–2:45 · Human override (Guide step 7)

Lock East Village, edit its hours, press **Recompute unlocked hours**.

> "Local knowledge outranks the model. The lock is preserved exactly,
> disclosed in the brief, and only the unlocked hours rebalance."

### 2:45–3:30 · Stress-test a sweep (Guide step 8) — the differentiator

Select East Village on the plan map, press **Explore this assumption** at 100%.

> "The most reached-for action downtown is a clearance. The City Auditor says
> the data cannot show who moves where — so instead of predicting, you state
> the assumption: what share of this area's need shifts next door versus gets
> resolved. At one hundred percent, the need just moves and the plan churns
> nineteen staff-hours. Slide it lower and the tool says, out loud, that you
> are assuming need away. There is no setting where a sweep quietly wins.
> Computer scientists call this a simulator; we built it as an audit."

### 3:30–4:05 · The workspace (Bonus: product packaging — say it)

Toggle **Map workspace**. Switch layers: Planned hours → Observed change →
Unmet load. Click an area for its dossier. Open **Scenarios**, load the saved
scenario, pin **Compare**.

> "This is the same state as the story you just saw — one layered map that
> puts 'where people were seen' and 'where hours go' on one geography, a
> per-area dossier, and a scenario workbench that saves policy settings in
> your browser and shows per-area differences between any two policies. It's
> a working product, deployed, offline-capable, keyboard-accessible, and
> axe-clean."

### 4:05–4:35 · Leave with the brief (Guide step 10)

Press **Copy decision brief**.

> "The brief carries the evidence, the uncertainty, the policy settings, your
> overrides, and any assumption you explored — with the boundaries attached:
> no person tracking, no causal claims, no enforcement, no automatic dispatch."

### 4:35–5:00 · Close (Bonus: other data sources — say it)

> "Beyond the organizer bundle we pinned and reconciled a dozen public sources —
> the 311 reporting-bias diagnostic that we deliberately excluded from
> planning, NOAA weather, parking foot-traffic sensitivity, the City Auditor
> report, RTFH's 2025 and 2026 point-in-time counts, Cal ICH outcomes, HUD
> CA-601, and DSDP's own post-freeze 2026 reports — each in a documented lane
> that says what it may and may not touch. The estimate fell. Direct
> observations rose. Which ruler should govern a coverage policy? That
> decision belongs to a person — this tool just makes it honest."

Then the digitization-audit beat — Guide step 9 puts the card itself on
screen in the evidence section, so point at it:

> "And we pointed computer vision at the ruler itself — it ships in the
> product. The published counts come from scanned, hand-annotated field
> sheets; this audit card OCRs them, fully offline, and the City Center
> sheet's handwritten totals reconcile through the documented multipliers to
> the published number: 152 plus 14 tents times 1.75 is 176.5, published 177.
> The engine is swappable: EyePop's hosted abilities drop in with one flag.
> Vision that audits the instrument, never the people."

If a borrowed EyePop key exists, run `--engine eyepop` beforehand and show
both cards side by side (runbook in JUDGING_ALIGNMENT.md).

Optional viability close (10s, if time allows): "Data requests are already
pending with SDHC, RTFH, the City's homelessness department, and DSDP —
disclosed in the product, and pre-committed to the same documented lanes."

## The three-minute Q&A

Lead with the first sentence; expand only if invited. Full versions in
[`JUDGE_QA.md`](JUDGE_QA.md).

**"Isn't the sweep tool predicting displacement?"**
No — it refuses to. You state the assumption; it computes the consequences,
labels every number "assumed, not observed," cites the Auditor's finding that
movement can't be determined, and shows that no setting shrinks need without
assuming it away openly.

**"Why not a deeper ML model?"**
Small, seasonal, method-sensitive sample. Challengers must beat the registered
baseline on held-out error; complexity that can't earn promotion is model
theater. The winner is a six-observation local linear model — and we publish
the 75% interval-coverage miss.

**"Is this real data?"**
Yes — the organizer's downtown bundle, frozen at December 2025, hash-pinned,
byte-reproducible artifact, plus a dozen reconciled public sources. The 2026 DSDP
and RTFH releases sit in a monitoring lane that never touches the model.

**"Where does 311 data fit?"**
As a bias diagnostic only. Complaints measure reporting behavior, not need —
encampment reports rose 88% in a matched-calendar window while observations
didn't. We show it precisely so its exclusion can be audited.

**"What about privacy and misuse?"**
Aggregate places only. No person records, no block geometry ships, a
fail-closed privacy scan gates every deploy, and the product renders its own
refusals: no tracking, no causal claims, no enforcement, no eligibility, no
dispatch. Risk is reduced, not erased — deployment beyond demo requires
community governance.

**"Did AI write this?"**
AI assisted implementation and is disclosed in the repo; every suggestion went
through human review and tests. No LLM output determines any classification,
forecast, or allocation — the decision path is deterministic and reproducible.

**"Who would actually use it?"**
An outreach coordinator planning next week's shifts, and the leadership that
has to defend a coverage policy. Success is a brief a coordinator would
actually attach to a staffing decision.

**"What's next?"**
Responses to the pending data requests (SDHC, RTFH, the City's homelessness
department, DSDP) entering the documented lanes; the tract-to-neighborhood
crosswalk to bring the 2026 PIT down to area level; a capacity baseline card
(caseload-per-FTE benchmarks); and the digitization audit becoming a standing
QA step for every monthly report, with EyePop as the hosted engine.

**"Fresh code?"**
Everything was built inside the hacking window; the repo history shows the
pre-window state was empty infrastructure and planning docs, and the README
discloses exactly what discipline (not code) carried over from prior work.

**If a question stumps you:** "That's exactly the kind of question the brief
is designed to carry — let me show you what the tool says about its own
limits" — then open **Data & limits**.
