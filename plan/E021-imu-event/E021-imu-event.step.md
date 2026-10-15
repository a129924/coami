---
topic: E021-imu-event
step_profile: base-plan
source_plan: plan/E021-imu-event/E021-imu-event.plan.md
created: 2026-10-14
---

# E021-imu-event — Step Tracking

## Workflow Stages

| Current status | Allowed next transitions | Next actor |
| --- | --- | --- |
| pr-open | pr-open→needs-rework or merged | Human reviewer |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false

### Contextual Actions

- [X] **Actor:** Tester — **Action:** Complete the automated runtime matrix and prepare the required human-acceptance handoff for independent engineering review.
- [X] **Actor:** Reviewer — **Action:** Complete independent bounded engineering review of source, actual runtime evidence and required human handoff.

## Implementation Steps

Step 逐項鏡映，Actual 初始未執行；下列 Written 指首次建立，Modify 指前步已建立者。

- [X] **S1 — 建立最小 raw runtime→MOD 路徑**

| 欄位 | 約束 |
|---|---|
| In-Scope | Isolated staging／toolchain／patch、owner 授權的 scratch Time.ticks alias-wrapper／pinned-base copy guard、minimal MOD 與 browser harness、含 alias／原始 Time hashes／clock 來源的 provenance；先用 U 與單一姿態證明完整路徑。 |
| Out-Of-Scope | 完整情境 UI、完整驗收、圖與 PR 變更圖。 |
| ReadOnly | RO；既有 E017 patch／build 模式僅作參考。 |
| Written | A、C。 |
| Deleted | none。 |
| Modify | none；本步建立的 artifacts 內部迭代仍屬 Written。 |
| Goal | 原 SDK 從 raw sample 辨識並由 minimal MOD 收到事件。 |
| Non-Goal | 不以 named Event／純 recognizer 測試補 runtime 成功。 |
| TestCase | TC-PIN、TC-RUNTIME、TC-MOD：alias 實際選取／pinned-base bytes.equals guard、真實 clock 有限且非遞減、原 IMU／driver 共域及 sampleTicks 上界、pin／source 未改，並驗最小路徑與不可用／尾端。 |

- [X] **S2 — 完整情境、MOD feedback 與生命週期**

| 欄位 | 約束 |
|---|---|
| In-Scope | 固定樣本、pull-driven input、fresh runtime、MOD observer、UI／匯出、行為測試。 |
| Out-Of-Scope | 硬體、演算法／門檻變更、工具圖與交付結論。 |
| ReadOnly | RO；A 中未列 Modify 的檔案。 |
| Written | B。 |
| Deleted | none。 |
| Modify | `web/package.json`、`web/package-lock.json`、`web/index.html`、`web/src/main.ts`、`web/src/runtime.d.ts`、`web/src/runtime.test.ts`、`mod/mod.ts`。 |
| Goal | 實現全部受控情境、MOD-only 顯示與停止／重啟隔離。 |
| Non-Goal | 不宣稱尚未操作的 simulator／人工案例通過。 |
| TestCase | TC-POSTURE、TC-SHAKE、TC-THRESHOLD、TC-COOLDOWN、TC-NONE、TC-LIFECYCLE、TC-MOD；純／整合測試與 strict typecheck。 |

- [X] **S3 — 自動 runtime 驗證與人工驗收交接**

| 欄位 | 約束 |
|---|---|
| In-Scope | Implementer 提供 runtime smoke；Tester 完成完整 automated matrix 與真實 raw／MOD／UI／clock 證據，準備人工操作程序及逐項 NOT_EXECUTED 人工 matrix，交接 Draft PR 後 STOP POINT 2 的必要人工驗收。 |
| Out-Of-Scope | 未授權調校／擴 scope、以工具圖替代驗收。 |
| ReadOnly | RO、A／B source；發現 code failure 回派 bounded fix，不由 Tester 默改。 |
| Written | D；人工交接只記程序、案例與 NOT_EXECUTED，operator-session 不填不存在的人工 raw trace 或結果。 |
| Deleted | none。 |
| Modify | `web/package.json`（接入 runtime smoke）；C 僅在本輪實際 build 後更新真實 provenance，保留歷史紀錄。 |
| Goal | 本輪工程交付完成完整自動 runtime 驗證與可執行的人工驗收交接；不等於 full verification 或整體實驗成功。 |
| Non-Goal | 不把 automated PASS 當人工操作或 overall PASS；不降低人工實際操作、全部核心案例執行與全部 PASS 的原完整驗收標準。 |
| TestCase | TC-PIN 至 TC-MOD 的完整 automated matrix 與實際證據；TC-EVIDENCE 核對人工程序／NOT_EXECUTED matrix／STOP POINT 2 交接，fullVerification=false 直到 required 人工驗收實際完成。 |

- [X] **S4 — 文件、三工具輔助與交付**

