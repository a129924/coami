# E001：Server 指令到可見表情與點頭

## 問題與假設

- 問題：Server endpoint 能否觸發 Stack-chan simulator 的可見動作，並收到動作完成的 command result？
- 假設：用 browser bridge 連接 Server WebSocket 與 simulator MOD 按鍵事件，可先驗證命令與結果的端到端路徑。
- 成功條件：`POST greet` 回 HTTP 202；畫面從中性表情變成笑臉並點頭；`GET command` 最後回 `completed`。`stop` 能中斷尚未完成的招呼。

## 環境

- 日期：2026-09-22。
- Coami：`feat/e001-visible-greet` 工作分支；提交前的實測。
- Stack-chan submodule：`b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`。
- Simulator WASM：Stack-chan Pages commit `b0bcb60e17336e6bfb4af7466eb21a6ebbde46cd`，其部署訊息標明由上述 Stack-chan commit 建置；下載後依 `web/scripts/prepare-assets.mjs` 中 SHA-256 驗證。
- Python 3.12.12；Node.js 24.19.0；FastAPI、uvicorn、websockets 與前端套件版本見各自 lockfile。
- Chrome browser simulator；未接實體 M5Stack Chan / ESP32-S3。

## 步驟

1. 依 [`README.md`](README.md) 安裝並啟動 Server 與 web。
2. 確認 simulator 顯示 MOD 已安裝，Server 已連線。
3. 呼叫 `POST /v1/devices/coami-sim-001/actions/greet`，記下 `command_id`。
4. 觀察笑臉與點頭，再呼叫 `GET /v1/commands/<command_id>`。
5. 再送一次 greet，約 0.45 秒後送 stop，分別查詢兩個 command result。

## 結果與證據

- `POST greet` 回 `pending`，實測 command `690a1a87-945e-4f1f-93a1-74ad241121fa` 最後由 `GET` 查到 `completed`。
- 目視看到 simulator 由中性表情變笑臉並點頭；[`before`](evidence/coami-before-greet.png)、[`during`](evidence/coami-during-greet.png)、[`after`](evidence/coami-after-greet.png) 截圖可比較。
- 中斷測試：greet `928fdfef-d29b-40ca-9b61-0c835adbbdfb` → `cancelled`；stop `4cdb28a0-af67-480e-beb1-62d593cc583d` → `completed`。browser 事件紀錄同時顯示兩筆結果。
- E001 Server `pytest` 2 passed、`ruff check` 通過、`pyright` 0 errors；MOD TypeScript typecheck 與 XS archive 編譯通過；Vite production build 通過。
- 整合時曾發現 uvicorn 基線未附 WebSocket transport，以及 WASM trace 每次回呼已是完整一行。分別以 E001 自己的 WebSocket 依賴及直接解析 trace 修正，之後端到端路徑通過。

## 限制與決策

- 只驗證 browser simulator，未驗證 ESP32-S3 實機 Wi‑Fi、伺服馬達或韌體載入。
- 固定單一 device ID；Server 重啟後 command 紀錄消失。尚未驗證多設備、重試與持久化。
- 接下來可依這次的 contract 與 runtime 限制，決定實機 transport；目前不把 POC 程式移入正式 `src/`。
