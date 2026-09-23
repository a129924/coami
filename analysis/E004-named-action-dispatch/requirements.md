# E004 — 從 FastAPI 派送具名 Robot 動作

## Goal

驗證操作者可在 FastAPI Docs 對已連線的 `coami-sim-001` 提交唯一受支援的具名 Action `greet`，看見 browser simulator 執行笑臉、點頭、回中立，並以同一 `command_id` 查得終止結果。

## Success criteria

- API、WebSocket 命令、MOD 動作、結果及 GET 查詢保持同一 `command_id`。
- 未知 Action 在派送前拒絕；離線或 Server 已知 busy 不建立命令。
- 重連後 bridge 本機 busy 不重疊執行，新命令以 `failed/bridge_busy` 終結。
- 已接受的直接命令不永久停在 pending；送達、執行、斷線與逾時失敗可區分。
- E003 的 A 事件路徑仍可完成，包含 duplicate、busy 和取消語意。
- `EXPERIMENT.md` 留下文字流程、問題、程序、證據、決定和未驗證範圍，另附 Archify PNG 流程圖。

## Boundary

只驗證單一 browser simulator、單一 `greet`，使用 in-memory Server。E001/E003 唯讀；不修改 `server/src/`、`device/src/` 或 vendor。不驗證實機網路、馬達、裝置認證、多設備、持久化或 production 部署。
