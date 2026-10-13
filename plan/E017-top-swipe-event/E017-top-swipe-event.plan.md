# E017 頂部 Swipe Event

Inputs: owner-approved conversation plan and execution instruction (2026-10-13). Optional analysis/E017-top-swipe-event/requirements.md and technical-spec.md do not exist; no hidden analysis baseline is assumed. Owner explicitly retains independent E017; E016 remains read-only.

## Goal / Outcome
Continuous browser pointer → raw channels → pinned SDK recognizer → MOD → visible direction/count, with reproducible simulator evidence and a Draft PR for human review.

## Scope
In-Scope: independent simulator experiment, FIFO/timestamps, runtime patch, MOD/UI, cancellation/restart, tests, Archify and local PR Lens; Graphify bounded navigation or targeted-source fallback.
Out-Of-Scope: E016 modification/reuse, Robot Action, server, hardware, new gestures, recognizer tuning, production promotion, tool integration/install, merge/release.

## Locked Decisions
- Branch feat/andrew/e017-top-swipe-event in /private/tmp/coami-e017-top-swipe-event; never implement in dev worktree.
- Stack-chan b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322; strict delta >60 / <-60, zero resets SWIPING; recognizer unchanged.
- Integer p in [-100,100] maps to [max(0,-p),100-abs(p),max(0,p)]; synthetic intensity.
- Atomic sample/ticks/metadata; XS global singleton snapshot for synchronous MOD events and consumed acknowledgement; SDK event shape unchanged.
- MOD ready → newly queued initial zero → matching consumed ack before enabling. Zero ack only after recognizer and synchronous dispatch; normal up retains FIFO before releasing capture. Cleaning lostcapture is ignored.
- FIFO max128; cancellation drops unconsumed moves and supplies zero. Runtime failure stays disabled; restart replaces session and rejects stale callbacks. Initialization timeout5s.
- MOD onLaunch returns true to skip the upstream 8-second setup splash; preserves the locked 5-second initialization timeout. No recognizer change.
- Review-ready-only, no stable-library surfaces. Runtime verification budget90min, at most2 targeted corrective rebuilds. Tool evidence is separate from core success.

## Boundaries / Exclusions
ReadOnly: original vendor, E010, E015 tool sources, E016, existing governance/skills/tool config. Scratch SDK and tool copies only under E017 ignored generated/. No existing source deletion; no SDK/API schema changes. User explicitly authorizes in-scope topic commits, push and Draft PR; stop before human review, merge or release. No PR Lens upload/publication; Draft PR creation uses GitHub separately.

## Status / Allowed Transitions
Current: pr-open.
Draft PR: https://github.com/a129924/coami/pull/17 (base dev). Stop: human review; no merge/release authorization exercised.
Routing evidence: all three engineering steps passed the implementation-only tracker; independent bounded code review approved after two provenance fixes. TC-HUMAN was unexecuted at initial publication; the 2026-10-13 acceptance checkpoint below supersedes that status with operator evidence and separate automated failure/recovery. Draft PR remains open for human code review.
Allowed: planned→creator-in-progress; creator-in-progress→review-ready; review-ready→reviewer-in-progress; reviewer-in-progress→approved|needs-rework; needs-rework→creator-in-progress; approved→creator-in-progress|publish-in-progress; publish-in-progress→pr-open|merged; pr-open→needs-rework|merged; merged→terminal.
This run ends at pr-open/human-review. Missing human cases remain explicitly unexecuted and do not become completed verification steps.

## Artifact Paths
All experiment paths below are relative to experiments/E017-top-swipe-event/:
- Planning actor: plan/E017-top-swipe-event/E017-top-swipe-event.plan.md; plan/E017-top-swipe-event/E017-top-swipe-event.step.md.
- Implementer: web/package.json, web/package-lock.json, web/tsconfig.json, web/vite.config.ts, web/index.html, web/.gitignore.
- Implementer: web/src/input.ts, web/src/input.test.ts, web/src/main.ts, web/src/style.css, web/src/runtime.d.ts, web/src/runtime.test.ts.
- Implementer: web/scripts/stage-host.mjs, web/scripts/prepare-runtime.mjs, web/scripts/build-mod.mjs, web/scripts/runtime-smoke.mjs.
- Implementer: mod/mod.ts, mod/observer.ts, mod/observer.test.ts, mod/tsconfig.json, mod/host.d.ts; runtime/wasm-top-touch.patch.
- Evidence: README.md, evidence/validation.txt, evidence/swipe-run.md, evidence/runtime-provenance.json, evidence/auxiliary.md, evidence/runtime-automated.json, evidence/runtime-automated.png, evidence/human-session-6.json (operator trace; below-threshold attempts).
- Archify: diagram/swipe-sequence.json, diagram/swipe-sequence.html and generated same-directory deliver/visual-check receipts, snapshots and screenshots.
- Local-only PR Lens: /private/tmp/coami-e017/pr-lens/graph.json and rendered/ manifest and SVGs (outside repository).
- Ignored outputs: web/generated/ (isolated SDK/toolchain/cache/public assets), web/node_modules/, web/dist/.
Root README.md, VERSION, .github/copilot-instructions.md and tool config unchanged. Any required additional source path is recorded before writing and must remain E017-only.

