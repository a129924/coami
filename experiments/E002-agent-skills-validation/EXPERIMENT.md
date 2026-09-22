# E002：共用 Agent Skills 在 Coami 的可用性

## 問題與假設

- 問題：逐檔複製的 17 個技能，能否從 Coami 的 `server/` 工作目錄被 Codex 載入並執行？哪些流程有前置條件或路徑阻礙？
- 假設：技能可被本機 Codex 發現；隨附腳本可運作，但計畫流程需要 repo 層級合約。
- 成功條件：17 個技能出現在 CLI 提示清單；frontmatter 與隨附檔案可讀；腳本測試通過；無法使用的流程有可重現原因。

## 環境

- 日期：2026-09-22。
- Coami commit：`aa22c8e` 為 17 個技能的原樣複製快照；`fc0109a` 為內部資源路徑修正與本紀錄。
- 複製來源：`agent-skills` commit `60b3b5b`；提交前比對 96 個 staged 檔案，皆與來源逐位元相同。
- Plan 合約來源：`mlops-async` commit `9b08c84`，兩份來源檔案在來源 repo 中無未提交變更。
- Codex CLI：`0.155.1`；Python：`3.12.12`。

## 步驟

1. 從 Coami 根目錄執行 `git diff --cached --check`，並將所有 staged blob 與來源檔案逐位元比較；確認後建立快照 commit。
2. 逐一解析 17 個 `SKILL.md` 的 YAML frontmatter，檢查 `name`、`description` 與 `# Local references` 指向的隨附檔案。
3. 從 `server/` 執行 `codex debug prompt-input '請列出可用技能名稱'`，檢查輸出的 Skill roots 與 Available skills。
4. 從根目錄執行 `server/.venv/bin/python -m pytest -q -p no:cacheprovider .codex/skills/plan-step-tracker/tests/test_step_tracker.py`。
5. 檢查 `plan-creator`、`plan-reviewer`、`plan-step-tracker` 與 `step-creator` 指定的 repo 路徑；對不存在的 topic 執行 tracker CLI，確認錯誤行為。
6. 只把 8 個技能文件中 24 處指向隨附腳本或模板的 `skills/...` 引用改為 `.codex/skills/...`；重跑測試、實際 CLI 與靜態路徑檢查。
7. 將 `mlops-async/plan/` 的兩份共用合約原樣複製到 Coami 的 `plan/`；比對 SHA-256、11 個必要章節的順序，以及 12 條狀態轉移。

## 結果與證據

- 17 個 `SKILL.md` 的 frontmatter 與本地參考檔檢查通過。Codex CLI 的 Skill roots 包含 `/Users/andrew/code/python/coami/.codex/skills`，Available skills 包含全部 17 個名稱；從 `server/` 啟動也可見。
- `plan-step-tracker` 的 56 個測試通過。實際腳本位於 `.codex/skills/plan-step-tracker/scripts/step_tracker.py`；不存在的 topic 回傳 exit code 1 與預期的 `File not found`。
- 初次檢查時，`plan-creator` 與 `plan-reviewer` 要求的 `plan/agent-handoff-workflow.md` 和 `plan/topic-plan-contract.md` 均缺失，依技能規則為 `BLOCKED`。後續已原樣複製 `mlops-async` 的兩份合約；逐位元比對通過，11 個必要章節順序及 12 條狀態轉移均與現有 topic plan 模板一致，缺檔阻擋已解除。
- 原始 `plan-step-tracker` 指令範例與 `step-creator` 的內部模板引用指向不存在的 `skills/...` 路徑。已修正 8 個文件、24 處引用；三個 `.codex/skills/...` 目標檔案均存在，未留下同類錯誤引用。
- 修正後 tracker 既有測試仍為 56 passed；從 repo 根目錄以 `.codex/skills/plan-step-tracker/scripts/step_tracker.py` 執行 `read_all missing-topic`，得到預期的 exit code 1 與 `File not found`，確認指令已到達腳本。`git diff --check` 通過。
- Git commit 技能已用於本次 staged diff 審查；repo 的 `AGENTS.md` 要求主人確認具體訊息，優先於複製技能內較寬鬆的 commit 授權文字。

## 限制與決策

