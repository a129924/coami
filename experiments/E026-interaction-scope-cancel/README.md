# E026 — 互動 Scope 整體取消與重新開始

> 最新（2026-11-13）：本次指定真人功能確認已完成：TTS 止聲、招呼停止回中立、排隊丟棄、屏障後重新開始，各適用分支 3 次。詳 evidence/human-resume-20261113/human-check-summary.json。下文原實驗的 inconclusive 與保存故障記錄保留為歷史；保存修正與真人證據已整理供 human review，PR 保持 Draft，不代表正式採用。操作者事後補充環境：Google Chrome 153.0.8010.53（正式版本、arm64），macOS 26.5.2（25F84）；詳 environment-supplement.json，未冒充測試當時自動擷取。

## 問題、程序與決定

問題：已成立的取消能否讓舊互動的 TTS、招呼、queue 與 Server synthetic 工作停止／失效，且雙方清理後新 Scope 不受污染？

本輪在 feature worktree 實作；dev worktree 保持不變。核定 POC 上限 90 分鐘，從 2026-10-19 07:46:23 UTC 起算，最後 10 分鐘只整理；輔助圖件另列，不移出必要實作／驗證。停止 1 秒、雙方清理 5 秒、每分支 3 次、最多一輪實際效果失敗後定位修正，不放寬判準。

**目前決定：保留有界 POC 供 human review；不正式整合。整體結果 inconclusive。** 真人聽辨／畫面確認尚缺；指定 WASM startup fetch 被 hold 過期限的 3 筆案例均隔離且最終 dispose；各自動化結果見 evidence/summary.json，不宣稱任意 startup 都能在 5 秒內清理。不得將單元測試當作實際效果或實機停止保證。

## ts-implementation 範圍

| 欄位 | 約定 |
|---|---|
| Goal | 舊 Scope 全部業務失效，受測效果停止，雙方清理後可重開 |
| Non-Goal | 正式架構、實機保證、以圖或 API 返回代替效果證據 |
| In-Scope | TTS、招呼、queue、Server synthetic 工作、雙方屏障、紀錄與測試 |
| Out-Of-Scope | 語音拒絕辨識、暫停恢復、普遍 SDK 取消、正式整合部署、改 vendor、換 runtime |
| ReadOnly | 既有實驗、vendor、正式 server/src 與 device/src、治理／skills／工具配置 |
| Written | 本 E026 manifest 明列工件；輔助輸出限專用 /private/tmp roots |
| Modify | 僅本 topic 新建工件；沒有既有 baseline 修改 |
| Deleted | 無來源刪除；早期 fixture 曾覆寫同名失敗紀錄，詳 evidence/fixture-development.md |
| TestCase | 下列分層證據；所有適用驗收分支須各 3 次，缺項另列 |

## 固定來源

Stack-chan `b31bc0d9c8b87a4d1a6bdcf3df1343aae925c322`；官方 run `35444663129`、artifact `10585271971`，archive SHA-256 `0570742fb76a8dd73289d4a06b8b72aaa6f3c516a6cc831a53cdb6320da6d0e7`。本輪已重新取得官方 metadata／ZIP，驗證 hash 並以 browser 驗證 served JS、WASM 與新 MOD bytes。不是 fresh local runtime rebuild。

E018 是音訊接線先例；E025-listening-saying-exclusion 是 runtime provenance 先例；E025-server-async-event-bus 是 Server 取消邊界。`server/e025_core.py` 與原 E025 app.py 逐字一致，來源對應在 evidence/source-manifest.json。

## 重現

需要 Node 24–26、Python 3.12、uv、Chrome 及 pin 相符的 vendor checkout。不改 vendor／正式來源。

```sh
cd experiments/E026-interaction-scope-cancel
uv sync --project server --frozen
cd web
npm ci --ignore-scripts
mkdir -p generated/official-runtime
gh api repos/stack-chan/stack-chan/actions/artifacts/10585271971/zip > generated/official-runtime/web-dist.zip
npm run prepare:poc
```

