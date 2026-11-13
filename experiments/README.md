# 實驗工作區

每個 POC 放在獨立的 `E001-<slug>/` 目錄中，將可執行程式、操作方式與結果放在一起。實驗程式不要直接寫入 `server/src/` 或 `device/src/`；完成驗證後，再根據紀錄決定是否移入正式實作。

Robot 能力、用途及驗證依據請見 [Action／Event 能力與驗證目錄](../docs/robot-action-event-catalog.md)；SDK 支援與實驗實際效果分開記錄。

每個實驗從 [`TEMPLATE.md`](TEMPLATE.md) 建立紀錄。記下實際操作、可重做的證據與結論；尚未執行的實驗不要填成已驗證。

完整主題與證據入口見 [E001–E026 可行性驗證總覽](VALIDATION-SUMMARY.md)。總覽依 feasibility-validation 八段結構涵蓋成功、失敗、無法判定及工具流程，分開記錄歷史結論、回溯分類與驗證任務完成否；原始實驗與既有決策文件仍持有詳細證據及採用狀態，不因整理完成而升級能力或核准正式採用。

第一個可見 POC：[`E001-visible-greet/`](E001-visible-greet/README.md)。它從 Server endpoint 觸發 Stack-chan browser simulator 的笑臉與點頭，並記錄 command result。操作方式、驗證結果與截圖都留在該目錄。

靜態注視與解除實驗：[`E019-static-gaze/`](E019-static-gaze/README.md)，人工方向驗證狀態請以該實驗紀錄為準。

Server 每 Robot 取消與隔離實驗：[`E025-server-async-event-bus/`](E025-server-async-event-bus/README.md)。bubus 1.5.6 搭配標準 TaskGroup、短 handler 轉交與直接取消路徑，通過 240／240 次 synthetic async／ASGI 驗證；結論限此受管理的工作範圍，不包含真實 LLM／TTS SDK、遠端工作或 Robot 已開始的語音／動作，也不代表正式採用。

模擬器直接錄放重疊實驗：[`E025-listening-saying-exclusion/`](E025-listening-saying-exclusion/README.md)，已由 [PR #27](https://github.com/a129924/coami/pull/27) 合併。固定版本模擬器直接 `record()`／`say()` 的9筆案例觀察到約3.06～3.69秒重疊；XiaoZhi對話路徑有輪流控制，不能概括成整個SDK都不互斥。真機錄放、喇叭回音與插話能力另行驗證；逐筆儲存缺口與整批真人回報分開保留，不因PR合併補成完整逐筆簽認。

互動 Scope 整體取消與重新開始：[`E026-interaction-scope-cancel/`](E026-interaction-scope-cancel/README.md)，已由 [PR #30](https://github.com/a129924/coami/pull/30) 於 2026-11-13 合併，merge commit `fcf10ac06c4688d2fad512b86bfe5c2dd6a4d7bb`；語意 tag 為 [`e026-interaction-scope-cancellation-validation`](https://github.com/a129924/coami/tree/e026-interaction-scope-cancellation-validation)。固定 simulator 的 TTS 止聲、招呼停止回中立、排隊 TTS 丟棄與雙方清理後重開，各適用觀察 3 次已完成；原始 inconclusive、保存超限／隔離與救回紀錄保留。後續 PR review 另修正斷線本機停止及空 work ID 驗證，53 個 TS／16 個 Server tests 與新增 6 個斷線 simulator 案例通過；自動結果與原真人觀察分列，不代表硬體或正式採用。詳 [真人功能摘要](E026-interaction-scope-cancel/evidence/human-resume-20261113/human-check-summary.json) 與 [PR 回歸證據](E026-interaction-scope-cancel/evidence/pr-comment-review-20261113/review-summary.json)。

目前有27個實驗目錄，其中兩個沿用E025編號：錄放重疊與Server工作取消。請以完整目錄名稱區分，原始紀錄不重新編號或互相補證。
