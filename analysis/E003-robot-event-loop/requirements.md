# E003 Robot event loop — requirements

## Goal
驗證 Stack-chan browser simulator 的 A 按鍵事件先經 MOD 的 runtime Context 到達 browser bridge；只有第一階段實測通過後，才驗證事件進入 Server、固定決策返回可見招呼與結果。

## In-Scope
1. 第一階段：simulator 的 A 操作呼叫 `engine.pushButton('a')`；MOD 從 `StackchanContext.input.button.a.onEvent` 取得 pressed 事件，輸出 `COAMI_EVENT|button|a|pressed`；browser `onTrace` 解析並顯示。Release 不產生第二筆 pressed。無 Server 連線與招呼動作。
2. 第一階段的 `PASS`、環境、步驟與同次按鍵的原始證據記在 E003 `EXPERIMENT.md`，由獨立 Reviewer 確認，才准開始第二階段。
3. 第二階段：bridge 將最小事件摘要送 Server；Server 固定判斷 A pressed 為 greet；bridge 以 C 執行 E001 的笑臉與點頭，回報命令結果。B 保留 stop。
4. 相同已接受事件不重送命令；忙碌事件不建立命令；斷線與送達失敗保留可查詢結果。

## Out-Of-Scope / Non-Goal
實機、語音、對話歷史、完整 Context 序列化、多設備、持久化、production `server/src/` 或 `device/src/`、修改 E001、直接 POST greet，及未經 owner 另行決定的 TS mock。

## Acceptance and stop
- 第一階段：同一次 A 操作有 Host.Button A、MOD Context callback trace 與 browser 接收紀錄；無 Server 請求或 greet。經 Tester 實測與獨立 Reviewer 確認後，`EXPERIMENT.md` 記 `PASS` 和證據連結。
- 第一階段阻斷：記錄環境、重現步驟、預期與實際訊號、錯誤、阻斷位置；停止並請 owner 決定是否另走 TS mock。
- 第二階段：同一事件的 `event_id`、Server 決策、`command_id`、C 動作、result 與查詢狀態可關聯，並驗證重複、忙碌、斷線與送達失敗。

## Constraints
所有 POC 程式與證據留在 `experiments/E003-robot-event-loop/`。只使用固定單一 simulator ID `coami-sim-001`；不預先擴張正式架構。Root README、VERSION 與 release 資料不變。
