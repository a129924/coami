# 代理交接工作流程合約

## 目的

定義 creator / reviewer workflow gate 使用的標準主題計畫合約。

## 必要計畫章節

每個 `plan/<topic>/<topic>.plan.md` 都必須包含下列章節：

1. `Goal / Outcome`
2. `Scope`
3. `Locked Decisions`
4. `Boundaries / Exclusions`
5. `Status / Allowed Transitions`
6. `Artifact Paths`
7. `Implementation Steps`
8. `Validation / Acceptance Checks`
9. `Reviewer Handoff`
10. `Post-merge / release actions`
11. `Open Questions / Unresolved Items`

### 穩定函式庫中繼資料（條件式）

若主題會影響穩定函式庫介面（`README.md`、`VERSION`、release timing 或 release notes），必須新增 `## Stable library metadata`，並宣告 README action、VERSION bump、timing 與 rationale。

## 標準狀態模型

| 狀態 | 意義 | 擁有者 | 允許下一步 |
| --- | --- | --- | --- |
| `planned` | 主題計畫已可進入執行路由 | 規劃角色 | `creator-in-progress` |
| `creator-in-progress` | 建立者正在起草或套用必要修正 | 建立者 | `review-ready` |
| `review-ready` | 建立者已完成最新版草稿並請求獨立審查 | 建立者 | `reviewer-in-progress` |
| `reviewer-in-progress` | 審查者正在評估最新版草稿 | 審查者 | `approved`, `needs-rework` |
| `needs-rework` | 審查者找到阻擋性的合約問題 | 審查者 | `creator-in-progress` |
| `approved` | 審查者接受此草稿 | 審查者 -> 主代理 | `creator-in-progress`, `publish-in-progress` |
| `publish-in-progress` | 已核准工作正在 commit / push，並準備進入 PR 或直接 merge | 主代理 | `pr-open`, `merged` |
| `pr-open` | PR 已開啟且正在進行 triage | 主代理 | `needs-rework`, `merged` |
| `merged` | 變更已完成 merge | 主代理 | terminal |
| `released` | 選擇性的 release / version 動作已完成 | 主代理 | terminal |

## 標準允許轉移

- `planned` -> `creator-in-progress`
- `creator-in-progress` -> `review-ready`
- `review-ready` -> `reviewer-in-progress`
- `reviewer-in-progress` -> `approved`
- `reviewer-in-progress` -> `needs-rework`
- `needs-rework` -> `creator-in-progress`
- `approved` -> `creator-in-progress`
- `approved` -> `publish-in-progress`
- `publish-in-progress` -> `pr-open`
- `publish-in-progress` -> `merged`
- `pr-open` -> `needs-rework`
- `pr-open` -> `merged`
- `merged` -> terminal

條件式規則：

- 若 `Post-merge / release actions` 宣告了實際的 release action，需補上 `merged` -> `released`。

## 修正 / Delta 生命週期合約

本節定義含修正（correction）或 delta 工件主題適用的路由與生命週期規則。

### 一般修訂 vs 修正觸發

- **一般 `needs-rework`**：reviewer 發現 draft 問題，要求 creator 在同一主題內修正，走標準內部迴路。
- **修正觸發的 drift**：source-of-truth 語意、公開合約意義、架構邊界或 phase 路由本身出現偏離時觸發。修正觸發需由 planner 最終確認；workflow agent 只做 provisional routing，不自行確認。

### 工件真實性分類

- **Parent artifacts**：在已接受的回填（accepted backfill）完成後，恢復為當前執行事實（current truth）。Correction closure 前必須先完成 parent 的回填同步；未完成回填時 parent 不得視為 current truth。
- **Correction artifacts**：保留為歷史決策記錄（historical truth）。不可直接取代 parent artifact，不可升格為執行合約，不可在 closure 後刪除。

### review-log 條件規則

建立 repo-visible `review-log` 或等效交接工件的條件：

- reviewer 的回饋會控制後續路由決策，**或**
- 主題需要多輪修訂（multi-round rework）且每輪結果需被後續輪次讀取。

不符合上述條件的主題不需建立 `review-log`；不可把 `review-log` 視為所有主題的通用必要項目。

### Round cap 政策規則

任何輪次上限（round cap）都是**主題層級政策宣告**，不可成為 repository-wide invariant。

若主題需要輪次上限，必須在 `Locked Decisions` 或 `Routing notes` 以 repo-visible 方式明確宣告；不可以現有樣本主題的設定推算為全域規則。

### 工作流程本體邊界

workflow body 僅承載生命週期 / 路由合約。修正工件的詳細欄位 schema 與長範例屬於 reference / example surfaces，不屬於本文件。

## 步驟追蹤對齊規則

- 標準步驟檔案路徑：`plan/<topic>/<topic>.step.md`。
- Completion gate 只能讀取 `## Implementation Steps` 的核取方塊。
- 標記語意：`[X]` 表示完成、`[ ]` 表示待完成（`[x]` 視為待完成）。
- 狀態對齊：
  - 只要仍有任何 implementation step 待完成，或 rework 尚未結束，就維持 `creator-in-progress`
  - 只有當本輪 creator pass 的 implementation steps 全部完成後，才能移到 `review-ready`
  - 若 reviewer 回傳 `needs-rework`，就必須回到 `creator-in-progress`

## 審查交接 JSON 合約

`Reviewer Handoff` 必須包含一個可供機器消費的 JSON 物件，格式如下：

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

## 合併後 / 發版規則

- 每個主題計畫都必須明確說明 post-merge 行為。
- 若不需要 release action，必須明確寫出不需要。
- 若需要 release，必須宣告具體 release actions，並確認狀態轉移包含 `merged` -> `released`。
