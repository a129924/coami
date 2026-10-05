# E012 Jev 文字政策與情境充分性

固定人工案例的真實 SDK 實驗；不是 production 對話服務。使用 Python 3.12、`typesafe-sdk==0.7.2`、`jev-1.13.0`，固定 base URL `https://api.typesafe.ai`。預設 live 跑 policy8 + oracle15，共 23 案；offline unittest 的假 SDK 成績不是 Jev 成績。

## 已接受的執行契約

Input Policy (`COMPANION/PARENT/SAFETY/UNCERTAIN`)、Context Sufficiency (`SUFFICIENT/INSUFFICIENT`)、Output Policy (`ALLOW/BLOCK/UNCERTAIN`) 是三種不同判斷。Input 非 COMPANION 短路；SAFETY 在 Input rubric 中優先 PARENT。Policy8 不問 sufficiency，提議類型取人工候選 kind。Oracle15 valid sufficiency 決定 ANSWER／QUESTION；invalid 則停止。單一候選 kind 不相容仍評估 Output，最終 BLOCK；不生成第二候選或改 oracle。

| Action | 條件 | 允許效果 |
|---|---|---|
| DELIVER_ANSWER | COMPANION + ALLOW + 提議／候選皆 ANSWER | 呈現固定候選回答 |
| DELIVER_QUESTION | COMPANION + ALLOW + 提議／候選皆 QUESTION | 呈現固定候選追問 |
| HANDOFF_PARENT | Input=PARENT | 記錄照顧者目的地；delivery=null |
| HANDOFF_SAFETY | Input=SAFETY | 記錄安全目的地；delivery=null |
| BLOCK | UNKNOWN／UNCERTAIN、fault、invalid、Output 未放行、kind 不相容 | 記原因；delivery=null |

每案唯一 Action。不執行購買、承諾、實際交接或機器人動作。「delivery」只代表此實驗可呈現文字，沒有送達任何兒童／裝置。

Input／Context state 只取 background、conversation、utterance；每 turn 只有 speaker／text。Output 再加 candidate_text，不加 kind 或實際 sufficiency。id、topic、context_type、expected、interpretation、rationale、expected_* 都只留 evaluator，不能進 model state／instructions／criteria。固定 rubrics 位於 policies.json；人工 kind inventory 位於 cases.json；候選原文取 frozen v0。啟動先核對 README／dataset／validator 三份 hashes，缺檔或不符零 API calls。

同步 CLI、單一 context-managed SDK client、串行 stages／cases、30 秒 HTTP I/O timeout、零自動重試、不追隨 redirect。SDK import 後且 factory 前禁用 `typesafe_sdk` logger；不依賴 log level 或 header redaction。Raw response 另驗 model、answer ID、type、choice、完整 probabilities、有限 [0,1]、sum 容差 1e-6、argmax（允許 ties）、confidence [0,1]；無信心門檻，不補值。未知或無效成功回傳標 FAIL，輸出 BLOCK。

## 憑證與重現

`.env` 是 owner 維護的 ReadOnly 本機憑證檔，Git 忽略；`.env.example` 是已存在、可版本控制的安全範本，只能包含變數名稱與空值／placeholder。檔案存在不代表認證、model 權限或網路已通過。由 uv 明確載入 `TYPESAFE_API_KEY`，不裝 python-dotenv，不依賴 SDK 找檔。

從 repo root 執行；建立 lock 的首次開發操作是 `uv lock --project experiments/E012-jev-text-policy`，後續只用 locked sync／run：

```sh
uv sync --locked --project experiments/E012-jev-text-policy

env -u TYPESAFE_API_KEY uv run --locked --project experiments/E012-jev-text-policy \
  --no-env-file python evaluation/context_sufficiency/validate_dataset.py

env -u TYPESAFE_API_KEY uv run --locked --project experiments/E012-jev-text-policy \
  --no-env-file python -m unittest discover -s experiments/E012-jev-text-policy/tests -v

env -u TYPESAFE_API_KEY -u UV_NO_ENV_FILE -u RUST_LOG uv run \
  --quiet --locked --project experiments/E012-jev-text-policy \
  --env-file experiments/E012-jev-text-policy/.env \
  python experiments/E012-jev-text-policy/jev_policy.py --live

ruff check experiments/E012-jev-text-policy
ruff format --check experiments/E012-jev-text-policy
```

同名 process env 優先 env file，所以 live 清除子程序的舊 key／UV_NO_ENV_FILE。Quiet 及清 RUST_LOG 防止 uv parse warning 印出憑證行；不得加入 verbose。這些不修改父 shell 或檔案。離線不載入 env file，也不繼承真 key。SDK 預先檢查 key presence，不印內容。

