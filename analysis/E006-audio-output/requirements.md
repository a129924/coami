# E006 audio output — requirements

## Goal

Prove that a TypeScript MOD can make the pinned Stack-chan browser simulator produce an audible tone and an audible, deterministic WAV buffer. Keep replayable audio evidence and an independent listening verdict.

## In-Scope

- One human control for a fixed tone and one for a fixed WAV buffer.
- A TypeScript-only MOD and browser harness isolated under `experiments/E006-audio-output/`.
- MOD traces for each requested action, browser tab audio capture, a replayable WebM, and a recorded PASS/FAIL decision.

## Out-Of-Scope / Non-Goal

Server, Python, TTS, microphone, camera, touch UI, real hardware, production sources, vendor changes, stable-library metadata, and release work.

## Acceptance

An independent Tester can replay the WebM and distinguish both sounds. An API completion trace alone is insufficient. Failed playback, absent capture audio, or a silent file cannot be reported as audible PASS.

## Constraints

Use the E005-pinned simulator assets and the vendor `robot.audio` API. Run in a feature worktree; no file in the `dev` worktree is modified.
