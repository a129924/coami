# E008 Camera input — technical spec

## Runtime boundary

The E008 MOD uses `context.camera.start/capture/stop` with 96×96 RGB565LE frames. Buttons A, C, and B request MOD start, one capture, and stop. The page uses `SimulatorEngine.pushButton` and `onTrace`. No Server, Python, device wire contract, product code, or vendor edit is involved.

Before a formal run, attest that `mc.js` and `mc.wasm` were built from the pinned vendor commit. E005's binaries belong to a different commit and must not be used. The E008 asset script must fail with an explicit prerequisite error if the exact source/toolchain cannot be verified. Generated assets live in ignored `web/generated/`.

## Source observation

Before `engine.start()`, construct a vendor `createHostCameraBridge` with E008-owned video, canvas, and logger. Assign the same wrapped bridge to `engine.cameraBridge` and `engine.hostBridge.Camera`. Wrap the dedicated canvas context's `getImageData` for the current synchronous capture. A host frame is `webcam` only if that call returned enough RGBA bytes, the resulting RGB565LE bytes equal an independent conversion of those pixels, and no capture failure was logged. Every other returned frame is `synthetic`; a missing returned frame is `unavailable`. A started stream and `connectCamera()` status are advisory only. Detect absent `getUserMedia` before the request; retain the native rejection `name` from the injected logger. Controlled negative cases must be labelled simulated.

The page records host capture order, source, width, height, byte count, and a deterministic full-buffer FNV-1a digest. The MOD traces `COAMI8|` JSON with `kind`, capture sequence, dimensions, image type, byte count, FNV-1a digest, and mean RGB565 luminance. It emits no pixels. At most one page-requested MOD capture is outstanding. The capture ledger pairs a same-generation host capture and MOD trace by unique order, dimensions, byte count, and digest; interleaved or ambiguous captures are unverified. Do not use the vendor camera-preview UI during evidence runs.

## Lifecycle and privacy

Start and permission request are user initiated. On stop, request MOD stop, stop the bridge, dispose the engine, and reject late traces by generation. Confirm old media tracks have `readyState === 'ended'` and capture count stops advancing. Restart creates a fresh generation and bridge. Keep frames only transiently in memory for conversion/comparison. Do not log, persist, download, or upload raw image bytes. The evidence file contains only environment, versions, hashes, dimensions, counts, digests, error names, track state, and owner observation.

## Verdict

Webcam PASS requires two uniquely paired webcam frames plus owner-observed cover/uncover change in MOD-derived metrics. A synthetic-only run is fallback PASS / webcam unproven. With verified runtime, granted usable camera, and reproducible MOD-path failure, record FAIL. If runtime provenance, toolchain, permission, or physical camera test cannot be established, record blocked with the concrete prerequisite.
