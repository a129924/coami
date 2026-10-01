# E012 前置：Context Sufficiency Scenario Oracle — Processed Plan

## Inputs

- 意圖來源：owner 的 dataset 草案、後續「Codex draft → human check → 重新 review → 正確答案 → topic 結束」修訂，以及已確認的兩 label／兩 Action 映射；owner 已要求 implement。
- 基線：`docs/companion-flow.md`、`docs/experiments/text-companion-loop.md`。
- Authority：`plan/agent-handoff-workflow.md`、`plan/topic-plan-contract.md`；沿用 topic-plan template。
- Semantic warning — optional analysis layer missing：`analysis/context-sufficiency-scenario-oracle/requirements.md` 與 `technical-spec.md` 不存在，recorded analysis layer 為 `INCOMPLETE`。依已確認意圖 author，不新增 analysis、不假造 E012 契約；此缺失不阻擋本 topic。
- 先前獨立 Plan-Reviewer 核准只適用對話稿 advisory，非 repo gate、fixture review 或 owner human check。

## Goal / Outcome

建立 15 筆人工可讀的固定 fixtures，逐案寫好幼兒輸入、必要文字背景、候選回答或追問、預期 Input／Output Policy 及最終 Action。Owner 接受確切版本、validator 通過、獨立 Reviewer 無 blocker後記錄 freeze，作為 E012 的人工 oracle，本 topic 結束。

真實 Jev 呼叫與「預期 → Jev 判斷 → 程式 Action」比較留給 E012。

## Scope

- In scope：本 topic plan、README/schema、15 筆 JSONL、stdlib 本機 validator、逐案審查／snapshot／freeze 證據。
- ReadOnly：既存 workflow、概念文件、analysis、experiments 與 production source。
- Written／Modify：只新增及 bounded 修訂 Artifact Paths 列出的五個工件。
- Deleted：無。不新增 runnable POC、production capability 或模型結果。

## Locked Decisions

- `SUFFICIENT`：可見文字支持一個合理低風險主要 interpretation，無須先取得更多關鍵資訊。`INSUFFICIENT`：至少兩個合理且導向不同回應的 interpretation。
- 固定 `SUFFICIENT → DELIVER_ANSWER`、`INSUFFICIENT → DELIVER_QUESTION`。每筆一個固定 `candidate_text`，不生成集合或執行時產生文字。
- 全部固定 `expected_input_policy = COMPANION`、`expected_output_policy = ALLOW`，只屬 fixture 預期概念，非 API／production enums；不把 context label 當 Input Policy。
- `background`、`conversation`、`utterance` 構成完整可見輸入；未來 Output 判斷可加入 candidate。Oracle labels、rationale、interpretation 與分類 metadata 不送給被評估模型。
- UTF-8 JSONL；2–5 turns；speaker 限 parent／child／robot；繁中幼兒短句。Sufficient interpretation 為非空字串，insufficient 為 null，理由至少列兩個競爭意思及回應差異。
- Toy_car／water／ball 各三類完整 triplet，target 分別「寶寶 車車」「水水」「球球」；hug／food clear（抱抱／還要），sleep／parent ambiguous（不要／媽媽），book／outside irrelevant（書書／外面）。
- 正好 15 筆、九 topics、5／5／5 context types、5 sufficient／10 insufficient。分布不能取代語義證據；無法成立時修情境並重審，不能強迫 label。
- 至少一 keyword-overlap ambiguous negative 與一整份可見前文不含目標 keyword、仍以文字建立 referent 的 sufficient positive。
- Schema 在 README 定義；不另建 schema、step 或 inference artifact。
- 無 stable-library surfaces，不修改 root README、VERSION、release notes、tag 或 `.github/copilot-instructions.md`。

## Boundaries / Exclusions

不做模型、classifier、prompt、Jev adapter／runner、policy router、ASR、TTS、robot action、camera、speaker identification、長期記憶或 production pipeline。不加入 Parent／Safety／阻擋／重試、緊急事件、多幼兒、多語言、ASR errors、背景電視、gesture、pointing、sarcasm、metaphor 或複雜情緒案例。

Plan-Creator 作者契約；Implementer 寫修工件；Tester 執行本機驗證；owner 負責 human check；獨立 Reviewer 判定不改檔。Implementer 只原樣記錄他人實際接受／verdict，不代稱 gate 通過；Codex 自檢不屬 owner 或獨立 review。

## Status / Allowed Transitions

