# Still Here SD UI Storyboard

Issue: B-01 / #20

Status: Ready for implementation handoff

Last updated: 2026-08-20

## Experience goal

The interface should answer one operational question before it shows analytical
detail:

> Given the available evidence and 80 staff-hours, what should the coordinator
> review for the next outreach shift?

The product is a guided decision flow, not a collection of dashboards. History
supports the recommendation; it does not occupy the top of the hierarchy.

## Journey overview

```text
Decision context
      ↓
Test the drop
      ↓
Review forecast range
      ↓
Plan next shift
      ↓
Human review and decision brief
```

The MVP uses one responsive page with a persistent decision header and four
landmark sections. A compact step navigator shows progress without hiding prior
evidence. On small screens, sections stack in the same order.

## Persistent decision header

```text
┌─────────────────────────────────────────────────────────────────────┐
│ STILL HERE SD                                      Data & limits ▸ │
│ Plan: next shift · within 7 days                                   │
│ Budget: [ 80 ] staff-hours       Scenario: East Village (draft)    │
│ Source review pending: exact month and adjacency are not frozen     │
└─────────────────────────────────────────────────────────────────────┘
```

Content:

- product name and short purpose;
- decision horizon;
- editable outreach-hour budget;
- selected area and period status;
- visible provisional/unresolved warning;
- entry point to data, model, limitation, privacy, and AI disclosures.

Behavior:

- Budget changes do not alter historical evidence or the forecast.
- Budget changes invalidate only the current allocation and prompt a rerun.
- The unresolved-scenario warning remains visible until the generated artifact
  reports a frozen geography and period.

## Section 1 — Test the drop

### Initial state

