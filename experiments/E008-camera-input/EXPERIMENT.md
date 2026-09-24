# E008 — Camera input feasibility

## Question

After permission, can the pinned Stack-chan browser simulator deliver real webcam frames to a TypeScript MOD? Do denial and unavailable cases fall back cleanly without being mistaken for webcam success?

## Procedure

Build the exact pinned runtime and E008 MOD, run the localhost page, then follow `README.md` for owner-operated grant, cover/uncover, denial, unavailable, stop, and restart cases. Keep vendor camera preview closed so its own captures do not interleave with MOD evidence. Record metadata and observations in `evidence/camera-run.md`.

## Evidence

- Pinned source: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- The E008 TypeScript observer and ledger tests, strict typecheck, MOD archive build, and Vite build passed on 2026-09-24; exact commands and limits are in `evidence/camera-run.md`.
- The initial simulator build stopped at missing toolchain prerequisites. After installing the required tools under ignored `web/generated/toolchain/`, the exact simulator runtime and E008 MOD built successfully. Asset SHA-256 values and prerequisites are recorded in `evidence/camera-run.md`.
- No real webcam-to-MOD run or end-to-end synthetic MOD run has occurred. A served runtime and passing unit tests do not establish camera feasibility.
- Independent implementation review approved the bounded TS experiment and its blocked verdict after source-provenance and stop-status fixes.

## Decision

**Webcam: blocked pending owner-operated camera evidence. Fallback through MOD: unverified.** The pinned WASM build prerequisite is now satisfied locally. The remaining webcam PASS gate requires the operator to grant permission and confirm at least two MOD-paired webcam frames change when the lens is covered and uncovered. Unit-level synthetic behavior is not an end-to-end fallback PASS.
