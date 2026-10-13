# E015 — Manual video recording topic plan

## Inputs

- Intent: `analysis/E015-manual-video-recording/requirements.md`; execution source of truth: `analysis/E015-manual-video-recording/technical-spec.md`. Both exist; strict analysis-layer routing applies. This materializes the accepted conversation design without reopening decisions.
- Selector: topic=E015-manual-video-recording; branch=feat/andrew/e015-manual-video-recording; managed-path-intent=/private/tmp/coami-e015-manual-video-recording; primary-worktree=false.
- Base dev: 9155139d34ad94379a246c5d31c29e86fed52ed1. Tracker profile explicitly selected by dispatcher: base-plan. ts-implementation is a topic delivery label, not an installed skill/profile.

## Goal / Outcome

Deliver a bounded simulator webcam recording experiment with manually controlled end/output and cancel/discard, local silent playback, reproducible checks and honest live-evidence status. Draft PR delivery is valid before owner-operated recording evidence exists; it does not prove the hypothesis.

## Scope

| Field | Contract |
| --- | --- |
| In-Scope | E015 MOD/web harness, capture pump, recording session, browser adapters, tests, eight-section README, metadata evidence and external auxiliary maps. |
| Out-Of-Scope | Audio, transcript, upload/download, pause/resume, editing, real hardware, vendor/old-topic changes, production adoption or release. |
| ReadOnly | AGENTS.md/shared workflow and plan contracts; E008 analysis, MOD, observer/ledger and build sources; pinned vendor camera/simulator code. |
| Written | Only exact new repo files in Artifact Paths; auxiliary Archify/PR Lens outputs in the external paths declared by the technical spec. |
| Deleted | None. |
| Modify | Later edits only to this topic's newly created files; no old tracked files, root README, VERSION or .github config. |
| Goal | Verify manual length control, playable motion, cancellation and fresh restart in the specified simulator environment. |
| Non-Goal | Production video capability, guaranteed fps/precision, cross-browser/device proof or success based on build/tool checks. |
| TestCase | TC1 3s; TC2 8s; TC3 cancel; TC4 restart; TC5 errors; TC6 pure ownership/lifecycle tests, as fixed in analysis. |

## Locked Decisions

- Simulator webcam, silent, memory-only latest segment; new Start clears prior output; cancel discards; end is not pause/resume. Use unoccupied moving test objects.
- MOD-confirmed 96x96 RGB565LE host frame -> separate canvas -> MediaRecorder. Never record direct webcam stream or add raw-frame return transport. Read-only E008 observer/ledger; vendor b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322.
- Pump creates pending/expected sequence/buffer slot and ledger.begin before pushButton(c). Same runtime/run, expected sequence and unique webcam match are mandatory; metadata and synchronous returned buffer share ownership. One capture, completion+100ms pacing. Invalid frames abort/discard.
- First paired frame precedes recorder; start event sets recorderStartedAt. Capture and finalization tokens are distinct. Normal end retains final chunks while cleaning capture/track/runtime state; readiness includes cleanup and loadeddata within stopRequestedAt+5s. Late events never publish. Frame timeout 5s; single-segment ceiling 60s.
- 90-minute recording budget, including ~15-minute owner operation, at most one identified-problem correction/rerun. Auxiliary tools neither consume/extend this budget nor add recording/adoption gates. No large SDK downloads.
- No stable-library surfaces or release actions. Remote branch retention is unknown: retain by default; no worktree deletion authorized.

## Boundaries / Exclusions

All tracked writes remain in the selected feature worktree and exact paths below. The dev worktree, vendor, E007/E008 and production sources stay read-only. No design drift without plan revision and independent review. Archify/PR Lens are external comprehension artifacts; Graphify without an existing usable graph uses rg/source fallback, not extraction.

## Status / Allowed Transitions

- **Current**: `publish-in-progress`.
- **Next actor**: Main Agent.
- **Stage-local action**: Inspect the bounded staged set, commit the reviewed topic, push and open a Draft PR for human review.
- **Execution model**: formal planning review/readiness, bounded creator pass, independent code/check review, topic commit -> push -> Draft PR -> human review/merge stop. Latest owner direction explicitly authorizes commit/push/Draft PR and supersedes the older per-message commit-confirmation requirement. Do not ask again. No merge authorization.
- **Allowed transitions**: planned -> creator-in-progress; creator-in-progress -> review-ready; review-ready -> reviewer-in-progress; reviewer-in-progress -> approved or needs-rework; needs-rework -> creator-in-progress; approved -> creator-in-progress or publish-in-progress; publish-in-progress -> pr-open or merged; pr-open -> needs-rework or merged; merged -> terminal.
- TC1–TC4 and physical TC5 are owner/Tester responsibilities after program delivery, not creator-pass completion gates. Mark live experiment 未執行 before a live attempt or 無法判定 for an insufficient attempted run. They may remain pending in the Draft PR; never mark them complete or claim technical success to unblock delivery. Runtime/toolchain blockers are reported separately while other code work continues.

## Artifact Paths

