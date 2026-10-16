# E021 IMU Event：辨識搖晃、傾倒與倒置

本文件持久化 owner 接受且完成對話內容審查的 E021 計畫；原 repo-visible plan／step readiness 已獨立複核。Owner 授權的 scratch clock compatibility 與實際 runtime／真人證據已完成獨立複核；先前失敗保留為歷史證據，實際進度依 review-log。交付標籤為 `ts-implementation`；Dispatcher 明確選定 step profile 為 `base-plan`，不建立新的 skill／profile。

**Analysis warning — INCOMPLETE optional analysis layer**：`analysis/E021-imu-event/requirements.md` 與 `analysis/E021-imu-event/technical-spec.md` 均缺席。本計畫依 owner 草案、已回答決策與 pinned SDK 起草，不假設其他 analysis baseline。

## Goal / Outcome

交付獨立 BC Mission，驗證 **synthetic raw 加速度樣本 → SDK recognizer → IMU Event → MOD → 可見回饋**。涵蓋 `shake`、`fallenForward`、`fallenBackward`、`fallenLeft`、`fallenRight`、`upsideDown`。

六種事件及核心邊界／生命週期案例全部執行才可稱「驗證完成」；逐項記錄 PASS、FAIL、無法判定，未執行另列。部分 PASS 不等於整體成功。

## Scope

- E021 專屬受控樣本、browser→C/WASM raw provider、owner 授權的 scratch Time.ticks compatibility、isolated patch、MOD、操作頁、測試與可重做證據。
- 操作頁提供情境選擇、執行、停止、重啟、匯出；顯示 synthetic、案例／輪次、進度、MOD 實收事件與次數。
- 囊括 Archify 本題路徑圖、PR Lens 真實 diff 變更圖及 Graphify 有界導覽／原始碼 fallback；三者僅輔助理解與證據，不替代 correctness gates。

## Locked Decisions