```text
┌─ 1. Test the drop ──────────────────────────────────────────────────┐
│ Is this apparent decline supported by comparable evidence?          │
│ Area       [ East Village ▾ ]    Period [ Pending source audit ]    │
│                                                                     │
│  Apparent change      Coverage          Method status               │
│  ↓ decline            80% complete      ⚠ review required           │
│                                                                     │
│ [ Test the drop ]                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Result state

```text
┌─ Evidence result ───────────────────────────────────────────────────┐
│ ◇ POSSIBLE DISPLACEMENT                          Limited conclusion │
│ Aggregate changes are consistent with possible displacement.       │
│ This does not track people or establish causality.                  │
│                                                                     │
│ Evidence for                    Evidence against / uncertainty       │
│ + decline sustained             ! one comparison month missing      │
│ + adjacent aggregate increase   ! boundary review is provisional    │
│ + methods otherwise comparable  ! unmatched change remains          │
│                                                                     │
│ [ Show calculation ] [ Review source limitations ]                  │
└─────────────────────────────────────────────────────────────────────┘
```

The symbol, heading, and text communicate status together. Color may reinforce
the result but never carries it alone.

## Section 2 — Review the outlook

```text
┌─ 2. Forecast the next monthly observation ─────────────────────────┐
│ Planning signal, not a person or service-demand forecast            │
│                                                                     │
│   aggregate observation                                             │
│      historical ───────────┆ forecast range                         │
│                             ┆  ┌────────── upper bound               │
│                             ┆  ├─ point forecast                     │
│                             ┆  └────────── lower bound               │
│                                                                     │
│ Selected: Seasonal naive      Held-out MAE: —      Coverage: —       │
│ Baseline retained unless a candidate improves held-out performance. │
│                                                                     │
│ [ View model comparison ] [ How uncertainty affects the plan ]      │
└─────────────────────────────────────────────────────────────────────┘
```

Requirements:

- observed and forecast values use different line styles and explicit labels;
- the interval has boundaries plus a textual range, not only shaded color;
- missing observations use a gap rather than an interpolated solid line;
- the selected model, baseline result, held-out error, empirical coverage, and
  horizon appear adjacent to the chart;
- a table contains the same values for keyboard and screen-reader access;
- when no forecast is supportable, the chart is replaced with an insufficient
  forecast evidence state and the planner explains whether it can proceed.

## Section 3 — Plan the next shift

```text
┌─ 3. Plan 80 staff-hours ────────────────────────────────────────────┐
│ Coverage guard: ON     Minimum: 8 hours/area     6 areas included   │
│                                                                     │
│ Area             Suggested   Locked?   Why this amount?             │
│ East Village        24 h       [ ]     upper range + continuity     │
│ Gaslamp             12 h       [ ]     forecast share + floor       │
│ Cortez Hill          8 h       [ ]     minimum coverage             │
│ …                                                                   │
│                                                                     │
│ Allocated: 80/80 h   Unmet planning load: 14 h                      │
│ [ Generate plan ] [ Compare without guard ] [ Reset ]               │
└─────────────────────────────────────────────────────────────────────┘
```

After generation:

- each row shows suggested hours, lock/override controls, constraint status,
  and a **Why this amount?** disclosure;
- the total budget, unmet planning load, and any infeasibility remain visible;
- the guarded result is the default;
- the unguarded comparison is labeled as an audit view, not a recommendation;
- an override records the human change and recomputes only unlocked hours;
- an invalid override explains how to resolve it without silently changing the
  budget or floor.

## Section 4 — Review and brief

```text
┌─ 4. Human review ───────────────────────────────────────────────────┐
│ Recommendation status: READY FOR COORDINATOR REVIEW                 │
│                                                                     │
│ What changed        Forecast range        Suggested allocation      │
│ What is uncertain   Uncovered load        Human overrides           │
│                                                                     │
│ Review again when: new month · budget change · method/boundary      │
│ change · wide interval · infeasible floor · local knowledge conflict│
│                                                                     │
│ [ Data card ] [ Model card ] [ Allocation card ] [ Limitations ]    │
│ [ Copy decision brief ]                                             │
└─────────────────────────────────────────────────────────────────────┘
```

The primary action is review, not approval or automatic dispatch. The brief
travels with assumptions, constraints, sources, unresolved fields, and human
changes.

## Content inventory

| Surface | Required content | Primary action | Secondary evidence |
|---|---|---|---|
| Decision header | horizon, budget, area/period status, unresolved warning | Edit budget | Open disclosures |
| Drop input | area, period, apparent change, completeness, method state | Test the drop | Inspect source status |
| Drop result | limited label, plain-language statement, claim boundary | Continue to forecast | Evidence for/against and calculation |
| Forecast | horizon, range, selected model, baseline result, error, coverage | Continue to planner | Model comparison and value table |
| Planner input | budget, floor, included areas, coverage-guard state | Generate plan | Constraint definitions |
| Allocation | per-area hours, locks, overrides, reasons, totals, unmet load | Recompute/review | Guarded comparison and objective details |
| Human review | recommendation status, uncertainty, overrides, triggers | Copy/open brief | Data/model/allocation/limitation cards |
| Global disclosures | source, retrieval date, methods, privacy, AI use, non-goals | Return to decision | Full technical detail |

## Required interface states

| State | Presentation | Available action |
|---|---|---|
| Loading generated artifact | Text status and progress indicator; prior content is not fabricated | Retry if loading fails |
| Artifact unavailable offline | Explain which local generated file is missing | Open setup guidance; no live API fallback |
| Schema incompatible | Name expected and received schema versions | Rebuild artifacts |
| Scenario unresolved | Persistent warning naming geography/period blockers | Review provisional flow; cannot label final |
| Missing observations | Gaps in chart plus missing-period list | Inspect quality card |
| Method break | Marked boundary and comparability warning | Select another period or return insufficient evidence |
| Insufficient drop evidence | Neutral status, reasons, and missing evidence | Continue only if downstream limitations permit |
| Insufficient forecast evidence | No authoritative line; explain why | Use approved fallback or stop planning |
| Wide interval | Text warning and range values | Inspect reserve effect |
| Planner infeasible | No allocation presented as valid; list conflicting constraints | Increase budget, reduce included areas through review, or revise floor explicitly |
| Invalid override | Field-level explanation and unchanged valid plan | Correct or cancel override |
| Successful recompute | Updated totals plus disclosed human changes | Review brief |

## Keyboard and screen-reader order

1. Skip link to the current decision section.
2. Product purpose and decision context.
3. Budget input and scenario warning.
4. Step navigation.
5. Current section heading and summary.
6. Inputs in visible order.
7. Primary action.
8. Result announcement in a polite live region.
9. Evidence table before chart detail.
10. Secondary disclosures.

Additional rules:

- Focus moves to the result heading only after a user-triggered calculation.
- Recalculation does not reset focus to the top of the page.
- Locks and overrides have programmatic area names and current values.
- Disclosure controls expose expanded state.
- Charts always have an adjacent data table and summary sentence.
- No essential content exists only in a tooltip or hover state.

## Non-color vocabulary

| Meaning | Text label | Additional cue |
|---|---|---|
| Likely improvement | `LIKELY IMPROVEMENT` | downward trend icon and evidence sentence |
| Possible displacement | `POSSIBLE DISPLACEMENT` | adjacent-area icon and continuity sentence |
| Insufficient evidence | `INSUFFICIENT EVIDENCE` | question-mark icon and missing-evidence list |
| Fixed decision | `FIXED` | lock icon |
| Provisional value | `PROVISIONAL` | outlined diamond and owner/review issue |
| Unresolved blocker | `UNRESOLVED` | stop icon and blocked action text |
| Infeasible plan | `NO FEASIBLE PLAN` | constraint list and recovery actions |

## Responsive behavior

- At wide widths, evidence-for/evidence-against and chart/metrics may sit in two
  columns.
- Below 768 px, all panels stack in decision order; tables scroll within their
  labeled region without forcing full-page horizontal scrolling.
- The decision header becomes a compact summary but never hides budget,
  horizon, or unresolved status.
- Allocation rows become labeled cards on narrow screens rather than clipped
  tables.
- Touch targets remain at least 44 by 44 CSS pixels.

## Track handoffs

- B-05 implements the decision shell, drop result, and forecast experience.
- B-06 implements the aggregate spatial view and equivalent evidence table.
- C-04 implements planner controls inside the Section 3 boundary defined here.
- C-05 implements disclosure cards and completes the accessibility checks.
- D-06 tests the integrated journey using the B-04 protocol.

## Review checklist

- [ ] Track D confirms that the storyboard reflects the decision contract.
- [ ] Track A confirms that every analytical value has a place and limitation.
- [ ] Track C confirms planner states, constraints, and human-review behavior.
- [ ] Track B confirms the responsive and keyboard order is implementable.
