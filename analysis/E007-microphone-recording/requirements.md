# E007 microphone recording — requirements

## Goal

Prove that the pinned Stack-chan browser simulator can return a fixed two-second microphone recording to a TypeScript MOD, which can directly replay the same buffer locally and let an independent listener recognize a short phrase.

## In-Scope

- A TypeScript MOD and browser harness isolated under `experiments/E007-microphone-recording/`.
- A single human control to record and replay one two-second segment.
- Buffer length, result trace, permission/failure observations and independent listening verdict.

## Out-Of-Scope / Non-Goal

Server, Python, TTS, transcription, a live raw PCM stream, saved voice files, camera, touch UI, real hardware, production sources, vendor changes, stable-library metadata, and release work.

## Acceptance

The returned buffer is nonempty, `playAudio` returns success, and an independent Tester hears and recognizes “一、二、三” in local replay. Permission denial, empty data or inaudible replay is recorded separately and is not PASS.

## Constraints

E007 starts after E006 reaches a recorded conclusion, regardless of E006 verdict. Its microphone path is judged independently. The MOD receives bytes, not browser-side MIME or filename metadata. No voice content is persisted as an artifact.
