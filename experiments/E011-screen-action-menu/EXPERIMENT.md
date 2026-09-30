# E011 螢幕動作選單 — experiment record

## Question

Robot 螢幕是否能在不使用網頁外動作控制的前提下，完成捲動、選取、一次派送與真實結果回饋？

## Procedure

1. 執行純 interaction tests、strict typecheck、MOD archive 與 Vite build。
2. 在 pinned simulator 將初始不可見的 PASS 項目滑入可見範圍後選取。
3. 核對 `COAMI11` trace 的選取、run started、matching terminal、可辨識動作與終態畫面。
4. 以相同 runtime 檢查純滑動、取消／移出、busy 及 excluded IDs。

## Evidence

- 2026-09-30：首輪獨立審查指出終態頁尾仍顯示等待及取消拖曳後內部 offset 與畫面不一致；已修正並補三項純測試。現為 10/10 PASS；MOD/Web strict typecheck、三模組 XS archive、Vite production build 通過。
- 2026-09-30：in-app Browser 在 localhost 的 pinned simulator 重新完成螢幕滑動、初始不可見的 `head.center` 選取、同次可見動作與 matching terminal；詳見 `evidence/action-menu-run.md`、`.webm` 與修正後 result screenshot。
- 負向實測：三次純滑動無 run、busy 連點無排隊、指標移出無 run 且後續點選能對應畫面可見項目。forced action failure 與實際收到 cancel callback 的 offset 還原僅由純測試覆蓋。
- 2026-09-30：owner 回報已在 localhost 手動點選 Robot 螢幕，操作正常；這是使用者驗證回報，非獨立 code review。
- 2026-09-30：PR #10 的三項 inline review suggestions 已列為 ADDRESS，修正部分列裁切、空白區命中與水平拖曳誤選；13/13 tests、typecheck、MOD archive、build 和 pinned-simulator 回歸通過，詳見 `evidence/pr-review-fix.md` 與 `pr-review-fix.jpg`。

## Decision

E011 修正後主路徑的 simulator evidence 已取得；第二輪獨立 Reviewer 判定 `approved`，無 blocking issues。不宣稱實機觸控品質或 forced-failure simulator 結果。
