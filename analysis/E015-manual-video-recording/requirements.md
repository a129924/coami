# E015 — Requirements

## Intent and accepted defaults

Validate manually controlled silent webcam video in the Stack-chan browser simulator: Start, end the current segment and output playable moving pictures, or cancel and discard. “Pause” means end this segment; the next Start begins a new segment, not pause/resume. Use an unoccupied scene and a moving colored object/toy. The latest segment stays only in local memory; no upload, download, audio, transcription or production adoption. Starting a new segment clears the previous player and URL. Cancel leaves no segment output and permits restart.

## Success criteria

TC1: manually record about 3 seconds and replay the moving object to the end. TC2: record about 8 seconds with a different motion order and replay without old-segment content. TC3: record about 3 seconds then cancel with no output and released tracks. TC4: restart after cancel, record about 3 seconds, end and replay without cancelled content. For completed segments, playback end currentTime differs from T=(stopRequestedAt-recorderStartedAt) by at most 1 second; TC2 playback is at least 3 seconds longer than TC1. Each segment has at least two different digests from uniquely paired webcam/MOD frames. Normal end reaches a loaded, error-free player within 5 seconds. Stop/cancel releases webcam and canvas tracks and capture counts remain stationary after 250 ms. TC5 covers permission denial, starting cancellation, repeated operations and camera loss; TC6 provides pure lifecycle/correlation tests.

## Delivery and human boundary

Deliver isolated TypeScript experiment code, reproducible instructions, checks and an honest evidence record. TC1–TC4 and physical TC5 observations belong to the owner/Tester and can remain pending in a Draft PR. Program delivery, commit, push and Draft PR are authorized by the owner's latest explicit direction; no new per-message commit permission is required. Human review and merge remain a separate stop. Missing human evidence never counts as success and does not stop independent code work. No release or formal-program adoption is authorized.

## Budget

90 minutes for the recording experiment, including about 15 minutes of owner operation, at most one bounded correction/rerun for an identified recording problem. External diagram/map work does not consume or extend this experiment budget and is not a recording acceptance gate. Do not download a large SDK/toolchain to bypass missing prerequisites.
