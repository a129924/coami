# E002：共用 Agent Skills 在 Coami 的可用性

## 問題與假設

- 問題：逐檔複製的 17 個技能，能否從 Coami 的 `server/` 工作目錄被 Codex 載入並執行？哪些流程有前置條件或路徑阻礙？
- 假設：技能可被本機 Codex 發現；隨附腳本可運作，但計畫流程需要 repo 層級合約。
- 成功條件：17 個技能出現在 CLI 提示清單；frontmatter 與隨附檔案可讀；腳本測試通過；無法使用的流程有可重現原因。

## 環境

- 日期：2026-09-22。
- Coami commit：`aa22c8e`（只提交 `.codex/skills/` 的 96 個檔案）。
- 複製來源：`agent-skills` commit `60b3b5b`；提交前比對 96 個 staged 檔案，皆與來源逐位元相同。
- Codex CLI：`0.155.1`；Python：`3.12.12`。

## 步驟

1. 從 Coami 根目錄執行 `git diff --cached --check`，並將所有 staged blob 與來源檔案逐位元比較；確認後建立快照 commit。
2. 逐一解析 17 個 `SKILL.md` 的 YAML frontmatter，檢查 `name`、`description` 與 `# Local references` 指向的隨附檔案。
3. 從 `server/` 執行 `codex debug prompt-input '請列出可用技能名稱'`，檢查輸出的 Skill roots 與 Available skills。
4. 從根目錄執行 `server/.venv/bin/python -m pytest -q -p no:cacheprovider .codex/skills/plan-step-tracker/tests/test_step_tracker.py`。
5. 檢查 `plan-creator`、`plan-reviewer`、`plan-step-tracker` 與 `step-creator` 指定的 repo 路徑；對不存在的 topic 執行 tracker CLI，確認錯誤行為。
6. 只把 8 個技能文件中 24 處指向隨附腳本或模板的 `skills/...` 引用改為 `.codex/skills/...`；重跑測試、實際 CLI 與靜態路徑檢查。

## 結果與證據

- 17 個 `SKILL.md` 的 frontmatter 與本地參考檔檢查通過。Codex CLI 的 Skill roots 包含 `/Users/andrew/code/python/coami/.codex/skills`，Available skills 包含全部 17 個名稱；從 `server/` 啟動也可見。
- `plan-step-tracker` 的 56 個測試通過。實際腳本位於 `.codex/skills/plan-step-tracker/scripts/step_tracker.py`；不存在的 topic 回傳 exit code 1 與預期的 `File not found`。
- `plan-creator` 與 `plan-reviewer` 明文要求 `plan/agent-handoff-workflow.md` 和 `plan/topic-plan-contract.md`，並規定缺檔時 `BLOCKED`；Coami 目前缺少兩檔。
- 原始 `plan-step-tracker` 指令範例與 `step-creator` 的內部模板引用指向不存在的 `skills/...` 路徑。已修正 8 個文件、24 處引用；三個 `.codex/skills/...` 目標檔案均存在，未留下同類錯誤引用。
- 修正後 tracker 既有測試仍為 56 passed；從 repo 根目錄以 `.codex/skills/plan-step-tracker/scripts/step_tracker.py` 執行 `read_all missing-topic`，得到預期的 exit code 1 與 `File not found`，確認指令已到達腳本。`git diff --check` 通過。
- Git commit 技能已用於本次 staged diff 審查；repo 的 `AGENTS.md` 要求主人確認具體訊息，優先於複製技能內較寬鬆的 commit 授權文字。

## 限制與決策

- 已驗證本機 Codex CLI 發現技能與 tracker 腳本測試；尚未用真實 Coami topic 完成 plan、review、TDD 的端到端流程。缺少 topic 或已核准 plan 屬於流程前置條件，不能以此判定技能本身失效。
- 保留 `aa22c8e` 作為 17 個技能逐檔複製的快照；依專案主人選擇，在後續工作樹中精準修正內部資源路徑。`skills/<skill-name>/...` 等未來技能產物範例仍保留原語意。
- Plan 合約缺檔仍是 `plan-creator` 與 `plan-reviewer` 的待處理阻礙；本次路徑修正不代表 plan、review、TDD 端到端流程已驗證。
- 本次未改 `server/src/`、`device/src/` 或任何 topic plan；未執行 push。
