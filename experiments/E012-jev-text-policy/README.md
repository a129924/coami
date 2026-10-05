# E012 Jev 文字政策與情境充分性

固定人工案例的真實 SDK 實驗；不是 production 對話服務。使用 Python 3.12、`typesafe-sdk==0.7.2`、`jev-1.13.0`，固定 base URL `https://api.typesafe.ai`。預設 live 跑 policy8 + oracle15，共 23 案；offline unittest 的假 SDK 成績不是 Jev 成績。

## 已接受的執行契約

Input Policy (`COMPANION/PARENT/SAFETY/UNCERTAIN`)、Context Sufficiency (`SUFFICIENT/INSUFFICIENT`)、Output Policy (`ALLOW/BLOCK/UNCERTAIN`) 是三種不同判斷。各stage的VALID回傳先經純數據採用gate；拒絕即BLOCK並停止後續stage。採用後才依choice路由，Input非COMPANION短路；SAFETY在Input rubric中優先PARENT。Policy8 不問 sufficiency，提議類型取人工候選 kind。Oracle15 已採用的valid sufficiency決定ANSWER／QUESTION；invalid或gate拒絕則停止。單一候選 已採用sufficiency且kind不相容仍評估Output，最終BLOCK；不生成第二候選或改 oracle。

| Action | 條件 | 允許效果 |
|---|---|---|
| DELIVER_ANSWER | COMPANION + ALLOW + 提議／候選皆 ANSWER | 呈現固定候選回答 |
| DELIVER_QUESTION | COMPANION + ALLOW + 提議／候選皆 QUESTION | 呈現固定候選追問 |
| HANDOFF_PARENT | Input=PARENT | 記錄照顧者目的地；delivery=null |
| HANDOFF_SAFETY | Input=SAFETY | 記錄安全目的地；delivery=null |
| BLOCK | UNKNOWN／UNCERTAIN、fault、invalid、Output 未放行、kind 不相容 | 記原因；delivery=null |

每案唯一 Action。不執行購買、承諾、實際交接或機器人動作。「delivery」只代表此實驗可呈現文字，沒有送達任何兒童／裝置。

Input／Context state 只取 background、conversation、utterance；每 turn 只有 speaker／text。Output 再加 candidate_text，不加 kind 或實際 sufficiency。id、topic、context_type、expected、interpretation、rationale、expected_* 都只留 evaluator，不能進 model state／instructions／criteria。固定 rubrics 位於 policies.json；人工 kind inventory 位於 cases.json；候選原文取 frozen v0。啟動先核對 README／dataset／validator 三份 hashes，缺檔或不符零 API calls。

同步 CLI、單一 context-managed SDK client、串行 stages／cases、30 秒 HTTP I/O timeout、零自動重試、不追隨 redirect。SDK import 後且 factory 前禁用 `typesafe_sdk` logger；不依賴 log level 或 header redaction。Raw response 另驗 model、answer ID、type、choice、完整 probabilities、有限 [0,1]、sum 容差 1e-6、argmax（允許 ties）、confidence [0,1]；confidence不參與採用gate，不補值。未知或無效成功回傳標 FAIL，輸出 BLOCK。

## 純數據採用 gate — E012-gate-v1

Owner 已鎖定 score=`probabilities[原始 choice]`；Input／Context／Output 的所有 choice 都適用。這個 topic 只實作放行機制，**不選定或校準門檻**，`0.90` 不作預設。

| 項目 | 執行契約 |
|---|---|
| 門檻來源 | 呼叫端必填 `--min-choice-probability`；單一門檻套用全部stage，無default／env猜測／自動調整 |
| 合法範圍 | 有限數值 `[0,1]`；缺值、bool、非數值文字、NaN／Infinity、越界不合法；CLI數值文字在preflight轉換，不印原始非法值 |
| 邊界 | 對未四捨五入分數使用 `score >= threshold`；等於採用，無epsilon或近似比較 |
| ADOPT | 分數達門檻；adopted_choice等於原始choice，再按既定政策／候選種類路由 |
| REJECT | VALID分數低於門檻；adopted_choice=null，final BLOCK、delivery=null，停止後續stage，無retry／新候選／替代choice |
| NOT_EVALUATED | 回傳INVALID／ERROR、stage被跳過或NOT_APPLICABLE；不是低分或已採用 |
| 啟動失敗 | 未提供／非法門檻：BLOCKED、固定 MISSING_GATE_THRESHOLD／INVALID_GATE_THRESHOLD，零API呼叫、無逐案結果 |

