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

## Operator trace after local runtime build — 2026-09-24

The owner started MOD camera, captured five 96×96 frames, and stopped it. The MOD traces reported `unverified · mismatch` for all five, so none can be counted as a verified webcam or synthetic pair. The MOD-reported `(digest, meanLuma)` values were `(#1 bad16aca, 135)`, `(#2 a4830eb7, 135)`, `(#3 22265b96, 43)`, `(#4 63868140, 131)`, and `(#5 02564f0c, 131)`. The owner reported closing the MacBook camera for #3 and opening it again for #4; MOD luma fell to 43 at #3 and returned to 131 at #4. This is scene-correlated MOD output, but the host-to-MOD pairing check failed, so the webcam PASS rule is not met. No raw frame data was retained.

The stop trace reported `captureCount=5`; the page reported old track `ended`, host capture count `5`, and stationary capture count `true`. This supports the stop/release case for this run. The camera-source case remains unresolved. The E008 page now includes host source, dimensions, byte count, digest, and luma alongside a mismatched MOD trace so the next run can distinguish a digest implementation mismatch from different frame bytes without recording any image.

### Repeat with paired host metadata

The owner repeated six captures after the page gained host metadata. Every paired host capture reported `webcam`, 96×96, and 18,432 bytes. Every MOD frame reported the same dimensions and byte count, and the same rounded luma as its paired host frame. Every digest still differed:

| Capture | MOD digest | Host digest | Both luma |
| --- | --- | --- | --- |
| #1 | `8da45e1e` | `fc0f890c` | 130 |
| #2 | `bd03822f` | `b03ce83d` | 130 |
| #3 | `88cbf93a` | `a5a4e190` | 63 |
| #4 | `5012a494` | `f957e502` | 165 |
| #5 | `f1811a43` | `ff86e6d9` | 72 |
| #6 | `aa2b0b67` | `97daf7cd` | 68 |

The second stop reported old track `ended`, host capture count `6`, and stationary count `true`. The equal luma is consistent with shared image content, but it cannot establish byte identity; exact pairing remains unverified. A fixed-byte digest probe was added to isolate host-versus-MOD hash behavior without reading camera pixels.

The first fixed-byte probe disagreed (`MOD=2a66f1f0`, `host=b81b3f76`). Replacing `Math.imul` and typed-array iteration with indexed shift/addition did not change the MOD probe result. A third owner run still had three `webcam` host captures paired in count, dimensions, byte length, and rounded luma (129, 67, 132), but all three digests mismatched. Stop again reported old track `ended`, host capture count `3`, and stationary count `true`. The served MOD archive was independently hashed and matched the rebuilt local archive, so a missing or stale HTTP asset has not been demonstrated.

The expanded fixed-byte probe found `length=8`, `first=0`, and `last=99` on MOD, as expected, but even its empty-input digest was different: MOD `7fffffff`, host `811c9dc5`; one zero byte was MOD `7efffe6d`, host `050c5d1f`. An empty-input difference proves the prior digest algorithm diverged before any frame bytes were processed. The `0x811c9dc5` seed exceeded the signed 31-bit range and was represented as `0x7fffffff` in the MOD result. The experiment now uses small-integer Adler-32 accumulators in both runtimes and requires a matching fixed probe before it will count webcam or synthetic frames.

### Repeat with cross-runtime checksum — 2026-09-24

The fixed probe matched across runtimes: MOD and host `0a63029a`; empty input `00000001`; one zero byte `00010001`; probe length `8`, first byte `0`, last byte `99`. In the subsequent owner-operated run, MOD emitted three uniquely paired `webcam · matched` frames at 96×96 and 18,432 bytes: `#1 digest=e1c13afd, meanLuma=133`; `#2 digest=eab250f4, meanLuma=56`; `#3 digest=ff06ec17, meanLuma=137`. The owner explicitly confirmed that #1 had the camera open, #2 was closed/covered, #3 was reopened, and the scene changed accordingly. The stop trace reported `captureCount=3`, old track `ended`, host capture count `3`, and stationary count `true`. This satisfies the webcam PASS rule for the owner-operated run. No raw image was stored or uploaded.

