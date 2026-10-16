# PR #23 review 修正（2026-10-16）

本頁保留第一輪紀錄；下述 audit 需舊 checkout 的限制，已由[第二輪修正](review-round2.md)取代，目前 checkout 可直接驗證歷史 source blobs。

Reviewed head：`13876ac45845e6efe2c1b665d17359348433cbc7`。兩項 P2 均接受並修正；本輪僅修改 E023 建置／驗證工具與測試，未改 SDK、Server、相機模型、驗收值或原閉環資料。

| Thread | 判斷與修正 | Commit |
| --- | --- | --- |
| [Reject untracked compiler-source inputs](https://github.com/a129924/coami/pull/23#discussion_r4290732793) | 原先 tracked-only 檢查可能漏掉編譯輸入；改共用 `verifyCleanSource`，以 `--untracked-files=all` 檢查 Moddable、emsdk、fontbm，位於各自工具建置／使用之前。沿用 Git ignored build outputs，不增加來源白名單。 | `ba5a7f3` |
| [Terminate children when readiness times out](https://github.com/a129924/coami/pull/23#discussion_r4290732800) | `startProcess` 在成功交付 handle 前負責子程序；timeout／startup error 先 SIGTERM 並 await close，1秒 grace 後 SIGKILL。readiness 改由 stdout／stderr data events 判定，所有啟動 timer／listener 於結束時清除。 | `01ec6b1` |

## 驗證

從 E023 web/ 執行：

```sh
npm run test:tools
npm test
npm run test:mod
npm run typecheck
```

- 工具回歸5項：實際 temporary Git tree 接受 clean／ignored build outputs，拒絕 untracked header、CMake input 與 tracked 修改；實際子程序檢查 timeout 後 PID 已消失（含忽略 SIGTERM）、成功 ready 後不被舊 timer 終止、early exit 與 spawn error。
- TS10項、MOD contract2項與 strict TS／MOD typecheck 通過。終端證據為 `review-fix-tools.txt`、`review-fix-ts.txt`、`review-fix-mod.txt`、`review-fix-typecheck.txt`。
- `node --check` 檢查 prepare-assets／runtime-run／process-start 通過。目前本機三個 pinned tool source checkout 都通過新的 tracked＋untracked gate；這是本輪狀態檢查，不取代原建置時的 provenance。
- `git diff --check` 通過。Commit hook 仍回報缺少 lefthook；上述檢查獨立執行。

本次未重建 host 或重跑15案閉環，未產生新版工具的收斂證據。原11成功／4失敗結論與 runtime pin 保持不變。`wasm-runs/`、原始 source-inputs 與 audit receipt 均保留原樣；歷史 `audit-wasm.py` 的 working-tree source hash 查核須在原 `13876ac` 版本執行。本輪刻意修改 runner，當前 HEAD 與舊 runner hash 不同屬預期，不能把舊紀錄說成新工具執行結果。

交付順序：commit by topic → push → 在兩個原 threads 回覆修正與驗證 → resolve threads。PR保持 Ready，交由 human review；不 merge／release。
