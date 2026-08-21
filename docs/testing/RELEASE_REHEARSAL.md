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

## Still required before presenting

- [ ] One person other than the presenter completes the current usability task
      script while an observer records hesitation and errors.
- [ ] Complete the entire flow keyboard-only at the presentation resolution.
- [ ] Rehearse the spoken script under three minutes twice.
- [ ] Repeat the network-disabled run on the presentation device itself.
- [ ] Capture a browser-playable fallback and four static result images.
- [ ] Test projector contrast, browser zoom, power, sleep, and notifications.

This file is intentionally not a claim that human rehearsal has occurred. The
unchecked items remain release gates.