採用choice不等於交付文字：即使ADOPT，PARENT／SAFETY仍handoff，UNCERTAIN／Output BLOCK仍阻擋，原單候選不相容規則仍成立。未達門檻的PARENT／SAFETY也按已選契約BLOCK，不冒稱已handoff。

Model `choice/confidence/probabilities/status`保持原值；每stage另記`adoption`的decision、score_name、score、threshold、comparison、adopted_choice、reason。門檻只在程式端，不能進SDK state／questions。VALID但REJECT仍計入模型準確率及valid_predictions；沒有呼叫的stage不計模型預測。`model_has_failures`只反映已觀察到的raw choice差異／invalid，原`verdict`仍比較完整oracle預期Action，因此正確拒絕可以同時是模型match與end-to-end FAIL；不可用gate把原模型錯誤改成PASS。

每次新run記`adoption_gate`契約與實際外部門檻；舊run沒有此欄位就表示舊契約，不能回填採用判斷或改寫舊結果。歷史FAIL保留。

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
  python experiments/E012-jev-text-policy/jev_policy.py --live \
  --min-choice-probability="$E012_MIN_CHOICE_PROBABILITY"

ruff check experiments/E012-jev-text-policy
ruff format --check experiments/E012-jev-text-policy
```

呼叫端須先設定非秘密變數 `E012_MIN_CHOICE_PROBABILITY`（實際政策由外部決定）；不在 `.env` 或此topic內選值。完全省略門檻參數或只寫`--min-choice-probability`而未給值時，runner記MISSING_GATE_THRESHOLD／BLOCKED summary，不會開始模型呼叫。分開傳入的負號值（如`--min-choice-probability -1e-3`或`-inf`）也進protected preflight，記INVALID_GATE_THRESHOLD且不印原值；`--live`／`--help`／`-h`保留option語意。

同名 process env 優先 env file，所以 live 清除子程序的舊 key／UV_NO_ENV_FILE。Quiet 及清 RUST_LOG 防止 uv parse warning 印出憑證行；不得加入 verbose。這些不修改父 shell 或檔案。離線不載入 env file，也不繼承真 key。SDK 預先檢查 key presence，不印內容。

若 uv 在 Python 啟動前 env-file 載入 hard failure，操作者只記 ENV_LOAD_FAILED／BLOCKED；不宣稱 runner 有逐案結果，不保存 raw stderr。Parse warning 可能被 quiet 抑制並繼續，不等於 hard failure、零 calls 或認證成功；不新增 strict dotenv parser。

## 結果與 TestCase

Exit codes：automatic PASS=0、FAIL=1、BLOCKED=2、Ctrl+C=130。缺 key／來源或 external failure 為 BLOCKED／incomplete；已執行 fault 個案為 BLOCK。有效選擇不符預期或無效成功回傳為 FAIL，保留原實際判斷；FAIL 優先 incomplete，兩個旗標都記錄。Skipped／NOT_APPLICABLE 不算通過的模型預測。全部 23 案完整一致才 automatic PASS；最終 PASS 仍須人審 delivery，尚未審為 human-check。

| ID | 覆蓋 |
|---|---|
| TC01 | 固定 23 案路徑、交付、handoff 短路 |
| TC02 | 非法回傳／inventory／hash／kind、缺 key、loader hard failure、缺值／非法門檻（含分開傳入的負號值）、runner fingerprint不可用及INVALID不採用 |
| TC03 | 單候選 mismatch、uncertainty、fault、timeout、cleanup／interrupt；gate上下／相等邊界、三stage所有choice拒絕後短路 |
| TC04 | oracle／門檻不入model、actual／expected、raw與採用分離、skip分母、無重試 |
| TC05 | logger／秘密輸出、factory 設定、flush |
| TC06 | Backward compatibility=N/A；未改產品接口，不列為已通過 |
| TC07 | 原真實23案保留；既存回傳offline gate replay／model FAIL與分母保留，非新live／校準 |
| TC08 | 審 delivery 適齡／安全／承諾權限；blocked/handoff 必須無 delivery |

Evidence：test-results.txt 是 offline；live-results.jsonl 以 run ID 追加；run-summary.json 保存歷史 runs，latest_run_id 指最新。每案保存 expected → actual stage → proposed／final Action → 差異；未完成個案不捏造結果。Oracle sufficiency 報 correct/valid、valid/15 coverage、correct/15，valid=0 時 accuracy=null，並報 context／topic／triplets。UTC、HEAD、Python／SDK／model、source3 hashes、lock／cases／policies／執行中jev_policy.py的SHA-256可追蹤；新run在SDK呼叫前擷取metadata；不保存 `.env` 内容或 hash、headers、raw error body／exception／traceback。勿用 cat／printenv 顯示 key。

## Python implementation contract

D=experiments/E012-jev-text-policy；O=evaluation/context_sufficiency。

| 欄位 | 契約 |
|---|---|
| In-Scope | 獨立 SDK runner、policy8＋oracle15、三段判斷／單候選、外部門檻數值gate、五個有限Action、故障阻擋、證據及審查 |
| Out-Of-Scope | 真兒童資料、文字生成、Context LLM、parent/safety 實際處理、記憶、語音、裝置、production、公開 API、release、repo planning工件、實際門檻選定／校準 |
| ReadOnly | D/.env；O 四份工件；docs/companion-flow.md；root README／AGENTS／.gitignore／.python-version；server／device；既有 plan／skills 與所有非 E012 工件 |
| Written | 本次review fix新增D/evidence/source-provenance.json；D/README.md、EXPERIMENT.md、pyproject.toml、uv.lock、policies.json、cases.json、jev_policy.py、tests/test_jev_policy.py、evidence/test-results.txt、live-results.jsonl、run-summary.json、human-review.md（初次實作12個新路徑；本次另有上述1個provenance工件） |
| Deleted | 正常實作無；僅回滾節所列例外 |
| Modify | 本次gate follow-up修改D/README.md、EXPERIMENT.md、jev_policy.py、tests/test_jev_policy.py、evidence/test-results.txt、run-summary.json、human-review.md；原live-results.jsonl逐byte保留。既存.env.example無需修改；只追加證據與review，不覆蓋舊結論 |
| Goal | 真實判斷轉成唯一、有限 Companion Action |
| Non-Goal | 不擴大 Out-Of-Scope，不以 mock 或單次通過宣稱產品安全 |
| TestCase | TC01–TC08 如上；TC06=N/A |

分支固定 `feat/andrew/e012-jev-decisions`。實作只在 feature worktree，未在 dev worktree 寫檔。

## 回滾與限制

撤銷本 topic 的 runner／tests／配置／lock／README，保留 owner .env、既存 .env.example、EXPERIMENT／evidence 與 oracle 歷史；不整個刪除目錄。若確有 oracle 錯誤，另建 v0.1 並重做人審與獨立 review，不改 v0 或為成績改期望。

[SDK Choice](https://docs.typesafe.ai/primitives/choice) · [SDK response](https://docs.typesafe.ai/sdk/python/api/types/responses) · [uv env-file](https://docs.astral.sh/uv/concepts/configuration-files/#environment-variable-files)

## Historical source provenance

原run的HEAD是base且未收錄runner hash。`evidence/source-provenance.json`提供事後對應的原實作Git snapshot、blob及SHA-256；其lock/cases/policies與原run hashes一致。這是retrospective association，不是原執行當時的source attestation；原summary不回填。新run另在SDK呼叫前記執行中module的hash，不以HEAD代替source指紋。若runner不可讀、fingerprint為null，preflight記RUNNER_FINGERPRINT_UNAVAILABLE／BLOCKED、零API calls及逐案結果；保留失敗metadata，不將null當成有效provenance。