### Simulated unavailable cases

The owner then ran the two requested simulated scenarios in order: unsupported camera API, followed by no camera device, and explicitly confirmed that order. Each run yielded three MOD frames marked `synthetic · matched`, 96×96, 18,432 bytes, digest `7d9b3c4f`, meanLuma `125`. Each stop reported old track `無`, host capture count `3`, and stationary count `true`; neither run claimed a webcam match. The repeat transcript confirmed the page displayed `模擬 · unsupported · getUserMedia 不存在` with error `無` for the first scenario, and `模擬 · unavailable · 相機不可用` with error `NotFoundError` for the second. These controlled simulations establish the synthetic fallback through MOD and its source/error labels, not a real denied-permission outcome.

### Real browser permission denial

The owner reset the localhost camera permission and denied access in the real-browser-camera scenario. The page reported `授權遭拒` with `NotAllowedError`; the bridge status was fallback, and the MOD emitted one `synthetic · matched` 96×96 frame (18,432 bytes, digest `7d9b3c4f`, meanLuma `125`). The fixed digest probe matched. No webcam frame was claimed. A stop event was not included in this denial transcript; live-camera and controlled-fallback stops were verified separately.

### Restart while webcam capture was active

After restoring browser camera permission, the owner captured one `webcam · matched` 96×96 frame (digest `e018a552`, meanLuma `134`) and pressed **重新啟動 simulator** without a separate stop. The restart path reported old track `ended`, host capture count `1`, stationary count `true`, and MOD stop `captureCount=1`. The new MOD then loaded with a matching fixed probe and captured a new `webcam · matched` 96×96 frame (digest `2e8eadf8`, meanLuma `135`; its capture sequence restarted at `#1`). The owner then explicitly stopped that new run; the new track was `ended`, host capture count remained `1`, stationary count was `true`, and MOD stop reported `captureCount=1`. This verifies old-track release, a fresh capture generation, and final camera release.

### Final checks after the checksum correction

On 2026-09-24, `npm test` passed all 9 tests, `npm run typecheck` passed both strict TypeScript projects, `npm run mod` built a 3,931-byte E008 archive, and `npm run build` passed. `git diff --check` passed. The Vite build emitted only its nonblocking large-chunk warning. These local checks supplement the owner-operated browser traces above; they do not replace them.

## Human camera scenarios

| Scenario | Status | Trace / observation |
| --- | --- | --- |
| Permission granted; open → closed → open | PASS | After fixing the cross-runtime checksum, three MOD frames uniquely paired as `webcam` and the owner confirmed open/closed/open scene changes; luma 133 → 56 → 137. Earlier mismatches were caused by the digest seed divergence, not counted as PASS. |
| Permission denied | PASS | Real localhost permission denial displayed `NotAllowedError` and `授權遭拒`; MOD received only a matched synthetic frame. |
| No camera / unsupported API | Simulated fallback PASS | Each controlled scenario produced three `synthetic · matched` MOD frames. No API displayed `unsupported` / `無`; no device displayed `unavailable` / `NotFoundError`. No camera track remained after stop. |
| Stop and restart | PASS | Stops ended prior tracks and froze counts. A restart while camera was active ended the old track at count 1, a fresh MOD generation produced a new matched webcam frame, and final stop ended the new track. |
| Privacy | PASS, static review and operator transcript | Independent Reviewer confirmed that E008 code writes and uploads no raw frame bytes; the owner shared only trace metadata. No live network traffic capture was performed. |

## Decision

- Webcam path: **PASS** for the owner-operated run. The exact pinned runtime delivered three verified webcam frames to the TypeScript MOD; the owner confirmed scene-correlated change, and stop released the old track.
- Synthetic fallback through MOD: **PASS** in controlled unsupported/no-device scenarios and a real browser permission-denial run. Synthetic frames were explicitly marked and never counted as webcam success.
- Independent implementation review: **approved** after the asset script was made to reject dirty vendor source and the stop status distinguished absent tracks from ended tracks.
- The owner-operated cases are complete. Human review of the draft PR remains; no real image data was recorded.
