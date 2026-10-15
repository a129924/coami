# E022：Jev Context Sufficiency 採用門檻研究

## 驗證什麼

- 實驗編號：E022；獨立離線研究，未覆寫 E012／E013。
- 設計／執行日期：2026-10-15。
- 主要問題：在固定 E013 research 證據上，依 Owner「誤採用優先」排序選出的 Context Sufficiency 採用門檻，能否降低已採用的 `INSUFFICIENT → SUFFICIENT`，並至少保留一筆原本正確 choice？
- 主要假設只適用 research；holdout 是固定候選後的描述性保留組檢查，v0 為獨立歷史對照，不作假設或安全 gate。

## 為什麼

E013 保存原始模型判斷與機率，未選採用門檻。文件可確認契約，仍須重播逐案證據才知道拒絕錯誤與拒絕正確的取捨。本研究交付候選及成本，產品風險上限與是否採納仍由 Owner 決定。

來源為 run `20261008T035450Z-010364d7`、凍結版本 `v1-draft-004`／`context_sufficiency_v1`，鎖定 commit `a855b451b6fe1c24d02caf67c569ffa90a9ea732`。依據為 E012 numeric adoption contract、E013 README／`jev_context.py`／`evidence_tools.py`，及本 topic [批准計畫](../../plan/E022-jev-context-threshold/E022-jev-context-threshold.plan.md)。沒有新 Jev 呼叫、prompt／模型／案例／人工答案修改。

## 成功與失敗判準

執行前固定：對 101 個整數百分比 `k=0..100`，以 Python float `k / 100` 比較 `probabilities[raw choice] >= threshold`，等於採用；不用 confidence、rounding、epsilon 或 Decimal。拒絕為 BLOCK，不改 raw choice 或模型正誤。

候選依序為已採用 I→S 最少、保留原本正確 choice 最多、同效用最低門檻。最優點零正確保留時 `candidate=null`，不放寬排序；有可用候選不等於假設成立。

- 成功：research 相較 0% baseline 嚴格減少已採用 I→S，且保留至少一筆原本正確 choice。
- 失敗：證據完整但上述條件不成立；baseline 已零誤判時明示沒有降低空間。
- 無法判定：來源／環境／重算有缺口，停止正式候選及相關檢查主張。
- 投入限定一次 research sweep、一次固定候選 holdout／v0 檢查及必要同候選重播；事後改值只能另標探索，不能沿用獨立保留組主張。

## 環境與前置條件

- Worktree：`/private/tmp/E022-jev-context-threshold/feature-worktree`；branch：`feat/andrew/e022-context-threshold`；base／source revision 為上述完整 SHA。
- Python 3.12.12，分析／unittest 使用 stdlib；原 E013 replay 使用 `typesafe-sdk==0.7.2` 及原鎖定 transitive code inventory。
- Source checkout：`/private/tmp/E022-jev-context-threshold/source-checkout`，完整 local clone `--no-hardlinks`、detached source SHA；`.venv` 位於該 clone 的 `experiments/E013-jev-context-sufficiency/.venv/`。保留原 authenticated bootstrap、canonical evidence path、sys.prefix 與 SDK digest 檢查；不在原 repo 建環境。
- 原 verifier 與本 topic verify-source 已完成全 75 案核對，`gaps=[]`，來源 inventory 與原始 hashes 見 [integrity.json](evidence/integrity.json)。環境準備初次 uv sandbox panic；核准 escalation 後成功，未改原 repo bytes。
- 外部 tmp／uv-cache／ruff-cache／logs 均在 `/private/tmp/E022-jev-context-threshold/runtime/`；Python 停用 bytecode，不載入憑證、不呼叫 Jev／provider。
- Archify 本機 validate／deliver／visual-check 已執行；PR Lens 固定 CLI 0.11.0、Graphify 固定 0.9.73 僅依各自本機邊界使用，未安裝或升級 runtime。

## 重現步驟

以下為實際操作介面。歷史輸出 exclusive，不要在同一 evidence 目錄重跑覆寫；來源與候選保持唯讀，同候選驗證輸出使用外部 scratch。

