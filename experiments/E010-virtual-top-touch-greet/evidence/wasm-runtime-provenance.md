# E010 prior WASM runtime provenance

This record is retained for the prior WASM build only. The E010 patch was subsequently extended to stage the browser host runtime and expose its contract test; a current-patch WASM rebuild is pending because the local Moddable/Emscripten toolchain is unavailable. Do not treat the hash below as provenance for the current patch.

- Base SHA: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`
- Patch SHA-256: `e0bd22c44dd372d1db91545902a9b718d61dbf7da4c22b80dd313d216ab15668`
- Moddable: `9.5.0`
- Emscripten: `emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 5.0.1 (8c5f43157a3f069ade75876e23061330521eabde)`
- Commands: `npm ci`, `npm run test:unit`, `npm run build:wasm` in a disposable scratch checkout.
- mc.js SHA-256: `03e78d98b1cec31e2a9f53baf14b391b1e29d6747457ef322c6b34ac7d4df637`
- mc.wasm SHA-256: `9cb0058e64be67654aa929791d3cf47f7efaec0e94595bd6abbcb2c279044e7e`

The generated files are simulator-only E010 artifacts; no physical K151 claim is made.
