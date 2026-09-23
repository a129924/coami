# E004：從 FastAPI 派送具名 Robot 動作

本實驗只驗證單一 browser simulator 的 `greet` 直接派送與結果關聯。請先啟動 Server，再開 simulator，最後在 FastAPI Docs 提交 Action。協定見 [protocol.md](contracts/protocol.md)，驗證結論見 [EXPERIMENT.md](EXPERIMENT.md)。

## 準備與啟動

需要 Python 3.12、uv、Node.js 24、npm 和 pinned `vendor/stack-chan` submodule。E004 沿用 E003 的 pinned simulator WASM 與 SHA-256 驗證。

```sh
cd experiments/E004-named-action-dispatch/server
uv sync --dev --offline
uv run uvicorn app:app --host 127.0.0.1 --port 8011
```

另一終端機：

```sh
cd experiments/E004-named-action-dispatch/web
npm ci
npm run prepare:poc
VITE_E004_API_URL=http://127.0.0.1:8011 npm run dev
```

開啟 `http://127.0.0.1:5173/`，等 simulator MOD 已安裝、Server 顯示已連線。再開 `http://127.0.0.1:8011/docs`，執行 `POST /v1/devices/{device_id}/actions/{action}`，填入 `coami-sim-001` 和 Enum `greet`。記下 HTTP 202 的 `command_id`，看見笑臉、點頭與回中立，再於 Docs 執行 `GET /v1/commands/{command_id}`，確認 `completed` 與相同 ID。可在招呼執行中按 B，驗證直接命令回 `failed/local_interrupted`。

另按 simulator A 驗證 E003 事件路徑：A event → Server 固定 greet → C 動作 → result。`/?stage=1` 仍可單獨觀察 A 經 Context 到 bridge 而不連 Server。

## 可重跑檢查

```sh
cd experiments/E004-named-action-dispatch/server
uv run pytest -q
uv run ruff check .
uv run pyright

cd ../web
npm run test:protocol
npm run typecheck
npm run mod
npm run build
```

`EXPERIMENT.md` 同時保留 Archify PNG 與文字流程、同次操作 ID、截圖及限制。此 POC 不驗證實機網路／馬達、多 Robot、認證或持久化，也不將行為移入 production source。
