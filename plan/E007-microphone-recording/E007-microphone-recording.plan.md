# E007 microphone recording — topic plan

## Inputs

- Intent: `analysis/E007-microphone-recording/requirements.md`.
- Execution contract: `analysis/E007-microphone-recording/technical-spec.md`.
- Selected worktree: `/private/tmp/coami-audio-io-feasibility`; branch `feat/andrew/audio-io-feasibility`; primary-worktree=false.

## Goal / Outcome

An isolated TypeScript MOD and browser page demonstrate two-second browser microphone capture and direct local replay of the returned buffer, with explicit byte count, failure observations and an independent listening verdict.

## Scope

- **In-Scope**: E007 planning artifacts, MOD record/replay action, browser control, pinned simulator build harness, permission/failure observations and written evidence.
- **Out-Of-Scope**: E006 changes, Server, Python, TTS, transcription, camera, touch, real hardware, streaming PCM, saved voice media, production sources, vendor and stable-library surfaces.

## Locked Decisions

- Requirements guard intent; the E007 technical spec is the execution source of truth. This is a review-ready experimental topic, not a stable-library change.
- One A press calls `record(2000)`, checks nonempty `byteLength`, then sends the same buffer to `playAudio`. The browser serializes requests and never sends voice data to a Server.
- The WASM bridge strips MIME/filename metadata from the returned MOD buffer. The trace records bytes and result only. Browser preflight checks microphone/recorder and format support before A; unsupported, permission denial, empty data, playback failure and inaudible content are separate observed outcomes.
- E007 begins after E006 records a conclusion regardless of E006 verdict. An audible E007 PASS still requires independent recognition of “一、二、三” in the replay.

## Boundaries / Exclusions

Tracked writes stay in the exact E007 paths below and in the selected feature worktree. `dev`, E006, E005, vendor, Server, `device/src/`, `server/src/`, root `README.md`, `VERSION`, and release files remain unchanged. Any additional tracked path requires plan revision and re-review. No voice file is persisted.

## Status / Allowed Transitions

