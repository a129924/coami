---
topic: E014-ws-usage-expiry
step_profile: base-plan
source_plan: plan/E014-ws-usage-expiry/E014-ws-usage-expiry.plan.md
created: 2026-10-12
---

# E014-ws-usage-expiry — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| pr-open | needs-rework, merged | Main Agent |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false

### Contextual Actions

- [ ] **Actor:** Main Agent — **Action:** 等待 Ready PR 人工 review；未獲新明確授權不繼續修改、merge 或 cleanup。

## Implementation Steps

- [X] 1. 建立 README／EXPERIMENT、依賴與 strict TS 設定、append logger；記錄既有圖或 targeted source fallback。
- [X] 2. 完成 Python clock／授權／WebSocket／通知／cleanup 與邊界／失敗測試。
- [X] 3. 依 TypeScript TDD 完成 Robot、關聯驗證、停用 guard／timer；留下可歸因 red／green 與 strict typecheck 證據。
- [X] 4. 完成雙程序 smoke、重啟／pairing、Archify delivery／視覺證據與 actual-diff PR Lens map；記錄結果與限制。

## Main Agent Actionable Steps — Fixed Tail

- [X] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [X] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- [X] **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- [X] **Actor:** Main Agent — **Action:** Push the topic branch.
- [X] **Actor:** Main Agent — **Action:** Open the pull request.
- [X] **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- [X] **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- [ ] **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- [ ] **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- [ ] **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- [ ] **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
- [ ] remote-retained — preserve the remote branch; retention is required or unknown, and human/policy follow-up is required before deletion
- [X] Determine release requirement — release not required
- [X] release-not-applicable — source plan declares terminal at merged
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: plan/E014-ws-usage-expiry/E014-ws-usage-expiry.plan.md
- Shared lifecycle shell: .codex/skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=E014-ws-usage-expiry; branch=feat/andrew/ws-usage-expiry; managed-path-intent=/private/tmp/coami-e014-ws-usage-expiry; primary-worktree=false
- Progression truth inputs: plan/agent-handoff-workflow.md; plan/topic-plan-contract.md; source plan; review.md.
- Completion evidence inputs: git worktree list --porcelain (selected path/branch at baseline 7b5772483a8cc62cdcb959d475a1a15ebbe98053); experiment README/EXPERIMENT; evidence/navigation.md; validation.txt; smoke.jsonl; bilateral JSONL; diagram specification/delivery/visual-check receipts; external PR Lens graph/render manifest.
- Python Implementer 39 pytest/Ruff/strict Pyright; strict TS 11 tests; meaningful deadline red retained. Independent Tester 01a12e45-6aa4-7c10-b748-0ec337e52914 verified Node24.19.0/Python3.12.12, smoke 1b545039-4384-4c71-a098-16f7347f6611. Main's bounded stderr-chunk fix then passed typecheck/11 TS tests/real smoke 3dc3ec34-8ba8-4279-ae29-4f55da08ad2f.
- Step 4 records delivered diagram plus failed visual evidence, NOT visual acceptance. Owner explicitly accepted vertical overflow as Draft PR limitation on 2026-10-12. PR Lens 0.11.0 local bounded-diff map validated/rendered; schema requires actual current HEAD even for uncommitted diff, explicitly labeled. No upload. Graphify 0.9.73 verified with refresh opt-out; no graph found, targeted-source fallback.
- Owner explicitly authorized feature-only implementation, topic commits/push/Draft PR, then human review. This is STOP POINT 1 evidence; no merge/cleanup/release authorization.
- Main and independent Reviewer both ran implementation-only tracker gate: exit0, all four complete. Reviewer 01a12e45-fccc-7791-b100-a374f601545b approved final routing without blockers. Lifecycle: creator-in-progress → review-ready → reviewer-in-progress → approved → publish-in-progress, based on final code/docs/tool evidence plus owner visual exception; see review.md.
- Publication evidence: 9bcc507 build, ffbdcbb feat, dcdd5b5 docs; pushed actual head dcdd5b5b3c3083be3023242625e5481b611e026f. Draft PR https://github.com/a129924/coami/pull/14 verified OPEN/isDraft=true/base=dev/head=feat/andrew/ws-usage-expiry; reviews/comments empty at snapshot, some CI checks still in progress. No remote feedback fabricated. Follow-up metadata commit records this exact snapshot; final SHA is discoverable via git log, not self-referential metadata.
- Prior final response handed off at human review and stopped. Post-Draft metadata commit/push was blocked by auto-review and not executed. Owner then explicitly replied “可以 To Ready PR” to the bounded three-document commit/push request and Ready transition; this new execution only records that authorization and changes PR readiness, not implementation or merge authority.
- Ready evidence: gh pr ready 14 succeeded; gh pr view verified OPEN/isDraft=false/base=dev/head=feat/andrew/ws-usage-expiry at dcdd5b5b3c3083be3023242625e5481b611e026f. Before the metadata follow-up push, all 12 listed CI checks completed SUCCESS, reviews/comments empty. A new push may trigger new checks; no future all-green claim. Human review, merge, target sync, retention decisions and cleanup remain incomplete. Primary dev worktree verified clean at original baseline.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps. Full lifecycle intentionally remains pending at the human boundary.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
