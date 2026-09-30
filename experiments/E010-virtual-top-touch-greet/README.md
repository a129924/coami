# E010 virtual top-touch greet

This simulator-only POC maps a browser virtual top-touch zone to raw WASM touch-panel samples. It does not validate K151 hardware.

## Prerequisites

- Stack-chan submodule at `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Moddable 9.5.0, Emscripten 5.0.1, and `fontbm` on the build PATH. `MODDABLE` must point at the SDK and `FONTBM` at the executable.

## Run

```sh
cd experiments/E010-virtual-top-touch-greet/web
npm ci
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5180
```

`prepare:poc` clones a disposable scratch checkout, applies `runtime/wasm-top-touch.patch`, runs the pinned runtime's unit/WASM build, and copies the generated simulator artifacts plus the patched browser host modules to ignored E010 output. The preview imports the staged engine from `web/generated/pinned-stack-chan/`; it never imports `vendor/stack-chan` directly. `npm test` and `npm run typecheck` also restage those host modules from a fresh patched scratch checkout before they run. This keeps the preview engine and the WASM build procedure tied to the same E010 patch source.

Use left, center, or right in the virtual top-touch panel. A drag, cancellation, secondary pointer, cross-zone release, or gesture exceeding 300 ms / 15 px must not emit runtime input.

## Manual browser verification

After `npm run prepare:poc`, run `npm run dev -- --port 4173` and open `http://127.0.0.1:4173/`. Wait for Simulator to show `已啟動` and MOD to show `已安裝；等待機頂輕觸`. For each of 左, 中, 右, wait for the preceding run to complete, then perform one short click and verify all of the following in that same run:

1. 機頂輸入 shows the matching position and `accepted`.
2. 事件 contains `COAMI10` entries with a `touch-panel` event whose `accepted` is `true`, then a run phase of `started`, then `completed`.
3. The MOD screen shows `打招呼完成` and 動作 shows `greet #<run> · completed`.

While `started` is shown, press another zone. It must be ignored rather than queued. A drag, cancellation, secondary pointer, cross-zone release, or gesture longer than 300 ms / 15 CSS px must add no raw sample and must not start a run.

## Current evidence boundary

The host-runtime contract test, TypeScript checks, Vite build, and owner-performed browser verification are recorded. The supplied trace proves one completed greeting for left, center, and right, plus repeated busy-time input that did not start a second run. Browser automation was unavailable to this agent, so the evidence is recorded as manual verification rather than an automated capture. No K151 validation is claimed.
