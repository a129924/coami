# E022 — Context Sufficiency 採用門檻研究

## Inputs

- Owner 已批准完整對話計畫及後續 feature worktree → implementation → direct topic commits → push → Draft PR → human review；此文件落盤不重開既定 scope／排序／契約。merge、release 與產品門檻採納未授權。
- `topic`: `E022-jev-context-threshold`；`created`: `2026-10-15`。
- 唯一實作 worktree：`/private/tmp/E022-jev-context-threshold/feature-worktree`；branch：`feat/andrew/e022-context-threshold`；verified base `dev` SHA：`a855b451b6fe1c24d02caf67c569ffa90a9ea732`。原 `/Users/andrew/code/python/coami` 不實作。
- 本文件中 `P = plan/E022-jev-context-threshold/`、`E = experiments/E022-jev-context-threshold/`，均相對上述 feature worktree；`T = /private/tmp/E022-jev-context-threshold/`。
- Analysis-layer semantic warning: `analysis/E022-jev-context-threshold/requirements.md` 與 `technical-spec.md` 均不存在。本 topic 使用 Owner 已批准對話計畫與本 plan/spec，不建立或假稱 optional analysis layer 完整；skill 的 optional-layer completeness 為 `INCOMPLETE`，不是執行行為的未決契約。
- 來源：E013 run `20261008T035450Z-010364d7`、frozen `v1-draft-004`／`context_sufficiency_v1`；research 40、holdout 20、v0 15。E012 numeric adoption contract、E013 README／`jev_context.py`／`evidence_tools.py` 已唯讀檢查；Plan-Creator 未讀 holdout 逐案機率或選門檻。主代理已確認 remote origin/dev 與 base SHA 相同、遠端同名 feature branch 不存在；已在 T/source-checkout 完整 local clone --no-hardlinks、detached 此 source SHA，使用原 README authenticated bootstrap／locked sync／--verify-evidence（無 candidate threshold）取得 verified_cases=75、gaps=[]、complete=true。完整 stdout／stderr 與 verbatim bootstrap 分別保存 T/runtime/logs/e013-verification.stdout、T/runtime/logs/e013-verification.stderr、T/runtime/logs/verify-e013.sh；這是環境前置 evidence，不是本 topic verify-source CLI 實作完成。最初 uv sandbox panic，核准 escalation 後重跑成功，原 repo 檔案未改。
- Workflow authority：`plan/topic-plan-contract.md`、`plan/agent-handoff-workflow.md`；本 plan 從 topic-plan-template 起稿。既有 plan-creator、feasibility-validation、git-branch-naming、archify、pr-lens、graphify skill 邊界沿用，不改 skills 或全域流程。

## Goal / Outcome

在 research 上以 E013 逐案證據提出 Context Sufficiency 採用門檻候選與可重算取捨，再對固定候選作一次 holdout 描述性保留組檢查，v0 獨立對照；交付 Owner 所需誤採用風險與拒絕原本正確判斷的成本。

主要假設：在 research 上，依鎖定排序所得候選較 0% baseline 減少已採用 `INSUFFICIENT → SUFFICIENT`，且至少保留一筆原本正確 choice。證據完整且兩者成立為「成功」；完整但條件不成立為「失敗」；證據／環境不足為「無法判定」。baseline 原誤判為零時明示沒有可降低空間，假設不成立仍可能有可用候選。holdout 不作 hypothesis gate，不創設安全通過分數。

## Scope