在本實驗 server 目錄啟動 `.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8766`；另一終端在 web 目錄執行 `npm run dev`，開啟 http://127.0.0.1:5178/ 。先啟動新 Scope，再選 TTS、招呼或同時執行，取消後等 restartable，再建立新 Scope。控制 ping 同時讓第二 Robot 執行 quick synthetic 工作。

`python3 run_experiment.py` 執行局部 checks。自動 browser driver 需現有 Playwright，不會安裝工具；設定 `E026_PLAYWRIGHT_MODULE` 為既有 `playwright-core/index.mjs` 絕對路徑，再執行 `node web/scripts/browser-check.mjs`（兩個本機 servers 須已啟動）。每次開始新的 browser session 前須明確關閉前一次 browser／Server fixture 並重新啟動 Server；這不是自動恢復產品能力。此 driver 使用 headless Chrome／autoplay 設定，不代表真人或輸出裝置已驗證。每次以新的 `E026_ROUND` 保留獨立證據，不覆寫過往輪次。`scenario-check.mjs` 使用已啟動的全新 Server；`fault-check.mjs` 要求 port 8766 尚未使用，並自行建立及關閉每筆獨立 Server；可用 E026_FAULT_MODES 選擇已列明 fixture。兩者均不代填真人欄位。

## 證據層次與限制

- TypeScript：雙方完成順序各 3 次、queue 丟棄、重複取消、舊 ACK／token、Robot／Server 失敗、固定期限隔離；另有 audio ended／close／late decode 與 opening gated stages 測試。
- Server ASGI：取消關聯、新 Scope 舊 token 拒絕、清理失敗／超時隔離、禁止無取消取代已開 Scope。這不是實際 Robot 效果測試。
- Chrome／固定 WASM：TTS、招呼、並行各 3 次；實際 WebAudio clock、source ended、context close、rendered pose、SDK drain、雙方屏障與新 Scope；A 取消時 B synthetic result。詳見 evidence/round-final/。
- 實際 scenario：啟動前取消、自然完成後取消、重複取消、遲到 callback／ACK／舊命令及 Robot 先完成，各分支 3 次。實際 fault：Robot stop error／timeout、context close error、Server cleanup error／timeout，各 3 次，維持隔離且另行 dispose。
- 尚缺：真人觀察；不外推至未列出的所有 startup／SDK／故障組合。正常執行已有 Server 先完成；scenarios 另以受控 Server cleanup gate 驗證 Robot 先完成，各 3 次。兩者均需另一方完成才開放。

原始前置錯誤（缺 WebSocket transport）記在 round-1；第一筆實際 TTS 取消因過早 close 使 ended 無法確認，安全進入隔離，記在 round-2。唯一有界效果修正改為先 ended／排空再 close；重跑正常三組各 3 次，原失敗不刪除。Code review 所見的 Server open 與 opening continuation 問題已先以 regression 修正。

## 輔助與 handoff

Archify 僅為計畫示意，不是 trace；PR Lens 僅對真實 commit diff 產本機變更圖，含未改鄰居；Graphify 0.9.73 已確認，無既有 graph，採限定來源搜尋，不建圖、不 refresh。輔助輸出分別在 `/private/tmp/coami-interaction-scope-cancel/archify/` 與 `/private/tmp/coami-interaction-scope-cancel/pr-lens/`，不隨 PR 上傳。

交付 Draft PR 供 human review；未授權 merge、release 或將行為移入正式來源。結果與任務完成狀態分開記錄，見 evidence/summary.json。

## 2026-11-02 真人 session 與局部保存修正（尚未提交）

環境恢復於 `/Users/andrew/code/python/coami-worktrees/interaction-scope-cancel`。真人止聲回報與可追溯紀錄見 `evidence/human-observations.md`；完整 scope-3 救回檔、保存故障及修正證據見 `evidence/human-session-20261102T031031Z/`。整體仍為 inconclusive，招呼取消真人驗證未完成。

