# E009 — Can a screen tap start one visible greet?

## Question

能否在 pinned Coami 模擬器中，直接從裝置螢幕的「打招呼」選項觸發一次可見動作，並呈現與動作終態相符的結果？選項外、移出或取消觸碰是否不觸發額外動作？

## Procedure

1. 在 E009 feature worktree 建置雙模組 TypeScript MOD、網頁及 pinned WASM 資產；先確認螢幕 touch begin/end 進入 MOD callback。
2. 從實際 3D 裝置螢幕點選「打招呼」，比對同次 `touch`、`run`、`screen` trace 與錄影中的表情／頭部回應。
3. 分別測試選項外、移出 3D 螢幕、pointercancel、動作中連點與終態後再點；用純 TS 測試驗證失敗與遲到終態。
4. 執行 Node 測試、MOD／Web 嚴格型別檢查、XS archive、Vite build；核對所有 tracked writes 的 topic 邊界。

## Evidence

- pinned viewport 的 pointer 事件確實到達 Piu callback，同次成功 run 出現 `touch began → ended(run_seq=1) → run started → screen completed → run completed`，且 [錄影](evidence/touch-greet-run.webm) 可辨認打招呼動作與畫面結果。詳細時間點和 trace 在[同次證據](evidence/touch-greet-run.md)。
- 初次負向 run 發現 pinned viewport 指標移出 3D 螢幕後，pointerup 仍使用最後有效螢幕座標而錯誤觸發 greet。E009 網頁加入限定於本實驗的移出取消轉送後，重跑移出及取消情境均無 run，且下一次有效點選仍可執行。
- `npm test` 5/5，MOD／Web strict typecheck、雙模組 XS archive、Vite build 與 pinned 資產 SHA-256 核對通過。動作中第二次點選沒有排隊；完成後再次點選產生下一個 `run_seq`。

## Decision and limits

本 POC 在 pinned 瀏覽器模擬器中通過 creator 的螢幕觸控→MOD→可見打招呼→真實畫面結果檢查；負向情境與純 TS 狀態測試通過。實際動作失敗只經純狀態測試，未在模擬器中強制注入；視覺證據仍待 human draft PR review。本實驗不授權 production source、vendor 或裝置／Server 契約變更，也不證明實機觸控品質。
