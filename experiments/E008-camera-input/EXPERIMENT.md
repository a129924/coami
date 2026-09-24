# E008 — Camera input feasibility

## Question

After permission, can the pinned Stack-chan browser simulator deliver real webcam frames to a TypeScript MOD? Do denial and unavailable cases fall back cleanly without being mistaken for webcam success?

## Procedure

Build the exact pinned runtime and E008 MOD, run the localhost page, then follow `README.md` for owner-operated grant, cover/uncover, denial, unavailable, stop, and restart cases. Keep vendor camera preview closed so its own captures do not interleave with MOD evidence. Record metadata and observations in `evidence/camera-run.md`.

## Evidence

- Pinned source: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- The E008 TypeScript observer and ledger tests, strict typecheck, MOD archive build, and Vite build passed on 2026-09-24; exact commands and limits are in `evidence/camera-run.md`.
- The exact simulator runtime build stopped at the missing Moddable toolchain prerequisite. No real webcam-to-MOD run or end-to-end synthetic MOD run has occurred.
- Independent implementation review approved the bounded TS experiment and its blocked verdict after source-provenance and stop-status fixes.

## Decision

**Webcam: blocked. Fallback through MOD: unverified.** The local environment lacks the pinned WASM build prerequisites. The isolated TS implementation is ready for a run once those tools and an owner-operated physical camera test are available. Unit-level synthetic behavior is not an end-to-end fallback PASS.