- Current：`approved`；owner 接受 v0-draft-001 全部 15 筆，獨立 fixture Reviewer 核准同 snapshot、無 blocker；validation／hashes 相符，已記錄 context_sufficiency_v0 freeze，本 topic 結束。
- Execution：creator draft → owner human check → independent review → freeze，停在 `approved`。
- Allowed：`planned → creator-in-progress → review-ready → reviewer-in-progress`；`reviewer-in-progress → approved` 或 `needs-rework`；`needs-rework → creator-in-progress`；freeze 前必要修訂可 `approved → creator-in-progress`。
- 六筆 seed 只內部檢查；完整 15 筆且 validator 通過才交 owner human check，owner 接受確切 snapshot 後才進獨立 Reviewer。
- Review 引發語義修訂後更新完整 snapshot，重走 owner human check 與獨立 review。
- Freeze 是資料標記，不新增 workflow state；matching evidence 全部齊全才記錄。不進 publish／PR／merge／release。

## Artifact Paths

| Artifact | Exact path | Writer / decision owner | Role |
| --- | --- | --- | --- |
| Plan | `plan/context-sufficiency-scenario-oracle/context-sufficiency-scenario-oracle.plan.md` | Implementer 寫入已審查計畫 | Execution contract |
| README | `evaluation/context_sufficiency/README.md` | Implementer | Goal/schema/labels/version/boundaries |
| Dataset | `evaluation/context_sufficiency/dataset/context_sufficiency_v0.jsonl` | Implementer | 15 fixed oracle fixtures |
| Validator | `evaluation/context_sufficiency/validate_dataset.py` | Implementer | Local structural checks |
| Evidence | `evaluation/context_sufficiency/review.md` | Implementer 記錄；owner／Tester／Reviewer 各負責自身證據 | Review/human acceptance/validation/snapshot/freeze |

表列外路徑須回到 planning／review，不擴 E012。Review 記錄 README／dataset／validator SHA-256；review.md 自身不入 hash，不引入循環。

## Implementation Steps

- [X] 1. 建立 README/schema 與 draft review 記錄結構。
- [X] 2. 手寫 toy_car／water 六筆 seed，內部檢查 label、背景與候選。
- [X] 3. 擴到 15 筆、九 topics、三完整 triplets，補齊 rationale。
- [X] 4. 建立 stdlib validator／CLI 與全量 human-check 包、counts／groups 摘要，完成本機驗證。

以上只記 creator 工件完成，不代表 owner acceptance、獨立 Reviewer verdict 或 freeze 已完成。

## Validation / Acceptance Checks

執行 `python3 evaluation/context_sufficiency/validate_dataset.py`，預設讀相鄰 dataset，可接受一個可選 path；success exit 0 並輸出 counts／groups，failure exit 1 並輸出 line／ID 或全量錯誤，不改檔。

檢查 JSONL、必備欄位／型別、非空文字、unique ID／命名、合法值、2–5 turns、interpretation 與 label 型別關係、固定 policy、Action 映射、15 筆／九 topics／指定配置、固定 utterances、triplets 含兩種 label。不以程式判斷自然語義。

以暫存負例確認 malformed JSON、duplicate ID、非法 enum、缺欄位、turn count、interpretation／action 不一致、counts／triplets 缺漏均失敗；不改正式 fixtures、不新增測試 framework。

Owner 檢查完整 15 筆背景、輸入、候選、labels／policies／Action 及 rationale，接受 exact snapshot。Reviewer 先只看可見輸入判斷，再對 oracle；檢查主解讀／至少兩競爭意思、contrastive context、keyword 反例、候選合宜與無 hidden referent。Matching owner acceptance、validation、Reviewer 無 blocker才可記 freeze。

## Reviewer Handoff

以下為獨立 Reviewer 待回傳的合約，不是已取得的 verdict：

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

Fixture review 對應 owner 接受且已驗證的 exact snapshot；有 blocking issue 即 needs-rework。

## Post-merge / release actions

本 topic 不含 commit、push、PR、merge、release 或 VERSION bump。完成 matching acceptance／validation／review 後，由 Implementer 原樣記 freeze、交 counts／groups／validation summary 並停止。

Frozen fixture 真有錯誤，另建 v0.1，保留 v0 與修改理由，重新 human check／review；不得為模型成績調 oracle。E012 另立後續實驗，不在此建立入口或 router。

## Open Questions / Unresolved Items

- 無阻擋 draft 實作的決策問題；optional analysis 缺失已明示。
- Human acceptance、獨立 fixture review 與 freeze 均已完成；exact snapshot、實際 verdict 與完成時間記錄於 review.md。
- Jev 呼叫條件、wire schema、router 與成效屬 E012，未驗證且不在此定案。
