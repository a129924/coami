# E003：Robot 事件迴路

本 POC 先獨立驗證 simulator A → Stack-chan runtime Context → MOD trace → browser bridge，證據見 [Stage 1](evidence/phase-1-event-bridge.md)。Stage 1 已經 Tester 實測與獨立 Reviewer 確認 PASS；第二階段才加入 Server 固定決策、C 招呼與結果回報。實機與 production `src/` 不在本實驗範圍。

## 環境與資產

需要 Python 3.12、uv、Node.js 24、npm，以及 pinned `vendor/stack-chan` submodule。首次準備資產會從固定 Stack-chan Pages commit 下載 simulator WASM 並驗證 SHA-256；MOD 編譯為 XS archive。產物留在忽略的 `web/generated/`。

```sh
cd experiments/E003-robot-event-loop/web
npm ci
npm run prepare:poc
npm run build
```

## Stage 1：無 Server 的事件路徑

```sh
cd experiments/E003-robot-event-loop/web
npm run dev
```

開啟 `http://127.0.0.1:5173/?stage=1`，待 MOD 已安裝後按一次 A。事件紀錄應有 `[bridge] Host.Button.a pushed`、`COAMI_EVENT|button|a|pressed` 和 `kind=button name=a pressed=true`；release 後仍只收到一筆。本模式不建立 Server 連線或執行招呼。

## Stage 2：完整迴路

先在另一個終端機啟動 E003 Server：

```sh
cd experiments/E003-robot-event-loop/server
uv sync --dev
uv run uvicorn app:app --host 127.0.0.1 --port 8010
```

再啟動 web；若原本的 `npm run dev` 在執行，先停止它，以此設定重啟：

```sh
cd experiments/E003-robot-event-loop/web
VITE_E003_API_URL=http://127.0.0.1:8010 npm run dev
```

開啟 `http://127.0.0.1:5173/`，待 simulator MOD 已安裝且 Server 已連線，按 A。Bridge 送事件給 Server；Server 回 greet 命令；bridge 以 C 觸發動作。約 2.5 秒後最新命令應顯示 completed。從事件紀錄取得 `command_id`，可查：

```sh
curl http://127.0.0.1:8010/v1/commands/<command_id>
```

招呼執行時按 B 可中斷，該 greet 的狀態為 cancelled。E003 沒有直接 POST greet。

## 檢查

```sh
cd experiments/E003-robot-event-loop/server
uv run pytest -q
uv run ruff check .
uv run pyright

cd ../web
npm run build
```

線上協定見 [protocol.md](contracts/protocol.md)，實測與限制見 [EXPERIMENT.md](EXPERIMENT.md)。固定單一 simulator ID，Server 記錄僅存於程序記憶體；WASM 的事件與結果透過 browser bridge 傳遞，未驗證實機 Wi-Fi。
