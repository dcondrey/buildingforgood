# Operator runbook

**Who this is for:** the staff member who runs this once a month. You do not
need to be a developer to read the tool or to make the decisions in it.

**One thing you do need a developer for, today.** Section 2 — refreshing the
data — currently runs from a terminal. There is no button. If nobody at your
organization can run a command, arrange that before you adopt this, or agree
with your technical partner that they run section 2 on a standing date and
hand you the result. Everything else in this runbook is yours.

**Time:** about 20 minutes once the data is refreshed, plus however long the
decision itself takes.

---

## 1. Before you start — the one-minute currency check

Open the site. **Look for the staleness label before you look at anything
else.** The tool tells you how old its numbers are, and it will say so in
plain language rather than making you work it out.

Two states:

- **Current** — the modelled data runs through a recent month, within the
  freshness window.
- **Stale** — the modelled window is further behind the calendar than the
  threshold allows.

**As of this writing the site is `stale`, and that is correct, not broken.**
The modelled data runs through December 2025. Two later observations exist
(April and June 2026) and are shown, but they are deliberately excluded from
the model. Section 6 explains why, and why you should not try to fix it.

**If it says stale and you were expecting current:** go to section 2. If you
have already refreshed this month and it still says stale, that means the
publisher has not released model-eligible data — which is a fact about the
world, not a fault in the tool. Note it and carry on.

---

## 2. The monthly refresh

This is the part that needs a terminal. Full detail is in
`docs/project/REFRESH.md`; this is the short version and what to do when it
goes wrong.

```sh
./scripts/refresh.sh --dry-run     # always first — runs every check, writes nothing
./scripts/refresh.sh               # only if the dry run reads correctly
./scripts/verify.sh                # before anything is published
```

**Read the dry run's summary line before doing the real run.** It looks like
this:

```
REFRESH OK: {"source_data_through": "2025-12", "status": "stale",
             "observed_not_model_eligible_months": ["2026-04", "2026-06"],
             "next_publication_expected": "2026-09", "written": false}
```

Four questions, in order:

| Field | Ask yourself |
| --- | --- |
| `source_data_through` | Did the modelled window move? Same month as last time = no new eligible data. **Normal, not a failure.** |
| `status` | `current` or `stale`. If it flipped, know why before you publish. |
| `observed_not_model_eligible_months` | Which months are shown-but-excluded. This list should only ever grow. |
| `written` | `false` on a dry run, `true` on the real one. |

**Nothing is written unless every check passes.** There is no partial or
degraded output. If it fails, the previous artifact is untouched and the site
keeps showing the last good numbers.

### When a refresh fails

Every failure prints `REFRESH FAILED:` and a specific reason. The full table
is in `docs/project/REFRESH.md`. The four you are most likely to see:

| Message | What it means | What you do |
| --- | --- | --- |
| `checksum mismatch for …` | A source file changed underneath you. | **Stop.** Find out what changed in the publisher's file before anything else. Do not re-pin to make it go away. |
| `missing input …` | A required file is not on disk. | You probably skipped the fetch step, or a file you cannot download is needed. See section 8. |
| `monitoring reconciliation failed` | The neighborhood numbers no longer add up to the publisher's total. | Re-open the source PDF. Either the transcription is wrong or the publisher revised its figures. |
| `privacy scan blocked …` | Something too small or too precise was about to be published. | Do not publish. Escalate. This one is not a nuisance check. |

**The rule behind all four: a failed refresh is the system working.** It is
designed to stop rather than to publish something it cannot stand behind.

### When the publication is late

DSDP's schedule is irregular — it moved from monthly to quarterly in late 2025
and the timing is not reliable. The `next_publication_expected` field is an
estimate, not a commitment.

If the expected month passes with nothing published:

1. **Do not interpolate.** Do not fill the gap with an average, a carry-forward,
   or a value from a dashboard. A missing month stays missing, and the tool
   will show it as missing.
2. Re-run the refresh anyway. It will report the same `source_data_through` and
   the site will get staler. That is the honest outcome.
3. If it stays late for two expected cycles, tell whoever owns the relationship
   with the publisher. A prolonged gap is worth knowing about for reasons that
   have nothing to do with this tool.

---

## 3. Reading the audit findings

The tool shows its own data-quality problems rather than hiding them. You do
not need to fix them; you need to know whether they change your decision.

**The digitization audit** compares two machine readings of the same
hand-written field sheets. It reports an agreement share. The shipped example
deliberately includes a **misread that was caught**: one reading returned 157
where the sheet says 152.

**How to read that:** it is evidence the checking works, not evidence the data
is bad. Recovered values are candidates for human verification, never counts.
If you see a disagreement on a number your decision hinges on, go look at the
source sheet.

**The area accuracy warning** appears on a neighborhood when its forecast
error is above 30%. Treat it as: *this area's history is hard to forecast; the
number in front of you is a wide guess.*