| Label | Contract |
| --- | --- |
| **In-Scope** | 來源驗證、research 101 點比較、候選固定、holdout／v0 檢查、逐案與分組報告、可重算驗證及三工具限定輔助交付。 |
| **Out-Of-Scope** | 新 Jev 呼叫、prompt／模型／案例／人工答案修改、產品設定、其他 stage 門檻、外部圖表發布、安裝／升級工具或全域流程改造。 |
| **ReadOnly** | 原 repo 與 feature worktree 中既有 E012／E013 全部證據、程式、案例、oracle／freeze，`evaluation/`、shared workflow／skills／既有 runtime／config、產品來源及存在時的 PR Lens overlay。 |
| **Written** | 僅下列 Artifact Paths 的 P／E 新 topic 檔案、T/source-checkout 完整隔離 clone 與其 E013 `.venv`、T/runtime caches／tmp／logs、T/pr-lens 圖與 rendered，以及受控工具暫存。 |
| **Deleted** | 既有 repo 檔案：無。只允許本 topic 工具自有暫存與失敗／過期衍生視覺 sidecars 清理；freeze／研究檢查歷史不可刪。 |
| **Modify** | 僅本 topic 新建檔案、外部 clone／環境／cache／logs 與工具 sidecars。clone 鎖定後不改 tracked source；candidate freeze／已產生檢查歷史不可覆寫或刪除。 |
| **Goal** | 可追溯的 Context Sufficiency 候選與取捨，交由 Owner 決定。 |
| **Non-Goal** | 不核准產品風險、不宣稱安全達標、不設定產品預設、不新增研究指標。 |
| **TestCase** | 門檻與 float 邊界、兩種誤判、拒絕正確、排序、無可用候選、來源完整性、group 隔離、freeze 綁定、重播一致性及零外部呼叫。 |

## Locked Decisions

- Review-ready-only experimental topic，無 stable-library surfaces；root `README.md`、`VERSION`、`.github/copilot-instructions.md` 均不變，沒有 release action。
- E012 規則：對 `k = 0..100` 共 101 個整數百分比，Python float `k / 100` 與 `probabilities[原始 choice] >= threshold` 比較。不得 rounding、epsilon、Decimal 或 confidence；等於採用。拒絕為 BLOCK；raw choice／raw 模型正誤不改寫。
- research 排序 lexicographic：已採用 I→S 最少 → 保留原本正確 choice 最多 → 同效用最低百分比。I→S 指人工 INSUFFICIENT、raw SUFFICIENT；S→I 反之。
- 最優點保留至少一筆原本正確 choice 才是可用候選。否則 `candidate = null`，只報診斷性最優點，不放寬排序；全拒絕或僅採用錯誤 choice 都屬無可用候選。
- 候選與理由在 holdout 門檻計算前固定。holdout 已公開，不稱 unseen／blind；不得藉 holdout 反覆挑值。事後改值只能另標探索結果；同一固定候選重播驗證允許。
- 來源完整性對 75 案全量 fail closed；任何 gaps 都不以 subset 產正式候選。不存在 SDK／runtime 重現證據時 environment blocked，不放寬來源或 auth 檢查。
- 一次完整 research sweep、一次固定候選 holdout／v0 檢查及必要同候選重播；不重新呼叫 Jev。工具缺口與研究判讀分開，不藉工具缺口重選值。
- 分支符合 `feat/andrew/<kebab-description>`。分支／worktree 已建立，不重建；執行前再核對 selector、base、E022 lineage 與衝突，不覆寫其他工作。
- Owner 最新授權 direct topic commits／push／Draft PR，覆蓋本 session 舊逐訊息確認 commit 偏好；仍須依 commit skill 檢查 staged diff、語意與範圍。Draft PR 停 human review，不 merge／release。

## Boundaries / Exclusions

Planner 負責 readiness／gate 判定；Plan-Creator 維護 planning artifacts；Implementer 實作／bounded fixes；Tester 提供測試證據；獨立 Reviewer／Plan-Reviewer 給 verdict。Creator 不自行宣稱 reviewer gate 通過。review-log 保存審閱來源、版本與路由，不能用未執行結果作 evidence。

原 repo 的 E013 `.venv` 不存在；禁止在該位置 sync。來源驗證必須在 `T/source-checkout/` 完整隔離 local clone：不使用 shared／alternates／shallow clone、不 hardlink objects、不用 `git worktree add`。鎖定單一 source revision，detached checkout 後 tracked bytes 唯讀，保留原 verifier canonical path、authenticated bootstrap、`.venv`／`sys.prefix` 與 SDK inventory 檢查。

