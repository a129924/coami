# E008 Camera input feasibility

This experiment asks whether a real browser webcam frame reaches a TypeScript MOD through the pinned Stack-chan simulator. The page keeps `webcam`, `synthetic fallback`, and `unavailable` separate. A simulator preview or camera-connected status is not evidence of MOD delivery.

## Prerequisites and build

- Node 24–26 and npm.
- The repository's `vendor/stack-chan` submodule checked out at `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Moddable SDK 9.5.0 at source commit `b6e06ba70506a7381ffb28e09e3175bf4e99f305` (`MODDABLE` set, clean tracked checkout, `mcconfig` and `xsc` from its `build/bin` on `PATH`), emsdk 5.0.1 at source commit `14c18b569f55138fe4963924162244251f454fb0` (`EMSDK` set, clean tracked checkout, `emcc` from its `upstream/emscripten` on `PATH`, reporting Emscripten source `8c5f43157a3f069ade75876e23061330521eabde`), and executable `fontbm` from source commit `7677b908523e909679f67cd5c170396bb9def1aa` (`FONTBM` set or on `PATH`; set `FONTBM_SOURCE` if its checkout cannot be inferred from the binary path). The pinned vendor `firmware/scripts/build-wasm.sh` requires these prerequisites.

These are **required local build dependencies**, not npm packages. Without them, Vite can serve the page but the simulator has no `/simulator/mc.js` or `/simulator/mc.wasm`; the MOD buttons cannot provide camera evidence. They are not committed to the repository. The recorded live run used local copies under ignored `web/generated/toolchain/`; temporary-directory cleanup later removed them. A new checkout or rerun must install them or point to equivalent exact versions.

For this feature worktree, from `experiments/E008-camera-input/web` on macOS:

```sh
export MODDABLE="$PWD/generated/toolchain/moddable"
export FONTBM="$PWD/generated/toolchain/fontbm/build/fontbm"
export FONTBM_SOURCE="$PWD/generated/toolchain/fontbm"
source generated/toolchain/emsdk/emsdk_env.sh
export PATH="$MODDABLE/build/bin/mac/release:$PATH"
npm run prepare:poc
```

The local tools were installed from the official Moddable `9.5.0` tag, emsdk `5.0.1`, and `fontbm` source. Building those tools on a fresh macOS checkout also requires Xcode, CMake, and FreeType. Check `evidence/camera-run.md` for the source and artifact hashes of this run.

From `experiments/E008-camera-input/web`:

```sh
npm ci
npm test
npm run typecheck
npm run prepare:poc
npm run build
npm run dev
```

`prepare:poc` removes previously published E008 runtime and MOD assets before checking prerequisites, so a failed repeat build cannot serve stale files. It copies the pinned vendor source into ignored `web/generated/`, verifies the Moddable, emsdk/Emscripten, and `fontbm` source revisions and executable locations, builds `mc.js` and `mc.wasm`, and records runtime and tool binary SHA-256 values in `web/generated/runtime-provenance.json`. It then builds the E008 MOD archive. The asset step stops with a `BLOCKED` prerequisite error if the exact runtime cannot be built. It does not use the older E005 simulator binaries or write into the vendor checkout.

Open the localhost URL printed by Vite. Use a secure localhost context and a browser with a camera for the live run.
Before requesting the camera, confirm the event list says `固定 digest 探針 ... 一致`. A mismatched or missing probe leaves subsequent MOD frames `unverified`; rebuild the E008 MOD and refresh the page before collecting evidence.

## Operator procedure

1. Select **真實瀏覽器相機** and restart the simulator if the selection changed. The authorization button stays disabled until restart applies the selection. Do not open the vendor's built-in camera preview during evidence capture.
2. Click **授權並啟動 MOD 相機** and grant access. The page reports the browser error category if access fails. A connected stream is advisory until MOD frames are paired.
3. Click **擷取一張 MOD frame** with the lens uncovered, covered, then uncovered again. Record the three MOD digest/brightness readings and whether they changed with the physical scene. A `webcam` label requires a unique host-to-MOD frame match; `synthetic fallback` never counts toward webcam PASS.
4. Click **停止並釋放相機**. Confirm the old track shows `ended` and the host capture count stays still. Restart and repeat to check generation isolation.
5. Deny browser permission in a separate live run. The `unsupported` and `no-device` dropdown options exercise controlled negative paths; label those results simulated. Record the page's camera status and error category before stopping, or copy the `相機狀態` event retained in the list. Record all outcomes in `evidence/camera-run.md`.

Only dimensions, counts, digests, brightness, errors, track states, and human observations belong in evidence. Do not save screenshots, raw frames, or video from the real camera.
