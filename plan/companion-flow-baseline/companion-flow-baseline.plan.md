# Companion flow baseline — topic plan

## Inputs

- Intent guardrail: `analysis/companion-flow-baseline/requirements.md`.
- Documentation execution contract: `analysis/companion-flow-baseline/technical-spec.md`. This document governs this topic's files, not future production architecture.
- Selected worktree: `/private/tmp/coami-companion-flow-baseline`, branch `docs/andrew/companion-flow-baseline`, primary-worktree=false.

## Goal / Outcome

建立一份精簡、可供後續實驗使用的 Coami 產品對話基線：產品摘要、一張 Companion 為主的高層流程圖，以及尚未執行的文字實驗提案。所有尚未驗證的機制維持假設標記。

## Scope

- **In-Scope / Goal**: 本 topic 的兩份 analysis、topic plan、step tracker，以及 `docs/product.md`、`docs/companion-flow.md`、`docs/experiments/text-companion-loop.md`。
- **Out-Of-Scope / Non-Goal**: 可執行 POC、政策或模型效果驗證、正式資料與 device/server 契約、Parent／Safety 完整子流程、production source、裝置、README、VERSION 與 release。
- **ReadOnly**: `AGENTS.md`、`README.md`、`experiments/README.md`、`plan/agent-handoff-workflow.md`、`plan/topic-plan-contract.md` 及 Rivet 的 `/Users/andrew/code/swift/rivet/docs/product.md`。文件實作時，本 topic 的 analysis 與 plan 亦為唯讀契約。
- **Written**: 僅下方 `Artifact Paths` 所列新檔案。
- **Modify**: 無既存內容檔案；step tracker 的勾選更新屬工作流程追蹤。**Deleted**: 無。

## Locked Decisions

- 長期產品全貌只畫高層骨架；Companion 的情境回答／追問是主路徑，Parent／Safety 只定交接。未來語音與裝置畫在文字決策鏈外圍。
- 圖上方塊是職責，不鎖定獨立模型或服務數量。Jev 是 TypeSafe 的結構化判斷模型；程式規則決定路由及輸出放行，LLM 擬定文字。這是待驗證設計假設。
- 本輪交付文件與下一個實驗提案，不實作文字 POC；不記錄私人家庭背景。實際實驗須另立 topic，在 `experiments/<id>-<slug>/` 留下問題、程序、證據與決定。
- 本 topic 不觸及 stable-library surfaces：`README.md`、`VERSION`、release notes、tag 與 `.github/copilot-instructions.md` 均不變更；merge 後無 release 動作。

## Boundaries / Exclusions

- 現有 E001、E003、E004、E005 的 simulator 證據不得外推為對話政策或生成能力已驗證；本 topic 只建立概念文件。
- Creator 只修改宣告的文件路徑；Reviewer 獨立檢查圖、文字、證據邊界與路徑；Main Agent 負責工作樹、暫存、獲授權的 commit／push／draft PR 與 human review 交接。新 repo-visible 路徑須先修訂並審查計畫。

## Status / Allowed Transitions

- **Current**: `review-ready`。已在獨立 worktree 完成文件草稿；實際 Mermaid 渲染與獨立審查仍待驗證，未宣稱 plan gate 通過。
- **Next actor**: Reviewer。
- **Stage-local action**: 獨立核對 topic plan、三份文件、Mermaid 實際渲染、情境路徑及證據邊界，回傳 reviewer JSON。
- **Execution model**: `planned` → creator → reviewer → publish → draft PR／human review；merge 後無 release。
- **Allowed transitions**: `planned` → `creator-in-progress`; `creator-in-progress` → `review-ready`; `review-ready` → `reviewer-in-progress`; `reviewer-in-progress` → `approved` or `needs-rework`; `needs-rework` → `creator-in-progress`; `approved` → `creator-in-progress` or `publish-in-progress`; `publish-in-progress` → `pr-open` or `merged`; `pr-open` → `needs-rework` or `merged`; `merged` terminal.
- **Routing notes**: owner 要求在 feature worktree 實作，無重大問題時依 topic commit、push、開 draft PR 後交 human review；`dev` primary worktree 不寫入。Commit 前依 `AGENTS.md` 檢查 staged diff，並取得 proposed message 的 owner 明確確認。正式 Plan-Reviewer gate 須以 repo-visible plan 為依據，不由本計畫自稱通過。
- **Verification note**: 本機 Mermaid CLI 取得逾時，瀏覽器不可用；目前完成圖文靜態檢查，實際渲染列為 Reviewer 必須核對的待完成驗收。

## Artifact Paths

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Requirements | `analysis/companion-flow-baseline/requirements.md` | Planning actor | 意圖與範圍守則 |
| Technical spec | `analysis/companion-flow-baseline/technical-spec.md` | Planning actor | 本 topic 文件執行契約 |
| Topic plan | `plan/companion-flow-baseline/companion-flow-baseline.plan.md` | Planning actor | 流程與交接契約 |
| Step tracker | `plan/companion-flow-baseline/companion-flow-baseline.step.md` | Step-Creator | gate 與生命週期追蹤 |
| Product baseline | `docs/product.md` | Creator | 精簡產品意圖與證據狀態 |
| Flow diagram | `docs/companion-flow.md` | Creator | 一張 Mermaid 高層流程圖 |
| Experiment proposal | `docs/experiments/text-companion-loop.md` | Creator | 尚未執行的文字實驗提案 |

不修改 `README.md`、`VERSION`、`.github/copilot-instructions.md`、既有 `experiments/`、`server/src/` 或 `device/src/`。若需要表列外路徑，先回到計畫審查。

## Implementation Steps

- [X] 1. 完成 `docs/product.md`，寫明產品目標、幼兒受眾、成功訊號、範圍與未驗證能力，不記錄私人家庭背景。
- [X] 2. 完成 `docs/companion-flow.md` 的單一 Mermaid 圖與簡短圖例，呈現 Companion 主路徑、Jev／程式規則分工、Parent／Safety 交接及未來語音／裝置邊界。
- [X] 3. 完成 `docs/experiments/text-companion-loop.md`，提出文字實驗的問題、程序、預期證據與決策標準；核對三份文件一致且沒有偽造實驗結果。

## Validation / Acceptance Checks

- **TestCase**: Mermaid 可渲染；能沿圖追蹤情境足夠時回答、資訊不足時追問、Parent／Safety 交接、提議輸出未放行時重新提議或交接。
- 三份文件維持 Jev 結構化判斷／程式路由放行／LLM 文字生成的職責分工，標示未驗證流程與未執行提案；不含私人家庭背景。
- `git diff` 和 staged diff 僅包含 `Artifact Paths` 列出的新檔案；`dev` primary worktree 保持乾淨。文件 topic 無自動化測試或 release gate。

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

Draft PR 交 human review，只有 human 決定 merge。本 topic 不需要 VERSION bump、tag、release note 或 repository release；`merged` 為 terminal。Worktree 與 branch 清理由後續明確流程處理。

## Open Questions / Unresolved Items

本文件 topic 無阻擋性開放問題。Jev 適用性、政策閾值、記憶與重試策略屬後續實驗決策，不在本 topic 定案。
