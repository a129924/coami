# E017 ts-implementation

## Field baseline
Every bounded step below includes all nine fields by inheritance plus its stated differences. Planned and Actual are separate. All paths are relative to experiments/E017-top-swipe-event/ unless explicitly absolute.

| Field | Planned |
|---|---|
| In-Scope | Independent raw-input simulator → SDK → MOD → UI, lifecycle, tests, evidence and bounded tools |
| Out-Of-Scope | E016 reuse/modification, hardware, Robot Action, Server, production, threshold tuning |
| ReadOnly | Original SDK, E010, E015 source toolchain, E016, governance/skills/tool config |
| Written | New E017 paths enumerated in plan; external /private/tmp/coami-e017/pr-lens/ |
| Deleted | None of the existing repository files |
| Modify | Only E017 files created by preceding steps and E017 ignored source/tool copies; list actual paths below |
| Goal | Traceable same-operation raw input / SDK / MOD / UI and safe recovery |
| Non-Goal | Tool/build success as human, hardware or adoption evidence |
| TestCase | TC-INPUT, TC-LIFECYCLE, TC-MOD, TC-HUMAN; separate TC-AUX |

## Implementation Steps
- [X] S1: implement raw input, FIFO, coherent XS tuple and post-dispatch zero barrier; pass TC-INPUT and relevant TC-LIFECYCLE.
- [X] S2: implement action-free MOD and visible original-event count; pass TC-MOD, integration and affected lifecycle checks.
- [X] S3: rebuild final pinned runtime/MOD, run automated pointer smoke, provide human procedure and truthful per-case status, finish bounded tool artifacts and evidence for Draft PR.

Human execution is an explicit later boundary; S3 requires reporting unexecuted human cases, never passing them or claiming complete experimental acceptance.

## S1 Planned
In-Scope/Out-Of-Scope/ReadOnly/Deleted/Non-Goal: baseline. Written: web package/lock/config/index/style, src/input.ts and input.test.ts, runtime patch, stage-host.mjs and prepare-runtime.mjs. Modify: E017 isolated scratch SDK/tool copies only. Goal: raw sample with atomic metadata/ticks and zero cleanup. TestCase: TC-INPUT, TC-LIFECYCLE, runtime ordering.

## S1 Actual
In-Scope: implemented input/FIFO/native/XS bridge. Out-Of-Scope: unchanged. ReadOnly: baseline sources preserved. Written: planned files. Deleted: none. Modify: only this step's newly created E017 code and isolated scratch. Goal: initial red (module absent), green recognizer/lifecycle tests recorded in evidence/validation.txt. TestCase: source tests passed; full final runtime verification recorded separately in S3.

## S2 Planned
In-Scope/Out-Of-Scope/ReadOnly/Deleted/Non-Goal: baseline. Written: mod/mod.ts, observer.ts and test, host.d.ts, tsconfig.json, web/src/main.ts, runtime.d.ts, runtime.test.ts, scripts/build-mod.mjs. Modify: S1 integration entry/types only. Goal: original SDK event, XS singleton snapshot, MOD-only count and readiness. TestCase: TC-MOD, native-boundary mock SDK integration, old-session guards.

## S2 Actual
In-Scope: action-free MOD and UI implemented. Out-Of-Scope/ReadOnly/Deleted/Non-Goal: baseline. Written: planned files. Modify: web tsconfig and scratch-only simulator declaration in runtime patch. Goal: MOD model red→green, actual patched TouchPanel synchronous ordering verified with mocked native boundary (not C/WASM evidence). TestCase: 20 source/bridge tests passed; strict build passed. Dynamic runtime evidence is S3.

## S3 Planned
In-Scope/Out-Of-Scope/ReadOnly/Deleted/Non-Goal: baseline. Written: runtime-smoke.mjs, README, evidence and diagram paths in plan; external PR Lens map. Modify: preceding E017 scripts/config/docs only. Goal: reproducible runtime/automatic smoke plus human handoff. TestCase: TC-HUMAN remains unexecuted without actual operator; TC-AUX statuses separately recorded.

