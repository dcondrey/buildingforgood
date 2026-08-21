# Release and Rehearsal Record

## Completed checks

- Full local gate: 123 Python tests, strict mypy, ruff formatting/lint, 15 app
  tests, Prettier, oxlint, TypeScript, and Vite production build.
- Production preview served the application shell and
  `generated/demo.v1.json` with HTTP 200.
- The runtime has no live API dependency; the generated artifact is committed.
- Separate data-science, product-experience, and judge-readiness reviews were
  performed. Their release blockers were routed into implementation work.

## Still required before presenting

- [ ] Merge the latest integration-track privacy/accessibility work and rerun
      the full gate on the final commit.
- [ ] One person other than the presenter completes the current usability task
      script while an observer records hesitation and errors.
- [ ] Complete the entire flow keyboard-only at the presentation resolution.
- [ ] Rehearse the spoken script under three minutes twice.
- [ ] Run the production preview with networking disabled on the presentation
      device.
- [ ] Verify the deployed and offline artifact hashes match.
- [ ] Capture a browser-playable fallback and four static result images.
- [ ] Test projector contrast, browser zoom, power, sleep, and notifications.

This file is intentionally not a claim that human rehearsal has occurred. The
unchecked items remain release gates.