不外推 Input／Output Policy 或其他情境。模型機率不是經校準錯誤風險；零觀察 I→S 不是安全證明。Owner 的產品風險上限與候選採納仍 unknown，屬交付後人類決策，不阻擋既定研究。

## Status / Allowed Transitions

- **Current topic implementation lifecycle**: `publish-in-progress`；七個 Implementation Steps 已完成，獨立 implementation-review 與 code-review 均 approved，依 Owner 授權進入 topic commits／push／Draft PR。審閱版本與證據見 review-log。
- **Planning handoff**: 獨立 Plan-Reviewer 已 approved，Planner 已判定執行 readiness 可前進；原批准合約不變，本次只同步 canonical lifecycle metadata。
- Allowed transitions（canonical）：`planned → creator-in-progress → review-ready → reviewer-in-progress`；`reviewer-in-progress → approved | needs-rework`；`needs-rework → creator-in-progress`；`approved → creator-in-progress | publish-in-progress`；`publish-in-progress → pr-open | merged`；`pr-open → needs-rework | merged`；`merged → terminal`。
- 本次授權路由只到 `pr-open`（Draft PR）後 human review；canonical merge transition 的列示不構成 merge 授權，無 `released` transition。
- 獨立 plan verdict 後，Planner 判定執行 readiness；implementation steps 全部有證據 `[X]` 才可進 implementation review-ready，pending 或 rework 均保持 creator-in-progress。六個 Workflow Stages 與 implementation steps 分別記錄；不得以 prose 代替 tracker gate。

## Artifact Paths

所有 P／E 路徑只在指定 feature worktree 寫入；下表以已定義根目錄展開即為精確路徑。

| Artifact | Path | Owner | Role |
| --- | --- | --- | --- |
| Topic plan | `P/E022-jev-context-threshold.plan.md` | Plan-Creator | 執行合約 |
| Specification | `P/E022-jev-context-threshold.spec.md` | Plan-Creator | Acceptance／scenarios／edges |
| Step tracker | `P/E022-jev-context-threshold.step.md` | Implementer；review phases 依獨立證據 | 六階段及單一鏡像 steps |
| Review log | `P/review-log.md` | 相應 reviewer／dispatcher | verdict evidence 與 routing |
| Experiment record | `E/README.md` | Implementer | feasibility-validation 八段紀錄 |
| Offline CLI | `E/threshold_analysis.py` | Implementer | 三個 entrypoints 與純分析 |
| Unit tests | `E/tests/test_threshold_analysis.py` | Implementer／Tester | 合成 fixtures 行為驗證 |
| Integrity | `E/evidence/integrity.json` | Implementer | pinned source、75-case proof／gaps、raw baseline |
| Research decisions | `E/evidence/research-decisions.jsonl` | Implementer | 40 × 101 決策 |
| Research summary | `E/evidence/research-summary.json` | Implementer | 101 點統計、排序／判讀 |
| Candidate freeze | `E/evidence/candidate-freeze.json` | Implementer | exclusive immutable 候選與 binding |
| Held-out decisions | `E/evidence/heldout-decisions.jsonl` | Implementer | 有候選時 holdout／v0 固定值重播 |
| Held-out summary | `E/evidence/heldout-summary.json` | Implementer | 分組描述性檢查或無候選 skip |
| Report | `E/evidence/report.md` | Implementer | 逐案風險、拒絕成本、Owner 交付 |
| Diagram sources | `E/visuals/source-map.md`, `E/visuals/workflow.json` | Implementer | 來源對照、繁中 workflow spec |
| Diagram and receipts | `E/visuals/workflow.html`, `E/visuals/validation.json`, `E/visuals/delivery.json`, `E/visuals/visual-check.json` | Implementer | 精確 HTML、showcase／SHA／byte receipts |
| Visual sidecars | `E/visuals/` 內 visual-check receipt 列示之四 PNG／contact sheet／JSON sidecars | Archify tool | 保留 CLI 原生命名，交 Reviewer 實際看 |
| Isolated source checkout | `T/source-checkout/`（含獨立 `.git/`） | Implementer | 完整 local clone，detached pinned source SHA |
| Replay dependency environment | `T/source-checkout/experiments/E013-jev-context-sufficiency/.venv/` | Implementer | 原 verifier 預期位置，Python 3.12／SDK 0.7.2 locked env |
| External caches／logs | `T/runtime/tmp/`, `T/runtime/uv-cache/`, `T/runtime/ruff-cache/`, `T/runtime/logs/` | Tool／Tester | 外部暫存、環境與檢查 logs |
| PR Lens graph | `T/pr-lens/graph.json`, `T/pr-lens/rendered/` | Implementer | 實際 bounded diff 的本機 change map |
| Tool transients | `E/visuals/.archify-delivery-*`；前述 T/runtime/tmp；不支援導向時工具自有 OS temp | Tool | 限工具自有 snapshots／temp 的建刪 |