scope-3 已在固定期限內停止並完成雙方清理；之後累積的姿態紀錄超過保存請求上限，舊保存錯誤 handler 將已 restartable 的 Scope 隔離。原始 61,537 筆紀錄已保全，沒有把保存失敗或隔離從歷史抹除。使用者另明確授權本次局部修正，不包含 commit、push、PR ready 或 merge。

保存改為每筆請求最多 1,900,000 UTF-8 bytes（端點仍保留原本 2,000,000 字元限制），以 save id／chunk／record range 與對應 ACK 確認進度。只在 ACK 後前進 cursor；中途失敗保留相同 payload 重試。保存端從 append-only JSONL 載入已接受的 chunk，重送相同內容回覆原 receipt；同 id 不同內容或不連續 chunk 明確拒絕。舊 harness 無 chunk 的保存格式保持可用。

頁面獨立顯示保存進度／錯誤，不把保存錯誤送入業務生命週期 disconnect handler。已隔離的 Scope 不會因保存成功而解鎖。真人選項完全沿用操作者輸入，程式不填入 confirmed。保存不完整時不顯示保存完成；可原頁面重試。

新增測試涵蓋大筆 Unicode、HTTP 錯誤、部分成功／ACK 遺失重試、同時保存、保存期間追加紀錄、單筆過大、receipt 不符、重啟後重送、衝突／順序拒絕、same-origin 與大小限制。TypeScript 39 個測試及 strict build 通過；Python、SDK Action 與既有 39 個 browser Action 案例不因本修正重跑或重新宣稱通過。

可重現救回資料的保存驗證（僅 transport fixture，無 Actions／真人判定）：

```sh
cd web
node scripts/check-evidence-rescue.mjs   ../evidence/human-session-20261102T031031Z/scope-3-quarantine/E026-scope-3-rescue.json   /tmp/e026-rescue-check.json
```

`evidence/source-manifest.json` 與 `evidence/runtime-provenance.json` 是歷史原始證據，保持原樣；本次修正來源雜湊另列於 `evidence/human-session-20261102T031031Z/save-repair/source-hashes.json`。本次局部保存修正不代表延長或重開原 90 分鐘實驗預算，也不改 1000／5000 ms、姿態標準與各分支 3 次；不進行 SDK／動作修正。

修正後的真人 session 必須先保全舊頁面，再明確關閉舊 browser／Server fixture、重啟 Server 並重新載入頁面。這是人工建立新測試環境，不是讓 quarantined Scope 自動恢復。每次操作後即保存；若失敗則保留頁面／資料並回報。新保存的 `save` 欄位可用 recordStart／recordEnd／snapshotEnd 辨認分段，不能把多個 chunk 當作多次測試。

## Consolidated review handoff

本次保存修正與真人證據審查未發現阻擋提交的問題，詳 `evidence/consolidated-review-20261113/review.json`。此次為主 agent 審查，不取代 PR 的 human review 或宣稱新的獨立審查 gate。有效的既有測試依程式／配置／lock inputs 雜湊沿用，未重做真人觀察；原始失敗、資料來源限制與歷史 inconclusive 均保留。

使用者後續明確授權本次按 topic commit、push 及更新 Draft PR 描述；先前日誌中的「未授權／未提交」為當時狀態。PR 保持 Draft，不切 ready、不 merge、不部署。為凍結證據已保全最後 Server records 並關閉本輪 fixture，需要時依重現步驟啟動新 session。

### 真人環境事後補充

操作者於 human review 階段提供 Google Chrome 153.0.8010.53（正式版本、arm64）及 macOS 26.5.2（25F84），已記於 `evidence/human-resume-20261113/environment-supplement.json`。這是事後自述，不是測試當時的 UA／系統自動擷取；操作者尚未分別指定 11/02 與 11/13 兩個 session 是否完全相同。原先「未提供」記錄是當時狀態，歷史自動 browser provenance 維持原樣。本補充不新增、重做或改填真人結果。
