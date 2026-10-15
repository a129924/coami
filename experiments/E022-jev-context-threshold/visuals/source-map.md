# E022 workflow 來源對照

本圖描述已批准的研究流程，不代表產品架構或安全核准。作者語言為繁中；省略 `meta.locale`，固定 Viewer UI／HTML lang fallback English。圖中「人類審閱」為 Owner 風險／採納停點，尚未完成。

| Node／relationship | Meaning | Repository source |
| --- | --- | --- |
| `verify`：驗證來源／75 案 | 隔離 clone 的原 authenticated E013 verifier，全量 proof／gaps | `../threshold_analysis.py`：`verify_source`／`evidence_bootstrap`；`../evidence/integrity.json`；E013 `evidence_tools.py` 的 committed verifier |
| `compare`：40 案／101 點 | research-only loading、原 float >=、Owner 三階排序 | `../threshold_analysis.py`：`load_cases`／`rank_research`／`research_payload`；`../evidence/research-summary.json`／`research-decisions.jsonl` |
| `freeze`：規則與 hashes | 候選先固定，實際分析 source 與來源／research 輸出 binding | `../threshold_analysis.py`：`research`／`validate_selection`；`../evidence/candidate-freeze.json` |
| `freeze → heldout`：「固定後」 | hashes 與 research 候選重新推導一致才開啟保留組計算 | `../threshold_analysis.py`：`check_heldout`；`../evidence/heldout-summary.json` 的 freeze SHA |
| `heldout`：20 案／一個值 | 公開 holdout，僅固定候選描述性檢查，不調參 | `../evidence/heldout-summary.json`／`heldout-decisions.jsonl`；批准 plan Locked Decisions |
| `report`：v0／15 案／取捨 | v0 獨立對照；raw 模型正誤與採用／拒絕成本分離 | `../threshold_analysis.py`：`report`；`../evidence/report.md`；`../README.md` |
| `owner`：人類審閱／風險與採納 | 產品風險上限／採納由 Owner 決定；不是本研究或工具自動 gate | 批准 plan Goal／Boundaries／Post-merge；`../evidence/report.md` 限制與 Owner 決策 |
| 判讀邊界 card | 有缺口／無候選停止對應檢查；公開 holdout；BLOCK 不改 raw 正誤 | plan/spec；`../threshold_analysis.py`：`candidate`／`hypothesis`／`check_heldout` |

來源 run：`20261008T035450Z-010364d7`；source revision：`a855b451b6fe1c24d02caf67c569ffa90a9ea732`。圖只呈現流程，不另選門檻或增加研究指標。兩個 lanes 是閱讀分組，不表示 runtime／服務邊界。

## Artifact receipts

- `workflow.json` 為圖 source，`workflow.html` 為 delivered artifact；validate／deliver：showcase 9/9、0 errors／warnings。
- `delivery.json`：spec SHA-256 `180f3e2c3dcadc78478654a10c6286b51c28305178d67550d8fbfc3eb6c63edb`，2,258 bytes；HTML SHA-256 `acf784b3fefe137796c5027faa8b72038d62cc28a4f6506ea34673c1f7579e31`，698,651 bytes。
- `visual-check.json`／`workflow.visual-check.json` 保存四 viewport containment、四 PNG、`workflow.visual-check.html` contact sheet 的相對路徑；自動 `visualReview: pending` 不等於獨立視覺 passed。
- 本輪不開 server／preview、不 publish；首次獨立人工 visual review 因 source→compare edge 穿越第二列 lane header 判為 failed，保留此歷史。局部 edge 修復並重新 validate／deliver／visual-check 後，`/root/plan_reviewer` 實際看四張新 PNG，確認穿越解除、可讀、無截斷、最大尺寸配置平衡，獨立 `visual_review: passed`。自動 receipt 的 `visualReview: pending` 保持原值，不由 receipts 代判人工結果。

## Auxiliary navigation / diff scope

Graphify：feature worktree 無既存 graph，依 pinned 0.9.73 skill 採 source reads fallback，未 build／refresh／query 空圖；沒有新圖可宣稱完成。

PR Lens：precommit staged changes 的 HEAD 仍為 base，pinned 0.11.0 schema 要求 distinct committed base/head，因此 direct staged diff review fallback；不將未提交變更冒充 head commit，也不自造 schema 欄位。post-review/commit 後另由主代理依真實 SHA 產外部 graph/render，現階段未完成該圖。兩工具均不修改全域 config／hooks／skills 或呼叫 provider。