既有 files 不改。未知額外 repo paths、工具 config、dependency files 或 evidence drift 先停止交回 scope 判定；不以此表放寬整個 repo。candidate freeze 與完成檢查歷史 immutable；除工具自有 sidecars 的限定重生／清理外，既有研究輸出不靜默覆寫。

## Implementation Steps

1. 在 `E/tests/test_threshold_analysis.py` 建立合成 fixtures 與行為測試，覆蓋 spec，取得必要初始失敗證據；不讀 holdout 逐案機率、不修改 E012／E013。
2. 在 `E/threshold_analysis.py` 實作 verify-source 與 research-only 載入／純門檻計算／統計／排序，固定 CLI 與輸出契約；來源驗證使用 T/source-checkout 的原 committed verifier。
3. 在 `E/threshold_analysis.py` 實作 exclusive candidate freeze、check-heldout、輸出 binding 檢查與報告；不開任意 holdout threshold sweep 介面。
4. 準備 T/source-checkout 與其 locked `.venv`，完成 unittest／Ruff 與來源 verifier；將來源版本、環境、指令、缺口與 raw baseline 記入 E/evidence/integrity.json 及 E/README.md，缺口即停止研究。
5. 只對 research 執行 101 點比較，exclusive 寫 research 決策／統計／candidate freeze；完成 freeze 後才對同候選一次檢查 holdout／v0，保存結果／skip 與限制。
6. 在 E/visuals 依 Archify artifact-first 流程建立、validate、deliver、visual-check 繁中 workflow；依實際 bounded diff 在 T/pr-lens 產本機 change map，Graphify 依既存圖可用性使用 bounded query 或 targeted source fallback，明示工具缺口。
7. 完成 E/README.md 八段紀錄與 E/evidence/report.md，保存固定候選重播／來源與輸出 hash 一致性證據、逐案誤判／拒絕成本及工具 receipts，整理可交獨立 Reviewer 的交付物。

## Validation / Acceptance Checks

