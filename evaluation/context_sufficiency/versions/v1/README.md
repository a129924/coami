# Context Sufficiency Semantic Oracle — v1

## Purpose and lifecycle

本版僅含新增 **60 筆** Codex 人工設計的繁中幼兒文字案例；不是實際兒童資料。v0 的 15 筆另存且保持 frozen 原樣，v1 不等於合併後的75筆。這是獨立案例基準 Mission，不編為 E013、不跑 Jev、不決定模型通過門檻。

Lifecycle：先固定下列 slots → 作者撰寫 → 結構驗證 → Owner 接受 exact snapshot 全部60案 → 獨立 fixture Reviewer → matching evidence → freeze。狀態只以 [review.md](review.md) 的實際證據為準；版本檔名、計畫批准、validator PASS、技術 code review 均不代表 oracle 已接受或凍結。

## Label and policy definitions

- `SUFFICIENT`：可見文字支持一個合理、低風險主要意思，不要求百分之百確定，無須再取得關鍵資訊即可回答。
- `INSUFFICIENT`：至少兩個合理意思導向不同後續回應，需要先追問。
- 固定 `expected_input_policy=COMPANION`、`expected_output_policy=ALLOW`；S→`DELIVER_ANSWER`、I→`DELIVER_QUESTION`，只描述固定候選文字類型，不表示真實送達或執行動作。
- 每案只有一個 candidate，不代照顧者承諾購買、取物或執行行為；不擴充 Parent／Safety 或阻擋情境，不做產品安全宣稱。
- 不依 category/context_type 決定答案，不鎖 label 比例，不以模型預測裁決語義分歧。

## Schema and visible input

UTF-8 JSONL，一行一 object。每欄必備；額外欄位不得含模型觀察结果。

| Field | Contract |
| --- | --- |
| id | 唯一非空字串 `cs_v1_NNN`，對應下列先固定 slots |
| topic | toy_car / water / ball / hug / food / sleep / parent / book / outside / clothing / drawing / blocks |
| context_type | clear / ambiguous / irrelevant；不自動映射 label，不鎖配額 |
| coverage_category | 下表六個 primary category，每案只歸一類 |
| split | research / holdout，須符合 slots |
| group_id | 非空字串，須符合 slots；相關變體整組同 split |
| background | 非空可見文字，無其他背景也明寫，不藏作者私有資訊 |
| conversation | target 之前2–5 turns，每 turn 為 object，speaker 僅 parent/child/robot，text 非空 |
| utterance | 非空繁中幼兒短句，可含疊字／省略，不借手勢或影像 |
| expected | SUFFICIENT / INSUFFICIENT |
| interpretation | S 非空字串，I 為 null |
| candidate_text | 一個固定简短確認或釐清一件事的追問 |
| expected_input_policy | COMPANION |
| expected_output_policy | ALLOW |
| expected_action | S 為 DELIVER_ANSWER，I 為 DELIVER_QUESTION |
| rationale | S 說明可見文字支持的主意思；I 至少兩個合理意思及不同回應；可記其他語義特徵 |

被評估模型 **只可取 background、conversation、utterance**；Output stage 可另取 candidate_text。ID、topic、context_type、category、group、split、interpretation、rationale、expected 及 expected_* 都是 metadata/oracle，不能傳整行給模型。本 Mission 無 runner、公開 API、裝置協定或 production migration。

## Pre-authoring coverage design

本表與下列60 slots 在寫任何案例內容與答案前固定；baseline hash／時間記於 review.md。Slots 不預填 label，改 slots 先回覆蓋核對，不因模型成績調整。

| coverage_category | 意義 | research | holdout | total |
| --- | --- | ---: | ---: | ---: |
| explicit_reference | 明確建立指涉或目的 | 7 | 3 | 10 |
| multiple_meanings | 多個合理用途、物件或意圖 | 7 | 3 | 10 |
| irrelevant_background | 無關背景是否影響當下可見意思 | 7 | 3 | 10 |
| keyword_misdirection | 同字或相關詞出現不等於指涉已選定 | 7 | 3 | 10 |
| meaning_without_keyword | 未重複目標關鍵字，文字仍可建立意思 | 6 | 4 | 10 |
| conflicting_context | 衝突未解或已被明確更正，是否足以回應 | 6 | 4 | 10 |
| Total | | 40 | 20 | 60 |

十二 topic 全部出現，各 category 至少兩 topic。部分對照＋自然獨立案，不要求全案配對；至少三 topic 含同 utterance、不同 context、跨 label 的對照，同組 research 至少兩 topic、holdout 至少一 topic。

Group 可 singleton 或多案；刻意對照、同情境近義改寫、只改無關細節的近似案整組同 split。相同 topic/utterance 不自動同情境；不拆群湊配額。完整三欄 visible input 不可重複。研究40案與保留20案均在 repo 可見；**holdout 禁止用來選擇模型改善方式，不宣稱 unseen/blind evaluation**。

### Fixed slots

