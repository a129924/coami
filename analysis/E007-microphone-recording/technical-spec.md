# E007 microphone recording — technical spec

## Runtime boundary

The browser installs a TypeScript MOD into the pinned `SimulatorEngine`, exposes one record/replay button, and pushes simulator A on a user gesture. The MOD ignores button release and concurrent presses. A `COAMI7|` JSON trace with `run_seq` reports `started`, followed by `completed` or `failed`; the latter carries a bounded error code. The browser serializes requests, ignores stale engine callbacks after restart, and displays byte count and terminal result. There is no server request.

## Audio path

Before sending A, the browser reports whether `navigator.mediaDevices.getUserMedia` and `MediaRecorder` exist and whether the recorder supports one of the pinned bridge's `audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, or `audio/wav` formats. If `isTypeSupported` is absent, the bridge's first-format default is reported as unverified support rather than as a guaranteed format. An unsupported preflight disables the action and is recorded as `unsupported` in the browser. The MOD calls `robot.audio.record(2000)`, checks `buffer.byteLength > 0`, then passes that same buffer directly to `robot.audio.playAudio(buffer)`. `false` means playback failure. The WASM bridge returns only audio bytes to the MOD; it must not claim MIME, filename or raw PCM. After a supported preflight, a zero-length return is `empty_buffer`; a permission rejection is `permission_denied` only when the browser exception identifies it, otherwise it is a recording failure. Playback failure and duplicate clicks remain distinct observed outcomes.

## Procedure and verdict

The operator grants browser microphone access, uses headphones to avoid feedback, clicks once and says “一、二、三” within the two-second window. `EXPERIMENT.md` and `evidence/recording-run.md` record environment, operation, trace, byte count, result and independent Tester verdict, without saving the spoken recording. PASS requires nonempty bytes, playback success and a recognizable audible replay; API success alone does not establish audible content.
