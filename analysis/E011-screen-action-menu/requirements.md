# E011 螢幕動作選單 — requirements

## Goal

使用者可直接在 Coami pinned simulator 的 Robot 螢幕捲動固定清單、選取一個原本不可見的動作，並看到該動作與真實終態相符的螢幕結果。

## In-Scope

- 獨立 E011 TypeScript MOD、browser harness、17 項固定 PASS 動作 snapshot 與同次 evidence。
- 螢幕內滑動、可見項目選取、一次派送、busy lock、終態結果與負向觸碰行為。
- 純狀態測試、strict typecheck、XS archive、Vite build 與 pinned-simulator run。

## Out-Of-Scope / Non-Goal

修改或重寫 E005/E009；E005 FAIL 動作；動態清單、搜尋、分類、持久化；多點觸控、機頂觸摸、相機、語音、Server、實機品質、正式產品 UI、公開 API、跨 BC 契約、production source 或 release。

## Acceptance

同一次 Robot 螢幕操作可核對可見標籤、選取 action ID、一次動作開始、matching terminal 和終態畫面。純滑動、選單外、移出、取消、busy 再點及 stale terminal 不得造成額外動作或虛假成功。

## Constraints

E005 17 項 visual PASS action IDs 只作為唯讀證據來源；E011 擁有自己的 snapshot、mapping、程式與 evidence。若 pinned runtime 無法證明此路徑，記錄 blocker 並停止，不以網頁外動作控制替代。
