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
| reviewer-in-progress | reviewer-in-progress→approved, reviewer-in-progress→needs-rework | Reviewer |

## Actionable Steps

### Main Agent — Fixed Head

- [X] **Actor:** Main Agent — **Action:** create-worktree — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false
- [X] **Actor:** Main Agent — **Action:** prepare-topic-branch — **Selector:** topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false

### Contextual Actions

- [X] **Actor:** Tester — **Action:** Complete the automated runtime matrix and prepare the required human-acceptance handoff for independent engineering review.
- [X] **Actor:** Reviewer — **Action:** Complete independent bounded engineering review of source, actual runtime evidence and required human handoff.

- [X] **Actor:** Implementer — **Action:** Complete R1–R3 for the five addressed PR #21 review threads, preserving protected runtime and historical evidence, then hand off for independent review.

- [X] **Actor:** Reviewer — **Action:** Complete independent review of the PR #21 bounded fixes and final post-fix validation.

- [X] **Actor:** Main Agent — **Action:** Verify pushed PR #21 fixes and reply/resolve all five addressed review threads.

- [X] **Actor:** Implementer — **Action:** Complete R4–R5 for the two second-pass PR #21 P1 findings, then hand off regression and full-smoke evidence for independent review.

- [X] **Actor:** Reviewer — **Action:** Complete independent final review of R4–R5 and the second-pass PR #21 regression and full-smoke evidence.

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


### PR #21 bounded rework — 2026-10-16

原 S1–S4 與53 PASS/human接受證據保持歷史身分；本輪僅下列 R1–R3 待完成，Actual 未執行。RO-R21：既有 RO，另含 `runtime/wasm-imu.patch`、`web/src/`、`mod/`、`web/scripts/stage-host.mjs`／`build-mod.mjs`、工具／runtime／MOD bytes、`evidence/runtime-provenance.json` 已接受 bytes、`evidence/operator-session.json` 及其所有原始人工 imports／exports、Archify成果與歷史 attempts。R2 僅在隔離 scratch fixture 驗 provenance 成功寫入／失敗保留，不回寫 accepted provenance；R3 只能保存真實最新驗證並保留 previousAttempts。

- [X] **R1 — 封閉 smoke 判定缺口**