- SDK 固定 `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`，沿用原 IMU／recognizer／Event 與預設參數：poll 100 ms、模長差 `>=1.2`、連續 10 次、冷卻 1500 ms、姿態門檻 `0.75`、連續 3 次；陀螺儀模式關閉。
- Owner 允許 E021 專屬 **browser→C/WASM→device.sensor.IMU** raw provider，並明確擴充授權 scratch 平台的真實單調 Time.ticks compatibility。唯一 patch 仍為 `runtime/wasm-imu.patch`，僅套用 E021 ignored scratch SDK；不改 vendor、原 `imu.ts`、recognizer、Event shape 或正式 SDK contract。Provider 只回傳 `{accelerometer:{x,y,z}}`，不能以事件名稱製造結果。
- Pinned Moddable WASM 的 `xs_time_ticks()` 空 stub 是已記錄的來源缺口，不能拿樣本索引／Timer interval 推算假 ticks。Compatibility 改用 E021 scratch manifest alias wrapper，不能覆寫 preload snapshot 的 Time descriptor：patch 內新增 `firmware/host/modules/input/wasm/time-compat.js`，`import PinnedTime from 'e021-original-time'` 並以 `class Time extends PinnedTime { static get ticks() { return native('xs_stackchan_e021_ticks').call(this) } }` 提供 getter。Scratch manifest 的 `~` 排除 `'$(MODULES)/base/time/time.js'`，避免 wildcard 先註冊原 time 而忽略 wrapper；`time` map 為 `'./wasm/time-compat'`，`e021-original-time` map 為 `'./wasm/pinned-time'`。Patch 內新增的 scratch `pinned-time.js` 是 pinned Moddable Time JS 逐 byte 副本；`prepare-runtime.mjs` 在 build 前必須以 `bytes.equals` 對照原 pin-clean 檔案，不符即停止。原 `modTime.c` 仍編譯且不修改。現有 IMU bridge C native 以 `xsmcSetNumber(xsResult, emscripten_get_now())` 提供真實單調毫秒；原 SDK IMU 與 raw driver 共同 import `time`，讀同一 wrapper／clock 域。原 Moddable Time JS／C、工具 pin、IMU／recognizer／Event 不修改；其他 Time 方法僅繼承，不補空 stub。唯一 repo patch artifact 仍為 `runtime/wasm-imu.patch`，wrapper 是該 patch 內的 scratch SDK 檔案，不新增 repo artifact。Runtime provenance 必須明示 alias-wrapper compatibility、wildcard／descriptor／stub 限制、native clock 來源及 patch hash，並保存 `originalTimeJsSha256` 與 `originalWasmTimeCSha256`；不能描述成 upstream 原生支援。
- Synthetic 樣本採 CoreS3 BMI270 參考單位 m/s²、driver `configure({order:'zxy'})` 後的 recognizer frame，不再次轉軸。直立 `U=(0,9.80665,0)`；左／右 `±x`、前／後 `∓z`、倒置 `-y`，姿態模長均 `9.80665`。不宣稱 Core2 單位或實機方向已驗證。
- SDK 每次 sample 同步拉一筆，不另開 browser producer timer、不壓縮／補樣／重播末筆。Run／case／sample ID 與 raw 原子綁定；driver 回傳前記同 SDK clock 域 `sampleTicks`，作為 SDK 取樣前讀時的上界，不宣稱相等。MOD 同步複製身分與原 Event `kind/motion/ticks`；下一 poll 確認末筆處理返回後停止供樣。純測試才使用可控 clock。
- 獨立案例、停止／中斷後重試均用 fresh SimulatorEngine／WASM runtime／IMU，不能以不 reset recognizer 的 stop/start 代替；同案例的恢復／冷卻保留 recognizer。
- MOD 覆寫 onLaunch／onContextCreated，先設 `robot.imu.onEvent` 再 start，避免預設 IMU 表情反應；UI 事件與次數只取 MOD 實收紀錄。
- Branch 為 `feat/andrew/e021-imu-event`：feat 表示新增實驗能力，andrew 沿用 namespace，描述為短 kebab-case。唯一 managed worktree selector：topic=E021-imu-event; branch=feat/andrew/e021-imu-event; managed-path-intent=/Users/andrew/.codex/worktrees/05ae/coami; primary-worktree=false。Main Agent 的 managed create-worktree operation `351ff9e6-9130-4805-ba91-8154f8a3c0e6` 回傳此實際路徑；inventory 已確認 attached branch，取代先前對話的臨時路徑意圖。不得寫入 primary dev worktree。
- Review-ready-only，無 stable-library surfaces、release 或 production promotion。保留 PR #19 的 E019 注視證據與 PR #20 的 E020 SDK 俯仰修正歷史；實驗編號與 PR number 獨立，不預分配 PR #21。
- Owner 後續明確授權 create feature worktree → implementation → topic commits → push → Draft PR → human review；此較晚授權覆蓋先前逐次 commit message 確認要求，不重複詢問。授權不取代獨立 readiness／implementation review gates，並止於 human review，無 merge／release 授權。

## Boundaries / Exclusions

- 不含硬體、實際跌落、調校／新 Event、陀螺儀搖晃、融合／校正、混合動作辨識率、Action、server 決策或告警。
- 共用 **RO** 精確保護集合：`vendor/stack-chan/`、`experiments/` 中除 E021 外所有既有實驗、`server/src/`、`device/src/`、`.codex/`、`.agents/`、`.github/`、root `AGENTS.md`／`README.md`／`VERSION`、既有 `analysis/` 與 E021 外 `plan/`、其他 worktree 的工具來源；primary `/Users/andrew/code/python/coami` 不寫入。可讀現有 PR Lens config，不修改。
- Patch 僅新增 raw driver／native binding、平台安裝與 simulator host 接線，以及 owner 授權的單一 Time.ticks scratch compatibility；不修改 Moddable source／其他 Time 空方法。空佇列、正常結束、故障分開記錄；無樣本走既有 sample-error skip，不假直立、不回傳舊樣本。
- Plan-Creator 起草、Plan-Reviewer 審查、Planner 判 gate；Implementer 實作、Tester 產驗證證據、Reviewer 獨立 code review。超 artifacts、需改 SDK 或無法串完整路徑即停，回報 Scope Gap。
- 三工具不授權安裝、integration、provider、upload、PR comments／publication 或 graph build。工具失敗記錄 tool status，改用 direct source／diff；不能篡改 IMU 結果。Owner 授權的 Draft PR 使用正常 GitHub 發布路徑，不藉工具禁用流程繞過邊界。

