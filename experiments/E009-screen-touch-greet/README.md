# E009 — 螢幕點選打招呼

TypeScript-only simulator POC。動作只能由 Coami 模擬裝置螢幕內的 Piu「打招呼」選項啟動；網頁外的按鈕只重新啟動模擬器。E005 的可見 `greet` 作為行為參考，沒有 Server 或實機依賴。

## 重現

使用 Node 24–26，並讓 feature worktree 的 `vendor/stack-chan` 指向 repository pinned commit。從本實驗的 `web/` 目錄執行：

```sh
npm ci
npm run prepare:poc
npm test
npm run build
npm run dev -- --port 5179
```

開啟 `http://127.0.0.1:5179/`，等候頁面顯示「MOD 已安裝」，直接點選 3D 裝置螢幕內的「打招呼」。螢幕會切到可見表情／點頭，回中立後顯示真實結果。測試選項外、移出螢幕再放開、取消，以及執行中重複點選；網頁右側提供 trace。`prepare:poc` 會核對 pinned WASM 資產 SHA-256，缺少資產時需可連線下載；若本機已有同 SHA-256 資產，可先複製到忽略的 `web/generated/public/simulator/` 再執行。

## 邊界與證據

`mod.ts` 負責 Piu 畫面與動作，`greet-interaction.ts` 負責單次狀態。網頁的 pointer capture handler 只補足 pinned 3D viewport 指標移出螢幕時的 touch cancellation；它不直接發送動作。此處使用 pinned simulator 的 `scene`／`wasmView` 內部物件，是 E009 實驗性相依，未成為產品契約。

[實驗紀錄](EXPERIMENT.md)、[同次證據](evidence/touch-greet-run.md) 與 [5 秒 WebM](evidence/touch-greet-run.webm) 記錄本次模擬器結果。MOD trace 是本地驗證資料，不是未來裝置／Server wire contract。此 POC 不證明實機觸控品質、機頂感測器或正式 UI。
