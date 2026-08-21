# Three-Minute Demo Script

One prepared, reproducible scenario. The goal is not to tour every feature; it
is to make one defensible decision from a misleadingly simple headline.

## Before the clock starts

Start the application and open the local address printed by Vite:

```bash
npm ci --prefix app && npm --prefix app run dev -- --host 127.0.0.1
```

Then:

- set the browser to 100% zoom and a wide desktop viewport;
- leave the budget at **80 staff-hours** and the coverage guard on;
- refresh once, then disconnect Wi-Fi to prove the demo has no live API;
- confirm the hero says **Generated analysis loaded**, not a fallback state;
- close unrelated tabs and notifications;
- keep [`JUDGE_QA.md`](JUDGE_QA.md) open on a second device; and
- confirm the clipboard is available for **Copy decision brief**.

## Timed script

### 0:00–0:25 — Challenge the apparent success

**Do:** Begin at the decision header, then click **Test the drop**.

**Say:**

> "On downtown San Diego's latest like-for-like panel, the adjusted estimate
> fell 22%. But people directly observed in the open rose 7.5% and appeared on
> 25 more blocks. The decline came from 141 fewer tents and structures—not
> fewer direct observations. Still Here audits the ruler before turning it
> into a coverage policy."

**Land:** The decision is clear before the method: distribute limited outreach
hours without pretending a lower total explains why it changed.

### 0:25–1:05 — Decompose the ruler

**Do:** Point to the three component cards, then the multiplier decomposition
and like-for-like block thresholds. Open **Optional attention-bias check** only
if the room is following comfortably.

**Say:**

> "Individuals move from 510 to 548. Tents move from 258 to 117; vehicles from
> 10 to 5. Under the published multipliers, individuals contribute plus 38 to
> the change, structures minus 246.8, and vehicles minus 10.2. Individuals also
> appear on 111 to 136 blocks—and the result survives requiring at least two
> observations per block. We hold the same 261 blocks fixed. Components are
> separately digitized from the same maps, not unique people or independent
> validation, so this cannot prove movement or policy impact."

**Optional add-on:**

> "In a matched-calendar reporting check, all downtown Get It Done rows rose
> 40.9%, but Encampment rows rose 88.1% and top-level requests 96%. That is a
> reporting-pattern shift, not a population estimate, and it never enters the
> forecast or planner."

**Land:** A lower total is an observation, not an outcome claim.

### 1:05–1:40 — Replay a forecast without model theater

**Do:** Move to the forecast. Trace the historical line, point forecast, and
explicit interval; then point to the selected model and held-out error.

**Say:**

> "This is a historical one-step-ahead replay: all information is frozen at
> December 2025. Three simple models compete under rolling-origin evaluation;
> the six-observation local linear model earns promotion. It predicts 882.5,
> with a historical residual band from 769 to 996.1. On the separate 2025 audit
> it scores 8.6% WAPE, but the band covers only 75% of eight folds. We show that
> miss instead of turning it into confidence."

**Land:** The simplest defensible model wins; there is no random time-series
split, future-error leakage, or LLM forecast.

### 1:40–2:05 — Generate a coverage-continuity scenario

**Do:** Click **Generate coverage scenario**. Point to the 80/80 total and use
the **0h audit only**, **4h sensitivity**, and **8h prepared demo** controls.

**Say:**

> "Now we stress-test an 80-hour policy. Zero, four, and eight hours are visible
> user-set continuity floors—not learned, optimal, or fair by themselves. The
> remaining hours follow historical upper bounds with exact deterministic
> rounding. Area errors are noisy—Cortez and Marina exceed 30% WAPE—so this is
> an auditable scenario for human review, not dispatch."

**Land:** The policy choice is explicit, adjustable, and testable.

**Optional add-on (if the room is engaged):** drag the **What-if** budget
slider a few steps and let the map and bars reflow live.

> "Every recompute is the same deterministic rule. Drag it low enough and the
> floors become infeasible—the tool says so instead of quietly repairing the
> plan."

Return the slider to 80 before moving on.

### 2:05–2:28 — Make the tradeoff visible

**Do:** Click **Audit without coverage guard**. Point to the areas that lose
continuity, then click **Restore 8h demo guard**.

**Say:**

> "This unguarded view is an audit, not a recommendation. It exposes which
> areas a proportional allocation could drop. A real agency still has to add
> severity, travel time, caseload, capacity, and community governance."

**Land:** Never leave the unguarded view on screen as the final plan.

### 2:28–2:48 — Demonstrate human control

**Do:** Select **Lock** for one area, edit its hours, and click **Recompute
unlocked hours**. Point to the preserved lock and the rebalanced unlocked hours.

**Say:**

> "Local knowledge can override the model. The coordinator owns the change;
> the system preserves it, rebalances only the unlocked hours, and keeps the
> budget and floor visible. It never silently repairs an infeasible choice."

**Land:** Human oversight changes the result and remains disclosed.

### 2:48–3:00 — Close with accountability

**Do:** Click **Copy decision brief** and point to the source, method, privacy,
and AI disclosures.

**Say:**

> "The brief carries the evidence, uncertainty, policy settings, and human
> changes. We never track people, infer movement, or automate outreach. The
> estimate fell. Direct observations rose. Which ruler should govern a coverage
> policy?"

Stop. Let the judge ask the first question.

## If time slips

Keep the hook, **Test the drop**, **Generate coverage scenario**, and the closing. Cut
in this order:

1. the manual lock/recompute;
2. detailed forecast metric narration; then
3. the unguarded comparison, replacing it with one sentence.

Do not cut the causal/privacy boundary or imply the decline proves progress.

**Guide demo** also carries this script on its own for a viewer exploring with
no presenter in the room. Eight steps narrate the same story with the
artifact's live numbers and ask the viewer to work the real controls — **Test
the drop**, **Generate coverage scenario**, the 0h and 8h floors, a lock plus
**Recompute unlocked hours**, and **Copy decision brief**. The guide detects
each completed action and advances by itself; **Do it for me** performs a step
for a hands-off viewer, and **Play** runs the whole flow unattended and stops
on any outside interaction. Presenting live, drive it with `→` and `←`. Stop
it with **Stop** or Escape; stopping while the 0h comparison view is up
restores the coverage minimum automatically, and the guide never changes the
underlying analysis — it stages the same local artifact.

## Offline fallback checklist

Complete this on the presentation device before leaving for the venue.

- [ ] Run `./scripts/verify.sh` and save the final terminal output.
- [ ] Run `npm --prefix app run build` and confirm `app/dist/` exists.
- [ ] Start `npm --prefix app run preview -- --host 127.0.0.1`, then complete
      the entire script in airplane mode.
- [ ] Confirm the app loads the versioned generated artifact with no console or
      network error. The in-app embedded fallback must be visibly labeled.
- [ ] Keep `app/dist/`, the repository, Node, Python, `.venv`, and
      `app/node_modules` on the presentation device—do not depend on package
      installation at the venue.
- [ ] Record one clean, under-three-minute screen capture and export it to a
      local, browser-playable format.
- [ ] Capture static images of the drop result, forecast, guarded plan, and
      decision brief as a final no-code fallback.
- [ ] Put the local preview URL, screen recording, and four images in one folder
      or browser bookmark group.
- [ ] Bring power, disable sleep and notifications, and rehearse once at the
      display resolution and browser used on stage.

Fallback order: local production preview → local screen recording → static
result images plus the spoken story. Never switch to a live API or improvise a
claim the artifact does not support.
