# E008 Camera input — requirements

## Goal

Determine whether real webcam frames reach a TypeScript MOD through the pinned Stack-chan browser simulator. Report a reproducible webcam PASS, FAIL, or blocked result separately from synthetic fallback.

## In-Scope

- An isolated E008 TypeScript MOD and localhost page with explicit authorization, capture, stop, and restart controls.
- Per-capture source, frame size, count, digest, browser error category, and camera track state without persistent image data.
- Owner-operated grant, cover/uncover, denial, and stop/restart runs, plus controlled unsupported/no-device cases when a real condition is unavailable.
- Question, procedure, environment, evidence, and decision under the E008 experiment.

## Out-Of-Scope / Non-Goal

Recognition, detection, photo storage, image upload, image quality assessment, Server/Python, production device code, vendor changes, and promotion of synthetic success to webcam PASS.

## Acceptance

Webcam PASS requires at least two valid MOD frames uniquely paired with host webcam captures in one run and owner confirmation that MOD-derived content changes as the lens is covered and uncovered. A browser preview or connected status alone never passes. Synthetic-only operation is fallback PASS / webcam unproven. Missing runtime or physical test prerequisites is blocked; a reproducible path failure after prerequisites are met is FAIL.

## Constraints

Use the current pinned vendor commit `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322` and verify the simulator binaries' provenance. Keep all writes in the E008 feature worktree and E008 paths. The dev worktree and existing topic plans remain read-only. The owner grants access and makes the scene observation.
