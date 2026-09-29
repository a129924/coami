# E009 screen touch greet — topic plan

## Inputs

- Intent: `analysis/E009-screen-touch-greet/requirements.md`.
- Execution contract: `analysis/E009-screen-touch-greet/technical-spec.md`.
- Selected worktree: `/private/tmp/coami-e009-screen-touch-greet`; branch `feat/andrew/e009-screen-touch-greet`; primary-worktree=false.

## Goal / Outcome

以獨立 TypeScript POC 證明使用者能在 Coami 模擬螢幕點選「打招呼」，只啟動一次可見動作，並在螢幕呈現與實際終態相符的結果。

## Scope

- **In-Scope / Goal**：E009 analysis、plan、step、TypeScript MOD、網頁模擬器、螢幕觸控轉送、純狀態測試、建置及可核對影像／trace 證據。
- **Out-Of-Scope / Non-Goal**：拖曳、捲動、多點觸控、機頂感測器、相機、語音、Server、實機品質、正式產品 UI、公開 API、持久資料、跨 BC 契約、production source、E008 依賴及 release。

## Locked Decisions

- Requirements 守護意圖，technical spec 是本 topic 的實作合約。這是 simulator-only 實驗，沒有 stable-library surface 或 release 動作。
- E005 的 `greet` 有可見 PASS 證據，但只經外部 A/C/B 控制；先以同次 trace 證明 pinned runtime 的螢幕觸碰進入 MOD。若不成立，記錄阻礙並停止，不以網頁外控制代替。
- 裝置螢幕的 Piu 選項是唯一 `greet` 來源；網頁只承載 simulator、trace、restart 及螢幕指標移出時的取消轉送。有效點選一次最多執行一次；執行中不排隊，終態後可再點。
- `mod.ts` 承載 Piu UI／動作；`greet-interaction.ts` 承載純 TS 狀態。XS archive 必須包含兩個 emitted JS modules。失敗與取消不得顯示成功。
- 本 topic 的 trace 是實驗本地證據，不升格為 device／Server wire contract。

## Boundaries / Exclusions

Tracked writes 只在下列 E009 `Artifact Paths` 且只在選定 feature worktree。`dev`、E005、E007、E008、`vendor/stack-chan/`、`server/src/`、`device/src/`、root `README.md`、`VERSION` 與 release 檔案不變。新增 tracked 路徑或擴大跨界能力須先回報 scope gap 並修訂計畫。

## Status / Allowed Transitions

- **Current**: `approved`（topic-plan 合約）；**Next actor**: Reviewer；**Stage-local action**：獨立檢查 TypeScript 實作與同次證據；Plan-Reviewer 的合約 verdict 已為 `approved`，不代表實作已通過審查。
- **Actual sequence**：owner 先核可對話中的 Mission 計畫並要求直接實作；worktree、程式與證據先於 repo-visible topic-plan review 完成。此處是補齊當前合約的獨立審查，不宣稱執行前曾通過該 gate。
- **Execution model from here**：topic-plan 的獨立合約 verdict 已取得；接著分開檢查 TypeScript 實作與證據；之後才是 topic commit、push、draft PR、human review。本 topic 不做 merge 或 release。
- **Allowed transitions**：`planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved` 或 `needs-rework`；`needs-rework` → `creator-in-progress`；`approved` → `creator-in-progress`（bounded correction）或 `publish-in-progress` → `pr-open` → `merged`；`pr-open` → `needs-rework`；`merged` 為 terminal。
- Owner 已授權完成後以 topic commit、push、draft PR 交由 human review；commit 前仍須遵守 `AGENTS.md` 的 proposed-message confirmation。

## Artifact Paths