## Status / Allowed Transitions

- **Current**: `publish-in-progress`.
- **Next actor**: Main Agent.
- **Stage-local action**: Commit/push approved PR #21 fixes, verify remote head, then reply and resolve the five addressed threads; no merge/release.
- **Allowed next transition**: `publish-in-progress→pr-open`.
- **Allowed**：`planned→creator-in-progress→review-ready→reviewer-in-progress`；`reviewer-in-progress→approved|needs-rework`；`needs-rework→creator-in-progress`；`approved→creator-in-progress|publish-in-progress`；`publish-in-progress→pr-open|merged`；`pr-open→needs-rework|merged`；`merged→terminal`。
- Owner 的 clock scope choice 已明確解除，依授權派 Implementer 執行 bounded compatibility 並交獨立 Reviewer 核對 delta；原 readiness verdict 不代表新 runtime 通過。步驟／rework 未完維持 creator-in-progress；completion gate 只讀 step 的 Implementation Steps `[X]` 與證據。無 round cap／release transition。
- Owner 已授權通過 review gates 後的 bounded commits／push／Draft PR，STOP POINT 1 無須再索取相同授權；STOP POINT 2 仍止於 human review，不 merge、不 release。
- Planner 已正式分類為 bounded delivery clarification：本輪 S3 工程交付為完整 automated runtime matrix／證據與 required 人工驗收交接。獨立工程 review 通過後依既有 owner 授權 commit／push／Draft PR；PR 必明列人工 NOT_EXECUTED、未完清單與 fullVerification=false。必要人工操作安排 Draft PR 後 STOP POINT 2，由 owner／human reviewer 實際執行並留下證據；在此之前不宣稱驗證完成／整體 PASS。既有 gates、canonical transitions 與完整 AC 均保留。
- PR Lens 不得造成 commit gate 循環：S4 若尚無合法、真實的 base／head commit SHA，記 `pending`、原因與後續派遣，即可完成本輪 creator pass 並交獨立 Reviewer；pending 不代表 PR Lens 成果已完成。依正常獨立 review、既有 owner 明確授權及 commit gates 取得真實 head 後，再派 Implementer bounded follow-up，以實際 diff 產外部變更圖，交 Reviewer 核對。既有 canonical transitions 不變；禁止為取得圖提前 commit，working-tree／blob hash 不冒充 commit SHA。若 follow-up 需要改 repo artifacts，先依既有修訂與 review gates 路由。

- 2026-10-16 PR #21 bounded rework follows `pr-open→needs-rework→creator-in-progress`; all five review findings are ADDRESS. Existing owner authorization includes bounded fix commits/push, explicit review replies and resolving threads. Resolve a thread only after its verified fix has been pushed and checked at the real PR head; do not conflate authoring, review, push or resolution. Draft PR remains open; no merge/release authority.
- 本輪只修 smoke 驗證／CLI verdict、preflight provenance 保留與過時 TOOLCHAIN 狀態；原 IMU algorithm／provider／clock／Event、runtime bytes 及原始人工證據唯讀。既有2026-10-15 human53/53與獨立核准保留為歷史 accepted evidence；不能冒稱本輪新 predicate rerun 已通過。因 runtime/source bytes 不變，不要求 runtime rebuild 或人工重跑；修正後仍必須完整實際53-case browser smoke 與獨立 review。

## Artifact Paths

以下精確群組供九欄引用；實驗相對路徑以 `experiments/E021-imu-event/` 為根。全部 repo writes 限實際 managed worktree `/Users/andrew/.codex/worktrees/05ae/coami`。

