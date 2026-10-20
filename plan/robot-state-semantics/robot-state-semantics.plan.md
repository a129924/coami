# Robot State 正式語義計畫

## Inputs

- Topic：`robot-state-semantics`；日期：2026-10-19。
- 使用者已批准本主題語義與文件交付範圍，並授權 feature worktree 實作、依 topic commit、push、Draft PR，最後停在 human review，不 merge。
- Feature worktree：`/Users/andrew/.codex/worktrees/7afe/coami`；branch：`docs/andrew/robot-state-semantics`；base：`d7ff0368a4e7d3ecd36d79a955745baae8b3c756`。禁止在 dev worktree 實作。
- **Semantic warning / analysis sufficiency: INCOMPLETE**：`analysis/robot-state-semantics/requirements.md` 與 `analysis/robot-state-semantics/technical-spec.md` 均不存在；本計畫依已批准需求及既有來源建立，不建立 analysis，不宣稱 strict analysis mode。這是 optional analysis 缺失的警示，不代表已通過正式 planning gate。
- 主要唯讀依據：`docs/robot-action-event-catalog.md`、`docs/limitations/robot-gaze.md`、相應 EXXX 原始紀錄與必要 SDK source。目錄覆蓋 E001–E024；E025 錄放與 server bus 證據另外閱讀，不假設目錄已收錄。

## Goal / Outcome

建立 `docs/robot-state-semantics.md`：依已驗證 Action／Event 定義 Robot 自身的控制與觀測狀態、粒度、進入／解除證據、資源衝突與六組驗收情境。區分已觀測事實、新控制政策、待驗證行為，讓後續實作者不需依賴聊天紀錄。

交付是文件及外部本地視覺輔助；owner 已於 2026-10-20 明示授權先發布文件 Draft PR，Archify visual failed 須揭露且不再阻擋文件發布，不再修 candidate；`ts-implementation` 是 delivery label，不是 TypeScript runtime 實作承諾。完成後以 Draft PR 交人審。

## Scope

- **In scope**：本計畫、Robot State 語義文件、外部 Archify lifecycle 圖與 PR Lens 真實 diff 變更圖；Graphify 僅既有 graph 的有界導航，無 graph 則來源搜尋。
- **Out of scope**：新增 TS、API／wire schema、timeout／scheduler、production 架構、SDK patch、新實驗、實機／設備驗證、改動現有 catalog／experiments／vendor、Graphify 建圖／refresh、工具安裝、PR Lens 上傳、merge／release。

## Locked Decisions

### 交付與證據層級

本主題 review-ready-only，沒有 stable-library surfaces，README、VERSION、release notes 均不變。`step_profile=base-plan` 僅為未來 tracker 合法選項；本次不新增 profile、不建立 `.step.md`，亦不呼叫 Step-Creator。

Archify 是本地輔助，deterministic passed 與 visual failed 分開報告，不能宣稱完整視覺驗收成功，不上傳圖。此 owner 授權僅調整文件發布 gate，不改 State 或 Robot 行為政策。

State 採可並行維度，不能以單一 idle/busy 掩蓋活動。證據限 browser／WASM simulator；真 webcam、scratch input、synthetic sample 必須分別標示，不代表實體 Robot 驗證。SDK 宣告、接受要求、開始證據、操作結果、實際效果、完整實驗結論各自區分。

### 活動四態

錄音、音訊輸出、頭部執行各自使用以下語義：

| State | 定義 |
| --- | --- |
| `inactive` | 已確認沒有該活動。 |
| `requested` | 已接受要求並保留資源，尚未確認開始。 |
| `active` | 同一操作已有開始證據。 |
| `unknown` | 是否開始或終結無法確認，保留資源。 |

