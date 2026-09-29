# E009 螢幕點選打招呼 — requirements

## Goal

使用者直接在 Coami 模擬螢幕點選「打招呼」，看到一次可辨認的打招呼，以及螢幕上與該次動作終態相符的結果。

## In-Scope

- 以獨立 TypeScript MOD 與瀏覽器模擬器 POC 驗證螢幕觸碰到 MOD 的實際路徑。
- 一次有效點選最多啟動一次打招呼；選項外、移出或取消觸碰不啟動。
- 動作進行中不排隊；終態後可再次點選。
- 保留同次觸碰、MOD callback、動作終態、螢幕結果和人工可辨認畫面的證據。

## Out-Of-Scope / Non-Goal

拖曳、捲動、多點觸控、機頂觸摸感測器、相機、語音、Server、實機品質、正式產品 UI、公開 API、持久資料、跨 BC 契約，以及 E008 依賴。

## Acceptance

實際模擬器的一次螢幕點選須產生一次 `greet` 開始與完成，畫面須顯示可見回應和真實成功結果。選項外、移出、取消、執行中重複點選不產生額外動作或虛假成功；終態後下一次點選可再產生一次動作。TypeScript 測試、嚴格型別檢查、雙模組 XS archive 與網頁建置均通過。

## Constraints

所有新工件留在 E009 feature worktree 的 `analysis/`、`plan/`、`experiments/E009-screen-touch-greet/`。E005 的可見 `greet` 是行為參考，並非已驗證的螢幕觸控實作。若 pinned runtime 無法證明螢幕到 MOD，記錄阻礙後停止，不以網頁外打招呼按鈕替代。
