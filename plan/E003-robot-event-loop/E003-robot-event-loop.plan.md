# E003 Robot event loop — topic plan

## Inputs
- Intent guardrail: `analysis/E003-robot-event-loop/requirements.md`
- Execution source: `analysis/E003-robot-event-loop/technical-spec.md`
- Selected worktree: `/Users/andrew/code/python/coami-e003-robot-event-loop`, branch `feat/andrew/e003-robot-event-loop`, primary-worktree=false.

## Goal / Outcome
第一階段獨立證明 simulator A 按鍵經 runtime Context 到 browser bridge；實測 PASS 並經獨立 Reviewer 確認後，第二階段證明 Server 固定決策返回可見招呼與可查詢結果。實驗程序、證據和決定均 repo-visible。

## Scope
- **In scope**: E003 analysis、plan、step 與 `experiments/E003-robot-event-loop/`；嚴格分階段實作、實測與記錄。
- **Out of scope**: 實機、語音、完整 Context 傳輸、多設備、持久化、production src、E001 修改、直接 POST greet、未經 owner 決定的 TS mock。

## Locked Decisions
- Stage 1 只驗證 A → Context callback → `COAMI_EVENT|button|a|pressed` → browser `onTrace`；無 Server、greet、mock。Release 不產生第二筆 pressed。
- Stage 1 `EXPERIMENT.md` 必須記 PASS 及同次操作的證據連結，經 Tester 實測與獨立 Reviewer 確認，才可開始 Stage 2；阻斷即記錄並停給 owner 決定 mock。
- Stage 2 A 上報、C 執行 greet、B stop；bridge 只送最小事件摘要。Server 固定規則、單 simulator、in-memory；事件 ID 與命令在同一臨界區記錄後才 accepted。重複、忙碌、斷線與送達失敗遵守 technical spec。
- 此 topic 僅為 review-ready experiment，無 stable-library surface；不修改 root README、VERSION、release notes。

## Boundaries / Exclusions
- E001、vendor 與 shared workflow 文件唯讀；不得在 dev primary worktree 寫入 E003 檔案。
- Reviewer 判 gate，Creator 不自我批准。Scope 或 contract 漂移時先修 analysis 與 plan，再繼續實作。

## Status / Allowed Transitions
- **Current**: `approved`
- **Next actor**: Main Agent
- **Stage-local action**: Validate the approved E003 Written set and prepare bounded staging for topic commit; obtain the owner’s proposed-message confirmation before commit.
- **Execution model**: canonical creator → reviewer → publish → PR / merge；merge 後無 release。
- **Allowed transitions**: `review-ready` → `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress` → `review-ready`; `approved` → `creator-in-progress` → `review-ready` for bounded implementation review; `approved` → `publish-in-progress` → `pr-open` → `merged`. `pr-open` → `needs-rework` is allowed. `merged` is terminal.
- **Routing notes**: Stage 1 evidence gate precedes Stage 2 dispatch. User authorized topic commit and push after successful implementation, but AGENTS.md requires owner confirmation of proposed commit message. Human review follows push. No round cap declared.

