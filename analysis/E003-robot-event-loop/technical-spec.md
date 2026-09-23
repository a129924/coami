# E003 Robot event loop — technical spec

本文件是 E003 topic plan 的執行依據；`requirements.md` 守住目的與範圍。E001 僅供唯讀參照。

## Stage 1: Context to browser bridge
- E003 web 頁面的「按 A」按鈕只呼叫 `engine.pushButton('a')`。
- MOD 在 `onContextCreated` 註冊 `robot.input.button.a.onEvent`；只在 `event.kind === 'button'`、`event.name === 'a'`、`event.pressed === true` 時 `trace('COAMI_EVENT|button|a|pressed\n')`。Release 不輸出事件 trace。
- Browser 的 `onTrace` 接收完整行，精確解析該 marker，顯示 `kind=button name=a pressed=true` 和原始 trace。其他 trace 可顯示供診斷，但不可算事件成功。
- 第一階段 browser 不建立 WebSocket/fetch Server 連線，不觸發 C/B，也不產生 greet result。
- `evidence/phase-1-event-bridge.md` 記環境、實際操作、同次 A 的 Host.Button A 訊號、MOD trace、browser 接收與 release 行為；`EXPERIMENT.md` 記 Tester 與獨立 Reviewer 的 PASS 決定及連結。無 PASS 不得開始 Stage 2。

## Stage 2: event, command, result
- Bridge 收到 MOD A pressed trace 後產生 UUID `event_id`；MOD trace 不含 ID。上行 WebSocket：
  `{"type":"robot.event","event_id":"<uuid>","event":{"kind":"button","name":"a","pressed":true}}`。
- Session 沿用 E001 `robot.hello` / `robot.ready`、單一 `coami-sim-001`，無直接 POST greet。Server 只對 A pressed 依固定規則建 `greet`。
- Server 以同一臨界區記錄 command 及 `event_id → command_id` 後，事件才算 accepted；然後嘗試送 `{"type":"robot.command","command_id":"<uuid>","event_id":"<uuid>","action":"greet"}`。
- Server 以 `robot.event_ack` 回應 `accepted|duplicate|busy`，含 `event_id` 與 `command_id`。同一已接受 ID（含命令已終結）回 `duplicate` + 原 ID，不新建／重送。不同 ID 在 greet pending 時回 `busy` + 當前 ID，且不建立映射；待 pending 終結後可重送。
- Browser 僅把 Server 的 greet command 映射到 `engine.pushButton('c')`；MOD 的 C callback 執行 E001 同等笑臉、點頭與 `COAMI_RESULT|greet|<status>`。B callback 保留 stop；C/B 不上報 `robot.event`，防止回圈。Browser 以 `robot.command_result`（`command_id`）回報。GET `/v1/commands/<command_id>` 含相同 `event_id` 和狀態。
- Session 斷線：待執行命令變 `failed/device_disconnected`；已接受映射留在 Server 程序記憶體，重連後重送同 ID 回 duplicate，不自動重試。接受前斷線不留命令或映射。送達失敗使已接受命令變 `failed/delivery_failed`，即使 ack 遺失，GET 仍為準。Server 重啟清空記憶體狀態。
- `robot.ready` 送出失敗仍須經 session cleanup，避免 stale socket 阻擋重連。若 greet 執行期間斷線，Bridge 保留本機 busy 到該 MOD 動作終結；重連後不接受新的 greet，舊結果只解除 busy 並丟棄，不得關聯到新 session 的 command。

## Verification
Stage 1 驗證實際 simulator 按鍵、trace 與 bridge 接收，不以 fake Context 當作 simulator 證據。Stage 2 驗證完整 ID 鏈、可見動作、結果、重複／忙碌／斷線與 TS/Python checks。阻礙先留證並停止，TS mock 需 owner 另行決定。