- Spec 全部 acceptance 可追溯至新測試或 artifact evidence；來源全 75 案驗證通過才有正式候選，不修改既存 baseline。
- freeze 早於任何 holdout 門檻結果，且綁實際執行分析 source SHA-256、來源 revision／hashes、research 輸出與排序；base HEAD 不代表未提交分析 bytes。
- research／holdout／v0 分組獨立；raw 模型誤判與採用／BLOCK 分開，所有 I→S 個案可追溯。分母與零分母契約見 Requirements。
- Test commands（使用可用 Python 3.12，從 feature worktree root 執行）：`python3.12 -B -m unittest discover -s experiments/E022-jev-context-threshold/tests -p 'test_*.py' -v`；使用既存 Ruff `ruff check experiments/E022-jev-context-threshold` 及 `ruff format --check experiments/E022-jev-context-threshold`。既有工具不可得記 environment blocked，不私自安裝／升級。
- Source verifier 執行 E013 README 的 authenticated evidence bootstrap，cwd=T/source-checkout，選 `--verify-evidence` 及 clone 內 canonical tracked run，省略 `--candidate-threshold`、credentials／live args。不直接以普通 Python startup 執行 E013 runner。
- `TMPDIR=T/runtime/tmp`、`UV_CACHE_DIR=T/runtime/uv-cache`、`RUFF_CACHE_DIR=T/runtime/ruff-cache`；Python `-B`／停用 bytecode，logs 至 T/runtime/logs；不支援位置覆寫的 temp 只限工具自有 OS temp。
- Archify 9/9 showcase、0 errors／warnings、deliver 成功、source／HTML SHA-256 與 bytes receipts；visual-check 四 viewport containment 和 captures；Reviewer 實際看兩 themes／contact sheet 再給 truthful visual review。自動 `visualReview: pending` 不得寫為 passed。
- PR Lens provenance 必須真實；Graphify 結果須 source 核對；工具失敗與研究狀態分開，不能未產圖宣稱輔助完成。
- 唯一 worktree／branch、寫入 whitelist、tracking pending／done、reviewer JSON 與 human boundary 都須核對。主代理不得手算或自封 gate。

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

本次 Owner 授權 direct topic commits／push／Draft PR 後 human review，沒有 merge 或 release。若未來另授權 merge，保留研究證據與候選歷史，不修改產品設定、root README／VERSION，不執行 release action。

## Open Questions / Unresolved Items

無阻擋本 topic 契約的 Owner 未決問題。產品可接受 I→S 上限與候選採納由 Owner 在交付後決定，仍 unknown。Pinned source replay env 前置已由主代理實際驗證可用；本 topic CLI 及三工具操作尚未驗證。後續若不可得即 environment blocked，禁止捏造驗證結果。來源與圖表原始資料可能不足，依固定 gaps／工具 fallback 規則處理，不改研究範圍。

## Non-goals

不調整模型或 evidence，不用 holdout 調參，不改三-stage 共用政策，不新增 statistical test／calibration／安全分數，不移入 server/src 或 device/src，不 build／refresh Graphify，不安裝或修改三工具 runtime，不 publish 圖或合併 PR。

## Requirements

1. 每個納入案例可追溯 run ID、case ID、group、人工答案、raw choice、原 numeric probability 與已驗證原始回傳／hash。source commit 與 case version 固定。
2. 每一 research 門檻每案輸出採用／BLOCK、raw 正誤與方向；101 點依 Locked Decisions 排序，至少保留一筆原本正確才輸出非 null candidate。
3. 各組分別報 N=總數、V=有效 raw predictions、gaps／invalid、raw correct/V、A/V、保留正確/raw correct、拒絕正確/raw correct、已採用 I→S/人工 I 數、已採用 S→I/人工 S 數、已採用錯誤/A；保留 counts／denominators，零分母為 null。
4. freeze 先於 holdout 門檻分析；檢查只接受固定候選，不接受任意 threshold override。candidate=null 時 heldout-summary 記 skipped/no usable candidate，不做 heldout-decision 計算。
5. source integrity 缺口非零退出且記錄 gaps；不得把無效／無法驗證案例算正確。報告特別列出全部 I→S 在候選下的結果及拒絕原本正確的成本。
6. 報告區分 research 假設狀態與驗證任務是否完成；失敗的假設仍可完成研究。有限樣本、公開保留組、未校準機率、不可外推與 Owner 採納未核准均明示。

## Decisions

