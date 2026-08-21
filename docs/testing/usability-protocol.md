# Usability and accessibility test protocol (B-04, #21)

A repeatable 20-minute test any teammate can run against the integrated demo.
No specialist tools, no coding, no participant personal data. Pairs with the
decision-flow storyboard (#20); findings route to #13, #15, or #16.

## Setup (2 minutes, observer)

- Open the deployed demo (or `npm --prefix app run preview` on the release
  build) in a normal browser window, default zoom.
- Have this file open beside it; record findings in the template at the end.
- Do not tell the participant what any screen means. Read task prompts
  verbatim and only the prompts.

## Part 1: Task script (12 minutes, participant drives)

Read each prompt aloud, then stay silent. Note where the participant
hesitates, misreads, or asks for help; hesitation is data, not failure.

| # | Prompt (read verbatim) | Expected outcome (observer only) | Time box |
|---|---|---|---|
| 1 | "Without clicking anything: what decision does this tool help someone make, for when, and with what resources?" | Reads decision, horizon, budget from the header | 1 min |
| 2 | "Using the area and period the demo suggests, test whether the apparent decline is real." | Uses the area/period selectors (draft scenario is fine, even if the period reads as provisional) + Test the drop; lands on an evidence result | 2 min |
| 3 | "In your own words: what did it conclude, and what is one piece of evidence for and one against?" | Restates the label + one item from each column | 1 min |
| 4 | "Find a month in the history where there is no count at all. How do you know?" | Points at the gap presentation / missing-period list, not a zero | 1 min |
| 5 | "What does the tool expect for the next observation period, and how sure is it?" | Reads the point forecast + range; notices the wide-interval warning if shown | 2 min |
| 6 | "Why did it use the model it used?" | Opens the model disclosure; mentions baseline/held-out comparison in any words | 1 min |
| 7 | "Set the budget to 30 hours and describe what happens." | Triggers the infeasible/constrained state (floors exceed budget); reads the constraint list rather than guessing | 2 min |
| 8 | "The plan can be compared with its coverage guard off. Find that comparison: what changes, and which version does the tool stand behind?" | Opens the guarded-vs-unguarded comparison; identifies the guarded plan as the recommendation and the other as an audit view | 1 min |
| 9 | "You disagree with one allocation. Change it, and show me how the tool records that." | Uses lock/override; finds the recorded human change | 1 min |

Missing/uncertain-data case: prompts 4 and 5 (the series has real gap months;
wide interval). Infeasible/constrained case: prompt 7 (the default floor is 8
hours per included area, so a 30-hour budget cannot cover them). Comparison:
prompt 8. Data anchors are deliberately generic so the script survives
whatever period the scenario lock (#2) freezes.

## Part 2: Keyboard-only checklist (3 minutes, observer drives)

Mouse away. Using only Tab / Shift+Tab / Enter / Space / arrows:

- [ ] Every control in the task script is reachable in a sensible order
      (header budget, neighborhood, month, run, Why? disclosures, locks).
- [ ] Focus is visible on every stop (no invisible focus).
- [ ] Every control announces a label (check with the browser accessibility
      inspector if in doubt, not a screen reader session).
- [ ] The full path prompt-1-through-9 can be completed without the mouse.
- [ ] Charts offer a "View as table" (or equivalent) reachable by keyboard.

## Part 3: Meaning and comfort checks (3 minutes)

- [ ] Non-color meaning: with the page in grayscale (browser filter or OS
      setting), the verdict label, warnings, and missing-data bands are still
      distinguishable.
- [ ] Reduced motion: with OS reduced-motion on, nothing essential animates.
- [ ] Warning comprehension: participant restates ONE warning in their own
      words without coaching.
- [ ] Decision confidence: ask verbatim: "Would you act on this recommendation?
      What would you want to see before you did?" Record the answer; wanting
      more evidence is a product finding, not a failure.

## Finding template (one row per finding)

| Field | Content |
|---|---|
| Severity | BLOCKING (task impossible or meaning wrong) / WARNING (hesitation, workaround needed) / INFO |
| Task/prompt | which numbered prompt or checklist line |
| What happened | observed behavior, participant words if useful |
| Reproduction | steps from a fresh load |
| Evidence | screenshot name or exact on-screen text |
| Kind | USABILITY (interface) vs POLICY (participant disagrees with product rules, e.g. wants individual-level data: record, do not "fix") |
| Routes to | #13 (spatial/uncertainty presentation), #15 (copy, cards, a11y), #16 (release checks) |

Policy disagreements are recorded and routed to the responsible-data review
(#23 / Track C), never turned into interface changes by this protocol.

## Privacy rule

No participant names, no recordings, no demographic notes. Findings carry
only what the template asks for.
