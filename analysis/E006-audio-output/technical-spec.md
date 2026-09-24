# E006 audio output — technical spec

## Runtime boundary

The browser owns the controls, tab capture and `SimulatorEngine`. The MOD owns the two audio actions. The browser sends simulator A for tone and C for WAV, one request at a time; the MOD reports `started`, then `completed` or `failed`, through newline-delimited `COAMI6|` JSON trace with `run_seq` and `action_id`. Browser controls stay disabled until the MOD is ready and the previous result arrives. Restart invalidates earlier engine callbacks. No device/server contract is implied.

## Audio actions

- A pressed calls `robot.audio.tone(440, 250, 0.35)`.
- C pressed generates 0.5 seconds of 660 Hz mono PCM16 at 24 kHz, peak 0.35, with a 44-byte RIFF/WAVE header, then calls `robot.audio.playAudio(buffer)`; `false` is a failed result.
- Released button events do not start another run. The MOD serializes the actions and reports errors without claiming sound from promise completion.

## Build and evidence

The encoder lives in `mod/wav.ts`; `mod/wav.test.ts` imports that exact source. The web package pins `esbuild` and bundles `mod/mod.ts` plus its encoder import into one neutral ESM module before the vendor `buildModArchive` call. The browser harness follows E005's pinned WASM asset verification.

A user gesture starts `getDisplayMedia({ audio: true, video: true, preferCurrentTab: true })`. The operator selects the current tab and enables tab audio. Reject a returned stream without an audio track. `MediaRecorder` saves `evidence/output-capture.webm` after both actions; stop all capture tracks. An independent Tester checks the saved file's audio and listens to both sounds. Browser and audio-device details, MOD trace, recording procedure and verdict go in `EXPERIMENT.md`.