---

## 4. When to trust the forecast, and when not to

The tool shows a forecast error figure (WAPE — think of it as "typical
percentage the forecast is off by") for the whole model and per area.

**Trust it for:** the ordering of neighborhoods by expected need, and the
rough size of the gap between them. That is what the plan uses it for.

**Do not trust it for:** any specific number in any specific month. And do not
trust it at all in these three cases:

1. **When the area accuracy warning is showing.** Over 30% error means the
   direction may be right and the magnitude is not usable.
2. **When the site is stale and the world has changed.** The model was fitted
   on data through December 2025. If something significant happened in your
   area since — a shelter opened or closed, an encampment was cleared, a
   funding cycle turned over — the forecast does not know, and you do.
3. **When the evidence result says "insufficient evidence."** That is the tool
   declining to make a claim. It is not a weak yes. See section 5.

**The single most useful habit:** before accepting a plan, ask "does this match
what my outreach team saw last month?" If it does not, your team is probably
right and the tool is missing something. Section 7 tells you what to do about
it.

---

## 5. "Insufficient evidence" is an answer

When a neighborhood's count drops, the tool tries to tell you whether people
left the area or moved to a neighbouring one. Often it says **insufficient
evidence** instead.

**This is deliberate and it is not a bug.** The tool needs to know which
neighborhoods border which to reason about displacement, and for the San Diego
deployment that boundary information does not exist from any citable source.
Rather than guess, the tool refuses the claim.

So: a decline shown with "insufficient evidence" means *the count went down and
we cannot tell you why.* Do not read it as improvement. Do not read it as
displacement. It is genuinely unknown, and acting as though it were either one
is the mistake the refusal exists to prevent.

---

## 6. The equity floor, and why the plan may not match your intuition

This is the part most likely to surprise you, so it gets the most space.

**What it does.** Before any hours are distributed by forecast, **every
neighborhood in scope is guaranteed a minimum**. The default is 8 hours. Only
what is left over follows the forecast.

**Why the plan looks "wrong."** If one neighborhood has far more expected need
than the others, your intuition says send most of the hours there. The tool
will not. It hands out the guaranteed minimum everywhere first, and only the
remainder is proportional. So the busiest area gets less than a pure
forecast-driven split would give it, and the quietest area gets more.

**That is the point, not a flaw.** An area that gets zero hours produces no
observations next month, which makes it look quieter still, which earns it
fewer hours again. The floor is what stops the tool from writing off a
neighborhood and then citing its own silence as evidence.

**The tool always shows you the cost of this**, in a figure called **unmet
planning load** — the hours the forecast said an area wanted that the floor
moved somewhere else. Read as: *this is what fairness cost, in hours.* It is
displayed whether or not you ask, so the trade-off is never hidden from you.

**Three settings you can pick** — 0h, 4h, 8h:

| Setting | What it means | When to use it |
| --- | --- | --- |
| **8h (default)** | Every area guaranteed 8 hours. | Normal operation. |
| **4h** | Half the guarantee. | Comparison, to see how sensitive the plan is to the floor. |
| **0h** | No minimum. Hours follow the forecast alone. | **Comparison only.** |

The tool labels 0h as a comparison view and not a recommendation, and it means
that. Use it to see which neighborhoods would be left with almost nothing —
that is a useful thing to know — then switch back.

**Watch for:** the tool warns when the floor is deciding most of the plan. If
your budget is small relative to the number of areas, the guaranteed minimums
can consume nearly all of it and the forecast is barely doing anything. When
you see that warning, either the budget is too small for the geography or the
floor is set too high. Both are your call, not the tool's.

---

## 7. Overriding the plan, and what overriding costs

You can **lock** a neighborhood to a specific number of hours. Use this when
you know something the data does not — a team member is out, a site closed, a
partner is already covering an area, your outreach lead says the number is
wrong.

**Locking is the intended way to disagree with the tool.** It is not a
workaround.

**What it costs, and this is the part to understand before you use it:**

1. **Locked hours come out of the same budget.** Everything you lock is
   subtracted first; the remaining areas divide what is left. Lock generously
   in one place and you are taking hours from everywhere else, whether or not
   you meant to.
2. **A lock must respect the floor.** You cannot lock an area below the
   guaranteed minimum while the floor is on. The tool will refuse the plan and
   tell you so.
3. **If the locks and floors together exceed the budget, there is no plan.**
   The tool says *"No feasible plan: locks and coverage floors require N hours,
   but the budget is M"* and produces nothing. **It will not quietly shave
   hours to make it fit.** Raise the budget, release a lock, or lower the
   floor — deliberately, as a decision.
4. **Lock everything and the leftover hours have nowhere to go.** The tool
   refuses that too, rather than dropping them.

**The habit worth forming:** after locking, look at the unmet planning load
again. It will have moved. That number is the honest running total of what your
overrides and the floor have cost the areas you did not lock.

**Locks are not saved with the data.** They live in your browser for this
session. If you want to keep a set of settings, use the scenario workbench
(section 9).

---

## 8. What you cannot do, and should not try

Short list. Each one exists because doing it would make the tool lie.

- **Do not unpin the excluded months to make the site look current.** The
  April and June 2026 figures are shown but excluded from the model on five
  independent grounds: the count cadence broke, the count dates are contested,
  the counts were run on two instruments and at least one was redone, the
  values are multiplier-adjusted estimates rather than people, and they come
  from the same publisher as the source data so they are not independent
  confirmation. **The refresh command fails if you flip the flag** — that
  failure is intentional and it is protecting you.
- **Do not fill in a missing month.** Missing stays missing.
- **Do not re-pin a checksum to clear an error** without finding out what
  changed first.
- **Do not widen the suppression threshold** to publish a small number.
- **Do not hand-edit the generated data file.**

If you find yourself wanting to do any of these, that is the moment to call
someone. It usually means a real question has come up that the tool was built
to stop you from answering casually.

---

## 9. Saving and comparing scenarios

You can save up to **8** sets of settings — budget, floor, guard on/off, and
locks. Saved scenarios store **only those settings**, never the resulting
numbers; the plan is recomputed from the data each time you load one. So a
scenario saved last month, loaded against this month's data, gives you this
month's answer under last month's policy — which is usually what you want.

They are stored **in your browser only**. Not on a server, not in an account,
not shared with colleagues. Clearing your browser data deletes them. If a
scenario matters, write it down or export the brief.

---

## 10. Exporting

**Copy the decision brief** puts a plain-text summary on your clipboard: the
evidence result, the plan, the assumptions, and the limitations. Paste it into
an email, a board packet, or your case notes.

**Two things to check before you send it:**

1. **The cost figures rest on an assumed hourly rate that your finance lead
   must set.** The default is a placeholder. If nobody at your organization has
   set it, the dollar figures are meaningless and should be deleted from the
   brief before it goes anywhere.
2. **The brief carries its own limitations text. Do not trim it.** The
   qualifications are the reason the numbers can be shared at all.

**Printing** produces a decision brief laid out for paper. The interactive
controls do not print.

---

## 11. When something breaks

**Everything runs in your browser. There is no server to be down, no account to
be locked out of, and no data of yours to leak.** That narrows the list a lot.

| Symptom | Likely cause | What to do |
| --- | --- | --- |
| Page loads but says it is using a fallback snapshot | The live data file could not be fetched — usually offline or a bad deploy. | The numbers shown are a built-in snapshot, clearly labelled. Usable, but check the date before deciding from it. |
| Numbers look identical to last month | No new model-eligible data was published. | Expected. Confirm with `source_data_through` from the refresh. |
| "No feasible plan" | Locks + floors exceed the budget. | Section 7, point 3. This is the tool refusing, not failing. |
| Everything is stale and the refresh will not run | A pinned source changed, or a required file is missing. | Section 2. Do not force it. |
| A number looks wrong to your outreach team | Possibly a digitization misread, possibly the tool is missing local knowledge. | Check the audit findings (section 3). Then lock the area (section 7) and note why. |
| Saved scenarios disappeared | Browser data was cleared, or a different browser/device. | They are per-browser by design. Nothing to recover. |

**Who to contact.** This runbook cannot fill this in for you, and it should not
guess. Before you go live, write the four names in here:

| Role | Who | For |
| --- | --- | --- |
| Technical contact | _______ | Refresh failures, deploy problems |
| Data owner | _______ | Questions about the source figures |
| Program lead | _______ | Whether a plan is acceptable |
| Privacy/legal sign-off | _______ | Anything involving publishing outputs |

For security issues specifically, `SECURITY.md` in the repository is the
authority.

---

## Quick reference

| Question | Where |
| --- | --- |
| How old is the data? | Staleness label, top of the page — § 1 |
| How do I refresh it? | `./scripts/refresh.sh --dry-run` first — § 2 |
| It failed. Now what? | § 2, and do not force it |
| The publisher is late. | Do not interpolate — § 2 |
| Can I trust this forecast? | § 4 |
| Why does it say "insufficient evidence"? | § 5 — it is an answer, not a gap |
| Why is the plan not what I expected? | The equity floor — § 6 |
| How do I overrule it? | Lock an area — § 7, and read what it costs |
| Why can't I make the site look current? | § 8 — and the refusal is deliberate |
| Where did my scenarios go? | Browser-only — § 9 |
| Something is broken. | § 11 |

---

*This runbook was written against the tool as it actually behaves, by reading
the shipped code and the refresh pipeline. Where the tool does not yet do
something, this document says so rather than describing an intention. The
terminal dependency in section 2 is the one thing in here that a
non-developer cannot currently do alone.*