- **Current**: `pr-open` (PR #6 remains open); **Next actor**: Main Agent for PR feedback, then human reviewer; **Stage-local action**: publish the independently approved bounded correction, reply to review comments, and route to human review. The correction passed `pr-open` → `needs-rework` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved`.
- **Execution model**: independent plan review, creator implementation, independent evidence review, publish as a separate topic commit on the shared feature branch, then human review of one draft PR containing E006 and E007.
- **Allowed transitions**: `planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` for bounded correction or `publish-in-progress` → `pr-open` → `merged`; `pr-open` → `needs-rework` for PR feedback. `merged` is terminal.
- The owner confirms the proposed semantic commit message before the E007 commit. No release action follows merge.

## Artifact Paths

| Artifact | Exact path | Owner |
| --- | --- | --- |
| Requirements | `analysis/E007-microphone-recording/requirements.md` | Planning actor |
| Technical spec | `analysis/E007-microphone-recording/technical-spec.md` | Planning actor |
| Topic plan | `plan/E007-microphone-recording/E007-microphone-recording.plan.md` | Planning actor |
| Step tracker | `plan/E007-microphone-recording/E007-microphone-recording.step.md` | Step-Creator |
| Guide | `experiments/E007-microphone-recording/README.md` | Creator |
| Experiment record | `experiments/E007-microphone-recording/EXPERIMENT.md` | Creator/Tester |
| MOD entry | `experiments/E007-microphone-recording/mod/mod.ts` | Creator |
| MOD declarations | `experiments/E007-microphone-recording/mod/host.d.ts` | Creator |
| MOD config | `experiments/E007-microphone-recording/mod/tsconfig.json` | Creator |
| Web entry | `experiments/E007-microphone-recording/web/index.html` | Creator |
| Web package | `experiments/E007-microphone-recording/web/package.json` | Creator |
| Web lock | `experiments/E007-microphone-recording/web/package-lock.json` | Creator |
| Web ignore | `experiments/E007-microphone-recording/web/.gitignore` | Creator |
| Web config | `experiments/E007-microphone-recording/web/tsconfig.json` | Creator |
| Vite config | `experiments/E007-microphone-recording/web/vite.config.ts` | Creator |
| MOD builder | `experiments/E007-microphone-recording/web/scripts/build-mod.mjs` | Creator |
| Asset preparation | `experiments/E007-microphone-recording/web/scripts/prepare-assets.mjs` | Creator |
| Browser control | `experiments/E007-microphone-recording/web/src/main.ts` | Creator |
| Style | `experiments/E007-microphone-recording/web/src/style.css` | Creator |
| Written evidence / PR review-log equivalent | `experiments/E007-microphone-recording/evidence/recording-run.md` | Creator records; Tester verifies |
| MOD regression test | `experiments/E007-microphone-recording/web/src/mod.test.ts` | Creator |

**ReadOnly**: `AGENTS.md`, `plan/topic-plan-contract.md`, `plan/agent-handoff-workflow.md`, `experiments/E005-robot-action-catalog/web/package.json`, `experiments/E005-robot-action-catalog/web/scripts/build-mod.mjs`, `experiments/E005-robot-action-catalog/web/scripts/prepare-assets.mjs`, `experiments/E005-robot-action-catalog/web/src/main.ts`, `experiments/E005-robot-action-catalog/web/vite.config.ts`, `experiments/E006-audio-output/EXPERIMENT.md`, `vendor/stack-chan/firmware/host/app/capabilities.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/microphone.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/speaker.ts`, `vendor/stack-chan/firmware/host/modules/audio/wasm/audio-bridge.c`, `vendor/stack-chan/web/simulator/bridge.mjs`, `vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs`, `vendor/stack-chan/web/editor/mod-builder.mjs`. **Modify (PR rework only)**: `plan/E007-microphone-recording/E007-microphone-recording.plan.md`, `plan/E007-microphone-recording/E007-microphone-recording.step.md`, `experiments/E007-microphone-recording/EXPERIMENT.md`, `experiments/E007-microphone-recording/README.md`, `experiments/E007-microphone-recording/evidence/recording-run.md`, `experiments/E007-microphone-recording/mod/mod.ts`, `experiments/E007-microphone-recording/web/package.json`, `experiments/E007-microphone-recording/web/src/main.ts`. **Deleted**: none. No root `README.md`, `VERSION` or `.github/copilot-instructions.md` edit is intended.

## Implementation Steps

- [ ] 1. Create the isolated E007 MOD with a serialized A-triggered two-second record and direct replay path, reporting only byte count and result.
- [ ] 2. Create the browser harness with microphone/recorder format preflight, one request control, trace/result display and restart isolation; document the permission and headphones procedure.
- [ ] 3. Run MOD/web typechecks, XS archive build and web build; exercise success, permission denial, empty-buffer, playback-failure and repeated-click paths in the actual simulator or a bounded mock.
- [ ] 4. Document the operation, trace, byte count, provisional observations and limits for independent Tester handoff without persisting voice media.
- [ ] 5. Regression-test playback rejection and bounded error traces and record PR review triage in written evidence.

## Validation / Acceptance Checks

- MOD/web strict typechecks, XS archive build and Vite build pass. A release event and repeated click do not start another recording.
- A successful recording has `byteLength > 0`, sends the identical buffer to `playAudio`, and reports playback success. Failure states are visible and distinct.
- Independent Tester hears and recognizes “一、二、三” during replay before audible PASS is recorded. API completion alone is insufficient.
- A playback rejection is reported as `playback_failed` even if its message resembles a permission error; failure traces contain bounded result codes without raw vendor exception text. The focused regression test fails before the fix and passes afterward.
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

None for implementation. Microphone permission and the recorded format's replayability are experiment outcomes, not assumed successes.
