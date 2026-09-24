# E008 Camera input feasibility

This experiment asks whether a real browser webcam frame reaches a TypeScript MOD through the pinned Stack-chan simulator. The page keeps `webcam`, `synthetic fallback`, and `unavailable` separate. A simulator preview or camera-connected status is not evidence of MOD delivery.

## Prerequisites and build

- Node 24–26 and npm.
- The repository's `vendor/stack-chan` submodule checked out at `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Moddable SDK 9.5.0 (`MODDABLE` set), Emscripten 5.0.1 (`emcc` on `PATH`), and executable `fontbm` (`FONTBM` set or on `PATH`). The pinned vendor `firmware/scripts/build-wasm.sh` requires these exact prerequisites.

From `experiments/E008-camera-input/web`:

```sh
npm ci
npm test
npm run typecheck
npm run prepare:poc
npm run build
npm run dev
```

`prepare:poc` first copies the pinned vendor source into ignored `web/generated/`, builds `mc.js` and `mc.wasm` there, and writes their SHA-256 values to `web/generated/runtime-provenance.json`. It then builds the E008 MOD archive. The asset step stops with a `BLOCKED` prerequisite error if the exact runtime cannot be built. It does not use the older E005 simulator binaries or write into the vendor checkout.

Open the localhost URL printed by Vite. Use a secure localhost context and a browser with a camera for the live run.

## Operator procedure

1. Select **真實瀏覽器相機** and restart the simulator if the selection changed. Do not open the vendor's built-in camera preview during evidence capture.
2. Click **授權並啟動 MOD 相機** and grant access. The page reports the browser error category if access fails. A connected stream is advisory until MOD frames are paired.
3. Click **擷取一張 MOD frame** with the lens uncovered, covered, then uncovered again. Record the three MOD digest/brightness readings and whether they changed with the physical scene. A `webcam` label requires a unique host-to-MOD frame match; `synthetic fallback` never counts toward webcam PASS.
4. Click **停止並釋放相機**. Confirm the old track shows `ended` and the host capture count stays still. Restart and repeat to check generation isolation.
5. Deny browser permission in a separate live run. The `unsupported` and `no-device` dropdown options exercise controlled negative paths; label those results simulated. Record all outcomes in `evidence/camera-run.md`.

Only dimensions, counts, digests, brightness, errors, track states, and human observations belong in evidence. Do not save screenshots, raw frames, or video from the real camera.