- 錄音：capture 開始才 active；同次 capture 可靠終結才 inactive。不表示 ASR。
- 音訊輸出：確認播放開始才 active；可靠播放終結才 inactive。Say 開始合成不等於播放。
- 頭部：MOD 開始受管理序列才 active；序列可靠終結即可 inactive，姿勢到位／馬達停止另記觀測。僅序列終結不明才保留該活動 unknown。
- 成功、失敗、取消是操作結果，不能只憑結果名稱釋放資源。unknown 不靠 timeout、Server cancel、重新要求或猜測自動解除。
- `say/tone/playAudio` 是輸出種類，`nod/shake/greet` 是 Action／組合，不為每個動作新增 State。

### Session 與單次 capture

Camera、top-touch sampling、IMU sampling 各自為 `off → start-requested → on → stop-requested → off`；無法確認的轉移為 `unknown`。

下表是**新增控制政策，非 SDK 保證**：

| 現況 | start | stop |
| --- | --- | --- |
| `off` | 接受，進入 start-requested | 無需執行，維持 off |
| `start-requested` | 拒絕 busy | 拒絕 busy |
| `on` | 拒絕 busy | 接受，進入 stop-requested |
| `stop-requested` | 拒絕 busy | 拒絕 busy |
| `unknown` | 拒絕 | 拒絕，不假設可安全停止 |

初始化先 unknown；本次初始化確認尚未啟動，或取得可靠停止證據，才能 off。接受要求不等於啟停完成，失敗後依確定結果更新，結果不明維持 unknown。

Camera 單次 capture 另用活動四態：僅 session=on 且無既有 capture 才接受；capture requested／active／unknown 時拒絕新 capture 與 stop，不排隊。capture 可靠終結後須重新要求 stop。舊 session 晚到 frame／結果不能更新新 session。來源另標 webcam／synthetic／unknown，fallback 不算 webcam 成功。E008 僅支持限定環境的啟停；sampling 限 E017／E021 scratch／synthetic 條件，矩陣不是已實作政策。

### 持續屬性與輸入

| 類別 | 粒度與規則 |
| --- | --- |
| 表情 | neutral／angry／sad／happy／sleepy；E005 doubtful／cold／hot 為失敗，不納入已驗證效果。Sleepy 不等於睡眠。 |
| 眼睛／嘴巴 | 左右眼與嘴巴張開程度；確認限已觀察值／序列。Blink／wink 是修改屬性的 Action。 |
| 主畫面 | 臉部／已驗證實驗 Piu 主畫面；效果確認才更新。 |
| Pose | 要求姿勢與確認姿勢分開；Promise 不證明到位。 |
| Gaze target | 要求目標、確認已設定／清除、未知；lookAway 不證明回正或取消既有運動。 |
| Button／top contact | 最後觀測 pressed／released／unknown；來源失效後目前狀況未知，不補造 release。 |

各屬性區分要求值、最後確認值、目前是否未知；後續確認取代前值，歷史確認值不能冒充目前實況。持續屬性保存本身不永久占執行資源，gaze 持續控制另依下述政策。

A/B/C、top press/release、swipe、IMU 六種 motion、Piu began/moved/ended 歸輸入 Event。Press/release 可更新快照；swipe、shake、fallen、upsideDown 保持瞬間事件。缺復原證據不建立可自動解除的 fallen State。C release 僅來源支持；Piu cancelled handler 有純測試支持，實際送達未確認。原始 input.touch callback 不以 Piu 成功替代。

### 資源與衝突

以下均為新增控制政策，不是 SDK 已有互斥保證：

- 錄音與音訊輸出互斥；同資源 requested／active／unknown 時拒絕新要求，不排隊、不自動搶占。
- 複合 Action 啟動前檢查全部資源，任一衝突即整組拒絕。
- 資源為麥克風、音訊輸出、頭部、外觀、主畫面、camera、top sampling、IMU sampling。表情、雙眼、嘴共用外觀。