## Artifact Paths

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Intent | `analysis/E003-robot-event-loop/requirements.md` | Planning actor | Goal and stage gate |
| Execution spec | `analysis/E003-robot-event-loop/technical-spec.md` | Planning actor | Interface and failure semantics |
| Topic plan | `plan/E003-robot-event-loop/E003-robot-event-loop.plan.md` | Planning actor | Execution contract |
| Step tracker | `plan/E003-robot-event-loop/E003-robot-event-loop.step.md` | Step-Creator | base-plan tracker |
| Procedure | `experiments/E003-robot-event-loop/README.md` | Creator | Reproduction |
| Experiment record | `experiments/E003-robot-event-loop/EXPERIMENT.md` | Creator / Tester | Question, procedure, evidence, decision |
| MOD | `experiments/E003-robot-event-loop/mod/mod.ts` | Creator | A event; later C/B actions |
| MOD typing | `experiments/E003-robot-event-loop/mod/host.d.ts` | Creator | Runtime declarations |
| MOD TS config | `experiments/E003-robot-event-loop/mod/tsconfig.json` | Creator | Typecheck |
| Web entry | `experiments/E003-robot-event-loop/web/index.html` | Creator | Simulator UI |
| Web package | `experiments/E003-robot-event-loop/web/package.json` | Creator | Scripts and dependencies |
| Web lock | `experiments/E003-robot-event-loop/web/package-lock.json` | Creator | Reproducible dependencies |
| Web ignore | `experiments/E003-robot-event-loop/web/.gitignore` | Creator | Keep generated assets and build output out of Git |
| Web TS config | `experiments/E003-robot-event-loop/web/tsconfig.json` | Creator | Typecheck |
| Vite config | `experiments/E003-robot-event-loop/web/vite.config.ts` | Creator | Assets |
| Web bridge | `experiments/E003-robot-event-loop/web/src/main.ts` | Creator | Trace / later session |
| Web style | `experiments/E003-robot-event-loop/web/src/style.css` | Creator | Visible receipt |
| Asset script | `experiments/E003-robot-event-loop/web/scripts/prepare-assets.mjs` | Creator | Pinned WASM |
| MOD script | `experiments/E003-robot-event-loop/web/scripts/build-mod.mjs` | Creator | XS archive |
| Stage 1 evidence | `experiments/E003-robot-event-loop/evidence/phase-1-event-bridge.md` | Tester | Same-run trace chain |
| Protocol | `experiments/E003-robot-event-loop/contracts/protocol.md` | Creator | Stage 2 wire contract; conditional |
| Server | `experiments/E003-robot-event-loop/server/app.py` | Creator | Stage 2 fixed rule; conditional |
| Server tests | `experiments/E003-robot-event-loop/server/test_app.py` | Creator | Stage 2 outcomes; conditional |
| Server package | `experiments/E003-robot-event-loop/server/pyproject.toml` | Creator | Dependencies; conditional |
| Server lock | `experiments/E003-robot-event-loop/server/uv.lock` | Creator | Reproducibility; conditional |
| Stage 2 evidence | `experiments/E003-robot-event-loop/evidence/phase-2-full-loop.md` | Tester | ID chain; conditional |
| Stage 2 screenshot | `experiments/E003-robot-event-loop/evidence/phase-2-greet.png` | Tester | Visible result; conditional |

No root README, VERSION, `.github/copilot-instructions.md`, E001, vendor, or production src changes. If work requires paths outside this table, stop for plan review. A review-log is created only if workflow conditions require it, with its exact path added through plan revision before creation.

## Implementation Steps
- [X] 1. Create Stage 1 MOD and simulator web bridge so one A press produces and displays the exact Context-derived event trace without Server traffic or greet.
- [X] 2. Record Stage 1 setup, same-run Host.Button A, MOD trace, browser receipt, release behavior, and independent Reviewer-confirmed PASS in E003 evidence and EXPERIMENT.md; stop on documented blocker.
- [X] 3. Only after Stage 1 PASS, add the E003 event/command/result protocol, fixed-rule Server, C greet/B stop, and browser session.
- [X] 4. Verify Stage 2 ID correlation, duplicate, busy, result, disconnect, delivery failure, TS/Python checks, and visible screenshot; record Creator/Tester evidence for independent Reviewer decision.

## Validation / Acceptance Checks
- Plan and step satisfy shared contracts; technical spec governs implementation. Stage 1 shows one actual A run across Host.Button A → MOD callback trace → browser receipt, no release duplicate, Server request, or greeting. Tester evidence and independent Reviewer confirmation are required.
- Stage 2 starts only after Stage 1 PASS. One A event yields associated `event_id`, fixed decision, `command_id`, C action, result and GET status. Duplicate, busy, disconnect and delivery failures match technical spec. TS and Python checks pass.
- E003 tracked files stay in this feature worktree; dev primary worktree remains unchanged.

## Reviewer Handoff
```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": {
    "ADDRESS": [],
    "DISCUSS": [],
    "SKIP": []
  }
}
```

## Post-merge / release actions
Human review precedes merge. No version bump, tag, release note, or repository release action is required; `merged` is terminal. Post-merge branch/worktree cleanup follows explicit applicable authorization and policy, outside this topic implementation.

## Open Questions / Unresolved Items
None for the primary simulator route. If Stage 1 is blocked, owner decides whether to authorize a separate TS mock route after reviewing the recorded evidence.