| 群組／Owner | 精確路徑 |
|---|---|
| P／Plan-Creator、指定 step 建立角色、獨立審查者 | `plan/E021-imu-event/E021-imu-event.plan.md`、`plan/E021-imu-event/E021-imu-event.step.md`、`plan/E021-imu-event/review-log.md` |
| A／Implementer：最小 runtime harness | `runtime/wasm-imu.patch`、`runtime/TOOLCHAIN.md`、`web/package.json`、`web/package-lock.json`、`web/tsconfig.json`、`web/vite.config.ts`、`web/.gitignore`、`web/index.html`、`web/src/main.ts`、`web/src/runtime.d.ts`、`web/src/runtime.test.ts`、`web/scripts/stage-host.mjs`、`web/scripts/prepare-runtime.mjs`、`web/scripts/build-mod.mjs`、`web/scripts/pin.test.mjs`、`mod/mod.ts`、`mod/tsconfig.json`、`mod/host.d.ts` |
| B／Implementer：完整操作及測試 | `web/src/scenarios.ts`、`web/src/scenarios.test.ts`、`web/src/input.ts`、`web/src/input.test.ts`、`web/src/style.css`、`web/src/page-lifecycle.test.ts`、`mod/observer.ts`、`mod/observer.test.ts` |
| C／Implementer：build provenance | `evidence/runtime-provenance.json` |
| D／Tester；runtime script 由 Implementer | `web/scripts/runtime-smoke.mjs`、`evidence/validation.txt`、`evidence/runtime-automated.json`、`evidence/operator-session.json`、`evidence/runtime-visible.png`、`evidence/acceptance-summary.json`、`evidence/imu-run.md` |
| E／Implementer：交付說明／工具證據 | `README.md`、`evidence/auxiliary.md` |
| F／Implementer：Archify | `diagram/imu-flow.json`、`diagram/imu-flow.html`、`diagram/imu-flow.delivery.json`、`diagram/imu-flow.visual-check.json`、`diagram/imu-flow.visual-check.html`、`diagram/imu-flow.visual-check.1440x900.light.png`、`diagram/imu-flow.visual-check.1440x900.dark.png`、`diagram/imu-flow.visual-check.2048x1320.light.png`、`diagram/imu-flow.visual-check.2048x1320.dark.png` |
| G／Implementer：PR21 新增純 predicates／negative fixtures | `web/scripts/smoke-verdict.mjs`、`web/scripts/smoke-verdict.test.mjs` |
| H／Implementer、Tester：PR21 bounded existing Modify | `web/scripts/runtime-smoke.mjs`、`web/scripts/prepare-runtime.mjs`、`web/scripts/pin.test.mjs`、`web/package.json`、`runtime/TOOLCHAIN.md`、`evidence/validation.txt`、`evidence/runtime-automated.json`、`evidence/runtime-visible.png`、`evidence/imu-run.md`、`evidence/acceptance-summary.json`、`README.md` |

Ignored outputs 限 `web/generated/`（E021 scratch SDK／toolchain／runtime）、`web/node_modules/`、`web/dist/`；Archify CLI 同目錄 private snapshot 為其生成工件，依 receipt 記錄，不手改。P 的 plan／step／review-log 分屬規劃／追蹤／審查角色，不混入實作九欄的 creator 成果。

外部 PR Lens 寫入範圍獨立限 `/private/tmp/coami-e021-review/pr-lens/`：`graph.json`、`revisions.json`、`changes.patch` 及 `rendered/` 下 manifest／實際 SVG outputs；不寫 repository `.pr-lens`。Graphify 不建立 graph／cache／stamp。清單外 repo source 需先修計畫；不刪歷史證據。

## Implementation Steps

Step 逐項鏡映，Actual 初始未執行；下列 Written 指首次建立，Modify 指前步已建立者。

- [ ] **S1 — 建立最小 raw runtime→MOD 路徑**

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

- [ ] **S2 — 完整情境、MOD feedback 與生命週期**

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

- [ ] **S3 — 自動 runtime 驗證與人工驗收交接**

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

- [ ] **S4 — 文件、三工具輔助與交付**

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

- [ ] **R1 — 封閉 smoke 判定缺口**

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

- [ ] **R2 — 前置失敗保留 provenance**

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