| 操作 | 完整資源 |
| --- | --- |
| Record | 麥克風 |
| Tone／playAudio | 音訊輸出 |
| Say | 音訊輸出＋外觀；runtime 嘴型更新保守納入 |
| SetPose／lookAt | 頭部 |
| 表情／眼嘴寫入 | 外觀 |
| 主畫面切換 | 主畫面 |

E005 每個具名序列最後均 `neutral()`，會寫表情、雙眼、嘴與頭部，因此全部保留外觀＋頭部。Greet、實驗 stop/reset 同樣按完整步驟判定，不能只看名稱。

Gaze 從接受要求持有頭部直到確認 lookAway 已清除；期間拒絕外部 setPose、頭部序列、新 gaze；同 gaze 工作內修正仍屬原工作。頭部序列 inactive 不代表 gaze 已釋放頭部。Camera／sampling 合法 stop 屬同 session 轉移，依矩陣處理。

觀測如實保留重疊：E025 stock 路徑九筆錄放重疊不能改寫 idle 以迎合政策；八筆未保存逐筆聽辨的限制保留。

### 來源與限制保留

文件必須將每組 State／Action／Event 連至 catalog 穩定 ID 及必要直接證據；E025 不在目錄範圍者直接引用原紀錄。

- E005：17 個可見成功、3 失敗；E006 tone／playAudio；E007 錄音與同 buffer 回放，不證明 ASR。
- E008：webcam 與 synthetic fallback 分層；E009／E011 Piu；E017 top-touch 限 scratch raw input；E021 六種 IMU motion 限 synthetic。
- E018 完成保證僅 strict WebAudio bridge，不能外推 stock／實機／中文。
- 保留 E015、E016、E020 正式無法判定與證據缺口；保留 E019 整體失敗、E023 11 成功／4 失敗及近中心限制。不得重判。
- E025 listening/saying 真實錄放重疊與 E025 server async event bus 的 synthetic 測試是不同實驗；server 240/240、timeout／cancel 不證明 Robot 已停止。
- ASR、sleep、remoteSession、原生 video、通用 stop 均不列已驗證 State。

## Boundaries / Exclusions

Plan-Creator 只寫 topic plan；Implementer 只寫語義文件與下列外部產物，批准計畫對其唯讀。獨立 Plan-Reviewer／Reviewer 判斷 gate，不由作者自批。Planner 判 readiness 與 scope／contract drift。主代理依批准結果 publish；使用者已授權 commit／push／Draft PR，不能因舊計畫停點省略發布；最終停 human review，不 merge。

超出兩個 repo artifact、重開鎖定語義、需新 runtime／實驗／tracker 時，停止該部分並交 Planner，不隱含擴 scope。Review 回饋控制路由時，等效 review 記錄內嵌本計畫或列明外部交接紀錄，不新增第三個 repo 檔。

## Status / Allowed Transitions

- **Current**：`approved`。本次有界計畫修訂已由正式 Plan-Reviewer 核准、blocking_issues=[]，Planner 已明示可前進本地 topic commit；文件獨立核准仍有效。這是 commit 前快照，不代表已 push 或開 PR。
- **Execution model**：Plan-Creator → independent Plan-Reviewer → Planner readiness → Implementer（文件與本地 Archify 輔助）→ independent Reviewer（文件核准、圖失敗如實揭露） → main agent 本地 topic commit → 真 base/head PR Lens map validate/render 與有界複核 → push → Draft PR → human review。一般修正依 scope 由獨立 Implementer 回修；contract／workflow 問題先回 Plan-Creator，經獨立計畫審查與 Planner 路由。
- **Allowed transitions**：`planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress`；`reviewer-in-progress` → `approved` 或 `needs-rework`；`needs-rework` → `creator-in-progress`；`approved` → `creator-in-progress` 或 `publish-in-progress`；`publish-in-progress` → `pr-open` 或 `merged`；`pr-open` → `needs-rework` 或 `merged`；`merged` → terminal。
- Canonical merge transitions 保留不代表本輪授權 merge；本輪停止 `pr-open` 等待 human review。沒有 release transition。
- 不使用 tracker completion gate，因本輪無 `.step.md`；依本計畫三步 Actual 與獨立 reviewer 的明示證據判定。不得宣稱未執行 gate 通過。沒有 topic round cap，也不推定全域 cap。

