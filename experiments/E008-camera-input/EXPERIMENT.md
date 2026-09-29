# E008 — Camera input feasibility

## Question

After permission, can the pinned Stack-chan browser simulator deliver real webcam frames to a TypeScript MOD? Do denial and unavailable cases fall back cleanly without being mistaken for webcam success?

## Procedure

Build the exact pinned runtime and E008 MOD, run the localhost page, then follow `README.md` for owner-operated grant, cover/uncover, denial, unavailable, stop, and restart cases. Keep vendor camera preview closed so its own captures do not interleave with MOD evidence. Record metadata and observations in `evidence/camera-run.md`.

## Evidence

- Pinned source: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- The E008 TypeScript observer and ledger tests, strict typecheck, MOD archive build, and Vite build passed on 2026-09-24; exact commands and limits are in `evidence/camera-run.md`.
- The initial simulator build stopped at missing toolchain prerequisites. After installing the required tools under ignored `web/generated/toolchain/`, the exact simulator runtime and E008 MOD built successfully. Asset SHA-256 values and prerequisites are recorded in `evidence/camera-run.md`.
- An owner-operated run on the pinned runtime produced three uniquely paired webcam frames inside the TypeScript MOD. The owner confirmed camera open/closed/open scene changes, and stop ended the old track. The fixed checksum probe also matched across host and MOD. Details are in `evidence/camera-run.md`.
- Independent implementation review approved the initial bounded TS harness when the runtime was still blocked. The checksum correction and owner-operated live-run evidence are published in Ready PR #7 for human review.

## Decision

**Webcam: PASS for the owner-operated pinned simulator run. Synthetic fallback through MOD: PASS for controlled unsupported/no-device and real permission-denial scenarios. Stop/restart: PASS.** Three webcam frames reached the TypeScript MOD with unique host matches, and the owner confirmed camera scene changes. Simulated unavailable cases displayed the appropriate `unsupported` or `unavailable` status; real denial displayed `NotAllowedError` and received only a synthetic MOD frame. A running-camera restart ended the old track, produced a new matched webcam frame, and the final stop ended the new track.
