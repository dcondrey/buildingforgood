<!-- repo-header:start -->
<img src="https://github.com/dcondrey.png?size=160" alt="Fallback media logo" width="120" align="left">

<h1>Fallback media</h1>

<p><strong>Documentation for Fallback media in Buildingforgood.</strong></p>

<br clear="left">

[![CI](https://img.shields.io/github/actions/workflow/status/dcondrey/buildingforgood/verify.yml?style=flat-square&labelColor=20232a&branch=main&label=CI)](https://github.com/dcondrey/buildingforgood/actions/workflows/verify.yml) [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14402/badge)](https://www.bestpractices.dev/projects/14402) [![License](https://img.shields.io/github/license/dcondrey/buildingforgood?style=flat-square&labelColor=20232a&color=007ec6&label=license)](https://github.com/dcondrey/buildingforgood/blob/main/LICENSE) [![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-Sponsor-EA4AAA?style=flat-square&labelColor=20232a)](https://github.com/sponsors/dcondrey)
<!-- repo-header:end -->

Captured 2026-08-21 from the local production preview (`npm --prefix app run
preview`) of the build that passed `./scripts/verify.sh` on
`track/b-product-experience`, at a 1600×1000 viewport, via browser automation.
Content is the frozen `demo.v1.json` scenario; no live data.

- `demo-walkthrough.mp4` — 22.5s browser-playable walkthrough of the full
  scripted flow (recaptured 2026-08-21 after the mid-work opening landed):
  hero with the live default plan → Test the drop → forecast → the already
  computed 80h plan → what-if slider at 120h → map selection (East Village) →
  assumption explorer → Compare with no minimum → Restore the 8h minimum →
  decision brief.
- `still-1-drop-result.png` — drop-test decomposition result.
- `still-2-forecast.png` — forecast replay with interval and scorecard.
- `still-3-guarded-plan.png` — 80/80 guarded allocation with the neighborhood
  map.
- `still-4-decision-brief.png` — review step with the copyable brief.

Fallback order at the venue (per DEMO_SCRIPT.md): local production preview →
this recording → these stills plus the spoken story.

Still owed by a person on the presentation device: the airplane-mode run, a
re-recording there if the stage machine differs, and the projector checks.
These files satisfy the "capture fallback media" item only; they do not close
any on-device gate.
