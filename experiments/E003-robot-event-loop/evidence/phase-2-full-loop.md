# Stage 2 — A event through Server to C action and result

## Environment and procedure
- Date: 2026-09-22 Asia/Taipei. Feature worktree `feat/andrew/e003-robot-event-loop`; Stack-chan submodule `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`.
- Python 3.12.12 via uv, Node 24.19.0; browser Chrome at `http://127.0.0.1:5173/`; E003 Server at `http://127.0.0.1:8010` because port 8000 was already occupied.
- `uv sync --dev --python 3.12 --offline`, `uv run uvicorn app:app --host 127.0.0.1 --port 8010`, `VITE_E003_API_URL=http://127.0.0.1:8010 npm run dev`; Stage 2 MOD archive rebuilt with `npm run mod`. Browser page reloaded after build.
- Waited for MOD installed and Server connected. Clicked A once; captured in-progress screenshot [phase-2-greet.png](phase-2-greet.png) approximately 600 ms after input, then waited for result and queried GET.

## Same-run full-loop observations
Browser event list, in event order:

```text
使用者按 A：engine.pushButton(a)
[bridge] Host.Button.a pushed
MOD trace: COAMI_EVENT|button|a|pressed
Bridge 接收 #1：kind=button name=a pressed=true
送往 Server · event_id=666bce09-0f89-4f46-a53b-38fa8f1e0913
Server 決策 greet · event_id=666bce09-0f89-4f46-a53b-38fa8f1e0913 · command_id=74e3fce7-29d5-4b3b-894d-9ce8c7367200
Server accepted · event_id=666bce09-0f89-4f46-a53b-38fa8f1e0913 · command_id=74e3fce7-29d5-4b3b-894d-9ce8c7367200
結果 completed · command_id=74e3fce7-29d5-4b3b-894d-9ce8c7367200
```

Chrome console reported `[firmware] COAMI_RESULT|greet|completed` at 2026-09-22T08:57:11.980Z. During the command, the screenshot shows the simulator pose and face with the command still executing. The browser receipt count stayed at one, so C did not generate a second A event.

`GET /v1/commands/74e3fce7-29d5-4b3b-894d-9ce8c7367200` returned:

```json
{"command_id":"74e3fce7-29d5-4b3b-894d-9ce8c7367200","event_id":"666bce09-0f89-4f46-a53b-38fa8f1e0913","device_id":"coami-sim-001","action":"greet","status":"completed","detail":null}
```

## B interruption
A second A produced event `23a29d24-95b8-4de6-aca9-b7164c63ce57` and command `d8167b3a-5712-4d5d-b1da-d7e5f5e0ec0b`. Pressing B about 300 ms later gave browser `結果 cancelled` and MOD `COAMI_RESULT|stop|completed`. GET for that command returned `status=cancelled` with the same event ID.

## Automated checks
- Python `uv run pytest -q`: 3 passed; covers accepted→completed→duplicate, busy→retry→disconnect mapping, and delivery failure retaining the accepted mapping. Two upstream Starlette/anyio deprecation warnings.
- Python `uv run ruff check .`: passed. `uv run pyright`: 0 errors.
- Web `npm run build`: TS typecheck for bridge and MOD plus Vite production build passed. Vite warned about one large bundled simulator chunk.
- `npm run mod`: XS archive built (2446 bytes); pinned WASM hashes passed during Stage 1 preparation.

## Independent Tester verification
In a fresh Chrome session against the final E003 app, Tester repeated one full A event: `event_id=93935492-0a70-4563-90c3-9441c3245168` led to `command_id=4eb05382-ebf3-46d5-977f-85e798f9ea57`, MOD `COAMI_RESULT|greet|completed`, bridge completed, and GET with the same event ID and `status=completed`. A second run (`event_id=7ab59349-a81e-429a-beb3-54f0e7c27eed`, `command_id=fa73d39a-ceb9-4f89-be37-f93c0def3287`) visibly changed face/pose and completed. Receipt count was exactly two for two A presses, with no C-to-A loop. A third run (`event_id=ca478f4b-6a3c-4db5-b47d-439272fa8e10`, `command_id=3ee54891-d22d-40b3-8366-5b5c912a32ee`) was interrupted by B; MOD stop trace and GET both confirmed `cancelled`. Tester reported no functional discrepancy and made no file edits.

## Status
PASS（2026-09-22）：獨立 Reviewer 核對 Stage 1 gate、Stage 2 事件與命令關聯、simulator 動作、結果查詢、重複／忙碌／斷線／送達失敗測試，以及 feature worktree 範圍，判定 approved，無 blocking issue。非阻斷限制：若 B 停止時回中立姿勢失敗，MOD 會輸出 stop failed，但不會輸出 greet 結果；本次觀察的正常完成與 B 中斷路徑均通過。

## PR review follow-up（2026-09-23）
- 修正初始 `robot.ready` 傳送失敗時可能殘留 session 的問題；新增測試先模擬 ready delivery failure，再確認相同裝置可以重連。
- 修正 greet 執行期間斷線、重連後舊 MOD result 可能被套到新 command 的問題。Bridge 以 session generation 保留 busy，直到舊動作終結後丟棄 stale result；測試確認 stale result 不交付，新 command 只能在 busy 清除後開始。
- Review fix 後：`uv run pytest -q` 4 passed（另有兩筆既有 upstream deprecation warnings）；Ruff、Pyright（0 errors）、TypeScript typecheck、`npm run build`、`npm run mod` 均通過。Vite 仍只有既有的大型 simulator chunk 警告。
