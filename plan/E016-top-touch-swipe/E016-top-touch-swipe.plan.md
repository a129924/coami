# E016 — Top touch swipe recognition and visible feedback

## Goal / Outcome

Independent simulator experiment: pointer→raw channels→WASM driver→SDK recognizer→MOD→visible feedback. Owner approved the conversation plan and execution on 2026-10-13. No physical-device or production claim.

## Scope

Single Mission, simulator-only forwardSwipe/backwardSwipe, counts/operation correlation, cancellation, fault recovery, tests and reproducible evidence. step_profile: base-plan; ts-implementation is payload, not a new profile.

Every bounded step MUST name all nine fields in planned and actual: In-Scope, Out-Of-Scope, ReadOnly, Written, Deleted, Modify, Goal, Non-Goal, TestCase. References to baseline allowed, names cannot be omitted. none/N/A explicit; actual starts not-run and becomes actual paths/results, never a planned claim.

Baseline: In-Scope=E016 input/runtime/MOD/evidence/aux tools; Out-Of-Scope=production/other gestures/actions/hardware/install/publish tools; ReadOnly=vendor/E010/E015/toolchain/governance/config/skills/existing graph; Written=declared new files/external artifacts; Deleted=none; Modify=new E016 files and scratch only; Goal=traceable direction/count; Non-Goal=product actions/production adoption; TestCase=TC01–08 and separate TC-AUX.

## Locked Decisions

Execution-facing source: analysis/E016-top-touch-swipe/technical-spec.md; business guardrail: requirements.md. SDK pinned b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322; >60/<−60, one swipe/contact, zero release. Mapping, capture timestamps, FIFO4096, atomic native tuple/ack, MOD-only feedback and session reset exactly as technical spec. Feasibility budget90 minutes, once full build and one bounded retry. No stable-library surfaces.

## Boundaries / Exclusions

No IMU/TTS/gaze/video feature/K151/Robot Action/server/WebSocket/formal event contracts/production upgrade. No direct swipe event injection or threshold change. Original vendor and toolchain read-only; write build/cache to E016 generated storage. Scope Gap routes to owner. Main authors; independent Reviewer reviews; human operates/merges.

## Status / Allowed Transitions

Current: pr-open
Next actor: Human
Stage-local action: Address PR review comments, commit/push and resolve threads per owner instruction; PR Ready, no automatic merge.

planned→creator-in-progress; creator-in-progress→review-ready; review-ready→reviewer-in-progress; reviewer-in-progress→approved|needs-rework; needs-rework→creator-in-progress; approved→creator-in-progress|publish-in-progress; publish-in-progress→pr-open|merged; pr-open→needs-rework|merged; merged→terminal.

Latest owner instruction explicitly changes routing: feature worktree FIRST, including planning documents, never write dev worktree. Worktree /private/tmp/coami-e016-top-touch-swipe attached feat/andrew/e016-top-touch-swipe at base9155139 was created before document writes. Formal plan review precedes implementation. Owner authorizes topic commits/push/Draft PR, then stop at human review; no merge/release/cleanup. Human acceptance may remain pending in Draft PR.

## Artifact Paths

Plan-Creator: analysis/E016-top-touch-swipe/requirements.md; analysis/E016-top-touch-swipe/technical-spec.md; plan/E016-top-touch-swipe/E016-top-touch-swipe.plan.md; plan/E016-top-touch-swipe/E016-top-touch-swipe.step.md.
Reviewer: plan/E016-top-touch-swipe/review-log.md.
Implementer/Tester, exact paths relative to experiments/E016-top-touch-swipe/:

- `README.md`
- `.gitignore`
- `web/package.json`
- `web/package-lock.json`
- `web/tsconfig.json`
- `web/vite.config.ts`
- `web/index.html`
- `web/src/main.ts`
- `web/src/preview-runtime.ts`
- `web/src/top-touch-input.ts`
- `web/src/touch-feedback.ts`
- `web/src/top-touch-input.test.ts`
- `web/src/runtime-contract.test.ts`
- `web/runtime-types/simulator-engine.d.mts`
- `web/scripts/prepare-runtime.mjs`
- `web/scripts/toolchain-cache.mjs`
- `web/scripts/toolchain-cache.test.mjs`
- `web/scripts/build-mod.mjs`
- `mod/main.ts`
- `mod/host.d.ts`
- `mod/tsconfig.json`
- `mod/manifest.json`
- `runtime/wasm-top-touch.patch`
- `scripts/build-runtime.sh`
- `evidence/runtime-provenance.json`
- `evidence/verification.json`
- `evidence/operator-session-1-through-operation-17.json` — owner提供完整42筆JSON；其餘18/19片段與唯讀補充觀測留在verification.json。

