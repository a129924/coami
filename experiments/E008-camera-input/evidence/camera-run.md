# E008 camera run evidence — 2026-09-24

## Environment and provenance

- Worktree: `/private/tmp/coami-e008-camera-input`, branch `feat/andrew/camera-input-feasibility`.
- Vendor gitlink and checked-out source: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Node `v26.4.0`, npm `11.17.0`.
- `MODDABLE` was unset; `emcc` and `fontbm` were not found on `PATH`. Exact `mc.js` / `mc.wasm` SHA-256 values therefore cannot yet be recorded.

## Verification performed

| Command | Result | Meaning |
| --- | --- | --- |
| `npm ci --offline` | PASS | E008 web dependencies installed from local cache. |
| `npm test` | PASS: 8 tests | Webcam canvas match, synthetic while stream started, denial/error category, unsupported API, capture failure, pairing ambiguity, and generation behavior. |
| `npm run typecheck` | PASS | Strict TS checks for web and MOD. |
| `npm run mod` | PASS | E008 `coami-mod.xsa` compiled; this does not prove runtime camera delivery. |
| `npm run build` | PASS | Vite page bundled; this does not prove simulator runtime availability. |
| `npm run assets` | BLOCKED | `MODDABLE 9.5.0 is not configured`; `emcc` and `fontbm` are also absent. No pinned WASM generated. |

## Human camera scenarios

| Scenario | Status | Trace / observation |
| --- | --- | --- |
| Permission granted; uncovered → covered → uncovered | Not run | Requires pinned WASM and owner-operated camera. |
| Permission denied | Not run | Requires pinned WASM and owner-operated browser permission. |
| No camera / unsupported API | Not run end to end | TS unit tests cover controlled bridge behavior only. |
| Stop and restart | Not run end to end | TS unit tests cover track stop and generation rejection only. |
| Privacy | PASS, static review | Independent Reviewer confirmed that E008 code writes and uploads no raw frame bytes; evidence stores metadata only. No live network capture was performed. |

## Decision

- Webcam path: **blocked**, not PASS or FAIL. Exact runtime and human camera evidence are absent.
- Synthetic fallback through MOD: **unverified**. Bridge-level unit tests passed, but no end-to-end MOD fallback run occurred.
- Independent implementation review: **approved** after the asset script was made to reject dirty vendor source and the stop status distinguished absent tracks from ended tracks.
- Resume at `npm run assets` after the pinned toolchain is available; record asset hashes and the operator's same-run MOD traces and scene observations here.
