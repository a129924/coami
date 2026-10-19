---
topic: robot-audio-exclusion
step_profile: base-plan
source_plan: plan/robot-audio-exclusion/robot-audio-exclusion.plan.md
created: 2026-10-19
---

# robot-audio-exclusion — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| review-ready | reviewer-in-progress | Human Reviewer |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false

### Contextual Actions

- [ ] **Actor:** Human Reviewer — **Action:** Review E025 implementation, dynamic evidence, aggregate human report and original per-trial save limitation.

## Implementation Steps

- [X] 1. 核對 fixed SDK path 與 committed bytes，完成來源報告及 SHA-256 inventory。
- [X] 2. 記錄來源充分性、TC-SOURCE、未啟動 TC-TS 與 Graphify fallback 的實際證據。
- [X] 3. 完成 Archify sequence 的結構／交付／四尺寸及人工視覺驗收；如失敗分別記限制。
- [X] 4. 驗證 Written set、文件連結及 tracker 一致性，完成 PR Lens bounded diff 準備；其真實 commit provenance 驗收交由 publication 階段完成。

- [X] 5. 記錄 owner 真人驗證修訂與事前判準，核驗官方同 pin runtime archive／metadata 並新建 MOD。
- [X] 6. 先撰寫 failing behavior tests，再實作無跨錄放 guard 的 MOD、被動觀測、interval 判讀與真人操作頁。
- [X] 7. 完成受影響 pure tests、strict typecheck／build 及不冒充真人的 browser smoke，記錄 actual evidence。
- [X] 8. 完成可重現啟動方式、served-bytes provenance、真人程序與未執行結果表，交人工作業確認。

- [ ] 9. 依真人實際保存的 metadata／聽辨與 interval 證據判讀 E025，寫回結果與限制並更新 Draft PR 交接。

## Main Agent Actionable Steps — Fixed Tail

- [X] **Actor:** Main Agent — **Action:** Validate the approved Written set and perform bounded staging only.
- [X] **Actor:** Main Agent — **Action:** Obtain explicit human approval at STOP POINT 1 before commit, push, or PR creation.
- [X] **Actor:** Main Agent — **Action:** Commit the approved bounded changes.
- [X] **Actor:** Main Agent — **Action:** Push the topic branch.
- [X] **Actor:** Main Agent — **Action:** Open the pull request.
- [X] **Actor:** Main Agent — **Action:** Review and observe the pull request and route actionable feedback.
- [ ] **Actor:** Main Agent — **Action:** Hand off for human merge at STOP POINT 2 and completely stop.
- [ ] **Actor:** Main Agent — **Action:** Record exact human merge evidence after a new execution begins.
- [ ] **Actor:** Main Agent — **Action:** Require a new explicit human resume before post-merge work.
- [ ] **Actor:** Main Agent — **Action:** Verify the pull request is merged.
- [ ] **Actor:** Main Agent — **Action:** Fast-forward-only sync the target/default branch.
- [ ] remote-retained — preserve the remote branch; retention is required or unknown, and human/policy follow-up is required before deletion
- [X] Determine release requirement — release not required
- [X] release-not-applicable — source plan declares terminal at merged
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan; payload: ts-implementation（原來源階段未啟動為歷史；owner 新要求已啟動 E025）。
- Source plan: plan/robot-audio-exclusion/robot-audio-exclusion.plan.md
- Shared lifecycle shell: .codex/skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=robot-audio-exclusion; branch=chore/andrew/robot-audio-exclusion; managed-path-intent=/private/tmp/coami-robot-audio-exclusion-worktree; primary-worktree=false
- Progression truth inputs: source plan、review-log.md、evidence/validation.md。
- Completion evidence inputs: source-report.md、evidence/source-inventory.json、evidence/validation.md；未完成動作保持 pending。
- Fixed head evidence: evidence/validation.md 的 worktree command/inventory；兩個實際 attached worktree 可區分 topic 與 dev。
- STOP POINT 1 evidence: owner 本輪明確授權「直接 commit by topic -> push -> open Draft PR -> human review」。此授權涵蓋 in-scope commit message，不重複問同一授權。
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: check_all_succeeded covers head/contextual/implementation/tail; check_impl_steps_succeeded only checks Implementation Steps. Whole-file completion is not claimed before human review/merge/cleanup.
- Owner-only updates: action owner updates only after exact evidence; step-creator initial creation is atomic and does not itself execute lifecycle work。
- Cleanup／merge 後工作未獲授權；保留 worktree 與 branch，不把 pr-open 或 merged 當 closed。