若 uv 在 Python 啟動前 env-file 載入 hard failure，操作者只記 ENV_LOAD_FAILED／BLOCKED；不宣稱 runner 有逐案結果，不保存 raw stderr。Parse warning 可能被 quiet 抑制並繼續，不等於 hard failure、零 calls 或認證成功；不新增 strict dotenv parser。

## 結果與 TestCase

Exit codes：automatic PASS=0、FAIL=1、BLOCKED=2、Ctrl+C=130。缺 key／來源或 external failure 為 BLOCKED／incomplete；已執行 fault 個案為 BLOCK。有效選擇不符預期或無效成功回傳為 FAIL，保留原實際判斷；FAIL 優先 incomplete，兩個旗標都記錄。Skipped／NOT_APPLICABLE 不算通過的模型預測。全部 23 案完整一致才 automatic PASS；最終 PASS 仍須人審 delivery，尚未審為 human-check。

| ID | 覆蓋 |
|---|---|
| TC01 | 固定 23 案路徑、交付、handoff 短路 |
| TC02 | 非法回傳／inventory／hash／kind、缺 key、loader hard failure |
| TC03 | 單候選 mismatch、uncertainty、fault、timeout、cleanup／interrupt |
| TC04 | oracle exclusion、actual／expected、skip 分母、無重試 |
| TC05 | logger／秘密輸出、factory 設定、flush |
| TC06 | Backward compatibility=N/A；未改產品接口，不列為已通過 |
| TC07 | 真實 23 案、suite／stage 指標與 confusion matrix |
| TC08 | 審 delivery 適齡／安全／承諾權限；blocked/handoff 必須無 delivery |

Evidence：test-results.txt 是 offline；live-results.jsonl 以 run ID 追加；run-summary.json 保存歷史 runs，latest_run_id 指最新。每案保存 expected → actual stage → proposed／final Action → 差異；未完成個案不捏造結果。Oracle sufficiency 報 correct/valid、valid/15 coverage、correct/15，valid=0 時 accuracy=null，並報 context／topic／triplets。UTC、HEAD、Python／SDK／model、source3 hashes、lock／cases／policies hashes可重現；不保存 `.env` 内容或 hash、headers、raw error body／exception／traceback。勿用 cat／printenv 顯示 key。

## Python implementation contract

D=experiments/E012-jev-text-policy；O=evaluation/context_sufficiency。

| 欄位 | 契約 |
|---|---|
| In-Scope | 獨立 SDK runner、policy8＋oracle15、三段判斷／單候選、五個有限 Action、故障阻擋、證據及審查 |
| Out-Of-Scope | 真兒童資料、文字生成、Context LLM、parent/safety 實際處理、記憶、語音、裝置、production、公開 API、release、repo planning 工件 |
| ReadOnly | D/.env；O 四份工件；docs/companion-flow.md；root README／AGENTS／.gitignore／.python-version；server／device；既有 plan／skills 與所有非 E012 工件 |
| Written | D/README.md、EXPERIMENT.md、pyproject.toml、uv.lock、policies.json、cases.json、jev_policy.py、tests/test_jev_policy.py、evidence/test-results.txt、live-results.jsonl、run-summary.json、human-review.md（原 12 個新路徑） |
| Deleted | 正常實作無；僅回滾節所列例外 |
| Modify | Written 建立後可修正；既存 .env.example 僅必要的安全模板修正，本次無需修改；證據保留 run 歷史，不覆蓋舊結論 |
| Goal | 真實判斷轉成唯一、有限 Companion Action |
| Non-Goal | 不擴大 Out-Of-Scope，不以 mock 或單次通過宣稱產品安全 |
| TestCase | TC01–TC08 如上；TC06=N/A |

分支固定 `feat/andrew/e012-jev-decisions`。實作只在 feature worktree，未在 dev worktree 寫檔。

## 回滾與限制

撤銷本 topic 的 runner／tests／配置／lock／README，保留 owner .env、既存 .env.example、EXPERIMENT／evidence 與 oracle 歷史；不整個刪除目錄。若確有 oracle 錯誤，另建 v0.1 並重做人審與獨立 review，不改 v0 或為成績改期望。

[SDK Choice](https://docs.typesafe.ai/primitives/choice) · [SDK response](https://docs.typesafe.ai/sdk/python/api/types/responses) · [uv env-file](https://docs.astral.sh/uv/concepts/configuration-files/#environment-variable-files)
