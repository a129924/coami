---
topic: companion-flow-baseline
step_profile: base-plan
source_plan: plan/companion-flow-baseline/companion-flow-baseline.plan.md
created: 2026-09-24
---

# companion-flow-baseline — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| `review-ready` | `reviewer-in-progress` | Reviewer |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false

### Contextual Actions

- [ ] **Actor:** Reviewer — **Action:** 獨立核對 topic plan、三份文件、Mermaid 實際渲染、情境路徑及證據邊界，回傳 reviewer JSON。

## Implementation Steps

- [X] 1. 完成 `docs/product.md`，寫明產品目標、幼兒受眾、成功訊號、範圍與未驗證能力，不記錄私人家庭背景。
- [X] 2. 完成 `docs/companion-flow.md` 的單一 Mermaid 圖與簡短圖例，呈現 Companion 主路徑、Jev／程式規則分工、Parent／Safety 交接及未來語音／裝置邊界。
- [X] 3. 完成 `docs/experiments/text-companion-loop.md`，提出文字實驗的問題、程序、預期證據與決策標準；核對三份文件一致且沒有偽造實驗結果。

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
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: `plan/companion-flow-baseline/companion-flow-baseline.plan.md`
- Shared lifecycle shell: `.codex/skills/step-creator/templates/shared-lifecycle-shell.md`
- Managed worktree intent: topic=companion-flow-baseline; branch=docs/andrew/companion-flow-baseline; managed-path-intent=/private/tmp/coami-companion-flow-baseline; primary-worktree=false
- Progression truth inputs: `plan/companion-flow-baseline/companion-flow-baseline.plan.md`; `plan/agent-handoff-workflow.md`.
- Completion evidence inputs: `git worktree list --porcelain` for the exact attached branch and worktree; `docs/product.md`, `docs/companion-flow.md`, `docs/experiments/text-companion-loop.md` for the three source Implementation Steps.
- Mermaid CLI could not be obtained and no browser was available. Actual rendering remains a Reviewer acceptance check; no render result is claimed.
- Formal Plan-Reviewer gate and independent implementation review remain pending; implementation checkboxes record document creation only, not gate approval.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
