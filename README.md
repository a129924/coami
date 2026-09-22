# Coami

Coami 是以 M5Stack Chan／StackChan K151 為目標硬體的兒童陪伴機器人實驗專案。它希望成為孩子的寵物、朋友與遊戲夥伴，保留父母介入與接管的能力，不取代父母。Robot 端盡量單純；較複雜的理解、決策與協調預期由 Server 負責。

**English summary:** Coami is an experimental companion robot project for M5Stack StackChan K151. The first milestone establishes a reproducible repository. A later experiment will connect a Python server to a TypeScript MOD in the Stack-chan browser simulator.

## 目前階段

此 repository 目前是 **Repository 基線**。它提供開發環境、最小 FastAPI 啟動與 TypeScript MOD 骨架，尚未實作 Server → Robot 的可見 POC。第一個 POC 將在獨立階段驗證：呼叫 Server endpoint，simulator 顯示笑臉並點頭，最後回報 command result。

POC 的可執行程式與結果放在 [`experiments/`](experiments/README.md)，與正式的 `server/src/`、`device/src/` 分開。驗證後再決定哪些成果值得移入正式實作；協定與程式結構將依實驗證據逐步形成。

## 環境

- Python 3.12、[`uv`](https://docs.astral.sh/uv/)
- Node.js 24、npm
- Git，並在 clone 後執行 `git submodule update --init --recursive`

### Server

```sh
cd server
uv sync --dev
uv run uvicorn coami_server.app:app --reload
```

開啟 `http://127.0.0.1:8000/health`，應得到 `{"status":"ok"}`。這個端點只用來檢查基線環境。

```sh
uv run ruff check .
uv run pyright
uv run pytest
```

### Device MOD 工具

```sh
cd device
npm ci
npm run typecheck
```

`device/src/mod.ts` 目前是沒有互動行為的 MOD 骨架。Stack-chan 對 K151/CoreS3 提供 MOD runtime 與 [browser simulator](https://stack-chan.github.io/stack-chan/web/simulator/)；capability 型別整合、MOD 建置、載入與連線會在 `experiments/` 的第一個 POC 中驗證。此基線不刷寫實機 firmware。

## 設計方向

預計先驗證 `Robot Event → Device Runtime → Server → Decision / Command → Device Runtime → Robot Action`。第一個 POC 會從可目視確認的 Server command 開始。專案目前不預先建立 DDD、Bounded Context、DI、Ports & Adapters 或完整 production module structure。

Coami 自有檔案採 [MIT](LICENSE)；Stack-chan 保留其 Apache-2.0 授權，詳見 [third-party notice](THIRD_PARTY_NOTICES.md)。
