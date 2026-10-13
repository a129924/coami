# E015 — Technical spec

## Authority and environment

This is the execution source of truth; requirements guard intent. The accepted design is browser host encoding of MOD-confirmed webcam source frames, not a MOD/device video encoder. Pin vendor/stack-chan to b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322 and use 96x96 RGB565LE. Read-only reuse E008 camera-observer.ts and capture-ledger.ts; do not edit them. E015 MOD retains one-shot camera capture and metadata, with independent COAMI15| traces. RobotCamera has no video API. No raw frame return protocol is added.

Documentation: https://w3c.github.io/mediacapture-fromelement/ and https://www.w3.org/TR/2026/WD-mediastream-recording-20260316/ specify canvas streams and MediaRecorder; actual support, time behavior and playback need experiment evidence. E008 source proves the available host capture and metadata path, not E015 recording success.

Current environment reported by dispatcher: Node 26.10, npm 11.19.1; feature-local vendor checkout and MOD compiler tools available. At initial code delivery MODDABLE, EMSDK and fontbm were missing. Following owner authorization on 2026-10-13, the pinned tools were installed feature-locally and npm run prepare:poc plus HTTP/provenance hash checks passed; owner-operated webcam recordings remain pending. Record the exact prerequisite failure; do not use stale/different runtime binaries to claim simulator success. On 2026-10-13 the owner explicitly authorized downloading the three pinned toolchains into ignored feature-local generated/toolchain-verified and rebuilding within the existing 90-minute limit; this supersedes the earlier no-large-SDK-download limit. Keep E008 source/toolchain provenance requirements in E015-owned build scripts and generated assets.

## ts-implementation

This label is the topic's TypeScript delivery contract, not an installed skill or new workflow profile. Use the existing base-plan tracker profile. Separate pure capture-pump and recording-session logic from browser-runtime adapters. No Server/Python or production interfaces change.

## Capture pump and frame ownership

Each segment creates a new runtime. MOD capture sequence is monotonic within that runtime, reset only by runtime recreation. Before every pushButton('c'), create pending with runtime/run token, expected MOD sequence and an empty buffer slot, and call ledger.begin(). Exactly one capture is outstanding. The wrapper establishes its slot before observedBridge.capture(); associate synchronous onCapture metadata and that call's returned RGB565 buffer with the same slot. Retain bytes only transiently in memory.

Validate same runtime/run, active pending, exactly expected MOD sequence, unique host, webcam source, matching dimensions/byteLength/digest/luma and complete buffer. Only then convert that buffer into a separate recording canvas, clear the slot and, after 100 ms, issue the next capture. Never record the direct webcam stream or open the vendor preview. First valid paired picture precedes recorder creation; subsequent pumping begins after the recorder start event. Wrong/duplicate sequence, ambiguous host, mismatch, synthetic source, frame-error or 5-second frame timeout aborts/discards the segment. Stop/cancel invalidates capture token, pending, ledger, slot and timer; late events cannot resolve any new pending or paint the canvas.

## Recording lifecycle and tokens

Idle -> Starting clears the previous player and revokes its URL, creates a fresh runtime/run, obtains the camera and waits for the first valid pair. Create canvas.captureStream(10) and a video-only MediaRecorder after that picture is painted. On the recorder start event set recorderStartedAt and enter Recording; no stop operation is enabled before this event. Capture pacing is one completion plus 100 ms, not a guaranteed fps.

Bind every recorder to an independent finalization token, separate from its capture run token. A normal end sets stopRequestedAt, stops pumping/rejects new frames, invalidates capture state and calls recorder.stop(). Preserve the final chunks. Also stop webcam/canvas tracks, dispose runtime and clear capture timers/buffer/ledger. Do not clear chunks before final dataavailable and stop.

During Finalizing all Start/End/Cancel controls are disabled. After final dataavailable and stop, construct Blob/object URL and load the player. Ready requires cleanup complete, all webcam/canvas tracks ended, loadeddata, readyState >= HAVE_CURRENT_DATA and no media error, all within 5 seconds measured from stopRequestedAt. A URL alone is not Ready. Timeout, cleanup failure or media error discards chunks/output, revokes URL and invalidates finalization token; late chunk/stop/loadeddata callbacks cannot publish. The capture token becoming invalid on normal stop must not discard final chunks owned by the still-valid finalization token.

Cancel in Starting/Recording first marks discard and invalidates both tokens, then stops recorder/tracks/runtime and clears chunks/timers/ledger/buffer/URL. Stop any stream returned by late permission resolution. Idle is available only after cleanup. Repeated operations are state-guarded no-ops. Failure and page exit follow discard cleanup. Any unexpected camera-track end aborts without publishing partial success.

Select the first supported MIME of video/webm;codecs=vp8, video/webm, video/mp4. Record actual recorder.mimeType; no supported candidate means an unavailable prerequisite, not an alternate path. No audio track is requested or recorded. Enforce the experiment's 60-second per-segment resource ceiling by cancelling with an explicit reason.

## TestCase and fixed verdict criteria

TC1–TC4 and physical TC5 are exactly the requirements cases. Success requires all applicable live criteria, visible motion and replay to end, two distinct valid paired digests per segment, time difference <=1 second, TC2 at least 3 seconds longer than TC1, ready within 5 seconds, zero cancelled output, track release and stationary capture counts after 250 ms, and clean restart isolation.