Manual screenshots evidence/manual-forward.png and evidence/manual-backward.png only after real human operation; never fabricate them. Generated runtime/cache/scratch under web/generated/ ignored. External review artifact root /private/tmp/coami-e016-review-artifacts/: archify/sequence.json, archify/sequence.html and renderer sidecars; pr-lens/graph.json and pr-lens/rendered/ outputs. Paths/limitations recorded in E016 evidence. No root README/VERSION/.github/copilot-instructions.md changes. Additional paths require plan update/review.

## Implementation Steps

- [X] Record preflight, selected worktree and approved plan; initialize base-plan tracker.
- [X] Author failing behavior tests and implement raw input, FIFO, feedback and scratch ABI.
- [X] Build pinned runtime and MOD; typecheck, test, build and record provenance.
- [X] Prepare bounded auxiliary artifacts and reproducible human procedure; record pending human ACs.
- [X] Address independent implementation review and hand off review-ready evidence.

## Validation / Acceptance Checks

TC01: human 3 each direction. TC02: one/contact incl hold/reverse/release. TC03: two contacts accepted independently. TC04: tap/short move none, auto exact±60. TC05: cancel/leave/overflow/fault reset recovery. TC06: MOD/UI operation/count agreement. TC07: raw SDK path and tuple/provenance. TC08: per-AC status/evidence, automation not human. TC-AUX: separate tool validation/fallback.

All AC statuses PASS/FAIL/not-run and evidence type. Experiment state not-run/success/failure/inconclusive separately from task completion. No human success without human evidence. Runtime automation is supplementary.

## Reviewer Handoff

Contract only (not a verdict); actual Reviewer emits one JSON object:

```json
{"verdict":"approved|needs-rework","blocking_issues":[],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}
```

Issue items: issue/file/fix. ADDRESS: comment/location/why. DISCUSS: comment/optional/why. SKIP: comment/why. Actual review verdicts logged in review-log.md; tools never issue correctness verdicts.

## Post-merge / release actions

No release/VERSION/deployment/production adoption. Stop at Draft PR human review. Preserve branch/worktree; no cleanup/deletion authorized. Future merge/post-merge work needs new instruction. Rollback experiment by stopping it.

## Open Questions / Unresolved Items

No owner scope question. New ABI/build/runtime automated operations are verified in evidence/runtime-provenance.json and evidence/verification.json. Owner completed executed human swipe/leave cases; overall TC05 initialize/reset and unavailable initialization lack execution evidence and are not-run. TC07 source/provenance and TC08 evidence audit recorded. Historical failed attempt15 retained; later valid17/19 passed. Human PR review remains pending. Existing Graphify graph absent: source-search fallback, no extraction. Tool failure reports limitation without changing core gate.

Human review handoff: https://github.com/a129924/coami/pull/16; Draft=false; base=dev; head=feat/andrew/e016-top-touch-swipe. PR Ready after owner instruction; executed human swipe/leave results6/4/pending0 preserved. Overall acceptance inconclusive pending unexecuted TC05 reset/unavailable branches; review/merge pending.

## PR comment review-and-fix — 2026-10-13

Owner authorizes bounded fixes, topic commit/push, replies and thread resolution. ADDRESS all six review comments4255715535/5542/5547/5553/5559/5563. No architecture/SDK/runtime ABI change. Toolchain prerequisites now explicit; full preparation is macOS-only. Build provenance goes to ignored generated paths, preserving original evidence. Correct ±60/±62 fixtures and retract unsupported initialize/reset/unavailable coverage; these branches remain not-run. Current PR state is Ready, not Draft.

In-Scope=the six comments; Out-Of-Scope=production/new platform support/merge; ReadOnly=SDK/vendor/finalized runtime provenance/human event exports; Written=existing E016 scripts/test/index/README/verification and plan/step/review-log; Deleted=none; Modify=bounded E016 files; Goal=accurate reproduction and evidence; Non-Goal=claim uncovered failure branches; TestCase=boundary RED→GREEN,8tests,typecheck/build,CLI preflight and MOD provenance preservation.

### PR review round2 — incomplete toolchain cache

ADDRESS4255853165. Revalidate every cached component; stage a complete source copy, validate then replace. Failed copy/validation leaves previous cache intact and cleans current staging; retry needs no manual cache deletion. New helper/test remain experiment-local; package test command includes cache tests. No SDK/ABI/production/new host changes. Historical runtime provenance/operator exports read-only.