## Implementation Steps
Source of completion checkboxes: E017-top-swipe-event.step.md, section Implementation Steps. S1 raw-input/runtime; S2 MOD/UI; S3 verification/tools/docs. Each step inherits nine fields (In-Scope, Out-Of-Scope, ReadOnly, Written, Deleted, Modify, Goal, Non-Goal, TestCase), with Planned/Actual records. Actual initially unexecuted. Written means new; Modify means files existing at that step; ReadOnly cannot overlap either.

## Validation / Acceptance Checks
TC-INPUT: pinned recognizer ±60 no Swipe/±61 Swipe, both directions, one event per hold/reversal, tap/small/long, sample/ticks atomicity and elapsed idle polls.
TC-LIFECYCLE: all cancellation paths; up→lostcapture→consume→zeroack retains FIFO; no next operation before ack; overflow, missing provider, initialization failure, old-session restart isolation.
TC-MOD: matching XS snapshot and original event; missing metadata/session error; MOD-only direction/count display; no default petting.
TC-HUMAN: actual pinned runtime, each direction3 operations, hold/release, two independent strokes, tap/small move, cancellation/recovery/restart; correlate input/MOD/UI. No direct Swipe injection or prebuilt gesture acceptance evidence.
TC-AUX: Graphify fallback/source verification; Archify showcase9checks, deliver hashes, four desktop sizes and inspected screenshots; PR Lens actual diff provenance, validate/render with unchanged neighbors.
Build/unit success never replaces human evidence. README uses feasibility eight original sections, four experiment states and independent task-completion status. Every case PASS/FAIL/unexecuted; runtime provenance must match actually served artifacts.

## Reviewer Handoff

```json
{
  "verdict": "approved",
  "blocking_issues": [],
  "copilot_feedback_triage": {
    "ADDRESS": [],
    "DISCUSS": [],
    "SKIP": [
      {
        "comment": "真人操作驗收未列為本輪完成項目。",
        "why": "本判定僅確認 bounded code review 可前進；自動操作證據不能替代真人驗證。真人案例仍為未執行，不宣稱整體實驗驗收或其他 gate 通過。"
      }
    ]
  }
}
```

## Post-merge / release actions
No release action required. This run does not merge; human owns review and any later merge/adoption decision. Keep experiment/evidence independent; no production promotion.

## Open Questions / Unresolved Items
No product/identity questions. Human verification remains unexecuted until actual owner observations. Runtime build and tool outputs remain unexecuted at authoring time. Remote E017 refs/history checked before worktree creation; no occupancy found.

## Human-discovered bounded correction — 2026-10-13

Within existing continuous-input/lifecycle scope: fix high-rate pointer FIFO overflow using monotonic pending-move compression, preserving turning points/press/zero and trace replacement links. No SDK threshold/contract or E016 changes. Additional Written artifacts: evidence/human-session-6.json, evidence/human-session-6-overflow.json, evidence/runtime-coalesced-automated.json. Modify: web/src/input.ts, input.test.ts, web/index.html, README, validation.txt, swipe-run.md and topic plan/step. Source tests 23 PASS, strict build PASS, actual runtime CUA two-direction automated check PASS. Human effective displacement exposed a failure; post-fix human repeat pending. Previous engineering review predates this correction; do not imply it reviewed this diff.

Human checkpoint: owner-confirmed post-fix forward/backward once each, count1/2 and ready verified. Additional Written artifact evidence/human-post-fix-session-1.json; Modify README/swipe-run and this plan/step. Full TC-HUMAN remains incomplete (each direction3 and remaining lifecycle/negative cases).

## 2026-10-13 acceptance checkpoint

In-Scope: existing simulator human cases and isolated automated initialization failure/recovery. Out-Of-Scope/ReadOnly/Deleted/Non-Goal: unchanged baseline. Written: evidence/human-acceptance-session-1.json, human-acceptance-restart-session-2.json, human-acceptance-page-leave-session-2.json, runtime-init-failure-automated.json, runtime-init-recovery-automated.json, acceptance-summary.json. Modify: README, swipe-run.md, validation.txt, this plan/step only. Goal: preserve operator evidence and truthful classification. TestCase: requested operator cases PASS; initialization failure/recovery actual browser automated PASS; per-case limits in swipe-run. No code/runtime change or test rerun. Experiment success within pinned simulator scope; remain at Draft PR human review with no merge/adoption decision. Normal restart verified; active-input restart not separately demonstrated. Original independent code review predates b408039 correction and is not asserted to cover it.
