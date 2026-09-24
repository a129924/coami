# E007 — Can the simulator record and replay a two-second phrase?

## Question and hypothesis

Will `robot.audio.record(2000)` return a nonempty segment to a TypeScript MOD and let `playAudio` replay the same buffer so an independent listener recognizes “一、二、三”?

## Environment

- Date: 2026-09-24.
- Base Coami commit: `8f8e2cc` on the isolated `feat/andrew/audio-io-feasibility` worktree.
- Stack-chan submodule: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Simulator WASM: pinned Pages commit `b0bcb60e17336e6bfb4af7466eb21a6ebbde46cd`; both asset SHA-256 checks passed.
- Node 26.4.0, npm 11.17.0. The owner reported Chrome for the manual run and personal headphones for playback; the microphone model was not reported.

## Procedure

1. Run `npm ci`, `npm run prepare:poc`, `npm run typecheck`, and `npm run build` from `web/`.
2. Run the page, grant microphone permission, speak “一、二、三” during the two-second capture and listen to local replay.
3. Record trace, byte length, permission/failure cases and independent Tester verdict in `evidence/recording-run.md`. Do not persist voice media.

## Evidence so far

- `npm run typecheck`, `npm run mod`, and `npm run build` passed; the XS archive was 2,060 bytes. Vite reported only its bundle-size warning.
- Bounded Node mocks invoked the actual MOD `onContextCreated`. An A press requested `record(2000)` once; a simultaneous second press and A release did not start another recording. The same 12-byte buffer object reached `playAudio`, and the terminal trace reported 12 bytes. A permission rejection produced `permission_denied`; separate empty-buffer and `playAudio=false` mocks produced `empty_buffer` and `playback_failed`.
- The browser-control connection reported no available browser. On 2026-09-24, the owner manually tested the page, supplied `COAMI7|{"kind":"run","run_seq":3,"phase":"completed","byte_length":28310}`, and explicitly reported that the replayed “一、二、三” was clear.

## Decision and limits

**Microphone feasibility: PASS for the scoped two-second capture-and-replay question.** The owner-provided simulator trace reports a nonempty 28,310-byte buffer and terminal `completed`; the owner independently recognized the phrase in the replay. This result does not establish streaming PCM, speech recognition or real device microphone quality.

## Independent review handoff

The first independent review returned `needs-rework` because no actual browser capture or independent listening verdict existed at review time. The MOD, same-buffer path, pinned assets and topic boundaries otherwise matched the reviewed spec. After the owner supplied the completed trace, listening verdict and available environment details, the independent Reviewer re-reviewed E007 and returned `approved` with no blocking issues.
