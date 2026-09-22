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

### 問題與成功條件

- 問題：新移植的 `typescript-tdd` 能否從 Coami 的 `server/` 被 Codex 發現，並讓 agent 在此 repo 的隔離 TypeScript fixture 中實際撰寫 failing test、完成行為及型別驗證？
- 成功條件：agent 的派遣 prompt 只指定行為與範圍；agent 讀取 skill、自行選擇測試工具，新增一個可歸因的 failing test，接著使測試通過並完成 strict fixture typecheck。device 專案自身的 typecheck 另行驗證。
- 邊界：`tdd-fixture/add.ts` 與 `add.test.ts` 是純函式樣本，不代表 device 產品契約；不修改 `device/src/` 或 E003。

### 來源與環境

- 移植來源：[Rivet 的 `.codex/skills/typescript-tdd/SKILL.md`](https://github.com/a129924/rivet/blob/36d8a3ef9e28cedca4ca43b6137b3627f6f691f1/.codex/skills/typescript-tdd/SKILL.md)，不可變 commit `36d8a3ef9e28cedca4ca43b6137b3627f6f691f1`。以 `git show <commit>:.codex/skills/typescript-tdd/SKILL.md` 比對，來源與 Coami 檔案的 SHA-256 均為 `bb65eb2c6eddb5abaa3dfddb8a02fd648c5e1be10ea2d5c9cc9285cefc45365a`。
- 本次 feature worktree 基底 `4573716`；Codex CLI `0.155.1`、Node `v24.19.0`、TypeScript `7.0.2`。repo 的 `.node-version` 指定 Node 24；重跑前以自己的版本管理工具切換，確認 `node --version` 為 24.x。此 worktree 以 `npm ci --prefix device --offline --ignore-scripts` 安裝已宣告依賴，退出碼 0。
- `skill-creator` 的 `quick_validate.py` 輸出 `Skill is valid!`、退出碼 0。從此 worktree 的 `server/` 執行 `codex debug prompt-input '請列出可用技能名稱'`，退出碼 0；Skill roots 指向此 worktree 的 `.codex/skills`，Available skills 包含 `typescript-tdd`。本機 sandbox 執行 CLI 時使用臨時 `CODEX_HOME`，不改 repo。
- 首次演練的派遣 prompt 詳列 stub、測試命令、預期 RED/GREEN 與 typecheck 旗標；它只證明既有測試可重跑，不能單獨證明 skill 引導 agent 撰寫 failing test。以下第二次演練取代該過寬的判定。

### 第二次 agent 演練

- 起始狀態：`add.ts` 暫時回傳 `Math.max(0, a + b)`。原有兩個測試在此狀態下仍是 2 passed、0 failed；負的總和行為尚無測試。此缺陷只存在於演練過程，最終檔案已修正。
- 對獨立 agent `/root/ts_tdd_forward_retest` 的完整派遣 prompt 如下。prompt 未指定 RED/GREEN 步驟、runner、compiler 旗標或預期退出碼：

```text
請在 feature worktree `/Users/andrew/code/python/coami-typescript-tdd-skill` 的 `experiments/E002-agent-skills-validation/tdd-fixture/` 使用 repo 的 `typescript-tdd` skill 完成此行為：`add(a, b)` 對有限數值應回傳算術和，包括結果小於零的情況。保留現有測試，補足必要的行為驗證。僅修改 E002 fixture 的程式、測試與測試輸出；不要修改 skill、`EXPERIMENT.md`、device 產品程式碼、dev/E003 worktree，也不要執行 Git workflow。完成後依 skill 回報測試邊界、可歸因的失敗證據、完成後驗證，以及實際使用的 skill 路徑與命令。
```

- Agent 工具會話定位：讀取 skill `307c67`（exit 0）；新增測試後的檔案讀取 `3be1dc`；RED 執行 `20db4b`（exit 1）；最小實作後的檔案讀取 `06755f`；GREEN 執行 `aa485d`（exit 0）；strict fixture typecheck `a8a838`（exit 0）。兩次檔案修改由 `apply_patch` 完成，該工具沒有 chunk ID。這些 ID 供本次會話內核對；repo 內的測試檔與 `red.txt`／`green.txt` 是可獨立檢查的證據。
- Agent 讀取 `.codex/skills/typescript-tdd/SKILL.md`，保留原兩例，新增 `add(-3, 1) === -2`。它先執行測試，得到 2 passed、1 failed；[`red.txt`](tdd-fixture/red.txt) 記錄新案例的 `AssertionError: 0 !== -2`，退出碼 1。其後 agent 將實作改為 `return a + b`；[`green.txt`](tdd-fixture/green.txt) 記錄 3 passed、0 failed，退出碼 0。兩檔是 Node test runner 的人類可讀 spec 輸出，僅移除空白行尾端空白，副檔名不宣稱 TAP 格式。
- Agent 使用 TypeScript 7.0.2 對 `add.ts` 與 `add.test.ts` 執行 `--strict --noEmit`，退出碼 0、無診斷。由於 Node 的測試 import 與 device MOD 專案配置不同，fixture 明確指定 `NodeNext`、Node types 等旗標；此命令只驗證 fixture，不能替代 `device/tsconfig.json`。
- 另以 Node 24 執行 `npm --prefix device run typecheck`，退出碼 0；這是 repo 既有 device `tsconfig.json` 的檢查。

在 repo 根目錄可重跑 GREEN 與兩種型別檢查的命令如下；先按 `.node-version` 選用 Node 24，並執行 `npm ci --prefix device`。RED 屬歷史狀態；若需重現，須在拋棄式 checkout 暫時把 `add.ts` 改回上述缺陷版本，再跑相同測試。

```sh
node --test experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts
node device/node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2024 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --types node --typeRoots device/node_modules/@types experiments/E002-agent-skills-validation/tdd-fixture/add.ts experiments/E002-agent-skills-validation/tdd-fixture/add.test.ts
npm --prefix device run typecheck
```

### 決定與限制

- 新一輪演練證明此 repo 能載入 skill，且獲指派的 agent 實際新增了代表需求的 failing test，確認 RED 原因，再完成 GREEN 與 strict fixture typecheck。這支持「skill 可在 Coami 的隔離 TypeScript 工作中使用」；未做不使用 skill 的對照試驗，因此不宣稱 skill 的獨立因果效果。
- device 專案 typecheck 也通過，但 fixture 不在 `device/tsconfig.json` 的 `include` 內；本次不宣稱真實 device 行為、MOD runtime 或 E003 流程已驗證。