```sh
python3.12 -B experiments/E022-jev-context-threshold/threshold_analysis.py verify-source --source-checkout /private/tmp/E022-jev-context-threshold/source-checkout --source-revision a855b451b6fe1c24d02caf67c569ffa90a9ea732 --output experiments/E022-jev-context-threshold/evidence/integrity.json
python3.12 -B experiments/E022-jev-context-threshold/threshold_analysis.py research --integrity experiments/E022-jev-context-threshold/evidence/integrity.json --output-dir experiments/E022-jev-context-threshold/evidence
python3.12 -B experiments/E022-jev-context-threshold/threshold_analysis.py check-heldout --freeze experiments/E022-jev-context-threshold/evidence/candidate-freeze.json --output-dir experiments/E022-jev-context-threshold/evidence
```

1. verify-source 從隔離 clone 使用原 README 的 authenticated evidence bootstrap，不傳 candidate threshold；全 75 案完整才前進。
2. research 掃描 mixed analysis rows，但只處理 research decision／raw bodies，比較 101 點並保存 4,040 筆逐案決策。
3. exclusive freeze 最後寫入，綁 source inventory、integrity、research summary／decisions 與實際執行分析 source SHA-256；候選固定後才執行 check-heldout。
4. check-heldout 重新核對 hashes 並從 research 重算候選一致性，才對固定值檢查 holdout／v0；不提供任意門檻 override。
5. unittest、Ruff、來源驗證與同候選重播是不同證據，不以工具 pass 代替研究判準。

原 verifier 的 verbatim bootstrap、stdout／stderr：`/private/tmp/E022-jev-context-threshold/runtime/logs/verify-e013.sh`、`e013-verification.stdout`、`e013-verification.stderr`。本輪合成測試有效 RED：`tests-regression-red.stdout`（兩個行為缺陷、三個失敗），修正後 `tests-regression-final-green.stdout`：29 tests OK。最初零測試／module missing 屬 setup failure，不冒稱有效 RED。Ruff 對分析及測試兩檔 check／format check 通過，為主代理／Tester 回報。

同一固定候選已重播到 `/private/tmp/E022-jev-context-threshold/runtime/tmp/heldout-replay/`；主代理提供 `/private/tmp/E022-jev-context-threshold/runtime/logs/heldout-replay.json`，三份輸出與正式歷史 byte-identical，未覆寫歷史或重選候選：

- `heldout-decisions.jsonl` SHA-256：`62b5c6a00f1a33e61f491706324ead1f1e1f2f281d48311d318b9c4ffde261eb`。
- `heldout-summary.json` SHA-256：`6b38d1ede31a943a5cd097c36e7eec6cbb42b82818de87bfd7ebef7fd57f18cc`。
- `report.md` SHA-256：`b531cab5581ff051f3c4214ebc97925c083a4b7a2c324c78b19cabd0e9826a3b`。

## 是否成功

- 實驗狀態：**成功**，限 research 事前主要假設。
- 原 research I→S 為 3，候選下已採用 I→S 為 0，且保留 24 筆原本正確 choice，符合固定判準。
- 本輪核心研究驗證任務完成：**是**，依現有 report／summary／逐案證據可判讀；獨立 implementation／code review 均 approved，不等於已核准產品採納。
- 候選固定於 `2026-10-15T04:01:12.505701+00:00`，為 **79%**（float `0.79`）；實際分析 source SHA-256：`fc5596de54c6617a9118d5504260defb5706bf83ee4012597be7acf9549cae0b`。這是已完成研究的紀錄，不重新選值。

## 結果與證據

Research 的代表性門檻取捨如下；完整 101 點保留在 `research-summary.json`。各列原始正確判斷都是 35 案，門檻只改採用結果。

| 門檻 | 採用／40 | 保留正確／35 | 拒絕正確／35 | 已採用 I→S | 已採用 S→I |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0% | 40 | 35 | 0 | 3 | 2 |
| 78% | 25 | 24 | 11 | 1 | 0 |
| **79%** | **24** | **24** | **11** | **0** | **0** |
| 80% | 21 | 21 | 14 | 0 | 0 |
| 90% | 11 | 11 | 24 | 0 | 0 |
| 100% | 0 | 0 | 35 | 0 | 0 |

