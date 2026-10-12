# E014 實驗紀錄

## Question

FastAPI WebSocket Server 與 Node 24 strict TypeScript Robot 能否在連線啟動時授權固定使用期限，期限到期停用操作但保留診斷連線，並留下兩端可配對的持久紀錄？Robot 重啟是否不會續期？

## Procedure

1. 從 dev 的明確 baseline `7b5772483a8cc62cdcb959d475a1a15ebbe98053` 建立獨立 feature worktree `/private/tmp/coami-e014-ws-usage-expiry`，branch `feat/andrew/ws-usage-expiry`。不在 dev 實作，不改既有實驗或 production。
2. 封閉新增檔案範圍，依 README v1 contract 分離 Python Server／Node Robot。先留下 TS guard deadline 目標 assertion red，再完成 strict TS 實作；Python 以注入 clock/socket/journal 測試期限與 async task 行為。
3. 真實 smoke 啟動 Uvicorn 及三次 Node24 Robot，授權 5000ms；期限內重啟、過期同連線 probe/status、過期後重啟，逐項 assertion。雙端 JSONL fsync，驗證兩方向 exact-frame pairing；結束後 bounded cleanup。
4. Archify validate／deliver／四 viewport containment 與 light/dark captures；PR Lens 用實際 bounded diff 本機 validate/render；Graphify 無既有圖時 targeted source reads，不建立圖。

## Evidence

- Python Implementer 實測：39 pytest、Ruff、strict Pyright 通過。TS 初次 red 是 deadline equality assertion `true !== false`，不是 import／工具錯誤；green 11 tests 與 strict typecheck 通過，詳見 `evidence/validation.txt`。後續獨立 Tester 的追加紀錄為最終驗證依據。
- 真實成功 run `20c1b27d-3094-4a24-86cd-297a8b3fddd4`：Node24.19.0，5000ms，18 個雙端已配對 frames、3 次 Robot 程序 instance；restart 不續期，expiry 不關連線，status 成功。
- 獨立 Tester run `1b545039-4384-4c71-a098-16f7347f6611` 同樣 PASS，39 Python／11 TS tests、strict checks 通過。Reviewer 非阻擋 warning 指出 stderr 可能跨 chunk；main 改為 bounded 64KiB 累積辨識，之後 typecheck／11 TS tests／真實 smoke run `3dc3ec34-8ba8-4279-ae29-4f55da08ad2f` 再次 PASS。
- 保留失敗 run `8bfabbd7-b931-42e3-8e9a-041cde8ae719`：功能 assertion 已走完，最後 harness 錯把 Uvicorn graceful SIGTERM 視為必須 exitCode0 而失敗。查證 pinned Uvicorn shutdown 後重送 signal 的行為，修正為同時要求 shutdown complete、無 ERROR/Traceback，且 exit0 或 SIGTERM。未掩蓋歷史失敗、未修改依賴。
- Fake-clock/socket/journal 單元測試驗證 deadline−1／等於／+1、重送、協定錯誤、send/log failure、expiry race／cleanup；不是實際網路或磁碟斷電測試。JSONL durability 只證明使用 fsync，不保證檔案系統／硬體不損壞。
- Archify 可信 HTML SHA-256 `89c2e712473e3368314af852ad564e32fc6fa2fce2c370e017d49f5e5be02190`，699505 bytes，9/9 showcase、零錯誤／警告。視覺 receipt `diagram/sequence.visual-check.json` 的 `ok: false`：1440×900 scrollHeight1475、1600×1000 1569、1920×1080 1569、2048×1320 1593；無水平溢出。
- `visual_review: failed`、`correction_rounds: 2`。實際 inspected 1440×900 light 及 2048×1320 dark screenshots，下半段訊息超出首屏；不以 screenshot 成功或 automated visualReview pending 宣稱通過。第一輪改寬因文字投影低於下限被拒，第二輪壓縮因 message／segment 超出上限被拒；deliver 未覆蓋可信 HTML，之後 visual-check 仍檢查原 artifact。已還原最後可信 candidate，非第三輪修正；重新 deliver 的 HTML hash 不變，spec SHA-256 `911faf48e0547bb5e4cbfd335f70fe7cd2a07b8901347f089f718d17b8de4736`。
- Owner 2026-10-12 明確回覆「同意，註明限制後開 Draft PR」，只批准視覺缺陷作為已知限制交人工 review，不是 visual pass 或 production approval。
- Graphify／導航來源見 `evidence/navigation.md`；PR Lens runtime／validate/render 收據追加到 `validation.txt`。工具先遇到 sandbox uv／Chrome／網路限制，精準升權後執行，不修改工具或 config。

## Decision

核心 WebSocket 使用期限 POC 可交付 Draft PR 人工檢視；不升級為 production、不新增硬體能力。預設 5 秒利於重現；30 分鐘只提供 `USAGE_MS=1800000` 配置，尚未執行 soak，不聲稱真機開機流程已驗證。Archify 桌面首屏仍失敗，依 owner 明確例外保留可稽核 artifact／失敗證據。最終 code review／測試 gate 與 PR 路由以 topic `review.md`／step tracker 為準。

## Reproduce / Rollback

依 README 使用 Node24、`uv sync --locked`、`npm ci --ignore-scripts` 後執行測試與 smoke。Robot／Server 副本各自追加，run ID 區分歷次結果。撤回只移除本 topic 新增的實驗／planning 工件；本次不 merge、不刪 worktree、不做 release。
