# E004 同次完整迴路證據

## 環境與操作

- 2026-09-23，feature worktree `feat/andrew/e004-named-action-dispatch`，pinned Stack-chan submodule `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- E004 Server：`127.0.0.1:8011`；Vite simulator：`127.0.0.1:5173`；Chrome 使用 software WebGL 啟動 simulator，畫面顯示「已啟動，MOD 已安裝」及「已連線」。
- 打開 `/docs` 的 `POST /v1/devices/{device_id}/actions/{action}`；OpenAPI Action enum 僅 `greet`。在 Docs 填 `coami-sim-001`、選 `greet`，實際按 Execute。

## Docs → Robot → GET

Docs 回傳 HTTP 202：

```json
{"command_id":"b1816269-fdb7-40dd-9158-c452baa29abe","event_id":null,"device_id":"coami-sim-001","action":"greet","status":"pending","detail":null}
```

同次 bridge 顯示：

```text
Server 直接派送 greet · command_id=b1816269-fdb7-40dd-9158-c452baa29abe
結果 completed · command_id=b1816269-fdb7-40dd-9158-c452baa29abe
```

執行中 [greet.png](greet.png) 可見笑臉及活動中的 command；MOD 動作沿用 E001／E003 的點頭和回中立實作。`GET /v1/commands/b1816269-fdb7-40dd-9158-c452baa29abe` 的終止結果：

```json
{"command_id":"b1816269-fdb7-40dd-9158-c452baa29abe","event_id":null,"device_id":"coami-sim-001","action":"greet","status":"completed","detail":null}
```

## E003 event 路徑回歸

同一瀏覽器連線按 A，得到 `event_id=1c9444a6-48b8-43f6-8c5f-ce82e74e6ecb`、`command_id=34f692dd-e457-42bf-b4a9-9db309da0256`；GET 結果如下，證明事件命令仍保留其 event_id：

```json
{"command_id":"34f692dd-e457-42bf-b4a9-9db309da0256","event_id":"1c9444a6-48b8-43f6-8c5f-ce82e74e6ecb","device_id":"coami-sim-001","action":"greet","status":"completed","detail":null}
```

## Bridge slot 修訂後重跑

獨立 Reviewer 指出本機 busy 跨 session 缺少驗證後，bridge 改用 `GreetingSlot` 並補狀態測試。對最終 bridge 再次執行相同的 FastAPI Docs → simulator → GET 程序：Docs HTTP 202 建立 `command_id=79d0900e-0c2a-4522-8d68-dba96d4f5ef7`，直接命令 `event_id=null`，bridge 顯示同 ID 的直接派送與 `completed`，GET 亦為同 ID `completed`。同次 A event `event_id=6b9d2724-339c-4dd4-9cc9-ba01f023b94e` 對應 `command_id=cc589c7c-da35-4a48-bc9d-ff991547d2c0`，GET 保留兩個 ID 並為 `completed`。上方 [greet.png](greet.png) 是首次完整迴路的執行中畫面，不是本次重跑截圖。重跑仍未實際操作 browser 斷線／重連；該情境僅有狀態層測試。

## 自動檢查與限制

- `uv run --offline pytest -q`：14 passed；既有 Starlette/httpx 相關 warning 2 筆。獨立審查後補測直接 B 中斷轉 `failed/local_interrupted`、直接命令斷線終結與重連、卡住的 command send 轉 `failed/delivery_failed`；PR comment follow-up 再補 stale socket event 不得建立 command 與 send failure close frame。
- `uv run ruff check .`：pass；`uv run pyright`：0 errors。
- `npm run test:protocol`：4 passed；新增 `GreetingSlot` 測試模擬舊 greet 尚未終結而 session generation 已切換，新 command 仍遭拒，舊 greet 結束後才可開始。`main.ts` 使用同一 slot，因此斷線不清除本機 busy；此為狀態測試，不宣稱已在 browser 實際重連。`npm run typecheck`、`npm run mod`、`npm run build`：pass。Vite 有既有大型 simulator chunk warning。
- `npm run assets`：pinned WASM／JS SHA-256 驗證通過。實測環境 Node v26.4.0，package 宣告支援 Node 24，npm 安裝時有 `EBADENGINE` warning；檢查與瀏覽器路徑仍通過，正式支援性未由 Node 26 驗證。
- 上述 Docs success 與 event regression 是同一次連線實測；拒絕、failure 與 timeout 由自動測試驗證，不宣稱曾在 Docs 手動逐一操作。無實機或 production 保證。
