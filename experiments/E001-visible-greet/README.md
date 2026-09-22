# E001：可見招呼

目標：呼叫 Server endpoint，讓 Stack-chan browser simulator 露出笑臉並點頭，然後查到 `completed` command result。`stop` 可打斷招呼並回報 `cancelled`。所有 POC 程式都留在本目錄；`server/src/` 與 `device/src/` 是基線，沒有承載這次實驗。

## 準備

- Python 3.12、uv、Node.js 24、npm。
- Clone 後執行 `git submodule update --init --recursive`。
- 第一次 `npm run prepare:poc` 會從 Stack-chan 的固定 Pages commit 下載約 5 MB WASM 資產，檢查 SHA-256，並把本實驗的 TypeScript MOD 編譯成 XS archive。產物在 `web/generated/`，不提交到 Git。

```sh
cd experiments/E001-visible-greet/server
uv sync --dev
uv run uvicorn app:app --host 127.0.0.1 --port 8000
```

另一個終端機：

```sh
cd experiments/E001-visible-greet/web
npm ci
npm run prepare:poc
npm run dev
```

開啟 `http://127.0.0.1:5173/`，等待畫面顯示「MOD 已安裝」與「Server 已連線」。接著執行：

```sh
curl -s -X POST http://127.0.0.1:8000/v1/devices/coami-sim-001/actions/greet
curl -s http://127.0.0.1:8000/v1/commands/<第一個回應的 command_id>
```

第一個回應是 HTTP 202 / `pending`。約 2.5 秒後，第二個端點回傳 `completed`。畫面同時可以看到笑臉、點頭，並在事件紀錄看到結果。也可按畫面上的「讓 Coami 打招呼」，該按鈕呼叫同一個 Server endpoint。

若 port 8000 已被占用，Server 改用 `--port 8010`，並以 `VITE_E001_API_URL=http://127.0.0.1:8010 npm run dev` 啟動 browser 頁面。

停止指令：

```sh
curl -s -X POST http://127.0.0.1:8000/v1/devices/coami-sim-001/actions/stop
```

在招呼尚未結束時呼叫 `stop`，先前的 `greet` 會變成 `cancelled`，`stop` 會變成 `completed`。兩者都可用 `GET /v1/commands/<command_id>` 查詢。

## 驗證與邊界

```sh
cd experiments/E001-visible-greet/server
uv run pytest -q
uv run ruff check .
uv run pyright

cd ../web
npm run build
```

協定見 [`contracts/protocol.md`](contracts/protocol.md)。實測紀錄與截圖見 [`EXPERIMENT.md`](EXPERIMENT.md)。目前只支援單一固定 simulator ID，Server 狀態存在記憶體。Browser bridge 以 WebSocket 連 Server，以模擬按鍵傳 command 給 MOD；MOD 透過 trace 回報結果。這是因為 pinned Stack-chan WASM runtime 不提供 Wi‑Fi，並不代表實體 ESP32-S3 的網路路徑已驗證。實機、語音、故事與父母接管不在 E001 範圍。
