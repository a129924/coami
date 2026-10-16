# Robot 注視限制

**狀態：E023 已確認的固定 SDK／模擬模型限制；尚未修正。** 本頁是目前已知注視能力限制的查詢入口；[E023 README](../../experiments/E023-target-offset-gaze/README.md) 保留實驗參數、程序、重現方式與原始證據。本頁不代表已驗證實機能力。

## 適用版本與 SDK 行為

驗證使用原版 Stack-chan SDK commit `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`，對應 repository 的 `vendor/stack-chan`。E023 未採用 E020 patch，也未修改 SDK 運動策略。

原始碼位置為 `firmware/host/modules/motion/motion-controller.ts`：

- [第13行：GAZE_THRESHOLD = Math.PI / 6](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/motion/motion-controller.ts#L13)，即30°。
- [第195行：轉頭條件](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/motion/motion-controller.ts#L195)：目標相對目前頭部姿態的 yaw 或 pitch 誤差，任一軸絕對值**嚴格超過30°**才進入轉頭流程；恰等於30°不會觸發此條件。這是必要門檻，仍受暫停、正在移動等狀態影響，不是超過即保證到位。
- [第143行：lookAt()](https://github.com/stack-chan/stack-chan/blob/b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322/firmware/host/modules/motion/motion-controller.ts#L143) 設定注視目標、啟動姿態輪詢並要求更新；正常返回**不代表 Robot 已移動或到位**。必須依後續可靠姿態／觀測判斷，不能以 SDK 返回作為置中成功。

## E023 的已確認結果

E023 使用固定底座、靜態合成目標、零相機安裝平移／旋轉，以及水平／垂直 FOV90° 的理想針孔相機；u向右、v向下。姿態讀自實際 rendered `headGroup` world quaternion，並重新投影固定世界目標，不以命令值或 SDK rotation cache 冒充回饋。

在 run `WASM-2026-10-15T07-05-48-980Z` 中，以下四個中立起始姿態案例均通過非運動 probe，SDK 呼叫均正常返回，但各20次控制後姿態及偏差未變：

| 案例 | 起始及最後偏差 (u,v) | SDK控制次數 | 觀測結果 |
| --- | --- | ---: | --- |
| [TC-E2E-10](../../experiments/E023-target-offset-gaze/evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z/TC-E2E-10.json) | (+0.11, 0) | 20 | quaternion未變；未置中 |
| [TC-E2E-11](../../experiments/E023-target-offset-gaze/evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z/TC-E2E-11.json) | (-0.11, 0) | 20 | quaternion未變；未置中 |
| [TC-E2E-12](../../experiments/E023-target-offset-gaze/evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z/TC-E2E-12.json) | (0, +0.11) | 20 | quaternion未變；未置中 |
| [TC-E2E-13](../../experiments/E023-target-offset-gaze/evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z/TC-E2E-13.json) | (0, -0.11) | 20 | quaternion未變；未置中 |

該模型下，單軸偏差0.11所需的完整置中角度為 `atan(0.11 × tan(90° / 2)) ≈ 6.28°`，低於30°，未觸發轉頭。原判準是雙軸絕對偏差≤0.1、最多20次控制且連續3筆觀測置中；四案均不符合。全部15案為11成功、4失敗，主收斂假設失敗；本輪驗證任務已完成。

摘要與查核入口：[閉環結果](../../experiments/E023-target-offset-gaze/evidence/wasm-run.md)、[結果狀態](../../experiments/E023-target-offset-gaze/evidence/results.json)、[姿態／命令關聯查核](../../experiments/E023-target-offset-gaze/evidence/wasm-evidence-audit.json)。來源、工具及確切 WASM bytes 見 [host建置紀錄](../../experiments/E023-target-offset-gaze/evidence/host-build-notes.md) 與 [runtime provenance](../../experiments/E023-target-offset-gaze/evidence/host-runtime-provenance.json)。

## 對 Server 的影響與後續建議

Server 可能在每次重新觀測後，對未變的偏差反覆計算並送出無法觸發轉頭的修正。E023 的四案即重複送出至20次控制上限；SDK正常返回不能解除這個限制。

後續應考慮依實際偏差／姿態判斷「無改善」並停止重複控制，同時回報受限原因，區分命令已傳遞、SDK已返回與實際到位。**這些是建議，尚未實作或驗證**；本次文件化沒有增加無改善停止、受限回報或任何 Server／SDK 行為。

若要滿足原0.1置中判準，需另開 **SDK控制策略調查／修改 topic**，釐清門檻、可用控制方式與回饋語意，再依原判準重新驗證完整路徑。不得以放寬中心容許範圍、將正常返回當作到位，或直接把本頁建議視為完成，宣稱已達標。

## 結論邊界

結論僅適用於上述已驗證的固定 SDK、確切 runtime 與 E023 模擬模型。未驗證其他 SDK版本、真實攝影機安裝／校正、實機伺服機構、動態目標或 E019上下目標切換；不能由本頁外推實機行為。後續若變更控制策略或來源版本，須保留 E023歷史證據，以新驗證結果更新本頁的適用範圍及狀態。

## 變更紀錄

| 日期 | 內容與依據 |
| --- | --- |
| 2026-10-16 | 依 E023固定 SDK原始碼與已完成閉環證據建立限制入口；建議保持未實作，交由 Draft PR human review。 |