## Artifact Paths

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Topic plan | `plan/robot-state-semantics/robot-state-semantics.plan.md` | Plan-Creator | 執行合約與必要內嵌交接記錄 |
| 語義文件 | `docs/robot-state-semantics.md` | Implementer | State 與政策可追溯定義 |
| Archify spec | `/private/tmp/robot-state-semantics/archify/lifecycle.json` | Implementer | 外部 lifecycle candidate |
| Archify HTML | `/private/tmp/robot-state-semantics/archify/lifecycle.html` | Implementer | 外部互動圖 |
| Archify receipts | `/private/tmp/robot-state-semantics/archify/validation.json`、`/private/tmp/robot-state-semantics/archify/delivery.json`、`/private/tmp/robot-state-semantics/archify/visual-check.json` | Implementer | 驗證／交付／containment 記錄；visual-check 自動 sidecar／截圖限定同一外部 archify 目錄，記錄實際輸出路徑 |
| PR Lens graph | `/private/tmp/robot-state-semantics/pr-lens/graph.json` | Implementer | 真 diff 概念變更圖 |
| PR Lens outputs | `/private/tmp/robot-state-semantics/pr-lens/rendered` | Implementer | CLI 生成 manifest／SVG，記錄實際檔名 |
| 工具與審查證據 | `/private/tmp/robot-state-semantics/evidence.md` | 各角色 | 命令、結果、SHA、人工視覺狀態、review 路由 |
| 計畫審查 | `/private/tmp/robot-state-semantics/plan-review.json` | Plan-Reviewer | 獨立 planning verdict |
| 實作審查 | `/private/tmp/robot-state-semantics/implementation-review.json` | Reviewer | 獨立文件與 Archify verdict |
| 驗證彙整 | `/private/tmp/robot-state-semantics/validation.json` | 驗證角色 | path、link、diff 與工具結果 |
| Map 複核 | `/private/tmp/robot-state-semantics/pr-lens/map-review.json` | Reviewer | 本地 commit 後的圖與真 diff 一致性 |

只有前兩個路徑可寫入 repo。`README.md`、`VERSION`、`.github/copilot-instructions.md`、既有 catalog／experiments／vendor／governance／config／graphs 均不改。外部 runtime 暫存及 deliver 私有 snapshot 只限指定外部目錄。工具若要求超出列明邊界，不擅自擴充。

## Implementation Steps

### Step 1：語義文件與來源核對

| Label | Planned | Actual |
| --- | --- | --- |
| In-Scope | 將 Locked Decisions 的完整語義、政策、來源追溯與六組驗收寫入語義文件。 | 已完成語義文件；獨立 Reviewer docVerdict=approved。 |
| Out-Of-Scope | Topic plan 修改、其他 repo 路徑、runtime/API/production/integration、新實驗與設備驗證。 | 維持排除範圍；未新增 runtime／API／實驗或設備驗證。 |
| ReadOnly | 批准計畫、catalog、限制、實驗原紀錄、必要 SDK source、治理與 skills。 | 批准計畫及來源唯讀；無可用 Graphify graph，以 rg／source fallback，未 build／refresh。 |
| Written | 僅建立尚不存在的 `docs/robot-state-semantics.md`。 | 已建立 `docs/robot-state-semantics.md`；SHA-256 `50aa17d18102fdbcab15b51017f4a330b788e3f2a83958c9a8b0875cad87b776`。 |
| Deleted | none | none；未刪除檔案。 |
| Modify | 僅修訂已存在的 `docs/robot-state-semantics.md`。 | 本步為新建文件；未修訂既有來源，allowlistVerdict=approved。 |
| Goal | State 粒度、進入／解除、政策與證據完整可追溯。 | 文件粒度／轉移／政策與來源獲獨立核准；semanticSourceBlockers 為空。 |
| Non-Goal | TS runtime、production、integration、新實驗、實機驗證。 | 未新增 TS、production、integration、實驗或實機驗證。 |
| TestCase | 六組驗收、Action/Event 覆蓋、來源限制與批准計畫一致性。 | 六組 TC 以文件／source 核對；96 相對檔案連結、64 explicit anchors 無 missing；未跑 runtime 測試。 |