| Artifact | Exact path | Owner |
| --- | --- | --- |
| Requirements | `analysis/E009-screen-touch-greet/requirements.md` | Planning actor |
| Technical spec | `analysis/E009-screen-touch-greet/technical-spec.md` | Planning actor |
| Topic plan | `plan/E009-screen-touch-greet/E009-screen-touch-greet.plan.md` | Planning actor |
| Step tracker | `plan/E009-screen-touch-greet/E009-screen-touch-greet.step.md` | Planning actor |
| Run guide | `experiments/E009-screen-touch-greet/README.md` | Creator |
| Experiment record | `experiments/E009-screen-touch-greet/EXPERIMENT.md` | Creator |
| Same-run evidence | `experiments/E009-screen-touch-greet/evidence/touch-greet-run.md` | Creator |
| Visible run | `experiments/E009-screen-touch-greet/evidence/touch-greet-run.webm` | Creator |
| Piu MOD entry | `experiments/E009-screen-touch-greet/mod/mod.ts` | Creator |
| Pure interaction state | `experiments/E009-screen-touch-greet/mod/greet-interaction.ts` | Creator |
| MOD host declarations | `experiments/E009-screen-touch-greet/mod/host.d.ts` | Creator |
| MOD TS config | `experiments/E009-screen-touch-greet/mod/tsconfig.json` | Creator |
| Web entry | `experiments/E009-screen-touch-greet/web/index.html` | Creator |
| Web package | `experiments/E009-screen-touch-greet/web/package.json` | Creator |
| Web lock | `experiments/E009-screen-touch-greet/web/package-lock.json` | Creator |
| Web ignore | `experiments/E009-screen-touch-greet/web/.gitignore` | Creator |
| Web TS config | `experiments/E009-screen-touch-greet/web/tsconfig.json` | Creator |
| Vite config | `experiments/E009-screen-touch-greet/web/vite.config.ts` | Creator |
| Pinned asset preparation | `experiments/E009-screen-touch-greet/web/scripts/prepare-assets.mjs` | Creator |
| Two-module MOD builder | `experiments/E009-screen-touch-greet/web/scripts/build-mod.mjs` | Creator |
| Browser harness | `experiments/E009-screen-touch-greet/web/src/main.ts` | Creator |
| Web style | `experiments/E009-screen-touch-greet/web/src/style.css` | Creator |
| Pure TS behavior tests | `experiments/E009-screen-touch-greet/web/src/greet-interaction.test.ts` | Creator |

**ReadOnly**：`AGENTS.md`、`plan/topic-plan-contract.md`、`plan/agent-handoff-workflow.md`、E005 的 `EXPERIMENT.md`／action matrix／MOD／Web build scripts、E007 的 `web/src/mod.test.ts`、E008 獨立 worktree、`vendor/stack-chan/web/src/services/simulator/simulator-engine.mjs`、`vendor/stack-chan/web/editor/mod-builder.mjs`、`vendor/stack-chan/firmware/host/app/capabilities.ts`、`vendor/stack-chan/firmware/host/app/runtime-context.ts`、`vendor/stack-chan/firmware/host/modules/ui/application/app-controller.ts`。整個 vendor 與既有 topic 均唯讀。**Written**：僅上述新 E009 工件。**Modify**：無既存 tracked 檔案。**Deleted**：無。`web/generated/`、`web/dist/`、`web/node_modules/` 是忽略的本機產物。

## Implementation Steps

- [X] 1. 建立獨立 E009 Piu MOD 與 simulator harness，證明實際螢幕觸碰進入 MOD callback；失敗即記錄阻礙並停止。
- [X] 2. 完成有效點選、取消與執行中單次鎖定，保留 face-visible `greet`、真實終態畫面及同次 trace。
- [X] 3. 完成純 TS 行為測試、嚴格型別檢查、雙模組 XS archive 與 Vite build；在實際模擬器驗證成功與負向情境。
- [X] 4. 撰寫重現指南、實驗問答與可見證據，備妥 Reviewer／human review 交接。

## Validation / Acceptance Checks

- **TestCase**：有效點選一次；選項外；移出或取消；執行中連點；終態後再點；失敗及遲到終態不得造成虛假成功。純狀態測試不得直接載入 `piu/MC`。
- MOD／Web strict typecheck、Node 測試、雙模組 XS archive、Vite build 通過；網頁沒有外部 `greet` 控制。
- 實際模擬器同一次操作有螢幕觸碰、MOD callback、`greet` 開始／終態、可見動作與螢幕結果。單有 `prepared` 或 MOD `completed` 不足以驗收。
- 所有 tracked writes 與 `Artifact Paths` 一致；ReadOnly、production source、stable-library 檔案不變。

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Human review 後方可 merge。本 topic 不更新 `README.md`／`VERSION`，不建立 tag、release note 或 repository release；`merged` 為 terminal。保留 remote topic branch，後續刪除另行決定。

## Open Questions / Unresolved Items

無 scope 或實作阻擋問題。實機觸控、正式產品 UI 和跨 BC 契約另立後續 Mission。
