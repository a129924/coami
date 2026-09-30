# E011 螢幕動作選單 — technical spec

## Runtime 與責任邊界

`mod/action-catalog.ts` 是 E011 自有的 17 項快照與繁中標籤；它沒有 runtime import E005。`action-menu-interaction.ts` 是無 Piu 依賴的選取、捲動 offset、畫面階段提示與終態關聯狀態；`mod.ts` 呈現 Piu 選單並執行對應的 simulator 動作。browser harness 只啟動 pinned simulator、轉送離開 3D 螢幕的取消、顯示 trace 與重啟；沒有動作控制按鈕。

## Interaction contract

選單至少有一項初始不可見。只有同一 touch 在可見列開始與結束、未被識別為滑動且未取消時，才建立一個遞增 `run_seq` 與對應 action ID。滑動、選單外、移出或取消沒有 run；動作忙碌時新觸碰不排隊。matching `completed|failed|cancelled` 才解除鎖定並更新畫面；不相符或遲到的 terminal 不得覆寫結果。

## Build 與 evidence

Node tests 僅載入純 interaction state。MOD build 會收錄 `mod`、catalog 與 interaction modules；web build 使用 pinned simulator assets。每行 `COAMI11|` trace 是 E011 本地 evidence，不是 device/server contract。通過需同時有測試、typecheck、archive、Vite build 和一次 Robot 螢幕實際操作錄影／trace。
