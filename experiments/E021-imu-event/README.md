# E021 — IMU Event (synthetic-only)

## Question

Can controlled raw accelerometer samples travel through the pinned SDK IMU/recognizer, reach a MOD as the six existing IMU Events, and be shown without triggering actions?

## Procedure

Use only the feature worktree and `runtime/TOOLCHAIN.md`. All runtime/compiler staging stays in ignored `web/generated/`. From `web/`:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run stage:host
npm test
npm run typecheck
# Export the pinned isolated toolchain environment documented in TOOLCHAIN.md.
npm run prepare:poc
npm run build
npm run dev -- --port 5191
```

At http://127.0.0.1:5191 select a synthetic scenario, press 執行新一輪, inspect MOD event/counts and export evidence. 每個案例使用 fresh SimulatorEngine/WASM/IMU；restart不是對同一 recognizer stop/start。Leave/hidden/stop cancels the active run. No motor, speech, alert or server decision is issued.

In another shell, `npm run smoke` runs actual Chrome CDP automation against localhost. Set `E021_URL` for another localhost port; `E021_ONLY=fallenForward` limits scenario diagnosis. Chrome is a separate headless profile; automation is **not human evidence**. The script uses the same run/stop controls and offers raw vectors; it has no named-Event injection interface.

## Contract and evidence

Pinned Stack-chan: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`. Scratch changes are only `runtime/wasm-imu.patch`; original vendor IMU, recognizer and Event bytes are checked unchanged. Vectors use the CoreS3 BMI270 reference m/s² in the already-configured zxy recognizer frame. This does not verify real mounting orientation or Core2 units.

The SDK owns its poll clock, recognition thresholds and Event shape. The driver emits raw identity and `sampleTicks` before returning; MOD preserves original Event ticks. `sampleTicks` bounds the original pre-sample SDK clock from above. A cooldown negative case is valid only when its 10th effective sample upper bound is still below the last event +1500ms; browser delays that cross the bound are indeterminate, not PASS.

- `evidence/validation.txt`: initial failing tests, bounded fixes, final source checks and build/runtime notes.
- `evidence/runtime-provenance.json`: actual pins/tool hashes/patch/runtime/MOD hashes; served bytes are checked before startup.
- `evidence/runtime-automated.json`: actual browser attempts, preserving prior attempts; no unit result is substituted.
- `evidence/operator-session.json`: human status and owner-provided raw exports; all53 owner-operated synthetic simulator matrix cases PASS; independent final evidence review APPROVED.
- `evidence/acceptance-summary.json`, `evidence/imu-run.md`: per-layer conclusions and limitations.
- `evidence/auxiliary.md`, `diagram/imu-flow.html`: supplementary navigation/diagram status, independent from correctness.

## Current evidence and decision

Source tests: 42 PASS; strict typecheck PASS; WASM/MOD compilation PASS. Actual pinned browser runtime: **53/53 automated checks PASS**, with no browser exceptions in the final run. Each of the six events has repeated independent positive cases; negatives, cooldown, stop/restart, source failures, timeout, watchdog, hidden/pagehide and fresh recovery are recorded separately.

The owner explicitly authorized an E021 scratch-only clock compatibility extension after the pinned Moddable WASM `xs_time_ticks()` stub was discovered. The staged `time` alias extends a byte-checked copy of pinned Time and implements only `ticks` using real monotonic `emscripten_get_now()`. SDK IMU, recognizer, thresholds and Event bytes remain unchanged. Earlier failed runtime/build/instrumentation attempts are retained.

Required human simulator validation: **53/53 cases PASS**, independent human-evidence review **APPROVED**. The procedure, final matrix and32 original owner exports are preserved in `operator-session.json`; inconclusive attempts remain historical evidence. `fullVerification=true`, `verificationComplete=true` and `overallSuccess=true` apply only to this controlled synthetic experiment. Six event kinds each have two independent human positive runs; required negatives, boundaries, cooldown, faults, stop/restart and page lifecycle/recovery cases passed.

Fault/lifecycle setup and pagehide observation used owner DevTools-assisted operations. Timeout exports contain terminal reasons rather than exact firing timestamps; inspected source policy and controlled setup support those classifications. Hardware: **OUT_OF_SCOPE / not verified**. Ideal configured-frame vectors and custom scratch provider/clock do not prove physical direction, real sensitivity, false-positive rate or upstream native support. Preserve E019/PR19 and E020/PR20 evidence unchanged. Draft PR remains for owner review; no production adoption, merge or release is implied.
