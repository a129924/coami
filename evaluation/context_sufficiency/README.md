# Context Sufficiency Scenario Oracle — v0

## Goal and lifecycle

這是 E012 的前置資料集：逐案寫好幼兒短句、可見背景、候選回答或追問，以及預期 policy／Action，再由 owner 人工確認為固定 oracle。

流程是 **Codex draft → owner human check → 獨立 Reviewer review → freeze**。資料是否已凍結，以 [review.md](review.md) 的同版本證據為準；檔名 `context_sufficiency_v0.jsonl` 本身不代表已通過人工審查。Codex 自檢、validator 通過與先前的計畫審查都不能替代 owner human check 或獨立的 fixture review。

本 topic 到 freeze 結束。真實 Jev 呼叫，以及「預期 → Jev 判斷 → 程式 Action」對照，留給 E012；目前資料不含模型觀察結果。

## Label and policy definitions

- `SUFFICIENT`：可見文字足以支持一個合理、低風險的主要 interpretation，不需先取得更多關鍵資訊即可繼續 conversation；不要求百分之百確定。
- `INSUFFICIENT`：至少兩個合理 interpretation 會導向不同的後續回應，應先取得關鍵資訊。本版固定選擇追問。

| Context label | Candidate type | Expected final Action |
| --- | --- | --- |
| `SUFFICIENT` | 確認主要意思的簡短回答 | `DELIVER_ANSWER` |
| `INSUFFICIENT` | 釐清一件事的簡短追問 | `DELIVER_QUESTION` |

全部案例的 `expected_input_policy` 為 `COMPANION`，`expected_output_policy` 為 `ALLOW`：孩子輸入留在 Companion 路徑，事先寫好的候選文字適合放行。這些是 fixture 預期值，不是已實作的 Jev API enum 或 production contract。Context label 與 Input／Output Policy 是不同判斷；不能把 `SUFFICIENT` 當作 Input Policy。

`DELIVER_*` 只表示預期送出的文字類型，不表示已送達孩子、執行機器人動作或觀察到程式 Action。候選不得代照顧者承諾購買、取物或執行動作；本版所有候選都只確認意思或提問。

## Fixture schema and visible input

Dataset：[dataset/context_sufficiency_v0.jsonl](dataset/context_sufficiency_v0.jsonl)。UTF-8 JSONL，每一行是一個 object，以下欄位均必備。

| Field | Contract |
| --- | --- |
| `id` | 唯一字串，`{topic}_{context_type}_{NNN}`，尾碼為三個數字 |
| `topic` | 下表九種分類 metadata，不是 inference output |
| `context_type` | `clear`、`ambiguous` 或 `irrelevant`，描述前文類型，不自動決定 label |
| `background` | 非空文字；沒有額外背景也明寫，不能隱藏作者才知道的資訊 |
| `conversation` | target utterance 之前的 2–5 turns；每 turn 含 `speaker`、非空 `text` |
| `speaker` | 只可為 `parent`、`child` 或 `robot`；本批未使用 robot |
| `utterance` | 非空幼兒短句，保留重疊詞、不完整句及缺少文法資訊 |
| `expected` | `SUFFICIENT` 或 `INSUFFICIENT` |
| `interpretation` | sufficient 為非空字串；insufficient 為 `null` |
| `candidate_text` | 單一固定的短回答或追問，無執行時生成 |
| `expected_input_policy` | `COMPANION` |
| `expected_output_policy` | `ALLOW` |
| `expected_action` | 依上表 label 映射 |
| `rationale` | 說明 label 的人工理由；insufficient 至少列兩個合理意思及其回應差異 |

`background`、`conversation`、`utterance` 是完整可見輸入，本批沒有額外背景。未來 E012 若使用此資料，必須從這三欄明確取用輸入；Output stage 可再加入 `candidate_text`。不要把整筆 fixture 當作 model state：`id`、`topic`、`context_type`、`expected`、`interpretation`、`rationale` 與各 `expected_*` 都是 oracle／分組資訊，不可洩漏給被評估模型。E012 的實際介面另行定案，本 topic 不建立 runner。

## v0 composition and contrastive cases

