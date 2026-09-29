# E010 run evidence

## Completed code and preview evidence

- Red evidence: the preview contract initially failed because its direct vendor import could not provide the patched top-touch runtime entry.
- `npm test`: PASS, 15 tests. It clones the pinned source, applies the E010 patch, stages the exact patched bridge and engine used by the preview, then proves `TopTouchPanel`, `pushTopTouch`, press/release samples, fresh-checkout staging, cancellation recovery, coordinate-derived release zones, busy-time sample rejection, and renderer-failure terminal reporting.
- `npm run typecheck`: PASS for the web and MOD projects after staging the same patched host source.
- `npm run build`: PASS; Vite bundles the staged preview engine (17 modules).
- The local Vite preview started on `127.0.0.1:4173`; `/`, `/src/main.ts`, `/simulator/mc.js`, and `/simulator/mc.wasm` returned successfully.
- `git apply --check runtime/wasm-top-touch.patch`: PASS against pinned Stack-chan source.

## Current runtime rebuild boundary

The current patch applies and its browser host source is staged and tested. A full current-patch `npm run test:unit` plus `npm run build:wasm` could not be rerun in this session because no local `emcc`, `mcconfig`, `MODDABLE`, or Emscripten environment was available; the prior E008 toolchain path no longer exists. The historical hashes in `wasm-runtime-provenance.md` are therefore not evidence for the current patch hash. Re-run `npm run prepare:poc` with the documented toolchain before relying on regenerated `mc.js` / `mc.wasm` provenance.

## Owner-provided manual browser evidence

The owner manually ran the local preview and supplied the event trace. The visual event list prepends entries, so the pasted sequence is newest-first. Read chronologically, it establishes:

- Left: run 2 accepted `tap_position: -100`, then `started`, `screen: completed`, and `completed`.
- Center: run 3 accepted `tap_position: 0`, then `started`, `screen: completed`, and `completed`.
- Right: run 4 accepted `tap_position: 100`, then `started`, `screen: completed`, and `completed`.
- Busy guard: while run 1 was active, repeated left surface taps generated input events with `accepted: false`; no additional run began until run 1 completed. The later left/center/right runs were distinct runs 2/3/4.

The owner confirmed this as valid manual verification. Browser automation was unavailable to the agent, so there is no automated recording or `.webm`; this evidence is deliberately classified as owner-provided manual verification, not fabricated browser output.

## Decision

The feature is `review-ready` for the simulator POC. Before a future reproducibility claim, restore the Moddable/Emscripten toolchain and regenerate current-patch WASM provenance. K151 remains out of scope.

## Review remediation

The PR review identified five valid failure modes. The E010 code now creates the ignored generated parent before staging; clears a cancelled pointer immediately; derives release zones from `elementFromPoint` rather than the captured control; gates and clears host samples while the E010 greet trace is `started`; and turns a terminal screen-render failure into an emitted `failed` terminal. These paths are covered by the 15-test result above.