- [ ] **R3 — 真實53-case重驗與交付修正證據**

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

## Validation / Acceptance Checks

**TC-PIN／TC-RUNTIME：前置與真實 runtime**

- 驗 SDK gitlink／vendor HEAD／cleanliness、patch、受保護 source；scratch／executable 均在 E021 isolated copies。Clock compatibility 僅在 E021 patch 的 manifest alias wrapper；驗 manifest wildcard 排除／time 與 private alias 實際選取、build 前 pinned-base bytes.equals guard。Provenance 明記 pinned WASM stub／preload descriptor／wildcard 限制、alias-wrapper 選擇、emscripten_get_now 真實單調毫秒來源、patch hash、originalTimeJsSha256 與 originalWasmTimeCSha256；原 Moddable source／工具 pin、IMU／recognizer／Event 不變。Prepare 失敗不留 stale runnable assets，實際 HTTP served runtime／MOD 與 provenance hash 相符才啟用。
- 工具 pins：Moddable 9.5.0 `b6e06ba70506a7381ffb28e09e3175bf4e99f305`；emsdk 5.0.1 `14c18b569f55138fe4963924162244251f454fb0`，Emscripten source `8c5f43157a3f069ade75876e23061330521eabde`；fontbm `7677b908523e909679f67cd5c170396bb9def1aa`。保存 commit／version／SHA-256。本輪 E021 isolated copies／build 已實際驗證，詳 runtime-provenance 與 validation；沒有執行 fresh cold bootstrap。其他實驗結果不替代本題證據。
- MOD ready timeout 5 秒；active case 1 秒無新 raw 消費即中斷。缺工具、provider 或完整 runtime 路徑時停於該階段，保留 blocker，不補 Event。

| Case ID | 操作與判準 |
|---|---|
| TC-POSTURE | 五種姿態各兩個獨立 run：`U×3→目標×3→同姿態×10→U×3→同姿態×3`；第三筆才觸發、維持不重複、恢復後再觸發，raw 軸向／MOD／UI 一致。另驗各方向兩筆後停止無事件。 |
| TC-SHAKE | 兩個獨立 run：`U×3` 後 +y 在 `9.80665／11.30665` 間做 10 次有效連續變化，第 9 次無、第 10 次 shake。 |
| TC-THRESHOLD | 純測試驗模長差 `>=1.2` 與姿態 `0.75` 等號；runtime 用差 `1.199／1.201` 各 10 次及主軸比率 `0.749／0.751`、其他軸未達門檻的向量驗兩側。單尖峰／穩定樣本打斷的 9 次變化不得 shake。 |
| TC-NONE | `U×20`、零向量、三軸等分 unknown 均無六種 Event；不新增 upright Event。 |
| TC-COOLDOWN | 先 shake，再 10 次有效變化；第 10 次 `sampleTicks < 前次shake.event.ticks+1500` 且無事件才證明冷卻抑制，上界跨界則無法判定。其後供 U，某筆 `sampleTicks>=界` 後從下一 poll 開始 10 次有效變化，應再 shake，實際兩 Event ticks 差 `>=1500`；純測試另驗 `1499／1500`。 |
| TC-LIFECYCLE | 缺 provider／native failure／供樣中斷／初始化 timeout 顯示原因停用，fresh restart 可恢復。在待供樣、兩筆姿態、shake 累積 9 次、Event 剛到各停／重啟，新輪不得借舊狀態／callback／次數觸發。Active hidden／pagehide 中止 dispose，返回用 fresh runtime，舊 promise／timeout／trace 不更新新輪。 |
| TC-MOD | raw 順序／ID 完整，C/WASM／MOD 身分相符、原 Event 保留、UI 次數等於 MOD；正常結束不漏已同步實收 Event，不能用預期結果補成功。 |
| TC-EVIDENCE | provenance、case/run、raw／sampleTicks、MOD Event／ticks、UI、操作者類別與判定理由齊全；step markers／artifact paths／文件與實際結果一致。 |

**TC-AUX：三工具的執行邊界**

