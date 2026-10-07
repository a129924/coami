# Context Sufficiency 語意案例擴充 — Processed Plan

## Goal / Outcome

建立並凍結 `context_sufficiency_v1`：新增 60 筆人工繁中案例，含可見文字、固定候選、答案、理由及研究／保留分組。v1 僅指新增 60 筆，v0 的 15 筆及 E012 證據不變；獨立 Mission，不編為 E013。

## Scope

- In scope：覆蓋設計、案例、schema、stdlib validator、human-check 包與同版本凍結證據。
- ReadOnly：v0、E012、workflow、概念文件及 production source。
- Written：僅下列五個 Artifact Paths；不另建 schema、step 或測試工件。
- Out of scope：Jev、模型／prompt 改善、通過門檻、runner、安全宣稱、真實兒童、多模態及 production 流程。

Authority：`plan/agent-handoff-workflow.md`、`plan/topic-plan-contract.md`。Optional analysis warning：本 topic 的 requirements.md／technical-spec.md 未建立，analysis layer 為 INCOMPLETE；Owner 已確認的 bounded dataset 決策完整，不藉此新增分析工件。

## Locked Decisions

沿用 v0：SUFFICIENT 表示可見文字支持一個合理、低風險主要意思，不需更多關鍵資訊；INSUFFICIENT 表示至少兩個合理意思導向不同回應，須追問。不鎖 label 比例、不以 category 推答案、不用模型作裁判。

| coverage_category | research | holdout | total |
| --- | ---: | ---: | ---: |
| explicit_reference | 7 | 3 | 10 |
| multiple_meanings | 7 | 3 | 10 |
| irrelevant_background | 7 | 3 | 10 |
| keyword_misdirection | 7 | 3 | 10 |
| meaning_without_keyword | 6 | 4 | 10 |
| conflicting_context | 6 | 4 | 10 |
| Total | 40 | 20 | 60 |

- 每案一個 primary category；其他特徵記 rationale，不重計。
- 十二 topics：toy_car、water、ball、hug、food、sleep、parent、book、outside、clothing、drawing、blocks；各至少一案，各 category 至少兩 topic。
- 部分對照加獨立案例；至少三個不同 topic 有同 utterance、不同 context、跨兩 label 的同組對照；research 至少兩 topic、holdout 至少一 topic。
- group 可單案或多案；刻意對照、同情境近義改寫與無關細節變體整組同 split。
- 撰寫前在新版 README 固定全部 60 slots 的 id／category／topic／group／split 並記 hash；不預填 label／文字／候選。變更 slots 先回覆蓋核對，不依模型成績調整。
- Holdout repo 可見，禁止用於選擇改善方式，不宣稱 unseen。
- UTF-8 JSONL，v0 core fields 加 coverage_category／split／group_id；ID `cs_v1_NNN`。Conversation 2–5 turns，每turn恰含speaker／text，其他key拒絕以防oracle／模型觀察洩漏；speaker 為 parent／child／robot，context_type 為 clear／ambiguous／irrelevant，不鎖配額。
- 固定 COMPANION／ALLOW；SUFFICIENT→DELIVER_ANSWER、INSUFFICIENT→DELIVER_QUESTION。S interpretation 非空，I 為 null，I rationale 至少兩合理意思與回應差異。
- 模型僅取 background／conversation／utterance；Output 可另取 candidate_text，其餘均為 metadata／oracle。
- 無 stable-library、公開 API 或裝置合約變更，無新增依賴。

## Boundaries / Exclusions

不擴 Parent／Safety、阻擋情境；不使用隱藏影像、手勢、記憶或作者私有資訊。候選只確認意思或釐清一件事，不代人承諾動作。E012 車車差異只作風險線索，不訂特例、改 v0 或大量複製題型。分歧修訂或替換，不為配額硬套答案。

Implementer 寫修；Tester 提供證據；Owner 接受答案；獨立 Reviewer 判語義；Planner 核對同 snapshot 證據。計畫批准與技術 draft review 不代替 fixture review。

## Status / Allowed Transitions

Current：approved（PR #12 第二輪correction draft v1-draft-003；122checks與bounded技術重審完成，待Owner確認本輪commit訊息後publish／thread回覆resolve與human review；oracle未接受、未凍結）。先固定 slots／核對，再撰全文、驗證、Owner human check、獨立 fixture review、matching-evidence gate、freeze。

Canonical：planned→creator-in-progress→review-ready→reviewer-in-progress→approved 或 needs-rework；needs-rework→creator-in-progress；approved→creator-in-progress。Freeze 是資料標記。Snapshot 改動重走驗證／Owner／fixture review，保留歷史。

Owner 最新指示（2026-10-07）覆蓋對話計畫原先的「不含 commit／push」：在獨立 feature worktree 實作，無重大問題時按 topic commit→push→human review。允許經獨立技術審查的未凍結 draft 以 approved→publish-in-progress→pr-open 交付；此 approval 只指 draft 技術交付，不指 oracle。Owner 逐案接受前，fixture review 與 freeze 保持 pending；不 merge／release。