| id | coverage_category | topic | group_id | split |
| --- | --- | --- | --- | --- |
| cs_v1_001 | explicit_reference | toy_car | car-play-or-look | research |
| cs_v1_002 | explicit_reference | water | water-drink-or-use | research |
| cs_v1_003 | explicit_reference | ball | case-003 | research |
| cs_v1_004 | explicit_reference | hug | case-004 | research |
| cs_v1_005 | explicit_reference | food | case-005 | research |
| cs_v1_006 | explicit_reference | sleep | case-006 | research |
| cs_v1_007 | explicit_reference | parent | case-007 | research |
| cs_v1_008 | explicit_reference | book | book-sea-reading | holdout |
| cs_v1_009 | explicit_reference | outside | outside-watch-or-go | holdout |
| cs_v1_010 | explicit_reference | clothing | case-010 | holdout |
| cs_v1_011 | multiple_meanings | toy_car | car-play-or-look | research |
| cs_v1_012 | multiple_meanings | water | water-drink-or-use | research |
| cs_v1_013 | multiple_meanings | ball | case-013 | research |
| cs_v1_014 | multiple_meanings | hug | case-014 | research |
| cs_v1_015 | multiple_meanings | food | case-015 | research |
| cs_v1_016 | multiple_meanings | sleep | case-016 | research |
| cs_v1_017 | multiple_meanings | parent | case-017 | research |
| cs_v1_018 | multiple_meanings | book | book-sea-reading | holdout |
| cs_v1_019 | multiple_meanings | outside | case-019 | holdout |
| cs_v1_020 | multiple_meanings | clothing | case-020 | holdout |
| cs_v1_021 | irrelevant_background | ball | case-021 | research |
| cs_v1_022 | irrelevant_background | food | case-022 | research |
| cs_v1_023 | irrelevant_background | book | case-023 | research |
| cs_v1_024 | irrelevant_background | clothing | case-024 | research |
| cs_v1_025 | irrelevant_background | outside | case-025 | research |
| cs_v1_026 | irrelevant_background | drawing | case-026 | research |
| cs_v1_027 | irrelevant_background | blocks | case-027 | research |
| cs_v1_028 | irrelevant_background | water | case-028 | holdout |
| cs_v1_029 | irrelevant_background | hug | case-029 | holdout |
| cs_v1_030 | irrelevant_background | sleep | case-030 | holdout |
| cs_v1_031 | keyword_misdirection | toy_car | case-031 | research |
| cs_v1_032 | keyword_misdirection | food | case-032 | research |
| cs_v1_033 | keyword_misdirection | parent | case-033 | research |
| cs_v1_034 | keyword_misdirection | book | case-034 | research |
| cs_v1_035 | keyword_misdirection | blocks | case-035 | research |
| cs_v1_036 | keyword_misdirection | drawing | case-036 | research |
| cs_v1_037 | keyword_misdirection | sleep | case-037 | research |
| cs_v1_038 | keyword_misdirection | clothing | case-038 | holdout |
| cs_v1_039 | keyword_misdirection | water | case-039 | holdout |
| cs_v1_040 | keyword_misdirection | outside | case-040 | holdout |
| cs_v1_041 | meaning_without_keyword | ball | case-041 | research |
| cs_v1_042 | meaning_without_keyword | water | case-042 | research |
| cs_v1_043 | meaning_without_keyword | toy_car | case-043 | research |
| cs_v1_044 | meaning_without_keyword | clothing | case-044 | research |
| cs_v1_045 | meaning_without_keyword | drawing | drawing-make-or-show | research |
| cs_v1_046 | meaning_without_keyword | blocks | case-046 | research |
| cs_v1_047 | meaning_without_keyword | book | book-bedtime-choice | holdout |
| cs_v1_048 | meaning_without_keyword | outside | case-048 | holdout |
| cs_v1_049 | meaning_without_keyword | hug | case-049 | holdout |
| cs_v1_050 | meaning_without_keyword | food | case-050 | holdout |
| cs_v1_051 | conflicting_context | parent | case-051 | research |
| cs_v1_052 | conflicting_context | food | case-052 | research |
| cs_v1_053 | conflicting_context | toy_car | case-053 | research |
| cs_v1_054 | conflicting_context | sleep | case-054 | research |
| cs_v1_055 | conflicting_context | drawing | drawing-make-or-show | research |
| cs_v1_056 | conflicting_context | blocks | case-056 | research |
| cs_v1_057 | conflicting_context | book | book-bedtime-choice | holdout |
| cs_v1_058 | conflicting_context | outside | outside-watch-or-go | holdout |
| cs_v1_059 | conflicting_context | hug | case-059 | holdout |
| cs_v1_060 | conflicting_context | clothing | case-060 | holdout |

## Validation and human review

Python 3.10+ standard library，无網路、安裝或模型呼叫：

```sh
python3 evaluation/context_sufficiency/versions/v1/validate_dataset.py
python3 evaluation/context_sufficiency/versions/v1/validate_dataset.py /path/to/candidate.jsonl
```

預設路徑相對 validator，自其他 cwd 亦可用。Success exit0：counts/category-split matrix/topics/groups；failure exit1：stderr line/ID或全量錯誤，無 traceback，不寫檔。檢查結構、唯一性、合法值、policy/action、60筆、matrix、topic下限、同組同split與對照最低配置；不推理自然語義。Tester 另逐案核對五欄 slot 一致性并記 review.md，不需要新增 README parser。

Owner 先只看可見輸入，確認全部60案含holdout的答案、候選、理由与分組，可逐案接受或明示接受 exact snapshot 全部。獨立 fixture Reviewer 在 Owner 接受後，先抽三可見欄並用中性編號自行判，再讀oracle；不先由category、候選或答案推斷，不用模型當裁判。歧義或分歧修訂／替換，不為配額硬套答案；slot變更回覆蓋核對。

Exact snapshot 是本 README、JSONL、validator 三份 SHA-256，review.md 自身不入hash。修改snapshot任一檔，重走驗證、Owner接受與獨立fixture審查；無matching證據不能freeze。Freeze後錯誤另版本保留v1與歷史原因，不覆寫答案或分數。v0與E012完全保留。後續Jev評估、改善與threshold為另Mission。