所有案例均為 Codex 逐案設計的 draft，不是實際兒童對話紀錄。先建立 toy_car／water 六筆 seed，再擴至完整 15 筆。

| Topic | Context types | Target utterance |
| --- | --- | --- |
| `toy_car` | clear / ambiguous / irrelevant 各一筆 | 寶寶 車車 |
| `water` | clear / ambiguous / irrelevant 各一筆 | 水水 |
| `ball` | clear / ambiguous / irrelevant 各一筆 | 球球 |
| `hug` | clear | 抱抱 |
| `food` | clear | 還要 |
| `sleep` | ambiguous | 不要 |
| `parent` | ambiguous | 媽媽 |
| `book` | irrelevant | 書書 |
| `outside` | irrelevant | 外面 |

共 15 筆、九 topics、5 clear／5 ambiguous／5 irrelevant，5 sufficient／10 insufficient，並有三組相同 utterance 的完整對照。

- `toy_car_ambiguous_001` 與 `water_ambiguous_001`：前文有大量相關 keyword，仍未選定物件或用途。
- `ball_clear_001`：整份可見前文沒有「球」字，卻已用圓形、可拍彈的玩法建立 referent，孩子也確認想拍。正例不借影像、手勢或過去記憶。
- `hug_clear_001`：不為了配額而硬將清楚的抱抱需求標不足。

Label 必須由語義證據成立，不由 context_type 或分布硬套。三組 triplets 提供同 utterance、不同 context 的區辨力；單一 topic 的額外案例不代表已完整驗證所有 keyword shortcuts。

## Local validation

只需 Python 3.10+ standard library，沒有套件安裝、網路或模型呼叫。

```sh
python3 evaluation/context_sufficiency/validate_dataset.py
python3 evaluation/context_sufficiency/validate_dataset.py /path/to/candidate.jsonl
```

預設路徑相對於 validator 自身，因此也可從其他 working directory 執行。成功 exit 0，列 counts 與 contrastive groups；失敗 exit 1，在 stderr 指出 line／ID 或全量分布錯誤。validator 不修改檔案。

自動檢查 JSONL、必備欄位／型別、非空文字、unique IDs、合法值、2–5 turns、interpretation 型別、label／Action 映射、固定 policy、15 筆與指定 topic／context 配置、固定 utterances 及 triplets 內同時有兩種 label。

自然語言的合理性、候選是否合宜、是否存在兩個競爭意思、no-keyword 正例及 rationale 的充分性，都留給人工與獨立 review。詳見 [review.md](review.md) 的逐案包、驗證證據及待確認項目。

## Human check, freeze and version changes

Owner 檢查完整 15 筆的背景、對話、孩子輸入、interpretation／競爭意思、候選、policies、Action 與理由，接受確切 snapshot 後，再交獨立 Reviewer。Reviewer 先只看可見輸入自行判斷，再比對 oracle 欄位。

`review.md` 記錄 README／dataset／validator 的 SHA-256、owner 的實際接受訊息或可查證 reference／時間、驗證結果與獨立 Reviewer verdict。Review 紀錄自身不納入 snapshot hashes，避免記錄 freeze 時改變被接受版本。

只有同 snapshot 的證據全部齊全、無 blocker，Implementer 才記錄 freeze；Reviewer 不改 repo。若 review 要求修改語義，先修訂，更新 snapshot，再取得 owner human check 與獨立 review。Freeze 不需要改 README 或 dataset。

Freeze 後，真正的 fixture 錯誤另建 `context_sufficiency_v0.1`，保留 v0、記錄修改原因並重新人工／獨立審查；不得為了讓 Jev 成績變好修改 oracle。

## Out of scope

本版不涵蓋 Parent／Safety 分流、阻擋候選、重試、sarcasm、metaphor、複雜情緒、緊急事件、多名幼兒、speaker uncertainty、ASR errors、背景電視、多語言、長對話、長期記憶、camera、gesture 或物件偵測。

不實作 inference、classifier、prompt、Jev adapter／runner、ASR、TTS、robot action 或 production pipeline。固定 `COMPANION`／`ALLOW` 不提供其他政策分支的評估覆蓋；此 oracle 不是模型正確性或安全性保證。本 topic 不包含 commit、push、PR 或 release。
