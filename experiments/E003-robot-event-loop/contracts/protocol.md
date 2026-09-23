# E003 simulator event protocol

本協定屬 E003 實驗，與 FastAPI／Python 和 MOD runtime 內部型別分離。固定 device ID 為 `coami-sim-001`；browser bridge 因 simulator WASM 不提供 Wi-Fi 而負責 WebSocket。

## Stage 1 local marker
MOD 在 A pressed callback 輸出 `COAMI_EVENT|button|a|pressed`。Bridge 解析完整 trace 行；release 不輸出 marker。這段已在沒有 Server 的 simulator 中獨立通過，證據見 `../evidence/phase-1-event-bridge.md`。

## Stage 2 session
Browser 向 `/v1/devices/coami-sim-001/session` 送 `{"type":"robot.hello","device_id":"coami-sim-001","version":1}`；Server 回 `robot.ready`。

Bridge 收到 MOD A marker 後才產生 UUID 並送最小摘要：

```json
{"type":"robot.event","event_id":"<uuid>","event":{"kind":"button","name":"a","pressed":true}}
```

Server 固定判斷為 greet。接受時在同一臨界區記錄事件與命令，再嘗試送：

```json
{"type":"robot.command","command_id":"<uuid>","event_id":"<uuid>","action":"greet"}
```

Server 另以 `robot.event_ack` 回覆 `event_id`、`command_id` 與 `disposition: accepted|duplicate|busy`。已接受的相同 ID 回原命令，不重送；不同 ID 遇 pending greet 回 busy，不建立映射，待 pending 結束可重送。若 command delivery 失敗，已接受映射保留，命令為 `failed/delivery_failed`，即使 ack 遺失也以 GET 為準。

Bridge 只對 Server greet command 模擬 C；MOD 完成笑臉與點頭後輸出 `COAMI_RESULT|greet|completed`（失敗或 B 中斷則回 `failed`／`cancelled`）。Bridge 發送：

```json
{"type":"robot.command_result","command_id":"<uuid>","status":"completed"}
```

`GET /v1/commands/<command_id>` 回 `command_id`、`event_id`、`device_id`、`action`、`status`、`detail`。斷線把 pending 命令標 `failed/device_disconnected`；映射在 Server 程序存活期間保留，不自動重試。Server 重啟清空狀態。E003 不提供直接 POST greet。

若初始 `robot.ready` 送出失敗，Server 會移除已登記 session，允許裝置重連。若 greet 尚在 MOD 執行時 WebSocket 斷線，Bridge 保留 busy 狀態直到本機結果出現；重連期間不啟動新 greet，舊結果只在本機解除 busy 並被丟棄，不回報到新 session。
