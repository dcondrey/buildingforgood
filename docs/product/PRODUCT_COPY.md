# Product Copy and Language Boundaries

Last updated: 2026-08-21

This document is the issue #22 (B-03) deliverable: the approved plain-language
copy for the product, organized for direct handoff to the drop test (#8), the
decision interface (#12), the planner panels (#15), and the responsible-data
cards (#16). Shipped strings live in `app/src/App.tsx`; the responsible-data
card copy lives in `docs/track-c/C-05-responsible-data-cards.md`. Where the
shipped interface already carries a string, this document records it as
approved rather than proposing a variant.

## Language boundaries

Every string in the product obeys these rules, which mirror the red-team
claim checklist in `docs/track-c/C-01-red-team-review.md`:

- No individual claim. Counts are on-site observations, never people tracked.
  Approved boundary sentence: "These are on-site observations: they cannot say
  who moved where, or why."
- No causal claim. Changes coincide with events; they are never attributed.
- No enforcement or dispatch language. Approved: "Never authorized: person
  tracking, causal claims, enforcement, eligibility decisions, or automatic
  dispatch."
- No live-capacity claim. Approved: "The hours are an editable assumption, not
  staffing data. A real deployment would use the provider's own schedule."
- Forecasts always carry the horizon and the range. Approved: "A rehearsal on
  past data · not a live forecast."
- Planning load is never a person count. Approved: "Planning for up to N
  observations"; "The mixed-unit index is secondary, not a person count."
- No generative model decides anything. Approved: "Development assistance
  only; no AI runs in the product or determines evidence, forecasts, or
  allocations."

## Glossary

| Term | Plain-language definition |
| --- | --- |
| Observation | One thing an outreach worker recorded seeing on a block during a monthly count: a person, a tent or structure, or an inhabited vehicle. Not a unique person. |
| Apparent decline | The published neighborhood total went down between two compared months. "Apparent" because the total mixes people, tents, and vehicles through multipliers, so a falling total does not by itself mean fewer people. |
| Displacement evidence | Aggregate increases in adjacent areas that match a local decline in the same window. Evidence of redistribution between places, never of any individual moving. |
| Forecast range | The span between the low and high end of the historical residual interval. The plan uses the high end so uncertainty buys extra coverage instead of being ignored. |
| Interval coverage | How often ranges like this one contained the real value in held-out rehearsals. Shown as a percentage next to the nominal target; a shortfall is displayed, not hidden. |
| Planning load | The upper end of an area's forecast, used as the weight for splitting hours. A staffing weight, not a person count and not a guaranteed service need. |
| Reserve | Hours set aside before the forecast is consulted: the guaranteed per-area minimum, plus any continuity reserve a policy adds. |
| Allocation | The staff-hours assigned to an area for the next shift: its guaranteed minimum plus its share of the remaining hours, unless a human locks a different number. |
| Unmet load | Hours the forecast-proportional split would have given an area that minimums or locks moved elsewhere. Shown next to the total so the trade-off stays visible. |

## Result copy for the drop-test classifications

The shipped scenario computes `wider_footprint` or `insufficient_evidence` in
the app (`app/src/lib/demo.ts`); the three-conclusion pipeline module can also
return `likely_improvement` and `possible_displacement` once versioned
adjacency exists (`docs/project/DROP_TEST_RULES.md`). Copy for all four:

**Wider footprint (shipped).** Headline: "People were seen in more places, not
fewer." Body: "People were seen on more blocks than last year, spread about as
evenly as before. Tents disappeared from many blocks and bunched up in fewer.
These are on-site observations: they cannot say who moved where, or why."
Evidence for: observed individuals increased while structures fell; individual
observations reached more fixed-panel blocks at both tested thresholds.
Evidence boundary: no identities, movement paths, or causal explanation are
observed.

**Likely improvement.** Headline: "The decline held up under checking."
Body: "The published total fell for several months running, the comparison
window is complete and comparable, and most of the decline is not reappearing
in adjacent areas. This supports a real local improvement in observed
conditions. It does not say why conditions changed or what any person did."
Evidence for: sustained multi-month decline; complete window; no method break;
low adjacent matched share. Evidence against would be: a matched share at or
above half, a gap in the window, or a documented method change.

**Possible displacement.** Headline: "The decline may have moved next door."
Body: "The published total fell here, but half or more of the decline is
matched by increases in adjacent areas over the same window. Treat the local
decline with caution: conditions may have shifted between places rather than
improved. This is evidence about places, never about who moved or why."
Evidence for: sustained comparable decline plus a high adjacent matched
share. Evidence against would be: a low matched share or missing adjacency
evidence.

**Insufficient evidence.** Headline: "Not enough evidence to conclude."
Body: "The comparison cannot support a conclusion: the decline is not
sustained, the window has gaps, a methodology change breaks comparability, or
adjacency evidence is unavailable. The components below show the partial case
in both directions. No conclusion is forced from weak evidence."

## Warning copy

| Condition | Approved copy |
| --- | --- |
| Missing months | "Missing months stay missing. Gaps are shown as gaps, never filled in or treated as zero." |
| Methodology break | "A counting-method change falls inside this comparison, so the two sides are not directly comparable. The result is limited to insufficient evidence." |
| Source disagreement | "Secondary component values disagree with the published total for some months. The published total is authoritative; component values are context, not corroboration." |
| Wide interval | "This range is wide. Ranges like this one contained the real value in {coverage}% of held-out rehearsals; plan against the high end and review before relying on it." |
| Infeasible plan | "No feasible plan: locks and coverage floors require {required} hours, but the budget is {budget}. Increase the budget, remove a lock, or explicitly revise the floor." |
| No minimum (audit view) | "Comparison view, not a recommendation. This shows what happens with no guaranteed minimum: some neighborhoods get almost nothing." |

## Next-shift decision brief template

The shipped brief (`app/src/App.tsx`, `decisionBrief`) instantiates this
template; every line is mandatory and the caveats travel with the numbers.

```
STILL HERE SD · NEXT-SHIFT DECISION BRIEF
Status: {READY FOR COORDINATOR REVIEW | PROVISIONAL OFFLINE SNAPSHOT} — not automatic dispatch
Source: {source label, artifact path, data-through date, generated or fallback}
Method: {comparison design: same-month, fixed panel, method era}
Evidence: {classification headline}. {period A} to {period B}: {component changes}. {secondary-index caveat}
Forecast: {target period} {point}; historical {level}% residual interval {lower}–{upper}. {model}; {backtest error}; {empirical coverage} across {folds} folds. Not a live future forecast or a guaranteed probability interval.
Plan: {budget} staff-hours; guard {on (floor) | off — audit only}. {per-area hours, with (human lock) where applied}. {area-accuracy caveat}
Review triggers: new month, budget or boundary change, wider interval, infeasible floor, or local knowledge conflict.
Privacy and authorization boundary: aggregate place-level evidence only; no block records or geometry ship. This does not track people, establish causality, authorize enforcement, or dispatch staff automatically.
```

## Handoff map

- #8 / drop test: classification result copy and warning copy above;
  rule table in `docs/project/DROP_TEST_RULES.md`.
- #12 / decision interface: glossary, boundary sentences, and the shipped
  strings recorded here as approved.
- #15 / planner: allocation, reserve, unmet-load definitions; infeasible and
  audit-view warning copy.
- #16 / responsible-data cards: boundary sentences; card copy in
  `docs/track-c/C-05-responsible-data-cards.md` is the authoritative card
  text.