- **Graphify**：固定 0.9.73 `/Users/andrew/.local/bin/graphify`，每次 CLI（含 version/help）設 `GRAPHIFY_NO_AUTO_REFRESH=1`。目前無 usable graph，採 bounded `rg`＋source reads，將定位／限制記 `evidence/auxiliary.md`；囊括工具不代表 graph-build 授權。若執行時已有 usable graph，先核 revision，使用本題 bounded query、budget 1500，重要關係回 source 核對；不建 graph／cache／stamp／integration。
- **Archify**：只作一張 static `dataflow`，主路徑 raw samples→C/WASM→device.sensor.IMU→原 recognizer→Event→MOD→UI，清楚標 synthetic、custom scratch／原 SDK、nonproduction。繁中 authored content，omit locale，披露固定 Viewer UI／html lang fallback English；不新增動畫或多餘系統圖。執行時才讀 matching schema／common／example，隨後先寫 candidate。每次修改 validate showcase，最後全部 9 checks、0 errors／warnings 才 deliver，保存 spec／HTML hashes receipt。visual-check 用 repo-root，量測 1440×900、1600×1000、1920×1080、2048×1320，檢查 light／dark screenshots；自動 `visualReview:pending` 不冒充人工，實際目視結果另記 auxiliary。兩輪 focused repair 未改善即停並保留診斷，不偽造 pass。
- **PR Lens**：固定 0.11.0 `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens`。僅有合法、真實的 base／head commit SHA 及實際 bounded diff 後才保存 revisions／patch、產圖；S4 尚不具備時記 `pending`、原因及後續派遣，不為圖提前 commit，也不以 working-tree／blob hash 冒充 SHA。正常 review、既有 owner 明確授權與 commit gates 完成後，Implementer bounded follow-up 產本題一個變更圖，保留 unchanged SDK 鄰居及 file refs，Reviewer 核對真實 diff／manifest／SVG。讀本地 example／contract，validate 再 render 到已列外部範圍；真 PR 有既有 `.github/pr-lens.yml` 則唯讀使用，無 overlay 的 scratch 用 `--no-config`。不 npx／install／改 PATH／config，不 provider／upload／server／PR comments。
- 三工具各自記 PASS／FAIL／skipped／pending／未執行及原因；工具失敗以 source／diff 繼續可行審查，不冒稱圖已交付、不改 IMU matrix。PR Lens 因尚無合法 base／head 而 pending，是本輪 creator pass completion 的明確例外：pending 記錄與後續 dispatch 齊備即可交 Reviewer，但 PR Lens 輔助成果仍未完成；取得真實 head 後須 bounded follow-up 並由 Reviewer 核對，才可更新該工具狀態。其他核心及輔助交付判準不變。

**完成判定**：分開 recognizer 純測試、runtime 整合、實際自動操作、人工操作與硬體；硬體 out of scope／未執行。核心全部實際執行才「驗證完成」，全部 PASS 才「實驗成功」。有效前置下違反預期為 FAIL；已嘗試但依賴／證據／時間前提不足為無法判定；尚未嘗試為未執行。Build／unit／圖表成功不替代 runtime 或人工證據，記錄缺漏／截斷不支撐 PASS。

**工程交付分類**：S3 的本輪完成證據限定完整 automated matrix、原始路徑／clock 證據及人工操作程序／NOT_EXECUTED matrix。人工實際操作仍是 full verification 的必要條件，移至 Draft PR 後 STOP POINT 2；此分類只調整交付停點，不把未執行人工案例判 PASS、不繞過獨立工程 review。工程 review／tracker 必區分 S3 工程交接與整體實驗驗收。


**PR21 rework checks — 原完整 AC 不變**