Graphify 固定 `graphifyy 0.9.73`；CLI `/Users/andrew/.local/bin/graphify`。每次 invocation 均設 `GRAPHIFY_NO_AUTO_REFRESH=1`。有既有 graph 才 bounded query/path/explain（query budget 1500），核對 revision 並回來源確認；無可用 graph 用 `rg`／來源讀取，不 build、refresh、extract、安裝、整合或另造關係。圖工具不構成 Robot 驗證。

### Step 2：Archify lifecycle 本地輔助

| Label | Planned | Actual |
| --- | --- | --- |
| In-Scope | 以本地 lifecycle 圖輔助呈現轉移與政策；視覺失敗不阻擋文件 Draft PR，明示限制。 | 已產生本地 HTML；deterministic passed、visual failed，依 owner 授權保留為失敗視覺輔助。 |
| Out-Of-Scope | 新 State／復原政策、production 架構、Robot 新證據。 | 未新增語義、復原政策、production 架構或 Robot 證據。 |
| ReadOnly | 最終語義文件、Archify skill、lifecycle/common schemas 與 matching example。 | 文件與 skill／schema／example 作為唯讀依據。 |
| Written | 外部 lifecycle.json／HTML／receipts／visual-check sidecar 與截圖。 | 已執行 validate／deliver／visual-check，產物留外部；HTML SHA-256 `f764748fc8f69b8d6c4f76da64c0126d7a6e1eec57465347ed36e2e3478b95a3`。 |
| Deleted | none | none；未刪除檔案。 |
| Modify | candidate 已凍結，不再修圖，只保留真結果。 | 初始 schema 修復及兩次 focused 修正後，owner 授權第三輪僅 width 1100→1080；spec SHA-256 `e59773183758632f48d8507a52dc3bd4574a2670c96e059a77d100f67c8fe95e`。此後不再修改。 |
| Goal | 保留本地語義輔助與真驗證結果，視覺失敗不冒充成功；文件依獨立核准 gate 發布。 | deterministic passed；完整視覺目標未達成，visual failed 已揭露，依 owner 明示授權不阻擋文件 Draft PR。 |
| Non-Goal | Runtime、production、自開 preview、repo 圖檔。 | 未實作 runtime／production，未開 preview，未寫 repo 圖檔。 |
| TestCase | 記錄 showcase、deliver hashes、四尺寸 containment 與人工檢視真結果；不要求失敗圖通過後才發布文件。 | validate／deliver 9/9、零 error/warning；visual-check failed：1440×900 scrollHeight=1136、1600×1000=1208、1920×1080=1208 均 overflow；2048×1320 containment pass，但空白 Outcomes 與整體版面人工視覺判定 failed。 |

使用 static、classic、`meta.quality_profile=showcase`；維持獨立維度語義，不造 unknown 自動解除。已依 skill 執行 validate → deliver → visual-check，外部 artifact 不加 `--repo-root`；四尺寸為 1440×900、1600×1000、1920×1080、2048×1320，light/dark 小／大截圖已實際檢視。自動 receipt 的 visualReview=pending 不冒充人工通過，本次人工 verdict=failed。繁中內容，Viewer UI／html lang fallback English。Owner 授權文件發布不是工具視覺驗收通過；不再修 candidate、不上傳、不自動安裝。