- **Async-planning status**: exempt — 全部為同步離線 finite-file analysis，無 async boundary、共享 pool、background owner、外部服務 concurrency 或 retry／timeout policy 變更；來源 replay 沿用 E013 offline verifier。
- **Module/package placement**: E/threshold_analysis.py 及 E/tests/test_threshold_analysis.py；不進產品 package。
- **New public API**: 無產品／跨 BC API；新增實驗 CLI，契約如下節。
- **Interface changes**: E012／E013 與產品 interface 不變；新 CLI 輸出只屬本實驗。
- **Breaking changes allowed**: 否。
- **New dependencies**: 無。分析及測試使用 Python 3.12 stdlib／unittest；來源 replay 在 clone 既定 locked E013 env，依賴準備不等於新增研究依賴。
- **Error handling strategy**: 可預期檔案／來源／binding／CLI 錯誤為非零退出與可審查 gap，停止依賴分析；不杜撰固定錯誤碼，不吞錯後產正式候選。
- **Typing strategy**: 完整 annotations；trusted analysis value 使用具名 typed records；untrusted JSON 僅在 decode boundary 接受 unknown 值後驗證，避免 Any 在計算流程傳播。

## Public Contract / API Changes

無產品 API／events／跨 BC contract 變更；CLI `main(argv: Sequence[str] | None = None) -> int`，stdout/stderr 不載入 secrets，0 為對應 operation 完成，非零代表缺口／操作失敗，不能據此宣稱主要假設成功。

```text
python3.12 -B E/threshold_analysis.py verify-source --source-checkout PATH --source-revision SHA --output PATH
python3.12 -B E/threshold_analysis.py research --integrity PATH --output-dir PATH
python3.12 -B E/threshold_analysis.py check-heldout --freeze PATH --output-dir PATH
```

上述 E/ 是本文路徑縮寫，實際命令展開完整 repo-relative 路徑。verify-source 的 PATH 必須為 T/source-checkout、鎖定完整 source SHA 與 E/evidence/integrity.json；research／check-heldout 的 output-dir 為 E/evidence，且不得覆寫已完成研究 artifacts。

- verify-source：確認 clone HEAD／tracked inputs match source revision、執行原 authenticated verifier，不傳 candidate threshold；integrity 包含 source checkout/revision、run ID、case version、verifier／來源 hashes、verified case counts、raw baseline、gaps 與驗證環境／命令。不輸出 holdout threshold data。
- research：先核對 integrity 為同一 pinned source、75 案完整且零 gaps，既有 analysis.jsonl 是 mixed-group 檔，逐列讀取後先按 group 篩選，只對 research 載入／處理 case decision 與 raw body；holdout／v0 的機率／correctness 不得影響 research，也不得打開其 raw bodies（verify-source 全75驗證例外）。寫 decisions／summary，最後 exclusive freeze。freeze 綁 integrity 及 research artifacts hashes、來源 run／revision／manifest／case hashes、實際 analysis source SHA-256、UTC、規則／排序、候選百分比與對應 float 或 null、診斷最優點及理由／公開 holdout 限制。source metadata 足供下階段定位，不需新 CLI 任意 source selector。
- check-heldout：先驗 freeze、integrity／完整 source inventory／research summary及decisions／執行 analysis source hash，並由 research 重算排序與候選以拒絕竄改／不一致的 freeze；全部吻合才載入 holdout／v0 做單一值檢查；candidate=null 則 exclusive 寫 skipped summary，不計算其他值。重播驗證在外部 scratch 比較輸出，不覆寫原 freeze 或檢查歷史。
- 所有研究 JSON 使用 UTF-8，保存原 numeric input，不以顯示百分比改寫計算值；人工報告可用百分比顯示，但 counts／分母及機器可重播值保留。

## Test Plan

所有新測試在 E/tests/test_threshold_analysis.py，fixtures 為合成資料，不借測試載入 holdout 實測機率。

