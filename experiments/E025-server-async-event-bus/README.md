# E025：現成 AsyncEventBus 與每 Robot 取消

## 驗證什麼

- 設計／執行日期：2026-10-19；E001–E024 已占用，建立前確認 E025 未使用。
- 主要問題：Server 收到成立的取消訊號時，bubus 1.5.6 能否配合標準非同步原語，結束該 Robot 全部舊業務及清理，保留 WebSocket、控制處理與其他 Robot？
- 假設：bubus 只做短事件派送；handlers 將業務登記到 Robot 的 `asyncio.TaskGroup`。取消直接使 generation 失效並中止該工作範圍，可滿足已核准的 R1–R6。
- 「孩子說不要」是需求情境；本輪輸入是已成立的 synthetic Cancel，不含語音或意圖辨識。

## 為什麼

取消是必要門檻，Pydantic 原生整合是次要偏好。依已核准補充，只評估現成 EventBus，不自行實作 pub/sub。bubus 是首要候選；必要條件失敗才於原預算內查其他現成套件。

已查 [bubus 1.5.6 原始碼](https://raw.githubusercontent.com/browser-use/bubus/1.5.6/bubus/service.py)：同一 event loop 的 bus 共用鎖、`parallel_handlers` 不代表 Robot 隔離，`stop()` 也不是業務清理 barrier，`clear=True` 會移除 handlers。這些文件事實不足以證明我們的整合正確，仍須驗證 ownership、交接與取消競態。

一般路徑為 `WebSocket → Pydantic Work → bubus WorkEvent → 短 handlers → Robot 工作範圍`。取消由 receiver 直接觸發 Robot scope，不送進業務 bus，也不以停止共用 bus 中止單一 Robot。

## 成功與失敗判準

事前判準鎖定於 [shared spec](../../plan/E025-server-async-event-bus/E025-server-async-event-bus.spec.md)，不是執行後調整：

- 成功：六組案例全部分支各 20 次符合完整取消、清理 barrier、其他 Robot 進展、控制可達、舊結果隔離與重新開始要求。
- 失敗：完整證據顯示必要行為違反。
- 無法判定：前置條件、環境或中止使證據不足；watchdog 本身不能證明成功取消。
- 執行前固定 cleanup／barrier 2 秒、案例 10 秒、每 worker 外層程序 30 秒。這是合成實驗界線，並非產品 SLA。
- 投入上限 90 分鐘（04:22:30–05:52:30 UTC），每候選最多兩輪 bounded 修正；不修改第三方內部、不建立通用框架。預算或證據不足則保留未決。

## 環境與前置條件

macOS 26.5.2 arm64、Python 3.12.12；bubus 1.5.6、FastAPI 0.141.1、Starlette 1.6.0、AnyIO 4.15.1、Pydantic 2.13.5。工具版本與來源 SHA-256 見 [toolchain.txt](evidence/toolchain.txt)，依賴由 `uv.lock` 固定。

所有程式與證據在 feature worktree 的 E025／planning 目錄；正式 `server/src/`、`device/src/` 未修改。套件與工具安裝在實驗 `.venv`，未改全域環境。

同一 worker 內的 A／B WebSocket sessions 使用同一 TestClient／portal、同一 app event loop，並記錄 loop identity。這是實際 ASGI 整合與真實 bubus 執行，但 Robot、業務、清理資源都是合成模型，沒有真實網路或硬體證據。Robot identity 未驗證，不能視為正式身份或授權方案。

## 重現步驟

在本實驗目錄執行：

```sh
uv sync --frozen
uv run ruff check app.py test_app.py run_experiment.py
uv run ruff format --check app.py test_app.py run_experiment.py
uv run pyright app.py test_app.py run_experiment.py --pythonversion 3.12
uv run pytest -q test_app.py
uv run python run_experiment.py --repetitions 20 --case-timeout 10 \
  --worker-timeout 30 --deadline 2026-10-19T05:52:30Z \
  --output /private/tmp/coami-e025-reproduction
```

歷史 deadline 刻意保留以對照本次命令；另一次重現須在已授權投入內換成新的 timezone-aware deadline。輸出目錄必須沒有既有 summary，避免覆寫完成的證據。

`test_app.py` 以 events／handshakes 操作 gates，不用 sleep 推測先後。每個主要參數化節點各在獨立程序跑 20 次，共 240 workers；invalid-input 是額外 smoke。每次程序包含自己的 startup／teardown；不把 30 秒套在整個 suite。

runner 的 `--worker 'test_app.py::<node>' --case-timeout 10` 是內部單次入口。正常使用外層 runner 才有獨立程序 watchdog；單獨 pytest 適合診斷，不代替完整矩陣。

初始可載入骨架的 13 個測試均因尚未實作工作歸屬／取消觀察而斷言失敗；不是 import/collection 錯誤。該初態只記錄新能力尚缺，不聲稱重現歷史 regression。新實驗骨架不符合 formal TDD skill 的未改 production guard，故如實記 `skip_with_reason`，不冒稱該 gate 通過。

## 是否成功

- 執行：2026-10-19T04:37:06.879539+00:00 至 2026-10-19T04:38:57.013972+00:00。
- **實驗狀態：成功**。12 個主要節點 × 20＝240／240 success，failure 0、inconclusive 0；未觸發 watchdog。
- 額外 invalid-input smoke、Ruff lint／format、strict Pyright 通過。注入清理與業務故障後正確隔離，屬案例成功，不是忽略故障。
- **本輪驗證任務完成：是**。已取得對應事前判準的可重現輸入、序列、工作終止及清理證據；正式採用仍待 owner 決定。

## 結果與證據

| 案例 | 分支數 × 重複 | 觀察事實 |
| --- | --- | --- |
| 完整取消 | 1 × 20 | primary、subscriber、child 結束並清理，兩筆 queued 工作不啟動，barrier 後新工作成功 |
| 多 Robot 隔離 | 1 × 20 | B 在 A 取消前已完成工作，A 清理期間仍可工作；A 控制保持可用 |
| 滿載與重複取消 | 1 × 20 | queue 容量 2、滿載拒絕；取消不受滿載阻塞，清理中拒絕新業務並合併重複取消 |
| 競態與重啟 | 4 × 20 | 完成先於取消、取消先於完成、bus pending、writer pending 均符合舊工作／結果隔離與重啟要求 |
| 斷線與重連 | 1 × 20 | 清理中重連不開新工作，清理後新 session 正常；舊 queued 工作不啟動 |
| 故障隔離 | 4 × 20 | cleanup timeout/error、child/subscriber error 均隔離 A，重連不能繞過，B／control 正常 |

- [summary.json](evidence/summary.json)：節點、重複次數、結果、時間與來源雜湊。
- [runs.jsonl](evidence/runs.jsonl)：逐次輸出及完整 audit，包含 started／cleaned／ended／scope_stopped、取消截點、傳送開始／完成及 teardown。
- [workers.log](evidence/workers.log)：每 worker 的實際 pytest transcript。
- [checks.txt](evidence/checks.txt)：初態與最終檢查命令／結果；第三方 TestClient 的兩項 deprecation warnings 已保留，未隱藏成零 warnings。

第一輪亦完成 240 次，但獨立 code review 要求補 writer 傳送失敗的 terminal audit；依回饋完成一次 bounded 修正，再跑目前這組 240 次。第一輪原始碼與完整證據保留在 `evidence/round-1/`，僅作歷史紀錄；根目錄 evidence 是修正後目前版本。`checks.txt` 另包含可重現的 OSError 注入診斷，確認 Robot/session/例外紀錄及 B 控制仍正常。

每次成功 worker 均有零殘留業務工作的 teardown 證據。取消成功以 scope 結束與工作終止驗證，不以 bus 返回值判定。傳送開始與完成分開記錄，避免把取消前已開始的傳送誤判成取消後新傳送。

執行時 HEAD 為基底 `93a1a7d62d739a2e936d4fa43d993683e4a02f46`，實驗原始碼當時尚未 commit；因此以五個來源檔案 SHA-256 識別實際測試版本，不把基底 commit 冒稱含有新實作。

## 結論與限制

**本輪推薦 bubus 1.5.6 作為後續整合候選，搭配標準 asyncio.TaskGroup 的 Robot 工作歸屬與直接取消路徑。** 現成 bus 提供 Pydantic 事件模型、訂閱與派送；完整取消、barrier、隔離與舊結果防護由應用的固定業務範圍承擔，並非 bubus 自動提供。

推薦成立的條件是 handlers 只做短轉交，長工作全部受管理。本輪沒有證明直接在 bubus handler 長時間等待也可隔離 Robot，沒有證明 `bus.stop()` 能完成取消，也沒有建立另一套 EventBus。bubus 通過本輪必要門檻，因此未擴大比較其他套件。

這些證據只支持同一程序／event loop、合作式合成工作與 ASGI 測試條件，不外推真實 LLM／TTS SDK、執行緒、遠端工作、實際網路或 Robot 動作停止。收到取消前已開始的網路傳送無法撤回；本輪未定義正式 Robot protocol、身份驗證或隔離狀態恢復策略。

已通過獨立 implementation review 與 code review；接續已授權 topic commit／push／Draft PR → human review。驗證成功不代表正式移入 Server、套件採用、merge 或 release 已核准。