| Exact path | Owner | Role |
| --- | --- | --- |
| `analysis/E015-manual-video-recording/requirements.md` | Plan-Creator | Intent guardrail |
| `analysis/E015-manual-video-recording/technical-spec.md` | Plan-Creator | Execution contract |
| `plan/E015-manual-video-recording/E015-manual-video-recording.plan.md` | Plan-Creator | Topic plan |
| `plan/E015-manual-video-recording/E015-manual-video-recording.step.md` | Plan-Creator | base-plan tracker |
| `plan/E015-manual-video-recording/review-log.md` | Reviewer | Independent review and routing evidence |
| `experiments/E015-manual-video-recording/README.md` | Implementer | Eight-section experiment record and run guide |
| `experiments/E015-manual-video-recording/evidence/recording-run.md` | Implementer/Tester | Metadata and pending/actual manual cases |
| `experiments/E015-manual-video-recording/evidence/validation.txt` | Implementer/Tester | Commands and check results |
| `experiments/E015-manual-video-recording/mod/mod.ts` | Implementer | One-shot MOD capture and traces |
| `experiments/E015-manual-video-recording/mod/host.d.ts` | Implementer | MOD declarations |
| `experiments/E015-manual-video-recording/mod/tsconfig.json` | Implementer | MOD TS settings |
| `experiments/E015-manual-video-recording/web/index.html` | Implementer | Minimal operator UI |
| `experiments/E015-manual-video-recording/web/package.json` | Implementer | Commands and pinned dependencies |
| `experiments/E015-manual-video-recording/web/package-lock.json` | Implementer | Dependency lock |
| `experiments/E015-manual-video-recording/web/tsconfig.json` | Implementer | Strict TS settings |
| `experiments/E015-manual-video-recording/web/vite.config.ts` | Implementer | Local serving/build settings |
| `experiments/E015-manual-video-recording/web/.gitignore` | Implementer | Local build output exclusions |
| `experiments/E015-manual-video-recording/web/scripts/prepare-assets.mjs` | Implementer | Pinned runtime prerequisites/provenance |
| `experiments/E015-manual-video-recording/web/scripts/build-mod.mjs` | Implementer | E015 MOD archive build |
| `experiments/E015-manual-video-recording/web/src/main.ts` | Implementer | UI wiring |
| `experiments/E015-manual-video-recording/web/src/style.css` | Implementer | Minimal layout |
| `experiments/E015-manual-video-recording/web/src/capture-pump.ts` | Implementer | Pure frame/run ownership |
| `experiments/E015-manual-video-recording/web/src/capture-pump.test.ts` | Implementer | TC6 correlation tests |
| `experiments/E015-manual-video-recording/web/src/recording-session.ts` | Implementer | Pure session/finalization lifecycle |
| `experiments/E015-manual-video-recording/web/src/recording-session.test.ts` | Implementer | TC6 lifecycle tests |
| `experiments/E015-manual-video-recording/web/src/browser-runtime.ts` | Implementer | Simulator/media/player adapters |

Root README, VERSION, .github/copilot-instructions.md and existing tracked files are unchanged; no deletions. Generated runtime/toolchain/node_modules/dist are ignored local artifacts. Auxiliary outputs: `/private/tmp/coami-e015-review-artifacts/archify/lifecycle.json`, `lifecycle.html` with generated visual-check sidecars; `/private/tmp/coami-e015-review-artifacts/pr-lens/graph.json`, `rendered/` and its render manifest. These are outside repository diff. New tracked paths require plan revision/re-review.

## Implementation Steps

- [X] 1. Implement the isolated E015 MOD, host capture pump and browser harness under the locked frame-ownership contract.
- [X] 2. Implement recording-session lifecycle, separate capture/finalization tokens, normal-end readiness/cleanup, cancellation and restart.
- [X] 3. Run TC6 pure tests, strict TypeScript checks and MOD/web builds where available; record exact prerequisite blockers without claiming unavailable checks passed.
- [X] 4. Write the eight-section experiment README and metadata evidence with reproducible owner procedures, actual check results and truthful pending live-experiment status.

## Validation / Acceptance Checks

- Creator delivery: exact paths, source contract alignment, TC6 pure tests, strict TS checks, MOD/web builds and a truthful record of prerequisites unavailable. Pure logic tests include sequence/slot ordering and final-chunk/readiness/cleanup late-callback cases; no implementation-mirroring tests alone.
- Full live success: owner/Tester TC1–TC4, applicable physical TC5, moving pictures replayed to end, >=2 distinct valid webcam pair digests per segment, playback time vs stop/start event T within 1s, TC2 at least 3s longer, stop-to-clean-player-ready <=5s, no audio/cancelled output, all tracks ended and count stationary after 250ms, clean restart.
- Reproducible violated live criteria after necessary prerequisites are established = 失敗; attempted but insufficient prerequisite/human/time/frame evidence = 無法判定; no live attempt = 未執行. Builds/blobs/tool validation never substitute for live success. Eight-section README separates experiment state from task completion.
- Draft PR clearly lists pending owner cases and pinned-runtime prerequisite blockers. Reviewer may approve bounded code delivery without approving recording feasibility; unresolved implementation defects still require rework.
- Tool contracts: Graphify no extract/provider/refresh; Archify static lifecycle showcase9/deliver/desktop visual status; PR Lens pinned0.11.0 actual bounded diff and unchanged neighbors. Tool failures have a truthful direct-source/plain-explanation fallback and are not recording gates.

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": {"ADDRESS": [], "DISCUSS": [], "SKIP": []}
}
```

## Post-merge / release actions

Stop for human review/merge. No release, version bump, tag or production adoption; merged is terminal for release purposes, not automatic worktree closure. Remote-retained default applies; later deletion requires explicit policy/human decision. Worktree removal requires its own exact destructive approval and is not authorized by commit/push/Draft PR direction.

## Open Questions / Unresolved Items

No unresolved design decision. Formal planning and bounded code reviews approved; see review-log.md. Full simulator runtime preparation is currently blocked by missing MODDABLE/EMSDK/fontbm; verify and record exact failure, without substituting stale binaries or downloading large SDKs. Physical camera/time/playback evidence remains pending and does not block honest Draft PR code delivery.
