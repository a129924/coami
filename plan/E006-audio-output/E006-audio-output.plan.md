# E006 audio output — topic plan

## Inputs

- Intent: `analysis/E006-audio-output/requirements.md`.
- Execution contract: `analysis/E006-audio-output/technical-spec.md`.
- Selected worktree: `/private/tmp/coami-audio-io-feasibility`; branch `feat/andrew/audio-io-feasibility`; primary-worktree=false.

## Goal / Outcome

An isolated TypeScript MOD and browser page demonstrate a fixed tone and generated WAV in the pinned Stack-chan simulator, with a replayable recording of both sounds and an independent listening verdict.

## Scope

- **In-Scope**: E006 planning artifacts, MOD audio actions, WAV encoder and its test, browser controls and tab-audio capture, build scripts, procedure and evidence.
- **Out-Of-Scope**: E007 implementation, Server, Python, TTS, microphone, camera, touch, real hardware, production sources, vendor, other experiments and stable-library surfaces.

## Locked Decisions

- Requirements guard intent; the E006 technical spec is the execution source of truth. This is a review-ready experimental topic, not a stable-library change.
- A pressed triggers `tone(440, 250, 0.35)`; C pressed plays a MOD-generated 24 kHz mono PCM16 660 Hz half-second WAV. Browser controls are serialized and use only simulator button events and trace.
- Test the actual `mod/wav.ts` source. Bundle its import into one ESM MOD before `buildModArchive`; retain E005's pinned simulator assets and SHA-256 checks.
- A trace or successful audio API result does not prove audible output. Only a WebM with an audio track and independent listening can establish audio PASS.
- E006 reaches its own PASS/FAIL/blocked conclusion before E007 begins; E006 failure does not block E007 capture-path work.

## Boundaries / Exclusions

Tracked writes stay in the exact E006 paths below and in the selected feature worktree. `dev`, E005, vendor, Server, `device/src/`, `server/src/`, root `README.md`, `VERSION`, and release files remain unchanged. Any additional tracked path requires plan revision and re-review. No E006 trace is a device/server wire contract.

## Status / Allowed Transitions