### Step 3：真實 diff 變更圖與交接

| Label | Planned | Actual |
| --- | --- | --- |
| In-Scope | 依兩份文件真 diff 建立本地概念變更圖供獨立審查。 | 未執行；延後至文件及本次有界 gate 修訂核准、本地 topic commit 取得真 HEAD。 |
| Out-Of-Scope | Upload、PR Lens 發布/留言/config 修改、Graphify 建圖、工具安裝。 | 未 upload、發布圖、改 config、建圖或安裝工具。 |
| ReadOnly | 真實 diff/base/head、必要來源、未變鄰居與既有 config。 | 尚未取得本地 topic commit 的 head，未宣稱最終 diff provenance。 |
| Written | 外部 graph.json、rendered、provenance 與 evidence.md。 | 未建立最終 PR Lens graph／rendered／map receipt；結果須留外部。 |
| Deleted | none | none；未刪除檔案。 |
| Modify | 僅外部 graph；repo 回修依原 owner 與允許範圍交接。 | 未修改外部 graph 或 repo 檔案。 |
| Goal | Reviewer 可對照真變更、證據與未變邊界。 | 未達成；待真 base/head 與 map 複核。 |
| Non-Goal | 取代 correctness review／Robot 驗證、擴大 topic、工具上傳。 | 未以圖替代 correctness review／Robot 驗證，未擴 scope。 |
| TestCase | 圖與 diff 一致、真 SHA/來源、未變鄰居、validate/render 與 manifest 核對。 | 未執行；待 local commit 真 SHA 後 validate/render 與 manifest 核對。 |

此步最終作圖在文件獨立審查 approved、本次 owner 授權的 gate 修訂經正式計畫複核與 Planner 路由，且主代理完成本地 topic commit 後，於 push 前執行。Archify visual failed 是已接受的文件發布限制，不要求其轉為 approved。provenance.base/head 必須為實際 commit SHA；不以 working tree 冒充 head，不將最終自身 SHA 回填 repo 造成循環 commit。Repo Actual 可記「延後至本地 commit 取得 HEAD」；最後執行結果與 SHA 留外部 receipts。Map 複核僅驗證圖與真 diff，不取代先前文件 correctness review；阻擋性文件問題仍回正式修正與審查路由。

PR Lens 固定 CLI 0.11.0：`/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens`。以已記錄 base 與本地 topic commit 真 HEAD，讀 `git diff --find-renames <base>...<head>` 及必要上下文；不捏造 provenance。依 example／graph-document 著圖，包含 delta=unchanged 直接鄰居及來源位置；validate → render 至外部目錄，讀 manifest。若無 `.github/pr-lens.yml` 用 `--no-config`，有則唯讀套用。圖若誤導或增加負擔，退回直接 diff review。禁止 PR Lens canvas/push/auth/analyze/API/upload/PR publication；主代理以一般 Git/GitHub 流程依使用者授權發布 Draft PR，不將圖上傳或附加。

## Validation / Acceptance Checks