## Artifact Paths

| Artifact | Exact path | Writer |
| --- | --- | --- |
| Plan | plan/context-sufficiency-semantic-expansion/context-sufficiency-semantic-expansion.plan.md | Implementer 記錄已確認契約 |
| README／schema／slots | evaluation/context_sufficiency/versions/v1/README.md | Implementer |
| Dataset | evaluation/context_sufficiency/versions/v1/context_sufficiency_v1.jsonl | Implementer |
| Validator | evaluation/context_sufficiency/versions/v1/validate_dataset.py | Implementer |
| Review／evidence | evaluation/context_sufficiency/versions/v1/review.md | Implementer 原樣記錄各方證據 |

README／dataset／validator 三個 SHA-256 定義 exact snapshot；review.md 不入 hash。記錄撰寫前 README baseline、v0 frozen baseline 與完成核對。表外變更先回 planning。

## Implementation Steps

- [X] 1. 建立 README/schema、覆蓋表、60 slots 與 review 結構，記 pre-authoring hash；先不填內容與答案。
- [X] 2. 按 slots 撰寫 60 案、候選與理由，建立跨主題對照；不邊寫邊重分 split。
- [X] 3. 建立 stdlib validator／CLI，驗結構與配置，不推語義。
- [X] 4. 整理 human-check 包、覆蓋／group 摘要與 snapshot，完成 Tester 本機證據。

核取僅記 creator 工作，不代表 Owner／fixture review／freeze 完成。

## Validation / Acceptance Checks

Python 3.10+ stdlib：`python3 evaluation/context_sufficiency/versions/v1/validate_dataset.py [candidate.jsonl]`。預設相鄰 dataset，其他 cwd 亦可用。Success 0 輸出 counts／matrix／topics／groups；failure 1 有 line／ID／配置錯誤，不 traceback、不改檔。

檢查必要欄位、非空文字、型別、enum、唯一 ID、2–5 turns、speaker、interpretation、policy／Action；60、六類各10、40／20 matrix、十二 topic、各類至少兩 topic、同 group 同 split、完整 visible input 不重複、對照最低配置。

Tester 暫存負例：malformed JSON、duplicate ID／input、缺欄、enum／turn 錯、interpretation／Action 錯、數量／matrix／topic／對照不足、group 跨 split；預期 exit1 無 traceback。結構有效但語義錯誤的暫存案例應通過，證明不是程式推答案。核對 v0／E012／正式資料不被測試改動。

Tester 逐案比對全部60筆 id／category／topic／group／split 與 README 先固定 slots 完全一致並記證據，不能以總數或 matrix 代替，不另建 parser／工件／gate。

Owner 全60逐案或明示接受 exact snapshot 全部；獨立 fixture Reviewer 先只看三可見欄中性編號自行判斷，再比 oracle，檢查主意思／競爭意思、候選、理由、對照、隱藏資訊、機械複製、同情境跨 split。Matching 驗證、Owner接受、fixture approved 無 blocker 經 Planner 核對，Implementer 才記 FROZEN。

## Reviewer Handoff

以下為合約，非實際 verdict；各種 review phase 必須在 review.md 分別記錄。

```json
{"verdict":"approved|needs-rework","blocking_issues":[],"copilot_feedback_triage":{"ADDRESS":[],"DISCUSS":[],"SKIP":[]}}
```

有語義／分組／版本／workflow blocker 即 needs-rework。人審前的技術審查不可當 fixture approval。

## Post-merge / release actions

Owner 已授權本 topic commit／push 交 human review；所有檔案只在 feature worktree。無 merge、release、VERSION、root README 或 production 變更。先交未凍結 draft，停止在 human boundary；Owner 接受及後續 fixture review 完成後另記 freeze，不預稱已完成。

Freeze 後若有 oracle 錯誤，另版本／任務保留 v0／v1、歷史答案、原因與成績。Jev、改善與threshold留後續 Mission。

## Open Questions / Unresolved Items

需求決策無未解項。Owner 已接受計畫與執行方向，尚未接受60筆答案。Optional analysis 缺失已明示；repo計畫、實作驗證／技術審查與 fixture lifecycle 證據分別記 review.md，不相互代替。

PR comment rework：六個threads均ADDRESS。保留固定slots與分組，049/050換成不同活動；054/055/058依既有可見文字更正S；validator按實際檔案行讀取。新002 snapshot重新驗證與Owner/fixture review，舊001證據保留，不因關thread宣稱已freeze。

PR comment第二輪：028洗手用水、029拒絕被抱以去除跨split近義；model-visible turn恰含speaker/text，oracle/模型觀察額外key拒絕。slots不變，README只同步schema；新003 snapshot全量重驗、Owner／fixture review/freeze仍pending，002證據保留。