- **Current**: `pr-open` (PR #6 remains open); **Next actor**: Main Agent for PR feedback, then human reviewer; **Stage-local action**: publish the independently approved bounded correction, reply to review comments, and route to human review. The correction passed `pr-open` → `needs-rework` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved`.
- **Execution model**: independent plan review, creator implementation, independent evidence review, publish as a topic commit on the shared feature branch, then human review of a draft PR containing E006 and E007.
- **Allowed transitions**: `planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` for bounded correction or `publish-in-progress` → `pr-open` → `merged`; `pr-open` → `needs-rework` for PR feedback. `merged` is terminal.
- The owner confirms the proposed semantic commit message before the E006 commit. No release action follows merge.

## Artifact Paths

| Artifact | Exact path | Owner |
| --- | --- | --- |
| Requirements | `analysis/E006-audio-output/requirements.md` | Planning actor |
| Technical spec | `analysis/E006-audio-output/technical-spec.md` | Planning actor |
| Topic plan | `plan/E006-audio-output/E006-audio-output.plan.md` | Planning actor |
| Step tracker | `plan/E006-audio-output/E006-audio-output.step.md` | Step-Creator |
| Guide | `experiments/E006-audio-output/README.md` | Creator |
| Experiment record / PR review-log equivalent | `experiments/E006-audio-output/EXPERIMENT.md` | Creator/Tester |
| MOD entry | `experiments/E006-audio-output/mod/mod.ts` | Creator |
| WAV encoder | `experiments/E006-audio-output/mod/wav.ts` | Creator |
| WAV test | `experiments/E006-audio-output/mod/wav.test.ts` | Creator |
| MOD declarations | `experiments/E006-audio-output/mod/host.d.ts` | Creator |
| MOD config | `experiments/E006-audio-output/mod/tsconfig.json` | Creator |
| Web entry | `experiments/E006-audio-output/web/index.html` | Creator |
| Web package | `experiments/E006-audio-output/web/package.json` | Creator |
| Web lock | `experiments/E006-audio-output/web/package-lock.json` | Creator |
| Web ignore | `experiments/E006-audio-output/web/.gitignore` | Creator |
| Web config | `experiments/E006-audio-output/web/tsconfig.json` | Creator |
| Vite config | `experiments/E006-audio-output/web/vite.config.ts` | Creator |
| MOD builder | `experiments/E006-audio-output/web/scripts/build-mod.mjs` | Creator |
| Asset preparation | `experiments/E006-audio-output/web/scripts/prepare-assets.mjs` | Creator |
| Browser controls | `experiments/E006-audio-output/web/src/main.ts` | Creator |
| Tab capture | `experiments/E006-audio-output/web/src/tab-capture.ts` | Creator |
| Tab capture regression test | `experiments/E006-audio-output/web/src/tab-capture.test.ts` | Creator |
| Style | `experiments/E006-audio-output/web/src/style.css` | Creator |
| Audible evidence | `experiments/E006-audio-output/evidence/output-capture.webm` | Creator captures; Tester verifies |

**ReadOnly**: `AGENTS.md`, `plan/topic-plan-contract.md`, `plan/agent-handoff-workflow.md`, `experiments/E005-robot-action-catalog/mod/mod.ts`, `experiments/E005-robot-action-catalog/web/package.json`, `experiments/E005-robot-action-catalog/web/scripts/build-mod.mjs`, `experiments/E005-robot-action-catalog/web/scripts/prepare-assets.mjs`, `experiments/E005-robot-action-catalog/web/src/main.ts`, `experiments/E005-robot-action-catalog/web/vite.config.ts`, `vendor/stack-chan/firmware/host/app/capabilities.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/stackchan-voice-wav.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/speaker.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/audio-bridge.c`, `vendor/stack-chan/web/simulator/bridge.mjs`, `vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs`, `vendor/stack-chan/web/editor/mod-builder.mjs`. **Modify (PR rework only)**: `plan/E006-audio-output/E006-audio-output.plan.md`, `plan/E006-audio-output/E006-audio-output.step.md`, `experiments/E006-audio-output/EXPERIMENT.md`, `experiments/E006-audio-output/README.md`, `experiments/E006-audio-output/web/package.json`, `experiments/E006-audio-output/web/src/main.ts`, `experiments/E006-audio-output/web/src/tab-capture.ts`. **Deleted**: none. No root `README.md`, `VERSION` or `.github/copilot-instructions.md` edit is intended.

## Implementation Steps

- [ ] 1. Create the isolated E006 MOD, deterministic WAV encoder and red-then-green test; build the XS archive using one bundled MOD source.
- [ ] 2. Create the browser harness with two serialized controls, trace/result display, restart isolation and current-tab audio capture that rejects a missing audio track.
- [ ] 3. Run typechecks, WAV test, MOD build and web build; perform the actual simulator run and save the replayable audio WebM.
- [ ] 4. Document the operation, trace, captured evidence, provisional observations and limitations in the E006 experiment record for independent Tester handoff.
- [ ] 5. Regression-test asynchronous recorder failure cleanup and record PR review triage in the experiment record.

## Validation / Acceptance Checks

- `node --test ../mod/wav.test.ts` from E006 `web/` checks RIFF format, sample format, length and non-silence. MOD/web strict typechecks, XS archive build and Vite build pass.
- Browser A and C produce distinct start and terminal traces; unsupported output or `playAudio=false` is a failure. No duplicate button release triggers an action.
- The captured WebM contains an audio track and is replayable; independent Tester hears both distinguishable sounds. Missing audio or an unsupported capture environment is not marked PASS.
- A recorder error before manual stop ends all capture tracks, makes failure visible in the page, and cannot produce a success download; the focused regression test fails before the fix and passes afterward.
- All tracked writes match Artifact Paths; no ReadOnly path, production code or stable-library file changed.

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Human review precedes merge. No VERSION bump, tag, release note or repository release action; `merged` is terminal. Preserve the remote topic branch unless an explicit later retention decision permits deletion.

## Open Questions / Unresolved Items

None for implementation. Browser tab audio availability is an experiment outcome, not an assumed capability.
