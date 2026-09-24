# E005 Robot action catalog — topic plan

## Inputs

- Intent: `analysis/E005-robot-action-catalog/requirements.md`
- Execution contract: `analysis/E005-robot-action-catalog/technical-spec.md`
- Worktree: `/private/tmp/coami-e005-robot-action-catalog`, branch `feat/andrew/e005-robot-action-catalog`, primary-worktree=false.

## Goal / Outcome

Demonstrate the robot's simulator-visible face/head actions through one human button per verified action and downloadable, explicit command/result records. Keep procedure, evidence, and adoption decisions under the E005 experiment.

## Scope

- **In-Scope**: E005 analysis, plan, step, TS MOD and browser simulator, fixed candidate catalog, individual visual validation, button UI, JSONL download, tests and evidence.
- **Out-Of-Scope**: FastAPI, server transport, real hardware, audio, arbitrary pose inputs, production `src/`, and edits to E003, E004 or vendor.

## Locked Decisions

- The technical spec is the execution source; requirements guard the intent. E004 is in progress and not a dependency.
- First prove A select/C execute/B stop and release acknowledgement in the simulator. Stop dependent implementation if the channel fails; record the blocker rather than changing vendor or server scope.
- Creator records each candidate's provisional run, trace, and video timecode. Tester independently reproduces and marks visual PASS/FAIL in the matrix; only Tester-confirmed PASS entries receive dedicated enabled buttons. MOD `completed` alone does not pass an action.
- Local `COAMI5` traces and JSONL fields are experimental, not a future device/server wire contract.
- This is a review-ready experiment with no stable-library surface, README/VERSION update, or release action.

## Boundaries / Exclusions

All tracked writes stay in the paths below and in the E005 feature worktree; the dev worktree remains unchanged. E003, E004, vendor, shared workflow files, and production sources are read-only. Scope drift requires analysis/plan revision before implementation continues.

## Status / Allowed Transitions

- **Current**: `approved`; **Next actor**: Main Agent; **Stage-local action**: publish the independently reviewed E005 topic commit to a draft PR for human review.
- **Execution model**: plan review, creator implementation, independent evidence review, then publish and human review.
- **Allowed transitions**: `planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` for bounded correction or `publish-in-progress` → `pr-open` → `merged`. `pr-open` → `needs-rework` is allowed; `merged` is terminal.
- No round cap. Topic commit, push, and draft PR follow successful checks and the owner's required proposed-message confirmation.

## Artifact Paths

| Artifact | Exact path | Owner |
| --- | --- | --- |
| Requirements | `analysis/E005-robot-action-catalog/requirements.md` | Planning actor |
| Technical spec | `analysis/E005-robot-action-catalog/technical-spec.md` | Planning actor |
| Topic plan | `plan/E005-robot-action-catalog/E005-robot-action-catalog.plan.md` | Planning actor |
| Step tracker | `plan/E005-robot-action-catalog/E005-robot-action-catalog.step.md` | Step-Creator |
| Experiment guide | `experiments/E005-robot-action-catalog/README.md` | Creator |
| Experiment record | `experiments/E005-robot-action-catalog/EXPERIMENT.md` | Creator/Tester |
| Record contract | `experiments/E005-robot-action-catalog/contracts/action-records.md` | Creator |
| Action matrix | `experiments/E005-robot-action-catalog/evidence/action-matrix.md` | Creator drafts runs; Tester records independent visual verdict |
| Visible run | `experiments/E005-robot-action-catalog/evidence/action-run.webm` | Creator captures; Tester checks matching timecodes |
| MOD source | `experiments/E005-robot-action-catalog/mod/mod.ts` | Creator |
| MOD declarations | `experiments/E005-robot-action-catalog/mod/host.d.ts` | Creator |
| MOD config | `experiments/E005-robot-action-catalog/mod/tsconfig.json` | Creator |
| Web entry | `experiments/E005-robot-action-catalog/web/index.html` | Creator |
| Web package | `experiments/E005-robot-action-catalog/web/package.json` | Creator |
| Web lock | `experiments/E005-robot-action-catalog/web/package-lock.json` | Creator |
| Web ignore | `experiments/E005-robot-action-catalog/web/.gitignore` | Creator |
| Web config | `experiments/E005-robot-action-catalog/web/tsconfig.json` | Creator |
| Vite config | `experiments/E005-robot-action-catalog/web/vite.config.ts` | Creator |
| Asset script | `experiments/E005-robot-action-catalog/web/scripts/prepare-assets.mjs` | Creator |
| MOD script | `experiments/E005-robot-action-catalog/web/scripts/build-mod.mjs` | Creator |
| Web UI | `experiments/E005-robot-action-catalog/web/src/main.ts` | Creator |
| Web style | `experiments/E005-robot-action-catalog/web/src/style.css` | Creator |
| Action types | `experiments/E005-robot-action-catalog/web/src/action-contract.ts` | Creator |
| Dispatcher | `experiments/E005-robot-action-catalog/web/src/dispatcher.ts` | Creator |
| Dispatcher tests | `experiments/E005-robot-action-catalog/web/src/dispatcher.test.ts` | Creator |

**ReadOnly**: `AGENTS.md`, `plan/topic-plan-contract.md`, `plan/agent-handoff-workflow.md`, E003 MOD/Web/evidence, E004 worktree state, and pinned Stack-chan simulator/API code. **Modify**: none. **Deleted**: none. Ignored local `web/generated/`, `web/dist/`, and `web/node_modules/` are build artifacts, not tracked writes. No root README, VERSION, or release files change. New tracked paths require plan re-review.

## Implementation Steps

- [X] 1. Build the isolated E005 MOD and simulator harness; prove the A pressed/released selection, C run, and B reset/release protocol with same-run evidence.
- [X] 2. Run each candidate from its required starting state; draft the matrix with API, parameters, MOD trace, observed effect and video timecode. Hand the reproducible run evidence to Tester for the independent visual verdict.
- [X] 3. After Tester records per-candidate PASS/FAIL in the matrix, expose dedicated buttons only for PASS actions; implement serialized dispatch, stop quiescence, reset gate, restart isolation, and late-trace protection.
- [X] 4. Implement typed command/result JSONL download, tests, build and reproduction guide; record final evidence and decision.

## Validation / Acceptance Checks

- Typecheck, build, and dispatcher tests pass for selection/release, wrong action, rapid clicks, B race, timeout, reset failure, restart/late trace, and 1:1 JSONL pairing.
- Every enabled action is reproducible from one click to visible effect and MOD terminal, with action-matrix trace and video timecode. Failing candidates have no enabled button.
- E005 tracked writes match the Artifact Paths; dev, E003, E004, vendor, production and stable-library files are unchanged.

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Human review precedes merge. No VERSION bump, tag, release note, or repository release action; `merged` is terminal.

## Open Questions / Unresolved Items

None for this simulator experiment. The three-button channel and candidates are experimental gates: failure is recorded and dependent work stops.