- Happy path：完整來源 proof、research 101 點逐案／統計／排序、freeze 綁定後固定值 holdout／v0、raw accuracy 不變。
- Invalid input：missing／mismatched source revision、缺案例／重複 case、來源或 raw／analysis hash 不符、無有效 integrity、freeze/source binding 不符、已有 immutable output 不能覆寫；非零退出與 gaps，不出正式候選。
- Edge case：p == threshold、兩側、0／100%、Python float 邊界；confidence 不同而決策相同；兩誤判方向、拒絕正確、零分母、同效用最低點、全拒絕／只採錯誤／baseline I→S=0。
- Regression：research 入口用 guarded raw-body loader 證明不開 holdout／v0 raw bodies；mixed analysis.jsonl 中變更 holdout／v0 probabilities與correctness不影響 research選值（受來源完整性檢查約束的正式執行仍不得改原檔），禁止 --candidate-threshold reuse；freeze 前不能執行 holdout；改 source／research／analysis bytes 阻斷；僅竄改freeze候選／排序結果而外部hash未變仍由research重算拒絕；候選 null skip；同候選重播一致且不覆寫歷史。
- Backward compatibility：所有 E012／E013／evaluation bytes 保持，無產品 API changes；來源 verifier 不直接 startup／不放寬 sys.prefix／SDK inventory。
- 零 I/O unit fixtures mock source verifier／檔案邊界，無 credential、無 Jev／provider calls。真實 offline source verifier 是另外的驗證證據，不以 unittest pass 冒充。

## Tools / Auxiliary Delivery

- **Archify**：type=workflow，繁中主文「來源 → research → freeze → holdout → v0／報告 → Owner」。read workflow/common schema＋一個 example 後下一步先寫 E/visuals/workflow.json，不先看 renderer internals、不事前指定座標。`meta.quality_profile=showcase`；繁中省略 meta.locale，Viewer UI／html lang fallback English。每次修訂 validate，最終 deliver acceptance 必須9/9、0 errors／warnings，保存 source／artifact SHA-256、bytes。visual-check --repo-root 指 feature worktree，1440×900、1600×1000、1920×1080、2048×1320 containment；小／大各 light／dark captures及 contact sheet，Reviewer 真看才可獨立記 passed，自動 receipt 保留 visualReview pending。最多兩次 focused visual correction rounds；未改善或非零 exit 如實記錄，不 server／preview／publish。允許工具自有 delivery snapshot 建刪與 stale／failed sidecar 清理，不涉及研究歷史。
- **PR Lens**：CLI 0.11.0 `/Users/andrew/.local/share/pr-lens-runtime/bin/pr-lens`；實際 bounded diff 出現才取真實 base/head SHA、讀 diff/source，external graph.json 及 rendered。保留 unchanged neighbors／file refs。現在沒有 overlay 用 --no-config；執行時有既有 .github/pr-lens.yml 則唯讀 --config。未提交變更明標 working-tree diff，schema 不能忠實表示則 direct diff review fallback，不發明欄位／不冒稱 head commit 含未提交碼。僅 validate/render，禁止 analyze/provider/API/auth/upload/PR publish/server/install/config edits。
- **Graphify**：pinned 0.9.73 `/Users/andrew/.local/bin/graphify`；每次 CLI 均 GRAPHIFY_NO_AUTO_REFRESH=1。目前無圖，targeted source fallback，不 build/query 空圖；執行時若有可用圖先核 revision/source，query budget1500，關鍵關係 source 核對。禁止 build/refresh/install/hooks/provider/upload，無圖不是新增寫圖授權。
- 三工具 runtime metadata 已存在不等於 execution verified；來源 verifier 環境前置的成功也不代替三工具驗證。三工具不能改研究 hypothesis／候選／holdout。工具缺口與研究狀態分開，輔助交付未完成不冒稱完成。

## Risks / Rollback

公開 holdout／有限樣本與非校準機率限制外推；SDK digest 的特定平台 bytes 可能不可重現；工具可能 unavailable。遵守 block/fallback，不改研究判準迎合結果。撤回建議時保留來源、freeze／檢查歷史並在 E/README.md／report 記理由；撤回新程式可由獨立授權 revert 本 topic code，不刪改原 evidence 或產品檔案。