## Planned / Actual

此表是已完成 source-only 階段的歷史 Actual，對應 commit 7d5b6a9／5416f11；當時 TC-TS 未啟動，不代表現在的 E025。

| Label | Actual / evidence |
| --- | --- |
| In-Scope | 已讀 fixed pin 的公開 capability、manifest、runtime、WASM、native 與 Host；source-report.md。 |
| Out-Of-Scope | 沒有執行真機、ASR、remoteSession、browser 並行實驗或 production 修改。 |
| ReadOnly | SDK source 只讀，11 個 working files 與 committed bytes 相同；source-inventory.json。 |
| Written | 本 topic 六個文件／JSON；外部 Archify 已交付，PR Lens 已對 committed diff validate／render PASS；外部 manifest／publication record 記錄實際 head。 |
| Deleted | 無。 |
| Modify | 僅本 topic 新工件；git Written set 檢查在 validation.md 更新。 |
| Goal | source-report.md 已回答固定路徑未見交叉 guard，限制未超出證據。 |
| Non-Goal | 未定義 Robot State、未改 SDK、未加互斥 guard。 |
| TestCase | TC-SOURCE 完成；Graphify fallback、Archify final checks 完成；TC-TS 未啟動／未適用；文件完整性 PASS；PR Lens 初次 validate FAIL 已保留；真實 commit 後 validate／render PASS，見 evidence/validation.md。 |

- Publication evidence: source commit `7d5b6a9180c0381e565ca98fe512ba4536e7153c`，origin branch tracking 已設定；Draft PR #27 `https://github.com/a129924/coami/pull/27`，base=dev、state=OPEN、isDraft=true、尚無 human reviews／comments。
- Commit／push／open 標記對應上述已發生的初次 publication；後續僅補同 topic handoff evidence 並再次 push，不改來源結論。最終遠端 head／CI snapshot 保存於外部 publication.json。
- STOP POINT 2: Draft PR 交人工作業；Human Reviewer action 保持 pending。主 agent 不 merge、不做 merge 後動作或 cleanup。

## Owner-requested E025 delta

2026-10-19 owner 新增真人驗證：本次 Actor／Action 與新增 implementation steps 以 source plan 的人工作業修訂為準。上方 Actual 表是 source-only 已完成階段的歷史結果，非 E025 runtime PASS；E025 新階段已執行；目前結果見下表與E025 evidence/validation.md。

## E025 Current Planned / Actual

| Label | Planned | Actual |
| --- | --- | --- |
| In-Scope | E025 stock simulator 錄放雙方向、metadata 與真人聽辨 | 9筆真人操作均有有效重疊與自然回放；雙方向各至少3筆 |
| Out-Of-Scope | 真機、ASR、remoteSession、production、互斥政策 | 未涉及 |
| ReadOnly | vendor、舊實驗、治理／skills、dev worktree | 原 SDK 唯讀；feature-local clone 同 pin |
| Written | source plan 精確列出的 E025 工件與本 topic follow-up | README、MOD／web／scripts／官方 metadata／runtime provenance／validation 已建立；human-run.md／trace.jsonl 已保存；原逐筆欄位缺口與對話整批回報另記validation.md |
| Modify | 僅本 topic 新工件與明示 scope 修訂 | plan／tracker／review-log 修訂；沒有 dev 變更 |
| Deleted | 無 | 無 |
| Goal | 動態 interval 與真人聽辨分層結論 | 兩順序可重疊；owner回報都有聽到，8筆未逐筆保存的缺口保留 |
| Non-Goal | 不定義 Robot State／修 SDK | 未涉及 |
| TestCase | pure behavior／strict build、真人 baseline、兩順序各三案例 | 新scope review approved；9 pure tests及strict build通過；5筆record-say／4筆say-record重疊且回放，真人整批確認；獨立TS review仍pending |

- E025 ready handoff: 本機 http://127.0.0.1:5195/，Chrome tab 287644920；dev process 僅 loopback，保留供真人操作。準備程序不記為人耳或錄放並行 PASS；第9步必須等待實際輸入。

- E025 actual evidence: experiments/E025-listening-saying-exclusion/evidence/validation.md 的 Human execution and interpretation；主要互斥假設已否定，逐筆保存不完整與整批回報分開。第9步尚待Draft PR更新讀回後標記；不將human聽辨當作code review。
