# E011 screen action menu — topic plan

## Inputs

- Intent：Robot 螢幕捲動固定清單、直接選取一個動作、看到相符終態。
- ReadOnly evidence dependency：E005 action matrix 的 17 個 visual-PASS action IDs。
- Related reference：E009 螢幕觸控路徑；不是 E011 的修改目標或 runtime dependency。
- Branch：`feat/andrew/e011-screen-action-menu`；worktree 為 `/private/tmp/coami-e011-screen-action-menu`。

## Goal / Outcome

**Goal**：以獨立 TypeScript POC 證明使用者可在 pinned Robot 螢幕捲動清單，選取初始不可見的 PASS 項目後恰好執行對應動作，並看到與 matching terminal 相符的終態。

**Non-Goal**：不重寫、延伸、重新驗證或 runtime import E005；不修改 E009、vendor、production、stable-library 或 release surfaces。

## Scope

- **In-Scope**：E011 analysis、plan、step、E011-owned PASS snapshot/mapping、TypeScript MOD、browser harness、螢幕捲動／選取、busy lock、終態回饋、tests、build 與同次 evidence。
- **Out-Of-Scope**：E005 FAIL IDs、動態目錄、搜尋、分類、持久化、多點觸控、機頂觸摸、相機、語音、Server、實機品質、正式產品 UI、公開 API、跨 BC 契約與 release。

## Locked Decisions

- E011 是獨立 topic；E005 只提供唯讀的 17 項 PASS IDs 與 evidence。E011 自己擁有 snapshot、mapping、程式與證據。
- 只有可見同列的有效 touch 可執行一次；滑動、選單外、移出、取消和 busy 再點均不得派送或排隊。
- matching terminal 才更新終態；失敗、取消、遲到或不相符 terminal 不得顯示成功。
- 必須在 pinned simulator 的 Robot 螢幕路徑驗證；無法完成時記錄 blocker，不可由網頁外控制替代。

## Boundaries / Exclusions

**ReadOnly**：`AGENTS.md`、shared plan/workflow contracts、E005/E009 全部工件、`vendor/stack-chan/`、`server/src/`、`device/src/`、root `README.md`、`VERSION` 和 release files。

**Written**：僅下方 Artifact Paths 的 E011 新工件。

**Modify**：無既存 tracked files。

**Deleted**：無。
`web/generated/`、`web/dist/`、`web/node_modules/` 是 ignored local artifacts，不是 tracked writes。

## Status / Allowed Transitions

- **Current**：`approved`；首輪 Reviewer 判定 `needs-rework` 的兩項 blocker 已修正，第二輪獨立 Reviewer 核對 10 項測試、修正後 pinned-simulator 證據及 E011-only 邊界後判定 `approved`，待 publish。
- **Allowed transitions**：`planned` → `creator-in-progress` → `review-ready` → `reviewer-in-progress` → `approved|needs-rework`；`needs-rework` → `creator-in-progress`；`approved` → `publish-in-progress` → `pr-open` → `merged`。
- commit、push、Draft PR 和 human review 只在完整驗證及獨立 review 後進行。

## Artifact Paths

| Artifact | Exact path |
| --- | --- |
| Requirements | `analysis/E011-screen-action-menu/requirements.md` |
| Technical spec | `analysis/E011-screen-action-menu/technical-spec.md` |
| Topic plan | `plan/E011-screen-action-menu/E011-screen-action-menu.plan.md` |
| Step tracker | `plan/E011-screen-action-menu/E011-screen-action-menu.step.md` |
| Experiment README | `experiments/E011-screen-action-menu/README.md` |
| Experiment record | `experiments/E011-screen-action-menu/EXPERIMENT.md` |
| PASS snapshot | `experiments/E011-screen-action-menu/contracts/e005-pass-action-snapshot.md` |
| Action mapping | `experiments/E011-screen-action-menu/evidence/action-menu-mapping.md` |
| Browser run record | `experiments/E011-screen-action-menu/evidence/action-menu-run.md` |
| Browser run video | `experiments/E011-screen-action-menu/evidence/action-menu-run.webm` |
| Action catalog | `experiments/E011-screen-action-menu/mod/action-catalog.ts` |
| Gesture rules | `experiments/E011-screen-action-menu/mod/action-menu-interaction.ts` |
| Robot MOD | `experiments/E011-screen-action-menu/mod/mod.ts` |
| MOD host declarations | `experiments/E011-screen-action-menu/mod/host.d.ts` |
| MOD TS config | `experiments/E011-screen-action-menu/mod/tsconfig.json` |
| Web ignore rules | `experiments/E011-screen-action-menu/web/.gitignore` |
| Web entry | `experiments/E011-screen-action-menu/web/index.html` |
| Web package | `experiments/E011-screen-action-menu/web/package.json` |
| Web lockfile | `experiments/E011-screen-action-menu/web/package-lock.json` |
| Web TS config | `experiments/E011-screen-action-menu/web/tsconfig.json` |
| Vite config | `experiments/E011-screen-action-menu/web/vite.config.ts` |
| Asset preparation | `experiments/E011-screen-action-menu/web/scripts/prepare-assets.mjs` |
| MOD build | `experiments/E011-screen-action-menu/web/scripts/build-mod.mjs` |
| Browser harness | `experiments/E011-screen-action-menu/web/src/main.ts` |
| Browser style | `experiments/E011-screen-action-menu/web/src/style.css` |
| Interaction tests | `experiments/E011-screen-action-menu/web/src/action-menu-interaction.test.ts` |
| Result screenshot | `experiments/E011-screen-action-menu/evidence/action-menu-result.jpg` |
| PR review-fix record | `experiments/E011-screen-action-menu/evidence/pr-review-fix.md` |
| PR review-fix screenshot | `experiments/E011-screen-action-menu/evidence/pr-review-fix.jpg` |

## Implementation Steps

- [X] 1. 建立 E011 自有的 PASS snapshot、mapping 與獨立 simulator scaffold。
- [X] 2. 實作選單滑動、有效選取、busy exclusion、matching terminal 與螢幕回饋。
- [X] 3. 完成純 TS tests、typecheck、archive、web build 和 pinned simulator run。
- [X] 4. 記錄可重現程序與同次 evidence，交給獨立 Reviewer。

## Validation / Acceptance Checks

- **TestCase**：17 項 snapshot/mapping；捲動至初始不可見項目後選取；純滑動／選單外／移出／取消均無 run；側邊留白、列間空白、裁切列邊界與水平拖曳不誤選；busy 不排隊；failure/cancel/stale terminal 不顯示成功。
- 純互動測試不得載入 `piu/MC`；MOD/Web strict typecheck、Node tests、XS archive 與 Vite build 必須通過。
- 同次 pinned-simulator evidence 必須核對可見標籤、selected action ID、一次開始、可辨識動作、matching terminal 與終態畫面。
- 所有 tracked writes 必須在 Artifact Paths；ReadOnly、Modify、Deleted 邊界不變。

## Reviewer Handoff

```json
{
  "verdict": "approved|needs-rework",
  "blocking_issues": [],
  "copilot_feedback_triage": { "ADDRESS": [], "DISCUSS": [], "SKIP": [] }
}
```

## Post-merge / release actions

Human review 後方可 merge。本 topic 不更新 README、VERSION、tag、release note 或 release；`merged` 為 terminal。

## Open Questions / Unresolved Items

無 scope blocker。實機觸控、正式產品 UI、動態 catalog、搜尋／分類與其他輸入方式是後續獨立 Mission。