- 已驗證本機 Codex CLI 發現技能與 tracker 腳本測試；尚未用真實 Coami topic 完成 plan、review、TDD 的端到端流程。缺少 topic 或已核准 plan 屬於流程前置條件，不能以此判定技能本身失效。
- 保留 `aa22c8e` 作為 17 個技能逐檔複製的快照；依專案主人選擇，在後續工作樹中精準修正內部資源路徑。`skills/<skill-name>/...` 等未來技能產物範例仍保留原語意。
- Plan 合約缺檔已補齊；尚無 Coami 真實 topic plan 可供 `plan-reviewer` 審查，因此 plan、review、TDD 端到端流程仍未驗證。共用合約只解除兩個技能的 repo 層級前置阻擋，不替任何 topic 決定 scope 或實作。
- 本次未改 `server/src/`、`device/src/` 或任何 topic plan；未執行 push。

## 追加驗證：TypeScript TDD skill

### 問題與邊界

- 問題：新移植的 `typescript-tdd` 能否從 Coami 的 `server/` 被 Codex 發現，並指導 agent 在本 repo 完成可歸因的 RED→GREEN→strict typecheck？
- 測試邊界：`tdd-fixture/add.ts` 與 `tdd-fixture/add.test.ts` 是隔離的純函式樣本，規格為 `add(2, 3) === 5` 及 `add(-2, 3) === 1`；不代表 device 產品契約。
- 派遣要求：在 `feat/andrew/typescript-tdd-skill` worktree 的 `server/` 啟用並讀取 repo 的 `.codex/skills/typescript-tdd/SKILL.md`，確認工具鏈，先執行可歸因的 failing test，再做最小實作、執行受影響測試與 strict typecheck，並留下命令與退出碼。實作只在此 feature worktree；dev worktree 僅供唯讀參照。

### 環境與程序

- 基底 commit：`4573716`；Codex CLI `0.155.1`；Node `/Users/andrew/.nvm/versions/node/v24.19.0/bin/node` 為 `v24.19.0`；device local TypeScript 為 `7.0.2`。目前 shell 預設 Node 26，不用於本驗證。
- 已讀取新 worktree 中的 skill：`cat .codex/skills/typescript-tdd/SKILL.md` 退出碼 0。其規則要求先檢查 scripts、compiler options、測試工具，確認 RED 歸因，再以最小實作達 GREEN 並做 strict typecheck；以下命令與結果依此順序執行。與 Rivet 原文的 SHA-256 同為 `bb65eb2c6eddb5abaa3dfddb8a02fd648c5e1be10ea2d5c9cc9285cefc45365a`。
- `device/package.json` 只有 `typecheck` script，`device/tsconfig.json` 設 `strict: true`，沒有既有測試 runner。此 worktree 用 Node 24 的內建 test runner；以 `npm ci --prefix device --offline --ignore-scripts` 安裝專案已宣告的依賴，退出碼 0，沒有修改 package 設定。
- `skill-creator` 的 `quick_validate.py .codex/skills/typescript-tdd` 輸出 `Skill is valid!`，退出碼 0。執行時使用本機已有 PyYAML 的 Python venv；系統 Python 沒有 PyYAML。
- 從本 worktree 的 `server/` 執行 `CODEX_HOME=/private/tmp/coami-ts-tdd-codex-home codex debug prompt-input '請列出可用技能名稱'`，退出碼 0。輸出的 Skill roots 包含本 worktree 的 `.codex/skills`，Available skills 包含 `typescript-tdd`。臨時 `CODEX_HOME` 用於避開本機 sandbox 的 alias 寫入限制。

### RED、GREEN 與型別證據

以下命令均從此 worktree 根目錄執行；測試輸出保留在同一 fixture 目錄，僅移除空白行的尾端空白。

1. 初始 `add.ts` 提供正確的函式簽名，但暫時 `return 0`。執行 `/Users/andrew/.nvm/versions/node/v24.19.0/bin/node --test experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts`，退出碼 **1**；[`red.tap`](tdd-fixture/red.tap) 記錄兩個 `AssertionError`，分別為 `0 !== 5` 與 `0 !== 1`。測試已載入模組，失敗直接指向尚未實作的加總行為。
2. 最小實作改為 `return a + b`，以相同命令重跑，退出碼 **0**；[`green.tap`](tdd-fixture/green.tap) 記錄 2 passed、0 failed。沒有需要的重構。
3. 以 `/Users/andrew/.nvm/versions/node/v24.19.0/bin/node device/node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2024 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --types node --typeRoots device/node_modules/@types experiments/E002-agent-skills-validation/tdd-fixture/add.ts experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts` 檢查行為檔與測試檔，退出碼 **0**、無診斷。

