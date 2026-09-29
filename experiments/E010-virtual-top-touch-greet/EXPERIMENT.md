# E010 experiment record

## Question

Can the WASM simulator represent a three-zone top touch as native `TouchPanel` samples so a MOD receives one recognizer-derived tap and produces one visible greeting?

## Procedure

Create the browser surface and strict controller, apply the E010 patch only to a disposable pinned Stack-chan checkout, stage the patched host bridge and engine from that same checkout, run unit/WASM build, then serve the generated runtime with the E010 MOD. The preview source imports only the staged host engine; the vendor checkout remains read-only.

## Evidence and decision

The code-level host-runtime contract, TypeScript, and Vite build gates passed; see `evidence/top-touch-greet-run.md`. The owner then manually verified left, center, and right input in the browser, including busy-time rejection. Browser control was unavailable to this agent, so that result is recorded as owner-provided manual evidence. The full scratch WASM rebuild must be repeated with the current patch once Moddable/Emscripten are available. The experiment is accepted as a visible simulator POC and makes no hardware claim.
