# E014：WebSocket 使用期限

桌面 Node.js Robot 主動連 FastAPI `/ws`，啟動取得 `Success`。使用期限到期後停用操作、保留連線供查詢；雙端保留 append-only JSONL 副本。本 POC 不會控制真實硬體。

## 執行

需要 Python 3.12、uv、**Node.js 24** 和 npm。在本實驗目錄執行；若電腦預設 Node 不是 24，先選擇 Node 24（本機可用 `export PATH=/opt/homebrew/opt/node@24/bin:$PATH`）。

```sh
cd experiments/E014-ws-usage-expiry
node --version
uv sync --locked
npm ci --ignore-scripts
uv run pytest -q
uv run ruff check .
uv run pyright
npm run typecheck
npm test
npm run smoke
```

Smoke 固定使用真實 **5 秒**期限，啟動一個 Python Server 及三次 Node Robot 程序，驗證期限內重啟不續期、到期本地停用／Server 拒絕、同連線 status 成功、到期後重啟仍 Expired，最後清理程序。啟動上限 5 秒、訊息 2 秒、總 watchdog 30 秒；這些工程 timeout **不是**使用期限。每次 smoke 使用新 run／robot ID，既有 evidence 不覆寫。

手動兩終端測試（兩端使用相同 `RUN_ID` 方便對照）：

```sh
USAGE_MS=5000 RUN_ID=manual-001 SERVER_LOG=evidence/server.jsonl \
  uv run uvicorn app:app --host 127.0.0.1 --port 8000
```

```sh
RUN_ID=manual-001 ROBOT_ID=e014-robot SERVER_URL=ws://127.0.0.1:8000/ws \
  ROBOT_LOG=evidence/robot.jsonl node robot.ts
```

預期先輸出 `kind: ready`、`reply.status: Success`，到期輸出 `expired`／`server_expired`，程序及 WS 不因到期自動結束；Ctrl-C 關閉。CLI 無互動 stdin 命令，probe/status 由 smoke IPC 或匯入 `RobotClient` 呼叫。30 分鐘可將 Server 改為 `USAGE_MS=1800000`；本次未執行 30 分鐘 soak。Robot 重啟請沿用 `ROBOT_ID`，Server 必須保持同一程序；要重新測試新 grant 請使用新 robot ID。

| 環境值 | 預設／限制 |
| --- | --- |
| USAGE_MS | 5000；ASCII 正整數，deadline 必須落在 JS safe integer 範圍 |
| RUN_ID | Server `e014-local-run`，Robot 隨機 UUID；手動配對應明確設相同值，非 wire 欄位 |
| ROBOT_ID | `e014-robot`；不是已驗證身份 |
| SERVER_URL | `ws://127.0.0.1:8000/ws`；client 限 loopback ws、無 credentials |
| SERVER_LOG / ROBOT_LOG | `evidence/server.jsonl` / `evidence/robot.jsonl` |

## Wire contract v1

單一文字 JSON frame；所有 request 必須帶 `v: 1`（整數）、`type`、`robot_id`、`connection_id`、`message_id`。ID 為 `[A-Za-z0-9._:-]{1,128}`。Robot 為每次連線產生 connection UUID、每次訊息產生 message UUID。可省略 `grant_id`；有帶時必須是目前 grant ID，不能傳 null。Server 拒絕 request 多餘欄位、非嚴格型別、變更連線身份、錯誤 grant 或同 robot 並行連線，記錄分類後 close 1008。

Reply 保留同一 robot／connection ID，產生新的 message ID，以 `reply_to` 對應 request。Server 推播不帶 `reply_to`。所有時間欄位皆為非負 safe integer 毫秒。

| Request | Reply / 額外欄位 |
| --- | --- |
| `robot.start` | `robot.start_result`：`status: Success\|Expired`、`grant_id`、`authorized_at_ms`、`deadline_ms`、`server_now_ms`、`remaining_ms` |
| `operation.probe` | `operation.result`：`allowed: boolean`、`reason: allowed\|not_started\|expired`、`grant_id: string\|null`；無硬體副作用 |
| `usage.status` | `usage.state`：`state: not_started\|active\|expired`、`grant_id`、`authorized_at_ms`、`deadline_ms`（未 start 時三者 null）、`server_now_ms`、`remaining_ms` |
| Server 推播 | `usage.expired`：`grant_id`、`deadline_ms`、`server_now_ms`；每 connection 最多一次 |

首次 start 在 Server 固定 grant／起算／deadline，送達失敗也不重算。重送 start、重連、Robot 程序重啟沿用原 grant；`now < deadline` 允許，等於／超過拒絕，`remaining_ms = max(0, deadline_ms - server_now_ms)`。Server 由 UTC anchor 加 monotonic 經過時間決定授權，避免牆鐘回撥延長期限。Robot 使用 monotonic timer，從 request 發送時間加 remaining 保守停用，不用本機 UTC 推算授權；舊回覆或重複授權不能延長已知期限／復活停用 guard。

Robot 啟動、斷線、協定／send／log 錯誤均 fail-closed；`probe()` 只在 guard 啟用時送出。`rawProbe()` 是診斷路徑，讓 smoke 證明 Server 也拒絕過期操作，不可當實際操作入口。到期不關 WS，`status()` 仍可 round-trip；正常關閉／故障才終止。

## 證據與限制

- `evidence/server.jsonl`、`robot.jsonl`：雙端 append、每筆 flush/fsync；白名單 frame／分類錯誤，不收錄 headers、密鑰或原始非法 payload。Server UTC 與授權 logical time 分列；Robot UTC 是紀錄時間，不用於授權判斷。
- 以 run／connection／message／reply／grant IDs 關聯；`send_attempt`、`sent`、`send_failed`、`received` 不混為已送達。只有雙端同一訊息的 `sent` 與 `received` 配對才是成功收發證據。
- `evidence/smoke.jsonl`：真實程序／網路執行；`validation.txt`：目標行為 red、green、typecheck／工具收據。Fake socket／clock unit tests 不當作網路證據。
- `EXPERIMENT.md` 記錄問題、程序、失敗／成功證據與決策；`diagram/sequence.html` 為繁中內容、Viewer English fallback、READ／Still。
- **Archify 視覺驗收失敗**：四種 desktop 尺寸均垂直溢出；保留最後 9/9 showcase 通過的可信 HTML、四張 light/dark screenshot 及失敗 receipt。兩輪修正後停止，owner 明確同意註明限制交 Draft PR；不宣稱 visual pass。
- PR Lens 僅在 `/private/tmp/e014-ws-usage-expiry/pr-lens/` 本機輸出，不上傳／附加 PR。Graphify 無可用既有圖，採已批准 targeted-source fallback，不建圖。
- 單 worker／單 Server 程序記憶體 grant；Server 重啟會丟失期限。無 auth、續期、支付、DB、多機同步、真機開機自啟或 production 保證。固定 robot ID 可偽造，只適合受控 loopback 實驗。
