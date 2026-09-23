# E004 — 執行契約

## Inputs and public API

- `POST /v1/devices/{device_id}/actions/{action}`；`action` 由 Python `StrEnum Action` 驗證，唯一值 `GREET = "greet"`。未知值回 `422/unsupported_action`，未知 ID 回 `404/unknown_device`，離線或 Server pending busy 回 `409/device_offline|device_busy`；拒絕不建立命令。
- 接受回 `202` 與 `CommandView`，`GET /v1/commands/{command_id}` 回相同 view。直接命令 `event_id: null`；E003 事件命令仍有 UUID `event_id`。
- WebSocket `robot.command` 的 `action` 字串來自 Enum 序列化。直接命令省略 `event_id`，事件命令保留；bridge 使用對應的 TypeScript `Action` Enum 驗證。MOD 仍只接收 C/B 按鍵。

## Ownership and lifecycle

- Server 以同一 `asyncio.Lock` 保護 session、command、event 映射、busy 與終止狀態。`robot.ready` 成功送出後才公布 dispatchable session；所有 under-lock send 都有等待上限。
- 接受直接命令時記錄 monotonic 10 秒 deadline。command send 在剩餘期限內未成功為 `failed/delivery_failed`，已成功 send 卻無終止結果為 `failed/result_timeout`；發送成功只代表 WebSocket send 完成，不宣稱實機收到。send 失敗使 session 失效，socket close 在 lock 外且有上限。
- 事件與結果只接受目前公布的 socket session；失效 socket 的排隊事件不得建立命令，送達失敗後須在 lock 外嘗試送出有上限的 close frame。結果只終結對應 pending command；已知終止命令的遲到結果忽略，不重啟狀態或關閉 session。斷線使該 session 的 pending 命令變 `failed/device_disconnected`。
- Bridge 將任一來源的 `greet` 映射至既有 C 按鍵。一次只保留一個 `activeGreeting`；斷線後本機忙碌持續到相符 MOD 結果。重連後 Server 若接受新命令，bridge 回 `failed/bridge_busy`。B 中斷直接命令為 `failed/local_interrupted`，事件命令維持 `cancelled`。若 B 回中立失敗且 MOD 無 greet 結果，Server timeout 終結直接命令，但 bridge 本機 busy 保守維持至實際終止或 simulator 重設。
- E003 A event、ack、duplicate mapping、busy、結果查詢和取消路徑維持。Server 重啟清空 in-memory 狀態，不重試命令。

## Evidence contract

`experiments/E004-named-action-dispatch/EXPERIMENT.md` 用文字及 Archify PNG 說明 Docs → Server → WebSocket bridge → MOD → result → GET。證據記同一次實測的 ID、API 結果、可見畫面和終止查詢，結論只涵蓋此 simulator 路徑。正式實作須另行驗證實機與安全、持久化等議題。
