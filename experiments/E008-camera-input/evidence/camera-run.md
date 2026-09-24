# E008 camera run evidence — 2026-09-24

## Initial environment and provenance

- Worktree: `/private/tmp/coami-e008-camera-input`, branch `feat/andrew/camera-input-feasibility`.
- Vendor gitlink and checked-out source: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Node `v26.4.0`, npm `11.17.0`.
- Initially `MODDABLE` was unset; `emcc` and `fontbm` were not found on `PATH`. The initial build therefore could not produce `mc.js` / `mc.wasm`.

## Verification performed

| Command | Result | Meaning |
| --- | --- | --- |
| `npm ci --offline` | PASS | E008 web dependencies installed from local cache. |
| `npm test` | PASS: 8 tests | Webcam canvas match, synthetic while stream started, denial/error category, unsupported API, capture failure, pairing ambiguity, and generation behavior. |
| `npm run typecheck` | PASS | Strict TS checks for web and MOD. |
| `npm run mod` | PASS | E008 `coami-mod.xsa` compiled; this does not prove runtime camera delivery. |
| `npm run build` | PASS | Vite page bundled; this does not prove simulator runtime availability. |
| Initial `npm run assets` | BLOCKED | `MODDABLE 9.5.0 is not configured`; `emcc` and `fontbm` were also absent. No pinned WASM generated. |

## Local toolchain installation and repeat build — 2026-09-24

The required tools were installed **only in this feature worktree** under ignored `experiments/E008-camera-input/web/generated/toolchain/`. They are local build dependencies and are not part of the PR. A fresh checkout needs these versions or equivalent paths before `npm run prepare:poc` can build the simulator. macOS host prerequisites used here were Xcode, CMake, and FreeType 2.14.1.

| Dependency | Local source / validation | Required for |
| --- | --- | --- |
| Moddable SDK 9.5.0 | Official `Moddable-OpenSource/moddable` tag `9.5.0` (commit `b6e06ba70506a7381ffb28e09e3175bf4e99f305`); `tools/VERSION` = `9.5.0`; macOS tools built locally | `mcconfig`, `xsc`, WASM runtime build |
| Emscripten 5.0.1 | Official `emscripten-core/emsdk` `5.0.1`; `emcc --version` = `5.0.1` (`8c5f43157a3f069ade75876e23061330521eabde`) | Compile and link `mc.js` / `mc.wasm` |
| `fontbm` | Official `vladimirgamalyan/fontbm` source commit `7677b908523e909679f67cd5c170396bb9def1aa`, built locally with CMake and FreeType | Simulator font resources |

The first repeat of `npm run prepare:poc` could not reach `registry.npmjs.org` from the restricted shell. Repeating with network access installed the pinned vendor npm dependencies and completed the build. Vendor `npm ci` generated an unrelated root `lefthook.yml`; it was removed, and the build script now sets `CI=1, LEFTHOOK=0` for that copied-source install to keep generated files inside the ignored directory.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm run prepare:poc` | PASS | Pinned runtime built from vendor gitlink `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`; E008 MOD archive built (3,642 bytes). |
| `mc.js` | PASS | SHA-256 `8b1de5278f4dc27c42817b13b8bb83b852deaaa61375443c8a3894b914592670`; localhost serves `text/javascript` (73,325 bytes). |
| `mc.wasm` | PASS | SHA-256 `03cdc42dd95c00d2c58cedb611f9079328882468252a3d492f5cb0c37f49d6b0`; localhost serves `application/wasm` (5,100,046 bytes). |
| `coami-mod.xsa` | PASS | Localhost serves 3,642-byte archive. |
| `npm test`; `npm run typecheck` | PASS | Eight TypeScript tests and both strict TypeScript projects passed after toolchain installation. |
| Repeat `npm run prepare:poc` after hook isolation | PASS | Same `mc.js` / `mc.wasm` hashes; no root `lefthook.yml` created. |
| `npm run build` after runtime creation | PASS | Vite bundle and strict typecheck passed; Vite reported a nonblocking large-chunk warning. |

Runtime hashes also appear in ignored `web/generated/runtime-provenance.json`. HTTP asset delivery verifies the original missing-`mc.js` issue is resolved; it does not verify MOD execution, synthetic fallback through MOD, or webcam delivery.

## Human camera scenarios

| Scenario | Status | Trace / observation |
| --- | --- | --- |
| Permission granted; uncovered → covered → uncovered | Not run | Pinned WASM is ready locally; requires owner-operated camera and MOD trace observation. |
| Permission denied | Not run | Pinned WASM is ready locally; requires owner-operated browser permission choice. |
| No camera / unsupported API | Not run end to end | TS unit tests cover controlled bridge behavior only. |
| Stop and restart | Not run end to end | TS unit tests cover track stop and generation rejection only. |
| Privacy | PASS, static review | Independent Reviewer confirmed that E008 code writes and uploads no raw frame bytes; evidence stores metadata only. No live network capture was performed. |

## Decision

- Webcam path: **blocked**, not PASS or FAIL. The exact runtime is now available locally, but human camera and MOD frame evidence are absent.
- Synthetic fallback through MOD: **unverified**. Bridge-level unit tests passed, but no end-to-end MOD fallback run occurred.
- Independent implementation review: **approved** after the asset script was made to reject dirty vendor source and the stop status distinguished absent tracks from ended tracks.
- Resume at the owner-operated browser cases; record same-run MOD traces and scene observations here. Do not record real image data.
