# E015 recording evidence — 2026-10-13

## Actual engineering environment

- Feature worktree `/private/tmp/coami-e015-manual-video-recording`, branch `feat/andrew/e015-manual-video-recording`, base dev `9155139d34ad94379a246c5d31c29e86fed52ed1`.
- macOS arm64; Node 26.10.0, npm 11.19.1.
- Vendor `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`, isolated submodule initialized from the existing local checkout. Dev tracked files not modified.
- `npm run assets` attempted: blocked at missing `MODDABLE 9.5.0`; EMSDK/fontbm also unconfigured. No live simulator/video recording attempt. No raw pixels or videos saved.
- Pure test fakes represent asynchronous recorder/run/player behavior, not camera success. Actual engineering commands and results are in validation.txt.

## Owner cases — NOT EXECUTED

| Case | Actual start/stop T | Playback ended time | Unique webcam/MOD digests | Owner motion observation | Cleanup evidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| TC1 ~3s end | pending | pending | pending | pending | pending | 未執行 |
| TC2 ~8s end | pending | pending | pending | pending | pending | 未執行 |
| TC3 ~3s cancel | pending | no output required | pending | pending | pending | 未執行 |
| TC4 restart ~3s | pending | pending | pending | pending | pending | 未執行 |
| TC5 physical errors | pending | not applicable | pending | pending | pending | 未執行 |

Before updating: record browser/version, webcam/device condition, timestamp, exact operation, actual metadata and named owner observation. Check motion/end-time/cleanup criteria in README. No success may be inferred from simulated tests or a nonempty Blob.

## Status / decision

- Main experiment: **未執行**; feasibility-validation task complete: **no**.
- Required next evidence: attested full runtime and owner-operated motion/time/cancel/restart observations.
- Draft PR is an engineering handoff only, not adoption or hypothesis approval.

## Engineering publication

Code delivery is available in Draft PR https://github.com/a129924/coami/pull/15. Local PR Lens validate/render passed using actual diff provenance; this is a review aid, not correctness or recording proof. No usable Graphify graph existed, so targeted source fallback was used without building one. Archify structural showcase passed but desktop visual containment failed; its artifact is partial. Git hook runner lefthook was unavailable; explicit checks were run separately.
