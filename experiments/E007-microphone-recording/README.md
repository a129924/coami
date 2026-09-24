# E007 — Browser simulator microphone recording

This TypeScript-only experiment checks a fixed two-second microphone recording and direct replay of the returned buffer. It has no Server, transcription, or voice-file export.

## Run

Use Node 24–26. Initialize the pinned `vendor/stack-chan` submodule, then run from `experiments/E007-microphone-recording/web/`:

```sh
npm ci
npm run prepare:poc
npm run typecheck
npm run build
npm run dev -- --port 5177
```

Open `http://127.0.0.1:5177/`. The page checks browser microphone and recorder format support before enabling the action. If `MediaRecorder.isTypeSupported` is unavailable, the page reports format support as unverified because the pinned bridge defaults to WebM.

## Recording procedure

1. Use headphones to avoid speaker feedback and allow microphone access when the browser asks.
2. Click **錄製並回放 A** once; within the two-second window say “一、二、三”. Wait for `recorded` with a byte count, followed by `completed` or `failed`.
3. Listen to the local replay. An independent Tester must recognize the phrase before recording audible PASS in `evidence/recording-run.md`.
4. Repeat with microphone permission denied, if possible, and document the result. Do not save or upload the voice data.

A nonempty buffer or `playAudio=true` alone does not prove recognizable speech. Browser-side format details are not available in the MOD trace; the trace contains only byte count and result.
