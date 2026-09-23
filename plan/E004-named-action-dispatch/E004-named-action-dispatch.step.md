---
topic: E004-named-action-dispatch
step_profile: base-plan
source_plan: plan/E004-named-action-dispatch/E004-named-action-dispatch.plan.md
created: 2026-09-23
---

# E004-named-action-dispatch — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| `approved` | `creator-in-progress`, `publish-in-progress` | Main Agent |

## Actionable Steps

### Main Agent — Fixed Head

- [ ] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false

### Contextual Actions

- [ ] **Actor:** Main Agent — **Action:** 核對 E004 暫存範圍，依已獲 owner 確認的訊息 commit、push 並開 ready PR，交 human review。

## Implementation Steps

- [X] 1. 建立 E004 protocol、Python `Action` Enum、POST／GET、共享命令與 session lifecycle，在 `server/app.py` 和 `server/test_app.py` 驗證成功、拒絕、失敗及 E003 回歸。
- [X] 2. 在 `web/src/main.ts` 以 TypeScript Enum 處理有／無 `event_id` 的 `greet`，保留 `mod/mod.ts` 的 C greet／B 中斷和重連本機 busy；完成 TS typecheck 與 build。
- [X] 3. 完成 `README.md`、`EXPERIMENT.md`、`evidence/full-loop.md`、`evidence/greet.png` 與 Archify `evidence/dispatch-flow.png`，留下同次 API、wire、動作、結果證據和明確結論邊界。

## Main Agent Actionable Steps — Fixed Tail

- [ ] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [ ] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- [ ] **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- [ ] **Actor:** Main Agent — **Action:** Push the topic branch.
- [ ] **Actor:** Main Agent — **Action:** Open the pull request.
- [ ] **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- [ ] **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- [ ] **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- [ ] **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- [ ] **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- [ ] **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
- [ ] remote-retained — preserve the remote branch; retention is unknown, and human/policy follow-up is required before deletion
- [X] Determine release requirement — release not required
- [X] release-not-applicable — source plan declares terminal at merged
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: plan/E004-named-action-dispatch/E004-named-action-dispatch.plan.md
- Shared lifecycle shell: .codex/skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=E004-named-action-dispatch; branch=feat/andrew/e004-named-action-dispatch; managed-path-intent=/private/tmp/coami-e004-named-action-dispatch; primary-worktree=false
- Progression truth inputs: `plan/E004-named-action-dispatch/E004-named-action-dispatch.plan.md`; `plan/agent-handoff-workflow.md`.
- Completion evidence inputs: `experiments/E004-named-action-dispatch/server/app.py`, `server/test_app.py`, `contracts/protocol.md`, `web/src/main.ts`, `web/src/protocol.ts`, `web/src/protocol.test.ts`, `mod/mod.ts`, `README.md`, `EXPERIMENT.md`, `evidence/full-loop.md`, `evidence/greet.png`, `evidence/dispatch-flow.png` (all relative to the E004 experiment directory); exact test results and final bridge recheck IDs in `evidence/full-loop.md`.
- Head rows remain pending because the source plan's selected path is not repo-visible worktree inventory evidence. Human review and publication rows remain pending.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
