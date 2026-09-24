# E006 — Can the simulator audibly play a tone and a WAV buffer?

## Question and hypothesis

Can a TypeScript MOD call `tone` and `playAudio` in the pinned browser simulator and produce two distinguishable audible outputs? Expected: A makes a short 440 Hz tone; C plays a longer 660 Hz generated WAV.

## Environment

- Date: 2026-09-24.
- Base Coami commit: `8f8e2cc` on the isolated `feat/andrew/audio-io-feasibility` worktree.
- Stack-chan submodule: `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Simulator WASM: pinned Pages commit `b0bcb60e17336e6bfb4af7466eb21a6ebbde46cd`; `prepare-assets.mjs` verified the declared SHA-256 for `mc.js` and `mc.wasm`.
- Node 26.4.0, npm 11.17.0. The accepted WebM identifies Chrome as its encoder; Mac output device was not recorded.

## Procedure

1. Run `npm ci`, `npm run prepare:poc`, `npm test`, and `npm run build` from `web/`.
2. Open the page, start current-tab capture with tab audio, run A and C separately, then download `output-capture.webm` as described in `README.md`.
3. Check the file has an audio track; independently replay and listen. Record the Tester name/date, terminal traces and audible verdict here.

## Evidence so far

- `node --test mod/wav.test.ts` first failed because `mod/wav.ts` was absent. After the encoder was added, the test passed, checking RIFF/WAVE, PCM16 mono at 24 kHz, 24,000 data bytes and a nonzero sample.
- `npm run typecheck`, `npm run mod`, and `npm run build` passed. The XS archive was 3,149 bytes. Vite reported only its bundle-size warning.
- A bounded Node mock called the actual `onContextCreated`: an A press invoked tone once, C during the pending tone was ignored, then C played a 24,044-byte WAV after tone completion. The traces ended `tone/completed` and `wav/completed`. A second mock made `playAudio` return `false` and observed a `failed` trace with `playback_failed`. These checks cover MOD dispatch, not actual simulator sound.
- `npm run dev -- --port 5176` served the page, but the browser-control connection reported no available browser, so the operator performed the browser run manually.
- On 2026-09-24, the repository owner, acting as the independent human Tester (a different person from the implementing agent), explicitly reported hearing both the A and C sounds. No terminal trace was supplied.
- The owner supplied `/Users/andrew/Downloads/output-capture.webm` and reported hearing both sounds on replay. Inspection showed that this 18.329-second recording displays a YouTube tab, not the E006 page. Its Opus audio track is therefore not attributable to the experiment, regardless of audible content. The copy was removed from this topic's `evidence/` directory; the original Downloads file was left untouched. At that point, a new capture of the E006 tab was required.
- The owner then supplied `/Users/andrew/Downloads/output-capture (1).webm`; a byte-identical copy is saved as `evidence/output-capture.webm` (SHA-256 `157d6b3fdef509c7b9f4fb3d1a8b2d92edfaf8b064f841dfda379409193c7076`). This 5.272-second WebM visibly records the E006 simulator page, including `tone` and `wav` `started`/`completed` traces. `ffprobe` reports VP8 video and a 48 kHz mono Opus audio track. `ffmpeg` decoded 253,440 samples with mean volume −12.1 dB; it warned about one Opus packet header. The independent human Tester (repository owner) explicitly confirmed replaying this *new* file and hearing both A and C sounds on 2026-09-24.

## PR #6 review triage, 2026-09-24

- Accepted the asynchronous `MediaRecorder.onerror` finding. A failing `web/src/tab-capture.test.ts` reproduced tracks left active before Stop; the handler now attaches when recording starts, stops all capture tracks, reports failure to the page and rejects a later download. `npm test`, `npm run typecheck` and `npm run build` pass after the fix.
- Accepted the Tester-attribution finding. The independent listener was the repository owner, not the implementing agent; the dated replay verdict above is human evidence, separate from the MOD traces and automated checks. No additional person's testimony is claimed.
- Accepted the stale workflow-status finding. The topic returned from `pr-open` through `needs-rework` for this bounded PR correction; its plan and step tracker now record the review route and the still-open PR. The independent re-review approved the correction with no blockers.

## Decision and limits

**Audible feasibility: PASS for the scoped simulator output question.** The replacement capture shows the correct page, successful tone/WAV traces, and a decodable, non-silent audio track; the owner heard both distinct sounds when replaying that file. The isolated Opus packet warning did not prevent replay. Do not promote the behavior to production without a separate decision. The next E007 microphone capture-path experiment can proceed independently of this verdict.

## Independent review handoff

The first independent review returned `needs-rework` because the required browser WebM and listening verdict were absent at review time. A separate review finding showed that a `MediaRecorder` constructor error could leave tab-capture tracks active; `web/src/tab-capture.ts` now stops all tracks on that error, and the Reviewer confirmed this correction. The first supplied WebM was rejected because it captured the wrong tab. After the valid replacement capture and explicit replay verdict, the independent Reviewer rechecked the file hash, audio and page frames and returned `approved` with no blocking issues.
