# E021 evidence log

- Source TDD: first three tests failed because implementation modules were absent. Minimal implementations then passed 39 tests; real SDK IMU/Timer-fixture, protected source and pin/stale-MOD guards brought final count to 42 PASS. Strict TypeScript checks passed.
- Build attempt 1: failed on EM_ASM JS array literal commas; replaced the bridge expression with parenthesized Array.of. The original SDK recognizer/IMU/Event were not modified.
- Pinned WASM and MOD build then passed; actual executable/runtime/MOD hashes are in runtime-provenance.json. Isolated toolchains came from read-only E019 copies including compiler caches, not a fresh cold acquisition.
- Actual browser attempt 1: raw=0; source received NaN. Integer argument diagnosis allowed raw transport, but raw metadata had no sampleTicks and MOD rejected clock correlation. Failed attempts are preserved in runtime-automated.json and validation.txt.
- Root cause independently confirmed: pinned Moddable9.5.0 modules/base/time/wasm/modTime.c xs_time_ticks() has an empty body; time.js getter forwards the native result. Time.ticks is undefined on this WASM platform. Runtime/core verification is BLOCKED pending explicit scope choice, not algorithmically PASS.
- Human operations have NOT_EXECUTED; hardware is OUT_OF_SCOPE. Full hidden/pagehide/timeout/watchdog page behavior still needs verification; pure RunGuard/SampleInput tests alone do not establish browser lifecycle acceptance.
- No merge/release/production adoption. No E019 or E020 historical evidence changed.

## Resolution and final automated evidence — 2026-10-14

The owner explicitly approved the scratch Time.ticks compatibility extension. Runtime mutation of the preloaded Time object failed (invalid descriptor); manifest wildcard precedence initially ignored the alias. The final explicit exclusion/alias selects a wrapper extending a byte-checked pinned Time copy; ticks uses emscripten_get_now(). Original SDK IMU/recognizer/Event and original Moddable Time sources remain unchanged. Provenance binds the actual rebuilt WASM/MOD.

Final automated Chrome CDP run: 53/53 PASS, browserErrors=[], capturedAt 2026-10-14T03:11:45.718Z. All six events passed independent repetitions; boundary/negative samples, held/recovered posture, cooldown, failure and lifecycle cases passed. The prior pagehide test failed to capture a record because it observed the old navigation context; test-only fresh-context waiting and an ephemeral sessionStorage observation backup fixed it without changing the product handler. Previous attempts remain in runtime-automated.json.

Required human simulator acceptance remains NOT_EXECUTED. operator-session.json contains the procedure and pending matrix with no invented runs. Full verification and overall experiment success remain false; hardware is out of scope. Draft PR hands off these human checks.