| 欄位 | 約束 |
|---|---|
| In-Scope | 純且可重用 report／raw／Event／stop／exit predicates、negative fixtures，runtime runner 使用同一 predicates；package test 指令納入 scripts/*.test.mjs。 |
| Out-Of-Scope | IMU／provider／clock／recognizer／Event 合約、UI／MOD source、門檻或 expected scenario 調校。 |
| ReadOnly | RO-R21；既有 scenario/sample 定義與53-case／人工證據作唯讀 oracle。 |
| Written | G：web/scripts/smoke-verdict.mjs、web/scripts/smoke-verdict.test.mjs。 |
| Deleted | none。 |
| Modify | web/scripts/runtime-smoke.mjs、web/package.json（只擴 test glob，無 dependencies／lockfile 變更）。 |
| Goal | Full mode 只有非空完整53-row合法 PASS matrix、zero exceptions 且 browserErrors=[] 才 CLI exit0；E021_ONLY diagnostic subset須明示且不宣稱完整驗收。Raw／Event／stop6 predicates拒絕不合法證據。 |
| Non-Goal | 不以 aggregate PASS、忽略 INDETERMINATE／unknown status 或缺事件來補成功，不修改既有 runtime 行為。 |
| TestCase | TC-R21-VERDICT、TC-R21-RAW、TC-R21-EVENT、TC-R21-STOP；positive fixture 與逐一變異 negative fixtures，失敗 path 一律 exit1。 |

- [X] **R2 — 前置失敗保留 provenance**

| 欄位 | 約束 |
|---|---|
| In-Scope | prepare 完成成功的 public provenance 後才以同目錄 temp＋rename 原子發布 tracked ledger；失敗保留既有 tracked evidence bytes，同時移除 stale generated runnable assets；missing／mismatched env 回歸在隔離 scratch 執行。 |
| Out-Of-Scope | Runtime rebuild、工具安裝／pin 變更、改原 provenance／人工歷史、清理非本題資產。 |
| ReadOnly | RO-R21；真實 evidence/runtime-provenance.json 與既有 runtime／MOD；測試只能操作隔離 fixture copies。 |
| Written | none。 |
| Deleted | Repo files none；只清除隔離 fixture 的 stale generated runnable assets／失敗 temp，不刪歷史 evidence。 |
| Modify | web/scripts/prepare-runtime.mjs、web/scripts/pin.test.mjs。 |
| Goal | Missing／mismatched env 失敗前後 provenance bytes 完全相同且無 stale runnable；成功 fixture 經完整產生後才 atomic rename，不留 partial evidence。 |
| Non-Goal | 不刪 tracked provenance 來表達 unavailable，不把舊 provenance 當新 build 成功，也不為本修正重新 build runtime。 |
| TestCase | TC-R21-PROVENANCE：missing/mismatched env＋stale assets isolated regressions、bytes 比對、成功 atomic publication／失敗 temp 清理；現有 pin guard tests 保持。 |

- [X] **R3 — 真實53-case重驗與交付修正證據**

| 欄位 | 約束 |
|---|---|
| In-Scope | 完整53-case actual browser smoke rerun、source predicate/pin tests及strict typecheck；修 TOOLCHAIN human狀態與本輪真實 validation/status/counts；保存 previousAttempts。 |
| Out-Of-Scope | 人工重跑、runtime rebuild、修改原始human payload／hash／accepted53PASS歷史、替代獨立Reviewer或回覆／resolve threads。 |
| ReadOnly | RO-R21，R1/R2 source；若驗證失敗交 Implementer bounded修正，Tester不默改SDK或oracle。 |
| Written | none。 |
| Deleted | none。 |
| Modify | runtime/TOOLCHAIN.md、evidence/validation.txt、evidence/runtime-automated.json、evidence/runtime-visible.png、evidence/imu-run.md、evidence/acceptance-summary.json、README.md；限實際本輪驗證、狀態／counts與正確歷史人工作業描述。 |
| Goal | 新predicate下真實53-case/browserErrors/exit具可追溯結果，舊53PASS及人工完成身分清楚；交獨立Reviewer評估五項修正與可發布性。 |
| Non-Goal | 不把本輪未跑結果或source tests冒成browser PASS，不把舊human驗收改為未執行，不自行宣稱review/gate/push/resolve完成。 |
| TestCase | TC-R21-FULL、TC-R21-DOCS，重跑全部53案例，核對current served hashes不變、zero browserErrors與CLI exit；歷史previousAttempts及原人工證據保留。 |


### PR #21 second-pass bounded rework — 2026-10-16

R1–R3 與原53 PASS／人工證據保留為歷史；本輪 R4–R5 pending。RO-R21 繼續適用，唯一 script 例外為 R4 可修改 `web/scripts/build-mod.mjs` 的 provenance publication。原 UI／MOD／wasm patch／SDK／clock capability／runtime bytes、真實 accepted ledger 與原人工 exports 均唯讀；完整 pipeline 成功／失敗回歸只在隔離 fixture（mock external compiler、執行真實 scripts）操作 ledger copies，不重建真實 runtime。新增 Node helper 不修改 `main.ts`，無新 runtime capability／repo artifact 除 I 兩檔。

- [X] **R4 — 完整 MOD 成功後才發布 accepted ledger**

| 欄位 | 約束 |
|---|---|
| In-Scope | Runtime preparation 只 stage public provenance；build-mod 成功編譯並完成 runtime＋MOD public provenance 後才 temp＋rename 原子發布完整 tracked ledger；所有前置／MOD／發布失敗保留舊 ledger。 |
| Out-Of-Scope | Runtime rebuild、新 capability、UI／MOD／patch／Time source 修改、人工重跑或改 accepted evidence。 |
| ReadOnly | RO-R21；build-mod publication 為本步明列例外；真實 accepted ledger／runtime／人工 bytes 不改，fixtures 操作 copies。 |
| Written | none。 |
| Deleted | Repo files none；只清除隔離 fixture 的 stale generated runnable／本次 temp，不刪 accepted ledger／歷史 evidence。 |
| Modify | web/scripts/prepare-runtime.mjs、web/scripts/build-mod.mjs、web/scripts/pin.test.mjs。 |
| Goal | Runtime 成功但 MOD 未執行／編譯失敗時，accepted ledger 仍逐 byte 等於舊完整紀錄；唯完整 pipeline 成功才 atomic 發布含 MOD 的新 ledger。 |
| Non-Goal | 不讓 runtime-only provenance 升格 accepted evidence，不以刪 ledger 表達失敗，不冒稱 mocked fixture 是實際 runtime build。 |
| TestCase | TC-R21-PUBLISH：隔離 fixture 執行真實 prepare／build-mod scripts、mock external compiler；驗 runtime-only ledger不變、MOD failure保留、完整success atomic完整ledger及失敗temp清理／舊ledger保留。 |

- [X] **R5 — 綁定目前 source 並完整 smoke 重驗**

| 欄位 | 約束 |
|---|---|
| In-Scope | Node fs/hash helper 讀取 checked-in patch／MOD sources，在 browser 啟動前核對實際 served provenance、每筆 non-null run provenance，收尾再 hash sources；negative regressions、完整53-case smoke及真實狀態文件。 |
| Out-Of-Scope | main.ts／UI／MOD／patch／SDK／runtime 修改、重建／人工重跑、變更原 recognizer／clock／Event。 |
| ReadOnly | RO-R21；runtime/wasm-imu.patch、mod/mod.ts、mod/observer.ts 是 source oracle，原 accepted ledger／human exports／runtime bytes保持。 |
| Written | I：web/scripts/source-provenance.mjs、web/scripts/source-provenance.test.mjs。 |
| Deleted | none。 |
| Modify | web/scripts/runtime-smoke.mjs、web/scripts/smoke-verdict.mjs、web/scripts/smoke-verdict.test.mjs、web/scripts/pin.test.mjs；runtime/TOOLCHAIN.md、evidence/validation.txt、evidence/runtime-automated.json、evidence/runtime-visible.png、evidence/imu-run.md、evidence/acceptance-summary.json、README.md 僅本輪真實驗證／來源判定／counts。 |
| Goal | Served與run provenance的patchSha256及mod.sourceSha256逐檔符合目前source，拒絕自洽但stale的runtime/MOD assets；完整53-case rerun與zeroerrors/exit可獨立核對。 |
| Non-Goal | 不只比對 served assets 自有 hashes；不允許一般案例 null provenance，不用歷史53PASS取代本輪重驗，不改原human raw／accepted ledger。 |
| TestCase | TC-R21-SOURCE：temp source fixtures覆蓋patch/MOD hash不符、缺欄位、non-null run不符、收尾source變更；null只限精確stop-fallenLeft-0／page-initialization-timeout的status/reason/raw0 allowlist。TC-R21-FULL再次實際53-case驗證，保留previousAttempts與原人工作業歷史。 |

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

- PR21 rework routing2026-10-16: pr-open→needs-rework→creator-in-progress, next Implementer. R1–R3 are pending; original S1–S4 action-owner [X] and prior53PASS/human acceptance remain historical. Frozen head/tail is unchanged and does not prove these new fixes reviewed, committed, pushed or resolved.
- Owner explicitly authorized bounded PR-comment fixes, commit/push, replies and thread resolution. Independent review and actual full53 browser rerun remain required; resolve each thread only after verified fix is pushed and real PR head checked. No runtime rebuild/human rerun/source UI/MOD/vendor-patch change, no merge/release.

- R1–R3 action-owner Actual2026-10-16: source54PASS/typecheckPASS/runner syntaxPASS; negative fixtures include all5findings and independent ID/cleanup refinements. Final actual53/53PASS/zeroexceptions/exit0 at2026-10-16T02:52:36.186Z with exact original case IDs and unchanged accepted runtime/provenance/human bytes. Atomic prepare success/failure tested only in isolated fixtures. Current screenshot inspected. Implementation markers reflect executed bounded actions; Planner completion gate and final independent review still required before publication/replies/resolution.

- Planner PR21 rework gate2026-10-16: canonical check_impl_steps_succeeded E021-imu-event returned exit0 and All 7 implementation steps complete. Current review-ready, next independent Reviewer. R1–R3 engineering completion does not prove final review, commit/push, replies or thread resolution; final Reviewer contextual marker remains pending.

- Active final Reviewer handoff2026-10-16: Main Agent confirmed independent Reviewer accepted/read the queued final handoff and is actively reviewing. Canonical transition review-ready→reviewer-in-progress; final Reviewer contextual checkbox remains pending, publication blocked until actual verdict.

- PR21 review-fix publication Actual2026-10-16: d218426 smoke-verdict,3edf51c provenancepreservation,2ebf7a6 docs/revalidation pushed; actualremotePRhead2ebf7a6e423dd52f979caeef62979de6073fe7ef verified before replies. Five addressed threads individually replied/resolved and read back5total/0unresolved. PRbody updated to54source/53postfixbrowserPASS; Readyforreview retained. Publicationaudit follow-up is metadata-only; no source/runtime/human changes, merge/release/cleanup rows remain pending.

- PR21 second-pass rework2026-10-16: pr-open→needs-rework→creator-in-progress, next Implementer; R4/R5 pending. Earlier completed markers/frozenheadtail/history unchanged. Accepted ledger publication now belongs only after successful complete build-mod; Node source attestation requires actual served/non-null runs/end rehash. Independent plan and implementation reviews plus full53 rerun required; resolve threads only after verified pushed fixes.

- R5 action-owner Actual2026-10-16: source56/56/typecheck/syntaxPASS, actual full53/53 browserPASS/zeroexceptions/exit0 captured2026-10-16T03:28:23.774Z; current three-source binding and initial/final served/per-run attestationPASS. Exact two pre-verification null exceptions only. Prior attempts preserved; protectedruntime/ledger/humanbytes unchanged483b565. Independent final review and canonical gate remain pending; no publication/resolution inferred.

- Planner second-pass gate2026-10-16: actual canonical check_impl_steps_succeeded E021-imu-event exit0, All 9 implementation steps complete. Canonical creator-in-progress→review-ready→reviewer-in-progress after the confirmed active independent Reviewer handoff. Final R4/R5 Reviewer contextual item remains pending; prior review markers remain historical. No new final approval, push or thread resolution is established by this gate.
