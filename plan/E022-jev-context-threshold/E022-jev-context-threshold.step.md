---
topic: E022-jev-context-threshold
phase: implementation
created: 2026-10-15
---

# E022 — Step Tracking

> P/E/T 根目錄與唯讀／寫入邊界見同名 plan。所有步驟先 pending；只有可追溯 evidence 才標 `[X]`。plan-review 由獨立 verdict 支持；不能把四檔落盤或對話計畫批准當作 implementation gate。

## Workflow Stages

- [X] plan-authoring
- [X] plan-review
- [X] tdd-test-authoring
- [X] implementation
- [X] implementation-review
- [X] code-review

## Implementation Steps

- [X] 1. 在 `E/tests/test_threshold_analysis.py` 建立合成 fixtures 與行為測試，覆蓋 spec，取得必要初始失敗證據；不讀 holdout 逐案機率、不修改 E012／E013。
- [X] 2. 在 `E/threshold_analysis.py` 實作 verify-source 與 research-only 載入／純門檻計算／統計／排序，固定 CLI 與輸出契約；來源驗證使用 T/source-checkout 的原 committed verifier。
- [X] 3. 在 `E/threshold_analysis.py` 實作 exclusive candidate freeze、check-heldout、輸出 binding 檢查與報告；不開任意 holdout threshold sweep 介面。
- [X] 4. 準備 T/source-checkout 與其 locked `.venv`，完成 unittest／Ruff 與來源 verifier；將來源版本、環境、指令、缺口與 raw baseline 記入 E/evidence/integrity.json 及 E/README.md，缺口即停止研究。
- [X] 5. 只對 research 執行 101 點比較，exclusive 寫 research 決策／統計／candidate freeze；完成 freeze 後才對同候選一次檢查 holdout／v0，保存結果／skip 與限制。
- [X] 6. 在 E/visuals 依 Archify artifact-first 流程建立、validate、deliver、visual-check 繁中 workflow；依實際 bounded diff 在 T/pr-lens 產本機 change map，Graphify 依既存圖可用性使用 bounded query 或 targeted source fallback，明示工具缺口。
- [X] 7. 完成 E/README.md 八段紀錄與 E/evidence/report.md，保存固定候選重播／來源與輸出 hash 一致性證據、逐案誤判／拒絕成本及工具 receipts，整理可交獨立 Reviewer 的交付物。

## Evidence / Routing Notes

Current handoff：`pr-open`，https://github.com/a129924/coami/pull/22 為 Draft，base=dev、head=feat/andrew/e022-context-threshold。PR Lens 已在真實 commit 存在後 validate/render 外部本機圖，Graphify 無圖 source fallback 保持。等待 Owner human review；不 merge/release、保留 feature worktree，產品採納另決。

2026-10-15 final review evidence：獨立 `/root/plan_reviewer` 先通過 implementation review，再通過 code review，兩者 approved、blocking_issues=[]。其實跑 step_tracker exit0、29合成測試通過，核對 frozen analysis／artifact bindings／三份 scratch replay 一致。完整摘要與 reviewed hashes 見 review-log。進入已授權 publish-in-progress；merge／release／產品採納仍未核准。

2026-10-15：四個 planning artifacts 落盤供獨立審查，未跑本topic實作測試／CLI／門檻計算，未選候選。主代理另提供已完成isolated E013原verifier的環境前置證據（75verified、gaps=[]、complete=true，logs在T/runtime/logs）；這不標任何implementation step完成。Topic lifecycle creator-in-progress；planning handoff review-ready。phase completion 待相應可見 evidence 後更新。

2026-10-15 implementation evidence：plan/spec hashes與獨立plan verdict由主代理提供，見review-log；steps1–5由現有CLI/evidence及29testsGREEN支持。有效RED為tests-regression-red.stdout的兩項缺陷／三fail；initial0tests/modulemissing只是setupfailure。step6先pending（Archify自動交付完成、人工visualreview及postcommitPRLens圖未完成）；step7待external同候選replayhash證據與本輪docs完成。implementationreview／codereview尚未執行，不自封gate。

2026-10-15 step7 evidence：README八段及visuals/source-map已完成；既有report未修改。主代理提供runtime/logs/heldout-replay.json，external runtime/tmp/heldout-replay的heldout-decisions／heldout-summary／report與正式歷史byte-identical，hash見README/review-log。候選及analysis source SHA未改。step6等待獨立Reviewer對視覺與precommitPRLensfallback判定，implementation stage仍pending。

2026-10-15 step6 evidence：獨立 `/root/plan_reviewer` bounded視覺複審實看四張修復後PNG，manualvisual_review=passed，source/HTML SHA與當前deliver/visual-check吻合、9/9且0errors/warnings、4viewportcontainmentpass。原首次failed保留review-log歷史；自動visualReview仍pending。Reviewer明確認可既有precommitdirectstageddiff／Graphifynograph fallback可完成本步，PRLens postcommitgraph目前未產。所有七步及implementationstage有證據標X，implementation-review／code-review仍pending；未宣稱fullgate已過。
