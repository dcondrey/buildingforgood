# Release and Rehearsal Record

## Completed checks

- Full local gate: 123 Python tests, strict mypy, ruff formatting/lint, 15 app
  tests, Prettier, oxlint, TypeScript, and Vite production build.
- 2026-08-21: full gate rerun after the backlog-closure work; 214 Python
  tests passed (1 skipped), 127 app tests (including two axe passes and the
  offline-fallback path over the deployed shell), privacy scan 0 blocking /
  0 warning against `public/generated` and `app/dist`.
- Production preview served the application shell and
  `generated/demo.v1.json` with HTTP 200.
- 2026-08-21 network-loss run (browser-driven): production preview loaded
  once, the preview server was then killed, and a fresh navigation was served
  entirely by the service worker, including `generated/demo.v1.json`
  ("Generated analysis loaded", not the embedded fallback). The full flow
  completed from cache: drop-test classification, 80/80-hour plan, unmet
  planning load, and both map tables. This satisfies the network-independence
  claim on a development machine; the presentation-device run below remains a
  human gate.
- 2026-08-21: deployed, `app/dist`, `public/generated`, and a fresh local
  rebuild are hash-identical (SHA-256 `1da6777a…`).
- The runtime has no live API dependency; the generated artifact is committed.
- Separate data-science, product-experience, and judge-readiness reviews were
  performed. Their release blockers were routed into implementation work.
- 2026-08-21: the spatial view was upgraded to simplified real neighborhood
  boundaries (dissolved from the organizer block grid, aggregate outlines
  only) with keyboard-accessible area selection and per-area detail panels,
  and short-viewport compression tiers were added so the page fits
  presentation resolutions. Full gate rerun after the change: 214 Python
  tests, 129 app tests (two axe passes included), privacy scan 0 blocking /
  0 warning over the rebuilt bundle.
- 2026-08-21: fallback media captured from the verified build via browser
  automation into `docs/testing/media/` (22.5s browser-playable walkthrough
  plus the four stills: drop result, forecast, guarded plan, decision brief);
  recaptured the same day after the mid-work opening landed.
- 2026-08-21 (afternoon): service worker updated to v2 after a live staleness
  incident (Chrome pinned a returning visitor to a previous deploy; #69). The
  offline path was re-driven against the deployed site under the v2 worker:
  the update activated over v1 on an ordinary visit, v1 caches were purged,
  and an offline reload rendered the full app from cache with the generated
  artifact, not the embedded fallback. The on-device airplane-mode run remains
  a human gate.

## Still required before presenting

- [ ] One person other than the presenter completes the current usability task
      script while an observer records hesitation and errors.
- [ ] Complete the entire flow keyboard-only at the presentation resolution.
- [ ] Rehearse the spoken script under five minutes twice.
- [ ] Repeat the network-disabled run on the presentation device itself.
- [x] Capture a browser-playable fallback and four static result images.
      (Captured 2026-08-21 into `docs/testing/media/`; copy them onto the
      presentation device, and re-record there if the stage machine differs.)
- [ ] Test projector contrast, browser zoom, power, sleep, and notifications.

This file is intentionally not a claim that human rehearsal has occurred. The
unchecked items remain release gates.