### 決定與限制

- 可確認 `typescript-tdd` 在 Coami feature worktree 中可被發現，且 agent 依其規則完成隔離 TypeScript 行為的 RED→GREEN 與 strict typecheck。原始斷言失敗、GREEN 輸出及完整 typecheck 命令提供可複查的操作證據。
- 此結果不證明真實 device 行為、MOD runtime、bridge 或 E003 的 TDD 可用性；沒有改動 `device/src/`、device 設定或 E003 worktree。

### 實際 agent 派遣與會話證據

在本次工作會話中，派遣獨立 Implementer `/root/implement_ts_tdd_validation`，完整任務文字如下：

```text
角色：Implementer。這是使用者核准計畫中的 agent-skill forward test。請在 feature worktree `/Users/andrew/code/python/coami-typescript-tdd-skill` 工作，從該 worktree 的 `server/` 作為起點；絕對不要修改 dev worktree `/Users/andrew/code/python/coami` 或 E003 worktree。任務：明確讀取並遵循此 feature worktree 的 `.codex/skills/typescript-tdd/SKILL.md`，在既有 `experiments/E002-agent-skills-validation/tdd-fixture/` 的 `add.ts`/`add.test.ts` 上親自完成可歸因的 RED→GREEN→strict typecheck。現況 `add.ts` 已是 green `return a + b`，請先將其暫時改回規劃的 stub `return 0`，用 Node24 `/Users/andrew/.nvm/versions/node/v24.19.0/bin/node --test` 跑現有兩測試並覆寫 `red.tap`；確認只因 0 !== 5 / 0 !== 1 assertion failure 且 exit 1。再以最小實作恢復 `return a + b`，跑同一測試覆寫 `green.tap`，並用 worktree 已安裝的 TypeScript7 對 add.ts/add.test.ts 做 strict noEmit；必要 flags: `--strict --skipLibCheck --target ES2024 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --types node --typeRoots device/node_modules/@types`。請不要修改 E002 EXPERIMENT.md、skill 本體、device/src、scripts/tsconfig 或其他文件，僅可寫 add.ts、red.tap、green.tap。回報你讀取 skill 的具體工具呼叫與結果（可含 chunk_id / path / SHA）、實際每一步命令與 exit code、RED 原因、GREEN/typecheck 結果、最後 git status。這個 message 的全文會記錄到 E002 作為實際派遣 prompt。
```

Implementer 回報的工具會話紀錄可用下列命令與 chunk ID 對照：

| 動作 | 工具 chunk | exit | 可核結果 |
| --- | --- | ---: | --- |
| `cat .codex/skills/typescript-tdd/SKILL.md` | `e9a006` | 0 | 已讀內容 SHA-256 為 `bb65eb2c6eddb5abaa3dfddb8a02fd648c5e1be10ea2d5c9cc9285cefc45365a`，與來源一致 |
| 暫設 `add.ts` 為 `return 0` | `1ff722` | 0 | RED 前的明確缺失行為 |
| Node 24 執行測試並寫入 `red.tap` | `57e496` | 1 | 兩個 assertion failures，無載入錯誤 |
| 恢復最小的 `return a + b` | `2dcd17` | 0 | GREEN 實作 |
| Node 24 重跑測試並寫入 `green.tap` | `0fae59` | 0 | 2 passed、0 failed |
| Node 24 執行完整 strict typecheck 命令 | `8abcdf` | 0 | 無 diagnostics；命令如上節第 3 步 |

這些 chunk ID 是本次 agent 工具會話的定位資訊；repo 內的 `red.tap`、`green.tap` 與現態原始碼是可獨立檢查的檔案證據。獨立 Tester 亦重跑 skill validator、CLI discovery、GREEN 測試及 strict typecheck，均為 exit 0。