## S3 Actual
In-Scope: final runtime/MOD build, automated browser verification, human procedure and requested local tools completed. Out-Of-Scope: baseline; E016/vendor/production untouched. ReadOnly: baseline sources and tool config. Written: README, validation, swipe-run, runtime-provenance, runtime-automated JSON/PNG, auxiliary evidence and diagram/receipts/screenshots; external PR Lens graph/render. Deleted: no existing repo files. Modify: preceding E017 integration code/scripts/docs only, plus own ignored scratch; isolated tool copies only. Goal: reproducible engineering evidence and truthful human-review handoff. Non-Goal: no claim that automated operation is human or that the whole hypothesis passed. TestCase: 20 source/SDK-mock tests PASS; strict build/runtime/MOD PASS; 17 automated pointer cases and 12 SDK Swipe callbacks PASS; failed MOD rebuild leaves no old archive PASS. TC-AUX complete (Graphify source fallback, Archify checked/visually inspected, PR Lens local validate/render). TC-HUMAN entirely unexecuted and remains a human boundary.

Initial S3 publication status (historical): human cases were unexecuted and the hypothesis could not yet be determined. The latest acceptance checkpoint below records subsequent operator evidence. Initial independent bounded code review approved after resolving two provenance findings. Git hook reported lefthook unavailable; explicit tests/build/review are the recorded evidence, not hook execution.

## Human handoff
Draft PR #17: https://github.com/a129924/coami/pull/17. Feature branch pushed; dev worktree clean. Stop at human review. TC-HUMAN operator cases now supported by the latest acceptance checkpoint; no merge or release.

## Bounded correction after human operation 7

In-Scope: existing high-rate continuous input and evidence. Out-Of-Scope / ReadOnly / Deleted / Non-Goal: baseline. Written: human-session-6.json, human-session-6-overflow.json, runtime-coalesced-automated.json. Modify: input.ts/input.test.ts/index.html, README/validation/swipe-run, topic plan/step. Goal: preserve SDK displacement recognition without monotonic input backlog. TestCase: red 20/22 → green 23/23, strict build, original operator trajectory automatic regression, CUA automated forward/backward MOD counts1/2; post-fix human pending. Original reviewer approval predates correction and does not cover this diff.

Human checkpoint Actual: Written evidence/human-post-fix-session-1.json; Modify README/swipe-run/plan/step; remaining fields inherit correction baseline. Owner confirmed both directions once; MOD count1/2, no input-error, UI ready/count2. Two independent human strokes PASS; per-direction3 and remaining human cases pending.

## 2026-10-13 acceptance checkpoint

In-Scope: existing simulator human cases and isolated automated initialization failure/recovery. Out-Of-Scope/ReadOnly/Deleted/Non-Goal: unchanged baseline. Written: evidence/human-acceptance-session-1.json, human-acceptance-restart-session-2.json, human-acceptance-page-leave-session-2.json, runtime-init-failure-automated.json, runtime-init-recovery-automated.json, acceptance-summary.json. Modify: README, swipe-run.md, validation.txt, this plan/step only. Goal: preserve operator evidence and truthful classification. TestCase: requested operator cases PASS; initialization failure/recovery actual browser automated PASS; per-case limits in swipe-run. No code/runtime change or test rerun. Experiment success within pinned simulator scope; remain at Draft PR human review with no merge/adoption decision. Normal restart verified; active-input restart not separately demonstrated. Original independent code review predates b408039 correction and is not asserted to cover it.

## PR review correction step

In-Scope / Out-Of-Scope / ReadOnly / Written / Modify / Deleted / Goal / Non-Goal / TestCase: latest plan review-correction block. Actual: five findings accepted and bounded code/docs implemented. Startup/bfcache/provenance regressions red4 then green4; guard fixture verifies clean accepted, dirty/moved/gitlink mismatch rejected; all28 tests, strict build and standalone MOD build PASS. Bootstrap commands source/syntax checked, cold full bootstrap unexecuted and explicitly documented. Topic commit/push and thread replies/resolution are the remaining authorized delivery actions at this checkpoint; not yet claimed complete.