| 欄位 | 約束 |
|---|---|
| In-Scope | 整理本輪說明／證據、Archify、Graphify source fallback；PR Lens 有合法真實 base／head 才產圖，否則記 pending／原因／後續派遣。 |
| Out-Of-Scope | source behavior 修改、歷史刪除、工具安裝／integration／upload、publish／merge。 |
| ReadOnly | RO、A／B／runtime script；既有 D 歷史 raw evidence。 |
| Written | E、F；PR Lens 前置成立時才建立前述外部 outputs，否則於 `evidence/auxiliary.md` 記 pending，不產假圖／假 revision。 |
| Deleted | none。 |
| Modify | `runtime/TOOLCHAIN.md`、`evidence/validation.txt`、`evidence/acceptance-summary.json`、`evidence/imu-run.md`，僅補本輪事實／索引，不覆寫歷史。 |
| Goal | 交付可重做、可追溯的核心結果與可取得的輔助成果，明列 PR Lens pending 及真實 head 取得後的 bounded follow-up。 |
| Non-Goal | 工具成功不等於 correctness；不在此步默修 source。 |
| TestCase | TC-AUX、TC-EVIDENCE；核對文件／hash／實際 revision／結果；若無合法 base／head，核對 pending 原因與後續 dispatch，該 pending 不阻本輪 creator pass completion。 |

Source failure 的修正須回到 S1／S2 對應 bounded 範圍並更新其 Actual；需要新增 source 路徑先修計畫，不藉 S3／S4 擴大寫入。

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
- [ ] **Actor:** Main Agent — **Action:** Inspect the selected managed topic worktree and prove clean/release evidence — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Obtain exact destructive approval to remove the selected managed topic worktree — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Remove the selected managed topic worktree and verify removal — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- [ ] **Actor:** Main Agent — **Action:** Delete the local topic branch after verified managed worktree removal.
- [ ] **Actor:** Main Agent — **Action:** Perform final verification and record close-semantics evidence without equating merged with closed.

## Handoff / Gate Notes

- Selected profile: base-plan
- Source plan: plan/E021-imu-event/E021-imu-event.plan.md
- Shared lifecycle shell: .codex/skills/step-creator/templates/shared-lifecycle-shell.md
- Managed worktree intent: topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- Progression truth inputs: plan/E021-imu-event/E021-imu-event.plan.md; plan/E021-imu-event/review-log.md.
- Completion evidence inputs: plan/E021-imu-event/review-log.md, 2026-10-14 authorized persistence checkpoint; managed create-worktree operation `351ff9e6-9130-4805-ba91-8154f8a3c0e6`; exact selected inventory/attached branch at HEAD `b67c42356a1bc9f0c07d51e6af31a61d737dec65`.
- Fixed-head markers map only to the recorded selected managed worktree/branch inventory. STOP POINT 1 maps to later owner explicit commit/push/Draft-PR authorization; do not ask again. Neither implies readiness, bounded staging, code review or implementation completion.
- Marker semantics: `[X]` exact one-to-one evidence; `[ ]` pending/planned/unproved; lowercase source `[x]` is pending and warns.
- Tracker semantics: `check_all_succeeded` covers rendered head/contextual/Implementation/tail checkboxes; `check_impl_steps_succeeded` covers only Implementation Steps.
- Owner-only updates: only the action owner may update after exact evidence; step-creator never updates an existing output.
- Actual: S1 raw→SDK→MOD and original/pin/clock guards proved by runtime-provenance.json and runtime-automated.json. S2 source42 PASS/strict typecheck PASS and actual lifecycle results PASS. S3 automated53/53 PASS/browserErrors=[] plus operator-session required human procedure/53 NOT_EXECUTED matrix/runs[]; fullVerification=false. S4 README/evidence/Archify PASS/Graphify source fallback complete; PR Lens legitimately pending a normal reviewed topic commit. Evidence captured 2026-10-14T03:11:45.718Z; historical failures retained. Markers describe engineering delivery only.
- Remote retained; no automatic deletion. No release action; source declares terminal at merged. Cleanup rows stay pending until exact later evidence and destructive authorization.

- Topic-local STOP POINT 2 current acceptance: owner completed required simulator operations,53/53 PASS with32 original exports and independent evidence review APPROVED on2026-10-15. fullVerification=true only for controlled synthetic scope; Draft PR remains for owner review. Historical NOT_EXECUTED checkpoint notes below/above preserve original handoff facts. No merge authorization.
- S3 engineering delivery classification (Planner): full automated runtime matrix/evidence plus executable human procedure and NOT_EXECUTED matrix may be independently reviewed for this creator pass. It does not complete full verification. Frozen head/tail, independent review gates and original all-cases-executed/all-PASS acceptance requirements remain unchanged.

- PR Lens follow-up Actual: normal commits53e38d6/cb635af/f0eec2b; real map snapshot base34fd88c/headf0eec2b local validate/render PASS and independent Reviewer APPROVED. Later docs commits do not change that snapshot.

- Publication Actual: pushed topic branch; Draft PR https://github.com/a129924/coami/pull/21 OPEN/isDraft=true/base=dev, observed head5eb3bf5 and no comments/reviews. STOP POINT 2 handed to human; required simulator acceptance NOT_EXECUTED/fullVerification=false. Human-merge tail wording is frozen and does not authorize merge; post-merge/cleanup rows remain pending. CI was in progress at initial observation; no CI pass inferred.

- Human acceptance Actual2026-10-15: all53 original matrix IDs PASS, independent Reviewer APPROVED/no blockers;32 original export hashes/payloads and exact four stop/recovery pairs verified. fullVerification/verificationComplete/overallSuccess=true in controlled synthetic scope only. Source/runtime unchanged; hardwareOOS. Original engineering/head/tail markers unchanged; merge/resume/cleanup rows remain pending.