78% 與 79% 保留相同數量的正確判斷，但 78% 多採用一個 I→S；提高到 80% 又多拒絕三個正確判斷。因此既定排序選出 79%，並保留其拒絕 11 個正確判斷的成本。

| Group | Raw correct | Adopted／N | Retained correct／raw correct | Rejected correct／raw correct | Adopted I→S／人工 I | Adopted S→I／人工 S |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| research | 35/40 | 24/40 | 24/35 | 11/35 | 0/17 | 0/23 |
| holdout | 17/20 | 13/20 | 13/17 | 4/17 | 0/8 | 0/12 |
| v0 | 14/15 | 12/15 | 12/14 | 2/14 | 0/10 | 0/5 |

原模型誤判仍保留；拒絕錯誤不改記模型正確。拒絕原本正確判斷的成本分別為 11、4、2 案；全部 I→S 與拒絕正確清單見 [report.md](evidence/report.md)，各點分母見 [research-summary.json](evidence/research-summary.json)，逐案見 [research-decisions.jsonl](evidence/research-decisions.jsonl)／[heldout-decisions.jsonl](evidence/heldout-decisions.jsonl)。[candidate-freeze.json](evidence/candidate-freeze.json) 與 [heldout-summary.json](evidence/heldout-summary.json) 保存固定值及 binding。

輔助交付狀態：

- [Archify workflow](visuals/workflow.html)：兩 lane composition 修正後 showcase 9/9、0 errors／warnings，deliver 成功；[delivery receipt](visuals/delivery.json) 綁 spec SHA-256 `180f3e2c3dcadc78478654a10c6286b51c28305178d67550d8fbfc3eb6c63edb`／2,258 bytes、HTML SHA-256 `acf784b3fefe137796c5027faa8b72038d62cc28a4f6506ea34673c1f7579e31`／698,651 bytes。
- [visual-check receipt](visuals/visual-check.json)：1440×900、1600×1000、1920×1080、2048×1320 containment pass；四張小／大 light／dark PNG 與 [contact sheet](visuals/workflow.visual-check.html) 完整。自動 `visualReview: pending` 保留；獨立 Reviewer 首次看四 PNG，因 source→compare 線穿過第二列 lane header 判為 failed；局部 edge 修復並重新 validate／deliver／capture 後，`/root/plan_reviewer` 已實看四張新的小／大 light／dark PNG，確認穿越解除、可讀、無截斷、最大尺寸平衡，人工 `visual_review: passed`。這項獨立紀錄與自動 `visualReview: pending` 並列，未改自動 receipt。作者語言繁中，固定 Viewer UI／HTML lang fallback English。
- PR Lens：precommit 階段採 direct staged diff review fallback，不自造 committed head。提交研究與視覺證據後，已以固定 CLI 0.11.0 在 `/private/tmp/E022-jev-context-threshold/pr-lens/` validate／render 成功：3 lanes、9 nodes、9 edges、3 walkthrough steps、1 SVG；真實 base／head 見外部 graph.json／rendered/manifest.json。只本機輸出，不上傳圖或修改 repo config。
- Graphify：已重核 feature worktree 無可用 graph，採 targeted source reads fallback，未 build／refresh／query 空圖。圖與 source 對照見 [source-map.md](visuals/source-map.md)。

## 結論與限制

在 Owner 鎖定的排序下，research 支持 79% 候選與上述拒絕成本；holdout 僅為固定後的一次描述性檢查，未用來選值。樣本僅 40／20／15、holdout 已公開，模型機率不等於經校準錯誤風險；零觀察誤採用不是安全達標，不能外推 Input／Output Policy 或其他情境。

工具缺口與研究判讀分開，輔助圖、測試或 replay 通過均不核准產品採用。Owner 尚須決定可接受 I→S 風險與候選採納；產品設定未改。獨立審閱、topic commits 與 push 已完成，[Draft PR #22](https://github.com/a129924/coami/pull/22) 停在 human review，不 merge／release。Git hook 提示缺少 lefthook；未宣稱 hook 通過，已另完成手動 Ruff／29 tests 及獨立審閱。撤回候選建議須保留 freeze／檢查歷史並記原因。
