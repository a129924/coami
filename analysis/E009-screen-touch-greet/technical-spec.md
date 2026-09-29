# E009 螢幕點選打招呼 — technical spec

## Runtime 與責任邊界

`mod/mod.ts` 使用 Piu 呈現裝置螢幕選項，接收 touch callbacks，控制 E005 已驗證的 HAPPY 表情、點頭、停留與回中立行為。`mod/greet-interaction.ts` 是無 Piu 依賴的 TypeScript 單次互動狀態。網頁只啟動 pinned `SimulatorEngine`、呈現 trace、重新啟動模擬器，並修正 3D 螢幕指標移出的取消轉送；網頁沒有啟動動作的按鈕。既有 E005、E008、vendor 與 production source 保持唯讀。

## 螢幕互動

初始 `ui.setMain` 顯示「打招呼」。Piu touch begin 只在空閒時接受一個 touch ID；同 ID 的 end 且未移動超過 8px 時給出遞增 `run_seq`。move 超過 8px 或 cancel 清除候選點選。接受後切回 `ui.showFace()`，顯示 HAPPY 並點頭；回中立後才顯示螢幕終態及下一次選項。失敗只能顯示失敗，不顯示完成。舊 `run_seq` 的終態不更新目前互動。

Pinned 3D viewport 在 pointer 移出螢幕時保留最後有效座標。E009 網頁在其 capture listener 中偵測指標移出螢幕，轉送一個螢幕外 touch move 使 MOD 清除候選點選，再交由 simulator 的 pointercancel handler 結束追蹤。普通 pointercancel／lostpointercapture 同樣先轉送螢幕外 touch move。此處只修補 E009 實驗的螢幕觸碰轉送，不修改 vendor，也不將網頁按鈕當作動作來源。

## 打包與驗證

`mod.ts` 使用 extensionless `./greet-interaction`；Node 測試只匯入純狀態模組，不載入 `piu/MC`。`web/scripts/build-mod.mjs` 編譯兩份 TS，以 builder `files` 加入 `greet-interaction.js`，並以 explicit manifest 收入 `./mod` 和 `./greet-interaction`。嚴格型別檢查、純狀態測試、XS archive、Vite build 和實際模擬器 run 均是驗證條件。

## 本地 trace

每一行是 `COAMI9|` 加 JSON。`touch` 記錄 `began`、`moved`、`cancelled` 或 `ended` 及 touch ID；有效 `ended` 附 `run_seq`。`run` 記錄 `run_seq`、`action_id: greet`、`started` 或 `completed|failed|cancelled`。`screen` 記錄 `ready` 或終態。這些 trace 僅作實驗證據，不是裝置／Server wire contract。網頁外控制、MOD `completed` 或 simulator `prepared` 都不能單獨構成驗收。