1. 錄音→播放、播放→錄音、同資源再入拒絕後到要求；觀測仍可表達真重疊。
2. 頭部序列可靠終結可 inactive、Pose 仍未知；序列終結不明保留 unknown。
3. 完整啟停矩陣；capture 中 stop 拒絕且不排隊，終結後重提；舊 frame 不污染新 session。
4. E005 全部具名序列檢查外觀＋頭部；gaze 未確認清除不讓頭部 Action 搶占。
5. 瞬間 Event 不永久卡住 Robot；缺 release／復原不補造解除；歷史值不冒充現況。
6. Server timeout／cancel、server synthetic 240/240 不證明 Robot 停止；E018 strict 保證不外推。
7. 所有語義與本計畫一致；既有失敗／無法判定／環境限制保留，追溯連結可解析，git diff 僅兩個 repo 路徑且無 whitespace error。文件變更不要求新增鏡像 unit test，未重跑 Robot／TS runtime 測試須明示。
8. Archify 9 項 showcase／deliver receipt／四尺寸視覺證據依真結果交接：deterministic passed、visual failed，保持本地且不再修 candidate；owner 已接受此限制，不是文件發布 blocker。PR Lens 真 diff／provenance／manifest；Graphify 無 graph 的 fallback 透明記錄。工具失敗不得報成功或改成 Robot 行為證據。
9. Plan-Reviewer 與 Reviewer 獨立回傳下節 JSON，Planner 判 readiness；實際 Actual、狀態與 review evidence 由 Plan-Creator 據可靠證據同步，不預填成功。檢查 feature worktree 與分支，dev 工作樹無本主題變更。
10. 發布前遵守 git-commit-convention，依已授權 topic 範圍準備 commit message／staged diff，父代理處理確認與發布。push 後 Draft PR 對 dev，PR 描述含變更、驗證、限制，保持 draft，停 human review。

### 交付審查與 owner 決策紀錄（2026-10-20）

正式初稿 Plan-Reviewer approved、blocking_issues=[]；所審計畫 SHA-256 `ad4308456e8d75ec9849d82bf0ca5d65b490b514a7ed16b190424c9958bec9fc`。Planner preflight ready。文件 SHA-256 `50aa17d18102fdbcab15b51017f4a330b788e3f2a83958c9a8b0875cad87b776` 獨立 docVerdict=approved、allowlistVerdict=approved、semanticSourceBlockers=[]；96 相對檔案 links、64 explicit anchors 無 missing，未跑 Robot／runtime tests。

歷史：初始 schema 修復及兩次 focused geometry 修正後仍有 desktop-readability error，當時必要圖 gate 阻擋。Owner 隨後授權第三輪僅 width 1100→1080，validate／deliver 已 9/9、零 error/warning。Visual-check 三個較小尺寸垂直溢位，最大尺寸 containment pass，但空白 Outcomes 與版面使人工視覺判定 failed。外部 implementation-review.json 的 deterministic passed／visual failed 保留；其中 requiredVisualGate=blocked／nextBoundary=owner-scope-decision 為 owner 最新決策前的歷史 verdict，不再代表當前文件發布 gate。

Owner 對「先發布文件 Draft PR，Archify 明列 visual failed 本地輔助，調整必要門檻」明確回覆 Execution Authorized。本次依此取消圖對文件發布的阻擋，不宣稱圖通過、不再修 candidate、不改 Robot State 語義。commit by topic、push、Draft PR 已授權，不重複要求確認。最新有界計畫 SHA-256 `4d6b0a68599654df32a2443b44e9fe268cef610f5c98e1b7033102dfb68b0158` 已由正式 Plan-Reviewer approved、blocking_issues=[]；Planner 於 2026-10-20 明示可前進本地 topic commit，正式 verdict 與路由證據留外部。真實本地 commit 後才執行 PR Lens，最終 SHA／map receipts 留外部，避免循環 commit。

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

本輪不 merge；Draft PR 後停 human review。若人類後續授權 merge，無額外 post-merge 或 release action，無 README／VERSION／release notes 更新，merged 為 terminal。外部圖只供本機人審，不上傳、不發布。

## Open Questions / Unresolved Items

沒有阻擋語義文件的產品問題；optional analysis 缺失警示保留。文件已獨立核准；Archify deterministic passed、visual failed 是 owner 已接受的文件發布限制，不是未決產品問題，不再修 candidate。本次有界 gate 修訂的正式 Plan-Reviewer 複核與 Planner 路由均已完成；接續本地 topic commit、真 SHA PR Lens、push、Draft PR。此為 commit 前快照，尚未宣稱已發布；最終執行結果與 SHA 留存外部，避免循環 commit。完成已授權發布後停 human review，不 merge。