TC6 pure tests cover pending/ledger.begin before push; synchronous metadata+buffer ownership; expected sequence and unique host; wrong/duplicate/mismatched/synthetic frame rejection; stale run callbacks; first recorder start event timestamp; final chunk retention on normal end; normal track/timer/buffer/ledger cleanup; URL insufficient for readiness; loadeddata/media error/cleanup failure/5-second timeout; late chunk/stop/loadeddata after cancel/timeout; repeated operations; cancel/restart and late permission stream disposal. Simulated dependencies are labelled simulated and cannot prove webcam success. Run strict TS checks, pure tests, MOD build and web build where prerequisites are present; record unavailable checks separately from failures.

Experiment states: 未執行 before any live attempt; 成功 only with all fixed live evidence; 失敗 for reproducible violated criteria after necessary runtime/permission/valid webcam prerequisites are established; 無法判定 for attempted but insufficient runtime provenance, permissions, device/frames/API or human/time evidence. Frame absence or synthetic-only output does not itself prove the recording hypothesis false. Builds, unit tests, nonempty blobs or diagram validation never prove recording success. Record experiment state separately from task completion in an eight-section README. Never weaken criteria after observations.

## Evidence and delivery

Keep metadata only: versions, source/runtime hashes, command/check results, timestamps, MIME, dimensions, pair counts, digests, byte count, errors, track states and named human observations. No saved video, screenshots or raw webcam pixels. Human TC1–TC4 pending does not block honest Draft PR delivery of completed code and instructions. An unavailable pinned runtime must remain an explicit prerequisite block, never be promoted to a successful simulator run.

## Invoked tools, auxiliary only

Graphify: no usable existing graph found in the known worktrees; use targeted rg/source fallback. If an existing graph becomes available, bounded query budget 1500 plus source/revision verification; set GRAPHIFY_NO_AUTO_REFRESH=1 on every CLI invocation. No extract/install/refresh/provider operations.

Archify: external /private/tmp/coami-e015-review-artifacts/archify/lifecycle.json and lifecycle.html. Static lifecycle illustration only, <=12 primary nodes, showcase profile, authored Traditional Chinese, omit meta.locale and disclose fixed English Viewer UI/html lang fallback. Read lifecycle/common schema and matching example before candidate; no renderer internals first. Validate after edits and deliver final frozen candidate with all 9 checks, zero errors/warnings. Run visual-check without --repo-root for this external path, measure 1440x900,1600x1000,1920x1080,2048x1320, inspect smallest/largest light/dark captures; report truthful visual status, hashes, <=2 focused corrections. No automatic preview server. Tool failure is reported and may fall back to a plain lifecycle explanation, not block recording delivery.

PR Lens: only after actual code diff exists, use real base/head or a bounded worktree diff including new files with source hashes, never invented PR provenance. CLI 0.11.0 at /Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens only. External /private/tmp/coami-e015-review-artifacts/pr-lens/graph.json and rendered/. Include unchanged E008 observer/ledger and vendor neighbors with file refs. Validate/render locally; scratch --no-config, actual PR uses existing read-only config if any. No installs, uploads, config changes or publication by the tool. If unavailable/misleading, report and use direct diff review. Tool receipts are not correctness or experiment verdicts.

### Cleanup failure containment

A cleanup failure discards the result and enters a non-startable `blocked` UI state until page reload; it must never claim Idle or allow a new run while resource release is unproved. This conservatively enforces the existing `Idle only after cleanup` contract. Best-effort cleanup attempts every recorder/track/runtime/result action even if one fails.

### Bounded startup correction — 2026-10-13

Owner live attempt stopped before camera permission with installed timeout (5 秒), zero pairs/captures/tracks. Pinned firmware host/app/default-behavior/wasm/on-launch.ts deliberately shows an 8000ms splash; simulator-engine.mjs already permits firmware-ready for 30 seconds. E015 runtime-installed readiness now uses the same 30-second bound, while probe/camera-start/frame waits and recording finalization remain 5 seconds. Preserve early readiness signals and invalidate pending signals on close. This is an adapter startup correction, not relaxed recording acceptance.

### PR comment correction — pending setup cleanup

PR #15 review threads discussion_r4255232408 (P1) and discussion_r4255232413 (P2) expose violations of the existing Idle-only-after-cleanup contract. Cancelling while openRun/getUserMedia is unresolved invalidates publication immediately but enters a non-startable Cancelling state. Start/End/Cancel are disabled while the old open settles. A late Run is cleaned before returning Idle; a clean rejected open may return Idle, while any late cleanup failure becomes sticky Blocked until reload. Repeated cancel/dispose cannot bypass that pending-open barrier or reset Blocked. There is no safe timeout that would permit overlapping camera acquisition while permission remains unresolved.

Initialization failure followed by cleanup failure must cross the browser-runtime/session boundary as CleanupFailure, preserving both error messages even when no Run was returned. E015 also retains acquired MediaStream references independently of the vendor fallback path and attempts/verifies every acquired track's release, including late streams after cancellation. E008/vendor source and recording acceptance criteria are unchanged.

Pure regression evidence covers pending cancellation/restart, late resolve/reject, late cleanup failure, sticky blocking, setup cleanup classification and track release. Prior owner recordings are historical evidence from commit 1114059, not live validation of these subsequent fixes.