- TC-R21-VERDICT：空／缺案例／unknown或非PASS狀態（含 INDETERMINATE）、FAIL、exceptions、browserErrors 非空或不合法 report 均失敗並 CLI exit1。Full mode 要求非空全部既定53案例且均合法PASS、zero exceptions／browserErrors；E021_ONLY只允許明示diagnostic subset，不宣稱full-suite通過。Pure predicates 可被 runner 與 tests 共用，negative fixtures 不需 browser。
- TC-R21-RAW：以 source-owned getScenario vectors／caseId 作唯讀oracle，Node24 native TS support可供.mjs helpers讀取；正常情境核對完整raw，fault案例核對既定4筆，stop／其他lifecycle核對各停點exact prefix counts與順序。Run/case/sample IDs 為正且歸屬正確、sample順序正確，所有 recorded clocks 有限／同域／非遞減；拒絕 vector變異、zero/錯誤ID、漏／重／亂序與非有限／倒退clock。
- TC-R21-EVENT：保留原 Event shape，核對種類、觸發位置、樣本身分與run/case相關、clock上下界／先後與counts，原scenario timing/cooldown期待不變；缺／多／錯事件、錯clock／correlation／count均拒絕。TC-R21-STOP：sample6 stop案例必須有對應既定 expected Event 和 count，不得在空Event／零count下PASS；保留exact stopped prefix與fresh recovery判準。
- TC-R21-PROVENANCE：隔離 scratch 中 missing／mismatched env 造成失敗時，既有tracked provenance逐byte保留，stale generated runnable移除；成功的public provenance完成後才temp＋rename發布tracked ledger，失敗無partial evidence或殘留temp。真實accepted provenance／runtime bytes不改。
- TC-R21-FULL：修正後完整實際53-case smoke rerun，保存CLI exit、rows、browserErrors、raw/Event/time/provenance correlation與真實畫面，保留previousAttempts；unit/typecheck不能取代該run。TC-R21-DOCS：TOOLCHAIN正確分開已完成human53/53／hardwareOOS與新automation結果；README/summary/counts只採本輪實測，不覆寫accepted人工作業歷史。

## Reviewer Handoff

以下為未來獨立 Reviewer 回填的 canonical output template，`approved|needs-rework` 表示可選 verdict；不是作者作出的本輪核准證據。實際 repo-visible handoff 與依據由 Reviewer 寫 review-log。

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

不需要 release、tag、VERSION、root README 或 production promotion；terminal at merged，無 `merged→released`。本次授權止於 Draft PR／human review，無 merge／post-merge 授權；未來合併也僅保留獨立實驗與證據，正式採用及實機驗證另由 owner 決定。Remote branch 採保留，不自動刪除；日後刪除需 human／policy follow-up。

## Open Questions / Unresolved Items

- 無待 owner 決定的 IMU scope／contract 問題；raw provider、units／clock、fresh runtime 與全案例要求維持鎖定共識，另包含本次 owner 明確授權的 scratch clock compatibility。
- Managed worktree／attached branch 與 SDK pin 已確認；S1／S2 source tests／build 及原 readiness 證據見 review-log，但初次 browser 路徑因 pinned clock stub 失敗。Owner 已授權 compatibility，scope choice 不再阻擋；修正後 automated runtime53/53 PASS/browserErrors=[]，包含頁面生命週期；required 人工53/53 PASS並經獨立 evidence review APPROVED；fullVerification=true僅限本次受控synthetic範圍，硬體未驗。
- 完整 automated matrix／真實證據與 required 人工交接已備齊，Planner completion gate exit0後獨立 Reviewer 已核准工程交付；Draft PR後required人工操作已實際完成53/53且獨立審查核准，保留全部歷史嘗試；目前待owner PR review，無merge/release授權。Optional analysis warning 保持。

Current acceptance checkpoint — 2026-10-15: initial Draft handoff required NOT_EXECUTED/fullVerification=false statements above describe the engineering-delivery boundary at creation. Required actual human operations have since completed53/53 with independent Reviewer APPROVED; final flags apply only to controlled synthetic scope. Original gates/AC/implementation contract and hardware exclusions remain unchanged; no pending human matrix case remains.

PR21 current rework checkpoint — 2026-10-16: five ADDRESS findings require R1–R3 and independent review. Historical53/53 controlled-synthetic human acceptance is preserved; this authoring pass supplies no new test/runtime PASS. No runtime rebuild or human rerun is required while protected bytes stay unchanged. Only verified-and-pushed fixes permit thread replies/resolution under owner authorization; PR remains Draft, no merge/release.
