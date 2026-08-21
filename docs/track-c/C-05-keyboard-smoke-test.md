# C-05 — Keyboard-only smoke test (manual, run before release)

**Issue:** [#16](https://github.com/dcondrey/buildingforgood/issues/16) · **Track:** [C](https://github.com/dcondrey/buildingforgood/issues/30)

#16 requires automated accessibility checks **plus** a documented keyboard-only test. The automated half runs in `app/src/features/planner/PlannerPanel.a11y.test.tsx`. This is the half a person has to do, and the reason it exists is below.

## What the automated checks do and do not cover

`axe-core` runs against the rendered panel in three states (planned, infeasible, floor-dominant) on every `verify.sh`. It catches machine-checkable violations: missing labels, broken roles, orphaned form controls, bad heading structure, duplicate ids.

**Two limits, stated so a green run is not mistaken for a clean bill of health.**

1. **Colour contrast is not actually checked.** axe computes contrast by painting to a canvas, and jsdom does not implement `getContext`, so the `color-contrast` rule cannot execute in this environment. A passing automated run says nothing about contrast. It has to be measured in a real browser.
2. **axe cannot read.** It cannot tell whether the copy is comprehensible, whether the reading order makes sense, or whether a screen-reader user would understand what a number means. Every consequential claim in this product depends on that, so the manual pass is not a formality.

## The test

Run against the production build with the network disabled, using the keyboard only. Do not touch the mouse or trackpad at any point. If you reach for it, that is a finding.

### Setup

```bash
./scripts/verify.sh          # must pass, privacy scan included
npm --prefix app run preview
```

### 1. Reach the plan

Note (2026-08-21): the shell now opens with the default plan already
generated; these checks start from that live state rather than from a
Generate press.

- [ ] `Tab` from page load reaches the budget field without passing through anything unlabelled.
- [ ] Every stop announces what it is. Nothing reads as "button" or "edit text" with no name.
- [ ] Focus is visible at every stop. If you cannot tell where you are, that is a failure regardless of what axe said.

### 2. Change the budget

- [ ] Type a valid number. The plan updates.
- [ ] Clear the field entirely. An error appears, it says what to enter, and the previous plan stays on screen rather than blanking.
- [ ] Type letters. Same behaviour, no `NaN` anywhere on screen.
- [ ] Enter a budget below the coverage floor. The panel explains the shortfall in hours and names what to change.

### 3. Understand a single row

- [ ] Reach a **Why this amount?** control by `Tab` and open it with `Enter`, then again with `Space`.
- [ ] The explanation names the floor, any continuity reserve, and the discretionary share.
- [ ] Close it again from the keyboard.

### 4. Override

- [ ] Reach a lock checkbox and toggle it with `Space`.
- [ ] The hours field for that row becomes reachable and editable.
- [ ] Change it. Remaining hours redistribute and the locked value holds.
- [ ] The disclosure line reports the number of assignments a person set.

### 5. Compare

- [ ] Reach **Compare without the coverage guard** and activate it.
- [ ] The comparison column is labelled as an audit view.
- [ ] Nothing on screen presents the unguarded plan as the better one.

### 5b. Map selection (added 2026-08-21 with the interactive neighborhood map)

- [ ] `Tab` reaches each neighborhood on both maps in a sensible order; every stop
      announces the area name and its value.
- [ ] `Enter` and `Space` both select an area; the detail panel updates and the
      selection is announced (the panel is a live region).
- [ ] Selecting the same area again clears the selection.
- [ ] The selected area is distinguishable with the OS display in greyscale.
- [ ] The **What-if** budget slider is reachable by `Tab`, adjusts with the
      arrow keys, and the announced plan total tracks the value; dragging it
      below the floors' total announces the infeasibility alert.

### 5c. Guide demo (added 2026-08-21 with the hands-on guide rework)

- [ ] **Guide demo** opens the panel and moves focus to it; the step title,
      narration, and task are announced (the panel is a live region).
- [ ] `→` and `Enter` advance, `←` goes back, without touching the panel's
      buttons; `Esc` closes it.
- [ ] Completing a step's task with the real control (e.g. activating **Test
      the drop**) advances the guide by itself; returning via **Back** does not
      bounce forward again.
- [ ] **Play** is announced as a pressed toggle; hands-free playback halts on
      **Pause**, `Esc`, or any activation outside the panel.
- [ ] Stopping the guide while the 0h comparison view is showing restores the
      coverage minimum; the guard status reads ON again.
- [ ] The spotlight outline follows the narrated section and remains visible
      with the OS display in greyscale.

### 5d. Scenario workbench and assumption explorer (added 2026-08-21)

- [ ] After generating a plan, **Save scenario** is reachable and announces its
      disabled state until the plan is ready.
- [ ] A saved scenario chip's three controls (load, Compare, Delete) are
      separate tab stops with distinct announced names.
- [ ] With Compare active, each allocation row announces its "vs saved"
      difference as text, and it is distinguishable in greyscale.
- [ ] Selecting a neighborhood on the plan map exposes the assumption
      explorer; the displaced-share slider adjusts with arrow keys and the
      output tracks it.
- [ ] Applying the assumption announces the banner (a live status region)
      including "assumed, not observed"; **Clear assumption** restores the
      observed-load plan.

### 5e. Map workspace view (added 2026-08-21)

- [ ] The **Story / Map workspace** toggle is reachable, announces pressed
      state, and switching preserves the plan, locks, scenarios, and any
      active assumption.
- [ ] The three layer buttons (Planned hours, Observed change, Unmet load)
      announce pressed state; the map's accessible name changes with the
      layer, and each layer's table equivalent matches the map.
- [ ] Selecting a neighborhood with the keyboard opens the Area dossier tab;
      all dossier values are announced with their labels.
- [ ] The four inspector tabs are reachable in order and announce pressed
      state; controls inside each tab behave identically to the story view.
- [ ] Escape and the guide still behave: **Guide demo** switches to the story
      view and runs there.

### 6. Colour and motion

- [ ] Set the OS display to greyscale. Every state is still distinguishable: infeasible, floor-dominant, locked, suppressed.
- [ ] Enable "reduce motion". Nothing animates, and nothing becomes unreachable.
- [ ] Measure contrast on the warning and error text in browser devtools, since the automated run could not.

### 7. Offline

- [ ] Disable the network and reload. The prepared scenario still renders from the generated artifacts.

## Recording the result

Log the date, the person, the build, and any finding, then link it on #16. A run with no findings recorded is treated as a run that did not happen.

| Date | Run by | Build | Findings |
|---|---|---|---|
| | | | |
